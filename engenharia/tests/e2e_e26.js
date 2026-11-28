// e26 + Gerencial g25 (pedidos do Hugo, 28/11/2026):
// 1. "Retire tudo o que se refere a margem de todos os indicadores ou no contrato também" — confere que a palavra
//    "margem" não aparece em nenhuma aba dos Indicadores, nos gráficos, no Excel consolidado, na janela da operação,
//    no consumo da operação nem na tela de receita do contrato; os cartões são Receita, COGS, Operações e Receita/operação.
// 2. Aba "Gráficos" (barras verticais), cada gráfico com a sua escolha de itens ("Itens ▾") e "Mostrar os N maiores":
//    itens PPU de maior receita, contratos (receita e COGS), receita esperada e em risco, itens PPU perto de acabar o
//    saldo e sondas. Os valores batem com os cartões e as tabelas; a escolha de itens fica guardada.
// Uso: node tests/e2e_e26.js [EARL_Engenharia.html]
const {abrir} = require('./harness');
const {montar} = require('../walkthrough/demo');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ARQ = path.resolve(process.argv[2] || path.join(__dirname, '..', 'EARL_Engenharia.html'));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'earl-e26-'));
let ok = 0, falhas = 0;
const conf = (c, msg, extra) => { if (c) { ok++; console.log('  ✓ ' + msg); } else { falhas++; console.log('  ✗ ' + msg + (extra !== undefined ? ' → ' + JSON.stringify(extra).slice(0, 700) : '')); } };
const valor = t => Number(String(t).replace(/[^\d,-]/g, '').replace(',', '.'));
const perto = (a, b, t = 0.02) => Math.abs(a - b) <= t;
const baixar = async (p, acao) => { const d = p.waitForEvent('download', {timeout: 30000}); await acao(); const x = await d; const f = path.join(TMP, x.suggestedFilename()); await x.saveAs(f); return f; };
const frame = async p => {
  if (await p.locator('.fr-tab-ind:not(.on)').count()) await p.click('.fr-tab-ind');
  const h = await p.waitForSelector('.ec-ger-frame', {timeout: 60000});
  const f = await h.contentFrame();
  await f.waitForSelector('.kpis', {timeout: 30000});
  return f;
};
// valores das barras de um gráfico: o aria-label de cada barra ("<item>: receita US$ 1.234,56, COGS …")
const barras = (f, key) => f.$$eval('[data-gfcard="' + key + '"] .gf-b', l => l.map(g => ({k: g.dataset.k, a: g.getAttribute('aria-label'), al: g.classList.contains('gf-al')})));
const usd = a => { const m = String(a).match(/receita(?: cheia)? US\$ ([\d.]+,\d{2})/); return m ? valor(m[1]) : NaN; };

