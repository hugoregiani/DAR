// Teste da aba "Receita por mês (matriz)" do EARL Gerencial (g7), no formato do "Relatório Receita" do Excel:
// clientes nas linhas (Cliente › Contrato › Sonda › Poço › Operação), trimestre › mês › Receita/COGS nas colunas.
// Monta arquivos do gerencial sintéticos (2 engenheiros, 4 clientes, 2025–2027, realizadas e previstas, risco 0/50/100%)
// e confere cada célula contra uma conta feita aqui, os filtros Ano/Trimestre/Cliente, o abrir/fechar e o Excel.
// Uso: node gerencial/tests/e2e_matriz.js [EARL_Gerencial.html] [pasta das telas]
const {abrir} = require('../../engenharia/tests/harness');
const fs = require('fs');
const path = require('path');
const GER = process.argv[2] || path.join(__dirname, '..', 'EARL_Gerencial.html');
const SHOTS = process.argv[3] || '';
let ok = 0, falhas = 0;
const conf = (cond, msg, extra) => {
  if (cond) { ok++; console.log('  ✓ ' + msg); } else { falhas++; console.log('  ✗ ' + msg + (extra !== undefined ? ' → ' + JSON.stringify(extra).slice(0, 600) : '')); }
};
if (SHOTS) fs.mkdirSync(SHOTS, {recursive: true});
const foto = async (page, nome) => { if (SHOTS) await page.screenshot({path: path.join(SHOTS, nome + '.png'), fullPage: false}); };

/* ---------- dados ---------- */
const ct = (id, nome, cliente, tipo) => ({id, nome, numero: id.toUpperCase(), cliente, tipo, bases: 1, regiao: 'Sudeste', inicio: '2025-01-01', atualizadoEm: '2026-11-01T12:00:00.000Z', itens: [], reajustes: []});
let seq = 0;
const op = (contratoId, sonda, poco, data, rec, cogs, extra = {}) => {
  const o = {id: 'op' + (++seq), contratoId, sonda, base: 'Macaé', ambiente: 'offshore', regiao: 'Sudeste', poco, tipo: extra.tipo || 'Squeeze', revestimento: extra.rev || '', data, duracao: 1, status: 'planejada', so: extra.so || '', wbs: '', vida: '', contingencia: false, chanceConting: null, risco: extra.risco || 0, handover: null,
    previsto: {ppu: [], receita: {brl: 0, usd: rec, semValor: 0}, cogs: {usd: cogs, brl: 0, semCogs: 0}, quimicas: [], casing: [], pessoal: []}, realizado: null, receita: null};
  if (extra.real) { // realizada: vale a data do serviço e a receita/COGS lançados
    o.status = 'consumo';
    o.realizado = {data: extra.real.data, em: '2026-11-01T12:00:00.000Z', por: 'Eng', ppu: [], quimicas: [], casing: [], cogs: {usd: extra.real.cogs, brl: 0, semCogs: 0}, pessoal: []};
    o.receita = {brl: 0, usd: extra.real.rec, semValor: 0};
  }
  return o;
};
const pacA = {tipo: 'EARL-Gerencial', formato: 2, app: 'teste', geradoEm: '2026-11-04T10:00:00.000Z', por: 'Engenheiro A',
  contratos: [ct('pb_bd', 'Petrobras BDII', 'Petrobras', 'Drilling contract'), ct('pb_pa', 'Petrobras P&A', 'Petrobras', 'Serviços'), ct('bk', 'Baker DS', 'Baker', 'Serviços')], operacoes: []};
const pacB = {tipo: 'EARL-Gerencial', formato: 2, app: 'teste', geradoEm: '2026-11-04T11:00:00.000Z', por: 'Engenheiro B',
  contratos: [ct('ven', 'Carolina', 'Ventura', 'Drilling contract'), ct('tr', 'Deepwater Aquila', 'Transocean', 'Outros')], operacoes: []};
