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
import { Tile } from "./level/Tile";
import { Tessellator } from "./render/Tessellator";
import { HitResult } from "./HitResult";


export class CrossCraft {
    public static readonly VERSION_STRING: string = "0.0.1d";
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
    private player!: Player;
    private textures!: Textures;
    private mouseGrabbed: boolean = false;
    private yMouseAxis: number = -1;
    private lb: FloatBuffer = BufferUtils.createFloatBuffer(16);
    private hitResult: HitResult | null = null;
    private editMode: number = 0;

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
            Mouse.setGrabbed(true);
        });

        this.checkGlError("Pre startup");

        GL11.glEnable(GL.TEXTURE_2D);
        GL11.glShadeModel(GL.SMOOTH);
        GL11.glClearColor(fr, fg, fb, 0.0);
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


        this.checkGlError("Post startup");
    }

    public stop(): void {
        this.running = false;
    }
    
    private checkGlError(string: string): void {
        var errorCode: number = GL11.glGetError();
        if (errorCode != 0) {
            var errorString: string = GLU.gluErrorString(errorCode);
            console.log("########## GL11 ERROR ##########")
            console.log("@ " + string);
            console.log(errorCode + ": " + errorString);
            this.stop();
        }
    }

    private tick(): void {
        if (Keyboard.next() && Keyboard.getEventKeyState()) {
            if (Keyboard.getEventKey() == 33) {
                this.levelRenderer.toggleDrawDistance();
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
                console.log(this.fpsString);
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

        while(Mouse.next()) {
            // Right click
            if (Mouse.getEventButton() == 2 && Mouse.getEventButtonState() && this.hitResult != null) {
                // console.log("Right click")
                this.level.setTile(this.hitResult.x, this.hitResult.y, this.hitResult.z, 0);
            }

            // Left click
            if (Mouse.getEventButton() == 0 && Mouse.getEventButtonState() && this.hitResult != null) {
                var x: number = Math.floor(this.hitResult.x);
                var y: number = Math.floor(this.hitResult.y);
                var z: number = Math.floor(this.hitResult.z);

                if (this.hitResult.f == 0) y--;
                if (this.hitResult.f == 1) y++;
                if (this.hitResult.f == 2) z--;
                if (this.hitResult.f == 3) z++;
                if (this.hitResult.f == 4) x--;
                if (this.hitResult.f == 5) x++;

                this.level.setTile(x, y, z, 1);
            }
        }

        GL11.glClear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
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
        this.setupFog(1);
        this.levelRenderer.render(this.player, 1);
        GL11.glDisable(GL.LIGHTING);
        GL11.glDisable(GL.TEXTURE_2D);
        GL11.glDisable(GL.FOG);
        this.setupFog(0);
        if (this.hitResult != null) {
            // GL11.glDepthFunc(GL.LESS);
            GL11.glDisable(GL.ALPHA_TEST);
            this.levelRenderer.renderHit(this.player, this.hitResult);
            GL11.glEnable(GL.ALPHA_TEST);
            // GL11.glDepthFunc(GL.LEQUAL);
        }
        this.drawGui(partialTicks);
    }

    private drawGui(partialTicks: number): void {
        const screenWidth: number = this.width * 240 / this.height;
        const screenHeight: number = this.height * 240 / this.height;
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
        Tile.rock.render(t, this.level, 0, -2, 0, 0);
        t.end();
        GL11.glDisable(GL.TEXTURE_2D);
        GL11.glPopMatrix();
        this.checkGlError("GUI: Draw selected");
        var wc: number = screenWidth / 2;
        var hc: number = screenHeight / 2;
        GL11.glColor4f(1.0, 1.0, 1.0, 1.0);
        // t.begin();
        // t.vertex((wc + 1), (hc - 4), 0);
        // t.vertex((wc - 0), (hc - 4), 0);
        // t.vertex((wc - 0), (hc + 5), 0);
        // t.vertex((wc + 1), (hc + 5), 0);
        // t.vertex((wc + 5), (hc - 0), 0);
        // t.vertex((wc - 4), (hc - 0), 0);
        // t.vertex((wc - 4), (hc + 1), 0);
        // t.vertex((wc + 5), (hc + 1), 0);
        // t.end();
        this.checkGlError("GUI: Draw crosshair");
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
        if (layer == 0) {
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

    private getBuffer(a: number, b: number, c: number, d: number): FloatBuffer {
        this.lb.clear();
        this.lb.put(a).put(b).put(c).put(d)
        this.lb.flip();
        return this.lb;
    }

    public destroy(): void {

    }
}