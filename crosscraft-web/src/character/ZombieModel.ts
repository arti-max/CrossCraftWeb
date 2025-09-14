import { Cube } from "./Cube";


export class ZombieModel {

    public head: Cube;
    public body: Cube;

    public rightArm: Cube;
    public leftArm: Cube;

    public rightLeg: Cube;
    public leftLeg: Cube;


    constructor() {
        this.head = new Cube(0, 0)
            .addBox(-4.0, -8.0, -4.0, 8, 8, 8);
        
        this.body = new Cube(16, 16)
            .addBox(-4.0, 0.0, -2.0, 8, 12, 4);

        this.rightArm = new Cube(40, 16)
            .addBox(-3.0, -2.0, -2.0, 4, 12, 4);
        this.rightArm.setPosition(-5.0, 2.0, 0.0);

        this.leftArm = new Cube(40,16)
            .addBox(-1.0, 0.0, -2.0, 4, 12, 4);
        this.leftArm.setPosition(5.0, 2.0, 0.0);

        this.rightLeg = new Cube(0, 16)
            .addBox(-2.0, 0.0, -2.0, 4, 12, 4);
        this.rightLeg.setPosition(-2.0, 12.0, 0.0);

        this.leftLeg = new Cube(0, 16)
            .addBox(-2.0, 0.0, -2.0, 4, 12, 4);
        this.leftLeg.setPosition(2.0, 12.0, 0.0);
    }

    public render(time: number): void {

        this.head.yRotation = Math.sin(time * 0.83);
        this.head.xRotation = Math.sin(time) * 0.8;
        this.rightArm.xRotation = Math.sin(time * 0.6662 + Math.PI) * 2.0;
        this.rightArm.zRotation = (Math.sin(time * 0.2312) + 1.0);
        this.leftArm.xRotation = Math.sin(time * 0.6662) * 2.0;
        this.leftArm.zRotation = (Math.sin(time * 0.2312) - 1.0);
        this.rightLeg.xRotation = Math.sin(time * 0.6662) * 1.4;
        this.leftLeg.xRotation = Math.sin(time * 0.6662 + Math.PI) * 1.4;

        this.head.render();
        this.body.render();
        this.rightArm.render();
        this.leftArm.render();
        this.rightLeg.render();
        this.leftLeg.render();
    }
}