import { GL11, GL } from "../GL11";
import { BufferUtils } from "../BufferUtils";

class DisplayListsTest {
    private canvas!: HTMLCanvasElement;
    private cubeList: number = 0;
    private quadList: number = 0;
    private tessellatorList: number = 0;
    private animationId: number = 0;

    constructor() {
        this.initCanvas();
        this.setupGL();
        this.createDisplayLists();
        this.setupUI();
        this.startRenderLoop();
    }

    private initCanvas(): void {
        // Создаем canvas и добавляем в app контейнер
        this.canvas = document.createElement('canvas');
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.canvas.style.display = 'block';
        
        const app = document.getElementById('app');
        if (app) {
            app.appendChild(this.canvas);
        } else {
            document.body.appendChild(this.canvas);
        }

        // Инициализируем GL11
        GL11.init(this.canvas);
        
        console.log(`Canvas initialized: ${this.canvas.width}x${this.canvas.height}`);
    }

    private setupGL(): void {
        console.log("Setting up OpenGL state...");
        
        GL11.glEnable(GL.DEPTH_TEST);
        GL11.glDepthFunc(GL.LEQUAL);
        GL11.glEnable(GL.CULL_FACE);
        GL11.glCullFace(GL.BACK);
        
        GL11.glClearColor(0.1, 0.1, 0.2, 1.0);
        GL11.glClearDepth(1.0);
        
        // Настройка проекции
        GL11.glMatrixMode(GL.PROJECTION);
        GL11.glLoadIdentity();
        GL11.gluPerspective(60.0, this.canvas.width / this.canvas.height, 0.1, 100.0);
        
        GL11.glMatrixMode(GL.MODELVIEW);
        
        console.log("OpenGL setup complete");
    }

    private createDisplayLists(): void {
        console.log("=== Creating Display Lists ===");
        
        // Генерируем ID для списков
        this.cubeList = GL11.glGenLists(3);
        this.quadList = this.cubeList + 1;
        this.tessellatorList = this.cubeList + 2;
        
        console.log(`Generated list IDs: cube=${this.cubeList}, quad=${this.quadList}, tessellator=${this.tessellatorList}`);

        // Создаем Display Lists
        this.createColoredCube();
        this.createGradientQuad();
        this.createTriangleMesh();
        
        console.log("=== Display Lists Created Successfully! ===");
    }

    private createColoredCube(): void {
        console.log("Creating colored cube display list...");
        
        GL11.glNewList(this.cubeList, GL.COMPILE);
        
        GL11.glBegin(GL.QUADS);
        
        // Передняя грань (красная)
        GL11.glColor3f(1.0, 0.0, 0.0);
        GL11.glVertex3f(-1.0, -1.0, 1.0);
        GL11.glVertex3f(1.0, -1.0, 1.0);
        GL11.glVertex3f(1.0, 1.0, 1.0);
        GL11.glVertex3f(-1.0, 1.0, 1.0);
        
        // Задняя грань (зеленая)
        GL11.glColor3f(0.0, 1.0, 0.0);
        GL11.glVertex3f(-1.0, -1.0, -1.0);
        GL11.glVertex3f(-1.0, 1.0, -1.0);
        GL11.glVertex3f(1.0, 1.0, -1.0);
        GL11.glVertex3f(1.0, -1.0, -1.0);
        
        // Верхняя грань (синяя)
        GL11.glColor3f(0.0, 0.0, 1.0);
        GL11.glVertex3f(-1.0, 1.0, -1.0);
        GL11.glVertex3f(-1.0, 1.0, 1.0);
        GL11.glVertex3f(1.0, 1.0, 1.0);
        GL11.glVertex3f(1.0, 1.0, -1.0);
        
        // Нижняя грань (желтая)
        GL11.glColor3f(1.0, 1.0, 0.0);
        GL11.glVertex3f(-1.0, -1.0, -1.0);
        GL11.glVertex3f(1.0, -1.0, -1.0);
        GL11.glVertex3f(1.0, -1.0, 1.0);
        GL11.glVertex3f(-1.0, -1.0, 1.0);
        
        // Правая грань (пурпурная)
        GL11.glColor3f(1.0, 0.0, 1.0);
        GL11.glVertex3f(1.0, -1.0, -1.0);
        GL11.glVertex3f(1.0, 1.0, -1.0);
        GL11.glVertex3f(1.0, 1.0, 1.0);
        GL11.glVertex3f(1.0, -1.0, 1.0);
        
        // Левая грань (циан)
        GL11.glColor3f(0.0, 1.0, 1.0);
        GL11.glVertex3f(-1.0, -1.0, -1.0);
        GL11.glVertex3f(-1.0, -1.0, 1.0);
        GL11.glVertex3f(-1.0, 1.0, 1.0);
        GL11.glVertex3f(-1.0, 1.0, -1.0);
        
        GL11.glEnd();
        GL11.glEndList();
        
        console.log("✓ Cube display list created");
    }

