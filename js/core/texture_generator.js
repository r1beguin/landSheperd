/**
 * TextureGenerator - Générateur de textures procédurales pour le sol
 * 
 * Ce module génère dynamiquement des textures de sol basées sur les propriétés
 * chimiques et physiques. Il utilise Canvas 2D pour créer les textures pixel par pixel
 * puis les convertit en textures WebGL pour un rendu ultra-optimisé.
 * 
 * Fonctionnalités principales :
 * - Génération procédurale de textures de sol 20x20
 * - Cache intelligent des textures par propriétés
 * - Conversion automatique Canvas 2D -> WebGL
 * - Variations de bruit et de couleur pour le réalisme
 */

class TextureGenerator {
    constructor(gl, config = null) {
        this.gl = gl;
        this.textureCache = new Map();
        this.canvasCache = new Map();
        this.config = config;
        
        // Configuration de génération depuis config.json ou valeurs par défaut
        this.textureSize = this.config?.world?.textures?.soilTextureSize || 20;
        this.variations = this.config?.world?.textures?.generateVariations || 2;
        this.waterLevels = this.config?.world?.textures?.waterIntensityLevels || [
            { threshold: 20, coverage: 0.05, color: [50, 120, 255] }
        ];
        this.pollutionLevels = this.config?.world?.textures?.pollutionIntensityLevels || [
            { threshold: 15, coverage: 0.03, color: [100, 255, 120] }
        ];
        
        // État des calques (désactivés par défaut pour voir le sol pur)
        this.layerVisibility = {
            water: false,
            pollution: false
        };
        
        // Flag pour optimiser les régénérations de textures
        this.needsTextureUpdate = false;
        this.textureUpdateDebounce = null;
        
        console.log('🎨 TextureGenerator initialisé avec configuration:', {
            textureSize: this.textureSize,
            variations: this.variations,
            waterLevels: this.waterLevels.length,
            pollutionLevels: this.pollutionLevels.length
        });
        
        this.preGenerateTextures();
    }
    
    // Pré-génération de toutes les textures nécessaires
    async preGenerateTextures() {
        const startTime = performance.now();
        let texturesGenerated = 0;
        
        console.log('🎨 Génération des textures de sol...');
        
        // Générer des textures pour différents niveaux de fertilité
        for (let fertility = 0; fertility <= 100; fertility += 25) {
            for (let water = 0; water <= 100; water += 50) {
                for (let pollution = 0; pollution <= 100; pollution += 50) {
                    for (let variation = 0; variation < 2; variation++) { // Réduire les variations
                        const textureKey = this.getTextureKey(fertility, water, pollution, variation);
                        this.generateSoilTexture(fertility, water, pollution, variation);
                        texturesGenerated++;
                    }
                }
            }
        }
        
        const endTime = performance.now();
        console.log(`✅ ${texturesGenerated} textures générées en ${(endTime - startTime).toFixed(2)}ms`);
    }
    
    // Génère une clé unique pour une texture basée sur les propriétés
    getTextureKey(fertility, water, pollution, variation = 0) {
        // Quantifier les valeurs pour réduire les combinaisons
        const fRange = Math.floor(fertility / 25) * 25;
        const wRange = Math.floor(water / 50) * 50;
        const pRange = Math.floor(pollution / 50) * 50;
        return `soil_${fRange}_${wRange}_${pRange}_${variation}`;
    }
    
