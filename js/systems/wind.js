import { Plant } from '../entities/plants.js';

const WIND_MIN_INTENSITY = 0.3; 
const WIND_MAX_INTENSITY = 5; 
const WIND_MIN_REST = 10;
const WIND_MAX_REST = 3000;

let windActive = true; // Changed from const to let to allow reassignment
let windTime = 0;

let currentBurstFrequency = (WIND_MIN_REST + WIND_MAX_REST) / 2;
let nextWindChange = getRandomWindRestTime();

let currentWindIntensity = (WIND_MIN_INTENSITY + WIND_MAX_INTENSITY) / 2;

function updateWindIntensity(intensity) {
    currentWindIntensity = WIND_MIN_INTENSITY + intensity * (WIND_MAX_INTENSITY - WIND_MIN_INTENSITY);
}

function updateBurstFrequency(frequency) {
    currentBurstFrequency = WIND_MIN_REST + frequency * (WIND_MAX_REST - WIND_MIN_REST);
    if (windActive) {
        nextWindChange = getRandomWindRestTime(); // Recalculate next wind change only if wind is active
    }
}

function getRandomWindRestTime() {
    return Math.random() * (currentBurstFrequency - WIND_MIN_REST) + WIND_MIN_REST;
}

function toggleWind() {
    windActive = !windActive;
    nextWindChange = getRandomWindRestTime();
}

function setWindActive(state) {
    windActive = state;
}

function updateWindState(deltaTime) {
    windTime += deltaTime;

    if (windTime > nextWindChange) {
        toggleWind();
        windTime = 0;
        nextWindChange = getRandomWindRestTime(); // Dynamically recalculate next wind change
    }
}

function applyWindToPlants(grid, deltaTime) {
    if (!windActive) {
        fadeOutWindEffect(grid, deltaTime);
        return;
    }
    const time = performance.now() * 0.001;
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            const cell = grid[y][x];
            if (cell instanceof Plant) {
                const baseWindFactor = 1.5 * Math.sin(time + x * 0.1);
                cell.windOffset = baseWindFactor * cell.maxWindOffset * currentWindIntensity;
            }
        }
    }
}

function fadeOutWindEffect(grid, deltaTime) {
    const fadeSpeed = 2.0;
    
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            const cell = grid[y][x];
            if (cell.type === 'plant' && cell.windOffset !== 0) {
                if (Math.abs(cell.windOffset) < 0.05) {
                    cell.windOffset = 0;
                } else {
                    cell.windOffset *= (1 - fadeSpeed * deltaTime);
                }
            }
        }
    }
}

export { updateWindState, applyWindToPlants, windActive, setWindActive, updateWindIntensity, updateBurstFrequency };