pacA.operacoes.push(
  op('pb_bd', 'NS-38', '7-BUZ-10', '2025-12-10', 50000, 20000, {real: {data: '2025-12-12', rec: 52000.5, cogs: 21000.25}}),
  op('pb_bd', 'NS-38', '7-BUZ-10', '2026-01-15', 120000, 40000, {real: {data: '2026-01-16', rec: 125432.1, cogs: 41234.56}, so: '911000111'}),
  op('pb_bd', 'NS-38', '7-BUZ-11', '2026-02-03', 98000, 31000, {real: {data: '2026-02-05', rec: 99111.11, cogs: 33333.33}}),
  op('pb_bd', 'NS-39', '7-MRO-2', '2026-03-20', 80000, 22000, {risco: 50}),
  op('pb_bd', 'NS-39', '7-MRO-2', '2026-05-07', 65000, 15000),
  op('pb_pa', 'SS-75', '3-RJS-1', '2026-01-28', 45000, 9000, {real: {data: '2026-01-30', rec: 47000, cogs: 9500}}),
  op('pb_pa', 'SS-75', '3-RJS-1', '2026-11-20', 70000, 12000, {risco: 100, tipo: 'Tampão'}),
  op('pb_pa', 'SS-75', '3-RJS-2', '2027-01-09', 72000, 13000),
  op('bk', 'DS-17', '9-BK-1', '2026-01-05', 259741.12, 0, {real: {data: '2026-01-05', rec: 259741.12, cogs: 0}}),
  op('bk', 'DS-17', '9-BK-1', '2026-04-22', 30000, 5000),
);
pacB.operacoes.push(
  op('ven', 'NS-58', '8-CAR-1', '2026-01-11', 148685.38, 0, {real: {data: '2026-01-11', rec: 148685.38, cogs: 0}}),
  op('ven', 'NS-58', '8-CAR-1', '2026-02-14', 129448.69, 0, {real: {data: '2026-02-14', rec: 129448.69, cogs: 0}}),
  op('ven', 'NS-58', '8-CAR-2', '2026-03-02', 134650.51, 0),
  op('tr', 'NS-41', '1-DW-1', '2026-02-27', 263891.53, 1000, {risco: 50, rev: '9 5/8"'}),
  op('tr', 'NS-41', '1-DW-1', '2026-06-30', 255371, 1200),
  op('tr', 'NS-42', '1-DW-2', '2027-02-02', 111111.11, 2222.22),
);
const todas = pacA.operacoes.map(o => ({o, ct: pacA.contratos.find(c => c.id === o.contratoId)})).concat(pacB.operacoes.map(o => ({o, ct: pacB.contratos.find(c => c.id === o.contratoId)})));

/* ---------- conta de referência ---------- */
const fat = o => { const r = Number(o.risco) || 0; return r > 0 ? Math.max(0, 1 - Math.min(100, r) / 100) : 1; };
const linhaRef = ({o, ct}) => {
  const f = fat(o);
  if (o.realizado) return {o, ct, m: o.realizado.data.slice(0, 7), r: o.receita.usd * f, c: o.realizado.cogs.usd * f};
  return {o, ct, m: o.data.slice(0, 7), r: o.previsto.receita.usd * f, c: o.previsto.cogs.usd * f};
};
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const fMes = k => MESES[Number(k.slice(5, 7)) - 1] + '/' + k.slice(0, 4);
const tri = m => Math.floor((Number(m.slice(5, 7)) - 1) / 3) + 1;
const fV = v => v.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const colunas = ls => {
  const meses = [...new Set(ls.map(x => x.m))].sort(), tris = [];
  meses.forEach(m => { const k = m.slice(0, 4) + '-T' + tri(m); let u = tris[tris.length - 1]; if (!u || u.k !== k) tris.push(u = {k, rot: 'T' + tri(m) + '/' + m.slice(0, 4), meses: []}); u.meses.push(m); });
  return tris;
};
// textos esperados das células de valor de um grupo de linhas (vazio = sem operação no mês)
const celulas = (ls, tris) => {
  const out = [], v = (x, n) => n ? fV(x) : '';
  let R = 0, Cc = 0;
  tris.forEach(t => {
    let qr = 0, qc = 0, qn = 0;
    t.meses.forEach(m => { const g = ls.filter(x => x.m === m), r = g.reduce((a, x) => a + x.r, 0), c = g.reduce((a, x) => a + x.c, 0); out.push(v(r, g.length), v(c, g.length)); qr += r; qc += c; qn += g.length; });
    out.push(v(qr, qn), v(qc, qn)); R += qr; Cc += qc;
  });
  out.push(v(R, ls.length), v(Cc, ls.length), v(R - Cc, ls.length));
  return out;
};
const ordenar = (ls, chave) => {
  const g = {};
  ls.forEach(x => { const k = chave(x); (g[k] = g[k] || []).push(x); });
  return Object.keys(g).map(k => ({k, ls: g[k], r: g[k].reduce((a, x) => a + x.r, 0)})).sort((a, b) => b.r - a.r || a.k.localeCompare(b.k, 'pt'));
};
const REF = todas.map(linhaRef);

