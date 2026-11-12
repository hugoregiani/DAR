// Teste do banco de produtos químicos da Engenharia (e6): base inicial (tabela Químicos da aba Forecast),
// avisos, baixar a planilha, atualizar pela planilha (juntar e substituir, prévia das mudanças, linhas
// ignoradas e SAP repetido), planilha no formato do Forecast (só a tabela de químicos), edição na tela,
// histórico, COGS das operações, exportar dados e a base aplicada uma vez só.
// Uso: node tests/e2e_quimicos.js [EARL_Engenharia.html] [pasta das telas] [Contrato_BP_Teste_EARL.xlsx (opcional)]
const {abrir} = require('./harness');
const fs = require('fs');
const path = require('path');
const ARQ = process.argv[2] || path.join(__dirname, '..', 'EARL_Engenharia.html');
const SHOTS = process.argv[3] || '';
const XLSX_BP = process.argv[4] || '';
let ok = 0, falhas = 0;
const conf = (cond, msg, extra) => {
  if (cond) { ok++; console.log('  ✓ ' + msg); } else { falhas++; console.log('  ✗ ' + msg + (extra !== undefined ? ' → ' + JSON.stringify(extra) : '')); }
};
if (SHOTS) fs.mkdirSync(SHOTS, {recursive: true});
const foto = async (page, nome) => { if (SHOTS) await page.screenshot({path: path.join(SHOTS, nome + '.png')}); };
const txt = async (page, sel) => (await page.innerText(sel)).replace(/\s+/g, ' ').trim();
const fld = (page, rot) => page.locator('.eng-modal .fld').filter({has: page.locator('label', {hasText: rot})}).first();
const TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'quim-'));
const banco = page => page.evaluate(() => JSON.parse(localStorage.getItem('hal_cmt_db_v1')));
async function baixar(page, acao) {
  const [dl] = await Promise.all([page.waitForEvent('download'), acao()]);
  const p = path.join(TMP, dl.suggestedFilename());
  await dl.saveAs(p);
  return {nome: dl.suggestedFilename(), path: p};
}
async function carregar(page, arquivo) {
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('.ec-quim-carregar')]);
  await fc.setFiles(arquivo);
  await page.waitForSelector('.ec-quim-plan');
}
const chips = page => page.$$eval('.ec-qp-chip', l => Object.fromEntries(l.map(c => [c.className.split(' ').find(k => k.startsWith('ec-qp-') && k !== 'ec-qp-chip'), Number(c.querySelector('b').textContent)])));
const linha = (page, sap) => page.locator('.ec-quim-tab tbody tr[data-sap="' + sap + '"]');
const valorDe = (page, sap) => linha(page, sap).locator('input.ec-q-usd').inputValue();

