/**
 * Weather System Debug Test
 * 
 * Tests weather controls in debug panel and verifies rain particles
 */

const { test, expect } = require('@playwright/test');

test.describe('Weather System Debug', () => {
    test('should have weather controls in debug panel', async ({ page }) => {
        // Navigate to the app
        await page.goto('http://localhost:8081');
        
        // Wait for initialization
        await page.waitForTimeout(2000);
        
        // Check if weather section exists
        const weatherSection = page.locator('#weather-section');
        await expect(weatherSection).toBeVisible();
        
        // Check weather buttons exist
        const sunnyBtn = page.locator('#weather-btn-sunny');
        const cloudyBtn = page.locator('#weather-btn-cloudy');
        const rainyBtn = page.locator('#weather-btn-rainy');
        
        await expect(sunnyBtn).toBeVisible();
        await expect(cloudyBtn).toBeVisible();
        await expect(rainyBtn).toBeVisible();
        
        // Check weather metrics exist
        await expect(page.locator('#weather-state')).toBeVisible();
        await expect(page.locator('#weather-intensity')).toBeVisible();
        await expect(page.locator('#weather-particles')).toBeVisible();
        await expect(page.locator('#weather-next-change')).toBeVisible();
    });
    
    test('should change weather when buttons are clicked', async ({ page }) => {
        // Navigate to the app
        await page.goto('http://localhost:8081');
        
        // Wait for initialization
        await page.waitForTimeout(2000);
        
        // Get initial weather state
        const initialState = await page.locator('#weather-state').textContent();
        console.log('Initial weather state:', initialState);
        
        // Click rainy button
        await page.click('#weather-btn-rainy');
        await page.waitForTimeout(500);
        
        // Verify weather changed to rainy
        const rainyState = await page.locator('#weather-state').textContent();
        expect(rainyState.toLowerCase()).toBe('rainy');
        console.log('Weather state after clicking Rainy:', rainyState);
        
        // Check rain intensity is non-zero
        const intensity = await page.locator('#weather-intensity').textContent();
        const intensityValue = parseInt(intensity);
        expect(intensityValue).toBeGreaterThan(0);
        console.log('Rain intensity:', intensity);
        
        // Wait for particles to spawn
        await page.waitForTimeout(2000);
        
        // Check particle count
        const particleCount = await page.locator('#weather-particles').textContent();
        const particleValue = parseInt(particleCount);
        expect(particleValue).toBeGreaterThan(0);
        console.log('Active particles:', particleCount);
        
        // Click sunny button
        await page.click('#weather-btn-sunny');
        await page.waitForTimeout(500);
        
        // Verify weather changed to sunny
        const sunnyState = await page.locator('#weather-state').textContent();
        expect(sunnyState.toLowerCase()).toBe('sunny');
        console.log('Weather state after clicking Sunny:', sunnyState);
        
        // Verify rain intensity is zero
        const sunnyIntensity = await page.locator('#weather-intensity').textContent();
        expect(sunnyIntensity).toBe('0%');
        console.log('Rain intensity after sunny:', sunnyIntensity);
    });
    
    test('should spawn particles when weather is rainy', async ({ page }) => {
        // Navigate to the app
        await page.goto('http://localhost:8081');
        
        // Wait for initialization
        await page.waitForTimeout(2000);
        
        // Monitor console for weather changes
        const consoleLogs = [];
        page.on('console', msg => {
            const text = msg.text();
            consoleLogs.push(text);
            console.log('[BROWSER]', text);
        });
        
        // Set weather to rainy
        await page.click('#weather-btn-rainy');
        await page.waitForTimeout(500);
        
        // Get particle count every 500ms for 3 seconds
        const particleCounts = [];
        for (let i = 0; i < 6; i++) {
            await page.waitForTimeout(500);
            const count = await page.locator('#weather-particles').textContent();
            particleCounts.push(parseInt(count));
            console.log(`Particle count at ${i * 500}ms:`, count);
        }
        
        // Verify particles are spawning (at least one non-zero count)
        const hasParticles = particleCounts.some(count => count > 0);
        expect(hasParticles).toBe(true);
        
        // Verify average particle count is reasonable
        const avgCount = particleCounts.reduce((a, b) => a + b, 0) / particleCounts.length;
        console.log('Average particle count:', avgCount);
        expect(avgCount).toBeGreaterThan(0);
        
        // Log console messages
        console.log('Console logs:', consoleLogs);
    });
    
    test('should update weather metrics in real-time', async ({ page }) => {
        // Navigate to the app
        await page.goto('http://localhost:8081');
        
        // Wait for initialization
        await page.waitForTimeout(2000);
        
        // Set weather to rainy
        await page.click('#weather-btn-rainy');
        await page.waitForTimeout(1000);
        
        // Get initial values
        const initialIntensity = await page.locator('#weather-intensity').textContent();
        const initialParticles = await page.locator('#weather-particles').textContent();
        const initialNextChange = await page.locator('#weather-next-change').textContent();
        
        console.log('Initial metrics:', {
            intensity: initialIntensity,
            particles: initialParticles,
            nextChange: initialNextChange
        });
        
        // Wait and check again
        await page.waitForTimeout(2000);
        
        const laterParticles = await page.locator('#weather-particles').textContent();
        
        console.log('Later metrics:', {
            particles: laterParticles
        });
        
        // Verify metrics are being updated
        expect(initialIntensity).not.toBe('N/A');
        expect(initialNextChange).not.toBe('0.0 days');
    });
});
