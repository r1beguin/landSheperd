class Plant {
    constructor(type, color) {
        this.type = type;
        this.color = color;
        this.age = 0;
        this.health = 100;
        this.windOffset = 0;
        this.windSpeed = Math.random() * 0.2 + 0.1;
        this.maxWindOffset = Math.random() * 0.7 + 0.3;
    }
}

const PLANT_TYPES = {
    oak: "#228B22", // Changed to a shade of green
    ash: "#32CD32", // Changed to a shade of green
    chestnut: "#6B8E23", // Changed to a shade of green
};

export { Plant, PLANT_TYPES };