    // Génère une texture de sol procédurale
    generateSoilTexture(fertility, water, pollution, variation = 0) {
        const key = this.getTextureKey(fertility, water, pollution, variation);
        
        // Vérifier le cache
        if (this.textureCache.has(key)) {
            return this.textureCache.get(key);
        }
        
        // Créer un canvas pour dessiner la texture
        const canvas = document.createElement('canvas');
        canvas.width = this.textureSize;
        canvas.height = this.textureSize;
        const ctx = canvas.getContext('2d');
        
        // Générer la texture pixel par pixel
        const imageData = ctx.createImageData(this.textureSize, this.textureSize);
        const data = imageData.data;
        
        // Calculer la couleur de base selon la fertilité
        const baseColor = this.calculateBaseColor(fertility);
        
        // Générer le bruit pour la variation
        const noise = this.generateNoise(this.textureSize, this.textureSize, variation);
        
        for (let y = 0; y < this.textureSize; y++) {
            for (let x = 0; x < this.textureSize; x++) {
                const index = (y * this.textureSize + x) * 4;
                
                // Couleur de base avec variation de bruit
                const noiseValue = noise[y][x];
                let r = Math.max(0, Math.min(255, baseColor[0] + noiseValue * 30));
                let g = Math.max(0, Math.min(255, baseColor[1] + noiseValue * 20));
                let b = Math.max(0, Math.min(255, baseColor[2] + noiseValue * 15));
                
                // Logique améliorée pour les pixels d'eau et pollution
                let isWaterPixel = false;
                let isPollutionPixel = false;
                
                // Logique graduée pour les pixels d'eau avec niveaux d'intensité
                const waterLevel = this.getIntensityLevel(water, this.waterLevels);
                if (this.layerVisibility.water && waterLevel && Math.random() < waterLevel.coverage) {
                    isWaterPixel = true;
                    r = waterLevel.color[0];
                    g = waterLevel.color[1];
                    b = waterLevel.color[2];
                }
                
                // Logique graduée pour les pixels de pollution - seulement si pas déjà de l'eau
                if (this.layerVisibility.pollution && !isWaterPixel) {
                    const pollutionLevel = this.getIntensityLevel(pollution, this.pollutionLevels);
                    if (pollutionLevel && Math.random() < pollutionLevel.coverage) {
                        isPollutionPixel = true;
                        r = pollutionLevel.color[0];
                        g = pollutionLevel.color[1];
                        b = pollutionLevel.color[2];
                    }
                }
                
                data[index] = r;     // R
                data[index + 1] = g; // G
                data[index + 2] = b; // B
                data[index + 3] = 255; // A
            }
        }
        
        // Appliquer l'image data au canvas
        ctx.putImageData(imageData, 0, 0);
        
        // Créer la texture WebGL
        const texture = this.createWebGLTexture(canvas);
        
        // Stocker dans le cache
        this.textureCache.set(key, texture);
        this.canvasCache.set(key, canvas);
        
        return texture;
    }
    
    // Calcule la couleur de base selon la fertilité (0-255)
    calculateBaseColor(fertility) {
        const lightBrown = [153, 102, 51]; // RGB brun clair
        const darkSoil = [25, 13, 5];      // RGB sol sombre
        
        const factor = fertility / 100;
        return [
            lightBrown[0] + (darkSoil[0] - lightBrown[0]) * factor,
            lightBrown[1] + (darkSoil[1] - lightBrown[1]) * factor,
            lightBrown[2] + (darkSoil[2] - lightBrown[2]) * factor
        ];
    }
    
    // Génère du bruit procédural simple
    generateNoise(width, height, seed = 0) {
        const noise = [];
        Math.seedrandom = function(seed) {
            this.seed = seed;
        };
        
        for (let y = 0; y < height; y++) {
            noise[y] = [];
            for (let x = 0; x < width; x++) {
                // Bruit pseudo-aléatoire simple
                const value = (Math.sin(x * 0.1 + seed) + Math.sin(y * 0.1 + seed)) * 0.5;
                noise[y][x] = (value + (Math.random() - 0.5) * 0.5) * 0.5;
            }
        }
        
        return noise;
    }
    
    // Crée une texture WebGL depuis un canvas
    createWebGLTexture(canvas) {
        const texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        
        // Configuration de la texture
        this.gl.texImage2D(
            this.gl.TEXTURE_2D, 
            0, 
            this.gl.RGBA, 
            this.gl.RGBA, 
            this.gl.UNSIGNED_BYTE, 
            canvas
        );
        
        // Paramètres de la texture (pas de mipmapping pour les petites textures)
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        
        return texture;
    }
    
    // Obtient la texture appropriée pour une cellule de sol - VERSION SIMPLIFIÉE
    getTextureForSoil(soil) {
        const key = this.getTextureKey(
            soil.fertility, 
            soil.waterRetention, 
            soil.pollution,
            Math.abs(soil.gridX + soil.gridY) % 2 // Variation basée sur position
        );
        
        let texture = this.textureCache.get(key);
        if (!texture) {
            // Générer la texture à la demande si pas en cache
            texture = this.generateSoilTexture(
                soil.fertility, 
                soil.waterRetention, 
                soil.pollution,
                Math.abs(soil.gridX + soil.gridY) % 2
            );
        }
        
        return texture;
    }
    
