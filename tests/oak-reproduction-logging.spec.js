/**
 * Oak Reproduction Logging Test
 * 
 * Verifies that comprehensive reproduction logging works:
 * - Logs nutrient failures with actual vs required values
 * - Logs success roll failures
 * - Logs partner search failures
 * - Logs spawn location failures
 * - Logs successful reproduction
 * 
 * HOW TO RUN:
 * npm run verify:interactive -- tests/oak-reproduction-logging.spec.js
 * 
 * WHAT TO EXPECT:
 * - Two oak trees placed close together (within 3 cells)
 * - Fast-forward 20 days to trigger reproduction attempts
 * - Console logs showing why reproduction fails or succeeds
 * - If nutrients are low: detailed nutrient logs
 * - If nutrients are good: success logs with offspring location
 */

const { test, expect } = require('@playwright/test');
const { 
    waitForRenderFrames, 
    clickOnCanvas, 
    spawnPlantAt, 
    getGameMetrics,
    getConsoleLogs 
} = require('./test-utils');

test.describe('Oak Reproduction Logging', () => {
    test('should log detailed reproduction attempts', async ({ page }) => {
        await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
        await page.waitForFunction(() => window.graphicsEngine?.isInitialized, { timeout: 5000 });
        await waitForRenderFrames(page, 10);

        console.log('\n=== Oak Reproduction Logging Test ===\n');

        // Spawn two mature oaks close together (within proximity distance = 3)
        const oak1 = await spawnPlantAt(page, 50, 50, 'quercus_robur', 'MatureTree');
        const oak2 = await spawnPlantAt(page, 52, 50, 'quercus_robur', 'MatureTree');

        expect(oak1.success).toBe(true);
        expect(oak2.success).toBe(true);

        console.log(`✓ Spawned oak1 at (50, 50) - stage: MatureTree`);
        console.log(`✓ Spawned oak2 at (52, 50) - stage: MatureTree`);
        console.log(`✓ Distance: 2 cells (within proximityDistance: 3)\n`);

        // Get initial soil nutrients at oak1 location
        const initialSoil = await page.evaluate(async (coords) => {
            const soil = window.graphicsEngine.soilManager.getSoilAt(coords.x, coords.y);
            if (!soil) return null;

            // Check if soil has layered nutrients
            if (soil.nutrientLayers) {
                return {
                    surface: {
                        nitrogen: soil.nutrientLayers.surface.nitrogen,
                        phosphorus: soil.nutrientLayers.surface.phosphorus,
                        potassium: soil.nutrientLayers.surface.potassium,
                        organicMatter: soil.nutrientLayers.surface.organicMatter
                    },
                    deep: {
                        nitrogen: soil.nutrientLayers.deep.nitrogen,
                        phosphorus: soil.nutrientLayers.deep.phosphorus,
                        potassium: soil.nutrientLayers.deep.potassium,
                        organicMatter: soil.nutrientLayers.deep.organicMatter
                    }
                };
            } else {
                return {
                    nitrogen: soil.nitrogen,
                    phosphorus: soil.phosphorus,
                    potassium: soil.potassium,
                    organicMatter: soil.organicMatter
                };
            }
        }, oak1.gridCoords);

        console.log('Initial soil at oak1 location:');
        if (initialSoil.surface) {
            console.log(`  Surface: N=${initialSoil.surface.nitrogen.toFixed(1)} P=${initialSoil.surface.phosphorus.toFixed(1)} K=${initialSoil.surface.potassium.toFixed(1)} OM=${initialSoil.surface.organicMatter.toFixed(1)}`);
            console.log(`  Deep:    N=${initialSoil.deep.nitrogen.toFixed(1)} P=${initialSoil.deep.phosphorus.toFixed(1)} K=${initialSoil.deep.potassium.toFixed(1)} OM=${initialSoil.deep.organicMatter.toFixed(1)}`);
        } else {
            console.log(`  N=${initialSoil.nitrogen.toFixed(1)} P=${initialSoil.phosphorus.toFixed(1)} K=${initialSoil.potassium.toFixed(1)} OM=${initialSoil.organicMatter.toFixed(1)}`);
        }

        console.log('\nReproduction requirements (oak):');
        console.log('  Cost: N=25 P=20 K=15 OM=10 (+5 buffer = N30 P25 K20 OM15 total)');
        console.log('  checkIntervalDays: 10');
        console.log('  successChance: 25%');
        console.log('  proximityDistance: 3');
        console.log('  maxOffspringDistance: 5\n');

        // Fast-forward 20 days to trigger multiple reproduction attempts
        console.log('Fast-forwarding 20 days (2 reproduction check cycles)...\n');
        
        await page.evaluate(() => {
            const timeManager = window.graphicsEngine.timeManager;
            // Advance 20 days
            for (let i = 0; i < 20; i++) {
                timeManager.advanceDay();
            }
        });

        await waitForRenderFrames(page, 30);

        // Get console logs with reproduction messages
        const logs = await getConsoleLogs(page);
        const reproLogs = logs.filter(log => 
            log.text.includes('[REPRO') || 
            log.text.includes('Oak reproduction') ||
            log.text.includes('acorn')
        );

        console.log('Reproduction logs captured:');
        if (reproLogs.length > 0) {
            reproLogs.forEach(log => {
                console.log(`  ${log.text}`);
            });
        } else {
            console.log('  (No reproduction logs found - check if enableLogging is true in config.json)');
        }

        // Count oak saplings
        const oakCount = await page.evaluate(() => {
            const plants = window.graphicsEngine.plantManager.plants;
            return plants.filter(p => p.species.id === 'quercus_robur').length;
        });

        console.log(`\nTotal oaks after 20 days: ${oakCount} (started with 2)`);
        if (oakCount > 2) {
            console.log(`✓ SUCCESS: ${oakCount - 2} new oak sapling(s) spawned!`);
        } else {
            console.log('✗ No new oaks - check reproduction logs above for failure reasons');
        }

        // Get final soil nutrients
        const finalSoil = await page.evaluate(async (coords) => {
            const soil = window.graphicsEngine.soilManager.getSoilAt(coords.x, coords.y);
            if (!soil) return null;

            if (soil.nutrientLayers) {
                return {
                    surface: {
                        nitrogen: soil.nutrientLayers.surface.nitrogen,
                        phosphorus: soil.nutrientLayers.surface.phosphorus,
                        potassium: soil.nutrientLayers.surface.potassium,
                        organicMatter: soil.nutrientLayers.surface.organicMatter
                    },
                    deep: {
                        nitrogen: soil.nutrientLayers.deep.nitrogen,
                        phosphorus: soil.nutrientLayers.deep.phosphorus,
                        potassium: soil.nutrientLayers.deep.potassium,
                        organicMatter: soil.nutrientLayers.deep.organicMatter
                    }
                };
            } else {
                return {
                    nitrogen: soil.nitrogen,
                    phosphorus: soil.phosphorus,
                    potassium: soil.potassium,
                    organicMatter: soil.organicMatter
                };
            }
        }, oak1.gridCoords);

        console.log('\nFinal soil at oak1 location:');
        if (finalSoil.surface) {
            console.log(`  Surface: N=${finalSoil.surface.nitrogen.toFixed(1)} P=${finalSoil.surface.phosphorus.toFixed(1)} K=${finalSoil.surface.potassium.toFixed(1)} OM=${finalSoil.surface.organicMatter.toFixed(1)}`);
            console.log(`  Deep:    N=${finalSoil.deep.nitrogen.toFixed(1)} P=${finalSoil.deep.phosphorus.toFixed(1)} K=${finalSoil.deep.potassium.toFixed(1)} OM=${finalSoil.deep.organicMatter.toFixed(1)}`);
        } else {
            console.log(`  N=${finalSoil.nitrogen.toFixed(1)} P=${finalSoil.phosphorus.toFixed(1)} K=${finalSoil.potassium.toFixed(1)} OM=${finalSoil.organicMatter.toFixed(1)}`);
        }

        console.log('\n=== Test Complete ===\n');

        // Test passes if we captured reproduction logs (success or failure)
        expect(reproLogs.length).toBeGreaterThan(0);
    });
});
