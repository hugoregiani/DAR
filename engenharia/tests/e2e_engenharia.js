// Teste de ponta a ponta do EARL Engenharia (avulso).
// Uso: node tests/e2e_engenharia.js [EARL_Engenharia.html] [pasta para as telas]
// Abre o arquivo do disco (file://) com a internet bloqueada.
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

// ---- leitura do .eml (MIME) ----
const decWord = v => v.replace(/=\?UTF-8\?B\?([^?]+)\?=\s*/g, (_, b) => Buffer.from(b, 'base64').toString('utf8'));
function lerEml(txt) {
  const [cab, ...resto] = txt.split('\r\n\r\n');
  const h = {};
  cab.replace(/\r\n\s+/g, ' ').split('\r\n').forEach(l => { const i = l.indexOf(':'); h[l.slice(0, i).toLowerCase()] = l.slice(i + 1).trim(); });
  const corpo = resto.join('\r\n\r\n');
  const partes = {};
  for (const tipo of ['text/plain', 'text/html']) {
    const i = corpo.indexOf('Content-Type: ' + tipo);
    const ini = corpo.indexOf('\r\n\r\n', i) + 4;
    const fim = corpo.indexOf('\r\n--', ini);
    partes[tipo] = Buffer.from(corpo.slice(ini, fim).replace(/\r\n/g, ''), 'base64').toString('utf8');
  }
  return {h, assunto: decWord(h.subject || ''), texto: partes['text/plain'], html: partes['text/html']};
}
async function baixar(page, acao) {
  const [dl] = await Promise.all([page.waitForEvent('download'), acao()]);
  const p = await dl.path();
  return {nome: dl.suggestedFilename(), txt: fs.readFileSync(p, 'utf8')};
}
// ---- seletor de recursos da engenharia (ResPicker) ----
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
const fld = (page, rot) => page.locator('.eng-modal .fld').filter({has: page.locator('label', {hasText: rot})}).first();

