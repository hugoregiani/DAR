// Teste da aba "Receita e margem" do EARL Gerencial (g8): visão por ano, como o "Relatório Receita" do Excel.
// Cards Q1–Q4 + total do ano; matriz com clientes nas linhas (Cliente › Contrato › Sonda › Poço › Operação › Item PPU)
// e quarto › mês › Receita/COGS nas colunas; filtro de período numa caixa só (mês inicial e final); o quarto vale no
// lugar dos meses. Arquivos sintéticos (2 engenheiros, 4 clientes, dez/2025 a fev/2027, realizadas e previstas,
// risco 0/50/100%, itens PPU); cada célula é conferida contra uma conta feita aqui.
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
    previsto: {ppu: extra.ppu || [], receita: {brl: 0, usd: rec, semValor: 0}, cogs: {usd: cogs, brl: 0, semCogs: 0}, quimicas: [], casing: [], pessoal: []}, realizado: null, receita: null};
  if (extra.real) { // realizada: vale a data do serviço e a receita/COGS lançados
    o.status = 'consumo';
    o.realizado = {data: extra.real.data, em: '2026-11-01T12:00:00.000Z', por: 'Eng', ppu: extra.real.ppu || [], quimicas: [], casing: [], cogs: {usd: extra.real.cogs, brl: 0, semCogs: 0}, pessoal: []};
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
  op('pb_bd', 'NS-38', '7-BUZ-10', '2026-01-15', 120000, 40000, {real: {data: '2026-01-16', rec: 125432.1, cogs: 41234.56, ppu: [
    {ref: '1.1', desc: 'Taxa de cimentação', unit: 'dia', qtd: 20, usd: 5000, valorUsd: 100000}, {ref: '3.1', desc: 'Cimento classe G', unit: 'sk', qtd: 254.321, usd: 100, valorUsd: 25432.1}]}, so: '911000111'}),
  op('pb_bd', 'NS-38', '7-BUZ-11', '2026-02-03', 98000, 31000, {real: {data: '2026-02-05', rec: 99111.11, cogs: 33333.33}}),
  op('pb_bd', 'NS-39', '7-MRO-2', '2026-03-20', 80000, 22000, {risco: 50, ppu: [
    {ref: '1.1', desc: 'Taxa de cimentação', unit: 'dia', qtd: 10, usd: 5000, valorUsd: 50000}, {ref: '2.1', desc: 'Teste de pressão', unit: 'op', qtd: 3, usd: 10000, valorUsd: 30000}]}),
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
const qDe = m => Math.floor((Number(m.slice(5, 7)) - 1) / 3) + 1;
const fV = v => v.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const colunas = ls => {
  const meses = [...new Set(ls.map(x => x.m))].sort(), tris = [];
  meses.forEach(m => { const k = m.slice(0, 4) + '-Q' + qDe(m); let u = tris[tris.length - 1]; if (!u || u.k !== k) tris.push(u = {k, rot: 'Q' + qDe(m) + '/' + m.slice(0, 4), meses: []}); u.meses.push(m); });
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

const doAno = (a, ls = REF) => ls.filter(x => x.m.startsWith(a));
const somaR = ls => ls.reduce((a, x) => a + x.r, 0), somaC = ls => ls.reduce((a, x) => a + x.c, 0);

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
  const ftd = [...t.querySelectorAll('tfoot td')];
  return {h1: th(0), h2: th(1), h3: th(2), rows, ft: ftd.slice(1).map(c => c.textContent.trim()), ftRot: ftd[0].textContent.replace(/\s+/g, ' ').trim()};
});
const kpi = (page, c) => page.evaluate(c => document.querySelector('.' + c + ' b').textContent.trim(), c);
const cards = page => page.$$eval('.qc', l => l.map(b => ({q: b.dataset.q, on: b.classList.contains('on'), rot: b.querySelector('.qc-l > span').textContent.replace(/\s+/g, ' ').trim(), dica: (b.querySelector('.qc-f, .qc-dica') || {}).textContent || '', h: Math.round(b.getBoundingClientRect().height), r: b.querySelector('b').textContent.trim(), em: [...b.querySelectorAll('em')].map(e => e.textContent.trim())})));
const h2txt = M => M.h2.map(h => h.t);

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
  await page.evaluate(() => { const m = document.getElementById('msg'); if (m) m.remove(); });

  console.log('Tela: a matriz no lugar da tabela, sem aba nova; 5 cartões do mesmo tamanho');
  conf((await page.textContent('#ver')).includes('g13'), 'versão g13');
  const abas = await page.$$eval('.tab', l => l.map(b => b.textContent.trim()));
  conf(abas[0] === 'Receita e margem' && abas[1] === 'Comparar registros (0)' && abas[2] === 'Contratos' && !abas.some(a => /matriz/i.test(a)), 'sem aba separada: a matriz fica na aba "Receita e margem"', abas);
  conf(await page.locator('.tab.on[data-tab="receita"] ').count() === 1 && await page.locator('.t-mx').count() === 1 && await page.locator('.t-dd').count() === 0, 'a matriz substitui a tabela "Receita, COGS e margem"');
  const kp = await page.$$eval('.kpis .kpi', l => l.map(k => { const r = k.getBoundingClientRect(); return {t: k.querySelector('span').textContent, w: Math.round(r.width), y: Math.round(r.top)}; }));
  conf(kp.map(k => k.t).join('|') === 'Receita em US$|COGS em US$|Operações|Receita / operação (US$)|Margem em US$' && !(await page.locator('.k-hd').count()), 'sem o cartão "Pessoal (homem-dia)"', kp.map(k => k.t));
  conf(kp.every(k => Math.abs(k.w - kp[0].w) <= 1 && k.y === kp[0].y) && kp[0].w > 240, 'os 5 cartões numa linha, do mesmo tamanho (' + kp[0].w + ' px)', kp);

  console.log('Um ano por vez (abre no ano de hoje)');
  const anos = await page.$$eval('[data-f="ano"] option', l => l.map(o => o.value));
  conf(anos.join() === '2025,2026,2027' && await page.inputValue('[data-f="ano"]') === '2026', 'Ano: 2025, 2026 e 2027, sem "Todos"; abre em 2026', anos);
  const R26 = doAno('2026');
  conf((await kpi(page, 'k-rec-usd')) === 'US$ ' + fV(somaR(R26)) && (await kpi(page, 'k-ops')) === String(R26.length), 'indicadores = só 2026: ' + fV(somaR(R26)) + ' em ' + R26.length + ' operações');

  console.log('Cards Q1–Q4 e total do ano');
  let cs = await cards(page);
  const esperaCards = (ls, ano) => [1, 2, 3, 4].map(q => ({q: String(q), r: 'US$ ' + fV(somaR(ls.filter(x => qDe(x.m) === q)))})).concat([{q: '', r: 'US$ ' + fV(somaR(ls)), rot: 'Total ' + ano}]);
  const okCards = (cs, ls, ano) => esperaCards(ls, ano).every((e, i) => cs[i] && cs[i].q === e.q && cs[i].r === e.r) && cs[4].rot.startsWith('Total ' + ano);
  conf(cs.length === 5 && okCards(cs, R26, '2026'), 'Q1, Q2, Q3, Q4 e Total 2026 com a receita de cada um', cs.map(c => c.rot + ' ' + c.r));
  conf(cs.map(c => c.rot).slice(0, 4).join('|') === 'Q1 jan–mar|Q2 abr–jun|Q3 jul–set|Q4 out–dez' && cs[4].on && !cs.slice(0, 4).some(c => c.on), 'rótulos Q1…Q4 (quarto) com os meses; o total do ano está marcado');
  const q1 = R26.filter(x => qDe(x.m) === 1);
  conf(cs.every(c => c.em.length === 1) && cs[0].em[0] === 'COGS US$ ' + fV(somaC(q1)) && cs[4].em[0] === 'COGS US$ ' + fV(somaC(R26)), 'cada card só com a receita e o COGS (sem margem e sem operações)', cs.map(c => c.em));
  conf(cs.every(c => c.h <= 90), 'cards baixos (até 90 px de altura): ' + cs.map(c => c.h).join(', '), cs.map(c => c.h));
  conf(cs[2].r === 'US$ 0,00' && cs[2].em[0] === 'COGS US$ 0,00', 'quarto vazio: US$ 0,00', cs[2]);
  conf(cs.slice(0, 4).every(c => c.dica === 'clique para filtrar') && cs[4].dica === '', 'quartos avisam "clique para filtrar" (aparece passando o mouse)', cs.map(c => c.dica));

  console.log('Matriz do ano: quarto › mês › Receita/COGS');
  let M = await lerMatriz(page);
  const qs26 = colunas(R26);
  conf(JSON.stringify(M.h1.slice(1).map(h => h.t)) === JSON.stringify(qs26.map(t => t.rot).concat(['Total'])) && M.h1[1].t === 'Q1/2026', 'quartos de 2026 (Q1/2026, Q2/2026, Q4/2026) + Total; sem "T1"', M.h1.map(h => h.t));
  const h2esp = []; qs26.forEach(t => { t.meses.forEach(m => h2esp.push(fMes(m))); h2esp.push('Total ' + t.rot); });
  conf(JSON.stringify(h2txt(M)) === JSON.stringify(h2esp), 'meses com operação e "Total Q…" de cada quarto', h2txt(M));
  const esperado = [];
  ordenar(R26, x => x.ct.cliente).forEach(cl => {
    esperado.push({rot: cl.k, cel: celulas(cl.ls, qs26), cls: 'mx-n0'});
    ordenar(cl.ls, x => x.ct.nome).forEach(c2 => esperado.push({rot: c2.k, cel: celulas(c2.ls, qs26), cls: 'mx-n1'}));
  });
  const difs = esperado.filter((e, i) => !M.rows[i] || M.rows[i].rot !== e.rot || !M.rows[i].cls.includes(e.cls) || JSON.stringify(M.rows[i].cel) !== JSON.stringify(e.cel));
  conf(M.rows.length === esperado.length && !difs.length, 'clientes e contratos (padrão): cada célula de mês, de quarto e do total bate', difs.slice(0, 2));
  conf(M.ftRot.startsWith('Total 2026') && JSON.stringify(M.ft) === JSON.stringify(celulas(R26, qs26)) && M.ft[M.ft.length - 3] === fV(somaR(R26)), 'linha "Total 2026" = indicador = card do ano', M.ftRot);
  const h1Txt = (await page.textContent('.mx-card h2')).trim();
  conf(/— 2026 \(US\$\)$/.test(h1Txt), 'título: "Receita, COGS e margem — 2026"', h1Txt);
  await foto(page, 'mx1_ano');

  console.log('Outros anos');
  await page.selectOption('[data-f="ano"]', '2027');
  M = await lerMatriz(page); cs = await cards(page);
  const R27 = doAno('2027');
  conf(JSON.stringify(M.h1.slice(1).map(h => h.t)) === '["Q1/2027","Total"]' && JSON.stringify(M.ft) === JSON.stringify(celulas(R27, colunas(R27))) && okCards(cs, R27, '2027') && (await kpi(page, 'k-rec-usd')) === 'US$ ' + fV(somaR(R27)), '2027: Q1/2027, cards e indicadores de 2027', M.h1.map(h => h.t));
  await page.selectOption('[data-f="ano"]', '2025');
  M = await lerMatriz(page);
  const R25 = doAno('2025');
  conf(JSON.stringify(M.h2.map(h => h.t)) === '["dez/2025","Total Q4/2025"]' && M.ft[M.ft.length - 3] === fV(somaR(R25)), '2025: só dez/2025 (Q4)', h2txt(M));
  await page.selectOption('[data-f="ano"]', '2026');

  console.log('Quarto (no lugar de trimestre) e o filtro de mês numa caixa só');
  const quartos = await page.$$eval('[data-f="tri"] option', l => l.map(o => o.textContent));
  conf(quartos.join('|') === 'Todos|Q1 (jan, fev, mar)|Q2 (abr, mai, jun)|Q3 (jul, ago, set)|Q4 (out, nov, dez)' && (await page.textContent('.filtros')).includes('Quarto') && !/trimestre/i.test(await page.textContent('.filtros')), 'filtro "Quarto": Q1…Q4 (sem "trimestre")', quartos);
  conf(await page.locator('.filtros input[type="month"]').count() === 0 && await page.locator('.mes-box').count() === 1 && (await page.textContent('.mes-box')).includes('Ano todo'), 'mês: uma caixa só ("Ano todo"), sem caixas de início e fim');
  await page.click('.mes-box');
  conf(await page.locator('.mes-pop .mes-b').count() === 12 && /Clique no mês inicial e depois no final · 2026/.test(await page.textContent('.mes-pop')), 'a caixa abre os 12 meses do ano escolhido');
  await page.click('[data-mesb="5"]');
  conf(/Agora clique no mês final/.test(await page.textContent('.mes-pop')) && (await kpi(page, 'k-rec-usd')) === 'US$ ' + fV(somaR(R26.filter(x => x.m === '2026-05'))), 'clique no mês inicial (mai): já filtra mai e pede o final');
  await page.click('[data-mesb="2"]');
  const Rfm = R26.filter(x => x.m >= '2026-02' && x.m <= '2026-05');
  M = await lerMatriz(page);
  conf(!(await page.locator('.mes-pop').count()) && (await page.textContent('.mes-box')).includes('fev – mai/2026') && (await kpi(page, 'k-rec-usd')) === 'US$ ' + fV(somaR(Rfm)) && JSON.stringify(h2txt(M)) === JSON.stringify(['fev/2026', 'mar/2026', 'Total Q1/2026', 'abr/2026', 'mai/2026', 'Total Q2/2026']), 'clicando depois em fev (antes do inicial): período fev–mai/2026; a caixa fecha; matriz só com esses meses', h2txt(M));
  cs = await cards(page);
  conf(okCards(cs, R26, '2026') && !cs.some(c => c.on), 'os cards continuam mostrando o ano todo (nenhum marcado com período de meses)');
  await page.selectOption('[data-f="tri"]', '4');
  const R4 = R26.filter(x => qDe(x.m) === 4);
  M = await lerMatriz(page);
  conf((await kpi(page, 'k-rec-usd')) === 'US$ ' + fV(somaR(R4)) && JSON.stringify(h2txt(M)) === JSON.stringify(['nov/2026', 'Total Q4/2026']), 'Quarto Q4 sobressai ao mês: vale o Q4, não fev–mai', h2txt(M));
  conf(await page.isDisabled('.mes-box') && (await page.textContent('.mes-box')).includes('Q4 (out – dez) · vale o quarto') && (await cards(page))[3].on, 'com o quarto, a caixa do mês fica travada mostrando o quarto; o card Q4 fica marcado', await page.textContent('.mes-box'));
  await page.selectOption('[data-f="tri"]', '');
  conf((await page.textContent('.mes-box')).includes('Ano todo') && (await kpi(page, 'k-rec-usd')) === 'US$ ' + fV(somaR(R26)), 'tirando o quarto: volta ao ano todo (o quarto limpou os meses)');
  await page.click('.qc[data-q="1"]');
  cs = await cards(page);
  conf(await page.inputValue('[data-f="tri"]') === '1' && (await kpi(page, 'k-rec-usd')) === 'US$ ' + fV(somaR(q1)) && cs[0].on && cs[0].dica === 'filtrando ✕' && cs[4].dica === 'ver o ano todo', 'clicar no card Q1 filtra pelo Q1: o card mostra "filtrando ✕" e o do ano "ver o ano todo"', cs.map(c => c.dica));
  await page.click('.qc[data-q="1"]');
  conf(await page.inputValue('[data-f="tri"]') === '', 'clicar de novo no Q1 volta ao ano todo');
  await page.click('.qc[data-q="2"]');
  await page.click('.qc[data-q=""]');
  conf(await page.inputValue('[data-f="tri"]') === '' && (await cards(page))[4].on, 'clicar no card do total do ano tira o quarto');
  await page.click('.mes-box'); await page.click('[data-mesb="3"]'); await page.click('h1');
  conf(!(await page.locator('.mes-pop').count()) && (await page.textContent('.mes-box')).includes('mar/2026'), 'só um clique e clique fora: fica um mês só (mar/2026)', await page.textContent('.mes-box'));
  await page.click('.mes-box'); await page.keyboard.press('Escape');
  conf(!(await page.locator('.mes-pop').count()), 'Esc fecha a caixa');
  await page.selectOption('[data-f="cliente"]', 'Baker');
  await page.click('[data-a="limparf"]');
  conf(await page.inputValue('[data-f="ano"]') === '2026' && await page.inputValue('[data-f="cliente"]') === '' && (await page.textContent('.mes-box')).includes('Ano todo'), '"Limpar filtros" limpa quarto, meses e cliente; o ano fica');

  console.log('Abrir e fechar, até o item PPU');
  await page.click('.t-mx tr.mx-n0[data-mx="/Petrobras"]');
  M = await lerMatriz(page);
  conf(!M.rows.some(r => r.rot === 'Petrobras BDII') && M.rows.some(r => r.rot === 'Baker DS'), 'clique no cliente fecha só ele');
  await page.click('[data-mxmostrar="4"]');
  M = await lerMatriz(page);
  const folhas = M.rows.filter(r => r.cls.includes('mx-op'));
  conf(folhas.length === R26.length && !M.rows.some(r => r.cls.includes('mx-it')), '"Mostrar até Operação": as ' + R26.length + ' operações de 2026, sem itens', folhas.length);
  const fora = folhas.find(r => r.rot.startsWith('20/11/2026'));
  const iNov = h2esp.indexOf('nov/2026') * 2;
  conf(fora && fora.cls.includes('fora') && /fora \(risco 100%\)/.test(fora.sub) && fora.cel[iNov] === '0,00', 'risco 100%: cinza, 0,00', fora);
  await page.click('[data-mxmostrar="5"]');
  M = await lerMatriz(page);
  const iJan = h2esp.indexOf('jan/2026') * 2, iMar = h2esp.indexOf('mar/2026') * 2;
  const iOp = M.rows.findIndex(r => r.rot.startsWith('16/01/2026')), its = M.rows.slice(iOp + 1, iOp + 3);
  conf(its.length === 2 && its.every(r => r.cls.includes('mx-it')) && its[0].rot === '1.1 · Taxa de cimentação' && its[0].sub === '20 dia × US$ 5.000,00' && its[0].cel[iJan] === fV(100000) && its[1].cel[iJan] === fV(25432.1) && its.every(r => r.cel[iJan + 1] === '' && r.cel[r.cel.length - 1] === ''), '"Mostrar até Item PPU": itens da operação, receita no mês dela, COGS e margem em branco', its.map(r => [r.rot, r.sub, r.cel[iJan]]));
  const iOp2 = M.rows.findIndex(r => r.rot.startsWith('20/03/2026')), its2 = M.rows.slice(iOp2 + 1, iOp2 + 3);
  conf(its2.map(r => r.cel[iMar]).join() === [fV(25000), fV(15000)].join() && its2.every(r => /bruto US\$/.test(r.sub)) && M.rows[iOp2].cel[iMar] === fV(40000), 'risco 50%: itens pela metade (somam a receita da operação), com o valor bruto', its2.map(r => [r.cel[iMar], r.sub]));
  await page.click('.t-mx tr.mx-op.on[data-mx*="op%3Aop2"]');
  M = await lerMatriz(page);
  conf(!M.rows.some(r => r.rot === '1.1 · Taxa de cimentação' && r.cel[iJan] === fV(100000)) && M.rows.some(r => r.rot === '2.1 · Teste de pressão'), 'clique na operação fecha os itens dela');
  await foto(page, 'mx2_itens');

  console.log('Gráfico: clicar no mês destaca o mês na matriz');
  await page.locator('.g-mes').nth(2).click();
  const hl = await page.evaluate(() => ({th: [...document.querySelectorAll('.t-mx th.mx-hl')].map(t => t.dataset.mes + ' ' + t.textContent.trim()), tds: document.querySelectorAll('.t-mx td.mx-hl').length}));
  conf(hl.th[0] === '2026-03 mar/2026' && hl.tds > 0, 'clique em mar/2026 no gráfico: a coluna de mar/2026 fica destacada na matriz', hl);

  console.log('Excel');
  await page.click('[data-mxmostrar="1"]');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-a="mxExcel"]')]);
  const X = await page.evaluate(b => {
    const w = XLSX.read(b, {type: 'base64', cellNF: true}), ws = w.Sheets[w.SheetNames[0]];
    return {abas: w.SheetNames, aoa: XLSX.utils.sheet_to_json(ws, {header: 1, defval: null}), merges: (ws['!merges'] || []).length, z: (ws['I4'] || {}).z};
  }, fs.readFileSync(await dl.path()).toString('base64'));
  const aoa = X.aoa, totX = aoa[aoa.length - 1];
  conf(dl.suggestedFilename() === 'EARL_Gerencial_receita_2026_2026-11-05.xlsx' && X.abas[0] === 'Receita 2026', 'baixa "EARL_Gerencial_receita_2026_2026-11-05.xlsx" (aba "Receita 2026")', dl.suggestedFilename());
  conf(aoa[0].slice(0, 8).join() === 'Nível,Cliente,Contrato,Sonda,Poço,Operação,Item PPU,Q1/2026' && aoa[1][7] === 'jan/2026' && aoa[2][7] === 'Receita' && X.merges > 10 && X.z === '#,##0.00', 'cabeçalho em 3 linhas (Q1/2026 › jan/2026 › Receita), mesclado, números de verdade', aoa.slice(0, 3).map(l => l.slice(0, 9)));
  conf(totX[0] === 'Total 2026' && Math.abs(totX[totX.length - 3] - somaR(R26)) < 0.01 && aoa.length === 3 + esperado.length + 1, 'linhas como na tela + "Total 2026" certo', totX.slice(-3));
  const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('[data-a="excel"]')]);
  const Y = await page.evaluate(b => { const w = XLSX.read(b, {type: 'base64'}); const a = XLSX.utils.sheet_to_json(w.Sheets['Receita 2026'], {header: 1}); return {abas: w.SheetNames, ops: a.filter(l => l[0] === 'Operação').length, its: a.filter(l => l[0] === 'Item PPU').length}; }, fs.readFileSync(await dl2.path()).toString('base64'));
  conf(Y.abas.join() === 'Contratos,Receita 2026,Por mês,Itens PPU,Químicas,Casing,Pessoal,Operações,Lançamentos' && Y.ops === R26.length && Y.its === 4, 'Excel consolidado: aba "Receita 2026" com todas as operações e itens PPU do ano', Y);

  console.log('Celular');
  await page.setViewportSize({width: 390, height: 800});
  await page.waitForTimeout(200);
  const larg = await page.evaluate(() => ({doc: document.documentElement.scrollWidth, tw: document.querySelector('.mx-wrap').scrollWidth > document.querySelector('.mx-wrap').clientWidth}));
  conf(larg.doc <= 392 && larg.tw, 'no celular a página não rola de lado; só a tabela rola dentro do quadro', larg);
  await foto(page, 'mx3_celular');
  conf(errs.length === 0, 'nenhum erro de JavaScript', errs.slice(0, 3));
  await browser.close();
  console.log(`\n${ok} ok, ${falhas} falha(s)`);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
