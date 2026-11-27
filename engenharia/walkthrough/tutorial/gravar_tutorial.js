// Vídeo tutorial do EARL Engenharia (1/2): grava a tela do app sendo usado, com os dados de demonstração do ../demo.js.
// O cursor anda e clica, o que vai ser clicado fica destacado em vermelho e cada parte abre com um cartão. A legenda de
// cada passo NÃO fica sobre a tela: ela é guardada com o horário e entra numa faixa embaixo da tela no montar_tutorial.js.
// Grava pelo "screencast" do Chromium (quadros JPEG com o horário de cada um).
// Uso: node gravar_tutorial.js <pasta de saída> [EARL_Engenharia.html] [partes, ex.: 1,2,3]
//      RAPIDO=1 node gravar_tutorial.js ...   → só confere o roteiro (sem gravar, sem esperas)
const {chromium} = require('playwright');
const fs = require('fs');
const path = require('path');
const {montar} = require('../demo');

const OUT = path.resolve(process.argv[2] || path.join(__dirname, 'saida'));
const APP = path.resolve(process.argv[3] || path.join(__dirname, '..', '..', 'EARL_Engenharia.html'));
const SO = (process.argv[4] || '').split(',').filter(Boolean).map(Number);
const RAPIDO = !!process.env.RAPIDO;
const FR = path.join(OUT, 'quadros');
fs.mkdirSync(OUT, {recursive: true});
if (!RAPIDO) {
  fs.rmSync(FR, {recursive: true, force: true});
  fs.mkdirSync(FR, {recursive: true});
}
const IMG = p => 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
const LOGO = [process.env.EARL_LOGO, path.join(__dirname, 'earl_hd.png'), path.join(__dirname, '..', 'video', 'img', 'earl_hd.png')].find(p => p && fs.existsSync(p));
const EARL = LOGO ? IMG(LOGO) : '';
const W = 1440, H = 720; // × 4/3 = 1920 × 960 (a faixa da legenda, 1920 × 120, completa o 1080)

