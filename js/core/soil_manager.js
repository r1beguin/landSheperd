/**
 * SoilManager - Gestionnaire centralisé du système de sol
 * 
 * Ce module gère la grille globale du sol, l'optimisation du rendu des cellules
 * et les interactions avec le système de sol. Il fournit une interface efficace
 * pour accéder aux propriétés du sol et gérer les mises à jour.
 * 
 * Fonctionnalités principales :
 * - Gestion de la grille de cellules de sol 20x20
 * - Optimisation du rendu par culling (cellules visibles uniquement)
 * - Cache des données de rendu pour les performances
 * - Interface pour l'interaction avec les autres systèmes (plantes, animaux)
 */

class SoilManager {
    constructor(gl, geometryManager, textureGenerator, config) {
        this.gl = gl;
        this.geometryManager = geometryManager;
        this.textureGenerator = textureGenerator;
        this.config = config;
        
        // Grille de sol (Map pour un accès efficace)
        this.soilGrid = new Map();
        
        // Configuration de la grille depuis config.json
        this.cellSize = this.config.world.map.cellSize;
        this.gridWidth = this.config.world.map.gridWidth;
        this.gridHeight = this.config.world.map.gridHeight;
        
        // Générateur procédural
        this.proceduralGenerator = new ProceduralGenerator(this.config.world.soil);
        
        // Cache de rendu pour optimisation
        this.visibleCells = [];
        this.needsRefresh = true;
        
        // Compteurs pour debug
        this.totalCells = 0;
        this.visibleCellsCount = 0;
        
        console.log(`🌍 SoilManager initialisé: ${this.gridWidth}x${this.gridHeight} cellules de ${this.cellSize}px`);
        
        this.initializeSoilGrid();
        this.createSoilGeometry();
    }
    
    // Initialise la grille de sol avec génération procédurale
    initializeSoilGrid() {
        console.log('🌍 Initialisation de la grille de sol avec génération procédurale...');
        
        const startTime = performance.now();
        
        // Générer les cartes de propriétés avec le générateur procédural
        const fertilityMap = this.proceduralGenerator.generateCoherentMap(this.gridWidth, this.gridHeight, 'fertility');
        const waterRetentionMap = this.proceduralGenerator.generateCoherentMap(this.gridWidth, this.gridHeight, 'water');
        const pollutionMap = this.proceduralGenerator.generateCoherentMap(this.gridWidth, this.gridHeight, 'pollution');
        
        // Statistiques des cartes générées
        console.log('📊 Statistiques fertilité:', this.proceduralGenerator.getMapStats(fertilityMap));
        console.log('💧 Statistiques eau:', this.proceduralGenerator.getMapStats(waterRetentionMap));
        console.log('☢️ Statistiques pollution:', this.proceduralGenerator.getMapStats(pollutionMap));
        
        // Créer les cellules avec les valeurs des cartes
        for (let x = -this.gridWidth/2; x < this.gridWidth/2; x++) {
            for (let y = -this.gridHeight/2; y < this.gridHeight/2; y++) {
                // Convertir les coordonnées du monde vers les indices de carte
                const mapX = x + this.gridWidth/2;
                const mapY = y + this.gridHeight/2;
                
                const fertilityConfig = this.config.world.soil.fertility.nutrientVariation;
                
                const soil = new Soil(x, y, {
                    nitrogen: fertilityMap[mapY][mapX] + this.randomVariation(fertilityConfig.nitrogen),
                    phosphorus: fertilityMap[mapY][mapX] + this.randomVariation(fertilityConfig.phosphorus),
                    potassium: fertilityMap[mapY][mapX] + this.randomVariation(fertilityConfig.potassium),
                    organicMatter: fertilityMap[mapY][mapX] + this.randomVariation(fertilityConfig.organicMatter),
                    waterRetention: waterRetentionMap[mapY][mapX],
                    pollution: pollutionMap[mapY][mapX]
                });
                
                this.setSoilAt(x, y, soil);
                this.totalCells++;
            }
        }
        
        const endTime = performance.now();
        console.log(`✅ Grille de sol initialisée: ${this.totalCells} cellules en ${(endTime - startTime).toFixed(2)}ms`);
    }
    
