/**
 * Functional test for water type differentiation
 * Tests getWaterType() method and separate tracking
 */

const { test, expect } = require('@playwright/test');

test('Water Type Functional Test', async ({ page }) => {
    await page.goto('http://localhost:8081');
    await page.waitForTimeout(2000); // Wait for initialization
    
    // Get water type information from the game
    const waterTypeInfo = await page.evaluate(() => {
        const engine = window.graphicsEngine;
        const terrainGen = engine.soilManager.terrainGenerator;
        
        // Get all water tiles
        const waterTiles = Array.from(terrainGen.getWaterTiles());
        const riverTiles = Array.from(terrainGen.getRiverTiles());
        const lakeTiles = Array.from(terrainGen.getLakeTiles());
        
        // Sample some tiles and check their types
        const samples = [];
        
        // Sample first 5 river tiles
        for (let i = 0; i < Math.min(5, riverTiles.length); i++) {
            const [x, y] = riverTiles[i].split(',').map(Number);
            const type = terrainGen.getWaterType(x, y);
            samples.push({ x, y, expected: 'river', actual: type });
        }
        
        // Sample first 5 lake tiles
        for (let i = 0; i < Math.min(5, lakeTiles.length); i++) {
            const [x, y] = lakeTiles[i].split(',').map(Number);
            const type = terrainGen.getWaterType(x, y);
            samples.push({ x, y, expected: 'lake', actual: type });
        }
        
        // Sample a non-water tile
        const nonWaterX = 0;
        const nonWaterY = 0;
        const nonWaterType = terrainGen.getWaterType(nonWaterX, nonWaterY);
        samples.push({ 
            x: nonWaterX, 
            y: nonWaterY, 
            expected: null, 
            actual: nonWaterType 
        });
        
        return {
            totalWater: waterTiles.length,
            totalRivers: riverTiles.length,
            totalLakes: lakeTiles.length,
            samples
        };
    });
    
    console.log('Water Type Test Results:');
    console.log(`  Total water tiles: ${waterTypeInfo.totalWater}`);
    console.log(`  River tiles: ${waterTypeInfo.totalRivers}`);
    console.log(`  Lake tiles: ${waterTypeInfo.totalLakes}`);
    console.log(`  Sum of river+lake: ${waterTypeInfo.totalRivers + waterTypeInfo.totalLakes}`);
    
    // Validate counts
    expect(waterTypeInfo.totalWater).toBeGreaterThan(0);
    expect(waterTypeInfo.totalRivers).toBeGreaterThan(0);
    expect(waterTypeInfo.totalLakes).toBeGreaterThan(0);
    
    // Validate that water tiles = river tiles + lake tiles
    expect(waterTypeInfo.totalWater).toBe(
        waterTypeInfo.totalRivers + waterTypeInfo.totalLakes
    );
    
    // Validate sample types
    console.log('\n  Sample Type Checks:');
    waterTypeInfo.samples.forEach(sample => {
        console.log(`    (${sample.x}, ${sample.y}): expected=${sample.expected}, actual=${sample.actual}`);
        expect(sample.actual).toBe(sample.expected);
    });
    
    console.log('\n✅ All water type checks passed!');
});