    private createGradientQuad(): void {
        console.log("Creating gradient quad display list...");
        
        GL11.glNewList(this.quadList, GL.COMPILE);
        
        GL11.glBegin(GL.QUADS);
        GL11.glColor3f(1.0, 0.0, 0.0); // Красный (левый нижний)
        GL11.glVertex3f(-1.5, -1.5, 0.0);
        GL11.glColor3f(0.0, 1.0, 0.0); // Зеленый (правый нижний)
        GL11.glVertex3f(1.5, -1.5, 0.0);
        GL11.glColor3f(0.0, 0.0, 1.0); // Синий (правый верхний)
        GL11.glVertex3f(1.5, 1.5, 0.0);
        GL11.glColor3f(1.0, 1.0, 0.0); // Желтый (левый верхний)
        GL11.glVertex3f(-1.5, 1.5, 0.0);
        GL11.glEnd();
        
        GL11.glEndList();
        
        console.log("✓ Gradient quad display list created");
    }

    private createTriangleMesh(): void {
        console.log("Creating triangle mesh with InterleavedArrays...");
        
        GL11.glNewList(this.tessellatorList, GL.COMPILE);
        
        // Создаем данные в формате T2F_C3F_V3F (texture, color, vertex)
        const meshData = [
            // Треугольник 1
            0.0, 0.0,  1.0, 0.0, 0.0,  -0.8, -0.8, 0.0,  // UV + RGB + XYZ
            1.0, 0.0,  0.0, 1.0, 0.0,   0.8, -0.8, 0.0,
            0.5, 1.0,  0.0, 0.0, 1.0,   0.0,  0.8, 0.0,
            
            // Треугольник 2
            0.0, 1.0,  1.0, 1.0, 0.0,  -0.4,  0.4, 0.2,
            1.0, 1.0,  1.0, 0.0, 1.0,   0.4,  0.4, 0.2,
            0.5, 0.0,  0.0, 1.0, 1.0,   0.0, -0.4, 0.2,
            
            // Треугольник 3 (маленький)
            0.2, 0.2,  0.8, 0.8, 0.8,  -0.2, -0.2, 0.4,
            0.8, 0.2,  0.8, 0.4, 0.8,   0.2, -0.2, 0.4,
            0.5, 0.8,  0.8, 0.8, 0.4,   0.0,  0.2, 0.4,
        ];
        
        const buffer = BufferUtils.createFloatBuffer(meshData.length);
        buffer.put(meshData);
        buffer.flip();
        
        GL11.glInterleavedArrays(GL.T2F_C3F_V3F, 0, buffer);
        GL11.glEnableClientState(GL.VERTEX_ARRAY);
        GL11.glEnableClientState(GL.COLOR_ARRAY);
        GL11.glEnableClientState(GL.TEXTURE_COORD_ARRAY);
        
        GL11.glDrawArrays(GL.TRIANGLES, 0, 9);
        
        GL11.glDisableClientState(GL.VERTEX_ARRAY);
        GL11.glDisableClientState(GL.COLOR_ARRAY);
        GL11.glDisableClientState(GL.TEXTURE_COORD_ARRAY);
        
        GL11.glEndList();
        
        console.log("✓ Triangle mesh display list created");
    }

