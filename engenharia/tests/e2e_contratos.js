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
    await fld(page, 'Sonda').locator('select').selectOption({label: 'NS-32 - Norbe VIII'});
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

  console.log('Levar para outro computador (exportar → importar e juntar)');
  const ex = await baixar(page, () => page.click('.eng-tools button:has-text("Exportar dados")'));
  const exPath = path.join(require('os').tmpdir(), ex.nome);
  fs.writeFileSync(exPath, ex.buf);
  const pc2 = await abrir(ARQ, {h: 1000, hoje: '2026-11-02'});
  const p2 = pc2.page;
  await p2.waitForSelector('.eng2-card', {timeout: 60000});
  await p2.click('.eng2-card:has-text("P&A — Macaé")');
  await p2.click('button:has-text("+ Nova operação")');
  await fld(p2, 'Sonda').locator('select').selectOption({label: 'NS-32 - Norbe VIII'});
  await fld(p2, 'Poço').locator('input').fill('7-PC2-1-RJS');
  await fld(p2, 'Data prevista').locator('input').fill('2026-11-20');
  await fld(p2, 'Tipo de operação').locator('select').selectOption({label: 'Abandono'});
  await p2.click('.eng-modal button:text-is("Salvar")');
  await p2.waitForSelector('.eng-modal', {state: 'detached'});
  await p2.setInputFiles('.eng-tools input[type=file]', exPath);
  await p2.waitForSelector('.ec-imp-dados');
  const tab2 = (await p2.innerText('.ec-imp-tab')).replace(/\s+/g, ' ');
  conf(/Operações 1 2 3/.test(tab2) && /Contratos 16 17 17/.test(tab2), 'outro computador: 1 operação aqui + 2 no arquivo = 3 depois de juntar', tab2);
  await Promise.all([p2.waitForEvent('load'), p2.click('.ec-juntar')]);
  await p2.waitForSelector('.eng2-card', {timeout: 60000});
  const j2 = await p2.evaluate(() => { const d = JSON.parse(localStorage.getItem('hal_cmt_db_v1')); const c = d.contratos.find(x => x.name === 'Contrato Teste Macaé'); return {ops: d.plannedJobs.map(j => j.well).sort(), cons: d.plannedJobs.filter(j => j.ppuCons).length, rj: c ? c.reajustes.length : -1, brl: c ? c.items[0].brl : null}; });
  conf(j2.ops.join() === '7-PC2-1-RJS,7-TST-1-RJS,7-TST-2-RJS' && j2.cons === 1 && j2.rj === 2 && j2.brl === 1500, 'depois de juntar: as 3 operações, o consumo, o contrato com valores e reajustes', j2);
  await p2.click('.eng2-card:has-text("Contrato Teste")');
  await p2.click('.db-tab:has-text("Consumo e receita")');
  conf(await kpi(p2, 'ec-kpi-brl') === 'R$ 8.705,00', 'outro computador vê a mesma receita');
  conf(pc2.errs.length === 0, 'outro computador: nenhum erro', pc2.errs.slice(0, 3));
  await pc2.browser.close();

  console.log('Tela pequena (1366×768)');
  const pq = await abrir(ARQ, {w: 1366, h: 768, hoje: '2026-11-02'});
  const p3 = pq.page;
  await p3.waitForSelector('.eng2-card', {timeout: 60000});
  await p3.click('.eng-tools button:has-text("Contratos")');
  await p3.click('.ec-row:has-text("BP —")');
  await p3.waitForSelector('.ec-itens');
  const hBP = await p3.$eval('.ec-modal .ec-itens-wrap', e => e.getBoundingClientRect().height);
  conf(hBP > 300, 'contrato existente: a tabela dos 132 itens aparece (não encolhe)', hBP);
  const foot = await p3.$eval('.ec-modal > .ec-foot', e => e.getBoundingClientRect().bottom);
  conf(foot <= 768, '"Salvar contrato" sempre visível no rodapé da janela', foot);
  await p3.click('.ec-bar button:has-text("＋ Linha")');
  await p3.waitForTimeout(150);
  const foco = await p3.evaluate(() => { const ins = [...document.querySelectorAll('.ec-modal .ec-itens input.ec-ref')]; return [ins.length, document.activeElement === ins[ins.length - 1]]; });
  conf(foco[0] === 133 && foco[1], '＋ Linha leva à linha nova com o cursor no código', foco);
  await p3.fill('.ec-modal .ec-itens tbody tr:last-child input.ec-ref', '99.1');
  await p3.fill('.ec-modal .ec-itens tbody tr:last-child input.ec-brl', '10,5');
  conf(await p3.locator('.ec-modal .ec-itens tbody tr:last-child input.ec-brl').isVisible(), 'campos da linha nova visíveis para preencher');
  await p3.click('.ec-volta');
  await p3.locator('.modal').filter({hasText: 'Sair sem salvar'}).locator('button', {hasText: /^Sair sem salvar$/}).click();
  await p3.click('.ec-novo');
  for (let i = 0; i < 3; i++) await p3.click('.ec-bar button:has-text("＋ Linha")');
  const hNovo = await p3.$eval('.ec-modal .ec-itens-wrap', e => e.getBoundingClientRect().height);
  conf(hNovo >= 150 && await p3.locator('.ec-modal .ec-itens tbody tr').count() === 3 && await p3.locator('.ec-modal .ec-itens tbody tr:first-child input.ec-usd').isVisible(), 'contrato novo: as 3 linhas aparecem com os campos', hNovo);
  await p3.screenshot({path: SHOTS ? path.join(SHOTS, 'c6_tela_pequena.png') : path.join(require('os').tmpdir(), 'c6.png')});
  conf(pq.errs.length === 0, 'tela pequena: nenhum erro', pq.errs.slice(0, 3));
  await pq.browser.close();

  console.log('Custos (COGS) e risco da operação');
  await page.click('.eng-tools button:has-text("Contratos")');
  await page.click('.ec-cogs-btn');
  await page.waitForSelector('.ec-cogs-tab');
  await carregar(page, '.ec-cogs-carregar', {name: 'cogs.csv', mimeType: 'text/csv', buffer: Buffer.from('SAP;Químicos;UOM;COGS\r\n101249407;CHEM, HALAD-344 EXP, TOTE TANK;GAL;10,00\r\n100003685;CIMENTO CLASS G;SK;13,15\r\n', 'latin1')});
  await page.waitForTimeout(200);
  conf(await page.locator('.ec-cogs-tab tbody tr').count() === 2 && await page.inputValue('.ec-cogs-tab tbody tr:first-child input.ec-c-usd') === '10', 'COGS: planilha carregada (coluna “COGS” vale como US$)');
  await page.click('.ec-cogs-salvar');
  await page.waitForTimeout(200);
  conf(await page.evaluate(() => JSON.parse(localStorage.getItem('hal_cmt_db_v1')).cogsItens.length) === 2, 'COGS salvo');
  await page.click('.ec-modal .modal-close');
  if (await page.locator('.eng2-ctbar').count()) await page.click('.eng2-ctbar-sw');
  await page.click('.eng2-card:has-text("Contrato Teste")');
  await page.click('.db-tab:has-text("Lista")');
  await page.click('tr:has-text("7-TST-1-RJS") button:has-text("Σ Consumo")');
  await page.waitForSelector('.ec-cons-modal');
  await page.selectOption('.ec-add-quim', '101249407');
  await page.fill('.ec-q-quim', '5');
  conf(/US\$ 50,00/.test(await txt(page, '.ec-mat-quim tbody')) && await txt(page, '.ec-res-cogs') === 'US$ 50,00' && (await txt(page, '.ec-res-margem')).startsWith('US$ 1.565,00'), 'consumo: COGS da química (5 × US$ 10) e margem', [await txt(page, '.ec-res-cogs'), await txt(page, '.ec-res-margem')]);
  await page.click('.ec-cons-ok');
  await page.waitForTimeout(300);
  await page.click('.db-tab:has-text("Consumo e receita")');
  conf(await txt(page, '.ec-kpi-cogs b') === 'US$ 50,00' && await txt(page, '.ec-kpi-margem b') === 'US$ 1.565,00', 'aba de receita: COGS e margem', [await txt(page, '.ec-kpi-cogs b'), await txt(page, '.ec-kpi-margem b')]);
  const risco = async v => {
    await page.click('.db-tab:has-text("Lista")');
    await page.click('tr:has-text("7-TST-1-RJS") button:has-text("Editar")');
    await page.fill('.eng-modal .ec-risco-in', String(v));
    const ajuda = await txt(page, '.ec-risco-fld');
    await page.click('.eng-modal button:text-is("Salvar")');
    await page.waitForSelector('.eng-modal', {state: 'detached'});
    return ajuda;
  };
  conf(/fora da receita e do COGS/.test(await risco(100)), 'campo “Risco da receita / COGS” explica o 100%');
  conf(/risco 100%/.test(await txt(page, 'tr:has-text("7-TST-1-RJS")')), 'lista mostra o risco da operação');
  await page.click('.db-tab:has-text("Consumo e receita")');
  conf(await txt(page, '.ec-kpi-usd b') === 'US$ 0,00' && await txt(page, '.ec-kpi-brl b') === 'R$ 0,00' && await txt(page, '.ec-kpi-cogs b') === 'US$ 0,00', 'risco 100%: operação mapeada, fora da receita e do COGS');
  await risco(50);
  await page.click('.db-tab:has-text("Consumo e receita")');
  conf(await txt(page, '.ec-kpi-usd b') === 'US$ 807,50' && await txt(page, '.ec-kpi-cogs b') === 'US$ 25,00', 'risco 50%: metade da receita e do COGS', [await txt(page, '.ec-kpi-usd b'), await txt(page, '.ec-kpi-cogs b')]);
  const pj1 = await page.evaluate(() => JSON.parse(localStorage.getItem('hal_cmt_db_v1')).plannedJobs.find(j => j.well === '7-TST-1-RJS'));
  conf(pj1.riscoRec === 50 && pj1.ppuCons && pj1.ppuCons.quim.length === 1, 'risco gravado na operação e consumo preservado', [pj1.riscoRec]);
  // contingência (chance de acontecer) não pode sobrescrever o risco da receita no arquivo do gerencial
  await page.click('.db-tab:has-text("Lista")');
  await page.click('tr:has-text("7-TST-1-RJS") button:has-text("Editar")');
  await page.locator('.eng-modal label:has-text("Operação em contingência") input[type=checkbox]').check();
  await page.click('.eng-modal button:text-is("Salvar")');
  await page.waitForSelector('.eng-modal', {state: 'detached'});
  await page.click('.eng-tools button:has-text("Arquivo do gerencial")');
  await page.waitForSelector('.ec-ger-modal');
  const [dlG] = await Promise.all([page.waitForEvent('download'), page.click('.ec-ger-ok')]);
  const pacG = JSON.parse(fs.readFileSync(await dlG.path(), 'utf8'));
  const opG = pacG.operacoes.find(o => o.poco === '7-TST-1-RJS');
  conf(opG && opG.risco === 50 && opG.contingencia === true && typeof opG.chanceConting === 'number', 'arquivo do gerencial: operação em contingência mantém o risco da receita (50%)', opG && {risco: opG.risco, cont: opG.contingencia, chance: opG.chanceConting});

  console.log('Página inicial: seção Receita e margem (a do Gerencial, embutida)');
  await page.click('.eng2-ctbar-sw');
  await page.waitForSelector('.ec-ger-frame');
  const gf = async () => { const h = await page.$('.ec-ger-frame'); const f = await h.contentFrame(); await f.waitForSelector('.kpis', {timeout: 30000}); return f; };
  let fg = await gf();
  const pn = () => fg.evaluate(() => {
    const t = s => ((document.querySelector(s) || {}).textContent || '').trim();
    return {usd: t('.k-rec-usd b'), usdSub: t('.k-rec-usd em'), op: t('.k-rec-op b'), opSub: t('.k-rec-op em'), cards: [...document.querySelectorAll('.kpis .kpi > span')].map(s => s.textContent), cogs: t('.k-cogs b'), mg: t('.k-margem b'), mgSub: t('.k-margem em'), ops: t('.k-ops b'),
      filtros: [...document.querySelectorAll('.filtros label')].map(l => l.textContent), q4: t('.qc[data-q="4"] b'), nq: document.querySelectorAll('.qc').length, ano: document.querySelectorAll('.qc[data-q=""]').length, meses: [...document.querySelectorAll('.t-mx th.mx-mes:not(.mx-q)')].map(th => th.textContent), mx: !!document.querySelector('.t-mx'), abas: document.querySelectorAll('.tabs').length, arqs: document.querySelectorAll('[data-a="arq"]').length};
  });
  let v = await pn();
  conf(v.usd === 'US$ 1.087,50' && v.usdSub === 'realizado US$ 807,50 · previsto US$ 280,00' && v.cogs === 'US$ 25,00' && v.mg === 'US$ 1.062,50' && v.ops === '2', 'receita realizada (com risco 50%) + prevista, COGS e margem — os números de antes', v);
  conf(v.cards.join('|') === 'Receita em US$|COGS em US$|Operações|Receita / operação (US$)|Margem em US$' && v.op === 'US$ 543,75', 'cartões do Gerencial (Receita, COGS, Operações, Receita/operação, Margem); receita por operação US$ 1.087,50 ÷ 2', v);
  conf(v.filtros.join('|') === 'Ano|Quarto (início e fim)|Mês (início e fim)|Cliente|Contrato|Região|Tipo de contrato' && v.abas === 0 && v.arqs === 0, 'filtros iguais aos do Gerencial; sem as abas e sem carregar arquivos', v.filtros);
  conf(v.q4 === 'US$ 1.087,50' && v.nq === 4 && v.ano === 0 && v.mx && v.meses.join() === 'nov/2026' && await fg.locator('#graf .g-svg').count() === 1, 'só os 4 cartões dos quartos (sem o "Total do ano", que repetia a receita de cima), gráfico e a matriz (nov/2026)', v);
  await foto(page, 'c7_painel');
  await fg.click('.mes-box'); await fg.click('[data-mesb="10"]'); await fg.click('[data-mesb="10"]');
  v = await pn();
  conf(v.usd === 'US$ 0,00' && v.ops === '0', 'mês outubro: nenhuma operação', v);
  await fg.click('.q-box'); await fg.click('[data-qb="1"]'); await fg.hover('[data-qb="4"]');
  const pv = await fg.$$eval('.q-grid .q-b', l => l.map(b => (b.classList.contains('pv-ponta') ? 'P' : b.classList.contains('pv') ? 'p' : '-')).join(''));
  await fg.click('[data-qb="4"]');
  v = await pn();
  conf(pv === 'PppP' && v.usd === 'US$ 1.087,50' && /Q1 – Q4/.test(await fg.textContent('.q-box')), 'quartos Q1 a Q4 (prévia ao passar o cursor) valem no lugar do mês', {pv, usd: v.usd});
  await fg.click('[data-a="limparf"]');
  const ctTeste = await fg.locator('[data-f="contrato"] option', {hasText: 'Contrato Teste'}).getAttribute('value');
  await fg.selectOption('[data-f="contrato"]', ctTeste);
  v = await pn();
  conf(v.usd === 'US$ 1.087,50' && v.ops === '2', 'filtro por contrato', v);
  await fg.selectOption('[data-f="contrato"]', '');
  console.log('Recolher, mostrar e dados novos');
  await page.click('.ec-painel-tg');
  conf(!(await page.locator('.ec-ger-frame').count()) && await txt(page, '.ec-painel-tg') === 'Mostrar', 'a seção recolhe');
  await page.reload();
  await page.waitForSelector('.eng2-card, .eng2-ctbar', {timeout: 60000});
  conf(!(await page.locator('.ec-ger-frame').count()) && await txt(page, '.ec-painel-tg') === 'Mostrar', 'recolhida continua recolhida depois de reabrir');
  await page.click('.ec-painel-tg');
  fg = await gf();
  v = await pn();
  conf(v.usd === 'US$ 1.087,50', 'mostrar de novo: a seção volta com os dados', v.usd);

  conf(errs.length === 0, 'nenhum erro no console', errs.slice(0, 5));
  await browser.close();
  console.log(`\n${ok} ok, ${falhas} falha(s)`);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
