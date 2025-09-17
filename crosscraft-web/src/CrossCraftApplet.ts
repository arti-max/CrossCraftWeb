import { CrossCraft } from "./CrossCraft";
import { User } from "./User";

const urlParams = new URLSearchParams(window.location.search);

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
        if (urlParams.get('username') != null && urlParams.get('sessionid') != null) {
            console.log("Game started with username " + urlParams.get('username') + " and sessionid " + urlParams.get('sessionid'));
            this.cc.user = new User(urlParams.get('username') as string, urlParams.get('sessionid') as string);
        }
        if (urlParams.get("loadmap_user") != null && urlParams.get("loadmap_id") != null) {
            this.cc.loadMapUser = urlParams.get("loadmap_user") as string;
            this.cc.loadMapId = urlParams.get("loadmap_id") as unknown as number;
        }
        // this.cc.user = new User("arti" as string, "123");
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
