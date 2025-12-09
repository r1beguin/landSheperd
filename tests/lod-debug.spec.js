/**
 * LOD Debug Test - Diagnose LOD threshold issue
 */

const { test, expect } = require('@playwright/test');

// Helper to wait for render frames
async function waitForRenderFrames(page, count = 10) {
    for (let i = 0; i < count; i++) {
        await page.evaluate(() => {
            return new Promise(resolve => requestAnimationFrame(resolve));
        });
    }
}

async function setCameraZoom(page, zoom) {
    await page.evaluate((zoom) => {
        window.graphicsEngine.cameraManager.setZoom(zoom);
    }, zoom);
}

test.describe('LOD Debug', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8081');
        await page.waitForFunction(() => window.graphicsEngine !== undefined, { timeout: 10000 });
        await waitForRenderFrames(page, 20);
    });
    
    test('Debug LOD calculation at 0.3x zoom', async ({ page }) => {
        // Spawn a single plant
        const planted = await page.evaluate(() => {
            const pm = window.graphicsEngine.plantManager;
            const sm = window.graphicsEngine.soilManager;
            
            // Find first valid non-water spot
            for (let x = 20; x < 30; x++) {
                for (let y = 20; y < 30; y++) {
                    const soil = sm.getSoilAt(x, y);
                    if (soil && !soil.isWater) {
                        const plant = pm.addPlant(x, y, 'trifolium_repens', 0);
                        if (plant) {
                            return { x, y, lod: plant.currentLOD };
                        }
                    }
                }
            }
            return null;
        });
        
        expect(planted).not.toBeNull();
        console.log('Planted at:', planted);
        
        await waitForRenderFrames(page, 10);
        
        // Test medium LOD at 1.0x zoom
        await setCameraZoom(page, 1.0);
        await waitForRenderFrames(page, 5);
        
        const debug1 = await page.evaluate(() => {
            const lodManager = window.graphicsEngine.lodManager;
            const plant = window.graphicsEngine.plantManager.getAllPlants()[0];
            
            return {
                zoom: window.graphicsEngine.cameraManager.zoom,
                thresholds: lodManager.thresholds,
                hysteresis: lodManager.hysteresis,
                plantCurrentLOD: plant.currentLOD,
                lodCounts: lodManager.getLODDistribution()
            };
        });
        
        console.log('At zoom 1.0x:', debug1);
        expect(debug1.plantCurrentLOD).toBe('medium');
        
        // Now set to 0.3x zoom and debug
        await setCameraZoom(page, 0.3);
        await waitForRenderFrames(page, 1); // Just 1 frame
        
        const debug2 = await page.evaluate(() => {
            const lodManager = window.graphicsEngine.lodManager;
            const plant = window.graphicsEngine.plantManager.getAllPlants()[0];
            
            // Manually call calculateLODLevel to see what it returns
            const calculatedLOD = lodManager.calculateLODLevel(plant);
            
            return {
                zoom: window.graphicsEngine.cameraManager.zoom,
                plantCurrentLOD: plant.currentLOD,
                calculatedLOD: calculatedLOD,
                entityState: lodManager.entityLODs.get(plant),
                lodCounts: lodManager.getLODDistribution()
            };
        });
        
        console.log('At zoom 0.3x after 1 frame:', debug2);
        console.log('Expected LOD: impostor (zoom 0.3 < lowThreshold 0.5)');
        console.log('Actual plant.currentLOD:', debug2.plantCurrentLOD);
        console.log('Calculated LOD:', debug2.calculatedLOD);
        
        // Wait more frames
        await waitForRenderFrames(page, 20);
        
        const debug3 = await page.evaluate(() => {
            const plant = window.graphicsEngine.plantManager.getAllPlants()[0];
            const lodManager = window.graphicsEngine.lodManager;
            
            return {
                plantCurrentLOD: plant.currentLOD,
                lodCounts: lodManager.getLODDistribution()
            };
        });
        
        console.log('At zoom 0.3x after 20 more frames:', debug3);
        
        expect(debug3.plantCurrentLOD).toBe('impostor');
    });
});
