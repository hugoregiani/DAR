// Teste de ponta a ponta Engenharia → arquivo do gerencial → EARL Gerencial.
// Uso: node gerencial/tests/e2e_gerencial.js [EARL_Engenharia.html] [EARL_Gerencial.html] [pasta das telas]
const {abrir} = require('../../engenharia/tests/harness');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ENG = process.argv[2] || path.join(__dirname, '..', '..', 'engenharia', 'EARL_Engenharia.html');
const GER = process.argv[3] || path.join(__dirname, '..', 'EARL_Gerencial.html');
const SHOTS = process.argv[4] || '';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'earlger-'));
let ok = 0, falhas = 0;
const conf = (cond, msg, extra) => {
  if (cond) { ok++; console.log('  ✓ ' + msg); } else { falhas++; console.log('  ✗ ' + msg + (extra !== undefined ? ' → ' + JSON.stringify(extra) : '')); }
};
const foto = async (page, nome) => { if (SHOTS) await page.screenshot({path: path.join(SHOTS, nome + '.png'), fullPage: true}); };
const fld = (page, rot) => page.locator('.eng-modal .fld').filter({has: page.locator('label', {hasText: rot})}).first();
const txt = async (page, sel) => (await page.innerText(sel)).replace(/\s+/g, ' ').trim();
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
async function baixar(page, acao, nome) {
  const [dl] = await Promise.all([page.waitForEvent('download'), acao()]);
  const p = path.join(TMP, nome || dl.suggestedFilename());
  fs.copyFileSync(await dl.path(), p);
  return {nome: dl.suggestedFilename(), path: p, txt: fs.readFileSync(p, 'utf8')};
}
async function novaOp(page, ctCard, poco, data, monta) {
  if (!(await page.locator('.eng2-ctbar').count())) await page.click('.eng2-card:has-text("' + ctCard + '")');
  await page.click('button:has-text("+ Nova operação")');
  await page.waitForSelector('.eng-modal');
  await fld(page, 'Sonda').locator('select').selectOption({label: 'Norbe VIII'});
  await fld(page, 'Poço').locator('input').fill(poco);
  await fld(page, 'Data prevista').locator('input').fill(data);
  await fld(page, 'Tipo de operação').locator('select').selectOption({label: 'Squeeze'});
  await monta();
  await page.click('.eng-modal button:text-is("Salvar")');
  await page.waitForSelector('.eng-modal', {state: 'detached'});
}
async function arquivoGerencial(page, nome, arq) {
  await page.click('.eng-tools button:has-text("Arquivo do gerencial")');
  await page.waitForSelector('.ec-ger-modal');
  await page.fill('.ec-ger-nome', nome);
  const f = await baixar(page, () => page.click('.ec-ger-ok'), arq);
  return {...f, pac: JSON.parse(f.txt)};
}

