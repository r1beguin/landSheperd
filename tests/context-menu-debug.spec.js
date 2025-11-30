const { test, expect } = require('@playwright/test');

test('Manual Context Menu Test Page', async ({ page }) => {
  // Navigate to test page
  await page.goto('http://localhost:8081/test_context_menu.html');
  
  // Wait for engine to initialize
  await page.waitForTimeout(3000);
  
  // Take initial screenshot
  await page.screenshot({ path: 'test-results/context-menu-initial.png' });
  
  // Check console logs
  const logs = [];
  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });
  
  // Get test log content
  await page.waitForTimeout(2000);
  const testLog = await page.locator('#test-log').innerText();
  console.log('Test log content:');
  console.log(testLog);
  
  // Click the "Run Automated Tests" button
  await page.click('button:has-text("Run Automated Tests")');
  
  // Wait for tests to complete
  await page.waitForTimeout(4000);
  
  // Take final screenshot
  await page.screenshot({ path: 'test-results/context-menu-automated.png', fullPage: true });
  
  // Get final test status
  const finalLog = await page.locator('#test-log').innerText();
  console.log('\nFinal test log:');
  console.log(finalLog);
  
  const statusContainer = await page.locator('#test-status-container').innerText();
  console.log('\nTest status:');
  console.log(statusContainer);
  
  // Print all console logs
  console.log('\nBrowser console logs:');
  logs.forEach(log => console.log(log));
});
