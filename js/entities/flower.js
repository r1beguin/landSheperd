// Flower class: 1 cell, random bright color
class Flower {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        // Generate a random bright color
        const hue = Math.floor(Math.random() * 360);
        this.color = `hsl(${hue}, 90%, 60%)`;
    }

    render(ctx, pixelSize) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x * pixelSize, this.y * pixelSize, pixelSize, pixelSize);
    }
}

export { Flower };