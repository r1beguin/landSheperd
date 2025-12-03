/**
 * Test: Genetics Context Menu Display
 * Validates Milestone 6 - Context Menu Genetics Panel
 * 
 * Tests:
 * 1. Genetics panel appears for oak (genetic species)
 * 2. No genetics panel for nettles (non-genetic species)
 * 3. All 9 traits display correctly
 * 4. Generation number displays
 * 5. Color coding works for different trait values
 */

import { test, expect } from '@playwright/test';
import { waitForRenderFrames, captureScreenshotWithLabel, spawnPlantAt, getPlantManager } from './test-utils.js';

test.describe('Genetics Context Menu Display', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8081');
        await waitForRenderFrames(page, 30);
    });

    test('Genetics panel appears for oak tree', async ({ page }) => {
        console.log('\n=== Test 1: Oak Genetics Panel ===');
        
        // Plant an oak at center
        const planted = await page.evaluate(() => {
            const plantManager = window.graphicsEngine.plantManager;
            const gridX = 25;
            const gridY = 25;
            const worldX = 25 * 20;
            const worldY = 25 * 20;
            
            plantManager.addPlantAtPosition(gridX, gridY, worldX, worldY, 'quercus_robur', 0);
            
            // Get the planted oak
            const plants = plantManager.getPlantAt(gridX, gridY);
            return plants.length > 0;
        });
        
        expect(planted).toBe(true);
        console.log('✓ Oak planted at (25, 25)');
        
        await waitForRenderFrames(page, 10);
        
        // Simulate right-click on oak position
        const canvas = await page.locator('#gameCanvas');
        const box = await canvas.boundingBox();
        
        // Click center of canvas (where oak is)
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;
        
        await canvas.click({ button: 'right', position: { x: box.width / 2, y: box.height / 2 } });
        
        // Wait for context menu to appear
        await page.waitForSelector('#context-menu', { state: 'visible', timeout: 2000 });
        console.log('✓ Context menu opened');
        
        // Check for genetics panel
        const hasGeneticsPanel = await page.evaluate(() => {
            const menu = document.querySelector('#context-menu');
            if (!menu) return false;
            
            // Look for genetics grid
            const geneticsGrid = menu.querySelector('.genetics-grid');
            return geneticsGrid !== null;
        });
        
        expect(hasGeneticsPanel).toBe(true);
        console.log('✓ Genetics panel present');
        
        // Validate genetics panel structure
        const geneticsData = await page.evaluate(() => {
            const menu = document.querySelector('#context-menu');
            const geneticsGrid = menu.querySelector('.genetics-grid');
            
            // Find generation display
            const genDisplay = geneticsGrid.querySelector('.genetics-gen');
            const generation = genDisplay ? genDisplay.textContent : null;
            
            // Count trait bars
            const traits = geneticsGrid.querySelectorAll('.genetics-trait');
            const traitCount = traits.length;
            
            // Get trait details
            const traitDetails = [];
            traits.forEach(trait => {
                const label = trait.querySelector('.trait-label').textContent;
                const value = trait.querySelector('.trait-value').textContent;
                const fill = trait.querySelector('.trait-fill');
                const color = fill ? fill.style.backgroundColor : null;
                
                traitDetails.push({ label, value, color });
            });
            
            return { generation, traitCount, traitDetails };
        });
        
        console.log(`Generation: ${geneticsData.generation}`);
        console.log(`Trait count: ${geneticsData.traitCount}`);
        
        expect(geneticsData.generation).toContain('Generation:');
        expect(geneticsData.traitCount).toBe(9); // 5 visual + 4 nutrient
        
        // Validate trait labels
        const expectedLabels = [
            'Height', 'Width', 'Foliage', 'Trunk Shape', 'Color Tint',
            'N Efficiency', 'P Efficiency', 'K Efficiency', 'OM Efficiency'
        ];
        
        for (let i = 0; i < expectedLabels.length; i++) {
            expect(geneticsData.traitDetails[i].label).toBe(expectedLabels[i]);
            console.log(`✓ Trait ${i + 1}: ${geneticsData.traitDetails[i].label} = ${geneticsData.traitDetails[i].value}`);
        }
        
        await captureScreenshotWithLabel(page, 'genetics-panel-oak');
        console.log('✓ Screenshot captured: genetics-panel-oak.png');
    });

    test('No genetics panel for nettles', async ({ page }) => {
        console.log('\n=== Test 2: Nettles No Genetics Panel ===');
        
        // Plant nettles at center
        const planted = await page.evaluate(() => {
            const plantManager = window.graphicsEngine.plantManager;
            const gridX = 25;
            const gridY = 25;
            const worldX = 25 * 20;
            const worldY = 25 * 20;
            
            plantManager.addPlantAtPosition(gridX, gridY, worldX, worldY, 'urtica_dioica', 0);
            
            const plants = plantManager.getPlantAt(gridX, gridY);
            return plants.length > 0;
        });
        
        expect(planted).toBe(true);
        console.log('✓ Nettles planted at (25, 25)');
        
        await waitForRenderFrames(page, 10);
        
        // Right-click on nettles
        const canvas = await page.locator('#gameCanvas');
        const box = await canvas.boundingBox();
        
        await canvas.click({ button: 'right', position: { x: box.width / 2, y: box.height / 2 } });
        await page.waitForSelector('#context-menu', { state: 'visible', timeout: 2000 });
        
        console.log('✓ Context menu opened');
        
        // Check for genetics panel (should NOT exist)
        const hasGeneticsPanel = await page.evaluate(() => {
            const menu = document.querySelector('#context-menu');
            if (!menu) return false;
            
            const geneticsGrid = menu.querySelector('.genetics-grid');
            return geneticsGrid !== null;
        });
        
        expect(hasGeneticsPanel).toBe(false);
        console.log('✓ No genetics panel for nettles (expected)');
        
        await captureScreenshotWithLabel(page, 'no-genetics-panel-nettles');
    });

    test('Color coding works for different trait values', async ({ page }) => {
        console.log('\n=== Test 3: Genetics Color Coding ===');
        
        // Plant oak and manually modify genetics for testing
        await page.evaluate(() => {
            const plantManager = window.graphicsEngine.plantManager;
            const gridX = 25;
            const gridY = 25;
            const worldX = 25 * 20;
            const worldY = 25 * 20;
            
            plantManager.addPlantAtPosition(gridX, gridY, worldX, worldY, 'quercus_robur', 0);
            
            // Get the oak and modify genetics
            const plants = plantManager.getPlantAt(gridX, gridY);
            const oak = plants[0];
            
            if (oak && oak.genetics) {
                // Set different values to test color coding
                oak.genetics.heightFactor = 220;          // Exceptional high (bright green)
                oak.genetics.widthFactor = 180;           // High (green)
                oak.genetics.foliageDensity = 128;        // Normal (yellow-green)
                oak.genetics.trunkShape = 80;             // Low (yellow)
                oak.genetics.colorTint = 40;              // Very low (red)
                oak.genetics.nitrogenEfficiency = 210;    // Exceptional high
                oak.genetics.phosphorusEfficiency = 170;  // High
                oak.genetics.potassiumEfficiency = 110;   // Normal
                oak.genetics.organicMatterEfficiency = 50; // Very low
            }
        });
        
        await waitForRenderFrames(page, 10);
        
        // Open context menu
        const canvas = await page.locator('#gameCanvas');
        const box = await canvas.boundingBox();
        
        await canvas.click({ button: 'right', position: { x: box.width / 2, y: box.height / 2 } });
        await page.waitForSelector('#context-menu', { state: 'visible', timeout: 2000 });
        
        // Analyze trait colors
        const colorData = await page.evaluate(() => {
            const menu = document.querySelector('#context-menu');
            const geneticsGrid = menu.querySelector('.genetics-grid');
            const traits = geneticsGrid.querySelectorAll('.genetics-trait');
            
            const results = [];
            traits.forEach(trait => {
                const label = trait.querySelector('.trait-label').textContent;
                const value = trait.querySelector('.trait-value').textContent;
                const fill = trait.querySelector('.trait-fill');
                const color = fill ? fill.style.backgroundColor : 'unknown';
                const width = fill ? fill.style.width : '0%';
                
                results.push({ label, value, color, width });
            });
            
            return results;
        });
        
        console.log('\n--- Trait Colors ---');
        colorData.forEach(trait => {
            console.log(`${trait.label.padEnd(20)} ${trait.value.padEnd(8)} Color: ${trait.color.padEnd(20)} Width: ${trait.width}`);
        });
        
        // Validate color coding
        // Height (220) should be bright green (#2e7d32)
        expect(colorData[0].color).toContain('rgb(46, 125, 50)');
        console.log('✓ Exceptional high trait (220) = bright green');
        
        // Width (180) should be green (#4a7c59)
        expect(colorData[1].color).toContain('rgb(74, 124, 89)');
        console.log('✓ High trait (180) = green');
        
        // Trunk Shape (80) should be yellow (#d4a017)
        expect(colorData[3].color).toContain('rgb(212, 160, 23)');
        console.log('✓ Low trait (80) = yellow');
        
        // Color Tint (40) should be brown-red (#a0522d)
        expect(colorData[4].color).toContain('rgb(160, 82, 45)');
        console.log('✓ Very low trait (40) = brown-red');
        
        await captureScreenshotWithLabel(page, 'genetics-color-coding');
        console.log('✓ Screenshot captured: genetics-color-coding.png');
    });

    test('Generation number increments for offspring', async ({ page }) => {
        console.log('\n=== Test 4: Generation Inheritance ===');
        
        // Plant parent oak
        await page.evaluate(() => {
            const plantManager = window.graphicsEngine.plantManager;
            plantManager.addPlantAtPosition(25, 25, 500, 500, 'quercus_robur', 0);
        });
        
        await waitForRenderFrames(page, 10);
        
        // Get parent generation
        const parentGen = await page.evaluate(() => {
            const plantManager = window.graphicsEngine.plantManager;
            const plants = plantManager.getPlantAt(25, 25);
            return plants[0]?.genetics?.generation || -1;
        });
        
        console.log(`Parent generation: ${parentGen}`);
        expect(parentGen).toBe(0);
        
        // Simulate offspring creation
        await page.evaluate(() => {
            const plantManager = window.graphicsEngine.plantManager;
            const parent = plantManager.getPlantAt(25, 25)[0];
            
            // Create offspring with crossover genetics
            const offspringGenetics = window.Plant.crossoverGenetics(parent.genetics, parent.genetics);
            offspringGenetics.generation = parent.genetics.generation + 1;
            
            // Manually create offspring plant
            const oak = new window.Plant(520, 520, parent.species, 'Seedling', 0);
            oak.genetics = offspringGenetics;
            
            plantManager.plants.set(plantManager.nextPlantId++, {
                plant: oak,
                gridX: 26,
                gridY: 26
            });
        });
        
        await waitForRenderFrames(page, 10);
        
        // Get offspring generation
        const offspringGen = await page.evaluate(() => {
            const plantManager = window.graphicsEngine.plantManager;
            const plants = plantManager.getPlantAt(26, 26);
            return plants[0]?.genetics?.generation || -1;
        });
        
        console.log(`Offspring generation: ${offspringGen}`);
        expect(offspringGen).toBe(1);
        console.log('✓ Generation incremented correctly');
        
        // Open context menu on offspring
        const canvas = await page.locator('#gameCanvas');
        await canvas.click({ button: 'right', position: { x: 340, y: 200 } });
        await page.waitForSelector('#context-menu', { state: 'visible', timeout: 2000 });
        
        // Validate generation display
        const displayedGen = await page.evaluate(() => {
            const menu = document.querySelector('#context-menu');
            const geneticsGrid = menu.querySelector('.genetics-grid');
            const genDisplay = geneticsGrid.querySelector('.genetics-gen');
            return genDisplay ? genDisplay.textContent : null;
        });
        
        console.log(`Displayed: ${displayedGen}`);
        expect(displayedGen).toBe('Generation: 1');
        console.log('✓ Generation displayed correctly in UI');
        
        await captureScreenshotWithLabel(page, 'genetics-generation-offspring');
    });
});
