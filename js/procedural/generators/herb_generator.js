/**
 * HerbGenerator - Nettle and herb sprite generation
 * Generates sprites for herb species (nettles) across all growth stages
 */
class HerbGenerator extends BaseGenerator {
    /**
     * Generate seedling stage sprite
     * @param {object} speciesConfig - Species configuration object
     * @returns {HTMLCanvasElement} Generated sprite canvas
     */
    static generateSeedling(speciesConfig) {
        const { canvas, ctx } = this.createCanvas(20, 20);
        
        // Use seedling-specific modules if available, otherwise fall back to defaults
        const modules = speciesConfig.proceduralModules.seedling || speciesConfig.proceduralModules;
        const colors = speciesConfig.appearance.colorPalette;
        
        // Generate smaller seedling - 50% smaller stem, only 2 leaves at top
        const stemData = this._generateSeedlingStem(ctx, modules.stem, colors.stem);
        this._generateSeedlingLeaves(ctx, modules.leaf, colors.leaf, stemData);
        
        return canvas;
    }
    
    /**
     * Generate vegetative stage sprite
     * @param {object} speciesConfig - Species configuration object
     * @returns {HTMLCanvasElement} Generated sprite canvas
     */
    static generateVegetative(speciesConfig) {
        const { canvas, ctx } = this.createCanvas(20, 20);
        
        // Use the main (vegetative) modules
        const modules = speciesConfig.proceduralModules;
        const colors = speciesConfig.appearance.colorPalette;
        
        // Generate vegetative stage with original seedling appearance
        const stemData = this._generateVegetativeStem(ctx, modules.stem, colors.stem);
        this._generateVegetativeLeaves(ctx, modules.leaf, colors.leaf, stemData);
        
        return canvas;
    }
    
    /**
     * Generate flowering stage sprite
     * @param {object} speciesConfig - Species configuration object
     * @returns {HTMLCanvasElement} Generated sprite canvas
     */
    static generateFlowering(speciesConfig) {
        const { canvas, ctx } = this.createCanvas(20, 20);
        
        // Use the main modules for flowering stage
        const modules = speciesConfig.proceduralModules;
        const colors = speciesConfig.appearance.colorPalette;
        
        // Generate flowering stage - same as vegetative but with purple flower on top
        const stemData = this._generateVegetativeStem(ctx, modules.stem, colors.stem);
        this._generateVegetativeLeaves(ctx, modules.leaf, colors.leaf, stemData);
        this._generateFlower(ctx, modules.flower, colors.flower, stemData);
        
        return canvas;
    }
    
    /**
     * Generate withered stage sprite
     * @param {object} speciesConfig - Species configuration object
     * @returns {HTMLCanvasElement} Generated sprite canvas
     */
    static generateWithered(speciesConfig) {
        const { canvas, ctx } = this.createCanvas(20, 20);
        
        // Use the main modules for withered stage
        const modules = speciesConfig.proceduralModules;
        const colors = speciesConfig.appearance.colorPalette;
        
        // Generate withered stage - same structure as vegetative but with brown colors and drooping leaves
        const stemData = this._generateWitheredStem(ctx, modules.stem, colors.witheredStem);
        this._generateWitheredLeaves(ctx, modules.leaf, colors.witheredLeaf, stemData);
        
        return canvas;
    }
    
    // ===== PRIVATE STEM GENERATION METHODS =====
    
    static _generateSeedlingStem(ctx, stemConfig, stemColors) {
        // Smaller stem for true seedling - 50% height reduction
        const baseWidth = stemConfig.baseWidth * 2;
        const height = 6; // Reduced from 12 to 6 (50% smaller)
        const stemX = 9;
        const stemY = 12; // Moved down to keep plant grounded
        
        // Draw main stem
        ctx.fillStyle = stemColors[0];
        ctx.fillRect(stemX, stemY, baseWidth, height);
        
        // Add some texture variation
        if (stemConfig.colorVariation > 0) {
            ctx.fillStyle = stemColors[1] || stemColors[0];
            ctx.fillRect(stemX, stemY + 1, 1, height - 2);
        }
        
        // Return stem data for leaf attachment - only top attachment points for seedling
        return {
            x: stemX,
            y: stemY,
            width: baseWidth,
            height: height,
            centerX: stemX + baseWidth / 2,
            attachmentPoints: [
                { x: stemX + baseWidth / 2, y: stemY + 1, side: 'right' },  // Top, right side
                { x: stemX + baseWidth / 2, y: stemY + 1, side: 'left' }    // Top, left side
            ]
        };
    }
    
    static _generateVegetativeStem(ctx, stemConfig, stemColors) {
        // Original stem size for vegetative stage
        const baseWidth = stemConfig.baseWidth * 2;
        const height = 12;
        const stemX = 9;
        const stemY = 8;
        
        // Draw main stem
        ctx.fillStyle = stemColors[0];
        ctx.fillRect(stemX, stemY, baseWidth, height);
        
        // Add some texture variation
        if (stemConfig.colorVariation > 0) {
            ctx.fillStyle = stemColors[1] || stemColors[0];
            ctx.fillRect(stemX, stemY + 2, 1, height - 4);
        }
        
        // Return stem data for leaf attachment points - properly distributed along the stem
        return {
            x: stemX,
            y: stemY,
            width: baseWidth,
            height: height,
            centerX: stemX + baseWidth / 2,
            attachmentPoints: [
                { x: stemX + baseWidth / 2, y: stemY + 2, side: 'right' },  // Upper, right side
                { x: stemX + baseWidth / 2, y: stemY + 5, side: 'left' },   // Middle, left side  
                { x: stemX + baseWidth / 2, y: stemY + 8, side: 'right' }   // Lower, right side
            ]
        };
    }
    
