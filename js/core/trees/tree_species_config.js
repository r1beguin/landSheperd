/**
 * TreeSpeciesConfig - Configuration centralisée des espèces d'arbres
 * 
 * Ce module contient toutes les configurations des espèces d'arbres,
 * leurs exigences de sol, leurs propriétés visuelles et leurs probabilités.
 * Facilite l'ajout de nouvelles espèces et la maintenance du code.
 */

class TreeSpeciesConfig {
    static getSpeciesConfig() {
        return {
            'chene': {
                name: 'Chêne',
                requirements: {
                    nitrogen: { min: 40, optimal: 60 },
                    phosphorus: { min: 30, optimal: 50 },
                    potassium: { min: 45, optimal: 70 },
                    organicMatter: { min: 50, optimal: 75 },
                    pollutionTolerance: 25
                },
                visual: {
                    trunkColor: [101, 67, 33], // Marron moyen
                    foliageColor: [34, 139, 34], // Vert forêt classique
                    shape: 'round',
                    density: 'dense',
                    size: { width: 2.4, height: 2.2 }, // x3 plus grand
                    trunkWidth: 0.025, // Encore réduit de 0.04 à 0.025
                    trunkHeight: 0.4, // Réduit de 0.5 à 0.4
                    // Caractéristiques spécifiques au chêne
                    swayAmplitude: 3, // Courbure modérée
                    clusterCount: { min: 5, max: 7 }, // Plus de groupements
                    clusterShape: 'round' // Groupements ronds
                },
                probability: 0.05
            },
            'pin': {
                name: 'Pin',
                requirements: {
                    nitrogen: { min: 25, optimal: 40 },
                    phosphorus: { min: 20, optimal: 35 },
                    potassium: { min: 30, optimal: 45 },
                    organicMatter: { min: 20, optimal: 40 },
                    pollutionTolerance: 40
                },
                visual: {
                    trunkColor: [80, 50, 30], // Marron très sombre
                    foliageColor: [0, 80, 0], // Vert très sombre (aiguilles)
                    shape: 'cone',
                    density: 'sparse',
                    size: { width: 1.8, height: 2.8 }, // x3 plus grand, très haut
                    trunkWidth: 0.02, // Encore réduit de 0.03 à 0.02
                    trunkHeight: 0.5, // Réduit de 0.6 à 0.5
                    // Caractéristiques spécifiques au pin
                    swayAmplitude: 1, // Très peu de courbure (tronc droit)
                    clusterCount: { min: 1, max: 1 }, // 1 seul groupement
                    clusterShape: 'triangle' // Forme triangulaire
                },
                probability: 0.05
            },
            'chataignier': {
                name: 'Châtaignier',
                requirements: {
                    nitrogen: { min: 50, optimal: 75 },
                    phosphorus: { min: 40, optimal: 60 },
                    potassium: { min: 55, optimal: 80 },
                    organicMatter: { min: 60, optimal: 85 },
                    pollutionTolerance: 15
                },
                visual: {
                    trunkColor: [120, 80, 45], // Marron clair
                    foliageColor: [60, 180, 60], // Vert clair lumineux
                    shape: 'oval',
                    density: 'medium',
                    size: { width: 2.1, height: 2.1 }, // x3 plus grand
                    trunkWidth: 0.02, // Encore réduit de 0.03 à 0.02
                    trunkHeight: 0.35,
                    // Caractéristiques spécifiques au châtaignier
                    swayAmplitude: 4, // Courbure prononcée
                    clusterCount: { min: 4, max: 6 }, // Plus de groupements
                    clusterShape: 'oval' // Groupements ovales
                },
                probability: 0.05
            }
        };
    }
    
    static getSpecies(speciesName) {
        return this.getSpeciesConfig()[speciesName];
    }
    
    static getAllSpeciesNames() {
        return Object.keys(this.getSpeciesConfig());
    }
    
    static getSpeciesDisplayName(speciesName) {
        const species = this.getSpecies(speciesName);
        return species ? species.name : speciesName;
    }
    
    static canGrowOnSoil(soil, speciesName = null) {
        const config = this.getSpeciesConfig();
        
        if (!speciesName) {
            // Teste toutes les espèces et retourne celles qui peuvent pousser
            const viableSpecies = [];
            for (const [name, speciesConfig] of Object.entries(config)) {
                if (this.checkSoilCompatibility(soil, speciesConfig.requirements)) {
                    viableSpecies.push(name);
                }
            }
            return viableSpecies;
        } else {
            // Teste une espèce spécifique
            const speciesConfig = config[speciesName];
            return speciesConfig ? this.checkSoilCompatibility(soil, speciesConfig.requirements) : false;
        }
    }
    
    static checkSoilCompatibility(soil, requirements) {
        // Vérifier chaque nutriment
        if (soil.nitrogen < requirements.nitrogen.min) return false;
        if (soil.phosphorus < requirements.phosphorus.min) return false;
        if (soil.potassium < requirements.potassium.min) return false;
        if (soil.organicMatter < requirements.organicMatter.min) return false;
        
        // Vérifier la tolérance à la pollution
        if (soil.pollution > requirements.pollutionTolerance) return false;
        
        return true;
    }
}