// e17 (pedido do Hugo, 25/11/2026):
// 1. filtro "Sonda" só com as sondas que têm operação nos contratos escolhidos (Visão geral e contrato);
// 2. "✓ Concluir operação" na janela da operação: pergunta se cada contingência foi usada (não fecha com item ainda em
//    contingência), confirma o consumo (já com o previsto) e a operação fica concluída (preta no Gantt); "↺ Reabrir";
// 3. cor das linhas de uma sonda no Gantt (clique no nome da sonda);
// 4. receita e COGS (US$, valor cheio) de cada operação no Gantt, no Calendário e na Lista.
// Uso: node tests/e2e_e17.js [EARL_Engenharia.html]
const {abrir} = require('./harness');
const {montar} = require('../walkthrough/demo');
const path = require('path');
const ARQ = path.resolve(process.argv[2] || path.join(__dirname, '..', 'EARL_Engenharia.html'));
let ok = 0, falhas = 0;
const conf = (c, msg, extra) => { if (c) { ok++; console.log('  ✓ ' + msg); } else { falhas++; console.log('  ✗ ' + msg + (extra !== undefined ? ' → ' + JSON.stringify(extra).slice(0, 600) : '')); } };
const valor = t => Number(String(t).replace(/[^\d,-]/g, '').replace(',', '.'));
const perto = (a, b, t = 0.02) => Math.abs(a - b) <= t;
const job = (p, id) => p.evaluate(i => loadDB().plannedJobs.find(j => j.id === i), id);
// e19: com cor da sonda, a barra fica na cor da sonda e a situação (cor da legenda) vai na faixa de baixo
const corBarra = (p, id) => p.evaluate(i => { const b = document.querySelector('[data-pj="' + i + '"]'); if (!b) return null; const s = getComputedStyle(b); const m = /(rgba?\([^)]*\)) 0px -\d+px 0px 0px inset/.exec(s.boxShadow || ''); return m ? m[1] : s.backgroundColor; }, id);

