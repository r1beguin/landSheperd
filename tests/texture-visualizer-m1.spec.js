/**
 * Texture Visualizer - Milestone 1 Test
 * Validates species loading and basic UI structure
 */

const { test, expect } = require('@playwright/test');

test('M1: Species loading and UI structure', async ({ page }) => {
    const consoleMessages = [];
    const consoleErrors = [];
    
    // Capture console output
    page.on('console', msg => {
        const text = msg.text();
        consoleMessages.push(text);
        console.log('CONSOLE:', text);
    });
    
    page.on('pageerror', error => {
        consoleErrors.push(error.message);
        console.error('PAGE ERROR:', error.message);
    });
    
    // Navigate to texture visualizer
    console.log('Loading texture visualizer...');
    await page.goto('http://localhost:8081/texture_visualizer.html');
    
    // Wait for page to load and species to load
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/texture-visualizer-m1.png', fullPage: true });
    console.log('Screenshot saved: screenshots/texture-visualizer-m1.png');
    
    // VALIDATION 1: Check for expected console logs
    console.log('\n=== VALIDATION RESULTS ===\n');
    
    const expectedLogs = [
        'Texture Visualizer - Milestone 1 Initialized',
        'Loaded species: urtica_dioica',
        'Loaded species: quercus_robur',
        'Loaded species: trifolium_repens'
    ];
    
    let foundLogs = 0;
    expectedLogs.forEach(expectedLog => {
        const found = consoleMessages.some(msg => msg.includes(expectedLog));
        if (found) {
            console.log(`✓ Found: "${expectedLog}"`);
            foundLogs++;
        } else {
            console.log(`✗ Missing: "${expectedLog}"`);
        }
    });
    
    // VALIDATION 2: Check for console errors
    console.log(`\nConsole Errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
        consoleErrors.forEach(err => console.error(`  - ${err}`));
    } else {
        console.log('✓ No console errors');
    }
    
    // VALIDATION 3: Check species dropdown population
    const speciesOptions = await page.$$eval('#species-select option', options => 
        options.map(opt => opt.textContent)
    );
    
    console.log(`\nSpecies Dropdown Options: ${speciesOptions.length}`);
    speciesOptions.forEach(opt => console.log(`  - ${opt}`));
    
    // VALIDATION 4: Check species count display
    const speciesCountText = await page.textContent('#species-count');
    console.log(`\nSpecies Count Display: ${speciesCountText}`);
    
    // VALIDATION 5: Check UI elements exist
    const titleExists = await page.isVisible('h1');
    const controlsPanelExists = await page.isVisible('.controls-panel');
    const outputPanelExists = await page.isVisible('.output-panel');
    
    console.log(`\nUI Elements:`);
    console.log(`  Title visible: ${titleExists}`);
    console.log(`  Controls panel visible: ${controlsPanelExists}`);
    console.log(`  Output panel visible: ${outputPanelExists}`);
    
    // FINAL VALIDATION
    console.log(`\n=== MILESTONE 1 VALIDATION ===`);
    console.log(`✓ Species loaded: ${foundLogs}/4 expected logs found`);
    console.log(`✓ Console errors: ${consoleErrors.length} (expected: 0)`);
    console.log(`✓ Species dropdown: ${speciesOptions.length} options (expected: 4 = 1 default + 3 species)`);
    console.log(`✓ Species count: ${speciesCountText} (expected: 3)`);
    console.log(`✓ UI structure: ${titleExists && controlsPanelExists && outputPanelExists}`);
    
    // Assertions for test pass/fail
    expect(consoleErrors.length).toBe(0);
    expect(foundLogs).toBe(4);
    expect(speciesOptions.length).toBe(4); // 1 default + 3 species
    expect(speciesCountText).toBe('3');
    expect(titleExists).toBe(true);
    
    console.log(`\n✅ MILESTONE 1: PASS - All validations successful`);
});
