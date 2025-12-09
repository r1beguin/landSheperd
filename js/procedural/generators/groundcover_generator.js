/**
 * GroundcoverGenerator - Clover and ground cover sprite generation
 * Generates sprites for ground cover species (clover) that grow in the bottom layer
 */
class GroundcoverGenerator extends BaseGenerator {
    /**
     * Generate sprout stage sprite for clover
     * @param {object} speciesConfig - Species configuration object
     * @param {string} lodLevel - LOD level (high/medium/low/impostor), defaults to 'medium'
     * @returns {HTMLCanvasElement} Generated sprite canvas
     */
    static generateSprout(speciesConfig, lodLevel = 'medium') {
        // Handle impostor LOD
        if (lodLevel === 'impostor') {
            return BaseGenerator.generateImpostor(speciesConfig, 'Sprout');
        }
        
        const baseDimensions = speciesConfig.appearance?.dimensions || {width: 16, height: 16};
        
        // Apply LOD multiplier to base dimensions
        const dimensions = this.applyLODDimensions(baseDimensions, lodLevel);
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
     * @param {object} genetics - Genetics object (optional)
     * @param {string} lodLevel - LOD level (high/medium/low/impostor), defaults to 'medium'
     * @returns {HTMLCanvasElement} Generated sprite canvas
     */
    static generateSpreading(speciesConfig, genetics = null, lodLevel = 'medium') {
        // Handle impostor LOD
        if (lodLevel === 'impostor') {
            return BaseGenerator.generateImpostor(speciesConfig, 'Spreading');
        }
        
        const baseDimensions = speciesConfig.appearance?.dimensions || {width: 16, height: 16};
        
        // Apply LOD multiplier to base dimensions first, then genetics
        const lodDimensions = this.applyLODDimensions(baseDimensions, lodLevel);
        const dimensions = genetics ? GeneticsUtils.applyGeneticDimensions(lodDimensions, genetics, 1.0) : lodDimensions;
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
        
        // High LOD: Add white clover markings and leaf veins
        if (lodLevel === 'high') {
            this._addCloverMarkings(ctx, leafPositions, leafRadius, scale);
            this._addCloverVeins(ctx, centerX, centerY, leafPositions, colors.leaf);
        }
        
        return canvas;
    }
    
    /**
     * Generate flowering stage sprite for clover
     * @param {object} speciesConfig - Species configuration object
     * @param {object} genetics - Genetics object (optional)
     * @param {string} lodLevel - LOD level (high/medium/low/impostor), defaults to 'medium'
     * @returns {HTMLCanvasElement} Generated sprite canvas
     */
    static generateFlowering(speciesConfig, genetics = null, lodLevel = 'medium') {
        // Handle impostor LOD
        if (lodLevel === 'impostor') {
            return BaseGenerator.generateImpostor(speciesConfig, 'Flowering');
        }
        
        const baseDimensions = speciesConfig.appearance?.dimensions || {width: 16, height: 16};
        
        // Apply LOD multiplier to base dimensions first, then genetics
        const lodDimensions = this.applyLODDimensions(baseDimensions, lodLevel);
        const dimensions = genetics ? GeneticsUtils.applyGeneticDimensions(lodDimensions, genetics, 1.0) : lodDimensions;
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
        
        // High LOD: Add white clover markings, leaf veins, and flower detail
        if (lodLevel === 'high') {
            this._addCloverMarkings(ctx, leafPositions, leafRadius, scale);
            this._addCloverVeins(ctx, centerX, centerY, leafPositions, colors.leaf);
            this._addFlowerDetail(ctx, flowerPositions, colors.flower, scale);
        }
        
        return canvas;
    }
    
    /**
     * Generate withered stage sprite for clover (brown spreading form)
     * Reuses spreading layout but with withered colors
     * @param {object} speciesConfig - Species configuration object
     * @param {string} lodLevel - LOD level (high/medium/low/impostor), defaults to 'medium'
     * @returns {HTMLCanvasElement} Generated sprite canvas
     */
    static generateWithered(speciesConfig, lodLevel = 'medium') {
        // Handle impostor LOD
        if (lodLevel === 'impostor') {
            return BaseGenerator.generateImpostor(speciesConfig, 'Withered');
        }
        
        const baseDimensions = speciesConfig.appearance?.dimensions || {width: 16, height: 16};
        
        // Apply LOD multiplier to base dimensions
        const dimensions = this.applyLODDimensions(baseDimensions, lodLevel);
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
    
    // ===== HIGH LOD ENHANCEMENT METHODS =====
    
    /**
     * Add white chevron markings on clover leaves (characteristic feature)
     * @private
     */
    static _addCloverMarkings(ctx, leafPositions, leafRadius, scale) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        
        for (const pos of leafPositions) {
            // Draw white V-shape on each leaf
            ctx.beginPath();
            ctx.moveTo(pos.x - 0.5 * scale, pos.y);
            ctx.lineTo(pos.x, pos.y - 0.3 * scale);
            ctx.lineTo(pos.x + 0.5 * scale, pos.y);
            ctx.lineWidth = 0.5;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.stroke();
        }
    }
    
    /**
     * Add visible veins on clover leaves
     * @private
     */
    static _addCloverVeins(ctx, centerX, centerY, leafPositions, leafColors) {
        const veinColor = leafColors[2] || leafColors[1] || leafColors[0];
        ctx.strokeStyle = veinColor;
        ctx.lineWidth = 0.5;
        
        for (const pos of leafPositions) {
            // Central vein from stem to leaf center
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            
            // Two side veins branching from center
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            ctx.lineTo(pos.x - 0.5, pos.y - 0.5);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            ctx.lineTo(pos.x + 0.5, pos.y - 0.5);
            ctx.stroke();
        }
    }
    
    /**
     * Add individual petal detail to clover flowers
     * @private
     */
    static _addFlowerDetail(ctx, flowerPositions, flowerColors, scale) {
        const detailColor = flowerColors[1] || flowerColors[0];
        ctx.fillStyle = detailColor;
        
        for (const pos of flowerPositions) {
            // Add 6 small petals around flower center
            const petalCount = 6;
            for (let i = 0; i < petalCount; i++) {
                const angle = (i / petalCount) * Math.PI * 2;
                const petalX = pos.x + Math.cos(angle) * 0.8 * scale;
                const petalY = pos.y + Math.sin(angle) * 0.8 * scale;
                
                ctx.beginPath();
                ctx.arc(petalX, petalY, 0.3 * scale, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}

// Make available globally
window.GroundcoverGenerator = GroundcoverGenerator;
