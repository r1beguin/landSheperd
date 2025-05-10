import { Plant } from './plants.js';

class Soil {
    constructor(type, fertility = Math.random() * 100) {
        this.type = type; // 'soil' or 'water'
        this.fertility = fertility; // Fertility percentage (0-100)
    }
}

function generateSoil(gridWidth, gridHeight) {
    const grid = [];

    for (let y = 0; y < gridHeight; y++) {
        const row = [];
        for (let x = 0; x < gridWidth; x++) {
            row.push(new Soil('soil'));
        }
        grid.push(row);
    }

    createRiver(grid);
    createLake(grid);

    // Adjust fertility based on proximity to water and plants
    adjustFertilityForPlantsAndWater(grid);

    return grid;
}

function createRiver(grid) {
    const gridHeight = grid.length;
    const gridWidth = grid[0].length;

    // Randomly choose a starting edge for the river
    let startEdge = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
    let x, y;

    if (startEdge === 0) { // Top edge
        x = Math.floor(Math.random() * gridWidth);
        y = 0;
    } else if (startEdge === 1) { // Right edge
        x = gridWidth - 1;
        y = Math.floor(Math.random() * gridHeight);
    } else if (startEdge === 2) { // Bottom edge
        x = Math.floor(Math.random() * gridWidth);
        y = gridHeight - 1;
    } else { // Left edge
        x = 0;
        y = Math.floor(Math.random() * gridHeight);
    }

    let riverWidth = 1 + Math.floor(Math.random() * 3); // Random river width between 1 and 3
    let dx = 0, dy = 0; // Directional deltas

    if (startEdge === 0) dy = 1; // Down
    else if (startEdge === 1) dx = -1; // Left
    else if (startEdge === 2) dy = -1; // Up
    else if (startEdge === 3) dx = 1; // Right

    let curveFactor = 0.5; // Increased curve factor for more pronounced curves

    while (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
        for (let w = -Math.floor(riverWidth / 2); w <= Math.floor(riverWidth / 2); w++) {
            if (x + w >= 0 && x + w < gridWidth) {
                grid[y][x + w].type = 'water';
            }
        }

        // Gradually adjust the direction for flowy curves
        dx += (Math.random() - 0.5) * curveFactor;
        dy += (Math.random() - 0.5) * curveFactor;

        // Normalize the direction to maintain smooth flow
        const magnitude = Math.sqrt(dx * dx + dy * dy);
        dx /= magnitude;
        dy /= magnitude;

        // Move the river based on the current direction
        x += Math.round(dx);
        y += Math.round(dy);

        // Allow the river to exit at any edge
        if (y >= gridHeight || x < 0 || y < 0 || x >= gridWidth) {
            break;
        }

        // Randomly change the river width
        if (Math.random() > 0.8) { // Slightly more frequent width changes
            riverWidth = 1 + Math.floor(Math.random() * 3);
        }
    }
}

function createLake(grid) {
    const gridHeight = grid.length;
    const gridWidth = grid[0].length;
    const lakeCenterX = Math.floor(Math.random() * gridWidth);
    const lakeCenterY = Math.floor(Math.random() * gridHeight);
    const lakeSize = 10 + Math.floor(Math.random() * 10); // Doubled the average lake size

    for (let y = lakeCenterY - lakeSize; y <= lakeCenterY + lakeSize; y++) {
        for (let x = lakeCenterX - lakeSize; x <= lakeCenterX + lakeSize; x++) {
            const distance = Math.sqrt(Math.pow(x - lakeCenterX, 2) + Math.pow(y - lakeCenterY, 2));
            const probability = 1 - (distance / lakeSize);

            if (
                Math.random() < probability * 2 && // Further increased probability for even denser lakes
                x >= 0 && x < gridWidth &&
                y >= 0 && y < gridHeight
            ) {
                grid[y][x].type = 'water';
            }
        }
    }
}

function adjustFertilityForPlantsAndWater(grid) {
    const gridHeight = grid.length;
    const gridWidth = grid[0].length;

    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            if (grid[y][x].type === 'soil') {
                let fertilityBoost = 0;

                // Check surrounding cells for water and plants
                for (let dy = -5; dy <= 5; dy++) {
                    for (let dx = -5; dx <= 5; dx++) {
                        const ny = y + dy;
                        const nx = x + dx;

                        if (
                            ny >= 0 && ny < gridHeight &&
                            nx >= 0 && nx < gridWidth
                        ) {
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            const influence = Math.max(0, 5 - distance); // Influence decreases with distance

                            if (grid[ny][nx].type === 'water') {
                                fertilityBoost += influence * 10; // Water has a strong influence
                            } else if (grid[ny][nx] instanceof Plant) {
                                fertilityBoost += influence * 5; // Plants have a weaker influence
                            }
                        }
                    }
                }

                grid[y][x].fertility = Math.max(0, Math.min(100, grid[y][x].fertility + fertilityBoost - 10)); // Added a base decay of 10
            }
        }
    }
}

export { Soil, generateSoil, adjustFertilityForPlantsAndWater };