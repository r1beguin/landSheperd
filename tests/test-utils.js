/**
 * Test Utilities for Interactive Testing
 * 
 * Provides helper functions to simulate realistic user interactions
 * in Playwright tests for WebGL canvas applications.
 */

/**
 * Wait for a specific number of render frames
 * @param {Page} page - Playwright page object
 * @param {number} frames - Number of frames to wait (default: 1)
 * @returns {Promise<void>}
 */
async function waitForRenderFrames(page, frames = 1) {
    await page.evaluate((frameCount) => {
        return new Promise(resolve => {
            let counted = 0;
            function waitFrame() {
                counted++;
                if (counted >= frameCount) {
                    resolve();
                } else {
                    requestAnimationFrame(waitFrame);
                }
            }
            requestAnimationFrame(waitFrame);
        });
    }, frames);
}

/**
 * Simulate mouse drag across canvas (for camera panning)
 * @param {Page} page - Playwright page object
 * @param {number} startX - Start X coordinate (canvas pixels)
 * @param {number} startY - Start Y coordinate (canvas pixels)
 * @param {number} endX - End X coordinate (canvas pixels)
 * @param {number} endY - End Y coordinate (canvas pixels)
 * @param {Object} options - Options for drag simulation
 * @param {number} options.steps - Number of intermediate steps (default: 10)
 * @param {number} options.delayMs - Delay between steps in ms (default: 16)
 * @returns {Promise<void>}
 */
async function simulateMouseDrag(page, startX, startY, endX, endY, options = {}) {
    const { steps = 10, delayMs = 16 } = options;
    
    // Get canvas bounding rect to convert to client coordinates
    const rect = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        const rect = canvas.getBoundingClientRect();
        return { left: rect.left, top: rect.top };
    });
    
    const clientStartX = rect.left + startX;
    const clientStartY = rect.top + startY;
    const clientEndX = rect.left + endX;
    const clientEndY = rect.top + endY;
    
    // Start drag
    await page.mouse.move(clientStartX, clientStartY);
    await page.mouse.down();
    
    // Intermediate steps for smooth drag
    for (let i = 1; i <= steps; i++) {
        const progress = i / steps;
        const currentX = clientStartX + (clientEndX - clientStartX) * progress;
        const currentY = clientStartY + (clientEndY - clientStartY) * progress;
        
        await page.mouse.move(currentX, currentY);
        await page.waitForTimeout(delayMs);
    }
    
    // End drag
    await page.mouse.up();
    
    // Wait for render to settle
    await waitForRenderFrames(page, 3);
}

/**
 * Click on canvas at specific coordinates
 * @param {Page} page - Playwright page object
 * @param {number} x - X coordinate in canvas pixels
 * @param {number} y - Y coordinate in canvas pixels
 * @param {Object} options - Click options
 * @param {number} options.button - Mouse button ('left', 'right', 'middle')
 * @param {number} options.clickCount - Number of clicks (default: 1)
 * @returns {Promise<void>}
 */
async function clickOnCanvas(page, x, y, options = {}) {
    const { button = 'left', clickCount = 1 } = options;
    
    // Get canvas bounding rect
    const rect = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        const rect = canvas.getBoundingClientRect();
        return { left: rect.left, top: rect.top };
    });
    
    const clientX = rect.left + x;
    const clientY = rect.top + y;
    
    await page.mouse.click(clientX, clientY, { button, clickCount });
    
    // Wait for render to process click
    await waitForRenderFrames(page, 2);
}

/**
 * Simulate keyboard key press
 * @param {Page} page - Playwright page object
 * @param {string} key - Key to press (e.g., 'ArrowRight', 'Space', 'f')
 * @param {Object} options - Key press options
 * @param {number} options.holdMs - Hold duration in ms (default: 0)
 * @returns {Promise<void>}
 */
async function simulateKeyPress(page, key, options = {}) {
    const { holdMs = 0 } = options;
    
    await page.keyboard.down(key);
    
    if (holdMs > 0) {
        await page.waitForTimeout(holdMs);
    }
    
    await page.keyboard.up(key);
    
    // Wait for render to process key
    await waitForRenderFrames(page, 2);
}

