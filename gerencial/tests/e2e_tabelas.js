// Teste da ordem (crescente/decrescente) e da seleção de itens (▾, como o filtro do Excel) nas tabelas das abas
// Contratos, Itens PPU, Químicas, Casing equipment, Pessoal, Operações e Arquivos do EARL Gerencial (g11).
// Ordena TODAS as colunas de TODAS as tabelas nos dois sentidos e confere a ordem (vazios sempre no fim); depois confere
// "só este", marcar/desmarcar, buscar, (Selecionar tudo), cancelar, Esc, clique fora, seleção em duas colunas, rótulos
// múltiplos (Contratos), meses na Data, o total só das linhas visíveis, limpar, e que a escolha fica ao trocar de aba.
// Uso: node gerencial/tests/e2e_tabelas.js [EARL_Gerencial.html] [pasta das telas]
const {abrir} = require('../../engenharia/tests/harness');
const fs = require('fs');
const path = require('path');
const GER = process.argv[2] || path.join(__dirname, '..', 'EARL_Gerencial.html');
const SHOTS = process.argv[3] || '';
let ok = 0, falhas = 0;
const conf = (cond, msg, extra) => {
  if (cond) { ok++; console.log('  ✓ ' + msg); } else { falhas++; console.log('  ✗ ' + msg + (extra !== undefined ? ' → ' + JSON.stringify(extra).slice(0, 700) : '')); }
};
if (SHOTS) fs.mkdirSync(SHOTS, {recursive: true});
const foto = async (page, nome) => { if (SHOTS) await page.screenshot({path: path.join(SHOTS, nome + '.png'), fullPage: false}); };

/* ---------- dados: 3 contratos com itens PPU, químicas, casing e pessoal ---------- */
const ct = (id, nome, cliente, regiao, itens) => ({id, nome, numero: id.toUpperCase(), cliente, tipo: 'Serviços', bases: 1, regiao, inicio: '2026-01-01', atualizadoEm: '2026-11-01T12:00:00.000Z',
  itens: itens.map(([ref, desc, unit, contratado, usd]) => ({ref, desc, unit, contratado, usd, brl: usd * 5.4, usdIni: usd, brlIni: usd * 5.4})), reajustes: []});