    private startRenderLoop(): void {
        let frameCount = 0;
        let lastTime = performance.now();
        let angle = 0;
        
        const render = (currentTime: number) => {
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;
            frameCount++;
            
            angle += deltaTime * 0.001; // Плавное вращение
            
            // Очищаем экран
            GL11.glClear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
            GL11.glLoadIdentity();
            
            // Отодвигаем камеру
            GL11.glTranslatef(0.0, 0.0, -8.0);
            
            // Куб слева
            GL11.glPushMatrix();
            GL11.glTranslatef(-3.0, 0.0, 0.0);
            GL11.glRotatef(angle * 20, 1.0, 1.0, 0.0);
            GL11.glScalef(0.8, 0.8, 0.8);
            GL11.glCallList(this.cubeList);
            GL11.glPopMatrix();
            
            // Квад в центре
            GL11.glPushMatrix();
            GL11.glTranslatef(0.0, 0.0, 0.0);
            GL11.glRotatef(angle * 15, 0.0, 0.0, 1.0);
            GL11.glScalef(0.6, 0.6, 0.6);
            GL11.glCallList(this.quadList);
            GL11.glPopMatrix();
            
            // Треугольники справа
            GL11.glPushMatrix();
            GL11.glTranslatef(3.0, 0.0, 0.0);
            GL11.glRotatef(angle * 25, 0.0, 1.0, 0.0);
            GL11.glCallList(this.tessellatorList);
            GL11.glPopMatrix();
            
            // Проверяем ошибки OpenGL
            const error = GL11.glGetError();
            if (error !== GL.NO_ERROR) {
                console.error(`OpenGL Error: ${error}`);
            }
            
            // Логируем FPS каждые 60 кадров
            if (frameCount % 60 === 0) {
                const fps = Math.round(1000 / deltaTime);
                console.log(`FPS: ${fps}, Frame: ${frameCount}`);
            }
            
            this.animationId = requestAnimationFrame(render);
        };
        
        console.log("Starting render loop...");
        this.animationId = requestAnimationFrame(render);
    }

    private setupUI(): void {
        // Создаем контрольную панель
        const controls = document.createElement('div');
        controls.style.cssText = `
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 14px;
            z-index: 1000;
        `;
        
        controls.innerHTML = `
            <h3>Display Lists Test</h3>
            <div>Left: Colored Cube (List ${this.cubeList})</div>
            <div>Center: Gradient Quad (List ${this.quadList})</div>
            <div>Right: Triangle Mesh (List ${this.tessellatorList})</div>
            <hr>
            <button id="perfTest">Run Performance Test</button>
            <button id="mgmtTest">Test List Management</button>
            <button id="errorTest">Test Error Handling</button>
            <button id="toggleRender">Pause/Resume</button>
        `;
        
        document.body.appendChild(controls);
        
        // Привязываем обработчики событий
        document.getElementById('perfTest')?.addEventListener('click', () => this.performanceTest());
        document.getElementById('mgmtTest')?.addEventListener('click', () => this.testListManagement());
        document.getElementById('errorTest')?.addEventListener('click', () => this.testErrorHandling());
        document.getElementById('toggleRender')?.addEventListener('click', () => this.toggleRender());
        
        // Обработка изменения размера окна
        window.addEventListener('resize', () => this.handleResize());
    }

