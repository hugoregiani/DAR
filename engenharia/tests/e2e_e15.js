// e15 (pedido do Hugo, 24/11/2026): exportar leva tudo (contratos e operações); importar contrato por contrato
// (o de mesmo nome é substituído, com as operações; o novo entra; os outros não mudam); apagar o contrato apaga tudo
// o que é dele e, no último, deixa o arquivo em branco.
// Uso: node tests/e2e_e15.js [EARL_Engenharia.html]
const {abrir, exportarDados} = require('./harness');
const {montar} = require('../walkthrough/demo');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ARQ = path.resolve(process.argv[2] || path.join(__dirname, '..', 'EARL_Engenharia.html'));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'earl-e15-'));
let ok = 0, falhas = 0;
const conf = (c, msg, extra) => { if (c) { ok++; console.log('  ✓ ' + msg); } else { falhas++; console.log('  ✗ ' + msg + (extra !== undefined ? ' → ' + JSON.stringify(extra).slice(0, 600) : '')); } };
const fechar = async p => { for (let i = 0; i < 4; i++) { const x = p.locator('.modal-close:visible'); if (!(await x.count())) break; await x.last().click(); await p.waitForTimeout(250); } };
const baixar = async (p, acao) => { const d = p.waitForEvent('download', {timeout: 20000}); await acao(); const x = await d; const f = path.join(TMP, x.suggestedFilename()); await x.saveAs(f); return f; };
const estado = p => p.evaluate(() => {
  const d = loadDB();
  const ops = c => d.plannedJobs.filter(j => j.contratoId === c.id);
  const ct = {};
  d.contratos.filter(c => !c.archived).forEach(c => { ct[c.name] = {id: c.id, ops: ops(c).length, wells: ops(c).map(j => j.well).sort().join(','), preco0: c.items[0] && (c.items[0].brl != null ? c.items[0].brl : c.items[0].usd), notas: ops(c).map(j => j.notes || '').filter(Boolean).join('|')}; });
  return {ct, arquivados: d.contratos.filter(c => c.archived).length, ops: d.plannedJobs.length, inv: (d.invSondas || []).map(v => v.ctId + ':' + v.data).sort(), cambio: (d.cambio || []).length, semCt: d.plannedJobs.filter(j => !d.contratos.some(c => c.id === j.contratoId)).length};
});
const importar = async (p, arq, desmarcar = []) => {
  await p.setInputFiles('.eng-tools input[type=file]', arq);
  await p.waitForSelector('.ec-imp-dados');
  for (const n of desmarcar) await p.locator('.ec-imp-cts tbody tr', {hasText: n}).first().locator('.ec-imp-ct-cb').uncheck();
  const tela = await p.locator('.ec-imp-dados').innerText();
  const carregou = p.waitForEvent('load', {timeout: 60000});
  await p.click('.ec-importar');
  await p.waitForTimeout(400);
  const conf2 = p.locator('.modal button', {hasText: 'Substituir e importar'});
  const pediu = await conf2.count() > 0;
  if (pediu) await conf2.click();
  await carregou;
  await p.waitForSelector('.eng2-card', {timeout: 90000});
  await p.waitForTimeout(800);
  return {tela, pediu};
};