const C1 = ct('c1', 'Contrato Alfa', 'Petrobras', 'Sudeste', [['1.1', 'Taxa de cimentação', 'dia', 100, 280], ['1.2', 'Mobilização', 'op', 10, 5000], ['2.1', 'Teste de pressão', 'op', 20, 600], ['3.1', 'Cimento classe G', 'sk', 5000, 12.5]]);
const C2 = ct('c2', 'Contrato Beta', 'Shell', 'Sudeste', [['1.1', 'Taxa de cimentação', 'dia', 50, 300], ['2.1', 'Teste de pressão', 'op', 10, 650]]);
const C3 = ct('c3', 'Contrato Gama', 'Equinor', 'Nordeste', [['1.1', 'Taxa de cimentação', 'dia', 30, 310], ['10.2', 'Aluguel de cabeça', 'dia', 40, 120]]);
const Q = {h344: ['100003837', 'HALAD-344', 'lb', 4.2], cfr: ['100012205', 'CFR-3', 'lb', 6.1], gas: ['101234567', 'GASSTOP', 'gal', 18], tun: ['102161679', 'TUNED SPACER', 'bbl', 95]};
const K = {flt: ['200001', 'Float collar 9 5/8"', 'un', 1500], shoe: ['200002', 'Float shoe 9 5/8"', 'un', 1300], cen: ['200003', 'Centralizador', 'un', 85]};
let seq = 0;
const op = (c, data, sonda, poco, tipo, ppu, quim, cas, pes, extra = {}) => {
  const it = r => c.itens.find(i => i.ref === r);
  const lPpu = ppu.map(([ref, qtd]) => ({ref, desc: it(ref).desc, unit: it(ref).unit, qtd, usd: it(ref).usd, brl: it(ref).brl, valorUsd: qtd * it(ref).usd, valorBrl: qtd * it(ref).brl}));
  const lQ = quim.map(([k, qtd]) => ({sap: Q[k][0], nome: Q[k][1], unid: Q[k][2], qtd, cogsUsd: Q[k][3], cogsBrl: null}));
  const lC = cas.map(([k, qtd]) => ({sap: K[k][0], nome: K[k][1], unid: K[k][2], qtd, cogsUsd: K[k][3], cogsBrl: null}));
  const lP = pes.map(([funcao, pessoas, dias]) => ({funcao, pessoas, dias, hd: pessoas * dias}));
  const rec = {usd: lPpu.reduce((a, l) => a + l.valorUsd, 0), brl: lPpu.reduce((a, l) => a + l.valorBrl, 0), semValor: 0};
  const cogs = {usd: lQ.concat(lC).reduce((a, l) => a + l.qtd * l.cogsUsd, 0), brl: 0, semCogs: 0};
  const o = {id: 'op' + (++seq), contratoId: c.id, sonda, base: 'Macaé', ambiente: 'offshore', regiao: c.regiao, poco, tipo, revestimento: extra.rev || '', data, duracao: 1, status: extra.status || 'planejada', so: extra.so || '', wbs: '', vida: '', contingencia: false, chanceConting: null, risco: extra.risco || 0, handover: null,
    previsto: {ppu: lPpu, receita: rec, cogs, quimicas: lQ, casing: lC, pessoal: lP, equipamentos: []}, realizado: null, receita: null};
  if (extra.real) { o.status = 'consumo'; o.realizado = {data: extra.real, em: '2026-11-01T12:00:00.000Z', por: 'Eng', ppu: lPpu, quimicas: lQ, casing: lC, cogs, pessoal: lP}; o.receita = rec; }
  return o;
};
const opsA = [
  op(C1, '2026-01-12', 'NS-38', '7-BUZ-10', 'Squeeze', [['1.1', 3], ['2.1', 2], ['3.1', 400]], [['h344', 300], ['cfr', 120]], [['flt', 1], ['shoe', 1]], [['Supervisor', 2, 3], ['Operador', 3, 3]], {real: '2026-01-13', so: '911000101', rev: '9 5/8"'}),
  op(C1, '2026-02-20', 'NS-38', '7-BUZ-11', 'Tampão', [['1.1', 2], ['1.2', 1]], [['gas', 40]], [], [['Supervisor', 1, 2]], {so: '911000102'}),
  op(C1, '2026-04-03', 'NS-39', '7-MRO-2', 'Revestimento', [['1.1', 4], ['3.1', 800], ['2.1', 1]], [['h344', 500], ['tun', 60]], [['cen', 12], ['flt', 1]], [['Supervisor', 2, 4], ['Operador', 4, 4], ['Engenheiro', 1, 4]], {risco: 50}),
  op(C1, '2026-07-15', 'NS-39', '7-MRO-3', 'Squeeze', [['1.1', 1]], [], [], [['Operador', 2, 1]], {risco: 100}),
];
const opsB = [
  op(C2, '2026-03-08', 'SS-75', '3-RJS-1', 'Revestimento', [['1.1', 5], ['2.1', 3]], [['cfr', 200], ['gas', 25]], [['shoe', 1], ['cen', 20]], [['Supervisor', 2, 5], ['Operador', 4, 5]], {real: '2026-03-09', so: '922000201'}),
  op(C2, '2026-05-30', 'SS-75', '3-RJS-2', 'Tampão', [['1.1', 2]], [['tun', 30]], [], [['Operador', 2, 2]], {status: 'handover'}),
  op(C3, '2026-06-18', 'NS-58', '9-EQ-1', 'Squeeze', [['1.1', 2], ['10.2', 6]], [['h344', 150]], [], [['Supervisor', 1, 2], ['Engenheiro', 1, 2]]),
  op(C3, '2026-09-02', 'NS-58', '9-EQ-2', 'Revestimento', [['1.1', 3], ['10.2', 10]], [['cfr', 80], ['h344', 90]], [['flt', 1], ['cen', 8]], [['Supervisor', 2, 3], ['Operador', 3, 3]], {real: '2026-09-04', so: '933000301', rev: '7"'}),
];
const pacA = {tipo: 'EARL-Gerencial', formato: 2, app: 'teste', geradoEm: '2026-11-03T10:00:00.000Z', por: 'Eng. Ana', contratos: [C1], operacoes: opsA};
const pacB = {tipo: 'EARL-Gerencial', formato: 2, app: 'teste', geradoEm: '2026-11-04T10:00:00.000Z', por: 'Eng. Bruno', contratos: [C2, C3], operacoes: opsB};

