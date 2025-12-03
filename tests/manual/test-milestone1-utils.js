/**
 * Test Milestone 1: Utility Modules Validation
 * Tests ColorUtils, CanvasUtils, and GeneticsUtils
 */

// Test 1: ColorUtils.shiftHue
console.log('=== Testing ColorUtils ===');
const testColor = '#4a7c3c';
const shiftedColor = ColorUtils.shiftHue(testColor, 20);
console.log(`Original: ${testColor}`);
console.log(`Shifted +20: ${shiftedColor}`);
console.log(`Expected format: #[6 hex digits]`);
console.log(`Format valid: ${/^#[0-9a-f]{6}$/.test(shiftedColor)}`);

// Test with zero shift (should be identical)
const zeroShift = ColorUtils.shiftHue(testColor, 0);
console.log(`Zero shift matches: ${testColor === zeroShift}`);

// Test negative shift
const negativeShift = ColorUtils.shiftHue(testColor, -20);
console.log(`Negative shift: ${negativeShift}`);

// Test 2: CanvasUtils drawing functions
console.log('\n=== Testing CanvasUtils ===');
const testCanvas = document.createElement('canvas');
testCanvas.width = 20;
testCanvas.height = 20;
const testCtx = testCanvas.getContext('2d');

try {
    CanvasUtils.drawEllipse(testCtx, 10, 10, 5, 3, '#ff0000');
    console.log('drawEllipse: PASS');
} catch (e) {
    console.error('drawEllipse: FAIL', e);
}

try {
    CanvasUtils.drawLine(testCtx, 0, 0, 10, 10, '#00ff00', 1);
    console.log('drawLine: PASS');
} catch (e) {
    console.error('drawLine: FAIL', e);
}

try {
    CanvasUtils.drawCurvedLine(testCtx, 0, 10, 5, 5, 10, 10, '#0000ff', 1);
    console.log('drawCurvedLine: PASS');
} catch (e) {
    console.error('drawCurvedLine: FAIL', e);
}

// Test 3: GeneticsUtils calculations
console.log('\n=== Testing GeneticsUtils ===');

// Test dimension multiplier
const dimMult127 = GeneticsUtils.getDimensionMultiplier(127);
console.log(`getDimensionMultiplier(127): ${dimMult127.toFixed(2)} (expected ~1.0)`);

const dimMult0 = GeneticsUtils.getDimensionMultiplier(0);
console.log(`getDimensionMultiplier(0): ${dimMult0.toFixed(2)} (expected 0.7)`);

const dimMult255 = GeneticsUtils.getDimensionMultiplier(255);
console.log(`getDimensionMultiplier(255): ${dimMult255.toFixed(2)} (expected 1.3)`);

// Test foliage multiplier
const foliageMult127 = GeneticsUtils.getFoliageMultiplier(127);
console.log(`getFoliageMultiplier(127): ${foliageMult127.toFixed(2)} (expected ~1.0)`);

// Test hue tint
const hueTint0 = GeneticsUtils.getHueTint(0);
console.log(`getHueTint(0): ${hueTint0.toFixed(0)} (expected -20)`);

const hueTint127 = GeneticsUtils.getHueTint(127);
console.log(`getHueTint(127): ${hueTint127.toFixed(0)} (expected ~0)`);

const hueTint255 = GeneticsUtils.getHueTint(255);
console.log(`getHueTint(255): ${hueTint255.toFixed(0)} (expected 20)`);

// Test applyGeneticDimensions
const baseDims = { width: 40, height: 50 };
const genetics = { heightFactor: 127, widthFactor: 127 };
const result = GeneticsUtils.applyGeneticDimensions(baseDims, genetics, 1.0);
console.log(`applyGeneticDimensions with genetics: w=${result.width}, h=${result.height}`);

const resultNoGenetics = GeneticsUtils.applyGeneticDimensions(baseDims, null, 0.5);
console.log(`applyGeneticDimensions without genetics (0.5 modifier): w=${resultNoGenetics.width}, h=${resultNoGenetics.height}`);

console.log('\n=== Milestone 1 Validation Complete ===');