(async () => {
  // o DPR forçado no Chromium faz o screencast sair em 1920×960 de verdade (sem ele, sai 1440×720 e fica borrado ao ampliar)
  const browser = await chromium.launch({args: ['--force-device-scale-factor=1.3333333']});
  const ctx = await browser.newContext({viewport: {width: W, height: H}, deviceScaleFactor: 4 / 3, locale: 'pt-BR', acceptDownloads: true});
  await ctx.route(/^https?:\/\//, r => r.abort());
  await ctx.addInitScript({content: fs.readFileSync(path.join(__dirname, 'overlay.js'), 'utf8')});
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date('2026-11-13T12:00:00'));
  const erros = [];
  page.on('pageerror', e => erros.push(String(e)));
  await page.goto('file://' + APP);
  await page.waitForSelector('.eng2-card', {timeout: 90000});
  await montar(page);
  await page.addStyleTag({content: '#tut-cur{display:none!important}'});
  await page.waitForTimeout(1500);

  /* ---------------- gravação (screencast) ---------------- */
  const cdp = await ctx.newCDPSession(page);
  const quadros = [];
  let nq = 0, gravando = false, atraso = Infinity;
  const gravacoes = [];
  cdp.on('Page.screencastFrame', f => {
    cdp.send('Page.screencastFrameAck', {sessionId: f.sessionId}).catch(() => {}); // libera o próximo quadro já
    if (!gravando) return;
    const i = nq++;
    quadros.push({i, t: f.metadata.timestamp});
    atraso = Math.min(atraso, Date.now() / 1000 - f.metadata.timestamp); // relógio do quadro × relógio daqui
    gravacoes.push(fs.promises.writeFile(path.join(FR, 'q' + String(i).padStart(6, '0') + '.jpg'), Buffer.from(f.data, 'base64')));
  });

  /* ---------------- legenda (vai para a faixa de baixo) ---------------- */
  const eventos = [];
  let parte = {n: 0, nome: ''};
  const faixa = (tipo, texto) => eventos.push({w: Date.now() / 1000, tipo, n: parte.n, parte: parte.nome, texto: texto || ''});

  /* ---------------- ajudantes ---------------- */
  const esperar = ms => page.waitForTimeout(RAPIDO ? Math.min(ms, 250) : ms);
  let cx = 720, cy = 460;
  const cursor = []; // o cursor do vídeo é desenhado no montar_tutorial.js, a 30 qps, com estas posições
  const marcaCursor = (vis) => cursor.push({w: Date.now() / 1000, x: cx, y: cy, v: vis !== false});
  const mover = async (x, y, ms) => {
    const d = Math.hypot(x - cx, y - cy);
    const dur = RAPIDO ? 40 : (ms || Math.min(850, 320 + d * 0.42));
    const n = Math.max(RAPIDO ? 2 : 10, Math.round(dur / 16));
    const x0 = cx, y0 = cy;
    for (let i = 1; i <= n; i++) {
      const p = i / n, e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      cx = x0 + (x - x0) * e; cy = y0 + (y - y0) * e;
      marcaCursor();
      await page.mouse.move(cx, cy);
      await page.waitForTimeout(RAPIDO ? 1 : dur / n);
    }
    cx = x; cy = y;
    marcaCursor();
  };
  const legenda = async (texto, ms) => {
    faixa('leg', texto);
    const len = texto.replace(/<[^>]+>/g, '').length;
    await esperar(ms != null ? ms : 700 + len * 34);
  };
  const caixa = async loc => {
    await loc.waitFor({state: 'visible', timeout: 10000});
    // fora da tela ou coberto (ex.: pela barra fixa do contrato)? rolagem suave até o alvo, como uma pessoa faria
    const situacao = () => loc.evaluate(e => {
      const r = e.getBoundingClientRect();
      if (r.top < 8 || r.bottom > innerHeight - 8) return 'fora';
      const x = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 1), y = r.top + Math.min(r.height / 2, 12);
      const a = document.elementFromPoint(x, y);
      return !a || e.contains(a) || a.contains(e) || a.closest('#tut-dest,#tut-cur') ? 'ok' : 'coberto';
    });
    for (let k = 0, s = await situacao(); s !== 'ok' && k < 4; k++, s = await situacao()) {
      if (k === 0) await loc.evaluate(e => e.scrollIntoView({behavior: 'smooth', block: 'center'}));
      else await loc.evaluate(e => { // ainda coberto: rola o painel do alvo para o lado certo
        const r = e.getBoundingClientRect(), dy = r.top + r.height / 2 > innerHeight / 2 ? 200 : -200;
        let p = e.parentElement;
        while (p && !(p.scrollHeight > p.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(p).overflowY))) p = p.parentElement;
        (p || document.scrollingElement).scrollBy({top: dy, behavior: 'smooth'});
      });
      await page.waitForTimeout(RAPIDO ? 500 : 850);
    }
    let b = await loc.boundingBox();
    for (let k = 0; k < 15 && b; k++) { // espera a rolagem/animação parar
      await page.waitForTimeout(90);
      const c = await loc.boundingBox();
      if (c && Math.abs(c.x - b.x) < 0.5 && Math.abs(c.y - b.y) < 0.5) break;
      b = c;
    }
    if (!b) throw new Error('alvo não encontrado');
    const y0 = Math.max(b.y, 2), y1 = Math.min(b.y + b.height, H - 2), x0 = Math.max(b.x, 4), x1 = Math.min(b.x + b.width, W - 4);
    return {x: x0, y: y0, width: x1 - x0, height: Math.max(8, y1 - y0)};
  };
  const destacar = async (loc, ms = 1800, topo) => {
    let b;
    if (topo) { // só a parte de cima de um bloco alto, como está na tela
      b = await loc.boundingBox();
      b = {x: Math.max(b.x, 4), y: Math.max(b.y, 2), width: Math.min(b.width, W - 8), height: Math.min(topo, H - Math.max(b.y, 2) - 4)};
    } else b = await caixa(loc);
    await page.evaluate(r => window.__tut.destacar(r), b);
    await esperar(ms);
    await page.evaluate(() => window.__tut.destacar(null));
    await esperar(200);
  };
  const clicar = async (loc, texto, opt = {}) => {
    if (texto) await legenda(texto, opt.ler);
    const b = await caixa(loc);
    await page.evaluate(r => window.__tut.destacar(r), b);
    await esperar(opt.antes || 420);
    await mover(b.x + b.width / 2, b.y + b.height / 2);
    await esperar(180);
    const c = await loc.boundingBox(); // a tela mexeu no caminho (ex.: um aviso no topo sumiu)? corrige a mira
    if (c && (Math.abs(c.x - b.x) > 2 || Math.abs(c.y - b.y) > 2)) {
      await page.evaluate(r => window.__tut.destacar(r), c);
      await mover(c.x + c.width / 2, c.y + c.height / 2, 300);
      await esperar(150);
    }
    await page.mouse.down(); await page.waitForTimeout(70); await page.mouse.up();
    await page.evaluate(() => window.__tut.destacar(null));
    await esperar(opt.depois != null ? opt.depois : 650);
  };
  const digitar = async (loc, valor, texto, opt = {}) => {
    await clicar(loc, texto, {depois: 200, ...opt});
    await page.keyboard.press('Control+A');
    await page.keyboard.type(valor, {delay: RAPIDO ? 2 : (opt.delay || 65)});
    await esperar(opt.depois != null ? opt.depois : 550);
  };
  const escolher = async (loc, rotulo, texto) => {
    await clicar(loc, texto, {depois: 250});
    await loc.selectOption({label: rotulo});
    await esperar(700);
  };
  const preencher = async (loc, valor, texto) => { // datas (o campo de data não aceita digitar letra a letra)
    await clicar(loc, texto, {depois: 250});
    await loc.fill(valor);
    await esperar(700);
  };
  const rolar = async (loc, dy, passos = 10) => {
    const b = await loc.boundingBox();
    if (b) await mover(b.x + b.width / 2, Math.min(b.y + b.height / 2, H - 120), 450);
    for (let i = 0; i < passos; i++) { await page.mouse.wheel(0, dy / passos); await page.waitForTimeout(RAPIDO ? 5 : 40); }
    await esperar(600);
  };
  const arquivo = async (botao, nome, buffer, mime, texto, png) => {
    if (texto) await legenda(texto);
    const fc = page.waitForEvent('filechooser', {timeout: 10000});
    await clicar(botao, null, {depois: 200});
    const ch = await fc;
    await page.evaluate(([n, p]) => window.__tut.dialogo(n, p), [nome, !!png]);
    await esperar(1500);
    await page.evaluate(() => window.__tut.dialogo(null));
    await ch.setFiles({name: nome, mimeType: mime, buffer});
    await esperar(1100);
  };
  const N_PARTES = 12;
  const cartao = async (n, nome, sub) => {
    parte = {n, nome};
    faixa('card');
    marcaCursor(false);
    await page.evaluate(([n, nome, sub, tot]) => window.__tut.cartao('<div class="k">Parte <b>' + n + '</b> de ' + tot + '</div><h1>' + nome + '<i>.</i></h1><p>' + sub + '</p>', n / tot), [n, nome, sub, N_PARTES]);
    await esperar(3000);
    await page.evaluate(() => window.__tut.cartao(null));
    marcaCursor(true);
    faixa('vazio');
    await esperar(600);
  };
  const fecharTudo = async () => {
    for (let i = 0; i < 4; i++) {
      const x = page.locator('.modal-close:visible');
      if (!(await x.count())) break;
      await x.last().click().catch(() => {});
      await page.waitForTimeout(300);
      const c = page.locator('button:text-is("Fechar sem salvar"), button:text-is("Sair sem salvar")');
      if (await c.count()) await c.first().click().catch(() => {});
    }
  };
  const abrirContrato = async (nome, texto) => {
    const card = page.locator('.eng2-card', {hasText: nome}).first();
    await clicar(card, texto || 'Clique no card do contrato <b>' + nome + '</b> para abri-lo.');
    await page.waitForSelector('.eng2-ctbar');
    await esperar(900);
  };
  const aba = async (nome, texto) => { await clicar(page.locator('.db-tab', {hasText: nome}).first(), texto); await esperar(400); };
  const fld = rot => page.locator('.eng-modal .fld').filter({has: page.locator('label', {hasText: rot})}).first();
  const picker = tit => page.locator('.eng-modal .rp').filter({has: page.locator('.rp-t', {hasText: tit})});
  const escolherRecursos = async (tit, busca, qtds, texto) => {
    const rp = picker(tit);
    await clicar(rp.locator('.rp-btn'), texto);
    if (busca) await digitar(rp.locator('.rp-search'), busca, null, {depois: 450});
    const itens = rp.locator('.rp-item input[type=checkbox]');
    for (let i = 0; i < qtds.length; i++) await clicar(itens.nth(i), null, {antes: 220, depois: 250});
    await clicar(rp.locator('button', {hasText: 'Concluir seleção'}), null, {antes: 300, depois: 450});
    const q = rp.locator('.rp-qty');
    const n = await q.count();
    for (let i = 0; i < qtds.length; i++) await digitar(q.nth(n - qtds.length + i), String(qtds[i]), null, {antes: 220, depois: 220, delay: 80});
  };
  const topo = async () => {
    await page.evaluate(() => {
      document.scrollingElement.scrollTo({top: 0, behavior: 'smooth'});
      document.querySelectorAll('*').forEach(p => { if (p.scrollTop > 0 && !p.closest('.modal-bg,[role=dialog]') && /auto|scroll/.test(getComputedStyle(p).overflowY)) p.scrollTo({top: 0, behavior: 'smooth'}); });
    });
    await esperar(800);
  };
  const linhaOp = poco => page.locator('table.db-table tbody tr', {hasText: poco}).first();

  /* ---------------- roteiro ---------------- */
  const PARTES = [];
  PARTES[1] = async () => {
    await cartao(1, 'Abrir o arquivo', 'A página inicial, as ferramentas e os contratos.');
    await legenda('Abra o arquivo do seu contrato com <b>dois cliques</b>. Ele abre no Chrome ou no Edge, sem instalar nada.', 3800);
    await legenda('No topo ficam as <b>ferramentas</b>, que valem para todos os contratos: Químicos, Casing, Câmbio, exportar e importar.', 400);
    await destacar(page.locator('.eng-tools'), 3000);
    await legenda('Em <b>Receita e margem</b> você acompanha a receita, o COGS e a margem dos seus contratos, mês a mês.', 400);
    await destacar(page.locator('.ec-ger-painel'), 2600, 250);
    await legenda('Mais abaixo, cada contrato é um <b>card</b>: operações dos próximos 30 dias, sondas e a próxima data.', 400);
    await destacar(page.locator('.eng2-card', {hasText: 'P&A'}).first(), 2400);
    await abrirContrato('P&A');
  };
  PARTES[2] = async () => {
    await cartao(2, 'Ver o plano do contrato', 'Gantt, calendário e lista das operações.');
    await legenda('No <b>Gantt</b>, cada barra é uma operação, na cor da etapa (veja a legenda). Em roxo, as de contingência.', 400);
    await destacar(page.locator('.gantt-wrap'), 3200);
    await topo();
    await aba('Calendário', 'Na aba <b>Calendário</b> você vê o mês inteiro.');
    await esperar(1500);
    await aba('Lista', 'Na aba <b>Lista</b>, as operações aparecem por data.');
    await clicar(page.locator('.eng-lista-todas'), 'Escolha o horizonte: 15, 30, 90, 180 dias ou <b>Todas</b>.');
    await legenda('Em cada linha estão os botões <b>Editar</b>, <b>Duplicar</b>, <b>Σ Consumo</b> e <b>Handover</b>.', 400);
    await destacar(linhaOp('7-ABL-40-RJS'), 2600);
  };
  PARTES[3] = async () => {
    await cartao(3, 'Planejar uma operação', 'Os dados da operação e os recursos previstos.');
    await clicar(page.locator('button', {hasText: '+ Nova operação'}).first(), 'Para planejar uma operação, clique em <b>+ Nova operação</b>.');
    await page.waitForSelector('.eng-modal');
    await esperar(500);
    await escolher(fld('Sonda').locator('select'), 'NS-32 - Norbe VIII', 'Escolha a <b>sonda</b>…');
    await digitar(fld('Poço').locator('input'), '7-ABL-52-RJS', '… digite o <b>poço</b>…', {ler: 1500});
    await preencher(fld('Data prevista').locator('input'), '2026-11-24', '… a <b>data prevista</b>…');
    await escolher(fld('Tipo de operação').locator('select'), 'Abandono', '… e o <b>tipo de operação</b>.');
    await digitar(fld('Sales Order').locator('input'), '460100110', '<b>Sales Order</b> e <b>Nº VIDA</b> podem ficar para depois: só são exigidos para enviar o handover.');
    await digitar(fld('Nº VIDA').locator('input'), '100110', null);
    await legenda('<b>Vincular data à operação anterior</b>: se a anterior mudar de data, esta acompanha.', 400);
    await destacar(page.locator('.eng-modal button', {hasText: 'Vincular data'}).first(), 2200);
    await legenda('Marque <b>Contingência</b> se a operação pode não acontecer, e informe o <b>risco</b> de não acontecer.', 400);
    await destacar(page.locator('.eng-modal label', {hasText: 'Operação em contingência'}).first(), 2200);
    await escolherRecursos('Itens PPU', '', [1, 2], 'Agora os recursos. Em <b>Itens PPU</b>, clique em <b>Selecionar itens</b>, marque os itens e informe as quantidades.');
    await escolherRecursos('Químicas', 'HALAD-344', [250], 'Em <b>Químicas</b>, busque pelo nome ou pelo SAP, marque o produto e informe a quantidade. Repita para cada produto.');
    await escolherRecursos('Casing', '', [2], 'Faça o mesmo com o <b>casing equipment</b>…');
    await escolherRecursos('Pessoal', '', [1, 2], '… e com o <b>pessoal</b>: a função e quantas pessoas.');
    const l2 = picker('Itens PPU').locator('.rp-row:not(.rp-row-h)').nth(1);
    await clicar(l2.locator('.rp-cont input[type=checkbox]').first(), 'Uma linha também pode ser <b>contingência</b>, com o seu risco. A receita prevista conta só o que deve acontecer.');
    const risco = l2.locator('.rp-cont input:not([type=checkbox])');
    if (await risco.count()) await digitar(risco.last(), '40', null, {delay: 110});
    await clicar(page.locator('.eng-modal button:text-is("Salvar")'), 'Clique em <b>Salvar</b>. A operação entra no Gantt, no calendário e na lista.', {depois: 1400});
    await legenda('Pronto: a operação nova já aparece na lista.', 400);
    await destacar(linhaOp('7-ABL-52-RJS'), 2200);
  };
  PARTES[4] = async () => {
    await cartao(4, 'Enviar o handover', 'O que vai para a sonda e o e-mail para a logística.');
    await clicar(linhaOp('7-ABL-52-RJS').locator('button', {hasText: 'Handover'}), 'Com a operação planejada, clique em <b>Handover</b> na linha dela.');
    await esperar(500);
    const cont = page.locator('button:has-text("Continuar →")');
    if (await cont.count()) await clicar(cont.first(), 'Confira a Sales Order e o Nº VIDA e clique em <b>Continuar</b>.');
    await page.waitForSelector('.ho-modal');
    await esperar(600);
    await legenda('Confira o que vai para a sonda: químicas com o <b>saldo a bordo</b>, casing, equipamentos e o embarque de cada pessoa.', 2200);
    await rolar(page.locator('.ho-modal'), 650, 12);
    await rolar(page.locator('.ho-modal'), 800, 12);
    await digitar(page.locator('.ho-coment'), 'Embarcar o material até D-5.', 'Escreva os <b>comentários</b> para a logística.', {delay: 50});
    await clicar(page.locator('.ho-modal button', {hasText: 'Continuar para o e-mail'}), 'Clique em <b>Continuar para o e-mail</b>.');
    await page.waitForSelector('.hm-modal');
    await esperar(600);
    const tr = page.locator('.hm-tab tbody tr');
    if (await tr.count() >= 3) {
      await clicar(tr.nth(0).locator('input[type=checkbox]').nth(0), 'Marque quem recebe em <b>Para</b> e em <b>Cc</b>. A lista fica salva para os próximos e-mails.');
      await clicar(tr.nth(1).locator('input[type=checkbox]').nth(0), null, {antes: 220});
      await clicar(tr.nth(2).locator('input[type=checkbox]').nth(1), null, {antes: 220});
    }
    await clicar(page.locator('.hm-prev summary'), 'Abra a <b>pré-visualização</b> para conferir o e-mail.', {depois: 800});
    await rolar(page.locator('.hm-modal'), 500, 10);
    await rolar(page.locator('.hm-modal'), 700, 10);
    await clicar(page.locator('.hm-gerar'), 'Clique em <b>Gerar e-mail</b>: o arquivo .eml abre no Outlook, pronto para enviar.', {depois: 1600});
    await legenda('Mudou alguma coisa depois? Gere de novo: o e-mail sai como <b>REV 2</b>, com o que mudou.', 3400);
    await fecharTudo();
  };
  PARTES[5] = async () => {
    await cartao(5, 'Lançar o consumo', 'Depois da operação: PPU, químicas, casing e pessoal.');
    await fecharTudo();
    await clicar(linhaOp('7-ABL-40-RJS').locator('button', {hasText: 'Consumo'}), 'Depois da operação, clique em <b>Σ Consumo</b> na linha dela.');
    await page.waitForSelector('.ec-cons-modal');
    await esperar(600);
    await legenda('Confira a <b>data do serviço</b>: os valores dos itens PPU são os vigentes nessa data.', 400);
    await destacar(page.locator('.ec-cons-data'), 2200);
    await clicar(page.locator('.ec-cons-modal button', {hasText: 'Copiar previsto'}), '<b>Copiar previsto</b> traz o que foi planejado. Depois é só ajustar.', {depois: 1000});
    const q = page.locator('.ec-cons-modal table input[type=number]');
    if (await q.count()) await digitar(q.first(), '2', 'Ajuste a quantidade que foi usada de verdade.', {delay: 110});
    await rolar(page.locator('.ec-cons-modal'), 700, 10);
    await clicar(page.locator('.ec-cons-ok'), 'Clique em <b>Salvar consumo</b>.', {depois: 1200});
    await aba('Consumo e receita', 'Na aba <b>Consumo e receita</b> ficam a receita, o COGS e a margem do que foi lançado.');
    await topo();
    await esperar(2600);
  };
  PARTES[6] = async () => {
    await cartao(6, 'Informar o câmbio do mês', 'Para os contratos com valores em R$.');
    await topo();
    await clicar(page.locator('.eng-tools .eng-cambio'), 'Clique em <b>💱 Câmbio</b>.');
    await page.waitForSelector('.ec-cb-tab');
    await clicar(page.locator('.ec-cb-mais'), 'Clique em <b>＋ Mês</b>: o mês novo entra em cima da lista.');
    await digitar(page.locator('.ec-cb-tab tbody tr:first-child .ec-cb-valor'), '5,28', 'Digite quanto vale <b>US$ 1,00 em R$</b> naquele mês.', {delay: 130});
    await clicar(page.locator('.ec-cb-salvar'), 'Clique em <b>Salvar câmbio</b>. A receita em US$ usa a cotação de cada mês.', {depois: 1400});
    await fecharTudo();
  };
  PARTES[7] = async () => {
    await cartao(7, 'Atualizar o banco de químicos', 'Valores em US$ (COGS) pela planilha do responsável.');
    await clicar(page.locator('.eng-tools .eng-quimicos'), 'Clique em <b>Químicos</b>.');
    await page.waitForSelector('.ec-quim-tab');
    await legenda('Aqui ficam o SAP, a unidade e o <b>valor em US$</b> de cada produto químico.', 2600);
    const b64 = await page.evaluate(() => {
      const d = loadDB(), q = n => d.quimicos.find(x => x.nome && x.nome.toUpperCase().indexOf(n) === 0);
      const linhas = [['SAP', 'Descrição', 'Unidade', 'Valor US$']];
      ['HALAD-344', 'HALAD-413', 'CIMENTO CLASS G', 'MUSOL E', 'BARITA'].forEach((n, i) => { const x = q(n); if (x) linhas.push([Number(x.sap), x.nome, x.unid, Math.round((x.usd || 1) * (1.04 + i * 0.01) * 100) / 100]); });
      linhas.push([100099001, 'PRODUTO NOVO DEMO', 'GAL', 12.5]);
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(linhas), 'Químicos');
      return XLSX.write(wb, {type: 'base64', bookType: 'xlsx'});
    });
    await arquivo(page.locator('.ec-quim-carregar'), 'Banco_Quimicos_Dez2026.xlsx', Buffer.from(b64, 'base64'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Recebeu a planilha nova? Clique em <b>⬆ Atualizar pela planilha</b> e escolha o arquivo.');
    await page.waitForSelector('.ec-quim-plan');
    await legenda('Antes de gravar, o app mostra o que muda: <b>produtos novos</b> e <b>valores alterados</b>.', 400);
    await destacar(page.locator('.ec-quim-plan'), 2600);
    await clicar(page.locator('.ec-quim-plan .ec-qp-aplicar'), 'Clique em <b>Aplicar e salvar</b>.', {depois: 1300});
    await legenda('O banco de <b>casing equipment</b> funciona do mesmo jeito, no botão <b>Casing</b>.', 3000);
    await fecharTudo();
  };
  PARTES[8] = async () => {
    await cartao(8, 'Contar o inventário da sonda', 'O saldo a bordo entra no handover e vai para Compras.');
    await aba('Inventário das sondas', 'Abra a aba <b>Inventário das sondas</b>: há um card para cada sonda do contrato.');
    await esperar(1000);
    const card = page.locator('.ei-card').filter({has: page.locator('.ei-card-t b', {hasText: /^NS-32( - .*)?$/})}).first();
    await clicar(card.locator('.ei-nova'), 'Clique em <b>Nova contagem</b> na sonda.');
    await page.waitForSelector('.ei-modal');
    await esperar(500);
    const qs = page.locator('.ei-modal .ei-itens tbody tr .ei-qtd');
    const nq2 = Math.min(3, await qs.count());
    const valores = ['165', '400', '55'];
    for (let i = 0; i < nq2; i++) await digitar(qs.nth(i), valores[i], i === 0 ? 'Digite a <b>quantidade a bordo</b> de cada produto.' : null, {delay: 100, antes: 260});
    await preencher(page.locator('.ei-data'), '2026-11-13', 'Confira a <b>data da contagem</b>.');
    await clicar(page.locator('.ei-salvar'), 'Clique em <b>Salvar contagem</b>. O handover passa a mostrar esse saldo.', {depois: 1300});
  };
  PARTES[9] = async () => {
    await cartao(9, 'Filtrar e ordenar as tabelas', 'Como o filtro do Excel, em todas as tabelas.');
    await topo();
    await aba('Lista', null);
    const t = page.locator('table.db-table').first();
    await clicar(t.locator('thead th').nth(2), 'Clique no <b>título da coluna</b> para ordenar (▲). Clique de novo para inverter (▼).', {depois: 1100});
    await clicar(t.locator('thead th').nth(2), null, {depois: 1100});
    await clicar(t.locator('thead th').nth(1).locator('.etf-b'), 'No <b>▾</b> ao lado do título, escolha o que quer ver…', {depois: 900});
    await clicar(page.locator('#etfPop .etf-it').first().locator('.etf-so'), '… por exemplo, <b>só este</b> valor.', {depois: 1300});
    await legenda('Em cima da tabela aparece quantas linhas estão sendo mostradas.', 2400);
    await clicar(page.locator('table.db-table caption .etf-clr').first(), '<b>Limpar filtro e ordem</b> volta a tabela como era.', {depois: 1100});
  };
  PARTES[10] = async () => {
    await cartao(10, 'Colocar a logo do cliente', 'Vale para todos os contratos do mesmo cliente.');
    await clicar(page.locator('.eng2-ctbar-sw'), 'Para trocar de contrato, clique em <b>⇄ Trocar contrato</b>.', {depois: 900});
    await abrirContrato('Takatsugu J', 'Abra o contrato do cliente que ainda não tem logo.');
    await clicar(page.locator('.eng2-ctbar .eng-logo-btn'),'Clique na <b>logo</b> (ou nas iniciais) ao lado do nome do contrato.');
    await page.waitForSelector('.eng-logo-modal');
    const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 400; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 400, 400); g.fillStyle = '#1F4E79'; g.beginPath(); g.arc(200, 170, 110, 0, Math.PI * 2); g.fill(); g.fillStyle = '#F2A33A'; g.fillRect(90, 300, 220, 34); g.fillStyle = '#fff'; g.font = 'bold 120px Arial'; g.textAlign = 'center'; g.fillText('C', 200, 212); return c.toDataURL('image/png').split(',')[1]; });
    await arquivo(page.locator('.eng-logo-escolher'), 'logo_cliente.png', Buffer.from(png, 'base64'), 'image/png', 'Clique em <b>⬆ Inserir a logo</b> e escolha a imagem: PNG, JPG ou SVG.', true);
    await fecharTudo();
    await legenda('Pronto: a logo aparece no topo do contrato, no card da página inicial e nas operações.', 400);
    await destacar(page.locator('.eng2-ctbar .eng-logo-btn'), 2400);
  };
  PARTES[11] = async () => {
    await cartao(11, 'Enviar para o gerencial e para Compras', 'Os arquivos que outras áreas usam.');
    await clicar(page.locator('.eng-tools .eng-gerencial'), 'Clique em <b>⬇ Arquivo do gerencial</b>.');
    await esperar(600);
    await legenda('Confira os contratos marcados: os que estão sob a sua responsabilidade.', 2400);
    await clicar(page.locator('button', {hasText: 'Gerar arquivo'}).first(), 'Clique em <b>Gerar arquivo</b> e salve na <b>pasta do gerencial no SharePoint</b>.', {depois: 1400});
    await fecharTudo();
    await clicar(page.locator('.eng-tools .eng-planilhas'), 'Para o Painel de Compras, clique em <b>⬇ Exportar planilhas</b>.');
    await esperar(700);
    await clicar(page.locator('button', {hasText: /Baixar as \d planilhas/}).first(), 'Clique em <b>Baixar as 4 planilhas</b>: inventário, consumo de químicos, casing e pessoal.', {depois: 1400});
    await fecharTudo();
  };
  PARTES[12] = async () => {
    await cartao(12, 'Guardar uma cópia', 'Os dados ficam no navegador deste computador.');
    await clicar(page.locator('.eng-tools .eng-exportar'), 'De vez em quando, clique em <b>⬇ Exportar dados</b>: é a sua <b>cópia de segurança</b>.', {depois: 1400});
    // e19: com mais de um contrato, a janela pergunta quais exportar (vêm todos marcados)
    if (await page.locator('.eng-expsel-ok').count()) await clicar(page.locator('.eng-expsel-ok'), 'Com mais de um contrato, marque os que vão no arquivo e clique em <b>⬇ Exportar</b>.', {depois: 1400});
    await legenda('Em outro computador, use <b>⬆ Importar dados</b> e escolha o arquivo exportado.', 400);
    await destacar(page.locator('.eng-tools button', {hasText: 'Importar dados'}).first(), 2600);
    await legenda('Abra sempre o arquivo pelo Chrome ou pelo Edge. Pela pré-visualização do Outlook ou do Teams o navegador não salva.', 4200);
  };

  /* ---------------- gravar ---------------- */
  const capa = '<div class="k"><b>EARL ENGENHARIA</b> — COMO USAR</div>';
  parte = {n: 0, nome: ''};
  faixa('card');
  marcaCursor(false);
  await page.evaluate(([e, c]) => window.__tut.cartao((e ? '<img src="' + e + '">' : '') + c + '<h1>Passo a passo<i>.</i></h1><p>12 partes curtas: planejar, enviar o handover, lançar o consumo e gerar os arquivos para o gerencial e para Compras. Dados de demonstração.</p>', 0), [EARL, capa]);
  await page.waitForTimeout(400);
  if (!RAPIDO) {
    gravando = true;
    await cdp.send('Page.startScreencast', {format: 'jpeg', quality: 86, maxWidth: 1920, maxHeight: 960, everyNthFrame: 1});
  }
  eventos[0].w = Date.now() / 1000;
  await esperar(5000);
  await page.evaluate(() => window.__tut.cartao(null));
  marcaCursor(true);
  await esperar(500);
  const capitulos = [];
  for (let n = 1; n <= N_PARTES; n++) {
    if (SO.length && !SO.includes(n)) continue;
    const ini = Date.now() / 1000;
    try { await PARTES[n](); } catch (e) {
      console.log('ERRO na parte', n, String(e).split('\n').slice(0, 3).join(' / ').slice(0, 400));
      await page.screenshot({path: path.join(OUT, 'erro_parte_' + n + '.png')});
      await page.keyboard.press('Escape').catch(() => {});
      await fecharTudo();
    }
    capitulos.push({n, nome: parte.nome, w: ini});
    console.log('parte', n, 'ok', Math.round(Date.now() / 1000 - eventos[0].w) + ' s');
  }
  parte = {n: 0, nome: ''};
  faixa('card');
  marcaCursor(false);
  await page.evaluate(([e, c]) => window.__tut.cartao((e ? '<img src="' + e + '">' : '') + c + '<h1>Pronto! Agora é com você<i>.</i></h1><p>Abra o arquivo do seu contrato, teste com calma e anote as dúvidas para o walkthrough.</p>', 1), [EARL, capa]);
  await esperar(5000);
  if (!RAPIDO) {
    await cdp.send('Page.stopScreencast');
    gravando = false;
    await page.waitForTimeout(500);
    await Promise.all(gravacoes);
    fs.writeFileSync(path.join(OUT, 'sessao.json'), JSON.stringify({quadros, atraso, eventos, capitulos, cursor}));
    console.log('quadros', quadros.length, 'duração', (quadros[quadros.length - 1].t - quadros[0].t).toFixed(1), 's · atraso', atraso.toFixed(3));
  }
  console.log('erros JS', erros);
  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });
