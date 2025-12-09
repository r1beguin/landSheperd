/**
 * HerbGenerator - Nettle and herb sprite generation
 * Generates sprites for herb species (nettles) across all growth stages
 */
class HerbGenerator extends BaseGenerator {
    /**
     * Generate seedling stage sprite
     * @param {object} speciesConfig - Species configuration object
     * @param {string} lodLevel - LOD level (high/medium/low/impostor), defaults to 'medium'
     * @returns {HTMLCanvasElement} Generated sprite canvas
     */
    static generateSeedling(speciesConfig, lodLevel = 'medium') {
        // Handle impostor LOD
        if (lodLevel === 'impostor') {
            return BaseGenerator.generateImpostor(speciesConfig, 'Seedling');
        }
        
        // Apply LOD multiplier to base dimensions (20x20)
        const baseDimensions = {width: 20, height: 20};
        const dimensions = this.applyLODDimensions(baseDimensions, lodLevel);
        const { canvas, ctx } = this.createCanvas(dimensions.width, dimensions.height);
        
        // Use seedling-specific modules if available, otherwise fall back to defaults
        const modules = speciesConfig.proceduralModules.seedling || speciesConfig.proceduralModules;
        const colors = speciesConfig.appearance.colorPalette;
        
        // Calculate LOD scale for feature sizing
        const lodScale = this.getLODMultiplier(lodLevel);
        
        // Generate smaller seedling - 50% smaller stem, only 2 leaves at top
        const stemData = this._generateSeedlingStem(ctx, modules.stem, colors.stem, lodScale);
        this._generateSeedlingLeaves(ctx, modules.leaf, colors.leaf, stemData, lodScale);
        
        // High LOD: Add stem texture and leaf veins
        if (lodLevel === 'high') {
            this._addStemTexture(ctx, stemData, colors.stem);
            this._addLeafVeins(ctx, stemData, colors.leaf);
        }
        
        return canvas;
    }
    
    /**
     * Generate vegetative stage sprite
     * @param {object} speciesConfig - Species configuration object
     * @param {string} lodLevel - LOD level (high/medium/low/impostor), defaults to 'medium'
     * @returns {HTMLCanvasElement} Generated sprite canvas
     */
    static generateVegetative(speciesConfig, lodLevel = 'medium') {
        // Handle impostor LOD
        if (lodLevel === 'impostor') {
            return BaseGenerator.generateImpostor(speciesConfig, 'Vegetative');
        }
        
        // Apply LOD multiplier to base dimensions
        const baseDimensions = {width: 20, height: 20};
        const dimensions = this.applyLODDimensions(baseDimensions, lodLevel);
        const { canvas, ctx } = this.createCanvas(dimensions.width, dimensions.height);
        
        // Use the main (vegetative) modules
        const modules = speciesConfig.proceduralModules;
        const colors = speciesConfig.appearance.colorPalette;
        
        // Calculate LOD scale for feature sizing
        const lodScale = this.getLODMultiplier(lodLevel);
        
        // Generate vegetative stage with original seedling appearance
        const stemData = this._generateVegetativeStem(ctx, modules.stem, colors.stem, lodScale);
        this._generateVegetativeLeaves(ctx, modules.leaf, colors.leaf, stemData, lodScale);
        
        // High LOD: Add stem texture and leaf veins
        if (lodLevel === 'high') {
            this._addStemTexture(ctx, stemData, colors.stem);
            this._addLeafVeins(ctx, stemData, colors.leaf);
        }
        
        return canvas;
    }
    
    /**
     * Generate flowering stage sprite
     * @param {object} speciesConfig - Species configuration object
     * @param {string} lodLevel - LOD level (high/medium/low/impostor), defaults to 'medium'
     * @returns {HTMLCanvasElement} Generated sprite canvas
     */
    static generateFlowering(speciesConfig, lodLevel = 'medium') {
        // Handle impostor LOD
        if (lodLevel === 'impostor') {
            return BaseGenerator.generateImpostor(speciesConfig, 'Flowering');
        }
        
        // Apply LOD multiplier to base dimensions
        const baseDimensions = {width: 20, height: 20};
        const dimensions = this.applyLODDimensions(baseDimensions, lodLevel);
        const { canvas, ctx } = this.createCanvas(dimensions.width, dimensions.height);
        
        // Use the main modules for flowering stage
        const modules = speciesConfig.proceduralModules;
        const colors = speciesConfig.appearance.colorPalette;
        
        // Calculate LOD scale for feature sizing
        const lodScale = this.getLODMultiplier(lodLevel);
        
        // Generate flowering stage - same as vegetative but with purple flower on top
        const stemData = this._generateVegetativeStem(ctx, modules.stem, colors.stem, lodScale);
        this._generateVegetativeLeaves(ctx, modules.leaf, colors.leaf, stemData, lodScale);
        this._generateFlower(ctx, modules.flower, colors.flower, stemData, lodScale);
        
        // High LOD: Add stem texture, leaf veins, and flower detail
        if (lodLevel === 'high') {
            this._addStemTexture(ctx, stemData, colors.stem);
            this._addLeafVeins(ctx, stemData, colors.leaf);
            this._addFlowerDetail(ctx, stemData, colors.flower, lodScale);
        }
        
        return canvas;
    }
    
