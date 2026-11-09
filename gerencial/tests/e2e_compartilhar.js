// Teste da versão para compartilhar (g12): "📤 Compartilhar (HTML)" gera um .html com o EARL Gerencial e os dados dentro.
// Confere que o arquivo abre sozinho (outro navegador, sem nada guardado), na mesma aba e com os mesmos filtros, com os
// mesmos números, os registros e a interatividade (abas, filtros, ordem/seleção, gráficos, comparação, Excel), só para
// consulta; que não mexe nos dados guardados de quem abre; "só os contratos do filtro"; o .zip; o e-mail (.eml) com o
// anexo; e que a versão compartilhada pode ser compartilhada de novo.
// Uso: node gerencial/tests/e2e_compartilhar.js [EARL_Gerencial.html] [pasta das telas]
const {abrir} = require('../../engenharia/tests/harness');
const fs = require('fs');
const os = require('os');
const path = require('path');
const GER = process.argv[2] || path.join(__dirname, '..', 'EARL_Gerencial.html');
const SHOTS = process.argv[3] || '';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'earlsh-'));
let ok = 0, falhas = 0;
const conf = (cond, msg, extra) => {
  if (cond) { ok++; console.log('  ✓ ' + msg); } else { falhas++; console.log('  ✗ ' + msg + (extra !== undefined ? ' → ' + JSON.stringify(extra).slice(0, 700) : '')); }
};
if (SHOTS) fs.mkdirSync(SHOTS, {recursive: true});
const foto = async (page, nome) => { if (SHOTS) await page.screenshot({path: path.join(SHOTS, nome + '.png'), fullPage: false}); };
// os mesmos arquivos do teste dos registros (versões 1 e 2 do forecast)
const fonte = fs.readFileSync(path.join(__dirname, 'e2e_registros.js'), 'utf8');
const {V1, V2} = new Function(fonte.slice(fonte.indexOf('/* ---------- dados'), fonte.indexOf('// conta de referência')) + '; return {V1, V2};')();

const txt = async (page, sel) => (await page.innerText(sel)).replace(/\s+/g, ' ').trim();
const carregar = (page, nome, P) => page.setInputFiles('#inArq', [{name: nome, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(P))}]);
const registrar = async (page, data, obs) => {
  await page.click('.bar [data-a="regAbrir"]');
  await page.fill('#dlg .reg-data', data);
  await page.fill('#dlg .reg-obs', obs);
  await page.click('#dlg .reg-ok');
  await page.waitForSelector('#dlg', {state: 'detached'});
};
const baixar = async (page, sel) => {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click(sel)]);
  const p = path.join(TMP, dl.suggestedFilename());
  fs.copyFileSync(await dl.path(), p);
  return {nome: dl.suggestedFilename(), path: p};
};
const foto0 = page => page.evaluate(() => ({
  kpi: [...document.querySelectorAll('.kpis:not(.cx-kpis) .kpi b')].map(b => b.textContent),
  tab: (document.querySelector('.tab.on') || {}).dataset.tab,
  ft: [...document.querySelectorAll('.t-cx tfoot td, .t-mx tfoot td')].map(td => td.textContent.trim()),
  met: (document.querySelector('.cx-sel .g-mets button.on, .g-card .g-mets button.on') || {}).dataset ? (document.querySelector('.cx-sel .g-mets button.on, .g-card .g-mets button.on') || {}).dataset.gmet : null,
  chips: [...document.querySelectorAll('.cx-chip input:checked')].map(i => i.dataset.cmpsel),
  base: (document.querySelector('[data-cmp="base"]') || {}).value
}));

