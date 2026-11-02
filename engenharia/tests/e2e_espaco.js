// Teste do "Espaço do navegador" (e6). No Chrome/Edge, todos os HTML abertos do disco dividem o mesmo
// localStorage (~5 milhões de caracteres). Com o espaço quase cheio de simulações antigas do EARL:
//   - aviso na página inicial; gravação recusada com a mensagem certa;
//   - tela que mostra quem ocupa o espaço e apaga só simulação/teste; depois disso a gravação volta;
//   - com o armazenamento bloqueado (arquivo aberto numa pré-visualização), o app abre e avisa.
// Uso: node tests/e2e_espaco.js [EARL_Engenharia.html] [pasta das telas]
const {chromium} = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ARQ = path.resolve(process.argv[2] || path.join(__dirname, '..', 'EARL_Engenharia.html'));
const SHOTS = process.argv[3] || '';
let ok = 0, falhas = 0;
const conf = (cond, msg, extra) => {
  if (cond) { ok++; console.log('  ✓ ' + msg); } else { falhas++; console.log('  ✗ ' + msg + (extra !== undefined ? ' → ' + JSON.stringify(extra) : '')); }
};
if (SHOTS) fs.mkdirSync(SHOTS, {recursive: true});
const foto = async (page, nome) => { if (SHOTS) await page.screenshot({path: path.join(SHOTS, nome + '.png')}); };
const txt = async (page, sel) => (await page.innerText(sel)).replace(/\s+/g, ' ').trim();
const BRANCO = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'esp-')), 'branco.html');
fs.writeFileSync(BRANCO, '<!doctype html><title>outro arquivo do disco</title>');

async function contexto(init) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
  await ctx.route(/^https?:\/\//, r => r.abort());
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date('2026-11-02T12:00:00'));
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  return {browser, page, errs};
}
const salvarQuimico = async (page, sap, valor) => {
  await page.click('.eng-quimicos');
  await page.waitForSelector('.ec-quim-tab');
  await page.locator('.ec-quim-tab tbody tr[data-sap="' + sap + '"] input.ec-q-usd').fill(valor);
  await page.click('.ec-quim-salvar');
  await page.waitForTimeout(300);
  await page.click('.ec-quim-modal .modal-close');
};

(async () => {
  console.log('Espaço quase cheio');
  const {browser, page, errs} = await contexto();
  // outro arquivo do disco enche o espaço com duas simulações antigas, o Gerencial e o EARL completo
  await page.goto('file://' + BRANCO);
  await page.evaluate(() => {
    localStorage.setItem('earlsim113:hal_cmt_db_v1', 'x'.repeat(2600000));
    localStorage.setItem('earlsim114:hal_cmt_db_v1', 'x'.repeat(2350000));
    localStorage.setItem('earlger:earl_ger_pacotes', 'x'.repeat(60000));
    localStorage.setItem('hal_cmt_db_v1', 'x'.repeat(40000));
  });
  await page.goto('file://' + ARQ);
  await page.waitForSelector('.eng-tools', {timeout: 60000});
  conf(/quase cheio \(9\d%\)/.test(await txt(page, '.ec-esp-aviso')), 'página inicial avisa: espaço quase cheio', await txt(page, '.ec-esp-aviso'));
  await salvarQuimico(page, '100003837', '12');
  conf(await page.getByText('O navegador recusou a gravação e esta alteração NÃO foi salva neste computador').count() > 0, 'gravação recusada: mensagem certa (sem falar de Granéis & HCl)');
  conf(/espaço do navegador está cheio: o que foi lançado não está sendo salvo/.test(await txt(page, '.ec-esp-aviso')), 'aviso passa a “cheio: o que foi lançado não está sendo salvo”');
  await foto(page, 'e1_aviso');

  console.log('Tela “Espaço do navegador”');
  await page.click('.ec-esp-abrir');
  await page.waitForSelector('.ec-esp-tab');
  const linhas = await page.$$eval('.ec-esp-tab tbody tr', l => l.map(r => ({g: r.dataset.g, nome: r.querySelector('b').textContent, apaga: !!r.querySelector('.ec-esp-apagar')})));
  const por = Object.fromEntries(linhas.map(l => [l.g, l]));
  conf(por['earlsim113:'] && por['earlsim113:'].nome === 'EARL — simulação v113' && por['earlsim113:'].apaga && por['earlsim114:'].apaga, 'simulações antigas aparecem com “Apagar”', linhas);
  conf(por['earleng:'] && /este arquivo/.test(por['earleng:'].nome) && !por['earleng:'].apaga && !por['earlger:'].apaga && !por[''].apaga, 'Engenharia, Gerencial e EARL completo não se apagam por aqui');
  conf(/de ~5,24 mi de caracteres \(9\d%\)/.test(await txt(page, '.ec-esp-total')), 'total usado e % da cota', await txt(page, '.ec-esp-total'));
  await foto(page, 'e2_espaco');
  await page.click('.ec-esp-tab tr[data-g="earlsim113:"] .ec-esp-apagar');
  await page.click('.overlay .modal button.btn-r:has-text("Apagar")');
  await page.waitForTimeout(200);
  conf(!(await page.locator('.ec-esp-tab tr[data-g="earlsim113:"]').count()) && /\((4|5)\d%\)/.test(await txt(page, '.ec-esp-total')), 'simulação v113 apagada; o uso cai', await txt(page, '.ec-esp-total'));
  await page.click('.ec-esp-modal .modal-close');
  conf(!(await page.locator('.ec-esp-aviso').count()), 'o aviso da página inicial some');
  await salvarQuimico(page, '100003837', '12,5');
  await page.reload();
  await page.waitForSelector('.eng-tools');
  const d = await page.evaluate(() => ({q: JSON.parse(localStorage.getItem('hal_cmt_db_v1')).quimicos.find(x => x.sap === '100003837').usd, sim: Storage.prototype.getItem.length >= 0 && window.EARL_ARMAZ.G.call(localStorage, 'earlsim114:hal_cmt_db_v1').length, ger: window.EARL_ARMAZ.G.call(localStorage, 'earlger:earl_ger_pacotes').length, full: window.EARL_ARMAZ.G.call(localStorage, 'hal_cmt_db_v1').length}));
  conf(d.q === 12.5 && d.sim === 2350000 && d.ger === 60000 && d.full === 40000, 'depois de liberar, a gravação funciona e o resto continua intacto', d);
  conf(errs.length === 0, 'nenhum erro', errs.slice(0, 3));
  await browser.close();

  console.log('Armazenamento bloqueado (pré-visualização)');
  const B = await contexto(() => { Object.defineProperty(window, 'localStorage', {configurable: true, get() { throw new DOMException('The document is sandboxed and lacks the allow-same-origin flag.', 'SecurityError'); }}); });
  await B.page.goto('file://' + ARQ);
  await B.page.waitForSelector('.eng-tools', {timeout: 60000});
  conf(/não consegue guardar dados no navegador/.test(await txt(B.page, '.ec-esp-aviso')), 'o app abre e avisa que não consegue guardar os dados', await txt(B.page, '.ec-esp-aviso'));
  await foto(B.page, 'e3_bloqueado');
  conf(B.errs.length === 0, 'bloqueado: nenhum erro', B.errs.slice(0, 3));
  await B.browser.close();

  console.log(`\n${ok} ok, ${falhas} falha(s)`);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
