/**
 * New Game Functionality Test
 * 
 * Tests that New Game buttons properly clear auto_close saves and start fresh:
 * 1. New Game (Same Map) - keeps seed, clears state and auto_close
 * 2. New Game (New Map) - new seed, clears state and auto_close
 * 3. Verify auto_close save doesn't interfere with new game
 */

import { test, expect } from '@playwright/test';

test.describe('New Game Functionality', () => {
    test('should start fresh game with same map after auto_close save exists', async ({ page }) => {
        console.log('Test 1: New Game (Same Map) with existing auto_close save');
        
        // Step 1: Start game and create initial state
        await page.goto('http://localhost:8081');
        await page.waitForTimeout(2000);
        
        await page.waitForFunction(() => {
            const pm = window.graphicsEngine?.plantManager;
            return pm && pm.speciesConfigs && pm.speciesConfigs.size >= 3;
        }, { timeout: 10000 });
        
        // Clear any existing saves
        await page.evaluate(() => {
            localStorage.clear();
            localStorage.setItem('landShepherd_autoSaveEnabled', 'true');
        });
        
        await page.reload();
        await page.waitForTimeout(2000);
        
        await page.waitForFunction(() => {
            const pm = window.graphicsEngine?.plantManager;
            return pm && pm.speciesConfigs && pm.speciesConfigs.size >= 3;
        }, { timeout: 10000 });
        
        // Get initial seed
        const initialSeed = await page.evaluate(() => {
            return window.graphicsEngine.soilManager.getSeed();
        });
        
        console.log('Initial seed:', initialSeed);
        
        // Step 2: Create game state with plants and time
        await page.evaluate(() => {
            const engine = window.graphicsEngine;
            const pm = engine.plantManager;
            const sm = engine.soilManager;
            
            // Add plants
            const locations = [];
            for (let y = 0; y < 50 && locations.length < 5; y++) {
                for (let x = 0; x < 50 && locations.length < 5; x++) {
                    const soil = sm.getSoilAt(x, y);
                    if (soil && soil.isPlantable && !soil.isWater) {
                        locations.push({ x, y });
                    }
                }
            }
            
            locations.forEach((loc, i) => {
                pm.addPlant(loc.x, loc.y, 'urtica_dioica', 0);
            });
            
            // Advance time
            engine.timeManager.currentDay = 15;
        });
        
        const beforeState = await page.evaluate(() => {
            return {
                seed: window.graphicsEngine.soilManager.getSeed(),
                day: window.graphicsEngine.timeManager.getCurrentDay(),
                plants: window.graphicsEngine.plantManager.getAllPlants().length
            };
        });
        
        console.log('Before state:', beforeState);
        expect(beforeState.day).toBe(15);
        expect(beforeState.plants).toBe(5);
        
        // Step 3: Trigger auto_close save (simulate browser close)
        await page.evaluate(() => {
            window.graphicsEngine.saveManager.saveOnClose();
        });
        
        await page.waitForTimeout(500);
        
        // Verify auto_close save exists
        const autoCloseExists = await page.evaluate(() => {
            return localStorage.getItem('landShepherd_save_auto_close') !== null;
        });
        expect(autoCloseExists).toBe(true);
        console.log('✓ auto_close save created');
        
        // Step 4: Click "New Game (Same Map)"
        await page.click('#settings-button');
        await page.waitForTimeout(500);
        await page.click('#new-game-same-map-btn');
        
        // Wait for page reload
        await page.waitForTimeout(4000);
        
        await page.waitForFunction(() => {
            const pm = window.graphicsEngine?.plantManager;
            return pm && pm.speciesConfigs && pm.speciesConfigs.size >= 3;
        }, { timeout: 10000 });
        
        // Step 5: Verify new game state
        const afterNewGame = await page.evaluate(() => {
            return {
                seed: window.graphicsEngine.soilManager.getSeed(),
                day: window.graphicsEngine.timeManager.getCurrentDay(),
                plants: window.graphicsEngine.plantManager.getAllPlants().length,
                autoCloseSaveExists: localStorage.getItem('landShepherd_save_auto_close') !== null,
                pendingLoadExists: localStorage.getItem('landShepherd_pendingLoad') !== null
            };
        });
        
        console.log('After New Game (Same Map):', afterNewGame);
        
        // Verify seed stayed the same (same map)
        expect(afterNewGame.seed).toBe(initialSeed);
        console.log('✓ Seed unchanged (same map)');
        
        // Verify state was reset
        expect(afterNewGame.day).toBeLessThan(1); // Should be ~0
        console.log('✓ Day reset to 0');
        
        expect(afterNewGame.plants).toBe(0);
        console.log('✓ Plants cleared');
        
        // Verify auto_close save was deleted
        expect(afterNewGame.autoCloseSaveExists).toBe(false);
        console.log('✓ auto_close save cleared');
        
        // Verify pending load flag was cleared
        expect(afterNewGame.pendingLoadExists).toBe(false);
        console.log('✓ pendingLoad flag cleared');
        
        console.log('✅ Test 1 PASSED: New Game (Same Map) works correctly');
    });
    
    test('should start fresh game with new map after auto_close save exists', async ({ page }) => {
        console.log('Test 2: New Game (New Map) with existing auto_close save');
        
        // Step 1: Start game and create initial state
        await page.goto('http://localhost:8081');
        await page.waitForTimeout(2000);
        
        await page.waitForFunction(() => {
            const pm = window.graphicsEngine?.plantManager;
            return pm && pm.speciesConfigs && pm.speciesConfigs.size >= 3;
        }, { timeout: 10000 });
        
        // Clear any existing saves
        await page.evaluate(() => {
            localStorage.clear();
            localStorage.setItem('landShepherd_autoSaveEnabled', 'true');
        });
        
        await page.reload();
        await page.waitForTimeout(2000);
        
        await page.waitForFunction(() => {
            const pm = window.graphicsEngine?.plantManager;
            return pm && pm.speciesConfigs && pm.speciesConfigs.size >= 3;
        }, { timeout: 10000 });
        
        // Get initial seed
        const initialSeed = await page.evaluate(() => {
            return window.graphicsEngine.soilManager.getSeed();
        });
        
        console.log('Initial seed:', initialSeed);
        
        // Step 2: Create game state
        await page.evaluate(() => {
            const engine = window.graphicsEngine;
            const pm = engine.plantManager;
            const sm = engine.soilManager;
            
            // Add plants
            const locations = [];
            for (let y = 0; y < 50 && locations.length < 3; y++) {
                for (let x = 0; x < 50 && locations.length < 3; x++) {
                    const soil = sm.getSoilAt(x, y);
                    if (soil && soil.isPlantable && !soil.isWater) {
                        locations.push({ x, y });
                    }
                }
            }
            
            locations.forEach(loc => {
                pm.addPlant(loc.x, loc.y, 'trifolium_repens', 0);
            });
            
            // Advance time
            engine.timeManager.currentDay = 20;
        });
        
        const beforeState = await page.evaluate(() => {
            return {
                seed: window.graphicsEngine.soilManager.getSeed(),
                day: window.graphicsEngine.timeManager.getCurrentDay(),
                plants: window.graphicsEngine.plantManager.getAllPlants().length
            };
        });
        
        console.log('Before state:', beforeState);
        expect(beforeState.day).toBe(20);
        expect(beforeState.plants).toBe(3);
        
        // Step 3: Create auto_close save
        await page.evaluate(() => {
            window.graphicsEngine.saveManager.saveOnClose();
        });
        
        await page.waitForTimeout(500);
        
        const autoCloseExists = await page.evaluate(() => {
            return localStorage.getItem('landShepherd_save_auto_close') !== null;
        });
        expect(autoCloseExists).toBe(true);
        console.log('✓ auto_close save created');
        
        // Step 4: Click "New Game (New Map)"
        await page.click('#settings-button');
        await page.waitForTimeout(500);
        await page.click('#new-game-new-map-btn');
        
        // Wait for page reload
        await page.waitForTimeout(4000);
        
        await page.waitForFunction(() => {
            const pm = window.graphicsEngine?.plantManager;
            return pm && pm.speciesConfigs && pm.speciesConfigs.size >= 3;
        }, { timeout: 10000 });
        
        // Step 5: Verify new game state
        const afterNewGame = await page.evaluate(() => {
            return {
                seed: window.graphicsEngine.soilManager.getSeed(),
                day: window.graphicsEngine.timeManager.getCurrentDay(),
                plants: window.graphicsEngine.plantManager.getAllPlants().length,
                autoCloseSaveExists: localStorage.getItem('landShepherd_save_auto_close') !== null,
                pendingLoadExists: localStorage.getItem('landShepherd_pendingLoad') !== null
            };
        });
        
        console.log('After New Game (New Map):', afterNewGame);
        
        // Verify seed changed (new map)
        expect(afterNewGame.seed).not.toBe(initialSeed);
        console.log('✓ Seed changed (new map)');
        
        // Verify state was reset
        expect(afterNewGame.day).toBeLessThan(1);
        console.log('✓ Day reset to 0');
        
        expect(afterNewGame.plants).toBe(0);
        console.log('✓ Plants cleared');
        
        // Verify auto_close save was deleted
        expect(afterNewGame.autoCloseSaveExists).toBe(false);
        console.log('✓ auto_close save cleared');
        
        // Verify pending load flag was cleared
        expect(afterNewGame.pendingLoadExists).toBe(false);
        console.log('✓ pendingLoad flag cleared');
        
        console.log('✅ Test 2 PASSED: New Game (New Map) works correctly');
    });
    
    test('should not auto-load when starting new game', async ({ page }) => {
        console.log('Test 3: Verify auto_close save does not interfere with New Game');
        
        // Step 1: Create an auto_close save directly
        await page.goto('http://localhost:8081');
        await page.waitForTimeout(2000);
        
        await page.waitForFunction(() => {
            const pm = window.graphicsEngine?.plantManager;
            return pm && pm.speciesConfigs && pm.speciesConfigs.size >= 3;
        }, { timeout: 10000 });
        
        await page.evaluate(() => {
            localStorage.clear();
            localStorage.setItem('landShepherd_autoSaveEnabled', 'true');
            
            // Create fake auto_close save with day 50
            const fakeData = {
                version: "1.0",
                timestamp: new Date().toISOString(),
                metadata: {
                    name: "Auto-save close",
                    playTime: 0,
                    plantCount: 10,
                    currentDay: 50
                },
                state: {
                    seed: 12345,
                    time: { currentDay: 50 },
                    plants: { plants: [] }
                }
            };
            localStorage.setItem('landShepherd_save_auto_close', JSON.stringify(fakeData));
        });
        
        // Step 2: Click New Game (should not load the auto_close save)
        await page.click('#settings-button');
        await page.waitForTimeout(500);
        await page.click('#new-game-new-map-btn');
        
        await page.waitForTimeout(4000);
        
        await page.waitForFunction(() => {
            const pm = window.graphicsEngine?.plantManager;
            return pm && pm.speciesConfigs && pm.speciesConfigs.size >= 3;
        }, { timeout: 10000 });
        
        // Step 3: Verify fresh start (NOT day 50)
        const afterNewGame = await page.evaluate(() => {
            return {
                day: window.graphicsEngine.timeManager.getCurrentDay(),
                plants: window.graphicsEngine.plantManager.getAllPlants().length,
                autoCloseSaveExists: localStorage.getItem('landShepherd_save_auto_close') !== null
            };
        });
        
        console.log('After New Game:', afterNewGame);
        
        // Should NOT have loaded the day 50 save
        expect(afterNewGame.day).toBeLessThan(1);
        console.log('✓ Did not load old save (day is 0, not 50)');
        
        expect(afterNewGame.plants).toBe(0);
        console.log('✓ Started with 0 plants');
        
        expect(afterNewGame.autoCloseSaveExists).toBe(false);
        console.log('✓ auto_close save was deleted');
        
        console.log('✅ Test 3 PASSED: New Game ignores auto_close save');
    });
});