/* ---------- leitura e conferência ---------- */
const lerTab = (page, cls) => page.evaluate(cls => {
  const t = document.querySelector('table.' + cls);
  const ths = [...t.querySelectorAll('thead th')].map(th => ({t: (th.querySelector('.tf-s,.tf-t') || th).textContent.replace(/[⇅▲▼]/g, '').trim(), n: th.classList.contains('n'), sort: !!th.querySelector('.tf-s'), filt: !!th.querySelector('.tf-b')}));
  const rows = [...t.querySelectorAll('tbody tr')].filter(tr => !tr.querySelector('td.vazio')).map(tr => [...tr.children].map(td => td.innerText.split('\n')[0].trim()));
  return {ths, rows, ft: [...t.querySelectorAll('tfoot td')].map(td => td.innerText.split('\n')[0].trim())};
}, cls);
const num = s => { if (s == null || s === '—' || s === '') return null; const m = String(s).replace(/[^\d,.\-−]/g, '').replace(/\./g, '').replace(',', '.').replace('−', '-'); return m === '' || m === '-' ? null : Number(m); };
const dataIso = s => { const m = /^(\d{2})\/(\d{2})\/(\d{4})(?: (\d{2}:\d{2}))?/.exec(s || ''); return m ? m[3] + '-' + m[2] + '-' + m[1] + (m[4] ? 'T' + m[4] : '') : null; };
const situacao = s => /fora/.test(s) ? 'fora (risco 100%)' : /^realizada/.test(s) ? 'realizada' : /handover/.test(s) ? 'prevista · handover enviado' : 'prevista';
const cmpTxt = (a, b) => String(a).localeCompare(String(b), 'pt', {numeric: true, sensitivity: 'base'});
const emOrdem = (vals, tipo, dir) => {
  const cv = vals.map(v => tipo === 'n' ? num(v) : tipo === 'd' ? dataIso(v) : tipo === 's' ? situacao(v) : (v === '—' || v === '' ? null : v));
  let i = cv.findIndex(v => v == null); if (i < 0) i = cv.length;
  if (cv.slice(i).some(v => v != null)) return false; // vazios no fim
  for (let k = 1; k < i; k++) { const c = tipo === 'n' ? cv[k - 1] - cv[k] : cmpTxt(cv[k - 1], cv[k]); if (dir * c > 0) return false; }
  return true;
};
const tipoCol = th => th.t === 'Data' || th.t === 'Gerado em' ? 'd' : th.t === 'Situação' ? 's' : th.n || /^% usado|^Uso do contrato/.test(th.t) ? 'n' : 't';
const abrirPainel = async (page, cls, titulo) => {
  const i = (await lerTab(page, cls)).ths.findIndex(t => t.t === titulo);
  await page.locator('table.' + cls + ' thead th').nth(i).locator('.tf-b').click();
  await page.waitForSelector('#tfPop');
  return i;
};
const itensPainel = page => page.$$eval('#tfPop .tf-it', l => l.map(it => ({v: it.querySelector('.tf-v').textContent, n: Number(it.querySelector('em').textContent), on: it.querySelector('input').checked, vis: it.style.display !== 'none'})));
const ABAS = [['contratos', 't-cts'], ['ppu', 't-ppu'], ['quim', 't-quim'], ['cas', 't-cas'], ['pes', 't-pes'], ['ops', 't-ops'], ['fontes', 't-fontes']];