/**
 * Simulate mouse wheel scroll
 * @param {Page} page - Playwright page object
 * @param {number} x - X coordinate in canvas pixels
 * @param {number} y - Y coordinate in canvas pixels
 * @param {number} deltaY - Scroll delta (positive = scroll down/zoom out, negative = scroll up/zoom in)
 * @returns {Promise<void>}
 */
async function simulateScroll(page, x, y, deltaY) {
    // Get canvas bounding rect
    const rect = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        const rect = canvas.getBoundingClientRect();
        return { left: rect.left, top: rect.top };
    });
    
    const clientX = rect.left + x;
    const clientY = rect.top + y;
    
    await page.mouse.move(clientX, clientY);
    await page.mouse.wheel(0, deltaY);
    
    // Wait for render to process zoom
    await waitForRenderFrames(page, 3);
}

/**
 * Advance game time by a specified number of days
 * @param {Page} page - Playwright page object
 * @param {number} days - Number of game days to advance
 * @returns {Promise<Object>} Returns { success: boolean, currentDay: number }
 */
async function advanceGameTime(page, days) {
    return await page.evaluate((daysToAdvance) => {
        if (!window.graphicsEngine || !window.graphicsEngine.timeManager) {
            return { success: false, error: 'TimeManager not available' };
        }
        
        const timeManager = window.graphicsEngine.timeManager;
        const startDay = timeManager.getCurrentDayPrecise();
        
        // Calculate how many milliseconds we need to advance
        const realSecondsPerGameDay = timeManager.realSecondsPerGameDay || 10;
        const currentTimeScale = timeManager.getTimeScale();
        
        if (currentTimeScale === 0) {
            // Temporarily set time scale to fast
            timeManager.setTimeScale(20);
        }
        
        // Calculate delta time needed
        const targetDay = startDay + daysToAdvance;
        const realSecondsNeeded = daysToAdvance * realSecondsPerGameDay / timeManager.getTimeScale();
        const deltaTimeMs = realSecondsNeeded * 1000;
        
        // Update time manager directly
        timeManager.update(deltaTimeMs);
        
        const currentDay = timeManager.getCurrentDayPrecise();
        
        return { 
            success: true, 
            startDay: startDay.toFixed(2),
            currentDay: currentDay.toFixed(2),
            advanced: (currentDay - startDay).toFixed(2)
        };
    }, days);
}

/**
 * Get entity at specific canvas position
 * @param {Page} page - Playwright page object
 * @param {number} x - X coordinate in canvas pixels
 * @param {number} y - Y coordinate in canvas pixels
 * @returns {Promise<Object>} Entity info or null
 */
async function getEntityAtPosition(page, x, y) {
    return await page.evaluate((coords) => {
        if (!window.graphicsEngine) {
            return null;
        }
        
        const canvas = document.querySelector('canvas');
        const rect = canvas.getBoundingClientRect();
        
        // Convert to canvas coordinates
        const canvasX = (coords.x / rect.width) * canvas.width;
        const canvasY = (coords.y / rect.height) * canvas.height;
        
        // Convert to world coordinates
        const worldCoords = window.graphicsEngine.cameraManager.screenToWorld(canvasX, canvasY);
        
        // Check for plant
        const gridCoords = window.graphicsEngine.soilManager.worldToGrid(worldCoords.x, worldCoords.y);
        const plant = window.graphicsEngine.plantManager.getPlantAt(gridCoords.x, gridCoords.y);
        
        if (plant) {
            return {
                type: 'plant',
                position: { x: plant.x, y: plant.y },
                grid: { x: gridCoords.x, y: gridCoords.y },
                stage: plant.currentStage,
                age: plant.age
            };
        }
        
        // Check for soil
        const soil = window.graphicsEngine.soilManager.getSoilAt(gridCoords.x, gridCoords.y);
        if (soil) {
            return {
                type: 'soil',
                grid: { x: gridCoords.x, y: gridCoords.y },
                fertility: soil.fertility,
                isPlantable: soil.isPlantable
            };
        }
        
        return null;
    }, { x, y });
}

