import { Plant } from './plants.js';

class Tree extends Plant {
    constructor(type, color, x, y) {
        super(type, color);
        this.x = x;
        this.y = y;
        this.height = 1;
        this.width = 2;
        this.age = 0;
        this.maxAge = 15 + Math.floor(Math.random() * 16);
        this.isDead = false;
        this.branches = [];
        this.hasLeaves = false;
        this.leafCells = [];
        this.trunkCurve = [this.x]; // Store trunk x-offset for each row
        this.maxThickness = 5; // Max thickness is now 1 less cell (was 6)
        // Adult phase
        this.adultPhase = false;
        this.adultTime = 0;
        this.maxAdultTime = 30 + Math.random() * 30; // 30-60 seconds
    }

    grow() {
        if (this.isDead) return;
        // Adult phase: gradually boost fertility
        if (this.adultPhase) {
            this.adultTime++;
            if (this.onFertilityBoost) this.onFertilityBoost(this.x, this.y, 10, 0.025); // 2.5% per second
            if (this.adultTime >= this.maxAdultTime) {
                this.isDead = true;
            }
            return;
        }
        this.age++;
        if (this.age >= this.maxAge) {
            // Enter adult phase instead of dying
            this.adultPhase = true;
            this.adultTime = 0;
            return;
        }
        // Grow taller
        this.height++;
        // Trunk curve: decide next row's x offset
        let prevX = this.trunkCurve[this.trunkCurve.length - 1];
        let newX = prevX;
        if (this.height > 3 && Math.random() < 0.35) {
            const dir = Math.random() < 0.5 ? -1 : 1;
            if (Math.abs(prevX + dir - this.x) < Math.floor(this.height / 4)) {
                newX = prevX + dir;
            }
        }
        this.trunkCurve.push(newX);
        // Randomly grow wider
        if (Math.random() < 0.3 && this.width < this.maxThickness) this.width++;
        // Randomly add a branch
        if (this.height > 4 && Math.random() < 0.4) {
            const dir = Math.random() < 0.5 ? -1 : 1;
            const branchY = this.y - this.height + 2 + Math.floor(Math.random() * (this.height - 3));
            const branch = {
                x: newX + dir * (1 + Math.floor(Math.random() * 2)),
                y: branchY,
                dir,
                length: 2 + Math.floor(Math.random() * 3),
                leaf: null
            };
            branch.leaf = {
                x: branch.x + branch.dir * (branch.length - 1),
                y: branch.y - (branch.length - 1)
            };
            this.branches.push(branch);
            // Add a leaf at the end of the new branch
            const leafColors = [this.color, '#2E8B57', '#3CB371', '#228B22'];
            this.leafCells.push({
                x: branch.leaf.x,
                y: branch.leaf.y,
                color: leafColors[Math.floor(Math.random() * leafColors.length)],
                windOffset: 0
            });
        }
        // Grow leaves if in range, add incrementally and move up with growth
        if (this.height >= 10 && this.height <= 15) {
            this.hasLeaves = true;
            const leafColors = [this.color, '#2E8B57', '#3CB371', '#228B22'];
            const topY = this.y - this.height + 2;
            const leafRadius = 3 + Math.floor(this.width / 2);
            // Increase density: add more leaves per step
            for (let i = 0; i < 18; i++) {
                const angle = Math.random() * 2 * Math.PI;
                const r = leafRadius * Math.sqrt(Math.random());
                const dx = Math.round(r * Math.cos(angle));
                const dy = Math.round(r * Math.sin(angle));
                this.leafCells.push({
                    x: newX + dx,
                    y: topY + dy,
                    color: leafColors[Math.floor(Math.random() * leafColors.length)],
                    windOffset: 0
                });
            }
        }
        // Move all canopy leaves up by 1 cell with each growth
        if (this.hasLeaves) {
            for (let leaf of this.leafCells) {
                // Only move leaves that are above the trunk (not branch-end leaves)
                if (leaf.y < this.y - 2) {
                    leaf.y -= 1;
                }
            }
        }
    }

    updateLeafWindOffsets(globalWindPhase, windIntensity) {
        // Animate each leaf's windOffset for swaying effect
        for (let i = 0; i < this.leafCells.length; i++) {
            const leaf = this.leafCells[i];
            // Each leaf has a unique phase offset for natural look
            const phase = globalWindPhase + i * 0.3;
            // Reduce sway amplitude for more subtle effect
            leaf.windOffset = Math.sin(phase) * windIntensity * 0.4; // 0.4: smaller max sway in cells
        }
    }

    render(ctx, pixelSize) {
        if (this.isDead) return; // Do not render anything if the tree is dead
        // Shadow
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(
            this.x * pixelSize,
            (this.y + 0.7) * pixelSize,
            3.2 * pixelSize,
            1.1 * pixelSize,
            0, 0, 2 * Math.PI
        );
        ctx.fill();
        ctx.restore();
        // Trunk with curve (use stored trunkCurve)
        for (let i = 0; i < this.height; i++) {
            const trunkX = this.trunkCurve[i] || this.x;
            ctx.fillStyle = '#8B5A2B';
            ctx.fillRect(
                (trunkX - Math.floor(this.width / 2)) * pixelSize,
                (this.y - i) * pixelSize,
                this.width * pixelSize,
                pixelSize
            );
            ctx.fillStyle = '#B8864B';
            ctx.fillRect(
                trunkX * pixelSize,
                (this.y - i) * pixelSize,
                0.5 * pixelSize,
                pixelSize
            );
        }
        // Branches
        ctx.fillStyle = '#8B5A2B';
        for (const branch of this.branches) {
            for (let l = 0; l < branch.length; l++) {
                ctx.fillRect(
                    (branch.x + branch.dir * l) * pixelSize,
                    (branch.y - l) * pixelSize,
                    pixelSize,
                    pixelSize
                );
            }
        }
        // Leaves as colored cells (persistent, no flicker, incremental)
        if (this.hasLeaves && this.leafCells) {
            for (const leaf of this.leafCells) {
                ctx.fillStyle = leaf.color;
                ctx.fillRect(
                    (leaf.x + (leaf.windOffset || 0)) * pixelSize,
                    leaf.y * pixelSize,
                    pixelSize,
                    pixelSize
                );
            }
        }
    }
}

export { Tree };