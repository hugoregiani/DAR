// e25 (Hugo, 28/11/2026): "estou duplicando uma operação não vinculada e o app segue me perguntando se quero que mova
// operações de datas anteriores. A movimentação é mover as operações vinculadas em cascata da operação que está sendo
// movida, ou seja, sempre operações posteriores, nunca anteriores, e uma operação sem vínculo não deveria mover nenhuma."
// Cenário: numa sonda, operações antigas já sobrepostas entre si (como no arquivo do Hugo: várias em 01/01, 01/03…).
// Confere: duplicar uma operação "Não vincular" (pelo botão Duplicar) não pergunta nada e não move nada; operação
// vinculada que encosta nas seguintes propõe mover só as POSTERIORES, em cascata, até a primeira sem vínculo; operação
// vinculada que não encosta em nenhuma posterior não pergunta (mesmo com as anteriores sobrepostas); aplicar o deslize
// move só as propostas. E (g24) o "✎ abrir" da linha da operação nos Indicadores abre a janela da operação; e a
// primeira coluna do Gantt muda de largura puxando a alça do cabeçalho (guardada; duplo clique volta ao padrão).
// Uso: node tests/e2e_e25.js [EARL_Engenharia.html]
const {abrir} = require('./harness');
const {montar} = require('../walkthrough/demo');
const path = require('path');
const ARQ = path.resolve(process.argv[2] || path.join(__dirname, '..', 'EARL_Engenharia.html'));
let ok = 0, falhas = 0;
const conf = (c, msg, extra) => { if (c) { ok++; console.log('  ✓ ' + msg); } else { falhas++; console.log('  ✗ ' + msg + (extra !== undefined ? ' → ' + JSON.stringify(extra).slice(0, 700) : '')); } };
const fld = (p, rot) => p.locator('.eng-modal .fld').filter({has: p.locator('label', {hasText: rot})}).first();
const FILA = 'Reorganizar a fila da sonda';
// operações do cenário (poço, data, duração, vínculo); A/B e C/D e E/F já sobrepostas entre si
const CEN = [['E25-A', '2026-01-01', 25, 'chain'], ['E25-B', '2026-01-01', 25, 'chain'], ['E25-C', '2026-03-01', 25, 'chain'], ['E25-D', '2026-03-10', 10, 'chain'],
  ['E25-E', '2027-03-01', 10, 'chain'], ['E25-F', '2027-03-05', 10, 'chain'], ['E25-G', '2027-03-20', 10, 'fixed'], ['E25-H', '2027-04-01', 10, 'chain']];
const datas = p => p.evaluate(() => { const o = {}; loadDB().plannedJobs.filter(j => /^E25-/.test(j.well || '')).forEach(j => { o[j.well] = j.date; }); return o; });
const salvarEVer = async p => {
  await p.locator('.eng-modal button.btn-r', {hasText: /^Salvar$/}).click();
  await p.waitForTimeout(700);
  const f = p.locator('.overlay', {hasText: FILA});
  return (await f.count()) ? await f.innerText() : '';
};
const naoMover = async p => { const f = p.locator('.overlay', {hasText: FILA}); if (await f.count()) { await f.locator('.btn-o', {hasText: 'Não mover'}).click(); await p.waitForTimeout(200); } };
const novaOp = async (p, cen, {poco, data, dur, vinculo}) => {
  await p.click('button:has-text("+ Nova operação")');
  await p.waitForSelector('.eng-modal');
  await fld(p, 'Sonda').locator('select').selectOption({label: cen.rigNome});
  await fld(p, 'Poço').locator('input').fill(poco);
  await fld(p, 'Data prevista').locator('input').fill(data);
  await fld(p, 'Tipo de operação').locator('select').selectOption({label: 'Abandono'});
  if (dur) await fld(p, 'Duração').locator('input').fill(String(dur));
  await p.locator('.eng-modal .eng-seg button', {hasText: vinculo}).click();
  return salvarEVer(p);
};

