/**
 * Soil - Classe entité représentant une cellule de sol
 * 
 * Cette classe encapsule les propriétés chimiques et physiques d'une cellule de sol de 20x20 pixels.
 * Elle gère la fertilité (N, P, K, C), la rétention d'eau et la pollution, et génère 
 * automatiquement l'apparence visuelle basée sur ces propriétés.
 * 
 * Fonctionnalités principales :
 * - Gestion des nutriments (N, P, K) et matière organique (C)
 * - Calcul automatique de la fertilité globale
 * - Génération procédurale de pixels d'eau et de pollution
 * - Rendu optimisé avec couleur de base et overlay de pixels
 */

class Soil {
    constructor(x, y, options = {}) {
        // Position dans le monde (coordonnées de la cellule)
        this.gridX = x;
        this.gridY = y;
        this.worldX = x * 20; // Position en pixels
        this.worldY = y * 20;
        
        // Dimensions fixes des cellules
        this.size = 20;
        
        // Propriétés chimiques (0-100)
        this.nitrogen = options.nitrogen ?? this.randomValue(0, 100);
        this.phosphorus = options.phosphorus ?? this.randomValue(0, 100);
        this.potassium = options.potassium ?? this.randomValue(0, 100);
        this.organicMatter = options.organicMatter ?? this.randomValue(0, 100);
        
        // Propriétés physiques (0-100)
        this.waterRetention = options.waterRetention ?? this.randomValue(0, 100);
        this.pollution = options.pollution ?? this.randomValue(0, 100);
        
        // Propriétés dérivées
        this.fertility = this.calculateFertility();
        
        // Génération des pixels d'overlay (eau et pollution)
        this.waterPixels = this.generateWaterPixels();
        this.pollutionPixels = this.generatePollutionPixels();
        
        // Cache de rendu
        this.baseColor = this.calculateBaseColor();
        this.needsUpdate = false;
    }
    
    // Calcul de la fertilité moyenne
    calculateFertility() {
        return (this.nitrogen + this.phosphorus + this.potassium + this.organicMatter) / 4;
    }
    
    // Calcul de la couleur de base selon la fertilité
    calculateBaseColor() {
        // Plus fertile = plus sombre (tend vers le noir)
        // Moins fertile = plus clair (brun/beige)
        const fertility = this.fertility / 100;
        
        // Couleur de base : brun clair vers noir
        const lightBrown = [0.6, 0.4, 0.2]; // RGB normalisé
        const darkSoil = [0.1, 0.05, 0.02];
        
        return [
            lightBrown[0] + (darkSoil[0] - lightBrown[0]) * fertility,
            lightBrown[1] + (darkSoil[1] - lightBrown[1]) * fertility,
            lightBrown[2] + (darkSoil[2] - lightBrown[2]) * fertility,
            1.0
        ];
    }
    
    // Génération des pixels d'eau (bleus)
    generateWaterPixels() {
        // OPTIMISATION : Générer très peu de pixels, juste pour les calculs
        const maxPixels = Math.min(5, Math.floor((this.waterRetention / 100) * 10)); // Max 5 pixels
        const pixels = [];
        
        for (let i = 0; i < maxPixels; i++) {
            pixels.push({
                x: Math.floor(Math.random() * this.size),
                y: Math.floor(Math.random() * this.size),
                color: [0.2, 0.4, 1.0, 0.8]
            });
        }
        
        return pixels;
    }
    
    // Génération des pixels de pollution (verts)
    generatePollutionPixels() {
        // OPTIMISATION : Générer très peu de pixels, juste pour les calculs
        const maxPixels = Math.min(3, Math.floor((this.pollution / 100) * 8)); // Max 3 pixels
        const pixels = [];
        
        for (let i = 0; i < maxPixels; i++) {
            pixels.push({
                x: Math.floor(Math.random() * this.size),
                y: Math.floor(Math.random() * this.size),
                color: [0.0, 1.0, 0.2, 0.7]
            });
        }
        
        return pixels;
    }
    
    // Méthode utilitaire pour générer des valeurs aléatoires
    randomValue(min, max) {
        return Math.random() * (max - min) + min;
    }
    
    // Interface pour le système de rendu
    getRenderData() {
        return {
            position: { x: this.worldX, y: this.worldY },
            size: this.size,
            baseColor: this.baseColor,
            waterPixels: this.waterPixels,
            pollutionPixels: this.pollutionPixels,
            fertility: this.fertility
        };
    }
    
    getRenderType() {
        return 'soil';
    }
    
    // Méthodes de mise à jour des propriétés
    updateNutrients(nitrogen, phosphorus, potassium, organicMatter) {
        this.nitrogen = Math.max(0, Math.min(100, nitrogen));
        this.phosphorus = Math.max(0, Math.min(100, phosphorus));
        this.potassium = Math.max(0, Math.min(100, potassium));
        this.organicMatter = Math.max(0, Math.min(100, organicMatter));
        
        this.fertility = this.calculateFertility();
        this.baseColor = this.calculateBaseColor();
        this.needsUpdate = true;
    }
    
    updateWaterRetention(value) {
        this.waterRetention = Math.max(0, Math.min(100, value));
        this.waterPixels = this.generateWaterPixels();
        this.needsUpdate = true;
    }
    
    updatePollution(value) {
        this.pollution = Math.max(0, Math.min(100, value));
        this.pollutionPixels = this.generatePollutionPixels();
        this.needsUpdate = true;
    }
    
    // Méthodes utilitaires pour l'interaction avec d'autres systèmes
    isOptimalFor(plantType) {
        // À implémenter plus tard selon les besoins des plantes
        // Pour l'instant, retourne true si la fertilité est élevée
        return this.fertility > 70 && this.pollution < 30;
    }
    
    getInfo() {
        return {
            position: { x: this.gridX, y: this.gridY },
            nutrients: {
                nitrogen: Math.round(this.nitrogen),
                phosphorus: Math.round(this.phosphorus),
                potassium: Math.round(this.potassium),
                organicMatter: Math.round(this.organicMatter)
            },
            fertility: Math.round(this.fertility),
            waterRetention: Math.round(this.waterRetention),
            pollution: Math.round(this.pollution)
        };
    }
    
    // Méthode d'update (pour l'instant vide, évolution future)
    update(deltaTime) {
        // Futur : dégradation naturelle, diffusion des nutriments, etc.
        this.needsUpdate = false;
    }
}