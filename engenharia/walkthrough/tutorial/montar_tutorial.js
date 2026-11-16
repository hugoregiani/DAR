// Vídeo tutorial do EARL Engenharia (2/2): monta o MP4 a partir do que o gravar_tutorial.js gravou.
//  - tela (1920 × 960): os quadros JPEG, cada um durando até o próximo (pelo horário de cada quadro), com o cursor
//    desenhado por cima a 30 qps a partir do caminho gravado (a tela em si sai com ~15 quadros/s nos movimentos);
//  - faixa da legenda (1920 × 120) embaixo da tela: uma imagem por passo, desenhada aqui no Chromium;
//  - trilha suave (../video/trilha.py, sem arpejo) bem baixa, com um "whoosh" em cada parte;
//  - capítulos no MP4 (uma parte = um capítulo) e a lista dos capítulos em capitulos.txt.
// Uso: node montar_tutorial.js <pasta da gravação> [saida.mp4]
const {chromium} = require('playwright');
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');

const DIR = path.resolve(process.argv[2] || path.join(__dirname, 'saida'));
const SAIDA = path.resolve(process.argv[3] || path.join(DIR, 'EARL_Engenharia_tutorial_V01.mp4'));
const ses = JSON.parse(fs.readFileSync(path.join(DIR, 'sessao.json'), 'utf8'));
const FX = path.join(DIR, 'faixas');
fs.mkdirSync(FX, {recursive: true});

const q = ses.quadros.slice().sort((a, b) => a.i - b.i);
const T0 = q[0].t;
const ULT = 2.0; // o último quadro (cartão final) fica mais um pouco
const TOTAL = q[q.length - 1].t - T0 + ULT;
const tv = w => Math.max(0, Math.min(TOTAL, w - ses.atraso - T0)); // horário daqui → tempo no vídeo
const mmss = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

const CSS = `
*{box-sizing:border-box;margin:0}
html,body{width:1920px;height:120px;overflow:hidden}
body{font-family:Inter,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.f{width:1920px;height:120px;display:flex;align-items:center;gap:26px;padding:0 48px 0 40px;background:#1D2023;border-top:4px solid #CC0000;color:#fff}
.f.claro{background:#E3E6E8;border-top-color:#E3E6E8}
.n{flex:none;width:60px;height:60px;border-radius:30px;background:#CC0000;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:28px}
.c{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px}
.p{font-size:14px;font-weight:700;letter-spacing:3px;color:#F2A3A3;text-transform:uppercase}
.t{font-size:30px;font-weight:600;line-height:1.22;letter-spacing:-.2px}
.t b{font-weight:800;color:#FFB0B0}
.m{flex:none;text-align:right;font-size:13px;font-weight:700;letter-spacing:2.5px;color:#7C8389;text-transform:uppercase;line-height:1.6}
.m b{color:#CC0000;font-weight:800}`;
const html = e => {
  if (e.tipo === 'card') return '<div class="f claro"></div>';
  const rot = e.n ? 'Parte ' + e.n + ' · ' + e.parte : '';
  return '<div class="f">' + (e.n ? '<div class="n">' + e.n + '</div>' : '') +
    '<div class="c"><div class="p">' + rot + '</div><div class="t">' + (e.texto || '') + '</div></div>' +
    '<div class="m"><b>EARL</b> Engenharia<br>como usar</div></div>';
};

