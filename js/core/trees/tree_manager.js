/**
 * TreeManager - Gestionnaire centralisé du système d'arbres
 * 
 * Ce module gère la génération, le placement et le rendu des arbres sur la carte.
 * Il vérifie les exigences de sol pour chaque espèce et place les arbres selon
 * leurs probabilités de survie sur chaque cellule de sol.
 * 
 * Fonctionnalités principales :
 * - Génération d'arbres à l'initialisation de la carte
 * - Vérification des exigences de sol par espèce
 * - Rendu optimisé avec culling des arbres visibles
 * - Gestion des textures procédurales d'arbres
 */

class TreeManager {
    constructor(gl, geometryManager, soilManager, config) {
        this.gl = gl;
        this.geometryManager = geometryManager;
        this.soilManager = soilManager;
        this.config = config;
        
        // Nouveau générateur de textures modulaire
        this.textureGenerator = new TreeTextureGenerator(gl);
        
        // Paramètres d'ombre par défaut
        this.shadowParams = {
            width: 1.0,
            height: 0.6,
            length: 1.5,
            rotation: 0,
            translateX: 0,
            translateY: 0,
            opacity: 50,
            enabled: true
        };
        
        // Cache des textures d'ombre
        this.shadowTextureCache = new Map();
        
        // Collection d'arbres (Map pour un accès efficace)
        this.trees = new Map();
        
        // Cache de rendu pour optimisation
        this.visibleTrees = [];
        this.needsRefresh = true;
        
        // Compteurs pour debug
        this.totalTrees = 0;
        this.visibleTreesCount = 0;
        this.speciesCount = {
            'chene': 0,
            'pin': 0,
            'chataignier': 0
        };
        
        console.log('🌳 TreeManager initialisé avec modules modulaires');
        
        // Attendre que le sol soit prêt avant de générer les arbres - délai plus long
        setTimeout(() => {
            this.generateTrees();
        }, 500); // Augmenter le délai de 100ms à 500ms
    }
    
    // Génère les arbres sur toute la carte selon les conditions de sol
    generateTrees() {
        console.log('🌱 Génération d\'un seul arbre pour observer la croissance...');
        const startTime = performance.now();
        
        // Position centrale de la carte - CORRECTION pour coordonnées centrées
        // La grille va de -gridWidth/2 à +gridWidth/2, donc le centre est à (0,0)
        const centerX = 0; // Centre de la grille
        const centerY = 0; // Centre de la grille
        
        console.log(`📍 Tentative de placement d'un arbre en position (${centerX}, ${centerY})`);
        console.log('🔧 Configuration carte:', this.config.world.map);
        console.log('🗺️ Coordonnées de grille: de ${-this.config.world.map.gridWidth/2} à ${this.config.world.map.gridWidth/2-1}');
        
        // Récupérer le sol au centre
        const soil = this.soilManager.getSoilAt(centerX, centerY);
        console.log('🔍 Sol récupéré:', soil);
        
        if (soil) {
            console.log('🌍 Sol trouvé:', {
                gridPosition: { x: soil.gridX, y: soil.gridY },
                nitrogen: soil.nitrogen,
                phosphorus: soil.phosphorus,
                potassium: soil.potassium,
                organicMatter: soil.organicMatter,
                pollution: soil.pollution
            });
            
            // Vérifier quelles espèces peuvent pousser
            console.log('🧪 Test des espèces disponibles...');
            console.log('🧪 TreeSpeciesConfig disponible:', typeof TreeSpeciesConfig !== 'undefined');
            
            const viableSpecies = Tree.canGrowOnSoil(soil);
            console.log('🌱 Espèces viables:', viableSpecies);
            
            // Forcer la création d'un arbre même sans conditions optimales
            console.log('🚀 Création d\'un arbre avec espèce aléatoire...');
            
            // Choisir aléatoirement une des trois espèces
            const allSpecies = ['chene', 'pin', 'chataignier'];
            const randomSpecies = allSpecies[Math.floor(Math.random() * allSpecies.length)];
            
            const tree = new Tree(centerX, centerY, randomSpecies);
            tree.maturity = 0.1; // FORCER après construction
            tree.age = 0;
            tree.lastMaturityStep = undefined; // Reset du cache
            
            this.addTree(tree);
            this.speciesCount[randomSpecies]++;
            
            console.log(`✅ Arbre ${randomSpecies} créé avec maturité ${tree.maturity}`);
            console.log('🌳 Position monde:', { x: tree.worldX, y: tree.worldY });
            console.log('🌳 Position grille:', { x: tree.gridX, y: tree.gridY });
            console.log('🌳 Taille:', tree.size);
            console.log('🌳 isAlive:', tree.isAlive);
            
        } else {
            console.log('❌ Aucun sol trouvé au centre (0,0)');
            console.log('🔍 SoilManager disponible:', !!this.soilManager);
            console.log('🔍 Taille de la grille de sol:', this.soilManager.soilGrid?.size || 'inconnue');
            
            // Test de quelques coordonnées pour debug
            console.log('🧪 Test de coordonnées alternatives:');
            console.log('🧪 Sol à (-1,-1):', !!this.soilManager.getSoilAt(-1, -1));
            console.log('🧪 Sol à (0,0):', !!this.soilManager.getSoilAt(0, 0));
            console.log('🧪 Sol à (1,1):', !!this.soilManager.getSoilAt(1, 1));
        }
        
        const endTime = performance.now();
        console.log(`✅ Génération terminée en ${(endTime - startTime).toFixed(2)}ms`);
        console.log('📊 Total arbres après génération:', this.totalTrees);
        console.log('📊 Map des arbres:', this.trees.size);
        
        this.createTreeGeometry();
    }
    
