// Create a dedicated rendering module for squirrels
class SquirrelRenderer {
    constructor(canvas, pixelSize) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.pixelSize = pixelSize;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    render(squirrels) {
        this.clear();
        for (const squirrel of squirrels) {
            this.ctx.fillStyle = squirrel.color;
            this.ctx.fillRect(
                Math.round(squirrel.x * this.pixelSize),
                Math.round(squirrel.y * this.pixelSize),
                this.pixelSize,
                this.pixelSize
            );
        }
    }
}

export { SquirrelRenderer };