    // Génère une carte 2D avec cohérence spatiale (zones et dégradés)
    generateCoherentMap(width, height, type) {
        const map = [];
        
        // Initialiser la carte
        for (let y = 0; y < height; y++) {
            map[y] = [];
            for (let x = 0; x < width; x++) {
                map[y][x] = 0;
            }
        }
        
        // Paramètres selon le type de propriété
        let config;
        switch (type) {
            case 'fertility':
                config = {
                    hotspots: 8,        // Nombre de zones fertiles
                    baseValue: 30,      // Valeur de base
                    maxIntensity: 85,   // Intensité maximale des hotspots
                    falloffRate: 0.15   // Vitesse de dégradé
                };
                break;
            case 'water':
                config = {
                    hotspots: 5,        // Zones d'eau (rivières, marécages)
                    baseValue: 20,
                    maxIntensity: 90,
                    falloffRate: 0.12
                };
                break;
            case 'pollution':
                config = {
                    hotspots: 3,        // Quelques zones polluées
                    baseValue: 5,
                    maxIntensity: 80,
                    falloffRate: 0.08   // Pollution se propage plus lentement
                };
                break;
        }
        
        // Générer des points chauds (hotspots)
        const hotspots = [];
        for (let i = 0; i < config.hotspots; i++) {
            hotspots.push({
                x: Math.random() * width,
                y: Math.random() * height,
                intensity: config.baseValue + Math.random() * (config.maxIntensity - config.baseValue),
                radius: 8 + Math.random() * 12 // Rayon variable entre 8 et 20
            });
        }
        
        // Appliquer l'influence des hotspots avec dégradé
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let totalInfluence = config.baseValue;
                
                // Calculer l'influence de chaque hotspot
                hotspots.forEach(hotspot => {
                    const distance = Math.sqrt(
                        Math.pow(x - hotspot.x, 2) + Math.pow(y - hotspot.y, 2)
                    );
                    
                    if (distance < hotspot.radius) {
                        // Fonction de dégradé exponentiel
                        const influence = hotspot.intensity * Math.exp(-distance * config.falloffRate);
                        totalInfluence += influence;
                    }
                });
                
                // Ajouter du bruit pour la variation locale
                const noise = (Math.random() - 0.5) * 10;
                totalInfluence += noise;
                
                // Clamper entre 0 et 100
                map[y][x] = Math.max(0, Math.min(100, totalInfluence));
            }
        }
        
        // Post-traitement : lissage pour des transitions plus douces
        return this.smoothMap(map, width, height);
    }
    
    // Lisse la carte pour des transitions plus naturelles
    smoothMap(map, width, height) {
        const smoothed = [];
        
        for (let y = 0; y < height; y++) {
            smoothed[y] = [];
            for (let x = 0; x < width; x++) {
                let sum = 0;
                let count = 0;
                
                // Moyenner avec les voisins (filtre 3x3)
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
    
    // Ajoute une variation aléatoire contrôlée
    randomVariation(range) {
        return (Math.random() - 0.5) * range;
    }
    
    // Crée la géométrie réutilisable pour les cellules de sol
    createSoilGeometry() {
        // Créer la géométrie de base pour les cellules 20x20
        this.geometryManager.createQuad(this.cellSize, this.cellSize, false);
        
        // Créer une géométrie plus petite pour les pixels individuels (1x1)
        this.geometryManager.createQuad(1, 1, false);
    }
    
    // Conversion coordonnées -> clé de cellule
    getCellKey(gridX, gridY) {
        return `${gridX},${gridY}`;
    }
    
    // Obtenir les coordonnées de grille depuis une position monde
    worldToGrid(worldX, worldY) {
        return {
            x: Math.floor(worldX / this.cellSize),
            y: Math.floor(worldY / this.cellSize)
        };
    }
    
    // Obtenir la cellule de sol à une position de grille
    getSoilAt(gridX, gridY) {
        const key = this.getCellKey(gridX, gridY);
        return this.soilGrid.get(key);
    }
    
    // Définir la cellule de sol à une position de grille
    setSoilAt(gridX, gridY, soil) {
        const key = this.getCellKey(gridX, gridY);
        this.soilGrid.set(key, soil);
        this.needsRefresh = true;
    }
    
    // Obtenir la cellule de sol à une position monde
    getSoilAtWorld(worldX, worldY) {
        const grid = this.worldToGrid(worldX, worldY);
        return this.getSoilAt(grid.x, grid.y);
    }
    
    // Calculer les cellules visibles selon la caméra
    updateVisibleCells(cameraManager) {
        const bounds = cameraManager.getVisibleBounds();
        
        // Ajouter une marge pour éviter les pop-ins
        const margin = this.cellSize * 2;
        const startX = Math.floor((bounds.left - margin) / this.cellSize);
        const endX = Math.ceil((bounds.right + margin) / this.cellSize);
        const startY = Math.floor((bounds.top - margin) / this.cellSize);
        const endY = Math.ceil((bounds.bottom + margin) / this.cellSize);
        
        this.visibleCells = [];
        
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                const soil = this.getSoilAt(x, y);
                if (soil) {
                    this.visibleCells.push(soil);
                }
            }
        }
        
        this.visibleCellsCount = this.visibleCells.length;
        this.needsRefresh = false;
    }
    
    // Rendu optimisé des cellules visibles
    renderSoil(renderSystem, viewMatrix, cameraManager) {
        // Mettre à jour les cellules visibles si nécessaire
        if (this.needsRefresh) {
            this.updateVisibleCells(cameraManager);
        }
        
        // Système de niveaux de détail basé sur le zoom
        const zoom = viewMatrix.zoom;
        let renderDetailLevel;
        
        if (zoom < 0.5) {
            renderDetailLevel = 0; // Très peu de détails
        } else if (zoom < 1.0) {
            renderDetailLevel = 1; // Détails moyens
        } else {
            renderDetailLevel = 2; // Tous les détails
        }
        
        // Rendre les cellules avec le niveau de détail approprié
        this.visibleCells.forEach(soil => {
            this.renderSoilCellWithLOD(soil, renderSystem, viewMatrix, renderDetailLevel);
        });
    }
    
    // Rendu d'une cellule avec niveaux de détail
    renderSoilCellWithLOD(soil, renderSystem, viewMatrix, detailLevel) {
        const data = soil.getRenderData();
        
        // NOUVEAU SYSTÈME : Rendu avec texture procédurale
        // Obtenir la texture appropriée pour cette cellule
        const texture = this.textureGenerator.getTextureForSoil(soil);
        
        // Rendre avec la texture au lieu des overlays multiples
        renderSystem.renderTexturedRect(
            data.position.x, 
            data.position.y, 
            data.size, 
            data.size, 
            texture,
            viewMatrix
        );
        
        // RÉSULTAT : 1 seul appel de rendu par cellule au lieu de 1-3
    }
    
    // Mise à jour du système
    update(deltaTime) {
        // Mettre à jour toutes les cellules (pour l'instant, juste marquer comme non-dirty)
        this.soilGrid.forEach(soil => {
            soil.update(deltaTime);
        });
    }
    
    // Méthodes utilitaires pour l'interaction avec d'autres systèmes
    
    // Obtenir la fertilité moyenne d'une zone
    getAverageFertilityInArea(centerX, centerY, radius) {
        const cells = this.getCellsInRadius(centerX, centerY, radius);
        if (cells.length === 0) return 0;
        
        const totalFertility = cells.reduce((sum, cell) => sum + cell.fertility, 0);
        return totalFertility / cells.length;
    }
    
    // Obtenir toutes les cellules dans un rayon donné
    getCellsInRadius(centerX, centerY, radius) {
        const cells = [];
        const gridCenter = this.worldToGrid(centerX, centerY);
        const gridRadius = Math.ceil(radius / this.cellSize);
        
        for (let x = gridCenter.x - gridRadius; x <= gridCenter.x + gridRadius; x++) {
            for (let y = gridCenter.y - gridRadius; y <= gridCenter.y + gridRadius; y++) {
                const soil = this.getSoilAt(x, y);
                if (soil) {
                    const distance = Math.sqrt(
                        Math.pow((soil.worldX + this.cellSize/2) - centerX, 2) + 
                        Math.pow((soil.worldY + this.cellSize/2) - centerY, 2)
                    );
                    if (distance <= radius) {
                        cells.push(soil);
                    }
                }
            }
        }
        
        return cells;
    }
    
    // Modifier les propriétés du sol dans une zone
    modifySoilInArea(centerX, centerY, radius, modifications) {
        const cells = this.getCellsInRadius(centerX, centerY, radius);
        
        cells.forEach(soil => {
            if (modifications.nitrogen !== undefined) {
                soil.nitrogen = Math.max(0, Math.min(100, soil.nitrogen + modifications.nitrogen));
            }
            if (modifications.phosphorus !== undefined) {
                soil.phosphorus = Math.max(0, Math.min(100, soil.phosphorus + modifications.phosphorus));
            }
            if (modifications.potassium !== undefined) {
                soil.potassium = Math.max(0, Math.min(100, soil.potassium + modifications.potassium));
            }
            if (modifications.organicMatter !== undefined) {
                soil.organicMatter = Math.max(0, Math.min(100, soil.organicMatter + modifications.organicMatter));
            }
            if (modifications.pollution !== undefined) {
                soil.pollution = Math.max(0, Math.min(100, soil.pollution + modifications.pollution));
            }
            if (modifications.waterRetention !== undefined) {
                soil.waterRetention = Math.max(0, Math.min(100, soil.waterRetention + modifications.waterRetention));
            }
            
            // Recalculer les propriétés dérivées
            soil.fertility = soil.calculateFertility();
            soil.baseColor = soil.calculateBaseColor();
            soil.waterPixels = soil.generateWaterPixels();
            soil.pollutionPixels = soil.generatePollutionPixels();
            soil.needsUpdate = true;
        });
        
        this.needsRefresh = true;
    }
    
    // Obtenir des informations de debug sur une cellule
    getSoilInfoAt(worldX, worldY) {
        const soil = this.getSoilAtWorld(worldX, worldY);
        return soil ? soil.getInfo() : null;
    }
    
    // Getters pour les métriques de debug
    getTotalCells() {
        return this.totalCells;
    }
    
    getVisibleCellsCount() {
        return this.visibleCellsCount;
    }
    
    // Nettoyage des ressources
    cleanup() {
        this.soilGrid.clear();
        this.visibleCells = [];
    }
}