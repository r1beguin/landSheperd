/**
 * ColorUtils - Color manipulation utilities for plant sprite generation
 * Provides hue shifting and color transformation functions
 */
class ColorUtils {
    /**
     * Shift hue of hex color by degrees
     * @param {string} hexColor - Hex color like "#4a7c3c"
     * @param {number} hueDegrees - Hue shift in degrees (-180 to 180)
     * @returns {string} Shifted hex color
     */
    static shiftHue(hexColor, hueDegrees) {
        // Convert hex to RGB
        const r = parseInt(hexColor.substr(1, 2), 16) / 255;
        const g = parseInt(hexColor.substr(3, 2), 16) / 255;
        const b = parseInt(hexColor.substr(5, 2), 16) / 255;
        
        // RGB to HSL
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
            else if (max === g) h = ((b - r) / d + 2) / 6;
            else h = ((r - g) / d + 4) / 6;
        }
        
        // Shift hue
        h = (h * 360 + hueDegrees) % 360 / 360;
        if (h < 0) h += 1;
        
        // HSL to RGB
        function hue2rgb(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }
        
        let nr, ng, nb;
        if (s === 0) {
            nr = ng = nb = l;
        } else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            nr = hue2rgb(p, q, h + 1/3);
            ng = hue2rgb(p, q, h);
            nb = hue2rgb(p, q, h - 1/3);
        }
        
        // Convert back to hex
        const toHex = (c) => {
            const hex = Math.round(c * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        
        return '#' + toHex(nr) + toHex(ng) + toHex(nb);
    }
}

// Make available globally
window.ColorUtils = ColorUtils;
