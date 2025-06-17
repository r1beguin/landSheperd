import { Soil, generateSoil, triggerRandomRipple, updateRipples, getRipples, resetRipples, decaySoilFertility } from '../systems/soil.js';
import { Character } from '../entities/character.js';
import { Tree } from '../entities/tree.js';
import { PLANT_TYPES } from '../entities/plants.js';
import { setupZoomControls, setupPlantTreeControl, setupCharacterMoveControl } from './controls.js';
import { Flower } from '../entities/flower.js';
import { updateWindIntensity, updateBurstFrequency } from '../systems/wind.js';
import { Squirrel } from '../animals/animals.js';
import { Bee } from '../animals/bee.js';
import { countFrame } from '../debug.js';
import { setupPixi, renderWorld } from '../renderers/pixiRenderer.js';

const PIXEL_SIZE = 4; // Quadruple resolution (was 8)
const GRID_WIDTH = 200; // Double width (was 100)
const GRID_HEIGHT = 160; // Double height (was 80)

const canvas = document.getElementById('gameCanvas');

canvas.width = GRID_WIDTH * PIXEL_SIZE;
canvas.height = GRID_HEIGHT * PIXEL_SIZE;

let grid = [];
let character = new Character(Math.floor(GRID_WIDTH / 2), Math.floor(GRID_HEIGHT / 2));
let trees = [];
let flowers = [];
let bees = [];
let lastTime = 0;
let animationId;
let isTimeStopped = false;
let zoom = 1;
let growTimer = 0;
let spawnTreeTimer = 0;
let beeSpawnTimer = 0;
let windPhase = 0;
let windIntensity = 1;
let windBurstFrequency = 1;
let decayTimer = 0;

const windIntensitySlider = document.getElementById('wind-intensity');
const burstFrequencySlider = document.getElementById('burst-frequency');

// Listen for slider changes from debug.js
window.addEventListener('windIntensityChanged', (e) => {
    windIntensity = e.detail;
});
window.addEventListener('windBurstFrequencyChanged', (e) => {
    windBurstFrequency = e.detail;
});

if (windIntensitySlider) {
    windIntensitySlider.addEventListener('input', (event) => {
        windIntensity = event.target.value / 100; // Normalize to 0-1
        updateWindIntensity(windIntensity);
        window.dispatchEvent(new CustomEvent('windIntensityChanged', { detail: windIntensity }));
    });
    windIntensity = windIntensitySlider.value / 100;
}
if (burstFrequencySlider) {
    burstFrequencySlider.addEventListener('input', (event) => {
        windBurstFrequency = event.target.value / 100; // Normalize to 0-1
        updateBurstFrequency(windBurstFrequency);
        window.dispatchEvent(new CustomEvent('windBurstFrequencyChanged', { detail: windBurstFrequency }));
    });
    windBurstFrequency = burstFrequencySlider.value / 100;
}

let backgroundCanvas = document.createElement('canvas');
let backgroundCtx = backgroundCanvas.getContext('2d');
backgroundCanvas.width = GRID_WIDTH * PIXEL_SIZE;
backgroundCanvas.height = GRID_HEIGHT * PIXEL_SIZE;

// PixiJS setup
setupPixi('gameCanvas', GRID_WIDTH * PIXEL_SIZE, GRID_HEIGHT * PIXEL_SIZE);

setupZoomControls(canvas, (newZoom) => {
    zoom = newZoom;
    renderGame();
});

setupPlantTreeControl(
    canvas,
    grid,
    drawStaticBackground,
    renderGame,
    PIXEL_SIZE,
    { get value() { return zoom; } },
    (tree) => {
        tree.onDeath = (x, y) => increaseFertilityAround(x, y, 10, 0.75);
        tree.onFertilityBoost = (x, y, radius, percent) => increaseFertilityAround(x, y, radius, percent);
        trees.push(tree);
    }
);

setupCharacterMoveControl(
    canvas,
    character,
    PIXEL_SIZE,
    { get value() { return zoom; } }
);

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / zoom;
    const mouseY = (e.clientY - rect.top) / zoom;
    const cellX = Math.floor(mouseX / PIXEL_SIZE);
    const cellY = Math.floor(mouseY / PIXEL_SIZE);
    if (grid[cellY] && grid[cellY][cellX] && grid[cellY][cellX].type === 'soil') {
        const tree = new Tree('oak', PLANT_TYPES.oak, cellX, cellY);
        tree.onDeath = (x, y) => increaseFertilityAround(x, y, 10, 0.75);
        tree.onFertilityBoost = (x, y, radius, percent) => increaseFertilityAround(x, y, radius, percent);
        trees.push(tree);
        drawStaticBackground();
        renderGame();
    }
});

window.addEventListener('toggleTime', (event) => {
    isTimeStopped = event.detail;
});

function drawStaticBackground() {
    backgroundCtx.clearRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const cell = grid[y][x];
            if (cell instanceof Soil) {
                backgroundCtx.fillStyle = cell.type === 'water' ? '#1E90FF' : `rgb(${Math.floor((100 - cell.fertility) * 1.2 + 50)}, ${Math.floor((100 - cell.fertility) * 0.6 + 25)}, 0)`;
                backgroundCtx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
            }
        }
    }
}

function increaseFertilityAround(x, y, radius, percent) {
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            // Circle with irregular edge
            const irregular = 0.85 + Math.random() * 0.3; // 0.85 to 1.15
            if (
                dist <= radius * irregular &&
                nx >= 0 && nx < GRID_WIDTH &&
                ny >= 0 && ny < GRID_HEIGHT &&
                grid[ny][nx] && grid[ny][nx].type === 'soil'
            ) {
                grid[ny][nx].fertility = Math.min(100, grid[ny][nx].fertility * (1 + percent));
                grid[ny][nx].lastFertilityBoost = Date.now();
            }
        }
    }
    drawStaticBackground();
}