    static _generateWitheredStem(ctx, stemConfig, stemColors) {
        // Same size as vegetative stem but with withered colors
        const baseWidth = stemConfig.baseWidth * 2;
        const height = 12;
        const stemX = 9;
        const stemY = 8;
        
        // Draw main stem with withered brown colors
        ctx.fillStyle = stemColors[0];
        ctx.fillRect(stemX, stemY, baseWidth, height);
        
        // Add some texture variation with darker brown
        if (stemConfig.colorVariation > 0) {
            ctx.fillStyle = stemColors[1] || stemColors[0];
            ctx.fillRect(stemX, stemY + 2, 1, height - 4);
        }
        
        // Return stem data for leaf attachment points - same as vegetative
        return {
            x: stemX,
            y: stemY,
            width: baseWidth,
            height: height,
            centerX: stemX + baseWidth / 2,
            attachmentPoints: [
                { x: stemX + baseWidth / 2, y: stemY + 2, side: 'right' },  // Upper, right side
                { x: stemX + baseWidth / 2, y: stemY + 5, side: 'left' },   // Middle, left side  
                { x: stemX + baseWidth / 2, y: stemY + 8, side: 'right' }   // Lower, right side
            ]
        };
    }
    
    // ===== PRIVATE LEAF GENERATION METHODS =====
    
    static _generateSeedlingLeaves(ctx, leafConfig, leafColors, stemData) {
        // For seedlings, only use the top 2 attachment points (both at top of stem)
        const leafColor = leafColors[0];
        ctx.fillStyle = leafColor;
        
        // Use all attachment points for seedling (which are only the top 2)
        for (const attachPoint of stemData.attachmentPoints) {
            const direction = attachPoint.side === 'right' ? 1 : -1;
            this._drawSeedlingLeaf(ctx, attachPoint.x, attachPoint.y, direction, leafConfig);
        }
    }
    
    static _generateVegetativeLeaves(ctx, leafConfig, leafColors, stemData) {
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
            this._drawSeedlingLeaf(ctx, attachPoint.x, attachPoint.y, direction, leafConfig);
        }
    }
    
    static _generateWitheredLeaves(ctx, leafConfig, leafColors, stemData) {
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
            this._drawWitheredLeaf(ctx, attachPoint.x, attachPoint.y, direction, leafConfig);
        }
    }
    
    static _generateFlower(ctx, flowerConfig, flowerColors, stemData) {
        // Generate purple flower cluster at the top of the stem
        const flowerColor = flowerColors[0];
        const flowerX = stemData.centerX;
        const flowerY = stemData.y - 2; // Position flower above the stem top
        
        ctx.fillStyle = flowerColor;
        
        // Draw main flower cluster as small circles
        const clusterSize = Math.floor(flowerConfig.size * 3) + 2; // 2-5 small flowers
        const baseRadius = 1;
        
        for (let i = 0; i < clusterSize; i++) {
            // Random positioning within small cluster area
            const offsetX = (Math.random() - 0.5) * 3;
            const offsetY = (Math.random() - 0.5) * 2;
            const radius = baseRadius + (Math.random() - 0.5) * 0.5;
            
            ctx.beginPath();
            ctx.arc(flowerX + offsetX, flowerY + offsetY, radius, 0, 2 * Math.PI);
            ctx.fill();
        }
        
        // Add some color variation with darker purple accents
        if (flowerConfig.colorVariation > 0) {
            ctx.fillStyle = flowerColors[1] || flowerColors[0];
            const accentCount = Math.floor(clusterSize / 2);
            
            for (let i = 0; i < accentCount; i++) {
                const offsetX = (Math.random() - 0.5) * 2;
                const offsetY = (Math.random() - 0.5) * 1.5;
                
                ctx.beginPath();
                ctx.arc(flowerX + offsetX, flowerY + offsetY, 0.5, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
    }
    
    // ===== PRIVATE LEAF DRAWING METHODS =====
    
    static _drawSeedlingLeaf(ctx, stemCenterX, stemY, direction, leafConfig) {
        const leafWidth = 4;
        const leafHeight = 3;
        
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
                const serrationY = leafY + (i % 2 === 0 ? -0.5 : leafHeight + 0.5);
                ctx.fillRect(serrationX, serrationY, 0.5, 0.5);
            }
            
            // Restore original color
            ctx.fillStyle = originalColor;
        }
        
        // Draw a small connecting line from leaf to stem (petiole)
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(stemCenterX, stemY);
        ctx.lineTo(leafX + leafWidth/2, leafY + leafHeight/2);
        ctx.stroke();
    }
    
    static _drawWitheredLeaf(ctx, stemCenterX, stemY, direction, leafConfig) {
        const leafWidth = 4;
        const leafHeight = 3;
        
        // Calculate leaf position with downward droop for withered appearance
        const droopOffset = 2; // How much the leaf droops down
        const leafX = direction > 0 ? 
            stemCenterX + 1 :           // Right side: leaf starts just right of stem center
            stemCenterX - leafWidth - 1; // Left side: leaf ends just left of stem center
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
                const serrationY = leafY + (i % 2 === 0 ? -0.5 : leafHeight * 1.2 + 0.5);
                ctx.fillRect(serrationX, serrationY, 0.5, 0.5);
            }
            
            // Restore original color
            ctx.fillStyle = originalColor;
        }
        
        // Draw a curved drooping petiole from leaf to stem
        CanvasUtils.drawCurvedLine(
            ctx,
            stemCenterX, stemY,
            stemCenterX + (direction * 2), stemY + droopOffset / 2,  // Control point
            leafX + leafWidth/2, leafY + leafHeight/2,                // End point
            ctx.fillStyle,
            0.5
        );
    }
}

// Make available globally
window.HerbGenerator = HerbGenerator;
