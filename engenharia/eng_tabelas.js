/* =================== e12: filtro e ordem em todas as tabelas do EARL Engenharia ===================
   Pedido do Hugo (13/11/2026): "Nas tabelas de bancos de dados permita que o usuário faça filtros, assim como organizar em
   ordem crescente ou decrescente. Revisar todas as tabelas do app, todas devem permitir o filtro."
   Igual ao filtro das tabelas do EARL Gerencial (g11):
   - clique no título da coluna: ordem crescente (▲); de novo: decrescente (▼). Vazios ficam sempre no fim;
   - ▾ no título: lista dos valores da coluna (com quantas linhas tem cada um), busca, "(Selecionar tudo)", "só este",
     ↑ Crescente / ↓ Decrescente, Mostrar todos, Cancelar e Aplicar. A lista de uma coluna mostra só o que sobrou com
     a seleção das outras colunas;
   - com filtro ou ordem, a tabela mostra "Mostrando X de Y linha(s)" e "Limpar filtro e ordem".
   Vale para toda tabela com uma linha de títulos (thead) e linhas do mesmo formato (sem células mescladas), inclusive
   as de edição (lê o valor dos campos). Tabela com grupos (linhas mescladas no meio) fica como está. Para tirar uma
   tabela do filtro: data-tf="0" nela (ou num elemento acima).
   Funciona por fora do React: esconde linhas (atributo data-etfh) e muda a ordem das linhas no tbody; um
   MutationObserver refaz a ordem e o filtro quando o React redesenha a tabela. Linha nova (＋) que aparece com o filtro
   ligado fica visível até o próximo filtro. O estado vale enquanto a tabela estiver na tela. */
