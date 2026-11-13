// EARL Engenharia e13: logo do cliente — clicar na logo (ou nas iniciais) no topo do contrato abre a janela para
// inserir, trocar ou tirar a logo; ela aparece no card da página inicial, no topo do contrato e nas operações e vale
// para todos os contratos do cliente.
// Uso: node tests/e2e_e13.js [EARL_Engenharia.html] [pasta das telas]
const {abrir} = require('./harness');
const fs = require('fs');
const path = require('path');
const ARQ = process.argv[2] || path.join(__dirname, '..', 'EARL_Engenharia.html');
const SHOTS = process.argv[3] || '';
if (SHOTS) fs.mkdirSync(SHOTS, {recursive: true});
let ok = 0, falhas = 0;
const conf = (cond, msg, extra) => {
  if (cond) { ok++; console.log('  ✓ ' + msg); } else { falhas++; console.log('  ✗ ' + msg + (extra !== undefined ? ' → ' + JSON.stringify(extra).slice(0, 400) : '')); }
};
const foto = async (page, nome) => { if (SHOTS) await page.screenshot({path: path.join(SHOTS, nome + '.png')}); };

(async () => {
  const {browser, page, errs} = await abrir(ARQ, {h: 1000, hoje: '2026-11-13'});
  await page.waitForSelector('.eng2-card', {timeout: 60000});
  conf(/e13/.test(await page.evaluate(() => EARL_VERSION)), 'versão e13');
  const card = '.eng2-card:has-text("Takatsugu J")';
  conf(await page.locator(card + ' .cmark.mono').count() === 1, 'antes: o card da Takatsugu J (Etesco) mostra as iniciais');

  console.log('Inserir a logo ao abrir o contrato');
  await page.click(card);
  await page.waitForSelector('.eng2-ctbar .eng-logo-btn');
  conf(await page.locator('.eng2-ctbar .eng-logo-btn .cmark.mono').count() === 1 && await page.locator('.eng2-ctbar .eng-logo-ed').count() === 1, 'topo do contrato: as iniciais viram botão, com o lápis no canto');
  conf(/Etesco/.test(await page.getAttribute('.eng2-ctbar .eng-logo-btn', 'title')), 'dica: “Inserir ou trocar a logo do cliente Etesco”');
  await page.click('.eng2-ctbar .eng-logo-btn');
  await page.waitForSelector('.eng-logo-modal');
  const m1 = await page.innerText('.eng-logo-modal');
  conf(/Logo do cliente/.test(m1) && /Etesco/.test(m1) && /Sem logo/.test(m1) && /Takatsugu J/.test(m1) && /Inserir a logo/.test(m1), 'janela “Logo do cliente”: Etesco, sem logo, vale para o contrato Takatsugu J', m1.slice(0, 300));
  // imagem PNG grande (1000 × 600): vira no máximo 240 px
  const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 1000; c.height = 600; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 1000, 600); g.fillStyle = '#1B6AB3'; g.fillRect(100, 100, 800, 400); return c.toDataURL('image/png').split(',')[1]; });
  let fc = page.waitForEvent('filechooser');
  await page.click('.eng-logo-escolher');
  await (await fc).setFiles({name: 'etesco_logo.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64')});
  await page.waitForSelector('.eng-logo-modal', {state: 'detached'});
  await page.waitForTimeout(300);
  const L = await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('hal_cmt_db_v1')); const l = (d.clientLogos || {})[normNome('Etesco')]; return l && {arq: l.arquivo, png: /^data:image\/png/.test(l.src), tam: l.src.length}; });
  conf(L && L.arq === 'etesco_logo.png' && L.png, 'logo gravada (clientLogos do cliente Etesco)', L);
  const dim = await page.evaluate(() => new Promise(r => { const d = JSON.parse(localStorage.getItem('hal_cmt_db_v1')); const i = new Image(); i.onload = () => r([i.width, i.height]); i.src = d.clientLogos[normNome('Etesco')].src; }));
  conf(dim[0] === 240 && dim[1] === 144, 'imagem reduzida para 240 px (ocupa pouco espaço)', dim);
  // e13: os dados ficam comprimidos no navegador (os arquivos abertos do disco dividem o mesmo espaço)
  const Z = await page.evaluate(() => { const A = window.EARL_ARMAZ; const raw = A.G.call(localStorage, A.P + 'hal_cmt_db_v1'); const js = localStorage.getItem('hal_cmt_db_v1'); return {comp: raw.charCodeAt(0) === 0x2603, raw: raw.length, json: js.length, ok: JSON.parse(js).contratos.length > 0}; });
  conf(Z.comp && Z.ok && Z.raw * 4 < Z.json, 'dados gravados comprimidos: ' + Z.raw + ' em vez de ' + Z.json + ' caracteres (o app lê normalmente)', Z);
  conf(await page.locator('.eng2-ctbar .eng-logo-btn .cmark.logo img').count() === 1, 'topo do contrato: a logo no lugar das iniciais');
  await foto(page, 'e13_1_topo');
  await page.click('.nav-back-btn');
  await page.waitForSelector(card);
  conf(await page.locator(card + ' .cmark.logo img').count() === 1, 'página inicial: o card mostra a logo');
  await foto(page, 'e13_2_card');

  console.log('Trocar (SVG), continuar depois de recarregar e tirar');
  await page.click(card);
  await page.click('.eng2-ctbar .eng-logo-btn');
  await page.waitForSelector('.eng-logo-modal');
  conf(/Logo enviada \(etesco_logo\.png\)/.test(await page.innerText('.eng-logo-modal')) && /Trocar a logo/.test(await page.innerText('.eng-logo-escolher')), 'janela mostra “Logo enviada (etesco_logo.png)” e “Trocar a logo”');
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="#CC0000"/></svg>';
  fc = page.waitForEvent('filechooser');
  await page.click('.eng-logo-escolher');
  await (await fc).setFiles({name: 'etesco.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(svg)});
  await page.waitForSelector('.eng-logo-modal', {state: 'detached'});
  conf(await page.evaluate(() => /^data:image\/svg/.test(JSON.parse(localStorage.getItem('hal_cmt_db_v1')).clientLogos[normNome('Etesco')].src)), 'SVG aceito como está');
  // arquivo que não é imagem
  await page.click('.eng2-ctbar .eng-logo-btn');
  fc = page.waitForEvent('filechooser');
  await page.click('.eng-logo-escolher');
  await (await fc).setFiles({name: 'nota.txt', mimeType: 'text/plain', buffer: Buffer.from('oi')});
  await page.waitForSelector('.eng-logo-erro');
  conf(/arquivo de imagem/.test(await page.innerText('.eng-logo-erro')), 'arquivo que não é imagem: aviso, nada muda');
  await page.click('.eng-logo-modal .modal-close');
  await page.reload();
  await page.waitForSelector(card);
  conf(await page.locator(card + ' .cmark.logo img').count() === 1, 'depois de recarregar a página a logo continua');
  // outro cliente com logo padrão do EARL (Petrobras): a janela diz que é a padrão e não oferece tirar
  await page.click('.eng2-card:has-text("P&A — Macaé")');
  await page.click('.eng2-ctbar .eng-logo-btn');
  await page.waitForSelector('.eng-logo-modal');
  conf(/Logo padrão do EARL/.test(await page.innerText('.eng-logo-modal')) && await page.locator('.eng-logo-tirar').count() === 0, 'Petrobras: “Logo padrão do EARL” (pode trocar; não há o que tirar)');
  await page.click('.eng-logo-modal .modal-close');
  await page.click('.nav-back-btn');
  await page.click(card);
  await page.click('.eng2-ctbar .eng-logo-btn');
  await page.click('.eng-logo-tirar');
  await page.waitForSelector('.eng-logo-modal', {state: 'detached'});
  conf(await page.locator('.eng2-ctbar .eng-logo-btn .cmark.mono').count() === 1 && await page.evaluate(() => !JSON.parse(localStorage.getItem('hal_cmt_db_v1')).clientLogos[normNome('Etesco')]), '“Tirar”: volta às iniciais');

  console.log('Celular');
  await page.setViewportSize({width: 390, height: 844});
  await page.click('.eng2-ctbar .eng-logo-btn');
  const bx = await page.$eval('.eng-logo-modal', m => { const r = m.getBoundingClientRect(); return {l: r.left, r: r.right, w: document.documentElement.clientWidth}; });
  conf(bx.l >= 0 && bx.r <= bx.w, 'janela cabe no celular', bx);
  conf(errs.length === 0, 'nenhum erro de JavaScript', errs.slice(0, 3));
  console.log('\n' + ok + ' ok, ' + falhas + ' falha(s)');
  await browser.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
