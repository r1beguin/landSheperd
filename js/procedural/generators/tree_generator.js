/**
 * TreeGenerator - Oak tree sprite generation
 * Generates sprites for tree species (oak) with genetic diversity
 */
class TreeGenerator extends BaseGenerator {
    /**
     * Generate sapling stage sprite
     * @param {object} speciesConfig - Species configuration object
     * @param {object} genetics - Genetics object (optional)
     * @returns {HTMLCanvasElement} Generated sprite canvas
     */
    static generateSapling(speciesConfig, genetics = null) {
        const baseDimensions = speciesConfig.appearance?.dimensions || {width: 40, height: 50};
        const modules = speciesConfig.proceduralModules.sapling || speciesConfig.proceduralModules;
        const colors = speciesConfig.appearance.colorPalette;
        
        // Apply genetics to dimensions
        const dimensions = GeneticsUtils.applyGeneticDimensions(baseDimensions, genetics, 0.4); // Sapling is ~40% size
        
        const { canvas, ctx } = this.createCanvas(dimensions.width, dimensions.height);
        
        // Apply genetics to visual features
        const widthModifier = genetics ? GeneticsUtils.getDimensionMultiplier(genetics.widthFactor) : 1.0;
        const foliageModifier = genetics ? GeneticsUtils.getFoliageMultiplier(genetics.foliageDensity) : 1.0;
        const hueTint = genetics ? GeneticsUtils.getHueTint(genetics.colorTint) : 0;
        
        // Apply hue shift to colors
        const trunkColors = hueTint !== 0 ? colors.trunk.map(c => ColorUtils.shiftHue(c, hueTint * 0.3)) : colors.trunk;
        const leafColors = hueTint !== 0 ? (colors.sapling ? colors.sapling : colors.leaf).map(c => ColorUtils.shiftHue(c, hueTint)) : (colors.sapling || colors.leaf);
        
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
        
        return canvas;
    }
    
    /**
     * Generate young tree stage sprite
     * @param {object} speciesConfig - Species configuration object
     * @param {object} genetics - Genetics object (optional)
     * @returns {HTMLCanvasElement} Generated sprite canvas
     */
    static generateYoungTree(speciesConfig, genetics = null) {
        const baseDimensions = speciesConfig.appearance?.dimensions || {width: 40, height: 50};
        const modules = speciesConfig.proceduralModules;
        const colors = speciesConfig.appearance.colorPalette;
        
        // Apply genetics to dimensions
        const dimensions = GeneticsUtils.applyGeneticDimensions(baseDimensions, genetics, 0.7); // Young tree is ~70% size
        
        const { canvas, ctx } = this.createCanvas(dimensions.width, dimensions.height);
        
        // Apply genetics to visual features
        const widthModifier = genetics ? GeneticsUtils.getDimensionMultiplier(genetics.widthFactor) : 1.0;
        const foliageModifier = genetics ? GeneticsUtils.getFoliageMultiplier(genetics.foliageDensity) : 1.0;
        const hueTint = genetics ? GeneticsUtils.getHueTint(genetics.colorTint) : 0;
        
        // Apply hue shift
        const trunkColors = hueTint !== 0 ? colors.trunk.map(c => ColorUtils.shiftHue(c, hueTint * 0.3)) : colors.trunk;
        const leafColors = hueTint !== 0 ? colors.leaf.map(c => ColorUtils.shiftHue(c, hueTint)) : colors.leaf;
        
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
        
        return canvas;
    }
    
    /**
     * Generate mature tree stage sprite
     * @param {object} speciesConfig - Species configuration object
     * @param {object} genetics - Genetics object (optional)
     * @returns {HTMLCanvasElement} Generated sprite canvas
     */
    static generateMatureTree(speciesConfig, genetics = null) {
        const baseDimensions = speciesConfig.appearance?.dimensions || {width: 40, height: 50};
        const modules = speciesConfig.proceduralModules;
        const colors = speciesConfig.appearance.colorPalette;
        
        // Apply genetics to dimensions
        const dimensions = GeneticsUtils.applyGeneticDimensions(baseDimensions, genetics, 1.0); // Mature is 100%
        
        // Increase canvas width to prevent horizontal cropping of canopy
        const canvasWidth = Math.max(50, dimensions.width + 10); // Ensure room for canopy
        
        const { canvas, ctx } = this.createCanvas(canvasWidth, dimensions.height);
        
        // Apply genetics to visual features
        const widthModifier = genetics ? GeneticsUtils.getDimensionMultiplier(genetics.widthFactor) : 1.0;
        const foliageModifier = genetics ? GeneticsUtils.getFoliageMultiplier(genetics.foliageDensity) : 1.0;
        const hueTint = genetics ? GeneticsUtils.getHueTint(genetics.colorTint) : 0;
        
        // Apply hue shift
        const trunkColors = hueTint !== 0 ? colors.trunk.map(c => ColorUtils.shiftHue(c, hueTint * 0.3)) : colors.trunk;
        const leafColors = hueTint !== 0 ? colors.leaf.map(c => ColorUtils.shiftHue(c, hueTint)) : colors.leaf;
        
        // Draw trunk (apply widthModifier) - centered in canvas
        const trunkHeight = dimensions.height * 0.4;
        const trunkWidth = Math.max(6, Math.round(8 * widthModifier));
        const trunkX = canvasWidth / 2 - trunkWidth / 2;
        const trunkY = dimensions.height - trunkHeight;
        
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
     * @returns {HTMLCanvasElement} Generated sprite canvas
     */
    static generateWithered(speciesConfig) {
        const dimensions = speciesConfig.appearance?.dimensions || {width: 40, height: 50};
        const { canvas, ctx } = this.createCanvas(dimensions.width, dimensions.height);
        
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
}

// Make available globally
window.TreeGenerator = TreeGenerator;