(async () => {
  const E = await abrir(ARQ, {hoje: '2026-11-25', h: 1000});
  const p = E.page;
  await p.waitForSelector('.eng2-card', {timeout: 90000});
  await montar(p);
  await p.waitForSelector('.eng2-card');
  // operação dm14 (em contingência, risco 50%) com um item PPU e uma química em contingência
  await p.evaluate(() => {
    const d = loadDB();
    const j = d.plannedJobs.find(x => x.id === 'dm14');
    j.ppuNeeds = (j.ppuNeeds || []).map((n, i) => i === 0 ? {...n, cont: true, chance: 40} : n);
    j.chems = (j.chems || []).map((n, i) => i === 0 ? {...n, cont: true, chance: 50} : n);
    saveDB(d);
  });
  await p.reload();
  await p.waitForSelector('.eng2-card', {timeout: 90000});
  const base = await job(p, 'dm14');

  /* ---------------------------------------------------------------- 1. filtro de sonda */
  console.log('1. Filtro de sonda');
  await p.click('.eng2-card.eng2-hero');
  await p.waitForSelector('.toolbar select.sel');
  const totalRigs = await p.evaluate(() => loadDB().rigs.filter(r => r.active !== false).length);
  const comOps = await p.evaluate(() => { const d = loadDB(); const at = new Set(d.contratos.filter(c => !c.archived).map(c => c.id)); return [...new Set(d.plannedJobs.filter(j => j.rigId && at.has(j.contratoId)).map(j => j.rigId))].length; });
  const op1 = await p.$$eval('.toolbar select.sel', l => [...l[0].options].slice(1).map(o => o.value));
  conf(op1.length === comOps && op1.length < totalRigs, 'Visão geral: só as ' + comOps + ' sondas com operação (eram ' + totalRigs + ' sondas no cadastro)', op1.length);
  await p.click('.ms-b:has-text("Contrato"), button:has-text("Contrato ▾"), .mf-b:has-text("Contrato")').catch(() => {});
  const viaCt = await p.evaluate(() => { const d = loadDB(); const ct = d.contratos.find(c => c.id === 'ct_demo_tk'); return [...new Set(d.plannedJobs.filter(j => j.contratoId === ct.id && j.rigId).map(j => j.rigId))]; });
  await p.keyboard.press('Escape');
  await p.click('.nav-back-btn');
  await p.click('.eng2-card:has-text("Takatsugu J")');
  await p.waitForSelector('.toolbar select.sel');
  const op2 = await p.$$eval('.toolbar select.sel', l => [...l[0].options].slice(1).map(o => o.value));
  conf(JSON.stringify(op2.sort()) === JSON.stringify(viaCt.sort()), 'no contrato Takatsugu J: só as sondas das operações dele', {op2, viaCt});
  await p.click('.nav-back-btn');
  await p.click('.eng2-card.eng2-hero');
  await p.waitForSelector('.eng-gj');

  /* ---------------------------------------------------------------- 4. receita e COGS */
  console.log('4. Receita e COGS de cada operação');
  const pac = await p.evaluate(() => { const o = {}; window.engGerDados().pacote.operacoes.forEach(x => { o[x.id] = {rec: x.realizado ? x.receita.usd : x.previsto.receita.usd, cogs: x.realizado ? x.realizado.cogs.usd : x.previsto.cogs.usd, well: x.poco}; }); return o; });
  const nRc = await p.locator('.eng-gj .eng-rc').count(), nGj = await p.locator('.eng-gj').count();
  conf(nRc > 0 && nRc === nGj, 'Gantt (por sonda): cada operação com a linha "US$ … · COGS …" (' + nRc + ')', [nRc, nGj]);
  await p.click('button:has-text("Tudo")');
  await p.waitForTimeout(400);
  const tit = await p.getAttribute('[data-pj] >> nth=0', 'title').catch(() => '');
  conf(/Receita US\$ [\d.,]+ · COGS US\$ [\d.,]+/.test(tit || ''), 'barra do Gantt: receita e COGS no texto ao passar o mouse', tit);
  await p.click('.db-tab:has-text("Calendário")');
  await p.waitForTimeout(400);
  conf(await p.locator('.eng-rc-cal').count() > 0, 'Calendário: receita e COGS nas operações', await p.locator('.eng-rc-cal').count());
  await p.click('.db-tab:has-text("Lista")');
  await p.click('.eng-lista-todas').catch(() => {});
  await p.waitForTimeout(400);
  const cab = await p.$$eval('table.db-table thead th', l => l.map(t => t.innerText.replace(/\s+/g, ' ').trim()));
  conf(cab.some(t => /^RECEITA \(US\$\)/i.test(t)) && cab.some(t => /^COGS \(US\$\)/i.test(t)), 'Lista: colunas Receita (US$) e COGS (US$)', cab);
  const linhas = await p.$$eval('table.db-table tbody tr', l => l.map(tr => ({txt: tr.innerText, rec: (tr.querySelector('.eng-rc-rec') || {}).textContent, cogs: (tr.querySelector('.eng-rc-cogs') || {}).textContent})));
  const dif = [];
  const nWell = {};
  Object.values(pac).forEach(v => { nWell[v.well] = (nWell[v.well] || 0) + 1; });
  let nConf = 0;
  Object.entries(pac).forEach(([id, v]) => {
    if (id === 'dm14' || nWell[v.well] !== 1) return; // poço com mais de uma operação: não dá para achar a linha pelo poço // tem linha em contingência: a lista mostra o valor cheio, o pacote desconta o risco da linha
    const l = linhas.find(x => v.well && x.txt.indexOf(v.well) >= 0);
    if (!l) return;
    nConf++;
    if (!perto(valor(l.rec), v.rec) || !perto(valor(l.cogs), v.cogs)) dif.push({id, l: [l.rec, l.cogs], pac: [v.rec, v.cogs]});
  });
  conf(nConf >= 5 && !dif.length, 'Lista: receita e COGS de ' + nConf + ' operações = os dos Indicadores (valor cheio)', dif);

  /* ---------------------------------------------------------------- 3. cor das linhas da sonda */
  console.log('3. Cor das linhas da sonda no Gantt');
  await p.click('.db-tab:has-text("Gantt")');
  await p.waitForSelector('.eng-gl');
  const rid = await p.getAttribute('.eng-gl >> nth=0', 'data-rig');
  await p.click('.eng-gl >> nth=0 >> .eng-rig-cor-b');
  await p.waitForSelector('.eng-cor-pop');
  conf(await p.locator('.eng-cor-sw').count() >= 8, 'clicar no nome da sonda abre a paleta de cores', await p.locator('.eng-cor-sw').count());
  await p.click('.eng-cor-sw[data-cor="#2E86DE"]');
  await p.waitForTimeout(300);
  const corLinha = async () => p.evaluate(r => { const g = document.querySelector('.eng-gl[data-rig="' + r + '"]'); const lin = g.querySelector('.eng-gj') || g.children[0]; const rot = lin.querySelector('div[style*="sticky"]') || lin.children[0]; return {lin: getComputedStyle(lin).backgroundColor, rot: getComputedStyle(rot).backgroundColor, outra: (() => { const o = [...document.querySelectorAll('.eng-gl')].find(x => x.getAttribute('data-rig') !== r); return o ? getComputedStyle(o.querySelector('.eng-gj') || o.children[0]).backgroundColor : ''; })()}; }, rid);
  let cl = await corLinha();
  conf(/rgba\(46, 134, 222/.test(cl.lin) && /rgba\(46, 134, 222/.test(cl.rot) && !/46, 134, 222/.test(cl.outra), 'as linhas dessa sonda ficam azuis (as outras não)', cl);
  await p.click('.eng-gl >> nth=0 >> .eng-rig-cor-b');
  await p.click('.eng-cor-sw[data-cor="#27AE60"]');
  await p.click('.db-tab:has-text("Lista")');
  await p.click('.db-tab:has-text("Gantt")');
  await p.waitForSelector('.eng-gl');
  conf(/rgba\(39, 174, 96/.test((await corLinha()).lin), 'trocar para verde (e continua ao voltar para o Gantt)');
  await p.click('.db-tab:has-text("Gantt")');
  const ga = await p.$$eval('.tb button, button', l => l.filter(b => /Sonda contínua/.test(b.textContent)).length);
  if (ga) { await p.click('button:has-text("Sonda contínua")'); await p.waitForTimeout(400); conf(/rgba\(39, 174, 96/.test(await p.evaluate(r => getComputedStyle(document.querySelector('.eng-gl[data-rig="' + r + '"]')).backgroundColor === 'rgba(0, 0, 0, 0)' ? getComputedStyle(document.querySelector('.eng-gl[data-rig="' + r + '"] > div')).backgroundColor : getComputedStyle(document.querySelector('.eng-gl[data-rig="' + r + '"]')).backgroundColor, rid)), 'modo "Sonda contínua": a linha da sonda também fica verde'); await p.click('button:has-text("Por sonda")'); }

  /* ---------------------------------------------------------------- 2. concluir a operação */
  console.log('2. Concluir a operação (com contingências)');
  await p.click('button:has-text("Tudo")');
  await p.waitForTimeout(300);
  const corAntes = await corBarra(p, 'dm14');
  await p.click('.db-tab:has-text("Lista")');
  await p.click('.eng-lista-todas').catch(() => {});
  await p.click('tr:has-text("' + base.well + '") button:has-text("Editar")');
  await p.waitForSelector('.eng-modal .eng-concluir');
  await p.click('.eng-modal .eng-concluir');
  await p.waitForSelector('.ec-conc-modal');
  const t1 = await p.innerText('.ec-conc-modal');
  conf(await p.locator('.ec-conc-tab tbody tr').count() === 2 && /em contingência \(risco 50% de não acontecer\)/.test(t1), 'pergunta as 2 contingências (item PPU e química) e avisa que a operação está em contingência (risco 50%)', t1.slice(0, 400));
  conf(await p.isDisabled('.ec-conc-ok') && /Falta responder 2/.test(t1), 'não deixa continuar sem responder');
  await p.locator('.ec-conc-tab tbody tr', {hasText: 'Item PPU'}).locator('.ec-conc-sim').click();
  conf(await p.isDisabled('.ec-conc-ok'), 'com 1 de 2 respondida, continua travado');
  await p.locator('.ec-conc-tab tbody tr', {hasText: 'Química'}).locator('.ec-conc-nao').click();
  await p.click('.ec-conc-ok');
  await p.waitForSelector('.ec-cons-modal');
  const t2 = await p.innerText('.ec-cons-modal .modal-title');
  const j2 = await job(p, 'dm14');
  conf(/Concluir a operação/.test(t2) && !j2.contingencia && Number(j2.riscoRec) === 0 && j2.ppuNeeds[0].cont === false && j2.chems.length === base.chems.length - 1 && !j2.concluida, 'contingências resolvidas: o item PPU usado fica normal, a química não usada sai, a operação deixa de ser contingência (risco 0%); ainda não concluída', {cont: j2.contingencia, rr: j2.riscoRec, ppu0: j2.ppuNeeds[0].cont, chems: [base.chems.length, j2.chems.length]});
  const qtd = await p.$$eval('.ec-cons-modal input.qty-input, .ec-cons-modal td input[type=number], .ec-cons-modal input[inputmode]', l => l.map(i => i.value).filter(Boolean).length);
  conf(qtd > 0, 'a tela do consumo já vem com as quantidades previstas', qtd);
  await p.click('.ec-cons-ok');
  await p.waitForSelector('.ec-cons-modal', {state: 'detached'});
  const j3 = await job(p, 'dm14');
  const somaPrev = (j3.ppuNeeds || []).reduce((a, n) => a + (Number(n.qty) || 0), 0), somaCons = (j3.ppuCons.linhas || []).reduce((a, n) => a + (Number(n.qty) || 0), 0);
  conf(j3.concluida && j3.concluida.em && j3.ppuCons && perto(somaPrev, somaCons) && (j3.ppuCons.quim || []).length === j3.chems.length, 'operação concluída: consumo = o previsto (sem a química não usada) e data da conclusão', {concluida: j3.concluida, somaPrev, somaCons});
  const log = (j3.log || []).map(l => l.acao || l.action || '').join(' | ');
  conf(/Contingências resolvidas para concluir/.test(log) && /Operação concluída/.test(log), 'o Log da operação registra as contingências e a conclusão', log.slice(-300));
  await p.click('.db-tab:has-text("Gantt")');
  await p.waitForSelector('.eng-gl');
  await p.click('button:has-text("Tudo")');
  await p.waitForTimeout(300);
  const corDepois = await corBarra(p, 'dm14');
  conf(corDepois === 'rgb(42, 47, 48)' && corAntes !== corDepois, 'no Gantt a operação fica preta ("Operação concluída"; antes roxa de contingência)', [corAntes, corDepois]);
  const pk = await p.evaluate(() => { const o = window.engGerDados().pacote.operacoes.find(x => x.id === 'dm14'); return {real: !!o.realizado, risco: o.risco, cont: o.contingencia}; });
  conf(pk.real && pk.risco === 0 && !pk.cont, 'Indicadores: a operação passa a realizada, sem risco e sem contingência', pk);
  await p.click('.db-tab:has-text("Lista")');
  await p.click('.eng-lista-todas').catch(() => {});
  conf(/✓ Concluída/.test(await p.innerText('tr:has-text("' + base.well + '")')), 'Lista: selo "✓ Concluída"');

  console.log('   Reabrir');
  await p.click('tr:has-text("' + base.well + '") button:has-text("Editar")');
  await p.waitForSelector('.eng-modal .eng-reabrir');
  conf(await p.locator('.eng-modal .eng-conc-chip').count() === 1 && !(await p.locator('.eng-modal .eng-concluir').count()), 'na janela da operação: "✓ Concluída" e "↺ Reabrir" (sem o "Concluir")');
  await p.click('.eng-modal .eng-reabrir');
  await p.locator('.overlay button', {hasText: /^Reabrir$/}).last().click();
  await p.waitForTimeout(400);
  const j4 = await job(p, 'dm14');
  conf(!j4.ppuCons && !j4.concluida && j4.chems.length === j3.chems.length, 'reaberta: consumo e conclusão apagados (as contingências resolvidas não voltam)', {cons: !!j4.ppuCons, conc: j4.concluida});
  await p.click('.eng-modal button:has-text("Cancelar"), .eng-modal button:has-text("Fechar")').catch(() => {});

  console.log('   Sem contingência e cancelar');
  await p.click('.eng-lista-todas').catch(() => {});
  const semCont = await p.evaluate(() => { const d = loadDB(); const j = d.plannedJobs.find(x => !x.contingencia && !x.ppuCons && !(Number(x.riscoRec) > 0) && !['ppuNeeds', 'chems', 'casingNeeds', 'peopleNeeds', 'equipNeeds'].some(k => (x[k] || []).some(n => n && n.cont)) && x.well && !d.plannedJobs.some(y => y !== x && y.well === x.well)); return j && {id: j.id, well: j.well}; });
  await p.click('tr:has-text("' + semCont.well + '") button:has-text("Editar")');
  await p.click('.eng-modal .eng-concluir');
  await p.waitForSelector('.ec-cons-modal');
  conf(!(await p.locator('.ec-conc-modal').count()) && /Concluir a operação/.test(await p.innerText('.ec-cons-modal .modal-title')), 'sem contingência: vai direto para a confirmação do consumo');
  await p.click('.ec-cons-modal button:has-text("Cancelar")');
  const j5 = await job(p, semCont.id);
  conf(!j5.ppuCons && !j5.concluida, 'cancelar: a operação não fica concluída');

  /* ---------------------------------------------------------------- 5. pílulas de filtro */
  console.log('5. Pílulas de filtro (Visão geral)');
  await p.click('.nav-back-btn').catch(() => {});
  await p.click('.fr-tab-cts').catch(() => {});
  await p.click('.eng2-card.eng2-hero');
  await p.click('.db-tab:has-text("Lista")');
  await p.click('.eng-lista-todas').catch(() => {});
  await p.waitForSelector('.eng-pils');
  const nomesPil = await p.$$eval('.eng-pil', l => l.map(b => b.textContent));
  conf(['Previstas', 'Concluídas', 'Atrasadas', 'Contingência', 'Com risco', 'Risco 100%', 'Handover enviado', 'Sem handover'].every(n => nomesPil.some(t => t.indexOf(n) === 0)), 'pílulas: Previstas, Concluídas, Atrasadas, Contingência, Com risco, Risco 100%, Handover enviado, Sem handover', nomesPil);
  const nLinhas = () => p.$$eval('table.db-table tbody tr', l => l.filter(tr => tr.querySelector('input[type=date]')).length);
  const esp = await p.evaluate(() => { const d = loadDB(); const at = new Set(d.contratos.filter(c => !c.archived).map(c => c.id)); const ops = d.plannedJobs.filter(j => at.has(j.contratoId) && j.status !== 'CANCELADA'); const lin = j => ['ppuNeeds', 'chems', 'casingNeeds', 'peopleNeeds', 'equipNeeds'].reduce((a, k) => a.concat(j[k] || []), []); const cont = j => !!j.contingencia || lin(j).some(n => n && n.cont); const conc = j => !!(j.concluida || j.ppuCons); return {tot: ops.length, cont: ops.filter(cont).length, contPrev: ops.filter(j => cont(j) && !conc(j)).length, contOuConc: ops.filter(j => cont(j) || conc(j)).length}; });
  const tot0 = await nLinhas();
  await p.click('.eng-pil-cont');
  const nCont = await nLinhas();
  const bCont = await p.textContent('.eng-pil-cont b');
  conf(nCont === esp.cont && Number(bCont) === esp.cont && tot0 === esp.tot, 'Contingência: só as ' + esp.cont + ' operações em contingência (o número da pílula confere)', {tot0, nCont, bCont, esp});
  await p.click('.eng-pil-conc');
  await p.click('.eng-pil-cont'); // tira contingência: fica só "Concluídas"
  await p.click('.eng-pil-cont'); // contingência + concluídas (grupos diferentes: "e")
  const nAnd = await nLinhas();
  const espAnd = await p.evaluate(() => { const d = loadDB(); const at = new Set(d.contratos.filter(c => !c.archived).map(c => c.id)); return d.plannedJobs.filter(j => at.has(j.contratoId) && (j.concluida || j.ppuCons) && (j.contingencia || ['ppuNeeds', 'chems', 'casingNeeds', 'peopleNeeds', 'equipNeeds'].some(k => (j[k] || []).some(n => n && n.cont)))).length; });
  conf(nAnd === espAnd, 'Concluídas + Contingência (grupos diferentes valem juntos): ' + espAnd, nAnd);
  await p.click('.eng-pil-conc');
  await p.click('.eng-pil-prev');
  conf(await nLinhas() === esp.contPrev, 'Previstas + Contingência: ' + esp.contPrev, await nLinhas());
  await p.reload(); await p.waitForSelector('.eng-tools', {timeout: 90000}); await p.waitForTimeout(800);
  await p.click('.eng2-card.eng2-hero').catch(() => {});
  await p.click('.db-tab:has-text("Lista")').catch(() => {});
  await p.waitForSelector('.eng-pils');
  conf(await p.locator('.eng-pil.on').count() === 2, 'as pílulas escolhidas continuam depois de reabrir');
  await p.click('.eng-pil-limpar');
  await p.click('.eng-lista-todas').catch(() => {});
  conf(await nLinhas() === esp.tot && !(await p.locator('.eng-pil.on').count()), '“✕ Limpar” volta a mostrar todas');

  /* ---------------------------------------------------------------- 6. receita e COGS na janela da operação */
  console.log('6. Receita e COGS na janela da operação');
  const o5 = await p.evaluate(() => { const j = loadDB().plannedJobs.find(x => x.id === 'dm05'); const o = window.engGerDados().pacote.operacoes.find(x => x.id === 'dm05'); return {well: j.well, rr: j.riscoRec, rec: o.previsto.receita.usd, cogs: o.previsto.cogs.usd}; });
  await p.click('tr:has-text("' + o5.well + '") button:has-text("Editar")');
  await p.waitForSelector('.eng-modal .eng-resumo-op');
  const ro = async () => ({rec: valor(await p.textContent('.eng-ro-rec')), cogs: valor(await p.textContent('.eng-ro-cogs')), sub: await p.textContent('.eng-ro-sub')});
  let r1 = await ro();
  conf(perto(r1.rec, o5.rec * (1 - o5.rr / 100)) && perto(r1.cogs, o5.cogs * (1 - o5.rr / 100)) && /operação 30% \(contingência\)/.test(r1.sub), 'contingência com risco 30%: receita e COGS × 0,7 (' + r1.rec.toFixed(2) + ' e ' + r1.cogs.toFixed(2) + ')', {r1, o5});
  await p.fill('.eng-modal .ec-cont-risco-in', '100');
  r1 = await ro();
  conf(r1.rec === 0 && r1.cogs === 0, 'risco 100% (não acontece): receita e COGS zero', r1);
  await p.fill('.eng-modal .ec-cont-risco-in', '0');
  r1 = await ro();
  conf(perto(r1.rec, o5.rec) && perto(r1.cogs, o5.cogs), 'risco 0% (acontece): o valor inteiro', r1);
  await p.click('.eng-modal button:has-text("Cancelar")');
  const t22 = await p.evaluate(() => { const d = loadDB(); const at = new Set(d.contratos.filter(c => !c.archived).map(c => c.id)); const j = d.plannedJobs.find(x => at.has(x.contratoId) && x.well && !x.ppuCons && !x.contingencia && !(Number(x.riscoRec) > 0) && (x.ppuNeeds || []).length >= 2 && d.plannedJobs.filter(y => y.well === x.well).length === 1); return {id: j.id, well: j.well}; });
  // uma linha PPU em contingência com risco 25%: entra × 0,75 (direto no banco, como se tivesse sido marcada na tela)
  await p.evaluate(id => { const d = loadDB(); const j = d.plannedJobs.find(x => x.id === id); j.ppuNeeds[0] = {...j.ppuNeeds[0], cont: true, chance: 75}; saveDB(d); }, t22.id);
  await p.reload(); await p.waitForSelector('.eng-tools', {timeout: 90000}); await p.waitForTimeout(600);
  await p.click('.eng2-card.eng2-hero').catch(() => {});
  await p.click('.db-tab:has-text("Lista")').catch(() => {});
  await p.click('.eng-lista-todas').catch(() => {});
  const l22 = await p.evaluate(id => { const o = window.engGerDados().pacote.operacoes.find(x => x.id === id); return o.previsto.ppu.map(x => ({v: x.valorUsd, r: x.risco || 0})); }, t22.id);
  const esp22 = l22.reduce((a, x) => a + x.v * (1 - x.r / 100), 0);
  await p.locator('table.db-table tbody tr', {hasText: t22.well}).first().locator('button', {hasText: 'Editar'}).click();
  await p.waitForSelector('.eng-modal .eng-resumo-op');
  r1 = await ro();
  conf(perto(r1.rec, esp22) && l22[0].r === 25 && /1 linha\(s\) em contingência/.test(r1.sub), 'item PPU em contingência (risco 25%): entra × 0,75 na soma (' + r1.rec.toFixed(2) + ')', {r1, esp22, l22});
  await p.click('.eng-modal button:has-text("Cancelar")');

  /* ---------------------------------------------------------------- 7. duplicar */
  console.log('7. Duplicar: só a operação ou o poço inteiro');
  const poco = await p.evaluate(() => { const d = loadDB(); const c = {}; d.plannedJobs.forEach(j => { if (j.well) c[j.well] = (c[j.well] || []).concat(j.id); }); const w = Object.keys(c).find(k => c[k].length >= 2); return {well: w, ids: c[w], ops: c[w].map(id => { const j = d.plannedJobs.find(x => x.id === id); return {id, date: j.date, tipo: j.tipoOp, n: (j.ppuNeeds || []).length}; })}; });
  await p.locator('table.db-table tbody tr', {hasText: poco.well}).first().locator('button', {hasText: 'Editar'}).click();
  await p.waitForSelector('.eng-modal .eng-mf');
  await p.click('.eng-modal .eng-mf button:text-is("Duplicar")');
  await p.waitForSelector('.eng-dup-modal');
  conf(new RegExp('uma das ' + poco.ids.length + ' operações do poço').test(await p.innerText('.eng-dup-modal')), 'pergunta: só esta operação ou o poço inteiro (' + poco.ids.length + ' operações de ' + poco.well + ')');
  await p.click('.eng-dup-ok');
  await p.waitForTimeout(400);
  const copia = await p.evaluate(() => { const i = document.querySelector('.eng-modal .fld input[placeholder], .eng-modal input'); return document.querySelector('.eng-modal') ? document.querySelector('.eng-modal').innerText.slice(0, 120) : ''; });
  conf(/NOVA OPERA|Nova opera/i.test(copia) && !(await p.locator('.eng-dup-modal').count()), '“Só esta operação”: abre a cópia para ajustar e salvar (como antes)', copia);
  await p.click('.eng-modal button:has-text("Cancelar")');
  const antesN = await p.evaluate(() => loadDB().plannedJobs.length);
  await p.locator('table.db-table tbody tr', {hasText: poco.well}).first().locator('button', {hasText: 'Duplicar'}).click();
  await p.waitForSelector('.eng-dup-modal');
  await p.check('.eng-dup-poco');
  conf(await p.isDisabled('.eng-dup-ok'), 'poço inteiro: pede o nome do novo poço');
  await p.fill('.eng-dup-nome', 'NOVO-POCO-E17');
  await p.fill('.eng-dup-data', '2027-03-01');
  await p.click('.eng-dup-ok');
  await p.waitForTimeout(500);
  const dup = await p.evaluate(w => { const d = loadDB(); return d.plannedJobs.filter(j => j.well === 'NOVO-POCO-E17').sort((a, b) => a.date.localeCompare(b.date)).map(j => ({id: j.id, date: j.date, tipo: j.tipoOp, n: (j.ppuNeeds || []).length, cons: !!j.ppuCons, ho: !!(j.handoverId || j.hoEmailEm), log: (j.log || []).map(l => l.acao).join('|')})); }, poco.well);
  const orig = poco.ops.slice().sort((a, b) => a.date.localeCompare(b.date));
  const dias = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);
  conf(dup.length === orig.length && (await p.evaluate(() => loadDB().plannedJobs.length)) === antesN + orig.length && dup[0].date === '2027-03-01' && dup.every((x, i) => x.tipo === orig[i].tipo && x.n === orig[i].n && !x.cons && !x.ho && dias(dup[0].date, x.date) === dias(orig[0].date, orig[i].date)), 'poço inteiro: ' + orig.length + ' operações novas em NOVO-POCO-E17, desde 01/03/2027, mesma sequência e recursos, sem consumo nem handover', {dup, orig});
  conf(dup.every(x => /cópia do poço/.test(x.log)), 'o Log das cópias diz de qual poço vieram');

  /* ---------------------------------------------------------------- 8. Perfuração */
  console.log('8. Tipo de operação "Perfuração"');
  await p.click('button:has-text("+ Nova operação")');
  await p.waitForSelector('.eng-modal');
  const tipos = await p.locator('.eng-modal .fld', {has: p.locator('label', {hasText: 'Tipo de operação'})}).first().locator('select option').allTextContents();
  conf(tipos.includes('Perfuração'), 'a lista de tipos de operação tem "Perfuração"', tipos);
  await p.click('.eng-modal button:has-text("Cancelar")');

  conf(!E.errs.length, 'nenhum erro de JavaScript', E.errs.slice(0, 3));
  await E.browser.close();
  console.log('\n%d ok, %d falha(s)', ok, falhas);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
