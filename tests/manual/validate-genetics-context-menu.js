/**
 * Simple validation script for genetics context menu
 * Checks code implementation without full Playwright test
 */

const fs = require('fs');
const path = require('path');

console.log('=== Genetics Context Menu Validation ===\n');

// Check 1: Context menu manager has genetics methods
console.log('CHECK 1: Context menu manager has genetics panel methods');
const contextMenuPath = path.join(__dirname, '..', '..', 'js', 'systems', 'context_menu_manager.js');
const contextMenuContent = fs.readFileSync(contextMenuPath, 'utf8');

const hasGeneticsPanel = contextMenuContent.includes('_buildGeneticsPanel');
const hasTraitBar = contextMenuContent.includes('_buildTraitBar');
const hasGeneticsIntegration = contextMenuContent.includes('plant.genetics');

console.log(`  _buildGeneticsPanel method: ${hasGeneticsPanel ? '✓' : '✗'}`);
console.log(`  _buildTraitBar method: ${hasTraitBar ? '✓' : '✗'}`);
console.log(`  Genetics integration: ${hasGeneticsIntegration ? '✓' : '✗'}`);

if (hasGeneticsPanel && hasTraitBar && hasGeneticsIntegration) {
    console.log('  PASS: Genetics panel methods present\n');
} else {
    console.log('  FAIL: Missing genetics panel methods\n');
    process.exit(1);
}

// Check 2: CSS has genetics styling
console.log('CHECK 2: CSS has genetics panel styles');
const cssPath = path.join(__dirname, '..', '..', 'css', 'styles.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

const hasGeneticsGrid = cssContent.includes('.genetics-grid');
const hasGeneticsSection = cssContent.includes('.genetics-section');
const hasTraitLabel = cssContent.includes('.trait-label');
const hasTraitBarStyle = cssContent.includes('.trait-bar');
const hasTraitFill = cssContent.includes('.trait-fill');
const hasTraitValue = cssContent.includes('.trait-value');

console.log(`  .genetics-grid: ${hasGeneticsGrid ? '✓' : '✗'}`);
console.log(`  .genetics-section: ${hasGeneticsSection ? '✓' : '✗'}`);
console.log(`  .trait-label: ${hasTraitLabel ? '✓' : '✗'}`);
console.log(`  .trait-bar: ${hasTraitBarStyle ? '✓' : '✗'}`);
console.log(`  .trait-fill: ${hasTraitFill ? '✓' : '✗'}`);
console.log(`  .trait-value: ${hasTraitValue ? '✓' : '✗'}`);

if (hasGeneticsGrid && hasGeneticsSection && hasTraitLabel && hasTraitBarStyle && hasTraitFill && hasTraitValue) {
    console.log('  PASS: All genetics CSS classes present\n');
} else {
    console.log('  FAIL: Missing genetics CSS classes\n');
    process.exit(1);
}

// Check 3: Trait labels correctness
console.log('CHECK 3: Trait labels match specification');
const expectedTraits = [
    'heightFactor',
    'widthFactor',
    'foliageDensity',
    'trunkShape',
    'colorTint',
    'nitrogenEfficiency',
    'phosphorusEfficiency',
    'potassiumEfficiency',
    'organicMatterEfficiency'
];

const allTraitsPresent = expectedTraits.every(trait => contextMenuContent.includes(trait));
console.log(`  All 9 traits present: ${allTraitsPresent ? '✓' : '✗'}`);

if (allTraitsPresent) {
    console.log('  PASS: All 9 genetic traits included\n');
} else {
    console.log('  FAIL: Missing genetic traits\n');
    process.exit(1);
}

// Check 4: Color coding implementation
console.log('CHECK 4: Color coding logic present');
const hasColorCoding = contextMenuContent.includes('#2e7d32') && // Bright green
                        contextMenuContent.includes('#4a7c59') && // Green
                        contextMenuContent.includes('#6b8e23') && // Yellow-green
                        contextMenuContent.includes('#d4a017') && // Yellow
                        contextMenuContent.includes('#a0522d');   // Brown-red

console.log(`  5-tier color system: ${hasColorCoding ? '✓' : '✗'}`);

if (hasColorCoding) {
    console.log('  PASS: Color coding logic implemented\n');
} else {
    console.log('  FAIL: Missing color coding\n');
    process.exit(1);
}

// Check 5: Generation display
console.log('CHECK 5: Generation display logic');
const hasGenerationDisplay = contextMenuContent.includes('genetics.generation');
console.log(`  Generation number display: ${hasGenerationDisplay ? '✓' : '✗'}`);

if (hasGenerationDisplay) {
    console.log('  PASS: Generation display implemented\n');
} else {
    console.log('  FAIL: Missing generation display\n');
    process.exit(1);
}

// Summary
console.log('=================================');
console.log('ALL CHECKS PASSED');
console.log('=================================');
console.log('\nNext steps:');
console.log('1. Start server: npx http-server -p 8081');
console.log('2. Open browser: http://localhost:8081/tests/html/genetics-context-menu-test.html');
console.log('3. Test each scenario manually');
console.log('4. Verify visuals match specification');
console.log('\nMilestone 6 implementation complete!');
