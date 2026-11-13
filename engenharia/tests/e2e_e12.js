// EARL Engenharia e12: câmbio sempre com o mês mais recente em cima, banco de casing equipment (como o de químicos,
// atualizado pela mesma planilha com as abas de químicos e de casing) e filtro + ordem crescente/decrescente em todas
// as tabelas.
// Uso: node tests/e2e_e12.js [EARL_Engenharia.html] [pasta das telas]
const {abrir} = require('./harness');
const fs = require('fs');
const path = require('path');
const ARQ = process.argv[2] || path.join(__dirname, '..', 'EARL_Engenharia.html');
const SHOTS = process.argv[3] || '';
if (SHOTS) fs.mkdirSync(SHOTS, {recursive: true});
let ok = 0, falhas = 0;
const conf = (cond, msg, extra) => {
  if (cond) { ok++; console.log('  ✓ ' + msg); } else { falhas++; console.log('  ✗ ' + msg + (extra !== undefined ? ' → ' + JSON.stringify(extra).slice(0, 500) : '')); }
};
const foto = async (page, nome) => { if (SHOTS) await page.screenshot({path: path.join(SHOTS, nome + '.png')}); };
const num = s => Number(String(s).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
const cmpPt = (a, b) => String(a).localeCompare(String(b), 'pt', {numeric: true, sensitivity: 'base'});
const CT = 'ct_5900_0127108_24';
const RIG = 'hg_rig_11_norbeviii';
const VIS = ' tbody tr:not([data-etfh])';

(async () => {
  const {browser, page, errs} = await abrir(ARQ, {h: 1000, hoje: '2026-11-13'});
  await page.waitForSelector('.eng2-card', {timeout: 60000});
  conf(/e12/.test(await page.evaluate(() => EARL_VERSION)), 'versão e12', await page.evaluate(() => EARL_VERSION));

  /* ------------------------------------------------------------------ dados de teste */
  console.log('Dados de teste: casing em Custos (COGS) como antes do e12 e 3 operações com casing');
  const D = await page.evaluate(({CT, RIG}) => {
    const d = loadDB();
    const c0 = d.casingEquip[0];
    delete d.casDbV1;
    d.casingEquip.forEach(c => { delete c.usd; delete c.id; delete c.atualizadoEm; });
    const q0 = d.quimicos[0];
    d.cogsItens = [
      {id: 'cg1', sap: c0.sap, nome: c0.name, unid: 'EA', usd: 50, brl: null, atualizadoEm: '2026-11-01T12:00:00.000Z'},
      {id: 'cg2', sap: '999000111', nome: 'CASING NOVO TESTE E12', unid: 'EA', usd: 20, brl: null, atualizadoEm: '2026-11-01T12:00:00.000Z'},
      {id: 'cg3', sap: 'AJ-CE+', nome: 'Ajuste de COGS de casing (+)', unid: 'US$', usd: 1, brl: null},
      {id: 'cg4', sap: '888777666', nome: 'Material em R$', unid: 'EA', brl: 10},
      {id: 'cg5', sap: q0.sap, nome: q0.nome, unid: q0.unid, usd: 3, brl: null}
    ];
    const ct = d.contratos.find(c => c.id === CT);
    const ag = new Date().toISOString();
    const base = {loc: 'macae', clienteName: 'Petrobras', contratoLabel: ct.numero, contratoId: CT, rigId: RIG, casing: '', tipoOutro: '', durationDays: 1, salesOrder: '', wbs: '', vida: '', anchor: 'chain', templateId: '', notes: '', equipNeeds: [], chems: [], casingNeeds: [], peopleNeeds: [], ppuNeeds: [], status: PJ_STATUS.PLAN, createdAt: ag, updatedAt: ag, contingencia: false, riscoRec: 0, risco: null, tipoOp: 'LWO'};
    d.plannedJobs = [
      {...base, id: 'e12A', well: 'A-1', date: '2026-12-01', baselineDate: '2026-12-01', casingNeeds: [{sap: c0.sap, name: c0.name, unit: 'EA', qty: 3}, {sap: '999000111', name: 'CASING NOVO TESTE E12', unit: 'EA', qty: 2}]},
      {...base, id: 'e12B', well: 'B-2', date: '2026-11-20', baselineDate: '2026-11-20'},
      {...base, id: 'e12C', well: 'C-3', date: '2027-01-10', baselineDate: '2027-01-10'}
    ];
    d.cambio = [];
    saveDB(d);
    return {sap: c0.sap, nome: c0.name, nCas: d.casingEquip.length, q0: q0.sap, nQuim: d.quimicos.length};
  }, {CT, RIG});
  await page.reload();
  await page.waitForSelector('.eng2-card');
  await page.waitForFunction(() => typeof window.engGerDados === 'function');

  /* ------------------------------------------------------------------ migração e COGS */
  console.log('Banco de casing equipment: migração dos Custos (COGS) e COGS das operações');
  const M = await page.evaluate(sap => {
    const d = loadDB();
    const c = d.casingEquip.find(x => x.sap === sap), n = d.casingEquip.find(x => x.sap === '999000111');
    return {c, n, ids: d.casingEquip.every(x => !x.sap || x.id === 'ce_' + x.sap), cogs: (d.cogsItens || []).map(x => x.id), hist: (d.casHist || []).slice(-1)[0], n0: d.casingEquip.length, v: !!d.casDbV1};
  }, D.sap);
  conf(M.c && M.c.usd === 50 && M.c.name === D.nome && M.ids, 'item de casing do catálogo ganha o valor US$ 50 que estava em Custos (COGS) e o id ce_<SAP>', M.c);
  conf(M.n && M.n.usd === 20 && M.n.origem === 'Custos (COGS)' && M.n0 === D.nCas + 1, 'casing que só estava em Custos entra no banco de casing (e passa a aparecer para escolher nas operações)', M.n);
  conf(M.cogs.join() === 'cg3,cg4,cg5', 'em Custos ficam só o ajuste AJ-, o material em R$ e o químico', M.cogs);
  conf(M.hist && M.hist.origem === 'custos' && M.hist.novos === 1 && M.hist.alterados === 1 && M.v, 'histórico do banco de casing registra a migração (1 novo, 1 com valor)', M.hist);
  const pac = await page.evaluate(() => { const p = window.engGerDados().pacote; return Object.fromEntries(p.operacoes.map(o => [o.id, o])); });
  conf(pac.e12A && Math.abs(pac.e12A.previsto.cogs.usd - (3 * 50 + 2 * 20)) < 0.01, 'COGS da operação = 3 × US$ 50 + 2 × US$ 20 = US$ 190 (valores do banco de casing)', pac.e12A && pac.e12A.previsto.cogs);

  /* ------------------------------------------------------------------ banco de casing: tela */
  console.log('Banco de casing equipment: tela e planilha com as abas de químicos e de casing');
  const bot = await page.$$eval('.eng-tools button', l => l.map(b => b.textContent.trim()));
  conf(bot.indexOf('Casing') === bot.indexOf('Químicos') + 1, 'botão “Casing” na barra, ao lado de “Químicos”', bot);
  await page.click('.eng-tools .eng-casing');
  await page.waitForSelector('.ec-casdb-tab');
  conf(/Banco de casing equipment/.test(await page.innerText('.ec-casdb-modal .modal-title')) && (await page.innerText('.ec-casdb-info')).startsWith((D.nCas + 1) + ' item(ns)'), 'janela “Banco de casing equipment” com ' + (D.nCas + 1) + ' item(ns)', await page.innerText('.ec-casdb-info'));
  conf(await page.locator('.ec-casdb-tab tbody tr').count() === D.nCas + 1 && await page.inputValue('.ec-casdb-tab tr[data-sap="' + D.sap + '"] input.ec-q-usd') === '50', 'tabela: SAP, descrição, unidade e valor (US$ 50 no item migrado)');
  conf(/Vindos de Custos/.test(await page.innerText('.ec-casdb-info')), 'última atualização: “Vindos de Custos (COGS)”', await page.innerText('.ec-casdb-info'));
  // a planilha do responsável: uma aba de químicos e outra de casing equipment
  const b64 = await page.evaluate(({sap, q0}) => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['SAP', 'Descrição', 'Unidade', 'Valor US$'], [Number(q0), 'QUIMICO DA PLANILHA E12', 'GAL', 7.25], [777111222, 'QUIMICO NOVO E12', 'LB', 1.5]]), 'Químicos');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['SAP', 'Descrição', 'Unidade', 'Valor US$'], [Number(sap), 'CASING DA PLANILHA E12', 'EA', 55], [555444333, 'CASING NOVO PLANILHA E12', 'EA', 80.5]]), 'Casing Equipment');
    return XLSX.write(wb, {type: 'base64', bookType: 'xlsx'});
  }, {sap: D.sap, q0: D.q0});
  const arq = {name: 'Bancos_EARL.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(b64, 'base64')};
  let fc = page.waitForEvent('filechooser');
  await page.click('.ec-casdb-carregar');
  await (await fc).setFiles(arq);
  await page.waitForSelector('.ec-casdb-plan');
  const pl = await page.innerText('.ec-casdb-plan .hm-sum');
  conf(/aba “Casing Equipment”/.test(pl) && /2 item\(ns\) lido/.test(pl), 'lê a aba “Casing Equipment” da planilha (2 itens)', pl);
  const chips = await page.$$eval('.ec-casdb-plan .ec-qp-chip', l => l.map(x => x.innerText.replace(/\s+/g, ' ')));
  conf(/^1 novo/.test(chips[0]) && /^1 com valor/.test(chips[1]), 'conferência: 1 novo e 1 com valor alterado', chips);
  await foto(page, 'e12_1_casing_planilha');
  await page.click('.ec-casdb-plan .ec-qp-aplicar');
  await page.waitForSelector('.ec-casdb-plan', {state: 'detached'});
  const C2 = await page.evaluate(sap => { const d = loadDB(); return {c: d.casingEquip.find(x => x.sap === sap), n: d.casingEquip.find(x => x.sap === '555444333'), t: d.casingEquip.length, h: (d.casHist || []).slice(-1)[0]}; }, D.sap);
  conf(C2.c.usd === 55 && C2.c.name === 'CASING DA PLANILHA E12' && C2.n && C2.n.usd === 80.5 && C2.n.unit === 'EA' && C2.t === D.nCas + 2, 'aplicar: valor e descrição atualizados, item novo no banco (salvo)', C2);
  conf(C2.h && C2.h.origem === 'planilha' && C2.h.arquivo === 'Bancos_EARL.xlsx', 'histórico: planilha Bancos_EARL.xlsx', C2.h);
  await page.click('.ec-casdb-modal .modal-close');
  // químicos: a mesma planilha, a aba de químicos
  await page.click('.eng-tools .eng-quimicos');
  await page.waitForSelector('.ec-quim-tab');
  fc = page.waitForEvent('filechooser');
  await page.click('.ec-quim-carregar');
  await (await fc).setFiles(arq);
  await page.waitForSelector('.ec-quim-plan');
  const pq = await page.innerText('.ec-quim-plan .hm-sum');
  conf(/aba “Químicos”/.test(pq) && /2 produto\(s\) lido/.test(pq), 'banco de químicos: lê a aba “Químicos” da mesma planilha', pq);
  await page.click('.ec-quim-plan .ec-qp-aplicar');
  await page.waitForSelector('.ec-quim-plan', {state: 'detached'});
  const Q2 = await page.evaluate(q0 => { const d = loadDB(); return {q: d.quimicos.find(x => x.sap === q0), t: d.quimicos.length}; }, D.q0);
  conf(Q2.q.usd === 7.25 && Q2.t === D.nQuim + 1, 'químicos atualizados pela aba de químicos (valor 7,25 e 1 novo)', Q2);
  await page.click('.ec-quim-modal .modal-close');
  // o casing do banco aparece para escolher nas operações
  // o banco de casing é o próprio catálogo de casing do EARL (db.casingEquip), que as operações usam para escolher o casing
  const casCat = await page.evaluate(() => loadDB().casingEquip.map(c => c.sap + '|' + c.name + '|' + c.unit));
  conf(casCat.includes('555444333|CASING NOVO PLANILHA E12|EA') && casCat.includes('999000111|CASING NOVO TESTE E12|EA'), 'itens novos do banco de casing ficam no catálogo de casing das operações (SAP, nome e unidade)');

  /* ------------------------------------------------------------------ câmbio */
  console.log('Câmbio: o mês mais recente sempre em cima');
  await page.click('.eng-tools .eng-cambio');
  await page.waitForSelector('.ec-cb-tab');
  const meses = () => page.$$eval('.ec-cb-tab tbody tr', l => l.map(r => r.querySelector('.ec-cb-ano').value + '-' + String(r.querySelector('.ec-cb-mes').value).padStart(2, '0')));
  conf((await meses()).join() === '2026-11', 'sem cotação: começa com o mês de hoje', await meses());
  await page.click('.ec-cb-mais');
  await page.click('.ec-cb-mais');
  conf((await meses()).join() === '2027-01,2026-12,2026-11', '“＋ Mês” entra em cima (ordem decrescente)', await meses());
  // muda o mês da linha de baixo para março/2027: ela sobe para o topo
  await page.selectOption('.ec-cb-tab tbody tr:last-child .ec-cb-mes', '3');
  conf((await meses()).join() === '2027-01,2026-12,2026-03', 'mudar o mês para março/2026: continua embaixo (mais antigo)', await meses());
  await page.selectOption('.ec-cb-tab tbody tr:last-child .ec-cb-ano', '2027');
  conf((await meses()).join() === '2027-03,2027-01,2026-12', 'mudar ano/mês reordena: sempre decrescente', await meses());
  const vals = ['5,61', '5,55', '5,40'];
  for (let i = 0; i < 3; i++) await page.fill('.ec-cb-tab tbody tr:nth-child(' + (i + 1) + ') .ec-cb-valor', vals[i]);
  conf(await page.locator('.ec-cb-tab th .etf-b').count() === 3, 'tabela do câmbio também tem filtro e ordem (Ano, Mês, R$)');
  await foto(page, 'e12_2_cambio');
  await page.click('.ec-cb-salvar');
  await page.waitForSelector('.ec-cb-tab', {state: 'detached'});
  await page.click('.eng-tools .eng-cambio');
  await page.waitForSelector('.ec-cb-tab');
  conf((await meses()).join() === '2027-03,2027-01,2026-12' && await page.inputValue('.ec-cb-tab tbody tr:first-child .ec-cb-valor') === '5,61', 'salvo e aberto de novo: mar/2027 (5,61) em cima', await meses());
  await page.click('.ec-cb-modal .modal-close');

  /* ------------------------------------------------------------------ filtro e ordem: Sondas */
  console.log('Filtro e ordem nas tabelas: Sondas');
  await page.click('.eng-tools button:has-text("Sondas")');
  const TS = '.modal table.db-table';
  await page.waitForSelector(TS + ' th .etf-b');
  const ths = await page.$$eval(TS + ' thead th', l => l.map(x => x.textContent.trim()));
  conf(ths[0] === 'Nome Petrobras' && ths[1] === 'Nome da sonda' && !ths.join('').includes('▾'), 'títulos continuam com o mesmo texto (os ícones não entram no texto)', ths);
  const nb = await page.$$eval(TS + ' thead th', l => l.map(x => !!x.querySelector('.etf-b')));
  conf(nb.slice(0, 9).every(Boolean) && !nb[9], 'filtro (▾) em todas as colunas com título; a coluna dos botões fica sem', nb);
  const col = (t, i) => page.$$eval(t + VIS, (l, i) => l.map(r => r.cells[i].innerText.replace(/\s+/g, ' ').trim()), i);
  const orig = await col(TS, 1);
  await page.click(TS + ' thead th:nth-child(2)');
  let v = await col(TS, 1);
  conf(v.join('|') === orig.slice().sort(cmpPt).join('|') && await page.locator(TS + ' th:nth-child(2).etf-asc').count() === 1, 'clique no título: ordem crescente (▲)', v.slice(0, 4));
  await page.click(TS + ' thead th:nth-child(2)');
  v = await col(TS, 1);
  conf(v.join('|') === orig.slice().sort(cmpPt).reverse().join('|') && await page.locator(TS + ' th:nth-child(2).etf-desc').count() === 1, 'de novo: decrescente (▼)', v.slice(0, 4));
  // ▾ numa coluna com vários valores (Rig manager, Rig type…)
  const todas = await page.$$eval(TS + VIS, l => l.map(r => [...r.cells].map(c => c.innerText.replace(/\s+/g, ' ').trim())));
  const CF = [2, 3, 4, 5, 6, 7].map(i => ({i, n: new Set(todas.map(r => r[i])).size})).filter(x => x.n >= 2 && x.n <= 15).sort((a, b) => b.n - a.n)[0].i;
  const CF2 = [8, 7, 6, 5, 4, 3, 2].find(i => i !== CF);
  await page.click(TS + ' thead th:nth-child(' + (CF + 1) + ') .etf-b');
  await page.waitForSelector('#etfPop');
  const itens = await page.$$eval('#etfPop .etf-it', l => l.map(x => ({v: x.querySelector('.etf-v').textContent, n: Number(x.querySelector('em').textContent)})));
  const bases = await col(TS, CF);
  conf(itens.length > 1 && itens.reduce((a, x) => a + x.n, 0) === bases.length && itens.every(x => bases.filter(b => b === x.v).length === x.n), '▾ lista os valores da coluna com quantas linhas tem cada um', itens);
  await page.fill('#etfPop .etf-q', itens[1].v.slice(0, 4));
  const visPop = await page.$$eval('#etfPop .etf-it', l => l.filter(x => x.style.display !== 'none').length);
  conf(visPop >= 1 && visPop < itens.length, 'busca no painel', visPop);
  await page.keyboard.press('Escape');
  conf(await page.locator('#etfPop').count() === 0 && await page.locator('.modal table.db-table').count() === 1, 'Esc fecha só o painel (a janela continua aberta)');
  await page.click(TS + ' thead th:nth-child(' + (CF + 1) + ') .etf-b');
  await page.click('#etfPop .etf-it:nth-child(2) .etf-so');
  v = await col(TS, CF);
  conf(v.length === itens[1].n && v.every(x => x === itens[1].v), '“só este”: só as sondas com “' + itens[1].v + '”', v.length);
  conf(/Mostrando \d+ de \d+ linha/.test(await page.innerText(TS + ' caption')) && await page.locator(TS + ' th:nth-child(' + (CF + 1) + ') .etf-b.etf-on').count() === 1, 'aviso “Mostrando X de Y linha(s)” e ▾ em vermelho', await page.innerText(TS + ' caption'));
  // a lista de outra coluna mostra só o que sobrou
  await page.click(TS + ' thead th:nth-child(' + (CF2 + 1) + ') .etf-b');
  const it2 = await page.$$eval('#etfPop .etf-it', l => l.map(x => Number(x.querySelector('em').textContent)));
  conf(it2.reduce((a, n) => a + n, 0) === itens[1].n, 'a lista de outra coluna mostra só as linhas que sobraram', it2);
  await page.click('#etfPop [data-a="cancelar"]');
  await foto(page, 'e12_3_sondas_filtro');
  await page.click(TS + ' .etf-clr');
  v = await col(TS, 1);
  conf(v.join('|') === orig.join('|') && await page.locator(TS + ' caption').count() === 0, '“Limpar filtro e ordem”: todas as linhas, na ordem do app', v.length);
  // painel: Aplicar desligado sem nada marcado; clique fora fecha
  await page.click(TS + ' thead th:nth-child(' + (CF + 1) + ') .etf-b');
  await page.click('#etfPop .etf-all input');
  conf(await page.locator('#etfPop [data-a="ok"]').isDisabled(), 'Aplicar desligado sem nada marcado');
  await page.mouse.click(5, 5);
  conf(await page.locator('#etfPop').count() === 0, 'clique fora fecha o painel');
  await page.click('.modal .modal-close');

  /* ------------------------------------------------------------------ filtro e ordem: Químicos (tabela de edição) */
  console.log('Filtro e ordem numa tabela de edição: banco de químicos');
  await page.click('.eng-tools .eng-quimicos');
  const TQ = '.ec-quim-tab';
  await page.waitForSelector(TQ + ' th .etf-b');
  const usd = () => page.$$eval(TQ + VIS + ' input.ec-q-usd', l => l.map(i => Number(i.value.replace(/\./g, '').replace(',', '.'))));
  await page.click(TQ + ' thead th:nth-child(4) .etf-b');
  await page.click('#etfPop [data-o="-1"]');
  let u = (await usd()).filter(x => !isNaN(x) && x !== 0);
  conf(u.length > 10 && u.every((x, i) => i === 0 || x <= u[i - 1]), '↓ Decrescente pelo Valor US$ (lê o valor dos campos)', u.slice(0, 5));
  const nTot = await page.locator(TQ + ' tbody tr').count();
  await page.click(TQ + ' thead th:nth-child(3) .etf-b');
  const un = await page.$$eval('#etfPop .etf-it', l => l.map(x => ({v: x.querySelector('.etf-v').textContent, n: Number(x.querySelector('em').textContent)})));
  const gal = un.find(x => x.v === 'GAL') || un[0];
  await page.click('#etfPop .etf-it:nth-child(' + (un.indexOf(gal) + 1) + ') .etf-so');
  let unVis = await page.$$eval(TQ + VIS + ' input.ec-q-unid', l => l.map(i => i.value));
  conf(unVis.length === gal.n && unVis.every(x => x === gal.v), 'filtro “Unid.” = ' + gal.v + ' (' + gal.n + ' produtos)', unVis.length);
  // linha nova (＋ Produto) com o filtro ligado continua visível
  await page.click('.ec-quim-novo');
  const novaVis = await page.$$eval(TQ + VIS, l => l.filter(r => !r.querySelector('input.ec-q-sap').value).length);
  conf(novaVis === 1 && await page.locator(TQ + VIS).count() === gal.n + 1, 'linha nova (＋ Produto) aparece mesmo com o filtro ligado', novaVis);
  const nova = TQ + VIS + ':has(input.ec-q-sap[value=""])';
  await page.fill(TQ + VIS + ' >> nth=' + (await page.$$eval(TQ + VIS, l => l.findIndex(r => !r.querySelector('input.ec-q-sap').value))) + ' >> input.ec-q-sap', '123123123');
  const linhaNova = page.locator(TQ + ' tbody tr', {has: page.locator('input.ec-q-sap[value="123123123"]')});
  await linhaNova.locator('input.ec-q-nome').fill('PRODUTO TESTE E12');
  await linhaNova.locator('input.ec-q-unid').fill('GAL');
  await linhaNova.locator('input.ec-q-usd').fill('9,5');
  // editar um valor com a ordem ligada não tira a linha do lugar e não dá erro
  const prim = await page.$eval(TQ + VIS + ' input.ec-q-sap', i => i.value);
  await page.fill(TQ + VIS + ' >> nth=0 >> input.ec-q-usd', '12345');
  conf(await page.$eval(TQ + VIS + ' input.ec-q-sap', i => i.value) === prim, 'editar o valor de uma linha não muda a linha de lugar enquanto digita');
  await page.click('.ec-quim-salvar');
  await page.waitForTimeout(300);
  const Q3 = await page.evaluate(() => { const d = loadDB(); return {t: d.quimicos.length, n: d.quimicos.find(q => q.sap === '123123123')}; });
  conf(Q3.t === D.nQuim + 2 && Q3.n && Q3.n.usd === 9.5, 'salvar com filtro e ordem ligados grava tudo (inclusive as linhas escondidas)', Q3);
  unVis = await page.$$eval(TQ + VIS + ' input.ec-q-unid', l => l.map(i => i.value));
  conf(unVis.length === gal.n + 1 && unVis.every(x => x === gal.v), 'depois de salvar (tabela redesenhada) o filtro continua valendo', unVis.length);
  u = (await usd()).filter(x => !isNaN(x));
  conf(u.every((x, i) => i === 0 || x <= u[i - 1]), '… e a ordem também', u.slice(0, 5));
  // tirar uma linha com a ordem ligada
  const antes = await page.locator(TQ + ' tbody tr').count();
  await page.click(TQ + VIS + ' >> nth=0 >> button.hm-x');
  conf(await page.locator(TQ + ' tbody tr').count() === antes - 1, 'tirar uma linha (×) com filtro e ordem ligados', [antes, await page.locator(TQ + ' tbody tr').count()]);
  await foto(page, 'e12_4_quimicos_filtro');
  await page.click(TQ + ' .etf-clr');
  conf(await page.locator(TQ + VIS).count() === antes - 1 && nTot + 1 === antes, 'limpar: todas as linhas de novo', [await page.locator(TQ + VIS).count(), antes - 1]);
  await page.click('.ec-quim-modal .modal-close');
  await page.click('button:text-is("Fechar sem salvar")'); // a linha tirada (×) não foi salva
  await page.waitForSelector('.ec-quim-modal', {state: 'detached'});

  /* ------------------------------------------------------------------ filtro e ordem: Contratos e Lista */
  console.log('Filtro e ordem: Contratos e Lista de operações');
  await page.click('.eng-tools button:has-text("Contratos")');
  await page.waitForSelector('.ec-lista th .etf-b');
  const ci = (await page.$$eval('.ec-lista thead th', l => l.map(x => x.textContent.trim()))).indexOf('Linhas PPU');
  await page.click('.ec-lista thead th:nth-child(' + (ci + 1) + ') .etf-b');
  await page.click('#etfPop [data-o="-1"]');
  const lp = await page.$$eval('.ec-lista' + VIS, (l, i) => l.map(r => Number(r.cells[i].innerText.replace(/\D/g, ''))), ci);
  conf(lp.length > 5 && lp.every((x, i) => i === 0 || x <= lp[i - 1]), 'Contratos: “Linhas PPU” em ordem decrescente (números)', lp.slice(0, 6));
  await page.click('.ec-modal .modal-close');
  await page.click('.eng2-card:has-text("P&A")');
  await page.click('.db-tab:has-text("Lista")');
  await page.click('.eng-lista-todas');
  const TL = 'table.db-table';
  await page.waitForSelector(TL + ' th .etf-b');
  const poco = () => page.$$eval(TL + VIS, l => l.map(r => r.cells[2].innerText.trim()));
  await page.click(TL + ' thead th:nth-child(3)');
  conf((await poco()).join() === 'A-1,B-2,C-3', 'Lista: Poço em ordem crescente', await poco());
  await page.click(TL + ' thead th:nth-child(1) .etf-b');
  await page.click('#etfPop [data-o="-1"]');
  conf((await poco()).join() === 'C-3,A-1,B-2', 'Lista: Data decrescente (10/01/2027, 01/12/2026, 20/11/2026)', await poco());
  await foto(page, 'e12_5_lista');

  /* ------------------------------------------------------------------ celular e erros */
  console.log('Celular');
  await page.setViewportSize({width: 390, height: 844});
  await page.click(TL + ' thead th:nth-child(2) .etf-b');
  const box = await page.$eval('#etfPop', p => { const r = p.getBoundingClientRect(); return {l: r.left, r: r.right, w: document.documentElement.clientWidth}; });
  conf(box.l >= 0 && box.r <= box.w, 'painel do filtro cabe na tela do celular', box);
  await page.keyboard.press('Escape');
  conf(errs.length === 0, 'nenhum erro de JavaScript', errs.slice(0, 3));
  console.log('\n' + ok + ' ok, ' + falhas + ' falha(s)');
  await browser.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
