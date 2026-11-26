// e18 (pedido do Hugo, 26/11/2026):
// 1. operação nova com data anterior a hoje;
// 2. a janela da operação (e as que abrem a partir dela) só fecha pelos botões, não ao clicar fora;
// 3. COGS do Cimento Classe G (SAP 100003685) = US$ 7,77/sk em todos os arquivos (corrige uma vez, ao abrir);
// 4. sem a pílula "Consumo e receita" dentro dos contratos.
// Uso: node tests/e2e_e18.js [EARL_Engenharia.html]
const {abrir} = require('./harness');
const {montar} = require('../walkthrough/demo');
const path = require('path');
const ARQ = path.resolve(process.argv[2] || path.join(__dirname, '..', 'EARL_Engenharia.html'));
let ok = 0, falhas = 0;
const conf = (c, msg, extra) => { if (c) { ok++; console.log('  ✓ ' + msg); } else { falhas++; console.log('  ✗ ' + msg + (extra !== undefined ? ' → ' + JSON.stringify(extra).slice(0, 600) : '')); } };
const fld = (p, rot) => p.locator('.eng-modal .fld').filter({has: p.locator('label', {hasText: rot})}).first();
const cim = p => p.evaluate(() => { const d = loadDB(); const q = (d.quimicos || []).find(x => String(x.sap) === '100003685'); return {usd: q && q.usd, flag: d.cogsCimentoGV1 || null, hist: (d.quimHist || []).filter(h => h.id === 'qh_e18_cimento_g').map(h => h.arquivo)}; });

