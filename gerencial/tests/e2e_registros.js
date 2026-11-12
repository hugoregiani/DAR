// Teste dos registros e da aba "Comparar registros" do EARL Gerencial (g12: vários registros ao mesmo tempo), do seletor
// Receita | COGS | Receita e COGS | Margem (gráficos, cards e tabela) e da versão compartilhada (HTML com os dados dentro).
// Registra o forecast de 01/10/2026 (versão 1 dos arquivos) e o de 01/11/2026 (versão 2, com operação nova, removida,
// data mudada, risco mudado, valor mudado e operação que passou a realizada) e confere, contra uma conta feita aqui,
// os cards, os dois gráficos, a tabela (mês, quarto e total) e o Excel; sobrescrever na mesma data, remover,
// exportar/importar, armazenamento cheio e a escolha do que mostrar nos gráficos.
// Uso: node gerencial/tests/e2e_registros.js [EARL_Gerencial.html] [pasta das telas]
const {abrir} = require('../../engenharia/tests/harness');
const fs = require('fs');
const os = require('os');
const path = require('path');
const GER = process.argv[2] || path.join(__dirname, '..', 'EARL_Gerencial.html');
const SHOTS = process.argv[3] || '';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'earlreg-'));
let ok = 0, falhas = 0;
const conf = (cond, msg, extra) => {
  if (cond) { ok++; console.log('  ✓ ' + msg); } else { falhas++; console.log('  ✗ ' + msg + (extra !== undefined ? ' → ' + JSON.stringify(extra).slice(0, 700) : '')); }
};
if (SHOTS) fs.mkdirSync(SHOTS, {recursive: true});
const foto = async (page, nome) => { if (SHOTS) await page.screenshot({path: path.join(SHOTS, nome + '.png'), fullPage: false}); };

