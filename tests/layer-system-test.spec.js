/**
 * Test for Layer System (Milestone 1)
 * Validates Oak species loading, layer methods, and configuration
 */

import { test, expect } from '@playwright/test';
import { waitForGraphicsEngineReady, getCurrentDayCount, waitForRenderFrames } from './test-utils.js';

test('Layer System - Species Loading and Methods', async ({ page }) => {
    console.log('\n=== Layer System Test ===');
    
    // Navigate and wait for engine
    await page.goto('http://localhost:8081');
    await waitForGraphicsEngineReady(page);
    console.log('✓ Graphics engine ready');
    
    // Wait for species to load
    await page.waitForTimeout(1000);
    
    // Test 1: Verify both species loaded
    const speciesLoaded = await page.evaluate(() => {
        const plantManager = window.graphicsEngine.plantManager;
        return {
            count: plantManager.speciesConfigs.size,
            species: Array.from(plantManager.speciesConfigs.keys()),
            hasNettles: plantManager.speciesConfigs.has('urtica_dioica'),
            hasOak: plantManager.speciesConfigs.has('quercus_robur')
        };
    });
    
    console.log(`Species loaded: ${speciesLoaded.count} - ${speciesLoaded.species.join(', ')}`);
    expect(speciesLoaded.count).toBe(2);
    expect(speciesLoaded.hasNettles).toBe(true);
    expect(speciesLoaded.hasOak).toBe(true);
    console.log('✓ Both species loaded correctly');
    
    // Test 2: Verify getAvailableSpecies() method
    const availableSpecies = await page.evaluate(() => {
        return window.graphicsEngine.plantManager.getAvailableSpecies();
    });
    
    expect(availableSpecies).toEqual(['urtica_dioica', 'quercus_robur']);
    console.log('✓ getAvailableSpecies() works correctly');
    
    // Test 3: Verify species selection methods
    const selectionTest = await page.evaluate(() => {
        const pm = window.graphicsEngine.plantManager;
        const results = {
            initialSelected: pm.getSelectedSpecies(),
            setToOak: null,
            selectedAfterOak: null,
            setToNettle: null,
            selectedAfterNettle: null
        };
        
        // Try setting to oak
        pm.setSelectedSpecies('quercus_robur');
        results.setToOak = true;
        results.selectedAfterOak = pm.getSelectedSpecies();
        
        // Try setting back to nettle
        pm.setSelectedSpecies('urtica_dioica');
        results.setToNettle = true;
        results.selectedAfterNettle = pm.getSelectedSpecies();
        
        return results;
    });
    
    expect(selectionTest.initialSelected).toBe('urtica_dioica');
    expect(selectionTest.selectedAfterOak).toBe('quercus_robur');
    expect(selectionTest.selectedAfterNettle).toBe('urtica_dioica');
    console.log('✓ Species selection methods work correctly');
    
    // Test 4: Place test plants and verify layer methods
    const currentDay = await getCurrentDayCount(page);
    
    const layerTests = await page.evaluate((day) => {
        const pm = window.graphicsEngine.plantManager;
        const results = {
            nettle: null,
            oak: null
        };
        
        // Place nettle at (25, 25)
        pm.setSelectedSpecies('urtica_dioica');
        const nettle = pm.addPlant(25, 25, 'urtica_dioica', day);
        
        if (nettle) {
            results.nettle = {
                layer: nettle.getLayer(),
                renderOffset: nettle.getRenderOffset(),
                lightRequirement: nettle.getLightRequirement(),
                castsShade: nettle.castsShade(),
                shadeStrength: nettle.getShadeStrength(),
                shadeRadius: nettle.getShadeRadius(),
                width: nettle.width,
                height: nettle.height
            };
        }
        
        // Place oak at (27, 27)
        pm.setSelectedSpecies('quercus_robur');
        const oak = pm.addPlant(27, 27, 'quercus_robur', day);
        
        if (oak) {
            results.oak = {
                layer: oak.getLayer(),
                renderOffset: oak.getRenderOffset(),
                lightRequirement: oak.getLightRequirement(),
                castsShade: oak.castsShade(),
                shadeStrength: oak.getShadeStrength(),
                shadeRadius: oak.getShadeRadius(),
                width: oak.width,
                height: oak.height
            };
        }
        
        return results;
    }, currentDay);
    
    console.log('\nNettle layer properties:', layerTests.nettle);
    console.log('Oak layer properties:', layerTests.oak);
    
    // Validate nettle properties
    expect(layerTests.nettle).not.toBeNull();
    expect(layerTests.nettle.layer).toBe('middle');
    expect(layerTests.nettle.renderOffset).toBe(5);
    expect(layerTests.nettle.lightRequirement).toBe(0.6);
    expect(layerTests.nettle.castsShade).toBe(false);
    expect(layerTests.nettle.shadeStrength).toBe(0);
    expect(layerTests.nettle.shadeRadius).toBe(0);
    expect(layerTests.nettle.width).toBe(20); // Default width
    expect(layerTests.nettle.height).toBe(20); // Default height
    console.log('✓ Nettle layer methods work correctly');
    
    // Validate oak properties
    expect(layerTests.oak).not.toBeNull();
    expect(layerTests.oak.layer).toBe('top');
    expect(layerTests.oak.renderOffset).toBe(15);
    expect(layerTests.oak.lightRequirement).toBe(0.9);
    expect(layerTests.oak.castsShade).toBe(false); // Sapling stage doesn't cast shade
    expect(layerTests.oak.shadeStrength).toBe(0); // Not casting shade yet
    expect(layerTests.oak.shadeRadius).toBe(0); // Not casting shade yet
    expect(layerTests.oak.width).toBe(40); // From species config
    expect(layerTests.oak.height).toBe(50); // From species config
    console.log('✓ Oak layer methods work correctly');
    
    // Test 5: Advance oak to YoungTree and verify shade casting
    const oakShadeTest = await page.evaluate(() => {
        const pm = window.graphicsEngine.plantManager;
        const plants = pm.getPlantAt(27, 27);
        const oak = plants.length > 0 ? plants[0] : null;
        
        if (!oak) return null;
        
        // Advance to YoungTree stage
        oak.stage = 'YoungTree';
        
        return {
            stage: oak.stage,
            castsShade: oak.castsShade(),
            shadeStrength: oak.getShadeStrength(),
            shadeRadius: oak.getShadeRadius()
        };
    });
    
    console.log('\nOak in YoungTree stage:', oakShadeTest);
    expect(oakShadeTest.stage).toBe('YoungTree');
    expect(oakShadeTest.castsShade).toBe(true);
    expect(oakShadeTest.shadeStrength).toBe(0.5);
    expect(oakShadeTest.shadeRadius).toBe(1);
    console.log('✓ Oak casts shade in YoungTree stage');
    
    // Test 6: Verify config.json layer configuration
    const layerConfig = await page.evaluate(() => {
        return window.config?.world?.plants?.layers;
    });
    
    console.log('\nLayer configuration:', layerConfig);
    expect(layerConfig).toBeDefined();
    expect(layerConfig.enabled).toBe(true);
    expect(layerConfig.renderOffsets).toEqual({
        bottom: 0,
        middle: 5,
        top: 15
    });
    expect(layerConfig.lightFiltering.enabled).toBe(true);
    expect(layerConfig.lightFiltering.treeShadeStrength).toBe(0.5);
    expect(layerConfig.lightFiltering.shadeRadius).toBe(1);
    console.log('✓ Layer configuration loaded correctly');
    
    // Capture final screenshot
    await page.screenshot({ 
        path: 'test-results/layer-system-test.png',
        fullPage: false
    });
    console.log('✓ Screenshot captured');
    
    console.log('\n=== All Layer System Tests Passed ===\n');
});
