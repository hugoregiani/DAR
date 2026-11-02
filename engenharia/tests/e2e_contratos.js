// Teste de ponta a ponta dos Contratos do EARL Engenharia (e2):
// cadastro com planilha (xlsx e CSV do Excel em português), valores em R$ e US$, reajustes por data,
// consumo de PPU por operação, saldo e receita (por operação, item, mês e contrato) e o Excel.
// Uso: node tests/e2e_contratos.js [EARL_Engenharia.html] [pasta para as telas]
const {abrir} = require('./harness');
const fs = require('fs');
const path = require('path');
const ARQ = process.argv[2] || path.join(__dirname, '..', 'EARL_Engenharia.html');
const SHOTS = process.argv[3] || '';
let ok = 0, falhas = 0;
const conf = (cond, msg, extra) => {
  if (cond) { ok++; console.log('  ✓ ' + msg); } else { falhas++; console.log('  ✗ ' + msg + (extra !== undefined ? ' → ' + JSON.stringify(extra) : '')); }
};
const foto = async (page, nome) => { if (SHOTS) await page.screenshot({path: path.join(SHOTS, nome + '.png')}); };
const fld = (page, rot) => page.locator('.eng-modal .fld').filter({has: page.locator('label', {hasText: rot})}).first();
async function escolher(page, titulo, busca, qtds) {
  const rp = page.locator('.eng-modal .rp').filter({has: page.locator('.rp-t', {hasText: titulo})});
  await rp.locator('.rp-btn').click();
  if (busca) await rp.locator('.rp-search').fill(busca);
  const itens = rp.locator('.rp-item input[type=checkbox]');
  for (let i = 0; i < qtds.length; i++) await itens.nth(i).check();
  await rp.locator('button', {hasText: 'Concluir seleção'}).click();
  const q = rp.locator('.rp-qty');
  const n = await q.count();
  for (let i = 0; i < qtds.length; i++) await q.nth(n - qtds.length + i).fill(String(qtds[i]));
}
async function carregar(page, botao, arquivo) {
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click(botao)]);
  await fc.setFiles(arquivo);
}
async function baixar(page, acao) {
  const [dl] = await Promise.all([page.waitForEvent('download'), acao()]);
  return {nome: dl.suggestedFilename(), buf: fs.readFileSync(await dl.path())};
}
const lerXlsx = (page, buf) => page.evaluate(b64 => {
  const wb = XLSX.read(b64, {type: 'base64'});
  const o = {};
  wb.SheetNames.forEach(n => { o[n] = XLSX.utils.sheet_to_json(wb.Sheets[n], {header: 1, raw: true}); });
  return o;
}, buf.toString('base64'));
const txt = async (page, sel) => (await page.innerText(sel)).replace(/\s+/g, ' ').trim();
const kpi = (page, cls) => txt(page, '.' + cls + ' b');

