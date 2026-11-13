// Teste de ponta a ponta do inventário das sondas e das exportações separadas (EARL Engenharia e7):
// aba "Inventário das sondas" do contrato (sondas do contrato, contagem com produtos previstos, contagem anterior e
// diferença, mesma data substitui, planilha no modelo DAR antigo e no do app, validação, outra sonda, histórico,
// excluir, matriz) e "⬇ Exportar planilhas" (inventário, consumo de químicos, casing e pessoal em arquivos separados,
// conferidos célula a célula), exportar/importar dados e persistência.
// Uso: node tests/e2e_inventario.js [EARL_Engenharia.html] [pasta para as telas]
const {abrir} = require('./harness');
const fs = require('fs');
const path = require('path');
const ARQ = process.argv[2] || path.join(__dirname, '..', 'EARL_Engenharia.html');
const SHOTS = process.argv[3] || '';
let ok = 0, falhas = 0;
const conf = (cond, msg, extra) => {
  if (cond) { ok++; console.log('  ✓ ' + msg); } else { falhas++; console.log('  ✗ ' + msg + (extra !== undefined ? ' → ' + JSON.stringify(extra).slice(0, 700) : '')); }
};
const foto = async (page, nome) => { if (SHOTS) await page.screenshot({path: path.join(SHOTS, nome + '.png')}); };
const txt = async (page, sel) => (await page.innerText(sel)).replace(/\s+/g, ' ').trim();
async function baixar(page, acao) {
  const [dl] = await Promise.all([page.waitForEvent('download'), acao()]);
  return {nome: dl.suggestedFilename(), buf: fs.readFileSync(await dl.path())};
}
const lerXlsx = (page, buf) => page.evaluate(b64 => {
  const wb = XLSX.read(b64, {type: 'base64', cellNF: true});
  const o = {_abas: wb.SheetNames};
  wb.SheetNames.forEach(n => {
    const ws = wb.Sheets[n];
    o[n] = XLSX.utils.sheet_to_json(ws, {header: 1, raw: true, defval: ''});
    o[n + '#fmt'] = Object.keys(ws).filter(k => k[0] !== '!' && ws[k].z).map(k => k + '=' + ws[k].z);
  });
  return o;
}, buf.toString('base64'));
const CT = 'ct_5900_0127108_24'; // P&A — Macaé (offshore), Petrobras
const xlsxDe = (page, abas) => page.evaluate(abas => {
  const wb = XLSX.utils.book_new();
  abas.forEach(([n, aoa]) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), n));
  return XLSX.write(wb, {bookType: 'xlsx', type: 'base64'});
}, abas);
const arqX = (nome, b64) => ({name: nome, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(b64, 'base64')});

