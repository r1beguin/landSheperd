import { Plant, PLANT_TYPES } from './plants.js';
import { updateWindState, applyWindToPlants } from './wind.js';
import { Soil, generateSoil, adjustFertilityForPlantsAndWater } from './soil.js';
import { Squirrel } from './animals.js';

const PIXEL_SIZE = 8;
const GRID_WIDTH = 100;
const GRID_HEIGHT = 80;

const SOIL_COLOR = "#8B4513";
const PLANT_COLOR = "#228B22";

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = GRID_WIDTH * PIXEL_SIZE; // Set to full width
canvas.height = GRID_HEIGHT * PIXEL_SIZE; // Set to full height

let grid = [];
let squirrels = [];
let dirtyRegions = [];
let lastTime = 0;
let animationId;
let isTimeStopped = false;

window.addEventListener('toggleTime', (event) => {
    isTimeStopped = event.detail;
});

window.addEventListener('addSquirrel', () => {
    const randomX = Math.floor(Math.random() * GRID_WIDTH);
    const randomY = Math.floor(Math.random() * GRID_HEIGHT);
    if (grid[randomY][randomX] instanceof Plant) {
        squirrels.push(new Squirrel(randomX, randomY));
    }
});

window.addEventListener('removeSquirrel', () => {
    if (squirrels.length > 0) {
        squirrels.pop();
    }
});

function Cell(type) {
    this.type = type;
    this.age = 0;
    this.health = 100;
    this.windOffset = 0;
    this.windSpeed = Math.random() * 0.2 + 0.1;
    this.maxWindOffset = Math.random() * 0.7 + 0.3;
}

function initializeGrid() {
    grid = generateSoil(GRID_WIDTH, GRID_HEIGHT);

    const numClusters = 15;

    for (let i = 0; i < numClusters; i++) {
        const centerX = Math.floor(Math.random() * GRID_WIDTH);
        const centerY = Math.floor(Math.random() * GRID_HEIGHT);

        const forestSize = 5 + Math.floor(Math.random() * 15);

        createForestCluster(centerX, centerY, forestSize);
    }

    // Recalculate fertility after adding plants
    adjustFertilityForPlantsAndWater(grid);

    // Add squirrels to random tree locations
    for (let i = 0; i < 5; i++) { // Add 5 squirrels
        const randomX = Math.floor(Math.random() * GRID_WIDTH);
        const randomY = Math.floor(Math.random() * GRID_HEIGHT);
        if (grid[randomY][randomX] instanceof Plant) {
            squirrels.push(new Squirrel(randomX, randomY));
        }
    }
}

function createForestCluster(centerX, centerY, size) {
    const species = Object.keys(PLANT_TYPES);

    for (let y = centerY - size; y <= centerY + size; y++) {
        for (let x = centerX - size; x <= centerX + size; x++) {
            const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
            const probability = 1 - (distance / size);

            if (Math.random() < probability && x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
                const randomSpecies = species[Math.floor(Math.random() * species.length)];
                grid[y][x] = new Plant(randomSpecies, PLANT_TYPES[randomSpecies]);
                grid[y][x].age = Math.floor(Math.random() * 5);
                markDirtyRegion(x, y);
            }
        }
    }
}

function markDirtyRegion(x, y) {
    dirtyRegions.push({ x, y });
}

function initializeOffscreenCanvas() {
    // Draw static elements (e.g., soil and water) on the grid
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const cell = grid[y][x];

            if (cell instanceof Soil) {
                if (cell.type === 'water') {
                    ctx.fillStyle = '#1E90FF';
                } else {
                    const fertilityFactor = Math.floor((100 - cell.fertility) * 1.2 + 50);
                    ctx.fillStyle = `rgb(${fertilityFactor}, ${fertilityFactor / 2}, 0)`;
                }
                ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
            }
        }
    }
}

// Revert to a single canvas rendering approach for simplicity and performance
function renderGame() {
    // Clear the main canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Render the grid (soil, water, and plants)
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const cell = grid[y][x];

            if (cell instanceof Soil) {
                ctx.fillStyle = cell.type === 'water' ? '#1E90FF' : `rgb(${Math.floor((100 - cell.fertility) * 1.2 + 50)}, ${Math.floor((100 - cell.fertility) * 0.6 + 25)}, 0)`;
                ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
            } else if (cell instanceof Plant) {
                // Use windOffset for plant animation
                ctx.fillStyle = cell.color;
                ctx.fillRect(
                    Math.round(x * PIXEL_SIZE + (cell.windOffset || 0)),
                    Math.round(y * PIXEL_SIZE),
                    PIXEL_SIZE,
                    PIXEL_SIZE
                );
            }
        }
    }

    // Render squirrels on top of the grid
    for (const squirrel of squirrels) {
        ctx.fillStyle = squirrel.color;
        ctx.fillRect(
            Math.round(squirrel.x * PIXEL_SIZE),
            Math.round(squirrel.y * PIXEL_SIZE),
            PIXEL_SIZE,
            PIXEL_SIZE
        );
    }
}

function gameLoop(currentTime) {
    if (isTimeStopped) {
        animationId = requestAnimationFrame(gameLoop);
        return;
    }

    if (!lastTime) lastTime = currentTime;

    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    updateWindState(deltaTime);
    applyWindToPlants(grid, deltaTime);

    // Update squirrels
    for (const squirrel of squirrels) {
        squirrel.update(grid, deltaTime);
    }

    renderGame();
    animationId = requestAnimationFrame(gameLoop);
}

function init() {
    initializeGrid();
    initializeOffscreenCanvas();
    requestAnimationFrame(gameLoop);
}

window.onload = init;