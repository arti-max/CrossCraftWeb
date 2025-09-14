import { CrossCraft } from "./CrossCraft";

export class CrossCraftApplet {
    private canvas: HTMLCanvasElement;
    private cc: CrossCraft;

    constructor(container: HTMLElement) {
        this.canvas = document.createElement('canvas');
        
        const widthAttr = container.getAttribute('width');
        const heightAttr = container.getAttribute('height');

        const width = widthAttr ? parseInt(widthAttr, 10) : 854;
        const height = heightAttr ? parseInt(heightAttr, 10) : 480;

        container.style.width = `${width}px`;
        container.style.height = `${height}px`;
        
        this.canvas.width = width;
        this.canvas.height = height;
        
        container.appendChild(this.canvas);
        
        console.log(`CrossCraftApplet: Canvas created ${width}x${height}`);
        
        this.cc = new CrossCraft(this.canvas, width, height, false);
        this.cc.appletMode = true;
    }
    
    public start(): void {
        this.cc.run();
    }

    public pause(): void {
        this.cc.pause = true;
    }
    
    public resume(): void {
        this.cc.pause = false;
    }

    public destroy(): void {
        this.cc.stop();
    }
}
