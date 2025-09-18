import { BufferUtils } from "../lib/GL11/BufferUtils";
import { FloatBuffer } from "../lib/GL11/FloatBuffer";
import { IntBuffer } from "../lib/GL11/IntBuffer";
import { GL11, GL } from "../lib/GL11/GL11";
import { GLU } from "../lib/GL11/GLU";
import { Level } from "./level/Level";
import { LevelRenderer } from "./level/LevelRenderer";
import { Timer } from "./Timer";
import { Player } from './Player';
import { Keyboard } from "../lib/IO/Keyboard";
import { Mouse } from '../lib/IO/Mouse';
import { Chunk } from "./level/Chunk";
import { Textures } from "./Textures";
import { Frustum } from "./render/Frustum";
import { Tile } from "./level/tile/TileDefenitions";
import { Tessellator } from "./render/Tessellator";
import { HitResult } from "./HitResult";
import { Zombie } from "./character/Zombie";
import { User } from './User';
import { ParticleEngine } from "./particle/ParticleManager";
import { Font } from "./gui/Font";
import type { Screen } from "./gui/Screen";
import { PauseScreen } from "./gui/PauseScreen";
import { LevelIO } from "./level/LevelIO";
import type { LevelLoaderListener } from "./level/LevelLoaderListener";
import { LevelGen } from "./level/levelgen/LevelGen";
import { AABB } from './phys/AABB';

const APP_DEBUG = false;

export class CrossCraft implements LevelLoaderListener {
    public static readonly VERSION_STRING: string = "0.0.3a";
    public readonly host: string = "crosscraftweb.ddns.net";
    public width: number;
    public height: number;
    public appletMode: boolean = false;
    private parent: HTMLCanvasElement;
    private fullscreen: boolean = false;
    public pause: boolean = false;
    public running: boolean = false;
    private fogColor0: FloatBuffer = BufferUtils.createFloatBuffer(4);
    private fogColor1: FloatBuffer = BufferUtils.createFloatBuffer(4);
    private viewportBuffer: IntBuffer = BufferUtils.createIntBuffer(16);
    private selectBuffer: IntBuffer = BufferUtils.createIntBuffer(2000);
    private fpsString: string = "";
    private level!: Level;
    private levelRenderer!: LevelRenderer;
    private timer: Timer = new Timer(20.0);
    public player!: Player;
    private textures!: Textures;
    private mouseGrabbed: boolean = false;
    private yMouseAxis: number = -1;
    private lb: FloatBuffer = BufferUtils.createFloatBuffer(16);
    private hitResult: HitResult | null = null;
    private editMode: number = 0;
    private zombies: Array<Zombie> = new Array<Zombie>();
    public user: User = null as unknown as User;
    private selectedTile: number = 1;
    private particleEngine!: ParticleEngine;
    private t!: Tessellator;
    public font!: Font;
    private screen: Screen = null as unknown as Screen;
    private levelIo: LevelIO = new LevelIO(this);
    private levelGen: LevelGen = new LevelGen(this);
    private title: string = "";
    public isLoading: boolean = false;
    public loadMapUser: string = "";
    public loadMapId: number = -1;
    private lastMousePos = {x: 0, y: 0};

    constructor(parent: HTMLCanvasElement, width: number, height: number, fullscrean: boolean) {
        this.parent = parent;
        this.width = width;
        this.height = height;
        this.fullscreen = fullscrean;
    }

