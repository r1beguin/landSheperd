const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const {
    waitForRenderFrames,
    clickOnCanvas,
    simulateKeyPress,
    advanceGameTime,
    getGameMetrics,
    spawnPlantAt,
    waitForCondition
} = require('./test-utils');

/**
 * Visual Feedback System Test - Phase 3
 * 
 * Tests the nutrient-based visual feedback system by spawning plants
 * in different nutrient conditions and capturing screenshots showing
 * color tinting based on deficiencies.
 * 
 * Expected visual effects:
 * - Nitrogen deficiency: Yellow/pale leaves
 * - Phosphorus deficiency: Purple/reddish tint
 * - Potassium deficiency: Brown edges
 * - Organic matter deficiency: Dull/desaturated
 * - Optimal conditions: Vibrant green
 */

const CONFIG = {
    visualDir: 'test-results/visual-feedback',
    screenshotDir: 'test-results/visual-feedback/screenshots',
    waitForInitMs: 2000
};

function ensureDirs() {
    const dirs = [CONFIG.visualDir, CONFIG.screenshotDir];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

function getTimestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
}

test.describe('Visual Feedback System', () => {
    test.beforeAll(() => {
        ensureDirs();
    });

    test('Nutrient-based plant color tinting', async ({ page }) => {
        const timestamp = getTimestamp();
        const screenshots = [];

        // Navigate to application
        await page.goto('http://localhost:8081');
        await page.waitForTimeout(CONFIG.waitForInitMs);

        console.log('[TEST] Starting visual feedback test...');

        // Screenshot 1: Initial state
        const initialMetrics = await getGameMetrics(page);
        const initialPath = path.join(CONFIG.screenshotDir, `${timestamp}-01-initial.png`);
        await page.screenshot({ path: initialPath });
        screenshots.push({ name: '01-initial', metrics: initialMetrics });
        console.log(`[SCREENSHOT] Captured initial state`);

        // Spawn plants in different soil conditions by spawning in different locations
        // The procedurally generated soil should have varying nutrient levels
        
        // Find soil with different nutrient profiles by sampling multiple locations
        const testLocations = [
            { x: 15, y: 15, label: 'location-A' },
            { x: 35, y: 15, label: 'location-B' },
            { x: 15, y: 35, label: 'location-C' },
            { x: 35, y: 35, label: 'location-D' },
            { x: 25, y: 25, label: 'location-center' }
        ];

        // Get soil nutrient data for each location
        const soilData = await page.evaluate((locations) => {
            const results = [];
            for (const loc of locations) {
                const soil = window.graphicsEngine?.soilManager?.getSoilAt(loc.x, loc.y);
                if (soil) {
                    results.push({
                        label: loc.label,
                        x: loc.x,
                        y: loc.y,
                        nitrogen: soil.nitrogen,
                        phosphorus: soil.phosphorus,
                        potassium: soil.potassium,
                        organicMatter: soil.organicMatter,
                        fertility: soil.fertility
                    });
                }
            }
            return results;
        }, testLocations);

        console.log('[SOIL] Nutrient levels at test locations:');
        soilData.forEach(soil => {
            console.log(`  ${soil.label} (${soil.x},${soil.y}): N=${soil.nitrogen.toFixed(1)}, P=${soil.phosphorus.toFixed(1)}, K=${soil.potassium.toFixed(1)}, OM=${soil.organicMatter.toFixed(1)}, F=${soil.fertility.toFixed(1)}`);
        });

        // Spawn plants at all test locations
        for (const loc of testLocations) {
            await spawnPlantAt(page, loc.x, loc.y);
            await waitForRenderFrames(page, 3);
        }

        // Screenshot 2: Plants spawned in various nutrient conditions
        const spawnedPath = path.join(CONFIG.screenshotDir, `${timestamp}-02-plants-spawned.png`);
        await page.screenshot({ path: spawnedPath });
        screenshots.push({ name: '02-plants-spawned', soilData });
        console.log(`[SCREENSHOT] Captured plants in various soil conditions`);

        // Wait a bit to ensure rendering is stable
        await waitForRenderFrames(page, 10);

        // Screenshot 3: Same plants after render stabilization
        const stablePath = path.join(CONFIG.screenshotDir, `${timestamp}-03-stable-render.png`);
        await page.screenshot({ path: stablePath });
        screenshots.push({ name: '03-stable-render', soilData });
        console.log(`[SCREENSHOT] Captured stable render`);

        // Get actual tint values being calculated
        const tintData = await page.evaluate(() => {
            const plants = Array.from(window.graphicsEngine?.plantManager?.plants || []);
            return plants.map(plant => {
                const renderData = plant.getRenderData();
                const soil = window.graphicsEngine?.soilManager?.getSoilAtWorld(plant.x, plant.y);
                return {
                    position: { x: plant.x, y: plant.y },
                    stage: plant.stage,
                    tint: renderData.tint,
                    soil: soil ? {
                        nitrogen: soil.nitrogen,
                        phosphorus: soil.phosphorus,
                        potassium: soil.potassium,
                        organicMatter: soil.organicMatter
                    } : null
                };
            });
        });

        console.log('[TINT] Calculated tint values:');
        tintData.forEach((plant, i) => {
            const tint = plant.tint;
            const soil = plant.soil;
            console.log(`  Plant ${i+1} at (${plant.position.x.toFixed(0)}, ${plant.position.y.toFixed(0)}): Stage=${plant.stage}`);
            console.log(`    Tint: R=${tint[0].toFixed(3)}, G=${tint[1].toFixed(3)}, B=${tint[2].toFixed(3)}, A=${tint[3].toFixed(3)}`);
            if (soil) {
                console.log(`    Soil: N=${soil.nitrogen.toFixed(1)}, P=${soil.phosphorus.toFixed(1)}, K=${soil.potassium.toFixed(1)}, OM=${soil.organicMatter.toFixed(1)}`);
            }
        });

        // Advance time to see growth with persistent tinting
        console.log('[TEST] Advancing time to observe growth...');
        await advanceGameTime(page, 5);
        await waitForRenderFrames(page, 10);

        // Screenshot 4: After time advancement
        const grownPath = path.join(CONFIG.screenshotDir, `${timestamp}-04-after-growth.png`);
        await page.screenshot({ path: grownPath });
        screenshots.push({ name: '04-after-growth' });
        console.log(`[SCREENSHOT] Captured after 5 days of growth`);

        // Get updated tint values after growth
        const tintDataAfter = await page.evaluate(() => {
            const plants = Array.from(window.graphicsEngine?.plantManager?.plants || []);
            return plants.map(plant => {
                const renderData = plant.getRenderData();
                return {
                    position: { x: plant.x, y: plant.y },
                    stage: plant.stage,
                    age: plant.age,
                    tint: renderData.tint
                };
            });
        });

        console.log('[TINT] Tint values after growth:');
        tintDataAfter.forEach((plant, i) => {
            const tint = plant.tint;
            console.log(`  Plant ${i+1}: Stage=${plant.stage}, Age=${plant.age.toFixed(1)}d`);
            console.log(`    Tint: R=${tint[0].toFixed(3)}, G=${tint[1].toFixed(3)}, B=${tint[2].toFixed(3)}`);
        });

        // Zoom in for detailed view
        await page.evaluate(() => {
            const canvas = document.querySelector('canvas');
            const event = { deltaY: -500 };
            canvas.dispatchEvent(new WheelEvent('wheel', event));
        });
        await waitForRenderFrames(page, 5);

        // Screenshot 5: Zoomed in view
        const zoomedPath = path.join(CONFIG.screenshotDir, `${timestamp}-05-zoomed-in.png`);
        await page.screenshot({ path: zoomedPath });
        screenshots.push({ name: '05-zoomed-in' });
        console.log(`[SCREENSHOT] Captured zoomed-in view`);

        // Verify tint calculations
        const tintValidation = await page.evaluate(() => {
            const plants = Array.from(window.graphicsEngine?.plantManager?.plants || []);
            const config = window.graphicsEngine?.plantManager?.config;
            
            if (!config || plants.length === 0) {
                return { pass: false, reason: 'No plants or config found' };
            }

            let allValid = true;
            const issues = [];

            plants.forEach((plant, i) => {
                const renderData = plant.getRenderData();
                const tint = renderData.tint;

                // Tint must be array of 4 numbers
                if (!Array.isArray(tint) || tint.length !== 4) {
                    allValid = false;
                    issues.push(`Plant ${i+1}: Invalid tint format`);
                    return;
                }

                // All tint values must be in range [0, 1]
                if (!tint.every(v => v >= 0 && v <= 1)) {
                    allValid = false;
                    issues.push(`Plant ${i+1}: Tint values out of range [0,1]`);
                }

                // Alpha must always be 1.0
                if (Math.abs(tint[3] - 1.0) > 0.01) {
                    allValid = false;
                    issues.push(`Plant ${i+1}: Alpha not 1.0 (${tint[3]})`);
                }

                // At least one channel should be < 1.0 if nutrients aren't optimal
                const soil = window.graphicsEngine?.soilManager?.getSoilAtWorld(plant.x, plant.y);
                if (soil) {
                    const reqs = plant.species?.environment?.nutrientRequirements;
                    if (reqs) {
                        const allOptimal = 
                            soil.nitrogen >= reqs.nitrogen.optimal &&
                            soil.phosphorus >= reqs.phosphorus.optimal &&
                            soil.potassium >= reqs.potassium.optimal &&
                            soil.organicMatter >= reqs.organicMatter.optimal;
                        
                        const tintIsWhite = tint[0] === 1.0 && tint[1] === 1.0 && tint[2] === 1.0;
                        
                        if (!allOptimal && tintIsWhite) {
                            issues.push(`Plant ${i+1}: Suboptimal nutrients but tint is white`);
                        }
                    }
                }
            });

            return { pass: allValid, issues, plantCount: plants.length };
        });

        console.log(`[VALIDATION] Tint validation: ${tintValidation.pass ? 'PASS' : 'FAIL'}`);
        if (!tintValidation.pass) {
            console.log(`[VALIDATION] Issues:`);
            tintValidation.issues.forEach(issue => console.log(`  - ${issue}`));
        }
        console.log(`[VALIDATION] Tested ${tintValidation.plantCount} plants`);

        // Generate report
        const report = {
            timestamp,
            testName: 'Nutrient-based plant color tinting',
            screenshots: screenshots.length,
            soilConditions: soilData,
            tintDataInitial: tintData,
            tintDataAfter: tintDataAfter,
            validation: tintValidation,
            pass: tintValidation.pass
        };

        const reportPath = path.join(CONFIG.visualDir, `${timestamp}-report.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`[REPORT] Saved to ${reportPath}`);

        // Test assertions
        expect(screenshots.length).toBeGreaterThan(0);
        expect(soilData.length).toBeGreaterThan(0);
        expect(tintData.length).toBeGreaterThan(0);
        expect(tintValidation.pass).toBe(true);
        expect(tintValidation.plantCount).toBeGreaterThan(0);

        console.log('[TEST] Visual feedback test complete!');
    });
});