    private performanceTest(): void {
        console.log("=== Performance Test ===");
        
        const iterations = 10000;
        
        // Тест 1: Immediate mode
        console.log(`Testing immediate mode (${iterations} iterations)...`);
        const startImmediate = performance.now();
        
        for (let i = 0; i < iterations; i++) {
            GL11.glBegin(GL.TRIANGLES);
            GL11.glColor3f(1.0, 0.0, 0.0);
            GL11.glVertex3f(-0.5, -0.5, 0.0);
            GL11.glColor3f(0.0, 1.0, 0.0);
            GL11.glVertex3f(0.5, -0.5, 0.0);
            GL11.glColor3f(0.0, 0.0, 1.0);
            GL11.glVertex3f(0.0, 0.5, 0.0);
            GL11.glEnd();
        }
        
        const immediateTime = performance.now() - startImmediate;
        
        // Тест 2: Display Lists
        console.log(`Testing display lists (${iterations} iterations)...`);
        const startDisplayList = performance.now();
        
        for (let i = 0; i < iterations; i++) {
            GL11.glCallList(this.tessellatorList);
        }
        
        const displayListTime = performance.now() - startDisplayList;
        
        // Результаты
        console.log(`Performance Results:`);
        console.log(`  Immediate mode: ${immediateTime.toFixed(2)}ms`);
        console.log(`  Display Lists:  ${displayListTime.toFixed(2)}ms`);
        console.log(`  Speedup:        ${(immediateTime / displayListTime).toFixed(2)}x`);
        
        alert(`Performance Test Results:\nImmediate: ${immediateTime.toFixed(2)}ms\nDisplay Lists: ${displayListTime.toFixed(2)}ms\nSpeedup: ${(immediateTime / displayListTime).toFixed(2)}x`);
    }

    private testListManagement(): void {
        console.log("=== List Management Test ===");
        
        // Проверяем существующие списки
        console.log(`Cube list (${this.cubeList}) exists: ${GL11.glIsList(this.cubeList)}`);
        console.log(`Quad list (${this.quadList}) exists: ${GL11.glIsList(this.quadList)}`);
        console.log(`Tessellator list (${this.tessellatorList}) exists: ${GL11.glIsList(this.tessellatorList)}`);
        console.log(`Non-existent list (999) exists: ${GL11.glIsList(999)}`);
        
        // Создаем и удаляем временный список
        const tempList = GL11.glGenLists(1);
        console.log(`Generated temporary list ID: ${tempList}`);
        
        GL11.glNewList(tempList, GL.COMPILE);
        GL11.glBegin(GL.TRIANGLES);
        GL11.glVertex3f(0, 0, 0);
        GL11.glVertex3f(1, 0, 0);
        GL11.glVertex3f(0, 1, 0);
        GL11.glEnd();
        GL11.glEndList();
        
        console.log(`Temp list exists after creation: ${GL11.glIsList(tempList)}`);
        
        GL11.glDeleteLists(tempList, 1);
        console.log(`Temp list exists after deletion: ${GL11.glIsList(tempList)}`);
        
        console.log("List management test completed");
    }

    private testErrorHandling(): void {
        console.log("=== Error Handling Test ===");
        
        // Сбрасываем предыдущие ошибки
        GL11.glGetError();
        
        // Тест 1: glNewList с ID 0
        GL11.glNewList(0, GL.COMPILE);
        console.log(`Error after glNewList(0): ${GL11.glGetError()}`);
        
        // Тест 2: Некорректный режим
        GL11.glNewList(100, 999);
        console.log(`Error after glNewList(100, 999): ${GL11.glGetError()}`);
        
        // Тест 3: glEndList без glNewList
        GL11.glEndList();
        console.log(`Error after glEndList without glNewList: ${GL11.glGetError()}`);
        
        console.log("Error handling test completed");
    }

    private toggleRender(): void {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = 0;
            console.log("Rendering paused");
        } else {
            this.startRenderLoop();
            console.log("Rendering resumed");
        }
    }

    private handleResize(): void {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        GL11.glViewport(0, 0, this.canvas.width, this.canvas.height);
        GL11.glMatrixMode(GL.PROJECTION);
        GL11.glLoadIdentity();
        GL11.gluPerspective(60.0, this.canvas.width / this.canvas.height, 0.1, 100.0);
        GL11.glMatrixMode(GL.MODELVIEW);
        
        console.log(`Canvas resized to: ${this.canvas.width}x${this.canvas.height}`);
    }
}

// Запускаем тест после загрузки страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log("Starting CrossCraft Display Lists Test...");
    try {
        new DisplayListsTest();
        console.log("Display Lists test initialized successfully!");
    } catch (error) {
        console.error("Failed to initialize Display Lists test:", error);
    }
});