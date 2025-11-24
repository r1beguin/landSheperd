/**
 * Automated test for nutrient-specific system
 * Tests Phase 1 implementation: individual N, P, K, OM requirements
 */

const { test, expect } = require('@playwright/test');

test.describe('Nutrient-Specific System', () => {
    test.setTimeout(60000);

    test('nutrient test suite should pass all tests', async ({ page }) => {
        // Navigate to nutrient test page
        await page.goto('http://localhost:8080/test_nutrients.html');

        // Wait for all tests to complete (summary appears)
        await page.waitForSelector('#summary', { timeout: 10000 });

        // Check if summary shows all tests passed
        const summaryDiv = await page.locator('#summary');
        const summaryClass = await summaryDiv.getAttribute('class');
        
        expect(summaryClass).toContain('summary-pass');

        // Get detailed test results
        const summaryText = await summaryDiv.textContent();
        console.log('Test Summary:', summaryText);

        // Verify "ALL TESTS PASSED" message
        expect(summaryText).toContain('ALL TESTS PASSED');

        // Get pass/fail counts
        const passCountText = await page.locator('#summary .pass').textContent();
        const failCountText = await page.locator('#summary .fail').textContent();
        
        console.log('Pass count:', passCountText);
        console.log('Fail count:', failCountText);

        // Extract number of failed tests
        const failMatch = failCountText.match(/Failed: (\d+)/);
        const failCount = failMatch ? parseInt(failMatch[1]) : null;

        expect(failCount).toBe(0);

        // Take screenshot for documentation
        await page.screenshot({ 
            path: 'test-results/nutrient-system-results.png',
            fullPage: true 
        });
    });

    test('nettles.json should have nutrient requirements', async ({ page }) => {
        // Fetch and validate species config
        const response = await page.request.get('http://localhost:8080/species/nettles.json');
        expect(response.ok()).toBeTruthy();

        const config = await response.json();

        // Check environment section exists
        expect(config.environment).toBeDefined();
        expect(config.environment.nutrientRequirements).toBeDefined();

        // Check all four nutrients
        const nutrients = ['nitrogen', 'phosphorus', 'potassium', 'organicMatter'];
        for (const nutrient of nutrients) {
            expect(config.environment.nutrientRequirements[nutrient]).toBeDefined();
            expect(config.environment.nutrientRequirements[nutrient].minimum).toBeGreaterThan(0);
            expect(config.environment.nutrientRequirements[nutrient].optimal).toBeGreaterThan(
                config.environment.nutrientRequirements[nutrient].minimum
            );
        }

        console.log('Nutrient Requirements:', JSON.stringify(config.environment.nutrientRequirements, null, 2));
    });

    test('main game should initialize without errors', async ({ page }) => {
        const consoleErrors = [];
        
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Navigate to main game
        await page.goto('http://localhost:8080/');

        // Wait for WebGL initialization (longer timeout for headless)
        await page.waitForFunction(() => {
            return window.graphicsEngine && window.graphicsEngine.isInitialized;
        }, { timeout: 15000 });

        // Wait a bit for initial setup
        await page.waitForTimeout(2000);

        // Check for console errors (excluding WebGL warnings which are expected in headless)
        const nonWebGLErrors = consoleErrors.filter(err => 
            !err.includes('WebGL') && 
            !err.includes('SwiftShader') &&
            !err.includes('GPU stall')
        );

        expect(nonWebGLErrors).toHaveLength(0);

        console.log('Game initialized successfully with nutrient system');
    });

    test('plant growth should respect nutrient requirements', async ({ page }) => {
        const consoleMessages = [];
        
        page.on('console', msg => {
            consoleMessages.push({ type: msg.type(), text: msg.text() });
        });

        await page.goto('http://localhost:8080/');

        // Wait for game initialization (longer timeout for headless)
        await page.waitForFunction(() => {
            return window.graphicsEngine && window.graphicsEngine.isInitialized;
        }, { timeout: 15000 });

        // Create a plant in nutrient-poor soil via JavaScript injection
        const testResult = await page.evaluate(() => {
            // Find a soil cell with low nitrogen but high other nutrients
            let targetSoil = null;
            const soilManager = window.graphicsEngine.soilManager;
            
            // Search for suitable test soil
            for (let x = 0; x < soilManager.gridWidth; x++) {
                for (let y = 0; y < soilManager.gridHeight; y++) {
                    const soil = soilManager.getSoilAt(x, y);
                    if (soil && soil.nitrogen < 15 && soil.phosphorus > 20) {
                        targetSoil = { gridX: x, gridY: y, soil: soil };
                        break;
                    }
                }
                if (targetSoil) break;
            }

            // If no naturally low-N soil, create one artificially
            if (!targetSoil) {
                const testX = 5, testY = 5;
                const soil = soilManager.getSoilAt(testX, testY);
                // Manually deplete nitrogen
                soil.updateNutrients(10, 40, 40, 40);
                targetSoil = { gridX: testX, gridY: testY, soil: soil };
            }

            // Place plant
            const plant = window.graphicsEngine.plantManager.addPlant(
                targetSoil.gridX, 
                targetSoil.gridY, 
                'urtica_dioica',
                window.graphicsEngine.timeManager.getCurrentDay()
            );

            return {
                planted: !!plant,
                soilNutrients: {
                    nitrogen: targetSoil.soil.nitrogen,
                    phosphorus: targetSoil.soil.phosphorus,
                    potassium: targetSoil.soil.potassium,
                    organicMatter: targetSoil.soil.organicMatter
                },
                fertility: targetSoil.soil.fertility
            };
        });

        console.log('Test plant placement:', testResult);
        expect(testResult.planted).toBeTruthy();

        // Speed up time and observe growth behavior
        await page.evaluate(() => {
            window.graphicsEngine.timeManager.setTimeScale(20.0);
        });

        await page.waitForTimeout(3000);

        // Check if stunted growth was detected
        const growthResult = await page.evaluate(() => {
            const plants = window.graphicsEngine.plantManager.getAllPlants();
            const testPlant = plants[0];
            
            return {
                plantCount: plants.length,
                stage: testPlant?.stage,
                isStunted: testPlant?.isStunted,
                daysStunted: testPlant?.daysStunted
            };
        });

        console.log('Growth result after 3 seconds at 20x speed:', growthResult);

        // Plant should be stunted if nitrogen was deficient
        if (testResult.soilNutrients.nitrogen < 15) {
            expect(growthResult.isStunted).toBeTruthy();
            console.log('✓ Plant correctly stunted due to nitrogen deficiency');
        }
    });
});
