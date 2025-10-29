/**
 * Tree - Classe entité représentant un arbre avec positionnement flexible
 * 
 * Version refactorisée utilisant les modules de configuration et de texture
 * séparés. Supporte le positionnement libre sur les cellules de sol avec
 * débordement et transparence.
 */

class Tree {
    constructor(x, y, species = null, offsetX = 0, offsetY = 0) {
        // Position de la cellule de sol de base
        this.gridX = x;
        this.gridY = y;
        
        // Offset dans la cellule (0-1) pour positionnement libre
        this.offsetX = offsetX || Math.random();
        this.offsetY = offsetY || Math.random();
        
        // Position monde calculée avec offset
        this.worldX = x * 20 + this.offsetX * 20 - 32; // -32 pour centrer la texture 64x64
        this.worldY = y * 20 + this.offsetY * 20 - 32;
        
        // Dimensions de la texture (plus grande pour débordement)
        this.size = 64; // Doublé de 32 à 64
        
        // Espèce
        this.species = species || this.selectRandomSpecies();
        this.variation = Math.floor(Math.random() * 3); // 0-2 pour variation
        
        // État de l'arbre
        this.age = 0;
        this.maturity = Math.random() * 0.3 + 0.7; // Entre 70% et 100% - SERA ÉCRASÉ si défini explicitement
        this.health = 100;
        this.isAlive = true;
        
        // Cache de texture et suivi de maturité
        this.cachedTexture = null;
        this.lastMaturityStep = undefined;
    }
    
    // Sélectionne une espèce aléatoire
    selectRandomSpecies() {
        const species = TreeSpeciesConfig.getAllSpeciesNames();
        return species[Math.floor(Math.random() * species.length)];
    }
    
    // Vérifie si une espèce peut pousser sur un sol
    static canGrowOnSoil(soil, species = null) {
        return TreeSpeciesConfig.canGrowOnSoil(soil, species);
    }
    
    // Calcule la probabilité de spawn sur un sol donné
    getSpawnProbability(soil) {
        const config = TreeSpeciesConfig.getSpecies(this.species);
        if (!TreeSpeciesConfig.canGrowOnSoil(soil, this.species)) {
            return 0;
        }
        
        // Calcul de l'optimalité du sol
        let optimalityScore = 0;
        const req = config.requirements;
        
        optimalityScore += this.calculateOptimalityScore(soil.nitrogen, req.nitrogen);
        optimalityScore += this.calculateOptimalityScore(soil.phosphorus, req.phosphorus);
        optimalityScore += this.calculateOptimalityScore(soil.potassium, req.potassium);
        optimalityScore += this.calculateOptimalityScore(soil.organicMatter, req.organicMatter);
        
        // Score pollution (inversé)
        const pollutionScore = Math.max(0, (req.pollutionTolerance - soil.pollution) / req.pollutionTolerance);
        optimalityScore += pollutionScore;
        
        optimalityScore /= 5; // Moyenne
        
        return config.probability * optimalityScore;
    }
    
    // Score d'optimalité pour un nutriment
    calculateOptimalityScore(value, requirement) {
        if (value < requirement.min) return 0;
        if (value >= requirement.optimal) return 1;
        return (value - requirement.min) / (requirement.optimal - requirement.min);
    }
    
    // Génère ou récupère la texture
    generateTexture(textureGenerator) {
        // Invalider le cache si la maturité a changé significativement
        const currentMaturityStep = Math.floor(this.maturity * 10) / 10;
        if (!this.cachedTexture || this.lastMaturityStep !== currentMaturityStep) {
            this.cachedTexture = textureGenerator.generateTexture(this.species, this.variation, this.maturity);
            this.lastMaturityStep = currentMaturityStep;
        }
        return this.cachedTexture;
    }
    
    // Interface pour le système de rendu
    getRenderData() {
        return {
            position: { x: this.worldX, y: this.worldY },
            size: this.size,
            species: this.species,
            variation: this.variation,
            maturity: this.maturity,
            health: this.health,
            offsetX: this.offsetX,
            offsetY: this.offsetY
        };
    }
    
    getRenderType() {
        return 'tree';
    }
    
    // Informations pour debug
    getInfo() {
        return {
            species: TreeSpeciesConfig.getSpeciesDisplayName(this.species),
            position: { x: this.gridX, y: this.gridY },
            offset: { x: Math.round(this.offsetX * 100), y: Math.round(this.offsetY * 100) },
            age: this.age,
            health: this.health,
            maturity: Math.round(this.maturity * 100),
            requirements: TreeSpeciesConfig.getSpecies(this.species).requirements
        };
    }
    
    // Mise à jour avec croissance ralentie pour observation
    update(deltaTime) {
        if (!this.isAlive) return;
        
        // Croissance ralentie pour atteindre maturité complète en ~10 secondes
        this.age += deltaTime * 0.001; // Ralenti x10
        this.maturity = Math.min(1.0, this.maturity + deltaTime * 0.0001); // Ralenti x10
        
        // Forcer la régénération de texture quand la maturité change
        const currentMaturityStep = Math.floor(this.maturity * 10) / 10;
        if (this.lastMaturityStep !== currentMaturityStep) {
            this.cachedTexture = null; // Forcer la régénération
        }
    }
    
    // Nettoyage
    cleanup(gl) {
        // La texture est gérée par TreeTextureGenerator, pas besoin de nettoyer ici
        this.cachedTexture = null;
    }
    
    // Méthodes statiques utilitaires
    static getAllSpecies() {
        return TreeSpeciesConfig.getAllSpeciesNames();
    }
    
    static getSpeciesName(species) {
        return TreeSpeciesConfig.getSpeciesDisplayName(species);
    }
}