    // Sélectionne une espèce selon les probabilités pondérées
    selectSpeciesByProbability(speciesProbabilities) {
        if (speciesProbabilities.length === 0) return null;
        
        // Calculer la probabilité cumulative
        let totalProb = speciesProbabilities.reduce((sum, sp) => sum + sp.probability, 0);
        let random = Math.random() * totalProb;
        
        for (const sp of speciesProbabilities) {
            random -= sp.probability;
            if (random <= 0) {
                return sp.species;
            }
        }
        
        // Fallback: retourner la première espèce
        return speciesProbabilities[0].species;
    }
    
    // Crée la géométrie pour le rendu des arbres
    createTreeGeometry() {
        // Utiliser la géométrie avec coordonnées de texture pour les arbres (64x64 maintenant)
        this.geometryManager.createQuadWithTexCoords(64, 64, false);
    }
    
    // Conversion coordonnées -> clé d'arbre
    getTreeKey(gridX, gridY) {
        return `tree_${gridX},${gridY}`;
    }
    
    // Ajouter un arbre
    addTree(tree) {
        const key = this.getTreeKey(tree.gridX, tree.gridY);
        this.trees.set(key, tree);
        this.totalTrees++;
        this.needsRefresh = true;
    }
    
    // Supprimer un arbre
    removeTree(gridX, gridY) {
        const key = this.getTreeKey(gridX, gridY);
        const tree = this.trees.get(key);
        if (tree) {
            tree.cleanup(this.gl);
            this.trees.delete(key);
            this.speciesCount[tree.species]--;
            this.totalTrees--;
            this.needsRefresh = true;
            return true;
        }
        return false;
    }
    
    // Obtenir un arbre à une position
    getTreeAt(gridX, gridY) {
        const key = this.getTreeKey(gridX, gridY);
        return this.trees.get(key);
    }
    
