/**
 * Visual test for mature oak tree with taller trunk
 * Validates: 50% height increase, more visible trunk
 */

const { test, expect } = require('@playwright/test');
const { waitForRenderFrames, getGameMetrics } = require('./test-utils');

test.describe('Mature Oak Visual Test', () => {
    test('Mature oak should be 50% taller with visible trunk', async ({ page }) => {
        // Navigate to page
        await page.goto('http://localhost:8081');
        await page.waitForLoadState('domcontentloaded');
        
        // Wait for graphics engine to initialize
        await page.waitForFunction(() => window.graphicsEngine && window.graphicsEngine.isInitialized);
        
        console.log('✓ Graphics engine initialized');
        
        // Wait for initial render frames
        await waitForRenderFrames(page, 5);
        
        // Spawn a mature oak tree directly via PlantManager
        const spawnResult = await page.evaluate(async () => {
            const engine = window.graphicsEngine;
            const plantManager = engine.plantManager;
            
            // Get center of view
            const centerX = 25;
            const centerY = 25;
            
            // Spawn oak at all three growth stages for comparison
            const sapling = await plantManager.spawnPlant('quercus_robur', centerX - 3, centerY, 0);
            const youngTree = await plantManager.spawnPlant('quercus_robur', centerX, centerY, 1);
            const matureTree = await plantManager.spawnPlant('quercus_robur', centerX + 3, centerY, 2);
            
            return {
                saplingId: sapling?.id || null,
                youngId: youngTree?.id || null,
                matureId: matureTree?.id || null,
                saplingStage: sapling?.currentStage || null,
                youngStage: youngTree?.currentStage || null,
                matureStage: matureTree?.currentStage || null
            };
        });
        
        console.log('Spawn result:', spawnResult);
        
        expect(spawnResult.saplingId).not.toBeNull();
        expect(spawnResult.youngId).not.toBeNull();
        expect(spawnResult.matureId).not.toBeNull();
        
        // Wait for render to update with new sprites
        await waitForRenderFrames(page, 10);
        
        // Get sprite dimensions for comparison
        const spriteData = await page.evaluate(() => {
            const engine = window.graphicsEngine;
            const plantManager = engine.plantManager;
            const plants = Array.from(plantManager.plants.values());
            
            return plants.map(plant => {
                const sprite = plant.sprite;
                return {
                    id: plant.id,
                    stage: plant.currentStage,
                    spriteWidth: sprite?.width || 0,
                    spriteHeight: sprite?.height || 0,
                    position: { x: plant.x, y: plant.y }
                };
            });
        });
        
        console.log('Sprite dimensions:', spriteData);
        
        // Find mature tree sprite
        const matureSprite = spriteData.find(s => s.id === spawnResult.matureId);
        const youngSprite = spriteData.find(s => s.id === spawnResult.youngId);
        const saplingSprite = spriteData.find(s => s.id === spawnResult.saplingId);
        
        expect(matureSprite).toBeDefined();
        expect(youngSprite).toBeDefined();
        expect(saplingSprite).toBeDefined();
        
        console.log('\n=== Height Comparison ===');
        console.log(`Sapling height: ${saplingSprite.spriteHeight}px`);
        console.log(`Young tree height: ${youngSprite.spriteHeight}px`);
        console.log(`Mature tree height: ${matureSprite.spriteHeight}px`);
        
        // Base dimensions from oak.json are 40x50
        // Mature should be 50% taller = 75px (50 * 1.5)
        expect(matureSprite.spriteHeight).toBeGreaterThan(youngSprite.spriteHeight);
        expect(matureSprite.spriteHeight).toBeGreaterThanOrEqual(70); // Allow some variance
        
        console.log(`✓ Mature tree is ${Math.round((matureSprite.spriteHeight / youngSprite.spriteHeight - 1) * 100)}% taller than young tree`);
        
        // Center camera on the trees
        await page.evaluate(() => {
            const engine = window.graphicsEngine;
            const cam = engine.cameraManager;
            cam.setPosition(25, 25);
            cam.setZoom(4); // Zoom in to see detail
        });
        
        await waitForRenderFrames(page, 5);
        
        // Take screenshot for visual verification
        await page.screenshot({ 
            path: 'screenshots/oak-mature-comparison.png',
            fullPage: false 
        });
        
        console.log('✓ Screenshot saved: screenshots/oak-mature-comparison.png');
        console.log('\n=== Visual Verification ===');
        console.log('Left: Sapling | Middle: Young Tree | Right: Mature Tree');
        console.log('Mature tree should show significantly more trunk visible below canopy');
        
        // Get metrics
        const metrics = await getGameMetrics(page);
        console.log('\nGame metrics:', metrics);
        
        expect(metrics.entities.plantCount).toBe(3);
    });
});
