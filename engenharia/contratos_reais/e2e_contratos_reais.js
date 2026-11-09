// Verificação dos EARL Engenharia pré-carregados com as planilhas de contrato (gerados pelo gerar_html.js).
// Para cada arquivo: abre como o usuário abre (file://, sem internet), confere os dados contra os totais da
// própria planilha (RECEITA FINAL e COGS FINAL, somados aqui de forma independente do leitor), o Gerencial
// embutido ano a ano, o "Arquivo do gerencial", todas as abas de todos os contratos, o consumo lançado, as
// exportações, o armazenamento separado e o "Reiniciar".
//
// Uso: node contratos_reais/e2e_contratos_reais.js <pasta das planilhas> <pasta dos HTML> [NOME ...] [--telas <pasta>]
//   pasta das planilhas: <NOME>.xlsx (ou <NOME>/<NOME>.xlsx); pasta dos HTML: EARL_Engenharia_<NOME>.html
const {abrir} = require('../tests/harness');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const iT = args.indexOf('--telas');
const SHOTS = iT >= 0 ? args.splice(iT, 2)[1] : '';
const [PLAN, HTMLS, ...NOMES0] = args;
if (!PLAN || !HTMLS) {
  console.error('uso: node contratos_reais/e2e_contratos_reais.js <pasta das planilhas> <pasta dos HTML> [NOME ...] [--telas <pasta>]');
  process.exit(2);
}
if (SHOTS) fs.mkdirSync(SHOTS, {recursive: true});
const NOMES = NOMES0.length ? NOMES0 : ['PA', 'DC', 'CE', 'BW', 'BDII', 'Shell'];
const HOJE = new Date().toISOString().slice(0, 10);
let ok = 0, falhas = 0;
const conf = (cond, msg, extra) => {
  if (cond) { ok++; console.log('  ✓ ' + msg); } else { falhas++; console.log('  ✗ ' + msg + (extra !== undefined ? ' → ' + JSON.stringify(extra).slice(0, 600) : '')); }
};
const valor = s => Number(String(s).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
const perto = (a, b, tol = 0.05) => Math.abs(a - b) <= tol;
const usd = v => 'US$ ' + v.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const achaPlanilha = n => [path.join(PLAN, n + '.xlsx'), path.join(PLAN, n, n + '.xlsx')].find(f => fs.existsSync(f));

// totais da planilha, lidos aqui sem o leitor do gerador (soma direta das colunas/linhas de RECEITA FINAL e COGS FINAL)
function totaisPlanilha(b64) {
  const wb = XLSX.read(b64, {type: 'base64'});
  const nome = re => wb.SheetNames.find(n => re.test(n.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()));
  const F = XLSX.utils.sheet_to_json(wb.Sheets[nome(/^forecast/)], {header: 1, raw: true, defval: null});
  const t = v => v == null ? '' : String(v).replace(/\s+/g, ' ').trim();
  const n = v => typeof v === 'number' ? v : 0;
  const ano = v => typeof v === 'number' ? String(XLSX.SSF.parse_date_code(v).y) : t(v).slice(0, 4);
  const o = {ops: 0, linhas: 0, rec: 0, cogs: 0, anos: {}, contratos: [], concl: 0};
  const add = (a, r, c) => { const x = o.anos[a] = o.anos[a] || {rec: 0, cogs: 0}; x.rec += r; x.cogs += c; o.rec += r; o.cogs += c; };
  const lin = rot => F.find(r => r && t(r[5]).toLowerCase() === rot.toLowerCase());
  if (lin('Status')) {
    const st = lin('Status'), dt = lin('Data da Operação'), rf = lin('RECEITA FINAL'), cf = lin('COGS FINAL');
    for (let c = 6; c < st.length; c++) if (t(st[c])) { o.ops++; if (/^conclu/i.test(t(st[c]))) o.concl++; add(ano(dt[c]), n(rf[c]), n(cf[c])); }
    const iP = F.findIndex(r => r && /^nome do contrato/i.test(t(r[0])));
    o.contratos = [t(F[iP + 1][0])];
  } else {
    const iH = F.findIndex(r => r && r.some(v => /^nome do cliente/i.test(t(v))));
    const H = F[iH].map(x => t(x).toLowerCase());
    const I = re => H.findIndex(h => re.test(h));
    const ic = I(/^contrato$/), ist = I(/^status/), id = I(/^data/), irf = I(/^receita final/), icf = I(/^cogs final/);
    const cts = new Set();
    F.slice(iH + 1).forEach(r => { if (r && t(r[ic]) && t(r[ist])) { o.linhas++; cts.add(t(r[ic])); add(ano(r[id]), n(r[irf]), n(r[icf])); } });
    o.contratos = [...cts];
  }
  return o;
}

(async () => {
  for (const NOME of NOMES) {
    const XLS = achaPlanilha(NOME), HTML = path.join(HTMLS, 'EARL_Engenharia_' + NOME + '.html');
    if (!XLS || !fs.existsSync(HTML)) { console.log('\n== ' + NOME + ': planilha ou HTML não encontrado, pulado'); continue; }
    console.log('\n== ' + NOME + ' (' + path.basename(HTML) + ')');
    const E = await abrir(HTML, {hoje: HOJE});
    const p = E.page;
    await p.waitForSelector('.eng2-card', {timeout: 60000});
    const PL = await p.evaluate(totaisPlanilha, fs.readFileSync(XLS).toString('base64'));
    console.log('    planilha: %s contrato(s), %s · RECEITA FINAL %s · COGS FINAL %s', PL.contratos.length, PL.ops ? PL.ops + ' operações (' + PL.concl + ' concluídas)' : PL.linhas + ' linhas', usd(PL.rec), usd(PL.cogs));

    /* ---- abertura ---- */
    conf(await p.title() === 'EARL — Engenharia (' + NOME + ')', 'título “EARL — Engenharia (' + NOME + ')”', await p.title());
    const tag = (await p.innerText('.earl-pl-tag')).replace(/\s+/g, ' ');
    conf(tag.indexOf(NOME) === 0 && tag.indexOf('dados da planilha ' + path.basename(XLS)) > 0, 'etiqueta no canto: ' + NOME + ' · dados da planilha ' + path.basename(XLS), tag);
    const db = await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('hal_cmt_db_v1')); return {marca: d.earlPlanilhaId === window.EARL_PL_ID, ativos: d.contratos.filter(c => !c.archived).map(c => ({id: c.id, nome: c.name, itens: c.items.length, semPreco: c.items.filter(i => typeof i.usd !== 'number').length})), ops: d.plannedJobs.length, cons: d.plannedJobs.filter(j => j.ppuCons).length, semRig: d.plannedJobs.filter(j => !j.rigId).length, rigs: [...new Set(d.plannedJobs.map(j => j.rigId).filter(Boolean))].filter(id => !d.rigs.some(r => r.id === id)).length}; });
    conf(db.marca, 'abre com os dados da planilha (marca desta versão)');
    conf(db.ativos.length === PL.contratos.length && new RegExp(PL.contratos.length + ' contrato\\(s\\) vigente').test(await p.innerText('body')), PL.contratos.length + ' contrato(s) ativo(s), os mesmos do Forecast (os outros do EARL ficam arquivados)', db.ativos.map(c => c.nome));
    conf(db.ativos.every(c => c.itens > 0 || /cambial|copq/i.test(c.nome)) && db.ativos.every(c => !c.semPreco), 'itens PPU com preço em US$ em todos os contratos', db.ativos.filter(c => c.semPreco || !c.itens));
    if (PL.ops) conf(db.ops === PL.ops && db.cons === PL.concl, PL.ops + ' operações, ' + PL.concl + ' com consumo lançado (as concluídas)', [db.ops, db.cons]);
    else conf(db.ops > 0 && db.ops <= PL.linhas, db.ops + ' operações (as ' + PL.linhas + ' linhas agrupadas por contrato, sonda, poço, data, situação, risco e SO)', [db.ops, PL.linhas]);
    conf(db.rigs === 0, 'toda sonda usada nas operações existe no cadastro' + (db.semRig ? ' (' + db.semRig + ' operação(ões) sem sonda: vendas, câmbio/COPQ, frente de trabalho)' : ''), db);
    const pref = 'earleng' + NOME.toLowerCase().replace(/[^a-z0-9]/g, '') + ':';
    conf(await p.evaluate(pf => [...Array(localStorage.length).keys()].map(i => localStorage.key(i)).every(k => k.startsWith(pf)), pref), 'armazenamento separado (prefixo ' + pref + ')');
    if (SHOTS) await p.screenshot({path: path.join(SHOTS, NOME + '_1_inicio.png')});

    /* ---- Receita e margem (Gerencial embutido), ano a ano ---- */
    await p.waitForSelector('.ec-ger-frame', {timeout: 60000});
    const fg = await (await p.$('.ec-ger-frame')).contentFrame();
    await fg.waitForSelector('.kpis', {timeout: 30000});
    const anos = await fg.$$eval('[data-f="ano"] option', l => l.map(o => o.value).filter(Boolean));
    const anosPl = Object.keys(PL.anos).filter(a => Math.abs(PL.anos[a].rec) > 0.005 || Math.abs(PL.anos[a].cogs) > 0.005 || true).sort();
    conf(anosPl.every(a => anos.includes(a)), 'Receita e margem: anos ' + anosPl.join(', '), anos);
    let sR = 0, sC = 0;
    const difA = [];
    for (const a of anos) {
      await fg.selectOption('[data-f="ano"]', a);
      const r = valor(await fg.textContent('.k-rec-usd b')), c = valor(await fg.textContent('.k-cogs b'));
      sR += r; sC += c;
      const e = PL.anos[a] || {rec: 0, cogs: 0};
      if (!perto(r, e.rec, 0.5) || !perto(c, e.cogs, 0.5)) difA.push({a, app: [r, c], planilha: [e.rec, e.cogs]});
    }
    conf(!difA.length, 'cada ano: receita e COGS = Σ RECEITA FINAL e Σ COGS FINAL da planilha', difA);
    conf(perto(sR, PL.rec, 1) && perto(sC, PL.cogs, 1), 'todos os anos: receita ' + usd(PL.rec) + ' e COGS ' + usd(PL.cogs), [sR, sC]);
    if (SHOTS) { await fg.selectOption('[data-f="ano"]', anos.includes('2026') ? '2026' : anos[0]); await p.screenshot({path: path.join(SHOTS, NOME + '_2_receita.png')}); }

    /* ---- Arquivo do gerencial ---- */
    await p.click('.eng-tools button:has-text("Arquivo do gerencial")');
    await p.waitForSelector('.ec-ger-modal');
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('.ec-ger-ok')]);
    const pac = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
    const f = o => o.risco >= 100 ? 0 : 1 - (o.risco || 0) / 100;
    const tR = pac.operacoes.reduce((s, o) => s + (o.realizado ? o.receita.usd : o.previsto.receita.usd) * f(o), 0);
    const tC = pac.operacoes.reduce((s, o) => s + (o.realizado ? o.realizado.cogs.usd : o.previsto.cogs.usd) * f(o), 0);
    conf(pac.contratos.length === PL.contratos.length && pac.operacoes.length === db.ops && perto(tR, PL.rec, 1) && perto(tC, PL.cogs, 1), 'arquivo do gerencial: ' + pac.contratos.length + ' contrato(s), ' + pac.operacoes.length + ' operações, receita e COGS = planilha', {c: pac.contratos.length, o: pac.operacoes.length, tR, tC});
    await p.click('.ec-ger-modal .modal-close').catch(() => {});

    /* ---- todos os contratos, todas as abas ---- */
    const nomesCt = db.ativos.map(c => c.nome);
    let abas = 0, consumos = 0;
    const errAntes = E.errs.length;
    for (const nm of nomesCt) {
      await p.locator('.eng2-card').filter({hasText: nm}).first().click();
      await p.waitForSelector('.eng2-ctbar');
      const n = await p.locator('.db-tab').count();
      for (let i = 0; i < n; i++) { await p.locator('.db-tab').nth(i).click(); await p.waitForTimeout(120); abas++; }
      await p.click('.db-tab:has-text("Consumo e receita")');
      const b = p.locator('.ec-ops button:has-text("Σ Consumo")').first();
      if (await b.count()) { await b.click(); await p.waitForSelector('.ec-cons-modal'); consumos++; await p.click('.ec-cons-modal .modal-close'); }
      await p.click('.db-tab:has-text("Lista")');
      await p.waitForTimeout(150);
      await p.click('.nav-back-btn');
      await p.waitForSelector('.eng2-card');
    }
    conf(E.errs.length === errAntes, 'os ' + nomesCt.length + ' contrato(s) abrem em todas as abas (' + abas + ' abas) e o consumo lançado abre (' + consumos + ')', E.errs.slice(errAntes, errAntes + 3));

    /* ---- exportações (inventário, químicos, casing, pessoal) ---- */
    await p.click('.eng-tools button:has-text("Exportar planilhas")');
    await p.waitForSelector('.ei-exp-modal');
    const nExp = await p.locator('.ei-exp-btn').count();
    const lidos = [];
    for (let i = 0; i < nExp; i++) {
      const [d2] = await Promise.all([p.waitForEvent('download'), p.locator('.ei-exp-btn').nth(i).click()]);
      const info = await p.evaluate(b => { const w = XLSX.read(b, {type: 'base64'}); const ab = w.SheetNames.find(n => n !== 'Sobre'); return {ab, n: XLSX.utils.sheet_to_json(w.Sheets[ab]).length}; }, fs.readFileSync(await d2.path()).toString('base64'));
      lidos.push(d2.suggestedFilename() + ': ' + info.n);
    }
    conf(nExp === 4 && lidos.length === 4, 'as 4 planilhas exportam (' + lidos.join(' · ') + ')', lidos);
    await p.click('.ei-exp-modal .modal-close');

    /* ---- alteração salva e "Reiniciar" ---- */
    await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('hal_cmt_db_v1')); d.plannedJobs = d.plannedJobs.slice(1); localStorage.setItem('hal_cmt_db_v1', JSON.stringify(d)); });
    await p.reload();
    await p.waitForSelector('.eng2-card');
    const n1 = await p.evaluate(() => JSON.parse(localStorage.getItem('hal_cmt_db_v1')).plannedJobs.length);
    p.once('dialog', d => d.accept());
    await Promise.all([p.waitForEvent('load'), p.click('.earl-pl-tag button')]);
    await p.waitForSelector('.eng2-card');
    const n2 = await p.evaluate(() => JSON.parse(localStorage.getItem('hal_cmt_db_v1')).plannedJobs.length);
    conf(n1 === db.ops - 1 && n2 === db.ops, 'alteração fica salva ao reabrir; “Reiniciar” volta aos dados da planilha', [n1, n2]);
    conf(E.errs.length === 0, NOME + ': nenhum erro no app', E.errs.slice(0, 5));
    await E.browser.close();
  }
  console.log(`\n${ok} ok, ${falhas} falha(s)`);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
