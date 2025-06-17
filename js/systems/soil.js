import { Plant } from '../entities/plants.js';

class Soil {
    constructor(type, fertility = 60 + Math.random() * 10) { // Uniform fertility: 60-70
        this.type = type; // 'soil' or 'water'
        this.fertility = fertility; // Fertility percentage (0-100)
    }
}

// Add a baseline fertility constant
const BASELINE_FERTILITY_MIN = 10;
const BASELINE_FERTILITY_MAX = 30;

function getRandomBaselineFertility() {
    return BASELINE_FERTILITY_MIN + Math.random() * (BASELINE_FERTILITY_MAX - BASELINE_FERTILITY_MIN);
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

    // Adjust fertility based on proximity to water
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

    let riverWidth = 2 + Math.floor(Math.random() * 6); // Quadruple: width 2-7 (was 1-3)
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
            riverWidth = 2 + Math.floor(Math.random() * 6); // Quadruple: width 2-7
        }
    }
}

function createLake(grid) {
    const gridHeight = grid.length;
    const gridWidth = grid[0].length;
    const lakeCenterX = Math.floor(Math.random() * gridWidth);
    const lakeCenterY = Math.floor(Math.random() * gridHeight);
    const lakeSize = 20 + Math.floor(Math.random() * 20); // Quadruple: radius 20-39 (was 10-19)

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

                // Even larger area of effect: radius 16, much more gradual falloff
                for (let dy = -16; dy <= 16; dy++) {
                    for (let dx = -16; dx <= 16; dx++) {
                        const ny = y + dy;
                        const nx = x + dx;
                        if (
                            ny >= 0 && ny < gridHeight &&
                            nx >= 0 && nx < gridWidth
                        ) {
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            if (distance <= 16 && grid[ny][nx].type === 'water') {
                                // Much more gradual falloff: even slower exponential decay
                                const influence = Math.exp(-distance * 0.35); // 0.07 = very slow decay
                                fertilityBoost += influence * 8; // Slightly reduced per-cell influence for balance
                            }
                        }
                    }
                }
                grid[y][x].fertility = Math.max(0, Math.min(100, grid[y][x].fertility + fertilityBoost - 10));
            }
        }
    }
}

// Add a decay function for soil fertility
function decaySoilFertility(grid, trees, now = Date.now()) {
    const decayInterval = 5 * 60 * 1000; // 5 minutes in ms
    const decayStep = 0.5; // Amount to decay per check (tune as needed)
    const checkRadius = 12; // Radius to check for water or trees
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[0].length; x++) {
            const cell = grid[y][x];
            if (cell.type !== 'soil') continue;
            // If recently boosted, skip decay
            if (cell.lastFertilityBoost && now - cell.lastFertilityBoost < decayInterval) continue;
            // Check for water nearby
            let hasWaterOrTree = false;
            for (let dy = -checkRadius; dy <= checkRadius && !hasWaterOrTree; dy++) {
                for (let dx = -checkRadius; dx <= checkRadius && !hasWaterOrTree; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx >= 0 && nx < grid[0].length && ny >= 0 && ny < grid.length) {
                        if (grid[ny][nx].type === 'water') {
                            hasWaterOrTree = true;
                        }
                        // Check for tree trunk at this cell
                        for (const tree of trees) {
                            if (!tree.isDead && Math.abs(tree.x - nx) < 2 && Math.abs(tree.y - ny) < tree.height) {
                                hasWaterOrTree = true;
                                break;
                            }
                        }
                    }
                }
            }
            if (!hasWaterOrTree) {
                if (cell._baselineFertility === undefined) {
                    cell._baselineFertility = getRandomBaselineFertility();
                }
                if (cell.fertility > cell._baselineFertility) {
                    cell.fertility = Math.max(cell._baselineFertility, cell.fertility - decayStep);
                }
            }
        }
    }
}

// Ripple management for water cells
let ripples = [];

function triggerRandomRipple(grid) {
    // Find all water cells
    const waterCells = [];
    const gridHeight = grid.length;
    const gridWidth = grid[0].length;
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            if (grid[y][x].type === 'water') {
                waterCells.push({ x, y });
            }
        }
    }
    if (waterCells.length > 0) {
        const { x, y } = waterCells[Math.floor(Math.random() * waterCells.length)];
        ripples.push({ x, y, radius: 0, alpha: 0.5 });
    }
}

function updateRipples() {
    for (let i = ripples.length - 1; i >= 0; i--) {
        ripples[i].radius += 0.2; // Slower expansion
        ripples[i].alpha *= 0.98; // Slower fade
        if (ripples[i].alpha < 0.05 || ripples[i].radius > 14) {
            ripples.splice(i, 1);
        }
    }
}

function getRipples() {
    return ripples;
}

function resetRipples() {
    ripples = [];
}

export { Soil, generateSoil, adjustFertilityForPlantsAndWater, triggerRandomRipple, updateRipples, getRipples, resetRipples, decaySoilFertility, BASELINE_FERTILITY_MIN, BASELINE_FERTILITY_MAX };