(async () => {
  console.log('Arquivo original');
  const O = await abrir(GER, {w: 1440, h: 950, hoje: '2026-11-05'});
  let p = O.page;
  await p.waitForSelector('#app');
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForSelector('[data-a="arq"]');
  await carregar(p, 'v1.json', V1);
  await p.waitForSelector('.kpis');
  await registrar(p, '2026-10-01', 'forecast de outubro');
  await carregar(p, 'v2.json', V2);
  await p.waitForTimeout(300);
  await registrar(p, '2026-11-01', 'forecast de novembro');
  await p.click('.tab[data-tab="cmp"]');
  await p.click('.cx-sel [data-gmet="cogs"]');
  await p.click('.q-box'); await p.click('[data-qb="1"]'); await p.click('[data-qb="1"]');
  const orig = await foto0(p);
  conf(orig.tab === 'cmp' && orig.met === 'cogs' && orig.ft.length > 0, 'tela de partida: aba Comparar registros, só COGS, Q1/2026', orig);
  conf(await p.locator('.bar [data-a="shAbrir"]').count() === 1, 'botão "📤 Compartilhar (HTML)" na barra do topo');
  await p.click('.bar [data-a="shAbrir"]');
  await p.waitForSelector('#dlg .sh-msg');
  const dlgTxt = await txt(p, '#dlg');
  conf(/mesmos filtros, gráficos, tabelas, comparação de registros e Excel/.test(dlgTxt) && await p.isChecked('#dlg .sh-regs') && await p.isDisabled('#dlg .sh-filtro') && /Para abrir: salve o arquivo anexo/.test(await p.inputValue('#dlg .sh-msg')), 'a janela explica, leva os registros e oferece a mensagem do e-mail', dlgTxt.slice(0, 200));
  await foto(p, 's1_janela');
  const H = await baixar(p, '#dlg [data-a="shHtml"]');
  const html = fs.readFileSync(H.path, 'utf8');
  conf(H.nome === 'EARL_Gerencial_2026-11-05.html' && /^<!DOCTYPE html>/.test(html) && /id="earlger-dados"/.test(html) && html.length > 900000 && /Gerado: EARL_Gerencial_2026-11-05\.html \([\d,]+ MB, 2 contrato\(s\), 2 registro\(s\)\)/.test(await txt(p, '#msg')), 'baixa "EARL_Gerencial_2026-11-05.html" (' + (html.length / 1048576).toFixed(2) + ' MB) com o app e os dados', await txt(p, '#msg'));
  conf(!/class="kpi/.test(html.slice(0, html.indexOf('<script>'))) && !/id="msg"/.test(html), 'o arquivo leva o app "limpo" (sem a tela desenhada nem avisos)');

  console.log('Abrindo o HTML compartilhado (outro navegador, nada guardado)');
  const R = await abrir(H.path, {w: 1440, h: 950, hoje: '2026-11-06'});
  let q = R.page;
  await q.waitForSelector('.kpis', {timeout: 60000});
  const sh = await foto0(q);
  conf(/Versão compartilhada do EARL Gerencial, com os dados de 05\/11\/2026/.test(await txt(q, '.sh-faixa')) && (await q.title()) === 'EARL — Gerencial (compartilhado)', 'abre sozinho, com a faixa "Versão compartilhada" e a data dos dados');
  conf(sh.tab === 'cmp' && sh.met === 'cogs' && sh.base === orig.base && JSON.stringify(sh.chips) === JSON.stringify(orig.chips) && /^Q1 \(jan – mar\)/.test(await q.textContent('.q-box')), 'abre na mesma aba, com "só COGS", Q1 e a mesma comparação', sh);
  conf(JSON.stringify(sh.kpi) === JSON.stringify(orig.kpi) && JSON.stringify(sh.ft) === JSON.stringify(orig.ft), 'os mesmos números (indicadores e tabela de comparação)', {o: orig.kpi, s: sh.kpi});
  conf((await q.$$eval('.tab', l => l.map(b => b.textContent.trim())))[1] === 'Comparar registros (2)' && await q.locator('#g-evo .g-reg').count() === 2 && await q.locator('.g-var-box svg').count() === 1, 'os registros vieram junto; os gráficos da comparação estão lá');
  conf(!(await q.locator('[data-a="arq"], [data-a="pasta"], [data-a="limpar"], [data-a="regAbrir"], [data-a="regImport"], [data-regdel]').count()) && await q.locator('.bar [data-a="excel"]').count() === 1, 'só consulta: sem Carregar, Limpar, Registrar, Importar e 🗑; o Excel continua');
  await foto(q, 's2_compartilhado');
  await q.click('.cx-sel [data-gmet="ambos"]');
  await q.click('.q-box'); await q.click('[data-a="qTodos"]');
  conf(await q.locator('.t-cx thead tr').nth(2).locator('th:has-text("COGS")').count() > 0 && (await q.$$eval('.t-cx thead tr:nth-child(2) th', l => l.length)) > 4, 'dá para trocar o "Mostrar" e os filtros');
  await q.click('.tab[data-tab="receita"]');
  await q.waitForSelector('#graf .g-svg');
  await q.click('.qc[data-q="2"]');
  conf(await q.locator('.qc.on[data-q="2"]').count() === 1 && await q.locator('.t-mx').count() === 1, 'aba Receita: cards dos quartos, gráfico e matriz funcionam');
  await q.click('.tab[data-tab="contratos"]');
  await q.click('.t-cts thead .tf-s:has-text("Receita US$")');
  await q.click('.t-cts thead .tf-s:has-text("Receita US$")');
  const ordem = await q.$$eval('.t-cts tbody tr td:first-child b', l => l.map(b => b.textContent));
  conf(ordem.join() === 'Contrato PB,Contrato Shell', 'Contratos: ordenar funciona', ordem);
  await q.click('.tab[data-tab="fontes"]');
  conf(!(await q.locator('.t-fontes [data-rm]').count()), 'Arquivos: sem o × para tirar arquivo');
  const xl = await baixar(q, '.bar [data-a="excel"]');
  conf(/^EARL_Gerencial_consolidado_2026-11-06\.xlsx$/.test(xl.nome) && fs.statSync(xl.path).size > 5000, 'o Excel consolidado sai da versão compartilhada');
  const guardado = await q.evaluate(() => Object.keys(localStorage).filter(k => /^earlger:(pacotes|registros)/.test(k)));
  conf(!guardado.length, 'não grava os dados no navegador de quem abriu', guardado);
  conf(R.errs.length === 0, 'compartilhado: nenhum erro de JavaScript', R.errs.slice(0, 3));
  // compartilhar de novo, a partir da versão compartilhada
  await q.click('.bar [data-a="shAbrir"]');
  const H2 = await baixar(q, '#dlg [data-a="shHtml"]');
  await R.browser.close();
  const R2 = await abrir(H2.path, {w: 1440, h: 950, hoje: '2026-11-07'});
  await R2.page.waitForSelector('.kpis', {timeout: 60000});
  conf(/Versão compartilhada/.test(await txt(R2.page, '.sh-faixa')) && JSON.stringify((await foto0(R2.page)).kpi.slice(0, 2)) !== '[]' && (await R2.page.$$eval('.tab', l => l.map(b => b.textContent.trim())))[1] === 'Comparar registros (2)' && R2.errs.length === 0, 'a versão compartilhada pode ser compartilhada de novo (abre igual, com os registros)');
  await R2.browser.close();

  console.log('No mesmo navegador de quem tem os dados');
  const q2 = await O.ctx.newPage();
  await q2.goto('file://' + H.path);
  await q2.waitForSelector('.sh-faixa', {timeout: 60000});
  await q2.click('.tab[data-tab="receita"]');
  await q2.close();
  await p.reload();
  await p.waitForSelector('.kpis');
  const meus = await p.evaluate(() => ({pac: JSON.parse(localStorage.getItem('earlger:pacotes_v1')).length, regs: JSON.parse(localStorage.getItem('earlger:registros_v1')).length}));
  conf(meus.pac === 2 && meus.regs === 2 && await p.locator('.bar [data-a="arq"]').count() === 1, 'abrir o compartilhado não mexe nos arquivos e registros guardados no Gerencial', meus);

  console.log('Só os contratos do filtro, .zip e e-mail');
  await p.selectOption('[data-f="cliente"]', 'Shell');
  const origShell = await foto0(p);
  await p.click('.bar [data-a="shAbrir"]');
  conf(!(await p.isDisabled('#dlg .sh-filtro')) && /Levar só os contratos do filtro atual \(cliente Shell\)/.test(await txt(p, '#dlg')), 'com um cliente escolhido, dá para levar só os contratos dele');
  await p.check('#dlg .sh-filtro');
  const HS = await baixar(p, '#dlg [data-a="shHtml"]');
  conf(HS.nome === 'EARL_Gerencial_cliente_Shell_2026-11-05.html', 'nome do arquivo com o filtro', HS.nome);
  const RS = await abrir(HS.path, {w: 1440, h: 950, hoje: '2026-11-06'});
  await RS.page.waitForSelector('.kpis', {timeout: 60000});
  const dS = await RS.page.evaluate(() => { const C = window.earlGerencial.consolidar(); return {cts: C.contratos.map(c => c.nome), regs: window.earlGerencial.estado.regs.map(r => r.cts.map(c => c[1]).join('+'))}; });
  conf(dS.cts.join() === 'Contrato Shell' && dS.regs.join() === 'Contrato Shell,Contrato Shell' && /só cliente Shell/.test(await txt(RS.page, '.sh-faixa')), 'o arquivo só tem o contrato da Shell (também nos registros)', dS);
  conf(JSON.stringify((await foto0(RS.page)).kpi) === JSON.stringify(origShell.kpi), 'mesmos números da Shell', {o: origShell.kpi});
  await RS.browser.close();
  await p.selectOption('[data-f="cliente"]', '');
  await p.click('.bar [data-a="shAbrir"]');
  const Z = await baixar(p, '#dlg [data-a="shZip"]');
  const zipInfo = await p.evaluate(async b => { const z = await JSZip.loadAsync(b, {base64: true}); const n = Object.keys(z.files); return {n, tam: (await z.files[n[0]].async('string')).length}; }, fs.readFileSync(Z.path).toString('base64'));
  conf(Z.nome === 'EARL_Gerencial_2026-11-05.zip' && zipInfo.n.join() === 'EARL_Gerencial_2026-11-05.html' && zipInfo.tam > 900000 && fs.statSync(Z.path).size < zipInfo.tam / 2, '.zip com o HTML dentro (' + (fs.statSync(Z.path).size / 1048576).toFixed(2) + ' MB)', zipInfo);
  await p.click('.bar [data-a="shAbrir"]');
  await p.fill('#dlg .sh-para', 'gerente@empresa.com; outro@empresa.com');
  await p.fill('#dlg .sh-assunto', 'Receita e COGS — novembro');
  const E = await baixar(p, '#dlg [data-a="shEml"]');
  const eml = fs.readFileSync(E.path, 'utf8');
  const partes = eml.split(/\r\n/);
  const subj = (partes.find(l => l.startsWith('Subject: ')) || '').slice(9);
  const assunto = /^=\?UTF-8\?B\?(.+)\?=$/.test(subj) ? Buffer.from(subj.replace(/^=\?UTF-8\?B\?|\?=$/g, ''), 'base64').toString('utf8') : subj;
  const anexoB64 = eml.split('Content-Transfer-Encoding: base64\r\n\r\n')[2].split('\r\n--')[0].replace(/\r\n/g, '');
  const anexo = Buffer.from(anexoB64, 'base64').toString('utf8');
  const corpo = Buffer.from(eml.split('Content-Transfer-Encoding: base64\r\n\r\n')[1].split('\r\n--')[0].replace(/\r\n/g, ''), 'base64').toString('utf8');
  conf(E.nome === 'EARL_Gerencial_compartilhar_2026-11-05.eml' && partes[0] === 'X-Unsent: 1' && partes.includes('To: gerente@empresa.com; outro@empresa.com') && assunto === 'Receita e COGS — novembro', 'e-mail (.eml) em rascunho, com destinatários e assunto (acentos certos)', {assunto, l0: partes[0]});
  conf(/filename="EARL_Gerencial_2026-11-05\.html"/.test(eml) && /^<!DOCTYPE html>/.test(anexo) && /id="earlger-dados"/.test(anexo) && /Para abrir: salve o arquivo anexo/.test(corpo) && eml.split('\r\n').every(l => l.length <= 998), 'o anexo é o HTML compartilhado; a mensagem vai no corpo; linhas dentro do limite do e-mail');
  conf(O.errs.length === 0, 'original: nenhum erro de JavaScript', O.errs.slice(0, 3));
  await O.browser.close();
  console.log(`\n${ok} ok, ${falhas} falha(s)`);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