    /**
     * Generate withered stage sprite
     * @param {object} speciesConfig - Species configuration object
     * @param {string} lodLevel - LOD level (high/medium/low/impostor), defaults to 'medium'
     * @returns {HTMLCanvasElement} Generated sprite canvas
     */
    static generateWithered(speciesConfig, lodLevel = 'medium') {
        // Handle impostor LOD
        if (lodLevel === 'impostor') {
            return BaseGenerator.generateImpostor(speciesConfig, 'Withered');
        }
        
        // Apply LOD multiplier to base dimensions
        const baseDimensions = {width: 20, height: 20};
        const dimensions = this.applyLODDimensions(baseDimensions, lodLevel);
        const { canvas, ctx } = this.createCanvas(dimensions.width, dimensions.height);
        
        // Use the main modules for withered stage
        const modules = speciesConfig.proceduralModules;
        const colors = speciesConfig.appearance.colorPalette;
        
        // Calculate LOD scale for feature sizing
        const lodScale = this.getLODMultiplier(lodLevel);
        
        // Generate withered stage - same structure as vegetative but with brown colors and drooping leaves
        const stemData = this._generateWitheredStem(ctx, modules.stem, colors.witheredStem, lodScale);
        this._generateWitheredLeaves(ctx, modules.leaf, colors.witheredLeaf, stemData, lodScale);
        
        return canvas;
    }
    
    // ===== PRIVATE STEM GENERATION METHODS =====
    
    static _generateSeedlingStem(ctx, stemConfig, stemColors, lodScale = 1.0) {
        // Smaller stem for true seedling - 50% height reduction
        const baseWidth = Math.round(stemConfig.baseWidth * 2 * lodScale);
        const height = Math.round(6 * lodScale); // Reduced from 12 to 6 (50% smaller)
        const stemX = Math.round(9 * lodScale);
        const stemY = Math.round(12 * lodScale); // Moved down to keep plant grounded
        
        // Draw main stem
        ctx.fillStyle = stemColors[0];
        ctx.fillRect(stemX, stemY, baseWidth, height);
        
        // Add some texture variation
        if (stemConfig.colorVariation > 0) {
            ctx.fillStyle = stemColors[1] || stemColors[0];
            ctx.fillRect(stemX, stemY + Math.round(1 * lodScale), Math.max(1, Math.round(1 * lodScale)), height - Math.round(2 * lodScale));
        }
        
        // Return stem data for leaf attachment - only top attachment points for seedling
        return {
            x: stemX,
            y: stemY,
            width: baseWidth,
            height: height,
            centerX: stemX + baseWidth / 2,
            attachmentPoints: [
                { x: stemX + baseWidth / 2, y: stemY + Math.round(1 * lodScale), side: 'right' },  // Top, right side
                { x: stemX + baseWidth / 2, y: stemY + Math.round(1 * lodScale), side: 'left' }    // Top, left side
            ]
        };
    }
    
    static _generateVegetativeStem(ctx, stemConfig, stemColors, lodScale = 1.0) {
        // Original stem size for vegetative stage
        const baseWidth = Math.round(stemConfig.baseWidth * 2 * lodScale);
        const height = Math.round(12 * lodScale);
        const stemX = Math.round(9 * lodScale);
        const stemY = Math.round(8 * lodScale);
        
        // Draw main stem
        ctx.fillStyle = stemColors[0];
        ctx.fillRect(stemX, stemY, baseWidth, height);
        
        // Add some texture variation
        if (stemConfig.colorVariation > 0) {
            ctx.fillStyle = stemColors[1] || stemColors[0];
            ctx.fillRect(stemX, stemY + Math.round(2 * lodScale), Math.max(1, Math.round(1 * lodScale)), height - Math.round(4 * lodScale));
        }
        
        // Return stem data for leaf attachment points - properly distributed along the stem
        return {
            x: stemX,
            y: stemY,
            width: baseWidth,
            height: height,
            centerX: stemX + baseWidth / 2,
            attachmentPoints: [
                { x: stemX + baseWidth / 2, y: stemY + Math.round(2 * lodScale), side: 'right' },  // Upper, right side
                { x: stemX + baseWidth / 2, y: stemY + Math.round(5 * lodScale), side: 'left' },   // Middle, left side  
                { x: stemX + baseWidth / 2, y: stemY + Math.round(8 * lodScale), side: 'right' }   // Lower, right side
            ]
        };
    }
    
