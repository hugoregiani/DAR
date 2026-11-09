// Teste de ponta a ponta da página inicial da Engenharia (e8):
// - a seção "Receita e margem" é a do EARL Gerencial, embutida (quadro), com os dados desta Engenharia: cartões,
//   cartões dos quartos, gráfico, matriz, filtros do Gerencial, vários quartos com prévia, Excel da tabela, altura do
//   quadro e atualização na hora quando os dados mudam;
// - o botão "⋯" do card do contrato: Arquivar e Apagar (sem operações; com operações só digitando APAGAR, levando
//   operações e handovers), e o contrato apagado não volta ao reabrir (a semente do EARL recria pelo número).
// Uso: node tests/e2e_painel.js [EARL_Engenharia.html] [pasta para as telas]
const {abrir} = require('./harness');
const fs = require('fs');
const path = require('path');
const ARQ = process.argv[2] || path.join(__dirname, '..', 'EARL_Engenharia.html');
const SHOTS = process.argv[3] || '';
let ok = 0, falhas = 0;
const conf = (cond, msg, extra) => {
  if (cond) { ok++; console.log('  ✓ ' + msg); } else { falhas++; console.log('  ✗ ' + msg + (extra !== undefined ? ' → ' + JSON.stringify(extra).slice(0, 600) : '')); }
};
const foto = async (page, nome) => { if (SHOTS) await page.screenshot({path: path.join(SHOTS, nome + '.png')}); };
const txt = async (page, sel) => (await page.innerText(sel)).replace(/\s+/g, ' ').trim();
const PA = 'ct_5900_0127108_24', TK = 'ct_takatsugu_j', LAND = 'ct_5900_0131678_25_2';
const db = page => page.evaluate(() => JSON.parse(localStorage.getItem('hal_cmt_db_v1')));

