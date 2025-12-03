/**
 * GeneticsUtils - Genetic calculation utilities for plant sprite generation
 * Provides consistent genetic modifier calculations for visual traits
 */
class GeneticsUtils {
    /**
     * Get dimension multiplier from genetic value (0-255)
     * @param {number} geneticValue - Genetic value (0-255)
     * @returns {number} Multiplier (0.7-1.3)
     */
    static getDimensionMultiplier(geneticValue) {
        return 0.7 + (geneticValue / 255) * 0.6;
    }
    
    /**
     * Get foliage density multiplier from genetic value (0-255)
     * @param {number} geneticValue - Genetic value (0-255)
     * @returns {number} Multiplier (0.6-1.4)
     */
    static getFoliageMultiplier(geneticValue) {
        return 0.6 + (geneticValue / 255) * 0.8;
    }
    
    /**
     * Get hue tint degrees from genetic value (0-255)
     * @param {number} geneticValue - Genetic value (0-255)
     * @returns {number} Hue shift in degrees (-20 to 20)
     */
    static getHueTint(geneticValue) {
        return -20 + (geneticValue / 255) * 40;
    }
    
    /**
     * Apply genetic modifiers to base dimensions with size modifier
     * @param {object} baseDimensions - Base dimensions {width, height}
     * @param {object} genetics - Genetics object with heightFactor, widthFactor (0-255)
     * @param {number} sizeModifier - Stage size modifier (e.g. 0.4 for sapling, 0.7 for young, 1.0 for mature)
     * @returns {object} Modified dimensions {width, height}
     */
    static applyGeneticDimensions(baseDimensions, genetics, sizeModifier) {
        if (!genetics) {
            return {
                width: Math.round(baseDimensions.width * sizeModifier),
                height: Math.round(baseDimensions.height * sizeModifier)
            };
        }
        
        const heightMult = this.getDimensionMultiplier(genetics.heightFactor);
        const widthMult = this.getDimensionMultiplier(genetics.widthFactor);
        
        return {
            width: Math.round(baseDimensions.width * widthMult * sizeModifier),
            height: Math.round(baseDimensions.height * heightMult * sizeModifier)
        };
    }
}

// Make available globally
window.GeneticsUtils = GeneticsUtils;
