
export class AABB {

    private readonly epsilon = 0.0;

    public minX: number;
    public minY: number;
    public minZ: number;
    public maxX: number;
    public maxY: number;
    public maxZ: number;



    constructor(minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number) {
        this.minX = minX;
        this.minY = minY;
        this.minZ = minZ;
        this.maxX = maxX;
        this.maxY = maxY;
        this.maxZ = maxZ;
    }


    clone() {
        return new AABB(this.minX, this.minY, this.minZ, this.maxX, this.maxY, this.maxZ);
    }

    expand(x: number, y: number, z: number) {
        let minX = this.minX;
        let minY = this.minY;
        let minZ = this.minZ;
        let maxX = this.maxX;
        let maxY = this.maxY;
        let maxZ = this.maxZ;

        //console.log(minX, minY, minZ, maxX, maxY, maxZ);
        //console.log(x, y, z);

        // Handle expanding of min/max x
        if (x < 0.0) {
            minX += x;
        } else {
            maxX += x;
        }

        // Handle expanding of min/max y
        if (y < 0.0) {
            minY += y;
        } else {
            maxY += y;
        }

        // Handle expanding of min/max z
        if (z < 0.0) {
            minZ += z;
        } else {
            maxZ += z;
        }

        //console.log(minX, minY, minZ, maxX, maxY, maxZ);

        // Create new bounding box
        return new AABB(minX, minY, minZ, maxX, maxY, maxZ);
    }

    grow(x: number, y: number, z: number) {
        return new AABB(this.minX - x, this.minY - y,
                this.minZ - z, this.maxX + x,
                this.maxY + y, this.maxZ + z);
    }

    clipXCollide(otherBoundingBox: AABB, x: number) {
        // Check if the boxes are colliding on the Y axis
        if (otherBoundingBox.maxY <= this.minY || otherBoundingBox.minY >= this.maxY) {
            return x;
        }

        // Check if the boxes are colliding on the Z axis
        if (otherBoundingBox.maxZ <= this.minZ || otherBoundingBox.minZ >= this.maxZ) {
            return x;
        }

        // Check for collision if the X axis of the current box is bigger
        if (x > 0.0 && otherBoundingBox.maxX <= this.minX) {
            let max = this.minX - otherBoundingBox.maxX - this.epsilon;
            if (max < x) {
                x = max;
            }
        }

        // Check for collision if the X axis of the current box is smaller
        if (x < 0.0 && otherBoundingBox.minX >= this.maxX) {
            let max = this.maxX - otherBoundingBox.minX + this.epsilon;
            if (max > x) {
                x = max;
            }
        }

        return x;
    }

    /**
     * Check for collision on the Y axis
     *
     * @param otherBoundingBox The other bounding box that is colliding with the this one.
     * @param y                Position on the X axis that is colliding
     * @return Returns the corrected x position that collided.
     */
    clipYCollide(otherBoundingBox: AABB, y: number) {
        // Check if the boxes are colliding on the X axis
        if (otherBoundingBox.maxX <= this.minX || otherBoundingBox.minX >= this.maxX) {
            return y;
        }

        // Check if the boxes are colliding on the Z axis
        if (otherBoundingBox.maxZ <= this.minZ || otherBoundingBox.minZ >= this.maxZ) {
            return y;
        }

        // Check for collision if the Y axis of the current box is bigger
        if (y > 0.0 && otherBoundingBox.maxY <= this.minY) {
            let max = this.minY - otherBoundingBox.maxY - this.epsilon;
            if (max < y) {
                y = max;
            }
        }

        // Check for collision if the Y axis of the current box is bigger
        if (y < 0.0 && otherBoundingBox.minY >= this.maxY) {
            let max = this.maxY - otherBoundingBox.minY + this.epsilon;
            if (max > y) {
                y = max;
            }
        }

        return y;
    }

    /**
     * Check for collision on the Y axis
     *
     * @param otherBoundingBox The other bounding box that is colliding with the this one.
     * @param z                Position on the X axis that is colliding
     * @return Returns the corrected x position that collided.
     */
    clipZCollide(otherBoundingBox: AABB, z: number) {
        // Check if the boxes are colliding on the X axis
        if (otherBoundingBox.maxX <= this.minX || otherBoundingBox.minX >= this.maxX) {
            return z;
        }

        // Check if the boxes are colliding on the Y axis
        if (otherBoundingBox.maxY <= this.minY || otherBoundingBox.minY >= this.maxY) {
            return z;
        }

        // Check for collision if the Z axis of the current box is bigger
        if (z > 0.0 && otherBoundingBox.maxZ <= this.minZ) {
            let max = this.minZ - otherBoundingBox.maxZ - this.epsilon;
            if (max < z) {
                z = max;
            }
        }

        // Check for collision if the Z axis of the current box is bigger
        if (z < 0.0 && otherBoundingBox.minZ >= this.maxZ) {
            let max = this.maxZ - otherBoundingBox.minZ + this.epsilon;
            if (max > z) {
                z = max;
            }
        }

        return z;
    }

    /**
     * Check if the two boxes are intersecting/overlapping
     *
     * @param otherBoundingBox The other bounding box that could intersect
     * @return The two boxes are overlapping
     */
    intersects(otherBoundingBox: AABB) {
        // Check on X axis
        if (otherBoundingBox.maxX <= this.minX || otherBoundingBox.minX >= this.maxX) {
            return false;
        }

        // Check on Y axis
        if (otherBoundingBox.maxY <= this.minY || otherBoundingBox.minY >= this.maxY) {
            return false;
        }

        // Check on Z axis
        return (!(otherBoundingBox.maxZ <= this.minZ)) && (!(otherBoundingBox.minZ >= this.maxZ));
    }

    /**
     * Move the bounding box relative.
     *
     * @param x Relative offset x
     * @param y Relative offset y
     * @param z Relative offset z
     */
    move(x: number, y: number, z: number) {
        //console.log(x, y, z)
        this.minX += x;
        this.minY += y;
        this.minZ += z;
        this.maxX += x;
        this.maxY += y;
        this.maxZ += z;
    }

    /**
     * Create a new bounding box with the given offset
     *
     * @param x Relative offset x
     * @param y Relative offset x
     * @param z Relative offset x
     * @return New bounding box with the given offset relative to this bounding box
     */
    offset(x: number, y: number, z: number) {
        return new AABB(this.minX + x, this.minY + y, this.minZ + z, this.maxX + x, this.maxY + y, this.maxZ + z);
    }
}