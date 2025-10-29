/**
 * TreeTextureGenerator - Générateur de textures d'arbres modulaire
 * 
 * Ce module génère les textures des arbres de manière procédurale
 * en utilisant la configuration des espèces. Support de la transparence
 * et positionnement flexible sur les cellules de sol.
 */

class TreeTextureGenerator {
    constructor(gl) {
        this.gl = gl;
        this.textureCache = new Map();
    }
    
    // Génère ou récupère la texture pour une espèce donnée avec maturité
    generateTexture(species, variation = 0, maturity = 1.0) {
        // Discrétiser la maturité en étapes pour limiter le cache
        const maturityStep = Math.floor(maturity * 10) / 10; // Étapes de 0.1
        const cacheKey = `${species}_${variation}_${maturityStep}`;
        
        if (this.textureCache.has(cacheKey)) {
            return this.textureCache.get(cacheKey);
        }
        
        const config = TreeSpeciesConfig.getSpecies(species);
        if (!config) {
            console.warn(`Espèce inconnue: ${species}`);
            return null;
        }
        
        const texture = this.createTreeTexture(config, variation, maturity);
        this.textureCache.set(cacheKey, texture);
        return texture;
    }
    
    // Crée la texture d'un arbre selon sa configuration et maturité
    createTreeTexture(config, variation, maturity) {
        // Taille beaucoup plus grande pour les arbres géants
        const textureSize = 64; // Doublé de 32 à 64
        const canvas = document.createElement('canvas');
        canvas.width = textureSize;
        canvas.height = textureSize;
        const ctx = canvas.getContext('2d');
        
        // Générer la texture pixel par pixel avec transparence
        const imageData = ctx.createImageData(textureSize, textureSize);
        const data = imageData.data;
        
        this.generateTreePixels(data, textureSize, config, variation, maturity);
        
        // Appliquer au canvas
        ctx.putImageData(imageData, 0, 0);
        
        // Créer la texture WebGL avec transparence
        return this.createWebGLTexture(canvas);
    }
    
