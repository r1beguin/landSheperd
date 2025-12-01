/**
 * PlantGenerator - Procedural plant sprite generation system
 * Generates plant sprites based on species configuration and growth stage
 */
class PlantGenerator {
    static generatePlantSprite(speciesConfig, stage = 'Seedling') {
        // Find the growth stage configuration
        const growthStage = speciesConfig.growthStages.find(gs => gs.name === stage);
        if (!growthStage) {
            console.warn(`Growth stage ${stage} not found, defaulting to appropriate generator`);
            // Check if this is an oak tree (has Sapling stage)
            const hasSaplingStage = speciesConfig.growthStages.some(gs => gs.name === 'Sapling');
            if (hasSaplingStage) {
                return this.generateSaplingSprite(speciesConfig);
            }
            return this.generateSeedlingSprite(speciesConfig);
        }

        // Route to appropriate generator based on stage
        switch (growthStage.generator) {
            case 'seedlingGeneration':
                return this.generateSeedlingSprite(speciesConfig);
            case 'vegetativeGeneration':
                return this.generateVegetativeSprite(speciesConfig);
            case 'floweringGeneration':
                return this.generateFloweringSprite(speciesConfig);
            case 'witheredGeneration':
                // Check if this is oak tree based on category or presence of Sapling stage
                if (speciesConfig.category === 'tree' || speciesConfig.growthStages.some(gs => gs.name === 'Sapling')) {
                    return this.generateOakWitheredSprite(speciesConfig);
                }
                return this.generateWitheredSprite(speciesConfig);
            // Oak tree generators
            case 'saplingGeneration':
                return this.generateSaplingSprite(speciesConfig);
            case 'youngTreeGeneration':
                return this.generateYoungTreeSprite(speciesConfig);
            case 'matureTreeGeneration':
                return this.generateMatureTreeSprite(speciesConfig);
            // Clover generators
            case 'cloverSproutGeneration':
                return this.generateCloverSproutSprite(speciesConfig);
            case 'cloverSpreadingGeneration':
                return this.generateCloverSpreadingSprite(speciesConfig);
            case 'cloverFloweringGeneration':
                return this.generateCloverFloweringSprite(speciesConfig);
            default:
                console.warn(`Unknown generator ${growthStage.generator}, defaulting to appropriate generator`);
                // Smart default: check if tree or herb
                const hasSaplingStage = speciesConfig.growthStages.some(gs => gs.name === 'Sapling');
                if (hasSaplingStage) {
                    return this.generateSaplingSprite(speciesConfig);
                }
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

    static generateFloweringSprite(speciesConfig) {
        const canvas = document.createElement('canvas');
        canvas.width = 20;
        canvas.height = 20;
        const ctx = canvas.getContext('2d');
        
        // Clear background
        ctx.clearRect(0, 0, 20, 20);
        
        // Use the main modules for flowering stage
        const modules = speciesConfig.proceduralModules;
        const colors = speciesConfig.appearance.colorPalette;
        
        // Generate flowering stage - same as vegetative but with purple flower on top
        const stemData = this.generateVegetativeStem(ctx, modules.stem, colors.stem);
        this.generateVegetativeLeaves(ctx, modules.leaf, colors.leaf, stemData);
        this.generateFlower(ctx, modules.flower, colors.flower, stemData);
        
        return canvas;
    }

    static generateWitheredSprite(speciesConfig) {
        const canvas = document.createElement('canvas');
        canvas.width = 20;
        canvas.height = 20;
        const ctx = canvas.getContext('2d');
        
        // Clear background
        ctx.clearRect(0, 0, 20, 20);
        
        // Use the main modules for withered stage
        const modules = speciesConfig.proceduralModules;
        const colors = speciesConfig.appearance.colorPalette;
        
        // Generate withered stage - same structure as vegetative but with brown colors and drooping leaves
        const stemData = this.generateWitheredStem(ctx, modules.stem, colors.witheredStem);
        this.generateWitheredLeaves(ctx, modules.leaf, colors.witheredLeaf, stemData);
        
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

    static generateWitheredStem(ctx, stemConfig, stemColors) {
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

    static generateWitheredLeaves(ctx, leafConfig, leafColors, stemData) {
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
            this.drawWitheredLeaf(ctx, attachPoint.x, attachPoint.y, direction, leafConfig);
        }
    }

    static generateFlower(ctx, flowerConfig, flowerColors, stemData) {
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

    static drawWitheredLeaf(ctx, stemCenterX, stemY, direction, leafConfig) {
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
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(stemCenterX, stemY);
        // Create a curved path that shows the leaf drooping
        ctx.quadraticCurveTo(
            stemCenterX + (direction * 2), stemY + droopOffset / 2,  // Control point
            leafX + leafWidth/2, leafY + leafHeight/2                // End point
        );
        ctx.stroke();
    }
    
    /**
     * Oak Tree Sprite Generation Methods
     * Generate oak tree sprites for different growth stages
     */
    
    static generateSaplingSprite(speciesConfig) {
        const dimensions = speciesConfig.appearance?.dimensions || {width: 40, height: 50};
        const canvas = document.createElement('canvas');
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const modules = speciesConfig.proceduralModules.sapling || speciesConfig.proceduralModules;
        const colors = speciesConfig.appearance.colorPalette;
        
        // Draw sapling trunk (thin, small) - positioned lower to leave room for canopy
        const trunkWidth = 3;
        const trunkHeight = 15;
        const trunkX = canvas.width / 2 - trunkWidth / 2;
        const trunkY = canvas.height - trunkHeight - 2; // More room at bottom
        
        ctx.fillStyle = colors.trunk[0];
        ctx.fillRect(trunkX, trunkY, trunkWidth, trunkHeight);
        
        // Add trunk texture
        ctx.fillStyle = colors.trunk[1];
        ctx.fillRect(trunkX, trunkY + 2, 1, trunkHeight - 4);
        
        // Draw small canopy - ensure it fits within canvas top
        const canopyRadius = 7;
        const canopyY = trunkY - canopyRadius - 2; // Ensure canopy fits with margin
        
        ctx.fillStyle = colors.sapling ? colors.sapling[0] : colors.leaf[0];
        
        // Draw 3 overlapping circles for canopy
        ctx.beginPath();
        ctx.arc(trunkX + trunkWidth/2 - 4, canopyY + 2, canopyRadius, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(trunkX + trunkWidth/2 + 4, canopyY + 2, canopyRadius, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(trunkX + trunkWidth/2, canopyY, canopyRadius, 0, 2 * Math.PI);
        ctx.fill();
        
        return canvas;
    }

    static generateYoungTreeSprite(speciesConfig) {
        const dimensions = speciesConfig.appearance?.dimensions || {width: 40, height: 50};
        const canvas = document.createElement('canvas');
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const colors = speciesConfig.appearance.colorPalette;
        
        // Draw thicker trunk - positioned to leave room for canopy
        const trunkWidth = 5;
        const trunkHeight = 20;
        const trunkX = canvas.width / 2 - trunkWidth / 2;
        const trunkY = canvas.height - trunkHeight - 2;
        
        ctx.fillStyle = colors.trunk[0];
        ctx.fillRect(trunkX, trunkY, trunkWidth, trunkHeight);
        
        // Add trunk texture
        ctx.fillStyle = colors.trunk[1];
        ctx.fillRect(trunkX + 1, trunkY + 3, 1, trunkHeight - 6);
        ctx.fillRect(trunkX, trunkY + trunkHeight/2, trunkWidth, 1);
        
        // Draw larger canopy - ensure it fits within canvas
        const canopyRadius = 10;
        const canopyY = canopyRadius + 6; // Position from top: radius + top circle offset (6px)
        
        ctx.fillStyle = colors.leaf[0];
        
        // Draw 5 overlapping circles for fuller canopy
        ctx.beginPath();
        ctx.arc(trunkX + trunkWidth/2 - 8, canopyY, canopyRadius, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(trunkX + trunkWidth/2 + 8, canopyY, canopyRadius, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(trunkX + trunkWidth/2, canopyY - 6, canopyRadius, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(trunkX + trunkWidth/2 - 4, canopyY + 4, canopyRadius, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(trunkX + trunkWidth/2 + 4, canopyY + 4, canopyRadius, 0, 2 * Math.PI);
        ctx.fill();
        
        // Add darker accents for depth
        ctx.fillStyle = colors.leaf[1];
        ctx.beginPath();
        ctx.arc(trunkX + trunkWidth/2, canopyY, canopyRadius * 0.6, 0, 2 * Math.PI);
        ctx.fill();
        
        return canvas;
    }

    static generateMatureTreeSprite(speciesConfig) {
        const dimensions = speciesConfig.appearance?.dimensions || {width: 40, height: 50};
        const canvas = document.createElement('canvas');
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const colors = speciesConfig.appearance.colorPalette;
        
        // Draw thick trunk - leave room for large canopy
        const trunkWidth = 7;
        const trunkHeight = 22;
        const trunkX = canvas.width / 2 - trunkWidth / 2;
        const trunkY = canvas.height - trunkHeight - 2;
        
        ctx.fillStyle = colors.trunk[0];
        ctx.fillRect(trunkX, trunkY, trunkWidth, trunkHeight);
        
        // Add detailed trunk texture
        ctx.fillStyle = colors.trunk[1];
        ctx.fillRect(trunkX + 1, trunkY + 3, 2, trunkHeight - 6);
        ctx.fillRect(trunkX, trunkY + trunkHeight/3, trunkWidth, 2);
        ctx.fillRect(trunkX, trunkY + 2*trunkHeight/3, trunkWidth, 1);
        
        // Draw large, full canopy - ensure top fits
        const canopyRadius = 13;
        const canopyY = canopyRadius + 8; // Position from top: radius + top circle offset (8px)
        
        ctx.fillStyle = colors.leaf[0];
        
        // Draw 7 overlapping circles for very full canopy
        ctx.beginPath();
        ctx.arc(trunkX + trunkWidth/2 - 12, canopyY + 2, canopyRadius, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(trunkX + trunkWidth/2 + 12, canopyY + 2, canopyRadius, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(trunkX + trunkWidth/2, canopyY - 8, canopyRadius, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(trunkX + trunkWidth/2 - 6, canopyY + 6, canopyRadius, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(trunkX + trunkWidth/2 + 6, canopyY + 6, canopyRadius, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(trunkX + trunkWidth/2 - 9, canopyY - 3, canopyRadius * 0.8, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(trunkX + trunkWidth/2 + 9, canopyY - 3, canopyRadius * 0.8, 0, 2 * Math.PI);
        ctx.fill();
        
        // Add multiple layers of darker accents for depth
        ctx.fillStyle = colors.leaf[1];
        ctx.beginPath();
        ctx.arc(trunkX + trunkWidth/2, canopyY, canopyRadius * 0.7, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = colors.leaf[2];
        ctx.beginPath();
        ctx.arc(trunkX + trunkWidth/2 - 3, canopyY - 2, canopyRadius * 0.4, 0, 2 * Math.PI);
        ctx.fill();
        
        return canvas;
    }

    static generateOakWitheredSprite(speciesConfig) {
        const dimensions = speciesConfig.appearance?.dimensions || {width: 40, height: 50};
        const canvas = document.createElement('canvas');
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const colors = speciesConfig.appearance.colorPalette;
        
        // Draw trunk (same as mature but darker)
        const trunkWidth = 7;
        const trunkHeight = 35;
        const trunkX = canvas.width / 2 - trunkWidth / 2;
        const trunkY = canvas.height - trunkHeight;
        
        ctx.fillStyle = colors.witheredTrunk ? colors.witheredTrunk[0] : colors.trunk[2];
        ctx.fillRect(trunkX, trunkY, trunkWidth, trunkHeight);
        
        // Sparse withered branches (just bare sticks)
        ctx.strokeStyle = colors.witheredTrunk ? colors.witheredTrunk[1] : colors.trunk[2];
        ctx.lineWidth = 2;
        
        // Left branches
        ctx.beginPath();
        ctx.moveTo(trunkX, trunkY + 10);
        ctx.lineTo(trunkX - 8, trunkY + 5);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(trunkX, trunkY + 18);
        ctx.lineTo(trunkX - 6, trunkY + 15);
        ctx.stroke();
        
        // Right branches
        ctx.beginPath();
        ctx.moveTo(trunkX + trunkWidth, trunkY + 12);
        ctx.lineTo(trunkX + trunkWidth + 8, trunkY + 8);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(trunkX + trunkWidth, trunkY + 20);
        ctx.lineTo(trunkX + trunkWidth + 6, trunkY + 18);
        ctx.stroke();
        
        return canvas;
    }

    /**
     * Clover Sprite Generation Methods
     * Generate clover sprites for different growth stages (bottom layer ground cover)
     */

    static generateCloverSproutSprite(speciesConfig) {
        const dimensions = speciesConfig.appearance?.dimensions || {width: 16, height: 16};
        const canvas = document.createElement('canvas');
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
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

    static generateCloverSpreadingSprite(speciesConfig) {
        const dimensions = speciesConfig.appearance?.dimensions || {width: 16, height: 16};
        const canvas = document.createElement('canvas');
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
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

    static generateCloverFloweringSprite(speciesConfig) {
        const dimensions = speciesConfig.appearance?.dimensions || {width: 16, height: 16};
        const canvas = document.createElement('canvas');
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
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
window.PlantGenerator = PlantGenerator;