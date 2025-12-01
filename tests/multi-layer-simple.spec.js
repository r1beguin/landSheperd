/**
 * Simple Multi-Layer Test - Manual verification
 * Tests basic multi-layer planting on non-water tiles
 */

import { test, expect } from '@playwright/test';
import { waitForRenderFrames } from './test-utils.js';

test.describe('Multi-Layer Manual Test', () => {
    test('Can plant nettle and oak on same cell (simple test)', async ({ page }) => {
        await page.goto('http://localhost:8081');
        
        // Wait for game to initialize
        await waitForRenderFrames(page, 20);
        
        const result = await page.evaluate(() => {
            const pm = window.graphicsEngine.plantManager;
            const sm = window.graphicsEngine.soilManager;
            
            // Find a safe non-water cell (avoid edges and center where rivers might be)
            let gridX = 10;
            let gridY = 10;
            
            // Scan for non-water cell
            for (let y = 10; y < 40; y++) {
                for (let x = 10; x < 40; x++) {
                    const soil = sm.getSoilAt(x, y);
                    if (soil && !soil.isWater) {
                        gridX = x;
                        gridY = y;
                        break;
                    }
                }
                if (!sm.getSoilAt(gridX, gridY).isWater) break;
            }
            
            // Plant nettle (middle layer)
            const nettle = pm.addPlant(gridX, gridY, 'urtica_dioica');
            
            // Plant oak (top layer)
            const oak = pm.addPlant(gridX, gridY, 'quercus_robur');
            
            // Get all plants at cell
            const plants = pm.getPlantAt(gridX, gridY);
            
            // Get plants by layer
            const nettleFromMiddle = pm.getPlantAt(gridX, gridY, 'middle');
            const oakFromTop = pm.getPlantAt(gridX, gridY, 'top');
            
            // Get available layers (should only show bottom now)
            const available = pm.getAvailableLayersAt(gridX, gridY);
            
            // Get plantable species (should be empty - middle and top occupied)
            const plantable = pm.getPlantableSpeciesAt(gridX, gridY);
            
            const result = {
                gridX,
                gridY,
                nettlePlanted: nettle !== null,
                oakPlanted: oak !== null,
                totalPlants: plants.length,
                nettleLayer: nettle ? nettle.getLayer() : null,
                oakLayer: oak ? oak.getLayer() : null,
                nettleFromMiddle: nettleFromMiddle !== null,
                oakFromTop: oakFromTop !== null,
                availableLayers: available,
                plantableCount: plantable.length
            };
            
            // Clean up
            pm.removePlant(gridX, gridY);
            
            return result;
        });
        
        console.log('Multi-Layer Test Results:');
        console.log(`  Location: (${result.gridX}, ${result.gridY})`);
        console.log(`  Nettle planted: ${result.nettlePlanted}`);
        console.log(`  Oak planted: ${result.oakPlanted}`);
        console.log(`  Total plants at cell: ${result.totalPlants}`);
        console.log(`  Nettle layer: ${result.nettleLayer}`);
        console.log(`  Oak layer: ${result.oakLayer}`);
        console.log(`  Available layers: [${result.availableLayers.join(', ')}]`);
        console.log(`  Plantable species count: ${result.plantableCount}`);
        
        // Validations
        expect(result.nettlePlanted).toBe(true);
        expect(result.oakPlanted).toBe(true);
        expect(result.totalPlants).toBe(2);
        expect(result.nettleLayer).toBe('middle');
        expect(result.oakLayer).toBe('top');
        expect(result.nettleFromMiddle).toBe(true);
        expect(result.oakFromTop).toBe(true);
        expect(result.availableLayers).toContain('bottom');
        expect(result.availableLayers).toHaveLength(1);
        expect(result.plantableCount).toBe(0); // No species can be planted (only bottom free, no bottom-layer species)
    });
    
    test('Helper methods work correctly', async ({ page }) => {
        await page.goto('http://localhost:8081');
        await waitForRenderFrames(page, 20);
        
        const result = await page.evaluate(() => {
            const pm = window.graphicsEngine.plantManager;
            const sm = window.graphicsEngine.soilManager;
            
            // Find non-water cell
            let gridX = 15;
            let gridY = 15;
            for (let y = 10; y < 40; y++) {
                for (let x = 10; x < 40; x++) {
                    const soil = sm.getSoilAt(x, y);
                    if (soil && !soil.isWater) {
                        gridX = x;
                        gridY = y;
                        break;
                    }
                }
                if (!sm.getSoilAt(gridX, gridY).isWater) break;
            }
            
            // Test 1: Empty cell
            const emptyAvailable = pm.getAvailableLayersAt(gridX, gridY);
            const emptyPlantable = pm.getPlantableSpeciesAt(gridX, gridY);
            const canPlantMiddle = pm.canPlantAt(gridX, gridY, 'middle');
            const canPlantTop = pm.canPlantAt(gridX, gridY, 'top');
            
            // Plant nettle
            pm.addPlant(gridX, gridY, 'urtica_dioica');
            
            // Test 2: Middle occupied
            const middleAvailable = pm.getAvailableLayersAt(gridX, gridY);
            const middlePlantable = pm.getPlantableSpeciesAt(gridX, gridY);
            const canPlantMiddleAfter = pm.canPlantAt(gridX, gridY, 'middle');
            const canPlantTopAfter = pm.canPlantAt(gridX, gridY, 'top');
            
            // Plant oak
            pm.addPlant(gridX, gridY, 'quercus_robur');
            
            // Test 3: Two layers occupied
            const twoAvailable = pm.getAvailableLayersAt(gridX, gridY);
            const twoPlantable = pm.getPlantableSpeciesAt(gridX, gridY);
            
            // Clean up
            pm.removePlant(gridX, gridY);
            
            return {
                empty: {
                    available: emptyAvailable,
                    plantableCount: emptyPlantable.length,
                    canPlantMiddle,
                    canPlantTop
                },
                middleOccupied: {
                    available: middleAvailable,
                    plantableCount: middlePlantable.length,
                    plantableSpecies: middlePlantable.map(p => p.speciesId),
                    canPlantMiddle: canPlantMiddleAfter,
                    canPlantTop: canPlantTopAfter
                },
                twoOccupied: {
                    available: twoAvailable,
                    plantableCount: twoPlantable.length
                }
            };
        });
        
        console.log('Helper Methods Test Results:');
        console.log('Empty cell:', result.empty);
        console.log('Middle occupied:', result.middleOccupied);
        console.log('Two occupied:', result.twoOccupied);
        
        // Empty cell validations
        expect(result.empty.available).toHaveLength(3);
        expect(result.empty.plantableCount).toBe(2); // Nettle and oak
        expect(result.empty.canPlantMiddle).toBe(true);
        expect(result.empty.canPlantTop).toBe(true);
        
        // Middle occupied validations
        expect(result.middleOccupied.available).toHaveLength(2);
        expect(result.middleOccupied.available).not.toContain('middle');
        expect(result.middleOccupied.plantableCount).toBe(1); // Only oak
        expect(result.middleOccupied.plantableSpecies).toContain('quercus_robur');
        expect(result.middleOccupied.canPlantMiddle).toBe(false);
        expect(result.middleOccupied.canPlantTop).toBe(true);
        
        // Two occupied validations
        expect(result.twoOccupied.available).toHaveLength(1);
        expect(result.twoOccupied.available).toContain('bottom');
        expect(result.twoOccupied.plantableCount).toBe(0); // No bottom-layer species
    });
    
    test('Take screenshot of plants on same cell', async ({ page }) => {
        await page.goto('http://localhost:8081');
        await waitForRenderFrames(page, 20);
        
        // Plant both species at visible location
        await page.evaluate(() => {
            const pm = window.graphicsEngine.plantManager;
            const sm = window.graphicsEngine.soilManager;
            
            // Find non-water cell near center
            let gridX = 25;
            let gridY = 25;
            for (let y = 20; y < 30; y++) {
                for (let x = 20; y < 30; x++) {
                    const soil = sm.getSoilAt(x, y);
                    if (soil && !soil.isWater) {
                        gridX = x;
                        gridY = y;
                        break;
                    }
                }
                if (!sm.getSoilAt(gridX, gridY).isWater) break;
            }
            
            // Plant nettle and oak
            pm.addPlant(gridX, gridY, 'urtica_dioica');
            pm.addPlant(gridX, gridY, 'quercus_robur');
            
            console.log(`Planted nettle and oak at (${gridX}, ${gridY})`);
        });
        
        await waitForRenderFrames(page, 10);
        
        // Take screenshot
        await page.screenshot({ 
            path: 'test-results/multi-layer-plants-stacked.png',
            fullPage: false
        });
        
        console.log('✓ Screenshot saved: test-results/multi-layer-plants-stacked.png');
    });
});
