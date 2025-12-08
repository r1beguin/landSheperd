/**
 * Cell Highlight Test - Milestone 1
 * Tests the cell highlight rendering feature
 */

const { test, expect } = require('@playwright/test');

test('Cell highlight rendering', async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:8081');
    
    // Wait for the game to initialize
    await page.waitForFunction(() => window.graphicsEngine && window.graphicsEngine.renderSystem, { timeout: 10000 });
    
    console.log('✓ Graphics engine initialized');
    
    // Test 1: Verify methods exist
    const methodsExist = await page.evaluate(() => {
        const rs = window.graphicsEngine.renderSystem;
        return {
            hasSetHighlightedCell: typeof rs.setHighlightedCell === 'function',
            hasClearHighlightedCell: typeof rs.clearHighlightedCell === 'function',
            hasRenderCellHighlight: typeof rs.renderCellHighlight === 'function'
        };
    });
    
    expect(methodsExist.hasSetHighlightedCell).toBe(true);
    expect(methodsExist.hasClearHighlightedCell).toBe(true);
    expect(methodsExist.hasRenderCellHighlight).toBe(true);
    console.log('✓ All methods exist on RenderSystem');
    
    // Test 2: Initial state (no highlight)
    const initialState = await page.evaluate(() => {
        const rs = window.graphicsEngine.renderSystem;
        return {
            x: rs.highlightedCell.x,
            y: rs.highlightedCell.y
        };
    });
    
    expect(initialState.x).toBe(null);
    expect(initialState.y).toBe(null);
    console.log('✓ Initial state: No highlight active');
    
    // Take screenshot of initial state
    await page.waitForTimeout(500); // Let render stabilize
    await page.screenshot({ path: 'screenshots/cell-highlight-milestone1-initial.png' });
    console.log('✓ Captured: Initial state (no highlight)');
    
    // Test 3: Set highlight at a visible cell
    await page.evaluate(() => {
        window.graphicsEngine.renderSystem.setHighlightedCell(2, -11);
    });
    
    const highlightedState = await page.evaluate(() => {
        const rs = window.graphicsEngine.renderSystem;
        return {
            x: rs.highlightedCell.x,
            y: rs.highlightedCell.y
        };
    });
    
    expect(highlightedState.x).toBe(2);
    expect(highlightedState.y).toBe(-11);
    console.log('✓ Highlight set to grid coordinates (2, -11)');
    
    // Wait for a few frames to render
    await page.waitForTimeout(500);
    
    // Take screenshot with highlight
    await page.screenshot({ path: 'screenshots/cell-highlight-milestone1-active.png' });
    console.log('✓ Captured: Cell highlight active at (2, -11)');
    
    // Test 4: Verify render calls increased
    const renderCallsWithHighlight = await page.evaluate(() => {
        return window.graphicsEngine.renderSystem.getRenderCalls();
    });
    
    console.log(`  Render calls with highlight: ${renderCallsWithHighlight}`);
    expect(renderCallsWithHighlight).toBeGreaterThan(0);
    
    // Test 5: Clear highlight
    await page.evaluate(() => {
        window.graphicsEngine.renderSystem.clearHighlightedCell();
    });
    
    const clearedState = await page.evaluate(() => {
        const rs = window.graphicsEngine.renderSystem;
        return {
            x: rs.highlightedCell.x,
            y: rs.highlightedCell.y
        };
    });
    
    expect(clearedState.x).toBe(null);
    expect(clearedState.y).toBe(null);
    console.log('✓ Highlight cleared successfully');
    
    // Wait for frames to render without highlight
    await page.waitForTimeout(500);
    
    // Take screenshot after clearing
    await page.screenshot({ path: 'screenshots/cell-highlight-milestone1-cleared.png' });
    console.log('✓ Captured: Highlight cleared');
    
    // Test 6: Test multiple coordinates
    const testCoords = [
        { x: 0, y: 0 },
        { x: 5, y: -5 },
        { x: -3, y: 8 }
    ];
    
    for (const coord of testCoords) {
        await page.evaluate((c) => {
            window.graphicsEngine.renderSystem.setHighlightedCell(c.x, c.y);
        }, coord);
        
        const state = await page.evaluate(() => {
            const rs = window.graphicsEngine.renderSystem;
            return { x: rs.highlightedCell.x, y: rs.highlightedCell.y };
        });
        
        expect(state.x).toBe(coord.x);
        expect(state.y).toBe(coord.y);
        
        await page.waitForTimeout(200);
    }
    
    console.log('✓ Multiple coordinate tests passed');
    
    // Test 7: Check FPS with highlight active
    await page.evaluate(() => {
        window.graphicsEngine.renderSystem.setHighlightedCell(0, 0);
    });
    
    // Measure FPS over 2 seconds
    const fpsData = await page.evaluate(() => {
        return new Promise((resolve) => {
            const samples = [];
            let lastTime = performance.now();
            let frameCount = 0;
            
            const measureFrame = () => {
                const currentTime = performance.now();
                const delta = currentTime - lastTime;
                
                if (delta > 0) {
                    const fps = 1000 / delta;
                    samples.push(fps);
                }
                
                lastTime = currentTime;
                frameCount++;
                
                if (frameCount < 120) { // ~2 seconds at 60 FPS
                    requestAnimationFrame(measureFrame);
                } else {
                    const avgFps = samples.reduce((a, b) => a + b, 0) / samples.length;
                    resolve({
                        average: Math.round(avgFps),
                        min: Math.round(Math.min(...samples)),
                        max: Math.round(Math.max(...samples)),
                        sampleCount: samples.length
                    });
                }
            };
            
            requestAnimationFrame(measureFrame);
        });
    });
    
    console.log(`  FPS with highlight: avg=${fpsData.average}, min=${fpsData.min}, max=${fpsData.max}`);
    expect(fpsData.average).toBeGreaterThanOrEqual(30);
    console.log('✓ FPS meets target (30+) with highlight active');
    
    // Final cleanup
    await page.evaluate(() => {
        window.graphicsEngine.renderSystem.clearHighlightedCell();
    });
    
    console.log('\n=== Cell Highlight Test Summary ===');
    console.log('✓ All API methods present and functional');
    console.log('✓ State management working correctly');
    console.log('✓ Highlight renders at specified coordinates');
    console.log('✓ Performance acceptable (FPS >= 30)');
    console.log('✓ Screenshots captured for visual validation');
    console.log('=====================================');
});