    // Nettoyage des ressources
    cleanup() {
        // Nettoyer les textures WebGL
        for (const texture of this.textureCache.values()) {
            this.gl.deleteTexture(texture);
        }
        
        this.textureCache.clear();
        this.canvasCache.clear();
    }
    
    // Getters pour debug
    getTextureCount() {
        return this.textureCache.size;
    }
    
    getCachedTextureKeys() {
        return Array.from(this.textureCache.keys());
    }
    
    // Obtient le niveau d'intensité correspondant à une valeur donnée
    getIntensityLevel(value, levels) {
        // Parcourir les niveaux du plus élevé au plus bas pour trouver le bon seuil
        for (let i = levels.length - 1; i >= 0; i--) {
            if (value >= levels[i].threshold) {
                return levels[i];
            }
        }
        return null;
    }
    
    // Méthode utilitaire pour obtenir des statistiques sur les niveaux d'intensité
    getIntensityStats(value, levels, type) {
        const level = this.getIntensityLevel(value, levels);
        if (!level) return { level: 0, coverage: 0, color: 'none' };
        
        const levelIndex = levels.findIndex(l => l.threshold === level.threshold) + 1;
        return {
            level: levelIndex,
            threshold: level.threshold,
            coverage: Math.round(level.coverage * 100),
            color: `rgb(${level.color.join(',')})`,
            type: type
        };
    }

    // Gestion de la visibilité des calques - VERSION AVEC DEBOUNCE
    setLayerVisibility(layerType, isVisible) {
        if (this.layerVisibility[layerType] !== isVisible) {
            this.layerVisibility[layerType] = isVisible;
            
            // Annuler le précédent timeout s'il existe
            if (this.textureUpdateDebounce) {
                clearTimeout(this.textureUpdateDebounce);
            }
            
            // Programmer une seule régénération après 50ms de calme
            this.textureUpdateDebounce = setTimeout(() => {
                this.debouncedTextureUpdate();
                this.textureUpdateDebounce = null;
            }, 50);
            
            console.log(`🎨 Calque ${layerType} ${isVisible ? 'activé' : 'désactivé'} - Programmé pour mise à jour`);
        }
    }

    // Mise à jour des textures avec debounce
    debouncedTextureUpdate() {
        const startTime = performance.now();
        
        // Nettoyer le cache existant une seule fois
        for (const texture of this.textureCache.values()) {
            this.gl.deleteTexture(texture);
        }
        this.textureCache.clear();
        this.canvasCache.clear();
        
        const endTime = performance.now();
        console.log(`⚡ Cache de textures vidé en ${(endTime - startTime).toFixed(2)}ms - Les nouvelles textures seront générées à la demande`);
    }

    // Nettoie juste le cache sans régénérer tout de suite
    clearTextureCache() {
        // Nettoyer les textures WebGL
        for (const texture of this.textureCache.values()) {
            this.gl.deleteTexture(texture);
        }
        this.textureCache.clear();
        this.canvasCache.clear();
    }

    // Régénération de toutes les textures (utilisée lors du toggle des calques)
    regenerateAllTextures() {
        const startTime = performance.now();
        let texturesRegenerated = 0;

        // Nettoyer le cache existant
        for (const texture of this.textureCache.values()) {
            this.gl.deleteTexture(texture);
        }
        this.textureCache.clear();
        this.canvasCache.clear();

        // Régénérer toutes les textures avec les nouveaux paramètres de calques
        for (let fertility = 0; fertility <= 100; fertility += 25) {
            for (let water = 0; water <= 100; water += 50) {
                for (let pollution = 0; pollution <= 100; pollution += 50) {
                    for (let variation = 0; variation < 2; variation++) {
                        this.generateSoilTexture(fertility, water, pollution, variation);
                        texturesRegenerated++;
                    }
                }
            }
        }

        const endTime = performance.now();
        console.log(`⚡ ${texturesRegenerated} textures régénérées en ${(endTime - startTime).toFixed(2)}ms`);
    }

    // Méthode pour obtenir l'état actuel des calques
    getLayerStates() {
        return { ...this.layerVisibility };
    }
}