function updateTreeWindAnimation(globalWindPhase) {
    for (const tree of trees) {
        if (!tree.isDead && tree.hasLeaves) {
            const burstMod = 0.5 + windBurstFrequency * 2.5; // Range: 0.5 to 3
            tree.updateLeafWindOffsets(globalWindPhase * burstMod, windIntensity);
        }
    }
}

function initializeGrid() {
    grid = generateSoil(GRID_WIDTH, GRID_HEIGHT);
    resetRipples();
    drawStaticBackground();
    // Add one procedural tree in the center for demo
    trees = [new Tree('oak', PLANT_TYPES.oak, Math.floor(GRID_WIDTH / 2), Math.floor(GRID_HEIGHT / 2) + 8)];
    for (const tree of trees) {
        tree.onDeath = (x, y) => increaseFertilityAround(x, y, 10, 0.75);
        tree.onFertilityBoost = (x, y, radius, percent) => increaseFertilityAround(x, y, radius, percent);
    }
    flowers = [];
}

function renderGame() {
    renderWorld(grid, trees, flowers, bees, character, PIXEL_SIZE);
}

function gameLoop(currentTime) {
    if (isTimeStopped) {
        animationId = requestAnimationFrame(gameLoop);
        return;
    }
    if (!lastTime) lastTime = currentTime;
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;
    // Grow trees every second
    growTimer += deltaTime;
    if (growTimer >= 1) {
        for (const tree of trees) {
            tree.grow();
            if (tree.isDead && tree.onDeath) {
                tree.onDeath(tree.x, tree.y);
                tree.onDeath = null; // Prevent multiple triggers
            }
        }
        growTimer = 0;
    }
    // Tree auto-spawn every minute
    spawnTreeTimer += deltaTime;
    if (spawnTreeTimer >= 30) {
        spawnTreeTimer = 0;
        // Find all 100% fertility soil cells
        const fertileCells = [];
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                if (grid[y][x] && grid[y][x].type === 'soil' && grid[y][x].fertility === 100) {
                    fertileCells.push({ x, y });
                }
            }
        }
        // Spawn 1 tree
        if (fertileCells.length > 0) {
            const idx = Math.floor(Math.random() * fertileCells.length);
            const { x, y } = fertileCells[idx];
            const tree = new Tree('oak', PLANT_TYPES.oak, x, y);
            tree.onDeath = (tx, ty) => increaseFertilityAround(tx, ty, 10, 0.75);
            tree.onFertilityBoost = (tx, ty, radius, percent) => increaseFertilityAround(tx, ty, radius, percent);
            trees.push(tree);
            drawStaticBackground();
            renderGame();
        }
        // Spawn flowers proportional to 100% fertility surface
        const flowerCount = Math.max(1, Math.min(20, Math.floor(fertileCells.length / 30)));
        for (let i = 0; i < flowerCount && fertileCells.length > 0; i++) {
            const idx = Math.floor(Math.random() * fertileCells.length);
            const { x, y } = fertileCells.splice(idx, 1)[0];
            flowers.push(new Flower(x, y));
        }
    }
    // Bee spawn logic: every 60s, spawn a bee from each mature tree
    beeSpawnTimer += deltaTime;
    if (beeSpawnTimer >= 60) {
        beeSpawnTimer = 0;
        // Only spawn bees if there are at least 10 flowers per mature tree
        const matureTrees = trees.filter(tree => tree.adultPhase && !tree.isDead);
        if (flowers.length >= 10 * matureTrees.length) {
            for (const tree of matureTrees) {
                // Pick 10 random flowers for the bee to visit
                const shuffled = flowers.slice().sort(() => Math.random() - 0.5);
                const beeFlowers = shuffled.slice(0, 10);
                bees.push(new Bee(
                    tree.x,
                    tree.y,
                    beeFlowers,
                    (flower, bee) => {
                        flowers = flowers.filter(f => f !== flower);
                        if (Math.random() < 0.1) {
                            const t = new Tree('oak', PLANT_TYPES.oak, flower.x, flower.y);
                            t.onDeath = (x, y) => increaseFertilityAround(x, y, 10, 0.75);
                            t.onFertilityBoost = (x, y, radius, percent) => increaseFertilityAround(x, y, radius, percent);
                            trees.push(t);
                        }
                    },
                    (bee) => {
                        bees = bees.filter(b => b !== bee);
                    }
                ));
                // Remove the flowers assigned to this bee from the pool for the next bee
                flowers = flowers.filter(f => !beeFlowers.includes(f));
            }
        }
    }
    // Update bees
    for (const bee of bees.slice()) {
        bee.update(deltaTime);
    }
    // Remove flowers on low fertility cells
    flowers = flowers.filter(flower => {
        const cell = grid[flower.y] && grid[flower.y][flower.x];
        return cell && cell.fertility > 50;
    });
    // Less frequent ripple
    if (Math.random() < 0.01) triggerRandomRipple(grid);
    updateRipples();
    windPhase += 0.04; // Base wind speed
    updateTreeWindAnimation(windPhase);
    decayTimer += deltaTime;
    if (decayTimer >= 10) {
        decaySoilFertility(grid, trees);
        decayTimer = 0;
    }
    character.update(deltaTime);
    renderGame();
    countFrame();
    animationId = requestAnimationFrame(gameLoop);
}

function init() {
    initializeGrid();
    renderGame();
    requestAnimationFrame(gameLoop);
}

window.onload = init;