/* ---------- dados: versão 1 (01/10) e versão 2 (01/11) do forecast ---------- */
const ct = (id, nome, cliente) => ({id, nome, numero: id.toUpperCase(), cliente, tipo: 'Serviços', bases: 1, regiao: 'Sudeste', inicio: '2026-01-01', atualizadoEm: '2026-10-01T12:00:00.000Z', itens: [], reajustes: []});
const op = (id, contratoId, sonda, poco, data, rec, cogs, extra = {}) => {
  const o = {id, contratoId, sonda, base: 'Macaé', ambiente: 'offshore', regiao: 'Sudeste', poco, tipo: extra.tipo || 'Squeeze', revestimento: '', data, duracao: 1, status: 'planejada', so: '', wbs: '', vida: '', contingencia: false, chanceConting: null, risco: extra.risco || 0, handover: null,
    previsto: {ppu: [], receita: {brl: 0, usd: rec, semValor: 0}, cogs: {usd: cogs, brl: 0, semCogs: 0}, quimicas: [], casing: [], pessoal: []}, realizado: null, receita: null};
  if (extra.real) {
    o.status = 'consumo';
    o.realizado = {data: extra.real.data, em: '2026-11-01T12:00:00.000Z', por: 'Eng', ppu: [], quimicas: [], casing: [], cogs: {usd: extra.real.cogs, brl: 0, semCogs: 0}, pessoal: []};
    o.receita = {brl: 0, usd: extra.real.rec, semValor: 0};
  }
  return o;
};
const cts = [ct('c1', 'Contrato PB', 'Petrobras'), ct('c2', 'Contrato Shell', 'Shell')];
const pac = (geradoEm, ops) => ({tipo: 'EARL-Gerencial', formato: 2, app: 'teste', geradoEm, por: 'Eng', contratos: cts, operacoes: ops});
const V1 = pac('2026-10-01T10:00:00.000Z', [
  op('o1', 'c1', 'NS-38', 'P1', '2026-01-15', 100000, 30000),
  op('o2', 'c1', 'NS-38', 'P1', '2026-03-10', 50000, 10000),
  op('o3', 'c1', 'NS-39', 'P2', '2026-05-20', 80000, 20000),
  op('o4', 'c2', 'SS-75', 'P9', '2026-02-05', 40000, 45000),
  op('o5', 'c2', 'SS-75', 'P9', '2026-06-12', 60000, 12000),
  op('o8', 'c1', 'NS-39', 'P2', '2026-08-01', 30000, 6000),
  op('o6', 'c1', 'NS-38', 'P1', '2027-01-10', 70000, 7000),
]);
const V2 = pac('2026-11-01T10:00:00.000Z', [
  op('o1', 'c1', 'NS-38', 'P1', '2026-01-15', 100000, 30000), // sem alteração
  op('o2', 'c1', 'NS-38', 'P1', '2026-04-15', 50000, 10000), // data mudou (mar → abr)
  op('o3', 'c1', 'NS-39', 'P2', '2026-05-20', 80000, 20000, {risco: 50}), // risco 0 → 50%
  op('o4', 'c2', 'SS-75', 'P9', '2026-02-05', 42000, 43000), // valor mudou (margem negativa)
  op('o7', 'c2', 'SS-75', 'P9', '2026-07-01', 25000, 5000), // nova (o5 foi removida)
  op('o8', 'c1', 'NS-39', 'P2', '2026-08-01', 30000, 6000, {real: {data: '2026-08-03', rec: 30000, cogs: 6000}}), // passou a realizada
  op('o6', 'c1', 'NS-38', 'P1', '2027-01-10', 70000, 7000),
]);
const V3 = pac('2026-12-01T10:00:00.000Z', [
  op('o1', 'c1', 'NS-38', 'P1', '2026-01-15', 100000, 30000),
  op('o2', 'c1', 'NS-38', 'P1', '2026-04-15', 50000, 10000),
  op('o3', 'c1', 'NS-39', 'P2', '2026-05-20', 80000, 20000, {risco: 50}),
  op('o7', 'c2', 'SS-75', 'P9', '2026-07-01', 30000, 6000), // valor mudou de novo (o4 saiu)
  op('o8', 'c1', 'NS-39', 'P2', '2026-08-01', 30000, 6000, {real: {data: '2026-08-03', rec: 30000, cogs: 6000}}),
  op('o9', 'c1', 'NS-38', 'P1', '2026-09-10', 60000, 9000), // nova em set/2026
  op('o6', 'c1', 'NS-38', 'P1', '2027-01-10', 70000, 7000),
]);
// conta de referência: receita/COGS com o risco, mês = data do serviço (realizada) ou data planejada
const linhas = P => P.operacoes.map(o => {
  const f = o.risco ? Math.max(0, 1 - o.risco / 100) : 1;
  return o.realizado ? {k: o.id, m: o.realizado.data.slice(0, 7), r: o.receita.usd * f, c: o.realizado.cogs.usd * f} : {k: o.id, m: o.data.slice(0, 7), r: o.previsto.receita.usd * f, c: o.previsto.cogs.usd * f};
});
const ano = (ls, a) => ls.filter(x => x.m.startsWith(a));
const tot = ls => ({r: ls.reduce((a, x) => a + x.r, 0), c: ls.reduce((a, x) => a + x.c, 0), n: ls.length});
const nf2 = v => v.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const fPct = (a, b) => { if (Math.abs(a) < 0.005 && Math.abs(b) < 0.005) return ''; if (Math.abs(a) < 0.005) return 'novo'; const p = (b - a) / Math.abs(a) * 100, t = Math.abs(p).toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1}); return (t === '0,0' ? '' : p > 0 ? '+' : '−') + t + '%'; };
const fDelta = v => { const t = nf2(Math.abs(v)); return (t === '0,00' ? '' : v > 0 ? '+' : '−') + t; };
const vMed = (t, k) => !t ? 0 : k === 'r' ? t.r : k === 'c' ? t.c : t.r - t.c;
const A26 = ano(linhas(V1), '2026'), B26 = ano(linhas(V2), '2026'), C26 = ano(linhas(V3), '2026');
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const fMes = m => MESES[Number(m.slice(5, 7)) - 1] + '/' + m.slice(0, 4);
const mesesDe = (a, b) => [...new Set(a.concat(b).map(x => x.m))].sort();
// células da linha de total da tabela, como a tela deve mostrar (meses e quartos: comparado + Δ%; total: base, comparado, Δ US$, Δ%)
const celulasTotal = (lsA, lsB, ms) => {
  const meses = mesesDe(lsA, lsB), out = [], qs = [];
  meses.forEach(m => { const q = m.slice(0, 4) + '-Q' + (Math.floor((Number(m.slice(5, 7)) - 1) / 3) + 1); let u = qs[qs.length - 1]; if (!u || u.k !== q) qs.push(u = {k: q, meses: []}); u.meses.push(m); });
  const par = (la, lb) => { const ta = tot(la), tb = tot(lb), tem = ta.n || tb.n; ms.forEach(k => { out.push(tem ? nf2(vMed(tb, k)) : '', tem ? fPct(vMed(ta, k), vMed(tb, k)) : ''); }); };
  qs.forEach(q => { q.meses.forEach(m => par(lsA.filter(x => x.m === m), lsB.filter(x => x.m === m))); par(lsA.filter(x => q.meses.includes(x.m)), lsB.filter(x => q.meses.includes(x.m))); });
  const ta = tot(lsA), tb = tot(lsB);
  ms.forEach(k => { const a = vMed(ta, k), b = vMed(tb, k); out.push(nf2(a), nf2(b), fDelta(b - a), fPct(a, b)); });
  return out;
};

// linha de total com vários registros: meses e quartos = [valor, Δ%] de cada comparado; total = base + [valor, Δ US$, Δ%] de cada um
const celulasTotalN = (lsA, lsC, ms) => {
  const meses = [...new Set(lsA.concat(...lsC).map(x => x.m))].sort(), out = [], qs = [];
  meses.forEach(m => { const q = m.slice(0, 4) + '-Q' + (Math.floor((Number(m.slice(5, 7)) - 1) / 3) + 1); let u = qs[qs.length - 1]; if (!u || u.k !== q) qs.push(u = {k: q, meses: []}); u.meses.push(m); });
  const grp = sel => { const ta = tot(lsA.filter(sel)), tc = lsC.map(l => tot(l.filter(sel))); ms.forEach(k => tc.forEach(tb => { const tem = ta.n || tb.n; out.push(tem ? nf2(vMed(tb, k)) : '', tem ? fPct(vMed(ta, k), vMed(tb, k)) : ''); })); };
  qs.forEach(q => { q.meses.forEach(m => grp(x => x.m === m)); grp(x => q.meses.includes(x.m)); });
  const ta = tot(lsA);
  ms.forEach(k => { out.push(nf2(vMed(ta, k))); lsC.forEach(l => { const tb = tot(l), a = vMed(ta, k), b = vMed(tb, k); out.push(nf2(b), fDelta(b - a), fPct(a, b)); }); });
  return out;
};
const pVar = (a, b) => { if (Math.abs(a) < 0.005 && Math.abs(b) < 0.005) return null; if (Math.abs(a) < 0.005) return 'novo'; const p = Math.round((b - a) / Math.abs(a) * 100 * 100) / 100; return Math.abs(p) < 0.05 ? '0' : String(p); };

