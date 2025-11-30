const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    if (!text.includes('favicon')) {
      logs.push(text);
      console.log(`[BROWSER] ${text}`);
    }
  });
  
  console.log('Opening http://localhost:8081...');
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
  
  console.log('Waiting for page to load...');
  await page.waitForTimeout(3000);
  
  console.log('\n=== SIMULATING RIGHT-CLICK VIA dispatchEvent ===');
  await page.evaluate(() => {
    const canvas = document.getElementById('gameCanvas');
    const rect = canvas.getBoundingClientRect();
    
    const event = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      view: window,
      button: 2, // Right button
      buttons: 2,
      clientX: rect.left + 200,
      clientY: rect.top + 200
    });
    
    console.log('[DEBUG] Dispatching mousedown event to canvas');
    canvas.dispatchEvent(event);
  });
  
  await page.waitForTimeout(1000);
  
  const result = await page.evaluate(() => {
    const menu = document.getElementById('context-menu');
    if (!menu) return { exists: false };
    
    const style = window.getComputedStyle(menu);
    return {
      exists: true,
      display: style.display,
      left: style.left,
      top: style.top,
      htmlLength: menu.innerHTML.length,
      firstChars: menu.innerHTML.substring(0, 200)
    };
  });
  
  console.log('\n=== RESULT ===');
  console.log(`Menu exists: ${result.exists}`);
  console.log(`Display: ${result.display}`);
  console.log(`Position: ${result.left}, ${result.top}`);
  console.log(`HTML length: ${result.htmlLength}`);
  
  if (result.display !== 'none' && result.htmlLength > 0) {
    console.log('\n✅ SUCCESS: Context menu is working!');
    console.log('First 200 chars:', result.firstChars);
  } else {
    console.log('\n❌ FAIL: Context menu not visible');
  }
  
  await page.screenshot({ path: 'context-menu-debug.png', fullPage: true });
  console.log('\nScreenshot saved to context-menu-debug.png');
  
  await browser.close();
})();