(async () => {
  const {browser, page, errs} = await abrir(ARQ, {h: 1000, hoje: '2026-11-02'});
  await page.waitForSelector('.eng2-card', {timeout: 60000});
  console.log('Lista de contratos');
  await page.click('.eng-tools button:has-text("Contratos")');
  await page.waitForSelector('.ec-lista');
  conf(await page.locator('.ec-row').count() === 16, 'botão Contratos lista os 16 contratos do cadastro');
  await foto(page, 'c1_lista');

  console.log('Novo contrato pela planilha');
  await page.click('.ec-novo');
  await page.fill('.ec-cli', 'Petrobras');
  await page.fill('.ec-nome', 'Contrato Teste Macaé');
  await page.fill('.ec-numero', '5900.9999999.26');
  await page.fill('.ec-inicio', '2026-01-01');
  await page.locator('.ec-bases label', {hasText: 'Macaé'}).locator('input').check();
  // xlsx com códigos como texto ("1.10") e números escritos no padrão brasileiro
  const xlsxB64 = await page.evaluate(() => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Item', 'Descrição', 'Unidade', 'Saldo', 'Valor R$', 'Valor US$'],
      ['1.1', 'Taxa de cimentação', 'dia', 100, 1500, 280],
      ['1.10', 'Bombeio adicional', 'hora', '1.000', '250,50', 45.5],
      ['2.1', 'Teste de pressão', 'operação', 20, 3200, 600]]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'PPU');
    return XLSX.write(wb, {bookType: 'xlsx', type: 'base64'});
  });
  await carregar(page, '.ec-carregar', {name: 'ppu_teste.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(xlsxB64, 'base64')});
  await page.waitForSelector('.ec-imp-ok');
  conf(/3 item\(ns\) lido\(s\)/.test(await txt(page, '.ec-imp-n')), 'planilha: 3 itens lidos');
  conf(/3 novo\(s\)/.test(await txt(page, '.ec-imp-res')), 'planilha: 3 novos');
  await page.click('.ec-imp-ok');
  const refs = await page.$$eval('.ec-itens input.ec-ref', x => x.map(e => e.value));
  conf(refs.join() === '1.1,1.10,2.1', 'códigos dos itens como na planilha ("1.10" não vira 1.1)', refs);
  const v110 = await page.$$eval('.ec-itens tbody tr:nth-child(2) input', x => x.map(e => e.value));
  conf(v110[3] === '1000' && v110[4] === '250,5' && v110[5] === '45,5', 'saldo "1.000" = 1000 e valor "250,50" = 250,5', v110);
  await page.click('.ec-bar button:has-text("＋ Linha")');
  conf(/item \(código\)/.test(await txt(page, '.ec-foot')), 'linha sem código impede salvar');
  await page.locator('.ec-itens tbody tr').last().locator('.hm-x').click();
  // CSV do Excel em português (Windows-1252, ponto e vírgula): acrescenta um item com acentos
  const csv = Buffer.from('Item;Descrição;Unidade;Saldo;Valor R$;Valor US$\r\n3.1;Cimentação de revestimento;operação;5;12.345,67;2.000,50\r\n', 'latin1');
  await carregar(page, '.ec-carregar', {name: 'mais.csv', mimeType: 'text/csv', buffer: csv});
  await page.waitForSelector('.ec-imp-ok');
  conf(/1 novo\(s\)/.test(await txt(page, '.ec-imp-res')), 'CSV: 1 item novo, os outros ficam');
  await page.click('.ec-imp-ok');
  const v31 = await page.$$eval('.ec-itens tbody tr:nth-child(4) input', x => x.map(e => e.value));
  conf(v31.join('|') === '3.1|Cimentação de revestimento|operação|5|12345,67|2000,5', 'CSV com acentos e "12.345,67" lido certo', v31);
  await foto(page, 'c2_novo');
  await page.click('.ec-salvar');
  await page.waitForTimeout(300);
  conf(!/Alterações não salvas/.test(await txt(page, '.ec-foot')), 'contrato salvo');
  await page.click('.ec-volta');
  conf(await page.locator('.ec-row').count() === 17, 'lista com o contrato novo');
  conf(/4 de 4/.test(await txt(page, '.ec-row:has-text("Contrato Teste")')), 'contrato novo: 4 de 4 itens com valor');

  console.log('Reajustes');
  await page.click('.ec-row:has-text("Contrato Teste")');
  await page.click('.ec-novo-reaj');
  await page.fill('.ec-desde', '2026-11-05');
  await page.fill('.ec-obs', 'IPCA');
  await page.fill('.ec-pct-brl', '10');
  await page.click('.ec-pct button:has-text("Aplicar %")');
  const nb = await page.$$eval('input.ec-nbrl', x => x.map(e => e.value));
  conf(nb.join('|') === '1650|275,55|3520|13580,237', '10% em R$ aplicado em todas as linhas', nb);
  const nu = await page.$$eval('input.ec-nusd', x => x.map(e => e.value));
  conf(nu.every(v => v === ''), 'US$ fica sem mudança');
  await foto(page, 'c3_reajuste');
  await page.click('.ec-reaj-ok');
  await page.waitForTimeout(300);
  conf(await page.locator('.ec-reaj').count() === 1 && /A partir de 05\/11\/2026/.test(await txt(page, '.ec-reajs')), 'reajuste salvo (a partir de 05/11/2026)');
  conf(/R\$ 1\.500,00/.test(await txt(page, '.ec-itens tbody tr:first-child .ec-vig')), 'hoje (02/11) ainda vale o valor antigo');
  // segundo reajuste, só em US$, carregado de um CSV
  await page.click('.ec-novo-reaj');
  await page.fill('.ec-desde', '2027-01-01');
  await carregar(page, '.ec-reaj-modal button:has-text("Carregar valores da planilha")', {name: 'reaj.csv', mimeType: 'text/csv', buffer: Buffer.from('Item;Valor US$\n2.1;650,00\n9.9;1\n', 'latin1')});
  await page.waitForSelector('.ec-imp-ok');
  conf(/1 item\(ns\) do contrato recebem/.test(await txt(page, '.ec-imp-res')) && /1 item\(ns\) da planilha não estão/.test(await txt(page, '.ec-imp-res')), 'reajuste pela planilha: 1 item do contrato, 1 desconhecido fica de fora');
  await page.click('.ec-imp-ok');
  conf(await page.inputValue('.ec-itens tbody tr:nth-child(3) input.ec-nusd') === '650', 'valor US$ novo do item 2.1 = 650');
  await page.click('.ec-reaj-ok');
  await page.waitForTimeout(300);
  conf(await page.locator('.ec-reaj').count() === 2, '2 reajustes');
  // trava do código usado: testada depois do consumo
  await page.click('.ec-modal .modal-close');
  conf(await page.locator('.eng2-card').count() === 18, 'contrato novo aparece na Engenharia');

  console.log('Operações e consumo');
  await page.click('.eng2-card:has-text("Contrato Teste")');
  const novaOp = async (poco, data, qtds) => {
    await page.click('button:has-text("+ Nova operação")');
    await page.waitForSelector('.eng-modal');
    await fld(page, 'Sonda').locator('select').selectOption({label: 'Norbe VIII'});
    await fld(page, 'Poço').locator('input').fill(poco);
    await fld(page, 'Data prevista').locator('input').fill(data);
    await fld(page, 'Tipo de operação').locator('select').selectOption({label: 'Squeeze'});
    await escolher(page, 'Itens PPU', '', qtds);
    await page.click('.eng-modal button:text-is("Salvar")');
    await page.waitForSelector('.eng-modal', {state: 'detached'});
  };
  await novaOp('7-TST-1-RJS', '2026-11-03', [2, 10]);
  await novaOp('7-TST-2-RJS', '2026-11-10', [1]);
  await page.click('.db-tab:has-text("Lista")');
  await page.click('tr:has-text("7-TST-1-RJS") button:has-text("Σ Consumo")');
  await page.waitForSelector('.ec-cons-modal');
  conf(await page.locator('.ec-cons tbody tr').count() === 2, 'consumo começa com os itens PPU previstos');
  await page.click('.ec-cons-modal button:has-text("Copiar previsto")');
  conf(await txt(page, '.ec-tot-brl') === 'R$ 5.505,00' && await txt(page, '.ec-tot-usd') === 'US$ 1.015,00', 'previsto copiado: 2×1.500 + 10×250,50 = R$ 5.505,00 · US$ 1.015,00');
  await page.selectOption('.ec-add', '2.1');
  await page.locator('.ec-cons tbody tr:has-text("2.1") input.ec-qtd').fill('1');
  conf(await txt(page, '.ec-tot-brl') === 'R$ 8.705,00' && await txt(page, '.ec-tot-usd') === 'US$ 1.615,00', 'item acrescentado: total R$ 8.705,00 · US$ 1.615,00');
  await foto(page, 'c4_consumo');
  await page.click('.ec-cons-ok');
  await page.waitForTimeout(300);
  conf(/Σ R\$ 8\.705,00/.test(await txt(page, 'tr:has-text("7-TST-1-RJS")')), 'lista mostra a receita da operação');
  await page.click('tr:has-text("7-TST-2-RJS") button:has-text("Σ Consumo")');
  await page.waitForSelector('.ec-cons-modal');
  conf(await page.inputValue('.ec-cons-data') === '2026-11-10', 'data do serviço = data da operação');
  await page.locator('.ec-cons tbody tr:has-text("1.1") input.ec-qtd').first().fill('1');
  await page.selectOption('.ec-add', '2.1');
  await page.locator('.ec-cons tbody tr:has-text("2.1") input.ec-qtd').fill('25');
  conf(/Acima do saldo disponível: 2\.1/.test(await txt(page, '.ec-cons-modal')), 'aviso de consumo acima do saldo (20 − 1 = 19)');
  await page.locator('.ec-cons tbody tr:has-text("2.1") input.ec-qtd').fill('2');
  conf(await txt(page, '.ec-tot-brl') === 'R$ 8.690,00' && await txt(page, '.ec-tot-usd') === 'US$ 1.480,00', 'depois do reajuste: 1.650 + 2×3.520 = R$ 8.690,00 · US$ 1.480,00');
  await page.click('.ec-cons-ok');
  await page.waitForTimeout(300);

  console.log('Consumo e receita');
  await page.click('.db-tab:has-text("Consumo e receita")');
  await page.waitForSelector('.ec-rec');
  conf(await kpi(page, 'ec-kpi-brl') === 'R$ 17.395,00' && await kpi(page, 'ec-kpi-usd') === 'US$ 3.095,00', 'receita do contrato: R$ 17.395,00 · US$ 3.095,00');
  conf(await page.locator('.ec-ops tbody tr').count() === 2, 'receita por operação: 2 operações');
  const s11 = await txt(page, '.ec-saldo tbody tr:nth-child(1)');
  const s21 = await txt(page, '.ec-saldo tbody tr:nth-child(3)');
  conf(/^1\.1 Taxa de cimentação dia 100 3 97 /.test(s11), 'saldo do item 1.1: 100 − 3 = 97', s11);
  conf(/^2\.1 Teste de pressão operação 20 3 17 /.test(s21), 'saldo do item 2.1: 20 − 3 = 17', s21);
  conf(/nov\/2026 2 R\$ 17\.395,00 US\$ 3\.095,00/.test(await txt(page, '.ec-mes')), 'receita por mês');
  await foto(page, 'c5_receita');
  await page.fill('.ec-de', '2026-11-05');
  conf(await kpi(page, 'ec-kpi-brl') === 'R$ 8.690,00', 'período a partir de 05/11: só a 2ª operação');
  await page.click('.ec-per button:has-text("Limpar")');
  const xl = await baixar(page, () => page.click('.ec-excel'));
  const wb = await lerXlsx(page, xl.buf);
  conf(/^Consumo e receita - Contrato Teste Macae - 2026-11-02\.xlsx$/.test(xl.nome), 'Excel com o nome do contrato', xl.nome);
  conf(Object.keys(wb).join() === 'Operações,Itens,Lançamentos' && wb['Operações'].length === 3 && wb['Lançamentos'].length === 6, 'Excel: Operações (2), Itens e Lançamentos (5)', Object.keys(wb).map(k => k + ':' + wb[k].length));

  console.log('Reajuste retroativo, trava e consistência');
  await page.click('.eng-tools button:has-text("Contratos")');
  await page.click('.ec-row:has-text("Contrato Teste")');
  await page.locator('.ec-reaj', {hasText: '05/11/2026'}).locator('button:has-text("Abrir")').click();
  await page.fill('.ec-desde', '2026-11-01');
  conf(/2 operação\(ões\) com consumo lançado/.test(await txt(page, '.ec-reaj-modal')), 'reajuste com data anterior avisa que muda a receita de 2 operações');
  await page.click('.ec-reaj-modal button:has-text("Cancelar")');
  conf(await page.getAttribute('.ec-itens tbody tr:first-child input.ec-ref', 'readonly') !== null, 'código usado em operação não pode ser mudado');
  await page.locator('.ec-itens tbody tr:first-child .hm-x').click();
  await page.waitForTimeout(200);
  conf(/usado em 2 operação/.test(await page.innerText('body')) && await page.locator('.ec-itens tbody tr').count() === 4, 'item usado em operação não pode ser tirado');
  const pl = await baixar(page, () => page.click('.ec-bar button:has-text("Baixar planilha")'));
  const plw = await lerXlsx(page, pl.buf);
  conf(plw.PPU.length === 5 && plw.PPU[2].join('|') === '1.10|Bombeio adicional|hora|1000|250.5|45.5', 'planilha baixada com os 4 itens e valores', plw.PPU[2]);
  await page.click('.ec-modal .modal-close');
  await page.click('.db-tab:has-text("Lista")');
  await page.click('tr:has-text("7-TST-1-RJS") button:has-text("Editar")');
  await page.waitForSelector('.eng-modal .ec-banner');
  conf(/R\$ 8\.705,00/.test(await txt(page, '.eng-modal .ec-banner')), 'a operação mostra o consumo lançado');
  await page.click('.eng-modal button:text-is("Salvar")');
  await page.waitForTimeout(300);
  const ainda = await page.evaluate(() => JSON.parse(localStorage.getItem('hal_cmt_db_v1')).plannedJobs.filter(j => j.ppuCons).length);
  conf(ainda === 2, 'salvar a operação não apaga o consumo', ainda);

  console.log('Visão geral e apagar consumo');
  await page.click('.eng2-ctbar-sw');
  await page.click('.eng2-card:has-text("Visão geral")');
  await page.click('.db-tab:has-text("Consumo e receita")');
  await page.waitForSelector('.ec-cts');
  conf(/Contrato Teste Macaé Petrobras 2 R\$ 17\.395,00 US\$ 3\.095,00/.test(await txt(page, '.ec-cts tbody')), 'Visão geral: receita por contrato');
  await page.locator('.ec-ops tr', {hasText: '7-TST-2-RJS'}).locator('button:has-text("Σ Consumo")').click();
  await page.click('.ec-cons-modal button:has-text("Apagar consumo")');
  await page.locator('.modal').filter({hasText: 'Apagar consumo'}).locator('button', {hasText: /^Apagar$/}).click();
  await page.waitForTimeout(300);
  conf(await kpi(page, 'ec-kpi-brl') === 'R$ 8.705,00', 'consumo apagado sai da receita');
  conf(/1 realizada\(s\) sem consumo/.test(await txt(page, '.ec-kpis')) === false, 'operação futura não conta como pendente');

  console.log('Persistência');
  await page.reload();
  await page.waitForSelector('.eng2-card', {timeout: 60000});
  const db = await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('hal_cmt_db_v1')); const c = d.contratos.find(x => x.name === 'Contrato Teste Macaé'); return {it: c.items.length, rj: c.reajustes.map(r => r.desde), brl: c.items[0].brl, cli: c.clientId, reg: c.regiao}; });
  conf(db.it === 4 && db.rj.join() === '2026-11-05,2027-01-01' && db.brl === 1500 && db.reg === 'macae' && !!db.cli, 'contrato gravado com itens, valores, reajustes, cliente e região', db);

  conf(errs.length === 0, 'nenhum erro no console', errs.slice(0, 5));
  await browser.close();
  console.log(`\n${ok} ok, ${falhas} falha(s)`);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