(async () => {
  const E = await abrir(ARQ, {hoje: '2026-11-28', h: 1000});
  const p = E.page;
  await p.waitForSelector('.eng2-card', {timeout: 90000});
  await montar(p);
  await p.waitForSelector('.eng2-card');
  // saldo contratado nos itens do P&A (o demo não tem): o "perto de acabar" passa a ter o que mostrar
  await p.evaluate(() => {
    const d = loadDB(), ct = d.contratos.find(c => c.id === 'ct_demo_pa');
    ct.items.forEach((i, n) => { i.saldoIni = [3, 6, 10, 40, 400][n % 5]; });
    saveDB(d);
  });
  await p.reload(); await p.waitForSelector('.eng2-card', {timeout: 90000});

  console.log('1. Sem margem nos Indicadores');
  let f = await frame(p);
  await f.selectOption('[data-f="ano"]', '2026').catch(() => {});
  const cards = await f.$$eval('.kpis .kpi > span', l => l.map(x => x.textContent));
  conf(cards.join('|') === 'Receita em US$|COGS em US$|Operações|Receita / operação (US$)', 'cartões: Receita, COGS, Operações, Receita/operação (sem a Margem)', cards);
  const abas = await f.$$eval('.tabs .tab', l => l.map(x => x.textContent));
  conf(abas[0] === 'Receita e COGS' && abas[1] === 'Gráficos', 'abas: “Receita e COGS” (antes “Receita e margem”) e a nova “Gráficos”', abas);
  conf((await f.$$eval('.g-card .g-mets button', l => l.map(b => b.textContent))).join('|') === 'Receita|COGS|Receita e COGS', 'gráfico por mês: Mostrar só Receita, COGS e Receita e COGS (saiu a Margem)');
  await f.click('[data-mxmostrar="4"]').catch(() => {});
  const thTot = await f.$$eval('.t-mx thead tr:last-child th', l => l.slice(-3).map(x => x.textContent));
  conf(thTot.join('|') === 'COGS|Receita|COGS', 'matriz: o Total tem só Receita e COGS', thTot);
  // registro, para a aba de comparação
  await f.click('.b-reg'); await f.waitForSelector('#dlg [data-a="regSalvar"]'); await f.click('#dlg [data-a="regSalvar"]'); await p.waitForTimeout(500);
  const semMargem = [];
  for (const t of ['receita', 'graficos', 'cmp', 'contratos', 'ppu', 'quim', 'cas', 'pes', 'ops']) {
    await f.click('[data-tab="' + t + '"]'); await p.waitForTimeout(350);
    const tx = await f.innerText('body');
    if (/margem/i.test(tx)) semMargem.push(t + ': ' + (tx.match(/.{40}margem.{40}/i) || [''])[0]);
  }
  conf(!semMargem.length, 'a palavra “margem” não aparece em nenhuma aba (Receita e COGS, Gráficos, Comparar registros, Por contrato, Itens PPU, Químicas, Casing, Pessoal, Operações)', semMargem);
  await f.click('[data-tab="receita"]');
  const xl = await baixar(p, () => f.click('[data-a="excel"]'));
  const abasX = await p.evaluate(b => { const w = XLSX.read(b, {type: 'base64'}); return w.SheetNames.map(n => [n, JSON.stringify(XLSX.utils.sheet_to_json(w.Sheets[n], {header: 1}).slice(0, 3))]); }, fs.readFileSync(xl).toString('base64'));
  conf(abasX.length > 2 && !abasX.some(([, c]) => /margem/i.test(c)), 'Excel consolidado sem colunas de margem (' + abasX.length + ' abas)', abasX.filter(([, c]) => /margem/i.test(c)).map(([n]) => n));

  console.log('\n2. Sem margem no contrato (janela da operação, consumo, receita do contrato)');
  await p.click('.fr-tab-cts');
  await p.locator('.eng2-card', {hasText: 'P&A — Macaé'}).first().click();
  await p.waitForSelector('.db-tab');
  await p.click('.db-tab:has-text("Lista")'); await p.click('.eng-lista-todas').catch(() => {});
  await p.locator('table.db-table tbody tr').first().locator('button', {hasText: 'Editar'}).click();
  await p.waitForSelector('.eng-resumo-op');
  const ro = await p.innerText('.eng-resumo-op');
  conf(/receita/i.test(ro) && /cogs/i.test(ro) && !/margem/i.test(ro), 'janela da operação: Receita e COGS, sem Margem', ro.slice(0, 160));
  await p.click('.eng-modal button:has-text("Cancelar")');
  await p.locator('table.db-table tbody tr').first().locator('button', {hasText: 'Consumo'}).click();
  await p.waitForSelector('.ec-cons-modal .ec-resumo');
  const rc = await p.innerText('.ec-cons-modal .ec-resumo');
  conf(/cogs/i.test(rc) && !/margem/i.test(rc), 'consumo da operação: Receita e COGS, sem Margem', rc.slice(0, 160));
  await p.click('.ec-cons-modal .modal-close').catch(async () => { await p.keyboard.press('Escape'); });
  await p.waitForTimeout(300);
  await p.evaluate(() => window.engPlanView('rec'));
  await p.waitForTimeout(300);
  const kr = await p.$$eval('.ec-kpi-cogs, .ec-kpi-usd, .ec-kpi-brl, [class*="ec-kpi"]', l => l.map(x => x.textContent).join(' | '));
  conf(/cogs/i.test(kr) && !/margem/i.test(kr) && !(await p.locator('.ec-kpi-margem').count()), 'tela de receita do contrato: sem o cartão de Margem', kr.slice(0, 200));
  await p.evaluate(() => window.engPlanView('gantt'));
  await p.click('button:has-text("Voltar")').catch(() => {});
  await p.waitForTimeout(300);

  console.log('\n3. Aba Gráficos: barras verticais, valores e escolha de itens');
  f = await frame(p);
  await f.selectOption('[data-f="ano"]', '2026').catch(() => {});
  await f.click('[data-tab="graficos"]'); await p.waitForTimeout(600);
  const tits = await f.$$eval('.gf-card h2', l => l.map(x => x.textContent));
  conf(tits.length === 5 && /Itens PPU com maior receita/.test(tits[0]) && /Contratos — receita e COGS/.test(tits[1]) && /receita esperada e receita em risco/.test(tits[2]) && /perto de acabar/.test(tits[3]) && /Sondas/.test(tits[4]), '5 gráficos: itens PPU de maior receita, contratos (receita e COGS), receita esperada × em risco, PPU perto de acabar, sondas', tits);
  const kpiRec = valor(await f.textContent('.k-rec-usd b'));
  // itens PPU: todos → a soma é a receita do cartão
  await f.selectOption('[data-gfn="ppu"]', '0'); await p.waitForTimeout(400);
  let bp = await barras(f, 'ppu');
  const somaPpu = bp.reduce((a, b) => a + usd(b.a), 0);
  conf(bp.length >= 10 && perto(somaPpu, kpiRec, 0.01 * bp.length + 0.01), 'itens PPU (Todos): ' + bp.length + ' barras; a soma (US$ ' + somaPpu.toFixed(2) + ') é a receita do cartão (US$ ' + kpiRec.toFixed(2) + ')', {somaPpu, kpiRec});
  const ordenado = bp.every((b, i) => !i || usd(bp[i - 1].a) >= usd(b.a) - 0.005);
  conf(ordenado, 'do maior para o menor');
  await f.selectOption('[data-gfn="ppu"]', '10'); await p.waitForTimeout(400);
  bp = await barras(f, 'ppu');
  conf(bp.length === 10 && /Mostrando os 10 maiores/.test(await f.innerText('[data-gfcard="ppu"] .nota')), '“Mostrar: 10 maiores” → 10 barras');
  // vertical: todas as barras com a mesma largura, alturas diferentes, e a base na mesma linha
  const svgOk = await f.$eval('[data-gfcard="ppu"] svg', s => { const r = [...s.querySelectorAll('.gf-b')].map(g => { const ps = [...g.querySelectorAll('path')].map(x => x.getBBox()); return {w: ps[0].width, base: Math.max(...ps.map(b => b.y + b.height)), h: ps.reduce((a, b) => a + b.height, 0)}; }); return r.length > 1 && r.every(b => Math.abs(b.w - r[0].w) < 0.5 && Math.abs(b.base - r[0].base) < 1) && new Set(r.map(b => Math.round(b.h))).size > 1; });
  conf(svgOk, 'barras na vertical');
  // escolher os itens: tirar o maior
  const prim = bp[0].k;
  await f.click('[data-gfcard="ppu"] .gf-sel-b');
  await f.waitForSelector('.gf-pop');
  const nTodos = await f.locator('.gf-pop .gf-it').count();
  await f.fill('.gf-pop .gf-q', String(prim.split('|')[1]));
  await p.waitForTimeout(200);
  const visiveis = await f.locator('.gf-pop .gf-it:visible').count();
  conf(visiveis >= 1 && visiveis < nTodos, '“Itens ▾”: lista com ' + nTodos + ' itens e busca (' + visiveis + ' com “' + prim.split('|')[1] + '”)');
  await f.locator('.gf-pop input[data-k="' + prim + '"]').uncheck();
  await p.waitForTimeout(400);
  bp = await barras(f, 'ppu');
  const btn = await f.innerText('[data-gfcard="ppu"] .gf-sel-b');
  conf(!bp.some(b => b.k === prim) && bp.length === 10 && new RegExp((nTodos - 1) + ' de ' + nTodos).test(btn), 'desmarcando o maior, ele sai do gráfico (fica “' + btn.trim() + '”) e entra o 11º', btn);
  conf(await f.locator('[data-gfcard="ct"] .gf-sel-b').innerText().then(t => /todos/.test(t)), 'a escolha vale só para aquele gráfico (os outros continuam com todos)');
  await f.click('[data-gfcard="ct"] h2'); // fora da janela de itens: fecha
  await p.waitForTimeout(300);
  conf(!(await f.locator('.gf-pop').count()), 'clicar fora fecha a lista de itens');
  await p.reload(); await p.waitForSelector('.eng2-card, .ec-ger-frame', {timeout: 90000});
  f = await frame(p);
  await f.selectOption('[data-f="ano"]', '2026').catch(() => {});
  await f.click('[data-tab="graficos"]'); await p.waitForTimeout(500);
  bp = await barras(f, 'ppu');
  conf(!bp.some(b => b.k === prim) && bp.length === 10, 'reabrindo o arquivo, a escolha (e o “10 maiores”) continua');
  await f.click('[data-gfcard="ppu"] .gf-sel-b'); await f.waitForSelector('.gf-pop');
  await f.click('.gf-pop [data-a="gfTodos"]'); await p.waitForTimeout(300);
  conf((await barras(f, 'ppu')).some(b => b.k === prim), '“Todos” volta a mostrar todos os itens');
  await f.click('.gf-pop [data-a="gfNenhum"]'); await p.waitForTimeout(300);
  conf(!(await barras(f, 'ppu')).length && /0 de/.test(await f.innerText('[data-gfcard="ppu"] .gf-sel-b')), '“Nenhum” tira todos (e o gráfico fica vazio)');
  await f.click('.gf-pop [data-a="gfTodos"]'); await f.click('.gf-pop [data-a="gfFechar"]'); await p.waitForTimeout(300);

  // contratos: receita = a da aba Por contrato; COGS no gráfico
  const bc = await barras(f, 'ct');
  const somaCt = bc.reduce((a, b) => a + usd(b.a), 0);
  conf(bc.length === 3 && perto(somaCt, kpiRec, 0.05) && bc.every(b => /COGS US\$/.test(b.a)), 'contratos: 3 barras (receita e COGS lado a lado); a soma das receitas é a do cartão', {n: bc.length, somaCt, kpiRec});
  const rot1 = await f.$eval('[data-gfcard="ct"] .gf-b', g => g.dataset.k);
  await f.click('[data-gfcard="ct"] .gf-b >> nth=0'); await p.waitForTimeout(500);
  conf(await f.inputValue('[data-f="contrato"]') === rot1 && valor(await f.textContent('.k-rec-usd b')) < kpiRec, 'clicar num contrato filtra a página por ele');
  await f.click('[data-gfcard="ct"] .gf-b >> nth=0'); await p.waitForTimeout(500);
  conf(await f.inputValue('[data-f="contrato"]') === '' && perto(valor(await f.textContent('.k-rec-usd b')), kpiRec), 'clicar de novo tira o filtro');
  // receita em risco: esperada = receita do cartão
  const br = await barras(f, 'risco');
  const esper = await f.$$eval('[data-gfcard="risco"] .gf-b', l => l.length);
  conf(br.length >= 1 && br.every(b => /em risco US\$/.test(b.a)), 'receita esperada × em risco: ' + esper + ' contrato(s)', br.map(b => b.a));
  // sondas: soma = receita do cartão
  const bs = await barras(f, 'sonda');
  conf(bs.length >= 2 && perto(bs.reduce((a, b) => a + usd(b.a), 0), kpiRec, 0.05), 'sondas: ' + bs.length + ' barras; a soma das receitas é a do cartão');
  // perto de acabar: confere com a conta independente (consumido + previsto com o risco) ÷ contratado
  const ref = await p.evaluate(() => {
    const pac = window.engGerDados().pacote, out = {};
    const fL = l => { const r = Number(l && l.risco) || 0; return r > 0 ? Math.max(0, 1 - Math.min(100, r) / 100) : 1; };
    pac.contratos.forEach(c => (c.itens || []).forEach(i => { if (i.contratado > 0) out[c.id + '|' + i.ref] = {c: i.contratado, u: 0}; }));
    pac.operacoes.forEach(o => {
      const fo = fL(o);
      if (o.realizado) (o.realizado.ppu || []).forEach(l => { const x = out[o.contratoId + '|' + l.ref]; if (x) x.u += l.qtd || 0; });
      else ((o.previsto || {}).ppu || []).forEach(l => { const x = out[o.contratoId + '|' + l.ref]; if (x) x.u += (l.qtd || 0) * fo * fL(l); });
    });
    return Object.keys(out).map(k => ({k, pct: out[k].u / out[k].c * 100})).sort((a, b) => b.pct - a.pct);
  });
  await f.selectOption('[data-gfn="acab"]', '0'); await p.waitForTimeout(400);
  const ba = await barras(f, 'acab');
  const pctA = ba.map(b => Number(String(b.a).match(/([\d.,]+)% do contratado/)[1].replace(/\./g, '').replace(',', '.')));
  const okA = ba.length === ref.length && ba.every((b, i) => b.k === ref[i].k || Math.abs(pctA[i] - ref[i].pct) < 0.01) && ba.every((b, i) => Math.abs(pctA[i] - ref.find(r => r.k === b.k).pct) < 0.01);
  conf(ref.length > 5 && okA, 'PPU perto de acabar: ' + ba.length + ' itens com saldo, % = (consumido + previsto) ÷ contratado, do maior para o menor', {ba: ba.slice(0, 3), ref: ref.slice(0, 3)});
  conf(ba.every((b, i) => b.al === (pctA[i] >= 90)) && await f.locator('[data-gfcard="acab"] .gf-ref').count() === 1, 'itens com 90% ou mais em vermelho; linha de 100% do contratado', ba.filter(b => b.al).length);
  // tooltip
  await f.hover('[data-gfcard="ppu"] .gf-b >> nth=0'); await p.waitForTimeout(200);
  const tip = await f.innerText('[data-gfcard="ppu"] .g-tip');
  conf(/receita realizada/.test(tip) && /receita prevista/.test(tip) && /receita total/.test(tip), 'passando o mouse: realizada, prevista e total', tip.slice(0, 160));

  console.log('\n4. Arquivo sem saldo nos itens: o gráfico explica como preencher');
  await p.evaluate(() => { const d = loadDB(); d.contratos.forEach(c => (c.items || []).forEach(i => { i.saldoIni = ''; })); saveDB(d); });
  await p.reload(); await p.waitForSelector('.eng-tools', {timeout: 90000});
  f = await frame(p);
  await f.click('[data-tab="graficos"]'); await p.waitForTimeout(500);
  conf(/preencha o saldo contratado/.test(await f.innerText('[data-gfcard="acab"]')), 'sem saldo: “preencha o saldo contratado de cada item (Contratos → itens PPU, coluna Saldo)”');

  conf(!E.errs.length, 'nenhum erro de JavaScript', E.errs.slice(0, 3));
  await E.browser.close();
  console.log('\n' + ok + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
