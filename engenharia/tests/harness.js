// Abre o EARL_Engenharia.html direto do disco (file://), sem internet, como o usuário abre.
// opções: w, h (tamanho da janela) e hoje ('AAAA-MM-DD': fixa o relógio do navegador nesse dia).
const {chromium} = require('playwright');
const path = require('path');
async function abrir(arquivo, {w = 1440, h = 900, hoje} = {}) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({viewport: {width: w, height: h}, acceptDownloads: true});
  await ctx.route(/^https?:\/\//, r => r.abort()); // prova que não depende de internet
  const page = await ctx.newPage();
  if (hoje) await page.clock.setFixedTime(new Date(hoje + 'T12:00:00'));
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  // O relógio fixo do Playwright tenta rodar um script na pré-visualização do e-mail, que é um iframe
  // isolado (sandbox, sem scripts) de propósito; esse bloqueio não é erro do app.
  page.on('console', m => { if (m.type() === 'error' && !/about:srcdoc.*sandboxed/.test(m.text())) errs.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve(arquivo));
  return {browser, ctx, page, errs};
}
module.exports = {abrir};
