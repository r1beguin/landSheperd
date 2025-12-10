/**
 * TreeGenerator - Oak tree sprite generation
 * Generates sprites for tree species (oak) with genetic diversity
 */
class TreeGenerator extends BaseGenerator {
    /**
     * Generate sapling stage sprite
     * @param {object} speciesConfig - Species configuration object
     * @param {object} genetics - Genetics object (optional)
     * @param {string} lodLevel - LOD level (high/medium/low/impostor), defaults to 'medium'
     * @param {number} health - Plant health (0-100), affects visual appearance
     * @returns {HTMLCanvasElement} Generated sprite canvas
     */
    static generateSapling(speciesConfig, genetics = null, lodLevel = 'medium', health = 100) {
        // Handle impostor LOD
        if (lodLevel === 'impostor') {
            return BaseGenerator.generateImpostor(speciesConfig, 'Sapling');
        }
        
        const baseDimensions = speciesConfig.appearance?.dimensions || {width: 40, height: 50};
        const modules = speciesConfig.proceduralModules.sapling || speciesConfig.proceduralModules;
        const colors = speciesConfig.appearance.colorPalette;
        
        // Apply LOD multiplier to base dimensions first, then genetics
        const lodDimensions = this.applyLODDimensions(baseDimensions, lodLevel);
        const dimensions = GeneticsUtils.applyGeneticDimensions(lodDimensions, genetics, 0.4); // Sapling is ~40% size
        
        const { canvas, ctx } = this.createCanvas(dimensions.width, dimensions.height);
        
        // Apply genetics to visual features
        const widthModifier = genetics ? GeneticsUtils.getDimensionMultiplier(genetics.widthFactor) : 1.0;
        const foliageModifier = genetics ? GeneticsUtils.getFoliageMultiplier(genetics.foliageDensity) : 1.0;
        const hueTint = genetics ? GeneticsUtils.getHueTint(genetics.colorTint) : 0;
        
        // Apply hue shift to colors (genetics)
        let trunkColors = hueTint !== 0 ? colors.trunk.map(c => ColorUtils.shiftHue(c, hueTint * 0.3)) : colors.trunk;
        let leafColors = hueTint !== 0 ? (colors.sapling ? colors.sapling : colors.leaf).map(c => ColorUtils.shiftHue(c, hueTint)) : (colors.sapling || colors.leaf);
        
        // Apply health-based color modifications
        trunkColors = this.applyHealthColors(trunkColors, health);
        leafColors = this.applyHealthColors(leafColors, health);
        
        // Draw sapling trunk (apply widthModifier)
        const trunkHeight = dimensions.height * 0.7;
        const trunkWidth = Math.max(2, Math.round(4 * widthModifier));
        const trunkX = (dimensions.width - trunkWidth) / 2;
        const trunkY = dimensions.height - trunkHeight;
        
        ctx.fillStyle = trunkColors[0];
        ctx.fillRect(trunkX, trunkY, trunkWidth, trunkHeight);
        
        // Add trunk texture
        ctx.fillStyle = trunkColors[1];
        ctx.fillRect(trunkX, trunkY + 2, 1, Math.max(1, trunkHeight - 4));
        
        // High LOD: Add enhanced bark detail
        if (lodLevel === 'high') {
            this._addBarkTexture(ctx, trunkX, trunkY, trunkWidth, trunkHeight, trunkColors);
        }
        
        // Draw small canopy (apply foliageModifier)
        const canopyCount = Math.max(2, Math.round(3 * foliageModifier));
        const canopyRadius = Math.round(dimensions.width * 0.3);
        const canopyY = trunkY + Math.round(trunkHeight * 0.2);
        
        for (let i = 0; i < canopyCount; i++) {
            const angle = (i / canopyCount) * Math.PI * 2;
            const x = (dimensions.width / 2) + Math.cos(angle) * (canopyRadius * 0.5);
            const y = canopyY + Math.sin(angle) * (canopyRadius * 0.5);
            
            ctx.fillStyle = leafColors[i % leafColors.length];
            ctx.beginPath();
            ctx.arc(x, y, canopyRadius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // High LOD: Add individual leaf details
        if (lodLevel === 'high') {
            this._addLeafClusters(ctx, dimensions.width / 2, canopyY, canopyRadius, leafColors, Math.round(canopyCount * 1.5));
        }
        
        return canvas;
    }
    
    /**
     * Generate young tree stage sprite
     * @param {object} speciesConfig - Species configuration object
     * @param {object} genetics - Genetics object (optional)
     * @param {string} lodLevel - LOD level (high/medium/low/impostor), defaults to 'medium'
     * @param {number} health - Plant health (0-100), affects visual appearance
     * @returns {HTMLCanvasElement} Generated sprite canvas
     */
    static generateYoungTree(speciesConfig, genetics = null, lodLevel = 'medium', health = 100) {
        // Handle impostor LOD
        if (lodLevel === 'impostor') {
            return BaseGenerator.generateImpostor(speciesConfig, 'YoungTree');
        }
        
        const baseDimensions = speciesConfig.appearance?.dimensions || {width: 40, height: 50};
        const modules = speciesConfig.proceduralModules;
        const colors = speciesConfig.appearance.colorPalette;
        
        // Apply LOD multiplier to base dimensions first, then genetics
        const lodDimensions = this.applyLODDimensions(baseDimensions, lodLevel);
        const dimensions = GeneticsUtils.applyGeneticDimensions(lodDimensions, genetics, 0.7); // Young tree is ~70% size
        
        const { canvas, ctx } = this.createCanvas(dimensions.width, dimensions.height);
        
        // Apply genetics to visual features
        const widthModifier = genetics ? GeneticsUtils.getDimensionMultiplier(genetics.widthFactor) : 1.0;
        const foliageModifier = genetics ? GeneticsUtils.getFoliageMultiplier(genetics.foliageDensity) : 1.0;
        const hueTint = genetics ? GeneticsUtils.getHueTint(genetics.colorTint) : 0;
        
        // Apply hue shift to colors (genetics)
        let trunkColors = hueTint !== 0 ? colors.trunk.map(c => ColorUtils.shiftHue(c, hueTint * 0.3)) : colors.trunk;
        let leafColors = hueTint !== 0 ? colors.leaf.map(c => ColorUtils.shiftHue(c, hueTint)) : colors.leaf;
        
        // Apply health-based color modifications
        trunkColors = this.applyHealthColors(trunkColors, health);
        leafColors = this.applyHealthColors(leafColors, health);
        
        // Draw trunk (apply widthModifier)
        const trunkHeight = dimensions.height * 0.5;
        const trunkWidth = Math.max(4, Math.round(6 * widthModifier));
        const trunkX = (dimensions.width - trunkWidth) / 2;
        const trunkY = dimensions.height - trunkHeight;
        
        // Trunk with texture
        ctx.fillStyle = trunkColors[0];
        ctx.fillRect(trunkX, trunkY, trunkWidth, trunkHeight);
        
        // Add trunk texture
        ctx.fillStyle = trunkColors[1];
        ctx.fillRect(trunkX + 1, trunkY + 3, 1, Math.max(1, trunkHeight - 6));
        ctx.fillRect(trunkX, trunkY + Math.floor(trunkHeight/2), trunkWidth, 1);
        
        // Draw canopy (apply foliageModifier)
        const canopyCount = Math.max(4, Math.round(6 * foliageModifier));
        const canopyRadius = Math.round(dimensions.width * 0.25);
        const canopyY = trunkY + Math.round(trunkHeight * 0.3);
        
        for (let i = 0; i < canopyCount; i++) {
            const angle = (i / canopyCount) * Math.PI * 2;
            const x = (dimensions.width / 2) + Math.cos(angle) * (canopyRadius * 0.8);
            const y = canopyY + Math.sin(angle) * (canopyRadius * 0.6);
            
            ctx.fillStyle = leafColors[i % leafColors.length];
            ctx.beginPath();
            ctx.arc(x, y, canopyRadius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Add darker accent for depth
        ctx.fillStyle = leafColors[1];
        ctx.beginPath();
        ctx.arc(dimensions.width / 2, canopyY, canopyRadius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        // High LOD: Add enhanced detail for young trees
        if (lodLevel === 'high') {
            this._addBarkTexture(ctx, trunkX, trunkY, trunkWidth, trunkHeight, trunkColors);
            this._addLeafClusters(ctx, dimensions.width / 2, canopyY, canopyRadius * 1.5, leafColors, Math.round(canopyCount * 1.5));
        }
        
        return canvas;
    }
    
    /**
     * Generate mature tree stage sprite
     * @param {object} speciesConfig - Species configuration object
     * @param {object} genetics - Genetics object (optional)
     * @param {string} lodLevel - LOD level (high/medium/low/impostor), defaults to 'medium'
     * @param {number} health - Plant health (0-100), affects visual appearance
     * @returns {HTMLCanvasElement} Generated sprite canvas
     */
    static generateMatureTree(speciesConfig, genetics = null, lodLevel = 'medium', health = 100) {
        // Handle impostor LOD
        if (lodLevel === 'impostor') {
            return BaseGenerator.generateImpostor(speciesConfig, 'MatureTree');
        }
        
        const baseDimensions = speciesConfig.appearance?.dimensions || {width: 40, height: 50};
        const modules = speciesConfig.proceduralModules;
        const colors = speciesConfig.appearance.colorPalette;
        
        // Apply LOD multiplier to base dimensions first, then genetics, then height multiplier
        const lodDimensions = this.applyLODDimensions(baseDimensions, lodLevel);
        const heightMultiplier = 1.5; // 50% taller
        const dimensions = GeneticsUtils.applyGeneticDimensions(lodDimensions, genetics, 1.0); // Mature is 100%
        const canvasHeight = Math.round(dimensions.height * heightMultiplier);
        
        // Increase canvas width to prevent horizontal cropping of canopy
        const canvasWidth = Math.max(50, dimensions.width + 10); // Ensure room for canopy
        
        const { canvas, ctx } = this.createCanvas(canvasWidth, canvasHeight);
        
        // Apply genetics to visual features
        const widthModifier = genetics ? GeneticsUtils.getDimensionMultiplier(genetics.widthFactor) : 1.0;
        const foliageModifier = genetics ? GeneticsUtils.getFoliageMultiplier(genetics.foliageDensity) : 1.0;
        const hueTint = genetics ? GeneticsUtils.getHueTint(genetics.colorTint) : 0;
        
        // Apply hue shift to colors (genetics)
        let trunkColors = hueTint !== 0 ? colors.trunk.map(c => ColorUtils.shiftHue(c, hueTint * 0.3)) : colors.trunk;
        let leafColors = hueTint !== 0 ? colors.leaf.map(c => ColorUtils.shiftHue(c, hueTint)) : colors.leaf;
        
        // Apply health-based color modifications
        trunkColors = this.applyHealthColors(trunkColors, health);
        leafColors = this.applyHealthColors(leafColors, health);
        
        // Draw trunk (apply widthModifier) - centered in canvas with more visible height
        const trunkHeight = canvasHeight * 0.55; // Increased from 0.4 to 0.55 for more visible trunk
        const trunkWidth = Math.max(6, Math.round(8 * widthModifier));
        const trunkX = canvasWidth / 2 - trunkWidth / 2;
        const trunkY = canvasHeight - trunkHeight;
        
        // Draw trunk with segments
        const segments = modules.trunk?.segments || 5;
        const segmentHeight = trunkHeight / segments;
        
        for (let i = 0; i < segments; i++) {
            const segmentY = trunkY + (i * segmentHeight);
            const segmentWidth = trunkWidth * (1 - (i * 0.1)); // Taper
            const segmentX = (canvasWidth - segmentWidth) / 2;
            
            ctx.fillStyle = trunkColors[i % trunkColors.length];
            ctx.fillRect(segmentX, segmentY, segmentWidth, segmentHeight);
            
            // Add bark texture
            ctx.fillStyle = trunkColors[1] || trunkColors[0];
            for (let j = 0; j < segmentHeight; j += 3) {
                if (Math.random() > 0.6) {
                    ctx.fillRect(segmentX, segmentY + j, segmentWidth, 2);
                }
            }
            
            // High LOD: Add enhanced bark detail per segment
            if (lodLevel === 'high') {
                this._addBarkTexture(ctx, segmentX, segmentY, segmentWidth, segmentHeight, trunkColors);
            }
        }
        
        // Draw canopy (apply foliageModifier)
        const canopyCount = Math.max(6, Math.round(8 * foliageModifier));
        const canopyRadius = Math.round(dimensions.width * 0.2);
        const canopyY = trunkY + Math.round(trunkHeight * 0.2);
        
        for (let i = 0; i < canopyCount; i++) {
            const angle = (i / canopyCount) * Math.PI * 2;
            const distance = canopyRadius * (0.8 + Math.random() * 0.4);
            const x = (canvasWidth / 2) + Math.cos(angle) * distance;
            const y = canopyY + Math.sin(angle) * distance * 0.5;
            
            ctx.fillStyle = leafColors[i % leafColors.length];
            ctx.beginPath();
            ctx.arc(x, y, canopyRadius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // High LOD: Add individual leaf clusters for detail
        if (lodLevel === 'high') {
            this._addLeafClusters(ctx, canvasWidth / 2, canopyY, canopyRadius * 2, leafColors, Math.round(canopyCount * 2));
        }
        
        // Add multiple layers of darker accents for depth
        ctx.fillStyle = leafColors[1];
        ctx.beginPath();
        ctx.arc(canvasWidth / 2, canopyY, canopyRadius * 0.7, 0, Math.PI * 2);
        ctx.fill();
        
        if (leafColors.length > 2) {
            ctx.fillStyle = leafColors[2];
            ctx.beginPath();
            ctx.arc(canvasWidth / 2 - 3, canopyY - 2, canopyRadius * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        return canvas;
    }
    
    /**
     * Generate withered oak tree sprite
     * @param {object} speciesConfig - Species configuration object
     * @param {string} lodLevel - LOD level (high/medium/low/impostor), defaults to 'medium'
     * @returns {HTMLCanvasElement} Generated sprite canvas
     */
    static generateWithered(speciesConfig, lodLevel = 'medium') {
        // Handle impostor LOD
        if (lodLevel === 'impostor') {
            return BaseGenerator.generateImpostor(speciesConfig, 'Withered');
        }
        
        const baseDimensions = speciesConfig.appearance?.dimensions || {width: 40, height: 50};
        
        // Apply LOD multiplier to base dimensions
        const dimensions = this.applyLODDimensions(baseDimensions, lodLevel);
        const { canvas, ctx } = this.createCanvas(dimensions.width, dimensions.height);
        
        const colors = speciesConfig.appearance.colorPalette;
        
        // Calculate LOD scale for proper sizing
        const lodScale = this.getLODMultiplier(lodLevel);
        
        // Draw trunk (same as mature but darker) - scale with LOD
        const trunkWidth = Math.round(7 * lodScale);
        const trunkHeight = Math.round(35 * lodScale);
        const trunkX = canvas.width / 2 - trunkWidth / 2;
        const trunkY = canvas.height - trunkHeight;
        
        ctx.fillStyle = colors.witheredTrunk ? colors.witheredTrunk[0] : colors.trunk[2];
        ctx.fillRect(trunkX, trunkY, trunkWidth, trunkHeight);
        
        // Sparse withered branches (just bare sticks) - scale with LOD
        ctx.strokeStyle = colors.witheredTrunk ? colors.witheredTrunk[1] : colors.trunk[2];
        ctx.lineWidth = Math.max(1, Math.round(2 * lodScale));
        
        // Left branches
        ctx.beginPath();
        ctx.moveTo(trunkX, trunkY + 10 * lodScale);
        ctx.lineTo(trunkX - 8 * lodScale, trunkY + 5 * lodScale);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(trunkX, trunkY + 18 * lodScale);
        ctx.lineTo(trunkX - 6 * lodScale, trunkY + 15 * lodScale);
        ctx.stroke();
        
        // Right branches
        ctx.beginPath();
        ctx.moveTo(trunkX + trunkWidth, trunkY + 12 * lodScale);
        ctx.lineTo(trunkX + trunkWidth + 8 * lodScale, trunkY + 8 * lodScale);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(trunkX + trunkWidth, trunkY + 20 * lodScale);
        ctx.lineTo(trunkX + trunkWidth + 6 * lodScale, trunkY + 18 * lodScale);
        ctx.stroke();
        
        return canvas;
    }
    
    /**
     * Add detailed bark texture for high LOD
     * @private
     */
    static _addBarkTexture(ctx, x, y, width, height, trunkColors) {
        const detailColor = trunkColors[2] || trunkColors[1] || trunkColors[0];
        ctx.fillStyle = detailColor;
        
        // Vertical bark lines
        const lineCount = Math.floor(width / 2);
        for (let i = 0; i < lineCount; i++) {
            const lineX = x + (i * 2);
            ctx.fillRect(lineX, y, 1, height);
        }
        
        // Horizontal knots and texture
        const knotCount = Math.floor(height / 8);
        for (let i = 0; i < knotCount; i++) {
            const knotY = y + (i * 8) + Math.random() * 4;
            const knotWidth = Math.floor(width * 0.6);
            const knotX = x + (width - knotWidth) / 2;
            ctx.fillRect(knotX, knotY, knotWidth, 2);
        }
    }
    
    /**
     * Add individual leaf clusters for high LOD
     * @private
     */
    static _addLeafClusters(ctx, centerX, centerY, radius, leafColors, count) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const distance = radius * (0.3 + Math.random() * 0.4);
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance * 0.5;
            const clusterSize = 2 + Math.random() * 3;
            
            // Draw small leaf cluster
            ctx.fillStyle = leafColors[i % leafColors.length];
            ctx.beginPath();
            ctx.arc(x, y, clusterSize, 0, Math.PI * 2);
            ctx.fill();
            
            // Add highlight
            const highlightColor = leafColors[(i + 1) % leafColors.length];
            ctx.fillStyle = highlightColor;
            ctx.beginPath();
            ctx.arc(x - 0.5, y - 0.5, clusterSize * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Make available globally
window.TreeGenerator = TreeGenerator;
