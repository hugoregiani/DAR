// Capturas das telas do walkthrough (EARL Engenharia) com os dados de demonstração do demo.js.
// Uso: node capturar.js [passos separados por vírgula] [EARL_Engenharia.html]  — sem passos, captura tudo.
// Rode o passo 'consumo' separado (depois do 'handover' a faixa verde do e-mail fica na tela):
//   node capturar.js inicio,cards,matriz,logo,contratos,plano,novaop,handover,bancos,inventario,arquivos && node capturar.js consumo
const {chromium} = require('playwright');
const path = require('path');
const fs = require('fs');
const {montar} = require('./demo');
const OUT = path.join(__dirname, 'img');
const APP = process.argv[3] || path.join(__dirname, '..', 'EARL_Engenharia.html');
fs.mkdirSync(OUT, {recursive: true});
const SO = (process.argv[2] || '').split(',').filter(Boolean);
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}, deviceScaleFactor: 1.5, acceptDownloads: true, locale: 'pt-BR'});
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date('2026-11-13T12:00:00'));
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + path.resolve(APP));
  await page.waitForSelector('.eng2-card', {timeout: 60000});
  await montar(page);
  const shot = async (n, o) => { await page.waitForTimeout(500); await page.screenshot({path: path.join(OUT, n + '.jpg'), type: 'jpeg', quality: 82, ...(o || {})}); console.log('ok', n); };
  const passo = async (nome, fn) => { if (SO.length && !SO.includes(nome)) return; try { await fn(); } catch (e) { console.log('ERRO', nome, String(e).slice(0, 300)); await page.screenshot({path: path.join(OUT, 'erro_' + nome + '.jpg'), type: 'jpeg', quality: 60}); await page.keyboard.press('Escape').catch(() => {}); await page.keyboard.press('Escape').catch(() => {}); await fechar().catch(() => {}); const v = page.locator('.nav-back-btn'); if (await v.count()) await v.click().catch(() => {}); } };
  const fechar = async () => { for (let i = 0; i < 3; i++) { const x = page.locator('.modal-close:visible'); if (!(await x.count())) break; await x.last().click().catch(() => {}); await page.waitForTimeout(300); const c = page.locator('button:text-is("Fechar sem salvar"), button:text-is("Sair sem salvar")'); if (await c.count()) await c.first().click(); } };
  const inicio = async () => { await fechar(); if (await page.locator('.nav-back-btn').count()) { await page.click('.nav-back-btn'); await page.waitForTimeout(500); } };

  await passo('inicio', async () => {
    await page.waitForTimeout(1500);
    await shot('01_inicio');
    await page.evaluate(() => { const e = document.querySelector('.ec-ger-painel'); if (e) e.scrollIntoView({block: 'start'}); window.scrollBy(0, -20); });
    await page.waitForTimeout(1200);
    await shot('02_receita');
    await page.evaluate(() => window.scrollTo(0, 0));
  });
  await passo('cards', async () => {
    await page.evaluate(() => { const c = document.querySelector('.eng2-card'); c.scrollIntoView({block: 'start'}); window.scrollBy(0, -120); });
    await shot('01b_cards');
    await page.evaluate(() => window.scrollTo(0, 0));
  });
  await passo('matriz', async () => {
    const fr = await (await page.$('.ec-ger-frame')).contentFrame();
    const mx = await fr.evaluate(() => { const t = document.querySelector('.t-mx'); return t ? t.closest('.card').getBoundingClientRect().top : null; });
    await page.evaluate(mx => {
      const f = document.querySelector('.ec-ger-frame');
      let el = f.parentElement; while (el && !(el.scrollHeight > el.clientHeight + 5 && /auto|scroll/.test(getComputedStyle(el).overflowY))) el = el.parentElement;
      const sc = el || document.scrollingElement;
      const alvo = f.getBoundingClientRect().top + mx - 175;
      sc.scrollTop += alvo;
    }, mx);
    await page.waitForTimeout(700);
    await shot('02b_matriz');
    await page.evaluate(() => { document.querySelectorAll('*').forEach(e => { if (e.scrollTop) e.scrollTop = 0; }); window.scrollTo(0, 0); });
  });
  await passo('logo', async () => {
    await page.click('.eng2-card:has-text("Takatsugu J")');
    await page.waitForSelector('.eng2-ctbar .eng-logo-btn');
    await page.hover('.eng2-ctbar .eng-logo-btn');
    await page.click('.eng2-ctbar .eng-logo-btn');
    await page.waitForSelector('.eng-logo-modal');
    await shot('23_logo');
    await fechar();
    await inicio();
  });
  await passo('contratos', async () => {
    await page.click('.eng-tools button:has-text("Contratos")');
    await page.waitForSelector('.ec-lista');
    await shot('03_contratos');
    await page.click('.ec-row:has-text("P&A")');
    await page.waitForTimeout(800);
    await shot('04_contrato');
    await fechar();
  });
  await passo('plano', async () => {
    await page.click('.eng2-card:has-text("P&A")');
    await page.waitForTimeout(1500);
    await shot('05_gantt');
    await page.click('.db-tab:has-text("Lista")');
    await page.click('.eng-lista-todas').catch(() => {});
    await shot('06_lista');
    await page.click('.db-tab:has-text("Calendário")');
    await shot('07_calendario');
    await inicio();
  });
  const fld = rot => page.locator('.eng-modal .fld').filter({has: page.locator('label', {hasText: rot})}).first();
  const escolher = async (titulo, busca, qtds) => {
    const rp = page.locator('.eng-modal .rp').filter({has: page.locator('.rp-t', {hasText: titulo})});
    await rp.locator('.rp-btn').click();
    if (busca) await rp.locator('.rp-search').fill(busca);
    const itens = rp.locator('.rp-item input[type=checkbox]');
    for (let i = 0; i < qtds.length; i++) await itens.nth(i).check();
    await rp.locator('button', {hasText: 'Concluir seleção'}).click();
    const q = rp.locator('.rp-qty');
    const n = await q.count();
    for (let i = 0; i < qtds.length; i++) await q.nth(n - qtds.length + i).fill(String(qtds[i]));
  };
  await passo('novaop', async () => {
    await page.click('.eng2-card:has-text("P&A")');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("+ Nova operação")');
    await page.waitForSelector('.eng-modal');
    await fld('Sonda').locator('select').selectOption({label: 'NS-32 - Norbe VIII'});
    await fld('Poço').locator('input').fill('7-ABL-52-RJS');
    await fld('Data prevista').locator('input').fill('2026-11-24');
    await fld('Tipo de operação').locator('select').selectOption({label: 'Abandono'});
    await fld('Sales Order').locator('input').fill('460100110');
    await fld('Nº VIDA').locator('input').fill('100110');
    await page.click('.eng-modal .modal-title, .eng-modal h2, .eng-modal').catch(() => {});
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.waitForTimeout(400);
    await shot('08_nova_op');
    await escolher('Itens PPU', '', [1, 2]);
    await escolher('Químicas', 'HALAD-344', [250]);
    await escolher('Químicas', 'Classe G', [500]);
    await escolher('Casing', '', [2]);
    await escolher('Pessoal', '', [1, 2]);
    // um item PPU em contingência, com risco de 40%
    const rpP = page.locator('.eng-modal .rp').filter({has: page.locator('.rp-t', {hasText: 'Itens PPU'})});
    const l2 = rpP.locator('.rp-row:not(.rp-row-h)').nth(1);
    await l2.locator('input[type=checkbox]').first().check();
    await page.waitForTimeout(300);
    const ins = l2.locator('.rp-cont input:not([type=checkbox])');
    if (await ins.count()) { await ins.last().fill('40'); }
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.evaluate(() => { const r = [...document.querySelectorAll('.eng-modal .rp')].find(x => /Itens PPU/.test(x.querySelector('.rp-t').textContent)); r.scrollIntoView({block: 'start'}); });
    await page.waitForTimeout(400);
    await shot('09_recursos');
    await page.click('.eng-modal button:text-is("Salvar")');
    await page.waitForTimeout(800);
    await inicio();
  });
  await passo('handover', async () => {
    await page.click('.eng2-card:has-text("P&A")');
    await page.waitForTimeout(800);
    await page.click('.db-tab:has-text("Lista")');
    await page.click('.eng-lista-todas').catch(() => {});
    await page.locator('table.db-table tbody tr', {hasText: '7-ABL-40-RJS'}).locator('button', {hasText: 'Handover'}).click();
    await page.waitForTimeout(800);
    if (await page.locator('button:has-text("Continuar →")').count()) await page.click('button:has-text("Continuar →")');
    await page.waitForSelector('.ho-modal');
    await page.fill('.ho-coment', 'Embarcar o material até D-5. Conferir o saldo da NS-32 antes do embarque.');
    await page.waitForTimeout(400);
    await shot('10_handover');
    await page.locator('.ho-modal button', {hasText: 'Continuar para o e-mail'}).click();
    await page.waitForSelector('.hm-modal');
    const ja = await page.locator('.hm-tab tbody tr').count();
    if (ja >= 3) {
      await page.locator('.hm-tab tbody tr').nth(0).locator('input[type=checkbox]').nth(0).check();
      await page.locator('.hm-tab tbody tr').nth(1).locator('input[type=checkbox]').nth(0).check();
      await page.locator('.hm-tab tbody tr').nth(2).locator('input[type=checkbox]').nth(1).check();
    } else {
      for (const [e, b] of [['logistica.macae@exemplo.com', '＋ Para'], ['materiais.macae@exemplo.com', '＋ Para'], ['coordenacao.macae@exemplo.com', '＋ Cc']]) { await page.fill('.hm-novo', e); await page.click('.hm-add button:has-text("' + b + '")'); }
    }
    await page.fill('.hm-nome', 'Ana Ribeiro');
    await shot('11_email');
    await page.click('.hm-prev summary').catch(() => {});
    await page.waitForTimeout(600);
    await page.evaluate(() => { const p = document.querySelector('.hm-prev'); if (p) p.scrollIntoView({block: 'start'}); });
    await shot('11b_email_prev');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('.hm-gerar')]);
    console.log('eml', dl.suggestedFilename());
    await page.waitForTimeout(800);
    await inicio();
  });
  await passo('consumo', async () => {
    await page.click('.eng2-card:has-text("P&A")');
    await page.waitForTimeout(800);
    await page.click('.db-tab:has-text("Consumo e receita")');
    await page.waitForTimeout(1200);
    await shot('12_consumo_receita');
    await page.evaluate(() => { const t = document.querySelector('.ec-ops'); t.scrollIntoView({block: 'start'}); window.scrollBy(0, -140); });
    await page.click('.ec-ops thead th:nth-child(2) .etf-b');
    await page.waitForSelector('#etfPop');
    await shot('19_filtro');
    await page.keyboard.press('Escape');
    await page.locator('.ec-ops tbody tr', {hasText: '7-MRL-12-RJS'}).locator('button', {hasText: 'Consumo'}).click();
    await page.waitForSelector('.ec-cons');
    await page.waitForTimeout(600);
    await shot('13_lancar_consumo');
    await inicio();
  });
  await passo('bancos', async () => {
    await page.click('.eng-tools .eng-cambio'); await page.waitForSelector('.ec-cb-tab'); await shot('14_cambio'); await fechar();
    await page.click('.eng-tools .eng-quimicos'); await page.waitForSelector('.ec-quim-tab'); await shot('15_quimicos'); await fechar();
    await page.click('.eng-tools .eng-casing'); await page.waitForSelector('.ec-casdb-tab'); await shot('16_casing'); await fechar();
  });
  await passo('inventario', async () => {
    await page.click('.eng2-card:has-text("P&A")');
    await page.waitForTimeout(800);
    await page.click('.db-tab:has-text("Inventário das sondas")');
    await page.waitForTimeout(1000);
    await shot('17_inventario');
    await page.locator('.ei-card').first().locator('button', {hasText: 'Editar'}).click();
    await page.waitForTimeout(800);
    await shot('18_contagem');
    await inicio();
  });
  await passo('arquivos', async () => {
    await page.click('.eng-tools .eng-gerencial'); await page.waitForTimeout(800); await shot('20_gerencial'); await fechar();
    await page.click('.eng-tools .eng-planilhas'); await page.waitForTimeout(800); await shot('21_planilhas'); await fechar();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('.eng-tools .eng-exportar')]);
    const p = path.join(__dirname, 'dados_demo.json'); await dl.saveAs(p);
    await page.setInputFiles('.eng-tools input[type=file]', p);
    await page.waitForSelector('.ec-imp-dados');
    await page.waitForTimeout(500);
    await shot('22_importar');
    await fechar();
  });
  console.log('errs', errs);
  await browser.close();
})();
