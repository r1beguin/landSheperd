/**
 * Multi-Layer Plant System Test
 * Tests helper methods and context menu UI for multi-layer planting
 */

import { test, expect } from '@playwright/test';

test.describe('Multi-Layer Plant System', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8081');
        
        // Wait for game to initialize
        await page.waitForTimeout(2000);
        
        // Wait for WebGL context
        await page.waitForFunction(() => {
            return window.graphicsEngine && 
                   window.graphicsEngine.plantManager && 
                   window.graphicsEngine.soilManager;
        });
    });
    
    test('PlantManager helper methods - getAvailableLayersAt', async ({ page }) => {
        const result = await page.evaluate(() => {
            const pm = window.graphicsEngine.plantManager;
            const gridX = 10;
            const gridY = 10;
            
            // Test 1: Empty cell should return all layers
            const availableEmpty = pm.getAvailableLayersAt(gridX, gridY);
            
            // Plant a nettle (middle layer)
            pm.addPlant(gridX, gridY, 'urtica_dioica');
            
            // Test 2: One layer occupied should return 2 available
            const availableOne = pm.getAvailableLayersAt(gridX, gridY);
            
            // Plant an oak (top layer)
            pm.addPlant(gridX, gridY, 'quercus_robur');
            
            // Test 3: Two layers occupied should return 1 available
            const availableTwo = pm.getAvailableLayersAt(gridX, gridY);
            
            // Clean up
            pm.removePlant(gridX, gridY);
            
            return {
                emptyCell: availableEmpty,
                oneOccupied: availableOne,
                twoOccupied: availableTwo
            };
        });
        
        // Validate empty cell returns all 3 layers
        expect(result.emptyCell).toHaveLength(3);
        expect(result.emptyCell).toContain('bottom');
        expect(result.emptyCell).toContain('middle');
        expect(result.emptyCell).toContain('top');
        
        // Validate one occupied returns 2 layers (not middle)
        expect(result.oneOccupied).toHaveLength(2);
        expect(result.oneOccupied).toContain('bottom');
        expect(result.oneOccupied).toContain('top');
        expect(result.oneOccupied).not.toContain('middle');
        
        // Validate two occupied returns 1 layer (bottom only)
        expect(result.twoOccupied).toHaveLength(1);
        expect(result.twoOccupied).toContain('bottom');
    });
    
    test('PlantManager helper methods - canPlantAt', async ({ page }) => {
        const result = await page.evaluate(() => {
            const pm = window.graphicsEngine.plantManager;
            const gridX = 15;
            const gridY = 15;
            
            // Test empty cell
            const canPlantMiddleEmpty = pm.canPlantAt(gridX, gridY, 'middle');
            const canPlantTopEmpty = pm.canPlantAt(gridX, gridY, 'top');
            
            // Plant nettle on middle layer
            pm.addPlant(gridX, gridY, 'urtica_dioica');
            
            // Test occupied layer
            const canPlantMiddleOccupied = pm.canPlantAt(gridX, gridY, 'middle');
            const canPlantTopAvailable = pm.canPlantAt(gridX, gridY, 'top');
            
            // Clean up
            pm.removePlant(gridX, gridY);
            
            return {
                emptyMiddle: canPlantMiddleEmpty,
                emptyTop: canPlantTopEmpty,
                occupiedMiddle: canPlantMiddleOccupied,
                availableTop: canPlantTopAvailable
            };
        });
        
        // Empty cell should allow planting on all layers
        expect(result.emptyMiddle).toBe(true);
        expect(result.emptyTop).toBe(true);
        
        // Occupied layer should block, available should allow
        expect(result.occupiedMiddle).toBe(false);
        expect(result.availableTop).toBe(true);
    });
    
    test('PlantManager helper methods - getPlantableSpeciesAt', async ({ page }) => {
        const result = await page.evaluate(() => {
            const pm = window.graphicsEngine.plantManager;
            const gridX = 20;
            const gridY = 20;
            
            // Test empty cell - should return both species
            const emptyCell = pm.getPlantableSpeciesAt(gridX, gridY);
            
            // Plant nettle (middle layer)
            pm.addPlant(gridX, gridY, 'urtica_dioica');
            
            // Test with middle occupied - should return only oak (top layer)
            const middleOccupied = pm.getPlantableSpeciesAt(gridX, gridY);
            
            // Plant oak (top layer)
            pm.addPlant(gridX, gridY, 'quercus_robur');
            
            // Test with middle and top occupied - should return none
            const twoOccupied = pm.getPlantableSpeciesAt(gridX, gridY);
            
            // Clean up
            pm.removePlant(gridX, gridY);
            
            return {
                emptyCell,
                middleOccupied,
                twoOccupied
            };
        });
        
        // Empty cell should return both species
        expect(result.emptyCell).toHaveLength(2);
        const speciesIds = result.emptyCell.map(s => s.speciesId);
        expect(speciesIds).toContain('urtica_dioica');
        expect(speciesIds).toContain('quercus_robur');
        
        // Middle occupied should return only oak
        expect(result.middleOccupied).toHaveLength(1);
        expect(result.middleOccupied[0].speciesId).toBe('quercus_robur');
        expect(result.middleOccupied[0].layer).toBe('top');
        
        // Two occupied should return empty
        expect(result.twoOccupied).toHaveLength(0);
    });
    
    test('Context menu shows plantable species with layer indicators', async ({ page }) => {
        // Right-click empty soil
        const canvas = page.locator('#gameCanvas');
        await canvas.click({ button: 'right', position: { x: 400, y: 300 } });
        
        // Wait for context menu
        await page.waitForSelector('#context-menu', { state: 'visible' });
        
        // Check for plant species buttons
        const nettleButton = page.locator('button[data-species="urtica_dioica"]');
        const oakButton = page.locator('button[data-species="quercus_robur"]');
        
        await expect(nettleButton).toBeVisible();
        await expect(oakButton).toBeVisible();
        
        // Verify button text includes layer
        const nettleText = await nettleButton.textContent();
        const oakText = await oakButton.textContent();
        
        expect(nettleText).toContain('middle');
        expect(oakText).toContain('top');
        
        // Verify layer color indicators (border-left)
        const nettleStyle = await nettleButton.getAttribute('style');
        const oakStyle = await oakButton.getAttribute('style');
        
        expect(nettleStyle).toContain('border-left');
        expect(oakStyle).toContain('border-left');
    });
    
    test('Can plant nettle and oak on same cell', async ({ page }) => {
        const result = await page.evaluate(async () => {
            const pm = window.graphicsEngine.plantManager;
            const sm = window.graphicsEngine.soilManager;
            const canvas = document.getElementById('gameCanvas');
            const rect = canvas.getBoundingClientRect();
            
            // Get canvas center in world coordinates
            const screenX = rect.width / 2;
            const screenY = rect.height / 2;
            
            // Convert to world coordinates (assuming camera at origin)
            const cam = window.graphicsEngine.cameraManager;
            const worldPos = cam.screenToWorld(screenX, screenY);
            const gridPos = sm.worldToGrid(worldPos.x, worldPos.y);
            
            // Plant nettle
            const nettle = pm.addPlant(gridPos.x, gridPos.y, 'urtica_dioica');
            
            // Plant oak on same cell
            const oak = pm.addPlant(gridPos.x, gridPos.y, 'quercus_robur');
            
            // Get both plants
            const plants = pm.getPlantAt(gridPos.x, gridPos.y);
            
            const result = {
                gridX: gridPos.x,
                gridY: gridPos.y,
                nettlePlanted: nettle !== null,
                oakPlanted: oak !== null,
                plantsAtCell: plants.length,
                nettleLayer: nettle ? nettle.getLayer() : null,
                oakLayer: oak ? oak.getLayer() : null
            };
            
            // Clean up
            pm.removePlant(gridPos.x, gridPos.y);
            
            return result;
        });
        
        // Validate both planted successfully
        expect(result.nettlePlanted).toBe(true);
        expect(result.oakPlanted).toBe(true);
        expect(result.plantsAtCell).toBe(2);
        
        // Validate correct layers
        expect(result.nettleLayer).toBe('middle');
        expect(result.oakLayer).toBe('top');
        
        console.log('✓ Successfully planted nettle and oak on same cell');
        console.log(`  Grid: (${result.gridX}, ${result.gridY})`);
        console.log(`  Nettle: ${result.nettleLayer} layer`);
        console.log(`  Oak: ${result.oakLayer} layer`);
    });
    
    test('Context menu shows multi-layer info for occupied cell', async ({ page }) => {
        // Plant both species at specific location
        await page.evaluate(() => {
            const pm = window.graphicsEngine.plantManager;
            pm.addPlant(25, 25, 'urtica_dioica');
            pm.addPlant(25, 25, 'quercus_robur');
        });
        
        // Wait for render
        await page.waitForTimeout(500);
        
        // Right-click the cell with both plants
        // Calculate screen position for grid (25, 25)
        const screenPos = await page.evaluate(() => {
            const cam = window.graphicsEngine.cameraManager;
            const sm = window.graphicsEngine.soilManager;
            const worldX = 25 * sm.cellSize + sm.cellSize / 2;
            const worldY = 25 * sm.cellSize + sm.cellSize / 2;
            return cam.worldToScreen(worldX, worldY);
        });
        
        const canvas = page.locator('#gameCanvas');
        await canvas.click({ button: 'right', position: screenPos });
        
        // Wait for context menu
        await page.waitForSelector('#context-menu', { state: 'visible' });
        
        // Check for layer headers
        const topHeader = page.locator('.layer-header:has-text("[TOP]")');
        const middleHeader = page.locator('.layer-header:has-text("[MIDDLE]")');
        const bottomHeader = page.locator('.layer-header:has-text("[BOTTOM]")');
        
        await expect(topHeader).toBeVisible();
        await expect(middleHeader).toBeVisible();
        await expect(bottomHeader).toBeVisible();
        
        // Check for plant info
        const plantInfo = page.locator('.layer-plant-info');
        const count = await plantInfo.count();
        
        // Should show info for 2 plants (oak and nettle)
        expect(count).toBeGreaterThanOrEqual(2);
        
        // Check for layer-specific action buttons
        const removeButtons = page.locator('button[data-action="remove-layer"]');
        const advanceButtons = page.locator('button[data-action="advance-layer"]');
        
        const removeCount = await removeButtons.count();
        const advanceCount = await advanceButtons.count();
        
        expect(removeCount).toBe(2); // One per plant
        expect(advanceCount).toBe(2);
        
        // Clean up
        await page.evaluate(() => {
            window.graphicsEngine.plantManager.removePlant(25, 25);
        });
    });
    
    test('Layer-specific remove button works correctly', async ({ page }) => {
        // Plant both species
        await page.evaluate(() => {
            const pm = window.graphicsEngine.plantManager;
            pm.addPlant(30, 30, 'urtica_dioica');
            pm.addPlant(30, 30, 'quercus_robur');
        });
        
        await page.waitForTimeout(500);
        
        // Right-click cell
        const screenPos = await page.evaluate(() => {
            const cam = window.graphicsEngine.cameraManager;
            const sm = window.graphicsEngine.soilManager;
            const worldX = 30 * sm.cellSize + sm.cellSize / 2;
            const worldY = 30 * sm.cellSize + sm.cellSize / 2;
            return cam.worldToScreen(worldX, worldY);
        });
        
        const canvas = page.locator('#gameCanvas');
        await canvas.click({ button: 'right', position: screenPos });
        
        // Wait for menu
        await page.waitForSelector('#context-menu', { state: 'visible' });
        
        // Click remove button for middle layer (nettle)
        const removeMiddle = page.locator('button[data-action="remove-layer"][data-layer="middle"]');
        await removeMiddle.click();
        
        // Wait for menu to close
        await page.waitForSelector('#context-menu', { state: 'hidden' });
        
        // Verify nettle removed, oak remains
        const result = await page.evaluate(() => {
            const pm = window.graphicsEngine.plantManager;
            const plants = pm.getPlantAt(30, 30);
            return {
                count: plants.length,
                hasMiddle: pm.getPlantAt(30, 30, 'middle') !== null,
                hasTop: pm.getPlantAt(30, 30, 'top') !== null
            };
        });
        
        expect(result.count).toBe(1);
        expect(result.hasMiddle).toBe(false); // Nettle removed
        expect(result.hasTop).toBe(true);     // Oak remains
        
        console.log('✓ Layer-specific remove works correctly');
        console.log('  Removed nettle from middle layer');
        console.log('  Oak remains on top layer');
        
        // Clean up
        await page.evaluate(() => {
            window.graphicsEngine.plantManager.removePlant(30, 30);
        });
    });
    
    test('Visual: Take screenshot of multi-layer context menu', async ({ page }) => {
        // Plant both species at visible location
        await page.evaluate(() => {
            const pm = window.graphicsEngine.plantManager;
            pm.addPlant(25, 25, 'urtica_dioica');
            pm.addPlant(25, 25, 'quercus_robur');
        });
        
        await page.waitForTimeout(500);
        
        // Right-click to show context menu
        const screenPos = await page.evaluate(() => {
            const cam = window.graphicsEngine.cameraManager;
            const sm = window.graphicsEngine.soilManager;
            const worldX = 25 * sm.cellSize + sm.cellSize / 2;
            const worldY = 25 * sm.cellSize + sm.cellSize / 2;
            return cam.worldToScreen(worldX, worldY);
        });
        
        const canvas = page.locator('#gameCanvas');
        await canvas.click({ button: 'right', position: screenPos });
        
        // Wait for menu
        await page.waitForSelector('#context-menu', { state: 'visible' });
        await page.waitForTimeout(500);
        
        // Take screenshot
        await page.screenshot({ 
            path: 'test-results/multi-layer-context-menu.png',
            fullPage: false
        });
        
        console.log('✓ Screenshot saved: test-results/multi-layer-context-menu.png');
        
        // Clean up
        await page.keyboard.press('Escape');
        await page.evaluate(() => {
            window.graphicsEngine.plantManager.removePlant(25, 25);
        });
    });
});