/* ---------- leitura da tela ---------- */
const txt = async (page, sel) => (await page.innerText(sel)).replace(/\s+/g, ' ').trim();
const lerCx = page => page.evaluate(() => {
  const t = document.querySelector('.t-cx');
  if (!t) return null;
  const th = r => [...t.querySelectorAll('thead tr')[r].children].map(c => c.textContent.trim());
  const rows = [...t.querySelectorAll('tbody tr')].map(tr => {
    const c0 = tr.children[0].cloneNode(true); c0.querySelectorAll('.sub2,.dd-tw').forEach(e => e.remove());
    return {cls: tr.className, rot: c0.textContent.trim(), sub: (tr.children[0].querySelector('.sub2') || {}).textContent || '', cel: [...tr.children].slice(1).map(c => c.textContent.trim())};
  });
  return {h1: th(0), h2: th(1), h3: th(2), rows, ft: [...t.querySelectorAll('tfoot td')].slice(1).map(c => c.textContent.trim())};
});
const cards = page => page.$$eval('.cx-kpis .kpi', l => l.map(k => [...k.children].map(e => e.textContent.replace(/\s+/g, ' ').trim())));
const registrar = async (page, data, obs) => {
  await page.click('.bar [data-a="regAbrir"]');
  await page.waitForSelector('#dlg .reg-data');
  await page.fill('#dlg .reg-data', data);
  if (obs != null) await page.fill('#dlg .reg-obs', obs);
  const info = {aviso: (await page.textContent('#dlg .reg-aviso')).trim(), botao: (await page.textContent('#dlg .reg-ok')).trim()};
  await page.click('#dlg .reg-ok');
  await page.waitForSelector('#dlg', {state: 'detached'});
  return info;
};
const carregar = (page, nome, P) => page.setInputFiles('#inArq', [{name: nome, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(P))}]);