(async () => {
  /* ---------------------------------------------------------------- arquivo A: exporta */
  console.log('Arquivo A: exportar tudo');
  const A = await abrir(ARQ, {hoje: '2026-11-24'});
  const pa = A.page;
  await pa.waitForSelector('.eng2-card', {timeout: 90000});
  await montar(pa);
  await pa.evaluate(() => {
    const d = loadDB();
    const PA = d.contratos.find(c => c.id === 'ct_demo_pa');
    PA.items[0].brl = 12345.67;
    d.plannedJobs.filter(j => j.contratoId === 'ct_demo_pa').forEach(j => { j.notes = 'veio do A'; });
    // contrato novo só no A
    const TK = d.contratos.find(c => c.id === 'ct_demo_tk');
    d.contratos.push({...JSON.parse(JSON.stringify(TK)), id: 'ct_novo_a', name: 'Contrato Novo do A', numero: 'NOVO-A'});
    d.plannedJobs.push(...d.plannedJobs.filter(j => j.contratoId === 'ct_demo_tk').slice(0, 2).map((j, i) => ({...JSON.parse(JSON.stringify(j)), id: 'novoA' + i, contratoId: 'ct_novo_a', well: 'NOVO-A-' + i})));
    // Takatsugu J com outro id no A (mesmo nome): tem de casar pelo nome
    d.contratos.find(c => c.id === 'ct_demo_tk').id = 'ct_tk_do_A';
    d.plannedJobs.filter(j => j.contratoId === 'ct_demo_tk').forEach(j => { j.contratoId = 'ct_tk_do_A'; j.notes = 'TK do A'; });
    d.cambio.push({ano: 2026, mes: 12, valor: 5.5, em: '2026-11-24T10:00:00.000Z', por: 'A'});
    saveDB(d);
  });
  await pa.reload(); await pa.waitForSelector('.eng2-card', {timeout: 60000});
  const EA = await estado(pa);
  const arqA = await baixar(pa, () => exportarDados(pa));
  const J = JSON.parse(fs.readFileSync(arqA, 'utf8'));
  conf(J.db && J.db.contratos && J.db.plannedJobs && J.db.invSondas && J.db.cambio && J.db.quimicos && J.db.casingEquip && J.db.rigs, 'exportar leva tudo: contratos, operações, inventário, câmbio, químicos, casing, sondas');
  conf((J.contratos || []).map(c => c.nome).sort().join('|') === Object.keys(EA.ct).sort().join('|') && J.contratos.find(c => c.nome.indexOf('P&A') === 0).operacoes === 7, 'o arquivo lista os contratos e as operações de cada um', J.contratos);
  conf(/exportados ✓ — 4 contrato\(s\)/.test(await pa.textContent('body')), 'aviso diz o que foi exportado (os 4 contratos marcados)');
  await A.browser.close();

  /* ---------------------------------------------------------------- arquivo B: importa */
  console.log('\nArquivo B: importar contrato por contrato');
  const B = await abrir(ARQ, {hoje: '2026-11-24'});
  const p = B.page;
  await p.waitForSelector('.eng2-card', {timeout: 90000});
  await montar(p);
  await p.evaluate(() => {
    const d = loadDB();
    // B tem o P&A diferente: menos operações, uma só dele, outro preço
    const PA = d.contratos.find(c => c.id === 'ct_demo_pa');
    PA.items[0].brl = 999;
    d.plannedJobs = d.plannedJobs.filter(j => !(j.contratoId === 'ct_demo_pa' && j.id > 'dm04'));
    d.plannedJobs.push({...JSON.parse(JSON.stringify(d.plannedJobs.find(j => j.contratoId === 'ct_demo_pa'))), id: 'so_do_B', well: 'SO-DO-B'});
    d.plannedJobs.filter(j => j.contratoId === 'ct_demo_bp').forEach(j => { j.notes = 'BP do B'; });
    saveDB(d);
  });
  await p.reload(); await p.waitForSelector('.eng2-card', {timeout: 60000});
  const EB = await estado(p);
  // 1) só o P&A
  const r1 = await importar(p, arqA, ['BP —', 'Takatsugu J', 'Contrato Novo do A']);
  conf(/substitui “P&A — Macaé \(offshore\)” daqui: saem 5 operação\(ões\), entram 7/.test(r1.tela), 'tela: o P&A daqui será substituído (saem 5, entram 7)', r1.tela.slice(0, 500));
  conf(r1.pediu, 'pede confirmação antes de substituir');
  const E1 = await estado(p);
  const PAn = 'P&A — Macaé (offshore)';
  conf(E1.ct[PAn].ops === 7 && E1.ct[PAn].wells === EA.ct[PAn].wells && !/SO-DO-B/.test(E1.ct[PAn].wells), 'P&A substituído: as 7 operações do arquivo (a que só existia no B saiu)', [E1.ct[PAn], EA.ct[PAn].wells]);
  conf(E1.ct[PAn].preco0 === 12345.67 && E1.ct[PAn].id === 'ct_demo_pa' && /veio do A/.test(E1.ct[PAn].notas), 'P&A com o contrato do arquivo (preço do A) e o mesmo id daqui', E1.ct[PAn]);
  conf(E1.ct['BP — Macaé (offshore)'].notas.indexOf('BP do B') >= 0 && E1.ct['BP — Macaé (offshore)'].ops === EB.ct['BP — Macaé (offshore)'].ops, 'BP (não marcado) não mudou', E1.ct['BP — Macaé (offshore)']);
  conf(!E1.ct['Contrato Novo do A'], 'contrato não marcado não entra');
  conf(E1.inv.filter(x => x.indexOf('ct_demo_pa') === 0).length === EA.inv.filter(x => x.indexOf('ct_demo_pa') === 0).length && E1.cambio === 5, 'inventário do P&A e câmbio (dez/26) vieram do arquivo', [E1.inv, E1.cambio]);
  conf(E1.semCt === 0, 'nenhuma operação sem contrato');
  conf(/Importado ✓ — P&A — Macaé \(offshore\) \(substituído: 7 operação/.test(await p.textContent('body')), 'aviso depois de importar');
  // 2) todos: Takatsugu J (mesmo nome, outro id) substitui; Contrato Novo entra
  const r2 = await importar(p, arqA);
  const E2 = await estado(p);
  conf(Object.keys(E2.ct).filter(n => n === 'Takatsugu J').length === 1 && E2.ct['Takatsugu J'].id === 'ct_demo_tk' && /TK do A/.test(E2.ct['Takatsugu J'].notas), 'Takatsugu J casado pelo NOME (outro id no arquivo): substituído, sem duplicar, mantendo o id daqui', E2.ct['Takatsugu J']);
  conf(E2.ct['Contrato Novo do A'] && E2.ct['Contrato Novo do A'].ops === 2, 'contrato novo entrou com as 2 operações', E2.ct['Contrato Novo do A']);
  conf(E2.ct['BP — Macaé (offshore)'].notas.indexOf('BP do B') < 0 && E2.ct['BP — Macaé (offshore)'].ops === EA.ct['BP — Macaé (offshore)'].ops, 'BP marcado: substituído pelo do arquivo', E2.ct['BP — Macaé (offshore)']);
  conf(/entra como contrato novo, com 2 operação/.test(r2.tela), 'tela: o contrato novo aparece como novo');
  // 3) importar de novo o mesmo arquivo não duplica
  await importar(p, arqA);
  const E3 = await estado(p);
  conf(JSON.stringify(E3.ct) === JSON.stringify(E2.ct) && E3.ops === E2.ops, 'importar de novo o mesmo arquivo não duplica nada', [E2.ops, E3.ops]);

  /* ---------------------------------------------------------------- apagar */
  console.log('\nApagar contratos até o arquivo ficar em branco');
  // pelo botão no topo do contrato
  await p.locator('.eng2-card', {hasText: 'P&A'}).first().click();
  await p.waitForSelector('.eng2-ctbar');
  conf(await p.locator('.eng2-ctbar-apagar').count() === 1, 'botão "🗑 Apagar contrato" no topo do contrato');
  await p.click('.eng2-ctbar-apagar');
  await p.locator('.modal textarea').fill('APAGAR');
  await p.locator('.modal button', {hasText: 'Apagar contrato e operações'}).click();
  await p.waitForTimeout(800);
  const E4 = await estado(p);
  conf(!E4.ct[PAn] && E4.semCt === 0 && !E4.inv.some(x => x.indexOf('ct_demo_pa') === 0), 'P&A apagado com as operações e o inventário dele', E4);
  conf(await p.locator('.eng2-card', {hasText: 'Visão geral'}).count() === 1, 'volta para a página inicial');
  // o P&A apagado volta se for importado de novo (e fica depois de reabrir)
  await importar(p, arqA, ['BP —', 'Takatsugu J', 'Contrato Novo do A']);
  await p.reload(); await p.waitForSelector('.eng2-card', {timeout: 60000});
  const E5 = await estado(p);
  conf(E5.ct[PAn] && E5.ct[PAn].ops === 7, 'contrato apagado e importado de novo volta e continua depois de reabrir', E5.ct[PAn]);
  // apagar todos pelo ⋯ do card
  for (const nome of Object.keys(E5.ct)) {
    const card = p.locator('.eng2-card', {hasText: nome}).first();
    await card.locator('.eng2-menu-b').click();
    await p.click('.eng2-menu-apagar');
    const ultimo = /É o último contrato/.test(await p.locator('.modal').last().innerText());
    if (await p.locator('.modal textarea').count()) await p.locator('.modal textarea').fill('APAGAR');
    await p.locator('.modal button', {hasText: /^Apagar contrato/}).last().click();
    await p.waitForTimeout(700);
    if (Object.keys(E5.ct).indexOf(nome) === Object.keys(E5.ct).length - 1) conf(ultimo, 'no último contrato o aviso diz que o arquivo fica em branco');
  }
  await p.reload(); await p.waitForSelector('.eng-tools', {timeout: 60000}); await p.waitForTimeout(1200);
  const E6 = await p.evaluate(() => { const d = loadDB(); return {cts: d.contratos.length, ops: d.plannedJobs.length, inv: (d.invSondas || []).length, ho: (d.handovers || []).length, tpl: (d.opTemplates || []).length}; });
  conf(E6.cts === 0 && E6.ops === 0 && E6.inv === 0 && E6.ho === 0, 'arquivo em branco: nenhum contrato (nem arquivado), nenhuma operação, inventário ou handover — também depois de reabrir', E6);
  conf(await p.locator('.eng2-card').count() === 1 && (await p.locator('.eng2-card').first().innerText()).indexOf('Visão geral') >= 0, 'página inicial só com a Visão geral');
  // arquivo em branco recebe o contrato pela importação
  await importar(p, arqA, ['BP —', 'Takatsugu J', 'Contrato Novo do A']);
  const E7 = await estado(p);
  conf(Object.keys(E7.ct).length === 1 && E7.ct[PAn].ops === 7, 'arquivo em branco: importar traz o contrato com as operações', E7.ct);
  conf(!B.errs.length, 'nenhum erro de JavaScript', B.errs.slice(0, 4));
  await B.browser.close();
  console.log('\n%d ok, %d falha(s)', ok, falhas);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
