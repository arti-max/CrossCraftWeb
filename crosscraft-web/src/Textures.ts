import { GL11, GL } from "../lib/GL11/GL11";
import { GLU } from "../lib/GL11/GLU";
import { BufferUtils } from "../lib/GL11/BufferUtils";
import type { IntBuffer } from "../lib/GL11/IntBuffer";
import type { ByteBuffer } from "../lib/GL11/ByteBuffer";

export class Textures {
    private idMap: Map<string, number> = new Map();

    public loadTexture(resourceName: string, mode: number): number {
    // console.log(`🖼️ Loading texture: ${resourceName}`);
    
    try {
        if (this.idMap.has(resourceName)) {
            const cachedId = this.idMap.get(resourceName)!;
            // console.log(`📋 Texture '${resourceName}' cached, ID: ${cachedId}`);
            return cachedId;
        } else {
            const ib: IntBuffer = BufferUtils.createIntBuffer(1);
            ib.clear();
            GL11.glGenTextures(ib);
            const id: number = ib.get(0);
            this.idMap.set(resourceName, id);
            
            // console.log(`🆔 Generated texture ID: ${id} for ${resourceName}`);
            
            GL11.glBindTexture(GL.TEXTURE_2D, id);
            GL11.glTexParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, mode);
            GL11.glTexParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, mode);
            
            const img = document.getElementById(resourceName) as HTMLImageElement;
            if (!img) {
                console.error(`❌ Image element not found: ${resourceName}`);
                console.log(`Available elements:`, Array.from(document.querySelectorAll('img')).map(img => img.id));
                throw new Error(`Image element not found: ${resourceName}`);
            }
            
            if (!img.complete || img.naturalWidth === 0) {
                console.error(`❌ Image not loaded: ${resourceName}, complete: ${img.complete}, naturalWidth: ${img.naturalWidth}`);
                throw new Error(`Image not loaded: ${resourceName}`);
            }
            
            console.log(`✅ Image found: ${resourceName}, size: ${img.width}x${img.height}`);
                const w: number = img.width;
                const h: number = img.height;
                const pixels: ByteBuffer = BufferUtils.createByteBuffer(w * h * 4);
                const rawPixels: Int32Array = new Int32Array(w * h);
                const newPixels: Int8Array = new Int8Array(w * h * 4);
                
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d')!;
                canvas.width = w;
                canvas.height = h;
                context.drawImage(img, 0, 0);
                const imageData = context.getImageData(0, 0, w, h);
                const rgbaPixels = imageData.data;
                
                for (let i = 0; i < rawPixels.length; i++) {
                    const r = rgbaPixels[i * 4 + 0];
                    const g = rgbaPixels[i * 4 + 1];
                    const b = rgbaPixels[i * 4 + 2];
                    const a = rgbaPixels[i * 4 + 3];
                    rawPixels[i] = (a << 24) | (r << 16) | (g << 8) | b;
                }

                for (let i = 0; i < rawPixels.length; ++i) {
                    const a: number = rawPixels[i] >> 24 & 255;
                    const r: number = rawPixels[i] >> 16 & 255;
                    const g: number = rawPixels[i] >> 8 & 255;
                    const b: number = rawPixels[i] & 255;
                    newPixels[i * 4 + 0] = r;
                    newPixels[i * 4 + 1] = g;
                    newPixels[i * 4 + 2] = b;
                    newPixels[i * 4 + 3] = a;
                }

                pixels.put(newPixels);
                pixels.position(0).limit(newPixels.length);
                GLU.gluBuild2DMipmaps(3553, 6408, w, h, 6408, 5121, pixels);
                return id;
            }
        } catch (e) {
            throw new Error("!!");
        }
    }
}
