// e16 (pedido do Hugo, 25/11/2026): o EARL Engenharia passa a se chamar "Forecast". A página inicial tem
// duas abas: 📊 Indicadores (o Gerencial embutido, com todos os contratos do arquivo) e 📁 Contratos (onde se alteram
// as operações). Sai o botão "Arquivo do gerencial": cada pessoa usa "⬇ Exportar dados" e o Hugo importa todos os
// contratos no arquivo dele ("⬆ Importar dados") e vê os indicadores de todos de uma vez.
// Uso: node tests/e2e_e16.js [EARL_Engenharia.html]
const {abrir, exportarDados} = require('./harness');
const {montar} = require('../walkthrough/demo');
const {chromium} = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ARQ = path.resolve(process.argv[2] || path.join(__dirname, '..', 'EARL_Engenharia.html'));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'earl-e16-'));
const HOJE = '2026-11-25';
let ok = 0, falhas = 0;
const conf = (c, msg, extra) => { if (c) { ok++; console.log('  ✓ ' + msg); } else { falhas++; console.log('  ✗ ' + msg + (extra !== undefined ? ' → ' + JSON.stringify(extra).slice(0, 600) : '')); } };
const perto = (a, b, t = 0.05) => Math.abs(a - b) <= t;
const valor = t => Number(String(t).replace(/[^\d,-]/g, '').replace(',', '.'));
const baixar = async (p, acao) => { const d = p.waitForEvent('download', {timeout: 30000}); await acao(); const x = await d; const f = path.join(TMP, x.suggestedFilename()); await x.saveAs(f); return f; };
const fechar = async p => { for (let i = 0; i < 4; i++) { const x = p.locator('.modal-close:visible'); if (!(await x.count())) break; await x.last().click(); await p.waitForTimeout(250); } };
const pronto = async p => { await p.waitForSelector('.eng-tools', {timeout: 90000}); await p.waitForFunction(() => typeof window.engGerDados === 'function', null, {timeout: 30000}); await p.waitForTimeout(600); };
// receita (US$, com o risco) por ano e por contrato, direto do pacote que alimenta a aba Indicadores
const pacote = p => p.evaluate(() => {
  const pac = window.engGerDados().pacote;
  const f = o => o.risco >= 100 ? 0 : 1 - (o.risco || 0) / 100;
  const ano = {}, ct = {};
  pac.operacoes.forEach(o => {
    const v = (o.realizado ? o.receita.usd : o.previsto.receita.usd) * f(o);
    const a = String(o.data).slice(0, 4);
    ano[a] = (ano[a] || 0) + v;
    const c = pac.contratos.find(x => x.id === o.contratoId) || {};
    ct[c.nome] = (ct[c.nome] || 0) + v;
  });
  return {ano, ct, nOps: pac.operacoes.length, nomes: pac.contratos.map(c => c.nome).sort()};
});
const frame = async p => {
  if (await p.locator('.fr-tab-ind:not(.on)').count()) await p.click('.fr-tab-ind');
  const h = await p.waitForSelector('.ec-ger-frame', {timeout: 60000});
  const f = await h.contentFrame();
  await f.waitForSelector('.kpis', {timeout: 30000});
  return f;
};
// a receita de cada ano no quadro = a do pacote
const anosIguais = async (f, P) => {
  const anos = await f.$$eval('[data-f="ano"] option', l => l.map(o => o.value).filter(Boolean));
  const dif = [];
  for (const a of anos) {
    await f.selectOption('[data-f="ano"]', a);
    const r = valor(await f.textContent('.k-rec-usd b'));
    if (!perto(r, P.ano[a] || 0)) dif.push({a, quadro: r, pacote: P.ano[a] || 0});
  }
  return {anos, dif};
};
const importar = async (p, arq) => {
  await p.setInputFiles('.eng-tools input[type=file]', arq);
  await p.waitForSelector('.ec-imp-dados');
  const tela = await p.locator('.ec-imp-cts').innerText();
  const carregou = p.waitForEvent('load', {timeout: 60000});
  await p.click('.ec-importar');
  await p.waitForTimeout(400);
  const c = p.locator('.modal button', {hasText: 'Substituir e importar'});
  if (await c.count()) await c.click();
  await carregou;
  await pronto(p);
  return tela;
};