    // Calculer les arbres visibles selon la caméra
    updateVisibleTrees(cameraManager) {
        const bounds = cameraManager.getVisibleBounds();
        
        // Ajouter une marge pour éviter les pop-ins
        const margin = 20 * 2;
        const startX = Math.floor((bounds.left - margin) / 20);
        const endX = Math.ceil((bounds.right + margin) / 20);
        const startY = Math.floor((bounds.top - margin) / 20);
        const endY = Math.ceil((bounds.bottom + margin) / 20);
        
        this.visibleTrees = [];
        
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; x <= endY; y++) {
                const tree = this.getTreeAt(x, y);
                if (tree && tree.isAlive) {
                    this.visibleTrees.push(tree);
                }
            }
        }
        
        this.visibleTreesCount = this.visibleTrees.length;
        this.needsRefresh = false;
    }
    
    // Rendu optimisé des arbres visibles
    renderTrees(renderSystem, viewMatrix, cameraManager) {
        // Mettre à jour les arbres visibles si nécessaire
        if (this.needsRefresh) {
            this.updateVisibleTrees(cameraManager);
        }
        
        // Rendre chaque arbre visible avec son ombre
        this.visibleTrees.forEach(tree => {
            this.renderTree(tree, renderSystem, viewMatrix);
        });
    }
    
    // Rendu d'un arbre individuel avec ombre
    renderTree(tree, renderSystem, viewMatrix) {
        const data = tree.getRenderData();
        
        // Rendre l'ombre d'abord si activée
        if (this.shadowParams.enabled) {
            this.renderTreeShadow(tree, renderSystem, viewMatrix);
        }
        
        // Puis rendre l'arbre par-dessus
        const texture = tree.generateTexture(this.textureGenerator);
        if (texture) {
            renderSystem.renderTexturedRect(
                data.position.x,
                data.position.y,
                data.size,
                data.size,
                texture,
                viewMatrix
            );
        }
    }
    
    // Rendu de l'ombre d'un arbre
    renderTreeShadow(tree, renderSystem, viewMatrix) {
        const shadowTexture = this.generateShadowTexture(tree);
        if (shadowTexture) {
            const shadowData = this.calculateShadowPosition(tree);
            
            renderSystem.renderTexturedRect(
                shadowData.x,
                shadowData.y,
                shadowData.width,
                shadowData.height,
                shadowTexture,
                viewMatrix
            );
        }
    }
    
    // Génère ou récupère la texture d'ombre pour un arbre
    generateShadowTexture(tree) {
        const cacheKey = `shadow_${tree.species}_${tree.variation}_${Math.floor(tree.maturity * 10)}`;
        
        if (this.shadowTextureCache.has(cacheKey)) {
            return this.shadowTextureCache.get(cacheKey);
        }
        
        // Créer la texture d'ombre basée sur l'arbre
        const shadowTexture = this.createShadowFromTexture(tree);
        this.shadowTextureCache.set(cacheKey, shadowTexture);
        
        return shadowTexture;
    }
    
    // Crée une texture d'ombre noire à partir d'une texture d'arbre - VERSION AMÉLIORÉE
    createShadowFromTexture(tree) {
        const shadowCanvas = document.createElement('canvas');
        shadowCanvas.width = 64;
        shadowCanvas.height = 64;
        const shadowCtx = shadowCanvas.getContext('2d');
        
        // Créer les données d'ombre avec le même algorithme que l'arbre original
        const imageData = shadowCtx.createImageData(64, 64);
        const data = imageData.data;
        
        const config = TreeSpeciesConfig.getSpecies(tree.species);
        if (!config) return this.createWebGLTexture(shadowCanvas);
        
        const size = 64;
        const centerX = size / 2;
        let centerY = size * 0.9;
        const noise = this.textureGenerator.createNoiseGenerator(tree.variation);
        const maturity = tree.maturity;
        const growthFactor = Math.pow(maturity, 0.7);
        
        // Ajustement pour le pin
        if (config.visual.shape === 'cone') {
            centerY = size * 0.95;
        }
        
        // Générer l'ombre pixel par pixel en reproduisant la structure exacte
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const index = (y * size + x) * 4;
                let isTreePixel = false;
                
                // Reproduire exactement la logique de génération selon l'espèce
                switch (config.visual.shape) {
                    case 'round': // Chêne
                        isTreePixel = this.generateCheneOccupancy(x, y, centerX, centerY, size, config, tree.variation, noise, maturity, growthFactor);
                        break;
                    case 'cone': // Pin
                        isTreePixel = this.generatePinOccupancy(x, y, centerX, centerY, size, config, tree.variation, noise, maturity, growthFactor);
                        break;
                    case 'oval': // Châtaignier
                        isTreePixel = this.generateChataignierOccupancy(x, y, centerX, centerY, size, config, tree.variation, noise, maturity, growthFactor);
                        break;
                }
                
                if (isTreePixel) {
                    // Pixel d'ombre noir avec opacité configurée
                    data[index] = 0;     // R = noir
                    data[index + 1] = 0; // G = noir
                    data[index + 2] = 0; // B = noir
                    data[index + 3] = Math.floor(255 * (this.shadowParams.opacity / 100));
                } else {
                    // Pixel transparent
                    data[index] = 0;
                    data[index + 1] = 0;
                    data[index + 2] = 0;
                    data[index + 3] = 0;
                }
            }
        }
        
        // Appliquer les données au canvas
        shadowCtx.putImageData(imageData, 0, 0);
        
        // Appliquer la rotation si nécessaire
        if (this.shadowParams.rotation !== 0) {
            const rotatedCanvas = this.rotateCanvas(shadowCanvas, this.shadowParams.rotation);
            return this.createWebGLTexture(rotatedCanvas);
        }
        
        return this.createWebGLTexture(shadowCanvas);
    }
    
    // Test d'occupation pour le chêne avec groupements fidèles
    generateCheneOccupancy(x, y, centerX, centerY, size, config, variation, noise, maturity, growthFactor) {
        const visual = config.visual;
        
        // Tronc avec courbure sinusoïdale exacte
        const baseTrunkWidth = size * visual.trunkWidth;
        const baseTrunkHeight = size * visual.trunkHeight;
        const trunkWidth = baseTrunkWidth * (0.3 + growthFactor * 0.7);
        const trunkHeight = baseTrunkHeight * (0.4 + growthFactor * 0.6);
        const trunkTop = centerY - trunkHeight;
        
        // Reproduire exactement la courbure du tronc
        const trunkYProgress = (y - trunkTop) / trunkHeight;
        const trunkCurve = Math.sin(trunkYProgress * Math.PI * 1.5 + variation) * 3;
        const trunkSway = Math.sin(variation * 2.3) * 2;
        const adjustedCenterX = centerX + trunkCurve + trunkSway;
        
        const trunkWidthVariation = noise.get(y, variation, 0.4) * (trunkWidth * 0.3);
        const currentTrunkWidth = trunkWidth + trunkWidthVariation;
        
        // Test du tronc avec courbure
        const isTrunk = y >= trunkTop && y <= centerY && Math.abs(x - adjustedCenterX) <= currentTrunkWidth / 2;
        
        // Test des groupements de feuilles avec la même logique
        if (maturity > 0.2) {
            const numClusters = Math.floor(3 + maturity * 2);
            
            for (let i = 0; i < numClusters; i++) {
                const angle = (i / numClusters) * Math.PI * 2 + variation;
                const distance = (6 + noise.get(i * 100, variation, 0.3) * 8) * growthFactor;
                const clusterCenterX = centerX + Math.cos(angle) * distance;
                const clusterCenterY = centerY - trunkHeight - 4 + Math.sin(angle) * distance * 0.3;
                const clusterRadius = (8 + noise.get(i * 200, variation, 0.2) * 8) * growthFactor;
                
                const clusterDistance = Math.sqrt(Math.pow(x - clusterCenterX, 2) + Math.pow(y - clusterCenterY, 2));
                if (clusterDistance <= clusterRadius) {
                    return true; // Dans un groupement de feuilles
                }
                
                // Test des branches
                const branchDistance = this.textureGenerator.distanceToLine(x, y, centerX, centerY - trunkHeight, clusterCenterX, clusterCenterY);
                if (branchDistance <= 1.5 * growthFactor) {
                    return true; // Sur une branche
                }
            }
        }
        
        return isTrunk;
    }
    
    // Test d'occupation pour le pin avec forme triangulaire exacte
    generatePinOccupancy(x, y, centerX, centerY, size, config, variation, noise, maturity, growthFactor) {
        const visual = config.visual;
        
        // Tronc du pin
        const baseTrunkWidth = size * visual.trunkWidth;
        const baseTrunkHeight = size * visual.trunkHeight;
        const trunkWidth = baseTrunkWidth * (0.3 + growthFactor * 0.7);
        const trunkHeight = baseTrunkHeight * (0.3 + growthFactor * 0.5);
        const trunkTop = centerY - trunkHeight;
        
        // Courbure très légère pour le pin
        const trunkYProgress = (y - trunkTop) / trunkHeight;
        const trunkCurve = Math.sin(trunkYProgress * Math.PI * 0.5 + variation) * (visual.swayAmplitude || 1) * 0.5;
        const adjustedCenterX = centerX + trunkCurve;
        
        const trunkWidthVariation = noise.get(y, variation, 0.5) * (trunkWidth * 0.2);
        const currentTrunkWidth = trunkWidth + trunkWidthVariation;
        
        // Test du tronc
        const isTrunk = y >= trunkTop && y <= centerY && Math.abs(x - adjustedCenterX) <= currentTrunkWidth / 2;
        
        // Test du feuillage triangulaire
        if (maturity > 0.2) {
            const triangleHeight = size * visual.size.height * growthFactor * 0.7;
            const triangleWidth = size * visual.size.width * growthFactor;
            const triangleTop = centerY - trunkHeight - triangleHeight;
            const triangleBottom = centerY - trunkHeight;
            
            if (y >= triangleTop && y <= triangleBottom) {
                const relativeY = (y - triangleTop) / (triangleBottom - triangleTop);
                const currentWidth = triangleWidth * relativeY * 0.5;
                const edgeVariation = noise.get(y * 0.3, variation, 0.4) * (currentWidth * 0.3);
                
                if (Math.abs(x - centerX) <= currentWidth + edgeVariation) {
                    const needleNoise = noise.get(x * 0.8, y * 0.8, 0.6);
                    return needleNoise > -0.2; // Densité des aiguilles
                }
            }
        }
        
        return isTrunk;
    }
    
    // Test d'occupation pour le châtaignier avec groupements ovales exacts
    generateChataignierOccupancy(x, y, centerX, centerY, size, config, variation, noise, maturity, growthFactor) {
        const visual = config.visual;
        
        // Tronc avec courbure prononcée
        const baseTrunkWidth = size * visual.trunkWidth;
        const baseTrunkHeight = size * visual.trunkHeight;
        const trunkWidth = baseTrunkWidth * (0.3 + growthFactor * 0.7);
        const trunkHeight = baseTrunkHeight * (0.4 + growthFactor * 0.6);
        const trunkTop = centerY - trunkHeight;
        
        // Reproduire exactement la courbure prononcée
        const trunkYProgress = (y - trunkTop) / trunkHeight;
        const trunkCurve = Math.sin(trunkYProgress * Math.PI * 1.2 + variation) * (visual.swayAmplitude || 4);
        const trunkSway = Math.sin(variation * 1.8) * 3;
        const adjustedCenterX = centerX + trunkCurve + trunkSway;
        
        const trunkWidthVariation = noise.get(y, variation, 0.3) * (trunkWidth * 0.25);
        const currentTrunkWidth = trunkWidth + trunkWidthVariation;
        
        // Test du tronc avec courbure
        const isTrunk = y >= trunkTop && y <= centerY && Math.abs(x - adjustedCenterX) <= currentTrunkWidth / 2;
        
        // Test des groupements ovales
        if (maturity > 0.2) {
            const minClusters = visual.clusterCount?.min || 3;
            const maxClusters = visual.clusterCount?.max || 4;
            const numClusters = Math.floor(minClusters + maturity * (maxClusters - minClusters));
            
            for (let i = 0; i < numClusters; i++) {
                const angle = (i / numClusters) * Math.PI * 2 + variation * 0.5;
                const distance = (4 + noise.get(i * 150, variation, 0.3) * 6) * growthFactor;
                const clusterCenterX = centerX + Math.cos(angle) * distance;
                const clusterCenterY = centerY - trunkHeight - 2 + Math.sin(angle) * distance * 0.4;
                
                const radiusX = (10 + noise.get(i * 250, variation, 0.2) * 8) * growthFactor;
                const radiusY = radiusX * 0.7;
                
                // Test ellipse
                const distanceX = (x - clusterCenterX) / radiusX;
                const distanceY = (y - clusterCenterY) / radiusY;
                const ellipseDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
                
                if (ellipseDistance <= 1) {
                    return true; // Dans un groupement ovale
                }
                
                // Test des branches
                const branchDistance = this.textureGenerator.distanceToLine(x, y, adjustedCenterX, centerY - trunkHeight, clusterCenterX, clusterCenterY);
                if (branchDistance <= 1.0 * growthFactor) {
                    return true; // Sur une branche
                }
            }
        }
        
        return isTrunk;
    }
    
    // Fonction pour faire pivoter un canvas
    rotateCanvas(canvas, angleDegrees) {
        const rotatedCanvas = document.createElement('canvas');
        rotatedCanvas.width = canvas.width;
        rotatedCanvas.height = canvas.height;
        const ctx = rotatedCanvas.getContext('2d');
        
        // Calculer le centre pour la rotation
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Appliquer la rotation
        ctx.translate(centerX, centerY);
        ctx.rotate((angleDegrees * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);
        
        // Dessiner l'image originale
        ctx.drawImage(canvas, 0, 0);
        
        return rotatedCanvas;
    }
    
    // Calcule la position et transformation de l'ombre avec système d'ancrage pour rotation
    calculateShadowPosition(tree) {
        const data = tree.getRenderData();
        const config = TreeSpeciesConfig.getSpecies(tree.species);
        
        // Point de base exact du tronc selon l'espèce (point d'ancrage fixe)
        let baseRatio = 0.9; // Défaut pour chêne et châtaignier
        if (config && config.visual.shape === 'cone') {
            baseRatio = 0.95; // Pin plus bas dans la texture
        }
        
        // Point d'ancrage fixe - base du tronc de l'arbre
        const anchorX = data.position.x + data.size / 2;
        const anchorY = data.position.y + data.size * baseRatio;
        
        // Calculer la taille de l'ombre avec nouveaux paramètres intuitifs
        const shadowWidth = data.size * this.shadowParams.width;
        const shadowHeight = data.size * this.shadowParams.height;
        
        // Calculer la position de projection directionnelle (longueur + direction)
        const projectionAngle = 45 * (Math.PI / 180); // Angle par défaut de 45°
        const projectionDistance = this.shadowParams.length * 20;
        
        // Position du centre de l'ombre AVANT rotation
        const shadowCenterX = anchorX + Math.cos(projectionAngle) * projectionDistance;
        const shadowCenterY = anchorY + Math.sin(projectionAngle) * projectionDistance;
        
        // SYSTÈME D'ANCRAGE TRIGONOMÉTRIQUE pour la rotation
        // Convertir l'angle de rotation en radians
        const rotationRad = (this.shadowParams.rotation * Math.PI) / 180;
        
        // Calculer le vecteur depuis l'ancrage vers le centre de l'ombre
        const vectorX = shadowCenterX - anchorX;
        const vectorY = shadowCenterY - anchorY;
        
        // Appliquer la rotation à ce vecteur (rotation autour du point d'ancrage)
        const rotatedVectorX = vectorX * Math.cos(rotationRad) - vectorY * Math.sin(rotationRad);
        const rotatedVectorY = vectorX * Math.sin(rotationRad) + vectorY * Math.cos(rotationRad);
        
        // Position finale du centre de l'ombre après rotation
        const finalShadowCenterX = anchorX + rotatedVectorX;
        const finalShadowCenterY = anchorY + rotatedVectorY;
        
        // Position finale de la texture d'ombre (coin supérieur gauche)
        const shadowTextureX = finalShadowCenterX - shadowWidth / 2 + this.shadowParams.translateX;
        const shadowTextureY = finalShadowCenterY - shadowHeight * baseRatio + this.shadowParams.translateY;
        
        return {
            x: shadowTextureX,
            y: shadowTextureY,
            width: shadowWidth,
            height: shadowHeight,
            // Debug info
            anchorX: anchorX,
            anchorY: anchorY,
            centerX: finalShadowCenterX,
            centerY: finalShadowCenterY
        };
    }
    
    // Crée une texture WebGL
    createWebGLTexture(canvas) {
        const texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, canvas);
        
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        
        return texture;
    }
    
    // Mise à jour des paramètres d'ombre depuis le debug
    setShadowParams(params) {
        this.shadowParams = { ...params };
        // Vider le cache d'ombres pour forcer la régénération
        this.clearShadowCache();
        console.log('🌑 Paramètres d\'ombre mis à jour:', this.shadowParams);
    }
    
    // Vide le cache des textures d'ombre
    clearShadowCache() {
        this.shadowTextureCache.forEach(texture => {
            this.gl.deleteTexture(texture);
        });
        this.shadowTextureCache.clear();
    }
    
    // Mise à jour du système
    update(deltaTime) {
        // Mettre à jour tous les arbres
        this.trees.forEach(tree => {
            tree.update(deltaTime);
        });
    }
    
    // Méthodes utilitaires pour l'interaction
    
    // Obtenir tous les arbres dans un rayon donné
    getTreesInRadius(centerX, centerY, radius) {
        const trees = [];
        const gridRadius = Math.ceil(radius / 20);
        const gridCenterX = Math.floor(centerX / 20);
        const gridCenterY = Math.floor(centerY / 20);
        
        for (let x = gridCenterX - gridRadius; x <= gridCenterX + gridRadius; x++) {
            for (let y = gridCenterY - gridRadius; y++) {
                const tree = this.getTreeAt(x, y);
                if (tree) {
                    const distance = Math.sqrt(
                        Math.pow((tree.worldX + 10) - centerX, 2) + 
                        Math.pow((tree.worldY + 10) - centerY, 2)
                    );
                    if (distance <= radius) {
                        trees.push(tree);
                    }
                }
            }
        }
        
        return trees;
    }
    
    // Obtenir des statistiques sur les arbres
    getTreeStats() {
        return {
            total: this.totalTrees,
            visible: this.visibleTreesCount,
            species: { ...this.speciesCount }
        };
    }
    
    // Obtenir des informations sur un arbre à une position monde
    getTreeInfoAt(worldX, worldY) {
        const gridX = Math.floor(worldX / 20);
        const gridY = Math.floor(worldY / 20);
        const tree = this.getTreeAt(gridX, gridY);
        return tree ? tree.getInfo() : null;
    }
    
    // Forcer la regeneration d'un arbre (pour testing)
    regenerateTreeAt(gridX, gridY) {
        this.removeTree(gridX, gridY);
        
        const soil = this.soilManager.getSoilAt(gridX, gridY);
        if (soil) {
            const viableSpecies = Tree.canGrowOnSoil(soil);
            if (viableSpecies.length > 0) {
                const randomSpecies = viableSpecies[Math.floor(Math.random() * viableSpecies.length)];
                const tree = new Tree(gridX, gridY, randomSpecies);
                this.addTree(tree);
                return tree;
            }
        }
        return null;
    }
    
    // Ajouter un arbre manuellement (pour testing)
    addTreeManually(gridX, gridY, species = null) {
        // Vérifier qu'il n'y a pas déjà un arbre
        if (this.getTreeAt(gridX, gridY)) {
            return false;
        }
        
        const soil = this.soilManager.getSoilAt(gridX, gridY);
        if (!soil) {
            return false;
        }
        
        // Si aucune espèce spécifiée, choisir automatiquement
        if (!species) {
            const viableSpecies = Tree.canGrowOnSoil(soil);
            if (viableSpecies.length === 0) {
                return false;
            }
            species = viableSpecies[Math.floor(Math.random() * viableSpecies.length)];
        } else {
            // Vérifier que l'espèce peut pousser sur ce sol
            if (!Tree.canGrowOnSoil(soil, species)) {
                return false;
            }
        }
        
        const tree = new Tree(gridX, gridY, species);
        this.addTree(tree);
        this.speciesCount[species]++;
        return tree;
    }
    
    // Supprimer tous les arbres (pour reset)
    clearAllTrees() {
        this.trees.forEach(tree => {
            tree.cleanup(this.gl);
        });
        this.trees.clear();
        this.totalTrees = 0;
        this.speciesCount = { 'chene': 0, 'pin': 0, 'chataignier': 0 };
        this.needsRefresh = true;
        console.log('🌳 Tous les arbres supprimés');
    }
    
    // Regenerer tous les arbres
    regenerateAllTrees() {
        this.clearAllTrees();
        this.generateTrees();
        console.log('🌳 Arbres régénérés');
    }
    
    // Getters pour les métriques de debug
    getTotalTrees() {
        return this.totalTrees;
    }
    
    getVisibleTreesCount() {
        return this.visibleTreesCount;
    }
    
    getSpeciesCount() {
        return { ...this.speciesCount };
    }
    
    // Nettoyage des ressources
    cleanup() {
        this.trees.forEach(tree => {
            tree.cleanup(this.gl);
        });
        this.trees.clear();
        this.visibleTrees = [];
    }
}