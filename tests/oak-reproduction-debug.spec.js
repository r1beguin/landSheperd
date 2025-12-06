/**
 * Oak Reproduction Debug Test
 * Diagnoses why oak trees are not reproducing after 800+ days
 */

const { test, expect } = require('@playwright/test');

test.describe('Oak Reproduction Debugging', () => {
    test('diagnose oak reproduction failure', async ({ page }) => {
        // Navigate to game
        await page.goto('http://localhost:8081');
        
        // Wait for initialization
        await page.waitForTimeout(3000);
        
        // Enable reproduction logging in console
        await page.evaluate(() => {
            if (window.config?.world?.plants?.reproduction) {
                window.config.world.plants.reproduction.enableLogging = true;
            }
        });
        
        // Get initial game state
        const initialState = await page.evaluate(() => {
            const engine = window.graphicsEngine;
            if (!engine) return { error: 'GraphicsEngine not found' };
            
            const plantManager = engine.plantManager;
            const timeManager = engine.timeManager;
            const allPlants = plantManager.getAllPlants();
            const matureOaks = allPlants.filter(p => 
                p.species.id === 'quercus_robur' && p.stage === 'MatureTree'
            );
            
            return {
                currentDay: timeManager.getCurrentDay(),
                totalPlants: allPlants.length,
                totalOaks: allPlants.filter(p => p.species.id === 'quercus_robur').length,
                matureOaks: matureOaks.length,
                oakDetails: matureOaks.slice(0, 5).map(oak => {
                    const gridCoords = engine.soilManager.worldToGrid(oak.x, oak.y);
                    const soil = engine.soilManager.getSoilAt(gridCoords.x, gridCoords.y);
                    
                    // Check reproduction eligibility
                    const reproConfig = oak.species.reproduction.proximityReproduction;
                    const canAfford = oak.canAffordReproduction(reproConfig.reproductionCost);
                    const daysSinceLast = timeManager.getCurrentDay() - oak.lastReproductionDay;
                    const checkInterval = reproConfig.checkIntervalDays;
                    const intervalPassed = daysSinceLast >= checkInterval;
                    
                    // Check for partners
                    const gridX = gridCoords.x;
                    const gridY = gridCoords.y;
                    const distance = reproConfig.proximityDistance;
                    let partnerCount = 0;
                    
                    for (let dx = -distance; dx <= distance; dx++) {
                        for (let dy = -distance; dy <= distance; dy++) {
                            if (dx === 0 && dy === 0) continue;
                            const neighbor = plantManager.getPlantAt(gridX + dx, gridY + dy, 'top');
                            if (neighbor && neighbor.species.id === 'quercus_robur' && neighbor.stage === 'MatureTree') {
                                partnerCount++;
                            }
                        }
                    }
                    
                    return {
                        position: { x: oak.x, y: oak.y, gridX, gridY },
                        age: oak.age,
                        lastReproductionDay: oak.lastReproductionDay,
                        daysSinceLastRepro: daysSinceLast,
                        intervalPassed,
                        soil: soil ? {
                            surface: {
                                n: soil.nutrientLayers.surface.nitrogen.toFixed(1),
                                p: soil.nutrientLayers.surface.phosphorus.toFixed(1),
                                k: soil.nutrientLayers.surface.potassium.toFixed(1),
                                om: soil.nutrientLayers.surface.organicMatter.toFixed(1)
                            },
                            deep: {
                                n: soil.nutrientLayers.deep.nitrogen.toFixed(1),
                                p: soil.nutrientLayers.deep.phosphorus.toFixed(1),
                                k: soil.nutrientLayers.deep.potassium.toFixed(1),
                                om: soil.nutrientLayers.deep.organicMatter.toFixed(1)
                            }
                        } : null,
                        canAffordReproduction: canAfford,
                        reproductionCost: reproConfig.reproductionCost,
                        partnersNearby: partnerCount,
                        requiresPartner: reproConfig.requiresPartner,
                        activeStage: reproConfig.activeStages.includes(oak.stage),
                        successChance: reproConfig.successChance
                    };
                })
            };
        });
        
        console.log('\n========================================');
        console.log('OAK REPRODUCTION DIAGNOSTIC REPORT');
        console.log('========================================\n');
        console.log('Current Day:', initialState.currentDay);
        console.log('Total Plants:', initialState.totalPlants);
        console.log('Total Oaks:', initialState.totalOaks);
        console.log('Mature Oaks:', initialState.matureOaks);
        console.log('\n--- Sample Oak Analysis (first 5) ---\n');
        
        initialState.oakDetails.forEach((oak, i) => {
            console.log(`\n🌳 Oak #${i + 1} at (${oak.position.gridX}, ${oak.position.gridY})`);
            console.log(`  Age: ${oak.age} days`);
            console.log(`  Last reproduction: Day ${oak.lastReproductionDay} (${oak.daysSinceLastRepro} days ago)`);
            console.log(`  Interval passed (${oak.intervalPassed}): Need 10+ days, has ${oak.daysSinceLastRepro}`);
            console.log(`  Active stage: ${oak.activeStage}`);
            console.log(`  Partners nearby: ${oak.partnersNearby} (requires partner: ${oak.requiresPartner})`);
            console.log(`  Can afford cost: ${oak.canAffordReproduction}`);
            console.log(`  Reproduction cost: N=${oak.reproductionCost.nitrogen}, P=${oak.reproductionCost.phosphorus}, K=${oak.reproductionCost.potassium}, OM=${oak.reproductionCost.organicMatter}`);
            console.log(`  Soil (surface): N=${oak.soil.surface.n}, P=${oak.soil.surface.p}, K=${oak.soil.surface.k}, OM=${oak.soil.surface.om}`);
            console.log(`  Soil (deep): N=${oak.soil.deep.n}, P=${oak.soil.deep.p}, K=${oak.soil.deep.k}, OM=${oak.soil.deep.om}`);
            console.log(`  Success chance: ${oak.successChance * 100}%`);
            
            // Identify blocking factors
            const blockers = [];
            if (!oak.intervalPassed) blockers.push('❌ Interval not passed');
            if (!oak.activeStage) blockers.push('❌ Not in active stage');
            if (oak.requiresPartner && oak.partnersNearby === 0) blockers.push('❌ No partners nearby');
            if (!oak.canAffordReproduction) blockers.push('❌ Cannot afford reproduction cost');
            
            if (blockers.length > 0) {
                console.log(`  🚫 BLOCKERS: ${blockers.join(', ')}`);
            } else {
                console.log(`  ✅ All conditions met - should attempt reproduction!`);
            }
        });
        
        // Advance 50 days and monitor reproduction attempts
        console.log('\n\n--- Advancing 50 days to monitor reproduction ---\n');
        
        const reproductionLog = [];
        
        // Capture console logs
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('reproduction') || text.includes('acorn') || text.includes('Oak')) {
                reproductionLog.push(text);
            }
        });
        
        // Advance time
        for (let i = 0; i < 50; i++) {
            await page.keyboard.press('t'); // Advance 1 day
            await page.waitForTimeout(100);
        }
        
        // Get final state
        const finalState = await page.evaluate(() => {
            const engine = window.graphicsEngine;
            const plantManager = engine.plantManager;
            const allPlants = plantManager.getAllPlants();
            const oaks = allPlants.filter(p => p.species.id === 'quercus_robur');
            
            return {
                totalOaks: oaks.length,
                saplings: oaks.filter(p => p.stage === 'Sapling').length,
                youngTrees: oaks.filter(p => p.stage === 'YoungTree').length,
                matureTrees: oaks.filter(p => p.stage === 'MatureTree').length
            };
        });
        
        console.log('\n--- Final State After 50 Days ---');
        console.log('Total Oaks:', finalState.totalOaks);
        console.log('  Saplings:', finalState.saplings);
        console.log('  Young Trees:', finalState.youngTrees);
        console.log('  Mature Trees:', finalState.matureTrees);
        console.log('\nNew Saplings:', finalState.saplings);
        
        if (reproductionLog.length > 0) {
            console.log('\n--- Reproduction Console Logs ---');
            reproductionLog.forEach(log => console.log(log));
        } else {
            console.log('\n⚠️  NO REPRODUCTION LOGS CAPTURED');
        }
        
        console.log('\n========================================\n');
        
        // Test assertions
        expect(initialState.matureOaks).toBeGreaterThan(0);
        
        // If oaks can't reproduce after 804 days, something is broken
        // This test should help identify what
    });
});
