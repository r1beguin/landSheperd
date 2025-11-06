/**
 * PlantGenerator - Procedural plant sprite generation system
 * Generates plant sprites based on species configuration and growth stage
 */
class PlantGenerator {
    static generatePlantSprite(speciesConfig, stage = 'Seedling') {
        // Find the growth stage configuration
        const growthStage = speciesConfig.growthStages.find(gs => gs.name === stage);
        if (!growthStage) {
            console.warn(`Growth stage ${stage} not found, defaulting to Seedling`);
            return this.generateSeedlingSprite(speciesConfig);
        }

        // Route to appropriate generator based on stage
        switch (growthStage.generator) {
            case 'seedlingGeneration':
                return this.generateSeedlingSprite(speciesConfig);
            case 'vegetativeGeneration':
                return this.generateVegetativeSprite(speciesConfig);
            default:
                console.warn(`Unknown generator ${growthStage.generator}, defaulting to seedling`);
                return this.generateSeedlingSprite(speciesConfig);
        }
    }

    static generateSeedlingSprite(speciesConfig) {
        const canvas = document.createElement('canvas');
        canvas.width = 20;
        canvas.height = 20;
        const ctx = canvas.getContext('2d');
        
        // Clear background
        ctx.clearRect(0, 0, 20, 20);
        
        // Use seedling-specific modules if available, otherwise fall back to defaults
        const modules = speciesConfig.proceduralModules.seedling || speciesConfig.proceduralModules;
        const colors = speciesConfig.appearance.colorPalette;
        
        // Generate smaller seedling - 50% smaller stem, only 2 leaves at top
        const stemData = this.generateSeedlingStem(ctx, modules.stem, colors.stem);
        this.generateSeedlingLeaves(ctx, modules.leaf, colors.leaf, stemData);
        
        return canvas;
    }

    static generateVegetativeSprite(speciesConfig) {
        const canvas = document.createElement('canvas');
        canvas.width = 20;
        canvas.height = 20;
        const ctx = canvas.getContext('2d');
        
        // Clear background
        ctx.clearRect(0, 0, 20, 20);
        
        // Use the main (vegetative) modules - this is the old "seedling" appearance
        const modules = speciesConfig.proceduralModules;
        const colors = speciesConfig.appearance.colorPalette;
        
        // Generate vegetative stage with original seedling appearance
        const stemData = this.generateVegetativeStem(ctx, modules.stem, colors.stem);
        this.generateVegetativeLeaves(ctx, modules.leaf, colors.leaf, stemData);
        
        return canvas;
    }
    
    static generateSeedlingStem(ctx, stemConfig, stemColors) {
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

    static generateVegetativeStem(ctx, stemConfig, stemColors) {
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
    
    static generateSeedlingLeaves(ctx, leafConfig, leafColors, stemData) {
        // For seedlings, only use the top 2 attachment points (both at top of stem)
        const leafColor = leafColors[0];
        ctx.fillStyle = leafColor;
        
        // Use all attachment points for seedling (which are only the top 2)
        for (const attachPoint of stemData.attachmentPoints) {
            const direction = attachPoint.side === 'right' ? 1 : -1;
            this.drawSeedlingLeaf(ctx, attachPoint.x, attachPoint.y, direction, leafConfig);
        }
    }

    static generateVegetativeLeaves(ctx, leafConfig, leafColors, stemData) {
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
            this.drawSeedlingLeaf(ctx, attachPoint.x, attachPoint.y, direction, leafConfig);
        }
    }
    
    static drawSeedlingLeaf(ctx, stemCenterX, stemY, direction, leafConfig) {
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
}

// Make available globally
window.PlantGenerator = PlantGenerator;