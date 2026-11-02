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
  conf(db.rigs.some(r => r.nomePetrobras === 'NS-39' && r.base === 'Macaé') && ops.every(j => j.rigId === 'rig_bp_ns39'), 'sonda NS-39 cadastrada (base Macaé) e usada nas operações');
  conf((db.cogsItens || []).length === 162, 'tabela de COGS: 60 químicos + 102 casing', (db.cogsItens || []).length);
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

  console.log('Página inicial: painel Receita e COGS');
  await p.selectOption('.ec-pn-ano', '');
  const pn = async () => ({usd: valor(await txt(p, '.ec-pn-rec-usd b')), cogs: valor(await txt(p, '.ec-pn-cogs b')), ops: await txt(p, '.ec-pn-ops b'), sub: await txt(p, '.ec-pn-ops em')});
  let v = await pn();
  conf(perto(v.usd, T.rec) && perto(v.usd, PL.rec, 0.05) && perto(v.cogs, T.cogs) && v.ops === '27' && v.sub === '9 realizada(s) · 18 prevista(s) · 2 fora (risco 100%)', 'todos os anos: ' + usd(PL.rec) + ' de receita, COGS ' + usd(PL.cogs) + ', 27 operações (2 fora)', v);
  await foto(p, 'bp2_painel');
  await p.selectOption('.ec-pn-ano', '2026');
  v = await pn();
  conf(perto(v.usd, T.ano['2026']), 'filtro 2026: ' + usd(T.ano['2026']), v.usd);
  await p.selectOption('.ec-pn-ano', '2027');
  v = await pn();
  conf(perto(v.usd, T.ano['2027']), 'filtro 2027: ' + usd(T.ano['2027']), v.usd);
  await p.selectOption('.ec-pn-ano', '');
  await p.selectOption('.ec-pn-sit', 'real');
  v = await pn();
  conf(perto(v.usd, T.recR) && v.ops === '9', 'só realizado: ' + usd(T.recR) + ' em 9 operações', v);
  await p.selectOption('.ec-pn-sit', 'prev');
  v = await pn();
  conf(perto(v.usd, T.recP) && v.ops === '18', 'só previsto: ' + usd(T.recP) + ' em 18 operações', v);
  await p.selectOption('.ec-pn-sit', 'todos');
  const meses = await p.locator('.ec-pn-mes-tab tbody tr').count();
  conf(meses === 9, 'por mês: ago/2026 a mai/2027 (9 meses com operação)', meses);

  console.log('Contrato BP: lista, consumo e receita');
  await p.click('.ec-pn-ct-tab tbody tr:has-text("BP")');
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

  console.log('Gerencial (carregando o arquivo do BP)');
  const G = await abrir(GER, {h: 1000, hoje: '2026-11-02'});
  p = G.page;
  await p.waitForSelector('#drop');
  await p.setInputFiles('#inArq', [arqGer]);
  await p.waitForSelector('.kpi.k-rec-usd');
  const k = {usd: valor(await txt(p, '.k-rec-usd b')), cogs: valor(await txt(p, '.k-cogs b')), mg: valor(await txt(p, '.k-margem b')), ops: await txt(p, '.k-ops b'), sub: await txt(p, '.k-ops em'), sr: await txt(p, '.k-rec-usd em')};
  conf(perto(k.usd, PL.rec, 0.05) && perto(k.cogs, PL.cogs, 0.05) && perto(k.mg, PL.rec - PL.cogs, 0.1), 'gerencial: receita ' + usd(PL.rec) + ', COGS ' + usd(PL.cogs) + ', margem ' + usd(PL.rec - PL.cogs) + ' (= planilha)', k);
  conf(k.ops === '27' && k.sub === '9 realizada(s) · 18 prevista(s) · 2 fora (risco 100%)', 'gerencial: 27 operações, 9 realizadas, 18 previstas, 2 fora', k.sub);
  conf(perto(valor(k.sr.split('·')[0]), T.recR) && perto(valor(k.sr.split('·')[1]), T.recP), 'gerencial: realizado ' + usd(T.recR) + ' · previsto ' + usd(T.recP), k.sr);
  await foto(p, 'bp6_gerencial');
  await p.click('.tab[data-tab="ops"]');
  const linhas = await p.locator('.t-ops tbody tr').count();
  const foraG = await p.locator('.t-ops tbody tr:has-text("fora (risco 100%)")').count();
  conf(linhas === 27 && foraG === 2, 'gerencial: aba Operações com as 27 (2 marcadas “fora”)', [linhas, foraG]);
  await foto(p, 'bp7_gerencial_ops');
  const [xl] = await Promise.all([p.waitForEvent('download'), p.click('[data-a="excel"]')]);
  const wb = await p.evaluate(b => {
    const w = XLSX.read(b, {type: 'base64'});
    const o = XLSX.utils.sheet_to_json(w.Sheets['Operações'], {header: 1});
    const i = o[0].indexOf('Receita US$'), c = o[0].indexOf('COGS US$');
    return {n: o.length - 1, rec: o.slice(1).reduce((a, r) => a + (Number(r[i]) || 0), 0), cogs: o.slice(1).reduce((a, r) => a + (Number(r[c]) || 0), 0)};
  }, fs.readFileSync(await xl.path()).toString('base64'));
  conf(wb.n === 27 && perto(wb.rec, PL.rec, 0.05) && perto(wb.cogs, PL.cogs, 0.05), 'Excel do gerencial: aba Operações soma a mesma receita e o mesmo COGS', wb);
  conf(G.errs.length === 0, 'gerencial: nenhum erro', G.errs.slice(0, 5));
  await G.browser.close();

  console.log(`\n${ok} ok, ${falhas} falha(s)`);
  console.log('arquivo do gerencial: ' + arqGer);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