(async () => {
  /* ---- 1. as imagens da faixa (uma por legenda diferente) ---- */
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport: {width: 1920, height: 120}});
  await page.setContent('<style>' + CSS + '</style><div id="r"></div>');
  const arq = new Map();
  for (const e of ses.eventos) {
    const h = html(e);
    if (arq.has(h)) { e.png = arq.get(h); continue; }
    const p = path.join(FX, 'f' + String(arq.size).padStart(4, '0') + '.png');
    await page.evaluate(h => {
      document.getElementById('r').innerHTML = h;
      const t = document.querySelector('.t');
      if (t) for (let fs = 30; fs > 20 && t.scrollHeight > 76; fs--) t.style.fontSize = fs + 'px'; // até 2 linhas
    }, h);
    await page.screenshot({path: p});
    arq.set(h, p);
    e.png = p;
  }
  // o cursor (a gravação guarda o caminho; aqui ele é desenhado a 30 qps, liso mesmo com poucos quadros da tela)
  const CUR = path.join(FX, 'cursor.png');
  await page.setViewportSize({width: 56, height: 64});
  await page.setContent('<body style="margin:0;background:transparent"><svg style="position:absolute;left:6px;top:6px;width:32px;height:43px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))" viewBox="0 0 18 24"><path d="M1 1 L1 19 L5.5 14.8 L8.6 22 L11.6 20.7 L8.6 13.6 L14.6 13.6 Z" fill="#111" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg></body>');
  await page.screenshot({path: CUR, omitBackground: true});
  await browser.close();
  console.log('faixas', arq.size);
  const ESC = 4 / 3, PONTA = 8; // CSS → vídeo; ponta da seta dentro do cursor.png
  let cmds = '';
  const cur = (ses.cursor || []).map(c => ({...c, t: tv(c.w)})).sort((a, b) => a.t - b.t);
  if (cur.length) {
    let k = 0, ant = '';
    for (let f = 0; f <= Math.ceil(TOTAL * 30); f++) {
      const t = f / 30;
      while (k + 1 < cur.length && cur[k + 1].t <= t) k++;
      const c = cur[k];
      const [x, y] = c.t <= t && c.v ? [Math.round(c.x * ESC - PONTA), Math.round(c.y * ESC - PONTA)] : [-200, -200];
      const lin = 'overlay@c x ' + x + ', overlay@c y ' + y;
      if (lin !== ant) { cmds += t.toFixed(4) + ' ' + lin + ';\n'; ant = lin; }
    }
  } else cmds = '0 overlay@c x -200, overlay@c y -200;\n';
  fs.writeFileSync(path.join(DIR, 'cursor_cmds.txt'), cmds);

  /* ---- 2. listas do ffmpeg (tela e faixa) ---- */
  let lt = '';
  for (let k = 0; k < q.length; k++) {
    const d = k + 1 < q.length ? Math.max(0.001, q[k + 1].t - q[k].t) : ULT;
    lt += "file '" + path.join(DIR, 'quadros', 'q' + String(q[k].i).padStart(6, '0') + '.jpg') + "'\nduration " + d.toFixed(4) + '\n';
  }
  lt += "file '" + path.join(DIR, 'quadros', 'q' + String(q[q.length - 1].i).padStart(6, '0') + '.jpg') + "'\n";
  fs.writeFileSync(path.join(DIR, 'tela.txt'), lt);
  const ev = ses.eventos.map(e => ({...e, t: tv(e.w)})).sort((a, b) => a.t - b.t);
  ev[0].t = 0;
  let lf = '';
  for (let k = 0; k < ev.length; k++) {
    const d = (k + 1 < ev.length ? ev[k + 1].t : TOTAL) - ev[k].t;
    if (d <= 0.0005) continue;
    lf += "file '" + ev[k].png + "'\nduration " + d.toFixed(4) + '\n';
  }
  lf += "file '" + ev[ev.length - 1].png + "'\n";
  fs.writeFileSync(path.join(DIR, 'faixa.txt'), lf);

  /* ---- 3. capítulos ---- */
  const caps = [{t: 0, nome: 'Abertura'}].concat(ses.capitulos.map(c => ({t: tv(c.w), nome: 'Parte ' + c.n + ' · ' + c.nome})));
  let meta = ';FFMETADATA1\ntitle=EARL Engenharia — como usar (passo a passo)\nartist=Halliburton Cementing Brasil\n';
  caps.forEach((c, i) => {
    const fim = i + 1 < caps.length ? caps[i + 1].t : TOTAL;
    meta += '\n[CHAPTER]\nTIMEBASE=1/1000\nSTART=' + Math.round(c.t * 1000) + '\nEND=' + Math.round(fim * 1000) + '\ntitle=' + c.nome + '\n';
  });
  fs.writeFileSync(path.join(DIR, 'capitulos_meta.txt'), meta);
  fs.writeFileSync(path.join(DIR, 'capitulos.txt'), caps.map(c => mmss(c.t) + '  ' + c.nome).join('\n') + '\n');
  console.log(caps.map(c => mmss(c.t) + '  ' + c.nome).join('\n'));

  /* ---- 4. trilha (bem baixa, para não atrapalhar a leitura) ---- */
  const wav = path.join(DIR, 'trilha.wav');
  execFileSync('python3', [path.join(__dirname, '..', 'video', 'trilha.py'), wav, TOTAL.toFixed(2), caps.slice(1).map(c => c.t.toFixed(2)).join(',')], {env: {...process.env, TRILHA_SUAVE: '1'}, stdio: 'inherit'});

  /* ---- 5. o MP4 ---- */
  execFileSync('ffmpeg', ['-y', '-v', 'error',
    '-f', 'concat', '-safe', '0', '-i', path.join(DIR, 'tela.txt'),
    '-f', 'concat', '-safe', '0', '-i', path.join(DIR, 'faixa.txt'),
    '-i', wav, '-f', 'ffmetadata', '-i', path.join(DIR, 'capitulos_meta.txt'),
    '-loop', '1', '-framerate', '30', '-i', CUR,
    '-filter_complex', '[0:v]fps=30,scale=1920:960:flags=lanczos,setsar=1,sendcmd=f=' + path.join(DIR, 'cursor_cmds.txt') + '[a0];' +
      '[a0][4:v]overlay@c=x=-200:y=-200:eval=frame[a];[1:v]fps=30,scale=1920:120,setsar=1[b];[a][b]vstack=inputs=2,format=yuv420p[v];[2:a]volume=0.32[m]',
    '-map', '[v]', '-map', '[m]', '-map_metadata', '3', '-map_chapters', '3',
    '-t', TOTAL.toFixed(3), '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-c:a', 'aac', '-b:a', '128k',
    '-movflags', '+faststart', SAIDA], {stdio: 'inherit'});
  console.log('ok →', SAIDA, mmss(TOTAL), (fs.statSync(SAIDA).size / 1048576).toFixed(1) + ' MB');
})().catch(e => { console.error(e); process.exit(2); });
