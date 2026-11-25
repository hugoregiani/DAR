// e15 com os arquivos reais: exporta do arquivo de um contrato (A) e importa no de outro (B); importa de novo no A
// (substitui o próprio contrato); apaga os contratos do B até ficar em branco.
// Uso: node contratos_reais/e2e_importar.js <pasta dos HTML> [A B]   (padrão: PA BDII)
const {chromium} = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');
const [PASTA, NA = 'PA', NB = 'BDII'] = process.argv.slice(2);
if (!PASTA) { console.error('uso: node contratos_reais/e2e_importar.js <pasta dos HTML> [A B]'); process.exit(2); }
const acha = n => fs.readdirSync(PASTA).filter(f => new RegExp('^EARL_(Engenharia|Forecast_Receita)_' + n + '(_V\\d+)?\\.html$').test(f)).sort().map(f => path.join(PASTA, f)).pop();
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'earl-imp-'));
let ok = 0, falhas = 0;
const conf = (c, msg, extra) => { if (c) { ok++; console.log('  ✓ ' + msg); } else { falhas++; console.log('  ✗ ' + msg + (extra !== undefined ? ' → ' + JSON.stringify(extra).slice(0, 500) : '')); } };
const resumo = p => p.evaluate(() => {
  const d = loadDB();
  const pac = window.engGerDados ? window.engGerDados().pacote : null;
  const rec = {};
  if (pac) pac.operacoes.forEach(o => { const c = pac.contratos.find(x => x.id === o.contratoId) || {}; const f = o.risco >= 100 ? 0 : 1 - (o.risco || 0) / 100; rec[c.nome] = (rec[c.nome] || 0) + (o.realizado ? o.receita.usd : o.previsto.receita.usd) * f; });
  return {ativos: d.contratos.filter(c => !c.archived).map(c => c.name).sort(), arq: d.contratos.filter(c => c.archived).length, ops: d.plannedJobs.length, rec};
});

