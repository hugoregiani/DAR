// EARL Engenharia e10 + Gerencial g16: contingência = risco de não acontecer (operação e linhas), câmbio do dólar por
// mês (itens em R$), saldo da sonda no e-mail do handover, Lista "Todas", nome das sondas "NOME PETROBRAS - NOME",
// colunas de contingência/risco nas exportações e cards com profundidade.
// Uso: node tests/e2e_e10.js [EARL_Engenharia.html] [pasta das telas]
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
const valor = s => Number(String(s).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
const perto = (a, b, tol = 0.011) => Math.abs(a - b) <= tol;
const decWord = v => v.replace(/=\?UTF-8\?B\?([^?]+)\?=\s*/g, (_, b) => Buffer.from(b, 'base64').toString('utf8'));
function lerEml(txt) {
  const [cab, ...resto] = txt.split('\r\n\r\n');
  const h = {};
  cab.replace(/\r\n\s+/g, ' ').split('\r\n').forEach(l => { const i = l.indexOf(':'); h[l.slice(0, i).toLowerCase()] = l.slice(i + 1).trim(); });
  const corpo = resto.join('\r\n\r\n');
  const partes = {};
  for (const tipo of ['text/plain', 'text/html']) {
    const i = corpo.indexOf('Content-Type: ' + tipo);
    const ini = corpo.indexOf('\r\n\r\n', i) + 4;
    const fim = corpo.indexOf('\r\n--', ini);
    partes[tipo] = Buffer.from(corpo.slice(ini, fim).replace(/\r\n/g, ''), 'base64').toString('utf8');
  }
  return {h, assunto: decWord(h.subject || ''), texto: partes['text/plain'], html: partes['text/html']};
}
const CT = 'ct_5900_0127108_24';
const RIG = 'hg_rig_11_norbeviii';

(async () => {
  const {browser, page, errs} = await abrir(ARQ, {h: 1000, hoje: '2026-11-12'});
  await page.waitForSelector('.eng2-card', {timeout: 60000});
  console.log('Dados de teste (contrato P&A, sonda NS-32 Norbe VIII)');
  const sap = await page.evaluate(({CT, RIG}) => {
    const d = loadDB();
    const ct = d.contratos.find(c => c.id === CT);
    ct.items.forEach(i => { delete i.usd; delete i.brl; });
    ct.items[0].usd = 100; // 10.1.1 em US$
    ct.items[1].brl = 530; // 10.1.2 em R$
    ct.reajustes = [];
    const q = d.quimicos[0];
    q.usd = 4;
    const ag = new Date().toISOString();
    const base = {loc: 'macae', clienteName: 'Petrobras', contratoLabel: ct.numero, contratoId: CT, rigId: RIG, casing: '', tipoOutro: '', durationDays: 1, salesOrder: '', wbs: '', vida: '', anchor: 'chain', templateId: '', notes: '', equipNeeds: [], chems: [], casingNeeds: [], peopleNeeds: [], status: PJ_STATUS.PLAN, createdAt: ag, updatedAt: ag, log: []};
    d.plannedJobs = [
      {...base, id: 'e10A', well: 'A-1', tipoOp: 'LWO', date: '2026-11-20', baselineDate: '2026-11-20', contingencia: true, riscoRec: 30, risco: 50, ppuNeeds: [{ref: '10.1.1', desc: ct.items[0].desc, unit: ct.items[0].unit, qty: 10}]},
      {...base, id: 'e10B', well: 'B-2', tipoOp: 'LWO', date: '2026-12-10', baselineDate: '2026-12-10', contingencia: false, riscoRec: 0, risco: null, salesOrder: '460111222',
        ppuNeeds: [{ref: '10.1.1', desc: ct.items[0].desc, unit: ct.items[0].unit, qty: 10, cont: true, chance: 40}, {ref: '10.1.2', desc: ct.items[1].desc, unit: ct.items[1].unit, qty: 2}],
        chems: [{sap: q.sap, name: q.nome, unit: q.unid, qty: 10, cont: true, chance: 50}],
        peopleNeeds: [{funcao: 'Tamponeiro', qty: 1, pessoas: pePessoas({qty: 1}, '2026-12-10')}]},
      {...base, id: 'e10C', well: 'C-3', tipoOp: 'LWO', date: '2026-10-05', baselineDate: '2026-10-05', contingencia: false, riscoRec: 0, risco: null,
        ppuNeeds: [{ref: '10.1.2', desc: ct.items[1].desc, unit: ct.items[1].unit, qty: 1}],
        ppuCons: {data: '2026-10-05', linhas: [{ref: '10.1.2', desc: ct.items[1].desc, unit: ct.items[1].unit, qty: 1}], quim: [], cas: [], pes: [], em: ag, por: 'Teste'}}
    ];
    d.cambio = [{ano: 2026, mes: 10, valor: 5}, {ano: 2026, mes: 12, valor: 5.3}];
    d.invSondas = [{id: 'inv1', rigId: RIG, sonda: 'NS-32', ctId: CT, data: '2026-11-01', por: 'Teste', obs: '', itens: [{sap: q.sap, nome: q.nome, unid: q.unid, qtd: 7}], criadoEm: ag, atualizadoEm: ag}];
    d.hoMail = {...(d.hoMail || {}), nome: 'Teste e10'};
    saveDB(d);
    return {sap: q.sap, cogs: q.usd};
  }, {CT, RIG});
  await page.reload();
  await page.waitForSelector('.eng2-card');
  await page.waitForFunction(() => typeof window.engGerDados === 'function');
  // a migração roda ao abrir (no banco em memória; o navegador grava na próxima alteração)
  const jA = await page.evaluate(() => loadDB().plannedJobs.find(j => j.id === 'e10A'));
  conf(jA.risco === 70 && jA.riscoRec === 30, 'migração: contingência com chance antiga 50% passa a ter chance = 100 − risco de não acontecer (30%) = 70', [jA.risco, jA.riscoRec]);
  const pac = () => page.evaluate(() => { const p = window.engGerDados().pacote; return {cambio: p.cambio, ops: Object.fromEntries(p.operacoes.map(o => [o.id, o]))}; });
  let P = await pac();
  const oA = P.ops.e10A, oB = P.ops.e10B, oC = P.ops.e10C;
  conf(oA && oA.risco === 30 && oA.contingencia && perto(oA.previsto.receita.usd, 1000), 'operação em contingência: risco 30% vai para o Gerencial; previsto bruto US$ 1.000', oA && {r: oA.risco, rec: oA.previsto.receita});
  const lX = oB.previsto.ppu.find(l => l.ref === '10.1.1'), lY = oB.previsto.ppu.find(l => l.ref === '10.1.2');
  conf(lX.risco === 60 && !lY.risco && perto(lY.valorUsd, 200) && lY.cambio === 5.3, 'linha em contingência com chance 40% = risco 60%; item em R$ 2 × R$ 530 ÷ 5,30 (câmbio de dez) = US$ 200', {lX, lY});
  conf(perto(oB.previsto.receita.usd, 600), 'previsto da operação: 1.000 × (1 − 60%) + 200 = US$ 600', oB.previsto.receita);
  conf(perto(oB.previsto.cogs.usd, 10 * sap.cogs * 0.5) && oB.previsto.quimicas[0].risco === 50, 'COGS da química em contingência (risco 50%): 10 × US$ 4 × 0,5 = US$ 20', oB.previsto.cogs);
  conf(perto(oC.receita.usd, 106) && oC.realizado.ppu[0].cambio === 5, 'concluída em out/2026: R$ 530 ÷ 5,00 (câmbio de out) = US$ 106', oC.receita);
  conf(P.cambio.length === 2 && P.cambio[1].valor === 5.3, 'arquivo do gerencial leva a tabela do câmbio', P.cambio);

  console.log('Receita e margem (Gerencial embutido) e cards');
  const gerF = async () => { await page.waitForSelector('.ec-ger-frame'); const f = await (await page.$('.ec-ger-frame')).contentFrame(); await f.waitForSelector('.kpis'); return f; };
  let fg = await gerF();
  await fg.selectOption('[data-f="ano"]', '2026');
  conf(perto(valor(await fg.textContent('.k-rec-usd b')), 700 + 600 + 106), '2026: 1.000 × 70% + 600 + 106 = US$ 1.406', await fg.textContent('.k-rec-usd b'));
  const est = await fg.evaluate(() => { const k = document.querySelector('.kpis .kpi.k-cogs'), r = document.querySelector('.kpis .kpi.dest'); const ck = getComputedStyle(k), cr = getComputedStyle(r); return {sk: ck.boxShadow, rad: ck.borderTopLeftRadius, bg: ck.backgroundImage, sr: cr.boxShadow, u: !!document.querySelector('.k-rec-usd b small.u'), ordem: getComputedStyle(k.querySelector('b')).order, qs: getComputedStyle(document.querySelector('.qc')).boxShadow}; });
  conf(/rgba/.test(est.sk) && est.rad === '22px' && /linear-gradient/.test(est.bg) && /rgba\(204, 0, 0/.test(est.sr) && est.u && est.ordem === '-1' && /rgba/.test(est.qs), 'cards com profundidade: sombra, cantos de 22px, degradê, destaque vermelho com brilho, número grande em cima e “US$” pequeno', est);
  await foto(page, 'e10_1_receita');

  console.log('Lista: horizonte "Todas" e nome das sondas');
  await page.click('.eng2-card:has-text("P&A — Macaé")');
  await page.click('.db-tab:has-text("Lista")');
  await page.waitForTimeout(150);
  const n15 = await page.locator('table.db-table tbody tr').count();
  await page.click('.eng-lista-todas');
  await page.waitForTimeout(150);
  const linhas = await page.locator('table.db-table tbody tr').allInnerTexts();
  conf(n15 === 1 && linhas.length === 3 && /05\/10\/2026|2026-10-05/.test(await page.locator('table.db-table tbody tr').first().locator('input[type=date]').inputValue().then(v => v === '2026-10-05' ? '2026-10-05' : v)), '15 dias: 1 operação; “Todas”: as 3, por data (a de out/2026 primeiro)', [n15, linhas.length]);
  conf(linhas.every(t => /NS-32 - Norbe VIII/.test(t)), 'coluna Sonda: “NS-32 - Norbe VIII”', linhas[0].slice(0, 120));
  const contPill = linhas.find(t => /A-1/.test(t)) || '';
  conf(/Conting[eê]ncia · risco 30%/i.test(contPill), 'selo da contingência mostra o risco de não acontecer (30%)', contPill.replace(/\s+/g, ' ').slice(0, 200));
  await foto(page, 'e10_2_lista');

  console.log('Operação em contingência: risco de não acontecer');
  await page.locator('table.db-table tbody tr', {hasText: 'A-1'}).locator('button:has-text("Editar")').click();
  await page.waitForSelector('.eng-modal');
  const opts = await page.locator('.eng-modal .fld').filter({has: page.locator('label', {hasText: 'Sonda'})}).first().locator('select option').allInnerTexts();
  conf(opts.includes('NS-32 - Norbe VIII') && opts.includes('Ensco 6002'), 'seletor de sonda: “NS-32 - Norbe VIII”; sem nome Petrobras, só o nome (Ensco 6002)', opts.slice(0, 6));
  conf(await page.inputValue('.ec-cont-risco-in') === '30' && /Risco de n[ãa]o acontecer/.test(await page.innerText('.ec-cont-risco')) && !(await page.locator('.ec-risco-fld').count()), 'contingência: “Risco de não acontecer” = 30% (o mesmo do risco da receita/COGS, sem campo repetido)');
  await page.fill('.ec-cont-risco-in', '100');
  conf(/mapeada/.test(await page.innerText('.ec-cont-risco .eng-help')), '100%: explica que fica mapeada, mas fora da contagem');
  await foto(page, 'e10_3_contingencia');
  await page.click('.eng-modal button:text-is("Salvar")');
  await page.waitForSelector('.eng-modal', {state: 'detached'});
  const jA2 = await page.evaluate(() => JSON.parse(localStorage.getItem('hal_cmt_db_v1')).plannedJobs.find(j => j.id === 'e10A'));
  conf(jA2.riscoRec === 100 && jA2.risco === 0 && jA2.contingencia, 'salvo: risco 100% (chance 0%)', [jA2.riscoRec, jA2.risco]);

  console.log('Linha em contingência: risco de não acontecer');
  await page.locator('table.db-table tbody tr', {hasText: 'B-2'}).locator('button:has-text("Editar")').click();
  await page.waitForSelector('.eng-modal');
  const rpPpu = page.locator('.eng-modal .rp').filter({has: page.locator('.rp-t', {hasText: 'Itens PPU'})});
  conf(await rpPpu.locator('.rp-chance').first().inputValue() === '60' && /risco/i.test(await rpPpu.locator('.rp-cont-h').innerText()), 'linha PPU: coluna “Contingência · risco” mostra 60% (chance 40%)');
  await rpPpu.locator('.rp-chance').first().fill('20');
  await page.click('.eng-modal button:text-is("Salvar")');
  await page.waitForSelector('.eng-modal', {state: 'detached'});
  const jB = await page.evaluate(() => JSON.parse(localStorage.getItem('hal_cmt_db_v1')).plannedJobs.find(j => j.id === 'e10B'));
  conf(Number(jB.ppuNeeds[0].chance) === 80, 'salvo: risco 20% = chance 80%', jB.ppuNeeds[0]);
  P = await pac();
  conf(perto(P.ops.e10B.previsto.receita.usd, 800 + 200) && P.ops.e10B.previsto.ppu[0].risco === 20, 'previsto: 1.000 × 80% + 200 = US$ 1.000', P.ops.e10B.previsto.receita);

  console.log('Câmbio do dólar por mês');
  await page.click('.eng-tools button:has-text("Câmbio")');
  await page.waitForSelector('.ec-cb-modal');
  conf(await page.locator('.ec-cb-tab tbody tr').count() === 2 && /contrato\(s\) com valores em R\$: P&A/.test(await page.innerText('.ec-cb-cts')), 'tabela com os 2 meses e o contrato P&A com valores em R$');
  await page.locator('.ec-cb-valor').nth(1).fill('5,00');
  await page.click('.ec-cb-mais');
  await page.locator('.ec-cb-valor').nth(2).fill('abc');
  await page.click('.ec-cb-salvar');
  conf(/valor inválido/.test(await page.innerText('.ec-cb-erro')), 'valor inválido não salva');
  await page.locator('.ec-cb-valor').nth(2).fill('5,1234');
  await foto(page, 'e10_4_cambio');
  await page.click('.ec-cb-salvar');
  await page.waitForSelector('.ec-cb-modal', {state: 'detached'});
  const cb = await page.evaluate(() => JSON.parse(localStorage.getItem('hal_cmt_db_v1')).cambio.map(c => [c.ano, c.mes, c.valor]));
  conf(JSON.stringify(cb) === JSON.stringify([[2026, 10, 5], [2026, 12, 5], [2027, 1, 5.1234]]), 'salvo: out/2026 5,00 · dez/2026 5,00 · jan/2027 5,1234', cb);
  P = await pac();
  conf(perto(P.ops.e10B.previsto.ppu[1].valorUsd, 212), 'item em R$ com o câmbio novo de dez: 2 × 530 ÷ 5,00 = US$ 212', P.ops.e10B.previsto.ppu[1]);
  await page.click('.nav-back-btn');
  fg = await gerF();
  await fg.selectOption('[data-f="ano"]', '2026');
  conf(perto(valor(await fg.textContent('.k-rec-usd b')), 0 + 800 + 212 + 106), 'Receita e margem 2026: A fora (risco 100%) + 1.012 + 106 = US$ 1.118', await fg.textContent('.k-rec-usd b'));
  await page.click('.eng2-card:has-text("P&A — Macaé")');
  await page.click('.db-tab:has-text("Consumo e receita")');
  await page.waitForSelector('.ec-kpi-usd');
  conf(perto(valor(await page.innerText('.ec-kpi-usd b')), 106) && /câmbio do mês/.test(await page.innerText('.ec-kpi-usd em')) && await page.innerText('.ec-kpi-brl b') === 'R$ 530,00', 'Consumo e receita: R$ 530,00 e US$ 106,00 (R$ pelo câmbio do mês)', [await page.innerText('.ec-kpi-usd'), await page.innerText('.ec-kpi-brl b')]);
  await foto(page, 'e10_5_consumo');

  console.log('Exportações');
  await page.click('.eng-tools button:has-text("Exportar planilhas")');
  await page.waitForSelector('.ei-exp-modal');
  const [dq] = await Promise.all([page.waitForEvent('download'), page.click('.ei-exp-quim .ei-exp-btn')]);
  const xq = await page.evaluate(b => { const w = XLSX.read(b, {type: 'base64'}); return XLSX.utils.sheet_to_json(w.Sheets[w.SheetNames[0]], {header: 1}); }, fs.readFileSync(await dq.path()).toString('base64'));
  const cab = xq[0], iC = cab.indexOf('Contingência (linha)'), iR = cab.indexOf('Risco da linha (%)'), iS = cab.indexOf('SAP'), iQ = cab.indexOf('Qtd. prevista'), iRo = cab.indexOf('Risco (%)'), iCo = cab.indexOf('Contingência');
  const lq = xq.find(r => String(r[iS]) === String(sap.sap));
  conf(iC > 0 && iR > 0 && lq && lq[iC] === 'Sim' && lq[iR] === 50 && lq[iQ] === 10, 'químicos: colunas “Contingência (linha)” e “Risco da linha (%)” (Sim · 50) e a quantidade planejada (10)', lq);
  const lA = xq.find(r => r[cab.indexOf('ID da operação')] === 'e10A');
  conf(lA && lA[iCo] === 'Sim' && lA[iRo] === 100, 'operação: Contingência = Sim e Risco (%) = 100', lA && [lA[iCo], lA[iRo]]);
  const [dp] = await Promise.all([page.waitForEvent('download'), page.click('.ei-exp-pes .ei-exp-btn')]);
  const xp = await page.evaluate(b => { const w = XLSX.read(b, {type: 'base64'}); return XLSX.utils.sheet_to_json(w.Sheets[w.SheetNames[0]], {header: 1}); }, fs.readFileSync(await dp.path()).toString('base64'));
  conf(xp[0].includes('Risco da linha (%)') && xp[0].includes('Contingência (linha)'), 'pessoal: também com a contingência e o risco da linha');
  await page.click('.ei-exp-modal .modal-close');

  console.log('Handover: saldo da sonda no e-mail');
  await page.click('.db-tab:has-text("Lista")');
  await page.click('.eng-lista-todas');
  await page.locator('table.db-table tbody tr', {hasText: 'B-2'}).locator('button:has-text("Editar")').click();
  await page.waitForSelector('.eng-modal');
  await page.click('.eng-modal button:has-text("Enviar Handover")');
  await page.waitForSelector('.modal-title:has-text("Enviar Handover")');
  await page.click('button:has-text("Continuar →")');
  await page.waitForSelector('.ho-modal');
  const hoTxt = await page.innerText('.ho-modal');
  conf(/Invent[aá]rio das sondas, contagem de 01\/11\/2026/.test(hoTxt), 'janela do handover: “a bordo” lido da contagem do Inventário das sondas', hoTxt.split('\n').find(l => /bordo/i.test(l)));
  await page.click('.ho-modal button:has-text("Continuar para o e-mail")');
  await page.waitForSelector('.hm-modal');
  const assunto = await page.innerText('.hm-assunto');
  conf(/^HANDOVER - NS-32 - NORBE VIII - LWO/.test(assunto), 'assunto com a sonda “NS-32 - NORBE VIII”', assunto);
  await page.fill('.hm-novo', 'teste@halliburton.com');
  await page.click('.hm-add button:has-text("＋ Para")');
  const [de] = await Promise.all([page.waitForEvent('download'), page.click('.hm-gerar')]);
  const m = lerEml(fs.readFileSync(await de.path(), 'utf8'));
  const tabQ = (m.html.split('Químicas (1)')[1] || '').split('</table>')[0];
  conf(/Saldo na sonda/.test(tabQ) && />7</.test(tabQ), 'e-mail: tabela de químicas com a coluna “Saldo na sonda” (7, da contagem de 01/11/2026)', tabQ.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 300));
  conf(/Inventário das sondas, contagem de 01\/11\/2026/.test(m.html) && /saldo na sonda 7/.test(m.texto), 'e-mail diz de onde vem o saldo (contagem de 01/11/2026) e o texto simples também traz', m.texto.split('\n').find(l => /saldo na sonda/.test(l)));
  conf(/Contingência · risco 50%/.test(m.html) && /Contingência · risco 20%/.test(m.html), 'linhas em contingência no e-mail com o risco de não acontecer (químico 50%, item PPU 20%)');
  conf(/Sonda<\/td><td[^>]*>NS-32 - Norbe VIII/.test(m.html), 'identificação: Sonda “NS-32 - Norbe VIII”');
  await foto(page, 'e10_6_email');

  conf(errs.length === 0, 'nenhum erro no app', errs.slice(0, 5));
  await browser.close();
  console.log(`\n${ok} ok, ${falhas} falha(s)`);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