(async () => {
  console.log('Engenheiro A');
  const A = await abrir(ENG, {h: 1000, hoje: '2026-11-02'});
  let p = A.page;
  await p.waitForSelector('.eng2-card', {timeout: 60000});
  await p.click('.eng-tools button:has-text("Contratos")');
  await p.click('.ec-novo');
  await p.fill('.ec-cli', 'Petrobras');
  await p.fill('.ec-nome', 'Contrato Teste Macaé');
  await p.locator('.ec-bases label', {hasText: 'Macaé'}).locator('input').check();
  const b64 = await p.evaluate(() => {
    const ws = XLSX.utils.aoa_to_sheet([['Item', 'Descrição', 'Unidade', 'Saldo', 'Valor R$', 'Valor US$'], ['1.1', 'Taxa de cimentação', 'dia', 100, 1500, 280], ['2.1', 'Teste de pressão', 'operação', 20, 3200, 600]]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'PPU'); return XLSX.write(wb, {bookType: 'xlsx', type: 'base64'});
  });
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('.ec-carregar')]);
  await fc.setFiles({name: 'ppu.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(b64, 'base64')});
  await p.click('.ec-imp-ok');
  await p.click('.ec-salvar');
  await p.click('.ec-modal .modal-close');
  await novaOp(p, 'Contrato Teste', '7-TST-1-RJS', '2026-11-03', async () => {
    await escolher(p, 'Itens PPU', '', [2]);
    await escolher(p, 'Químicas', 'HALAD-344', [300]);
    await escolher(p, 'Casing', '', [2]);
    await escolher(p, 'Pessoal', '', [2]);
  });
  await p.click('.db-tab:has-text("Lista")');
  await p.click('tr:has-text("7-TST-1-RJS") button:has-text("Σ Consumo")');
  await p.waitForSelector('.ec-cons-modal');
  conf(await p.locator('.ec-mat-quim tbody tr').count() === 1 && await p.locator('.ec-mat-cas tbody tr').count() === 1 && await p.locator('.ec-pes tbody tr').count() === 1, 'consumo da operação traz químicas, casing e pessoal previstos');
  await p.click('.ec-copiar');
  const dias = Number(await p.inputValue('.ec-p-dias'));
  conf(await p.inputValue('.ec-q-quim') === '300' && await p.inputValue('.ec-q-cas') === '2' && await p.inputValue('.ec-p-pes') === '2' && dias > 0, 'copiar previsto preenche químicas, casing e pessoal (pessoas × dias)', dias);
  await p.selectOption('.ec-cons-modal select.ec-add:not(.ec-add-quim):not(.ec-add-cas):not(.ec-add-pes)', '2.1');
  await p.locator('.ec-cons tbody tr:has-text("2.1") input.ec-qtd').fill('1');
  await p.locator('.ec-q-quim').fill('280');
  conf(await txt(p, '.ec-tot-hd') === String(2 * dias) && await txt(p, '.ec-tot-brl') === 'R$ 6.200,00', 'homem-dia e receita calculados', [await txt(p, '.ec-tot-hd'), await txt(p, '.ec-tot-brl')]);
  await foto(p, 'g0_consumo');
  await p.click('.ec-cons-ok');
  await p.waitForTimeout(300);
  const a1 = await arquivoGerencial(p, 'Eng A', 'A1.json');
  conf(/^EARL_Gerencial_Contrato_Teste_Macae_2026-11-02_\d{2}h\d{2}\.json$/.test(a1.nome), 'arquivo do gerencial com o nome do contrato', a1.nome);
  const op1 = a1.pac.operacoes[0];
  conf(a1.pac.tipo === 'EARL-Gerencial' && a1.pac.por === 'Eng A' && a1.pac.contratos.length === 1 && a1.pac.operacoes.length === 1, 'arquivo: 1 contrato e 1 operação, com o engenheiro');
  conf(op1.receita.brl === 6200 && op1.receita.usd === 1160 && op1.realizado.quimicas[0].qtd === 280 && op1.realizado.casing[0].qtd === 2 && op1.realizado.pessoal[0].hd === 2 * dias && op1.previsto.quimicas[0].qtd === 300, 'arquivo: receita, químicas, casing e pessoal (previsto e lançado)', {rec: op1.receita, q: op1.realizado.quimicas});
  // segunda operação depois do primeiro arquivo → arquivo mais novo
  await novaOp(p, 'Contrato Teste', '7-TST-2-RJS', '2026-11-05', async () => { await escolher(p, 'Itens PPU', '', [1]); });
  await p.click('.db-tab:has-text("Lista")');
  await p.click('tr:has-text("7-TST-2-RJS") button:has-text("Σ Consumo")');
  await p.click('.ec-copiar');
  await p.click('.ec-cons-ok');
  await p.waitForTimeout(300);
  await p.clock.setFixedTime(new Date('2026-11-02T12:05:00')); // o 2º arquivo sai 5 min depois
  const a2 = await arquivoGerencial(p, 'Eng A', 'A2.json');
  conf(a2.pac.operacoes.length === 2 && a2.pac.geradoEm > a1.pac.geradoEm, 'segundo arquivo do engenheiro A: 2 operações, mais novo');
  conf(A.errs.length === 0, 'engenharia A: nenhum erro', A.errs.slice(0, 3));
  await A.browser.close();

  console.log('Engenheiro B');
  const B = await abrir(ENG, {h: 1000, hoje: '2026-11-02'});
  p = B.page;
  await p.waitForSelector('.eng2-card', {timeout: 60000});
  await p.click('.eng-tools button:has-text("Contratos")');
  await p.click('.ec-row:has-text("PBR Land")');
  await p.locator('.ec-itens tbody tr').first().locator('input.ec-brl').fill('100');
  await p.locator('.ec-itens tbody tr').first().locator('input.ec-usd').fill('20');
  await p.click('.ec-salvar');
  await p.click('.ec-modal .modal-close');
  await novaOp(p, 'PBR Land', '7-LND-1-BA', '2026-11-04', async () => { await escolher(p, 'Itens PPU', '', [5]); });
  await p.click('.db-tab:has-text("Lista")');
  await p.click('tr:has-text("7-LND-1-BA") button:has-text("Σ Consumo")');
  await p.click('.ec-copiar');
  await p.click('.ec-cons-ok');
  await p.waitForTimeout(300);
  const b1 = await arquivoGerencial(p, 'Eng B', 'B.json');
  conf(b1.pac.contratos.length === 1 && b1.pac.contratos[0].nome === 'PBR Land' && b1.pac.operacoes[0].receita.brl === 500, 'engenheiro B: arquivo do PBR Land com R$ 500,00');
  conf(B.errs.length === 0, 'engenharia B: nenhum erro', B.errs.slice(0, 3));
  await B.browser.close();

  console.log('Gerencial');
  const G = await abrir(GER, {h: 1000, hoje: '2026-11-02'});
  p = G.page;
  await p.waitForSelector('#drop');
  conf(/Arquivo do gerencial/.test(await txt(p, '#drop')), 'tela inicial explica como carregar');
  await p.setInputFiles('#inArq', [a1.path, a2.path, b1.path]);
  await p.waitForSelector('.kpi.k-rec-brl');
  conf(await txt(p, '.k-rec-brl b') === 'R$ 8.200,00' && await txt(p, '.k-rec-usd b') === 'US$ 1.540,00', 'receita consolidada: 6.200 + 1.500 + 500 = R$ 8.200,00 · US$ 1.540,00', [await txt(p, '.k-rec-brl b'), await txt(p, '.k-rec-usd b')]);
  conf(await txt(p, '.k-ops b') === '3' && await txt(p, '.k-hd b') === String(2 * dias), '3 operações com consumo e homem-dia', [await txt(p, '.k-ops b'), await txt(p, '.k-hd b')]);
  await foto(p, 'g1_contratos');
  const ctA = await txt(p, '.t-cts tbody tr:has-text("Contrato Teste")'), ctB = await txt(p, '.t-cts tbody tr:has-text("PBR Land")');
  conf(/Eng A .* 2 2 real\. · 0 prev\. US\$ 1\.440,00 .* R\$ 7\.700,00 US\$ 0,00 US\$ 1\.440,00/.test(ctA) && /Eng B .* 1 1 real\. · 0 prev\. US\$ 100,00 .* R\$ 500,00/.test(ctB), 'receita por contrato (US$, R$, COGS, margem), com o engenheiro', [ctA, ctB]);
  await p.click('.tab[data-tab="fontes"]');
  const fon = await txt(p, '.t-fontes tbody');
  conf(/A1\.json .*substituído por arquivo mais novo/.test(fon) && /A2\.json .*em uso/.test(fon) && /B\.json .*em uso/.test(fon), 'o arquivo mais novo de cada contrato vale; o antigo aparece como substituído', fon);
  await p.click('.tab[data-tab="ppu"]');
  conf(/Contrato Teste Macaé 1\.1 Taxa de cimentação dia 100 3 97/.test(await txt(p, '.t-ppu tbody')), 'itens PPU: contratado 100, consumido 3, saldo 97');
  await p.click('.tab[data-tab="quim"]');
  conf(/HALAD-344.* — 300 280 0 US\$ 0,00 Contrato Teste Macaé/.test(await txt(p, '.t-quim tbody')), 'químicas: planejado 300 × lançado 280', await txt(p, '.t-quim tbody'));
  await p.click('.tab[data-tab="cas"]');
  conf(await p.locator('.t-cas tbody tr').count() === 1 && / — 2 2 0 US\$ 0,00 /.test(await txt(p, '.t-cas tbody')), 'casing equipment: planejado 2 × lançado 2', await txt(p, '.t-cas tbody'));
  await p.click('.tab[data-tab="pes"]');
  conf(new RegExp('Supervisor 2 ' + 2 * dias + ' 2 ' + 2 * dias + ' 0 1').test(await txt(p, '.t-pes tbody')), 'pessoal: pessoas e homem-dia planejado × lançado', await txt(p, '.t-pes tbody'));
  await foto(p, 'g2_pessoal');
  await p.click('.tab[data-tab="receita"]');
  conf(/nov\/2026 3 US\$ 1\.540,00 US\$ 0,00 US\$ 1\.540,00 US\$ 0,00 US\$ 1\.540,00 R\$ 8\.200,00/.test(await txt(p, '.t-mes tbody')) && /Petrobras 3 .* R\$ 8\.200,00/.test(await txt(p, '.t-cli tbody')), 'receita por mês e por cliente', await txt(p, '.t-mes tbody'));
  await p.click('.tab[data-tab="ops"]');
  conf(await p.locator('.t-ops tbody tr').count() === 3, 'lista das 3 operações');
  await p.fill('[data-f="busca"]', 'LND');
  conf(await p.locator('.t-ops tbody tr').count() === 1, 'busca nas operações');
  await p.fill('[data-f="busca"]', '');
  console.log('Filtros');
  await p.selectOption('[data-f="contrato"]', {label: 'PBR Land'});
  conf(await txt(p, '.k-rec-brl b') === 'R$ 500,00', 'filtro por contrato');
  await p.click('[data-a="limparf"]');
  await p.fill('[data-f="de"]', '2026-11-04');
  conf(await txt(p, '.k-rec-brl b') === 'R$ 2.000,00', 'filtro por período do serviço (a partir de 04/11)', await txt(p, '.k-rec-brl b'));
  await p.click('[data-a="limparf"]');
  console.log('Excel');
  const xl = await baixar(p, () => p.click('[data-a="excel"]'));
  const wb = await p.evaluate(b => { const w = XLSX.read(b, {type: 'base64'}); return {n: w.SheetNames, ops: XLSX.utils.sheet_to_json(w.Sheets['Operações'], {header: 1}).length, lanc: XLSX.utils.sheet_to_json(w.Sheets['Lançamentos'], {header: 1}).length}; }, fs.readFileSync(xl.path).toString('base64'));
  conf(xl.nome === 'EARL_Gerencial_consolidado_2026-11-02.xlsx' && wb.n.join() === 'Contratos,Por mês,Itens PPU,Químicas,Casing,Pessoal,Operações,Lançamentos' && wb.ops === 4, 'Excel consolidado com 8 abas', wb);
  console.log('Persistência, zip e pasta');
  await p.reload();
  await p.waitForSelector('.kpi.k-rec-brl');
  conf(await txt(p, '.k-rec-brl b') === 'R$ 8.200,00', 'arquivos continuam carregados depois de reabrir');
  const zipB64 = await p.evaluate(async ([x, y]) => { const z = new JSZip(); z.file('Gerencial/A2.json', x); z.file('Gerencial/B.json', y); z.file('Gerencial/outro.json', '{"a":1}'); return z.generateAsync({type: 'base64'}); }, [a2.txt, b1.txt]);
  const zipPath = path.join(TMP, 'Gerencial.zip');
  fs.writeFileSync(zipPath, Buffer.from(zipB64, 'base64'));
  p.once('dialog', d => d.accept());
  await p.click('[data-a="limpar"]');
  await p.waitForSelector('#drop');
  await p.setInputFiles('#inArq', zipPath);
  await p.waitForSelector('.kpi.k-rec-brl');
  conf(await txt(p, '.k-rec-brl b') === 'R$ 8.200,00' && /ignorado/.test(await txt(p, '#msg')), 'zip do SharePoint: carrega os 2 arquivos e ignora o que não é do gerencial', await txt(p, '#msg'));
  p.once('dialog', d => d.accept());
  await p.click('[data-a="limpar"]');
  const pasta = path.join(TMP, 'pasta_sharepoint');
  fs.mkdirSync(pasta);
  [a1, a2, b1].forEach(f => fs.copyFileSync(f.path, path.join(pasta, path.basename(f.path))));
  let pastaOk = true;
  try { await p.setInputFiles('#inPasta', pasta); } catch (e) { pastaOk = false; console.log('  (carregar pasta não testado: ' + String(e.message).split('\n')[0] + ')'); }
  if (pastaOk) {
    await p.waitForSelector('.kpi.k-rec-brl');
    conf(await txt(p, '.k-rec-brl b') === 'R$ 8.200,00', 'carregar a pasta: mesmo consolidado');
  }
  console.log('Celular');
  await p.setViewportSize({width: 390, height: 844});
  await p.waitForTimeout(300);
  const larg = await p.evaluate(() => document.documentElement.scrollWidth);
  conf(larg <= 392, 'sem rolagem lateral no celular', larg);
  await foto(p, 'g3_celular');
  conf(G.errs.length === 0, 'gerencial: nenhum erro', G.errs.slice(0, 3));
  await G.browser.close();
  console.log(`\n${ok} ok, ${falhas} falha(s)`);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
