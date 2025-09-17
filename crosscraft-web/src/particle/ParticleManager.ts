import { GL11, GL } from "../../lib/GL11/GL11";
import type { Level } from "../level/Level";
import type { Player } from "../Player";
import type { Tessellator } from "../render/Tessellator";
import { Textures } from "../Textures";
import { Particle } from "./Particle";


export class ParticleEngine {
    protected readonly level: Level;

    private particles: Array<Particle> = new Array<Particle>();

    constructor(level: Level) {
        this.level = level;
    }

    /**
     * Add particle to engine
     *
     * @param particle The particle to add
     */
    public add(p: Particle): void {
        this.particles.push(p);
    }

    public tick(): void {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.tick();

            if (p.removed) {
                this.particles.splice(i, 1); 
            }
        }
    }

    /**
     * Render all particles
     *
     * @param player       The player
     * @param partialTicks Ticks for interpolation
     * @param layer        Shadow layer
     */
    public render(player: Player, t: Tessellator, partialTicks: number, layer: number, textures: Textures): void {
        GL11.glEnable(GL.TEXTURE_2D);

        var id = textures.loadTexture('/terrain.png', GL.NEAREST);
        GL11.glBindTexture(GL.TEXTURE_2D, id);

        var cameraX: number = -Math.cos(toRad(player.yRotation));
        var cameraY: number = Math.cos(toRad(player.xRotation));
        var cameraZ: number = -Math.sin(toRad(player.yRotation));

        var cameraXWithY: number = -cameraZ * Math.sin(toRad(player.xRotation));
        var cameraZWithY: number = cameraX * Math.sin(toRad(player.xRotation));

        GL11.glColor4f(0.8, 0.8, 0.8, 1.0);
        t.begin();

        for (var p of this.particles) {
            if (p.isLit() !== (layer == 1)) {
                p.render(t, partialTicks, cameraX, cameraY, cameraZ, cameraXWithY, cameraZWithY);
            }
        }

        t.end();
        GL11.glDisable(GL.TEXTURE_2D);
    }
}

function toRad(Value: number) {
    /** Converts numeric degrees to radians */
    return Value * Math.PI / 180;
}