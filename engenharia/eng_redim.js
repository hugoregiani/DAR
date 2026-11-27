/* e19 (pedido do Hugo, 27/11/2026): toda janela (caixa) do app muda de tamanho puxando qualquer borda ou canto.
   Script avulso, fora do React: não põe nada dentro das janelas; só olha onde está o ponteiro. Perto da borda de
   uma janela (8 px por fora, 4 px por dentro) o cursor vira a seta de redimensionar; arrastando, a janela passa a
   ter posição e tamanho fixos (mínimo 280 × 160, sem sair da tela). Duplo clique na borda volta ao tamanho normal.
   O clique que termina um arraste não chega ao app (não fecha a janela por engano).
   O mesmo código está no gerencial/gerencial.html (janelas .dlg; o patch_engenharia.py confere que são iguais). */
(function () {
  if (window.__engRedim) return;
  window.__engRedim = 1;
  var CLS = window.EARL_REDIM_CLASSES || ['modal', 'dlg'];
  var SEL = CLS.map(function (c) { return '.' + c; }).join(', ');
  var VIVAS = CLS.map(function (c) { return document.getElementsByClassName(c); }); // listas "vivas" (rápidas)
  var FORA = 8, DENTRO = 4, MIN_W = 280, MIN_H = 160;
  var CUR = {n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize', ne: 'nesw-resize', sw: 'nesw-resize', nw: 'nwse-resize', se: 'nwse-resize'};
  var css = document.createElement('style');
  css.setAttribute('data-earl-rt', '1'); // e23: posto pelo script depois de abrir (não vai na cópia compartilhada)
  css.textContent = Object.keys(CUR).map(function (k) { return 'html[data-engrz-cur="' + k + '"],html[data-engrz-cur="' + k + '"] *{cursor:' + CUR[k] + ' !important}'; }).join('\n') +
    '\nhtml[data-engrz-arr],html[data-engrz-arr] *{user-select:none !important;-webkit-user-select:none !important}' +
    '\n[data-engrz]{animation:none !important}';
  (document.head || document.documentElement).appendChild(css);
  var raiz = document.documentElement;
  var arr = null, alvo = null, engolirClique = 0;
  var janelaEm = function (t, x, y) {
    if (!t || !t.closest) return null;
    var m = t.closest(SEL);
    if (m) return m;
    // por fora da janela (no fundo escuro): a janela que está dentro do elemento por cima do ponteiro
    for (var k = 0; k < VIVAS.length; k++) {
      var l = VIVAS[k];
      for (var i = l.length - 1; i >= 0; i--) {
        if (!t.contains(l[i])) continue;
        var r = l[i].getBoundingClientRect();
        if (r.width && x >= r.left - FORA && x <= r.right + FORA && y >= r.top - FORA && y <= r.bottom + FORA) return l[i];
      }
    }
    return null;
  };
  var direcao = function (m, x, y) {
    var r = m.getBoundingClientRect();
    if (!r.width || !r.height) return '';
    if (x < r.left - FORA || x > r.right + FORA || y < r.top - FORA || y > r.bottom + FORA) return '';
    var n = y <= r.top + DENTRO, s = y >= r.bottom - DENTRO, w = x <= r.left + DENTRO, e = x >= r.right - DENTRO;
    // os cantos pegam um pouco mais (14 px), para ficar fácil de achar
    var C = 14;
    if (!n && !s && (w || e)) { if (y <= r.top + C) n = true; else if (y >= r.bottom - C) s = true; }
    if (!w && !e && (n || s)) { if (x <= r.left + C) w = true; else if (x >= r.right - C) e = true; }
    return (n ? 'n' : s ? 's' : '') + (w ? 'w' : e ? 'e' : '');
  };
  var marcarCursor = function (d) {
    if (d) raiz.setAttribute('data-engrz-cur', d); else raiz.removeAttribute('data-engrz-cur');
  };
  var fixar = function (m, r) {
    var st = m.style;
    st.setProperty('position', 'fixed', 'important');
    st.setProperty('margin', '0', 'important');
    st.setProperty('max-width', 'none', 'important');
    st.setProperty('max-height', 'none', 'important');
    st.setProperty('min-width', '0', 'important');
    st.setProperty('min-height', '0', 'important');
    st.setProperty('left', Math.round(r.left) + 'px', 'important');
    st.setProperty('top', Math.round(r.top) + 'px', 'important');
    st.setProperty('width', Math.round(r.width) + 'px', 'important');
    st.setProperty('height', Math.round(r.height) + 'px', 'important');
    st.setProperty('box-sizing', 'border-box', 'important');
    m.setAttribute('data-engrz', '1');
  };
  var soltar = function (m) {
    ['position', 'margin', 'max-width', 'max-height', 'min-width', 'min-height', 'left', 'top', 'width', 'height', 'box-sizing'].forEach(function (k) { m.style.removeProperty(k); });
    m.removeAttribute('data-engrz');
  };
  window.addEventListener('pointermove', function (e) {
    if (arr) {
      var dx = e.clientX - arr.x, dy = e.clientY - arr.y, r0 = arr.r, d = arr.d;
      if (!arr.mexeu && Math.abs(dx) + Math.abs(dy) < 3) return;
      arr.mexeu = true;
      var W = window.innerWidth, H = window.innerHeight;
      var L = r0.left, T = r0.top, R = r0.right, B = r0.bottom;
      if (d.indexOf('e') >= 0) R = Math.min(W, Math.max(L + MIN_W, r0.right + dx));
      if (d.indexOf('w') >= 0) L = Math.max(0, Math.min(R - MIN_W, r0.left + dx));
      if (d.indexOf('s') >= 0) B = Math.min(H, Math.max(T + MIN_H, r0.bottom + dy));
      if (d.indexOf('n') >= 0) T = Math.max(0, Math.min(B - MIN_H, r0.top + dy));
      fixar(arr.m, {left: L, top: T, width: R - L, height: B - T});
      e.preventDefault();
      return;
    }
    if (e.pointerType === 'touch' && e.buttons) return;
    var m = janelaEm(e.target, e.clientX, e.clientY);
    var d = m ? direcao(m, e.clientX, e.clientY) : '';
    alvo = d ? {m: m, d: d} : null;
    marcarCursor(d);
  }, true);
  window.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    var m = janelaEm(e.target, e.clientX, e.clientY);
    var d = m ? direcao(m, e.clientX, e.clientY) : '';
    if (!d) return;
    e.preventDefault();
    e.stopPropagation();
    var r = m.getBoundingClientRect();
    arr = {m: m, d: d, x: e.clientX, y: e.clientY, r: {left: r.left, top: r.top, right: r.right, bottom: r.bottom}, mexeu: false};
    raiz.setAttribute('data-engrz-arr', '1');
    marcarCursor(d);
  }, true);
  var fim = function (e) {
    if (!arr) return;
    if (arr.mexeu) engolirClique = Date.now();
    arr = null;
    raiz.removeAttribute('data-engrz-arr');
    if (e && e.type === 'pointerup') { e.stopPropagation(); }
    marcarCursor(alvo ? alvo.d : '');
  };
  window.addEventListener('pointerup', fim, true);
  window.addEventListener('pointercancel', fim, true);
  // o clique que termina o arraste (que cai no fundo escuro) não fecha a janela
  window.addEventListener('click', function (e) {
    if (engolirClique && Date.now() - engolirClique < 600) {
      engolirClique = 0;
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
  window.addEventListener('mousedown', function (e) {
    // sem o mousedown, o fundo escuro não "começa" o clique (algumas janelas fecham ao clicar fora)
    if (raiz.hasAttribute('data-engrz-arr')) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  window.addEventListener('dblclick', function (e) {
    var m = janelaEm(e.target, e.clientX, e.clientY);
    if (!m || !direcao(m, e.clientX, e.clientY)) return;
    e.preventDefault();
    e.stopPropagation();
    soltar(m);
  }, true);
  // a janela que muda de tamanho não pode sair da tela quando a janela do navegador diminui
  window.addEventListener('resize', function () {
    var l = document.querySelectorAll('[data-engrz]');
    for (var i = 0; i < l.length; i++) {
      var r = l[i].getBoundingClientRect(), W = window.innerWidth, H = window.innerHeight;
      if (r.right > W || r.bottom > H) {
        var w = Math.min(r.width, W), h = Math.min(r.height, H);
        fixar(l[i], {left: Math.max(0, Math.min(r.left, W - w)), top: Math.max(0, Math.min(r.top, H - h)), width: w, height: h});
      }
    }
  });
  window.engRedimSoltar = soltar;
  /* e22: uma alça visível no canto de baixo à direita da janela que está por cima (mostra que dá para puxar).
     Não recebe o ponteiro: o arraste continua sendo pela borda/canto, como acima. */
  var alca = null, rodando = false, raio = typeof WeakMap === 'function' ? new WeakMap() : null;
  // o canto é arredondado: a alça fica para dentro da curva (cerca de 0,3 × o raio)
  var recuo = function (m) {
    var v = raio && raio.get(m);
    if (v == null) { v = Math.round((parseFloat(getComputedStyle(m).borderBottomRightRadius) || 0) * 0.3) + 3; if (raio) raio.set(m, v); }
    return v;
  };
  var poeAlca = function () {
    var achou = null, em = null;
    for (var k = 0; k < VIVAS.length && !achou; k++) {
      var l = VIVAS[k];
      for (var i = l.length - 1; i >= 0; i--) {
        var r = l[i].getBoundingClientRect();
        if (!r.width || !r.height) continue;
        var rc = recuo(l[i]);
        var el = document.elementFromPoint(Math.max(0, r.right - rc - 6), Math.max(0, r.bottom - rc - 6));
        if (el && (el === l[i] || l[i].contains(el))) { achou = r; em = rc; break; }
      }
    }
    if (!achou) { if (alca) alca.style.display = 'none'; return false; }
    if (!alca) {
      alca = document.createElement('div');
      alca.className = 'eng-rz-alca';
      alca.setAttribute('data-earl-rt', '1');
      alca.setAttribute('aria-hidden', 'true');
      alca.style.cssText = 'position:fixed;width:14px;height:14px;pointer-events:none;z-index:2147483000;opacity:.75;' +
        'background:linear-gradient(135deg,transparent 0 46%,#8E979D 46% 54%,transparent 54% 64%,#8E979D 64% 72%,transparent 72% 82%,#8E979D 82% 90%,transparent 90%)';
      document.body.appendChild(alca);
    }
    alca.style.display = 'block';
    alca.style.left = Math.round(achou.right - 14 - em) + 'px';
    alca.style.top = Math.round(achou.bottom - 14 - em) + 'px';
    return true;
  };
  var laco = function () {
    var tem = VIVAS.some(function (l) { return l.length > 0; });
    if (!tem) { rodando = false; if (alca) alca.style.display = 'none'; return; }
    poeAlca();
    requestAnimationFrame(laco);
  };
  var acorda = function () { if (!rodando && VIVAS.some(function (l) { return l.length > 0; })) { rodando = true; requestAnimationFrame(laco); } };
  try { new MutationObserver(acorda).observe(document.documentElement, {childList: true, subtree: true}); } catch (e) {}
  acorda();
})();
