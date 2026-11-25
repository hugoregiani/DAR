// Atualização de versão sem perder dados (V02, 23/11/2026): quem já lançou algo no arquivo da versão anterior abre a
// versão nova (mesma planilha) no mesmo navegador e continua com o que lançou; quem abre pela primeira vez recebe os
// dados da planilha; "Reiniciar" volta aos dados da planilha.
// Uso: node contratos_reais/e2e_atualizacao.js <pasta dos HTML anteriores> <pasta dos HTML novos> [NOME ...]
//   (anterior: EARL_Engenharia_<NOME>*.html; novo: EARL_Engenharia_<NOME>.html ou EARL_Engenharia_<NOME>_V*.html)
const {chromium} = require('playwright');
const fs = require('fs');
const path = require('path');
const [ANT, NOV, ...N0] = process.argv.slice(2);
if (!ANT || !NOV) { console.error('uso: node contratos_reais/e2e_atualizacao.js <pasta anteriores> <pasta novos> [NOME ...]'); process.exit(2); }
const NOMES = N0.length ? N0 : ['PA', 'DC', 'CE', 'BW', 'BDII', 'Shell', 'BP'];
let ok = 0, falhas = 0;
const conf = (c, msg, extra) => { if (c) { ok++; console.log('  ✓ ' + msg); } else { falhas++; console.log('  ✗ ' + msg + (extra !== undefined ? ' → ' + JSON.stringify(extra).slice(0, 400) : '')); } };
const acha = (pasta, nome) => fs.readdirSync(pasta).filter(f => new RegExp('^EARL_(Engenharia|Forecast)_' + nome + '(_V\\d+)?\\.html$').test(f)).sort().map(f => path.join(pasta, f)).pop();

(async () => {
  const browser = await chromium.launch();
  for (const NOME of NOMES) {
    const A = acha(ANT, NOME), B = acha(NOV, NOME);
    if (!A || !B) { console.log('\n== ' + NOME + ': arquivo anterior ou novo não encontrado, pulado'); continue; }
    console.log('\n== ' + NOME + ': ' + path.basename(A) + ' → ' + path.basename(B));
    const ctx = await browser.newContext();
    await ctx.addInitScript(() => { window.EARL_ABA_INICIAL = 'cts'; });
    await ctx.route(/^https?:\/\//, r => r.abort());
    const erros = [];
    const abre = async arq => {
      const p = await ctx.newPage();
      p.on('pageerror', e => erros.push(String(e)));
      await p.goto('file://' + arq);
      await p.waitForSelector('.eng2-card', {timeout: 90000});
      return p;
    };
    // 1. versão anterior: a pessoa lança algo
    const p1 = await abre(A);
    const antes = await p1.evaluate(n => { const d = loadDB(); const j = d.plannedJobs[0]; j.notes = 'LANÇADO NA VERSÃO ANTERIOR ' + n; saveDB(d); return {id: j.id, pl: window.EARL_PL_ID}; }, NOME);
    await p1.close();
    // 2. versão nova, mesmo navegador
    const p2 = await abre(B);
    const depois = await p2.evaluate(id => { const d = loadDB(); const j = d.plannedJobs.find(x => x.id === id); return {notes: j && j.notes, pl: window.EARL_PL_ID, guardado: localStorage.getItem('earl_pl_id'), versao: EARL_VERSION}; }, antes.id);
    conf(/LANÇADO NA VERSÃO ANTERIOR/.test(depois.notes || ''), 'o que foi lançado na versão anterior continua na nova', depois);
    conf(depois.guardado === depois.pl, 'a versão nova passa a ser a dona dos dados (' + antes.pl + (antes.pl === depois.pl ? ' = mesma planilha' : ' → ' + depois.pl) + ')', [antes.pl, depois.guardado]);
    await p2.reload(); await p2.waitForSelector('.eng2-card', {timeout: 90000});
    conf(/LANÇADO NA VERSÃO ANTERIOR/.test(await p2.evaluate(id => (loadDB().plannedJobs.find(x => x.id === id) || {}).notes || '', antes.id)), 'continua depois de reabrir a versão nova');
    // 3. Reiniciar volta aos dados da planilha
    p2.once('dialog', d => d.accept());
    await p2.click('.earl-pl-tag button');
    await p2.waitForLoadState('load'); await p2.waitForSelector('.eng2-card', {timeout: 90000});
    conf(!/LANÇADO NA VERSÃO ANTERIOR/.test(await p2.evaluate(id => (loadDB().plannedJobs.find(x => x.id === id) || {}).notes || '', antes.id)), '"Reiniciar" volta aos dados da planilha');
    await ctx.close();
    // 4. quem nunca abriu recebe os dados da planilha
    const ctx2 = await browser.newContext();
    await ctx2.addInitScript(() => { window.EARL_ABA_INICIAL = 'cts'; });
    await ctx2.route(/^https?:\/\//, r => r.abort());
    const p3 = await ctx2.newPage(); p3.on('pageerror', e => erros.push(String(e)));
    await p3.goto('file://' + B); await p3.waitForSelector('.eng2-card', {timeout: 90000});
    const novo = await p3.evaluate(() => { const d = loadDB(); return {marca: d.earlPlanilhaId === window.EARL_PL_ID, ops: d.plannedJobs.length}; });
    conf(novo.marca && novo.ops > 0, 'navegador novo: abre com os dados da planilha (' + novo.ops + ' operações)', novo);
    await ctx2.close();
    conf(!erros.length, NOME + ': nenhum erro de JavaScript', erros.slice(0, 3));
  }
  await browser.close();
  console.log('\n%d ok, %d falha(s)', ok, falhas);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
