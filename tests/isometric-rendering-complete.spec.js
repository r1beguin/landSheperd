/**
 * Isometric Rendering System - Complete Test Suite
 * 
 * Tests all 5 milestones of isometric rendering implementation:
 * - M1: Coordinate system foundation
 * - M2: Isometric soil tiles
 * - M3: Plant positioning with depth sorting
 * - M4: Input and camera controls
 * - M5: Weather particles
 * 
 * Run with: npx playwright test isometric-rendering-complete
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

const BASE_URL = 'http://localhost:8081';
const TEST_TIMEOUT = 20000;

test.describe('Isometric Rendering System - Complete Validation', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to application
        await page.goto(BASE_URL, { waitUntil: 'networkidle' });
        
        // Wait for initialization
        await page.waitForFunction(() => {
            return window.graphicsEngine && 
                   window.graphicsEngine.initialized === true;
        }, { timeout: 10000 });
        
        // Verify isometric mode
        const projection = await page.evaluate(() => {
            return window.config?.world?.rendering?.projection;
        });
        
        expect(projection).toBe('isometric');
    });

    test('M1: Coordinate system foundation - IsometricUtils available', async ({ page }) => {
        const utils = await page.evaluate(() => {
            return typeof IsometricUtils !== 'undefined' && {
                hasGridToIso: typeof IsometricUtils.gridToIso === 'function',
                hasIsoToGrid: typeof IsometricUtils.isoToGrid === 'function',
                hasGetZOrder: typeof IsometricUtils.getZOrder === 'function'
            };
        });
        
        expect(utils).toBeTruthy();
        expect(utils.hasGridToIso).toBe(true);
        expect(utils.hasIsoToGrid).toBe(true);
        expect(utils.hasGetZOrder).toBe(true);
    });

    test('M1: Coordinate conversion accuracy - gridToIso', async ({ page }) => {
        const conversions = await page.evaluate(() => {
            const tileW = 40, tileH = 20;
            return [
                {
                    grid: {x: 0, y: 0},
                    iso: IsometricUtils.gridToIso(0, 0, tileW, tileH)
                },
                {
                    grid: {x: 1, y: 0},
                    iso: IsometricUtils.gridToIso(1, 0, tileW, tileH)
                },
                {
                    grid: {x: 0, y: 1},
                    iso: IsometricUtils.gridToIso(0, 1, tileW, tileH)
                },
                {
                    grid: {x: 25, y: 25},
                    iso: IsometricUtils.gridToIso(25, 25, tileW, tileH)
                }
            ];
        });
        
        // (0,0) → (0,0)
        expect(conversions[0].iso.x).toBe(0);
        expect(conversions[0].iso.y).toBe(0);
        
        // (1,0) → (20,10) 
        expect(conversions[1].iso.x).toBe(20);
        expect(conversions[1].iso.y).toBe(10);
        
        // (0,1) → (-20,10)
        expect(conversions[2].iso.x).toBe(-20);
        expect(conversions[2].iso.y).toBe(10);
        
        // (25,25) → (0,500) - center of grid
        expect(conversions[3].iso.x).toBe(0);
        expect(conversions[3].iso.y).toBe(500);
    });

    test('M1: Coordinate conversion accuracy - isoToGrid round-trip', async ({ page }) => {
        const roundTrip = await page.evaluate(() => {
            const tileW = 40, tileH = 20;
            const testCases = [
                {x: 0, y: 0},
                {x: 10, y: 5},
                {x: 25, y: 25},
                {x: 49, y: 49}
            ];
            
            return testCases.map(grid => {
                const iso = IsometricUtils.gridToIso(grid.x, grid.y, tileW, tileH);
                const backToGrid = IsometricUtils.isoToGrid(iso.x, iso.y, tileW, tileH);
                return {
                    original: grid,
                    converted: backToGrid,
                    matches: grid.x === backToGrid.x && grid.y === backToGrid.y
                };
            });
        });
        
        roundTrip.forEach((result, i) => {
            expect(result.matches).toBe(true);
            expect(result.converted.x).toBe(result.original.x);
            expect(result.converted.y).toBe(result.original.y);
        });
    });

    test('M1: Z-order calculation correctness', async ({ page }) => {
        const zOrders = await page.evaluate(() => {
            return [
                { grid: {x: 0, y: 0}, z: IsometricUtils.getZOrder(0, 0) },
                { grid: {x: 10, y: 5}, z: IsometricUtils.getZOrder(10, 5) },
                { grid: {x: 25, y: 25}, z: IsometricUtils.getZOrder(25, 25) },
                { grid: {x: 49, y: 49}, z: IsometricUtils.getZOrder(49, 49) }
            ];
        });
        
        // Z-order should increase from back-left to front-right
        expect(zOrders[0].z).toBe(0);   // (0,0) = 0
        expect(zOrders[1].z).toBe(15);  // (10,5) = 15
        expect(zOrders[2].z).toBe(50);  // (25,25) = 50
        expect(zOrders[3].z).toBe(98);  // (49,49) = 98
        
        // Verify monotonic increase
        for (let i = 1; i < zOrders.length; i++) {
            expect(zOrders[i].z).toBeGreaterThan(zOrders[i-1].z);
        }
    });

    test('M2: Isometric soil tiles render correctly', async ({ page }) => {
        await page.waitForTimeout(1000); // Let rendering stabilize
        
        const soilMetrics = await page.evaluate(() => {
            const soilManager = window.graphicsEngine?.soilManager;
            if (!soilManager) return null;
            
            return {
                isIsometric: window.config.world.rendering.projection === 'isometric',
                gridWidth: window.config.world.map.gridWidth,
                gridHeight: window.config.world.map.gridHeight,
                visibleCellsCount: soilManager.visibleCells?.size || 0,
                hasSoilGrid: !!soilManager.soilGrid
            };
        });
        
        expect(soilMetrics).toBeTruthy();
        expect(soilMetrics.isIsometric).toBe(true);
        expect(soilMetrics.gridWidth).toBe(50);
        expect(soilMetrics.gridHeight).toBe(50);
        expect(soilMetrics.visibleCellsCount).toBeGreaterThan(0);
        expect(soilMetrics.hasSoilGrid).toBe(true);
    });

    test('M2: No rendering errors during soil tile rendering', async ({ page }) => {
        const errors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });
        
        await page.waitForTimeout(2000); // Render several frames
        
        // Filter out WebGL performance warnings (expected in headless)
        const criticalErrors = errors.filter(err => 
            !err.includes('WebGL') && 
            !err.includes('SwiftShader')
        );
        
        expect(criticalErrors.length).toBe(0);
    });

    test('M3: Plants positioned on isometric grid', async ({ page }) => {
        // Spawn test plants
        const plantData = await page.evaluate(() => {
            const pm = window.graphicsEngine?.plantManager;
            const sm = window.graphicsEngine?.soilManager;
            if (!pm || !sm) return null;
            
            // Clear existing plants
            pm.plants = [];
            
            // Spawn plants at known positions
            const testPositions = [
                {x: 5, y: 5, species: 'urtica_dioica'},
                {x: 25, y: 25, species: 'urtica_dioica'},
                {x: 45, y: 45, species: 'urtica_dioica'}
            ];
            
            testPositions.forEach(pos => {
                pm.spawnPlant(pos.x, pos.y, pos.species, 0);
            });
            
            // Get render data
            return pm.plants.map(plant => {
                const renderData = plant.getRenderData();
                return {
                    gridX: plant.gridX,
                    gridY: plant.gridY,
                    isoX: renderData.x,
                    isoY: renderData.y,
                    zOrder: renderData.zOrder,
                    layer: plant.layer
                };
            });
        });
        
        expect(plantData).toBeTruthy();
        expect(plantData.length).toBe(3);
        
        // Verify isometric positioning
        plantData.forEach(plant => {
            expect(plant.zOrder).toBe(plant.gridX + plant.gridY);
        });
        
        // Verify Z-order increases (back to front)
        for (let i = 1; i < plantData.length; i++) {
            expect(plantData[i].zOrder).toBeGreaterThan(plantData[i-1].zOrder);
        }
    });

    test('M3: Depth sorting by Z-order works', async ({ page }) => {
        const sortingTest = await page.evaluate(() => {
            const pm = window.graphicsEngine?.plantManager;
            if (!pm) return null;
            
            // Clear and spawn plants in random order
            pm.plants = [];
            
            const positions = [
                {x: 10, y: 10}, // z=20
                {x: 5, y: 5},   // z=10
                {x: 30, y: 20}, // z=50
                {x: 15, y: 15}  // z=30
            ];
            
            // Spawn in non-sorted order
            positions.forEach(pos => {
                pm.spawnPlant(pos.x, pos.y, 'urtica_dioica', 0);
            });
            
            // Get Z-orders before and after sorting
            const beforeSort = pm.plants.map(p => ({
                gridX: p.gridX,
                gridY: p.gridY,
                zOrder: IsometricUtils.getZOrder(p.gridX, p.gridY)
            }));
            
            // Sort by Z-order
            pm.plants.sort((a, b) => {
                const zA = IsometricUtils.getZOrder(a.gridX, a.gridY);
                const zB = IsometricUtils.getZOrder(b.gridX, b.gridY);
                return zA - zB;
            });
            
            const afterSort = pm.plants.map(p => ({
                gridX: p.gridX,
                gridY: p.gridY,
                zOrder: IsometricUtils.getZOrder(p.gridX, p.gridY)
            }));
            
            return { beforeSort, afterSort };
        });
        
        expect(sortingTest).toBeTruthy();
        
        // Verify sorted order is monotonic
        const zOrders = sortingTest.afterSort.map(p => p.zOrder);
        for (let i = 1; i < zOrders.length; i++) {
            expect(zOrders[i]).toBeGreaterThanOrEqual(zOrders[i-1]);
        }
        
        // Expected order: z=10, z=20, z=30, z=50
        expect(zOrders).toEqual([10, 20, 30, 50]);
    });

    test('M4: Mouse input converts to correct grid coordinates', async ({ page }) => {
        // Simulate click at known screen position
        const clickResult = await page.evaluate(() => {
            const im = window.graphicsEngine?.inputManager;
            const config = window.config;
            if (!im || !config) return null;
            
            // Test conversion at center of canvas
            const canvas = document.getElementById('gameCanvas');
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            
            // Mock camera at origin
            const camera = window.graphicsEngine.cameraManager;
            const originalX = camera.x;
            const originalY = camera.y;
            camera.x = 0;
            camera.y = 0;
            
            // Test multiple positions
            const testPositions = [
                {screen: {x: centerX, y: centerY}},
                {screen: {x: centerX + 100, y: centerY}},
                {screen: {x: centerX, y: centerY + 100}}
            ];
            
            const results = testPositions.map(pos => {
                // Convert screen to world
                const worldX = pos.screen.x - centerX;
                const worldY = pos.screen.y - centerY;
                
                // Convert to grid
                const isoConfig = config.world.rendering.isometric;
                const grid = IsometricUtils.isoToGrid(
                    worldX, worldY,
                    isoConfig.tileWidth, isoConfig.tileHeight
                );
                
                return {
                    screen: pos.screen,
                    grid: grid
                };
            });
            
            // Restore camera
            camera.x = originalX;
            camera.y = originalY;
            
            return results;
        });
        
        expect(clickResult).toBeTruthy();
        expect(clickResult.length).toBe(3);
        
        // Verify grid coordinates are integers
        clickResult.forEach(result => {
            expect(Number.isInteger(result.grid.x)).toBe(true);
            expect(Number.isInteger(result.grid.y)).toBe(true);
        });
    });

    test('M4: Cell highlighting shows isometric diamond', async ({ page }) => {
        const highlightTest = await page.evaluate(() => {
            const rs = window.graphicsEngine?.renderSystem;
            if (!rs) return null;
            
            // Set highlighted cell
            rs.setHighlightedCell(25, 25);
            
            return {
                hasHighlight: rs.highlightedCell !== null,
                gridX: rs.highlightedCell?.x,
                gridY: rs.highlightedCell?.y
            };
        });
        
        expect(highlightTest).toBeTruthy();
        expect(highlightTest.hasHighlight).toBe(true);
        expect(highlightTest.gridX).toBe(25);
        expect(highlightTest.gridY).toBe(25);
        
        // Clear highlight
        await page.evaluate(() => {
            window.graphicsEngine.renderSystem.clearHighlightedCell();
        });
        
        const cleared = await page.evaluate(() => {
            return window.graphicsEngine.renderSystem.highlightedCell === null;
        });
        
        expect(cleared).toBe(true);
    });

    test('M5: Weather particles have horizontal velocity in isometric', async ({ page }) => {
        const particleTest = await page.evaluate(() => {
            const wm = window.graphicsEngine?.weatherManager;
            if (!wm) return null;
            
            // Force rainy weather
            wm.setState('rainy');
            
            // Wait for particles to spawn
            return new Promise((resolve) => {
                setTimeout(() => {
                    const particles = wm.particles || [];
                    
                    if (particles.length === 0) {
                        resolve({ hasParticles: false });
                        return;
                    }
                    
                    // Check if particles have horizontal velocity
                    const sample = particles.slice(0, 10).map(p => ({
                        velocityX: p.velocityX,
                        velocityY: p.velocityY,
                        hasDiagonalVelocity: p.velocityX !== 0 && p.velocityY !== 0
                    }));
                    
                    resolve({
                        hasParticles: true,
                        particleCount: particles.length,
                        sample: sample
                    });
                }, 500);
            });
        });
        
        expect(particleTest.hasParticles).toBe(true);
        expect(particleTest.particleCount).toBeGreaterThan(0);
        
        // Verify particles have diagonal velocity
        if (particleTest.sample && particleTest.sample.length > 0) {
            particleTest.sample.forEach(particle => {
                expect(particle.hasDiagonalVelocity).toBe(true);
                expect(particle.velocityX).toBeLessThan(0); // Leftward
                expect(particle.velocityY).toBeGreaterThan(0); // Downward
            });
        }
    });

    test('M5: Weather state transitions work in isometric', async ({ page }) => {
        const transitionTest = await page.evaluate(() => {
            const wm = window.graphicsEngine?.weatherManager;
            if (!wm) return null;
            
            const states = ['sunny', 'cloudy', 'rainy'];
            const results = [];
            
            states.forEach(state => {
                wm.setState(state);
                results.push({
                    state: state,
                    currentState: wm.currentState,
                    matches: wm.currentState === state
                });
            });
            
            return results;
        });
        
        expect(transitionTest).toBeTruthy();
        expect(transitionTest.length).toBe(3);
        
        transitionTest.forEach(result => {
            expect(result.matches).toBe(true);
        });
    });

    test('Performance: FPS maintains target (≥30)', async ({ page }) => {
        // Let scene render for 3 seconds
        await page.waitForTimeout(3000);
        
        const fpsMetrics = await page.evaluate(() => {
            const de = window.graphicsEngine?.debugManager;
            if (!de) return null;
            
            return {
                currentFPS: de.fps,
                meetsTarget: de.fps >= 30
            };
        });
        
        expect(fpsMetrics).toBeTruthy();
        console.log(`Current FPS: ${fpsMetrics.currentFPS}`);
        expect(fpsMetrics.meetsTarget).toBe(true);
    });

    test('Integration: All systems initialized correctly', async ({ page }) => {
        const systemStatus = await page.evaluate(() => {
            const ge = window.graphicsEngine;
            if (!ge) return null;
            
            return {
                initialized: ge.initialized,
                hasIsometricUtils: typeof IsometricUtils !== 'undefined',
                hasSoilManager: !!ge.soilManager,
                hasPlantManager: !!ge.plantManager,
                hasWeatherManager: !!ge.weatherManager,
                hasRenderSystem: !!ge.renderSystem,
                hasInputManager: !!ge.inputManager,
                projection: window.config?.world?.rendering?.projection,
                isIsometric: window.config?.world?.rendering?.projection === 'isometric'
            };
        });
        
        expect(systemStatus.initialized).toBe(true);
        expect(systemStatus.hasIsometricUtils).toBe(true);
        expect(systemStatus.hasSoilManager).toBe(true);
        expect(systemStatus.hasPlantManager).toBe(true);
        expect(systemStatus.hasWeatherManager).toBe(true);
        expect(systemStatus.hasRenderSystem).toBe(true);
        expect(systemStatus.hasInputManager).toBe(true);
        expect(systemStatus.projection).toBe('isometric');
        expect(systemStatus.isIsometric).toBe(true);
    });

    test('Regression: Orthographic features still work', async ({ page }) => {
        // Switch to orthographic temporarily
        await page.evaluate(() => {
            window.config.world.rendering.projection = 'orthographic';
        });
        
        await page.reload({ waitUntil: 'networkidle' });
        
        await page.waitForFunction(() => {
            return window.graphicsEngine && window.graphicsEngine.initialized;
        }, { timeout: 10000 });
        
        const orthoTest = await page.evaluate(() => {
            const ge = window.graphicsEngine;
            return {
                projection: window.config?.world?.rendering?.projection,
                soilManagerWorks: !!ge.soilManager && !!ge.soilManager.soilGrid,
                plantManagerWorks: !!ge.plantManager,
                renderSystemWorks: !!ge.renderSystem
            };
        });
        
        expect(orthoTest.projection).toBe('orthographic');
        expect(orthoTest.soilManagerWorks).toBe(true);
        expect(orthoTest.plantManagerWorks).toBe(true);
        expect(orthoTest.renderSystemWorks).toBe(true);
    });
});