    static _generateWitheredStem(ctx, stemConfig, stemColors, lodScale = 1.0) {
        // Same size as vegetative stem but with withered colors
        const baseWidth = Math.round(stemConfig.baseWidth * 2 * lodScale);
        const height = Math.round(12 * lodScale);
        const stemX = Math.round(9 * lodScale);
        const stemY = Math.round(8 * lodScale);
        
        // Draw main stem with withered brown colors
        ctx.fillStyle = stemColors[0];
        ctx.fillRect(stemX, stemY, baseWidth, height);
        
        // Add some texture variation with darker brown
        if (stemConfig.colorVariation > 0) {
            ctx.fillStyle = stemColors[1] || stemColors[0];
            ctx.fillRect(stemX, stemY + Math.round(2 * lodScale), Math.max(1, Math.round(1 * lodScale)), height - Math.round(4 * lodScale));
        }
        
        // Return stem data for leaf attachment points - same as vegetative
        return {
            x: stemX,
            y: stemY,
            width: baseWidth,
            height: height,
            centerX: stemX + baseWidth / 2,
            attachmentPoints: [
                { x: stemX + baseWidth / 2, y: stemY + Math.round(2 * lodScale), side: 'right' },  // Upper, right side
                { x: stemX + baseWidth / 2, y: stemY + Math.round(5 * lodScale), side: 'left' },   // Middle, left side  
                { x: stemX + baseWidth / 2, y: stemY + Math.round(8 * lodScale), side: 'right' }   // Lower, right side
            ]
        };
    }
    
    // ===== PRIVATE LEAF GENERATION METHODS =====
    
    static _generateSeedlingLeaves(ctx, leafConfig, leafColors, stemData, lodScale = 1.0) {
        // For seedlings, only use the top 2 attachment points (both at top of stem)
        const leafColor = leafColors[0];
        ctx.fillStyle = leafColor;
        
        // Use all attachment points for seedling (which are only the top 2)
        for (const attachPoint of stemData.attachmentPoints) {
            const direction = attachPoint.side === 'right' ? 1 : -1;
            this._drawSeedlingLeaf(ctx, attachPoint.x, attachPoint.y, direction, leafConfig, lodScale);
        }
    }
    
    static _generateVegetativeLeaves(ctx, leafConfig, leafColors, stemData, lodScale = 1.0) {
        // Original leaf generation logic for vegetative stage
        const totalAttachmentPoints = stemData.attachmentPoints.length;
        const pairCount = Math.min(leafConfig.pairCount || 2, totalAttachmentPoints);
        const leafColor = leafColors[0];
        
        ctx.fillStyle = leafColor;
        
        // Randomly select attachment points for leaves instead of using first N points
        const availablePoints = [...stemData.attachmentPoints];
        const selectedPoints = [];
        
        for (let i = 0; i < pairCount; i++) {
            const randomIndex = Math.floor(Math.random() * availablePoints.length);
            selectedPoints.push(availablePoints[randomIndex]);
            availablePoints.splice(randomIndex, 1); // Remove selected point to avoid duplicates
        }
        
        // Generate leaves at randomly selected attachment points
        for (const attachPoint of selectedPoints) {
            // Use the predetermined side for this attachment point
            const direction = attachPoint.side === 'right' ? 1 : -1;
            
            // Draw leaf attached to the stem at this point
            this._drawSeedlingLeaf(ctx, attachPoint.x, attachPoint.y, direction, leafConfig, lodScale);
        }
    }
    
    static _generateWitheredLeaves(ctx, leafConfig, leafColors, stemData, lodScale = 1.0) {
        // Withered leaf generation - same as vegetative but with brown colors and drooping
        const totalAttachmentPoints = stemData.attachmentPoints.length;
        const pairCount = Math.min(leafConfig.pairCount || 2, totalAttachmentPoints);
        const leafColor = leafColors[0];
        
        ctx.fillStyle = leafColor;
        
        // Randomly select attachment points for leaves
        const availablePoints = [...stemData.attachmentPoints];
        const selectedPoints = [];
        
        for (let i = 0; i < pairCount; i++) {
            const randomIndex = Math.floor(Math.random() * availablePoints.length);
            selectedPoints.push(availablePoints[randomIndex]);
            availablePoints.splice(randomIndex, 1);
        }
        
        // Generate withered leaves at randomly selected attachment points
        for (const attachPoint of selectedPoints) {
            const direction = attachPoint.side === 'right' ? 1 : -1;
            this._drawWitheredLeaf(ctx, attachPoint.x, attachPoint.y, direction, leafConfig, lodScale);
        }
    }
    
