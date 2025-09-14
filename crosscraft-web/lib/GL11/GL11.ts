import { mat4 } from 'gl-matrix';
import { MatrixStack } from './MatrixStack';
import { GLU } from './GLU';
import { FloatBuffer } from './FloatBuffer';
import { IntBuffer } from './IntBuffer';

// Структура для скомпилированной геометрии
type CompiledGeometry = {
    vbo: WebGLBuffer;
    vertexCount: number;
    mode: number;
    format: number;
    texture: WebGLTexture | null;
    hasTexture: boolean;
    hasColor: boolean;
};

// Display List с оптимизированной геометрией
type CompiledDisplayList = {
    geometry: CompiledGeometry[];
    stateCommands: GLCommand[];
};

// --- Шейдеры для обычного рендеринга ---
const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColor;
    attribute vec2 aTextureCoord;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    
    varying lowp vec4 vColor;
    varying highp vec2 vTextureCoord;
    varying highp float vFogDistance; // Добавляем расстояние для тумана

    void main(void) {
        vec4 viewPosition = uModelViewMatrix * aVertexPosition;
        gl_Position = uProjectionMatrix * viewPosition;
        
        vColor = aVertexColor;
        vTextureCoord = aTextureCoord;
        
        // Вычисляем расстояние до камеры для тумана
        vFogDistance = length(viewPosition.xyz);
    }
`;
const fsSource = `
    precision highp float;
    varying lowp vec4 vColor;
    varying highp vec2 vTextureCoord;
    varying highp float vFogDistance;

    uniform sampler2D uSampler;
    uniform bool uUseTexture;
    uniform float uAlphaTestValue;
    
    // Параметры тумана
    uniform bool uFogEnabled;
    uniform int uFogMode;
    uniform float uFogDensity;
    uniform float uFogStart;
    uniform float uFogEnd;
    uniform vec3 uFogColor;
    
    // Параметры освещения и материалов
    uniform vec4 uLightModelAmbient;
    uniform bool uColorMaterialEnabled;

    void main(void) {
        vec4 finalColor = vColor;
        
        // 1. Сначала применяем текстуру
        if (uUseTexture) {
            finalColor *= texture2D(uSampler, vTextureCoord);
        }

        // 2. Alpha test
        if (finalColor.a < uAlphaTestValue) {
            discard;
        }

        // 3. Применяем ambient освещение ТОЛЬКО к RGB каналам
        // НЕ трогаем alpha канал!
        finalColor.rgb *= uLightModelAmbient.rgb;

        // 4. Применяем туман последним этапом
        if (uFogEnabled) {
            float fogFactor = 1.0;
            
            if (uFogMode == 2048) { // GL_EXP
                fogFactor = exp(-uFogDensity * vFogDistance);
            } else if (uFogMode == 2049) { // GL_EXP2
                float d = uFogDensity * vFogDistance;
                fogFactor = exp(-d * d);
            } else if (uFogMode == 9729) { // GL_LINEAR
                fogFactor = (uFogEnd - vFogDistance) / (uFogEnd - uFogStart);
            }
            
            fogFactor = clamp(fogFactor, 0.0, 1.0);
            
            finalColor.rgb = mix(uFogColor, finalColor.rgb, fogFactor);
        }

        gl_FragColor = finalColor;
    }
`;

// --- Шейдеры для Color Picking ---
const vsPickingSource = `
    attribute vec4 aVertexPosition;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    void main(void) {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
    }
`;

const fsPickingSource = `
    precision highp float;
    uniform vec4 uPickingColor;

    void main(void) {
        gl_FragColor = uPickingColor;
    }
