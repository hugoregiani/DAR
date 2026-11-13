const {chromium} = require('playwright');
const path = require('path');
(async () => {
  const dir = __dirname;
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport: {width: 1280, height: 720}});
  await page.goto('file://' + path.join(dir, 'deck.html'));
  await page.waitForLoadState('networkidle');
  await page.pdf({path: path.join(dir, process.argv[2] || 'deck.pdf'), width: '1280px', height: '720px', printBackground: true, preferCSSPageSize: true});
  if (process.argv[3] === 'png') {
    const n = await page.locator('section.s').count();
    for (let i = 0; i < n; i++) await page.locator('section.s').nth(i).screenshot({path: path.join(dir, 'prev', String(i + 1).padStart(2, '0') + '.png')});
  }
  await browser.close();
})();