/**
 * Get camera state
 * @param {Page} page - Playwright page object
 * @returns {Promise<Object>} Camera state
 */
async function getCameraState(page) {
    return await page.evaluate(() => {
        if (!window.graphicsEngine || !window.graphicsEngine.cameraManager) {
            return null;
        }
        
        const cam = window.graphicsEngine.cameraManager;
        return {
            position: { ...cam.position },
            zoom: cam.zoom,
            bounds: cam.getVisibleBounds()
        };
    });
}

/**
 * Get game metrics for validation
 * @param {Page} page - Playwright page object
 * @returns {Promise<Object>} Game metrics
 */
async function getGameMetrics(page) {
    return await page.evaluate(() => {
        if (!window.graphicsEngine) {
            return null;
        }
        
        const engine = window.graphicsEngine;
        
        return {
            time: {
                currentDay: engine.timeManager?.getCurrentDay() || 0,
                currentDayPrecise: engine.timeManager?.getCurrentDayPrecise() || 0,
                timeScale: engine.timeManager?.getTimeScale() || 0,
                isPaused: engine.timeManager?.isPausedState() || false
            },
            camera: {
                zoom: engine.cameraManager?.zoom || 1,
                position: engine.cameraManager?.position || { x: 0, y: 0 }
            },
            entities: {
                plantCount: engine.plantManager?.plants.size || 0,
                entityCount: engine.entities?.length || 0
            },
            rendering: {
                renderCalls: engine.renderSystem?.getRenderCalls() || 0,
                visibleSoilCells: engine.soilManager?.getVisibleCellsCount() || 0
            }
        };
    });
}

/**
 * Spawn a plant at specific grid coordinates
 * @param {Page} page - Playwright page object
 * @param {number} gridX - Grid X coordinate
 * @param {number} gridY - Grid Y coordinate
 * @returns {Promise<Object>} Result of spawn operation
 */
async function spawnPlantAt(page, gridX, gridY) {
    return await page.evaluate((coords) => {
        if (!window.graphicsEngine || !window.graphicsEngine.plantManager) {
            return { success: false, error: 'PlantManager not available' };
        }
        
        const currentDay = window.graphicsEngine.timeManager?.getCurrentDayPrecise() || 0;
        const plant = window.graphicsEngine.plantManager.addPlant(coords.x, coords.y, 'urtica_dioica', currentDay);
        
        if (plant) {
            return { 
                success: true, 
                plant: {
                    position: { x: plant.x, y: plant.y },
                    stage: plant.currentStage,
                    grid: coords
                }
            };
        }
        
        return { success: false, error: 'Failed to spawn plant' };
    }, { x: gridX, y: gridY });
}

/**
 * Toggle debug overlay
 * @param {Page} page - Playwright page object
 * @returns {Promise<Object>} Debug state
 */
async function toggleDebugOverlay(page) {
    return await page.evaluate(() => {
        if (!window.graphicsEngine || !window.graphicsEngine.debugManager) {
            return { success: false, error: 'DebugManager not available' };
        }
        
        const state = window.graphicsEngine.debugManager.toggleFertilityOverlay();
        
        // Force soil refresh
        if (window.graphicsEngine.soilManager) {
            window.graphicsEngine.soilManager.needsRefresh = true;
            if (window.graphicsEngine.cameraManager) {
                window.graphicsEngine.soilManager.updateVisibleCells(window.graphicsEngine.cameraManager);
            }
        }
        
        return { success: true, overlayEnabled: state };
    });
}

/**
 * Wait for condition with timeout
 * @param {Page} page - Playwright page object
 * @param {Function} condition - Condition function to evaluate
 * @param {Object} options - Options
 * @param {number} options.timeout - Timeout in ms (default: 5000)
 * @param {number} options.interval - Check interval in ms (default: 100)
 * @returns {Promise<boolean>}
 */