`;

type GLCommand = { func: keyof GL11, args: any[] };
type HitRecord = { nameCount: number, minZ: number, maxZ: number, names: number[] };

function loadShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error('Shader compilation error: ' + info);
    }
    return shader;
}

export const GL = {
    PROJECTION: 5889,
    MODELVIEW: 5888,
    PROJECTION_MATRIX: 2983,
    MODELVIEW_MATRIX: 2982,
    QUADS: 7,
    TRIANGLES: 4,
    TRIANGLE_STRIP: 5,
    LINES: 1,
    DEPTH_BUFFER_BIT: 256,
    COLOR_BUFFER_BIT: 16384,
    DEPTH_TEST: 2929,
    LEQUAL: 515,
    LESS: 513,
    CULL_FACE: 2884,
    BLEND: 3042,
    ALPHA_TEST: 3008,
    GREATER: 516,
    SRC_ALPHA: 770,
    ONE_MINUS_SRC_ALPHA: 771,
    VERTEX_ARRAY: 32884,
    COLOR_ARRAY: 32886,
    TEXTURE_COORD_ARRAY: 32888,
    V2F: 10784,
    V3F: 10785,
    C3F_V3F: 10788,
    T2F_V3F: 10791,
    T2F_C3F_V3F: 10794,
    RENDER: 7168,
    SELECT: 7170,
    FLAT: 7424,
    SMOOTH: 7425,
    TEXTURE_2D: 3553,
    TEXTURE_MIN_FILTER: 10241,
    TEXTURE_MAG_FILTER: 10240,
    NEAREST: 9728,
    RGBA: 6408,
    UNSIGNED_BYTE: 5121,
    FOG: 2912,
    FOG_MODE: 2917,
    FOG_DENSITY: 2914,
    FOG_COLOR: 2918,
    EXP: 2048,
    LIGHTING: 2896,
    COLOR_MATERIAL: 2903,
    FRONT: 1028,
    AMBIENT_AND_DIFFUSE: 5632,
    LIGHT_MODEL_AMBIENT: 2899,
    VIEWPORT: 2978,
    BACK: 1029,
    COMPILE: 4864,
    COMPILE_AND_EXECUTE: 4865,
    NO_ERROR: 0,
    INVALID_ENUM: 1280,
    INVALID_VALUE: 1281,
    INVALID_OPERATION: 1282,
    STACK_OVERFLOW: 1283,
    STACK_UNDERFLOW: 1284,
    OUT_OF_MEMORY: 1285,
    INVALID_FRAMEBUFFER_OPERATION: 1286,
    TABLE_TOO_LARGE: 32767,
    BYTE: 5120,
    SHORT: 5122,
    UNSIGNED_SHORT: 5123,
    INT: 5124,
    UNSIGNED_INT: 5125,
    FLOAT: 5126,
    FOG_START: 2915,
    FOG_END: 2916,
    LINEAR: 9729,
    EXP2: 2049,
    LIGHT_MODEL_LOCAL_VIEWER: 2900,
    LIGHT_MODEL_TWO_SIDE: 2901,
    FRONT_AND_BACK: 1032,
    AMBIENT: 4608,
    DIFFUSE: 4609,
    SPECULAR: 4610,
    EMISSION: 5632,
    CURRENT_BIT: 0x00040000,
};

class GL11 {
    private gl: WebGLRenderingContext;
    private mainShaderProgram: WebGLProgram;
    private mainProgramInfo: { attribs: any; uniforms: any; };
    private pickingShaderProgram: WebGLProgram;
    private pickingProgramInfo: { attribs: any; uniforms: any; };
    private activeProgram: WebGLProgram;
    private pickingFramebuffer: WebGLFramebuffer;
    private pickX = 0; private pickY = 0;
    private stateCache = { viewport: new Int32Array(4), clearColor: new Float32Array([0, 0, 0, 0]), alphaTestFunc: 516, alphaTestRef: 0.0 };
    private immediate = { vbo: null as WebGLBuffer | null, mode: 0, vertexData: [] as number[], vertexCount: 0, hasColor: false, hasTexture: false, currentColor: [1.0, 1.0, 1.0, 1.0], currentTexCoord: [0.0, 0.0] };
    private array = { buffer: null as WebGLBuffer | null };
    private projectionMatrixStack = new MatrixStack();
    private modelViewMatrixStack = new MatrixStack();
    private currentMatrixStack: MatrixStack;
    private textureEnabled = false;
    private lists: Map<number, CompiledDisplayList> = new Map();
    private currentListId: number | null = null;
    private listMode: number = 0;
    private nextListId = 1;
    private renderMode: number;
    private selectBuffer: IntBuffer | null = null;
    private nameStack: number[] = [];
    private pickIdCounter: number = 1;
    private pickIdToNameStack: Map<number, number[]> = new Map();
    private lastError: number = GL.NO_ERROR;
    private nextTextureId: number = 1;
    private textureMap: Map<number, WebGLTexture> = new Map();

    private currentArrayData: {
        buffer: Float32Array | null;
        format: number;
        stride: number;
    } = {
        buffer: null,
        format: GL.V3F,
        stride: 0
    };

    // Данные для компиляции текущего списка
    private compilingList: {
        geometryBuffer: number[];
        currentTexture: WebGLTexture | null;
        currentMode: number;
        format: number;
        hasTexture: boolean;
        hasColor: boolean;
        stateCommands: GLCommand[];
        immediateMode: number | null;
        immediateVertices: number[];
        immediateHasColor: boolean;
        immediateHasTexture: boolean;
        currentColor: [number, number, number, number];
        currentTexCoord: [number, number];
    } | null = null;

    private fogState = {
        enabled: false,
        mode: GL.EXP,
        density: 1.0,
        start: 0.0,
        end: 1.0,
        color: [0.0, 0.0, 0.0, 1.0] as [number, number, number, number]
    };

    private lightingState = {
        ambient: [0.2, 0.2, 0.2, 1.0] as [number, number, number, number],
        localViewer: false,
        twoSided: false
    };

    private colorMaterialState = {
        enabled: false,
        face: GL.FRONT_AND_BACK,
        mode: GL.AMBIENT_AND_DIFFUSE
    };

    // Команды, которые НЕ компилируются (из документации Microsoft)
    private static readonly NON_COMPILABLE_COMMANDS: Set<keyof GL11> = new Set([
    'glColorPointer' as keyof GL11,
    'glDeleteLists' as keyof GL11,
    'glDisableClientState' as keyof GL11,
    'glEnableClientState' as keyof GL11,
    'glFeedbackBuffer' as keyof GL11,
    'glFinish' as keyof GL11,
    'glFlush' as keyof GL11,
    'glGenLists' as keyof GL11,
    'glInterleavedArrays' as keyof GL11,
    'glIsList' as keyof GL11,
    'glVertexPointer' as keyof GL11,
    'glTexCoordPointer' as keyof GL11,
    'glReadPixels' as keyof GL11,
    'glRenderMode' as keyof GL11,
    'glSelectBuffer' as keyof GL11,
    'glGetError' as keyof GL11,
    'glGetFloatv' as keyof GL11,
    'glGetIntegerv' as keyof GL11,
    'glNewList' as keyof GL11,
    'glEndList' as keyof GL11,
    'glCallList' as keyof GL11,
    'glCallLists' as keyof GL11,
    'setupPickCamera' as keyof GL11,
    'glLoadName' as keyof GL11,
]);

    constructor(canvas: HTMLCanvasElement) {
        const gl = canvas.getContext('webgl', { antialias: false, preserveDrawingBuffer: true });
        if (!gl) throw new Error("WebGL not supported.");
        this.gl = gl;
        this.mainShaderProgram = this.createProgram(vsSource, fsSource);
        this.mainProgramInfo = this.getProgramInfo(this.mainShaderProgram);
        this.pickingShaderProgram = this.createProgram(vsPickingSource, fsPickingSource);
        this.pickingProgramInfo = this.getProgramInfo(this.pickingShaderProgram, true);
        if (!this.pickingProgramInfo.uniforms.uPickingColor) {
            console.error("CRITICAL! Uniform 'uPickingColor' not found in picking shader.");
        }
        this.activeProgram = this.mainShaderProgram;
        this.gl.useProgram(this.activeProgram);
        const { fb } = this.createPickingFramebuffer(canvas.width, canvas.height);
        this.pickingFramebuffer = fb;
        this.immediate.vbo = gl.createBuffer();
        this.array.buffer = gl.createBuffer();
        this.currentMatrixStack = this.modelViewMatrixStack;
        this.renderMode = GL.RENDER;
        this.glViewport(0, 0, canvas.width, canvas.height);
        this.glClearColor(0, 0, 0, 0);
        this.glAlphaFunc(GL.GREATER, 0.0);
    }

    private updatePickMappingAndColor(): void {
        if (this.renderMode !== GL.SELECT) return;
        const id = this.pickIdCounter++;
        this.pickIdToNameStack.set(id, [...this.nameStack]);
        this.updatePickingColor(id);
    }

    public glNewList(list: number, mode: number): void {
        if (this.compilingList !== null) {
            console.error("GL_INVALID_OPERATION: glNewList called while already compiling");
            this.lastError = GL.INVALID_OPERATION;
            return;
        }
        
        if (list === 0) {
            console.error("GL_INVALID_VALUE: list was zero");
            this.lastError = GL.INVALID_VALUE;
            return;
        }
        
        if (mode !== GL.COMPILE && mode !== GL.COMPILE_AND_EXECUTE) {
            console.error("GL_INVALID_ENUM: mode was not an accepted value");
            this.lastError = GL.INVALID_ENUM;
            return;
        }
        
        this.currentListId = list;
        this.listMode = mode;
        this.compilingList = {
            geometryBuffer: [],
            currentTexture: null,
            currentMode: GL.TRIANGLES,
            format: GL.V3F,
            hasTexture: false,
            hasColor: false,
            stateCommands: [],
            immediateMode: null,
            immediateVertices: [],
            immediateHasColor: false,
            immediateHasTexture: false,
            currentColor: [1, 1, 1, 1],
            currentTexCoord: [0, 0]
        };
    }

    public glEndList(): void {
        if (!this.compilingList || this.currentListId === null) {
            console.error("GL_INVALID_OPERATION: glEndList without glNewList");
            this.lastError = GL.INVALID_OPERATION; // Устанавливаем ошибку
            return;
        }

        if (this.compilingList.immediateMode !== null) {
            this.flushImmediateGeometry();
        }

        const compiledGeometry = this.compileGeometry();
        
        const displayList: CompiledDisplayList = {
            geometry: compiledGeometry,
            stateCommands: [...this.compilingList.stateCommands]
        };

        this.lists.set(this.currentListId, displayList);
        
        this.compilingList = null;
        this.currentListId = null;
        this.listMode = 0;
    }

    private compileGeometry(): CompiledGeometry[] {
        if (!this.compilingList || this.compilingList.geometryBuffer.length === 0) {
            return [];
        }

        let format = GL.V3F;
        let stride = 3;
        
        if (this.compilingList.hasTexture && this.compilingList.hasColor) {
            format = GL.T2F_C3F_V3F;
            stride = 2 + 3 + 3;
        } else if (this.compilingList.hasTexture) {
            format = GL.T2F_V3F;
            stride = 2 + 3;
        } else if (this.compilingList.hasColor) {
            format = GL.C3F_V3F;
            stride = 3 + 3;
        }

        const gl = this.gl;
        const vbo = gl.createBuffer();
        if (!vbo) throw new Error("Failed to create VBO");

        const vertexData = new Float32Array(this.compilingList.geometryBuffer);
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        return [{
            vbo: vbo,
            vertexCount: this.compilingList.geometryBuffer.length / stride,
            mode: this.compilingList.currentMode,
            format: format,
            texture: this.compilingList.currentTexture,
            hasTexture: this.compilingList.hasTexture,
            hasColor: this.compilingList.hasColor
        }];
    }

    private flushImmediateGeometry(): void {
        if (!this.compilingList || this.compilingList.immediateVertices.length === 0) return;

        let vertices = this.compilingList.immediateVertices;
        let mode = this.compilingList.immediateMode!;
        
        if (mode === GL.QUADS) {
            vertices = this.convertQuadsToTriangles(vertices);
            mode = GL.TRIANGLES;
        }

        this.compilingList.geometryBuffer.push(...vertices);
        this.compilingList.currentMode = mode;
        
        this.compilingList.immediateVertices = [];
        this.compilingList.immediateMode = null;
    }

    private convertQuadsToTriangles(quadData: number[]): number[] {
        const triangleData: number[] = [];
        
        // Определяем stride на основе формата данных
        let stride = 3; // Базовые вершины (x, y, z)
        
        if (this.compilingList) {
            if (this.compilingList.hasTexture && this.compilingList.hasColor) {
                stride = 2 + 3 + 3; // texture(2) + color(3) + vertex(3)
            } else if (this.compilingList.hasTexture) {
                stride = 2 + 3; // texture(2) + vertex(3) 
            } else if (this.compilingList.hasColor) {
                stride = 3 + 3; // color(3) + vertex(3)
            }
        }
        
        const verticesPerQuad = 4;
        const quadsCount = quadData.length / (stride * verticesPerQuad);

        for (let i = 0; i < quadsCount; i++) {
            const quadStart = i * stride * verticesPerQuad;
            
            // Извлекаем 4 вершины квада
            const v0 = quadData.slice(quadStart, quadStart + stride);
            const v1 = quadData.slice(quadStart + stride, quadStart + stride * 2);
            const v2 = quadData.slice(quadStart + stride * 2, quadStart + stride * 3);
            const v3 = quadData.slice(quadStart + stride * 3, quadStart + stride * 4);
            
            // Создаем 2 треугольника: (v0,v1,v2) и (v0,v2,v3)
            triangleData.push(...v0, ...v1, ...v2);
            triangleData.push(...v0, ...v2, ...v3);
        }

        return triangleData;
    }

    private recordCommand(func: keyof GL11, args: any[]): boolean {
        if (this.compilingList !== null) {
            if (GL11.NON_COMPILABLE_COMMANDS.has(func)) {
                return false;
            }
            
            if (this.isStateCommand(func)) {
                this.compilingList.stateCommands.push({ func, args: [...args] });
                
                if (this.listMode === GL.COMPILE_AND_EXECUTE) {
                    return false;
                }
                return true;
            }
            
            return this.handleGeometryCommand(func, args);
        }
        
        return false;
    }

    private isStateCommand(func: keyof GL11): boolean {
        const stateCommands = new Set([
            'glEnable', 'glDisable', 'glBindTexture', 'glTexParameteri',
            'glBlendFunc', 'glDepthFunc', 'glCullFace', 'glAlphaFunc',
            'glColorMaterial', 'glFogi', 'glFogf', 'glFogfv', 'glFog',
            'glLightModel', 'glLightModelfv'
        ]);
        return stateCommands.has(func);
    }

    private handleGeometryCommand(func: keyof GL11, args: any[]): boolean {
        if (!this.compilingList) return false;

        switch (func) {
            case 'glBegin':
                this.compilingList.immediateMode = args[0];
                this.compilingList.immediateVertices = [];
                this.compilingList.immediateHasColor = false;
                this.compilingList.immediateHasTexture = false;
                break;
                
            case 'glEnd':
                this.flushImmediateGeometry();
                break;
                
            case 'glVertex3f':
                if (this.compilingList.immediateMode !== null) {
                    const vertex: number[] = [];
                    
                    if (this.compilingList.immediateHasTexture) {
                        vertex.push(...this.compilingList.currentTexCoord);
                    }
                    
                    if (this.compilingList.immediateHasColor) {
                        vertex.push(
                            this.compilingList.currentColor[0],
                            this.compilingList.currentColor[1],
                            this.compilingList.currentColor[2]
                        );
                    }
                    
                    vertex.push(args[0], args[1], args[2]);
                    this.compilingList.immediateVertices.push(...vertex);
                }
                break;
                
            case 'glColor3f':
                this.compilingList.currentColor = [args[0], args[1], args[2], 1.0];
                this.compilingList.immediateHasColor = true;
                this.compilingList.hasColor = true;
                break;
                
            case 'glColor4f':
                this.compilingList.currentColor = [args[0], args[1], args[2], args[3]];
                this.compilingList.immediateHasColor = true;
                this.compilingList.hasColor = true;
                break;
                
            case 'glTexCoord2f':
                this.compilingList.currentTexCoord = [args[0], args[1]];
                this.compilingList.immediateHasTexture = true;
                this.compilingList.hasTexture = true;
                break;

            case 'glDrawArrays':
                const mode = args[0];
                const first = args[1];
                const count = args[2];
                
                if (this.currentArrayData.buffer) {
                    const format = this.currentArrayData.format;
                    const stride = this.getStrideFromFormat(format);
                    
                    const startIndex = first * stride;
                    const endIndex = startIndex + (count * stride);
                    const vertexData = this.currentArrayData.buffer.slice(startIndex, endIndex);
                    
                    this.compilingList.geometryBuffer.push(...Array.from(vertexData));
                    this.compilingList.format = format;
                    
                    // ИСПРАВЛЕНИЕ: сохраняем оригинальный режим для правильной обработки в glCallList
                    this.compilingList.currentMode = mode; // Сохраняем оригинальный GL_QUADS
                    
                    this.updateFormatFlags(format);
                    // console.log(`Cached ${count} vertices from glDrawArrays for Display List`);
                }
                break;
        }

        if (this.listMode === GL.COMPILE_AND_EXECUTE) {
            return false;
        }
        return true;
    }

    private getStrideFromFormat(format: number): number {
        switch (format) {
            case GL.V2F: return 2;
            case GL.V3F: return 3;
            case GL.C3F_V3F: return 6;
            case GL.T2F_V3F: return 5;
            case GL.T2F_C3F_V3F: return 8;
            default: return 3;
        }
    }

    private getVertexOffsetFromFormat(format: number): number {
        switch (format) {
            case GL.V2F:
            case GL.V3F:
                return 0;
            case GL.C3F_V3F:
                return 3; // После C3F (3 * float)
            case GL.T2F_V3F:
                return 2; // После T2F (2 * float)
            case GL.T2F_C3F_V3F:
                return 5; // После T2F_C3F (2 + 3 floats)
            default:
                console.warn(`getVertexOffsetFromFormat: Unknown format ${format}`);
                return 0;
        }
    }

    private updateFormatFlags(format: number): void {
        if (!this.compilingList) return;
        
        switch (format) {
            case GL.T2F_C3F_V3F:
                this.compilingList.hasTexture = true;
                this.compilingList.hasColor = true;
                break;
            case GL.T2F_V3F:
                this.compilingList.hasTexture = true;
                break;
            case GL.C3F_V3F:
                this.compilingList.hasColor = true;
                break;
        }
    }

    public glCallList(list: number): void {
        const displayList = this.lists.get(list);
        if (!displayList) {
            return;
        }

        const gl = this.gl;
        
        // Отрисовываем только геометрию
        for (const geom of displayList.geometry) {
            gl.bindBuffer(gl.ARRAY_BUFFER, geom.vbo);
            
            if (geom.texture) {
                this.glBindTexture(GL.TEXTURE_2D, geom.texture);
            }
            
            this.setupInterleavedPointers(geom.format);
            
            // ПРИНУДИТЕЛЬНО обновляем ВСЕ uniforms перед каждым draw call
            this.forceUpdateUniforms();
            
            if (geom.mode !== GL.QUADS) {
                gl.drawArrays(geom.mode, 0, geom.vertexCount);
            } else {
                // QUADS конвертация
                const numQuads = geom.vertexCount / 4;
                if (numQuads !== Math.floor(numQuads)) continue;
                
                const indices = new Uint16Array(numQuads * 6);
                for (let i = 0; i < numQuads; i++) {
                    const baseIndex = i * 4;
                    indices[i * 6 + 0] = baseIndex + 0;
                    indices[i * 6 + 1] = baseIndex + 1;
                    indices[i * 6 + 2] = baseIndex + 2;
                    indices[i * 6 + 3] = baseIndex + 0;
                    indices[i * 6 + 4] = baseIndex + 2;
                    indices[i * 6 + 5] = baseIndex + 3;
                }
                
                const indexBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
                gl.drawElements(GL.TRIANGLES, numQuads * 6, gl.UNSIGNED_SHORT, 0);
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
                gl.deleteBuffer(indexBuffer);
            }
        }
        
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    // Новый метод для принудительного обновления uniforms
    private forceUpdateUniforms(): void {
        const uniforms = this.mainProgramInfo.uniforms;
        
        // Матрицы
        this.gl.uniformMatrix4fv(uniforms.projectionMatrix, false, this.projectionMatrixStack.current);
        this.gl.uniformMatrix4fv(uniforms.modelViewMatrix, false, this.modelViewMatrixStack.current);
        
        // Туман
        this.gl.uniform1i(uniforms.uFogEnabled, this.fogState.enabled ? 1 : 0);
        this.gl.uniform1i(uniforms.uFogMode, this.fogState.mode);
        this.gl.uniform1f(uniforms.uFogDensity, this.fogState.density);
        this.gl.uniform1f(uniforms.uFogStart, this.fogState.start);
        this.gl.uniform1f(uniforms.uFogEnd, this.fogState.end);
        this.gl.uniform3f(uniforms.uFogColor, this.fogState.color[0], this.fogState.color[1], this.fogState.color[2]);
        
        // Освещение
        this.gl.uniform4f(uniforms.uLightModelAmbient, 
            this.lightingState.ambient[0], 
            this.lightingState.ambient[1], 
            this.lightingState.ambient[2], 
            this.lightingState.ambient[3]);
        
        // Цветной материал
        this.gl.uniform1i(uniforms.uColorMaterialEnabled, this.colorMaterialState.enabled ? 1 : 0);
    }

    private setupInterleavedPointers(format: number, stride: number = 0): void {
        const gl = this.gl;
        let calculatedStride = 0, colorOffset: number | null = null, texOffset: number | null = null, vertexOffset: number | null = null;
        let vertexSize = 3, hasTex = false, hasColor = false;

        // Определяем смещения и флаги на основе формата
        switch (format) {
            case GL.V2F: calculatedStride = 2 * 4; vertexOffset = 0; vertexSize = 2; break;
            case GL.V3F: calculatedStride = 3 * 4; vertexOffset = 0; vertexSize = 3; break;
            case GL.C3F_V3F: calculatedStride = (3 + 3) * 4; colorOffset = 0; vertexOffset = 3 * 4; hasColor = true; break;
            case GL.T2F_V3F: calculatedStride = (2 + 3) * 4; texOffset = 0; vertexOffset = 2 * 4; hasTex = true; break;
            case GL.T2F_C3F_V3F: calculatedStride = (2 + 3 + 3) * 4; texOffset = 0; colorOffset = 2 * 4; vertexOffset = (2 + 3) * 4; hasTex = true; hasColor = true; break;
            default: throw new Error(`Unsupported format for setupInterleavedPointers: ${format}`);
        }

        const byteStride = stride === 0 ? calculatedStride : stride;
        
        const isPicking = this.activeProgram === this.pickingShaderProgram;
        const mainAttribs = this.mainProgramInfo.attribs;
        const pickingAttribs = this.pickingProgramInfo.attribs;
        const vertexPosAttrib = isPicking ? pickingAttribs.vertexPosition : mainAttribs.vertexPosition;

        // --- Позиции вершин (общие для обоих шейдеров) ---
        if (vertexOffset !== null && vertexPosAttrib > -1) {
            gl.enableVertexAttribArray(vertexPosAttrib);
            gl.vertexAttribPointer(vertexPosAttrib, vertexSize, gl.FLOAT, false, byteStride, vertexOffset);
        }

        // --- Атрибуты только для основного шейдера ---
        if (!isPicking) {
            // Цвет вершин
            if (hasColor && mainAttribs.vertexColor > -1) {
                gl.enableVertexAttribArray(mainAttribs.vertexColor);
                // Обратите внимание на размер 3 (RGB)
                gl.vertexAttribPointer(mainAttribs.vertexColor, 3, gl.FLOAT, false, byteStride, colorOffset!);
            } else if (mainAttribs.vertexColor > -1) {
                // ИСПРАВЛЕНО: Просто отключаем массив. Цвет, установленный glColor4f, сохранится.
                gl.disableVertexAttribArray(mainAttribs.vertexColor);
            }

            // Текстурные координаты
            if (hasTex && mainAttribs.textureCoord > -1) {
                gl.enableVertexAttribArray(mainAttribs.textureCoord);
                gl.vertexAttribPointer(mainAttribs.textureCoord, 2, gl.FLOAT, false, byteStride, texOffset!);
            } else if (mainAttribs.textureCoord > -1) {
                gl.disableVertexAttribArray(mainAttribs.textureCoord);
            }
            
            gl.uniform1i(this.mainProgramInfo.uniforms.uUseTexture, this.textureEnabled && hasTex ? 1 : 0);
        } else {
            // --- Отключение атрибутов для picking-шейдера ---
            if (mainAttribs.vertexColor > -1) gl.disableVertexAttribArray(mainAttribs.vertexColor);
            if (mainAttribs.textureCoord > -1) gl.disableVertexAttribArray(mainAttribs.textureCoord);
        }
    }
    public glEnable(cap: number): void {
        if (this.recordCommand('glEnable', [cap])) return;
        
        switch (cap) {
            case GL.FOG:
                this.fogState.enabled = true;
                return;
            case GL.COLOR_MATERIAL:
                this.colorMaterialState.enabled = true;
                return;
            case GL.ALPHA_TEST:
            case GL.LIGHTING:
                return; // Игнорируем
            case GL.TEXTURE_2D:
                this.textureEnabled = true;
                return;
            default:
                this.gl.enable(cap);
        }
    }
    public glDisable(cap: number): void {
        if (this.recordCommand('glDisable', [cap])) return;
        
        switch (cap) {
            case GL.FOG:
                this.fogState.enabled = false;
                return;
            case GL.COLOR_MATERIAL:
                this.colorMaterialState.enabled = false;
                return;
            case GL.ALPHA_TEST:
            case GL.LIGHTING:
                return; // Игнорируем
            case GL.TEXTURE_2D:
                this.textureEnabled = false;
                return;
            default:
                this.gl.disable(cap);
        }
    }
    public glGetError(): number { if (this.recordCommand('glGetError', [])) return 0; const error = this.lastError; this.lastError = GL.NO_ERROR; const webglError = this.gl.getError(); return error !== GL.NO_ERROR ? error : webglError; }
    private createProgram(vs: string, fs: string): WebGLProgram { const gl = this.gl; const p = gl.createProgram()!; gl.attachShader(p, loadShader(gl, gl.VERTEX_SHADER, vs)); gl.attachShader(p, loadShader(gl, gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`Shader linking error: ${gl.getProgramInfoLog(p)}`); return p; }
    private getProgramInfo(p: WebGLProgram, isPicking = false) {
        const gl = this.gl;
        const i: any = {
            attribs: {
                vertexPosition: gl.getAttribLocation(p, 'aVertexPosition'),
            },
            uniforms: {
                projectionMatrix: gl.getUniformLocation(p, 'uProjectionMatrix')!,
                modelViewMatrix: gl.getUniformLocation(p, 'uModelViewMatrix')!,
            }
        };
        
        if (isPicking) {
            i.uniforms.uPickingColor = gl.getUniformLocation(p, 'uPickingColor')!;
        } else {
            i.attribs.vertexColor = gl.getAttribLocation(p, 'aVertexColor');
            i.attribs.textureCoord = gl.getAttribLocation(p, 'aTextureCoord');
            i.uniforms.uSampler = gl.getUniformLocation(p, 'uSampler')!;
            i.uniforms.uUseTexture = gl.getUniformLocation(p, 'uUseTexture')!;
            i.uniforms.uAlphaTestValue = gl.getUniformLocation(p, 'uAlphaTestValue')!;
            
            // Униформы тумана
            i.uniforms.uFogEnabled = gl.getUniformLocation(p, 'uFogEnabled')!;
            i.uniforms.uFogMode = gl.getUniformLocation(p, 'uFogMode')!;
            i.uniforms.uFogDensity = gl.getUniformLocation(p, 'uFogDensity')!;
            i.uniforms.uFogStart = gl.getUniformLocation(p, 'uFogStart')!;
            i.uniforms.uFogEnd = gl.getUniformLocation(p, 'uFogEnd')!;
            i.uniforms.uFogColor = gl.getUniformLocation(p, 'uFogColor')!;
            
            // Униформы освещения
            i.uniforms.uLightModelAmbient = gl.getUniformLocation(p, 'uLightModelAmbient')!;
            
            // Униформы для цветного материала
            i.uniforms.uColorMaterialEnabled = gl.getUniformLocation(p, 'uColorMaterialEnabled')!;
        }
        return i;
    }

    private createPickingFramebuffer(width: number, height: number) { 
        const gl = this.gl; 
        const fb = gl.createFramebuffer()!; 
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb); 
        const tex = gl.createTexture()!; 
        gl.bindTexture(gl.TEXTURE_2D, tex); 
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); 
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); 
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0); 
        const depth = gl.createRenderbuffer()!; 
        gl.bindRenderbuffer(gl.RENDERBUFFER, depth); 
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height); 
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth); 
        gl.bindFramebuffer(gl.FRAMEBUFFER, null); 
        gl.bindTexture(gl.TEXTURE_2D, null); 
        gl.bindRenderbuffer(gl.RENDERBUFFER, null); 
        
        return { fb, tex, depth }; 
    }
    
    private getFramebufferStatusString(status: number): string {
        switch (status) {
            case this.gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT: return "Incomplete attachment";
            case this.gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT: return "Missing attachment";
            case this.gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS: return "Incomplete dimensions";
            case this.gl.FRAMEBUFFER_UNSUPPORTED: return "Unsupported";
            default: return `Unknown status: ${status}`;
        }
    }
    private useProgram(program: WebGLProgram): void { if (this.activeProgram !== program) { this.activeProgram = program; this.gl.useProgram(program); } }
    private updateMatrices(): void {
        const isPicking = this.renderMode === GL.SELECT;
        const uniforms = isPicking ? this.pickingProgramInfo.uniforms : this.mainProgramInfo.uniforms;
        
        this.gl.uniformMatrix4fv(uniforms.projectionMatrix, false, this.projectionMatrixStack.current);
        this.gl.uniformMatrix4fv(uniforms.modelViewMatrix, false, this.modelViewMatrixStack.current);
        
        if (!isPicking) {
            // Туман
            this.gl.uniform1i(uniforms.uFogEnabled, this.fogState.enabled ? 1 : 0);
            this.gl.uniform1i(uniforms.uFogMode, this.fogState.mode);
            this.gl.uniform1f(uniforms.uFogDensity, this.fogState.density);
            this.gl.uniform1f(uniforms.uFogStart, this.fogState.start);
            this.gl.uniform1f(uniforms.uFogEnd, this.fogState.end);
            this.gl.uniform3f(uniforms.uFogColor, this.fogState.color[0], this.fogState.color[1], this.fogState.color[2]);
            
            // Освещение
            this.gl.uniform4f(uniforms.uLightModelAmbient, 
                this.lightingState.ambient[0], 
                this.lightingState.ambient[1], 
                this.lightingState.ambient[2], 
                this.lightingState.ambient[3]);
            
            // Цветной материал
            this.gl.uniform1i(uniforms.uColorMaterialEnabled, this.colorMaterialState.enabled ? 1 : 0);
            
            // ОТЛАДКА:
            // console.log(`🔧 Uniforms: fog=${this.fogState.enabled}, density=${this.fogState.density}, color=[${this.fogState.color.join(',')}]`);
        }
    }
    private updatePickingColor(id: number): void {
        const r = (id & 0xFF) / 255.0;
        const g = ((id >> 8) & 0xFF) / 255.0;
        const b = ((id >> 16) & 0xFF) / 255.0;
        this.gl.uniform4f(this.pickingProgramInfo.uniforms.uPickingColor, r, g, b, 1.0);
    }
    public glGetFloatv(pname: number, params: Float32Array | FloatBuffer): void { let targetArray: Float32Array; if (params instanceof FloatBuffer) { targetArray = params.getRawArray(); } else { targetArray = params; } switch (pname) { case GL.PROJECTION_MATRIX: targetArray.set(this.projectionMatrixStack.current); break; case GL.MODELVIEW_MATRIX: targetArray.set(this.modelViewMatrixStack.current); break; default: const result = this.gl.getParameter(pname); if (result instanceof Float32Array) { targetArray.set(result); } else { console.warn(`glGetFloatv for pname=${pname} is not fully supported.`); }}}
    public glGetIntegerv(pname: number, buffer: Int32Array | IntBuffer): void { var params: Int32Array; if (buffer instanceof IntBuffer) { params = buffer.getRawArray(); } else { params = buffer; } if (pname === GL.VIEWPORT) { params.set(this.stateCache.viewport); } else { const result = this.gl.getParameter(pname); if (typeof result === 'number') params[0] = result; else if (result instanceof Int32Array || result instanceof Uint32Array) params.set(result); else if (result === null) params[0] = 0; else console.warn(`glGetIntegerv: Unhandled return type for pname=${pname}: ${result}`); } }
    public glRenderMode(mode: number): number {
        if (this.recordCommand('glRenderMode', [mode])) return 0;

        // --- ВЫХОД ИЗ РЕЖИМА SELECT ---
        if (this.renderMode === GL.SELECT) {
            // В оригинальном OpenGL 1.1 SELECT режим автоматически записывает hits в буфер
            // Мы эмулируем это через Color Picking
            let hits = 0;
            const pixelData = new Uint8Array(4);
            const viewportHeight = this.stateCache.viewport[3];
            if (viewportHeight <= 0) return 0;
            const y = viewportHeight - this.pickY - 1;
            if (this.pickX < 0 || this.pickX >= this.stateCache.viewport[2] || y < 0 || y >= viewportHeight) return 0;
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.pickingFramebuffer);
            const fbStatus = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
            if (fbStatus !== this.gl.FRAMEBUFFER_COMPLETE) return 0;
            this.gl.readPixels(this.pickX, y, 1, 1, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixelData);
            const id = pixelData[0] | (pixelData[1] << 8) | (pixelData[2] << 16);
            if (id > 0 && this.selectBuffer) {
                const hitNameStack = this.pickIdToNameStack.get(id);
                if (hitNameStack && this.selectBuffer.remaining() >= 3 + hitNameStack.length) {
                    this.selectBuffer.put(hitNameStack.length);
                    this.selectBuffer.put(0); // minZ
                    this.selectBuffer.put(0xFFFFFFFF); // maxZ
                    this.selectBuffer.put(hitNameStack);
                    hits = 1;
                }
            }
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
            this.useProgram(this.mainShaderProgram);
            const clearColor = this.stateCache.clearColor;
            this.gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
            this.renderMode = mode;
            return hits;
        }

        // --- ВХОД В РЕЖИМ SELECT ---
        this.renderMode = mode;
        if (this.renderMode === GL.SELECT) {
            this.pickIdCounter = 1;
            this.pickIdToNameStack.clear();
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.pickingFramebuffer);
            this.useProgram(this.pickingShaderProgram);
            this.gl.clearColor(0, 0, 0, 1);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
            this.glInitNames();
        }
        return 0;
    }
    public glSelectBuffer(buffer: IntBuffer): void {
        if (this.recordCommand('glSelectBuffer', [buffer])) return;
        this.selectBuffer = buffer;
        if (this.selectBuffer) this.selectBuffer.clear();
    }
    public glInitNames(): void {
        if (this.recordCommand('glInitNames', [])) return;
        this.nameStack = [];
        this.updatePickMappingAndColor();
    }
    public setupPickCamera(x: number, y: number): void {
        if (this.recordCommand('setupPickCamera', [x, y])) return;
        this.pickX = x;
        this.pickY = y;
    }
    public glGenLists(range: number): number { const base = this.nextListId; this.nextListId += range; return base; }
    public glPushName(name: number): void {
        if (this.recordCommand('glPushName', [name])) return;
        this.nameStack.push(name);
        this.updatePickMappingAndColor();
    }
    public glLoadName(name: number): void {
        if (this.recordCommand('glLoadName', [name])) return;
        if (this.nameStack.length > 0) this.nameStack.pop();
        this.nameStack.push(name);
        this.updatePickMappingAndColor();
    }
    public glPopName(): void {
        if (this.recordCommand('glPopName', [])) return;
        if (this.nameStack.length > 0) this.nameStack.pop();
        this.updatePickMappingAndColor();
    }
    public glClearColor(r: number, g: number, b: number, a: number): void { if(this.recordCommand('glClearColor', [r,g,b,a])) return; this.stateCache.clearColor.set([r,g,b,a]); this.gl.clearColor(r,g,b,a); }
    public glClear(mask: number): void { if(this.recordCommand('glClear', [mask])) return; this.gl.clear(mask); }
    public glClearDepth(depth: number): void { if(this.recordCommand('glClearDepth', [depth])) return; this.gl.clearDepth(depth); }
    public glViewport(x: number, y: number, width: number, height: number): void { if(this.recordCommand('glViewport', [x,y,width,height])) return; this.stateCache.viewport.set([x,y,width,height]); this.gl.viewport(x,y,width,height); }
    public glDepthFunc(func: number): void { if(this.recordCommand('glDepthFunc', [func])) return; this.gl.depthFunc(func); }
    public glBlendFunc(sfactor: number, dfactor: number): void { if(this.recordCommand('glBlendFunc', [sfactor,dfactor])) return; this.gl.blendFunc(sfactor,dfactor); }
    public glBindTexture(target: number, texture: WebGLTexture | number | null): void { if (this.recordCommand('glBindTexture', [target, texture])) return; let webglTexture: WebGLTexture | null = null; if (typeof texture === 'number') { webglTexture = this.textureMap.get(texture) || null; } else { webglTexture = texture; } if (this.compilingList) { this.compilingList.currentTexture = webglTexture; } this.gl.bindTexture(target, webglTexture); }
    public glMatrixMode(mode: number): void { if(this.recordCommand('glMatrixMode', [mode])) return; if (mode === GL.PROJECTION) this.currentMatrixStack = this.projectionMatrixStack; else if (mode === GL.MODELVIEW) this.currentMatrixStack = this.modelViewMatrixStack; }
    public glLoadIdentity(): void { if(this.recordCommand('glLoadIdentity', [])) return; this.currentMatrixStack.loadIdentity(); }
    public glPushMatrix(): void { if(this.recordCommand('glPushMatrix', [])) return; this.currentMatrixStack.push(); }
    public glPopMatrix(): void { if(this.recordCommand('glPopMatrix', [])) return; this.currentMatrixStack.pop(); }
    public glTranslatef(x: number, y: number, z: number): void { if(this.recordCommand('glTranslatef', [x,y,z])) return; this.currentMatrixStack.translate([x,y,z]); }
    public glRotatef(angle: number, x: number, y: number, z: number): void { if(this.recordCommand('glRotatef', [angle,x,y,z])) return; this.currentMatrixStack.rotate(angle,[x,y,z]); }
    public glScalef(x: number, y: number, z: number): void { if(this.recordCommand('glScalef', [x,y,z])) return; this.currentMatrixStack.scale([x,y,z]); }
    public glOrtho(left: number, right: number, bottom: number, top: number, near: number, far: number): void { if(this.recordCommand('glOrtho', [left,right,bottom,top,near,far])) return; const o=mat4.create(); mat4.ortho(o,left,right,bottom,top,near,far); this.currentMatrixStack.loadIdentity(); this.currentMatrixStack.multMatrix(o); }
    public glBegin(mode: number): void { if(this.recordCommand('glBegin', [mode])) return; this.immediate.mode = mode; this.immediate.vertexData = []; this.immediate.vertexCount = 0; this.immediate.hasColor = false; this.immediate.hasTexture = false; }
    public glColor4f(r: number, g: number, b: number, a: number): void { if(this.recordCommand('glColor4f', [r,g,b,a])) return; this.immediate.currentColor = [r,g,b,a]; if(this.activeProgram === this.mainShaderProgram) this.gl.vertexAttrib4f(this.mainProgramInfo.attribs.vertexColor,r,g,b,a); }
    public glColor3f(r: number, g: number, b: number): void { if(this.recordCommand('glColor3f', [r,g,b])) return; this.glColor4f(r, g, b, 1.0); }
    public glTexCoord2f(u: number, v: number): void { if(this.recordCommand('glTexCoord2f', [u,v])) return; this.immediate.currentTexCoord = [u,v]; this.immediate.hasTexture = true; }
    public glVertex3f(x: number, y: number, z: number): void { if(this.recordCommand('glVertex3f', [x,y,z])) return; this.immediate.vertexData.push(x,y,z,...this.immediate.currentColor,...this.immediate.currentTexCoord); this.immediate.vertexCount++; }
    public glVertex2f(x: number, y: number): void { if(this.recordCommand('glVertex2f', [x,y])) return; this.glVertex3f(x, y, 0.0); }
    public glEnd(): void { if (this.recordCommand('glEnd', [])) return; if (this.immediate.vertexCount === 0) return; let data=this.immediate.vertexData; let mode=this.immediate.mode; const stride=3+4+2; if(mode===GL.QUADS){const qd=[]; for(let i=0;i<this.immediate.vertexCount/4;i++){const v0=data.slice(i*4*stride,(i*4+1)*stride); const v1=data.slice((i*4+1)*stride,(i*4+2)*stride); const v2=data.slice((i*4+2)*stride,(i*4+3)*stride); const v3=data.slice((i*4+3)*stride,(i*4+4)*stride); qd.push(...v0,...v1,...v2); qd.push(...v0,...v2,...v3);} data=qd; mode=GL.TRIANGLES;} const gl=this.gl; gl.bindBuffer(gl.ARRAY_BUFFER,this.immediate.vbo); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.DYNAMIC_DRAW); const byteStride=stride*4; const isPicking=this.renderMode===GL.SELECT; this.updateMatrices(); const attribs=isPicking?this.pickingProgramInfo.attribs:this.mainProgramInfo.attribs; gl.vertexAttribPointer(attribs.vertexPosition,3,gl.FLOAT,false,byteStride,0); gl.enableVertexAttribArray(attribs.vertexPosition); if(!isPicking){gl.vertexAttribPointer(this.mainProgramInfo.attribs.vertexColor,4,gl.FLOAT,false,byteStride,3*4); gl.enableVertexAttribArray(this.mainProgramInfo.attribs.vertexColor); gl.vertexAttribPointer(this.mainProgramInfo.attribs.textureCoord,2,gl.FLOAT,false,byteStride,(3+4)*4); gl.enableVertexAttribArray(this.mainProgramInfo.attribs.textureCoord); gl.uniform1i(this.mainProgramInfo.uniforms.uUseTexture, this.textureEnabled&&this.immediate.hasTexture?1:0);} gl.drawArrays(mode,0,data.length/stride); gl.disableVertexAttribArray(attribs.vertexPosition); if(!isPicking){gl.disableVertexAttribArray(this.mainProgramInfo.attribs.vertexColor); gl.disableVertexAttribArray(this.mainProgramInfo.attribs.textureCoord);} }
    public glAlphaFunc(func: number, ref: number): void { if(this.recordCommand('glAlphaFunc', [func,ref])) return; this.stateCache.alphaTestFunc=func; this.stateCache.alphaTestRef=ref; if(func!==GL.GREATER)console.warn("glAlphaFunc only supports GL_GREATER."); this.gl.uniform1f(this.mainProgramInfo.uniforms.uAlphaTestValue,ref); }
    public glTexParameteri(target: number, pname: number, param: number): void { if(this.recordCommand('glTexParameteri', [target,pname,param])) return; this.gl.texParameteri(target,pname,param); }
    public glShadeModel(mode: number): void { if(this.recordCommand('glShadeModel', [mode])) return; console.warn("glShadeModel is ignored in this WebGL implementation."); }
    public glCullFace(mode: number): void { if(this.recordCommand('glCullFace', [mode])) return; this.gl.cullFace(mode); }
    public glDrawArrays(mode: number, first: number, count: number): void {
        if (this.recordCommand('glDrawArrays', [mode, first, count])) return;

        const isPicking = this.renderMode === GL.SELECT;
        const gl = this.gl;
        
        // Обновляем матрицы. Эта функция уже учитывает режим (isPicking).
        this.updateMatrices();

        if (isPicking) {
            this.useProgram(this.pickingShaderProgram);
            const attribs = this.pickingProgramInfo.attribs;
            const format = this.currentArrayData.format;
            const strideBytes = this.getStrideFromFormat(format) * 4;
            const offsetBytes = this.getVertexOffsetFromFormat(format) * 4;
            if (this.mainProgramInfo.attribs.vertexColor) gl.disableVertexAttribArray(this.mainProgramInfo.attribs.vertexColor);
            if (this.mainProgramInfo.attribs.textureCoord) gl.disableVertexAttribArray(this.mainProgramInfo.attribs.textureCoord);
            gl.enableVertexAttribArray(attribs.vertexPosition);
            gl.vertexAttribPointer(attribs.vertexPosition, 3, gl.FLOAT, false, strideBytes, offsetBytes);
        } else {
            /***** ЛОГИКА ДЛЯ ОБЫЧНОГО РЕНДЕРИНГА (RENDER) *****/
            
            // 1. Используем основную программу
            this.useProgram(this.mainShaderProgram);
            
            // 2. Настраиваем все атрибуты (позиция, цвет, текстура)
            this.setupInterleavedPointers(this.currentArrayData.format, this.currentArrayData.stride);
        }
        
        // 3. Выполняем отрисовку (логика конвертации QUADS общая для обоих режимов)
        if (mode !== GL.QUADS) {
            gl.drawArrays(mode, first, count);
        } else {
            if (count % 4 !== 0) {
                console.warn("Vertex count for GL_QUADS is not a multiple of 4.");
                return;
            }
            const numQuads = count / 4;
            const indices = new Uint16Array(numQuads * 6);
            for (let i = 0; i < numQuads; i++) {
                const baseIndex = first + i * 4;
                indices[i * 6 + 0] = baseIndex + 0;
                indices[i * 6 + 1] = baseIndex + 1;
                indices[i * 6 + 2] = baseIndex + 2;
                indices[i * 6 + 3] = baseIndex + 0;
                indices[i * 6 + 4] = baseIndex + 2;
                indices[i * 6 + 5] = baseIndex + 3;
            }
            const indexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
            gl.drawElements(GL.TRIANGLES, numQuads * 6, gl.UNSIGNED_SHORT, 0);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
            gl.deleteBuffer(indexBuffer);
        }
    }
    public glInterleavedArrays(format: number, stride: number, data: FloatBuffer | Float32Array | number[]): void { if(this.recordCommand('glInterleavedArrays', [format,stride,data])) return; const gl=this.gl; let arrayData:Float32Array; if(data instanceof FloatBuffer){ arrayData=data.toFloat32Array(); } else { arrayData=new Float32Array(data); } this.currentArrayData.buffer = arrayData.slice(); this.currentArrayData.format = format; this.currentArrayData.stride = stride; gl.bindBuffer(gl.ARRAY_BUFFER,this.array.buffer); gl.bufferData(gl.ARRAY_BUFFER,arrayData,gl.STATIC_DRAW); this.setupInterleavedPointers(format, stride); }
    public glEnableClientState(cap: number): void { if(this.recordCommand('glEnableClientState', [cap])) return; const gl=this.gl; switch(cap){case GL.VERTEX_ARRAY:gl.enableVertexAttribArray(this.mainProgramInfo.attribs.vertexPosition);break; case GL.COLOR_ARRAY:gl.enableVertexAttribArray(this.mainProgramInfo.attribs.vertexColor);break; case GL.TEXTURE_COORD_ARRAY:gl.enableVertexAttribArray(this.mainProgramInfo.attribs.textureCoord);break; default:this.glEnable(cap);break;} }
    public glDisableClientState(cap: number): void { if(this.recordCommand('glDisableClientState', [cap])) return; const gl=this.gl; switch(cap){case GL.VERTEX_ARRAY:gl.disableVertexAttribArray(this.mainProgramInfo.attribs.vertexPosition);break; case GL.COLOR_ARRAY:gl.disableVertexAttribArray(this.mainProgramInfo.attribs.vertexColor);break; case GL.TEXTURE_COORD_ARRAY:gl.disableVertexAttribArray(this.mainProgramInfo.attribs.textureCoord);break; default:this.glDisable(cap);break;} }
    public glIsList(list: number): boolean { return this.lists.has(list); }
    public glDeleteLists(list: number, range: number): void { if (this.recordCommand('glDeleteLists', [list, range])) return; for (let i = 0; i < range; i++) { const displayList = this.lists.get(list + i); if (displayList) { for (const geom of displayList.geometry) { this.gl.deleteBuffer(geom.vbo); } } this.lists.delete(list + i); } }
    public glTexImage2D(target: number, level: number, internalformat: number, format: number, type: number, pixels: TexImageSource): void;
    public glTexImage2D(target: number, level: number, internalformat: number, width: number, height: number, border: number, format: number, type: number, pixels: ArrayBufferView | null): void;
    public glTexImage2D(...args: any[]): void { (this.gl.texImage2D as Function).apply(this.gl, args); }
    public glGenTextures(): WebGLTexture;
    public glGenTextures(n: number): WebGLTexture[];
    public glGenTextures(buffer: IntBuffer): void;
    public glGenTextures(nOrBuffer?: number | IntBuffer): WebGLTexture | WebGLTexture[] | void { if (nOrBuffer === undefined) { return this.gl.createTexture()!; } else if (typeof nOrBuffer === 'number') { const textures: WebGLTexture[] = []; for (let i = 0; i < nOrBuffer; i++) { textures.push(this.gl.createTexture()!); } return textures; } else { const buffer = nOrBuffer as IntBuffer; const n = buffer.remaining(); for (let i = 0; i < n; i++) { const texture = this.gl.createTexture()!; const textureId = this.nextTextureId++; this.textureMap.set(textureId, texture); buffer.put([textureId]); }}}
    public glLoadMatrixf(matrix: Float32Array | mat4): void { if (this.recordCommand('glLoadMatrixf', [matrix])) return; const matrixArray = matrix instanceof Float32Array ? matrix : new Float32Array(matrix); this.currentMatrixStack.loadMatrix(matrixArray);}
    public glMultMatrixf(matrix: Float32Array | mat4): void { if (this.recordCommand('glMultMatrixf', [matrix])) return;  const matrixArray = matrix instanceof Float32Array ? matrix : new Float32Array(matrix);  this.currentMatrixStack.multMatrix(matrixArray as unknown as mat4); }
    public glFogi(pname: number, param: number): void {
        if (this.recordCommand('glFogi', [pname, param])) return;
        
        switch (pname) {
            case GL.FOG_MODE:
                this.fogState.mode = param;
                break;
            default:
                console.warn(`glFogi: Unsupported parameter ${pname}`);
        }
    }

    public glFogf(pname: number, param: number): void {
        if (this.recordCommand('glFogf', [pname, param])) return;
        
        switch (pname) {
            case GL.FOG_DENSITY:
                this.fogState.density = param;
                break;
            case GL.FOG_START:
                this.fogState.start = param;
                break;
            case GL.FOG_END:
                this.fogState.end = param;
                break;
            default:
                console.warn(`glFogf: Unsupported parameter ${pname}`);
        }
    }

    public glFogfv(pname: number, params: Float32Array | number[]): void {
        if (this.recordCommand('glFogfv', [pname, params])) return;
        
        switch (pname) {
            case GL.FOG_COLOR:
                if (params.length >= 4) {
                    this.fogState.color = [params[0], params[1], params[2], params[3]] as [number, number, number, number];
                } else if (params.length >= 3) {
                    this.fogState.color = [params[0], params[1], params[2], 1.0];
                }
                break;
            default:
                console.warn(`glFogfv: Unsupported parameter ${pname}`);
        }
    }

    public glFog(pname: number, param: number | FloatBuffer): void {
        if (typeof param === 'number') {
            this.glFogf(pname, param);
        } else {
            const params = param.toFloat32Array();
            this.glFogfv(pname, params);
        }
    }
    public glLightModel(pname: number, param: FloatBuffer): void;
    public glLightModel(pname: number, param: number[]): void;
    public glLightModel(pname: number, param: FloatBuffer | number[]): void {
        if (this.recordCommand('glLightModel', [pname, param])) return;
        
        let params: number[];
        if (param instanceof FloatBuffer) {
            params = Array.from(param.toFloat32Array());
        } else {
            params = param;
        }
        
        switch (pname) {
            case GL.LIGHT_MODEL_AMBIENT:
                if (params.length >= 4) {
                    this.lightingState.ambient = [params[0], params[1], params[2], params[3]] as [number, number, number, number];
                } else if (params.length >= 3) {
                    this.lightingState.ambient = [params[0], params[1], params[2], 1.0];
                }
                break;
            case GL.LIGHT_MODEL_LOCAL_VIEWER:
                this.lightingState.localViewer = params[0] !== 0;
                break;
            case GL.LIGHT_MODEL_TWO_SIDE:
                this.lightingState.twoSided = params[0] !== 0;
                break;
            default:
                console.warn(`glLightModel: Unsupported parameter ${pname}`);
        }
    }

    // Дополнительный метод для совместимости
    public glLightModelfv(pname: number, params: Float32Array | number[]): void {
        this.glLightModel(pname, Array.from(params));
    }
    public glColorMaterial(face: number, mode: number): void {
        if (this.recordCommand('glColorMaterial', [face, mode])) return;
        
        this.colorMaterialState.face = face;
        this.colorMaterialState.mode = mode;
        
    }

    // Вспомогательные методы для логирования:
    private getFaceName(face: number): string {
        switch (face) {
            case GL.FRONT: return "FRONT";
            case GL.BACK: return "BACK"; 
            case GL.FRONT_AND_BACK: return "FRONT_AND_BACK";
            default: return `UNKNOWN(${face})`;
        }
    }

    private getModeName(mode: number): string {
        switch (mode) {
            case GL.AMBIENT: return "AMBIENT";
            case GL.DIFFUSE: return "DIFFUSE";
            case GL.SPECULAR: return "SPECULAR";
            case GL.EMISSION: return "EMISSION";
            case GL.AMBIENT_AND_DIFFUSE: return "AMBIENT_AND_DIFFUSE";
            default: return `UNKNOWN(${mode})`;
        }
    }
}

class GL11Singleton {
    private instance: GL11 | null = null;
    private isInitialized = false;

    public init(canvas: HTMLCanvasElement): void {
        if (this.isInitialized) {
            console.warn("GL11 is already initialized.");
            return;
        }
        this.instance = new GL11(canvas);
        this.isInitialized = true;
    }

    public getInstance(): GL11 {
        if (!this.isInitialized || !this.instance) {
            throw new Error("GL11 is not initialized. Call GL11.init(canvas) first.");
        }
        return this.instance;
    }
}

const globalGL11 = new GL11Singleton();

const gl11Proxy = new Proxy(globalGL11, {
    get(target, prop: string | symbol, receiver) {
        if (prop === 'init') {
            return target.init.bind(target);
        }

        const instance = target.getInstance();
        const value = (instance as any)[prop];
        
        if (typeof value === 'function') {
            return value.bind(instance);
        }
        
        return value;
    },
}) as unknown as GL11 & { init: (canvas: HTMLCanvasElement) => void };

export { gl11Proxy as GL11 };