(async () => {
  const browser = await chromium.launch();
  const ctxA = await browser.newContext({acceptDownloads: true}), ctxB = await browser.newContext({acceptDownloads: true});
  for (const c of [ctxA, ctxB]) { await c.addInitScript(() => { window.EARL_ABA_INICIAL = 'cts'; }); await c.route(/^https?:\/\//, r => r.abort()); }
  const erros = [];
  const abre = async (ctx, arq) => { const p = await ctx.newPage(); p.on('pageerror', e => erros.push(String(e))); await p.goto('file://' + arq); await p.waitForSelector('.eng2-card', {timeout: 90000}); await p.waitForFunction(() => typeof window.engGerDados === 'function', null, {timeout: 30000}); return p; };
  const importar = async (p, arq, cambioArq) => {
    await p.setInputFiles('.eng-tools input[type=file]', arq);
    await p.waitForSelector('.ec-imp-dados');
    const tela = await p.innerText('.ec-imp-cts');
    const aviso = await p.locator('.ec-imp-cambio').count() ? await p.innerText('.ec-imp-cambio') : '';
    if (cambioArq && await p.locator('.ec-imp-cambio-arq').count()) await p.check('.ec-imp-cambio-arq');
    const carregou = p.waitForEvent('load', {timeout: 60000});
    await p.click('.ec-importar'); await p.waitForTimeout(400);
    const c = p.locator('.modal button', {hasText: 'Substituir e importar'});
    if (await c.count()) await c.click();
    await carregou; await p.waitForSelector('.eng2-card', {timeout: 90000}); await p.waitForFunction(() => typeof window.engGerDados === 'function');
    return {tela, aviso};
  };
  console.log('A = ' + path.basename(acha(NA)) + ' · B = ' + path.basename(acha(NB)));
  const pA = await abre(ctxA, acha(NA));
  const RA = await resumo(pA);
  const d = pA.waitForEvent('download'); await pA.click('.eng-tools .eng-exportar'); const x = await d;
  const arqA = path.join(TMP, x.suggestedFilename()); await x.saveAs(arqA);
  const pB = await abre(ctxB, acha(NB));
  const RB = await resumo(pB);
  const {tela, aviso} = await importar(pB, arqA);
  const RB2 = await resumo(pB);
  const mud = n => Math.abs((RB2.rec[n] || 0) - (RA.rec[n] || 0));
  conf(tela.split('\n').filter(l => /\t/.test(l)).length >= 1 && RA.ativos.every(n => tela.indexOf(n) >= 0), 'B: a tela lista o(s) contrato(s) ativo(s) do A (os arquivados sem operações ficam de fora)', tela.slice(0, 300));
  conf(JSON.stringify(RB2.ativos) === JSON.stringify([...new Set([...RB.ativos, ...RA.ativos])].sort()), 'B: fica com os contratos dele e os do A', RB2.ativos);
  conf(RB2.ops === RB.ops + RA.ops, 'B: operações do B + as do A (' + RB.ops + ' + ' + RA.ops + ')', RB2.ops);
  conf(RB.ativos.every(n => Math.abs((RB2.rec[n] || 0) - (RB.rec[n] || 0)) < 0.05), 'B: os contratos que já estavam no B não mudam (receita igual)', [RB.rec, RB2.rec]);
  const difPA = RA.ativos.reduce((a, n) => a + mud(n), 0);
  console.log('    câmbio: ' + (aviso ? aviso.split('\n')[0].slice(0, 260) : 'igual nos dois arquivos') + ' · diferença na receita do contrato importado: US$ ' + difPA.toFixed(2));
  conf(difPA < 0.05 || /câmbio do arquivo é diferente/.test(aviso), 'contrato importado: receita igual à do A, ou a tela avisa que o câmbio dos arquivos é diferente', aviso);
  // com "usar o câmbio do arquivo": o contrato importado fica igual ao do A
  await importar(pB, arqA, true);
  const RB2b = await resumo(pB);
  conf(RA.ativos.every(n => Math.abs((RB2b.rec[n] || 0) - (RA.rec[n] || 0)) < 0.05), 'com "usar o câmbio do arquivo": a receita do contrato importado fica igual à do A', [RA.rec, RB2b.rec]);
  // importar de novo no próprio A (substitui o contrato dele, sem duplicar)
  await importar(pA, arqA);
  const RA2 = await resumo(pA);
  conf(JSON.stringify(RA2.ativos) === JSON.stringify(RA.ativos) && RA2.ops === RA.ops, 'A: importar o próprio arquivo substitui o contrato sem duplicar', [RA.ops, RA2.ops]);
  // apagar tudo no B
  for (const nome of RB2.ativos) {
    await pB.locator('.eng2-card', {hasText: nome}).first().locator('.eng2-menu-b').click();
    await pB.click('.eng2-menu-apagar');
    if (await pB.locator('.modal textarea').count()) await pB.locator('.modal textarea').fill('APAGAR');
    await pB.locator('.modal button', {hasText: /^Apagar contrato/}).last().click();
    await pB.waitForTimeout(700);
  }
  await pB.reload(); await pB.waitForSelector('.eng-tools', {timeout: 90000}); await pB.waitForTimeout(1000);
  const RB3 = await pB.evaluate(() => { const d = loadDB(); return {cts: d.contratos.length, ops: d.plannedJobs.length, inv: (d.invSondas || []).length}; });
  conf(RB3.cts === 0 && RB3.ops === 0 && RB3.inv === 0, 'B: apagando os contratos, o arquivo fica em branco (nem os arquivados do cadastro sobram), também depois de reabrir', RB3);
  conf(!erros.length, 'nenhum erro de JavaScript', erros.slice(0, 3));
  await browser.close();
  console.log('\n%d ok, %d falha(s)', ok, falhas);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
