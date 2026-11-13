// Verificação do teste BP: o EARL_Engenharia_BP_teste.html (dados da planilha embutidos) e o arquivo do
// gerencial que ele gera, conferidos contra os totais calculados pela própria planilha (aba Forecast):
// "Total receita", "RECEITA FINAL", "Total Cogs Químicos", "COGS FINAL", "HC", "Status" e "Risco".
//
// Uso: node teste_bp/e2e_bp.js <Contrato_BP_Teste_EARL.xlsx> <EARL_Engenharia_BP_teste.html> <EARL_Gerencial.html> <pasta de saída> [pasta das telas]
// Na pasta de saída fica o arquivo do gerencial do BP gerado pelo app (para carregar no EARL Gerencial).
const {abrir} = require('../tests/harness');
const fs = require('fs');
const path = require('path');

const [XLSX_ARQ, BP, GER, SAIDA, SHOTS] = process.argv.slice(2);
if (!XLSX_ARQ || !BP || !GER || !SAIDA) {
  console.error('uso: node teste_bp/e2e_bp.js <planilha.xlsx> <EARL_Engenharia_BP_teste.html> <EARL_Gerencial.html> <pasta de saída> [pasta das telas]');
  process.exit(2);
}
fs.mkdirSync(SAIDA, {recursive: true});
if (SHOTS) fs.mkdirSync(SHOTS, {recursive: true});
let ok = 0, falhas = 0;
const conf = (cond, msg, extra) => {
  if (cond) { ok++; console.log('  ✓ ' + msg); } else { falhas++; console.log('  ✗ ' + msg + (extra !== undefined ? ' → ' + JSON.stringify(extra) : '')); }
};
const foto = async (page, nome) => { if (SHOTS) await page.screenshot({path: path.join(SHOTS, nome + '.png'), fullPage: false}); };
const txt = async (page, sel) => (await page.innerText(sel)).replace(/\s+/g, ' ').trim();
// "US$ 1.234,56" / "R$ 1.234,56" → número
const valor = s => Number(String(s).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
const perto = (a, b, tol = 0.011) => Math.abs(a - b) <= tol;
const usd = v => 'US$ ' + v.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});

