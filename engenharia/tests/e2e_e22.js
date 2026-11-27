// e22 (pedidos do Hugo, 27/11/2026):
// 1. operação criada fora do trecho visível do Gantt aparece (o Gantt abre mostrando as operações do contrato e vai
//    até a operação salva) — caso do contrato "Deepwater Aquila" (operações só no 1º semestre);
// 2. operações de contratos diferentes são independentes (a fila da sonda não mexe em outro contrato);
// 3. operação sem sonda;
// 4. desfazer / refazer (botões e Ctrl+Z / Ctrl+Y);
// 5. paleta de cores maior;
// 6. cards: arrastar para mudar a ordem; grupos; exportar o grupo num .json (o importar recria o grupo).
// Uso: node tests/e2e_e22.js [EARL_Engenharia.html]
const {abrir, baixarVarios} = require('./harness');
const {montar} = require('../walkthrough/demo');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ARQ = path.resolve(process.argv[2] || path.join(__dirname, '..', 'EARL_Engenharia.html'));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'earl-e22-'));
let ok = 0, falhas = 0;
const conf = (c, msg, extra) => { if (c) { ok++; console.log('  ✓ ' + msg); } else { falhas++; console.log('  ✗ ' + msg + (extra !== undefined ? ' → ' + JSON.stringify(extra).slice(0, 700) : '')); } };
const fld = (p, rot) => p.locator('.eng-modal .fld').filter({has: p.locator('label', {hasText: rot})}).first();
const baixar = async (p, acao) => { const d = p.waitForEvent('download', {timeout: 20000}); await acao(); const x = await d; const f = path.join(TMP, x.suggestedFilename()); await x.saveAs(f); return f; };
const ordem = p => p.$$eval('.content.eng2 > .eng2-grid > [data-card]', l => l.map(e => e.getAttribute('data-card')));
const novaOp = async (p, {sonda, poco, data, tipo = 'Abandono'}) => {
  await p.click('button:has-text("+ Nova operação")');
  await p.waitForSelector('.eng-modal');
  if (sonda !== undefined) await fld(p, 'Sonda').locator('select').selectOption(sonda ? {label: sonda} : '');
  await fld(p, 'Poço').locator('input').fill(poco);
  await fld(p, 'Data prevista').locator('input').fill(data);
  await fld(p, 'Tipo de operação').locator('select').selectOption({label: tipo});
  await p.waitForTimeout(150);
  const salvar = p.locator('.eng-modal button.btn-r', {hasText: /^Salvar$/});
  const hab = !(await salvar.isDisabled());
  if (hab) await salvar.click();
  await p.waitForTimeout(600);
  // reorganizar a fila (só operações do mesmo contrato): guarda o texto e fecha sem mover
  const fila = p.locator('.overlay', {hasText: 'Reorganizar a fila da sonda'});
  if (await fila.count()) { ultimaFila = await fila.innerText(); await fila.locator('.btn-o', {hasText: 'Não mover'}).click(); await p.waitForTimeout(200); }
  return hab;
};
let ultimaFila = '';

