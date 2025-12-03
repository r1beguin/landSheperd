/**
 * GroundcoverGenerator - Clover and ground cover sprite generation
 * Generates sprites for ground cover species (clover) that grow in the bottom layer
 */
class GroundcoverGenerator extends BaseGenerator {
    /**
     * Generate sprout stage sprite for clover
     * @param {object} speciesConfig - Species configuration object
     * @returns {HTMLCanvasElement} Generated sprite canvas
     */
    static generateSprout(speciesConfig) {
        const dimensions = speciesConfig.appearance?.dimensions || {width: 16, height: 16};
        const { canvas, ctx } = this.createCanvas(dimensions.width, dimensions.height);
        
        const colors = speciesConfig.appearance.colorPalette;
        
        // Draw tiny emerging leaf at center
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        ctx.fillStyle = colors.leaf[0];
        
        // Single small leaf
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, 2, 3, 0, 0, 2 * Math.PI);
        ctx.fill();
        
        // Tiny stem
        ctx.fillStyle = colors.stem[0];
        ctx.fillRect(centerX - 0.5, centerY + 1, 1, 2);
        
        return canvas;
    }
    
    /**
     * Generate spreading stage sprite for clover
     * @param {object} speciesConfig - Species configuration object
     * @returns {HTMLCanvasElement} Generated sprite canvas
     */
    static generateSpreading(speciesConfig) {
        const dimensions = speciesConfig.appearance?.dimensions || {width: 16, height: 16};
        const { canvas, ctx } = this.createCanvas(dimensions.width, dimensions.height);
        
        const colors = speciesConfig.appearance.colorPalette;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Draw characteristic 3-leaf clover pattern
        const leafRadius = 2.5;
        const stemLength = 3;
        
        // Central stem
        ctx.fillStyle = colors.stem[0];
        ctx.fillRect(centerX - 0.5, centerY + leafRadius, 1, stemLength);
        
        // Three leaves in clover pattern
        const leafPositions = [
            { x: centerX, y: centerY - stemLength },          // Top leaf
            { x: centerX - stemLength, y: centerY + 1 },      // Bottom left
            { x: centerX + stemLength, y: centerY + 1 }       // Bottom right
        ];
        
        ctx.fillStyle = colors.leaf[0];
        
        for (const pos of leafPositions) {
            // Draw heart-shaped clover leaf (two overlapping circles)
            ctx.beginPath();
            ctx.arc(pos.x - 1, pos.y, leafRadius, 0, 2 * Math.PI);
            ctx.arc(pos.x + 1, pos.y, leafRadius, 0, 2 * Math.PI);
            ctx.fill();
            
            // Add darker center
            ctx.fillStyle = colors.leaf[2];
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, leafRadius * 0.4, 0, 2 * Math.PI);
            ctx.fill();
            ctx.fillStyle = colors.leaf[0];
        }
        
        return canvas;
    }
    
    /**
     * Generate flowering stage sprite for clover
     * @param {object} speciesConfig - Species configuration object
     * @returns {HTMLCanvasElement} Generated sprite canvas
     */
    static generateFlowering(speciesConfig) {
        const dimensions = speciesConfig.appearance?.dimensions || {width: 16, height: 16};
        const { canvas, ctx } = this.createCanvas(dimensions.width, dimensions.height);
        
        const colors = speciesConfig.appearance.colorPalette;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Draw 3-leaf clover base (same as spreading)
        const leafRadius = 2.5;
        const stemLength = 3;
        
        ctx.fillStyle = colors.stem[0];
        ctx.fillRect(centerX - 0.5, centerY + leafRadius, 1, stemLength);
        
        const leafPositions = [
            { x: centerX, y: centerY - stemLength },
            { x: centerX - stemLength, y: centerY + 1 },
            { x: centerX + stemLength, y: centerY + 1 }
        ];
        
        ctx.fillStyle = colors.leaf[0];
        
        for (const pos of leafPositions) {
            ctx.beginPath();
            ctx.arc(pos.x - 1, pos.y, leafRadius, 0, 2 * Math.PI);
            ctx.arc(pos.x + 1, pos.y, leafRadius, 0, 2 * Math.PI);
            ctx.fill();
            
            ctx.fillStyle = colors.leaf[2];
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, leafRadius * 0.4, 0, 2 * Math.PI);
            ctx.fill();
            ctx.fillStyle = colors.leaf[0];
        }
        
        // Add white/pink flower clusters
        const flowerPositions = [
            { x: centerX - 4, y: centerY - 5 },
            { x: centerX + 4, y: centerY - 4 }
        ];
        
        ctx.fillStyle = colors.flower[0];
        
        for (const pos of flowerPositions) {
            // Main flower head (cluster of tiny circles)
            for (let i = 0; i < 5; i++) {
                const offsetX = (Math.random() - 0.5) * 2;
                const offsetY = (Math.random() - 0.5) * 2;
                ctx.beginPath();
                ctx.arc(pos.x + offsetX, pos.y + offsetY, 1, 0, 2 * Math.PI);
                ctx.fill();
            }
            
            // Pink accents
            ctx.fillStyle = colors.flower[2];
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 0.5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.fillStyle = colors.flower[0];
            
            // Flower stem
            ctx.strokeStyle = colors.stem[0];
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y + 1);
            ctx.lineTo(centerX, centerY);
            ctx.stroke();
        }
        
        return canvas;
    }
}

// Make available globally
window.GroundcoverGenerator = GroundcoverGenerator;
