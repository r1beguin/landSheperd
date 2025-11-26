/**
 * OverlayManager - Multi-Nutrient Visualization System
 * 
 * Manages overlay visualization modes for soil nutrients.
 * Provides color gradient generation and mode cycling (F key).
 * 
 * Visualization Modes:
 * - NORMAL: Default view with plant nutrient tinting
 * - FERTILITY: Average fertility heatmap (red → yellow → green)
 * - NITROGEN: Nitrogen-specific heatmap
 * - PHOSPHORUS: Phosphorus-specific heatmap
 * - POTASSIUM: Potassium-specific heatmap
 * - ORGANIC_MATTER: Organic matter-specific heatmap
 * 
 * Color Gradient: Red (low) → Yellow (mid) → Green (high)
 */

class OverlayManager {
    constructor() {
        // Visualization modes
        this.modes = [
            { id: 'NORMAL', name: 'Normal View', key: null },
            { id: 'FERTILITY', name: 'Fertility', key: 'fertility' },
            { id: 'NITROGEN', name: 'Nitrogen (N)', key: 'nitrogen' },
            { id: 'PHOSPHORUS', name: 'Phosphorus (P)', key: 'phosphorus' },
            { id: 'POTASSIUM', name: 'Potassium (K)', key: 'potassium' },
            { id: 'ORGANIC_MATTER', name: 'Organic Matter', key: 'organicMatter' }
        ];
        
        this.currentModeIndex = 0;
        
        // Color gradient settings
        this.colorGradient = {
            low: { r: 255, g: 50, b: 50 },      // Red
            mid: { r: 255, g: 255, b: 50 },     // Yellow
            high: { r: 50, g: 255, b: 50 }      // Green
        };
        
        // Value ranges for color mapping
        this.valueRange = {
            min: 0,
            mid: 50,
            max: 100
        };
    }
    
    /**
     * Get current overlay mode
     * @returns {Object} Current mode object
     */
    getCurrentMode() {
        return this.modes[this.currentModeIndex];
    }
    
    /**
     * Get current mode key (for testing and external access)
     * @returns {string} Current mode key (e.g., 'normal', 'fertility', 'nitrogen')
     */
    get currentMode() {
        const mode = this.getCurrentMode();
        return mode.key || 'normal';
    }
    
    /**
     * Cycle to next overlay mode
     * @returns {Object} New current mode
     */
    cycleMode() {
        this.currentModeIndex = (this.currentModeIndex + 1) % this.modes.length;
        return this.getCurrentMode();
    }
    
    /**
     * Check if overlay is currently active (not NORMAL mode)
     * @returns {boolean}
     */
    isOverlayActive() {
        return this.currentModeIndex !== 0;
    }
    
    /**
     * Get color for a value using gradient (0-100 scale)
     * @param {number} value - Value to map (0-100)
     * @returns {Array} [r, g, b, a] color (0-1 range for WebGL)
     */
    getColorForValue(value) {
        // Clamp value to range
        value = Math.max(this.valueRange.min, Math.min(this.valueRange.max, value));
        
        let r, g, b;
        
        if (value <= this.valueRange.mid) {
            // Interpolate between low and mid (red → yellow)
            const t = (value - this.valueRange.min) / (this.valueRange.mid - this.valueRange.min);
            r = this.lerp(this.colorGradient.low.r, this.colorGradient.mid.r, t);
            g = this.lerp(this.colorGradient.low.g, this.colorGradient.mid.g, t);
            b = this.lerp(this.colorGradient.low.b, this.colorGradient.mid.b, t);
        } else {
            // Interpolate between mid and high (yellow → green)
            const t = (value - this.valueRange.mid) / (this.valueRange.max - this.valueRange.mid);
            r = this.lerp(this.colorGradient.mid.r, this.colorGradient.high.r, t);
            g = this.lerp(this.colorGradient.mid.g, this.colorGradient.high.g, t);
            b = this.lerp(this.colorGradient.mid.b, this.colorGradient.high.b, t);
        }
        
        // Convert to 0-1 range for WebGL
        return [r / 255, g / 255, b / 255, 1.0];
    }
    
    /**
     * Get overlay color for a soil cell
     * @param {Object} soil - Soil cell object
     * @returns {Array} [r, g, b, a] color or null if NORMAL mode
     */
    getOverlayColor(soil) {
        const mode = this.getCurrentMode();
        
        // Normal mode - no overlay
        if (mode.id === 'NORMAL') {
            return null;
        }
        
        // Get the nutrient value based on current mode
        let value;
        if (mode.key === 'fertility') {
            value = soil.fertility || 0;
        } else {
            value = soil[mode.key] || 0;
        }
        
        return this.getColorForValue(value);
    }
    
    /**
     * Linear interpolation helper
     * @param {number} a - Start value
     * @param {number} b - End value
     * @param {number} t - Interpolation factor (0-1)
     * @returns {number} Interpolated value
     */
    lerp(a, b, t) {
        return a + (b - a) * t;
    }
    
    /**
     * Get legend data for UI rendering
     * @returns {Object} Legend configuration
     */
    getLegendData() {
        const mode = this.getCurrentMode();
        
        return {
            mode: mode.name,
            active: this.isOverlayActive(),
            gradient: [
                { value: 0, color: this.getColorForValue(0), label: 'Low (0)' },
                { value: 25, color: this.getColorForValue(25), label: '25' },
                { value: 50, color: this.getColorForValue(50), label: 'Mid (50)' },
                { value: 75, color: this.getColorForValue(75), label: '75' },
                { value: 100, color: this.getColorForValue(100), label: 'High (100)' }
            ]
        };
    }
    
    /**
     * Get hint text for current mode
     * @returns {string} Hint text
     */
    getHintText() {
        const mode = this.getCurrentMode();
        if (mode.id === 'NORMAL') {
            return 'Press F to show nutrient overlays';
        }
        return `${mode.name} | Press F to cycle modes`;
    }
}