(async () => {
  const E = await abrir(ARQ, {hoje: '2026-11-27', h: 1000});
  const p = E.page;
  await p.waitForSelector('.eng2-card', {timeout: 90000});
  await montar(p);
  await p.waitForSelector('.eng2-card');
  // cenário: o P&A só com operações no 1º semestre de 2026, numa sonda; o BP com uma operação em julho na MESMA sonda
  const cen = await p.evaluate(() => {
    const d = loadDB();
    const rig = d.rigs.find(r => /Aquila/.test(r.name)) || d.rigs[0];
    const pa = d.plannedJobs.filter(j => j.contratoId === 'ct_demo_pa');
    pa.forEach((j, i) => { j.rigId = rig.id; j.date = '2026-0' + (1 + i % 6) + '-01'; j.durationDays = 28; j.ppuCons = null; j.concluida = null; j.anchor = 'chain'; j.status = 'PLANEJADA'; });
    const bp = d.plannedJobs.find(j => j.contratoId === 'ct_demo_bp');
    bp.rigId = rig.id; bp.date = '2026-07-01'; bp.durationDays = 3; bp.anchor = 'chain'; bp.ppuCons = null; bp.concluida = null; bp.status = 'PLANEJADA';
    saveDB(d);
    return {rig: rig.id, rigNome: rigFmt(rig), bp: bp.id, bpDate: bp.date};
  });
  await p.reload(); await p.waitForSelector('.eng2-card', {timeout: 90000});

  /* ---------------------------------------------------------------- 1. a operação aparece no Gantt */
  console.log('1. Operação nova aparece no Gantt (contrato só com operações no passado)');
  await p.locator('.eng2-card', {hasText: 'P&A — Macaé'}).first().click();
  await p.waitForSelector('.db-tab');
  conf(await p.locator('.eng-gj').count() > 0 && !(await p.locator('text=Nenhuma sonda com operação nesta janela').count()), 'ao abrir o contrato, o Gantt já mostra as operações dele (antes: “Nenhuma sonda com operação nesta janela”)');
  conf(await novaOp(p, {sonda: cen.rigNome, poco: '7-E22-MAR-RJS', data: '2026-03-15'}), 'operação nova em 15/03/2026 salva');
  const idMar = await p.evaluate(() => (loadDB().plannedJobs.find(j => j.well === '7-E22-MAR-RJS') || {}).id);
  conf(idMar && await p.locator('[data-pj="' + idMar + '"]').count() === 1, 'a operação de 15/03/2026 aparece no Gantt');
  await p.click('button:has-text("Hoje")').catch(() => {});
  await p.waitForTimeout(200);
  conf(await novaOp(p, {sonda: cen.rigNome, poco: '7-E22-FUT-RJS', data: '2027-08-01'}), 'operação nova em 01/08/2027 salva');
  const idFut = await p.evaluate(() => (loadDB().plannedJobs.find(j => j.well === '7-E22-FUT-RJS') || {}).id);
  conf(idFut && await p.locator('[data-pj="' + idFut + '"]').count() === 1, 'com o Gantt em “Hoje”, a operação de 01/08/2027 também aparece (a janela vai até ela)');

  /* ---------------------------------------------------------------- 2. contratos independentes */
  console.log('2. Operações de contratos diferentes são independentes');
  const bpDepois = await p.evaluate(id => loadDB().plannedJobs.find(j => j.id === id).date, cen.bp);
  conf(bpDepois === cen.bpDate && !(await p.locator('.overlay', {hasText: 'Reorganizar a fila da sonda'}).filter({hasText: 'BP'}).count()), 'a operação do BP (mesma sonda, 01/07) não foi movida nem oferecida para mover', bpDepois);
  await p.locator('.overlay .btn-o', {hasText: 'Não mover'}).click().catch(() => {});
  // esticar a última operação do P&A até julho: o BP (outro contrato) não acompanha
  await p.evaluate(() => { const d = loadDB(); const l = d.plannedJobs.filter(j => j.contratoId === 'ct_demo_pa' && !/E22/.test(j.well)).sort((a, b) => a.date.localeCompare(b.date)); window.__ultPA = l[l.length - 1].id; });
  await p.click('.db-tab:has-text("Lista")'); await p.click('.eng-lista-todas').catch(() => {});
  const ult = await p.evaluate(() => { const j = loadDB().plannedJobs.find(x => x.id === window.__ultPA); return j.well; });
  await p.locator('table.db-table tbody tr', {hasText: ult}).first().locator('button', {hasText: 'Editar'}).click();
  await p.waitForSelector('.eng-modal');
  await fld(p, 'Duração').locator('input').fill('60').catch(() => {});
  await p.locator('.eng-modal button.btn-r', {hasText: /^Salvar$/}).click();
  await p.waitForTimeout(600);
  const temDlg = await p.locator('.overlay', {hasText: 'Reorganizar a fila da sonda'}).count();
  const listaDlg = temDlg ? await p.locator('.overlay', {hasText: 'Reorganizar a fila da sonda'}).innerText() : '';
  if (temDlg) await p.locator('.overlay .btn-o', {hasText: 'Não mover'}).click().catch(() => {});
  const bp2 = await p.evaluate(id => loadDB().plannedJobs.find(j => j.id === id).date, cen.bp);
  conf(bp2 === cen.bpDate && !/BUZ|BP —/.test(listaDlg), 'esticar a operação do P&A até julho não mexe na operação do BP (outro contrato, mesma sonda)', {bp2, listaDlg: listaDlg.slice(0, 200)});

  /* ---------------------------------------------------------------- 3. operação sem sonda */
  console.log('3. Operação sem sonda');
  await p.click('.db-tab:has-text("Gantt")');
  await p.click('button:has-text("+ Nova operação")');
  await p.waitForSelector('.eng-modal');
  const rot = await fld(p, 'Sonda').locator('label').innerText();
  await p.click('.eng-modal button:has-text("Cancelar")');
  conf(/Sonda \(opcional\)/i.test(rot), 'o campo diz “Sonda (opcional)”', rot);
  conf(await novaOp(p, {sonda: '', poco: 'SEM-SONDA-E22', data: '2026-12-05', tipo: 'Entrega de Cimento/Blend'}), 'salva sem escolher sonda');
  const semS = await p.evaluate(() => { const j = loadDB().plannedJobs.find(x => x.well === 'SEM-SONDA-E22'); return j && {rig: j.rigId, id: j.id}; });
  conf(semS && !semS.rig && await p.locator('[data-pj="' + semS.id + '"]').count() === 1 && await p.locator('text=(sem sonda)').count() > 0, 'a operação fica no Gantt, na linha “(sem sonda)”', semS);

  /* ---------------------------------------------------------------- 4. desfazer / refazer */
  console.log('4. Desfazer / refazer');
  const nOps = () => p.evaluate(() => loadDB().plannedJobs.length);
  const n0 = await nOps();
  conf(!(await p.isDisabled('.eng-tools .eng-desfazer')) && /Desfazer: Inclusão/.test(await p.getAttribute('.eng-tools .eng-desfazer', 'title')), 'botão “↶ Desfazer” na barra, dizendo o que desfaz', await p.getAttribute('.eng-tools .eng-desfazer', 'title'));
  await p.click('.eng-tools .eng-desfazer');
  await p.waitForTimeout(300);
  conf(await nOps() === n0 - 1 && !(await p.evaluate(() => loadDB().plannedJobs.some(j => j.well === 'SEM-SONDA-E22'))), '“↶ Desfazer”: a operação sem sonda sai (e sai também do que fica salvo)');
  await p.click('.eng-tools .eng-refazer');
  await p.waitForTimeout(300);
  conf(await nOps() === n0 && await p.evaluate(() => loadDB().plannedJobs.some(j => j.well === 'SEM-SONDA-E22')), '“↷ Refazer”: ela volta');
  await p.keyboard.press('Control+z'); // o foco está no botão “↷ Refazer” (não é campo de texto)
  await p.waitForTimeout(300);
  const aposZ = await nOps();
  await p.keyboard.press('Control+y');
  await p.waitForTimeout(300);
  conf(aposZ === n0 - 1 && await nOps() === n0, 'Ctrl+Z desfaz e Ctrl+Y refaz', {aposZ, n0});
  // dentro de um campo de texto, Ctrl+Z é do campo
  await p.click('button:has-text("+ Nova operação")');
  await p.waitForSelector('.eng-modal');
  await fld(p, 'Poço').locator('input').fill('abc');
  await fld(p, 'Poço').locator('input').press('Control+z');
  await p.waitForTimeout(200);
  conf(await nOps() === n0, 'com a janela aberta (digitando), Ctrl+Z não desfaz o banco');
  await p.click('.eng-modal button:has-text("Cancelar")');

  /* ---------------------------------------------------------------- 5. paleta maior */
  console.log('5. Paleta de cores maior');
  await p.waitForSelector('.eng-gl');
  await p.click('button:has-text("Tudo")').catch(() => {}); await p.waitForTimeout(300);
  await p.click('.eng-rig-cor-b >> nth=0'); // a 1ª linha pode ser “(sem sonda)”, que não tem cor
  await p.waitForSelector('.eng-cor-pop');
  conf(await p.locator('.eng-cor-sw').count() === 30, '30 cores na paleta (eram 10), mais “Outra cor”', await p.locator('.eng-cor-sw').count());
  await p.keyboard.press('Escape'); await p.mouse.click(5, 5); await p.waitForTimeout(200);
  if (await p.locator('.eng-cor-pop').count()) await p.click('.eng-cor-overlay', {position: {x: 3, y: 3}});

  /* ---------------------------------------------------------------- 6. cards: ordem e grupos */
  console.log('6. Cards dos contratos: arrastar, grupos e exportar o grupo');
  await p.click('.nav-back-btn');
  await p.waitForSelector('.eng2-cards-barra');
  let o = await ordem(p);
  conf(o.length === 3 && await p.getAttribute('.eng2-card[data-card="ct:ct_demo_pa"]', 'draggable') === 'true', 'os cards dos contratos podem ser arrastados', o);
  // arrastar o P&A para depois do Takatsugu J
  const alvoTK = p.locator('[data-card="ct:ct_demo_tk"]');
  const bbTK = await alvoTK.boundingBox();
  await p.locator('[data-card="ct:ct_demo_pa"]').dragTo(alvoTK, {targetPosition: {x: bbTK.width - 10, y: bbTK.height / 2}});
  await p.waitForTimeout(400);
  o = await ordem(p);
  conf(o.indexOf('ct:ct_demo_pa') > o.indexOf('ct:ct_demo_tk'), 'arrastar o P&A para depois do Takatsugu J muda a ordem', o);
  await p.reload(); await p.waitForSelector('.eng2-cards-barra', {timeout: 90000});
  conf(JSON.stringify(await ordem(p)) === JSON.stringify(o), 'a ordem fica salva (continua depois de reabrir)');
  // novo grupo com P&A e BP
  await p.click('.eng2-novo-grupo');
  await p.waitForSelector('.eng2-gr-dlg');
  await p.fill('.eng2-gr-dlg .eng2-gr-nome', 'Macaé offshore');
  await p.locator('.eng2-gr-dlg tr', {hasText: 'P&A — Macaé'}).click();
  await p.locator('.eng2-gr-dlg tr', {hasText: 'BP — Macaé'}).click();
  await p.click('.eng2-gr-ok');
  await p.waitForTimeout(400);
  const gr = await p.evaluate(() => loadDB().engCards.grupos);
  conf(gr.length === 1 && gr[0].nome === 'Macaé offshore' && gr[0].ctIds.sort().join() === 'ct_demo_bp,ct_demo_pa', 'grupo “Macaé offshore” criado com o P&A e o BP', gr);
  conf(await p.locator('.eng2-grupo-aberto .eng2-card').count() === 2 && !(await p.locator('.content.eng2 > .eng2-grid > [data-card="ct:ct_demo_pa"]').count()), 'o grupo abre como uma pasta, com os 2 contratos dentro');
  await p.click('.eng2-gr-tit');
  await p.waitForTimeout(200);
  const cardG = p.locator('.eng2-card.eng2-grupo');
  conf(await cardG.count() === 1 && /Macaé offshore/.test(await cardG.innerText()) && /2 contrato/.test(await cardG.innerText()), 'fechado, o grupo vira um card só (“Macaé offshore · 2 contratos”)', await cardG.innerText().catch(() => ''));
  // soltar o Takatsugu J no meio do grupo: entra no grupo
  const bbG = await cardG.boundingBox();
  await p.locator('[data-card="ct:ct_demo_tk"]').dragTo(cardG, {targetPosition: {x: bbG.width / 2, y: bbG.height / 2}});
  await p.waitForTimeout(400);
  conf(await p.evaluate(() => loadDB().engCards.grupos[0].ctIds.includes('ct_demo_tk')), 'soltar um contrato no meio do card do grupo coloca o contrato no grupo');
  // tirar do grupo pelo menu ⋯
  await cardG.click(); await p.waitForSelector('.eng2-grupo-aberto');
  await p.locator('.eng2-grupo-aberto .eng2-card', {hasText: 'Takatsugu J'}).locator('.eng2-menu-b').click();
  await p.click('.eng2-menu-tirar');
  await p.waitForTimeout(300);
  conf(!(await p.evaluate(() => loadDB().engCards.grupos[0].ctIds.includes('ct_demo_tk'))) && await p.locator('.content.eng2 > .eng2-grid > [data-card="ct:ct_demo_tk"]').count() === 1, '“↩ Tirar do grupo” no menu ⋯ do card');
  // desfazer a organização
  await p.click('.eng-tools .eng-desfazer'); await p.waitForTimeout(300);
  conf(await p.evaluate(() => loadDB().engCards.grupos[0].ctIds.includes('ct_demo_tk')), '“↶ Desfazer” também vale para a organização dos cards');
  await p.click('.eng-tools .eng-refazer'); await p.waitForTimeout(300);
  // renomear
  await p.click('.eng2-gr-ren'); await p.waitForSelector('.eng2-gr-dlg');
  await p.fill('.eng2-gr-dlg .eng2-gr-nome', 'Petrobras e BP');
  await p.click('.eng2-gr-ok'); await p.waitForTimeout(300);
  conf(await p.evaluate(() => loadDB().engCards.grupos[0].nome) === 'Petrobras e BP', '“✎ Renomear” o grupo');
  // exportar o grupo
  const arqG = await baixar(p, () => p.click('.eng2-gr-exp'));
  const JG = JSON.parse(fs.readFileSync(arqG, 'utf8'));
  conf(/^EARL_FORECAST_PETROBRAS-E-BP_2026\.11\.27_12h00\.json$/.test(path.basename(arqG)) && JG.grupo && JG.grupo.nome === 'Petrobras e BP' && JG.db.contratos.map(c => c.id).sort().join() === 'ct_demo_bp,ct_demo_pa' && JG.db.plannedJobs.every(j => ['ct_demo_bp', 'ct_demo_pa'].includes(j.contratoId)), '“⬇ Exportar grupo”: um arquivo EARL_FORECAST_<NOME DO CARD>_… com os 2 contratos e as operações deles', {nome: path.basename(arqG), grupo: JG.grupo});
  // na janela "Exportar dados", os grupos aparecem para marcar
  await p.click('.eng-tools .eng-exportar'); await p.waitForSelector('.eng-expsel');
  await p.locator('.eng-expsel-grtab tr', {hasText: 'Petrobras e BP'}).click();
  const nomesExp = await p.locator('.eng-expsel-nome code').allTextContents();
  conf(nomesExp.length === 4 && nomesExp.some(n => /^EARL_FORECAST_PETROBRAS-E-BP_/.test(n)), '“Exportar dados”: marcar o grupo acrescenta o arquivo do grupo (3 contratos + 1 grupo)', nomesExp);
  await p.click('.eng-expsel button:has-text("Cancelar")');
  // importar o arquivo do grupo num arquivo novo: o grupo vem junto
  const B = await abrir(ARQ, {hoje: '2026-11-27', h: 1000});
  const pb = B.page;
  await pb.waitForSelector('.eng2-card', {timeout: 90000});
  await pb.setInputFiles('.eng-tools input[type=file]', arqG);
  await pb.waitForSelector('.ec-imp-dados');
  conf(/grupo “Petrobras e BP”/.test(await pb.innerText('.ec-imp-dados')), 'a janela de importar avisa que o arquivo é de um grupo');
  const carregou = pb.waitForEvent('load', {timeout: 60000});
  await pb.click('.ec-importar');
  await pb.waitForTimeout(400);
  const cB = pb.locator('.modal button', {hasText: 'Substituir e importar'}); if (await cB.count()) await cB.click();
  await carregou;
  await pb.waitForSelector('.eng2-card', {timeout: 90000});
  const grB = await pb.evaluate(() => { const d = loadDB(); const g = ((d.engCards || {}).grupos || [])[0]; return g && {nome: g.nome, cts: g.ctIds.map(id => (d.contratos.find(c => c.id === id) || {}).name).sort()}; });
  conf(grB && grB.nome === 'Petrobras e BP' && grB.cts.join('|') === 'BP — Macaé (offshore)|P&A — Macaé (offshore)' && await pb.locator('.eng2-card.eng2-grupo').count() === 1, 'no outro arquivo, o grupo “Petrobras e BP” aparece com os 2 contratos', grB);
  conf(!B.errs.length, 'arquivo novo: nenhum erro de JavaScript', B.errs.slice(0, 3));
  await B.browser.close();
  // desagrupar
  await p.click('.eng2-gr-desf'); await p.waitForTimeout(300);
  conf(!(await p.evaluate(() => (loadDB().engCards.grupos || []).length)) && (await ordem(p)).length === 3, '“Desagrupar”: os contratos voltam a ser cards soltos (nada apagado)');

  /* ---------------------------------------------------------------- 7. tipos, filtros que ficam e a alça das janelas */
  console.log('7. Tipos de operação, filtros que ficam e a alça das janelas');
  await p.locator('.eng2-card', {hasText: 'Takatsugu J'}).first().click();
  await p.waitForSelector('.db-tab');
  await p.click('button:has-text("+ Nova operação")');
  await p.waitForSelector('.eng-modal');
  const tipos = await fld(p, 'Tipo de operação').locator('select option').allTextContents();
  conf(['Entrega de Cimento/Blend', 'Perfuração', 'Disponibilidade de Pessoal', 'Disponibilidade de Equipamentos'].every(t => tipos.includes(t)), 'tipos: Entrega de Cimento/Blend, Perfuração, Disponibilidade de Pessoal e Disponibilidade de Equipamentos', tipos);
  await p.waitForTimeout(400);
  const alca = await p.evaluate(() => { const a = document.querySelector('.eng-rz-alca'); const m = document.querySelector('.eng-modal').getBoundingClientRect(); if (!a || a.style.display === 'none') return null; const r = a.getBoundingClientRect(); return {dx: Math.round(m.right - r.right), dy: Math.round(m.bottom - r.bottom)}; });
  conf(alca && alca.dx >= 0 && alca.dx <= 20 && alca.dy >= 0 && alca.dy <= 20, 'janela aberta: aparece a alça de puxar no canto de baixo à direita', alca);
  await p.click('.eng-modal button:has-text("Cancelar")');
  // filtro de tipo no contrato: continua ao voltar, ao abrir outro contrato e ao reabrir o arquivo
  const selTipo = p.locator('.toolbar select.sel').nth(1);
  await selTipo.selectOption({index: 1});
  const tipoEsc = await selTipo.inputValue();
  await p.click('.db-tab:has-text("Lista")');
  await p.click('.nav-back-btn');
  await p.locator('.eng2-card', {hasText: 'BP — Macaé'}).first().click().catch(async () => { await p.locator('.eng2-card.eng2-grupo, .eng2-gr-tit').first().click(); });
  await p.waitForSelector('.db-tab', {timeout: 10000}).catch(() => {});
  const tipoDepois = await p.locator('.toolbar select.sel').nth(1).inputValue().catch(() => '');
  const abaDepois = await p.evaluate(() => (JSON.parse(localStorage.getItem('eng_filtros_v1') || '{}').planView || '') + (document.querySelector('.eng-lista-todas') ? ':lista-na-tela' : ''));
  await p.reload(); await p.waitForSelector('.eng2-card, .db-tab', {timeout: 90000});
  await p.locator('.eng2-card', {hasText: 'Takatsugu J'}).first().click().catch(() => {});
  await p.waitForSelector('.db-tab');
  const tipoReab = await p.locator('.toolbar select.sel').nth(1).inputValue();
  conf(tipoEsc && tipoDepois === tipoEsc && tipoReab === tipoEsc && /^list:lista-na-tela/.test(abaDepois), 'o filtro (tipo “' + tipoEsc + '”) e a aba (Lista) continuam ao trocar de contrato e ao reabrir o arquivo', {tipoEsc, tipoDepois, tipoReab, abaDepois});
  await p.locator('.toolbar select.sel').nth(1).selectOption('');
  await p.click('.db-tab:has-text("Gantt")');
  // Indicadores: o filtro de cliente continua depois de ir aos Contratos e voltar
  await p.click('.nav-back-btn');
  await p.click('.fr-tab-ind'); await p.waitForSelector('.ec-ger-frame');
  let fr = await (await p.$('.ec-ger-frame')).contentFrame(); await fr.waitForSelector('[data-f="cliente"]');
  const cli = await fr.$$eval('[data-f="cliente"] option', l => l.map(o => o.value).filter(Boolean)[0]);
  await fr.selectOption('[data-f="cliente"]', cli);
  await p.waitForTimeout(300);
  await p.click('.fr-tab-cts'); await p.waitForTimeout(300);
  await p.click('.fr-tab-ind'); await p.waitForSelector('.ec-ger-frame');
  fr = await (await p.$('.ec-ger-frame')).contentFrame(); await fr.waitForSelector('[data-f="cliente"]');
  conf(await fr.$eval('[data-f="cliente"]', e => e.value) === cli, 'Indicadores: o filtro de cliente (' + cli + ') continua depois de ir aos Contratos e voltar');
  await fr.selectOption('[data-f="cliente"]', '');
  await p.click('.fr-tab-cts');

  conf(!E.errs.length, 'nenhum erro de JavaScript', E.errs.slice(0, 3));
  await E.browser.close();
  console.log('\n%d ok, %d falha(s)', ok, falhas);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