    static _generateFlower(ctx, flowerConfig, flowerColors, stemData, lodScale = 1.0) {
        // Generate purple flower cluster at the top of the stem
        const flowerColor = flowerColors[0];
        const flowerX = stemData.centerX;
        const flowerY = stemData.y - Math.round(2 * lodScale); // Position flower above the stem top
        
        ctx.fillStyle = flowerColor;
        
        // Draw main flower cluster as small circles
        const clusterSize = Math.floor(flowerConfig.size * 3) + 2; // 2-5 small flowers
        const baseRadius = 1 * lodScale;
        
        for (let i = 0; i < clusterSize; i++) {
            // Random positioning within small cluster area
            const offsetX = (Math.random() - 0.5) * 3 * lodScale;
            const offsetY = (Math.random() - 0.5) * 2 * lodScale;
            const radius = baseRadius + (Math.random() - 0.5) * 0.5 * lodScale;
            
            ctx.beginPath();
            ctx.arc(flowerX + offsetX, flowerY + offsetY, radius, 0, 2 * Math.PI);
            ctx.fill();
        }
        
        // Add some color variation with darker purple accents
        if (flowerConfig.colorVariation > 0) {
            ctx.fillStyle = flowerColors[1] || flowerColors[0];
            const accentCount = Math.floor(clusterSize / 2);
            
            for (let i = 0; i < accentCount; i++) {
                const offsetX = (Math.random() - 0.5) * 2 * lodScale;
                const offsetY = (Math.random() - 0.5) * 1.5 * lodScale;
                
                ctx.beginPath();
                ctx.arc(flowerX + offsetX, flowerY + offsetY, 0.5 * lodScale, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
    }
    
    // ===== PRIVATE LEAF DRAWING METHODS =====
    
    static _drawSeedlingLeaf(ctx, stemCenterX, stemY, direction, leafConfig, lodScale = 1.0) {
        const leafWidth = 4 * lodScale;
        const leafHeight = 3 * lodScale;
        
        // Calculate leaf position based on stem center and direction
        const leafX = direction > 0 ? 
            stemCenterX + 1 :           // Right side: leaf starts just right of stem center
            stemCenterX - leafWidth - 1; // Left side: leaf ends just left of stem center
        const leafY = stemY - leafHeight / 2; // Center vertically on attachment point
        
        // Draw main leaf shape (oval)
        ctx.beginPath();
        ctx.ellipse(leafX + leafWidth/2, leafY + leafHeight/2, leafWidth/2, leafHeight/2, 0, 0, 2 * Math.PI);
        ctx.fill();
        
        // Add serration details if specified
        if (leafConfig.shapeType === 'serrated' && leafConfig.edgeVariation > 0.5) {
            const originalColor = ctx.fillStyle;
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            
            // Add small serration marks on the leaf edge
            const numSerrations = 3;
            for (let i = 0; i < numSerrations; i++) {
                const serrationX = leafX + (i + 1) * (leafWidth / (numSerrations + 1));
                const serrationY = leafY + (i % 2 === 0 ? -0.5 * lodScale : leafHeight + 0.5 * lodScale);
                ctx.fillRect(serrationX, serrationY, Math.max(0.5, 0.5 * lodScale), Math.max(0.5, 0.5 * lodScale));
            }
            
            // Restore original color
            ctx.fillStyle = originalColor;
        }
        
        // Draw a small connecting line from leaf to stem (petiole)
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = Math.max(0.5, 0.5 * lodScale);
        ctx.beginPath();
        ctx.moveTo(stemCenterX, stemY);
        ctx.lineTo(leafX + leafWidth/2, leafY + leafHeight/2);
        ctx.stroke();
    }
    
    static _drawWitheredLeaf(ctx, stemCenterX, stemY, direction, leafConfig, lodScale = 1.0) {
        const leafWidth = 4 * lodScale;
        const leafHeight = 3 * lodScale;
        
        // Calculate leaf position with downward droop for withered appearance
        const droopOffset = 2 * lodScale; // How much the leaf droops down
        const leafX = direction > 0 ? 
            stemCenterX + 1 * lodScale :           // Right side: leaf starts just right of stem center
            stemCenterX - leafWidth - 1 * lodScale; // Left side: leaf ends just left of stem center
        const leafY = stemY + droopOffset; // Position leaf lower to show drooping
        
        // Draw main leaf shape (oval) - slightly more elongated to show wilting
        ctx.beginPath();
        ctx.ellipse(leafX + leafWidth/2, leafY + leafHeight/2, leafWidth/2, (leafHeight * 1.2)/2, 0, 0, 2 * Math.PI);
        ctx.fill();
        
        // Add serration details with more pronounced withered appearance
        if (leafConfig.shapeType === 'serrated' && leafConfig.edgeVariation > 0.5) {
            const originalColor = ctx.fillStyle;
            ctx.fillStyle = 'rgba(0,0,0,0.25)'; // Darker shadow for withered serrations
            
            // Add small serration marks on the leaf edge
            const numSerrations = 3;
            for (let i = 0; i < numSerrations; i++) {
                const serrationX = leafX + (i + 1) * (leafWidth / (numSerrations + 1));
                const serrationY = leafY + (i % 2 === 0 ? -0.5 * lodScale : leafHeight * 1.2 + 0.5 * lodScale);
                ctx.fillRect(serrationX, serrationY, Math.max(0.5, 0.5 * lodScale), Math.max(0.5, 0.5 * lodScale));
            }
            
            // Restore original color
            ctx.fillStyle = originalColor;
        }
        
        // Draw a curved drooping petiole from leaf to stem
        CanvasUtils.drawCurvedLine(
            ctx,
            stemCenterX, stemY,
            stemCenterX + (direction * 2 * lodScale), stemY + droopOffset / 2,  // Control point
            leafX + leafWidth/2, leafY + leafHeight/2,                // End point
            ctx.fillStyle,
            Math.max(0.5, 0.5 * lodScale)
        );
    }
    
    // ===== HIGH LOD ENHANCEMENT METHODS =====
    
    /**
     * Add detailed stem texture for high LOD
     * @private
     */
    static _addStemTexture(ctx, stemData, stemColors) {
        const detailColor = stemColors[2] || stemColors[1] || stemColors[0];
        ctx.fillStyle = detailColor;
        
        // Add vertical ridges along stem
        const ridgeCount = Math.floor(stemData.height / 3);
        for (let i = 0; i < ridgeCount; i++) {
            const y = stemData.y + (i * 3);
            ctx.fillRect(stemData.x, y, stemData.width, 1);
        }
        
        // Add some small nodes/bumps where leaves attach
        for (const point of stemData.attachmentPoints) {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 1, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    /**
     * Add leaf vein details for high LOD
     * @private
     */
    static _addLeafVeins(ctx, stemData, leafColors) {
        const veinColor = leafColors[2] || leafColors[1] || leafColors[0];
        ctx.strokeStyle = veinColor;
        ctx.lineWidth = 0.5;
        
        // Draw veins on each leaf near attachment points
        for (const point of stemData.attachmentPoints) {
            const direction = point.side === 'right' ? 1 : -1;
            const leafCenterX = point.x + (direction * 3);
            const leafCenterY = point.y;
            
            // Central vein
            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
            ctx.lineTo(leafCenterX, leafCenterY);
            ctx.stroke();
            
            // Side veins
            for (let i = 0; i < 2; i++) {
                ctx.beginPath();
                ctx.moveTo(leafCenterX - (direction * i), leafCenterY);
                ctx.lineTo(leafCenterX - (direction * (i + 1)), leafCenterY + 1);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(leafCenterX - (direction * i), leafCenterY);
                ctx.lineTo(leafCenterX - (direction * (i + 1)), leafCenterY - 1);
                ctx.stroke();
            }
        }
    }
    
    /**
     * Add flower petal detail for high LOD
     * @private
     */
    static _addFlowerDetail(ctx, stemData, flowerColors, lodScale) {
        const detailColor = flowerColors[1] || flowerColors[0];
        const flowerX = stemData.centerX;
        const flowerY = stemData.y - Math.round(2 * lodScale);
        
        ctx.fillStyle = detailColor;
        
        // Add individual petal outlines
        const petalCount = 5;
        for (let i = 0; i < petalCount; i++) {
            const angle = (i / petalCount) * Math.PI * 2;
            const x = flowerX + Math.cos(angle) * 2 * lodScale;
            const y = flowerY + Math.sin(angle) * 2 * lodScale;
            
            ctx.beginPath();
            ctx.arc(x, y, 0.8 * lodScale, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Make available globally
window.HerbGenerator = HerbGenerator;
