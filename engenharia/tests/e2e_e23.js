// e23 (pedido do Hugo, 27/11/2026): "📤 Compartilhar (HTML)" compartilha o PRÓPRIO arquivo do EARL Forecast (não existe
// mais o arquivo do Gerencial), com todos os dados de agora, e deixa escolher o nome do arquivo antes de baixar ou de
// criar o e-mail.
// Confere: o botão na barra de ferramentas e na aba Indicadores; o nome padrão e o nome escolhido (o que o Windows não
// aceita vira "-"); o .html (a mesma página, sem o que o app pôs na tela depois de abrir, com os dados num JSON e um
// prefixo de armazenamento só da cópia); a cópia abre com os mesmos contratos, operações, filtros e registros dos
// Indicadores, separada do arquivo original, e não regrava os dados ao reabrir; o .zip; o e-mail (.eml) com o anexo
// (.html ou .zip) e o nome escolhido; a cópia de uma cópia; a cópia de um arquivo de contrato; navegador sem espaço.
// Uso: node tests/e2e_e23.js [EARL_Engenharia.html] [EARL_Engenharia_<NOME>.html (arquivo de contrato, opcional)]
const {abrir} = require('./harness');
const {chromium} = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const ARQ = path.resolve(process.argv[2] || path.join(__dirname, '..', 'EARL_Engenharia.html'));
const CT = process.argv[3] ? path.resolve(process.argv[3]) : null;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'earl-e23-'));
// EARL_E23_SAIDA=<pasta>: guarda as cópias geradas (para passar no e2e_seguranca.js e no ClamAV)
const guardar = f => { const d = process.env.EARL_E23_SAIDA; if (d) { fs.mkdirSync(d, {recursive: true}); fs.copyFileSync(f, path.join(d, 'copia_' + path.basename(f).replace(/[^\w.-]+/g, '_'))); } };
let ok = 0, falhas = 0;
const conf = (c, msg, extra) => { if (c) { ok++; console.log('  ✓ ' + msg); } else { falhas++; console.log('  ✗ ' + msg + (extra !== undefined ? ' → ' + JSON.stringify(extra).slice(0, 700) : '')); } };
const baixar = async (p, acao) => { const d = p.waitForEvent('download', {timeout: 60000}); await acao(); const x = await d; const f = path.join(TMP, x.suggestedFilename()); await x.saveAs(f); return f; };
const pronto = async p => { await p.waitForSelector('.eng-tools', {timeout: 60000}); await p.waitForTimeout(500); };
const frame = async p => {
  if (await p.locator('.fr-tab-ind:not(.on)').count()) await p.click('.fr-tab-ind');
  const h = await p.waitForSelector('.ec-ger-frame', {timeout: 60000});
  const f = await h.contentFrame();
  await f.waitForSelector('.kpis', {timeout: 30000});
  return f;
};
const dbAqui = p => p.evaluate(() => JSON.parse(localStorage.getItem('hal_cmt_db_v1') || 'null'));
const resumo = d => d ? {cts: (d.contratos || []).map(c => c.name).sort(), ops: (d.plannedJobs || []).length, grupos: ((d.engCards || {}).grupos || []).length} : null;
// chaves guardadas por este arquivo (sem o prefixo)
const chavesAqui = p => p.evaluate(() => { const A = window.EARL_ARMAZ, o = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.indexOf(A.P) === 0) o.push(k.slice(A.P.length)); } return o.sort(); });
// a estrutura da página (filhos do <head> e do <body>), para comparar a cópia com o arquivo original
const estrutura = async (p, html) => p.evaluate(t => {
  const d = new DOMParser().parseFromString(t, 'text/html');
  const desc = el => el.tagName + (el.id ? '#' + el.id : '') + (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' ? ':' + el.textContent.length : '');
  return {head: Array.from(d.head.children).map(desc), body: Array.from(d.body.children).map(desc), app: (d.getElementById('app') || {}).innerHTML,
    scripts: Array.from(d.scripts).map(s => s.textContent), dados: (d.getElementById('earl-sh-dados') || {}).textContent || null,
    attrs: Array.from(d.documentElement.attributes).map(a => a.name).concat(Array.from(d.body.attributes).map(a => 'body.' + a.name)),
    sujo: d.querySelectorAll('[data-earl-rt], .earl-pl-tag, .eng-rz-alca, [data-engrz]').length, manifesto: (d.getElementById('pwa-manifest') || {}).getAttribute && d.getElementById('pwa-manifest').getAttribute('href')};
}, html);
const prefixo = html => (html.match(/var P='([^']*)';/) || [])[1];
const mime = eml => {
  const B = (eml.match(/boundary="([^"]+)"/) || [])[1];
  const partes = eml.split('--' + B).slice(1, -1).map(x => { const i = x.indexOf('\r\n\r\n'); return {cab: x.slice(0, i), corpo: Buffer.from(x.slice(i + 4).replace(/\s+/g, ''), 'base64')}; });
  const dec = t => String(t || '').replace(/=\?UTF-8\?B\?([^?]+)\?=/gi, (m, b) => Buffer.from(b, 'base64').toString('utf8'));
  return {para: (eml.match(/^To: (.*)$/m) || [])[1], assunto: dec((eml.match(/^Subject: (.*)$/m) || [])[1]), partes, dec};
};
// lê o .zip (um arquivo só) sem biblioteca
const unzip = buf => {
  const n = buf.readUInt16LE(26), x = buf.readUInt16LE(28), met = buf.readUInt16LE(8), tam = buf.readUInt32LE(18), crc = buf.readUInt32LE(14);
  const nome = buf.slice(30, 30 + n).toString('utf8'), dado = buf.slice(30 + n + x, 30 + n + x + tam);
  const fim = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  return {nome, met, crc, texto: (met === 8 ? zlib.inflateRawSync(dado) : dado).toString('utf8'), entradas: buf.readUInt16LE(fim + 10), flags: buf.readUInt16LE(6)};
};
const crc32 = b => { let c = 0xFFFFFFFF; for (const v of b) { c ^= v; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; } return (c ^ 0xFFFFFFFF) >>> 0; };
const abrirCopia = async (ctx, arq) => {
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error' && !/about:srcdoc.*sandboxed/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.goto('file://' + arq);
  await pronto(p);
  return {p, errs};
};
const abrirSh = async p => { await p.click('.eng-tools .eng-compartilhar'); await p.waitForSelector('.eng-sh .eng-sh-nome'); };

(async () => {
  const ORIG = fs.readFileSync(ARQ, 'utf8');
  const {browser, ctx, page: p, errs} = await abrir(ARQ, {hoje: '2026-11-27'});
  await pronto(p);

  console.log('1. Dados de teste: os contratos de um arquivo de contrato, um grupo, um filtro e um registro dos Indicadores');
  let base = null;
  if (CT) {
    const pc = await ctx.newPage();
    await pc.goto('file://' + CT);
    await pronto(pc);
    base = await dbAqui(pc);
    await pc.close();
  }
  if (!base) { // sem arquivo de contrato: dois contratos simples
    base = await dbAqui(p);
    const rig = (base.rigs || [])[0] || {id: 'r1', name: 'NS-99'};
    base.contratos = [{id: 'cA', name: 'Contrato Alfa', clientName: 'Cliente Ação', moeda: 'USD', itens: []}, {id: 'cB', name: 'Contrato Beta', clientName: 'Petróleo Sul', moeda: 'USD', itens: []}];
    base.plannedJobs = [1, 2, 3].map(i => ({id: 'j' + i, rigId: rig.id, contratoId: i < 3 ? 'cA' : 'cB', well: 'POCO-' + i, date: '2026-12-0' + i, opType: 'Abandono', status: 'planned'}));
  }
  base.engCards = {ordem: [], grupos: [{id: 'g1', nome: 'Grupo Teste', ctIds: (base.contratos || []).slice(0, 2).map(c => c.id)}]};
  await p.evaluate(d => localStorage.setItem('hal_cmt_db_v1', JSON.stringify(d)), base);
  await p.reload();
  await pronto(p);
  const R0 = resumo(await dbAqui(p));
  conf(R0.cts.length >= 1 && R0.ops >= 1, 'arquivo com ' + R0.cts.length + ' contrato(s) e ' + R0.ops + ' operação(ões)', R0);
  let fg = await frame(p);
  await fg.click('.b-reg');
  await fg.waitForSelector('#dlg [data-a="regSalvar"]');
  await fg.click('#dlg [data-a="regSalvar"]');
  await p.waitForTimeout(600);
  conf(/Comparar registros \(1\)/.test(await fg.innerText('.tabs')), 'registro dos Indicadores guardado');
  const chaves0 = await chavesAqui(p);
  conf(chaves0.includes('ger:registros_v1'), 'os Indicadores guardam os registros com o prefixo deste arquivo (cada arquivo com os seus)', chaves0);

  console.log('\n2. A janela: nos Indicadores e na barra de ferramentas, com o nome do arquivo');
  await fg.click('.b-sh');
  await p.waitForSelector('.eng-sh .eng-sh-nome', {timeout: 5000}).catch(() => {});
  conf(await p.locator('.eng-sh').count() === 1 && !(await fg.locator('#dlg').count()), 'nos Indicadores, “📤 Compartilhar (HTML)” abre a janela do Forecast (não a do Gerencial)');
  const titIndic = await fg.getAttribute('.b-sh', 'title');
  conf(/cópia deste arquivo do EARL Forecast/.test(titIndic), 'a dica do botão dos Indicadores fala da cópia do arquivo do Forecast', titIndic);
  await p.click('.eng-sh-cancelar');
  conf(!(await p.locator('.eng-sh').count()), 'Cancelar fecha a janela');
  await p.click('.fr-tab-cts').catch(() => {});
  await pronto(p);
  conf(await p.locator('.eng-tools .eng-compartilhar').count() === 1, 'botão “📤 Compartilhar (HTML)” na barra de ferramentas');
  await abrirSh(p);
  conf((await p.innerText('.eng-sh-origem')) === 'Cópia de: ' + path.basename(ARQ) && !(await p.locator('.eng-sh-vazio').count()), 'a janela mostra de qual arquivo sai a cópia (' + path.basename(ARQ) + ')', await p.innerText('.eng-sh-origem').catch(() => ''));
  const padrao = await p.inputValue('.eng-sh-nome');
  const umAtivo = (base.contratos || []).filter(c => !c.archived).length === 1;
  conf(umAtivo ? /^EARL_FORECAST_[A-Z0-9&-]+_[A-Z0-9&-]+_\d{4}\.\d{2}\.\d{2}_\d{2}h\d{2}$/.test(padrao) : /^EARL_FORECAST_([A-Z0-9&-]+_)?\d{4}\.\d{2}\.\d{2}_\d{2}h\d{2}$/.test(padrao), 'nome padrão: ' + padrao + '.html', padrao);
  conf(await p.locator('.eng-sh-ext', {hasText: '.html'}).count() === 1 && /Vai sair:/.test(await p.innerText('.eng-sh-saida')), 'mostra a extensão (.html) e o nome que vai sair', await p.innerText('.eng-sh-saida'));
  const NOME = 'Forecast Shell: revisão 1/2 <final>';
  const LIMPO = 'Forecast Shell- revisao 1-2 -final-';
  await p.fill('.eng-sh-nome', NOME);
  const saida = await p.innerText('.eng-sh');
  conf(saida.includes(LIMPO + '.html') && /não podem ir num nome de arquivo/.test(saida) && /sai sem acento/.test(saida), 'nome escolhido: o que o Windows não aceita vira “-”, sai sem acento (o navegador não baixa com acento), e a janela avisa (' + LIMPO + '.html)', saida);
  conf(await p.inputValue('.eng-sh-assunto') === 'EARL Forecast — ' + NOME, 'o assunto do e-mail acompanha o nome (como foi escrito, com acento)', await p.inputValue('.eng-sh-assunto'));
  await p.click('.eng-sh-padrao');
  conf(/^EARL_FORECAST_/.test(await p.inputValue('.eng-sh-nome')), '“↺ nome padrão” volta ao nome padrão');
  await p.fill('.eng-sh-nome', '   ');
  conf(/vazio, sai EARL_FORECAST_/.test(await p.innerText('.eng-sh-saida')), 'nome vazio: avisa que sai o padrão');
  await p.fill('.eng-sh-nome', NOME + '.html');

  console.log('\n3. ⬇ Baixar HTML: uma cópia deste arquivo, com os dados de agora');
  const arqH = await baixar(p, () => p.click('.eng-sh-html'));
  conf(path.basename(arqH) === LIMPO + '.html', 'baixou com o nome escolhido: ' + path.basename(arqH));
  await p.waitForTimeout(300);
  conf(!(await p.locator('.eng-sh').count()) && /Arquivo gerado ✓/.test(await p.innerText('body')), 'a janela fecha e aparece o aviso “Arquivo gerado ✓”');
  const H = fs.readFileSync(arqH, 'utf8');
  guardar(arqH);
  const eo = await estrutura(p, ORIG), ec = await estrutura(p, H);
  const semDados = l => l.filter(x => x !== 'SCRIPT#earl-sh-dados:' + (ec.dados || '').length).map(x => x.replace(/^(SCRIPT[^:]*):\d+$/, '$1'));
  conf(JSON.stringify(semDados(ec.head)) === JSON.stringify(semDados(eo.head)) && JSON.stringify(ec.body) === JSON.stringify(eo.body), 'a cópia tem a mesma estrutura do arquivo original (só o JSON dos dados a mais)', {copia: ec.head.slice(0, 8), orig: eo.head.slice(0, 8), cb: ec.body, ob: eo.body});
  const difs = ec.scripts.filter(t => t !== ec.dados).map((t, i) => t === eo.scripts[i] ? null : i).filter(i => i !== null);
  conf(difs.length === 1 && /window\.EARL_ENG_AVULSO=true;/.test(ec.scripts.filter(t => t !== ec.dados)[difs[0]]), 'todos os scripts iguais ao original, menos o do armazenamento (prefixo e o bloco da cópia)', difs);
  const avisoC = (ec.app || '').replace(/<[^>]+>/g, '');
  conf(/^<div [^>]*class="earl-semjs"[^>]*>/.test(ec.app || '') && (ec.app.match(/class="/g) || []).length === 1 && !ec.sujo && !ec.manifesto && !ec.attrs.some(a => /engrz|class|style/.test(a)), 'sem o que o app pôs na tela depois de abrir (no #app só o aviso para quando o programa não roda; sem alças, faixas nem marcas)', {app: (ec.app || '').slice(0, 200), sujo: ec.sujo, attrs: ec.attrs, manifesto: ec.manifesto});
  conf(/cópia compartilhada/.test(avisoC) && avisoC.includes(LIMPO + '.html') && avisoC.includes((base.contratos || []).filter(c => !c.archived).length + ' contrato(s)') && /Chrome/.test(avisoC) && /pré-visualização do Outlook/.test(avisoC), 'o aviso da cópia tem o nome do arquivo, o resumo dos dados e como abrir', avisoC.slice(0, 300));
  conf(/^<div class="earl-semjs"/.test(eo.app || '') && /abra com dois cliques no Google Chrome/.test(eo.app), 'o arquivo original também tem o aviso (sem o resumo)', (eo.app || '').slice(0, 120));
  const csp = H.indexOf('http-equiv="Content-Security-Policy"');
  conf(csp > 0 && csp < H.indexOf('<script') && !/<script[^>]+src=["']https?:/i.test(H), 'a política de segurança continua antes de qualquer script; nada carregado da internet');
  const pref = prefixo(H);
  const blocos = html => { const t = (html.match(/<script>\s*\/\* EARL Engenharia \(avulso\)[\s\S]*?<\/script>/) || [''])[0]; return (t.match(/\/\*EARL_SH_INI\*\//g) || []).length; };
  conf(/^earlengsh[a-z0-9]+:$/.test(pref) && pref !== prefixo(ORIG) && blocos(H) === 1, 'prefixo de armazenamento só da cópia (' + pref + '), um bloco da cópia', {pref, blocos: blocos(H)});
  const D = JSON.parse(ec.dados);
  conf(D.tipo === 'EARL-Forecast-Compartilhado' && D.nome === LIMPO + '.html' && JSON.stringify(resumo(JSON.parse(D.chaves.hal_cmt_db_v1))) === JSON.stringify(R0), 'JSON dos dados: o banco de agora (mesmos contratos, operações e grupos)', {tipo: D.tipo, nome: D.nome});
  const ks = Object.keys(D.chaves).sort();
  conf(chaves0.filter(k => k !== 'hal_cmt_dbsnap_v1').every(k => ks.includes(k)) && !ks.includes('hal_cmt_dbsnap_v1'), 'leva tudo o que o arquivo guarda (filtros, registros dos Indicadores…), menos o backup automático do navegador', {faltam: chaves0.filter(k => !ks.includes(k))});
  conf(!/<\/script/i.test(ec.dados) && H.indexOf('id="earl-sh-dados"') < H.indexOf("var P='"), 'os dados ficam num JSON antes do armazenamento (sem “</script” dentro)');

  console.log('\n4. A cópia abre com os mesmos dados, separada do arquivo original');
  const c1 = await abrirCopia(ctx, arqH);
  const Rc = resumo(await dbAqui(c1.p));
  conf(JSON.stringify(Rc) === JSON.stringify(R0), 'a cópia abre com os mesmos contratos, operações e grupos', {Rc, R0});
  conf(await c1.p.evaluate(() => window.EARL_ARMAZ.P) === pref && await c1.p.evaluate(() => !!(window.EARL_COMPARTILHADO && window.EARL_COMPARTILHADO.id)), 'a cópia usa o prefixo dela e sabe que é uma cópia compartilhada');
  const fc = await frame(c1.p);
  conf(/Comparar registros \(1\)/.test(await fc.innerText('.tabs')), 'nos Indicadores da cópia, o registro também está lá');
  const nomeCt = ((base.contratos || []).find((c, i) => i >= 2 && !c.archived) || {name: 'Grupo Teste'}).name; // fora do grupo (o grupo abre fechado)
  await c1.p.click('.fr-tab-cts').catch(() => {});
  await pronto(c1.p);
  conf((await c1.p.innerText('.content')).includes(nomeCt), 'a página de contratos da cópia mostra “' + nomeCt + '”');
  // muda o banco da cópia e o arquivo original não muda
  await c1.p.evaluate(() => { const d = JSON.parse(localStorage.getItem('hal_cmt_db_v1')); d.contratos[0].name = 'Mudado na cópia'; localStorage.setItem('hal_cmt_db_v1', JSON.stringify(d)); localStorage.setItem('teste_sh', 'x'); });
  await c1.p.reload();
  await pronto(c1.p);
  conf(resumo(await dbAqui(c1.p)).cts.includes('Mudado na cópia'), 'reabrindo a cópia, vale o que foi lançado nela (os dados embutidos não são gravados de novo)');
  await p.reload();
  await pronto(p);
  conf(JSON.stringify(resumo(await dbAqui(p))) === JSON.stringify(R0) && await p.evaluate(() => localStorage.getItem('teste_sh')) === null, 'o arquivo original não mudou (cada um com os seus dados)');
  conf(!c1.errs.length, 'cópia: nenhum erro de JavaScript', c1.errs.slice(0, 3));
  // noutro computador (navegador sem nada guardado)
  const b5 = await chromium.launch();
  const x5 = await b5.newContext({viewport: {width: 1440, height: 900}});
  await x5.route(/^https?:\/\//, r => r.abort());
  const c5 = await abrirCopia(x5, arqH);
  const f5 = await frame(c5.p);
  conf(JSON.stringify(resumo(await dbAqui(c5.p))) === JSON.stringify(R0) && /Comparar registros \(1\)/.test(await f5.innerText('.tabs')) && !c5.errs.length, 'noutro navegador (sem nada guardado), a cópia abre com os mesmos dados e o registro dos Indicadores', c5.errs.slice(0, 3));
  await b5.close();

  console.log('\n4b. Pré-visualização (sem o programa rodar): aviso com o resumo, em vez da tela em branco');
  const b6 = await chromium.launch();
  const x6 = await b6.newContext({viewport: {width: 1200, height: 800}, javaScriptEnabled: false});
  const p6 = await x6.newPage();
  await p6.goto('file://' + arqH);
  await p6.waitForTimeout(3200);
  const t6 = await p6.innerText('body');
  conf(/cópia compartilhada/.test(t6) && t6.includes(LIMPO + '.html') && /operação\(ões\)/.test(t6) && /Chrome/.test(t6) && await p6.locator('.earl-semjs').isVisible(), 'sem JavaScript, a cópia mostra o aviso com o resumo dos dados e como abrir (não fica em branco)', t6.slice(0, 200));
  await p6.goto('file://' + ARQ);
  await p6.waitForTimeout(3200);
  conf(/abra com dois cliques no Google Chrome/.test(await p6.innerText('body')), 'sem JavaScript, o arquivo original também mostra como abrir');
  await b6.close();
  const p7 = await ctx.newPage();
  await p7.goto('file://' + arqH);
  const cedo = await p7.evaluate(() => { const e = document.querySelector('.earl-semjs'); return e ? getComputedStyle(e).visibility : 'sem'; });
  await pronto(p7);
  conf((cedo === 'hidden' || cedo === 'sem') && !(await p7.locator('.earl-semjs').count()), 'com o programa rodando, o aviso não aparece (fica escondido nos primeiros segundos e a tela do app o substitui)', cedo);
  await p7.close();

  console.log('\n5. ⬇ Baixar .zip');
  await abrirSh(p);
  await p.fill('.eng-sh-nome', 'Copia zip');
  const arqZ = await baixar(p, () => p.click('.eng-sh-zip'));
  const Z = unzip(fs.readFileSync(arqZ));
  conf(path.basename(arqZ) === 'Copia zip.zip' && Z.entradas === 1 && Z.nome === 'Copia zip.html' && Z.met === 8 && (Z.flags & 0x0800), '.zip com o nome escolhido, um arquivo (Copia zip.html), comprimido', {arq: path.basename(arqZ), Z: {nome: Z.nome, met: Z.met, ent: Z.entradas}});
  conf(crc32(Buffer.from(Z.texto, 'utf8')) === Z.crc && /^<!DOCTYPE html>/.test(Z.texto) && Z.texto.includes('id="earl-sh-dados"') && fs.statSync(arqZ).size < Buffer.byteLength(Z.texto) / 2, 'dentro, a cópia do arquivo (CRC confere; o .zip tem menos da metade do tamanho)', {zip: fs.statSync(arqZ).size, html: Buffer.byteLength(Z.texto)});

  console.log('\n6. ✉ Criar e-mail (.eml) com o arquivo anexo');
  await abrirSh(p);
  await p.fill('.eng-sh-nome', 'Forecast da equipe — novembro');
  await p.fill('.eng-sh-para', 'fulano@empresa.com; outro@empresa.com');
  const arqE = await baixar(p, () => p.click('.eng-sh-eml'));
  const E = mime(fs.readFileSync(arqE, 'utf8'));
  const anexo = E.partes.find(x => /attachment/.test(x.cab));
  conf(path.basename(arqE) === 'Forecast da equipe - novembro.eml', 'o .eml sai com o nome escolhido', path.basename(arqE));
  conf(E.para === 'fulano@empresa.com; outro@empresa.com' && E.assunto === 'EARL Forecast — Forecast da equipe — novembro' && /X-Unsent: 1/.test(fs.readFileSync(arqE, 'utf8')), 'rascunho (X-Unsent) com Para e Assunto (com o travessão; o arquivo sai com “-”)', {para: E.para, assunto: E.assunto});
  const nAnexo = E.dec((anexo.cab.match(/filename="([^"]+)"/) || [])[1]);
  const htmlAnexo = anexo.corpo.toString('utf8');
  conf(nAnexo === 'Forecast da equipe - novembro.html' && /text\/html/.test(anexo.cab) && /^<!DOCTYPE html>/.test(htmlAnexo) && htmlAnexo.includes('id="earl-sh-dados"'), 'anexo: a cópia do arquivo, com o nome escolhido (.html)', {nAnexo, cab: anexo.cab.slice(0, 200)});
  const texto = E.partes.find(x => /text\/plain/.test(x.cab)).corpo.toString('utf8');
  conf(/Forecast da equipe - novembro\.html/.test(texto) && /dois cliques/.test(texto), 'a mensagem fala do arquivo anexo e de como abrir', texto.slice(0, 200));
  await abrirSh(p);
  await p.fill('.eng-sh-nome', 'Anexo zip');
  await p.check('.eng-sh-anexozip');
  conf(/Anexo zip\.zip/.test(await p.inputValue('.eng-sh-msg')), 'com “Anexar compactado”, a mensagem fala do .zip');
  const arqE2 = await baixar(p, () => p.click('.eng-sh-eml'));
  const E2 = mime(fs.readFileSync(arqE2, 'utf8'));
  const an2 = E2.partes.find(x => /attachment/.test(x.cab));
  const Z2 = unzip(an2.corpo);
  conf(/application\/zip/.test(an2.cab) && E2.dec((an2.cab.match(/filename="([^"]+)"/) || [])[1]) === 'Anexo zip.zip' && Z2.nome === 'Anexo zip.html' && Z2.texto.includes('id="earl-sh-dados"'), 'anexo compactado: Anexo zip.zip com Anexo zip.html dentro');

  console.log('\n7. Cópia de uma cópia');
  await abrirSh(c1.p);
  await c1.p.fill('.eng-sh-nome', 'Copia da copia');
  const arqCC = await baixar(c1.p, () => c1.p.click('.eng-sh-html'));
  const HC = fs.readFileSync(arqCC, 'utf8');
  guardar(arqCC);
  conf(blocos(HC) === 1 && (HC.match(/id="earl-sh-dados"/g) || []).length === 1 && prefixo(HC) !== pref && /^earlengsh/.test(prefixo(HC)), 'um bloco e um JSON só, com outro prefixo');
  const c2 = await abrirCopia(ctx, arqCC);
  conf(resumo(await dbAqui(c2.p)).cts.includes('Mudado na cópia'), 'a cópia da cópia abre com os dados da cópia (com o que foi lançado nela)');
  conf(!c2.errs.length, 'cópia da cópia: nenhum erro de JavaScript', c2.errs.slice(0, 3));

  console.log('\n8. Navegador sem espaço: a cópia abre com os dados embutidos');
  const b3 = await chromium.launch();
  const x3 = await b3.newContext({viewport: {width: 1440, height: 900}});
  await x3.route(/^https?:\/\//, r => r.abort());
  await x3.addInitScript(() => { const s = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (/^earlengsh/.test(k)) throw new DOMException('cheio', 'QuotaExceededError'); return s.call(this, k, v); }; });
  const c3 = await abrirCopia(x3, arqH);
  conf(JSON.stringify(resumo(await dbAqui(c3.p))) === JSON.stringify(R0) && await c3.p.evaluate(() => window.EARL_SH_SEM_ESPACO === true), 'sem espaço para gravar, a cópia abre mesmo assim com os mesmos dados', await c3.p.evaluate(() => window.EARL_SH_SEM_ESPACO));
  await b3.close();

  if (CT) {
    console.log('\n9. Cópia de um arquivo de contrato (' + path.basename(CT) + ')');
    const pc = await ctx.newPage();
    const errC = [];
    pc.on('pageerror', e => errC.push(String(e)));
    await pc.goto('file://' + CT);
    await pronto(pc);
    const Rct = resumo(await dbAqui(pc));
    await abrirSh(pc);
    const arqCt = await baixar(pc, () => pc.click('.eng-sh-html'));
    const HCt = fs.readFileSync(arqCt, 'utf8');
    guardar(arqCt);
    conf(/^EARL_FORECAST_.*\.html$/.test(path.basename(arqCt)) && (HCt.match(/var SEED=/g) || []).length === 1 && !/class="earl-pl-tag/.test(HCt), 'nome padrão ' + path.basename(arqCt) + '; os dados da planilha continuam; sem a faixa posta na tela', path.basename(arqCt));
    const c4 = await abrirCopia(ctx, arqCt);
    await c4.p.waitForTimeout(500);
    conf(JSON.stringify(resumo(await dbAqui(c4.p))) === JSON.stringify(Rct) && await c4.p.locator('.earl-pl-tag').count() === 1, 'a cópia abre com os dados de agora (não volta aos da planilha) e com a faixa do contrato', {c: resumo(await dbAqui(c4.p)), o: Rct});
    conf(!errC.length && !c4.errs.length, 'contrato e cópia: nenhum erro de JavaScript', errC.concat(c4.errs).slice(0, 3));
    await pc.close();
  }

  console.log('\n10. Arquivo sem operações (o padrão, novo): a janela avisa que a cópia vai sair sem operações');
  const b8 = await chromium.launch();
  const x8 = await b8.newContext({viewport: {width: 1440, height: 900}});
  await x8.addInitScript(() => { window.EARL_ABA_INICIAL = 'cts'; });
  const c8 = await abrirCopia(x8, ARQ);
  await abrirSh(c8.p);
  conf(/não tem nenhuma operação lançada/.test(await c8.p.innerText('.eng-sh-vazio').catch(() => '')), 'arquivo sem operações: aviso vermelho na janela (abrir o arquivo do contrato ou importar)');
  await b8.close();

  conf(!errs.length, 'arquivo original: nenhum erro de JavaScript', errs.slice(0, 3));
  await browser.close();
  console.log('\n' + ok + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
