  /* ================= e22 (pedidos do Hugo, 27/11/2026) =================
     1. Operação salva fora do trecho visível do Gantt: a janela do Gantt vai até ela (antes ela "sumia").
     2. Desfazer / refazer como no Excel: Ctrl+Z, Ctrl+Y (ou Ctrl+Shift+Z) e os botões "↶ Desfazer" / "↷ Refazer".
        Guarda o banco antes de cada alteração (updateDB, no patch); até 60 passos, só enquanto o arquivo está aberto.
     3. Cards dos contratos: arrastar para mudar a ordem; grupos (um card que junta vários contratos, abre como uma
        pasta); exportar o grupo num .json só (o importar recria o grupo). Tudo em db.engCards = {ordem, grupos}.
     A fila da sonda (planCascade/planChain) passou a valer só dentro do mesmo contrato (patch, bloco e22). */

  /* ---- 1. a operação salva aparece no Gantt ---- */
  var engMostrarOpNoGantt = j => {
    if (!j || !j.date) return;
    var ms = s => dParse(s).getTime();
    var hoje = dToday();
    var w0 = planWin || {
      s: ms(dAdd(hoje, -PLAN_ABRE_ATRAS)),
      e: ms(dAdd(hoje, PLAN_ABRE_FRENTE))
    };
    var a = ms(j.date),
      b = ms(pjEnd(j)) + 864e5;
    if (planWin && b > w0.s && a < w0.e) return; // já aparece
    if (!planWin && b > w0.s && a < w0.e) return;
    var w = Math.max(w0.e - w0.s, 21 * 864e5);
    setPlanWin({
      s: a - w * 0.25,
      e: a - w * 0.25 + w
    });
  };

  /* ---- 2. desfazer / refazer ---- */
  var engDesfazer = () => {
    var u = engUndoRef.current;
    if (!u.length) return;
    var it = u.pop();
    setDB(cur => {
      engRedoRef.current.push({
        db: cur,
        o: it.o
      });
      saveDB(it.db);
      return it.db;
    });
    setEngHistN(n => n + 1);
    setOkMsg('↶ Desfeito' + (it.o ? ': ' + it.o : ''));
    setTimeout(() => setOkMsg(''), 3000);
  };
  var engRefazer = () => {
    var r = engRedoRef.current;
    if (!r.length) return;
    var it = r.pop();
    setDB(cur => {
      engUndoRef.current.push({
        db: cur,
        o: it.o
      });
      saveDB(it.db);
      return it.db;
    });
    setEngHistN(n => n + 1);
    setOkMsg('↷ Refeito' + (it.o ? ': ' + it.o : ''));
    setTimeout(() => setOkMsg(''), 3000);
  };
  var engHistFnRef = useRef(null);
  engHistFnRef.current = {
    desfazer: engDesfazer,
    refazer: engRefazer
  };
  useEffect(() => {
    var tecla = e => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      var k = String(e.key || '').toLowerCase();
      var desf = k === 'z' && !e.shiftKey,
        ref = k === 'y' || k === 'z' && e.shiftKey;
      if (!desf && !ref) return;
      var t = e.target;
      var tag = t && t.tagName;
      // dentro de um campo de texto vale o desfazer do próprio campo; com uma janela aberta, nada muda por baixo dela
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t && t.isContentEditable) return;
      if (document.querySelector('.overlay')) return;
      e.preventDefault();
      if (desf) engHistFnRef.current.desfazer();else engHistFnRef.current.refazer();
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, []);
  var engHistBotoes = () => {
    var u = engUndoRef.current,
      r = engRedoRef.current;
    var ultU = u[u.length - 1],
      ultR = r[r.length - 1];
    return engH(React.Fragment, null, engH("button", {
      className: "btn-o eng-desfazer",
      disabled: !u.length,
      onClick: engDesfazer,
      title: u.length ? 'Desfazer' + (ultU && ultU.o ? ': ' + ultU.o : ' a última alteração') + ' (Ctrl+Z)' : 'Nada para desfazer (Ctrl+Z)'
    }, "↶ Desfazer"), engH("button", {
      className: "btn-o eng-refazer",
      disabled: !r.length,
      onClick: engRefazer,
      title: r.length ? 'Refazer' + (ultR && ultR.o ? ': ' + ultR.o : '') + ' (Ctrl+Y)' : 'Nada para refazer (Ctrl+Y)'
    }, "↷ Refazer"));
  };

  /* ---- 3. cards dos contratos: ordem, grupos e exportar o grupo ---- */
  var engCardsCfg = d => {
    var c = (d || db).engCards;
    return c && typeof c === 'object' ? c : {
      ordem: [],
      grupos: []
    };
  };
  // os itens da página inicial, na ordem: {tipo:'ct', k:'ct:<id>', ct} ou {tipo:'gr', k:'gr:<id>', g:{id, nome, ctIds, cts}}
  var engCardsLista = cts => {
    var cfg = engCardsCfg();
    var porId = {};
    (cts || []).forEach(c => {
      porId[c.id] = c;
    });
    var grupos = (cfg.grupos || []).filter(g => g && g.id).map(g => ({
      ...g,
      cts: (g.ctIds || []).map(id => porId[id]).filter(Boolean)
    }));
    var emGrupo = new Set();
    grupos.forEach(g => g.cts.forEach(c => emGrupo.add(c.id)));
    var itens = [],
      usados = new Set();
    (cfg.ordem || []).forEach(k => {
      if (usados.has(k)) return;
      if (String(k).indexOf('gr:') === 0) {
        var g = grupos.find(x => 'gr:' + x.id === k);
        if (g) {
          itens.push({
            tipo: 'gr',
            k,
            g
          });
          usados.add(k);
        }
      } else if (String(k).indexOf('ct:') === 0) {
        var c = porId[k.slice(3)];
        if (c && !emGrupo.has(c.id)) {
          itens.push({
            tipo: 'ct',
            k,
            ct: c
          });
          usados.add(k);
        }
      }
    });
    grupos.forEach(g => {
      var k = 'gr:' + g.id;
      if (!usados.has(k)) {
        itens.push({
          tipo: 'gr',
          k,
          g
        });
        usados.add(k);
      }
    });
    (cts || []).forEach(c => {
      var k = 'ct:' + c.id;
      if (!emGrupo.has(c.id) && !usados.has(k)) {
        itens.push({
          tipo: 'ct',
          k,
          ct: c
        });
        usados.add(k);
      }
    });
    return itens;
  };
  var engCardsSalvar = (fn, desc) => {
    var topo = engCardsLista(engContratos).map(it => it.k); // a ordem que está na tela
    updateDB(d => {
      var c = engCardsCfg(d);
      var n = fn({
        ordem: topo.slice(),
        grupos: (c.grupos || []).filter(g => g && g.id).map(g => ({
          ...g,
          ctIds: (g.ctIds || []).slice()
        }))
      });
      return {
        ...d,
        engCards: n
      };
    }, {
      kind: 'Cards dos contratos',
      action: 'Organização',
      name: desc,
      user: currentUser() || '—'
    });
  };
  var engNomeCt = id => ((db.contratos || []).find(c => c.id === id) || {}).name || '';
  // mover um card (contrato ou grupo) para antes/depois de outro; contrato solto num grupo entra nele
  var engCardsMover = (origemK, alvoK, depois, grupoAlvoId) => {
    if (!origemK || origemK === alvoK) return;
    var ehCt = origemK.indexOf('ct:') === 0;
    var ctId = ehCt ? origemK.slice(3) : null;
    engCardsSalvar(cfg => {
      var top = cfg.ordem.filter(k => k !== origemK);
      if (ctId) cfg.grupos.forEach(g => {
        g.ctIds = g.ctIds.filter(x => x !== ctId);
      });
      if (grupoAlvoId && ctId) {
        var g = cfg.grupos.find(x => x.id === grupoAlvoId);
        if (g) {
          var i = alvoK && alvoK.indexOf('ct:') === 0 ? g.ctIds.indexOf(alvoK.slice(3)) : -1;
          if (i < 0) g.ctIds.push(ctId);else g.ctIds.splice(depois ? i + 1 : i, 0, ctId);
        }
      } else {
        var j = top.indexOf(alvoK);
        if (j < 0) top.push(origemK);else top.splice(depois ? j + 1 : j, 0, origemK);
      }
      cfg.ordem = top;
      return cfg;
    }, ehCt ? 'mover “' + engNomeCt(ctId) + '”' + (grupoAlvoId ? ' para o grupo “' + ((engCardsCfg().grupos || []).find(g => g.id === grupoAlvoId) || {}).nome + '”' : '') : 'mover o grupo');
  };
  var engGrupoDe = ctId => (engCardsCfg().grupos || []).find(g => (g.ctIds || []).includes(ctId)) || null;
  var engGrupoNovo = (nome, ids) => {
    var id = 'gr_' + uid();
    engCardsSalvar(cfg => {
      cfg.grupos.forEach(g => {
        g.ctIds = g.ctIds.filter(x => !ids.includes(x));
      });
      cfg.grupos.push({
        id,
        nome: String(nome || '').trim() || 'Grupo',
        ctIds: ids.slice()
      });
      // o grupo fica onde estava o 1º contrato marcado
      var pos = cfg.ordem.findIndex(k => ids.includes(String(k).slice(3)));
      var top = cfg.ordem.filter(k => !ids.includes(String(k).slice(3)));
      if (pos < 0) top.push('gr:' + id);else top.splice(Math.min(pos, top.length), 0, 'gr:' + id);
      cfg.ordem = top;
      return cfg;
    }, 'criar o grupo “' + (String(nome || '').trim() || 'Grupo') + '”');
    setEngGrAberto(x => ({
      ...x,
      [id]: true
    }));
    return id;
  };
  var engGrupoRenomear = (gid, nome) => engCardsSalvar(cfg => {
    var g = cfg.grupos.find(x => x.id === gid);
    if (g) g.nome = String(nome || '').trim() || g.nome;
    return cfg;
  }, 'renomear o grupo para “' + String(nome || '').trim() + '”');
  var engGrupoDesfazer = gid => engCardsSalvar(cfg => {
    var g = cfg.grupos.find(x => x.id === gid);
    var pos = cfg.ordem.indexOf('gr:' + gid);
    var top = cfg.ordem.filter(k => k !== 'gr:' + gid);
    var cts = g ? g.ctIds.map(id => 'ct:' + id) : [];
    if (pos < 0) top = top.concat(cts);else top.splice(pos, 0, ...cts);
    cfg.ordem = top;
    cfg.grupos = cfg.grupos.filter(x => x.id !== gid);
    return cfg;
  }, 'desfazer o grupo “' + (((engCardsCfg().grupos || []).find(g => g.id === gid) || {}).nome || '') + '”');
  var engTirarDoGrupo = ctId => {
    var g = engGrupoDe(ctId);
    if (!g) return;
    engCardsMover('ct:' + ctId, 'gr:' + g.id, true, null);
  };
  var engPorNoGrupo = (ctId, gid) => engCardsMover('ct:' + ctId, null, true, gid);

  // exportar o grupo: um .json com todos os contratos do grupo (o importar recria o grupo)
  var engDbDosContratos = cts => {
    var cIds = new Set(cts.map(c => c.id));
    var jobs = (db.plannedJobs || []).filter(j => cts.some(c => pjDoContrato(j, c)));
    var jIds = new Set(jobs.map(j => j.id));
    return {
      ...db,
      contratos: (db.contratos || []).filter(c => cIds.has(c.id)),
      plannedJobs: jobs,
      handovers: (db.handovers || []).filter(h => (h.opIds || []).length && h.opIds.every(id => jIds.has(id))),
      invSondas: (db.invSondas || []).filter(v => cIds.has(v.ctId)),
      opTemplates: (db.opTemplates || []).filter(t => !t.contratoId || cIds.has(t.contratoId))
    };
  };
  // nome do arquivo do grupo: EARL_FORECAST_<NOME DO CARD>_AAAA.MM.DD_HHhMM.json (pedido do Hugo)
  var engNomeArqGrupo = (g, quando) => 'EARL_FORECAST_' + (engLimpaNomeArq(g.nome) || 'GRUPO') + '_' + (quando || engCarimboArq()) + '.json';
  var engArqGrupo = (g, quando) => {
    var cts = (g.cts || (g.ctIds || []).map(id => (db.contratos || []).find(c => c.id === id))).filter(c => c && !c.archived);
    return engArqExport(engDbDosContratos(cts), cts, engNomeArqGrupo(g, quando), {
      grupo: {
        nome: g.nome,
        contratos: cts.map(c => c.name)
      }
    });
  };
  var engExportarGrupo = g => {
    try {
      var f = engArqGrupo(g);
      forceDownload([f]);
      setOkMsg('Grupo exportado ✓ — “' + g.nome + '”: um arquivo com ' + (g.cts || []).length + ' contrato(s). No outro arquivo, “⬆ Importar dados” traz os contratos e o grupo.');
      setTimeout(() => setOkMsg(''), 7000);
    } catch (e) {
      setSyncErr('Falha ao exportar o grupo: ' + (e && e.message || e));
    }
  };

  // arrastar os cards (só cards; arquivos do computador continuam indo para o importar)
  var [engGrAberto, setEngGrAberto] = useState({});
  var [engArrAlvo, setEngArrAlvo] = useState(null);
  var engArrRef = useRef(null);
  var engArrProps = (k, alvo) => ({
    draggable: true,
    "data-card": k,
    onDragStart: e => {
      engArrRef.current = k;
      try {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/x-earl-card', k);
      } catch (er) {}
      e.stopPropagation();
    },
    onDragEnd: () => {
      engArrRef.current = null;
      setEngArrAlvo(null);
    },
    onDragOver: e => {
      var o = engArrRef.current;
      if (!o || o === k) return;
      if (alvo.grupo && o.indexOf('gr:') === 0) return; // grupo não entra em grupo
      e.preventDefault();
      e.stopPropagation();
      var r = e.currentTarget.getBoundingClientRect();
      var rel = (e.clientX - r.left) / Math.max(1, r.width);
      var pos = alvo.ehGrupo && o.indexOf('ct:') === 0 && rel > 0.25 && rel < 0.75 ? 'dentro' : rel >= 0.5 ? 'depois' : 'antes';
      if (!engArrAlvo || engArrAlvo.k !== k || engArrAlvo.pos !== pos) setEngArrAlvo({
        k,
        pos
      });
    },
    onDragLeave: e => {
      if (e.currentTarget.contains(e.relatedTarget)) return;
      setEngArrAlvo(x => x && x.k === k ? null : x);
    },
    onDrop: e => {
      var o = engArrRef.current;
      if (!o) return;
      e.preventDefault();
      e.stopPropagation();
      var r = e.currentTarget.getBoundingClientRect();
      var rel = (e.clientX - r.left) / Math.max(1, r.width);
      var dentro = alvo.ehGrupo && o.indexOf('ct:') === 0 && rel > 0.25 && rel < 0.75;
      engArrRef.current = null;
      setEngArrAlvo(null);
      if (o === k) return;
      if (dentro) engCardsMover(o, null, true, alvo.ehGrupo);else engCardsMover(o, k, rel >= 0.5, o.indexOf('ct:') === 0 ? alvo.grupo || null : null);
    }
  });
  var engArrClasse = k => engArrAlvo && engArrAlvo.k === k ? ' eng2-alvo-' + engArrAlvo.pos : '';
  // o card de um contrato (o mesmo de antes) com o arrastar
  var engCardCt = (ct, i, rCt, gid) => {
    var el = rCt(ct, i);
    var k = 'ct:' + ct.id;
    return React.cloneElement(el, {
      key: k,
      className: (el.props.className || '') + ' eng2-arrastavel' + engArrClasse(k),
      ...engArrProps(k, {
        grupo: gid || null
      })
    });
  };
  var engGrupoCard = (it, i, faixa, abrir, tecla, rCt) => {
    var g = it.g;
    var cts = g.cts || [];
    var lista = planJobs.filter(j => cts.some(c => pjDoContrato(j, c)));
    var st = engStats(lista);
    var aberto = !!engGrAberto[g.id];
    var alternar = () => setEngGrAberto(x => ({
      ...x,
      [g.id]: !x[g.id]
    }));
    var acoes = engH("div", {
      className: "eng2-gr-acoes",
      onClick: e => e.stopPropagation(),
      onKeyDown: e => e.stopPropagation()
    }, engH("button", {
      type: "button",
      className: "btn-o eng2-gr-exp",
      disabled: !cts.length,
      onClick: () => engExportarGrupo(g),
      title: "Baixar um arquivo .json com todos os contratos deste grupo (o importar recria o grupo)"
    }, "⬇ Exportar grupo"), engH("button", {
      type: "button",
      className: "btn-o eng2-gr-ren",
      onClick: () => setEngGrDlg({
        modo: 'renomear',
        gid: g.id,
        nome: g.nome
      })
    }, "✎ Renomear"), engH("button", {
      type: "button",
      className: "btn-o eng2-gr-desf",
      onClick: () => engGrupoDesfazer(g.id),
      title: "Os contratos voltam a ser cards soltos (nada é apagado)"
    }, "Desagrupar"));
    if (aberto) return engH("div", {
      key: it.k,
      className: 'eng2-grupo-aberto' + engArrClasse(it.k),
      ...engArrProps(it.k, {
        ehGrupo: g.id
      })
    }, engH("div", {
      className: "eng2-gr-cab"
    }, engH("button", {
      type: "button",
      className: "eng2-gr-tit",
      onClick: alternar,
      title: "Fechar o grupo"
    }, engH("span", {
      className: "eng2-gr-ic"
    }, "🗂"), engH("b", null, g.nome), engH("em", null, cts.length + ' contrato(s) · ' + st.n + ' operação(ões)'), engH("span", {
      className: "eng2-gr-seta"
    }, "▴")), acoes), cts.length ? engH("div", {
      className: "eng2-grid eng2-gr-grid"
    }, cts.map((c, j) => engCardCt(c, i + j, rCt, g.id))) : engH("div", {
      className: "eng2-gr-vazio"
    }, "Grupo vazio: arraste um card de contrato para cá."));
    return engH("div", {
      key: it.k,
      role: "button",
      tabIndex: 0,
      className: 'eng2-card eng2-grupo eng2-arrastavel' + engArrClasse(it.k),
      style: {
        '--i': i + 1
      },
      onClick: alternar,
      onKeyDown: e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          alternar();
        }
      },
      title: 'Grupo “' + g.nome + '”: clique para abrir; arraste um contrato para cá para colocá-lo no grupo',
      ...engArrProps(it.k, {
        ehGrupo: g.id
      })
    }, engH("div", {
      className: "eng2-top"
    }, engH("div", {
      className: "eng2-gr-ic big"
    }, "🗂"), engH("div", {
      className: "eng2-id"
    }, engH("div", {
      className: "eng2-name"
    }, g.nome), engH("div", {
      className: "eng2-cli"
    }, cts.length + ' contrato(s)'))), faixa(lista), engH("div", {
      className: "eng2-stats"
    }, engH("div", null, engH("b", null, st.n), engH("span", null, "operações")), engH("div", null, engH("b", null, st.sondas), engH("span", null, "sondas")), engH("div", null, engH("b", null, st.prox ? fmtD(st.prox).slice(0, 5) : '—'), engH("span", null, "próxima"))), engH("div", {
      className: "eng2-tags"
    }, cts.slice(0, 4).map(c => engH("span", {
      key: c.id
    }, c.name)), cts.length > 4 && engH("span", null, '+' + (cts.length - 4))), engH("span", {
      className: "eng2-go",
      "aria-hidden": "true"
    }, "▾"));
  };
  // a barra acima dos cards
  var [engGrDlg, setEngGrDlg] = useState(null);
  var engCardsBarra = () => engH("div", {
    className: "eng2-cards-barra"
  }, engH("button", {
    type: "button",
    className: "btn-o eng2-novo-grupo",
    onClick: () => setEngGrDlg({
      modo: 'novo',
      nome: '',
      sel: []
    }),
    title: "Juntar contratos num card só (por cliente, região, tipo… como preferir)"
  }, "🗂 Novo grupo"), engH("span", null, "Arraste os cards para mudar a ordem. Solte um contrato no meio de um grupo para colocá-lo nele."));
  // janela: novo grupo / renomear / pôr um contrato num grupo
  var renderEngGrDlg = () => {
    var dl = engGrDlg;
    if (!dl) return null;
    var fechar = () => setEngGrDlg(null);
    var set = (k, v) => setEngGrDlg(x => ({
      ...x,
      [k]: v
    }));
    var grupos = engCardsCfg().grupos || [];
    var tit = dl.modo === 'novo' ? '🗂 Novo grupo' : dl.modo === 'renomear' ? '✎ Renomear o grupo' : '🗂 Pôr num grupo';
    var corpo, ok, okTxt, fazer;
    if (dl.modo === 'novo') {
      var sel = dl.sel || [];
      corpo = engH(React.Fragment, null, engH("div", {
        className: "fld"
      }, engH("label", {
        className: "lbl"
      }, "Nome do grupo *"), engH("input", {
        className: "ipt eng2-gr-nome",
        value: dl.nome,
        autoFocus: true,
        placeholder: "ex.: Transocean, Macaé, Seadrill 2026…",
        onChange: e => set('nome', e.target.value)
      })), engH("div", {
        className: "ec-imp-ajuda"
      }, "Marque os contratos do grupo (dá para pôr outros depois, arrastando o card para o grupo):"), engH("div", {
        className: "tbl-scroll eng2-gr-lista"
      }, engH("table", {
        className: "db-table",
        "data-tf": "0"
      }, engH("tbody", null, engContratos.map(c => {
        var on = sel.includes(c.id);
        var gAt = engGrupoDe(c.id);
        return engH("tr", {
          key: c.id,
          className: on ? 'ec-imp-on' : '',
          style: {
            cursor: 'pointer'
          },
          onClick: e => {
            if (e.target.tagName !== 'INPUT') set('sel', on ? sel.filter(x => x !== c.id) : [...sel, c.id]);
          }
        }, engH("td", null, engH("input", {
          type: "checkbox",
          className: "eng2-gr-cb",
          checked: on,
          onChange: () => set('sel', on ? sel.filter(x => x !== c.id) : [...sel, c.id])
        })), engH("td", null, engH("b", null, c.name)), engH("td", null, c.clientName || '—'), engH("td", {
          className: "eng2-gr-de"
        }, gAt ? 'no grupo “' + gAt.nome + '”' : ''));
      })))));
      ok = !!String(dl.nome || '').trim();
      okTxt = 'Criar o grupo' + (sel.length ? ' com ' + sel.length + ' contrato(s)' : '');
      fazer = () => {
        engGrupoNovo(dl.nome, sel);
        fechar();
      };
    } else if (dl.modo === 'renomear') {
      corpo = engH("div", {
        className: "fld"
      }, engH("label", {
        className: "lbl"
      }, "Nome do grupo *"), engH("input", {
        className: "ipt eng2-gr-nome",
        value: dl.nome,
        autoFocus: true,
        onChange: e => set('nome', e.target.value)
      }));
      ok = !!String(dl.nome || '').trim();
      okTxt = 'Salvar';
      fazer = () => {
        engGrupoRenomear(dl.gid, dl.nome);
        fechar();
      };
    } else {
      var ct = (db.contratos || []).find(c => c.id === dl.ctId) || {};
      var gAt = engGrupoDe(dl.ctId);
      corpo = engH(React.Fragment, null, engH("div", {
        className: "ec-imp-ajuda"
      }, "Contrato ", engH("b", null, ct.name), gAt ? ' (hoje no grupo “' + gAt.nome + '”)' : '', ". Escolha o grupo:"), engH("div", {
        className: "eng2-gr-ops"
      }, grupos.map(g => engH("label", {
        key: g.id,
        className: 'eng-dup-op' + (dl.gid === g.id ? ' on' : '')
      }, engH("input", {
        type: "radio",
        name: "eng2-gr-esc",
        checked: dl.gid === g.id,
        onChange: () => set('gid', g.id)
      }), engH("span", null, engH("b", null, g.nome), engH("em", null, (g.ctIds || []).length + ' contrato(s)')))), engH("label", {
        className: 'eng-dup-op' + (dl.gid === '__novo' ? ' on' : '')
      }, engH("input", {
        type: "radio",
        name: "eng2-gr-esc",
        className: "eng2-gr-esc-novo",
        checked: dl.gid === '__novo',
        onChange: () => set('gid', '__novo')
      }), engH("span", null, engH("b", null, "Grupo novo"), dl.gid === '__novo' && engH("input", {
        className: "ipt eng2-gr-nome",
        value: dl.nome || '',
        autoFocus: true,
        placeholder: "Nome do grupo",
        onClick: e => e.stopPropagation(),
        onChange: e => set('nome', e.target.value)
      })))));
      ok = dl.gid === '__novo' ? !!String(dl.nome || '').trim() : !!dl.gid;
      okTxt = 'Pôr no grupo';
      fazer = () => {
        if (dl.gid === '__novo') engGrupoNovo(dl.nome, [dl.ctId]);else engPorNoGrupo(dl.ctId, dl.gid);
        fechar();
      };
    }
    return engH("div", {
      className: "overlay",
      style: {
        zIndex: 300
      },
      onClick: e => {}
    }, engH("div", {
      className: "modal ec-modal eng2-gr-dlg",
      onClick: e => e.stopPropagation()
    }, engH("div", {
      className: "modal-title"
    }, engH("span", null, tit), engH("button", {
      className: "modal-close",
      onClick: fechar
    }, "\xD7")), corpo, engH("div", {
      className: "ec-foot"
    }, engH("span", {
      style: {
        flex: 1
      }
    }), engH("button", {
      className: "btn-o",
      onClick: fechar
    }, "Cancelar"), engH("button", {
      className: "btn-r eng2-gr-ok",
      disabled: !ok,
      onClick: fazer
    }, okTxt))));
  };

  /* ---- 4. os filtros do plano ficam guardados (até a pessoa mudar), também ao reabrir o arquivo ---- */
  useEffect(() => {
    try {
      localStorage.setItem('eng_filtros_v1', JSON.stringify({
        planView: planView === 'rec' ? 'gantt' : planView,
        planF,
        planMF,
        planOrd,
        planSoJan,
        planListDays
      }));
    } catch (e) {}
  }, [planView, planF, planMF, planOrd, planSoJan, planListDays]);
