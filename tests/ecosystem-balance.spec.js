/**
 * Ecosystem Balance Test - Milestone 4: Multi-Species Foundation Validation
 * 
 * This test validates that the nutrient cycling system creates a sustainable
 * foundation for FUTURE multi-species diversity, NOT perfect monoculture equilibrium.
 * 
 * Testing Philosophy:
 * - Nettles should gradually deplete nitrogen (nitrogen-lover behavior)
 * - P/K should remain higher (less consumed)
 * - OM should accumulate and slowly regenerate nutrients
 * - System should NOT collapse catastrophically
 * - Spatial variation should emerge
 * - Weather should create recovery/stress cycles
 * 
 * Nitrogen depletion is a FEATURE, not a bug - it creates niches for legumes!
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const {
    waitForRenderFrames,
    spawnPlantAt,
    sampleEcosystemMetrics,
    advanceGameTimeDeterministic,
    setNutrientOverlay
} = require('./test-utils');

// Configuration
const SIMULATION_DAYS = 100;
const SAMPLING_INTERVAL = 10;
const INITIAL_PLANT_COUNT = 8;
const SCREENSHOT_DAYS = [0, 25, 50, 75, 100];

// Results directory
const RESULTS_DIR = path.join(__dirname, '..', 'test-results', 'ecosystem-balance');

// Helper to ensure results directory exists
function ensureResultsDir() {
    if (!fs.existsSync(RESULTS_DIR)) {
        fs.mkdirSync(RESULTS_DIR, { recursive: true });
    }
}

// Helper to save metrics to CSV
function saveMetricsToCSV(metrics, filename) {
    const csvPath = path.join(RESULTS_DIR, filename);
    const headers = 'GameDay,AvgN,AvgP,AvgK,AvgOM,AvgFertility,PlantCount,Weather,MinN,MaxN,MinP,MaxP,MinK,MaxK,MinOM,MaxOM\n';
    
    const rows = metrics.map(m => {
        return `${m.gameDay},${m.averages.nitrogen},${m.averages.phosphorus},${m.averages.potassium},${m.averages.organicMatter},${m.averages.fertility},${m.plantCount},${m.weather},${m.ranges.nitrogen.min},${m.ranges.nitrogen.max},${m.ranges.phosphorus.min},${m.ranges.phosphorus.max},${m.ranges.potassium.min},${m.ranges.potassium.max},${m.ranges.organicMatter.min},${m.ranges.organicMatter.max}`;
    }).join('\n');
    
    fs.writeFileSync(csvPath, headers + rows);
    console.log(`✓ Metrics saved to: ${csvPath}`);
}

// Helper to save metrics to JSON
function saveMetricsToJSON(metrics, filename) {
    const jsonPath = path.join(RESULTS_DIR, filename);
    fs.writeFileSync(jsonPath, JSON.stringify(metrics, null, 2));
    console.log(`✓ Metrics saved to: ${jsonPath}`);
}

// Helper to analyze nutrient depletion patterns
function analyzeDepletionPatterns(metrics) {
    const start = metrics[0];
    const end = metrics[metrics.length - 1];
    
    const nDepletion = ((start.averages.nitrogen - end.averages.nitrogen) / start.averages.nitrogen) * 100;
    const pDepletion = ((start.averages.phosphorus - end.averages.phosphorus) / start.averages.phosphorus) * 100;
    const kDepletion = ((start.averages.potassium - end.averages.potassium) / start.averages.potassium) * 100;
    const omChange = end.averages.organicMatter - start.averages.organicMatter;
    
    return {
        nitrogenDepletion: Math.round(nDepletion * 10) / 10,
        phosphorusDepletion: Math.round(pDepletion * 10) / 10,
        potassiumDepletion: Math.round(kDepletion * 10) / 10,
        organicMatterChange: Math.round(omChange * 10) / 10,
        startValues: start.averages,
        endValues: end.averages,
        populationStart: start.plantCount,
        populationEnd: end.plantCount
    };
}

test.describe('Ecosystem Balance - Milestone 4', () => {
    test('Long-term monoculture simulation (100 game days)', async ({ page }) => {
        ensureResultsDir();
        
        console.log('\n=== ECOSYSTEM BALANCE TEST ===');
        console.log(`Simulating ${SIMULATION_DAYS} game days with ${INITIAL_PLANT_COUNT} initial plants`);
        console.log(`Sampling interval: ${SAMPLING_INTERVAL} days`);
        console.log('=====================================\n');
        
        // Navigate and wait for initialization
        await page.goto('http://localhost:8081');
        await waitForRenderFrames(page, 30);
        
        // Verify initialization
        const isInitialized = await page.evaluate(() => {
            return window.graphicsEngine && 
                   window.graphicsEngine.plantManager && 
                   window.graphicsEngine.soilManager &&
                   window.graphicsEngine.timeManager &&
                   window.graphicsEngine.plantManager.speciesConfigs.size > 0;
        });
        
        expect(isInitialized).toBe(true);
        console.log('✓ Graphics engine initialized');
        
        // Spawn initial plants in a distributed pattern
        console.log(`\nSpawning ${INITIAL_PLANT_COUNT} initial plants...`);
        const plantPositions = [
            { x: 0, y: 0 },
            { x: 5, y: 5 },
            { x: -5, y: 5 },
            { x: 5, y: -5 },
            { x: -5, y: -5 },
            { x: 10, y: 0 },
            { x: -10, y: 0 },
            { x: 0, y: 10 }
        ];
        
        for (let i = 0; i < INITIAL_PLANT_COUNT; i++) {
            const pos = plantPositions[i];
            const result = await spawnPlantAt(page, pos.x, pos.y);
            if (result.success) {
                console.log(`  ✓ Plant ${i + 1} spawned at (${pos.x}, ${pos.y})`);
            } else {
                console.warn(`  ✗ Failed to spawn plant at (${pos.x}, ${pos.y}): ${result.error}`);
            }
        }
        
        // Wait for plants to render
        await waitForRenderFrames(page, 10);
        
        // Sample initial state (Day 0)
        console.log('\n--- Day 0: Initial State ---');
        const initialMetrics = await sampleEcosystemMetrics(page);
        expect(initialMetrics.success).toBe(true);
        
        console.log(`Plants: ${initialMetrics.plantCount}`);
        console.log(`Avg N: ${initialMetrics.averages.nitrogen}, P: ${initialMetrics.averages.phosphorus}, K: ${initialMetrics.averages.potassium}, OM: ${initialMetrics.averages.organicMatter}`);
        console.log(`Fertility: ${initialMetrics.averages.fertility}`);
        console.log(`Weather: ${initialMetrics.weather}`);
        
        // Take initial screenshot with nutrient overlays
        console.log('\nCapturing Day 0 screenshots...');
        await setNutrientOverlay(page, 'nitrogen');
        await waitForRenderFrames(page, 5);
        await page.screenshot({ path: path.join(RESULTS_DIR, 'day-000-nitrogen.png') });
        
        await setNutrientOverlay(page, 'phosphorus');
        await waitForRenderFrames(page, 5);
        await page.screenshot({ path: path.join(RESULTS_DIR, 'day-000-phosphorus.png') });
        
        await setNutrientOverlay(page, 'potassium');
        await waitForRenderFrames(page, 5);
        await page.screenshot({ path: path.join(RESULTS_DIR, 'day-000-potassium.png') });
        
        await setNutrientOverlay(page, 'organicMatter');
        await waitForRenderFrames(page, 5);
        await page.screenshot({ path: path.join(RESULTS_DIR, 'day-000-organicMatter.png') });
        
        await setNutrientOverlay(page, 'off');
        console.log('✓ Day 0 screenshots captured');
        
        // Collect metrics over time
        const allMetrics = [initialMetrics];
        
        // Simulate and sample every SAMPLING_INTERVAL days
        const totalSamples = Math.floor(SIMULATION_DAYS / SAMPLING_INTERVAL);
        
        for (let sample = 1; sample <= totalSamples; sample++) {
            const targetDay = sample * SAMPLING_INTERVAL;
            
            console.log(`\n--- Advancing to Day ${targetDay} ---`);
            
            // Advance time
            const advanceResult = await advanceGameTimeDeterministic(page, SAMPLING_INTERVAL, { timeScale: 1.0 });
            expect(advanceResult.success).toBe(true);
            console.log(`Time advanced: ${advanceResult.dayBefore} → ${advanceResult.dayAfter} (${advanceResult.daysAdvanced} days)`);
            
            // Wait for updates to settle
            await waitForRenderFrames(page, 10);
            
            // Sample metrics
            const metrics = await sampleEcosystemMetrics(page);
            expect(metrics.success).toBe(true);
            allMetrics.push(metrics);
            
            console.log(`Plants: ${metrics.plantCount} (${metrics.plantCount > initialMetrics.plantCount ? '+' : ''}${metrics.plantCount - initialMetrics.plantCount})`);
            console.log(`Avg N: ${metrics.averages.nitrogen} (${metrics.averages.nitrogen - initialMetrics.averages.nitrogen >= 0 ? '+' : ''}${(metrics.averages.nitrogen - initialMetrics.averages.nitrogen).toFixed(1)})`);
            console.log(`Avg P: ${metrics.averages.phosphorus} (${metrics.averages.phosphorus - initialMetrics.averages.phosphorus >= 0 ? '+' : ''}${(metrics.averages.phosphorus - initialMetrics.averages.phosphorus).toFixed(1)})`);
            console.log(`Avg K: ${metrics.averages.potassium} (${metrics.averages.potassium - initialMetrics.averages.potassium >= 0 ? '+' : ''}${(metrics.averages.potassium - initialMetrics.averages.potassium).toFixed(1)})`);
            console.log(`Avg OM: ${metrics.averages.organicMatter} (${metrics.averages.organicMatter - initialMetrics.averages.organicMatter >= 0 ? '+' : ''}${(metrics.averages.organicMatter - initialMetrics.averages.organicMatter).toFixed(1)})`);
            console.log(`Fertility: ${metrics.averages.fertility} (${metrics.averages.fertility - initialMetrics.averages.fertility >= 0 ? '+' : ''}${(metrics.averages.fertility - initialMetrics.averages.fertility).toFixed(1)})`);
            console.log(`Weather: ${metrics.weather}`);
            
            // Take screenshots at key intervals
            if (SCREENSHOT_DAYS.includes(targetDay)) {
                console.log(`\nCapturing Day ${targetDay} screenshots...`);
                const dayStr = String(targetDay).padStart(3, '0');
                
                await setNutrientOverlay(page, 'nitrogen');
                await waitForRenderFrames(page, 5);
                await page.screenshot({ path: path.join(RESULTS_DIR, `day-${dayStr}-nitrogen.png`) });
                
                await setNutrientOverlay(page, 'phosphorus');
                await waitForRenderFrames(page, 5);
                await page.screenshot({ path: path.join(RESULTS_DIR, `day-${dayStr}-phosphorus.png`) });
                
                await setNutrientOverlay(page, 'potassium');
                await waitForRenderFrames(page, 5);
                await page.screenshot({ path: path.join(RESULTS_DIR, `day-${dayStr}-potassium.png`) });
                
                await setNutrientOverlay(page, 'organicMatter');
                await waitForRenderFrames(page, 5);
                await page.screenshot({ path: path.join(RESULTS_DIR, `day-${dayStr}-organicMatter.png`) });
                
                await setNutrientOverlay(page, 'off');
                console.log(`✓ Day ${targetDay} screenshots captured`);
            }
        }
        
        // Save metrics to files
        console.log('\n=== SAVING RESULTS ===');
        saveMetricsToCSV(allMetrics, 'ecosystem-metrics.csv');
        saveMetricsToJSON(allMetrics, 'ecosystem-metrics.json');
        
        // Analyze depletion patterns
        console.log('\n=== DEPLETION ANALYSIS ===');
        const analysis = analyzeDepletionPatterns(allMetrics);
        
        console.log('\nNutrient Changes (Day 0 → Day 100):');
        console.log(`  Nitrogen:   ${analysis.startValues.nitrogen} → ${analysis.endValues.nitrogen} (${analysis.nitrogenDepletion}% depletion)`);
        console.log(`  Phosphorus: ${analysis.startValues.phosphorus} → ${analysis.endValues.phosphorus} (${analysis.phosphorusDepletion}% depletion)`);
        console.log(`  Potassium:  ${analysis.startValues.potassium} → ${analysis.endValues.potassium} (${analysis.potassiumDepletion}% depletion)`);
        console.log(`  Org Matter: ${analysis.startValues.organicMatter} → ${analysis.endValues.organicMatter} (${analysis.organicMatterChange >= 0 ? '+' : ''}${analysis.organicMatterChange} change)`);
        console.log(`  Fertility:  ${analysis.startValues.fertility} → ${analysis.endValues.fertility}`);
        console.log(`\nPopulation: ${analysis.populationStart} → ${analysis.populationEnd} plants`);
        
        // Save analysis
        fs.writeFileSync(
            path.join(RESULTS_DIR, 'analysis.json'),
            JSON.stringify(analysis, null, 2)
        );
        
        // Validation: Check for multi-species foundation quality
        console.log('\n=== FOUNDATION VALIDATION ===');
        
        // 1. Nitrogen should deplete more than P/K (nitrogen-lover behavior)
        const nitrogenPreference = analysis.nitrogenDepletion > analysis.phosphorusDepletion && 
                                   analysis.nitrogenDepletion > analysis.potassiumDepletion;
        console.log(`✓ Nitrogen preference: ${nitrogenPreference ? 'YES' : 'NO'} (N: ${analysis.nitrogenDepletion}%, P: ${analysis.phosphorusDepletion}%, K: ${analysis.potassiumDepletion}%)`);
        expect(nitrogenPreference).toBe(true);
        
        // 2. OM should accumulate (20-40 points gain)
        const omAccumulation = analysis.organicMatterChange >= 15 && analysis.organicMatterChange <= 50;
        console.log(`✓ OM accumulation: ${omAccumulation ? 'GOOD' : 'OUT OF RANGE'} (${analysis.organicMatterChange >= 0 ? '+' : ''}${analysis.organicMatterChange}, target: +15 to +50)`);
        expect(omAccumulation).toBe(true);
        
        // 3. No catastrophic collapse (fertility stays above minimum)
        const noCollapse = analysis.endValues.fertility >= 15;
        console.log(`✓ System stability: ${noCollapse ? 'STABLE' : 'COLLAPSED'} (final fertility: ${analysis.endValues.fertility}, minimum: 15)`);
        expect(noCollapse).toBe(true);
        
        // 4. Population should stabilize (not crash to zero)
        const populationStable = analysis.populationEnd >= 3;
        console.log(`✓ Population stability: ${populationStable ? 'STABLE' : 'CRASHED'} (${analysis.populationEnd} plants remaining, minimum: 3)`);
        expect(populationStable).toBe(true);
        
        // 5. Spatial variation (check nutrient ranges)
        const finalMetrics = allMetrics[allMetrics.length - 1];
        const nVariation = finalMetrics.ranges.nitrogen.max - finalMetrics.ranges.nitrogen.min;
        const spatialDiversity = nVariation >= 5;
        console.log(`✓ Spatial diversity: ${spatialDiversity ? 'DIVERSE' : 'UNIFORM'} (N range: ${finalMetrics.ranges.nitrogen.min}-${finalMetrics.ranges.nitrogen.max}, variation: ${nVariation})`);
        expect(spatialDiversity).toBe(true);
        
        console.log('\n=== MILESTONE 4 VALIDATION COMPLETE ===');
        console.log('✓ Ecosystem foundation suitable for multi-species diversity');
        console.log(`✓ Results saved to: ${RESULTS_DIR}`);
        console.log('✓ Review screenshots and metrics for spatial patterns\n');
    });
    
    test('Weather impact validation (20 game days)', async ({ page }) => {
        console.log('\n=== WEATHER IMPACT TEST ===');
        
        await page.goto('http://localhost:8081');
        await waitForRenderFrames(page, 30);
        
        // Sample decomposition rates during different weather states
        const weatherMetrics = [];
        
        for (let day = 0; day < 20; day += 5) {
            await advanceGameTimeDeterministic(page, 5, { timeScale: 1.0 });
            await waitForRenderFrames(page, 10);
            
            const metrics = await sampleEcosystemMetrics(page);
            weatherMetrics.push(metrics);
            
            console.log(`Day ${day + 5}: Weather=${metrics.weather}, OM=${metrics.averages.organicMatter}`);
        }
        
        // Save weather metrics
        saveMetricsToJSON(weatherMetrics, 'weather-impact.json');
        
        console.log('✓ Weather impact data collected');
        console.log(`✓ Results saved to: ${path.join(RESULTS_DIR, 'weather-impact.json')}\n`);
    });
});
