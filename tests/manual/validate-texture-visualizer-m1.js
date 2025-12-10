/**
 * Simple validation script for Texture Visualizer M1
 * Run with: node tests/manual/validate-texture-visualizer-m1.js
 */

const playwright = require('playwright');

(async () => {
    console.log('Starting Texture Visualizer M1 validation...\n');
    
    const browser = await playwright.chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    const consoleMessages = [];
    const consoleErrors = [];
    
    // Capture console output
    page.on('console', msg => {
        const text = msg.text();
        consoleMessages.push(text);
        if (msg.type() === 'error') {
            consoleErrors.push(text);
        }
    });
    
    page.on('pageerror', error => {
        consoleErrors.push(error.message);
    });
    
    // Navigate to texture visualizer
    await page.goto('http://localhost:8081/texture_visualizer.html');
    
    // Wait for species to load
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/texture-visualizer-m1.png', fullPage: true });
    
    // Get species dropdown options
    const speciesOptions = await page.$$eval('#species-select option', options => 
        options.map(opt => opt.textContent)
    );
    
    // Get species count
    const speciesCountText = await page.textContent('#species-count');
    
    // Display results
    console.log('=== CONSOLE OUTPUT ===');
    consoleMessages.forEach(msg => console.log(`  ${msg}`));
    
    console.log('\n=== VALIDATION RESULTS ===');
    console.log(`Console Errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
        console.log('Errors:');
        consoleErrors.forEach(err => console.log(`  - ${err}`));
    }
    
    console.log(`\nSpecies Dropdown Options (${speciesOptions.length}):`);
    speciesOptions.forEach(opt => console.log(`  - ${opt}`));
    
    console.log(`\nSpecies Count Display: ${speciesCountText}`);
    
    // Check expected logs
    const expectedLogs = [
        'Texture Visualizer - Milestone 1 Initialized',
        'Loaded species: urtica_dioica',
        'Loaded species: quercus_robur',
        'Loaded species: trifolium_repens'
    ];
    
    console.log('\nExpected Logs:');
    expectedLogs.forEach(expectedLog => {
        const found = consoleMessages.some(msg => msg.includes(expectedLog));
        console.log(`  ${found ? '✓' : '✗'} ${expectedLog}`);
    });
    
    // Final verdict
    const allLogsFound = expectedLogs.every(log => 
        consoleMessages.some(msg => msg.includes(log))
    );
    const noErrors = consoleErrors.length === 0;
    const correctDropdownCount = speciesOptions.length === 4;
    const correctSpeciesCount = speciesCountText === '3';
    
    console.log('\n=== MILESTONE 1 STATUS ===');
    console.log(`✓ All expected logs found: ${allLogsFound}`);
    console.log(`✓ No console errors: ${noErrors}`);
    console.log(`✓ Species dropdown populated: ${correctDropdownCount} (${speciesOptions.length}/4)`);
    console.log(`✓ Species count correct: ${correctSpeciesCount} (${speciesCountText}/3)`);
    
    const passed = allLogsFound && noErrors && correctDropdownCount && correctSpeciesCount;
    console.log(`\n${passed ? '✅ PASS' : '❌ FAIL'} - Milestone 1 Validation`);
    
    console.log('\nScreenshot saved: screenshots/texture-visualizer-m1.png');
    console.log('Browser window left open for manual inspection.');
    console.log('Press Ctrl+C to close.\n');
    
    // Keep browser open for inspection
    await new Promise(() => {});
})();
