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
    constructor(config = {}, seed = null) {
        // Seed for deterministic generation
        this.seed = seed || this.generateRandomSeed();
        this.initializePRNG(this.seed);
        
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
    }
    
    /**
     * Generate a random seed based on timestamp
     * @returns {number} Random seed (uint32)
     */
    generateRandomSeed() {
        return Date.now() % 4294967296;
    }
    
    /**
     * Initialize Mulberry32 PRNG with seed
     * @param {number} seed - Seed value (uint32)
     */
    initializePRNG(seed) {
        this.prngState = seed >>> 0; // Ensure uint32
    }
    
    /**
     * Set new seed and reinitialize PRNG
     * @param {number} seed - New seed value
     */
    setSeed(seed) {
        this.seed = seed;
        this.initializePRNG(seed);
    }
    
    /**
     * Get current seed
     * @returns {number} Current seed value
     */
    getSeed() {
        return this.seed;
    }
    
    /**
     * Mulberry32 PRNG - Fast, good distribution, deterministic
     * @returns {number} Random value between 0 and 1
     */
    random() {
        let t = this.prngState += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
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
            console.warn(`[CONFIG] Missing configuration for type: ${type}`);
            return this.generateUniformMap(width, height, 50);
        }
        
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
                x: this.random() * width,
                y: this.random() * height,
                intensity: config.baseValue + this.random() * (config.maxIntensity - config.baseValue),
                radius: config.radiusMin + this.random() * (config.radiusMax - config.radiusMin)
            };
            
            hotspots.push(hotspot);
        }
        
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
                const noise = (this.random() - 0.5) * noiseIntensity;
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
        } else {
            console.warn(`[CONFIG] Type ${type} not found in configuration`);
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
    
    /**
     * River Generation System (Milestone 3)
     */
    
    /**
     * Generate rivers across the map
     * @param {number} width - Map width
     * @param {number} height - Map height
     * @param {Object} config - River configuration
     * @returns {Array} Array of river arrays, each containing {x, y, depth} cells
     */
    generateRivers(width, height, config) {
        const rivers = [];
        const riverCount = config.count || 2;
        
        for (let i = 0; i < riverCount; i++) {
            const river = this.generateSingleRiver(width, height, config);
            rivers.push(river);
        }
        
        return rivers;
    }
    
    /**
     * Generate a single river
     * @param {number} width - Map width
     * @param {number} height - Map height
     * @param {Object} config - River configuration
     * @returns {Array} Array of {x, y, depth} cells
     */
    generateSingleRiver(width, height, config) {
        // Pick random start edge (0=top, 1=right, 2=bottom, 3=left)
        const startEdge = Math.floor(this.random() * 4);
        
        // Pick start position on that edge
        const startPos = this.getEdgePosition(startEdge, width, height);
        
        // Pick target edge (prefer opposite or adjacent)
        const targetEdge = this.pickTargetEdge(startEdge);
        
        // Pick target position on target edge
        const targetPos = this.getEdgePosition(targetEdge, width, height);
        
        // Generate river path
        const windiness = config.windiness || 0.3;
        const steps = Math.max(width, height); // One point per cell distance
        const path = this.generateRiverPath(
            startPos.x, startPos.y,
            targetPos.x, targetPos.y,
            windiness, steps
        );
        
        // Expand path to river with width
        const widthMin = config.widthMin || 2;
        const widthMax = config.widthMax || 4;
        const depthRange = config.depthRange || [30, 50];
        
        const riverCells = this.expandPathToRiver(path, widthMin, widthMax, depthRange);
        
        return riverCells;
    }
    
    /**
     * Get a position on a map edge
     * @param {number} edge - Edge index (0=top, 1=right, 2=bottom, 3=left)
     * @param {number} width - Map width
     * @param {number} height - Map height
     * @returns {Object} {x, y} position
     */
    getEdgePosition(edge, width, height) {
        const margin = 5; // Keep away from corners
        
        switch (edge) {
            case 0: // Top
                return {
                    x: margin + this.random() * (width - 2 * margin),
                    y: 0
                };
            case 1: // Right
                return {
                    x: width - 1,
                    y: margin + this.random() * (height - 2 * margin)
                };
            case 2: // Bottom
                return {
                    x: margin + this.random() * (width - 2 * margin),
                    y: height - 1
                };
            case 3: // Left
                return {
                    x: 0,
                    y: margin + this.random() * (height - 2 * margin)
                };
        }
    }
    
    /**
     * Pick target edge for river (prefer opposite or adjacent)
     * @param {number} startEdge - Starting edge
     * @returns {number} Target edge
     */
    pickTargetEdge(startEdge) {
        // 60% chance of opposite edge, 40% chance of adjacent
        if (this.random() < 0.6) {
            return (startEdge + 2) % 4; // Opposite edge
        } else {
            // Adjacent edge (left or right)
            return this.random() < 0.5 ? (startEdge + 1) % 4 : (startEdge + 3) % 4;
        }
    }
    
    /**
     * Generate a meandering river path
     * @param {number} startX - Start X
     * @param {number} startY - Start Y
     * @param {number} targetX - Target X
     * @param {number} targetY - Target Y
     * @param {number} windiness - Meandering amount (0-1)
     * @param {number} steps - Number of path points
     * @returns {Array} Array of {x, y} path points
     */
    generateRiverPath(startX, startY, targetX, targetY, windiness, steps) {
        const path = [];
        const deltaX = targetX - startX;
        const deltaY = targetY - startY;
        const pathLength = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Calculate perpendicular direction for meandering
        const perpX = -deltaY / pathLength;
        const perpY = deltaX / pathLength;
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps; // Progress 0 to 1
            
            // Linear interpolation
            let x = startX + deltaX * t;
            let y = startY + deltaY * t;
            
            // Add meandering (multiple sine waves for natural look)
            const meander1 = Math.sin(t * Math.PI * 2) * windiness * pathLength * 0.2;
            const meander2 = Math.sin(t * Math.PI * 4 + 1.5) * windiness * pathLength * 0.1;
            const totalMeander = meander1 + meander2;
            
            // Apply perpendicular to flow direction
            x += totalMeander * perpX;
            y += totalMeander * perpY;
            
            path.push({
                x: Math.round(x),
                y: Math.round(y)
            });
        }
        
        return path;
    }
    
    /**
     * Expand a path into a river with width
     * @param {Array} path - Array of {x, y} points
     * @param {number} widthMin - Minimum width
     * @param {number} widthMax - Maximum width
     * @param {Array} depthRange - [min, max] depth
     * @returns {Array} Array of {x, y, depth} cells
     */
    expandPathToRiver(path, widthMin, widthMax, depthRange) {
        const riverCells = new Map(); // Use map to avoid duplicates
        const [minDepth, maxDepth] = depthRange;
        
        path.forEach((point, index) => {
            // Vary width along river (narrow at ends, wider in middle)
            const t = index / path.length;
            const widthVariation = Math.sin(t * Math.PI); // 0 at ends, 1 in middle
            const width = widthMin + (widthMax - widthMin) * widthVariation;
            const halfWidth = width / 2;
            
            // Add cells in a radius around this path point
            const radius = Math.ceil(halfWidth);
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist <= halfWidth) {
                        const cellX = point.x + dx;
                        const cellY = point.y + dy;
                        const key = `${cellX},${cellY}`;
                        
                        // Calculate depth based on distance from center
                        // Deeper in center, shallower at edges
                        const depthT = 1 - (dist / halfWidth);
                        const depth = minDepth + (maxDepth - minDepth) * depthT;
                        
                        // Keep deepest depth if cell already exists
                        if (!riverCells.has(key) || riverCells.get(key).depth < depth) {
                            riverCells.set(key, {
                                x: cellX,
                                y: cellY,
                                depth: Math.round(depth)
                            });
                        }
                    }
                }
            }
        });
        
        return Array.from(riverCells.values());
    }
    
    /**
     * Lake Generation System (Milestone 4)
     */
    
    /**
     * Generate lakes across the map
     * @param {number} width - Map width
     * @param {number} height - Map height
     * @param {Object} config - Lake configuration
     * @returns {Array} Array of lake arrays, each containing {x, y, depth} cells
     */
    generateLakes(width, height, config) {
        const lakes = [];
        const lakeCount = config.count || 3;
        const minEdgeDistance = config.minEdgeDistance || 5;
        const radiusMin = config.radiusMin || 3;
        const radiusMax = config.radiusMax || 8;
        const depthRange = config.depthRange || [60, 90];
        const irregularity = config.irregularity || 0.4;
        
        for (let i = 0; i < lakeCount; i++) {
            // Pick random center position (avoid edges)
            const centerX = minEdgeDistance + this.random() * (width - 2 * minEdgeDistance);
            const centerY = minEdgeDistance + this.random() * (height - 2 * minEdgeDistance);
            
            // Pick random radius
            const baseRadius = radiusMin + this.random() * (radiusMax - radiusMin);
            
            // Generate lake
            const lake = this.generateSingleLake(
                centerX, centerY,
                baseRadius,
                depthRange,
                irregularity
            );
            
            lakes.push(lake);
        }
        
        return lakes;
    }
    
    /**
     * Generate a single irregular lake
     * @param {number} centerX - Center X position
     * @param {number} centerY - Center Y position
     * @param {number} baseRadius - Base radius
     * @param {Array} depthRange - [min, max] depth
     * @param {number} irregularity - Shape irregularity (0-1)
     * @returns {Array} Array of {x, y, depth} cells
     */
    generateSingleLake(centerX, centerY, baseRadius, depthRange, irregularity) {
        const lakeCells = new Map(); // Use map to avoid duplicates
        const [minDepth, maxDepth] = depthRange;
        
        // Scan bounding box with margin for irregular edges
        const scanRadius = Math.ceil(baseRadius * (1 + irregularity));
        
        // Generate random phase offset for each lake's irregularity pattern
        const phaseOffset = this.random() * Math.PI * 2;
        
        for (let dx = -scanRadius; dx <= scanRadius; dx++) {
            for (let dy = -scanRadius; dy <= scanRadius; dy++) {
                const x = Math.round(centerX + dx);
                const y = Math.round(centerY + dy);
                
                // Base distance to center
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                // Add irregularity using angle-based noise
                // Multiple frequencies for more organic shape
                const angle = Math.atan2(dy, dx);
                const noise1 = Math.sin(angle * 3 + phaseOffset) * irregularity * baseRadius;
                const noise2 = Math.sin(angle * 5 + phaseOffset * 1.5) * irregularity * baseRadius * 0.5;
                const noise3 = Math.cos(angle * 7 + phaseOffset * 0.7) * irregularity * baseRadius * 0.3;
                const totalNoise = noise1 + noise2 + noise3;
                
                // Effective radius at this angle
                const effectiveRadius = baseRadius + totalNoise;
                
                // Check if inside lake
                if (dist < effectiveRadius) {
                    const key = `${x},${y}`;
                    
                    // Calculate depth (deeper in center, shallow at edges)
                    const depthRatio = 1 - (dist / effectiveRadius);
                    const depth = minDepth + (maxDepth - minDepth) * Math.pow(depthRatio, 0.7); // Power curve for smoother gradient
                    
                    lakeCells.set(key, {
                        x,
                        y,
                        depth: Math.round(depth)
                    });
                }
            }
        }
        
        return Array.from(lakeCells.values());
    }
}