// Gera o vídeo: abre video.html no Chromium, chama render(t) quadro a quadro e manda as imagens para o ffmpeg.
// Uso: node gravar.js quadros <t1,t2,...> <pasta>   (prévia)   |   node gravar.js video <saida.mp4> [fps]
const {chromium} = require('playwright');
const path = require('path');
const {spawn} = require('child_process');
(async () => {
  const modo = process.argv[2];
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport: {width: 1280, height: 720}, deviceScaleFactor: 1.5});
  const erros = []; page.on('pageerror', e => erros.push(String(e)));
  await page.goto('file://' + path.join(__dirname, 'video.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  if (modo === 'quadros') {
    const ts = process.argv[3].split(',').map(Number), dir = process.argv[4];
    for (const t of ts) { await page.evaluate(t => render(t), t); await page.screenshot({path: path.join(dir, 'q_' + String(t).replace('.', '_') + '.png')}); }
  } else {
    const saida = process.argv[3], fps = Number(process.argv[4] || 30);
    const total = await page.evaluate(() => TOTAL);
    const n = Math.round(total * fps);
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', saida], {stdio: ['pipe', 'inherit', 'inherit']});
    for (let i = 0; i < n; i++) {
      await page.evaluate(t => render(t), i / fps);
      const buf = await page.screenshot({type: 'jpeg', quality: 93});
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 300 === 0) console.log('quadro', i, 'de', n);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
  }
  console.log('erros', erros);
  await browser.close();
})();
