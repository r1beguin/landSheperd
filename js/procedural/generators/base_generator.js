/**
 * BaseGenerator - Shared base class for all plant sprite generators
 * Provides common functionality for canvas creation, stem generation, and genetic color application
 */
class BaseGenerator {
    /**
     * Create canvas with specified dimensions
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     * @returns {object} {canvas, ctx} - Canvas element and 2D context
     */
    static createCanvas(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);
        return { canvas, ctx };
    }
    
    /**
     * Generate stem with attachment points for leaves
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - Stem x position
     * @param {number} y - Stem y position
     * @param {number} width - Stem width
     * @param {number} height - Stem height
     * @param {Array<string>} colors - Stem colors array
     * @param {number} attachmentPointCount - Number of attachment points to generate
     * @returns {object} {x, y, width, height, centerX, attachmentPoints}
     */
    static generateStem(ctx, x, y, width, height, colors, attachmentPointCount = 3) {
        // Draw main stem
        ctx.fillStyle = colors[0];
        ctx.fillRect(x, y, width, height);
        
        // Add texture variation
        if (colors.length > 1) {
            ctx.fillStyle = colors[1];
            ctx.fillRect(x, y + 2, 1, Math.max(1, height - 4));
        }
        
        // Generate attachment points along stem
        const attachmentPoints = [];
        for (let i = 0; i < attachmentPointCount; i++) {
            const pointY = y + (height / (attachmentPointCount + 1)) * (i + 1);
            attachmentPoints.push({
                x: x + width / 2,
                y: pointY,
                side: i % 2 === 0 ? 'right' : 'left'
            });
        }
        
        return {
            x, y, width, height,
            centerX: x + width / 2,
            attachmentPoints
        };
    }
    
    /**
     * Apply genetic modifiers to colors (hue shift)
     * @param {Array<string>} colors - Array of hex colors
     * @param {object} genetics - Genetics object with colorTint property (0-255)
     * @param {number} hueMultiplier - Multiplier for hue shift intensity (default 1.0)
     * @returns {Array<string>} Array of shifted hex colors
     */
    static applyGeneticColors(colors, genetics, hueMultiplier = 1.0) {
        if (!genetics || !genetics.colorTint) return colors;
        
        const hueTint = GeneticsUtils.getHueTint(genetics.colorTint) * hueMultiplier;
        if (hueTint === 0) return colors;
        
        return colors.map(c => ColorUtils.shiftHue(c, hueTint));
    }
}

// Make available globally
window.BaseGenerator = BaseGenerator;
