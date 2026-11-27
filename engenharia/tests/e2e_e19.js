// e19 (pedido do Hugo, 27/11/2026):
// 1. "⬇ Exportar dados" com mais de um contrato pergunta quais exportar (todos marcados); e20: sai um .json por
//    contrato, EARL_FORECAST_<CLIENTE>_<CONTRATO>_AAAA.MM.DD_HHhMM.json; só os ativos; com um contrato só, exporta direto;
// 2. as janelas mudam de tamanho puxando qualquer borda ou canto (também no Gerencial embutido);
// 3. o cartão vermelho da Receita nos Indicadores = o card "Visão geral" dos Contratos (sem brilho);
// 4. duplicar o poço com uma caixa de marcar em cada operação (todas marcadas no começo);
// 5. tipos de operação "Entrega de Cimento/Blend" e "Perfuração";
// 6. calendário: o tipo da operação no dia; "abrir" mostra só as operações daquele dia (clique = editar);
// 7. cor da sonda: a barra fica na cor da sonda e a faixa de baixo na cor da legenda (Gantt e calendário).
// Uso: node tests/e2e_e19.js [EARL_Engenharia.html]
const {abrir, baixarVarios} = require('./harness');
const {montar} = require('../walkthrough/demo');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ARQ = path.resolve(process.argv[2] || path.join(__dirname, '..', 'EARL_Engenharia.html'));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'earl-e19-'));
let ok = 0, falhas = 0;
const conf = (c, msg, extra) => { if (c) { ok++; console.log('  ✓ ' + msg); } else { falhas++; console.log('  ✗ ' + msg + (extra !== undefined ? ' → ' + JSON.stringify(extra).slice(0, 700) : '')); } };
const fld = (p, rot) => p.locator('.eng-modal .fld').filter({has: p.locator('label', {hasText: rot})}).first();
const caixa = (p, sel) => p.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return {l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height)}; }, sel);
const perto = (a, b, t = 3) => Math.abs(a - b) <= t;
const arrastar = async (p, x, y, dx, dy) => { await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + dx / 2, y + dy / 2, {steps: 4}); await p.mouse.move(x + dx, y + dy, {steps: 4}); await p.mouse.up(); await p.waitForTimeout(150); };
const cursor = p => p.evaluate(() => document.documentElement.getAttribute('data-engrz-cur') || '');
const baixar = async (p, acao) => { const d = p.waitForEvent('download', {timeout: 20000}); await acao(); const x = await d; const f = path.join(TMP, x.suggestedFilename()); await x.saveAs(f); return f; };
const estiloBarra = (p, id) => p.evaluate(i => { const b = document.querySelector('[data-pj="' + i + '"]'); if (!b) return null; const s = getComputedStyle(b); const t = [...b.querySelectorAll('span')].find(x => !x.className && x.textContent.trim()); return {bg: s.backgroundColor, sh: s.boxShadow, txt: t ? getComputedStyle(t).color : ''}; }, id);