    public init(): void {
        var col1: number = 920330;
        var fr: number = 0.5;
        var fg: number = 0.8;
        var fb: number = 1.0;
        this.fogColor0.put([fr, fg, fb, 1.0]);
        this.fogColor0.flip();
        this.fogColor1.put([(col1 >> 16 & 255) / 255.0, (col1 >> 8 & 255) / 255.0, (col1 & 255) / 255.0, 1.0]);
        this.fogColor1.flip();

        GL11.init(this.parent);
        Keyboard.create();
        Mouse.create(this.parent);

        this.parent.addEventListener('click', () => {
            if (this.screen == null) {
                Mouse.setGrabbed(true);
            }
        });

        document.addEventListener('pointerlockchange', () => {
            // Если блокировка была снята (т.е. текущий элемент блокировки - не наш canvas)
            // И при этом у нас не открыто никакое меню
            // Это значит, что пользователь нажал ESC, чтобы выйти из игры.
            if (document.pointerLockElement !== this.parent && this.screen === null) {
                // Открываем меню паузы
                this.setScreen(new PauseScreen());
            }
        }, false);

        this.checkGlError("Pre startup");

        GL11.glEnable(GL.TEXTURE_2D);
        GL11.glShadeModel(GL.SMOOTH);
        GL11.glClearColor(fr, fg, fb, 1.0);
        GL11.glClearDepth(1.0);
        GL11.glEnable(GL.DEPTH_TEST);
        GL11.glDepthFunc(GL.LEQUAL);
        GL11.glEnable(GL.ALPHA_TEST);
        GL11.glAlphaFunc(GL.GREATER, 0.0);
        GL11.glCullFace(GL.BACK);
        GL11.glMatrixMode(GL.PROJECTION);
        GL11.glLoadIdentity();
        GL11.glMatrixMode(GL.MODELVIEW);

        this.checkGlError("Startup");

        GL11.glViewport(0, 0, this.width, this.height);
        
        this.textures = new Textures()
        this.level = new Level(256, 256, 64);
        this.levelRenderer = new LevelRenderer(this.level, this.textures);
        this.player = new Player(this.level);
        this.particleEngine = new ParticleEngine(this.level);
        this.t = new Tessellator();
        this.font = new Font("/default.png", this.textures);

        // this.sleep(1000);

        if (this.loadMapUser == "" || this.loadMapId == -1) {
            if (this.user != null) {
                this.levelGen.generateLevel(this.level, this.user.username, 256, 256, 64);
            } else {
                this.levelGen.generateLevel(this.level, "noname", 256, 256, 64);
            }
        } else {
            this.loadLevel(this.loadMapUser, this.loadMapId);
        }

        for (var i = 0; i < 20; ++ i) {
            var zombie: Zombie = new Zombie(this.level, 128.0, 0.0, 129.0);
            zombie.resetPosition()
            this.zombies.push(zombie);
        }

        this.checkGlError("Post startup");
    }

    public async loadLevel(username: string, levelId: number): Promise<boolean> {
        this.isLoading = true;
        const ok = await this.levelIo.loadOnline(this.level, this.host, username, levelId);
        if (!ok) {
            this.isLoading = false;
            return false;
        } else {
            if (this.player != null) {
                this.player.resetPosition();
            }
            if (this.zombies != null) {
                this.zombies = [];
            }
            this.isLoading = false;
            return true;
        }
    }

    public async saveLevel(levelId: number, levelName: string): Promise<void> {
        this.isLoading = true;
        const ok = await this.levelIo.saveOnline(this.level, this.host, this.user.username, this.user.sessionid, levelName, levelId);
        if (!ok) {
            this.isLoading = false;
        } else {
            this.levelLoadUpdate("Level successfuly saved");
            await this.sleep(1000);
            this.isLoading = false;
        }
        this.isLoading = false;
    }

    public beginLevelLoading(title: string): void {
        this.title = title;
        var screenWidth: number = this.width * 240 / this.height;
        var screenHeight: number = this.height * 240 / this.height;
        GL11.glClear(GL.DEPTH_BUFFER_BIT);
        GL11.glMatrixMode(GL.PROJECTION);
        GL11.glLoadIdentity();
        GL11.glOrtho(0.0, screenWidth, screenHeight, 0.0, 100.0, 300.0);
        GL11.glMatrixMode(GL.MODELVIEW);
        GL11.glLoadIdentity();
        GL11.glTranslatef(0.0, 0.0, -200.0);
    }