(async () => {
  const {browser, page, errs} = await abrir(GER, {w: 1500, h: 950, hoje: '2026-11-05'});
  await page.waitForSelector('#app');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('[data-a="arq"]');
  await carregar(page, 'v1.json', V1);
  await page.waitForSelector('.kpis');
  conf((await page.textContent('#ver')).includes('g17'), 'versão g17');

  console.log('Registrar');
  conf(await page.locator('.bar [data-a="regAbrir"]').count() === 1 && (await page.$$eval('.tab', l => l.map(b => b.textContent.trim())))[1] === 'Comparar registros (0)', 'botão "📌 Registrar" na barra do topo e aba "Comparar registros (0)"');
  await page.click('.bar [data-a="regAbrir"]');
  await page.waitForSelector('#dlg');
  const dlg = await txt(page, '#dlg');
  conf(await page.inputValue('#dlg .reg-data') === '2026-11-05' && /2 contrato\(s\), 7 operação\(ões\), receita US\$ 430\.000,00/.test(dlg) && /sem os filtros/.test(dlg), 'a janela abre com a data de hoje e o resumo do que vai ser guardado (todas as operações, sem os filtros)', dlg);
  await page.keyboard.press('Escape');
  conf(!(await page.locator('#dlg').count()), 'Esc fecha a janela sem registrar');
  await page.click('.bar [data-a="regAbrir"]');
  await page.mouse.click(5, 5);
  conf(!(await page.locator('#dlg').count()) && (await page.evaluate(() => JSON.parse(localStorage.getItem('earlger:registros_v1') || '[]').length)) === 0, 'clicar fora fecha; nada foi registrado');
  let r1 = await registrar(page, '2026-10-01', 'forecast de outubro');
  conf(r1.aviso === '' && r1.botao === 'Registrar' && /Registro de 01\/10\/2026 salvo: 7 operação/.test(await txt(page, '#msg')), 'registra 01/10/2026 (data nova: botão "Registrar")', r1);
  await page.click('.bar [data-a="regAbrir"]');
  await page.fill('#dlg .reg-data', '2026-10-01');
  const avisoSob = await txt(page, '#dlg .reg-aviso');
  conf(/Já existe um registro em 01\/10\/2026/.test(avisoSob) && /forecast de outubro/.test(avisoSob) && /sobrescrevê-lo/.test(avisoSob) && (await page.textContent('#dlg .reg-ok')).trim() === 'Sobrescrever', 'mesma data: avisa que já existe e o botão vira "Sobrescrever"', avisoSob);
  await page.fill('#dlg .reg-obs', 'forecast de outubro (revisado)');
  await page.click('#dlg .reg-ok');
  let regs = await page.evaluate(() => JSON.parse(localStorage.getItem('earlger:registros_v1')));
  conf(regs.length === 1 && regs[0].obs === 'forecast de outubro (revisado)' && /sobrescrito/.test(await txt(page, '#msg')), 'sobrescreveu: continua 1 registro em 01/10, com a observação nova', regs.map(r => [r.data, r.obs]));
  await carregar(page, 'v2.json', V2);
  await page.waitForTimeout(300);
  r1 = await registrar(page, '2026-11-01', 'forecast de novembro');
  regs = await page.evaluate(() => JSON.parse(localStorage.getItem('earlger:registros_v1')));
  conf(regs.map(r => r.data).join() === '2026-10-01,2026-11-01' && regs[1].ops.length === 7 && (await page.$$eval('.tab', l => l.map(b => b.textContent.trim())))[1] === 'Comparar registros (2)', 'com os arquivos novos, registra 01/11/2026: 2 registros, em ordem de data', regs.map(r => r.data));
  const tamanho = await page.evaluate(() => localStorage.getItem('earlger:registros_v1').length);
  conf(tamanho < 2000, 'registro compacto (' + tamanho + ' caracteres para 2 registros de 7 operações)');

  console.log('Comparar: base 01/10 → 01/11 (2026)');
  await page.click('.tab[data-tab="cmp"]');
  await page.waitForSelector('.t-cx');
  const chipsOn = () => page.$$eval('.cx-chip input:checked', l => l.map(i => i.dataset.cmpsel));
  conf(await page.inputValue('[data-cmp="base"]') === '2026-10-01' && (await chipsOn()).join() === '2026-11-01' && await page.isDisabled('.cx-chip input[data-cmpsel="2026-10-01"]'), 'abre comparando o penúltimo (base) com o último registro; a base não dá para marcar em "Comparar com"');
  const lista = await page.$$eval('.t-regs tbody tr', l => l.map(r => r.innerText.replace(/\s+/g, ' ').trim()));
  conf(lista.length === 3 && /^Agora /.test(lista[0]) && /^01\/11\/2026 .*forecast de novembro .* comparar/.test(lista[1]) && /^01\/10\/2026 .*base/.test(lista[2]), 'lista: Agora, 01/11 (comparar) e 01/10 (base), com a observação', lista);
  const ta = tot(A26), tb = tot(B26);
  let cs = await cards(page);
  conf(cs[0][1] === 'US$ ' + nf2(tb.r) && cs[0][2] === 'base 01/10/2026: US$ ' + nf2(ta.r) && cs[0][3] === fDelta(tb.r - ta.r) + ' (' + fPct(ta.r, tb.r) + ')', 'card Receita: ' + nf2(ta.r) + ' → ' + nf2(tb.r) + ' (' + fPct(ta.r, tb.r) + ')', cs[0]);
  conf(cs[1][1] === 'US$ ' + nf2(tb.c) && cs[1][3] === fDelta(tb.c - ta.c) + ' (' + fPct(ta.c, tb.c) + ')' && cs[2][1] === 'US$ ' + nf2(tb.r - tb.c) && cs[2][3] === fDelta((tb.r - tb.c) - (ta.r - ta.c)) + ' (' + fPct(ta.r - ta.c, tb.r - tb.c) + ')', 'cards COGS e Margem com a variação em US$ e %', [cs[1], cs[2]]);
  conf(cs[3][1] === '6' && /base 01\/10\/2026: 6/.test(cs[3][2]) && cs[3][3] === '1 nova(s) · 1 removida(s)', 'card Operações: 6 → 6, 1 nova e 1 removida', cs[3]);
  const corR = await page.$eval('.k-cx-r .cx-d', e => e.className), corC = await page.$eval('.k-cx-c .cx-d', e => e.className);
  conf(/cv-ruim/.test(corR) && /cv-bom/.test(corC), 'receita caiu = vermelho; COGS caiu = verde (favorável)', [corR, corC]);
  let T = await lerCx(page);
  const mesesAB = mesesDe(A26, B26);
  const h2esp = []; let qAnt = '';
  mesesAB.forEach(m => { const q = 'Q' + (Math.floor((Number(m.slice(5, 7)) - 1) / 3) + 1); if (qAnt && q !== qAnt) h2esp.push('Total ' + qAnt + '/2026'); qAnt = q; h2esp.push(fMes(m)); });
  h2esp.push('Total ' + qAnt + '/2026', 'Receita', 'COGS');
  conf(JSON.stringify(T.h2) === JSON.stringify(h2esp), 'tabela: meses da base e do comparado juntos, total de cada quarto e o total (Receita e COGS)', T.h2);
  conf(T.h3.slice(0, 4).join() === 'Receita,Δ%,COGS,Δ%' && T.h3.slice(-8).join() === 'Base,Comparar,Δ US$,Δ%,Base,Comparar,Δ US$,Δ%', 'em cada mês: valor comparado e Δ%; no total: base, comparado, Δ US$ e Δ%');
  const ftEsp = celulasTotal(A26, B26, ['r', 'c']);
  conf(JSON.stringify(T.ft) === JSON.stringify(ftEsp), 'linha de total: cada mês, quarto e o total batem com a conta (' + ftEsp.length + ' células)', {tela: T.ft, esp: ftEsp});
  const iMar = h2esp.indexOf('mar/2026') * 4, iJul = h2esp.indexOf('jul/2026') * 4;
  conf(T.ft[iMar] === '0,00' && T.ft[iMar + 1] === '−100,0%' && T.ft[iJul] === nf2(25000) && T.ft[iJul + 1] === 'novo', 'mar/2026 ficou vazio (−100%); jul/2026 é "novo"');
  await page.click('[data-cxmostrar="4"]');
  T = await lerCx(page);
  const st = Object.fromEntries(T.rows.filter(r => r.cls.includes('mx-op')).map(r => [r.rot, r.sub]));
  conf(st['15/01/2026 · Squeeze'] === 'sem alteração' && st['15/04/2026 · Squeeze'] === 'data 10/03 → 15/04' && st['20/05/2026 · Squeeze'] === 'risco 0% → 50% · valor mudou' && st['05/02/2026 · Squeeze'] === 'valor mudou' && st['01/07/2026 · Squeeze'] === 'nova' && st['12/06/2026 · Squeeze'] === 'removida' && st['03/08/2026 · Squeeze'] === 'data 01/08 → 03/08 · passou a realizada', 'cada operação diz o que mudou: sem alteração, data, risco, valor, nova, removida, passou a realizada', st);
  const nova = T.rows.find(r => r.rot === '01/07/2026 · Squeeze'), rem = T.rows.find(r => r.rot === '12/06/2026 · Squeeze');
  conf(nova.cls.includes('cx-nova') && rem.cls.includes('cx-rem'), 'nova e removida marcadas na tabela');
  await page.check('[data-a="soMud"]');
  T = await lerCx(page);
  conf(!T.rows.some(r => r.rot === '15/01/2026 · Squeeze') && T.rows.some(r => r.rot === '05/02/2026 · Squeeze') && JSON.stringify(T.ft) === JSON.stringify(ftEsp), '"só o que mudou" esconde a operação sem alteração (o total não muda)');
  await page.uncheck('[data-a="soMud"]');
  await page.click('[data-cxmostrar="1"]');
  await foto(page, 'r1_tabela');

  console.log('Gráficos da comparação');
  const lerEvo = () => page.$$eval('#g-evo .g-reg', l => l.map(g => ({k: g.dataset.k, v: [...g.querySelectorAll('path[data-k]')].map(p => p.dataset.k + '=' + p.dataset.v), pl: [...g.querySelectorAll('.g-pl')].map(t => t.textContent), papel: (g.querySelector('.g-papel-t') || {}).textContent || ''})));
  let evo = await lerEvo();
  conf(evo.length === 2 && evo.map(e => e.k).join() === '2026-10-01,2026-11-01' && evo[0].v.join() === 'r=' + ta.r + ',c=' + ta.c && evo[1].v.join() === 'r=' + tb.r + ',c=' + tb.c && evo[0].papel === 'base', 'evolução: uma coluna por registro escolhido (a base marcada), com receita e COGS', evo);
  conf(evo[1].pl.join() === [fPct(ta.r, tb.r), fPct(ta.c, tb.c)].join() && !evo[0].pl.length, 'em cima de cada coluna, a variação sobre a base', evo.map(e => e.pl));
  const lerVar = k => page.$$eval('#g-var-' + k + ' .g-var', l => l.map(g => [...g.querySelectorAll('[data-p]')].map(p => p.dataset.r + '=' + p.dataset.p)));
  const varEsp = (k, ls) => mesesDe(A26, [].concat(...ls)).map(m => ls.map((l, j) => [l, j]).map(([l, j]) => { const v = pVar(vMed(tot(A26.filter(x => x.m === m)), k), vMed(tot(l.filter(x => x.m === m)), k)); return v == null ? null : regsC[j] + '=' + v; }).filter(Boolean));
  let regsC = ['2026-11-01'];
  conf(JSON.stringify(await lerVar('r')) === JSON.stringify(varEsp('r', [B26])) && JSON.stringify(await lerVar('c')) === JSON.stringify(varEsp('c', [B26])), 'variação % por mês: um gráfico da receita e um do COGS, valores = conta', {r: await lerVar('r'), esp: varEsp('r', [B26])});
  await page.locator('#g-var-r .g-var').nth(1).hover();
  conf(/^fev\/2026 · receita US\$ 40\.000,00 base 01\/10\/2026 \+5,0% 01\/11\/2026: US\$ 42\.000,00 \(\+2\.000,00\)/.test(await txt(page, '#g-var-r .g-tip')), 'tooltip do mês: base, comparado e a diferença', await txt(page, '#g-var-r .g-tip'));
  await foto(page, 'r2_graficos');

  console.log('Mostrar: Receita | COGS | Receita e COGS | Margem');
  conf((await page.$$eval('.cx-sel .g-mets button', l => l.map(b => b.textContent))).join('|') === 'Receita|COGS|Receita e COGS|Margem' && await page.locator('.cx-sel .g-mets button.on[data-gmet="ambos"]').count() === 1, 'seletor com as 4 opções; padrão "Receita e COGS"');
  await page.click('.cx-sel [data-gmet="rec"]');
  T = await lerCx(page);
  cs = await cards(page);
  conf(T.h3.slice(0, 2).join() === 'Receita,Δ%' && !T.h3.includes('COGS') && JSON.stringify(T.ft) === JSON.stringify(celulasTotal(A26, B26, ['r'])) && (await page.$$eval('#g-evo path[data-k]', l => [...new Set(l.map(p => p.dataset.k))])).join() === 'r' && await page.locator('.g-var-box').count() === 1 && cs.map(c => c[0]).join('|') === 'Receita · 01/11/2026|Operações · 01/11/2026', 'só Receita: cards, gráficos e tabela só com a receita', cs.map(c => c[0]));
  await page.click('.cx-sel [data-gmet="cogs"]');
  T = await lerCx(page);
  cs = await cards(page);
  conf(!T.h3.includes('Receita') && JSON.stringify(T.ft) === JSON.stringify(celulasTotal(A26, B26, ['c'])) && cs.map(c => c[0]).join('|') === 'COGS · 01/11/2026|Operações · 01/11/2026' && await page.locator('#g-var-c').count() === 1 && !(await page.locator('#g-var-r').count()), 'só COGS: card, gráficos e tabela só com o COGS', cs.map(c => c[0]));
  await page.click('.cx-sel [data-gmet="mg"]');
  T = await lerCx(page);
  const iFev = h2esp.indexOf('fev/2026') * 2;
  cs = await cards(page);
  conf(T.h3[0] === 'Margem' && JSON.stringify(T.ft) === JSON.stringify(celulasTotal(A26, B26, ['m'])) && T.ft[iFev] === '-1.000,00' && T.ft[iFev + 1] === '+80,0%' && cs.map(c => c[0]).join('|') === 'Margem · 01/11/2026|Operações · 01/11/2026', 'só Margem: card, gráficos e tabela; fev/2026 com margem negativa (−5.000 → −1.000 = +80%)', T.ft.slice(iFev, iFev + 2));
  await page.click('.cx-card [data-gmet="rec"]');
  conf(await page.locator('.cx-sel [data-gmet="rec"].on').count() === 1 && await page.locator('.g-var-box').count() === 1, 'o "Mostrar" também fica em cada gráfico e na tabela (e vale para a aba toda)');
  await page.click('.cx-sel [data-gmet="mg"]');
  await page.click('.tab[data-tab="receita"]');
  await page.waitForSelector('#graf .g-svg');
  const legMg = await page.$$eval('#g-leg span', l => l.map(s => s.textContent));
  const mgFev = await page.$eval('#graf .g-mes[data-i="1"] path[data-mg]', p => [p.dataset.mg, p.getAttribute('fill')]);
  conf(legMg.join('|').startsWith('Margem|Margem negativa') && mgFev[0] === '-1000' && mgFev[1] === '#e34948' && /Margem por mês/.test(await page.textContent('.g-card h2')), 'aba Receita: o gráfico também mostra só a margem, com a negativa em vermelho abaixo do zero', [legMg, mgFev]);
  await page.click('.g-card [data-gmet="cogs"]');
  conf((await page.$$eval('#g-leg span', l => l.map(s => s.textContent))).join('|').startsWith('COGS|Tendência linear do COGS') && (await page.$$eval('#graf .g-mes', l => l.map(g => g.getAttribute('aria-label')))).every(a => /: COGS US\$/.test(a)), 'só COGS no gráfico por mês, com a tendência do COGS');
  await page.click('.g-card [data-gmet="rec"]');
  conf((await page.$$eval('#g-leg span', l => l.map(s => s.textContent))).join('|') === 'Receita realizada|Receita prevista|Tendência linear da receita' && !(await page.locator('#graf path[fill="#eb6834"]').count()), 'só Receita: sem as barras de COGS');
  await page.click('[data-gmodo="cli"]');
  const cliRec = await page.$$eval('.g-cli', l => l.map(g => g.getAttribute('aria-label')));
  conf(cliRec.join(' | ') === 'Petrobras: receita US$ 220.000,00 | Shell: receita US$ 67.000,00', 'por cliente, só receita', cliRec);
  await page.click('.g-card [data-gmet="mg"]');
  const cliMg = await page.$$eval('.g-cli', l => l.map(g => g.getAttribute('aria-label')));
  conf(cliMg.join(' | ') === 'Petrobras: margem US$ 164.000,00 | Shell: margem US$ 19.000,00', 'por cliente, só margem', cliMg);
  await page.click('[data-gmodo="mescli"]');
  const segMg = await page.$$eval('#graf path[data-c]', l => l.map(p => p.dataset.c + '=' + p.dataset.v));
  conf(segMg.includes('Shell=-1000') && segMg.includes('Petrobras=70000'), 'por mês e cliente, margem: a da Shell em fev é negativa', segMg);
  await page.click('[data-gmodo="mes"]');
  await page.click('.g-card [data-gmet="ambos"]');
  conf((await page.$$eval('#g-leg span', l => l.map(s => s.textContent))).join('|') === 'Receita realizada|Receita prevista|COGS|Tendência linear da receita', '"Receita e COGS" volta ao gráfico de antes');
  await page.reload();
  await page.waitForSelector('.kpis');
  conf(await page.locator('.g-card [data-gmet="ambos"].on').count() === 1, 'a escolha fica guardada');

  console.log('Filtros, Agora, trocar a base');
  await page.click('.tab[data-tab="cmp"]');
  await page.selectOption('[data-f="ano"]', '2027');
  T = await lerCx(page);
  conf(JSON.stringify(T.ft) === JSON.stringify(celulasTotal(ano(linhas(V1), '2027'), ano(linhas(V2), '2027'), ['r', 'c'])) && T.ft.slice(-1)[0] === '0,0%', 'Ano 2027: só jan/2027, sem alteração', T.ft);
  await page.selectOption('[data-f="ano"]', '2026');
  await page.selectOption('[data-f="cliente"]', 'Shell');
  cs = await cards(page);
  const sA = A26.filter(x => ['o4', 'o5'].includes(x.k)), sB = B26.filter(x => ['o4', 'o7'].includes(x.k));
  conf(cs[0][1] === 'US$ ' + nf2(tot(sB).r) && cs[0][2] === 'base 01/10/2026: US$ ' + nf2(tot(sA).r), 'filtro de cliente (Shell) vale na comparação', cs[0]);
  await page.click('[data-a="limparf"]');
  await page.selectOption('[data-cmp="base"]', '2026-11-01');
  conf(/Marque pelo menos um registro/.test(await txt(page, '#app')) && !(await chipsOn()).length, 'a base vira 01/11 (que estava em "Comparar com"): pede para marcar um registro');
  await page.check('.cx-chip input[data-cmpsel="agora"]');
  cs = await cards(page);
  conf(cs.slice(0, 3).every(c => c[3] === 'sem alteração'), 'base 01/11 × Agora (os mesmos arquivos): sem alteração', cs.map(c => c[3]));
  await page.uncheck('.cx-chip input[data-cmpsel="agora"]');
  await page.check('.cx-chip input[data-cmpsel="2026-10-01"]');
  cs = await cards(page);
  conf(cs[0][1] === 'US$ ' + nf2(ta.r) && cs[0][3] === fDelta(ta.r - tb.r) + ' (' + fPct(tb.r, ta.r) + ')', 'base 01/11 × 01/10: a comparação ao contrário', cs[0]);
  await page.selectOption('[data-cmp="base"]', '2026-10-01');
  await page.check('.cx-chip input[data-cmpsel="2026-11-01"]');
  console.log('Excel da comparação');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-a="cxExcel"]')]);
  const X = await page.evaluate(b => { const w = XLSX.read(b, {type: 'base64', cellNF: true}), ws = w.Sheets[w.SheetNames[0]]; return {abas: w.SheetNames, aoa: XLSX.utils.sheet_to_json(ws, {header: 1, defval: null})}; }, fs.readFileSync(await dl.path()).toString('base64'));
  const totX = X.aoa[X.aoa.length - 1];
  conf(dl.suggestedFilename() === 'EARL_Gerencial_comparacao_2026-10-01_x_2026-11-01_2026_2026-11-05.xlsx' && X.abas[0] === 'Comparação' && X.aoa[0].slice(0, 8).join() === 'Nível,Cliente,Contrato,Sonda,Poço,Operação,O que mudou,jan/2026' && X.aoa[2].slice(7, 10).join() === 'Base,Comparar,Δ%', 'Excel: cabeçalho em 3 linhas (mês › medida › base, comparar, Δ%)', X.aoa.slice(0, 3).map(l => l.slice(0, 10)));
  conf(totX[0] === 'Total' && Math.abs(totX[totX.length - 8] - ta.r) < 0.01 && Math.abs(totX[totX.length - 7] - tb.r) < 0.01 && Math.abs(totX[totX.length - 5] - Math.round((tb.r - ta.r) / ta.r * 10000) / 100) < 0.01, 'Excel: total com base, comparado e Δ%', totX.slice(-8));

  console.log('Vários registros ao mesmo tempo (01/10 base, 01/11 e 01/12)');
  await carregar(page, 'v3.json', V3);
  await page.waitForTimeout(300);
  await registrar(page, '2026-12-01', 'forecast de dezembro');
  await page.click('.tab[data-tab="cmp"]');
  await page.selectOption('[data-cmp="base"]', '2026-10-01');
  await page.check('.cx-chip input[data-cmpsel="2026-11-01"]');
  await page.check('.cx-chip input[data-cmpsel="2026-12-01"]');
  conf((await chipsOn()).join() === '2026-11-01,2026-12-01', 'base 01/10, comparando com 01/11 e 01/12 ao mesmo tempo');
  const tc = tot(C26);
  cs = await cards(page);
  conf(cs[0][0] === 'Receita · 01/12/2026' && cs[0][1] === 'US$ ' + nf2(tc.r) && cs[0][2] === 'base 01/10/2026: US$ ' + nf2(ta.r) && cs[0][3] === '01/11/2026: US$ ' + nf2(tb.r) + ' · ' + fPct(ta.r, tb.r) && cs[0][4] === '01/12/2026: US$ ' + nf2(tc.r) + ' · ' + fPct(ta.r, tc.r), 'card Receita: a base e cada registro, com a variação sobre a base', cs[0]);
  conf(/^01\/11\/2026: 6 · 1 nova\(s\) · 1 removida\(s\)$/.test(cs[3][3]) && /^01\/12\/2026: 6 · 2 nova\(s\) · 2 removida\(s\)$/.test(cs[3][4]), 'card Operações: novas e removidas em cada registro', cs[3]);
  evo = await lerEvo();
  conf(evo.map(e => e.k).join() === '2026-10-01,2026-11-01,2026-12-01' && evo[2].v.join() === 'r=' + tc.r + ',c=' + tc.c && evo[2].pl.join() === [fPct(ta.r, tc.r), fPct(ta.c, tc.c)].join(), 'evolução com os 3 registros; 01/12 com a variação sobre a base', evo.map(e => [e.k, e.pl]));
  regsC = ['2026-11-01', '2026-12-01'];
  const vr = await lerVar('r');
  conf(JSON.stringify(vr) === JSON.stringify(varEsp('r', [B26, C26])) && (await page.$$eval('#g-leg-var-r span', l => l.map(s => s.textContent))).join() === '01/11/2026,01/12/2026', 'variação % por mês: uma barra para cada registro (legenda 01/11 e 01/12), valores = conta', vr);
  T = await lerCx(page);
  conf(T.h3.slice(0, 8).join() === 'Receita 01/11/26,Δ%,Receita 01/12/26,Δ%,COGS 01/11/26,Δ%,COGS 01/12/26,Δ%' && T.h3.slice(-7).join() === 'Base,01/11/26,Δ US$,Δ%,01/12/26,Δ US$,Δ%', 'tabela: em cada mês o valor e o Δ% de cada registro; no total, a base e cada registro', T.h3);
  const ftN = celulasTotalN(A26, [B26, C26], ['r', 'c']);
  conf(JSON.stringify(T.ft) === JSON.stringify(ftN), 'linha de total com os 3 registros = conta (' + ftN.length + ' células)', {tela: T.ft.slice(-14), esp: ftN.slice(-14)});
  await page.click('[data-cxmostrar="4"]');
  T = await lerCx(page);
  const st3 = Object.fromEntries(T.rows.filter(r => r.cls.includes('mx-op')).map(r => [r.rot, r.sub]));
  conf(st3['05/02/2026 · Squeeze'] === '01/11/26: valor mudou · 01/12/26: removida' && st3['10/09/2026 · Squeeze'] === '01/11/26: — · 01/12/26: nova', 'cada operação diz o que mudou em cada registro', st3);
  await page.click('[data-cxmostrar="1"]');
  await page.click('.cx-sel [data-gmet="cogs"]');
  T = await lerCx(page);
  conf(JSON.stringify(T.ft) === JSON.stringify(celulasTotalN(A26, [B26, C26], ['c'])) && (await cards(page)).map(c => c[0]).join('|') === 'COGS · 01/12/2026|Operações · 01/12/2026', 'só COGS com os 3 registros');
  await page.click('.cx-sel [data-gmet="ambos"]');
  await page.click('[data-a="cmpTodos"]');
  conf((await chipsOn()).join() === '2026-11-01,2026-12-01,agora' && (await lerEvo()).length === 4, '"Todos" marca todos os registros e o Agora');
  const [dlN] = await Promise.all([page.waitForEvent('download'), page.click('[data-a="cxExcel"]')]);
  const XN = await page.evaluate(b => { const w = XLSX.read(b, {type: 'base64'}); return XLSX.utils.sheet_to_json(w.Sheets[w.SheetNames[0]], {header: 1, defval: null}); }, fs.readFileSync(await dlN.path()).toString('base64'));
  conf(XN[2].slice(7, 14).join() === 'Base,01/11/2026,Δ%,01/12/2026,Δ%,Agora,Δ%' && /_x_2026-11-01_2026-12-01_agora_/.test(dlN.suggestedFilename()), 'Excel com os vários registros (base e, para cada um, valor e Δ%)', XN[2].slice(7, 14));
  await foto(page, 'r4_varios');
  await page.uncheck('.cx-chip input[data-cmpsel="agora"]');

  console.log('Remover, exportar, importar, armazenamento cheio');
  const [dlj] = await Promise.all([page.waitForEvent('download'), page.click('[data-a="regExport"]')]);
  const exp = JSON.parse(fs.readFileSync(await dlj.path(), 'utf8'));
  const expPath = path.join(TMP, 'registros.json'); fs.writeFileSync(expPath, JSON.stringify(exp));
  conf(dlj.suggestedFilename() === 'EARL_Gerencial_registros_2026-11-05.json' && exp.tipo === 'EARL-Gerencial-Registros' && exp.registros.length === 3, 'exporta os 3 registros em .json');
  page.once('dialog', d => d.accept());
  await page.click('[data-regdel="2026-10-01"]');
  regs = await page.evaluate(() => JSON.parse(localStorage.getItem('earlger:registros_v1')));
  conf(regs.map(r => r.data).join() === '2026-11-01,2026-12-01' && await page.inputValue('[data-cmp="base"]') === '2026-11-01' && (await chipsOn()).join() === '2026-12-01', 'remove 01/10 (com confirmação); a comparação volta ao padrão: 01/11 × 01/12');
  page.once('dialog', d => d.dismiss());
  await page.click('[data-regdel="2026-11-01"]');
  conf((await page.evaluate(() => JSON.parse(localStorage.getItem('earlger:registros_v1')).length)) === 2, 'cancelar a confirmação não remove');
  await page.setInputFiles('#inReg', expPath);
  await page.waitForTimeout(300);
  regs = await page.evaluate(() => JSON.parse(localStorage.getItem('earlger:registros_v1')));
  conf(regs.map(r => r.data).join() === '2026-10-01,2026-11-01,2026-12-01' && /1 registro\(s\) novo\(s\) · 0 substituído\(s\) por um mais novo · 2 já estava\(m\) aqui/.test(await txt(page, '#msg')), 'importa o .json: volta o 01/10; os outros já estavam', await txt(page, '#msg'));
  await page.reload();
  await page.waitForSelector('.kpis');
  conf((await page.$$eval('.tab', l => l.map(b => b.textContent.trim())))[1] === 'Comparar registros (3)', 'os registros continuam depois de reabrir');
  await page.evaluate(() => { const S0 = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === 'earlger:registros_v1') throw new DOMException('cheio', 'QuotaExceededError'); return S0.call(this, k, v); }; });
  await page.click('.bar [data-a="regAbrir"]');
  await page.fill('#dlg .reg-data', '2026-11-05');
  await page.click('#dlg .reg-ok');
  conf(/armazenamento cheio/.test(await txt(page, '#msg')) && await page.locator('#dlg').count() === 1 && (await page.$$eval('.tab', l => l.map(b => b.textContent.trim())))[1] === 'Comparar registros (3)', 'armazenamento cheio: avisa, a janela fica aberta e nada muda', await txt(page, '#msg'));
  await page.keyboard.press('Escape');

  console.log('Celular');
  await page.click('.tab[data-tab="cmp"]');
  await page.setViewportSize({width: 390, height: 800});
  await page.waitForTimeout(250);
  const larg = await page.evaluate(() => document.documentElement.scrollWidth);
  conf(larg <= 392, 'aba de comparação no celular sem rolagem lateral', larg);
  await foto(page, 'r3_celular');
  conf(errs.length === 0, 'nenhum erro de JavaScript', errs.slice(0, 3));
  await browser.close();
  console.log(`\n${ok} ok, ${falhas} falha(s)`);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