(async () => {
  console.log('Planilha (totais calculados pelo próprio Excel)');
  const E = await abrir(BP, {hoje: '2026-11-02'});
  let p = E.page;
  await p.waitForSelector('.eng-tools', {timeout: 60000});
  const pl = await p.evaluate(b64 => {
    const wb = XLSX.read(b64, {type: 'base64'});
    const F = XLSX.utils.sheet_to_json(wb.Sheets['Forecast'], {header: 1, raw: true, defval: null});
    const lin = r => F.find(x => String(x[5] || '').trim().toLowerCase() === r.toLowerCase());
    const st = lin('Status'), dt = lin('Data da Operação');
    const n = v => typeof v === 'number' ? v : 0;
    const ops = [];
    for (let c = 6; c < st.length; c++) {
      if (!st[c]) continue;
      const d = XLSX.SSF.parse_date_code(dt[c]);
      ops.push({
        status: String(st[c]).trim(), desc: String(lin('Operação/Descrição')[c] || '').trim(),
        data: d.y + '-' + String(d.m).padStart(2, '0') + '-' + String(d.d).padStart(2, '0'),
        risco: n(lin('Risco')[c]), hc: n(lin('HC')[c]),
        receita: n(lin('Total receita')[c]), receitaFinal: n(lin('RECEITA FINAL')[c]),
        cogs: n(lin('Total Cogs Químicos')[c]), cogsFinal: n(lin('COGS FINAL')[c])
      });
    }
    return ops;
  }, fs.readFileSync(XLSX_ARQ).toString('base64'));
  const soma = (l, k) => l.reduce((a, o) => a + o[k], 0);
  const PL = {
    n: pl.length, real: pl.filter(o => /^conclu/i.test(o.status)), prev: pl.filter(o => !/^conclu/i.test(o.status)),
    rec: soma(pl, 'receitaFinal'), cogs: soma(pl, 'cogsFinal'), fora: pl.filter(o => o.risco >= 1).length
  };
  console.log('    %d operações · %d concluídas · %d previstas · %d com risco 100%% · RECEITA FINAL %s · COGS FINAL %s', PL.n, PL.real.length, PL.prev.length, PL.fora, usd(PL.rec), usd(PL.cogs));
  conf(PL.n === 27 && PL.real.length === 9 && PL.fora === 2, 'planilha lida: 27 operações, 9 concluídas, 2 com risco 100%', {n: PL.n, real: PL.real.length, fora: PL.fora});

  console.log('Engenharia (arquivo de teste BP)');
  conf(await p.title() === 'EARL — Engenharia (TESTE BP)' && /TESTE BP/.test(await txt(p, '.earl-bp-tag')), 'abre direto na Engenharia com a etiqueta TESTE BP');
  const db = await p.evaluate(() => JSON.parse(localStorage.getItem('hal_cmt_db_v1')));
  const ct = db.contratos.find(c => c.id === 'ct_bp');
  const ops = db.plannedJobs.filter(j => j.contratoId === 'ct_bp').sort((a, b) => a.id.localeCompare(b.id));
  conf(ct && ct.items.length === 134 && ct.items.every(i => typeof i.usd === 'number') && ct.inicio === '2026-06-22', 'contrato BP: 134 itens PPU com US$, início 22/06/2026', ct && {n: ct.items.length, ini: ct.inicio});
  conf(db.contratos.filter(c => !c.archived).map(c => c.id).join() === 'ct_bp' && /1 contrato\(s\) vigente/.test(await p.innerText('body')), 'só o contrato BP fica ativo (os outros do EARL vão para “arquivados”)', db.contratos.filter(c => !c.archived).map(c => c.name));
  conf(db.rigs.some(r => r.nomePetrobras === 'NS-39' && r.base === 'Macaé') && ops.every(j => j.rigId === 'rig_bp_ns39'), 'sonda NS-39 cadastrada (base Macaé) e usada nas operações');
  conf((db.quimicos || []).length === 60 && (db.casingEquip || []).filter(c => typeof c.usd === 'number').length === 102 && !(db.cogsItens || []).length, 'COGS: 60 produtos no banco de químicos e 102 itens com valor no banco de casing equipment (e12; nada em Custos)', [(db.quimicos || []).length, (db.casingEquip || []).filter(c => typeof c.usd === 'number').length, (db.cogsItens || []).length]);
  conf(ops.length === 27 && ops.filter(j => j.ppuCons).length === 9, '27 operações do BP, 9 com consumo lançado', [ops.length, ops.filter(j => j.ppuCons).length]);
  const ordem = ops.map((j, i) => j.date === pl[i].data && (!!j.ppuCons) === /^conclu/i.test(pl[i].status) && j.riscoRec === Math.round(pl[i].risco * 100));
  conf(ordem.every(Boolean), 'cada operação com a data, a situação e o risco da planilha', ordem.map((x, i) => x ? null : ops[i].id).filter(Boolean));
  await foto(p, 'bp1_inicio');

  console.log('Arquivo do gerencial (gerado pelo app)');
  await p.click('.eng-tools button:has-text("Arquivo do gerencial")');
  await p.waitForSelector('.ec-ger-modal');
  conf(await p.inputValue('.ec-ger-nome') === 'Renata Alberton', 'responsável da planilha já vem preenchido (Renata Alberton)');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('.ec-ger-ok')]);
  const arqGer = path.join(SAIDA, dl.suggestedFilename());
  await dl.saveAs(arqGer);
  const pac = JSON.parse(fs.readFileSync(arqGer, 'utf8'));
  conf(pac.tipo === 'EARL-Gerencial' && pac.formato === 2 && pac.contratos.length === 1 && pac.operacoes.length === 27 && pac.por === 'Renata Alberton', 'arquivo: 1 contrato e 27 operações, por Renata Alberton', {arq: path.basename(arqGer), c: pac.contratos.length, o: pac.operacoes.length});
  const go = pac.operacoes.slice().sort((a, b) => a.id.localeCompare(b.id));
  const dif = [];
  const T = {rec: 0, cogs: 0, recR: 0, recP: 0, ano: {}};
  go.forEach((o, i) => {
    const s = pl[i];
    const real = !!o.realizado;
    const bruto = real ? o.receita.usd : o.previsto.receita.usd;
    const cogsB = real ? o.realizado.cogs.usd : o.previsto.cogs.usd;
    const f = Math.max(0, 1 - (o.risco || 0) / 100);
    const hd = (real ? o.realizado.pessoal : o.previsto.pessoal).reduce((a, x) => a + (x.hd || 0), 0);
    const e = [];
    if (o.data !== s.data) e.push('data ' + o.data + '≠' + s.data);
    if (real !== /^conclu/i.test(s.status)) e.push('situação');
    if (o.risco !== Math.round(s.risco * 100)) e.push('risco ' + o.risco);
    if (!perto(bruto, s.receita)) e.push('receita ' + bruto + '≠' + s.receita);
    if (!perto(bruto * f, s.receitaFinal)) e.push('receita final ' + bruto * f + '≠' + s.receitaFinal);
    if (!perto(cogsB, s.cogs)) e.push('cogs ' + cogsB + '≠' + s.cogs);
    if (!perto(cogsB * f, s.cogsFinal)) e.push('cogs final ' + cogsB * f + '≠' + s.cogsFinal);
    if (hd !== s.hc * o.duracao) e.push('homem-dia ' + hd + '≠' + s.hc + '×' + o.duracao);
    if (real && !perto(o.previsto.receita.usd, o.receita.usd)) e.push('previsto≠realizado');
    if (e.length) dif.push(o.id + ' (' + s.desc + '): ' + e.join(', '));
    T.rec += bruto * f; T.cogs += cogsB * f;
    if (real) T.recR += bruto * f; else T.recP += bruto * f;
    const a = o.data.slice(0, 4);
    T.ano[a] = (T.ano[a] || 0) + bruto * f;
  });
  conf(!dif.length, 'por operação: receita, receita final, COGS, COGS final, risco, situação e homem-dia = planilha (27 de 27)', dif);
  conf(perto(T.rec, PL.rec, 0.05) && perto(T.cogs, PL.cogs, 0.05), 'total: receita ' + usd(PL.rec) + ' e COGS ' + usd(PL.cogs) + ' = Σ RECEITA FINAL e Σ COGS FINAL', {app: [T.rec, T.cogs], planilha: [PL.rec, PL.cogs]});
  const fora = go.filter(o => o.risco >= 100);
  conf(fora.length === 2 && fora.every(o => o.previsto.receita.usd > 0), 'risco 100%: 2 operações mapeadas (com valor bruto), fora da receita e do COGS', fora.map(o => o.id + ' bruto ' + o.previsto.receita.usd));

  console.log('Página inicial: seção Receita e margem (a do Gerencial, embutida)');
  const gerF = async pg => { await pg.waitForSelector('.ec-ger-frame', {timeout: 60000}); const h = await pg.$('.ec-ger-frame'); const f = await h.contentFrame(); await f.waitForSelector('.kpis', {timeout: 30000}); return f; };
  const pnF = async f => ({usd: valor(await f.textContent('.k-rec-usd b')), cogs: valor(await f.textContent('.k-cogs b')), ops: (await f.textContent('.k-ops b')).trim(), sub: (await f.textContent('.k-ops em')).trim(), rsub: (await f.textContent('.k-rec-usd em')).trim()});
  let fg = await gerF(p);
  let v = await pnF(fg);
  conf(perto(v.usd, T.ano['2026']) && v.ops === '16' && v.sub === '9 realizada(s) · 7 prevista(s) · 2 fora (risco 100%)', '2026 (o ano padrão): ' + usd(T.ano['2026']) + ', 16 operações (2 fora)', v);
  await foto(p, 'bp2_painel');
  const cards = await fg.$$eval('.kpis .kpi > span', l => l.map(s => s.textContent));
  conf(cards.join('|') === 'Receita em US$|COGS em US$|Operações|Receita / operação (US$)|Margem em US$', 'cartões: Receita, COGS, Operações, Receita/operação, Margem', cards);
  const nConta26 = pl.filter(o => o.risco < 1 && o.data.startsWith('2026')).length;
  conf(perto(valor(await fg.textContent('.k-rec-op b')), T.ano['2026'] / nConta26), 'receita por operação 2026: ' + usd(T.ano['2026'] / nConta26) + ' (÷ ' + nConta26 + ', sem as com risco 100%)', await fg.textContent('.k-rec-op b'));
  const recPrev = s => { const m = s.match(/realizado US\$ ([\d.,]+) · previsto US\$ ([\d.,]+)/); return m ? [valor(m[1]), valor(m[2])] : [NaN, NaN]; };
  const [r26, p26] = recPrev(v.rsub);
  const mes26 = await fg.$$eval('.t-mx th.mx-mes:not(.mx-q)', l => l.length);
  await fg.selectOption('[data-f="ano"]', '2027');
  const v27 = await pnF(fg);
  const [r27, p27] = recPrev(v27.rsub);
  const mes27 = await fg.$$eval('.t-mx th.mx-mes:not(.mx-q)', l => l.length);
  conf(perto(v27.usd, T.ano['2027']) && v27.ops === '11', '2027: ' + usd(T.ano['2027']) + ' em 11 operações', v27);
  conf(perto(v.usd + v27.usd, PL.rec, 0.05) && perto(v.cogs + v27.cogs, PL.cogs, 0.05), '2026 + 2027 = Σ RECEITA FINAL (' + usd(PL.rec) + ') e Σ COGS FINAL (' + usd(PL.cogs) + ') da planilha', {rec: v.usd + v27.usd, cogs: v.cogs + v27.cogs});
  conf(perto(r26 + r27, T.recR) && perto(p26 + p27, T.recP), 'realizado ' + usd(T.recR) + ' e previsto ' + usd(T.recP) + ' (somando os dois anos)', [r26 + r27, p26 + p27]);
  conf(mes26 + mes27 === 9, 'matriz: ago/2026 a mai/2027 (9 meses com operação)', [mes26, mes27]);
  await fg.selectOption('[data-f="ano"]', '2026');
  await fg.click('.qc[data-q="4"]');
  const q4e = pl.filter(o => o.data >= '2026-10' && o.data < '2027-01');
  conf(perto(valor(await fg.textContent('.k-rec-usd b')), soma(q4e, 'receitaFinal')), 'card Q4/2026: ' + usd(soma(q4e, 'receitaFinal')), await fg.textContent('.k-rec-usd b'));
  await fg.click('.qc[data-q="3"]', {modifiers: ['Shift']});
  conf(perto(valor(await fg.textContent('.k-rec-usd b')), T.ano['2026']) && /Q3 – Q4/.test(await fg.textContent('.q-box')), 'Shift+clique no Q3: Q3–Q4 = 2026 inteiro (as operações começam em agosto)', await fg.textContent('.q-box'));
  conf(await fg.locator('.qc').count() === 4 && !(await fg.locator('.qc-ano').count()), 'seção na Engenharia: só os 4 cartões dos quartos (sem o "Total do ano")');
  await fg.click('.q-box'); await fg.click('[data-a="qTodos"]');

  console.log('Contrato BP: lista, consumo e receita');
  await p.click('.eng2-card:has-text("BP — Macaé")');
  await p.click('.db-tab:has-text("Consumo e receita")');
  await p.waitForSelector('.ec-kpi-usd');
  await foto(p, 'bp3_receita_contrato');
  conf(perto(valor(await txt(p, '.ec-kpi-usd b')), T.recR), 'aba Consumo e receita do BP: ' + usd(T.recR) + ' realizados', await txt(p, '.ec-kpi-usd b'));
  const nOps = await p.locator('.ec-ops tbody tr').count();
  const tags = await p.locator('.ec-ops .ec-tag-risco').allInnerTexts();
  conf(nOps === 9 && tags.length === 1 && /risco 100%/.test(tags[0]), 'receita por operação: as 9 realizadas, a “DISPUTA SPACER” marcada com risco 100%', [nOps, tags]);
  conf(/sem consumo lançado \(1\)/.test(await txt(p, '.ec-pend summary')), 'a LCP (contingência, risco 100%, sem consumo) aparece em “até hoje sem consumo lançado”', await txt(p, '.ec-pend summary'));
  await p.locator('.ec-ops tbody tr', {hasText: '28/10/2026'}).filter({hasNotText: 'risco'}).locator('button:has-text("Σ Consumo")').click();
  await p.waitForSelector('.ec-cons-modal');
  const s9 = pl.find(o => o.desc === '13 5/8" Intermed' && o.risco === 0);
  conf(perto(valor((await txt(p, '.ec-res-rec')).split('·')[0]), s9.receita) && perto(valor(await txt(p, '.ec-res-cogs')), s9.cogs), 'consumo da 13 5/8" Intermed: ' + usd(s9.receita) + ' de receita e ' + usd(s9.cogs) + ' de COGS', [await txt(p, '.ec-res-rec'), await txt(p, '.ec-res-cogs')]);
  await foto(p, 'bp5_consumo');
  await p.click('.ec-cons-modal .modal-close');
  conf(E.errs.length === 0, 'engenharia: nenhum erro', E.errs.slice(0, 5));

  console.log('Alteração salva');
  await p.click('.eng-quimicos');
  await p.waitForSelector('.ec-quim-tab');
  await p.locator('.ec-quim-tab tbody tr[data-sap="100003837"] input.ec-q-usd').fill('12');
  await p.click('.ec-quim-salvar');
  await p.waitForTimeout(300);
  await p.click('.ec-quim-modal .modal-close');
  await p.reload();
  await p.waitForSelector('.eng-tools');
  const per = await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('hal_cmt_db_v1')); return {q: d.quimicos.find(x => x.sap === '100003837').usd, ops: d.plannedJobs.filter(j => j.contratoId === 'ct_bp').length, marca: d.testeBP === window.EARL_BP_ID}; });
  conf(per.q === 12 && per.ops === 27 && per.marca, 'alteração salva continua depois de reabrir', per);
  console.log('Reiniciar');
  await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('hal_cmt_db_v1')); d.plannedJobs = d.plannedJobs.filter(j => j.id !== 'bp_op_01'); localStorage.setItem('hal_cmt_db_v1', JSON.stringify(d)); });
  p.once('dialog', d => d.accept());
  await Promise.all([p.waitForEvent('load'), p.click('.earl-bp-tag button')]);
  await p.waitForSelector('.eng-tools');
  const n2 = await p.evaluate(() => JSON.parse(localStorage.getItem('hal_cmt_db_v1')).plannedJobs.filter(j => j.contratoId === 'ct_bp').length);
  conf(n2 === 27, '“Reiniciar” volta aos dados da planilha', n2);
  const outro = await p.evaluate(() => Object.keys(Storage.prototype).length >= 0 && [...Array(localStorage.length).keys()].map(i => localStorage.key(i)).every(k => k.startsWith('earlengbp:')));
  conf(outro, 'armazenamento separado (prefixo earlengbp:), não mistura com o EARL_Engenharia.html normal');
  await E.browser.close();

  console.log('Navegador sem espaço, dados antigos e armazenamento bloqueado');
  const {chromium} = require('playwright');
  const BRANCO = path.join(SAIDA, '_branco.html');
  fs.writeFileSync(BRANCO, '<!doctype html><title>outro arquivo do disco</title>');
  const cenario = async (preparar, init) => {
    const b = await chromium.launch();
    const ctx = await b.newContext({viewport: {width: 1440, height: 900}});
    await ctx.route(/^https?:\/\//, r => r.abort());
    if (init) await ctx.addInitScript(init);
    const pg = await ctx.newPage();
    await pg.clock.setFixedTime(new Date('2026-11-02T12:00:00'));
    const er = [];
    pg.on('pageerror', e => er.push(String(e)));
    if (preparar) { await pg.goto('file://' + BRANCO); await pg.evaluate(preparar); }
    await pg.goto('file://' + path.resolve(BP));
    await pg.waitForSelector('.eng-tools', {timeout: 60000});
    const fq = await gerF(pg);
    const r = {ops: (await fq.textContent('.k-ops b')).trim(), usd: valor(await fq.textContent('.k-rec-usd b')), tag: await txt(pg, '.earl-bp-tag'), aviso: await pg.locator('.ec-esp-aviso').count() ? await txt(pg, '.ec-esp-aviso') : '', cts: await pg.locator('.eng2-card').count(), er};
    return {b, pg, r};
  };
  // 1) espaço do file:// cheio (EARL completo e simulações abertos do disco): o caso relatado
  let c1 = await cenario(() => { localStorage.setItem('earlsim113:hal_cmt_db_v1', 'x'.repeat(2600000)); localStorage.setItem('earlsim115:hal_cmt_db_v1', 'x'.repeat(2630000)); }); // e13: os dados do BP gravam comprimidos (~60 mil caracteres): sobra menos que isso
  await foto(c1.pg, 'bp8_sem_espaco');
  conf(c1.r.ops === '16' && perto(c1.r.usd, T.ano['2026']) && /não está salvando/.test(c1.r.tag) && /espaço do navegador/.test(c1.r.aviso) && !c1.r.er.length, 'sem espaço no navegador: abre com os dados da planilha (2026: 16 operações e a receita), e avisa que não salva', c1.r);
  await c1.b.close();
  // 2) dados guardados de uma versão anterior do teste (ou do EARL vazio): usa os da planilha
  c1 = await cenario(() => { localStorage.setItem('earlengbp:hal_cmt_db_v1', JSON.stringify({people: [{id: 'p1', name: 'X'}], rigs: [], contratos: [], plannedJobs: []})); });
  const marca = await c1.pg.evaluate(() => JSON.parse(localStorage.getItem('hal_cmt_db_v1')).testeBP === window.EARL_BP_ID);
  conf(c1.r.ops === '16' && marca && /dados da planilha/.test(c1.r.tag) && !c1.r.aviso && !c1.r.er.length, 'dados de uma versão anterior no navegador: troca pelos da planilha', c1.r);
  await c1.b.close();
  // 3) armazenamento bloqueado (arquivo aberto numa pré-visualização)
  c1 = await cenario(null, () => { Object.defineProperty(window, 'localStorage', {configurable: true, get() { throw new DOMException('The document is sandboxed and lacks the allow-same-origin flag.', 'SecurityError'); }}); });
  conf(c1.r.ops === '16' && /não consegue guardar dados/.test(c1.r.aviso) && /não está salvando/.test(c1.r.tag) && !c1.r.er.length, 'armazenamento bloqueado: abre com os dados e avisa', c1.r);
  await c1.b.close();
  fs.unlinkSync(BRANCO);

  console.log('Gerencial (carregando o arquivo do BP)');
  const G = await abrir(GER, {h: 1000, hoje: '2026-11-02'});
  p = G.page;
  await p.waitForSelector('#drop');
  await p.setInputFiles('#inArq', [arqGer]);
  await p.waitForSelector('.kpi.k-rec-usd');
  const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const doAno = a => pl.filter(o => o.data.startsWith(a));
  const kpis = async () => ({usd: valor(await txt(p, '.k-rec-usd b')), cogs: valor(await txt(p, '.k-cogs b')), mg: valor(await txt(p, '.k-margem b')), ops: await txt(p, '.k-ops b'), sub: await txt(p, '.k-ops em'), sr: await txt(p, '.k-rec-usd em')});
  // um ano por vez (como o Excel do usuário): abre no ano de hoje (2026); 2026 + 2027 = planilha
  const anosG = await p.$$eval('[data-f="ano"] option', l => l.map(o => o.value));
  conf(anosG.join() === '2026,2027' && await p.inputValue('[data-f="ano"]') === '2026', 'gerencial: um ano por vez (2026 e 2027), abre em 2026', anosG);
  const porAno = {};
  for (const a of ['2027', '2026']) {
    await p.selectOption('[data-f="ano"]', a);
    const k = await kpis(), l = doAno(a), rec = soma(l, 'receitaFinal'), cogs = soma(l, 'cogsFinal');
    porAno[a] = k;
    conf(perto(k.usd, rec, 0.05) && perto(k.cogs, cogs, 0.05) && perto(k.mg, rec - cogs, 0.1) && k.ops === String(l.length), 'gerencial ' + a + ': receita ' + usd(rec) + ', COGS ' + usd(cogs) + ' e ' + l.length + ' operações (= planilha)', k);
    const qc = await p.$$eval('.qc', l => l.map(b => [b.dataset.q, b.querySelector('b').textContent]));
    const difQ = [1, 2, 3, 4].map(q => { const lq = l.filter(o => Math.ceil(Number(o.data.slice(5, 7)) / 3) === q), c = qc.find(x => x[0] === String(q)); return c && perto(valor(c[1]), soma(lq, 'receitaFinal'), 0.05) ? null : {q, c}; }).filter(Boolean);
    conf(qc.length === 5 && !difQ.length && perto(valor(qc[4][1]), rec, 0.05), 'gerencial ' + a + ': cards Q1–Q4 e total do ano = planilha', qc);
  }
  const nOpsG = s => (s.match(/(\d+) realizada\(s\) · (\d+) prevista\(s\)(?: · (\d+) fora)?/) || []).slice(1).map(x => Number(x) || 0);
  const s26 = nOpsG(porAno["2026"].sub), s27 = nOpsG(porAno["2027"].sub);
  conf(perto(porAno['2026'].usd + porAno['2027'].usd, PL.rec, 0.05) && perto(porAno['2026'].cogs + porAno['2027'].cogs, PL.cogs, 0.05), 'gerencial: 2026 + 2027 = total da planilha (receita ' + usd(PL.rec) + ', COGS ' + usd(PL.cogs) + ')');
  conf(s26[0] + s27[0] === 9 && s26[1] + s27[1] === 18 && s26[2] + s27[2] === 2, 'gerencial: 9 realizadas, 18 previstas e 2 fora (somando os dois anos)', [porAno['2026'].sub, porAno['2027'].sub]);
  const rp = k => k.sr.split('·').map(valor);
  conf(perto(rp(porAno['2026'])[0] + rp(porAno['2027'])[0], T.recR) && perto(rp(porAno['2026'])[1] + rp(porAno['2027'])[1], T.recP), 'gerencial: realizado ' + usd(T.recR) + ' · previsto ' + usd(T.recP) + ' (somando os dois anos)', [porAno['2026'].sr, porAno['2027'].sr]);
  await foto(p, 'bp6_gerencial');
  // matriz de 2026: cada coluna de mês (linha do total) = soma da planilha (RECEITA FINAL e COGS FINAL pela data da operação)
  const porMesPl = {};
  pl.forEach(o => { const m = o.data.slice(0, 7); const x = porMesPl[m] || (porMesPl[m] = {n: 0, rec: 0, cogs: 0}); x.n++; x.rec += o.receitaFinal; x.cogs += o.cogsFinal; });
  const mesesPl = Object.keys(porMesPl).filter(m => m.startsWith('2026')).sort();
  const totMes = await p.evaluate(() => { const r = {}; document.querySelectorAll('.t-mx tfoot td[data-mes]').forEach(td => (r[td.dataset.mes] = r[td.dataset.mes] || []).push(td.textContent.trim())); return r; });
  const difMes = mesesPl.filter(m => !(totMes[m] && perto(valor(totMes[m][0]), porMesPl[m].rec) && perto(valor(totMes[m][1]), porMesPl[m].cogs)));
  const quartosMx = await p.$$eval('.t-mx thead th.mx-tri', l => l.map(t => t.textContent.trim()));
  conf(Object.keys(totMes).sort().join() === mesesPl.join() && !difMes.length && quartosMx.join() === 'Q3/2026,Q4/2026,Total', 'matriz 2026: Q3 e Q4; os ' + mesesPl.length + ' meses batem com a planilha (receita final e COGS final)', difMes.length ? difMes : quartosMx);
  // período out/2026 › BP › NS-39: as 4 operações
  await p.click('.mes-box');
  await p.click('[data-mesb="10"]');
  await p.click('[data-mesb="10"]');
  await p.click('[data-mxmostrar="4"]');
  const opsOut = await p.$$eval('.t-mx tbody tr', l => { let sonda = ''; const r = []; l.forEach(tr => { const c = tr.cells[0].cloneNode(true); c.querySelectorAll('.sub2,.dd-tw').forEach(e => e.remove()); const t = c.textContent.trim(); if (tr.classList.contains('mx-n2')) sonda = t; if (tr.classList.contains('mx-op') && sonda === 'NS-39') r.push(t.slice(0, 10) + (tr.classList.contains('fora') ? ' fora' : '')); }); return r; });
  conf(opsOut.slice().sort().join() === '01/10/2026,15/10/2026 fora,28/10/2026,28/10/2026 fora', 'out/2026 › BP › NS-39: as 4 operações, com a LCP e a DISPUTA SPACER marcadas “fora”', opsOut);
  const sIt = pl.find(o => o.desc === '13 5/8" Intermed' && o.risco === 0), sFora = pl.find(o => o.desc === '13 5/8" Intermed' && o.risco >= 1);
  const itensDe = async sel => { await p.click(sel); return p.$$eval('.t-mx tbody tr', l => { const r = []; let dentro = false; l.forEach(x => { if (x.classList.contains('mx-op')) dentro = x.classList.contains('on'); else if (x.classList.contains('mx-it')) { if (dentro) r.push([x.cells[0].innerText.replace(/\s+/g, ' ').trim(), [...x.cells].slice(1).map(c => c.textContent.trim()).filter(Boolean)[0] || '']); } else dentro = false; }); return r; }); };
  const it9 = await itensDe('.t-mx tr.mx-op:not(.fora):has-text("28/10/2026")');
  conf(it9.length === 18 && perto(it9.reduce((a, x) => a + valor(x[1]), 0), sIt.receita, 0.05) && it9.some(x => /^2\.1 · Tuned Defense Spacer 11\.970 lbr × US\$ 34,91$/.test(x[0])), 'item PPU: a 13 5/8" Intermed abre nos 18 itens, que somam ' + usd(sIt.receita) + ' (= planilha)', [it9.length, it9.slice(0, 2)]);
  await p.click('.t-mx tr.mx-op.on');
  const itF = await itensDe('.t-mx tr.mx-op.fora:has-text("28/10/2026")');
  conf(itF.length === 7 && itF.every(x => x[1] === '0,00' && /bruto US\$/.test(x[0])) && perto(itF.reduce((a, x) => a + valor(x[0].split('bruto')[1]), 0), sFora.receita, 0.05), 'item PPU da DISPUTA SPACER (risco 100%): 7 itens com 0,00 e o valor bruto (= planilha ' + usd(sFora.receita) + ')', itF.slice(0, 2));
  await p.click('.t-mx tr.mx-op.on');
  await foto(p, 'bp6b_matriz');
  // período set–out/2026 numa caixa só; depois o quarto Q4 vale no lugar dos meses
  await p.click('.mes-box');
  await p.click('[data-mesb="9"]');
  await p.click('[data-mesb="10"]');
  const sel = pl.filter(o => o.data >= '2026-09' && o.data < '2026-11');
  conf(perto(valor(await txt(p, '.k-rec-usd b')), soma(sel, 'receitaFinal')) && await txt(p, '.k-ops b') === String(sel.length) && /set – out\/2026/.test(await txt(p, '.mes-box')), 'período set–out/2026: ' + usd(soma(sel, 'receitaFinal')) + ' em ' + sel.length + ' operações', await txt(p, '.k-rec-usd b'));
  await p.click('.q-box'); await p.click('[data-qb="4"]'); await p.click('[data-qb="4"]');
  const q4 = pl.filter(o => o.data >= '2026-10' && o.data < '2027-01');
  conf(perto(valor(await txt(p, '.k-rec-usd b')), soma(q4, 'receitaFinal')) && await txt(p, '.k-ops b') === String(q4.length), 'Q4/2026 vale no lugar dos meses: ' + usd(soma(q4, 'receitaFinal')) + ' em ' + q4.length + ' operações', await txt(p, '.k-rec-usd b'));
  await p.click('[data-a="limparf"]');
  // gráfico por mês de 2026: ago a dez, receita e COGS = planilha
  const pl26 = doAno('2026'), rec26 = soma(pl26, 'receitaFinal');
  conf(!(await p.locator('.k-rec-brl').count()) && perto(valor(await txt(p, '.k-rec-op b')), rec26 / pl26.filter(o => o.risco < 1).length), 'gerencial: sem cartão em R$; receita por operação de 2026 = planilha', await txt(p, '.k-rec-op b'));
  await p.waitForSelector('.g-svg');
  const grupos = await p.$$eval('.g-mes', l => l.map(g => g.getAttribute('aria-label')));
  const esperado = ['2026-08', '2026-09', '2026-10', '2026-11', '2026-12'];
  const difG = esperado.map((m, i) => { const e = porMesPl[m] || {rec: 0, cogs: 0}; const lb = grupos[i] || ''; const mm = /^(\w+\/\d{4}): receita (US\$ [\d.,]+), COGS (US\$ [\d.,]+)$/.exec(lb); const rot = MES[Number(m.slice(5)) - 1] + '/' + m.slice(0, 4); return mm && mm[1] === rot && perto(valor(mm[2]), e.rec) && perto(valor(mm[3]), e.cogs) ? null : {m, e, lb}; }).filter(Boolean);
  conf(grupos.length === 5 && !difG.length, 'gráfico por mês de 2026: ago a dez, receita e COGS de cada mês = planilha', difG.length ? difG : grupos.length);
  const yMes = esperado.map(m => (porMesPl[m] || {rec: 0}).rec);
  const nM = yMes.length, xm = (nM - 1) / 2, ym = yMes.reduce((a, v) => a + v, 0) / nM;
  const bM = yMes.reduce((a, v, i) => a + (i - xm) * (v - ym), 0) / yMes.reduce((a, v, i) => a + (i - xm) * (i - xm), 0);
  const tLin = (await p.getAttribute('.g-tend', 'data-v')).split(';').map(Number);
  conf(tLin.length === 5 && tLin.every((v, i) => perto(v, ym + bM * (i - xm), 0.01)) && /Tendência linear da receita/.test(await txt(p, '.g-leg')), 'tendência linear: reta dos mínimos quadrados da receita mensal de 2026 da planilha (de ' + usd(tLin[0]) + ' a ' + usd(tLin[4]) + ')', tLin);
  await p.locator('.g-mes').nth(3).hover();
  conf(/US\$ [\d.,]+ tendência linear/.test(await txt(p, '.g-tip')), 'o tooltip mostra o valor da tendência no mês', await txt(p, '.g-tip'));
  await foto(p, 'bp6c_grafico');
  await p.selectOption('[data-tend]', 'mm3');
  await p.waitForSelector('.g-tdot');
  const tMm = (await p.getAttribute('.g-tend', 'data-v')).split(';');
  conf(tMm[0] === '' && tMm[1] === '' && tMm.slice(2).every((v, i) => perto(Number(v), (yMes[i] + yMes[i + 1] + yMes[i + 2]) / 3, 0.01)) && await p.locator('.g-tdot').count() === 3, 'média móvel de 3 meses: 3 pontos (do 3º mês em diante) = média da planilha', tMm);
  await p.selectOption('[data-tend]', 'linear');
  await p.click('[data-gmodo="mescli"]');
  await p.waitForSelector('.g-svg');
  const segBP = await p.$$eval('path[data-c]', l => l.map(x => [x.dataset.c, Number(x.dataset.v)]));
  const mesesRec = esperado.filter(m => (porMesPl[m] || {rec: 0}).rec > 0).length;
  conf(segBP.length === mesesRec && segBP.every(x => x[0] === 'BP') && perto(segBP.reduce((a, x) => a + x[1], 0), rec26, 0.05), 'por mês e cliente: ' + mesesRec + ' meses com receita em 2026, tudo BP, somando ' + usd(rec26), segBP.length);
  await p.click('[data-gmodo="cli"]');
  await p.waitForSelector('.g-cli');
  const miTxt = 'US$ ' + (rec26 / 1e6).toLocaleString('pt-BR', {minimumFractionDigits: 0, maximumFractionDigits: 1}) + ' mi';
  conf((await p.$$eval('.g-cli', l => l.map(g => g.dataset.cli + ' ' + g.querySelector('.g-vl').textContent))).join() === 'BP ' + miTxt, 'por cliente: uma barra, BP, ' + miTxt);
  await foto(p, 'bp6d_por_cliente');
  await p.click('[data-gmodo="mes"]');
  await p.click('.tab[data-tab="ops"]');
  const linhas = await p.locator('.t-ops tbody tr').count();
  const foraG = await p.locator('.t-ops tbody tr:has-text("fora (risco 100%)")').count();
  conf(linhas === pl26.length && foraG === pl26.filter(o => o.risco >= 1).length, 'gerencial: aba Operações com as ' + pl26.length + ' de 2026 (' + foraG + ' marcadas “fora”)', [linhas, foraG]);
  await foto(p, 'bp7_gerencial_ops');
  const [xl] = await Promise.all([p.waitForEvent('download'), p.click('[data-a="excel"]')]);
  const wb = await p.evaluate(b => {
    const w = XLSX.read(b, {type: 'base64'});
    const o = XLSX.utils.sheet_to_json(w.Sheets['Operações'], {header: 1});
    const i = o[0].indexOf('Receita US$'), c = o[0].indexOf('COGS US$');
    return {abas: w.SheetNames, n: o.length - 1, rec: o.slice(1).reduce((a, r) => a + (Number(r[i]) || 0), 0), cogs: o.slice(1).reduce((a, r) => a + (Number(r[c]) || 0), 0)};
  }, fs.readFileSync(await xl.path()).toString('base64'));
  conf(wb.abas[1] === 'Receita 2026' && wb.n === pl26.length && perto(wb.rec, rec26, 0.05) && perto(wb.cogs, soma(pl26, 'cogsFinal'), 0.05), 'Excel do gerencial (2026): aba Operações soma a mesma receita e o mesmo COGS da planilha', wb);
  conf(G.errs.length === 0, 'gerencial: nenhum erro', G.errs.slice(0, 5));
  await G.browser.close();

  console.log(`\n${ok} ok, ${falhas} falha(s)`);
  console.log('arquivo do gerencial: ' + arqGer);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
