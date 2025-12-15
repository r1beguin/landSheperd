/**
 * Auto-Save System Cycle Test
 * 
 * Tests the complete auto-save workflow:
 * 1. Load page
 * 2. Add some plants
 * 3. Trigger beforeunload (auto_close save)
 * 4. Reload page
 * 5. Verify auto-load restores plants
 */

import { test, expect } from '@playwright/test';

test.describe('Auto-Save System Full Cycle', () => {
    test('should save on close and auto-load on return with plants restored', async ({ page, context }) => {
        // Clear localStorage to start fresh
        await page.goto('http://localhost:8081');
        await page.evaluate(() => {
            localStorage.clear();
            localStorage.setItem('landShepherd_autoSaveEnabled', 'true');
        });
        
        console.log('Step 1: Initial page load...');
        await page.reload();
        await page.waitForTimeout(2000);
        
        // Wait for species to load
        await page.waitForFunction(() => {
            const pm = window.graphicsEngine?.plantManager;
            return pm && pm.speciesConfigs && pm.speciesConfigs.size >= 3;
        }, { timeout: 10000 });
        
        console.log('Step 2: Species loaded, getting initial state...');
        
        // Get initial state
        const initialState = await page.evaluate(() => {
            const engine = window.graphicsEngine;
            return {
                seed: engine.soilManager.getSeed(),
                day: engine.timeManager.getCurrentDay(),
                plantCount: engine.plantManager.getAllPlants().length
            };
        });
        
        console.log('Initial state:', initialState);
        expect(initialState.seed).toBeDefined();
        expect(initialState.day).toBeGreaterThanOrEqual(0);
        
        // Add some plants
        console.log('Step 3: Adding plants...');
        await page.evaluate(() => {
            const engine = window.graphicsEngine;
            const pm = engine.plantManager;
            const sm = engine.soilManager;
            
            // Find 5 valid plantable locations (not water)
            const locations = [];
            for (let y = 0; y < 50 && locations.length < 5; y++) {
                for (let x = 0; x < 50 && locations.length < 5; x++) {
                    const soil = sm.getSoilAt(x, y);
                    if (soil && soil.isPlantable && !soil.isWater) {
                        locations.push({ x, y });
                    }
                }
            }
            
            // Add plants at valid locations
            pm.addPlant(locations[0].x, locations[0].y, 'urtica_dioica', 0);
            pm.addPlant(locations[1].x, locations[1].y, 'trifolium_repens', 0);
            pm.addPlant(locations[2].x, locations[2].y, 'quercus_robur', 0);
            pm.addPlant(locations[3].x, locations[3].y, 'urtica_dioica', 5);
            pm.addPlant(locations[4].x, locations[4].y, 'trifolium_repens', 10);
        });
        
        await page.waitForTimeout(500);
        
        const afterAddState = await page.evaluate(() => {
            const engine = window.graphicsEngine;
            const plants = engine.plantManager.getAllPlants();
            return {
                plantCount: plants.length,
                plantDetails: plants.map(p => ({
                    species: p.species.id,
                    x: Math.floor(p.x),
                    y: Math.floor(p.y),
                    stage: p.stage,
                    age: p.age
                }))
            };
        });
        
        console.log('After adding plants:', afterAddState);
        expect(afterAddState.plantCount).toBe(5);
        
        // Advance time a bit by manipulating internal state
        console.log('Step 4: Advancing time...');
        await page.evaluate(() => {
            const engine = window.graphicsEngine;
            // Directly set currentDay to simulate 5 days passing
            engine.timeManager.currentDay = 5.0;
        });
        
        await page.waitForTimeout(500);
        
        const beforeCloseState = await page.evaluate(() => {
            const engine = window.graphicsEngine;
            return {
                day: engine.timeManager.getCurrentDay(),
                plantCount: engine.plantManager.getAllPlants().length
            };
        });
        
        console.log('Before close state:', beforeCloseState);
        expect(beforeCloseState.day).toBeGreaterThan(initialState.day);
        expect(beforeCloseState.plantCount).toBe(5);
        
        // Manually trigger save (simulate beforeunload)
        console.log('Step 5: Triggering beforeunload save...');
        const saveResult = await page.evaluate(() => {
            const engine = window.graphicsEngine;
            return engine.saveManager.saveOnClose();
        });
        
        expect(saveResult).toBe(true);
        
        // Verify auto_close save exists
        const hasSave = await page.evaluate(() => {
            return localStorage.getItem('landShepherd_save_auto_close') !== null;
        });
        
        expect(hasSave).toBe(true);
        console.log('✓ auto_close save created');
        
        // Get save data to verify content
        const saveData = await page.evaluate(() => {
            const data = localStorage.getItem('landShepherd_save_auto_close');
            return JSON.parse(data);
        });
        
        console.log('Save metadata:', saveData.metadata);
        expect(saveData.state.plants).toBeDefined();
        expect(saveData.state.plants.plants).toHaveLength(5);
        expect(saveData.state.time).toBeDefined();
        expect(saveData.metadata.currentDay).toBeGreaterThan(initialState.day);
        
        // Reload page to trigger auto-load
        // In real world: user closes browser (save_on_close happens), then returns (auto-load happens)
        // Here: we simulate by reloading - checkAutoCloseLoad will detect the auto_close save
        console.log('Step 6: Reloading page to trigger auto-load...');
        
        // Capture console messages during reload
        const reloadConsole = [];
        page.on('console', msg => {
            if (msg.text().includes('LOAD') || msg.text().includes('SAVE')) {
                reloadConsole.push(msg.text());
            }
        });
        
        await page.reload();
        await page.waitForTimeout(5000); // Wait for full load, potential double-reload, and species loading
        
        console.log('Console logs during reload:', reloadConsole);
        
        // Wait for species to load again
        await page.waitForFunction(() => {
            const pm = window.graphicsEngine?.plantManager;
            return pm && pm.speciesConfigs && pm.speciesConfigs.size >= 3;
        }, { timeout: 10000 });
        
        // Wait a bit more for plants to deserialize
        await page.waitForTimeout(1000);
        
        console.log('Step 7: Verifying auto-load restored state...');
        
        const afterReloadState = await page.evaluate(() => {
            const engine = window.graphicsEngine;
            const plants = engine.plantManager.getAllPlants();
            return {
                seed: engine.soilManager.getSeed(),
                day: engine.timeManager.getCurrentDay(),
                plantCount: plants.length,
                plantDetails: plants.map(p => ({
                    species: p.species.id,
                    x: Math.floor(p.x),
                    y: Math.floor(p.y),
                    stage: p.stage,
                    age: p.age
                }))
            };
        });
        
        console.log('After reload state:', afterReloadState);
        
        // Verify seed restored (same map)
        expect(afterReloadState.seed).toBe(initialState.seed);
        console.log('✓ Seed restored correctly');
        
        // Verify day restored
        expect(afterReloadState.day).toBeCloseTo(beforeCloseState.day, 0);
        console.log('✓ Time restored correctly');
        
        // Verify plants restored
        expect(afterReloadState.plantCount).toBe(5);
        console.log('✓ Plant count restored correctly');
        
        // Verify plant details match
        const speciesCounts = afterReloadState.plantDetails.reduce((acc, p) => {
            acc[p.species] = (acc[p.species] || 0) + 1;
            return acc;
        }, {});
        
        console.log('Species counts after reload:', speciesCounts);
        expect(speciesCounts.urtica_dioica).toBe(2);
        expect(speciesCounts.trifolium_repens).toBe(2);
        expect(speciesCounts.quercus_robur).toBe(1);
        console.log('✓ Plant species restored correctly');
        
        // Verify pendingLoad flag was cleared
        const pendingLoad = await page.evaluate(() => {
            return localStorage.getItem('landShepherd_pendingLoad');
        });
        
        expect(pendingLoad).toBeNull();
        console.log('✓ pendingLoad flag cleared after processing');
        
        // Clean up
        await page.evaluate(() => {
            localStorage.clear();
        });
        
        console.log('✅ Auto-save cycle test complete!');
    });
    
    test('should not auto-load when auto-save is disabled', async ({ page }) => {
        // Clear localStorage and disable auto-save
        await page.goto('http://localhost:8081');
        await page.evaluate(() => {
            localStorage.clear();
            localStorage.setItem('landShepherd_autoSaveEnabled', 'false');
        });
        
        await page.reload();
        await page.waitForTimeout(2000);
        
        // Wait for species to load
        await page.waitForFunction(() => {
            const pm = window.graphicsEngine?.plantManager;
            return pm && pm.speciesConfigs && pm.speciesConfigs.size >= 3;
        }, { timeout: 10000 });
        
        // Create a fake auto_close save manually
        await page.evaluate(() => {
            const fakeData = {
                version: "1.0",
                timestamp: new Date().toISOString(),
                metadata: { currentDay: 100 },
                state: {
                    seed: 12345,
                    time: { currentDay: 100 }
                }
            };
            localStorage.setItem('landShepherd_save_auto_close', JSON.stringify(fakeData));
        });
        
        const initialDay = await page.evaluate(() => {
            return window.graphicsEngine.timeManager.getCurrentDay();
        });
        
        // Reload page
        await page.reload();
        await page.waitForTimeout(2000);
        
        const dayAfterReload = await page.evaluate(() => {
            return window.graphicsEngine.timeManager.getCurrentDay();
        });
        
        // Should NOT have loaded the save (day should still be ~0, not 100)
        expect(dayAfterReload).toBeLessThan(1);
        console.log('✓ Auto-load skipped when auto-save disabled');
        
        // Clean up
        await page.evaluate(() => {
            localStorage.clear();
        });
    });
});