    public async levelLoadUpdate(status: string): Promise<void> {
        console.log("LLU: " + status);
        var screenWidth: number = this.width * 240 / this.height;
        var screenHeight: number = this.height * 240 / this.height;
        GL11.glClear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
        var t: Tessellator = Tessellator.instance;
        GL11.glEnable(GL.TEXTURE_2D);
        var id = this.textures.loadTexture("/dirt.png", GL.NEAREST);
        GL11.glBindTexture(GL.TEXTURE_2D, id);
        t.begin();
        t.color(0.5, 0.5, 0.5);
        var s: number = 32.0;
        t.vertexUV(0.0, screenHeight, 0.0, 0.0, screenHeight / s);
        t.vertexUV(screenWidth, screenHeight, 0.0, screenWidth / s, screenHeight / s);
        t.vertexUV(screenWidth, 0.0, 0.0, screenWidth / s, 0.0);
        t.vertexUV(0.0, 0.0, 0.0, 0.0, 0.0);
        t.end();
        GL11.glEnable(GL.TEXTURE_2D);
        this.font.drawShadow(this.title, (screenWidth - this.font.width(this.title)) / 2, screenHeight / 2 - 4 - 8, 16777215);
        this.font.drawShadow(status, (screenWidth - this.font.width(status)) / 2, screenHeight / 2 - 4 + 4, 16777215);

        await this.sleep(100);
    }