(async () => {
  const {browser, page, errs} = await abrir(ARQ, {h: 1000, hoje: '2026-11-08'});
  await page.waitForSelector('.eng2-card', {timeout: 60000});

  console.log('Preparação: operações do contrato P&A (NS-38 e NS-32), uma concluída e uma cancelada');
  await page.evaluate(CT => {
    const d = JSON.parse(JSON.stringify(EARL_DB_REF));
    const rig = n => d.rigs.find(r => r.name === n).id;
    const op = (id, rigNome, date, extra) => Object.assign({id, loc: 'macae', clienteName: 'Petrobras', contratoLabel: '5900.0127108.24', contratoId: CT, rigId: rig(rigNome), well: 'POCO-' + id, tipoOp: 'Abandono', tipoOutro: '', casing: '', date, baselineDate: date, durationDays: 4, salesOrder: 'SO' + id, wbs: '', vida: '', anchor: 'fixed', contingencia: false, risco: null, riscoRec: 0, templateId: '', notes: '', equipNeeds: [], chems: [], ppuNeeds: [], casingNeeds: [], peopleNeeds: [], status: 'PLANEJADA', createdAt: '2026-11-01T12:00:00.000Z', updatedAt: '2026-11-01T12:00:00.000Z', log: []}, extra);
    d.plannedJobs = [
      op('opA', 'Takatsugu J', '2026-12-05', {riscoRec: 1, chems: [{sap: '100003837', name: 'MUSOL E', unit: 'gal', qty: 120}, {sap: '100003685', name: 'Cimento Classe G', unit: 'sk', qty: 800}], casingNeeds: [{sap: '103101982', name: 'ASSY BAF', unit: 'EA', qty: 2}], peopleNeeds: [{funcao: 'Tamponeiro', qty: 2}, {funcao: 'Supervisor', qty: 1}]}),
      op('opB', 'Norbe VIII', '2027-01-20', {tipoOp: 'Cimentação primária', casing: '9 5/8"', riscoRec: 50, contingencia: true, risco: 30, chems: [{sap: '100003837', name: 'MUSOL E', unit: 'gal', qty: 60}, {sap: '100003760', name: 'Halad-413 L', unit: 'gal', qty: '12,5'}]}),
      op('opC', 'Norbe VIII', '2026-10-10', {chems: [{sap: '100003837', name: 'MUSOL E', unit: 'gal', qty: 50}], peopleNeeds: [{funcao: 'Tamponeiro', qty: 2}], ppuCons: {data: '2026-10-12', linhas: [], quim: [{sap: '100003837', name: 'MUSOL E', unit: 'gal', qty: 55}, {sap: '210795', name: 'Ácido Cítrico', unit: 'bag', qty: 3}], cas: [], pes: [{funcao: 'Tamponeiro', pessoas: 2, dias: 3, hd: 6}], em: '2026-10-12T12:00:00.000Z', por: 'Ana'}}),
      op('opD', 'Norbe VIII', '2026-12-20', {tipoOp: 'Outros', tipoOutro: 'Teste de BOP'}),
      op('opX', 'Norbe VIII', '2026-12-22', {status: 'CANCELADA', chems: [{sap: '100003837', name: 'MUSOL E', unit: 'gal', qty: 999}]}),
    ];
    d.hoMail = Object.assign({}, d.hoMail, {nome: 'Ana'});
    localStorage.setItem('hal_cmt_db_v1', JSON.stringify(d));
  }, CT);
  await page.reload();
  await page.waitForSelector('.eng2-card', {timeout: 60000});

  console.log('Aba "Inventário das sondas" do contrato');
  await page.click('.eng2-card:has-text("P&A — Macaé")');
  await page.click('.db-tab:has-text("Inventário das sondas")');
  await page.waitForSelector('.ei-tab');
  const cards = await page.$$eval('.ei-card .ei-card-t b', x => x.map(e => e.textContent));
  // 7 sondas cadastradas com o contrato "P&A" + a NS-38, que só tem operação do contrato
  conf(cards.length === 8 && cards.includes('NS-38 - Takatsugu J') && cards.includes('NS-32 - Norbe VIII') && cards.includes('SS-75 - Noble Courage'), 'sondas do contrato: as das operações e as cadastradas com o contrato (8), como “NOME PETROBRAS - NOME DA SONDA”', cards);
  conf(/SONDAS 8/.test(await txt(page, '.ei-kpi-sondas')) && /0 8 sem contagem/.test(await txt(page, '.ei-kpi-cont')), 'cartões: 8 sondas, nenhuma contada', await txt(page, '.ec-kpis'));
  await foto(page, 'i1_aba');

  console.log('Primeira contagem da NS-32');
  const card = nome => page.locator('.ei-card').filter({has: page.locator('.ei-card-t b', {hasText: new RegExp('^' + nome + '( - .*)?$')})});
  await card('NS-32').locator('.ei-nova').click();
  await page.waitForSelector('.ei-modal');
  const prev = await page.$$eval('.ei-itens tbody tr', trs => trs.map(t => t.querySelector('.ei-sap') && t.querySelector('.ei-sap').value));
  // previstos nas operações futuras da NS-32 (opB): MUSOL E e Halad-413 L; a concluída (opC) e a cancelada (opX) não
  conf(prev.join() === '100003837,100003760', 'sem contagem anterior: começa com os produtos previstos nas operações futuras da sonda', prev);
  await page.fill('.ei-modal .ei-itens tbody tr:nth-child(1) .ei-qtd', '45,5');
  await page.fill('.ei-modal .ei-itens tbody tr:nth-child(2) .ei-qtd', '8');
  await page.fill('.ei-add', '210795');
  await page.press('.ei-add', 'Enter');
  await page.waitForFunction(() => document.querySelectorAll('.ei-modal .ei-itens tbody tr').length === 3);
  const nova = await page.$$eval('.ei-itens tbody tr:nth-child(3) input', x => x.map(e => e.value));
  conf(nova[0] === '210795' && /Cítrico/.test(nova[1]) && nova[2] === 'bag', '＋ Produto pelo SAP traz descrição e unidade do catálogo', nova);
  await page.fill('.ei-modal .ei-itens tbody tr:nth-child(3) .ei-qtd', '12');
  await page.fill('.ei-data', '2026-11-02');
  await page.fill('.ei-obs', 'fim da operação');
  // espera o app registrar o texto antes de salvar (com a máquina ocupada, o clique em Salvar podia chegar antes)
  await page.waitForFunction(() => document.querySelector('.ei-obs').value === 'fim da operação');
  await page.waitForTimeout(200);
  await foto(page, 'i2_contagem');
  await page.click('.ei-salvar');
  await page.waitForSelector('.ei-modal', {state: 'detached'});
  let db = await page.evaluate(() => JSON.parse(localStorage.getItem('hal_cmt_db_v1')).invSondas);
  conf(db.length === 1 && db[0].sonda === 'NS-32' && db[0].data === '2026-11-02' && db[0].ctId === 'ct_5900_0127108_24' && db[0].por === 'Ana' && db[0].obs === 'fim da operação', 'contagem gravada com sonda, data, contrato, responsável e observação', db);
  conf(JSON.stringify(db[0].itens.map(i => [i.sap, i.qtd, i.unid])) === JSON.stringify([['100003837', 45.5, 'gal'], ['100003760', 8, 'gal'], ['210795', 12, 'bag']]), 'itens com a quantidade em número ("45,5" = 45,5)', db[0].itens);
  const c32 = await txt(page, '.ei-card:has(.ei-card-t b:text-matches("^NS-32( - |$)"))');
  conf(/Última contagem: 02\/11\/2026/.test(c32) && /há 6 dia\(s\)/.test(c32) && /3 produto\(s\) · Ana/.test(c32), 'cartão da NS-32: data, dias, produtos e responsável', c32);

  console.log('Segunda contagem (começa com a anterior) e diferença');
  await card('NS-32').locator('.ei-nova').click();
  await page.waitForSelector('.ei-modal');
  const pre = await page.$$eval('.ei-itens tbody tr', trs => trs.map(t => [t.querySelector('.ei-sap').value, t.querySelector('.ei-qtd').value, t.querySelector('.ei-ant').textContent]));
  conf(JSON.stringify(pre) === JSON.stringify([['100003837', '45,5', '45,5'], ['100003760', '8', '8'], ['210795', '12', '12']]), 'nova contagem começa com a última (quantidade e "contagem anterior")', pre);
  await page.fill('.ei-modal .ei-itens tbody tr:nth-child(1) .ei-qtd', '30');
  await page.fill('.ei-modal .ei-itens tbody tr:nth-child(2) .ei-qtd', '10');
  await page.fill('.ei-modal .ei-itens tbody tr:nth-child(3) .ei-qtd', '');
  const difs = await page.$$eval('.ei-itens tbody tr', trs => trs.map(t => t.children[5].textContent));
  conf(difs.join('|') === '-15,5|+2|', 'diferença para a contagem anterior (−15,5; +2; vazio)', difs);
  conf(/2 produto\(s\) com quantidade · 1 sem quantidade \(ficam fora\)/.test(await txt(page, '.ei-modal .ec-foot')), 'rodapé: 2 com quantidade, 1 fica fora');
  // validação: SAP repetido e negativo
  await page.fill('.ei-modal .ei-itens tbody tr:nth-child(3) .ei-sap', '100003837');
  await page.fill('.ei-modal .ei-itens tbody tr:nth-child(3) .ei-qtd', '1');
  conf(/SAP repetido \(100003837\)/.test(await txt(page, '.ei-modal .ec-foot')) && await page.isDisabled('.ei-salvar'), 'SAP repetido impede salvar');
  await page.click('.ei-modal .ei-itens tbody tr:nth-child(3) .ei-tirar');
  await page.fill('.ei-modal .ei-itens tbody tr:nth-child(2) .ei-qtd', '-3');
  conf(/quantidades válidas/.test(await txt(page, '.ei-modal .ec-foot')) && await page.isDisabled('.ei-salvar'), 'quantidade negativa impede salvar');
  await page.fill('.ei-modal .ei-itens tbody tr:nth-child(2) .ei-qtd', '10');
  await page.fill('.ei-data', '2026-11-07');
  await page.click('.ei-salvar');
  await page.waitForSelector('.ei-modal', {state: 'detached'});
  db = await page.evaluate(() => JSON.parse(localStorage.getItem('hal_cmt_db_v1')).invSondas);
  conf(db.length === 2 && db.find(c => c.data === '2026-11-07').itens.length === 2, 'segunda contagem gravada (histórico com 2)');

  console.log('Mesma data substitui (com confirmação)');
  await card('NS-32').locator('.ei-nova').click();
  await page.waitForSelector('.ei-modal');
  await page.fill('.ei-data', '2026-11-07');
  await page.fill('.ei-modal .ei-itens tbody tr:nth-child(1) .ei-qtd', '28');
  await page.click('.ei-salvar');
  await page.waitForSelector('.confirm-box, .modal:has-text("Já existe uma contagem nesta data")');
  conf(/já tem uma contagem em 07\/11\/2026/.test(await page.innerText('body')), 'avisa que já existe contagem na data');
  await page.click('button:has-text("Substituir")');
  await page.waitForSelector('.ei-modal', {state: 'detached'});
  db = await page.evaluate(() => JSON.parse(localStorage.getItem('hal_cmt_db_v1')).invSondas);
  conf(db.length === 2 && db.find(c => c.data === '2026-11-07').itens[0].qtd === 28, 'substituiu a contagem de 07/11 (continua com 2 contagens)', db.map(c => [c.data, c.itens.map(i => i.qtd)]));

  console.log('Planilha: aba DAR antiga (uma coluna por sonda) e o arquivo de inventário do app');
  await card('NS-38').locator('.ei-nova').click();
  await page.waitForSelector('.ei-modal');
  const dar = await xlsxDe(page, [['DAR', [['SAP', 'Produto', 'Un', 'NS-32', 'NS-38', 'SS-75'], [100003837, 'MUSOL E', 'GAL', 5, 70, 9], [100003685, 'Cimento', 'SK', 0, 420.5, 1], [212324, 'BARAZAN', 'BAG', 3, '', 4]]]]);
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('.ei-carregar')]);
  await fc.setFiles(arqX('DAR.xlsx', dar));
  await page.waitForSelector('.ei-msg');
  const linhasDar = await page.$$eval('.ei-itens tbody tr', trs => trs.map(t => [t.querySelector('.ei-sap').value, t.querySelector('.ei-qtd').value]));
  conf(/coluna "NS-38"/.test(await txt(page, '.ei-msg')) && JSON.stringify(linhasDar) === JSON.stringify([['100003837', '70'], ['100003685', '420,5']]), 'aba DAR antiga: lê só a coluna da NS-38 (vazio fica fora)', {msg: await txt(page, '.ei-msg'), linhasDar});
  await page.click('.ei-salvar');
  await page.waitForSelector('.ei-modal', {state: 'detached'});

  console.log('Contagem de outra sonda (fora do contrato) e planilha no formato do app');
  await page.selectOption('.ei-outra', {label: 'NS-60 - Deepwater Aquila'});
  await page.waitForSelector('.ei-modal');
  const invApp = await xlsxDe(page, [['Inventário', [['Sonda', 'Nome da sonda', 'Contrato', 'Cliente', 'Data da contagem', 'Responsável', 'SAP', 'Produto', 'Unidade', 'Quantidade a bordo'], ['NS-38', 'Takatsugu J', '', '', '', '', '100003837', 'MUSOL E', 'gal', 999], ['NS-60', 'Deepwater Aquila', '', '', '', '', '100003837', 'MUSOL E', 'gal', 33], ['NS-60', 'Deepwater Aquila', '', '', '', '', '100003760', 'Halad-413 L', 'gal', 7]]]]);
  const [fc2] = await Promise.all([page.waitForEvent('filechooser'), page.click('.ei-carregar')]);
  await fc2.setFiles(arqX('inventario.xlsx', invApp));
  await page.waitForSelector('.ei-msg');
  const linhasApp = await page.$$eval('.ei-itens tbody tr', trs => trs.map(t => [t.querySelector('.ei-sap').value, t.querySelector('.ei-qtd').value]));
  conf(JSON.stringify(linhasApp) === JSON.stringify([['100003837', '33'], ['100003760', '7']]), 'arquivo do app (coluna Sonda): só as linhas da NS-60', linhasApp);
  await page.click('.ei-salvar');
  await page.waitForSelector('.ei-modal', {state: 'detached'});
  const cards2 = await page.$$eval('.ei-card .ei-card-t b', x => x.map(e => e.textContent));
  conf(cards2.length === 9 && cards2.includes('NS-60 - Deepwater Aquila'), 'NS-60 passa a aparecer no contrato (contagem lançada nele)', cards2);

  console.log('Matriz do inventário atual');
  const cab = await page.$$eval('.ei-mat thead th', x => x.map(e => e.textContent));
  conf(cab.join('|') === 'SAP|Produto|Unid.|NS-32 - Norbe VIII07/11/2026|NS-38 - Takatsugu J08/11/2026|NS-60 - Deepwater Aquila08/11/2026|Total', 'colunas: sondas com contagem (com a data) e total', cab);
  const musol = await page.$$eval('.ei-mat tbody tr', trs => trs.map(t => [...t.children].map(c => c.textContent)).find(l => l[0] === '100003837'));
  conf(JSON.stringify(musol) === JSON.stringify(['100003837', 'MUSOL E', 'gal', '28', '70', '33', '131']), 'MUSOL E: 28 (última da NS-32) + 70 + 33 = 131', musol);
  await page.fill('.ei-busca', 'halad');
  conf((await page.$$eval('.ei-mat tbody tr', x => x.length)) === 1, 'busca filtra a matriz');
  await page.fill('.ei-busca', '');
  await foto(page, 'i3_matriz');

  console.log('Histórico e excluir');
  await card('NS-32').locator('.ei-hist').click();
  conf(/07\/11\/2026 2 prod\. · Ana Abrir 02\/11\/2026 3 prod\. · Ana Abrir/.test(await txt(page, '.ei-card:has(.ei-card-t b:text-matches("^NS-32( - |$)")) .ei-hist-l')), 'histórico da NS-32 com as 2 contagens, a mais nova primeiro');
  await card('NS-60').locator('.ei-editar').click();
  await page.waitForSelector('.ei-modal');
  await page.click('.ei-excluir');
  await page.click('.confirm-box button:has-text("Excluir"), button.btn-r:has-text("Excluir")');
  await page.waitForSelector('.ei-modal', {state: 'detached'});
  db = await page.evaluate(() => JSON.parse(localStorage.getItem('hal_cmt_db_v1')).invSondas);
  conf(db.length === 3 && !db.some(c => c.sonda === 'NS-60'), 'contagem excluída (NS-60 sai do contrato)', db.map(c => c.sonda));

  console.log('Exportar planilhas (4 arquivos separados)');
  await page.click('.ei-exportar');
  await page.waitForSelector('.ei-exp-modal');
  conf((await page.$$eval('.ei-exp-ck', x => x.filter(e => e.checked).length)) === 1, 'no contrato, vem marcado só o contrato aberto');
  conf(/6 sonda\(s\) dos contratos marcados ainda sem contagem/.test(await txt(page, '.ei-exp-aviso')), 'avisa as sondas sem contagem (ficam com estoque zero no Painel de Compras)');
  await foto(page, 'i4_exportar');
  const inv = await baixar(page, () => page.click('.ei-exp-inv .ei-exp-btn'));
  const qui = await baixar(page, () => page.click('.ei-exp-quim .ei-exp-btn'));
  const cas = await baixar(page, () => page.click('.ei-exp-cas .ei-exp-btn'));
  const pes = await baixar(page, () => page.click('.ei-exp-pes .ei-exp-btn'));
  conf(/^EARL_Inventario_Sondas_PA_Macae_\(offshore\)_2026-11-08_12h00\.xlsx$/.test(inv.nome) && /^EARL_Consumo_Quimicos_/.test(qui.nome) && /^EARL_Casing_Equipment_/.test(cas.nome) && /^EARL_Pessoal_/.test(pes.nome), 'nomes dos 4 arquivos', [inv.nome, qui.nome, cas.nome, pes.nome]);
  conf(/✓ EARL_Pessoal_/.test(await txt(page, '.ei-exp-pes')), 'a janela marca o arquivo baixado');

  const I = await lerXlsx(page, inv.buf);
  conf(I._abas.join() === 'Inventário,Histórico,Sobre', 'inventário: abas Inventário, Histórico e Sobre', I._abas);
  const iCab = I['Inventário'][0];
  conf(iCab.join('|') === 'Sonda|Nome da sonda|Contrato|Cliente|Data da contagem|Responsável|SAP|Produto|Unidade|Quantidade a bordo|Observação', 'inventário: colunas', iCab);
  const ns32 = I['Inventário'].filter(l => l[0] === 'NS-32');
  conf(ns32.length === 2 && ns32[0][4] === 46333 && ns32.map(l => l[6] + '=' + l[9]).join() === '100003837=28,100003760=10', 'NS-32: só a última contagem (07/11/2026 como data do Excel), 28 e 10', ns32);
  conf(I['Inventário#fmt'].some(f => /^E2=dd\/mm\/yyyy/.test(f)), 'data da contagem com formato de data');
  const semCont = I['Inventário'].filter(l => l[7] === '(sem contagem)').map(l => l[0]);
  conf(semCont.length === 6 && semCont.includes('SS-75') && !semCont.includes('NS-60'), 'sondas do contrato sem contagem aparecem com "(sem contagem)"', semCont);
  conf(I['Histórico'].filter(l => l[0] === 'NS-32').length === 5, 'histórico: as 2 contagens da NS-32 (3 + 2 linhas)');
  const sobreI = Object.fromEntries(I.Sobre.map(l => [l[0], l[1]]));
  conf(sobreI.Tipo === 'EARL-Eng-Inventario' && sobreI.Engenheiro === 'Ana' && /P&A/.test(sobreI.Contratos) && sobreI['Sondas com contagem'] === 2, 'aba Sobre: tipo, engenheiro, contrato e sondas', sobreI);

  const Q = await lerXlsx(page, qui.buf);
  const q = Q['Consumo de químicos'];
  conf(q[0].join('|') === 'Contrato|Cliente|Sonda|Nome da sonda|Poço|Operação|Data da operação|Duração (dias)|Situação|Contingência|Risco (%)|SO|WBS|ID da operação|SAP|Produto|Unidade|Qtd. prevista|Qtd. realizada|Data do serviço|Contingência (linha)|Risco da linha (%)', 'consumo de químicos: colunas (e10: com a contingência e o risco da linha)', q[0]);
  const lin = id => q.filter(l => l[13] === id);
  conf(!lin('opX').length, 'operação cancelada não entra');
  const a = lin('opA');
  conf(a.length === 2 && a[0][2] === 'NS-38' && a[0][3] === 'Takatsugu J' && a[0][6] === 46361 && a[0][8] === 'Previsto' && a[0][10] === 1 && a.map(l => l[14] + '=' + l[17]).join() === '100003837=120,100003685=800' && a[0][18] === '', 'opA: NS-38, 05/12/2026, Previsto, risco 1, MUSOL 120 e cimento 800', a);
  const b = lin('opB');
  conf(b.length === 2 && b[0][5] === 'Cimentação primária 9 5/8"' && b[0][9] === 'Sim' && b[0][10] === 50 && b[1][17] === 12.5, 'opB: cimentação com o revestimento no nome, contingência Sim, risco 50 e "12,5" = 12,5', b);
  const c = lin('opC');
  conf(c.length === 2 && c[0][8] === 'Concluído' && c.map(l => l[14] + ':' + l[17] + '/' + l[18]).join() === '100003837:50/55,210795:0/3' && c[0][19] === 46307, 'opC concluída: previsto e realizado (55; e o produto só lançado, 3), data do serviço 12/10/2026', c);
  const dd = lin('opD');
  conf(dd.length === 1 && dd[0][15] === '(sem produtos químicos)' && dd[0][5] === 'Teste de BOP', 'operação sem químicos sai numa linha (para o painel conhecer a operação)', dd);
  conf(Object.fromEntries(Q.Sobre.map(l => [l[0], l[1]])).Tipo === 'EARL-Eng-Quimicos', 'Sobre: tipo EARL-Eng-Quimicos');

  const C = await lerXlsx(page, cas.buf);
  const cc = C['Casing equipment'];
  conf(cc[0][15] === 'Descrição' && cc.filter(l => l[13] === 'opA').map(l => l[14] + '=' + l[17]).join() === '103101982=2' && cc.filter(l => l[15] === '(sem casing equipment)').length === 3, 'casing: opA com 2 ASSY BAF; as outras 3 operações sem casing', cc.slice(1).map(l => l[13] + ' ' + l[14] + ' ' + l[17]));
  const P = await lerXlsx(page, pes.buf);
  const pp = P.Pessoal;
  conf(pp[0].slice(14).join('|') === 'Função|Pessoas previstas|Dias previstos|Homem-dia previsto|Pessoas realizadas|Dias realizados|Homem-dia realizado|Data do serviço|Contingência (linha)|Risco da linha (%)', 'pessoal: colunas (e10: com a contingência e o risco da linha)', pp[0]);
  conf(JSON.stringify(pp.filter(l => l[13] === 'opA').map(l => l.slice(14, 18))) === JSON.stringify([['Tamponeiro', 2, 4, 8], ['Supervisor', 1, 4, 4]]), 'pessoal opA: homem-dia = pessoas × duração (2×4, 1×4)');
  conf(JSON.stringify(pp.filter(l => l[13] === 'opC').map(l => l.slice(14, 21))) === JSON.stringify([['Tamponeiro', 2, 4, 8, 2, 3, 6]]), 'pessoal opC: previsto e lançado (2 × 3 dias = 6)');
  conf(Object.fromEntries(P.Sobre.map(l => [l[0], l[1]])).Tipo === 'EARL-Eng-Pessoal' && Object.fromEntries(C.Sobre.map(l => [l[0], l[1]])).Tipo === 'EARL-Eng-Casing', 'Sobre de casing e pessoal');
  await page.click('.ei-exp-modal .modal-close');

  console.log('Barra, Visão geral, exportar/importar dados e persistência');
  await page.click('.eng-tools .eng-planilhas');
  await page.waitForSelector('.ei-exp-modal');
  conf((await page.$$eval('.ei-exp-ck', x => x.length)) === await page.evaluate(() => (EARL_DB_REF.contratos || []).filter(c => !c.archived).length), 'botão "⬇ Exportar planilhas" na barra lista todos os contratos');
  await page.click('.ei-exp-modal .modal-close');
  const bk = await baixar(page, () => page.click('.eng-tools button:has-text("Exportar dados")'));
  const bj = JSON.parse(bk.buf.toString('utf8'));
  conf(bj.db.invSondas.length === 3 && bj.resumo.inventarios === 3, 'exportar dados leva as contagens de inventário');
  await page.reload();
  await page.waitForSelector('.eng2-card, .eng2-ctbar', {timeout: 60000});
  await page.goto(page.url());
  await page.waitForSelector('.eng2-card', {timeout: 60000});
  await page.click('.eng2-card:has-text("Visão geral")');
  await page.click('.db-tab:has-text("Inventário das sondas")');
  await page.waitForSelector('.ei-tab');
  conf(/3 produto\(s\)/.test(await txt(page, '.hm-sec')) || (await page.$$eval('.ei-mat tbody tr', x => x.length)) === 3, 'depois de recarregar: Visão geral mostra o inventário (persistido)');
  conf((await page.$$eval('.ei-card .ei-card-t b', x => x.map(e => e.textContent))).includes('NS-38 - Takatsugu J'), 'Visão geral: sondas de todos os contratos');
  await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('hal_cmt_db_v1')); d.invSondas = []; localStorage.setItem('hal_cmt_db_v1', JSON.stringify(d)); });
  await page.reload();
  await page.waitForSelector('.eng2-card, .eng2-ctbar', {timeout: 60000});
  const bkPath = path.join(require('os').tmpdir(), bk.nome);
  fs.writeFileSync(bkPath, bk.buf);
  await page.setInputFiles('.eng-tools input[type=file]', bkPath);
  await page.waitForSelector('.ec-imp-dados');
  conf(/Contagens de inventário das sondas 0 3 3/.test((await page.innerText('.ec-imp-tab')).replace(/\s+/g, ' ')), 'importar dados mostra as contagens (0 aqui, 3 no arquivo, 3 depois de juntar)');
  await page.click('.ec-imp-dados button:has-text("Juntar")');
  await page.waitForSelector('.eng2-card, .eng2-ctbar', {timeout: 60000});
  await page.waitForFunction(() => (JSON.parse(localStorage.getItem('hal_cmt_db_v1')).invSondas || []).length === 3, null, {timeout: 20000});
  conf(true, 'juntar traz as 3 contagens de volta');

  console.log('Celular');
  await page.setViewportSize({width: 390, height: 860});
  await page.goto(page.url());
  await page.waitForSelector('.eng2-card', {timeout: 60000});
  await page.click('.eng2-card:has-text("P&A — Macaé")');
  await page.click('.db-tab:has-text("Inventário das sondas")');
  await page.waitForSelector('.ei-tab');
  const larg = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  conf(larg[0] <= larg[1] + 1, 'celular: a aba não passa da largura da tela', larg);
  await foto(page, 'i5_celular');

  conf(errs.length === 0, 'nenhum erro de JavaScript', errs.slice(0, 3));
  console.log(`\n${ok} ok, ${falhas} falha(s)`);
  await browser.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
