// Abre o EARL_Engenharia.html direto do disco (file://), sem internet, como o usuário abre.
const {chromium} = require('playwright');
const path = require('path');
async function abrir(arquivo, {w = 1440, h = 900} = {}) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({viewport: {width: w, height: h}, acceptDownloads: true});
  await ctx.route(/^https?:\/\//, r => r.abort()); // prova que não depende de internet
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve(arquivo));
  return {browser, ctx, page, errs};
}
module.exports = {abrir};
