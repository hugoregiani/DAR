// Abre o EARL_Engenharia.html direto do disco (file://), sem internet, como o usuário abre.
// opções: w, h (tamanho da janela) e hoje ('AAAA-MM-DD': fixa o relógio do navegador nesse dia).
const {chromium} = require('playwright');
const path = require('path');
// aba: aba inicial da página inicial (e16): 'cts' = Contratos (padrão dos testes), 'ind' = Indicadores, '' = a do app.
async function abrir(arquivo, {w = 1440, h = 900, hoje, aba = 'cts'} = {}) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({viewport: {width: w, height: h}, acceptDownloads: true});
  if (aba) await ctx.addInitScript(a => { window.EARL_ABA_INICIAL = a; }, aba);
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
// e19: "⬇ Exportar dados" pergunta quais contratos exportar quando há mais de um ativo (vêm todos marcados): confirma.
// e20: sai um .json por contrato. Com `nomes` (texto do nome de cada contrato), deixa marcados só esses.
async function exportarDados(p, sel = '.eng-tools .eng-exportar', nomes) {
  await p.click(sel);
  const ok = p.locator('.eng-expsel-ok');
  try { await ok.waitFor({state: 'visible', timeout: 1500}); } catch (e) { return false; }
  if (nomes && nomes.length) {
    if (await p.isChecked('.eng-expsel-todos')) await p.click('.eng-expsel-todos');
    for (const n of nomes) await p.locator('.eng-expsel-tab tbody tr', {hasText: n}).first().locator('.eng-expsel-cb').check();
  }
  await ok.click();
  return true;
}
// e20: espera `n` downloads (um .json por contrato) e grava todos em `dir`; devolve os caminhos.
async function baixarVarios(p, acao, n, dir) {
  const l = [];
  const h = d => l.push(d);
  p.on('download', h);
  await acao();
  for (let i = 0; i < 200 && l.length < n; i++) await p.waitForTimeout(100);
  await p.waitForTimeout(600); // nenhum a mais
  p.off('download', h);
  const out = [];
  for (const x of l) { const f = path.join(dir, x.suggestedFilename()); await x.saveAs(f); out.push(f); }
  return out;
}
module.exports = {abrir, exportarDados, baixarVarios};
