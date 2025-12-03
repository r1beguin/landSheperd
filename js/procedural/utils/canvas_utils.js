/**
 * CanvasUtils - Canvas drawing primitive utilities
 * Provides common drawing operations for plant sprite generation
 */
class CanvasUtils {
    /**
     * Draw an ellipse
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - Center x position
     * @param {number} y - Center y position
     * @param {number} radiusX - Horizontal radius
     * @param {number} radiusY - Vertical radius
     * @param {string} fillStyle - Fill color
     */
    static drawEllipse(ctx, x, y, radiusX, radiusY, fillStyle) {
        ctx.fillStyle = fillStyle;
        ctx.beginPath();
        ctx.ellipse(x, y, radiusX, radiusY, 0, 0, 2 * Math.PI);
        ctx.fill();
    }
    
    /**
     * Draw a straight line
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x1 - Start x position
     * @param {number} y1 - Start y position
     * @param {number} x2 - End x position
     * @param {number} y2 - End y position
     * @param {string} strokeStyle - Stroke color
     * @param {number} lineWidth - Line width
     */
    static drawLine(ctx, x1, y1, x2, y2, strokeStyle, lineWidth) {
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
    
    /**
     * Draw a curved line using quadratic curve
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x1 - Start x position
     * @param {number} y1 - Start y position
     * @param {number} cpx - Control point x position
     * @param {number} cpy - Control point y position
     * @param {number} x2 - End x position
     * @param {number} y2 - End y position
     * @param {string} strokeStyle - Stroke color
     * @param {number} lineWidth - Line width
     */
    static drawCurvedLine(ctx, x1, y1, cpx, cpy, x2, y2, strokeStyle, lineWidth) {
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(cpx, cpy, x2, y2);
        ctx.stroke();
    }
}

// Make available globally
window.CanvasUtils = CanvasUtils;