(async () => {
  const {browser, page, errs} = await abrir(ARQ, {h: 1000, hoje: '2026-11-02'});
  await page.waitForSelector('.eng2-card', {timeout: 60000});
  console.log('Abertura');
  const corpo0 = await page.innerText('body');
  conf(!/SENHA|Entrar como administrador|Acesso restrito/i.test(corpo0), 'abre sem login e sem senha');
  conf(!/SIMULAÇÃO/.test(corpo0), 'sem o selo da simulação');
  conf(await page.locator('.hub-card').count() === 0, 'sem a escolha de região: abre direto na Engenharia');
  conf(await page.locator('.eng2-card').count() === 17, 'todos os contratos (16) + Visão geral na página inicial', await page.locator('.eng2-card').count());
  conf(!(await page.locator('.crumb-hub, .crumb-loc').count()), 'trilha sem "trocar locação" e sem região');
  const corpo1 = await page.innerText('body');
  conf(/Engenharia/.test(corpo1) && /Sondas/.test(corpo1) && /Exportar dados/.test(corpo1) && /Importar dados/.test(corpo1), 'abre direto na Engenharia, com Contratos · Sondas · Exportar dados · Importar dados');
  conf(!/Configurar sync|SAIR ADMIN|Coordenação|Logística\n/.test(corpo1), 'sem sync, admin ou outros apps');
  conf(await page.locator('.app-tile').count() === 0, 'sem o menu de apps');
  await foto(page, '02_engenharia');

  console.log('Nova operação (Sudeste, offshore)');
  await page.click('.eng2-card:has-text("P&A — Macaé")');
  await page.click('button:has-text("+ Nova operação")');
  await page.waitForSelector('.eng-modal');
  await fld(page, 'Sonda').locator('select').selectOption({label: 'Norbe VIII'});
  await fld(page, 'Poço').locator('input').fill('7-MRL-99-RJS');
  await fld(page, 'Data prevista').locator('input').fill('2026-11-10');
  await fld(page, 'Tipo de operação').locator('select').selectOption({label: 'Cimentação primária'});
  await fld(page, 'Revestimento').locator('select').selectOption({label: '9 5/8"'});
  await fld(page, 'Sales Order').locator('input').fill('460123456');
  await fld(page, 'Nº VIDA').locator('input').fill('123456');
  await escolher(page, 'Itens PPU', '', [1, 3]);
  await escolher(page, 'Químicas', 'HALAD-344', [300]);
  await escolher(page, 'Químicas', 'Classe G', [600]);
  await escolher(page, 'Casing', '', [2]);
  await escolher(page, 'Pessoal', '', [1, 2]);
  await escolher(page, 'Equipamentos', '', [1]);
  await page.fill('.eng-modal textarea[placeholder^="Particularidades"]', 'Poço com perda parcial na fase anterior.');
  await foto(page, '03_operacao');
  await page.click('.eng-modal button:has-text("Enviar Handover")');

  console.log('Handover');
  await page.waitForSelector('.modal-title:has-text("Enviar Handover")');
  await page.click('button:has-text("Continuar →")');
  await page.waitForSelector('.ho-modal');
  const pend = await page.locator('.ho-pend').count();
  conf(pend === 0, 'handover sem pendências', pend ? await page.locator('.ho-pend').innerText() : '');
  await page.fill('.ho-coment', 'Embarcar até D-5.');
  await foto(page, '04_handover');
  const btCont = page.locator('.ho-modal button', {hasText: 'Continuar para o e-mail'});
  conf(await btCont.count() === 1, 'botão "Continuar para o e-mail →" no lugar de "Concluído"');
  await btCont.click();

  console.log('E-mail');
  await page.waitForSelector('.hm-modal');
  const ass = await page.innerText('.hm-assunto');
  conf(ass === 'HANDOVER - NORBE VIII - CIMENTAÇÃO PRIMÁRIA 9 5/8" (7-MRL-99-RJS) - SO 460123456 - VIDA H123456', 'assunto padronizado (sonda, operação, SO, VIDA)', ass);
  conf(await page.locator('.hm-gerar').isDisabled(), 'sem destinatário não gera');
  await page.fill('.hm-novo', 'logistica.macae@');
  conf(await page.locator('.hm-add button', {hasText: '＋ Para'}).isDisabled(), 'e-mail incompleto não entra');
  await page.fill('.hm-novo', 'logistica.macae@halliburton.com');
  await page.click('.hm-add button:has-text("＋ Para")');
  await page.fill('.hm-novo', 'materiais.macae@halliburton.com');
  await page.click('.hm-add button:has-text("＋ Para")');
  await page.fill('.hm-novo', 'coordenacao.macae@halliburton.com');
  await page.click('.hm-add button:has-text("＋ Cc")');
  await page.fill('.hm-nome', 'Hugo Regiani');
  conf(await page.locator('.hm-tab tbody tr').count() === 3, '3 e-mails na lista');
  conf(!(await page.locator('.hm-gerar').isDisabled()), 'com destinatário o botão libera');
  await page.click('.hm-prev summary');
  await foto(page, '05_email');
  const e1 = await baixar(page, () => page.click('.hm-gerar'));
  const m1 = lerEml(e1.txt);
  conf(e1.nome.endsWith('.eml') && e1.nome === 'HANDOVER - NORBE VIII - CIMENTACAO PRIMARIA 9 5-8 (7-MRL-99-RJS) - SO 460123456 - VIDA H123456.eml', 'arquivo .eml com o nome do assunto (sem acentos)', e1.nome);
  conf(m1.h['x-unsent'] === '1', 'X-Unsent: 1 (abre no Outlook como mensagem a enviar)');
  conf(m1.assunto === ass, 'assunto do .eml = assunto mostrado', m1.assunto);
  conf(/logistica\.macae@halliburton\.com/.test(m1.h.to) && /materiais\.macae@halliburton\.com/.test(m1.h.to) && !/coordenacao/.test(m1.h.to), 'Para = os dois escolhidos', m1.h.to);
  conf(/coordenacao\.macae@halliburton\.com/.test(m1.h.cc || ''), 'Cc = coordenação', m1.h.cc);
  const H = m1.html;
  const tem = (re, msg) => conf(re.test(H), msg);
  tem(/Norbe VIII/, 'corpo: sonda');
  tem(/7-MRL-99-RJS/, 'corpo: poço');
  tem(/460123456/, 'corpo: SO');
  tem(/H123456/, 'corpo: VIDA');
  tem(/HALAD-344/, 'corpo: química HALAD-344');
  tem(/Classe G/i, 'corpo: cimento classe G');
  tem(/Casing equipment \(1\)/, 'corpo: casing');
  tem(/Equipamentos \(1\)/, 'corpo: equipamentos');
  tem(/Pessoal — embarques \(3\)/, 'corpo: 3 embarques (1 + 2)');
  tem(/Itens PPU previstos \(2\)/, 'corpo: 2 itens PPU');
  tem(/Poço com perda parcial/, 'corpo: observações da operação');
  tem(/Embarcar até D-5/, 'corpo: comentários do handover');
  tem(/Hugo Regiani/, 'corpo: assinatura');
  conf(/HALAD-344/.test(m1.texto) && /460123456/.test(m1.texto), 'versão em texto também lista os itens');
  // 300 lb com backup de 100% = 600
  conf(/HALAD-344[^<]*<\/td><td[^>]*>[^<]*<\/td><td[^>]*>300<\/td><td[^>]*>100%<\/td><td[^>]*>600<\/td><td[^>]*>600<\/td>/.test(H), 'química: previsto 300 + backup 100% = solicitado 600');
  if (SHOTS) fs.writeFileSync(path.join(SHOTS, 'email_v1.html'), H);

  console.log('Depois do e-mail');
  await page.waitForTimeout(400);
  conf(/E-mail do handover gerado/.test(await page.innerText('body')), 'aviso de e-mail gerado');
  await page.click('.db-tab:has-text("Lista")');
  conf(await page.locator('.hm-tag', {hasText: 'handover v1'}).count() === 1, 'lista mostra "✉ handover v1"');
  await page.click('.db-tab:has-text("Handovers")');
  await page.waitForSelector('.hm-card');
  conf(/logistica\.macae@halliburton\.com/.test(await page.innerText('.hm-card')), 'aba Handovers mostra o e-mail e os destinatários');
  await foto(page, '06_handovers');
  const e1b = await baixar(page, () => page.click('.hm-card button:has-text("Baixar o e-mail")'));
  conf(lerEml(e1b.txt).assunto === ass && e1b.nome === e1.nome, 'baixar de novo gera o mesmo e-mail');

  console.log('Nova versão');
  await page.click('.hm-card button:has-text("Revisar / nova versão")');
  await page.waitForSelector('.ho-modal');
  conf(await page.locator('.ho-modal .hm-banner').count() === 1, 'handover mostra que já foi enviado');
  conf(!(await page.locator('.ho-modal fieldset.eng-fs').isDisabled()), 'handover enviado continua editável');
  await page.click('.ho-modal button:has-text("Continuar para o e-mail")');
  await page.waitForSelector('.hm-modal');
  const ass2 = await page.innerText('.hm-assunto');
  conf(ass2 === ass + ' - REV 2', 'assunto da revisão termina com "- REV 2"', ass2);
  conf(await page.locator('.hm-to:checked').count() === 2 && await page.locator('.hm-cc:checked').count() === 1, 'destinatários da última vez já vêm marcados');
  conf(await page.inputValue('.hm-nome') === 'Hugo Regiani', 'nome salvo');
  await page.locator('.hm-tab tr', {hasText: 'materiais.macae'}).locator('.hm-x').click();
  const e2 = await baixar(page, () => page.click('.hm-gerar'));
  const m2 = lerEml(e2.txt);
  conf(m2.assunto === ass2 && !/materiais/.test(m2.h.to) && /revisão 2/.test(m2.html), 'v2: assunto, destinatário tirado e aviso de revisão', m2.h.to);

  console.log('Formulário da operação e persistência');
  await page.reload();
  await page.waitForSelector('.eng2-card, .eng2-ctbar', {timeout: 60000});
  const nHo = await page.evaluate(() => JSON.parse(localStorage.getItem('hal_cmt_db_v1')).handovers.length);
  conf(nHo === 1, 'após recarregar: 1 handover (versão 2) gravado', nHo);
  const lsKeys = await page.evaluate(() => { const r = []; const g = Storage.prototype.key; for (let i = 0; i < localStorage.length; i++) r.push(g.call(localStorage, i)); return r; });
  conf(lsKeys.length > 0 && lsKeys.every(k => k.startsWith('earleng:')), 'dados com prefixo próprio (earleng:)', lsKeys);
  if (!(await page.locator('.eng2-ctbar').count())) await page.click('.eng2-card:has-text("P&A — Macaé")');
  await page.click('.db-tab:has-text("Lista")');
  await page.click('tr:has-text("7-MRL-99-RJS") button:has-text("Editar")');
  await page.waitForSelector('.eng-modal .hm-banner');
  conf(/versão 2/.test(await page.innerText('.eng-modal .hm-banner')), 'operação mostra "Handover enviado por e-mail · versão 2"');
  conf(await page.locator('.eng-modal button', {hasText: 'Handover v2 — revisar / reenviar'}).count() === 1, 'botão "✉ Handover v2 — revisar / reenviar"');
  await page.click('.eng-modal button:has-text("Cancelar")');

  console.log('Exportar dados');
  const bk = await baixar(page, () => page.click('.eng-tools button:has-text("Exportar dados")'));
  const bj = JSON.parse(bk.txt);
  conf(/^EARL_Engenharia_dados_\d{4}-\d{2}-\d{2}_\d{2}h\d{2}\.json$/.test(bk.nome) && bj.db.handovers.length === 1 && bj.db.plannedJobs.length === 1, 'exportação .json com a operação e o handover', bk.nome);

  console.log('Importar dados (substituir)');
  const bkPath = path.join(require('os').tmpdir(), bk.nome);
  fs.writeFileSync(bkPath, bk.txt);
  await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('hal_cmt_db_v1')); d.plannedJobs = []; d.handovers = []; localStorage.setItem('hal_cmt_db_v1', JSON.stringify(d)); });
  await page.reload();
  await page.waitForSelector('.eng2-card, .eng2-ctbar', {timeout: 60000});
  conf(await page.evaluate(() => JSON.parse(localStorage.getItem('hal_cmt_db_v1')).plannedJobs.length) === 0, 'dados apagados antes de restaurar');
  await page.setInputFiles('.eng-tools input[type=file]', bkPath);
  await page.waitForSelector('.ec-imp-dados');
  conf(/Operações 0 1 1/.test((await page.innerText('.ec-imp-tab')).replace(/\s+/g, ' ')), 'importar mostra este computador × arquivo × depois de juntar');
  await page.click('.ec-substituir');
  await Promise.all([page.waitForEvent('load'), page.locator('.modal').filter({hasText: 'Substituir os dados'}).locator('button', {hasText: /^Substituir$/}).click()]);
  await page.waitForSelector('.eng2-card, .eng2-ctbar', {timeout: 60000});
  const rest = await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('hal_cmt_db_v1')); return [d.plannedJobs.length, d.handovers.length, d.handovers[0].versao]; });
  conf(rest[0] === 1 && rest[1] === 1 && rest[2] === 2, 'substituir traz a operação e o handover v2 de volta', rest);

  console.log('Nordeste: sonda nova + handover onshore');
  await page.click('.eng-tools button:has-text("Sondas")');
  await page.waitForSelector('.eng-sondas-modal');
  await page.click('.eng-sondas-modal button:has-text("+ Nova sonda")');
  await page.waitForSelector('.rf-modal');
  await foto(page, '07_sonda');
  await page.fill('.rf-modal input >> nth=0', 'SPT-TESTE');
  await page.locator('.rf-modal select').filter({has: page.locator('option', {hasText: 'Rigless'})}).first().selectOption({label: 'Onshore'});
  const selBase = page.locator('.rf-modal select').filter({has: page.locator('option', {hasText: 'Catu'})}).first();
  await selBase.selectOption({label: 'Catu'});
  await page.click('.rf-modal .btn-r');
  await page.waitForTimeout(300);
  await page.click('.eng-sondas-modal .db-tab:has-text("Onshore")');
  conf(/SPT-TESTE/.test(await page.innerText('.eng-sondas-modal')), 'sonda cadastrada pela Engenharia');
  await page.click('.eng-sondas-modal .modal-close');
  await page.click('.eng2-card:has-text("PBR Land")');
  await page.click('button:has-text("+ Nova operação")');
  await fld(page, 'Sonda').locator('select').selectOption({label: 'SPT-TESTE'});
  await fld(page, 'Poço').locator('input').fill('7-CP-10-BA');
  await fld(page, 'Data prevista').locator('input').fill('2026-11-12');
  await fld(page, 'Tipo de operação').locator('select').selectOption({label: 'Bombeio'});
  await fld(page, 'Sales Order').locator('input').fill('460987654');
  await escolher(page, 'Pessoal', '', [1]);
  await page.click('.eng-modal button:has-text("Enviar Handover")');
  await page.click('button:has-text("Continuar →")');
  await page.click('.ho-modal button:has-text("Continuar para o e-mail")');
  await page.waitForSelector('.hm-modal');
  const ass3 = await page.innerText('.hm-assunto');
  conf(ass3 === 'HANDOVER - SPT-TESTE - BOMBEIO (7-CP-10-BA) - SO 460987654 - VIDA N/A', 'bombeio sem VIDA: "VIDA N/A"', ass3);
  conf(await page.locator('.hm-tab tbody tr').count() === 2, 'lista de e-mails salva vale nas duas regiões');
  const e3 = await baixar(page, () => page.click('.hm-gerar'));
  const m3 = lerEml(e3.txt);
  conf(/Pessoal \(1\)/.test(m3.html) && /Engenharia Nordeste/.test(m3.html), 'onshore: pessoal por função e cabeçalho Nordeste');
  const locs = await page.evaluate(() => JSON.parse(localStorage.getItem('hal_cmt_db_v1')).plannedJobs.map(j => j.well + ':' + j.loc).sort());
  conf(locs.join() === '7-CP-10-BA:nne,7-MRL-99-RJS:macae', 'região de cada operação vem da base da sonda', locs);

  console.log('Voltar');
  await page.reload();
  await page.waitForSelector('.eng2-card', {timeout: 60000});
  await page.click('.eng2-card:has-text("PBR Land")');
  await page.waitForSelector('.eng2-ctbar');
  await page.click('.nav-back-btn');
  await page.waitForTimeout(300);
  conf(await page.locator('.eng2-ctbar').count() === 0 && await page.locator('.eng2-card').count() > 0, 'Voltar do contrato leva à página inicial da Engenharia');
  await page.click('.nav-back-btn');
  await page.waitForTimeout(300);
  conf(await page.locator('.hub-card').count() === 0 && await page.locator('.eng2-card').count() > 0, 'Voltar na página inicial fica na Engenharia (não há tela de região)');

  console.log('Celular');
  await page.setViewportSize({width: 390, height: 844});
  await page.waitForTimeout(300);
  const larg = await page.evaluate(() => document.documentElement.scrollWidth);
  conf(larg <= 392, 'sem rolagem lateral no celular', larg);
  await foto(page, '08_celular');

  conf(errs.length === 0, 'nenhum erro no console', errs.slice(0, 5));
  await browser.close();
  console.log(`\n${ok} ok, ${falhas} falha(s)`);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
