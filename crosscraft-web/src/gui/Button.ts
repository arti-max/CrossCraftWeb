

export class Button {
    public id: number;
    public x: number;
    public y: number;
    public w: number;
    public h: number;
    public msg: string;
    public visible: boolean = true;
    public enabled: boolean = true;

    constructor(id: number, x: number, y: number, w: number, h: number, m: string) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.msg = m;
    }
}