async function waitForCondition(page, condition, options = {}) {
    const { timeout = 5000, interval = 100 } = options;
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
        const result = await page.evaluate(condition);
        if (result) {
            return true;
        }
        await page.waitForTimeout(interval);
    }
    
    return false;
}

/**
 * Compare two canvas pixel data arrays
 * @param {Uint8ClampedArray} data1 - First image data
 * @param {Uint8ClampedArray} data2 - Second image data
 * @returns {Object} Comparison result with difference percentage
 */
function compareImageData(data1, data2) {
    if (data1.length !== data2.length) {
        return { 
            comparable: false, 
            error: 'Image data length mismatch' 
        };
    }
    
    let differentPixels = 0;
    const totalPixels = data1.length / 4; // RGBA
    
    for (let i = 0; i < data1.length; i += 4) {
        const r1 = data1[i];
        const g1 = data1[i + 1];
        const b1 = data1[i + 2];
        const a1 = data1[i + 3];
        
        const r2 = data2[i];
        const g2 = data2[i + 1];
        const b2 = data2[i + 2];
        const a2 = data2[i + 3];
        
        // Consider pixels different if any channel differs by more than threshold
        const threshold = 5;
        if (Math.abs(r1 - r2) > threshold ||
            Math.abs(g1 - g2) > threshold ||
            Math.abs(b1 - b2) > threshold ||
            Math.abs(a1 - a2) > threshold) {
            differentPixels++;
        }
    }
    
    const differencePercent = (differentPixels / totalPixels) * 100;
    
    return {
        comparable: true,
        differentPixels,
        totalPixels,
        differencePercent: differencePercent.toFixed(2),
        identical: differentPixels === 0
    };
}

/**
 * Sample ecosystem metrics (soil nutrients, plant population, etc.)
 * @param {Page} page - Playwright page object
 * @returns {Promise<Object>} Ecosystem metrics
 */
async function sampleEcosystemMetrics(page) {
    return await page.evaluate(() => {
        const engine = window.graphicsEngine;
        if (!engine || !engine.soilManager || !engine.plantManager || !engine.timeManager) {
            return { success: false, error: 'Required managers not available' };
        }
        
        const soilManager = engine.soilManager;
        const plantManager = engine.plantManager;
        const timeManager = engine.timeManager;
        const weatherManager = engine.weatherManager;
        
        let totalN = 0, totalP = 0, totalK = 0, totalOM = 0, totalFertility = 0;
        let count = 0;
        let minN = Infinity, maxN = -Infinity;
        let minP = Infinity, maxP = -Infinity;
        let minK = Infinity, maxK = -Infinity;
        let minOM = Infinity, maxOM = -Infinity;
        
        // Sample all soil cells
        soilManager.soilGrid.forEach(soil => {
            totalN += soil.nitrogen;
            totalP += soil.phosphorus;
            totalK += soil.potassium;
            totalOM += soil.organicMatter;
            totalFertility += soil.fertility;
            
            minN = Math.min(minN, soil.nitrogen);
            maxN = Math.max(maxN, soil.nitrogen);
            minP = Math.min(minP, soil.phosphorus);
            maxP = Math.max(maxP, soil.phosphorus);
            minK = Math.min(minK, soil.potassium);
            maxK = Math.max(maxK, soil.potassium);
            minOM = Math.min(minOM, soil.organicMatter);
            maxOM = Math.max(maxOM, soil.organicMatter);
            
            count++;
        });
        
        const avgN = totalN / count;
        const avgP = totalP / count;
        const avgK = totalK / count;
        const avgOM = totalOM / count;
        const avgFertility = totalFertility / count;
        
        return {
            success: true,
            gameDay: Math.floor(timeManager.getCurrentDayPrecise() * 10) / 10, // 1 decimal place
            averages: {
                nitrogen: Math.round(avgN * 10) / 10,
                phosphorus: Math.round(avgP * 10) / 10,
                potassium: Math.round(avgK * 10) / 10,
                organicMatter: Math.round(avgOM * 10) / 10,
                fertility: Math.round(avgFertility * 10) / 10
            },
            ranges: {
                nitrogen: { min: Math.round(minN * 10) / 10, max: Math.round(maxN * 10) / 10 },
                phosphorus: { min: Math.round(minP * 10) / 10, max: Math.round(maxP * 10) / 10 },
                potassium: { min: Math.round(minK * 10) / 10, max: Math.round(maxK * 10) / 10 },
                organicMatter: { min: Math.round(minOM * 10) / 10, max: Math.round(maxOM * 10) / 10 }
            },
            plantCount: plantManager.plants.size,
            weather: weatherManager?.getCurrentWeather() || 'unknown',
            cellsSampled: count
        };
    });
}

