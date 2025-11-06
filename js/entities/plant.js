/**
 * Plant entity - Represents a plant instance in the game world
 * Handles plant state, sprite generation, and basic lifecycle
 */
class Plant {
    constructor(x, y, speciesConfig, stage = 'Seedling') {
        this.x = x;
        this.y = y;
        this.species = speciesConfig;
        this.stage = stage;
        this.age = 0;
        this.health = 1.0;
        this.texture = null;
        this.webglTexture = null; // Cache for WebGL texture
        this.width = 20;
        this.height = 20;
        
        // Generate initial sprite
        this.generateSprite();
    }

    generateSprite() {
        // Clear the WebGL texture cache when regenerating sprite
        if (this.webglTexture) {
            this.webglTexture = null; // Clear cache to force texture recreation
        }
        
        // Use the global PlantGenerator to create the sprite with current growth stage
        if (window.PlantGenerator) {
            this.texture = window.PlantGenerator.generatePlantSprite(this.species, this.stage);
        }
    }

    update(deltaTime) {
        this.age += deltaTime;
        // Future: growth logic, health updates
    }

    getRenderData() {
        return {
            x: this.x - this.width / 2,  // Center the plant sprite on its position
            y: this.y - this.height / 2, // Center the plant sprite on its position
            width: this.width,
            height: this.height,
            texture: this.texture,
            color: [1, 1, 1, 1]
        };
    }

    // Method to check if this plant can be rendered with texture shader
    hasTexture() {
        return this.texture !== null;
    }

    // Return render type for batching system
    getRenderType() {
        return 'plant';
    }

    // Method to advance to next growth stage (for future growth system)
    advanceGrowthStage() {
        const stages = this.species.growthStages;
        const currentIndex = stages.findIndex(stage => stage.name === this.stage);
        
        if (currentIndex < stages.length - 1) {
            this.stage = stages[currentIndex + 1].name;
            this.generateSprite(); // Regenerate sprite for new stage
            return true;
        }
        
        return false; // Already at final stage
    }
}