/* ---------- leitura da tela ---------- */
const lerMatriz = page => page.evaluate(() => {
  const t = document.querySelector('.t-mx');
  if (!t) return null;
  const th = r => [...t.querySelectorAll('thead tr')[r].children].map(c => ({t: c.textContent.trim(), span: c.colSpan}));
  const rows = [...t.querySelectorAll('tbody tr')].map(tr => {
    const tds = [...tr.children];
    const rot = tds[0].cloneNode(true); rot.querySelectorAll('.sub2,.dd-tw').forEach(e => e.remove());
    return {cls: tr.className, rot: rot.textContent.trim(), sub: (tds[0].querySelector('.sub2') || {}).textContent || '', cel: tds.slice(1).map(c => c.textContent.trim()), mx: tr.dataset.mx || null};
  });
  const ft = [...t.querySelectorAll('tfoot td')].slice(1).map(c => c.textContent.trim());
  return {h1: th(0), h2: th(1), h3: th(2), rows, ft};
});
const kpiRec = page => page.evaluate(() => document.querySelector('.k-rec-usd b').textContent.trim());

(async () => {
  const {browser, page, errs} = await abrir(GER, {w: 1500, h: 950, hoje: '2026-11-05'});
  await page.waitForSelector('#app');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('[data-a="arq"]');
  await page.setInputFiles('#inArq', [
    {name: 'eng_A.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(pacA))},
    {name: 'eng_B.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(pacB))},
  ]);
  await page.waitForSelector('.kpis');
  conf((await page.textContent('#ver')).includes('g7'), 'versão g7');
  const abas = await page.$$eval('.tab', l => l.map(b => b.textContent.trim()));
  conf(abas[1] === 'Receita por mês (matriz)', 'aba nova logo depois de "Receita e margem"', abas);
  await page.click('.tab[data-tab="matriz"]');
  await page.waitForSelector('.t-mx');

  console.log('Cabeçalho: trimestre › mês › Receita/COGS');
  let M = await lerMatriz(page);
  const tris = colunas(REF);
  conf(JSON.stringify(M.h1.slice(1).map(h => h.t)) === JSON.stringify(tris.map(t => t.rot).concat(['Total'])), 'trimestres em ordem (2025 a 2027) + Total', M.h1.map(h => h.t));
  conf(M.h1.slice(1, -1).every((h, i) => h.span === tris[i].meses.length * 2 + 2), 'cada trimestre ocupa os meses dele + o total do trimestre');
  const h2esp = []; tris.forEach(t => { t.meses.forEach(m => h2esp.push(fMes(m))); h2esp.push('Total ' + t.rot); });
  conf(JSON.stringify(M.h2.map(h => h.t)) === JSON.stringify(h2esp), 'meses com operação, na ordem, e "Total T…" de cada trimestre', M.h2.map(h => h.t));
  conf(M.h3.length === h2esp.length * 2 + 3 && M.h3[0].t === 'Receita' && M.h3[1].t === 'COGS' && M.h3.slice(-3).map(h => h.t).join() === 'Receita,COGS,Margem', 'Receita | COGS em cada mês; Receita | COGS | Margem no total');

  console.log('Linhas: clientes abertos até o contrato (padrão), cada célula conferida');
  const esperado = [];
  ordenar(REF, x => x.ct.cliente).forEach(cl => {
    esperado.push({rot: cl.k, cel: celulas(cl.ls, tris), cls: 'mx-n0'});
    ordenar(cl.ls, x => x.ct.nome).forEach(c2 => esperado.push({rot: c2.k, cel: celulas(c2.ls, tris), cls: 'mx-n1'}));
  });
  conf(M.rows.length === esperado.length, esperado.length + ' linhas (4 clientes + 5 contratos)', M.rows.map(r => r.rot));
  const difs = esperado.filter((e, i) => !M.rows[i] || M.rows[i].rot !== e.rot || !M.rows[i].cls.includes(e.cls) || JSON.stringify(M.rows[i].cel) !== JSON.stringify(e.cel));
  conf(!difs.length, 'clientes do maior para o menor; Receita e COGS de cada mês, de cada trimestre e o total batem, célula a célula', difs.slice(0, 2));
  conf(JSON.stringify(M.ft) === JSON.stringify(celulas(REF, tris)), 'linha "Total geral" bate', {tela: M.ft.slice(-3), ref: celulas(REF, tris).slice(-3)});
  const totRef = REF.reduce((a, x) => a + x.r, 0);
  conf((await kpiRec(page)) === 'US$ ' + fV(totRef) && M.ft[M.ft.length - 3] === fV(totRef), 'total geral = indicador "Receita em US$" lá em cima', await kpiRec(page));
  const pb = M.rows.find(r => r.rot === 'Petrobras'), iDez = h2esp.indexOf('dez/2025') * 2, iOut = h2esp.indexOf('mai/2026') * 2;
  conf(pb.cel[iDez] === fV(52000.5) && pb.cel[iDez + 1] === fV(21000.25), 'realizada vai pela data do serviço (dez/2025), com a receita e o COGS lançados');
  const bk = M.rows.find(r => r.rot === 'Baker');
  conf(bk.cel[iDez] === '' && bk.cel[iDez + 1] === '' && pb.cel[iOut] === fV(65000), 'célula vazia quando o cliente não tem operação no mês');
  await foto(page, 'mx1_padrao');

  console.log('Abrir e fechar');
  await page.click('.t-mx tr.mx-n0[data-mx="/Petrobras"]');
  M = await lerMatriz(page);
  conf(!M.rows.some(r => r.rot === 'Petrobras BDII') && M.rows.some(r => r.rot === 'Baker DS'), 'clique no cliente fecha só ele');
  await page.click('.t-mx tr.mx-n0[data-mx="/Petrobras"]');
  await page.click('.t-mx tr[data-mx="/Petrobras/Petrobras%20BDII"]');
  M = await lerMatriz(page);
  const iBD = M.rows.findIndex(r => r.rot === 'Petrobras BDII');
  const sondasBD = ordenar(REF.filter(x => x.ct.id === 'pb_bd'), x => x.o.sonda);
  conf(M.rows[iBD + 1].rot === sondasBD[0].k && M.rows[iBD + 1].cls.includes('mx-n2') && JSON.stringify(M.rows[iBD + 1].cel) === JSON.stringify(celulas(sondasBD[0].ls, tris)), 'contrato abre nas sondas, com os valores certos', M.rows[iBD + 1]);
  await page.click('[data-mxmostrar="4"]');
  M = await lerMatriz(page);
  const folhas = M.rows.filter(r => r.cls.includes('mx-op'));
  conf(folhas.length === REF.length, '"Mostrar até Operação" abre tudo: ' + REF.length + ' operações', folhas.length);
  const fora = folhas.find(r => r.rot.startsWith('20/11/2026'));
  const iNov = h2esp.indexOf('nov/2026') * 2;
  conf(fora && fora.cls.includes('fora') && /fora \(risco 100%\)/.test(fora.sub) && fora.cel[iNov] === '0,00', 'operação com risco 100% aparece em cinza, com 0,00', fora);
  const meio = folhas.find(r => r.rot.startsWith('27/02/2026'));
  const iFev = h2esp.indexOf('fev/2026') * 2;
  conf(meio && meio.cel[iFev] === fV(263891.53 * 0.5) && meio.cel[iFev + 1] === fV(500) && /risco 50%/.test(meio.sub) && meio.rot.includes('9 5/8"'), 'risco 50%: receita e COGS pela metade', meio);
  const real = folhas.find(r => r.rot.startsWith('16/01/2026'));
  conf(real && /realizada/.test(real.sub) && /SO 911000111/.test(real.sub), 'operação mostra data, tipo, situação e SO', real);
  const nivelOk = M.rows.every((r, i) => !r.cls.includes('mx-op') || (M.rows[i - 1] && (M.rows[i - 1].cls.includes('mx-op') || M.rows[i - 1].cls.includes('mx-n3'))));
  conf(nivelOk, 'cada operação fica embaixo do poço dela');
  await foto(page, 'mx2_tudo_aberto');
  await page.click('[data-mxmostrar="0"]');
  M = await lerMatriz(page);
  conf(M.rows.length === 4 && M.rows.every(r => r.cls.includes('mx-n0')), '"Mostrar até Cliente" fecha tudo');

  console.log('Filtros do topo (como os segmentadores do Excel)');
  await page.selectOption('[data-f="ano"]', '2026');
  M = await lerMatriz(page);
  const R26 = REF.filter(x => x.m.startsWith('2026'));
  conf(JSON.stringify(M.h1.slice(1).map(h => h.t)) === JSON.stringify(['T1/2026', 'T2/2026', 'T4/2026', 'Total']) && JSON.stringify(M.ft) === JSON.stringify(celulas(R26, colunas(R26))), 'Ano 2026: só os trimestres de 2026 e o total certo', M.h1.map(h => h.t));
  conf((await kpiRec(page)) === 'US$ ' + fV(R26.reduce((a, x) => a + x.r, 0)), 'Ano vale também para os indicadores');
  await page.selectOption('[data-f="tri"]', '1');
  M = await lerMatriz(page);
  const RT1 = R26.filter(x => tri(x.m) === 1);
  conf(JSON.stringify(M.h2.map(h => h.t)) === JSON.stringify(['jan/2026', 'fev/2026', 'mar/2026', 'Total T1/2026']) && JSON.stringify(M.ft) === JSON.stringify(celulas(RT1, colunas(RT1))), 'Trimestre T1: jan, fev, mar e o total do T1', M.h2.map(h => h.t));
  await page.selectOption('[data-f="ano"]', '');
  M = await lerMatriz(page);
  conf(JSON.stringify(M.h1.slice(1).map(h => h.t)) === JSON.stringify(['T1/2026', 'T1/2027', 'Total']), 'só Trimestre T1 (todos os anos): T1/2026 e T1/2027', M.h1.map(h => h.t));
  await page.selectOption('[data-f="tri"]', '');
  await page.selectOption('[data-f="cliente"]', 'Transocean');
  M = await lerMatriz(page);
  const RTr = REF.filter(x => x.ct.cliente === 'Transocean');
  conf(M.rows.length === 1 && M.rows[0].rot === 'Transocean' && JSON.stringify(M.ft) === JSON.stringify(celulas(RTr, colunas(RTr))), 'Cliente Transocean: só ele (fechado, como estava), com os meses dele', M.rows.map(r => r.rot));
  await page.click('[data-a="limparf"]');
  await page.fill('[data-f="de"]', '2026-02');
  await page.dispatchEvent('[data-f="de"]', 'change');
  await page.fill('[data-f="ate"]', '2026-04');
  await page.dispatchEvent('[data-f="ate"]', 'change');
  M = await lerMatriz(page);
  conf(JSON.stringify(M.h2.map(h => h.t)) === JSON.stringify(['fev/2026', 'mar/2026', 'Total T1/2026', 'abr/2026', 'Total T2/2026']), 'Mês de fev até abr/2026', M.h2.map(h => h.t));
  await page.click('[data-a="limparf"]');
  await page.selectOption('[data-f="ano"]', '2030').catch(() => {});
  const anos = await page.$$eval('[data-f="ano"] option', l => l.map(o => o.value));
  conf(JSON.stringify(anos) === JSON.stringify(['', '2025', '2026', '2027']), 'lista de anos vem dos dados', anos);

  console.log('Excel');
  await page.click('[data-mxmostrar="1"]');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-a="mxExcel"]')]);
  const b64 = fs.readFileSync(await dl.path()).toString('base64');
  const X = await page.evaluate(b => {
    const w = XLSX.read(b, {type: 'base64', cellNF: true}), ws = w.Sheets[w.SheetNames[0]];
    return {abas: w.SheetNames, aoa: XLSX.utils.sheet_to_json(ws, {header: 1, defval: null}), merges: (ws['!merges'] || []).length, z: (ws['H4'] || {}).z};
  }, b64);
  const aoa = X.aoa;
  conf(dl.suggestedFilename() === 'EARL_Gerencial_receita_por_mes_2026-11-05.xlsx' && X.abas[0] === 'Receita por mês', 'baixa "EARL_Gerencial_receita_por_mes_2026-11-05.xlsx"', dl.suggestedFilename());
  conf(aoa[0].slice(0, 6).join() === 'Nível,Cliente,Contrato,Sonda,Poço,Operação' && aoa[0][6] === 'T4/2025' && aoa[1][6] === 'dez/2025' && aoa[2][6] === 'Receita' && aoa[2][7] === 'COGS' && X.merges > 10, 'cabeçalho em 3 linhas, com células mescladas', aoa.slice(0, 3).map(l => l.slice(0, 9)));
  conf(aoa.length === 3 + 9 + 1 && aoa[3][0] === 'Cliente' && aoa[4][0] === 'Contrato' && aoa[4][1] === aoa[3][1], 'linhas como na tela (clientes e contratos) + total geral', aoa.length);
  const totX = aoa[aoa.length - 1];
  conf(totX[0] === 'Total geral' && Math.abs(totX[totX.length - 3] - totRef) < 0.01 && Math.abs(totX[totX.length - 1] - (totRef - REF.reduce((a, x) => a + x.c, 0))) < 0.01 && X.z === '#,##0.00', 'números de verdade no Excel, total geral e margem certos', totX.slice(-3));
  const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('[data-a="excel"]')]);
  const Y = await page.evaluate(b => { const w = XLSX.read(b, {type: 'base64'}); return {abas: w.SheetNames, ops: XLSX.utils.sheet_to_json(w.Sheets['Receita por mês'], {header: 1}).filter(l => l[0] === 'Operação').length}; }, fs.readFileSync(await dl2.path()).toString('base64'));
  conf(Y.abas.join() === 'Contratos,Receita por mês,Por mês,Itens PPU,Químicas,Casing,Pessoal,Operações,Lançamentos' && Y.ops === REF.length, 'Excel consolidado ganhou a aba "Receita por mês", com todas as operações', Y);

  console.log('Outras telas');
  await page.setViewportSize({width: 390, height: 800});
  await page.waitForTimeout(200);
  const larg = await page.evaluate(() => ({doc: document.documentElement.scrollWidth, tw: document.querySelector('.mx-wrap').scrollWidth > document.querySelector('.mx-wrap').clientWidth}));
  conf(larg.doc <= 392 && larg.tw, 'no celular a página não rola de lado; só a tabela rola dentro do quadro', larg);
  await foto(page, 'mx3_celular');
  await page.setViewportSize({width: 1500, height: 950});
  await page.click('.tab[data-tab="receita"]');
  await page.waitForSelector('.t-dd');
  conf(await page.locator('.t-dd tbody tr').count() > 0, 'a tabela de drill-down de antes continua na aba "Receita e margem"');
  conf(errs.length === 0, 'nenhum erro de JavaScript', errs.slice(0, 3));
  await browser.close();
  console.log(`\n${ok} ok, ${falhas} falha(s)`);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