(async () => {
  const {browser, page, errs} = await abrir(GER, {w: 1500, h: 950, hoje: '2026-11-05'});
  await page.waitForSelector('#app');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('[data-a="arq"]');
  await page.setInputFiles('#inArq', [{name: 'eng_ana.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(pacA))}, {name: 'eng_bruno.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(pacB))}]);
  await page.waitForSelector('.kpis');
  await page.evaluate(() => { const m = document.getElementById('msg'); if (m) m.remove(); });
  conf((await page.textContent('#ver')).includes('g17'), 'versão g17');

  console.log('Ordem crescente e decrescente em todas as colunas');
  for (const [aba, cls] of ABAS) {
    await page.click('.tab[data-tab="' + aba + '"]');
    await page.waitForSelector('table.' + cls);
    const T0 = await lerTab(page, cls);
    const cols = T0.ths.map((th, i) => ({th, i})).filter(x => x.th.sort);
    const filtros = T0.ths.filter(th => th.filt).length;
    const ruins = [];
    for (const {th, i} of cols) {
      const btn = page.locator('table.' + cls + ' thead th').nth(i).locator('.tf-s');
      await btn.click();
      const cres = (await lerTab(page, cls)).rows.map(r => r[i]);
      const ar1 = await page.locator('table.' + cls + ' thead th').nth(i).locator('.tf-ar').textContent();
      await page.locator('table.' + cls + ' thead th').nth(i).locator('.tf-s').click();
      const decr = (await lerTab(page, cls)).rows.map(r => r[i]);
      const ar2 = await page.locator('table.' + cls + ' thead th').nth(i).locator('.tf-ar').textContent();
      const tp = tipoCol(th);
      if (!emOrdem(cres, tp, 1) || !emOrdem(decr, tp, -1) || ar1 !== '▲' || ar2 !== '▼' || cres.length !== T0.rows.length) ruins.push({col: th.t, tp, cres, decr, ar1, ar2});
    }
    conf(!ruins.length && cols.length >= 6 && T0.rows.length >= (aba === 'fontes' ? 2 : 3), aba + ': ' + cols.length + ' colunas ordenadas ▲ crescente e ▼ decrescente (' + T0.rows.length + ' linhas; ' + filtros + ' com ▾)', ruins.slice(0, 2));
    const info = await page.textContent('.tf-info');
    await page.click('[data-tfclr]');
    conf(/ordenado por .* \(decrescente\)/.test(info) && !(await page.locator('.tf-info').count()) && JSON.stringify((await lerTab(page, cls)).rows) === JSON.stringify(T0.rows), aba + ': "Limpar ordem e seleção" volta à ordem de antes', info);
  }

  console.log('Seleção de itens (Contratos)');
  await page.click('.tab[data-tab="contratos"]');
  let T = await lerTab(page, 't-cts');
  const total0 = T.ft;
  let iCli = await abrirPainel(page, 't-cts', 'Cliente');
  let its = await itensPainel(page);
  conf(its.map(i => i.v + ' ' + i.n).join(' | ') === 'Equinor 1 | Petrobras 1 | Shell 1' && its.every(i => i.on) && await page.isChecked('#tfPop .tf-all input'), 'o ▾ de Cliente lista os 3 clientes (em ordem, com a contagem), todos marcados');
  await page.locator('#tfPop .tf-it', {hasText: 'Shell'}).locator('.tf-so').click();
  T = await lerTab(page, 't-cts');
  const recShell = T.rows[0][5];
  conf(T.rows.length === 1 && T.rows[0][iCli] === 'Shell' && T.ft[1] === T.rows[0][4] && T.ft[2] === recShell && /Total \(1 de 3 contratos\)/.test(T.ft[0]) && await page.locator('.t-cts .tf-b.on').count() === 1, '"só este" (Shell): só a linha da Shell, e o total soma só ela', T);
  conf(/Mostrando 1 de 3 linha\(s\) \(Cliente: 1 selecionado\(s\)\)/.test(await page.textContent('.tf-info')), 'aviso "Mostrando 1 de 3" com a coluna selecionada');
  await abrirPainel(page, 't-cts', 'Cliente');
  its = await itensPainel(page);
  conf(its.filter(i => i.on).map(i => i.v).join() === 'Shell' && await page.evaluate(() => document.querySelector('#tfPop .tf-all input').indeterminate), 'reabrindo: só a Shell marcada, "(Selecionar tudo)" pela metade');
  await page.locator('#tfPop .tf-it', {hasText: 'Equinor'}).locator('input').check();
  await page.click('#tfPop [data-tfa="ok"]');
  T = await lerTab(page, 't-cts');
  const somaRec = T.rows.reduce((a, r) => a + num(r[5]), 0);
  conf(T.rows.length === 2 && T.rows.map(r => r[iCli]).sort().join() === 'Equinor,Shell' && Math.abs(num(T.ft[2]) - somaRec) < 0.01, 'marcar mais um (Equinor) e Aplicar: Shell e Equinor; total = soma das duas', T.rows.map(r => r[iCli]));
  await abrirPainel(page, 't-cts', 'Região');
  its = await itensPainel(page);
  conf(its.map(i => i.v + ' ' + i.n).join(' | ') === 'Nordeste 1 | Sudeste 1', 'o ▾ de outra coluna só lista o que sobrou com a seleção de Cliente (Nordeste 1, Sudeste 1)', its);
  await page.locator('#tfPop .tf-it', {hasText: 'Sudeste'}).locator('.tf-so').click();
  T = await lerTab(page, 't-cts');
  conf(T.rows.length === 1 && T.rows[0][iCli] === 'Shell' && await page.locator('.t-cts .tf-b.on').count() === 2, 'duas colunas selecionadas ao mesmo tempo (Cliente e Região): só a Shell');
  await page.click('.t-cts thead .tf-s:has-text("Receita US$")');
  await abrirPainel(page, 't-cts', 'Cliente');
  await page.click('#tfPop [data-tfa="cancelar"]');
  conf(!(await page.locator('#tfPop').count()) && (await lerTab(page, 't-cts')).rows.length === 1, 'Cancelar fecha sem mudar nada');
  await abrirPainel(page, 't-cts', 'Cliente');
  await page.keyboard.press('Escape');
  conf(!(await page.locator('#tfPop').count()), 'Esc fecha o painel');
  await abrirPainel(page, 't-cts', 'Cliente');
  await page.click('h1');
  conf(!(await page.locator('#tfPop').count()), 'clique fora fecha o painel');
  await page.click('.tab[data-tab="ppu"]');
  await page.click('.tab[data-tab="contratos"]');
  T = await lerTab(page, 't-cts');
  conf(T.rows.length === 1 && /ordenado por Receita US\$ \(crescente\)/.test(await page.textContent('.tf-info')), 'a seleção e a ordem ficam ao trocar de aba');
  await page.click('.t-cts tbody tr.clk');
  conf(await page.inputValue('[data-f="contrato"]') === 'c2' && await page.textContent('.k-rec-usd b') === 'US$ ' + recShell.replace('US$ ', ''), 'clicar na linha do contrato continua filtrando a página (Contrato Beta)');
  await page.selectOption('[data-f="contrato"]', '');
  await page.click('[data-tfclr="cts"]');
  conf(JSON.stringify((await lerTab(page, 't-cts')).ft) === JSON.stringify(total0), 'limpando, o total volta ao de antes');

  console.log('Itens PPU: consumido, lançado no período, a realizar e projetado (quantidade e US$)');
  const refPpu = tri => {
    const r = {}, it = k => r[k] || (r[k] = {cons: 0, consU: 0, per: 0, perU: 0, aR: 0, aRU: 0});
    const nomes = {c1: 'Contrato Alfa', c2: 'Contrato Beta', c3: 'Contrato Gama'};
    opsA.concat(opsB).forEach(o => {
      if (o.realizado) {
        const m = o.realizado.data, noP = m.startsWith('2026') && (!tri || Math.floor((Number(m.slice(5, 7)) - 1) / 3) + 1 === tri);
        o.realizado.ppu.forEach(l => { const x = it(nomes[o.contratoId] + '|' + l.ref); x.cons += l.qtd; x.consU += l.valorUsd; if (noP) { x.per += l.qtd; x.perU += l.valorUsd; } });
      } else {
        const f = o.risco ? Math.max(0, 1 - o.risco / 100) : 1;
        o.previsto.ppu.forEach(l => { const x = it(nomes[o.contratoId] + '|' + l.ref); x.aR += l.qtd * f; x.aRU += l.valorUsd * f; });
      }
    });
    return r;
  };
  const confPpu = async (tri, rot) => {
    const T = await lerTab(page, 't-ppu'), ref = refPpu(tri), difs = [];
    const chaves = T.rows.map(r => r[0] + '|' + r[1]);
    Object.keys(ref).forEach(k => { const e = ref[k], r = T.rows[chaves.indexOf(k)]; const perto = (a, b) => Math.abs(num(a) - b) < 0.011;
      if (!r || !perto(r[5], e.cons) || !perto(r[9], e.consU) || !perto(r[10], e.per) || !perto(r[11], e.perU) || !perto(r[12], e.aR) || !perto(r[13], e.aRU) || !perto(r[14], e.cons + e.aR) || !perto(r[15], e.consU + e.aRU)) difs.push({k, tela: r, ref: e}); });
    const soma = (i) => T.rows.reduce((a, r) => a + num(r[i]), 0);
    conf(!difs.length && T.rows.length === Object.keys(ref).length && [[1, 9], [3, 11], [5, 13], [7, 15]].every(([f, c]) => Math.abs(num(T.ft[f]) - soma(c)) < 0.02), rot, difs.slice(0, 2));
  };
  await page.click('.tab[data-tab="ppu"]');
  const thPpu = (await lerTab(page, 't-ppu')).ths.map(t => t.t);
  conf(thPpu.join('|') === 'Contrato|Item|Descrição|Unid.|Contratado|Consumido|Saldo|% usado|Preço unitário|Realizado US$|Lançado no período|Seleção US$|A realizar|A realizar US$|Projetado|Projetado US$', 'colunas: "Preço unitário" ao lado de "% usado"; US$ do realizado, da seleção, do a realizar e do projetado; sem R$', thPpu);
  const precoAlfa = await page.$$eval('.t-ppu tbody tr', l => { const tr = l.find(r => r.children[0].textContent === 'Contrato Alfa' && r.children[1].textContent === '1.1'); return tr ? tr.children[8].innerText.replace(/\s+/g, ' ').trim() : null; });
  conf(precoAlfa === 'US$ 280,00 R$ 1.512,00', 'preço unitário em US$ e em R$ (Contrato Alfa, item 1.1)', precoAlfa);
  await confPpu(0, 'ano 2026: consumido (só concluídas), lançado no período, a realizar (× risco) e projetado — quantidade e US$ — e os totais batem com a conta');
  await page.click('.q-box'); await page.click('[data-qb="1"]'); await page.click('[data-qb="1"]');
  await confPpu(1, 'só Q1: o lançado no período muda; consumido, a realizar e projetado são do contrato todo');
  await page.click('.q-box'); await page.click('[data-a="qTodos"]');
  const xlP = await (async () => { const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-a="excel"]')]); return page.evaluate(b => { const w = XLSX.read(b, {type: 'base64'}); return XLSX.utils.sheet_to_json(w.Sheets['Itens PPU'], {header: 1})[0]; }, fs.readFileSync(await dl.path()).toString('base64')); })();
  conf(xlP.join('|') === 'Contrato|Item|Descrição|Unid.|Contratado|Consumido|Saldo|% usado|Preço unitário US$|Preço unitário R$|Realizado US$|Lançado no período|Seleção US$|A realizar|A realizar US$|Projetado|Projetado US$', 'Excel consolidado: aba "Itens PPU" com as mesmas colunas', xlP);

  console.log('Seleção de itens (outras tabelas)');
  await page.click('.tab[data-tab="ppu"]');
  await abrirPainel(page, 't-ppu', 'Descrição');
  await page.fill('#tfPop .tf-q', 'taxa');
  its = await itensPainel(page);
  conf(its.filter(i => i.vis).map(i => i.v).join() === 'Taxa de cimentação', 'buscar "taxa" deixa só "Taxa de cimentação" na lista');
  await page.press('#tfPop .tf-q', 'Enter');
  T = await lerTab(page, 't-ppu');
  const projPpu = T.rows.reduce((a, r) => a + num(r[15]), 0);
  conf(T.rows.length === 3 && T.rows.every(r => r[2] === 'Taxa de cimentação') && Math.abs(num(T.ft[7]) - projPpu) < 0.01 && /Total \(3 item\(ns\)\)/.test(T.ft[0]), 'Enter aplica só o que ficou visível: 3 linhas (uma por contrato); total do projetado = soma delas', T.ft);
  await abrirPainel(page, 't-ppu', 'Descrição');
  await page.click('#tfPop [data-tfa="limpar"]');
  conf(!(await page.locator('.t-ppu .tf-b.on').count()) && (await lerTab(page, 't-ppu')).rows.length > 3, '"Mostrar todos" tira a seleção');
  await abrirPainel(page, 't-ppu', 'Item');
  await page.uncheck('#tfPop .tf-all input');
  conf(await page.isDisabled('#tfPop [data-tfa="ok"]'), 'desmarcando tudo, "Aplicar" fica desligado (a tabela nunca fica vazia por engano)');
  await page.click('#tfPop [data-tfa="cancelar"]');
  await page.click('.tab[data-tab="quim"]');
  await abrirPainel(page, 't-quim', 'Contratos');
  its = await itensPainel(page);
  conf(its.map(i => i.v).join() === 'Contrato Alfa,Contrato Beta,Contrato Gama', 'Químicas: o ▾ de "Contratos" separa cada contrato (a célula pode ter vários)', its);
  await page.locator('#tfPop .tf-it', {hasText: 'Contrato Gama'}).locator('.tf-so').click();
  T = await lerTab(page, 't-quim');
  conf(T.rows.length >= 2 && T.rows.every(r => /Contrato Gama/.test(r[8])) && Math.abs(num(T.ft[1]) - T.rows.reduce((a, r) => a + num(r[7]), 0)) < 0.01, 'só os químicos usados no Contrato Gama; total do COGS = soma deles', T.rows.map(r => r[1] + ' / ' + r[8]));
  await page.click('[data-tfclr="quim"]');
  await page.click('.tab[data-tab="pes"]');
  await abrirPainel(page, 't-pes', 'Função');
  await page.locator('#tfPop .tf-it', {hasText: 'Supervisor'}).locator('.tf-so').click();
  T = await lerTab(page, 't-pes');
  conf(T.rows.length === 1 && T.rows[0][0] === 'Supervisor' && JSON.stringify(T.ft.slice(1, 6)) === JSON.stringify(T.rows[0].slice(1, 6)), 'Pessoal: só Supervisor; o total = a linha dele');
  await page.click('[data-tfclr="pes"]');
  await page.click('.tab[data-tab="ops"]');
  await abrirPainel(page, 't-ops', 'Data');
  its = await itensPainel(page);
  conf(its.map(i => i.v).join() === 'jan/2026,fev/2026,mar/2026,abr/2026,mai/2026,jun/2026,jul/2026,set/2026', 'Operações: no ▾ da Data, os itens são os meses, em ordem', its.map(i => i.v));
  await page.click('#tfPop [data-tfa="cancelar"]');
  await abrirPainel(page, 't-ops', 'Situação');
  its = await itensPainel(page);
  conf(its.map(i => i.v + ' ' + i.n).join(' | ') === 'fora (risco 100%) 1 | prevista 3 | prevista · handover enviado 1 | realizada 3', 'Situação: realizada, prevista, handover e fora, com a contagem', its);
  await page.locator('#tfPop .tf-it', {hasText: 'realizada'}).locator('.tf-so').click();
  T = await lerTab(page, 't-ops');
  conf(T.rows.length === 3 && /^Operações \(3\)/.test(await page.textContent('.card h2')) && Math.abs(num(T.ft[1]) - T.rows.reduce((a, r) => a + num(r[7]), 0)) < 0.01, 'só as realizadas: 3, o título conta 3 e o total soma só elas');
  await page.fill('[data-f="busca"]', 'NS-58');
  T = await lerTab(page, 't-ops');
  conf(T.rows.length === 1 && T.rows[0][2] === 'NS-58', 'a busca e a seleção valem juntas (realizadas na NS-58: 1)');
  await page.fill('[data-f="busca"]', '');
  await foto(page, 't1_operacoes');
  await abrirPainel(page, 't-ops', 'Sonda');
  await foto(page, 't2_painel');
  await page.keyboard.press('Escape');
  await page.click('[data-tfclr="ops"]');
  await page.selectOption('[data-f="cliente"]', 'Petrobras');
  T = await lerTab(page, 't-ops');
  conf(T.rows.length === 4 && T.rows.every(r => r[1] === 'Contrato Alfa'), 'os filtros do topo continuam valendo nas tabelas (Petrobras: 4 operações)');
  await page.selectOption('[data-f="cliente"]', '');

  console.log('15 linhas visíveis, com rolagem vertical e horizontal');
  const C4 = ct('c4', 'Contrato Delta', 'TotalEnergies', 'Sudeste', [['1.1', 'Taxa de cimentação', 'dia', 400, 290]]);
  const opsC = []; for (let k = 0; k < 22; k++) opsC.push(op(C4, '2026-' + String(1 + (k % 12)).padStart(2, '0') + '-' + String(5 + k).padStart(2, '0'), 'NS-' + (40 + (k % 4)), 'P-' + k, 'Squeeze', [['1.1', 1 + (k % 3)]], [], [], [['Operador', 1, 1]]));
  await page.setInputFiles('#inArq', [{name: 'eng_c.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({tipo: 'EARL-Gerencial', formato: 2, app: 'teste', geradoEm: '2026-11-04T12:00:00.000Z', por: 'Eng. Caio', contratos: [C4], operacoes: opsC}))}]);
  await page.waitForTimeout(300);
  const rolagem = cls => page.evaluate(cls => {
    const t = document.querySelector('table.' + cls), w = t.closest('.tw15'), wr = w.getBoundingClientRect(), barra = w.offsetHeight - w.clientHeight;
    const topo = wr.top + t.tHead.offsetHeight - 1, fim = wr.bottom - barra - (t.tFoot ? t.tFoot.offsetHeight : 0) + 1;
    const rows = [...t.tBodies[0].rows], vis = rows.filter(r => { const b = r.getBoundingClientRect(); return b.top >= topo && b.bottom <= fim; }).length;
    return {n: rows.length, vis, rola: w.classList.contains('tw15-rola'), vert: w.scrollHeight > w.clientHeight, horiz: w.scrollWidth > w.clientWidth, cabTopo: Math.round(t.tHead.getBoundingClientRect().top - wr.top), rodFim: t.tFoot ? Math.round(wr.bottom - barra - t.tFoot.getBoundingClientRect().bottom) : null};
  }, cls);
  await page.click('.tab[data-tab="ops"]');
  let R = await rolagem('t-ops');
  conf(R.n === 30 && R.vis === 15 && R.rola && R.vert && R.cabTopo <= 1, 'Operações (30 linhas): aparecem 15, com rolagem vertical dentro do quadro', R);
  await page.$eval('.t-ops', t => { t.closest('.tw15').scrollTop = 99999; });
  R = await rolagem('t-ops');
  conf(Math.abs(R.cabTopo) <= 1 && Math.abs(R.rodFim) <= 2, 'rolando até o fim, o cabeçalho continua em cima e o total embaixo', R);
  await foto(page, 't4_15linhas');
  await page.setViewportSize({width: 900, height: 900});
  await page.waitForTimeout(250);
  R = await rolagem('t-ops');
  conf(R.horiz && R.vis === 15 && Math.abs(R.cabTopo) <= 1, 'tela mais estreita: barra de rolagem horizontal também, e continuam 15 linhas', R);
  await page.setViewportSize({width: 1500, height: 950});
  await page.click('.tab[data-tab="ppu"]');
  R = await rolagem('t-ppu');
  conf(R.n === 9 && !R.rola && !R.vert, 'tabela com até 15 linhas (Itens PPU, 9): sem limite, sem rolagem vertical', R);
  await page.click('.tab[data-tab="receita"]');
  await page.click('[data-mxmostrar="4"]');
  R = await rolagem('t-mx');
  conf(R.n > 15 && R.vis === 15 && R.rola, 'matriz da aba Receita: 15 linhas visíveis, o resto rola', R);
  await page.click('.tab[data-tab="contratos"]');
  R = await rolagem('t-cts');
  conf(R.n === 4 && !R.rola, 'Contratos (4 linhas): sem rolagem', R);

  console.log('Celular');
  await page.setViewportSize({width: 390, height: 800});
  await page.click('.tab[data-tab="contratos"]');
  await page.locator('.t-cts thead th').nth(1).locator('.tf-b').scrollIntoViewIfNeeded();
  await page.locator('.t-cts thead th').nth(1).locator('.tf-b').click();
  const caixa = await page.evaluate(() => { const r = document.querySelector('#tfPop').getBoundingClientRect(); return {l: Math.round(r.left), r: Math.round(r.right), doc: document.documentElement.scrollWidth}; });
  conf(caixa.l >= 0 && caixa.r <= 390 && caixa.doc <= 392, 'no celular o painel cabe na tela', caixa);
  await foto(page, 't3_celular');
  await page.keyboard.press('Escape');
  conf(errs.length === 0, 'nenhum erro de JavaScript', errs.slice(0, 3));
  await browser.close();
  console.log(`\n${ok} ok, ${falhas} falha(s)`);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
