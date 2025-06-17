// Character class for a 5x5 px character that moves to a target cell
class Character {
    constructor(x, y, speedFactor = 1) {
        this.x = x; // Current x (in grid cells)
        this.y = y; // Current y (in grid cells)
        this.targetX = x;
        this.targetY = y;
        this.speed = 10; // Cells per second
        this.speedFactor = speedFactor;
        this.animFrame = 0;
        this.animTimer = 0;
        this.animInterval = 0.18; // seconds per frame
    }

    setTarget(x, y) {
        this.targetX = x;
        this.targetY = y;
    }

    setSpeedFactor(factor) {
        this.speedFactor = factor;
    }

    update(deltaTime) {
        // Move towards target cell at a constant speed
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 0.01) {
            this.x = this.targetX;
            this.y = this.targetY;
            this.animFrame = 0; // Idle frame
            this.animTimer = 0;
            return;
        }
        // Speed in cells per second (default 2, scaled by speedFactor)
        const speed = 30 * this.speedFactor;
        const step = speed * deltaTime;
        if (step >= distance) {
            this.x = this.targetX;
            this.y = this.targetY;
        } else {
            this.x += (dx / distance) * step;
            this.y += (dy / distance) * step;
        }

        // Animation frame update if moving
        if (distance >= 0.01) {
            this.animTimer += deltaTime;
            if (this.animTimer > this.animInterval) {
                this.animFrame = 1 - this.animFrame; // Toggle between 0 and 1
                this.animTimer = 0;
            }
        }
    }

    render(ctx, pixelSize) {
        // Double size: 10x10 cells, more detailed human
        const baseX = Math.round(this.x - 5);
        const baseY = Math.round(this.y - 5);
        // Shadow
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(
            this.x * pixelSize,
            (baseY + 9.5) * pixelSize,
            4 * pixelSize,
            1.2 * pixelSize,
            0, 0, 2 * Math.PI
        );
        ctx.fill();
        ctx.restore();
        // Head (3x3 cells, top center)
        ctx.fillStyle = '#FFD39B';
        ctx.fillRect((baseX + 4) * pixelSize, (baseY + 0) * pixelSize, 3 * pixelSize, 3 * pixelSize);
        // Eyes
        ctx.fillStyle = '#222';
        ctx.fillRect((baseX + 5) * pixelSize, (baseY + 1) * pixelSize, pixelSize, pixelSize);
        ctx.fillRect((baseX + 7) * pixelSize, (baseY + 1) * pixelSize, pixelSize, pixelSize);
        // Mouth
        ctx.fillStyle = '#B8864B';
        ctx.fillRect((baseX + 5) * pixelSize, (baseY + 2) * pixelSize, 2 * pixelSize, pixelSize / 2);
        // Body (center column, 4x2 cells)
        ctx.fillStyle = '#4682B4';
        ctx.fillRect((baseX + 5) * pixelSize, (baseY + 3) * pixelSize, 2 * pixelSize, 4 * pixelSize);
        // Arms (2x6 cells, left and right)
        ctx.fillStyle = '#FFD39B';
        ctx.fillRect((baseX + 3) * pixelSize, (baseY + 3) * pixelSize, 2 * pixelSize, 6 * pixelSize);
        ctx.fillRect((baseX + 7) * pixelSize, (baseY + 3) * pixelSize, 2 * pixelSize, 6 * pixelSize);
        // Hands (2x2 cells, left and right)
        ctx.fillStyle = '#FFD39B';
        ctx.fillRect((baseX + 3) * pixelSize, (baseY + 8) * pixelSize, 2 * pixelSize, 2 * pixelSize);
        ctx.fillRect((baseX + 7) * pixelSize, (baseY + 8) * pixelSize, 2 * pixelSize, 2 * pixelSize);
        // Legs (2x4 cells, left and right) - animate for walk
        ctx.fillStyle = '#2F4F4F';
        if (this.animFrame === 0) {
            // Frame 0: legs together
            ctx.fillRect((baseX + 5) * pixelSize, (baseY + 7) * pixelSize, pixelSize, 4 * pixelSize);
            ctx.fillRect((baseX + 7) * pixelSize, (baseY + 7) * pixelSize, pixelSize, 4 * pixelSize);
        } else {
            // Frame 1: legs apart
            ctx.fillRect((baseX + 4) * pixelSize, (baseY + 8) * pixelSize, pixelSize, 3 * pixelSize);
            ctx.fillRect((baseX + 8) * pixelSize, (baseY + 8) * pixelSize, pixelSize, 3 * pixelSize);
        }
        // Shoes (2x2 cells, left and right)
        ctx.fillStyle = '#000';
        ctx.fillRect((baseX + 5) * pixelSize, (baseY + 11) * pixelSize, pixelSize, pixelSize);
        ctx.fillRect((baseX + 7) * pixelSize, (baseY + 11) * pixelSize, pixelSize, pixelSize);
    }
}

export { Character };