    // Génère les pixels de l'arbre selon la forme et la maturité
    generateTreePixels(data, size, config, variation, maturity) {
        const centerX = size / 2;
        const centerY = size * 0.9; // Base de l'arbre plus bas pour éviter le cut-off
        
        // Générateur de bruit déterministe basé sur la variation
        const noise = this.createNoiseGenerator(variation);
        
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const index = (y * size + x) * 4;
                let pixel = { r: 0, g: 0, b: 0, a: 0 }; // Transparent par défaut
                
                // Générer selon l'espèce spécifique avec ses caractéristiques
                switch (config.visual.shape) {
                    case 'round': // Chêne
                        pixel = this.generateChenePixel(x, y, centerX, centerY, size, config, variation, noise, maturity);
                        break;
                    case 'cone': // Pin
                        pixel = this.generatePinPixel(x, y, centerX, centerY, size, config, variation, noise, maturity);
                        break;
                    case 'oval': // Châtaignier
                        pixel = this.generateChataignierPixel(x, y, centerX, centerY, size, config, variation, noise, maturity);
                        break;
                }
                
                data[index] = pixel.r;
                data[index + 1] = pixel.g;
                data[index + 2] = pixel.b;
                data[index + 3] = pixel.a;
            }
        }
    }
    
    // Générateur de bruit déterministe
    createNoiseGenerator(seed) {
        return {
            get: (x, y, scale = 1) => {
                // Bruit de Perlin simplifié basé sur la position et le seed
                const nx = x * scale + seed * 1234.5;
                const ny = y * scale + seed * 5678.9;
                const noise1 = Math.sin(nx * 0.1) * Math.cos(ny * 0.1);
                const noise2 = Math.sin(nx * 0.05) * Math.cos(ny * 0.05);
                const noise3 = Math.sin(nx * 0.2) * Math.cos(ny * 0.2);
                return (noise1 + noise2 * 0.5 + noise3 * 0.25) / 1.75;
            }
        };
    }
    
    // Génère un arbre rond (chêne) avec croissance basée sur la maturité - VERSION AMÉLIORÉE
    generateChenePixel(x, y, centerX, centerY, size, config, variation, noise, maturity) {
        const visual = config.visual;
        
        // Facteur de taille basé sur la maturité (croissance non-linéaire)
        const growthFactor = Math.pow(maturity, 0.7);
        
        // Tronc avec taille adaptée à la maturité et courbure sinusoïdale
        const baseTrunkWidth = size * visual.trunkWidth;
        const baseTrunkHeight = size * visual.trunkHeight;
        
        // Le tronc grandit progressivement
        const trunkWidth = baseTrunkWidth * (0.3 + growthFactor * 0.7);
        const trunkHeight = baseTrunkHeight * (0.4 + growthFactor * 0.6);
        const trunkTop = centerY - trunkHeight;
        
        // Courbure sinusoïdale du tronc pour un aspect plus naturel
        const trunkYProgress = (y - trunkTop) / trunkHeight;
        const trunkCurve = Math.sin(trunkYProgress * Math.PI * 1.5 + variation) * 3;
        const trunkSway = Math.sin(variation * 2.3) * 2;
        const adjustedCenterX = centerX + trunkCurve + trunkSway;
        
        // Forme irrégulière du tronc avec variation sur les côtés
        const trunkWidthVariation = noise.get(y, variation, 0.4) * (trunkWidth * 0.3);
        const currentTrunkWidth = trunkWidth + trunkWidthVariation;
        
        // NOUVEAU ORDRE : D'abord vérifier les feuilles et branches (priorité)
        if (maturity > 0.2) {
            const numClusters = Math.floor(3 + maturity * 2);
            
            // Générer les centres des groupements
            const clusters = [];
            for (let i = 0; i < numClusters; i++) {
                const angle = (i / numClusters) * Math.PI * 2 + variation;
                const distance = (6 + noise.get(i * 100, variation, 0.3) * 8) * growthFactor;
                const clusterCenterX = centerX + Math.cos(angle) * distance;
                const clusterCenterY = centerY - trunkHeight - 4 + Math.sin(angle) * distance * 0.3;
                const clusterRadius = (8 + noise.get(i * 200, variation, 0.2) * 8) * growthFactor;
                
                clusters.push({
                    x: clusterCenterX,
                    y: clusterCenterY,
                    radius: clusterRadius,
                    angle: angle,
                    distance: distance,
                    depth: i
                });
            }
            
            // Vérifier d'abord si le pixel est dans un groupement de feuilles
            let inCluster = false;
            let clusterColor = null;
            let maxDepth = -1;
            
            clusters.forEach((cluster, index) => {
                const distance = Math.sqrt(
                    Math.pow(x - cluster.x, 2) + Math.pow(y - cluster.y, 2)
                );
                
                if (distance <= cluster.radius) {
                    inCluster = true;
                    
                    const depthFactor = cluster.depth / numClusters;
                    const distanceFactor = distance / cluster.radius;
                    
                    const baseAlpha = 180 - depthFactor * 60 - distanceFactor * 40;
                    const alpha = Math.max(80, Math.min(220, baseAlpha));
                    
                    const darkening = depthFactor * 40 + distanceFactor * 20;
                    const youthGreen = (1 - maturity) * 20;
                    const clusterVariation = noise.get(index * 300, variation, 0.4) * 15;
                    
                    if (cluster.depth > maxDepth) {
                        maxDepth = cluster.depth;
                        clusterColor = {
                            r: Math.max(0, Math.min(255, visual.foliageColor[0] + clusterVariation - darkening)),
                            g: Math.max(0, Math.min(255, visual.foliageColor[1] + clusterVariation - darkening * 0.7 + youthGreen)),
                            b: Math.max(0, Math.min(255, visual.foliageColor[2] + clusterVariation - darkening)),
                            a: alpha
                        };
                    }
                }
            });
            
            // Si on est dans un groupement de feuilles, le retourner (priorité absolue)
            if (inCluster && clusterColor) {
                return clusterColor;
            }
            
            // Sinon, vérifier les branches
            for (const cluster of clusters) {
                const branchStartX = centerX;
                const branchStartY = centerY - trunkHeight;
                const branchEndX = cluster.x;
                const branchEndY = cluster.y;
                
                const branchDistance = this.distanceToLine(x, y, branchStartX, branchStartY, branchEndX, branchEndY);
                const branchThickness = 1.5 * growthFactor;
                
                if (branchDistance <= branchThickness) {
                    const branchColor = this.mixColors(visual.trunkColor, visual.foliageColor, 0.3);
                    return {
                        r: branchColor[0],
                        g: branchColor[1],
                        b: branchColor[2],
                        a: 255
                    };
                }
            }
        }
        
        // ENFIN, vérifier le tronc (rendu seulement si pas de feuilles/branches)
        if (y >= trunkTop && y <= centerY && Math.abs(x - adjustedCenterX) <= currentTrunkWidth / 2) {
            const barkComplexity = 0.5 + maturity * 0.5;
            const verticalPattern = Math.sin(x * 0.8 + variation) * 0.3 * barkComplexity;
            const barkNoise = noise.get(x, y, 0.6) * (15 + 10 * barkComplexity) + verticalPattern * 15;
            const shadowEffect = Math.abs(x - adjustedCenterX) / (currentTrunkWidth / 2) * 25;
            const youthFactor = (1 - maturity) * 15;
            
            return {
                r: Math.max(0, Math.min(255, visual.trunkColor[0] + barkNoise - shadowEffect + youthFactor)),
                g: Math.max(0, Math.min(255, visual.trunkColor[1] + barkNoise - shadowEffect + youthFactor)),
                b: Math.max(0, Math.min(255, visual.trunkColor[2] + barkNoise - shadowEffect + youthFactor)),
                a: 255
            };
        }
        
        return { r: 0, g: 0, b: 0, a: 0 }; // Transparent
    }
    
    // Génère un pin avec forme triangulaire et tronc droit
    generatePinPixel(x, y, centerX, centerY, size, config, variation, noise, maturity) {
        const visual = config.visual;
        const growthFactor = Math.pow(maturity, 0.7);
        
        // Ajustement spécial pour le pin : position plus basse pour éviter le cut-off
        const pinCenterY = size * 0.95; // Encore plus bas que les autres arbres
        
        // Tronc très droit avec amplitude minimale
        const baseTrunkWidth = size * visual.trunkWidth;
        const baseTrunkHeight = size * visual.trunkHeight;
        const trunkWidth = baseTrunkWidth * (0.3 + growthFactor * 0.7);
        const trunkHeight = baseTrunkHeight * (0.3 + growthFactor * 0.5); // Tronc proportionnellement plus court
        const trunkTop = pinCenterY - trunkHeight;
        
        // Courbure très légère (pin = tronc droit)
        const trunkYProgress = (y - trunkTop) / trunkHeight;
        const trunkCurve = Math.sin(trunkYProgress * Math.PI * 0.5 + variation) * (visual.swayAmplitude || 1) * 0.5;
        const adjustedCenterX = centerX + trunkCurve;
        
        // Écorce rugueuse avec texture d'écailles
        const trunkWidthVariation = noise.get(y, variation, 0.5) * (trunkWidth * 0.2);
        const currentTrunkWidth = trunkWidth + trunkWidthVariation;
        
        // Feuillage triangulaire unique pour le pin - PRIORITÉ 1
        if (maturity > 0.2) {
            const triangleHeight = size * visual.size.height * growthFactor * 0.7; // Réduit la hauteur totale
            const triangleWidth = size * visual.size.width * growthFactor;
            const triangleTop = pinCenterY - trunkHeight - triangleHeight;
            const triangleBottom = pinCenterY - trunkHeight;
            
            if (y >= triangleTop && y <= triangleBottom) {
                const relativeY = (y - triangleTop) / (triangleBottom - triangleTop);
                
                // Largeur du triangle à cette hauteur
                const currentWidth = triangleWidth * relativeY * 0.5;
                
                // Bords irréguliers avec variation
                const edgeVariation = noise.get(y * 0.3, variation, 0.4) * (currentWidth * 0.3);
                const leftEdge = centerX - currentWidth - edgeVariation;
                const rightEdge = centerX + currentWidth + edgeVariation;
                
                if (x >= leftEdge && x <= rightEdge) {
                    // Texture d'aiguilles dense
                    const needleNoise = noise.get(x * 0.8, y * 0.8, 0.6);
                    const isNeedle = needleNoise > -0.2; // Densité élevée
                    
                    if (isNeedle) {
                        // Couleur sombre des aiguilles avec variation
                        const distanceFromCenter = Math.abs(x - centerX) / currentWidth;
                        const depthShading = distanceFromCenter * 20;
                        const needleVariation = needleNoise * 10;
                        
                        return {
                            r: Math.max(0, Math.min(255, visual.foliageColor[0] + needleVariation - depthShading)),
                            g: Math.max(0, Math.min(255, visual.foliageColor[1] + needleVariation - depthShading)),
                            b: Math.max(0, Math.min(255, visual.foliageColor[2] + needleVariation - depthShading)),
                            a: 200 - distanceFromCenter * 40 // Transparence vers les bords
                        };
                    }
                }
            }
        }
        
        // Tronc en PRIORITÉ 2 (après les aiguilles)
        if (y >= trunkTop && y <= pinCenterY && Math.abs(x - adjustedCenterX) <= currentTrunkWidth / 2) {
            // Texture d'écorce sombre avec écailles horizontales
            const scalePattern = Math.sin(y * 0.5) * 8; // Écailles horizontales
            const darkBark = noise.get(x, y, 0.7) * 15 + scalePattern;
            const shadowEffect = Math.abs(x - adjustedCenterX) / (currentTrunkWidth / 2) * 20;
            
            return {
                r: Math.max(0, Math.min(255, visual.trunkColor[0] + darkBark - shadowEffect)),
                g: Math.max(0, Math.min(255, visual.trunkColor[1] + darkBark - shadowEffect)),
                b: Math.max(0, Math.min(255, visual.trunkColor[2] + darkBark - shadowEffect)),
                a: 255
            };
        }
        
        return { r: 0, g: 0, b: 0, a: 0 }; // Transparent
    }
    
    // Génère un châtaignier avec groupements ovales et courbure prononcée
    generateChataignierPixel(x, y, centerX, centerY, size, config, variation, noise, maturity) {
        const visual = config.visual;
        const growthFactor = Math.pow(maturity, 0.7);
        
        // Tronc avec courbure prononcée
        const baseTrunkWidth = size * visual.trunkWidth;
        const baseTrunkHeight = size * visual.trunkHeight;
        const trunkWidth = baseTrunkWidth * (0.3 + growthFactor * 0.7);
        const trunkHeight = baseTrunkHeight * (0.4 + growthFactor * 0.6);
        const trunkTop = centerY - trunkHeight;
        
        // Courbure sinusoïdale prononcée
        const trunkYProgress = (y - trunkTop) / trunkHeight;
        const trunkCurve = Math.sin(trunkYProgress * Math.PI * 1.2 + variation) * (visual.swayAmplitude || 4);
        const trunkSway = Math.sin(variation * 1.8) * 3;
        const adjustedCenterX = centerX + trunkCurve + trunkSway;
        
        // Écorce lisse et claire
        const trunkWidthVariation = noise.get(y, variation, 0.3) * (trunkWidth * 0.25);
        const currentTrunkWidth = trunkWidth + trunkWidthVariation;
        
        // PRIORITÉ 1 : Système de groupements ovales pour le châtaignier
        if (maturity > 0.2) {
            const minClusters = visual.clusterCount?.min || 3;
            const maxClusters = visual.clusterCount?.max || 4;
            const numClusters = Math.floor(minClusters + maturity * (maxClusters - minClusters));
            
            // Générer les groupements ovales PLUS PROCHES du tronc
            const clusters = [];
            for (let i = 0; i < numClusters; i++) {
                const angle = (i / numClusters) * Math.PI * 2 + variation * 0.5;
                const distance = (4 + noise.get(i * 150, variation, 0.3) * 6) * growthFactor; // Distance réduite
                const clusterCenterX = centerX + Math.cos(angle) * distance;
                const clusterCenterY = centerY - trunkHeight - 2 + Math.sin(angle) * distance * 0.4; // Plus proche
                
                // Groupements ovales plus grands
                const radiusX = (10 + noise.get(i * 250, variation, 0.2) * 8) * growthFactor; // Encore plus grands
                const radiusY = radiusX * 0.7; // Ovale horizontal
                
                clusters.push({
                    x: clusterCenterX,
                    y: clusterCenterY,
                    radiusX: radiusX,
                    radiusY: radiusY,
                    depth: i,
                    angle: angle,
                    distance: distance
                });
            }
            
            // Vérifier d'abord si le pixel est dans un groupement de feuilles
            let inCluster = false;
            let clusterColor = null;
            let maxDepth = -1;
            
            clusters.forEach((cluster, index) => {
                const distanceX = (x - cluster.x) / cluster.radiusX;
                const distanceY = (y - cluster.y) / cluster.radiusY;
                const ellipseDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
                
                if (ellipseDistance <= 1) {
                    inCluster = true;
                    
                    // Transparence et profondeur
                    const depthFactor = cluster.depth / numClusters;
                    const distanceFactor = ellipseDistance;
                    
                    const baseAlpha = 190 - depthFactor * 50 - distanceFactor * 60;
                    const alpha = Math.max(100, Math.min(230, baseAlpha));
                    
                    // Couleur verte claire du châtaignier
                    const darkening = depthFactor * 30 + distanceFactor * 25;
                    const brightening = (1 - maturity) * 25; // Plus lumineux quand jeune
                    const clusterVariation = noise.get(index * 400, variation, 0.3) * 20;
                    
                    if (cluster.depth > maxDepth) {
                        maxDepth = cluster.depth;
                        clusterColor = {
                            r: Math.max(0, Math.min(255, visual.foliageColor[0] + clusterVariation - darkening + brightening * 0.3)),
                            g: Math.max(0, Math.min(255, visual.foliageColor[1] + clusterVariation - darkening * 0.6 + brightening)),
                            b: Math.max(0, Math.min(255, visual.foliageColor[2] + clusterVariation - darkening + brightening * 0.5)),
                            a: alpha
                        };
                    }
                }
            });
            
            // Si on est dans un groupement de feuilles, le retourner (priorité absolue)
            if (inCluster && clusterColor) {
                return clusterColor;
            }
            
            // PRIORITÉ 2 : Vérifier les branches connectant les groupements au tronc
            for (const cluster of clusters) {
                const branchStartX = adjustedCenterX; // Partir du centre du tronc
                const branchStartY = centerY - trunkHeight;
                const branchEndX = cluster.x;
                const branchEndY = cluster.y;
                
                const branchDistance = this.distanceToLine(x, y, branchStartX, branchStartY, branchEndX, branchEndY);
                const branchThickness = 1.0 * growthFactor; // Branches fines pour le châtaignier
                
                if (branchDistance <= branchThickness) {
                    const branchColor = this.mixColors(visual.trunkColor, visual.foliageColor, 0.4);
                    return {
                        r: branchColor[0],
                        g: branchColor[1],
                        b: branchColor[2],
                        a: 255
                    };
                }
            }
        }
        
        // PRIORITÉ 3 : Tronc (rendu seulement si pas de feuilles/branches)
        if (y >= trunkTop && y <= centerY && Math.abs(x - adjustedCenterX) <= currentTrunkWidth / 2) {
            // Texture d'écorce lisse et claire
            const smoothBark = noise.get(x, y, 0.4) * 12;
            const verticalLines = Math.sin(x * 1.5) * 6; // Lignes verticales subtiles
            const shadowEffect = Math.abs(x - adjustedCenterX) / (currentTrunkWidth / 2) * 15;
            
            return {
                r: Math.max(0, Math.min(255, visual.trunkColor[0] + smoothBark + verticalLines - shadowEffect)),
                g: Math.max(0, Math.min(255, visual.trunkColor[1] + smoothBark + verticalLines - shadowEffect)),
                b: Math.max(0, Math.min(255, visual.trunkColor[2] + smoothBark + verticalLines - shadowEffect)),
                a: 255
            };
        }
        
        return { r: 0, g: 0, b: 0, a: 0 }; // Transparent
    }
    
    // Utilitaire pour calculer la distance d'un point à une ligne
    distanceToLine(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) {
            // La ligne est un point
            return Math.sqrt(A * A + B * B);
        }
        
        let param = dot / lenSq;
        
        let xx, yy;
        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }
        
        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // Utilitaire pour mélanger deux couleurs
    mixColors(color1, color2, ratio) {
        return [
            Math.round(color1[0] * (1 - ratio) + color2[0] * ratio),
            Math.round(color1[1] * (1 - ratio) + color2[1] * ratio),
            Math.round(color1[2] * (1 - ratio) + color2[2] * ratio)
        ];
    }
    
    // Crée une texture WebGL avec support de transparence
    createWebGLTexture(canvas) {
        const texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        
        // Configuration pour transparence
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, canvas);
        
        // Paramètres pour pixel art net
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        
        return texture;
    }
    
    // Nettoyage
    cleanup() {
        for (const texture of this.textureCache.values()) {
            this.gl.deleteTexture(texture);
        }
        this.textureCache.clear();
    }
}