(async () => {
  const E = await abrir(ARQ, {hoje: '2026-11-28', h: 1000});
  const p = E.page;
  await p.waitForSelector('.eng2-card', {timeout: 90000});
  await montar(p);
  await p.waitForSelector('.eng2-card');
  const cen = await p.evaluate(CEN => {
    const d = loadDB();
    const rig = d.rigs.find(r => /ODN I\b|ODN-I/.test(r.name)) || d.rigs[0];
    const base = d.plannedJobs.find(j => j.contratoId === 'ct_demo_pa');
    // só as operações do cenário nesta sonda, no contrato do P&A
    d.plannedJobs = d.plannedJobs.filter(j => !(j.rigId === rig.id && j.contratoId === 'ct_demo_pa'));
    CEN.forEach(([w, dt, dur, anc], i) => {
      const j = JSON.parse(JSON.stringify(base));
      Object.assign(j, {id: 'e25_' + i, well: w, rigId: rig.id, date: dt, baselineDate: dt, durationDays: dur, anchor: anc, status: 'PLANEJADA', tipoOp: 'Abandono', ppuCons: null, concluida: null, handoverId: null, mobId: null, releasedAt: null});
      d.plannedJobs.push(j);
    });
    saveDB(d);
    return {rig: rig.id, rigNome: rigFmt(rig)};
  }, CEN);
  await p.reload(); await p.waitForSelector('.eng2-card', {timeout: 90000});
  await p.locator('.eng2-card', {hasText: 'P&A — Macaé'}).first().click();
  await p.waitForSelector('.db-tab');
  const d0 = await datas(p);
  conf(Object.keys(d0).length === CEN.length, 'cenário: ' + CEN.length + ' operações na sonda ' + cen.rigNome + ', com A/B, C/D e E/F sobrepostas entre si', d0);

  console.log('\n1. Duplicar uma operação "Não vincular" (o caso do Hugo)');
  await p.click('.db-tab:has-text("Lista")');
  await p.click('.eng-lista-todas').catch(() => {});
  await p.locator('table.db-table tbody tr', {hasText: 'E25-C'}).first().locator('button', {hasText: 'Editar'}).click();
  await p.waitForSelector('.eng-modal .eng-mf');
  await p.click('.eng-modal .eng-mf button:text-is("Duplicar")');
  await p.waitForTimeout(400);
  if (await p.locator('.eng-dup-ok').count()) { await p.click('.eng-dup-ok'); await p.waitForTimeout(400); }
  conf(/NOVA OPERA/i.test(await p.innerText('.eng-modal')), 'a cópia abre como nova operação');
  await fld(p, 'Poço').locator('input').fill('E25-DUP');
  await fld(p, 'Data prevista').locator('input').fill('2027-01-12');
  await fld(p, 'Duração').locator('input').fill('25');
  await p.locator('.eng-modal .eng-seg button', {hasText: 'Não vincular'}).click();
  let txt = await salvarEVer(p);
  const d1 = await datas(p);
  conf(!txt, 'salvar a cópia "Não vincular" não pergunta se quer reorganizar a fila (antes propunha mover A, B, C, D…)', txt.slice(0, 300));
  conf(d1['E25-DUP'] === '2027-01-12' && CEN.every(([w]) => d1[w] === d0[w]), 'nenhuma outra operação mudou de data', d1);
  await naoMover(p);

  console.log('\n2. Operação "Não vincular" que encosta nas seguintes: também não move nenhuma');
  txt = await novaOp(p, cen, {poco: 'E25-FIX', data: '2027-02-25', dur: 10, vinculo: 'Não vincular'});
  conf(!txt && JSON.stringify(Object.assign({}, await datas(p), {'E25-FIX': undefined})) === JSON.stringify(Object.assign({}, d1, {'E25-FIX': undefined})), 'sem pergunta e sem mexer em E (01/03/2027), mesmo encostando', txt.slice(0, 200));
  await naoMover(p);
  await p.evaluate(() => { const d = loadDB(); d.plannedJobs = d.plannedJobs.filter(j => j.well !== 'E25-FIX'); saveDB(d); });
  await p.reload(); await p.waitForSelector('.eng2-card', {timeout: 90000});
  await p.locator('.eng2-card', {hasText: 'P&A — Macaé'}).first().click();
  await p.waitForSelector('.db-tab');

  console.log('\n3. Operação vinculada que encosta nas seguintes: só as POSTERIORES, em cascata, até a primeira sem vínculo');
  txt = await novaOp(p, cen, {poco: 'E25-VINC', data: '2027-02-25', dur: 10, vinculo: 'Vincular data à operação anterior'});
  const nomes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'DUP'].filter(x => txt.includes('E25-' + x));
  conf(JSON.stringify(nomes) === JSON.stringify(['E', 'F']), 'propõe mover só E e F (posteriores e vinculadas); nada de A–D (anteriores), DUP (anterior), nem G (sem vínculo) e H (depois de G)', {nomes, txt: txt.slice(0, 400)});
  conf(/07\/03\/2027/.test(txt) && /17\/03\/2027/.test(txt), 'E vai para 07/03/2027 (dia seguinte ao fim da nova) e F para 17/03/2027 (dia seguinte ao fim de E)', txt.slice(0, 400));
  await p.locator('.overlay', {hasText: FILA}).locator('.btn-r', {hasText: 'Aplicar'}).click();
  await p.waitForTimeout(500);
  const d3 = await datas(p);
  conf(d3['E25-E'] === '2027-03-07' && d3['E25-F'] === '2027-03-17' && ['A', 'B', 'C', 'D', 'G', 'H', 'DUP'].every(x => d3['E25-' + x] === (d1['E25-' + x])), '"Aplicar deslize" move só E e F; as anteriores e a G/H ficam', d3);

  console.log('\n4. Operação vinculada que não encosta em nenhuma posterior: não pergunta, mesmo com as anteriores sobrepostas');
  txt = await novaOp(p, cen, {poco: 'E25-SOLTA', data: '2026-06-01', dur: 10, vinculo: 'Vincular data à operação anterior'});
  const d4 = await datas(p);
  conf(!txt && ['A', 'B', 'C', 'D'].every(x => d4['E25-' + x] === d0['E25-' + x]), 'sem pergunta; A/B e C/D continuam onde estavam', txt.slice(0, 300));
  await naoMover(p);

  console.log('\n5. Operação vinculada no mesmo dia de outra: a do mesmo dia não é "posterior"');
  txt = await novaOp(p, cen, {poco: 'E25-MESMODIA', data: '2026-01-01', dur: 5, vinculo: 'Vincular data à operação anterior'});
  conf(!/E25-A|E25-B/.test(txt), 'não propõe mover A nem B (mesmo dia, 01/01/2026)', txt.slice(0, 300));
  await naoMover(p);

  console.log('\n6. Indicadores: "✎ abrir" na linha da operação abre a janela da operação para alterar');
  await p.click('button:has-text("Voltar")').catch(() => {});
  await p.waitForTimeout(300);
  if (await p.locator('.fr-tab-ind:not(.on)').count()) await p.click('.fr-tab-ind');
  const h = await p.waitForSelector('.ec-ger-frame', {timeout: 60000});
  const f = await h.contentFrame();
  await f.waitForSelector('.kpis', {timeout: 30000});
  await f.selectOption('[data-f="ano"]', '2026').catch(() => {});
  await f.click('[data-mxmostrar="4"]'); // mostrar até a operação
  await p.waitForTimeout(400);
  const nAbrir = await f.locator('.t-mx .op-abrir').count();
  conf(nAbrir > 0 && await f.locator('.t-mx tr.mx-g .op-abrir').count() === 0, 'tabela Receita/COGS: "✎ abrir" nas linhas das operações (' + nAbrir + '), não nas de cliente/contrato/sonda/poço');
  const btC = f.locator('.t-mx .op-abrir[data-abrirop="e25_2"]');
  conf(await btC.count() === 1, 'a operação E25-C tem o botão na tabela');
  const abertosAntes = await f.locator('.t-mx tr.mx-op.on').count();
  await btC.click();
  await p.waitForSelector('.eng-modal', {timeout: 5000}).catch(() => {});
  const tm = await p.locator('.eng-modal').count() ? await p.innerText('.eng-modal') : '';
  conf(/EDITAR OPERA/i.test(tm) && /E25-C/.test(await fld(p, 'Poço').locator('input').inputValue().catch(() => '')), 'abre a janela "Editar operação planejada" da E25-C, por cima dos Indicadores', tm.slice(0, 120));
  conf(await f.locator('.t-mx tr.mx-op.on').count() === abertosAntes, 'clicar no botão não abre/fecha a linha (só abre a janela)');
  await fld(p, 'Duração').locator('input').fill('20');
  txt = await salvarEVer(p);
  await naoMover(p);
  const dur = await p.evaluate(() => (loadDB().plannedJobs.find(j => j.id === 'e25_2') || {}).durationDays);
  conf(Number(dur) === 20 && !(await p.locator('.eng-modal').count()) && await p.locator('.fr-tab-ind.on').count() === 1, 'alterar e salvar ali mesmo: a duração da E25-C virou 20 dias e a tela continua nos Indicadores', dur);
  await f.click('[data-tab="ops"]');
  await p.waitForTimeout(400);
  const btOps = f.locator('.t-ops .op-abrir[data-abrirop="e25_3"]');
  conf(await f.locator('.t-ops .op-abrir').count() > 0 && await btOps.count() === 1, 'aba Operações: "✎ abrir" em cada operação');
  await btOps.click();
  await p.waitForSelector('.eng-modal', {timeout: 5000}).catch(() => {});
  conf(/E25-D/.test(await fld(p, 'Poço').locator('input').inputValue().catch(() => '')), 'na aba Operações, abre a janela da E25-D');
  await p.click('.eng-modal button:has-text("Cancelar")');

  console.log('\n7. Gantt: a primeira coluna muda de largura puxando a alça do cabeçalho');
  await p.click('.fr-tab-cts').catch(() => {});
  await p.waitForTimeout(300);
  await p.locator('.eng2-card', {hasText: 'P&A — Macaé'}).first().click();
  await p.waitForSelector('.db-tab');
  await p.click('.db-tab:has-text("Gantt")');
  await p.waitForSelector('.eng-glbl-rsz');
  const largura = () => p.locator('[title="Abrir a operação"]').first().boundingBox().then(b => Math.round(b.width));
  const w0 = await largura();
  const alca = p.locator('.eng-glbl-rsz').first();
  conf(w0 === 190 && await p.locator('.eng-glbl-rsz').count() >= 1, 'alça no cabeçalho da 1ª coluna; largura padrão 190 px', w0);
  const b0 = await alca.boundingBox();
  await p.mouse.move(b0.x + b0.width / 2, b0.y + b0.height / 2);
  await p.mouse.down();
  for (let i = 1; i <= 10; i++) await p.mouse.move(b0.x + b0.width / 2 + i * 15, b0.y + b0.height / 2);
  await p.mouse.up();
  await p.waitForTimeout(300);
  const w1 = await largura();
  const cab = await p.locator('.eng-glbl-rsz').first().evaluate(e => Math.round(e.parentElement.getBoundingClientRect().width));
  conf(Math.abs(w1 - 340) <= 3 && Math.abs(cab - w1) <= 1, 'arrastando 150 px para a direita, a coluna (linhas e cabeçalho) fica com ~340 px', {w1, cab});
  await p.reload(); await p.waitForSelector('.eng2-card', {timeout: 90000});
  await p.locator('.eng2-card', {hasText: 'P&A — Macaé'}).first().click();
  await p.waitForSelector('.db-tab');
  await p.click('.db-tab:has-text("Gantt")');
  await p.waitForSelector('.eng-glbl-rsz');
  conf(Math.abs((await largura()) - w1) <= 1, 'a largura fica guardada (reabrindo o arquivo)', await largura());
  const b1 = await p.locator('.eng-glbl-rsz').first().boundingBox();
  await p.mouse.move(b1.x + b1.width / 2, b1.y + b1.height / 2);
  await p.mouse.down();
  for (let i = 1; i <= 10; i++) await p.mouse.move(b1.x + b1.width / 2 - i * 60, b1.y + b1.height / 2);
  await p.mouse.up();
  await p.waitForTimeout(300);
  conf(await largura() === 120, 'não fica menor que 120 px', await largura());
  await p.locator('.eng-glbl-rsz').first().dblclick();
  await p.waitForTimeout(300);
  conf(await largura() === 190, 'duplo clique na alça volta à largura padrão (190 px)', await largura());

  conf(!E.errs.length, 'nenhum erro de JavaScript', E.errs.slice(0, 3));
  await E.browser.close();
  console.log('\n' + ok + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