(async () => {
  const {browser, page, errs} = await abrir(ARQ, {h: 1000, hoje: '2026-11-09'});
  await page.waitForSelector('.eng2-card', {timeout: 60000});

  console.log('Preparação: P&A com 2 operações (uma com handover) e Takatsugu J com 1, com valores em US$');
  await page.evaluate(([PA, TK]) => {
    const d = JSON.parse(JSON.stringify(EARL_DB_REF));
    const rig = n => d.rigs.find(r => r.name === n).id;
    const ct = id => d.contratos.find(c => c.id === id);
    ct(PA).items = [{ref: 'X1', desc: 'Taxa de cimentação', unit: 'dia', saldoIni: 100, usd: 1000, brl: 5000}];
    ct(TK).items = [{ref: 'T1', desc: 'Taxa', unit: 'dia', saldoIni: 50, usd: 750}];
    const op = (id, ctId, rigNome, date, ppu, extra) => Object.assign({id, loc: 'macae', clienteName: ct(ctId).clientName, contratoLabel: ct(ctId).numero, contratoId: ctId, rigId: rig(rigNome), well: 'P-' + id, tipoOp: 'Abandono', tipoOutro: '', casing: '', date, baselineDate: date, durationDays: 2, salesOrder: '', wbs: '', vida: '', anchor: 'fixed', contingencia: false, risco: null, riscoRec: 0, templateId: '', notes: '', equipNeeds: [], chems: [], ppuNeeds: ppu, casingNeeds: [], peopleNeeds: [], status: 'PLANEJADA', createdAt: '2026-11-01T12:00:00.000Z', updatedAt: '2026-11-01T12:00:00.000Z', log: []}, extra);
    d.plannedJobs = [
      op('opA', PA, 'Norbe VIII', '2026-12-05', [{ref: 'X1', desc: 'Taxa de cimentação', unit: 'dia', qty: 2}], {handoverId: 'ho1'}),
      op('opB', PA, 'Norbe VIII', '2027-02-10', [{ref: 'X1', desc: 'Taxa de cimentação', unit: 'dia', qty: 3}]),
      op('opT', TK, 'Takatsugu J', '2026-12-20', [{ref: 'T1', desc: 'Taxa', unit: 'dia', qty: 2}]),
    ];
    d.handovers = [{id: 'ho1', opIds: ['opA'], status: 'email', versao: 1, criadoEm: '2026-11-02T12:00:00.000Z'}];
    localStorage.setItem('hal_cmt_db_v1', JSON.stringify(d));
  }, [PA, TK]);
  await page.reload();
  await page.waitForSelector('.eng2-card', {timeout: 60000});

  console.log('Seção "Receita e margem" (a do Gerencial)');
  const gf = async () => { const h = await page.waitForSelector('.ec-ger-frame'); const f = await h.contentFrame(); await f.waitForSelector('.kpis', {timeout: 30000}); return f; };
  let fg = await gf();
  const k = async c => (await fg.textContent('.' + c + ' b')).trim();
  conf(await k('k-rec-usd') === 'US$ 3.500,00' && await k('k-ops') === '2' && /realizado US\$ 0,00 · previsto US\$ 3.500,00/.test(await fg.textContent('.k-rec-usd em')), '2026: P&A US$ 2.000 + Takatsugu US$ 1.500 (previstos)', await k('k-rec-usd'));
  conf(await fg.locator('.qc').count() === 5 && (await fg.textContent('.qc[data-q="4"] b')).trim() === 'US$ 3.500,00' && await fg.locator('#graf .g-svg').count() === 1 && await fg.locator('.t-mx').count() === 1, 'cartões dos quartos, gráfico e matriz');
  const alt = await fg.evaluate(() => [Math.ceil(document.body.getBoundingClientRect().height), window.innerHeight]);
  conf(Math.abs(alt[0] - alt[1]) <= 2, 'o quadro tem a altura do conteúdo (sem rolagem dentro dele)', alt);
  await fg.selectOption('[data-f="ano"]', '2027');
  conf(await k('k-rec-usd') === 'US$ 3.000,00' && await k('k-ops') === '1', '2027: a operação de fevereiro do P&A (3 × US$ 1.000)');
  await fg.selectOption('[data-f="ano"]', '2026');
  await foto(page, 'p1_secao');
  // vários quartos com prévia
  await fg.click('.q-box'); await fg.click('[data-qb="2"]'); await fg.hover('[data-qb="3"]');
  const pv = await fg.$$eval('.q-grid .q-b', l => l.map(b => (b.classList.contains('pv-ponta') ? 'P' : b.classList.contains('pv') ? 'p' : '-')).join(''));
  await foto(page, 'p2_previa');
  await fg.click('[data-qb="3"]');
  conf(pv === '-PP-' && await k('k-rec-usd') === 'US$ 0,00' && /Q2 – Q3/.test(await fg.textContent('.q-box')), 'Q2 e Q3: prévia ao passar o cursor e nenhuma receita (as operações são em dezembro)', pv);
  await fg.click('.qc[data-q="4"]', {modifiers: ['Shift']});
  conf(/Q2 – Q4/.test(await fg.textContent('.q-box')) && await k('k-rec-usd') === 'US$ 3.500,00', 'Shift+clique no card Q4: Q2–Q4');
  await fg.click('[data-a="limparf"]');
  // Excel da tabela (baixa de dentro do quadro)
  const [dl] = await Promise.all([page.waitForEvent('download'), fg.click('[data-a="mxExcel"]')]);
  conf(/^EARL_Gerencial_receita_2026_2026-11-09\.xlsx$/.test(dl.suggestedFilename()), '"⬇ Excel desta tabela" baixa de dentro da seção', dl.suggestedFilename());

  console.log('Card do contrato: Arquivar (a seção atualiza na hora)');
  const card = nome => page.locator('.eng2-card').filter({has: page.locator('.eng2-name', {hasText: nome})});
  conf(await card('Takatsugu J').locator('.eng2-menu-b').count() === 1 && await page.locator('.eng2-card.eng2-hero .eng2-menu-b').count() === 0, 'botão ⋯ nos cards dos contratos (não no da Visão geral)');
  await card('Takatsugu J').hover();
  await card('Takatsugu J').locator('.eng2-menu-b').click();
  await foto(page, 'p3_menu');
  conf((await txt(page, '.eng2-menu-pop')) === '🗄 Arquivar 🗑 Apagar…', 'menu: Arquivar e Apagar…', await txt(page, '.eng2-menu-pop'));
  await page.click('.eng2-menu-arq');
  conf(/Para voltar: Contratos → “Mostrar arquivados”/.test(await page.innerText('body')), 'confirmação explica como voltar');
  await page.click('.overlay button.btn-r:has-text("Arquivar")');
  await page.waitForFunction(() => !document.querySelector('.eng2-menu-pop'));
  conf(!(await card('Takatsugu J').count()), 'card do Takatsugu J sai da página inicial');
  let d = await db(page);
  conf(d.contratos.find(c => c.id === TK).archived === true && d.plannedJobs.some(j => j.id === 'opT'), 'contrato arquivado; a operação continua guardada');
  await fg.waitForFunction(() => document.querySelector('.k-rec-usd b').textContent.trim() === 'US$ 2.000,00', null, {timeout: 10000}).catch(() => {});
  conf(await k('k-rec-usd') === 'US$ 2.000,00' && await k('k-ops') === '1', 'a seção Receita e margem atualiza na hora: sem o Takatsugu (US$ 2.000)', await k('k-rec-usd'));
  await page.click('.eng-tools button:has-text("Contratos")');
  await page.waitForSelector('.ec-lista');
  await page.locator('.ec-ck', {hasText: 'arquivados'}).locator('input').check();
  conf(await page.locator('.ec-lista .ec-row', {hasText: 'Takatsugu J'}).count() === 1, 'aparece em Contratos → arquivados');
  await page.click('.ec-modal .modal-close');

  console.log('Apagar contrato sem operações (PBR Land)');
  await card('PBR Land').hover();
  await card('PBR Land').locator('.eng2-menu-b').click();
  await page.click('.eng2-menu-apagar');
  conf(/Ele não tem operações/.test(await page.innerText('body')) && !(await page.locator('.overlay textarea').count()), 'sem operações: confirmação simples');
  await page.click('.overlay button.btn-r:has-text("Apagar contrato")');
  await page.waitForTimeout(200);
  d = await db(page);
  conf(!(await card('PBR Land').count()) && !d.contratos.some(c => c.id === LAND) && d.ctApagados.some(x => x.id === LAND), 'PBR Land apagado (e anotado para não voltar)');

  console.log('Apagar contrato com operações (P&A): só digitando APAGAR');
  await card('P&A — Macaé').hover();
  await card('P&A — Macaé').locator('.eng2-menu-b').click();
  await page.click('.eng2-menu-apagar');
  const msg = await page.innerText('.overlay');
  conf(/e as 2 operação\(ões\) dele \(1 com handover\)/.test(msg) && /digite APAGAR/.test(msg) && await page.isDisabled('.overlay button.btn-r'), 'mostra as 2 operações (1 com handover) e pede APAGAR (botão travado vazio)', msg.slice(0, 300));
  await foto(page, 'p4_apagar');
  await page.fill('.overlay textarea', 'apagar não');
  await page.click('.overlay button.btn-r');
  await page.waitForTimeout(200);
  d = await db(page);
  conf(d.contratos.some(c => c.id === PA) && /para confirmar, digite APAGAR/.test(await page.innerText('body')), 'texto errado: não apaga e avisa');
  await card('P&A — Macaé').locator('.eng2-menu-b').click();
  await page.click('.eng2-menu-apagar');
  await page.fill('.overlay textarea', 'APAGAR');
  await page.click('.overlay button.btn-r');
  await page.waitForTimeout(300);
  d = await db(page);
  conf(!d.contratos.some(c => c.id === PA) && !d.plannedJobs.some(j => j.id === 'opA' || j.id === 'opB') && d.plannedJobs.some(j => j.id === 'opT') && !d.handovers.some(h => h.id === 'ho1'), 'P&A apagado com as 2 operações e o handover; a operação do Takatsugu fica', {cts: d.contratos.length, ops: d.plannedJobs.map(j => j.id)});
  await fg.waitForFunction(() => document.querySelector('.k-rec-usd b') && document.querySelector('.k-rec-usd b').textContent.trim() === 'US$ 0,00', null, {timeout: 10000}).catch(() => {});
  conf(await k('k-rec-usd') === 'US$ 0,00', 'a seção atualiza: sem receita (P&A apagado, Takatsugu arquivado)', await k('k-rec-usd'));

  console.log('Reabrir: os apagados não voltam (a semente recria pelo número)');
  await page.reload();
  await page.waitForSelector('.eng2-card', {timeout: 60000});
  d = await db(page);
  const nomes = await page.$$eval('.eng2-card .eng2-name', l => l.map(e => e.textContent));
  conf(!d.contratos.some(c => c.id === PA || c.id === LAND) && !nomes.some(n => /P&A — Macaé|PBR Land/.test(n)), 'depois de reabrir, P&A e PBR Land continuam apagados', nomes);
  const bk = await page.evaluate(() => JSON.parse(localStorage.getItem('hal_cmt_db_v1')).ctApagados.map(x => x.id));
  conf(bk.includes(PA) && bk.includes(LAND), 'a lista de apagados vai junto no "⬇ Exportar dados" (está no banco)');

  conf(errs.length === 0, 'nenhum erro de JavaScript', errs.slice(0, 3));
  console.log(`\n${ok} ok, ${falhas} falha(s)`);
  await browser.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