    public async generateNewLevel(width: number, height: number, depth: number): Promise<void> {
        this.isLoading = true;

        await this.sleep(1); 

        if (this.user != null) {
            await this.levelGen.generateLevel(this.level, this.user.username, width, height, depth);
        } else {
            await this.levelGen.generateLevel(this.level, "noname", width, height, depth);
        }
        this.player.resetPosition();

        this.zombies = []

        this.isLoading = false;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    public stop(): void {
        this.running = false;
    }
    
    private checkGlError(string: string): void {
        if (!APP_DEBUG) return;
        var errorCode: number = GL11.glGetError();
        if (errorCode != 0) {
            var errorString: string = GLU.gluErrorString(errorCode);
            console.log("########## GL11 ERROR ##########")
            console.log("@ " + string);
            console.log(errorCode + ": " + errorString);
            this.stop();
        }
    }

    public setScreen(screen: Screen): void {
        if (this.screen != null) this.screen.onClose();
        this.screen = screen;
        if (screen != null) {
            var screenWidth: number = this.width * 240 / this.height;
            var screenHeight: number = this.height * 240 / this.height;
            screen.init(this, screenWidth, screenHeight);
        }
    }

    public pauseGame(): void {
        // Открывать меню паузы, только если мы в игре (нет другого открытого меню)
        if (this.screen == null) {
            Mouse.setGrabbed(false);
            this.player.releaseAllKeys();
            this.setScreen(new PauseScreen());
        }
    }

    /**
     * Снимает игру с паузы: захватывает курсор и закрывает текущее меню.
     */
    public resumeGame(): void {
        this.setScreen(null as unknown as Screen);
        Mouse.setGrabbed(true);
    }

    /**
     * Переключает состояние между игрой и паузой.
     */
    public togglePause(): void {
        if (this.screen == null) {
            this.pauseGame();
        }
    }

    private isFree(aabb: AABB): boolean {
        if (this.player.boundingBox.intersects(aabb)) {
            return false;
        } else {
            for (var i = 0; i < this.zombies.length; ++i) {
                if (this.zombies[i].boundingBox.intersects(aabb)) {
                    return false;
                }
            }

            return true;
        }
    }

    private handleMouseClick() {
        if (this.editMode == 0 && this.hitResult != null) {
            const previousTile: Tile = Tile.tiles[this.level.getTile(this.hitResult.x, this.hitResult.y, this.hitResult.z)];

            var tileChanged: boolean = this.level.setTile(this.hitResult.x, this.hitResult.y, this.hitResult.z, 0);

            if (previousTile != null && tileChanged) {
                // console.log('summon');
                previousTile.onDestroy(this.level, this.hitResult.x, this.hitResult.y, this.hitResult.z, this.particleEngine);
            }
        } else if (this.hitResult != null) {
            var x: number = Math.floor(this.hitResult.x);
            var y: number = Math.floor(this.hitResult.y);
            var z: number = Math.floor(this.hitResult.z);

            if (this.hitResult.f == 0) y--;
            if (this.hitResult.f == 1) y++;
            if (this.hitResult.f == 2) z--;
            if (this.hitResult.f == 3) z++;
            if (this.hitResult.f == 4) x--;
            if (this.hitResult.f == 5) x++;

            const aabb: AABB | null = Tile.tiles[this.selectedTile].getAABB(x, y, z);
            if (aabb == null || this.isFree(aabb)) {
                this.level.setTile(x, y, z, this.selectedTile);
            }
        }
    }

    private tick(): void {
        if (Keyboard.next() && this.screen == null) {
            this.player.setKey(Keyboard.getEventKey(), Keyboard.getEventKeyState());
            if (Keyboard.getEventKeyState()) {
                if (Keyboard.getEventKey() == 1) { // ESC
                    this.player.releaseAllKeys();
                    this.togglePause();
                }
                if (Keyboard.getEventKey() == 2) { // 1
                    this.selectedTile = Tile.rock.id;
                }
                if (Keyboard.getEventKey() == 3) { // 2
                    this.selectedTile = Tile.dirt.id;
                }
                if (Keyboard.getEventKey() == 4) { // 3
                    this.selectedTile = Tile.cobblestone.id;
                }
                if (Keyboard.getEventKey() == 5) { // 4
                    this.selectedTile = Tile.wood.id;
                }
                if (Keyboard.getEventKey() == 7) { // 6
                    this.selectedTile = Tile.bush.id;
                }
                if (Keyboard.getEventKey() == 8) { // 7
                    this.selectedTile = Tile.water.id;
                }
                if (Keyboard.getEventKey() == 9) { // 8
                    this.selectedTile = Tile.lava.id;
                }

                if (Keyboard.getEventKey() == 33) {
                    this.levelRenderer.toggleDrawDistance();
                }
                if (Keyboard.getEventKey() == 34) {
                    console.log("Spawned zombie at player");
                    this.zombies.push(new Zombie(this.level, this.player.x, this.player.y, this.player.z));
                }
            }
        }

        this.level.tick();
        this.particleEngine.tick();


        for (let i = this.zombies.length - 1; i >= 0; i--) {
            const zombie = this.zombies[i];
            zombie.tick();

            if (zombie.removed) {
                this.zombies.splice(i, 1); 
            }
        }

        this.player.tick();
    }

    public run(): void {
        if (this.running) return;
        this.running = true;

        try {
            this.init();
        } catch (e) {
            console.error("Failed to start CrossCraft during init:", e);
            this.destroy();
            return;
        }
        
        let lastTime = performance.now();
        let frames = 0;

        const gameLoop = () => {
            if (!this.running) return;

            if (this.isLoading) {
                requestAnimationFrame(gameLoop);
                return;
            }

            if (this.screen != null) {
                this.screen.updateEvents();
                if (this.screen != null) {
                    this.screen.tick();
                }
            }

            if (!this.pause) {
                this.timer.advanceTime();
                for (let i = 0; i < this.timer.ticks; i++) {
                    this.tick();
                }
                this.render(this.timer.partialTicks);
                frames++;
            }

            if (performance.now() >= lastTime + 1000) {
                this.fpsString = `${frames} fps, ${Chunk.updates} chunk updates`;
                Chunk.updates = 0;
                lastTime += 1000;
                frames = 0;
            }
            
            requestAnimationFrame(gameLoop);
        };

        requestAnimationFrame(gameLoop);
    }

    private pick(partialTicks: number): void {
        this.selectBuffer.clear();

        GL11.glSelectBuffer(this.selectBuffer);
        GL11.glRenderMode(GL.SELECT);
        GL11.setupPickCamera(this.width / 2, this.height / 2); 
        this.setupPickCamera(partialTicks, this.width / 2, this.height / 2);
        this.levelRenderer.pick(this.player, Frustum.getFrustum())
        var hits: number = GL11.glRenderMode(GL.RENDER);
        // console.log("PICK: hits " + hits);
        // console.log("Player position: (" + this.player.x + ", " + this.player.y + ", " + this.player.z + ")");
        this.selectBuffer.flip();
        this.selectBuffer.limit(this.selectBuffer.capacity());
        var names: number[] = new Array<number>(10);
        var bestResult: HitResult | null = null;
        // console.log(hits);
        for (var i = 0; i < hits; ++i) {
            var nameCount = this.selectBuffer.get()
            this.selectBuffer.get();
            this.selectBuffer.get();

            for (var j = 0; j < nameCount; ++j) {
                names[j] = this.selectBuffer.get();
            }

            this.hitResult = new HitResult(names[0], names[1], names[2], names[3], names[4]);
            if (bestResult == null || this.hitResult.isClotherThan(this.player, bestResult, this.editMode)) {
                bestResult = this.hitResult;
            }
        }

        this.hitResult = bestResult;
        // console.log(this.hitResult);
    }

    public render(partialTicks: number): void {
        const motionX = Mouse.getDX();
        const motionY = Mouse.getDY();
        this.player.turn(motionX, motionY * this.yMouseAxis);
        GL11.glViewport(0, 0, this.width, this.height);
        this.checkGlError("Set viewport");
        this.pick(partialTicks);
        this.checkGlError("Picked");
        while (Mouse.next()) {
            if (Mouse.getEventButton() == 0 && Mouse.getEventButtonState()) {
                this.handleMouseClick();
            }
            if (Mouse.getEventButton() == 2 && Mouse.getEventButtonState()) {
                this.editMode = (this.editMode + 1) % 2
            }
        }
        GL11.glClear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
        GL11.glAlphaFunc(GL.GREATER, 0.0);
        this.setupCamera(partialTicks);
        GL11.glEnable(GL.CULL_FACE);
        this.checkGlError("Set up camera");
        GL11.glEnable(GL.CULL_FACE);
        var frustum: Frustum = Frustum.getFrustum();
        this.levelRenderer.cull(frustum);
        this.levelRenderer.updateDirtyChunks(this.player);
        this.checkGlError("Update chunks");
        this.setupFog(0);
        GL11.glEnable(GL.FOG);
        this.levelRenderer.render(this.player, 0);
        this.checkGlError("Rendered level");
        for (var zombie of this.zombies) {
            if (zombie.isLit() && frustum.isVisible(zombie.boundingBox)) {
                zombie.render(partialTicks, this.textures);
            }
        }
        this.checkGlError("Rendered entities in layer 0");
        this.particleEngine.render(this.player, this.t, partialTicks, 0, this.textures);
        this.checkGlError("Rendered particles in layer 0");
        this.setupFog(1);
        this.levelRenderer.render(this.player, 1);
        for (var zombie of this.zombies) {
            if (!zombie.isLit() && frustum.isVisible(zombie.boundingBox)) {
                zombie.render(partialTicks, this.textures);
            }
        }
        this.checkGlError("Rendered entities in layer 1");
        this.particleEngine.render(this.player, this.t, partialTicks, 1, this.textures);
        this.checkGlError("Rendered particles in layer 1");
        this.levelRenderer.renderSurroundingGround();
        if (this.hitResult != null) {
            GL11.glDisable(GL.LIGHTING);
            GL11.glDisable(GL.ALPHA_TEST);
            this.levelRenderer.renderHit(this.player, this.hitResult, this.editMode, this.selectedTile);
            GL11.glEnable(GL.ALPHA_TEST);
            GL11.glEnable(GL.LIGHTING);
        }
        GL11.glBlendFunc(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA);
        this.setupFog(0);
        this.levelRenderer.renderSurroundingWater();
        GL11.glEnable(GL.BLEND);
        GL11.glColorMask(false, false, false, false);
        this.levelRenderer.render(this.player, 2);
        GL11.glColorMask(true, true, true, true);
        this.levelRenderer.render(this.player, 2);
        GL11.glDisable(GL.BLEND);
        GL11.glDisable(GL.LIGHTING);
        GL11.glDisable(GL.TEXTURE_2D);
        GL11.glDisable(GL.FOG);
        if (this.hitResult != null) {
            GL11.glDepthFunc(GL.LESS);
            GL11.glDisable(GL.ALPHA_TEST);
            this.levelRenderer.renderHit(this.player, this.hitResult, this.editMode, this.selectedTile);
            GL11.glEnable(GL.ALPHA_TEST);
            GL11.glDepthFunc(GL.LEQUAL);
        }
        GL11.glAlphaFunc(GL.GREATER, 0.5);
        this.drawGui(partialTicks);
    }

    private drawGui(partialTicks: number): void {
        const screenWidth: number = this.width * 240 / this.height;
        const screenHeight: number = this.height * 240 / this.height;
        var xMouse: number = Mouse.getX() * screenWidth / this.width;
        var yMouse: number = yMouse = screenHeight - Mouse.getY() * screenHeight / this.height - 1;
        GL11.glClear(GL.DEPTH_BUFFER_BIT);
        GL11.glMatrixMode(GL.PROJECTION);
        GL11.glLoadIdentity()
        GL11.glOrtho(0.0, screenWidth, screenHeight, 0.0, 100.0, 300.0);
        GL11.glMatrixMode(GL.MODELVIEW);
        GL11.glLoadIdentity();
        GL11.glTranslatef(0.0, 0.0, -200.0);
        this.checkGlError("GUI: Init");
        GL11.glPushMatrix();
        GL11.glTranslatef(screenWidth - 16, 16.0, -50.0);
        const t: Tessellator = Tessellator.instance;
        GL11.glScalef(16.0, 16.0, 16.0);
        GL11.glRotatef(-30.0, 1.0, 0.0, 0.0);
        GL11.glRotatef(45.0, 0.0, 1.0, 0.0);
        GL11.glTranslatef(-1.5, 0.5, 0.5);
        GL11.glScalef(-1.0, -1.0, -1.0);
        var id: number = this.textures.loadTexture("/terrain.png", GL.NEAREST);
        GL11.glBindTexture(GL.TEXTURE_2D, id);
        GL11.glEnable(GL.TEXTURE_2D);
        t.begin();
        Tile.tiles[this.selectedTile].render(t, this.level, 0, -2, 0, 0);
        t.end();
        GL11.glDisable(GL.TEXTURE_2D);
        GL11.glPopMatrix();
        this.checkGlError("GUI: Draw selected");
        this.font.drawShadow(CrossCraft.VERSION_STRING, 2, 2, 16777215);
        this.font.drawShadow(this.fpsString, 2, 12, 16777215);
        this.checkGlError("GUI: Draw text");
        var wc: number = screenWidth / 2;
        var hc: number = screenHeight / 2;
        GL11.glColor4f(1.0, 1.0, 1.0, 1.0);
        t.begin();
        t.vertex((wc + 1), (hc - 4), 0);
        t.vertex((wc - 0), (hc - 4), 0);
        t.vertex((wc - 0), (hc + 5), 0);
        t.vertex((wc + 1), (hc + 5), 0);
        t.vertex((wc + 5), (hc - 0), 0);
        t.vertex((wc - 4), (hc - 0), 0);
        t.vertex((wc - 4), (hc + 1), 0);
        t.vertex((wc + 5), (hc + 1), 0);
        t.end();
        this.checkGlError("GUI: Draw crosshair");
        if (this.screen != null) {
            this.screen.render(xMouse, yMouse);
        }
    }

    private setupPickCamera(partialTicks: number, x: number, y: number): void {
        GL11.glMatrixMode(GL.PROJECTION);
        GL11.glLoadIdentity();
        
        // ИСПРАВЛЕНИЕ: Правильная настройка viewport для picking
        this.viewportBuffer.clear();
        GL11.glGetIntegerv(GL.VIEWPORT, this.viewportBuffer);
        this.viewportBuffer.flip();
        this.viewportBuffer.limit(4); // Только первые 4 элемента: x, y, width, height
        GLU.gluPickMatrix(x, y, 5.0, 5.0, this.viewportBuffer);
        GLU.gluPerspective(70.0, this.width / this.height, 0.05, 1000.0);
        GL11.glMatrixMode(GL.MODELVIEW);
        GL11.glLoadIdentity();

        this.moveCameraToPlayer(partialTicks);
    }

    private setupCamera(partialTicks: number): void {   
        GL11.glMatrixMode(GL.PROJECTION);
        GL11.glLoadIdentity();
        GLU.gluPerspective(70.0, this.width / this.height, 0.05, 1024.0);
        GL11.glMatrixMode(GL.MODELVIEW);
        GL11.glLoadIdentity();
        this.moveCameraToPlayer(partialTicks);
    }

    private moveCameraToPlayer(partialTicks: number): void {
        GL11.glTranslatef(0.0, 0.0, -0.3);
        GL11.glRotatef(this.player.xRotation, 1.0, 0.0, 0.0);
        GL11.glRotatef(this.player.yRotation, 0.0, 1.0, 0.0);
        var x: number = this.player.prevX + (this.player.x - this.player.prevX) * partialTicks;
        var y: number = this.player.prevY + (this.player.y - this.player.prevY) * partialTicks;
        var z: number = this.player.prevZ + (this.player.z - this.player.prevZ) * partialTicks;
        GL11.glTranslatef(-x, -y, -z);
    }

    private setupFog(layer: number): void {
        var currentTile: Tile = Tile.tiles[this.level.getTile(Math.floor(this.player.x), Math.floor(this.player.y + 0.12), Math.floor(this.player.z))]
        if (currentTile != null && currentTile.getLiquidType() == 1) {
            GL11.glFogi(GL.FOG_MODE, GL.EXP);
            GL11.glFogf(GL.FOG_DENSITY, 0.1);
            GL11.glFog(GL.FOG_COLOR, this.getBuffer(0.02, 0.02, 0.2, 1.0));
            GL11.glLightModel(GL.LIGHT_MODEL_AMBIENT, this.getBuffer(0.3, 0.3, 0.7, 1.0));
        } else if (currentTile != null && currentTile.getLiquidType() == 2) {
            GL11.glFogi(GL.FOG_MODE, GL.EXP);
            GL11.glFogf(GL.FOG_DENSITY, 2.0);
            GL11.glFog(GL.FOG_COLOR, this.getBuffer(0.6, 0.1, 0.0, 1.0));
            GL11.glLightModel(GL.LIGHT_MODEL_AMBIENT, this.getBuffer(0.4, 0.3, 0.3, 1.0))
        } else if (layer == 0) {
            GL11.glFogi(GL.FOG_MODE, GL.EXP);
            GL11.glFogf(GL.FOG_DENSITY, 0.001); 
            GL11.glFog(GL.FOG_COLOR, this.fogColor0);
            GL11.glLightModel(GL.LIGHT_MODEL_AMBIENT, this.getBuffer(1.0, 1.0, 1.0, 1.0));
        } else if (layer == 1) {
            GL11.glFogi(GL.FOG_MODE, GL.EXP);
            GL11.glFogf(GL.FOG_DENSITY, 0.02);
            GL11.glFog(GL.FOG_COLOR, this.fogColor1);
            const br: number = 0.6;
            GL11.glLightModel(GL.LIGHT_MODEL_AMBIENT, this.getBuffer(br, br, br, 1.0)); 
        }

        GL11.glEnable(GL.COLOR_MATERIAL);
        GL11.glColorMaterial(GL.FRONT, GL.AMBIENT);
        GL11.glEnable(GL.LIGHTING);
    }

    private getFogDensity(layer: number): number {
        if (this.levelRenderer.getDrawDistance() == 0) {
            return  (layer == 0) ? 0.001 : 0.02;
        }
        if (this.levelRenderer.getDrawDistance() == 1) {
            return (layer == 0) ? 0.005 : 0.06;
        }
        if (this.levelRenderer.getDrawDistance() == 2) {
            return (layer == 0) ? 0.05 : 0.1;
        }
        if (this.levelRenderer.getDrawDistance() == 3) {
            return (layer == 0) ? 0.2 : 0.3;
        }
        return 0.001
    }

    private getBuffer(a: number, b: number, c: number, d: number): FloatBuffer {
        this.lb.clear();
        this.lb.put(a).put(b).put(c).put(d)
        this.lb.flip();
        return this.lb;
    }

    public destroy(): void {

    }
}