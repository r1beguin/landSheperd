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
        
        // Scale leaf size based on canvas size
        const scale = canvas.width / 16;
        
        ctx.fillStyle = colors.leaf[0];
        
        // Single small leaf
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, 1.5 * scale, 2 * scale, 0, 0, 2 * Math.PI);
        ctx.fill();
        
        // Tiny stem
        ctx.fillStyle = colors.stem[0];
        ctx.fillRect(centerX - 0.5, centerY + 1, 1, 1.5 * scale);
        
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
        
        // Scale features based on canvas size for consistent look
        const scale = canvas.width / 16;
        
        // Draw characteristic 3-leaf clover pattern with smaller leaves
        const leafRadius = 1.5 * scale;  // Reduced from 2.5 to 1.5
        const stemLength = 2 * scale;     // Reduced from 3 to 2
        
        // Central stem
        ctx.fillStyle = colors.stem[0];
        ctx.fillRect(centerX - 0.5, centerY + leafRadius, 1, stemLength);
        
        // Three leaves in clover pattern
        const leafPositions = [
            { x: centerX, y: centerY - stemLength },          // Top leaf
            { x: centerX - stemLength, y: centerY + 0.5 },    // Bottom left
            { x: centerX + stemLength, y: centerY + 0.5 }     // Bottom right
        ];
        
        ctx.fillStyle = colors.leaf[0];
        
        for (const pos of leafPositions) {
            // Draw heart-shaped clover leaf (two overlapping circles)
            ctx.beginPath();
            ctx.arc(pos.x - 0.7 * scale, pos.y, leafRadius, 0, 2 * Math.PI);
            ctx.arc(pos.x + 0.7 * scale, pos.y, leafRadius, 0, 2 * Math.PI);
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
        
        // Scale features based on canvas size
        const scale = canvas.width / 16;
        
        // Draw 3-leaf clover base with smaller leaves
        const leafRadius = 1.5 * scale;  // Reduced from 2.5
        const stemLength = 2 * scale;     // Reduced from 3
        
        ctx.fillStyle = colors.stem[0];
        ctx.fillRect(centerX - 0.5, centerY + leafRadius, 1, stemLength);
        
        const leafPositions = [
            { x: centerX, y: centerY - stemLength },
            { x: centerX - stemLength, y: centerY + 0.5 },
            { x: centerX + stemLength, y: centerY + 0.5 }
        ];
        
        ctx.fillStyle = colors.leaf[0];
        
        for (const pos of leafPositions) {
            ctx.beginPath();
            ctx.arc(pos.x - 0.7 * scale, pos.y, leafRadius, 0, 2 * Math.PI);
            ctx.arc(pos.x + 0.7 * scale, pos.y, leafRadius, 0, 2 * Math.PI);
            ctx.fill();
            
            ctx.fillStyle = colors.leaf[2];
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, leafRadius * 0.4, 0, 2 * Math.PI);
            ctx.fill();
            ctx.fillStyle = colors.leaf[0];
        }
        
        // Add white/pink flower clusters (scaled)
        const flowerPositions = [
            { x: centerX - 2.5 * scale, y: centerY - 3 * scale },
            { x: centerX + 2.5 * scale, y: centerY - 2.5 * scale }
        ];
        
        ctx.fillStyle = colors.flower[0];
        
        for (const pos of flowerPositions) {
            // Main flower head (cluster of tiny circles)
            for (let i = 0; i < 5; i++) {
                const offsetX = (Math.random() - 0.5) * 1.5 * scale;
                const offsetY = (Math.random() - 0.5) * 1.5 * scale;
                ctx.beginPath();
                ctx.arc(pos.x + offsetX, pos.y + offsetY, 0.7 * scale, 0, 2 * Math.PI);
                ctx.fill();
            }
            
            // Pink accents
            ctx.fillStyle = colors.flower[2];
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 0.4 * scale, 0, 2 * Math.PI);
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
    
    /**
     * Generate withered stage sprite for clover (brown spreading form)
     * Reuses spreading layout but with withered colors
     * @param {object} speciesConfig - Species configuration object
     * @returns {HTMLCanvasElement} Generated sprite canvas
     */
    static generateWithered(speciesConfig) {
        const dimensions = speciesConfig.appearance?.dimensions || {width: 16, height: 16};
        const { canvas, ctx } = this.createCanvas(dimensions.width, dimensions.height);
        
        const colors = speciesConfig.appearance.colorPalette;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Scale features based on canvas size
        const scale = canvas.width / 16;
        
        // Use withered colors (brown) instead of green
        const witheredStem = colors.witheredStem || ['#6b5c3d', '#5a4d30'];
        const witheredLeaf = colors.witheredLeaf || ['#8b7355', '#7a6245'];
        
        // Draw characteristic 3-leaf clover pattern with smaller, withered leaves
        const leafRadius = 1.5 * scale;  // Same as spreading stage
        const stemLength = 2 * scale;     // Same as spreading stage
        
        // Withered stem (thin and brown)
        ctx.fillStyle = witheredStem[Math.floor(Math.random() * witheredStem.length)];
        ctx.fillRect(centerX - 0.5, centerY + leafRadius, 1, stemLength);
        
        // Three withered leaves in clover pattern (same positions as spreading)
        const leafPositions = [
            { x: centerX, y: centerY - stemLength },          // Top leaf
            { x: centerX - stemLength, y: centerY + 0.5 },    // Bottom left
            { x: centerX + stemLength, y: centerY + 0.5 }     // Bottom right
        ];
        
        // Pick withered leaf color
        ctx.fillStyle = witheredLeaf[Math.floor(Math.random() * witheredLeaf.length)];
        
        for (const pos of leafPositions) {
            // Draw heart-shaped withered clover leaf (same shape as spreading, brown color)
            ctx.beginPath();
            ctx.arc(pos.x - 0.7 * scale, pos.y, leafRadius, 0, 2 * Math.PI);
            ctx.arc(pos.x + 0.7 * scale, pos.y, leafRadius, 0, 2 * Math.PI);
            ctx.fill();
            
            // Add darker center (more brown)
            const darkerBrown = witheredStem[0];
            ctx.fillStyle = darkerBrown;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, leafRadius * 0.4, 0, 2 * Math.PI);
            ctx.fill();
            // Reset to leaf color for next leaf
            ctx.fillStyle = witheredLeaf[Math.floor(Math.random() * witheredLeaf.length)];
        }
        
        return canvas;
    }
}

// Make available globally
window.GroundcoverGenerator = GroundcoverGenerator;