(async () => {
  /* ---------------------------------------------------------------- 1. duas pessoas exportam os dados */
  console.log('1. Duas pessoas, cada uma no seu arquivo (no navegador dela), exportam os dados');
  // cada pessoa cria o contrato dela (cópia de um da demonstração, com operações) e usa “⬇ Exportar dados”
  const pessoa = async (nome, base, ctId, nomeCt) => {
    const X = await abrir(ARQ, {hoje: HOJE});
    const p = X.page;
    await p.waitForSelector('.eng2-card', {timeout: 90000});
    await montar(p);
    if (nome === 'Ana') conf(!(await p.locator('.eng-tools .eng-gerencial').count()) && !/Arquivo do gerencial/.test(await p.innerText('.eng-tools')), 'sem o botão “Arquivo do gerencial” na barra');
    await p.evaluate(({nome, base, ctId, nomeCt}) => {
      const d = loadDB();
      const b = d.contratos.find(x => x.id === base);
      d.contratos.push({...JSON.parse(JSON.stringify(b)), id: ctId, name: nomeCt, numero: ctId.toUpperCase()});
      d.plannedJobs.push(...d.plannedJobs.filter(j => j.contratoId === base).map((j, i) => ({...JSON.parse(JSON.stringify(j)), id: ctId + '_op' + i, contratoId: ctId, handoverId: null, notes: 'lançado por ' + nome})));
      saveDB(d);
    }, {nome, base, ctId, nomeCt});
    await p.reload(); await p.waitForSelector('.eng2-card', {timeout: 90000});
    const sug = await baixar(p, () => exportarDados(p, undefined, [nomeCt])); // e20: um .json por contrato; só o dela
    const arq = path.join(TMP, nome + '_' + path.basename(sug)); // as duas pessoas exportam no mesmo minuto (mesmo nome)
    fs.renameSync(sug, arq);
    await fechar(p);
    conf(!X.errs.length, 'arquivo de ' + nome + ': nenhum erro de JavaScript', X.errs.slice(0, 3));
    await X.browser.close();
    return arq;
  };
  const arqAna = await pessoa('Ana', 'ct_demo_tk', 'ct_ana', 'Contrato da Ana');
  const jAna = JSON.parse(fs.readFileSync(arqAna, 'utf8'));
  conf(/^Ana_EARL_FORECAST_ETESCO_CONTRATO-DA-ANA_\d{4}\.\d{2}\.\d{2}_\d{2}h\d{2}\.json$/.test(path.basename(arqAna)) && jAna.app === 'EARL Forecast' && jAna.db.contratos.length === 1, 'exportação com o nome novo (EARL_FORECAST_<cliente>_<contrato>_AAAA.MM.DD_HHhMM.json, só o contrato dela, app “EARL Forecast”)', {nome: path.basename(arqAna), app: jAna.app});
  const arqBruno = await pessoa('Bruno', 'ct_demo_bp', 'ct_bruno', 'Contrato do Bruno');

  /* ---------------------------------------------------------------- 2. o arquivo do Hugo */
  console.log('\n2. O arquivo do Hugo: abre no Forecast, aba Indicadores');
  const H = await abrir(ARQ, {hoje: HOJE, aba: ''});
  const ph = H.page;
  await pronto(ph);
  conf(await ph.title() === 'EARL — Forecast', 'título “EARL — Forecast”', await ph.title());
  const topo = await ph.evaluate(() => ({h1: (document.querySelector('h1') || {}).textContent, versao: window.EARL_VERSION, corpo: document.body.innerText.slice(0, 600)}));
  conf(/Forecast/.test(topo.h1 || '') && !/Receita/.test(topo.h1 || '') && /Forecast e(1[6-9]|[2-9][0-9])/.test(topo.versao) && !/Engenharia/.test(topo.corpo), 'nome novo no cabeçalho, no título da página e na versão (sem “Engenharia” na tela)', topo);
  conf(await ph.locator('.fr-tab-ind.on').count() === 1 && await ph.locator('.ec-ger-frame').count() === 1 && !(await ph.locator('.eng2-card').count()), 'abre na aba 📊 Indicadores (sem os cartões dos contratos)');
  await montar(ph);
  await pronto(ph);
  let fg = await frame(ph);
  const abas = await fg.$$eval('.tabs .tab', l => l.map(t => t.textContent));
  conf(abas.join('|') === 'Receita e margem|Comparar registros (0)|Por contrato|Itens PPU|Químicas|Casing equipment|Pessoal|Operações', 'as abas do Gerencial (sem “Arquivos”; “Contratos” vira “Por contrato”)', abas);
  const barra = (await fg.innerText('.emb-bar')).replace(/\s+/g, ' ');
  conf(/Excel consolidado/.test(barra) && /Registrar/.test(barra) && /Compartilhar \(HTML\)/.test(barra) && !/Carregar/.test(barra), 'barra dos indicadores: ⬇ Excel consolidado, 📌 Registrar, 📤 Compartilhar (sem carregar arquivos)', barra);
  let P = await pacote(ph);
  let r = await anosIguais(fg, P);
  conf(P.nomes.length === 3 && !r.dif.length, 'antes de importar: os 3 contratos do Hugo, receita de cada ano (' + r.anos.join(', ') + ') = a dos contratos', {nomes: P.nomes, dif: r.dif});

  console.log('\n3. Importar os dados da Ana e do Bruno');
  const telaAna = await importar(ph, arqAna);
  conf(/Contrato da Ana/.test(telaAna), 'a tela do importar lista o contrato da Ana', telaAna.slice(0, 300));
  await importar(ph, arqBruno);
  P = await pacote(ph);
  const esperados = ['BP — Macaé (offshore)', 'Contrato da Ana', 'Contrato do Bruno', 'P&A — Macaé (offshore)', 'Takatsugu J'];
  conf(JSON.stringify(P.nomes) === JSON.stringify(esperados), 'os indicadores juntam os 5 contratos (os 3 do Hugo + o da Ana + o do Bruno)', P.nomes);
  conf(await ph.locator('.fr-tab-ind.on').count() === 1, 'depois de importar, continua na aba Indicadores');
  fg = await frame(ph);
  r = await anosIguais(fg, P);
  conf(!r.dif.length, 'aba Indicadores: a receita de cada ano soma todos os contratos importados', r.dif);
  const opCt = await fg.$$eval('[data-f="contrato"] option', l => l.map(o => o.textContent).filter(t => !/^Todos/.test(t)).sort());
  conf(esperados.every(n => opCt.some(t => t.indexOf(n) >= 0)), 'filtro Contrato com os 5 contratos', opCt);
  const ana = await fg.locator('[data-f="contrato"] option', {hasText: 'Contrato da Ana'}).getAttribute('value');
  await fg.selectOption('[data-f="contrato"]', ana);
  const anosAna = await fg.$$eval('[data-f="ano"] option', l => l.map(o => o.value).filter(Boolean));
  let sAna = 0;
  for (const a of anosAna) { await fg.selectOption('[data-f="ano"]', a); sAna += valor(await fg.textContent('.k-rec-usd b')); }
  conf(perto(sAna, P.ct['Contrato da Ana'], 0.1), 'filtrando o contrato da Ana: a receita é a do contrato dela (US$ ' + P.ct['Contrato da Ana'].toFixed(2) + ')', sAna);
  await fg.selectOption('[data-f="contrato"]', '');
  await fg.click('.tab[data-tab="contratos"]');
  await ph.waitForTimeout(400);
  const porCt = await fg.innerText('#app');
  conf(esperados.every(n => porCt.indexOf(n) >= 0), 'aba “Por contrato” com os 5 contratos', porCt.slice(0, 400));
  await fg.click('.tab[data-tab="receita"]');
  const tabCts = (await ph.innerText('.fr-tab-cts')).replace(/\s+/g, ' ');
  const nOps = await ph.evaluate(() => loadDB().plannedJobs.filter(j => loadDB().contratos.some(c => c.id === j.contratoId && !c.archived)).length);
  conf(/5 contrato\(s\)/.test(tabCts) && tabCts.indexOf(nOps + ' operação(ões)') >= 0, 'a aba Contratos mostra 5 contrato(s) e ' + nOps + ' operação(ões)', tabCts);

  console.log('\n4. Aba Contratos: alterar operações');
  await ph.click('.fr-tab-cts');
  await ph.waitForSelector('.eng2-card');
  conf(!(await ph.locator('.ec-ger-frame').count()) && await ph.locator('.eng2-card').count() === 6, 'aba Contratos: os 5 contratos + Visão geral, sem os indicadores', await ph.locator('.eng2-card').count());
  const notas = await ph.evaluate(() => { const d = loadDB(); const n = nm => d.plannedJobs.filter(j => j.contratoId === (d.contratos.find(c => c.name === nm && !c.archived) || {}).id).map(j => j.notes); return {ana: n('Contrato da Ana'), bruno: n('Contrato do Bruno')}; });
  conf(notas.ana.length > 0 && notas.ana.every(x => x === 'lançado por Ana') && notas.bruno.length > 0 && notas.bruno.every(x => x === 'lançado por Bruno'), 'as operações vieram com o que cada pessoa lançou', notas);
  // muda o risco de uma operação da Ana: os indicadores mudam
  const antes = P.ct['Contrato da Ana'];
  await ph.evaluate(() => { const d = loadDB(); const c = d.contratos.find(x => x.name === 'Contrato da Ana'); const j = d.plannedJobs.find(x => x.contratoId === c.id && !x.ppuCons); j.riscoRec = 100; saveDB(d); });
  await ph.reload(); await pronto(ph);
  conf(await ph.locator('.fr-tab-cts.on').count() === 1, 'reabrindo, lembra a aba Contratos');
  P = await pacote(ph);
  fg = await frame(ph);
  r = await anosIguais(fg, P);
  conf(P.ct['Contrato da Ana'] < antes - 1 && !r.dif.length, 'operação da Ana com risco 100%: a receita dela cai (US$ ' + antes.toFixed(2) + ' → ' + P.ct['Contrato da Ana'].toFixed(2) + ') e os indicadores acompanham', r.dif);
  await ph.reload(); await pronto(ph);
  conf(await ph.locator('.fr-tab-ind.on').count() === 1, 'reabrindo, lembra a aba Indicadores');

  console.log('\n5. Registrar e compartilhar a partir dos indicadores');
  fg = await frame(ph);
  await fg.click('.b-reg');
  await fg.waitForSelector('#dlg [data-a="regSalvar"]');
  const vis = await ph.evaluate(() => { const f = document.querySelector('.ec-ger-frame'); const d = f.contentDocument.querySelector('#dlg .dlg'); const a = d.getBoundingClientRect(), q = f.getBoundingClientRect(); return {top: q.top + a.top, bottom: q.top + a.bottom, vh: innerHeight}; });
  conf(vis.top >= 0 && vis.bottom <= vis.vh, 'a janela do Registrar aparece na parte visível da tela', vis);
  await fg.click('#dlg [data-a="regSalvar"]');
  await ph.waitForTimeout(600);
  conf(/Comparar registros \(1\)/.test(await fg.innerText('.tabs')), 'registro guardado: “Comparar registros (1)”');
  await ph.reload(); await pronto(ph);
  fg = await frame(ph);
  conf(/Comparar registros \(1\)/.test(await fg.innerText('.tabs')), 'o registro continua depois de reabrir');
  await fg.selectOption('[data-f="ano"]', '2026');
  const rec26 = valor(await fg.textContent('.k-rec-usd b'));
  // e23: o “📤 Compartilhar (HTML)” dos Indicadores gera uma cópia do próprio arquivo do Forecast (com todos os dados)
  await fg.click('.b-sh');
  await ph.waitForSelector('.eng-sh .eng-sh-nome');
  conf(!(await fg.locator('#dlg').count()), 'Compartilhar (HTML) dos Indicadores abre a janela do Forecast (cópia do arquivo), não a do Gerencial');
  await ph.fill('.eng-sh-nome', 'Copia do Hugo');
  const arqSh = await baixar(ph, () => ph.click('.eng-sh-html'));
  const h = fs.readFileSync(arqSh, 'utf8');
  conf(path.basename(arqSh) === 'Copia do Hugo.html' && h.includes('id="earl-sh-dados"') && /var P='earlengsh[a-z0-9]+:';/.test(h) && /http-equiv="Content-Security-Policy"/.test(h) && h.indexOf('/* xlsx/0.18.5') >= 0, 'cópia do arquivo do Forecast com o nome escolhido, os dados, a biblioteca do Excel e a política de segurança', {arq: path.basename(arqSh), bytes: h.length});
  const b2 = await chromium.launch();
  const c2 = await b2.newContext({viewport: {width: 1440, height: 900}, acceptDownloads: true});
  await c2.route(/^https?:\/\//, x => x.abort());
  const ps = await c2.newPage();
  await ps.clock.setFixedTime(new Date(HOJE + 'T12:00:00'));
  const errS = []; ps.on('pageerror', e => errS.push(String(e)));
  await ps.goto('file://' + arqSh);
  const fs2 = await frame(ps);
  await fs2.selectOption('[data-f="ano"]', '2026').catch(() => {});
  const recS = valor(await fs2.textContent('.k-rec-usd b'));
  const regS = /Comparar registros \(1\)/.test(await fs2.innerText('.tabs'));
  const xl = await baixar(ps, () => fs2.click('[data-a="excel"]'));
  conf(perto(recS, rec26, 0.05) && regS && /\.xlsx$/.test(xl) && fs.statSync(xl).size > 3000 && !errS.length, 'a cópia abre sozinha (outro navegador) com os mesmos números nos Indicadores (2026: US$ ' + rec26.toFixed(2) + '), o registro e o Excel', {recS, rec26, regS, xl: path.basename(xl), errS: errS.slice(0, 2)});
  await b2.close();

  conf(!H.errs.length, 'arquivo do Hugo: nenhum erro de JavaScript', H.errs.slice(0, 3));
  await H.browser.close();
  console.log('\n%d ok, %d falha(s)', ok, falhas);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