/**
 * Advance game time with deterministic timeScale
 * @param {Page} page - Playwright page object
 * @param {number} days - Number of game days to advance
 * @param {Object} options - Options
 * @param {number} options.timeScale - Override timeScale (default: 1.0)
 * @returns {Promise<Object>} Result with days advanced
 */
async function advanceGameTimeDeterministic(page, days, options = {}) {
    const { timeScale = 1.0 } = options;
    
    return await page.evaluate(({ daysToAdvance, targetTimeScale }) => {
        const engine = window.graphicsEngine;
        if (!engine || !engine.timeManager) {
            return { success: false, error: 'TimeManager not available' };
        }
        
        const timeManager = engine.timeManager;
        const dayBefore = timeManager.getCurrentDayPrecise();
        
        // Set timeScale for deterministic advancement
        const originalTimeScale = timeManager.getTimeScale();
        timeManager.setTimeScale(targetTimeScale);
        
        // Calculate delta time needed
        const realSecondsPerGameDay = timeManager.realSecondsPerGameDay || 10;
        const deltaTimeMs = daysToAdvance * realSecondsPerGameDay * 1000;
        
        // Update engine
        engine.update(deltaTimeMs);
        
        const dayAfter = timeManager.getCurrentDayPrecise();
        
        // Restore original timeScale
        timeManager.setTimeScale(originalTimeScale);
        
        return {
            success: true,
            dayBefore: Math.round(dayBefore * 10) / 10,
            dayAfter: Math.round(dayAfter * 10) / 10,
            daysAdvanced: Math.round((dayAfter - dayBefore) * 10) / 10
        };
    }, { daysToAdvance: days, targetTimeScale: timeScale });
}

/**
 * Cycle nutrient overlay to specific nutrient type
 * @param {Page} page - Playwright page object
 * @param {string} nutrientType - 'nitrogen', 'phosphorus', 'potassium', 'organicMatter', or 'off'
 * @returns {Promise<Object>} Result
 */
async function setNutrientOverlay(page, nutrientType) {
    return await page.evaluate((type) => {
        const engine = window.graphicsEngine;
        if (!engine || !engine.overlayManager) {
            return { success: false, error: 'OverlayManager not available' };
        }
        
        const overlayManager = engine.overlayManager;
        const soilManager = engine.soilManager;
        
        // Map type to overlay state
        const typeMap = {
            'off': null,
            'nitrogen': 'nitrogen',
            'phosphorus': 'phosphorus',
            'potassium': 'potassium',
            'organicMatter': 'organicMatter'
        };
        
        const targetState = typeMap[type];
        if (targetState === undefined) {
            return { success: false, error: `Invalid nutrient type: ${type}` };
        }
        
        // Set overlay state directly
        overlayManager.currentNutrient = targetState;
        
        // Force soil refresh
        soilManager.needsRefresh = true;
        if (engine.cameraManager) {
            soilManager.updateVisibleCells(engine.cameraManager);
        }
        
        return { 
            success: true, 
            currentOverlay: targetState 
        };
    }, nutrientType);
}

module.exports = {
    waitForRenderFrames,
    simulateMouseDrag,
    clickOnCanvas,
    simulateKeyPress,
    simulateScroll,
    advanceGameTime,
    getEntityAtPosition,
    getCameraState,
    getGameMetrics,
    spawnPlantAt,
    toggleDebugOverlay,
    waitForCondition,
    compareImageData,
    sampleEcosystemMetrics,
    advanceGameTimeDeterministic,
    setNutrientOverlay
};
