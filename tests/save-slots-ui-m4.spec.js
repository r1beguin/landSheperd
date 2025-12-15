/**
 * Save Slots UI Test (Milestone 4)
 * 
 * Tests the save slot management UI:
 * 1. Settings modal opens and displays save slots
 * 2. Empty slots show "Save Here" button
 * 3. Filled slots show metadata and Load/Overwrite/Delete buttons
 * 4. Save to slot creates save data
 * 5. Load from slot restores state
 * 6. Delete slot removes save data
 */

import { test, expect } from '@playwright/test';

test.describe('Save Slots UI (M4)', () => {
    test('should display 6 save slots with correct structure', async ({ page }) => {
        await page.goto('http://localhost:8081');
        await page.waitForTimeout(2000);
        
        // Wait for game to load
        await page.waitForFunction(() => {
            return window.graphicsEngine && window.graphicsEngine.plantManager;
        }, { timeout: 10000 });
        
        // Clear any existing saves
        await page.evaluate(() => {
            const slots = ['manual_1', 'manual_2', 'manual_3', 'auto_1', 'auto_2', 'auto_3'];
            slots.forEach(slot => {
                localStorage.removeItem('landShepherd_save_' + slot);
            });
        });
        
        // Open settings modal
        await page.click('#settings-button');
        await page.waitForTimeout(500);
        
        // Verify modal is open
        const modalVisible = await page.isVisible('#settings-modal.active');
        expect(modalVisible).toBe(true);
        
        // Verify save slots container exists
        const containerVisible = await page.isVisible('#save-slots-container');
        expect(containerVisible).toBe(true);
        
        // Count slot elements
        const slotCount = await page.locator('.save-slot').count();
        expect(slotCount).toBe(6);
        
        // Verify slot order (manual first, then auto)
        const slotIds = await page.evaluate(() => {
            const slots = Array.from(document.querySelectorAll('.save-slot'));
            return slots.map(slot => slot.dataset.slotId);
        });
        
        expect(slotIds).toEqual(['manual_1', 'manual_2', 'manual_3', 'auto_1', 'auto_2', 'auto_3']);
        
        // Verify all slots are empty initially
        const emptySlots = await page.locator('.save-slot.empty').count();
        expect(emptySlots).toBe(6);
        
        // Verify each empty slot has "Save Here" button
        for (let i = 0; i < 6; i++) {
            const saveBtn = await page.locator('.save-slot').nth(i).locator('.slot-btn-save');
            const btnText = await saveBtn.textContent();
            expect(btnText).toBe('Save Here');
        }
        
        console.log('✓ All 6 slots displayed correctly');
    });
    
    test('should save to slot and display save metadata', async ({ page }) => {
        await page.goto('http://localhost:8081');
        await page.waitForTimeout(2000);
        
        // Wait for game and species to load
        await page.waitForFunction(() => {
            const pm = window.graphicsEngine?.plantManager;
            return pm && pm.speciesConfigs && pm.speciesConfigs.size >= 3;
        }, { timeout: 10000 });
        
        // Clear existing saves
        await page.evaluate(() => {
            const slots = ['manual_1', 'manual_2', 'manual_3'];
            slots.forEach(slot => {
                localStorage.removeItem('landShepherd_save_' + slot);
            });
        });
        
        // Add some plants for interesting save data
        await page.evaluate(() => {
            const engine = window.graphicsEngine;
            const pm = engine.plantManager;
            const sm = engine.soilManager;
            
            // Find plantable locations
            const locations = [];
            for (let y = 0; y < 50 && locations.length < 3; y++) {
                for (let x = 0; x < 50 && locations.length < 3; x++) {
                    const soil = sm.getSoilAt(x, y);
                    if (soil && soil.isPlantable && !soil.isWater) {
                        locations.push({ x, y });
                    }
                }
            }
            
            // Add 3 plants
            pm.addPlant(locations[0].x, locations[0].y, 'urtica_dioica', 0);
            pm.addPlant(locations[1].x, locations[1].y, 'trifolium_repens', 0);
            pm.addPlant(locations[2].x, locations[2].y, 'quercus_robur', 0);
            
            // Advance time to day 10
            engine.timeManager.currentDay = 10;
        });
        
        await page.waitForTimeout(500);
        
        // Open settings
        await page.click('#settings-button');
        await page.waitForTimeout(500);
        
        // Click "Save Here" on manual_1
        await page.click('.save-slot[data-slot-id="manual_1"] .slot-btn-save');
        await page.waitForTimeout(500);
        
        // Verify manual_1 is no longer empty
        const isEmptyAfterSave = await page.locator('.save-slot[data-slot-id="manual_1"]').evaluate(el => {
            return el.classList.contains('empty');
        });
        expect(isEmptyAfterSave).toBe(false);
        
        // Verify metadata is displayed
        const metadata = await page.evaluate(() => {
            const slot = document.querySelector('.save-slot[data-slot-id="manual_1"]');
            const info = slot.querySelector('.slot-info');
            if (!info) return null;
            
            const rows = Array.from(info.querySelectorAll('.slot-info-row'));
            const data = {};
            rows.forEach(row => {
                const label = row.querySelector('.slot-info-label').textContent.replace(':', '');
                const value = row.querySelector('.slot-info-value').textContent;
                data[label] = value;
            });
            return data;
        });
        
        expect(metadata).not.toBeNull();
        expect(metadata['Day']).toBe('10');
        expect(metadata['Plants']).toBe('3');
        expect(metadata['Saved']).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // Date format
        
        // Verify buttons changed
        const buttons = await page.locator('.save-slot[data-slot-id="manual_1"] .slot-btn').allTextContents();
        expect(buttons).toContain('Load');
        expect(buttons).toContain('Overwrite');
        expect(buttons).toContain('Delete');
        
        console.log('✓ Save created with correct metadata:', metadata);
    });
    
    test('should load from slot and restore state', async ({ page }) => {
        await page.goto('http://localhost:8081');
        await page.waitForTimeout(2000);
        
        // Wait for game to load
        await page.waitForFunction(() => {
            const pm = window.graphicsEngine?.plantManager;
            return pm && pm.speciesConfigs && pm.speciesConfigs.size >= 3;
        }, { timeout: 10000 });
        
        // Create a save with known state
        await page.evaluate(() => {
            const engine = window.graphicsEngine;
            const pm = engine.plantManager;
            const sm = engine.soilManager;
            
            // Clear manual_2
            localStorage.removeItem('landShepherd_save_manual_2');
            
            // Find locations and add plants
            const locations = [];
            for (let y = 0; y < 50 && locations.length < 5; y++) {
                for (let x = 0; x < 50 && locations.length < 5; x++) {
                    const soil = sm.getSoilAt(x, y);
                    if (soil && soil.isPlantable && !soil.isWater) {
                        locations.push({ x, y });
                    }
                }
            }
            
            pm.addPlant(locations[0].x, locations[0].y, 'urtica_dioica', 0);
            pm.addPlant(locations[1].x, locations[1].y, 'trifolium_repens', 0);
            pm.addPlant(locations[2].x, locations[2].y, 'quercus_robur', 0);
            pm.addPlant(locations[3].x, locations[3].y, 'urtica_dioica', 0);
            pm.addPlant(locations[4].x, locations[4].y, 'trifolium_repens', 0);
            
            engine.timeManager.currentDay = 15;
        });
        
        const beforeState = await page.evaluate(() => {
            return {
                seed: window.graphicsEngine.soilManager.getSeed(),
                day: window.graphicsEngine.timeManager.getCurrentDay(),
                plants: window.graphicsEngine.plantManager.getAllPlants().length
            };
        });
        
        // Open settings and save to manual_2
        await page.click('#settings-button');
        await page.waitForTimeout(500);
        await page.click('.save-slot[data-slot-id="manual_2"] .slot-btn-save');
        await page.waitForTimeout(500);
        
        // Close settings
        await page.press('body', 'Escape');
        await page.waitForTimeout(500);
        
        // Change state (add more plants, advance time)
        await page.evaluate(() => {
            const engine = window.graphicsEngine;
            engine.timeManager.currentDay = 25;
            
            const pm = engine.plantManager;
            const sm = engine.soilManager;
            
            // Add more plants
            for (let y = 0; y < 100; y++) {
                for (let x = 0; x < 100; x++) {
                    const soil = sm.getSoilAt(x, y);
                    if (soil && soil.isPlantable && !soil.isWater && !pm.getPlantAt(x, y).length) {
                        pm.addPlant(x, y, 'urtica_dioica', 0);
                        return; // Just add one more
                    }
                }
            }
        });
        
        const afterChangeState = await page.evaluate(() => {
            return {
                day: window.graphicsEngine.timeManager.getCurrentDay(),
                plants: window.graphicsEngine.plantManager.getAllPlants().length
            };
        });
        
        expect(afterChangeState.day).toBeGreaterThan(beforeState.day);
        expect(afterChangeState.plants).toBeGreaterThan(beforeState.plants);
        
        // Now load the save
        await page.click('#settings-button');
        await page.waitForTimeout(500);
        await page.click('.save-slot[data-slot-id="manual_2"] .slot-btn-load');
        
        // Wait for page reload
        await page.waitForTimeout(5000);
        
        // Verify state restored
        const afterLoadState = await page.evaluate(() => {
            return {
                seed: window.graphicsEngine.soilManager.getSeed(),
                day: window.graphicsEngine.timeManager.getCurrentDay(),
                plants: window.graphicsEngine.plantManager.getAllPlants().length
            };
        });
        
        expect(afterLoadState.seed).toBe(beforeState.seed);
        expect(afterLoadState.day).toBeCloseTo(beforeState.day, 0);
        expect(afterLoadState.plants).toBe(beforeState.plants);
        
        console.log('✓ State restored correctly after load');
    });
    
    test('should delete slot and show empty state', async ({ page }) => {
        await page.goto('http://localhost:8081');
        await page.waitForTimeout(2000);
        
        await page.waitForFunction(() => {
            const pm = window.graphicsEngine?.plantManager;
            return pm && pm.speciesConfigs && pm.speciesConfigs.size >= 3;
        }, { timeout: 10000 });
        
        // Create a save in manual_3
        await page.evaluate(() => {
            const engine = window.graphicsEngine;
            engine.timeManager.currentDay = 5;
            localStorage.removeItem('landShepherd_save_manual_3');
        });
        
        await page.click('#settings-button');
        await page.waitForTimeout(500);
        await page.click('.save-slot[data-slot-id="manual_3"] .slot-btn-save');
        await page.waitForTimeout(500);
        
        // Verify slot is filled
        const isEmptyBefore = await page.locator('.save-slot[data-slot-id="manual_3"]').evaluate(el => {
            return el.classList.contains('empty');
        });
        expect(isEmptyBefore).toBe(false);
        
        // Set up dialog handler for confirmation
        page.on('dialog', async dialog => {
            expect(dialog.message()).toContain('Delete Manual Save 3');
            await dialog.accept();
        });
        
        // Click delete button
        await page.click('.save-slot[data-slot-id="manual_3"] .slot-btn-delete');
        await page.waitForTimeout(500);
        
        // Verify slot is now empty
        const isEmptyAfter = await page.locator('.save-slot[data-slot-id="manual_3"]').evaluate(el => {
            return el.classList.contains('empty');
        });
        expect(isEmptyAfter).toBe(true);
        
        // Verify save is gone from localStorage
        const saveExists = await page.evaluate(() => {
            return localStorage.getItem('landShepherd_save_manual_3') !== null;
        });
        expect(saveExists).toBe(false);
        
        // Verify button changed back to "Save Here"
        const btnText = await page.locator('.save-slot[data-slot-id="manual_3"] .slot-btn-save').textContent();
        expect(btnText).toBe('Save Here');
        
        console.log('✓ Slot deleted successfully');
    });
});