(async () => {
  const E = await abrir(ARQ, {hoje: '2026-11-27', h: 1000});
  const p = E.page;
  await p.waitForSelector('.eng2-card', {timeout: 90000});
  await montar(p);
  await p.waitForSelector('.eng2-card');
  const cts = await p.evaluate(() => loadDB().contratos.filter(c => !c.archived).map(c => ({id: c.id, nome: c.name, ops: loadDB().plannedJobs.filter(j => j.status !== 'CANCELADA' && j.contratoId === c.id).length})));

  /* ---------------------------------------------------------------- 1. exportar escolhendo os contratos */
  console.log('1. Exportar escolhendo os contratos');
  await p.click('.eng-tools .eng-exportar');
  await p.waitForSelector('.eng-expsel');
  const nLin = await p.locator('.eng-expsel-tab tbody tr').count();
  const nMarc = await p.locator('.eng-expsel-cb:checked').count();
  conf(cts.length === 3 && nLin === 3 && nMarc === 3, 'com ' + cts.length + ' contratos, pergunta quais exportar (todos marcados)', {cts, nLin, nMarc});
  const NOMES3 = ['EARL_FORECAST_BP_BP-MACAE-OFFSHORE_2026.11.27_12h00.json', 'EARL_FORECAST_ETESCO_TAKATSUGU-J_2026.11.27_12h00.json', 'EARL_FORECAST_PETROBRAS_P&A-MACAE-OFFSHORE_2026.11.27_12h00.json'];
  let nomes = (await p.locator('.eng-expsel-nome code').allTextContents()).sort();
  conf(JSON.stringify(nomes) === JSON.stringify(NOMES3) && /Exportar 3 arquivos/.test(await p.textContent('.eng-expsel-ok')), 'um arquivo por contrato, com o nome EARL_FORECAST_<CLIENTE>_<CONTRATO>_AAAA.MM.DD_HHhMM.json', nomes);
  await p.click('.eng-expsel-todos');
  conf(await p.locator('.eng-expsel-cb:checked').count() === 0 && await p.isDisabled('.eng-expsel-ok'), '“marcar todos” desmarca; sem contrato marcado, não exporta');
  await p.click('.eng-expsel button:has-text("Cancelar")');
  conf(!(await p.locator('.eng-expsel').count()), '“Cancelar” fecha sem exportar');
  await p.click('.eng-tools .eng-exportar');
  await p.waitForSelector('.eng-expsel');
  await p.locator('.eng-expsel-tab tbody tr', {hasText: 'BP — Macaé'}).click(); // clicar na linha também desmarca
  nomes = (await p.locator('.eng-expsel-nome code').allTextContents()).sort();
  conf(JSON.stringify(nomes) === JSON.stringify([NOMES3[1], NOMES3[2]]) && /Exportar 2 arquivos/.test(await p.textContent('.eng-expsel-ok')), 'desmarcando o BP: “Exportar 2 arquivos”, um do P&A e um do Takatsugu J', nomes);
  const arqs = await baixarVarios(p, () => p.click('.eng-expsel-ok'), 2, TMP);
  const Js = {};
  arqs.forEach(f => { const J = JSON.parse(fs.readFileSync(f, 'utf8')); Js[J.db.contratos[0] && J.db.contratos[0].id] = {J, nome: path.basename(f)}; });
  conf(arqs.length === 2 && JSON.stringify(arqs.map(f => path.basename(f)).sort()) === JSON.stringify(nomes) && Object.values(Js).every(x => x.J.db.contratos.length === 1 && x.J.contratos.length === 1), 'baixa 2 arquivos (os nomes mostrados), cada um com um contrato só', arqs.map(f => path.basename(f)));
  let tudoCerto = true; const det = {};
  for (const id of ['ct_demo_pa', 'ct_demo_tk']) {
    const esp = await p.evaluate(i => { const d = loadDB(); const jobs = d.plannedJobs.filter(j => j.contratoId === i); return {jobs: jobs.length, inv: (d.invSondas || []).filter(v => v.ctId === i).length, ho: (d.handovers || []).filter(h => (h.opIds || []).length && h.opIds.every(x => jobs.some(j => j.id === x))).length, rigs: d.rigs.length}; }, id);
    const J = Js[id] && Js[id].J;
    det[id] = {esp, jobs: J && J.db.plannedJobs.length};
    if (!J || J.db.plannedJobs.length !== esp.jobs || !J.db.plannedJobs.every(j => j.contratoId === id) || (J.db.invSondas || []).length !== esp.inv || (J.db.handovers || []).length !== esp.ho || J.db.rigs.length !== esp.rigs || !J.db.cambio || !J.db.quimicos) tudoCerto = false;
  }
  conf(tudoCerto, 'cada arquivo leva as operações, o inventário e os handovers do seu contrato; as sondas, o câmbio e os químicos vão nos dois', det);
  conf(/2 arquivo\(s\), um por contrato/.test(await p.textContent('body')), 'aviso: 2 arquivos, um por contrato');
  // importar o do P&A: a janela de importar mostra 1 contrato
  const arq = arqs.find(f => /P&A/.test(f));
  await p.setInputFiles('.eng-tools input[type=file]', arq);
  await p.waitForSelector('.ec-imp-dados');
  conf(await p.locator('.ec-imp-ct-cb').count() === 1 && /só os contratos que estão nele \(1\)/.test(await p.innerText('.ec-imp-dados')), 'ao importar o arquivo do P&A, a janela mostra 1 contrato (e “Substituir tudo” avisa que ficaria só ele)');

  /* ---------------------------------------------------------------- 2. janelas mudam de tamanho */
  console.log('2. As janelas mudam de tamanho puxando qualquer borda ou canto');
  let r0 = await caixa(p, '.ec-imp-dados');
  await p.mouse.move(r0.r + 3, Math.round((r0.t + r0.b) / 2));
  conf(await cursor(p) === 'e', 'perto da borda direita, o cursor vira a seta de redimensionar', await cursor(p));
  await arrastar(p, r0.r + 3, Math.round((r0.t + r0.b) / 2), 120, 0);
  let r1 = await caixa(p, '.ec-imp-dados');
  conf(perto(r1.w, r0.w + 120) && perto(r1.l, r0.l) && await p.locator('.ec-imp-dados').count() === 1, 'puxar a borda direita: +120 px de largura, a esquerda fica no lugar e a janela não fecha (o clique de soltar não chega ao fundo)', {r0, r1});
  await arrastar(p, r1.l - 3, Math.round((r1.t + r1.b) / 2), -100, 0);
  let r2 = await caixa(p, '.ec-imp-dados');
  conf(perto(r2.l, r1.l - 100) && perto(r2.r, r1.r), 'puxar a borda esquerda: cresce para a esquerda', {r1, r2});
  await arrastar(p, Math.round((r2.l + r2.r) / 2), r2.b + 3, 0, -120);
  let r3 = await caixa(p, '.ec-imp-dados');
  conf(perto(r3.h, r2.h - 120) && perto(r3.t, r2.t), 'puxar a borda de baixo: diminui a altura', {r2, r3});
  await arrastar(p, Math.round((r3.l + r3.r) / 2), r3.t - 3, 0, -60);
  let r4 = await caixa(p, '.ec-imp-dados');
  conf(perto(r4.t, r3.t - 60) && perto(r4.b, r3.b), 'puxar a borda de cima: cresce para cima', {r3, r4});
  await arrastar(p, r4.l + 2, r4.t + 2, 2000, 2000); // o canto de cima à esquerda até o fim da tela
  let r5 = await caixa(p, '.ec-imp-dados');
  conf(perto(r5.w, 280, 1) && perto(r5.h, 160, 1) && perto(r5.r, r4.r) && perto(r5.b, r4.b), 'pelo canto: não fica menor que 280 × 160', {r4, r5});
  await arrastar(p, r5.r - 2, r5.b - 2, 3000, 3000); // o canto de baixo à direita até passar da tela
  let r6 = await caixa(p, '.ec-imp-dados');
  conf(r6.r <= 1440 && r6.b <= 1000 && r6.w > r5.w, 'não passa da tela', r6);
  await p.mouse.dblclick(r6.r - 2, Math.round((r6.t + r6.b) / 2));
  await p.waitForTimeout(150);
  let r7 = await caixa(p, '.ec-imp-dados');
  conf(perto(r7.w, r0.w) && !(await p.getAttribute('.ec-imp-dados', 'data-engrz')), 'duplo clique na borda: volta ao tamanho normal', {r0, r7});
  await p.mouse.click(5, 500); // clicar fora (sem arrastar) ainda fecha esta janela, como antes
  await p.waitForTimeout(200);
  conf(!(await p.locator('.ec-imp-dados').count()), 'clicar fora (sem arrastar) continua fechando as janelas que já fechavam assim');
  // a janela da operação (o corpo acompanha a altura)
  await p.click('.eng2-card.eng2-hero');
  await p.click('.db-tab:has-text("Lista")');
  await p.click('.eng-lista-todas').catch(() => {});
  await p.locator('table.db-table tbody tr').first().locator('button', {hasText: 'Editar'}).click();
  await p.waitForSelector('.eng-modal .eng-mb');
  await p.waitForTimeout(500); // fim da animação de abrir
  const m0 = await caixa(p, '.eng-modal'), b0 = await caixa(p, '.eng-modal .eng-mb');
  await arrastar(p, Math.round((m0.l + m0.r) / 2), m0.b + 3, 0, -200);
  const m1 = await caixa(p, '.eng-modal'), b1 = await caixa(p, '.eng-modal .eng-mb');
  conf(perto(m1.h, m0.h - 200) && perto(b1.h, b0.h - 200, 4) && await p.locator('.eng-modal').count() === 1, 'janela da operação: −200 px de altura, o meio (com a rolagem) acompanha', {m0, m1, b0, b1});
  await arrastar(p, m1.r + 3, m1.b + 3, -300, 60);
  const m2 = await caixa(p, '.eng-modal');
  conf(perto(m2.w, m1.w - 300) && perto(m2.h, m1.h + 60), 'pelo canto de baixo à direita: largura e altura juntas', {m1, m2});
  await p.click('.eng-modal button:has-text("Cancelar")');
  await p.waitForTimeout(200);
  // o Gerencial embutido (janela "📌 Registrar")
  await p.click('.nav-back-btn');
  await p.click('.fr-tab-ind');
  await p.waitForSelector('.ec-ger-frame');
  const fr = await (await p.$('.ec-ger-frame')).contentFrame();
  await fr.waitForSelector('.kpis');

  /* ---------------------------------------------------------------- 3. cartão vermelho = card "Visão geral" */
  console.log('3. Cartão vermelho da Receita = card "Visão geral" dos Contratos');
  const kd = await fr.evaluate(() => { const s = getComputedStyle(document.querySelector('.kpis .kpi.dest')); return {bg: s.backgroundImage, sh: s.boxShadow, bc: s.borderTopColor}; });
  await p.click('.fr-tab-cts');
  await p.waitForSelector('.eng2-card.eng2-hero');
  await p.mouse.move(5, 5);
  await p.waitForTimeout(300);
  const hd = await p.evaluate(() => { const s = getComputedStyle(document.querySelector('.eng2-card.eng2-hero')); return {bg: s.backgroundImage, sh: s.boxShadow, bc: s.borderTopColor}; });
  const arred = t => String(t).replace(/-?\d+\.\d+/g, x => String(Math.round(+x))); // o card pode estar no fim da animação (0,9999 px)
  conf(kd.bg === hd.bg && arred(kd.sh) === arred(hd.sh) && kd.bc === hd.bc && !/radial/.test(kd.bg) && !/204, 0, 0/.test(kd.sh), 'mesmo degradê, mesma borda e mesma sombra do card Visão geral (sem o brilho e sem a sombra vermelha)', {kd, hd});
  await p.click('.fr-tab-ind');
  await p.waitForSelector('.ec-ger-frame');
  const fr2 = await (await p.$('.ec-ger-frame')).contentFrame(); // o quadro é recriado ao voltar para a aba
  await fr2.waitForSelector('[data-a="regAbrir"]');
  const frg = fr2;
  await frg.click('[data-a="regAbrir"]');
  await frg.waitForSelector('.dlg');
  const fb = await (await p.$('.ec-ger-frame')).boundingBox();
  const g0 = await frg.evaluate(() => { const r = document.querySelector('.dlg').getBoundingClientRect(); return {l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height}; });
  await arrastar(p, fb.x + g0.r + 3, fb.y + (g0.t + g0.b) / 2, 140, 0);
  const g1 = await frg.evaluate(() => { const r = document.querySelector('.dlg').getBoundingClientRect(); return {l: r.left, w: r.width}; });
  conf(perto(g1.w, g0.w + 140) && perto(g1.l, g0.l) && await frg.locator('.dlg').count() === 1, 'Indicadores: a janela “📌 Registrar” também muda de tamanho', {g0, g1});
  await frg.click('.dlg [data-a="regCancelar"]');
  await p.click('.fr-tab-cts');

  /* ---------------------------------------------------------------- 4. duplicar o poço escolhendo as operações */
  console.log('4. Duplicar o poço escolhendo as operações');
  await p.click('.eng2-card.eng2-hero');
  await p.click('.db-tab:has-text("Lista")');
  await p.click('.eng-lista-todas').catch(() => {});
  const poco = await p.evaluate(() => { const d = loadDB(); const c = {}; d.plannedJobs.forEach(j => { if (j.well && j.status !== 'CANCELADA') (c[j.contratoId + '|' + j.well] = c[j.contratoId + '|' + j.well] || []).push(j); }); const k = Object.keys(c).filter(k => c[k].length >= 2).sort((a, b) => c[b].length - c[a].length)[0]; const l = c[k].sort((a, b) => a.date.localeCompare(b.date)); return {well: l[0].well, ops: l.map(j => ({id: j.id, date: j.date, tipo: j.tipoOp}))}; });
  await p.locator('table.db-table tbody tr', {hasText: poco.well}).first().locator('button', {hasText: 'Duplicar'}).click();
  await p.waitForSelector('.eng-dup-modal');
  await p.check('.eng-dup-poco');
  const nCb = await p.locator('.eng-dup-cb').count(), nCbOn = await p.locator('.eng-dup-cb:checked').count();
  conf(nCb === poco.ops.length && nCbOn === nCb && await p.isChecked('.eng-dup-todas'), 'uma caixa de marcar em cada uma das ' + poco.ops.length + ' operações do poço, todas marcadas', {nCb, nCbOn});
  await p.click('.eng-dup-todas');
  conf(await p.locator('.eng-dup-cb:checked').count() === 0 && await p.isDisabled('.eng-dup-ok') && /Marque pelo menos uma/.test(await p.textContent('.eng-dup-modal .ec-foot')), 'desmarcando todas: pede para marcar pelo menos uma');
  await p.click('.eng-dup-todas');
  await p.locator('.eng-dup-cb').nth(0).uncheck(); // a 1ª não vai: a data nova vale para a 2ª
  await p.fill('.eng-dup-nome', 'POCO-E19');
  await p.fill('.eng-dup-data', '2027-05-10');
  const lin0 = await p.locator('.eng-dup-tab tbody tr').nth(0).innerText();
  conf(/não vai/.test(lin0) && /Duplicar o poço \(/.test(await p.textContent('.eng-dup-ok')) && (await p.textContent('.eng-dup-ok')).includes('(' + (poco.ops.length - 1) + ' opera'), 'a operação desmarcada aparece como “não vai”; o botão conta só as marcadas (' + (poco.ops.length - 1) + ')', {lin0, bt: await p.textContent('.eng-dup-ok')});
  await p.click('.eng-dup-ok');
  await p.waitForTimeout(500);
  const novos = await p.evaluate(() => loadDB().plannedJobs.filter(j => j.well === 'POCO-E19').sort((a, b) => a.date.localeCompare(b.date)).map(j => ({date: j.date, tipo: j.tipoOp})));
  const dias = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);
  const fica = poco.ops.slice(1);
  conf(novos.length === fica.length && novos[0].date === '2027-05-10' && novos.every((x, i) => x.tipo === fica[i].tipo && dias(novos[0].date, x.date) === dias(fica[0].date, fica[i].date)), 'cria só as ' + fica.length + ' marcadas; a 1ª marcada em 10/05/2027 e as outras na mesma distância', {novos, fica});

  /* ---------------------------------------------------------------- 5. tipos de operação */
  console.log('5. Tipos de operação');
  await p.click('button:has-text("+ Nova operação")');
  await p.waitForSelector('.eng-modal');
  const tipos = await fld(p, 'Tipo de operação').locator('select option').allTextContents();
  conf(tipos.includes('Entrega de Cimento/Blend') && tipos.includes('Perfuração') && tipos.indexOf('Entrega de Cimento/Blend') < tipos.indexOf('Outros'), 'a lista tem “Entrega de Cimento/Blend” e “Perfuração”', tipos);
  await fld(p, 'Sonda').locator('select').selectOption({index: 1});
  await fld(p, 'Poço').locator('input').fill('7-ENTREGA-1-RJS');
  await fld(p, 'Data prevista').locator('input').fill('2026-11-30');
  await fld(p, 'Tipo de operação').locator('select').selectOption({label: 'Entrega de Cimento/Blend'});
  await p.locator('.eng-modal button.btn-r', {hasText: /^Salvar$/}).click();
  await p.waitForTimeout(500);
  const ent = await p.evaluate(() => loadDB().plannedJobs.find(j => j.well === '7-ENTREGA-1-RJS'));
  conf(ent && ent.tipoOp === 'Entrega de Cimento/Blend' && ent.date === '2026-11-30', 'operação salva com o tipo “Entrega de Cimento/Blend”', ent && {tipo: ent.tipoOp, date: ent.date});

  /* ---------------------------------------------------------------- 7. cor da sonda na barra */
  console.log('7. Cor da sonda na barra (faixa de baixo na cor da legenda)');
  await p.click('.db-tab:has-text("Gantt")');
  await p.waitForSelector('.eng-gl');
  // uma sonda com uma barra larga (com o texto do poço dentro)
  const comTexto = () => p.evaluate(() => { const b = [...document.querySelectorAll('.eng-gl [data-pj]')].find(x => [...x.querySelectorAll('span')].some(s => !s.className && s.textContent.trim())); return b ? b.closest('.eng-gl').getAttribute('data-rig') : ''; });
  for (let i = 0; i < 6 && !(await comTexto()); i++) { await p.click('button[title="Esticar a linha do tempo (o painel passa a rolar)"]').catch(() => {}); await p.waitForTimeout(150); }
  conf(await p.locator('.eng-lgd .eng-lgd-sonda').count() === 1, 'a legenda explica a cor da sonda (barra) e a faixa de baixo (situação)');
  const rid = (await comTexto()) || await p.getAttribute('.eng-gl >> nth=0', 'data-rig');
  const gRig = '.eng-gl[data-rig="' + rid + '"] .eng-rig-cor-b';
  const opsRig = await p.evaluate(r => { const l = [...document.querySelectorAll('.eng-gl[data-rig="' + r + '"] [data-pj]')]; l.sort((a, b) => ([...b.querySelectorAll('span')].some(s => !s.className && s.textContent.trim()) ? 1 : 0) - ([...a.querySelectorAll('span')].some(s => !s.className && s.textContent.trim()) ? 1 : 0)); return l.map(b => b.getAttribute('data-pj')); }, rid);
  const outra = await p.evaluate(r => { const b = [...document.querySelectorAll('.eng-gl:not([data-rig="' + r + '"]) [data-pj]')][0]; return b ? b.getAttribute('data-pj') : ''; }, rid);
  const antes = await estiloBarra(p, opsRig[0]);
  await p.click(gRig);
  await p.waitForSelector('.eng-cor-pop');
  conf(/Cor da sonda/.test(await p.textContent('.eng-cor-pop')) && await p.locator('.eng-cor-input').count() === 1, 'a janelinha da cor da sonda tem a paleta e “Outra cor”');
  await p.click('.eng-cor-sw[data-cor="#2E86DE"]');
  await p.waitForTimeout(300);
  const dep = await estiloBarra(p, opsRig[0]);
  const fora = await estiloBarra(p, outra);
  conf(dep.bg === 'rgb(46, 134, 222)' && dep.sh.includes(antes.bg) && /inset/.test(dep.sh) && dep.txt === 'rgb(255, 255, 255)', 'a barra fica azul (cor da sonda) e a faixa de baixo na cor da situação de antes (' + antes.bg + ')', {antes, dep});
  conf(!fora || (fora.bg !== 'rgb(46, 134, 222)' && !/inset/.test(fora.sh)), 'as barras das outras sondas não mudam', fora);
  await p.click(gRig);
  await p.click('.eng-cor-sw[data-cor="#F1C40F"]');
  await p.waitForTimeout(300);
  conf((await estiloBarra(p, opsRig[0])).txt === 'rgb(30, 34, 36)', 'cor clara (amarelo): o texto da barra fica escuro, para ler');
  await p.click(gRig);
  await p.evaluate(() => { const i = document.querySelector('.eng-cor-input'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, '#7a1fa2'); i.dispatchEvent(new Event('input', {bubbles: true})); });
  await p.waitForTimeout(300);
  const cust = await p.evaluate(r => JSON.parse(localStorage.getItem('eng_cores_sonda_v1') || '{}')[r], rid);
  conf(cust === '#7A1FA2' && (await estiloBarra(p, opsRig[0])).bg === 'rgb(122, 31, 162)' && await p.locator('.eng-cor-pop').count() === 1, '“Outra cor”: qualquer cor (#7A1FA2), sem fechar a janelinha', cust);
  await p.click('.eng-cor-sw[data-cor="#2E86DE"]');
  await p.waitForTimeout(300);

  /* ---------------------------------------------------------------- 6. calendário */
  console.log('6. Calendário: o tipo no dia e a janela do dia');
  const alvo = await p.evaluate(() => { const d = loadDB(); const at = new Set(d.contratos.filter(c => !c.archived).map(c => c.id)); const l = d.plannedJobs.filter(j => at.has(j.contratoId) && j.status !== 'CANCELADA' && j.well && j.date >= '2026-11-01' && j.date <= '2026-12-31').sort((a, b) => a.date.localeCompare(b.date)); const j = l[0]; const dia = j.date; const doDia = d.plannedJobs.filter(x => at.has(x.contratoId) && x.status !== 'CANCELADA' && pjDays(x).includes(dia)); return {id: j.id, dia, well: j.well, tipo: tipoTxt(j) || j.tipoOp, rig: j.rigId, n: doDia.length, ids: doDia.map(x => x.id).sort()}; });
  await p.click('.db-tab:has-text("Calendário")');
  await p.waitForTimeout(300);
  if (alvo.dia.slice(0, 7) === '2026-12') { await p.click('button.btn-o:text-is("›")'); await p.waitForTimeout(200); }
  const diaN = String(+alvo.dia.slice(8, 10));
  const cel = p.locator('div[title="Ver as operações deste dia (clique numa para editar)"]', {has: p.locator('span', {hasText: new RegExp('^' + diaN + '$')})}).first();
  const celula = cel.locator('xpath=..');
  const tiposCel = await celula.locator('.eng-cal-tipo').allTextContents();
  conf(tiposCel.includes(alvo.tipo), 'no dia ' + alvo.dia.split('-').reverse().join('/') + ', a operação mostra o tipo (' + alvo.tipo + ')', tiposCel);
  const chip = await celula.evaluate((c, w) => { const x = [...c.querySelectorAll('div[title]')].find(d => d.textContent.includes(w)); if (!x) return null; const s = getComputedStyle(x); return {bg: s.backgroundColor, sh: s.boxShadow}; }, alvo.well);
  const rigAlvoAzul = alvo.rig === rid;
  conf(chip && (rigAlvoAzul ? chip.bg === 'rgb(46, 134, 222)' && /inset/.test(chip.sh) : !/inset/.test(chip.sh)), rigAlvoAzul ? 'no calendário, a operação da sonda azul fica azul com a faixa da situação embaixo' : 'no calendário, operação de sonda sem cor fica como antes (cor da legenda)', chip);
  await cel.click();
  await p.waitForSelector('.eng-dia-modal');
  const idsModal = (await p.$$eval('.eng-dia-op', l => l.map(b => b.getAttribute('data-dia-pj')))).sort();
  conf(JSON.stringify(idsModal) === JSON.stringify(alvo.ids), '“abrir” mostra só as ' + alvo.n + ' operação(ões) daquele dia', {idsModal, esperado: alvo.ids});
  conf(!(await p.locator('text=Na base').count()) && !(await p.locator('text=Frentes e atividades').count()), 'sem “Frentes e atividades” nem “Na base” (só as operações)');
  await p.locator('.eng-dia-op[data-dia-pj="' + alvo.id + '"]').click();
  await p.waitForSelector('.eng-modal');
  const tit = await p.evaluate(() => document.querySelector('.eng-modal').innerText.slice(0, 300));
  conf(!(await p.locator('.eng-dia-modal').count()) && tit.includes(alvo.well), 'clicar na operação abre a janela dela para editar', tit.slice(0, 120));
  await p.click('.eng-modal button:has-text("Cancelar")');
  await cel.click();
  await p.waitForSelector('.eng-dia-modal');
  await p.click('.eng-dia-nova');
  await p.waitForSelector('.eng-modal');
  conf(await fld(p, 'Data prevista').locator('input').inputValue() === alvo.dia, '“+ Nova operação neste dia” já vem com a data do dia');
  await p.click('.eng-modal button:has-text("Cancelar")');

  /* ---------------------------------------------------------------- 1c. contrato arquivado: fora da lista e do nome (e20) */
  console.log('1c. Contrato arquivado não entra no nome do arquivo');
  await p.click('.nav-back-btn');
  await p.evaluate(() => { const d = loadDB(); d.contratos.find(c => c.id === 'ct_demo_bp').archived = true; saveDB(d); });
  await p.reload(); await p.waitForSelector('.eng2-card', {timeout: 90000});
  const nArq = await p.evaluate(() => loadDB().contratos.filter(c => c.archived).length);
  await p.click('.eng-tools .eng-exportar');
  await p.waitForSelector('.eng-expsel');
  const nomesArq = (await p.locator('.eng-expsel-nome code').allTextContents()).sort();
  conf(await p.locator('.eng-expsel-tab tbody tr').count() === 2 && JSON.stringify(nomesArq) === JSON.stringify([NOMES3[1], NOMES3[2]]), 'BP arquivado: a lista e os arquivos só com os 2 ativos (' + nArq + ' arquivados ficam de fora)', nomesArq);
  conf(new RegExp(nArq + ' contrato\\(s\\) arquivado').test(await p.textContent('.eng-expsel')), 'a janela avisa que os arquivados não aparecem nem são exportados');
  await p.click('.eng-expsel button:has-text("Cancelar")');
  await p.evaluate(() => { const d = loadDB(); d.contratos.find(c => c.id === 'ct_demo_bp').archived = false; saveDB(d); });
  await p.reload(); await p.waitForSelector('.eng2-card', {timeout: 90000});

  /* ---------------------------------------------------------------- 1d. importar vários arquivos de uma vez (e20) */
  console.log('1d. Importar vários arquivos .json de uma vez');
  conf(await p.getAttribute('.eng-tools input[type=file]', 'multiple') !== null, 'o “⬆ Importar dados” aceita vários arquivos');
  const arqPA = arqs.find(f => /P&A/.test(f)), arqTK = arqs.find(f => /TAKATSUGU/.test(f));
  // uma exportação mais nova do P&A (outra pessoa, depois): no mesmo contrato, fica a mais recente
  const novoPA = JSON.parse(fs.readFileSync(arqPA, 'utf8'));
  novoPA.geradoEm = '2026-11-27T15:00:00.000Z';
  novoPA.db.plannedJobs.forEach(j => { j.notes = 'versão mais nova'; });
  const arqPA2 = path.join(TMP, 'EARL_FORECAST_PETROBRAS_P&A-MACAE-OFFSHORE_2026.11.27_15h00.json');
  fs.writeFileSync(arqPA2, JSON.stringify(novoPA));
  const espTK = await p.evaluate(() => loadDB().plannedJobs.filter(j => j.contratoId === 'ct_demo_tk').length);
  // aqui: sem o Takatsugu J (como num computador que ainda não tem esse contrato)
  await p.evaluate(() => { const d = loadDB(); const ops = new Set(d.plannedJobs.filter(j => j.contratoId === 'ct_demo_tk').map(j => j.id)); d.contratos = d.contratos.filter(c => c.id !== 'ct_demo_tk'); d.plannedJobs = d.plannedJobs.filter(j => !ops.has(j.id)); d.handovers = (d.handovers || []).filter(h => !(h.opIds || []).some(i => ops.has(i))); d.invSondas = (d.invSondas || []).filter(v => v.ctId !== 'ct_demo_tk'); saveDB(d); });
  await p.reload(); await p.waitForSelector('.eng2-card', {timeout: 90000});
  await p.setInputFiles('.eng-tools input[type=file]', [arqPA2, arqTK, arqPA]);
  await p.waitForSelector('.ec-imp-dados');
  const telaV = await p.innerText('.ec-imp-dados');
  conf(await p.locator('.ec-imp-ct-cb').count() === 3 && await p.locator('.ec-imp-ct-cb:checked').count() === 3 && /Arquivos \(3\)/i.test(telaV), 'os 3 arquivos na mesma janela: os contratos de todos, marcados', telaV.slice(0, 300));
  const linPAantigo = await p.locator('.ec-imp-cts tbody tr').filter({has: p.locator('td.ec-imp-arqnome[title^="' + path.basename(arqPA) + '"]')}).innerText(); // a coluna Arquivo mostra o nº; o nome fica no título
  conf(/repetido: fica o do arquivo 3 \(mais recente\)/.test(linPAantigo) && /Importar 2 contrato/.test(await p.textContent('.ec-importar')), 'o P&A está em 2 arquivos: o mais antigo mostra “repetido: fica o do arquivo mais recente”; importa 2 contratos', linPAantigo);
  conf(/entra como contrato novo|saem 0 operação/.test(await p.locator('.ec-imp-cts tbody tr', {hasText: 'Takatsugu J'}).innerText()), 'o Takatsugu J (que aqui só existe arquivado, sem operações) entra');
  const carregouV = p.waitForEvent('load', {timeout: 60000});
  await p.click('.ec-importar');
  await p.locator('.modal button', {hasText: 'Substituir e importar'}).click();
  await carregouV;
  await p.waitForSelector('.eng2-card', {timeout: 90000});
  const depV = await p.evaluate(() => { const d = loadDB(); const pa = d.contratos.filter(c => !c.archived && c.name === 'P&A — Macaé (offshore)'); const tk = d.contratos.find(c => !c.archived && c.name === 'Takatsugu J'); return {nPA: pa.length, notasPA: [...new Set(d.plannedJobs.filter(j => pa[0] && j.contratoId === pa[0].id).map(j => j.notes || ''))], tk: !!tk, opsTK: tk ? d.plannedJobs.filter(j => j.contratoId === tk.id).length : 0}; });
  conf(depV.nPA === 1 && depV.notasPA.join() === 'versão mais nova' && depV.tk && depV.opsTK === espTK, 'depois de importar: o P&A da exportação mais nova (sem duplicar) e o Takatsugu J com as ' + espTK + ' operações', depV);
  conf(/Importado ✓/.test(await p.textContent('body')), 'aviso depois de importar');

  /* ---------------------------------------------------------------- 1b. um contrato só: exporta direto */
  console.log('1b. Com um contrato só, exporta direto');
  await p.evaluate(() => { const d = loadDB(); const tk = d.contratos.find(c => !c.archived && c.name === 'Takatsugu J'); d.contratos.forEach(c => { if (c !== tk) c.archived = true; }); saveDB(d); });
  await p.reload(); await p.waitForSelector('.eng2-card', {timeout: 90000});
  const um = await baixar(p, () => p.click('.eng-tools .eng-exportar'));
  conf(path.basename(um) === NOMES3[1] && !(await p.locator('.eng-expsel').count()), 'sem perguntar, com o nome do contrato: ' + path.basename(um));

  conf(!E.errs.length, 'nenhum erro de JavaScript', E.errs.slice(0, 3));
  await E.browser.close();
  console.log('\n%d ok, %d falha(s)', ok, falhas);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