(async () => {
  const {browser, page, errs} = await abrir(ARQ, {hoje: '2026-11-02'});
  await page.waitForSelector('.eng-tools', {timeout: 60000});

  console.log('Base inicial');
  await page.click('.eng-quimicos');
  await page.waitForSelector('.ec-quim-tab');
  conf(await page.locator('.ec-quim-tab tbody tr').count() === 60 && /60 produto/.test(await txt(page, '.ec-quim-info')), '60 produtos da tabela Químicos da aba Forecast');
  conf(/Base inicial — Contrato_BP_Teste_EARL\.xlsx — aba Forecast/.test(await txt(page, '.ec-quim-info')), 'origem da base aparece na última atualização', await txt(page, '.ec-quim-info'));
  conf(await linha(page, '100003685').locator('.ec-q-nome').inputValue() === 'CIMENTO CLASS G' && await linha(page, '100003685').locator('.ec-q-unid').inputValue() === 'SK' && await valorDe(page, '100003685') === '13,15', 'CIMENTO CLASS G · SK · US$ 13,15');
  conf(await valorDe(page, '213257') === '267,3333', 'valor com muitas casas aparece com 4 decimais (BARITA 267,3333)');
  conf(await linha(page, '100003685').locator('.ec-q-sap').getAttribute('readonly') !== null, 'SAP de produto salvo não se edita');
  const av = await page.$$eval('.ec-quim-tab tbody tr', rs => Object.fromEntries(rs.filter(r => r.querySelector('.ec-quim-aviso')).map(r => [r.dataset.sap, [...r.querySelectorAll('.ec-quim-aviso')].map(x => x.textContent.replace('⚠ ', '')).join(' | ')])));
  conf(Object.keys(av).length === 8 && av['1128066'] === 'unidade no EARL: lb' && av['213257'] === 'unidade no EARL: bag' && av['XXX'] === 'SAP provisório | valor zero' && av['101208606'] === 'valor zero', 'avisos: unidade diferente do catálogo do EARL, SAP provisório e valor zero (8 produtos)', av);
  await page.check('.ec-quim-soaviso');
  conf(await page.locator('.ec-quim-tab tbody tr').count() === 8, 'filtro “só com aviso”');
  await page.uncheck('.ec-quim-soaviso');
  await page.fill('.ec-quim-busca', 'halad');
  conf(await page.locator('.ec-quim-tab tbody tr').count() === 4, 'busca “halad”: 4 produtos');
  await page.fill('.ec-quim-busca', '');
  await foto(page, 'q1_banco');

  console.log('Baixar a planilha');
  const pl = await baixar(page, () => page.click('.ec-quim-baixar'));
  const lida = await page.evaluate(b64 => { const w = XLSX.read(b64, {type: 'base64'}); return {abas: w.SheetNames, l: XLSX.utils.sheet_to_json(w.Sheets[w.SheetNames[0]], {header: 1, raw: true})}; }, fs.readFileSync(pl.path).toString('base64'));
  const cim = lida.l.find(r => r[0] === 100003685);
  conf(pl.nome === 'Banco_Quimicos_EARL_2026-11-02.xlsx' && lida.abas[0] === 'Químicos' && lida.l[0].join('|') === 'SAP|Descrição|Unidade|Valor US$|Atualizado em' && lida.l.length === 61, 'planilha: aba Químicos com SAP, Descrição, Unidade, Valor US$, Atualizado em e 60 linhas', {nome: pl.nome, cab: lida.l[0], n: lida.l.length});
  conf(cim && cim[3] === 13.15 && Math.abs(lida.l.find(r => r[0] === 213257)[3] - 267.3333333333333) < 1e-9 && lida.l.some(r => r[0] === 'XXX'), 'valores com a precisão toda; SAP numérico como número e “XXX” como texto');

  console.log('COGS da operação vem do banco');
  await page.click('.ec-quim-modal .modal-close');
  await page.click('.eng2-card:has-text("BP — Macaé")');
  await page.click('button:has-text("+ Nova operação")');
  await page.waitForSelector('.eng-modal');
  await fld(page, 'Sonda').locator('select').selectOption({label: 'NS-32 - Norbe VIII'});
  await fld(page, 'Poço').locator('input').fill('7-QUIM-1-RJS');
  await fld(page, 'Data prevista').locator('input').fill('2026-11-05');
  await fld(page, 'Tipo de operação').locator('select').selectOption({label: 'Squeeze'});
  await page.click('.eng-modal button:text-is("Salvar")');
  await page.waitForSelector('.eng-modal', {state: 'detached'});
  await page.click('.db-tab:has-text("Lista")');
  const abrirCons = async () => {
    await page.click('tr:has-text("7-QUIM-1-RJS") button:has-text("Σ Consumo")');
    await page.waitForSelector('.ec-cons-modal');
  };
  await abrirCons();
  await page.selectOption('.ec-add-quim', '100003685');
  await page.fill('.ec-q-quim', '10');
  conf(await txt(page, '.ec-res-cogs') === 'US$ 131,50', 'consumo: 10 sk de Cimento Classe G × US$ 13,15 = US$ 131,50', await txt(page, '.ec-res-cogs'));
  await page.click('.ec-cons-ok');
  await page.waitForTimeout(300);

  console.log('Atualizar pela planilha (juntar)');
  // planilha alterada a partir da baixada: CIMENTO 14; CFR-3 repetido (vale 1,50); CADIT com descrição nova;
  // BARAZAN D fora; produto novo; linha sem SAP
  const b64 = await page.evaluate(b => {
    const w = XLSX.read(b, {type: 'base64'});
    const l = XLSX.utils.sheet_to_json(w.Sheets[w.SheetNames[0]], {header: 1, raw: true}).filter(r => r[0] !== 212324);
    l.forEach(r => { if (r[0] === 100003685) r[3] = 14; if (r[0] === 212659) r[1] = 'CADIT (TESTE)'; });
    l.push([100003653, 'CFR-3', 'LB', 1.5, '']);
    l.push([999000111, 'PRODUTO TESTE', 'GAL', 5.5, '']);
    l.push(['', 'SEM CODIGO', 'GAL', 2, '']);
    const n = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(n, XLSX.utils.aoa_to_sheet(l), 'Químicos');
    return XLSX.write(n, {bookType: 'xlsx', type: 'base64'});
  }, fs.readFileSync(pl.path).toString('base64'));
  const pl2 = path.join(TMP, 'Quimicos_atualizacao.xlsx');
  fs.writeFileSync(pl2, Buffer.from(b64, 'base64'));
  await page.click('.eng-quimicos');
  await page.waitForSelector('.ec-quim-tab');
  await carregar(page, pl2);
  let c = await chips(page);
  conf(c['ec-qp-novos'] === 1 && c['ec-qp-valor'] === 2 && c['ec-qp-texto'] === 1 && c['ec-qp-so'] === 1 && c['ec-qp-iguais'] === 56, 'prévia: 1 novo, 2 com valor alterado, 1 com descrição alterada, 56 sem mudança, 1 só no banco', c);
  conf(/aba “Químicos”, cabeçalho na linha 1 · 60 produto\(s\) lido\(s\)/.test(await txt(page, '.ec-quim-plan .hm-sum')), 'prévia mostra a aba e o cabeçalho achados', await txt(page, '.ec-quim-plan .hm-sum'));
  const vtab = await txt(page, '.ec-qp-tab-valor tbody');
  conf(/100003685 CIMENTO CLASS G SK US\$ 13,15 US\$ 14,00 \+6,46%/.test(vtab) && /100003653 CFR-3 LB US\$ 1,41 US\$ 1,50/.test(vtab), 'valor alterado: antes, depois e variação (+6,46%)', vtab);
  conf(/1 linha\(s\) sem SAP ignorada\(s\): linha 63 \(SEM CODIGO\)/.test(await txt(page, '.ec-qp-aviso')) && /SAP repetido na planilha \(vale a última linha\): 100003653/.test(await txt(page, '.ec-qp-aviso')), 'avisa a linha sem SAP e o SAP repetido', await txt(page, '.ec-qp-aviso'));
  conf(/212324BARAZAN DBAGUS\$ 85,93continua/.test(await page.$eval('.ec-qp-tab-so tbody', e => e.textContent)) && await page.$eval('.ec-qp-tab-so', e => !e.closest('details').open), '“Atualizar e acrescentar”: o produto que não está na planilha continua (lista recolhida)');
  await page.fill('.ec-qp-por', 'Eng Teste');
  await foto(page, 'q2_previa');
  await page.click('.ec-qp-aplicar');
  await page.waitForSelector('.ec-quim-plan', {state: 'detached'});
  let d = await banco(page);
  const q = s => d.quimicos.find(x => x.sap === s);
  conf(d.quimicos.length === 61 && q('100003685').usd === 14 && q('100003653').usd === 1.5 && q('212659').nome === 'CADIT (TESTE)' && q('212324') && q('999000111').usd === 5.5, 'aplicado e salvo: 61 produtos, valores e descrição novos, BARAZAN D mantido');
  let h = d.quimHist[d.quimHist.length - 1];
  conf(h.origem === 'planilha' && h.arquivo === 'Quimicos_atualizacao.xlsx' && h.por === 'Eng Teste' && h.novos === 1 && h.alterados === 3 && h.removidos === 0 && h.total === 61, 'histórico: planilha, arquivo, quem, 1 novo, 3 alterados, 61 no total', h);
  conf(/última atualização .* Planilha Quimicos_atualizacao\.xlsx · Eng Teste/.test(await txt(page, '.ec-quim-info')), 'tela mostra a última atualização');

  console.log('Atualizar pela planilha (substituir)');
  await carregar(page, pl2);
  c = await chips(page);
  conf(c['ec-qp-novos'] === 0 && c['ec-qp-valor'] === 0 && c['ec-qp-so'] === 1 && await page.locator('.ec-qp-aplicar').isDisabled(), 'a mesma planilha de novo, juntando: nada muda e “Aplicar” fica desligado');
  await page.check('.ec-qp-substituir');
  conf(/212324 BARAZAN D .* sai do banco/.test(await txt(page, '.ec-qp-tab-so tbody')) && /1 mudança/.test(await txt(page, '.ec-qp-res')), '“Substituir”: o produto que não está na planilha sai do banco');
  await page.click('.ec-qp-aplicar');
  await page.waitForSelector('.ec-quim-plan', {state: 'detached'});
  d = await banco(page);
  conf(d.quimicos.length === 60 && !d.quimicos.some(x => x.sap === '212324') && d.quimHist[d.quimHist.length - 1].removidos === 1, 'substituído: 60 produtos, sem o BARAZAN D');

  console.log('Planilha no formato do Forecast');
  const b64f = await page.evaluate(() => {
    const l = [[null, null, null, null, null, 'Status', 'Concluído'], [null, null, null, null, null, 'Sonda', 'NS-39'], [], ['Nome do Contrato', 'Item  PPU', 'Descrição ', null, 'UOM', 'Preço unitário'], ['BP', '1-1', 'Calcium Chloride', null, 'lbr', 1.5], [],
      ['SAP', 'Químicos', null, null, 'UOM', 'COGS'], [212324, 'BARAZAN D', null, null, 'BAG', 85.93], [100003685, 'CIMENTO CLASS G', null, null, 'SK', 13.15], [100003670, 'HALAD-344', null, null, 'LB', 5.24], [],
      ['SAP', 'Casing', null, null, 'UOM', 'COGS'], [103271022, 'SUPERFILL BB - SH,SFBB II', null, null, 'EA', 0]];
    const n = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(n, XLSX.utils.aoa_to_sheet([['Nome do Contrato/ ou Proposta', 'Nome do cliente']]), 'Banco de dados Contratos');
    XLSX.utils.book_append_sheet(n, XLSX.utils.aoa_to_sheet(l), 'Forecast');
    return XLSX.write(n, {bookType: 'xlsx', type: 'base64'});
  });
  const pl3 = path.join(TMP, 'Forecast_teste.xlsx');
  fs.writeFileSync(pl3, Buffer.from(b64f, 'base64'));
  await carregar(page, pl3);
  c = await chips(page);
  conf(/aba “Forecast”, cabeçalho na linha 7 · 3 produto\(s\) lido\(s\)/.test(await txt(page, '.ec-quim-plan .hm-sum')) && c['ec-qp-novos'] === 1 && c['ec-qp-valor'] === 1 && c['ec-qp-iguais'] === 1, 'acha a tabela Químicos (SAP, Químicos, UOM, COGS) e ignora PPU e Casing', [await txt(page, '.ec-quim-plan .hm-sum'), c]);
  await page.click('.ec-qp-aplicar');
  await page.waitForSelector('.ec-quim-plan', {state: 'detached'});
  d = await banco(page);
  conf(d.quimicos.length === 61 && q('212324').usd === 85.93 && q('100003685').usd === 13.15 && !d.quimicos.some(x => x.sap === '103271022'), 'aplicado: BARAZAN D volta, CIMENTO volta a 13,15, casing não entra');
  if (XLSX_BP) {
    await carregar(page, XLSX_BP);
    conf(/aba “Forecast”, cabeçalho na linha \d+ · 60 produto\(s\) lido\(s\)/.test(await txt(page, '.ec-quim-plan .hm-sum')), 'planilha do BP: os 60 produtos da aba Forecast', await txt(page, '.ec-quim-plan .hm-sum'));
    await page.click('.ec-quim-plan .modal-close');
  }

  console.log('Edição na tela');
  await page.locator('.ec-quim-tab tbody tr[data-sap="100003837"] input.ec-q-usd').fill('12,00');
  await page.click('.ec-quim-novo');
  const nova = page.locator('.ec-quim-tab tbody tr').first();
  conf(await nova.locator('.ec-q-sap').getAttribute('readonly') === null, 'produto novo aparece no topo, com SAP editável');
  await nova.locator('.ec-q-sap').fill('100003685');
  conf(/SAP repetido \(100003685\)/.test(await txt(page, '.ec-quim-modal .ec-foot')) && await page.locator('.ec-quim-salvar').isDisabled(), 'SAP repetido não deixa salvar');
  await nova.locator('.ec-q-sap').fill('999000222');
  await nova.locator('.ec-q-nome').fill('PRODUTO MANUAL');
  await nova.locator('.ec-q-unid').fill('LB');
  await nova.locator('.ec-q-usd').fill('1,5');
  await page.click('.ec-quim-salvar');
  await page.waitForTimeout(200);
  d = await banco(page);
  h = d.quimHist[d.quimHist.length - 1];
  conf(q('100003837').usd === 12 && q('999000222') && q('999000222').usd === 1.5 && h.origem === 'manual' && h.novos === 1 && h.alterados === 1, 'salvo na tela: MUSOL E US$ 12,00 e produto novo; histórico “Alteração na tela”', h);
  await page.click('.ec-quim-hist summary');
  conf(await page.locator('.ec-quim-hist tbody tr').count() === 5, 'histórico com as 5 atualizações (base, 3 planilhas e a tela)');
  await foto(page, 'q3_historico');
  await page.click('.ec-quim-modal .modal-close');

  console.log('COGS depois da atualização');
  await page.locator('.ec-quim-modal').waitFor({state: 'detached'});
  await page.click('.eng-quimicos');
  await page.locator('.ec-quim-tab tbody tr[data-sap="100003685"] input.ec-q-usd').fill('14');
  await page.click('.ec-quim-salvar');
  await page.click('.ec-quim-modal .modal-close');
  await abrirCons();
  conf(await txt(page, '.ec-res-cogs') === 'US$ 140,00' && /US\$ 14,00/.test(await txt(page, '.ec-mat-quim tbody')), 'consumo recalculado com o valor novo: 10 × US$ 14,00 = US$ 140,00', await txt(page, '.ec-res-cogs'));
  await page.click('.ec-cons-modal .modal-close');

  console.log('Exportar dados e base aplicada uma vez');
  const ex = await baixar(page, () => page.click('.eng-exportar'));
  const exj = JSON.parse(fs.readFileSync(ex.path, 'utf8'));
  conf(exj.db.quimicos.length === 62 && exj.db.quimHist.length === 6 && exj.resumo.quimicos === 62, 'exportar dados leva o banco de químicos e o histórico');
  await page.reload();
  await page.waitForSelector('.eng-tools');
  d = await banco(page);
  conf(d.quimicos.length === 62 && q('100003685').usd === 14, 'depois de reabrir, o banco continua como foi salvo (a base não volta)');
  // computador com dados de antes da e6 (sem o banco): a base entra
  await page.evaluate(() => { const x = JSON.parse(localStorage.getItem('hal_cmt_db_v1')); delete x.quimicos; delete x.quimHist; delete x.quimBaseV1; localStorage.setItem('hal_cmt_db_v1', JSON.stringify(x)); });
  await page.reload();
  await page.waitForSelector('.eng-tools');
  await page.click('.eng-quimicos');
  conf(await page.locator('.ec-quim-tab tbody tr').count() === 60, 'dados de antes da e6: a base de 60 produtos entra ao abrir');
  // banco esvaziado de propósito: a base não volta
  await page.evaluate(() => { const x = JSON.parse(localStorage.getItem('hal_cmt_db_v1')); x.quimicos = []; x.quimBaseV1 = '2026-11-02T00:00:00.000Z'; localStorage.setItem('hal_cmt_db_v1', JSON.stringify(x)); });
  await page.reload();
  await page.waitForSelector('.eng-tools');
  await page.click('.eng-quimicos');
  conf(/Nenhum produto/.test(await txt(page, '.ec-quim-tab tbody')) && /Modelo da planilha/.test(await txt(page, '.ec-quim-baixar')), 'banco esvaziado pelo usuário: a base não volta e o botão vira “Modelo da planilha”');
  await page.click('.ec-quim-modal .modal-close');

  console.log('Celular');
  const M = await abrir(ARQ, {w: 390, h: 844, hoje: '2026-11-02'});
  await M.page.waitForSelector('.eng-tools', {timeout: 60000});
  await M.page.click('.eng-quimicos');
  await M.page.waitForSelector('.ec-quim-tab');
  conf(await M.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'celular: sem rolagem lateral da página');
  await foto(M.page, 'q4_celular');
  conf(M.errs.length === 0, 'celular: nenhum erro', M.errs.slice(0, 3));
  await M.browser.close();

  conf(errs.length === 0, 'nenhum erro no console', errs.slice(0, 5));
  await browser.close();
  console.log(`\n${ok} ok, ${falhas} falha(s)`);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
