/**
 * ProceduralGenerator - Générateur procédural pour cartes cohérentes
 * 
 * Ce module fournit des outils de génération procédurale pour créer des cartes
 * 2D avec cohérence spatiale. Il utilise des hotspots, des dégradés exponentiels
 * et du lissage pour produire des terrains réalistes.
 * 
 * Fonctionnalités principales :
 * - Génération de hotspots avec influence radiale
 * - Dégradés exponentiels et lissage spatial
 * - Configuration flexible par type de propriété
 * - Algorithmes de bruit et variation locale
 */

class ProceduralGenerator {
    constructor(config = {}) {
        // Configuration par défaut
        this.defaultConfig = {
            fertility: {
                hotspots: 8,
                baseValue: 30,
                maxIntensity: 85,
                falloffRate: 0.15,
                noiseIntensity: 10,
                radiusMin: 8,
                radiusMax: 20
            },
            water: {
                hotspots: 5,
                baseValue: 20,
                maxIntensity: 90,
                falloffRate: 0.12,
                noiseIntensity: 8,
                radiusMin: 6,
                radiusMax: 18
            },
            pollution: {
                hotspots: 3,
                baseValue: 5,
                maxIntensity: 80,
                falloffRate: 0.08,
                noiseIntensity: 5,
                radiusMin: 10,
                radiusMax: 25
            }
        };
        
        // Fusionner avec la configuration fournie
        this.config = this.mergeConfig(this.defaultConfig, config);
        
        console.log('🔧 ProceduralGenerator initialisé avec configuration:', this.config);
    }
    
    // Fusionne les configurations
    mergeConfig(defaultConfig, userConfig) {
        const result = JSON.parse(JSON.stringify(defaultConfig));
        
        Object.keys(userConfig).forEach(type => {
            if (result[type]) {
                Object.assign(result[type], userConfig[type]);
            } else {
                result[type] = userConfig[type];
            }
        });
        
        return result;
    }
    
    // Génère une carte 2D avec cohérence spatiale
    generateCoherentMap(width, height, type, customConfig = null) {
        const config = customConfig || this.config[type];
        
        if (!config) {
            console.warn(`Configuration manquante pour le type: ${type}`);
            return this.generateUniformMap(width, height, 50);
        }
        
        console.log(`🗺️ Génération de carte ${type} (${width}x${height})`);
        
        const map = this.initializeMap(width, height);
        const hotspots = this.generateHotspots(width, height, config);
        
        this.applyHotspotsInfluence(map, hotspots, config);
        this.addLocalNoise(map, config.noiseIntensity);
        this.clampMapValues(map);
        
        return this.smoothMap(map);
    }
    
    // Initialise une carte vide
    initializeMap(width, height) {
        const map = [];
        for (let y = 0; y < height; y++) {
            map[y] = new Array(width).fill(0);
        }
        return map;
    }
    
    // Génère une carte uniforme (fallback)
    generateUniformMap(width, height, value) {
        const map = [];
        for (let y = 0; y < height; y++) {
            map[y] = new Array(width).fill(value);
        }
        return map;
    }
    
    // Génère des hotspots selon la configuration
    generateHotspots(width, height, config) {
        const hotspots = [];
        
        for (let i = 0; i < config.hotspots; i++) {
            const hotspot = {
                x: Math.random() * width,
                y: Math.random() * height,
                intensity: config.baseValue + Math.random() * (config.maxIntensity - config.baseValue),
                radius: config.radiusMin + Math.random() * (config.radiusMax - config.radiusMin)
            };
            
            hotspots.push(hotspot);
        }
        
        console.log(`  📍 ${hotspots.length} hotspots générés`);
        return hotspots;
    }
    
    // Applique l'influence des hotspots avec dégradé exponentiel
    applyHotspotsInfluence(map, hotspots, config) {
        const height = map.length;
        const width = map[0].length;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let totalInfluence = config.baseValue;
                
                hotspots.forEach(hotspot => {
                    const distance = Math.sqrt(
                        Math.pow(x - hotspot.x, 2) + 
                        Math.pow(y - hotspot.y, 2)
                    );
                    
                    if (distance < hotspot.radius) {
                        const influence = hotspot.intensity * Math.exp(-distance * config.falloffRate);
                        totalInfluence += influence;
                    }
                });
                
                map[y][x] = totalInfluence;
            }
        }
    }
    
    // Ajoute du bruit local pour la variation
    addLocalNoise(map, noiseIntensity) {
        const height = map.length;
        const width = map[0].length;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const noise = (Math.random() - 0.5) * noiseIntensity;
                map[y][x] += noise;
            }
        }
    }
    
    // Clamp les valeurs entre 0 et 100
    clampMapValues(map) {
        const height = map.length;
        const width = map[0].length;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                map[y][x] = Math.max(0, Math.min(100, map[y][x]));
            }
        }
    }
    
    // Lisse la carte avec un filtre 3x3
    smoothMap(map, iterations = 1) {
        let currentMap = map;
        
        for (let iter = 0; iter < iterations; iter++) {
            currentMap = this.applySmoothingFilter(currentMap);
        }
        
        return currentMap;
    }
    
    // Applique un filtre de lissage 3x3
    applySmoothingFilter(map) {
        const height = map.length;
        const width = map[0].length;
        const smoothed = [];
        
        for (let y = 0; y < height; y++) {
            smoothed[y] = [];
            for (let x = 0; x < width; x++) {
                let sum = 0;
                let count = 0;
                
                // Filtre 3x3
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            sum += map[ny][nx];
                            count++;
                        }
                    }
                }
                
                smoothed[y][x] = sum / count;
            }
        }
        
        return smoothed;
    }
    
    // Génère du bruit Perlin simplifié (pour usage futur)
    generatePerlinNoise(width, height, frequency = 0.1, amplitude = 1.0) {
        const noise = [];
        
        for (let y = 0; y < height; y++) {
            noise[y] = [];
            for (let x = 0; x < width; x++) {
                // Bruit pseudo-Perlin simplifié
                const value = Math.sin(x * frequency) * Math.cos(y * frequency) * amplitude;
                noise[y][x] = (value + 1) * 0.5 * 100; // Normaliser entre 0-100
            }
        }
        
        return noise;
    }
    
    // Met à jour la configuration d'un type
    updateConfig(type, newConfig) {
        if (this.config[type]) {
            Object.assign(this.config[type], newConfig);
            console.log(`🔄 Configuration ${type} mise à jour:`, this.config[type]);
        } else {
            console.warn(`Type ${type} non trouvé dans la configuration`);
        }
    }
    
    // Obtient la configuration actuelle
    getConfig(type = null) {
        return type ? this.config[type] : this.config;
    }
    
    // Statistiques sur une carte générée
    getMapStats(map) {
        const height = map.length;
        const width = map[0].length;
        let min = Infinity;
        let max = -Infinity;
        let sum = 0;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const value = map[y][x];
                min = Math.min(min, value);
                max = Math.max(max, value);
                sum += value;
            }
        }
        
        const average = sum / (width * height);
        
        return {
            width,
            height,
            min: min.toFixed(2),
            max: max.toFixed(2),
            average: average.toFixed(2),
            totalCells: width * height
        };
    }
}