(async () => {
  const E = await abrir(ARQ, {hoje: '2026-11-26', h: 1000});
  const p = E.page;
  await p.waitForSelector('.eng2-card', {timeout: 90000});
  await montar(p);
  await p.waitForSelector('.eng2-card');

  /* ---------------------------------------------------------------- 3. Cimento Classe G */
  console.log('3. COGS do Cimento Classe G = US$ 7,77/sk');
  let c = await cim(p);
  conf(c.usd === 7.77 && c.flag && c.flag.para === 7.77, 'banco de químicos: Cimento Classe G (100003685) = US$ 7,77/sk', c);
  // um arquivo antigo, com outro valor e sem a correção: ao abrir, vira 7,77 (uma vez) e entra no histórico
  await p.evaluate(() => { const d = loadDB(); d.quimicos.find(x => String(x.sap) === '100003685').usd = 13.15; delete d.cogsCimentoGV1; saveDB(d); });
  await p.reload(); await p.waitForSelector('.eng2-card', {timeout: 90000});
  c = await cim(p);
  conf(c.usd === 7.77 && c.flag.de === 13.15 && c.hist.length === 1 && /US\$ 13.15 → US\$ 7,77\/sk/.test(c.hist[0]), 'arquivo antigo (US$ 13,15): ao abrir, corrige para US$ 7,77 e registra no histórico do banco', c);
  // abrir de novo não repete a correção; um valor mudado depois pela pessoa fica como ela deixou
  await p.evaluate(() => { const d = loadDB(); d.quimicos.find(x => String(x.sap) === '100003685').usd = 8; saveDB(d); });
  await p.reload(); await p.waitForSelector('.eng2-card', {timeout: 90000});
  c = await cim(p);
  conf(c.usd === 8 && c.hist.length === 1, 'depois da correção, um valor mudado pela pessoa (US$ 8,00) não é trocado de novo', c);
  await p.evaluate(() => { const d = loadDB(); d.quimicos.find(x => String(x.sap) === '100003685').usd = 7.77; saveDB(d); });
  await p.reload(); await p.waitForSelector('.eng2-card', {timeout: 90000});
  // arquivo sem o cimento no banco: entra com US$ 7,77
  await p.evaluate(() => { const d = loadDB(); d.quimicos = d.quimicos.filter(x => String(x.sap) !== '100003685'); delete d.cogsCimentoGV1; saveDB(d); });
  await p.reload(); await p.waitForSelector('.eng2-card', {timeout: 90000});
  c = await cim(p);
  conf(c.usd === 7.77 && c.flag.de === null, 'arquivo sem o cimento no banco: entra com US$ 7,77', c);
  // COGS de uma operação com 10 sk de cimento: US$ 77,70 na janela da operação
  const op = await p.evaluate(() => { const d = loadDB(); const at = new Set(d.contratos.filter(c => !c.archived).map(c => c.id)); const j = d.plannedJobs.find(x => at.has(x.contratoId) && x.well && !x.ppuCons && !x.concluida && d.plannedJobs.filter(y => y.well === x.well).length === 1); j.chems = [{sap: '100003685', name: 'CIMENTO CLASS G', unit: 'SK', qty: 10}]; j.casingNeeds = []; j.riscoRec = 0; j.contingencia = false; saveDB(d); return j.well; });
  await p.reload(); await p.waitForSelector('.eng2-card', {timeout: 90000});

  /* ---------------------------------------------------------------- 4. sem a pílula "Consumo e receita" */
  console.log('4. Sem a pílula "Consumo e receita"');
  await p.click('.eng2-card:has-text("P&A")');
  await p.waitForSelector('.db-tab');
  let abas = await p.$$eval('.db-tab', l => l.map(x => x.textContent.trim()));
  conf(!abas.includes('Consumo e receita') && abas.includes('Gantt') && abas.includes('Lista') && abas.includes('Inventário das sondas'), 'no contrato: Gantt, Calendário, Lista, Handovers, Inventário das sondas (sem Consumo e receita)', abas);
  await p.click('.nav-back-btn');
  await p.click('.eng2-card.eng2-hero');
  await p.waitForSelector('.db-tab');
  abas = await p.$$eval('.db-tab', l => l.map(x => x.textContent.trim()));
  conf(!abas.includes('Consumo e receita'), 'na Visão geral também não aparece', abas);

  /* ---------------------------------------------------------------- 2. a janela só fecha pelos botões */
  console.log('2. A janela da operação só fecha pelos botões');
  await p.click('.db-tab:has-text("Lista")');
  await p.click('.eng-lista-todas').catch(() => {});
  await p.locator('table.db-table tbody tr', {hasText: op}).first().locator('button', {hasText: 'Editar'}).click();
  await p.waitForSelector('.eng-modal .eng-resumo-op');
  const cg = (await p.textContent('.eng-ro-cogs')).trim();
  conf(cg === 'US$ 77,70', 'janela da operação: 10 sk de cimento × US$ 7,77 = COGS US$ 77,70', cg);
  await p.mouse.click(8, 300); // fora da caixa
  await p.waitForTimeout(300);
  conf(await p.locator('.eng-modal').count() === 1, 'clicar fora não fecha a janela da operação');
  await p.click('.eng-modal .ec-btn-cons');
  await p.waitForSelector('.ec-cons-modal');
  await p.mouse.click(8, 300);
  await p.waitForTimeout(300);
  conf(await p.locator('.ec-cons-modal').count() === 1, 'nem a do consumo (aberta pela operação)');
  await p.click('.ec-cons-modal button:has-text("Cancelar")');
  await p.click('.eng-modal .eng-concluir');
  await p.waitForSelector('.ec-cons-modal');
  await p.mouse.click(8, 300);
  await p.waitForTimeout(300);
  conf(await p.locator('.ec-cons-modal').count() === 1, 'nem a de concluir');
  await p.click('.ec-cons-modal button:has-text("Cancelar")');
  await p.locator('table.db-table tbody tr', {hasText: op}).first().locator('button', {hasText: 'Editar'}).click();
  await p.waitForSelector('.eng-modal');
  await p.click('.eng-modal button:has-text("Cancelar")');
  await p.waitForTimeout(300);
  conf(!(await p.locator('.eng-modal').count()), '“Cancelar” fecha a janela');

  /* ---------------------------------------------------------------- 1. operação nova com data passada */
  console.log('1. Operação nova com data anterior a hoje');
  const antes = await p.evaluate(() => loadDB().plannedJobs.length);
  await p.click('button:has-text("+ Nova operação")');
  await p.waitForSelector('.eng-modal');
  await fld(p, 'Contrato').locator('select').selectOption({index: 1}).catch(() => {});
  const sel = fld(p, 'Sonda').locator('select');
  const rigOpt = await sel.locator('option').nth(1).getAttribute('value');
  await sel.selectOption(rigOpt);
  await fld(p, 'Poço').locator('input').fill('7-PASSADO-1-RJS');
  await fld(p, 'Data prevista').locator('input').fill('2026-10-01');
  await fld(p, 'Tipo de operação').locator('select').selectOption({label: 'Perfuração'});
  await p.waitForTimeout(200);
  const min = await fld(p, 'Data prevista').locator('input').getAttribute('min');
  conf(!min && await p.locator('.eng-modal .eng-retro').count() === 1 && !(await p.locator('.eng-modal .fld-err').count()), 'data 01/10/2026 aceita (sem bloqueio), com o aviso para concluir depois', {min});
  const salvar = p.locator('.eng-modal button.btn-r', {hasText: /^Salvar$/});
  conf(!(await salvar.isDisabled()), 'o botão Salvar fica liberado');
  await salvar.click();
  await p.waitForTimeout(500);
  const nova = await p.evaluate(() => loadDB().plannedJobs.find(j => j.well === '7-PASSADO-1-RJS'));
  conf(nova && nova.date === '2026-10-01' && nova.tipoOp === 'Perfuração' && (await p.evaluate(() => loadDB().plannedJobs.length)) === antes + 1, 'operação salva com a data passada (01/10/2026) e o tipo Perfuração', nova && {date: nova.date, tipo: nova.tipoOp});

  conf(!E.errs.length, 'nenhum erro de JavaScript', E.errs.slice(0, 3));
  await E.browser.close();
  console.log('\n%d ok, %d falha(s)', ok, falhas);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