(function () {
  if (window.EARL_TF) return;
  var ST = new WeakMap(); // tabela → estado {n, cols:[{t, ok}], s, d, f:{ci:[rótulos]}, seq: WeakMap, nSeq, isentas: WeakSet, mexeu}
  var limpo = function (t) { return String(t == null ? '' : t).replace(/[\s ]+/g, ' ').trim(); };
  // texto de um nó sem os controles do filtro; <br> e blocos viram espaço
  var BLOCO = {BR: 1, DIV: 1, P: 1, LI: 1, TR: 1};
  var texto = function (n) {
    if (n.nodeType === 3) return n.nodeValue;
    if (n.nodeType !== 1) return '';
    if (n.classList && (n.classList.contains('etf-ctl') || n.classList.contains('etf-cap'))) return '';
    var tg = n.tagName;
    if (tg === 'BR') return ' ';
    if (tg === 'SCRIPT' || tg === 'STYLE' || tg === 'OPTION') return '';
    if (tg === 'INPUT' || tg === 'TEXTAREA') return n.type === 'checkbox' || n.type === 'radio' ? (n.checked ? '✓' : '') : ' ' + n.value + ' ';
    if (tg === 'SELECT') { var o = n.options[n.selectedIndex]; return o ? ' ' + o.text + ' ' : ''; }
    var s = '';
    for (var c = n.firstChild; c; c = c.nextSibling) s += texto(c);
    return BLOCO[tg] || bloco(n) ? ' ' + s + ' ' : s;
  };
  // elemento que aparece em outra linha (div, display:block/flex…): separa o texto, como na tela
  var bloco = function (el) {
    if (el.tagName === 'TD' || el.tagName === 'TH') return false;
    var d = getComputedStyle(el).display;
    return !!d && d.indexOf('inline') !== 0 && d !== 'contents' && d !== 'none';
  };
  var rotulo = function (td) { var v = limpo(texto(td)); return v.length > 120 ? v.slice(0, 117) + '…' : v; };
  var VAZIO = /^(—|-|–|)$/;
  // chave de ordem: data (dd/mm/aaaa [hh:mm]), número (pt-BR, com R$/US$/% ou unidade depois) ou texto
  var chave = function (v) {
    if (VAZIO.test(v)) return null;
    var m = /^(\d{2})\/(\d{2})\/(\d{4})(?:[ ,às]+(\d{1,2})[:h](\d{2}))?/.exec(v);
    if (m) return +m[3] * 1e8 + +m[2] * 1e6 + +m[1] * 1e4 + (m[4] ? +m[4] * 100 + +m[5] : 0);
    m = /^(?:(?:R\$|US\$|\$)\s*)?([-−]?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?)(?=$|\s|%)/.exec(v);
    if (m) return Number(m[1].replace('−', '-').replace(/\./g, '').replace(',', '.'));
    return v;
  };
  var cmp = function (a, b) {
    var na = typeof a === 'number', nb = typeof b === 'number';
    if (na && nb) return a - b;
    if (na !== nb) return na ? -1 : 1; // números antes de texto
    return String(a).localeCompare(String(b), 'pt', {numeric: true, sensitivity: 'base'});
  };
  var reactClique = function (el) {
    for (var k in el) if (k.indexOf('__reactProps') === 0 && el[k] && el[k].onClick) return true;
    return false;
  };

  /* ---- a tabela: títulos e linhas ---- */
  var cabecalho = function (t) {
    if (!t.tHead || t.tHead.rows.length !== 1 || t.tBodies.length !== 1) return null;
    var cs = [].slice.call(t.tHead.rows[0].cells);
    if (!cs.length || cs.some(function (c) { return c.colSpan > 1 || c.rowSpan > 1; })) return null;
    var cols = cs.map(function (c) { var tt = limpo(texto(c)); return {t: tt, ok: !!tt && !c.querySelector('input,select,button:not(.etf-b):not(.etf-ar)')}; });
    return cols.some(function (c) { return c.ok; }) ? cols : null;
  };
  var linhas = function (t, n) {
    var dados = [], fixas = [], grupo = false;
    [].forEach.call(t.tBodies[0].rows, function (r) {
      var ok = r.cells.length === n && ![].some.call(r.cells, function (c) { return c.colSpan > 1; });
      if (ok) { if (fixas.length) grupo = true; dados.push(r); } else fixas.push(r);
    });
    return {dados: dados, fixas: fixas, grupo: grupo};
  };
  var filtroAtivo = function (E) { return Object.keys(E.f).length > 0; };
  var passa = function (E, r, menos) {
    return Object.keys(E.f).every(function (ci) {
      ci = Number(ci);
      if (ci === menos) return true;
      var c = r.cells[ci];
      return c && E.f[ci].indexOf(rotulo(c)) >= 0;
    });
  };

  /* ---- controles no título ---- */
  var controles = function (t, E) {
    var ths = t.tHead.rows[0].cells;
    E.cols.forEach(function (c, i) {
      var th = ths[i];
      th.classList.toggle('etf-asc', E.s === i && E.d > 0);
      th.classList.toggle('etf-desc', E.s === i && E.d < 0);
      if (!c.ok) return;
      var ctl = th.querySelector(':scope > .etf-ctl');
      if (!ctl) {
        ctl = document.createElement('span');
        ctl.className = 'etf-ctl';
        ctl.innerHTML = '<button type="button" class="etf-ar" tabindex="-1" aria-hidden="true"></button><button type="button" class="etf-b"></button>';
        th.appendChild(ctl);
        th.classList.add('etf-th');
        if (!reactClique(th)) { th.classList.add('etf-ord'); th.title = 'Clique para ordenar por “' + c.t + '” (de novo: inverte). No ▾: escolher os itens.'; }
      }
      var b = ctl.querySelector('.etf-b');
      b.setAttribute('aria-label', 'Filtrar e ordenar: ' + c.t);
      b.title = 'Escolher os itens de “' + c.t + '” e ordenar';
      b.classList.toggle('etf-on', !!E.f[i]);
    });
  };
  var legenda = function (t, E, nDados, nVis) {
    var cap = t.querySelector(':scope > caption.etf-cap');
    if (!filtroAtivo(E) && E.s == null) { if (cap) cap.remove(); return; }
    if (!cap) {
      cap = document.createElement('caption');
      cap.className = 'etf-cap';
      t.insertBefore(cap, t.firstChild);
    }
    var partes = [];
    if (filtroAtivo(E)) partes.push('Mostrando ' + nVis + ' de ' + nDados + ' linha(s) — ' + Object.keys(E.f).map(function (ci) { return E.cols[ci].t + ': ' + E.f[ci].length + ' selecionado(s)'; }).join(', ') + (t.tFoot ? ' (o total embaixo é de todas as linhas)' : ''));
    if (E.s != null) partes.push('ordem: ' + E.cols[E.s].t + ' ' + (E.d > 0 ? '▲' : '▼'));
    cap.innerHTML = '<span></span><button type="button" class="etf-clr">Limpar filtro e ordem</button>';
    cap.firstChild.textContent = partes.join(' · ');
  };

  /* ---- aplicar filtro e ordem ---- */
  var aplicar = function (t) {
    var E = ST.get(t);
    if (!E) return;
    var L = linhas(t, E.n);
    if (L.grupo) { desligar(t); return; }
    var ativo = filtroAtivo(E);
    var novas = L.dados.filter(function (r) { return !E.seq.has(r); });
    novas.forEach(function (r) { E.seq.set(r, E.s == null ? ++E.nSeq : 1e9 + ++E.nSeq); }); // com ordem ligada: fim da ordem original
    // linha nova (＋) com o filtro ligado fica visível até o próximo filtro; a tabela toda redesenhada (ex.: depois de
    // salvar) não é linha nova
    if (E.pronta && ativo && novas.length && novas.length <= 3 && novas.length < L.dados.length) novas.forEach(function (r) { E.isentas.add(r); });
    if (E.s == null && !E.mexeu) L.dados.forEach(function (r, i) { E.seq.set(r, i + 1); }); // ordem do app
    var nVis = 0;
    L.dados.forEach(function (r) {
      var v = !ativo || E.isentas.has(r) || passa(E, r, -1);
      if (v) { nVis++; if (r.hasAttribute('data-etfh')) r.removeAttribute('data-etfh'); } else if (!r.hasAttribute('data-etfh')) r.setAttribute('data-etfh', '');
    });
    var ordem = null;
    if (E.s != null) {
      var ci = E.s, d = E.d;
      ordem = L.dados.map(function (r) { var c = r.cells[ci]; return {r: r, k: c ? chave(rotulo(c)) : null, q: E.seq.get(r)}; }).sort(function (A, B) {
        if (A.k == null || B.k == null) return ((A.k == null) - (B.k == null)) || A.q - B.q; // vazios sempre no fim
        return d * cmp(A.k, B.k) || A.q - B.q;
      }).map(function (x) { return x.r; });
      E.mexeu = true;
    } else if (E.mexeu) {
      ordem = L.dados.slice().sort(function (a, b) { return E.seq.get(a) - E.seq.get(b); });
      E.mexeu = false;
    }
    if (ordem) {
      var tb = t.tBodies[0], atual = L.dados;
      if (ordem.some(function (r, i) { return r !== atual[i]; }) || (L.fixas.length && L.dados.length && L.fixas[0].rowIndex < L.dados[L.dados.length - 1].rowIndex)) {
        ordem.forEach(function (r) { tb.appendChild(r); });
        L.fixas.forEach(function (r) { tb.appendChild(r); }); // linhas fora do formato (ex.: "nenhum item") ficam no fim
      }
    }
    controles(t, E);
    legenda(t, E, L.dados.length, nVis);
    E.pronta = true;
  };
  var desligar = function (t) {
    var E = ST.get(t);
    if (!E) return;
    ST.delete(t);
    [].forEach.call(t.querySelectorAll('.etf-ctl'), function (x) { x.remove(); });
    [].forEach.call(t.querySelectorAll('th.etf-th'), function (th) { th.classList.remove('etf-th', 'etf-ord', 'etf-asc', 'etf-desc'); th.removeAttribute('title'); });
    [].forEach.call(t.querySelectorAll('tr[data-etfh]'), function (r) { r.removeAttribute('data-etfh'); });
    var cap = t.querySelector(':scope > caption.etf-cap'); if (cap) cap.remove();
  };
  var processar = function (t) {
    if (!t.isConnected || t.closest('[data-tf="0"],.etf-pop')) return;
    var E = ST.get(t);
    var cols = cabecalho(t);
    if (!cols) { if (E) desligar(t); return; }
    var sig = cols.map(function (c) { return c.t; }).join('|');
    if (E && E.sig !== sig) { desligar(t); E = null; }
    if (!E) {
      var L = linhas(t, cols.length);
      if (L.grupo || !L.dados.length) return;
      E = {n: cols.length, cols: cols, sig: sig, s: null, d: 1, f: {}, seq: new WeakMap(), nSeq: 0, isentas: new WeakSet(), mexeu: false, pronta: false};
      ST.set(t, E);
    } else E.cols = cols;
    aplicar(t);
  };

  /* ---- observa o app: tabela nova ou redesenhada ---- */
  var obs;
  var rodar = function (tabs) {
    tabs.forEach(function (t) { try { processar(t); } catch (e) { /* nunca atrapalha o app */ } });
    obs.takeRecords(); // as mudanças feitas aqui não voltam para o observador
  };
  obs = new MutationObserver(function (muts) {
    var tabs = new Set();
    muts.forEach(function (m) {
      var el = m.target.nodeType === 1 ? m.target : m.target.parentElement;
      var t = el && el.closest ? el.closest('table') : null;
      if (t) tabs.add(t);
      [].forEach.call(m.addedNodes, function (n) {
        if (n.nodeType !== 1) return;
        if (n.tagName === 'TABLE') tabs.add(n);
        else [].forEach.call(n.getElementsByTagName('table'), function (x) { tabs.add(x); });
      });
    });
    if (tabs.size) rodar(tabs);
  });
  var iniciar = function () {
    obs.observe(document.body, {childList: true, subtree: true, characterData: true});
    rodar(new Set([].slice.call(document.getElementsByTagName('table'))));
  };
  if (document.body) iniciar(); else document.addEventListener('DOMContentLoaded', iniciar);

  // o clique que fecha o painel só fecha o painel (não fecha a janela atrás nem aperta botão)
  var engolir = false;
  document.addEventListener('mousedown', function (e) {
    var p = document.getElementById('etfPop');
    if (p && !p.contains(e.target) && !(e.target.closest && e.target.closest('.etf-b'))) { fecharPop(); engolir = true; setTimeout(function () { engolir = false; }, 600); }
  }, true);
  document.addEventListener('click', function (e) { if (engolir) { engolir = false; e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  /* ---- cliques: ordenar pelo título, ▾, limpar ---- */
  var ordenar = function (t, ci, d) {
    var E = ST.get(t); if (!E) return;
    if (d) { E.s = ci; E.d = d; } else if (E.s === ci) E.d = -E.d; else { E.s = ci; E.d = 1; }
    rodar(new Set([t]));
  };
  document.addEventListener('click', function (e) {
    var el = e.target;
    if (!el || !el.closest) return;
    var clr = el.closest('.etf-clr');
    if (clr) {
      e.preventDefault(); e.stopPropagation();
      var tc = clr.closest('table'), Ec = ST.get(tc);
      if (Ec) { Ec.f = {}; Ec.s = null; Ec.isentas = new WeakSet(); rodar(new Set([tc])); }
      return;
    }
    var b = el.closest('.etf-b, .etf-ar');
    var th = b ? b.closest('th') : el.closest('th.etf-ord');
    if (!th || (!b && el.closest('input,select,textarea,button,a'))) return;
    var t = th.closest('table'), E = ST.get(t);
    if (!E) return;
    var ci = th.cellIndex;
    e.preventDefault(); e.stopPropagation();
    if (b && b.classList.contains('etf-b')) abrirPop(t, ci, b);
    else ordenar(t, ci);
  }, true);

  /* ---- painel ▾ (como o do Gerencial) ---- */
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); };
  var fecharPop = function () { var p = document.getElementById('etfPop'); if (p) p.remove(); };
  var abrirPop = function (t, ci, btn) {
    var aberto = document.getElementById('etfPop');
    if (aberto && aberto._alvo === t && aberto._ci === ci) { fecharPop(); return; }
    fecharPop();
    var E = ST.get(t); if (!E) return;
    var col = E.cols[ci], cont = {}, ord = {};
    linhas(t, E.n).dados.forEach(function (r) {
      if (!passa(E, r, ci)) return;
      var l = rotulo(r.cells[ci]);
      var k = l === '' ? '(vazio)' : l;
      cont[k] = (cont[k] || 0) + 1;
      if (!(k in ord)) ord[k] = l === '' ? null : chave(l);
    });
    var vals = Object.keys(cont).sort(function (a, b) {
      var na = ord[a] == null, nb = ord[b] == null;
      return (na - nb) || (na ? 0 : cmp(ord[a], ord[b])) || a.localeCompare(b, 'pt');
    });
    var sel = E.f[ci] || null;
    var marcado = function (v) { return !sel || sel.indexOf(v === '(vazio)' ? '' : v) >= 0; };
    var p = document.createElement('div');
    p.id = 'etfPop'; p.className = 'etf-pop'; p._alvo = t; p._ci = ci; p._aberto = Date.now();
    p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Filtrar e ordenar: ' + col.t);
    p.innerHTML = '<div class="etf-pt">' + esc(col.t) + '</div>' +
      '<div class="etf-po"><button type="button" class="btn-o" data-o="1">↑ Crescente</button><button type="button" class="btn-o" data-o="-1">↓ Decrescente</button></div>' +
      '<input type="search" class="etf-q" placeholder="Buscar…" aria-label="Buscar nos itens">' +
      '<label class="etf-all"><input type="checkbox"> <span>(Selecionar tudo)</span></label>' +
      '<div class="etf-list">' + vals.map(function (v, k) {
        return '<div class="etf-it" data-l="' + esc(v.toLowerCase()) + '"><label><input type="checkbox" data-k="' + k + '"' + (marcado(v) ? ' checked' : '') + '> <span class="etf-v">' + esc(v) + '</span><em>' + cont[v] + '</em></label><button type="button" class="etf-so" data-so="' + k + '" title="Mostrar só este">só este</button></div>';
      }).join('') + '</div>' +
      '<div class="etf-pr"><button type="button" class="btn-o" data-a="limpar">Mostrar todos</button><span style="flex:1"></span><button type="button" class="btn-o" data-a="cancelar">Cancelar</button><button type="button" class="btn-r" data-a="ok">Aplicar</button></div>';
    document.body.appendChild(p);
    var r = btn.getBoundingClientRect(), w = p.offsetWidth, vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    p.style.left = (window.scrollX + Math.max(8, Math.min(r.right - w, vw - w - 8))) + 'px';
    var top = r.bottom + 4;
    if (top + p.offsetHeight > vh - 8 && r.top - 4 - p.offsetHeight > 8) top = r.top - 4 - p.offsetHeight;
    p.style.top = (window.scrollY + top) + 'px';
    var cbs = [].slice.call(p.querySelectorAll('.etf-list input')), all = p.querySelector('.etf-all input'), ok = p.querySelector('[data-a="ok"]');
    var visivel = function (cb) { return cb.closest('.etf-it').style.display !== 'none'; };
    var sync = function () {
      var vs = cbs.filter(visivel), n = vs.filter(function (cb) { return cb.checked; }).length;
      all.checked = vs.length > 0 && n === vs.length; all.indeterminate = n > 0 && n < vs.length;
      ok.disabled = !vs.some(function (cb) { return cb.checked; });
    };
    sync();
    var aplicarSel = function (lista) {
      if (!lista || lista.length === vals.length) delete E.f[ci];
      else E.f[ci] = lista.map(function (v) { return v === '(vazio)' ? '' : v; });
      E.isentas = new WeakSet();
      fecharPop(); rodar(new Set([t]));
    };
    p.addEventListener('input', function (e) {
      if (!e.target.classList.contains('etf-q')) return;
      var q = e.target.value.trim().toLowerCase();
      p.querySelectorAll('.etf-it').forEach(function (it) { it.style.display = !q || it.dataset.l.indexOf(q) >= 0 ? '' : 'none'; });
      sync();
    });
    p.addEventListener('change', function (e) {
      if (e.target === all) cbs.forEach(function (cb) { if (visivel(cb)) cb.checked = all.checked; });
      sync();
    });
    p.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.so != null) aplicarSel([vals[Number(b.dataset.so)]]);
      else if (b.dataset.o) { fecharPop(); ordenar(t, ci, Number(b.dataset.o)); }
      else if (b.dataset.a === 'ok') aplicarSel(cbs.filter(function (cb) { return cb.checked && visivel(cb); }).map(function (cb) { return vals[Number(cb.dataset.k)]; }));
      else if (b.dataset.a === 'limpar') aplicarSel(null);
      else if (b.dataset.a === 'cancelar') fecharPop();
    });
    p.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.classList.contains('etf-q') && !ok.disabled) { e.preventDefault(); ok.click(); }
    });
    p.querySelector('.etf-q').focus({preventScroll: true});
  };
  // fecha o painel: clique fora, Esc, rolagem fora dele
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.getElementById('etfPop')) { e.stopPropagation(); fecharPop(); } }, true);
  // (a rolagem que acontece logo ao abrir — o navegador trazendo o título para a tela — não fecha o painel)
  document.addEventListener('scroll', function (e) { var p = document.getElementById('etfPop'); if (p && !p.contains(e.target) && Date.now() - (p._aberto || 0) > 400) fecharPop(); }, true);
  window.EARL_TF = {processar: processar, estado: function (t) { return ST.get(t); }};
})();
