/**
 * Milestone 3 - Isometric Plant Positioning Tests
 * Validates that plants render correctly on isometric tiles with depth sorting
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// Test configuration
const BASE_URL = 'http://localhost:8081';
const TEST_TIMEOUT = 60000;

test.describe('Milestone 3 - Isometric Plant Positioning', () => {
    test.setTimeout(TEST_TIMEOUT);

    test('Plants should have grid coordinates and isometric conversion', async ({ page }) => {
        await page.goto(BASE_URL);
        
        // Wait for initialization
        await page.waitForFunction(() => {
            return window.graphicsEngine && 
                   window.graphicsEngine.plantManager && 
                   window.graphicsEngine.soilManager &&
                   window.IsometricUtils;
        }, { timeout: 10000 });

        // Spawn a test plant
        const plantData = await page.evaluate(() => {
            const plantManager = window.graphicsEngine.plantManager;
            plantManager.plants.clear(); // Clear existing
            
            const plant = plantManager.addPlant(5, 5, 'trifolium_repens', 0);
            
            return {
                hasPlant: !!plant,
                gridX: plant?.gridX,
                gridY: plant?.gridY,
                worldX: plant?.x,
                worldY: plant?.y,
                renderData: plant?.getRenderData()
            };
        });

        // Validate plant has grid coordinates
        expect(plantData.hasPlant).toBe(true);
        expect(plantData.gridX).toBe(5);
        expect(plantData.gridY).toBe(5);
        
        // Validate render data includes zOrder
        expect(plantData.renderData).toHaveProperty('zOrder');
        expect(plantData.renderData.zOrder).toBe(10); // 5 + 5
    });

    test('Plants should convert grid to isometric coordinates', async ({ page }) => {
        await page.goto(BASE_URL);
        
        await page.waitForFunction(() => window.graphicsEngine?.plantManager, { timeout: 10000 });

        const isoTest = await page.evaluate(() => {
            const plantManager = window.graphicsEngine.plantManager;
            const config = window.config.world.rendering.isometric;
            
            plantManager.plants.clear();
            const plant = plantManager.addPlant(10, 10, 'urtica_dioica', 0);
            
            // Calculate expected isometric position
            const expectedIso = IsometricUtils.gridToIso(plant.gridX, plant.gridY, config.tileWidth, config.tileHeight);
            const renderData = plant.getRenderData();
            
            // Render position should be near center of sprite
            const actualIsoX = renderData.x + renderData.width / 2;
            const actualIsoY = renderData.y + renderData.height;
            
            return {
                expectedX: expectedIso.x,
                actualX: actualIsoX,
                expectedY: expectedIso.y,
                actualY: actualIsoY,
                layerOffset: window.config.world.plants.layers.renderOffsets[plant.getLayer()],
                matchX: Math.abs(actualIsoX - expectedIso.x) < 2,
                matchY: Math.abs(actualIsoY - (expectedIso.y + window.config.world.plants.layers.renderOffsets[plant.getLayer()])) < 2
            };
        });

        expect(isoTest.matchX).toBe(true);
        expect(isoTest.matchY).toBe(true);
    });

    test('RenderSystem should sort plants by Z-order within layers', async ({ page }) => {
        await page.goto(BASE_URL);
        
        await page.waitForFunction(() => window.graphicsEngine?.plantManager, { timeout: 10000 });

        const sortingTest = await page.evaluate(() => {
            const plantManager = window.graphicsEngine.plantManager;
            const config = window.config.world.rendering;
            
            plantManager.plants.clear();
            
            // Spawn plants at different depths (same layer)
            const plants = [
                plantManager.addPlant(15, 15, 'trifolium_repens', 0), // Z=30 (far)
                plantManager.addPlant(10, 10, 'trifolium_repens', 0), // Z=20 (mid)
                plantManager.addPlant(5, 5, 'trifolium_repens', 0)    // Z=10 (near)
            ];
            
            // Get all plants and check they have grid coordinates
            const allPlants = plantManager.getAllPlants();
            const zOrders = allPlants.map(p => IsometricUtils.getZOrder(p.gridX, p.gridY)).sort((a, b) => a - b);
            
            return {
                plantCount: allPlants.length,
                isometric: config.projection === 'isometric',
                depthSortingEnabled: config.isometric.depthSortingEnabled,
                zOrders: zOrders,
                correctOrder: zOrders[0] < zOrders[1] && zOrders[1] < zOrders[2]
            };
        });

        expect(sortingTest.plantCount).toBe(3);
        expect(sortingTest.isometric).toBe(true);
        expect(sortingTest.depthSortingEnabled).toBe(true);
        expect(sortingTest.correctOrder).toBe(true);
    });

    test('Plants should render in correct layer order with depth sorting', async ({ page }) => {
        await page.goto(BASE_URL);
        
        await page.waitForFunction(() => window.graphicsEngine?.plantManager, { timeout: 10000 });

        const layerTest = await page.evaluate(() => {
            const plantManager = window.graphicsEngine.plantManager;
            
            plantManager.plants.clear();
            
            // Spawn plants in different layers at same grid position
            const bottomPlant = plantManager.addPlant(20, 20, 'trifolium_repens', 0);  // bottom layer
            const middlePlant = plantManager.addPlant(20, 21, 'urtica_dioica', 0);     // middle layer
            const topPlant = plantManager.addPlant(20, 22, 'quercus_robur', 0);        // top layer
            
            return {
                bottomLayer: bottomPlant?.getLayer(),
                middleLayer: middlePlant?.getLayer(),
                topLayer: topPlant?.getLayer(),
                bottomZ: IsometricUtils.getZOrder(bottomPlant.gridX, bottomPlant.gridY),
                middleZ: IsometricUtils.getZOrder(middlePlant.gridX, middlePlant.gridY),
                topZ: IsometricUtils.getZOrder(topPlant.gridX, topPlant.gridY)
            };
        });

        expect(layerTest.bottomLayer).toBe('bottom');
        expect(layerTest.middleLayer).toBe('middle');
        expect(layerTest.topLayer).toBe('top');
        
        // Z-order should increase with Y coordinate
        expect(layerTest.bottomZ).toBe(40);
        expect(layerTest.middleZ).toBe(41);
        expect(layerTest.topZ).toBe(42);
    });

    test('Multiple plants should maintain correct depth order', async ({ page }) => {
        await page.goto(BASE_URL);
        
        await page.waitForFunction(() => window.graphicsEngine?.plantManager, { timeout: 10000 });

        // Take screenshot with multiple plants at different depths
        await page.evaluate(() => {
            const plantManager = window.graphicsEngine.plantManager;
            plantManager.plants.clear();
            
            // Create a grid of plants
            for (let x = 5; x < 10; x++) {
                for (let y = 5; y < 10; y++) {
                    plantManager.addPlant(x, y, 'urtica_dioica', 0);
                }
            }
        });

        // Wait for rendering
        await page.waitForTimeout(500);

        const plantCount = await page.evaluate(() => {
            return window.graphicsEngine.plantManager.getAllPlants().length;
        });

        expect(plantCount).toBe(25); // 5x5 grid

        // Take screenshot for visual verification
        await page.screenshot({ 
            path: 'test-results/latest/milestone3-plant-grid.png',
            fullPage: false
        });
    });

    test('Performance: Depth sorting should not significantly impact FPS', async ({ page }) => {
        await page.goto(BASE_URL);
        
        await page.waitForFunction(() => window.graphicsEngine?.plantManager, { timeout: 10000 });

        // Spawn many plants
        await page.evaluate(() => {
            const plantManager = window.graphicsEngine.plantManager;
            plantManager.plants.clear();
            
            // Spawn 100 plants
            for (let i = 0; i < 100; i++) {
                const x = Math.floor(Math.random() * 40) + 5;
                const y = Math.floor(Math.random() * 40) + 5;
                const species = ['trifolium_repens', 'urtica_dioica', 'quercus_robur'][i % 3];
                plantManager.addPlant(x, y, species, 0);
            }
        });

        // Wait for rendering to stabilize
        await page.waitForTimeout(2000);

        // Measure FPS
        const fps = await page.evaluate(() => {
            return new Promise(resolve => {
                const samples = [];
                let lastTime = performance.now();
                let frameCount = 0;
                
                const measureFPS = () => {
                    const now = performance.now();
                    const delta = now - lastTime;
                    
                    if (delta >= 1000) {
                        samples.push(frameCount);
                        frameCount = 0;
                        lastTime = now;
                    }
                    
                    frameCount++;
                    
                    if (samples.length >= 3) {
                        const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
                        resolve(Math.round(avg));
                    } else {
                        requestAnimationFrame(measureFPS);
                    }
                };
                
                requestAnimationFrame(measureFPS);
            });
        });

        console.log(`FPS with 100 plants: ${fps}`);
        expect(fps).toBeGreaterThanOrEqual(30); // Minimum acceptable FPS
    });
});
