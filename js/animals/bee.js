// Bee class: single yellow cell, animated, visits flowers
import { Flower } from '../entities/flower.js';
import { Tree } from '../entities/tree.js';
import { PLANT_TYPES } from '../entities/plants.js';

class Bee {
    constructor(x, y, flowers, onVisit, onDone) {
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.speed = 18; // cells per second
        this.animFrame = 0;
        this.animTimer = 0;
        this.animInterval = 0.12;
        this.visited = 0;
        this.maxVisits = 10;
        this.flowerQueue = flowers.slice(0, 10);
        this.state = 'move'; // 'move' or 'wait'
        this.waitTimer = 0;
        this.onVisit = onVisit;
        this.onDone = onDone;
    }

    update(deltaTime) {
        if (this.visited >= this.maxVisits || this.flowerQueue.length === 0) {
            if (this.onDone) this.onDone(this);
            return;
        }
        // Only update movement/animation if bee is visible (in viewport or near flowers/trees)
        // (For now, always update since bees are few and visible. For many bees, add viewport culling here.)
        if (this.state === 'move') {
            const flower = this.flowerQueue[0];
            this.targetX = flower.x;
            this.targetY = flower.y;
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const step = this.speed * deltaTime;
            if (dist < 0.05) {
                this.x = this.targetX;
                this.y = this.targetY;
                this.state = 'wait';
                this.waitTimer = 0;
                if (this.onVisit) this.onVisit(flower, this);
            } else {
                this.x += (dx / dist) * Math.min(step, dist);
                this.y += (dy / dist) * Math.min(step, dist);
            }
        } else if (this.state === 'wait') {
            this.waitTimer += deltaTime;
            if (this.waitTimer >= 2) {
                this.flowerQueue.shift();
                this.visited++;
                this.state = 'move';
            }
        }
        // Animation: only update if bee is moving or visible
        if (this.state === 'move' || this.state === 'wait') {
            this.animTimer += deltaTime;
            if (this.animTimer > this.animInterval) {
                this.animFrame = 1 - this.animFrame;
                this.animTimer = 0;
            }
        }
    }

    render(ctx, pixelSize) {
        // Bee body
        ctx.save();
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(this.x * pixelSize, this.y * pixelSize, pixelSize, pixelSize);
        // Simple wing animation
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#fff';
        if (this.animFrame === 0) {
            ctx.fillRect((this.x - 0.3) * pixelSize, (this.y - 0.3) * pixelSize, pixelSize * 0.7, pixelSize * 0.7);
            ctx.fillRect((this.x + 0.6) * pixelSize, (this.y - 0.3) * pixelSize, pixelSize * 0.7, pixelSize * 0.7);
        } else {
            ctx.fillRect((this.x - 0.2) * pixelSize, (this.y - 0.5) * pixelSize, pixelSize * 0.5, pixelSize * 0.5);
            ctx.fillRect((this.x + 0.7) * pixelSize, (this.y - 0.5) * pixelSize, pixelSize * 0.5, pixelSize * 0.5);
        }
        ctx.restore();
    }
}

export { Bee };
