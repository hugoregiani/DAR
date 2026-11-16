/* Camada do vídeo tutorial, por cima do app (sem interferir nele): cursor visível, clique, destaque vermelho do
   alvo, cartões das partes e uma janela "Abrir arquivo" de mentira (no Chromium sem tela a janela do sistema não
   aparece). A legenda de cada passo não fica aqui: ela entra numa faixa embaixo da tela (montar_tutorial.js).
   Injetado com context.addInitScript; o gravar_tutorial.js chama window.__tut.*. */
(function () {
  var Z = 2147483000;
  var css = '' +
    '#tut-cur{position:fixed;left:0;top:0;width:24px;height:32px;z-index:' + (Z + 9) + ';pointer-events:none;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35));transform:translate(-100px,-100px)}' +
    '#tut-onda{position:fixed;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:3px solid #CC0000;z-index:' + (Z + 8) + ';pointer-events:none;opacity:0}' +
    '#tut-dest{position:fixed;z-index:' + (Z + 7) + ';pointer-events:none;border:3px solid #CC0000;border-radius:10px;box-shadow:0 0 0 4px rgba(204,0,0,.18),0 0 18px rgba(204,0,0,.35);opacity:0;transition:opacity .25s,left .25s,top .25s,width .25s,height .25s}' +
    '#tut-card{position:fixed;inset:0;z-index:' + (Z + 5) + ';pointer-events:none;opacity:0;transition:opacity .45s;background:linear-gradient(to bottom,rgba(227,230,232,0) 72%,#E3E6E8 100%),radial-gradient(1100px 700px at 60% 38%,#F7F8F9 0%,#EEF0F1 45%,#E3E6E8 100%);font-family:Inter,Arial,sans-serif;color:#121417;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}' +
    '#tut-card .k{font-size:13px;font-weight:700;letter-spacing:3px;color:#9AA1A6;text-transform:uppercase}' +
    '#tut-card .k b{color:#CC0000}' +
    '#tut-card h1{font-size:54px;font-weight:800;letter-spacing:-1.8px;line-height:1.05;margin:14px 0 0}' +
    '#tut-card h1 i{font-style:normal;color:#CC0000}' +
    '#tut-card p{font-size:19px;color:#5A6066;margin:18px 0 0;max-width:900px;line-height:1.45}' +
    '#tut-card img{width:430px;margin-bottom:26px}' +
    '#tut-card .linha{position:absolute;left:42px;right:42px;bottom:28px;height:2px;background:#D5D9DC}' +
    '#tut-card .linha i{position:absolute;left:0;top:0;bottom:0;background:#CC0000}' +
    '#tut-dlg{position:fixed;left:50%;top:50%;width:520px;margin:-130px 0 0 -260px;z-index:' + (Z + 4) + ';pointer-events:none;background:#fff;border-radius:10px;box-shadow:0 24px 60px rgba(0,0,0,.35);font-family:Inter,Arial,sans-serif;opacity:0;transition:opacity .25s;overflow:hidden}' +
    '#tut-dlg .h{background:#F3F4F5;border-bottom:1px solid #E1E5E8;padding:10px 14px;font-size:13px;font-weight:600;color:#2A2E31}' +
    '#tut-dlg .b{padding:14px}' +
    '#tut-dlg .f{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:6px;font-size:14px;color:#2A2E31}' +
    '#tut-dlg .f.s{background:#E6F0FB;outline:1px solid #9CC3EE}' +
    '#tut-dlg .f s{width:22px;height:26px;border-radius:3px;background:#1D6F42;display:block}' +
    '#tut-dlg .f s.png{background:#7A4FBF}' +
    '#tut-dlg .r{display:flex;justify-content:flex-end;gap:8px;padding:10px 14px;border-top:1px solid #EEF0F1}' +
    '#tut-dlg .r span{padding:6px 18px;border-radius:5px;font-size:13px;border:1px solid #C9CED2}' +
    '#tut-dlg .r span.ok{background:#1A73E8;color:#fff;border-color:#1A73E8}';
  function montar() {
    if (document.getElementById('tut-cur')) return;
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var d = document.createElement('div');
    d.innerHTML = '<svg id="tut-cur" viewBox="0 0 18 24"><path d="M1 1 L1 19 L5.5 14.8 L8.6 22 L11.6 20.7 L8.6 13.6 L14.6 13.6 Z" fill="#111" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>' +
      '<div id="tut-onda"></div><div id="tut-dest"></div>' +
      '<div id="tut-card"></div><div id="tut-dlg"></div>';
    while (d.firstChild) document.body.appendChild(d.firstChild);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
  var pos = {x: -100, y: -100};
  window.addEventListener('mousemove', function (e) { pos.x = e.clientX; pos.y = e.clientY; var c = document.getElementById('tut-cur'); if (c) c.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)'; }, true);
  window.addEventListener('mousedown', function (e) {
    var o = document.getElementById('tut-onda'); if (!o) return;
    o.style.left = e.clientX + 'px'; o.style.top = e.clientY + 'px';
    o.animate([{opacity: 1, transform: 'scale(.35)'}, {opacity: 0, transform: 'scale(1.5)'}], {duration: 650, easing: 'ease-out'});
  }, true);
  window.__tut = {
    destacar: function (r) {
      montar();
      var e = document.getElementById('tut-dest');
      if (!r) { e.style.opacity = 0; return; }
      var p = 6;
      e.style.left = (r.x - p) + 'px'; e.style.top = (r.y - p) + 'px'; e.style.width = (r.width + 2 * p) + 'px'; e.style.height = (r.height + 2 * p) + 'px';
      e.style.opacity = 1;
    },
    cartao: function (html, prog) {
      montar();
      var c = document.getElementById('tut-card');
      var cur = document.getElementById('tut-cur');
      if (!html) { c.style.opacity = 0; cur.style.opacity = 1; return; }
      cur.style.opacity = 0; // o cursor some nos cartões
      c.innerHTML = html + (prog != null ? '<div class="linha"><i style="width:' + (prog * 100).toFixed(1) + '%"></i></div>' : '');
      c.style.opacity = 1;
    },
    dialogo: function (nome, png) {
      montar();
      var g = document.getElementById('tut-dlg');
      if (!nome) { g.style.opacity = 0; return; }
      g.innerHTML = '<div class="h">Abrir</div><div class="b"><div class="f"><s class="' + (png ? 'png' : '') + '"></s>Documentos</div><div class="f s"><s class="' + (png ? 'png' : '') + '"></s>' + nome + '</div></div><div class="r"><span>Cancelar</span><span class="ok">Abrir</span></div>';
      g.style.opacity = 1;
    },
    cursor: function () { return pos; }
  };
})();
