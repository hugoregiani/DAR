  /* ================= e19 (pedido do Hugo, 27/11/2026) =================
     1. "⬇ Exportar dados": com mais de um contrato ativo no arquivo, pergunta quais exportar (todos marcados). e20: sai
        um .json por contrato, EARL_FORECAST_<CLIENTE>_<CONTRATO>_AAAA.MM.DD_HHhMM.json (engExportar/engNomeArqCt/
        engCarimboArq, eng_app.js). A importação já perguntava (janela "⬆ Importar dados", contrato por contrato).
     2. Calendário: o tipo da operação aparece no dia; "abrir" mostra só as operações daquele dia (clique = editar).
     3. Cor da sonda (escolhida no nome da sonda, no Gantt): a barra da operação fica na cor da sonda e a faixa de
        baixo na cor da legenda (situação), como no EARL. Sem cor escolhida, a barra fica como antes (cor da legenda).
     As janelas que mudam de tamanho ficam no eng_redim.js (script avulso, fora do React). */

  /* ---- 1. exportar: escolher os contratos ---- */
  var [engExpSel, setEngExpSel] = useState(null);
  var engExportarPedir = () => {
    var ativos = (db.contratos || []).filter(c => !c.archived);
    var temGr = (engCardsCfg().grupos || []).some(g => (g.ctIds || []).some(id => ativos.some(c => c.id === id)));
    if (ativos.length <= 1 && !temGr) {
      engExportar();
      return;
    }
    setEngExpSel({
      sel: ativos.map(c => c.id),
      gr: [] // e22: grupos (um arquivo por grupo), desmarcados no começo
    });
  };
  var renderEngExpSel = () => {
    if (!engExpSel) return null;
    var ativos = (db.contratos || []).filter(c => !c.archived);
    var sel = engExpSel.sel.filter(id => ativos.some(c => c.id === id));
    var todos = sel.length === ativos.length;
    var fechar = () => setEngExpSel(null);
    var marcar = id => setEngExpSel(x => ({
      ...x,
      sel: x.sel.includes(id) ? x.sel.filter(y => y !== id) : [...x.sel, id]
    }));
    var escolhidos = ativos.filter(c => sel.includes(c.id));
    var grupos = (engCardsCfg().grupos || []).map(g => ({
      ...g,
      cts: (g.ctIds || []).map(id => ativos.find(c => c.id === id)).filter(Boolean)
    })).filter(g => g.cts.length);
    var grSel = (engExpSel.gr || []).filter(id => grupos.some(g => g.id === id));
    var marcarGr = id => setEngExpSel(x => ({
      ...x,
      gr: (x.gr || []).includes(id) ? x.gr.filter(y => y !== id) : [...(x.gr || []), id]
    }));
    var nArqs = escolhidos.length + grSel.length;
    var nArq = (db.contratos || []).filter(c => c && c.archived).length; // e20: os arquivados não aparecem nem entram no nome
    var nOps = c => (db.plannedJobs || []).filter(j => j.status !== PJ_STATUS.CANC && pjDoContrato(j, c)).length;
    // operações sem contrato (ou de contrato arquivado) não vão em nenhum arquivo
    var semCt = (db.plannedJobs || []).filter(j => j.status !== PJ_STATUS.CANC && !ativos.some(c => pjDoContrato(j, c))).length;
    var quando = engCarimboArq();
    return engH("div", {
      className: "overlay",
      style: {
        zIndex: 300
      },
      onClick: e => {} // só fecha pelos botões
    }, engH("div", {
      className: "modal ec-modal eng-expsel",
      onClick: e => e.stopPropagation()
    }, engH("div", {
      className: "modal-title"
    }, engH("span", null, "⬇ Exportar dados"), engH("button", {
      className: "modal-close",
      onClick: fechar
    }, "\xD7")), engH("div", {
      className: "ec-imp-ajuda"
    }, "Este arquivo tem ", engH("b", null, ativos.length + " contratos ativos"), ". Marque os que quer exportar: ", engH("b", null, "sai um arquivo .json para cada contrato"), ", com as operações, os consumos, os handovers e o inventário das sondas dele (e as sondas, o câmbio, os químicos e o casing)."), engH("div", {
      className: "tbl-scroll"
    }, engH("table", {
      className: "db-table eng-expsel-tab",
      "data-tf": "0"
    }, engH("thead", null, engH("tr", null, engH("th", null, engH("input", {
      type: "checkbox",
      className: "eng-expsel-todos",
      checked: todos,
      onChange: () => setEngExpSel(x => ({
        ...x,
        sel: todos ? [] : ativos.map(c => c.id)
      })),
      "aria-label": "Marcar todos"
    })), engH("th", null, "Contrato"), engH("th", null, "Cliente"), engH("th", null, "Operações"))), engH("tbody", null, ativos.map(c => {
      var on = sel.includes(c.id);
      return engH("tr", {
        key: c.id,
        className: on ? 'ec-imp-on' : '',
        onClick: e => {
          if (e.target.tagName !== 'INPUT') marcar(c.id);
        },
        style: {
          cursor: 'pointer'
        }
      }, engH("td", null, engH("input", {
        type: "checkbox",
        className: "eng-expsel-cb",
        checked: on,
        onChange: () => marcar(c.id),
        "aria-label": 'Exportar ' + c.name
      })), engH("td", null, engH("b", null, c.name)), engH("td", null, c.clientName || '—'), engH("td", {
        className: "ec-num"
      }, nOps(c)));
    })))), grupos.length > 0 && engH("div", {
      className: "eng-expsel-grs"
    }, engH("div", {
      className: "ec-imp-ajuda"
    }, engH("b", null, "Grupos"), " — marque para sair ", engH("b", null, "um arquivo com todos os contratos do grupo"), " (quem importar recebe o grupo junto):"), engH("table", {
      className: "db-table eng-expsel-tab eng-expsel-grtab",
      "data-tf": "0"
    }, engH("tbody", null, grupos.map(g => engH("tr", {
      key: g.id,
      className: grSel.includes(g.id) ? 'ec-imp-on' : '',
      style: {
        cursor: 'pointer'
      },
      onClick: e => {
        if (e.target.tagName !== 'INPUT') marcarGr(g.id);
      }
    }, engH("td", null, engH("input", {
      type: "checkbox",
      className: "eng-expsel-gr",
      checked: grSel.includes(g.id),
      onChange: () => marcarGr(g.id),
      "aria-label": 'Exportar o grupo ' + g.nome
    })), engH("td", null, engH("b", null, "🗂 " + g.nome)), engH("td", null, g.cts.map(c => c.name).join(', '))))))), engH("div", {
      className: "eng-expsel-nome"
    }, engH("span", null, nArqs === 1 ? "Arquivo" : "Arquivos (" + nArqs + ")"), nArqs ? escolhidos.map(c => engH("code", {
      key: c.id,
      className: "eng-expsel-arqnome"
    }, engNomeArqCt(c, quando))).concat(grupos.filter(g => grSel.includes(g.id)).map(g => engH("code", {
      key: g.id,
      className: "eng-expsel-arqnome eng-expsel-arqgr"
    }, engNomeArqGrupo(g, quando)))) : engH("code", null, "—"), engH("em", null, "(a hora vai com “h”, porque o Windows não aceita “:” no nome de arquivo" + (nArqs > 1 ? "; se o navegador perguntar se pode baixar vários arquivos, clique em “Permitir”" : "") + ")"), nArq > 0 && engH("em", {
      className: "eng-expsel-arq"
    }, nArq + ' contrato(s) arquivado(s) não aparece(m) aqui e não é(são) exportado(s) (só os ativos).'), semCt > 0 && engH("em", {
      className: "eng-expsel-arq eng-expsel-semct"
    }, '⚠ ' + semCt + ' operação(ões) sem contrato ativo não vão em nenhum arquivo: escolha o contrato delas antes de exportar.')), engH("div", {
      className: "ec-foot"
    }, engH("span", {
      style: {
        flex: 1
      }
    }), engH("button", {
      className: "btn-o",
      onClick: fechar
    }, "Cancelar"), engH("button", {
      className: "btn-r eng-expsel-ok",
      disabled: !nArqs,
      onClick: () => {
        var ids = sel.slice(),
          gids = grSel.slice();
        setEngExpSel(null);
        engExportar(ids, gids);
      }
    }, nArqs ? '⬇ Exportar ' + nArqs + (nArqs === 1 ? ' arquivo' : ' arquivos') : 'Marque um contrato'))));
  };

  /* ---- 2. calendário: o tipo no dia e a janela do dia (só as operações daquele dia) ---- */
  var engCalTipo = j => j && j.well ? engH("div", {
    className: "eng-cal-tipo"
  }, tipoTxt(j) || j.tipoOp || '') : null;
  var [engDia, setEngDia] = useState(null);
  var renderEngDia = () => {
    if (!engDia) return null;
    var fechar = () => setEngDia(null);
    var nomeRig = j => (rigById[j.rigId] || {}).name || '';
    var l = (planFiltered || []).filter(j => j.status !== PJ_STATUS.CANC && pjDays(j).includes(engDia)).slice().sort((a, b) => nomeRig(a).localeCompare(nomeRig(b), 'pt') || String(a.date).localeCompare(String(b.date)));
    var sem = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'][new Date(engDia + 'T12:00:00').getDay()] || '';
    var editar = j => {
      setEngDia(null);
      setPlanDraft({
        ...j
      });
    };
    return engH("div", {
      className: "overlay",
      style: {
        zIndex: 260
      },
      onClick: e => {
        if (e.target === e.currentTarget) fechar();
      }
    }, engH("div", {
      className: "modal ec-modal eng-dia-modal",
      onClick: e => e.stopPropagation()
    }, engH("div", {
      className: "modal-title"
    }, engH("span", null, "Dia " + fmtD(engDia), engH("em", {
      className: "eng-dia-sem"
    }, " · " + sem)), engH("button", {
      className: "modal-close",
      onClick: fechar
    }, "\xD7")), engH("div", {
      className: "eng-dia-sub"
    }, l.length ? engH(React.Fragment, null, engH("b", null, l.length + ' operação(ões)'), ' neste dia (com os filtros da tela). Clique numa operação para abrir e editar.') : 'Nenhuma operação neste dia (com os filtros da tela).'), l.length > 0 && engH("div", {
      className: "eng-dia-lista"
    }, l.map(j => {
      var cor = PJ_GANTT_COR[pjCor(j)] || PJ_GANTT_COR.criada;
      var v = engRC(j);
      var fim = pjEnd(j);
      return engH("button", {
        key: j.id,
        type: "button",
        className: "eng-dia-op",
        "data-dia-pj": j.id,
        onClick: () => editar(j),
        title: 'Abrir e editar a operação'
      }, engH("span", {
        className: "eng-dia-cor",
        style: {
          background: engCorDaSonda(j.rigId) || cor.c,
          boxShadow: 'inset 0 -5px 0 ' + cor.c
        }
      }), engH("span", {
        className: "eng-dia-txt"
      }, engH("b", null, (nomeRig(j) || '—') + ' · ' + (j.well || '—')), engH("span", {
        className: "eng-dia-tipo"
      }, tipoTxt(j) || j.tipoOp || ''), engH("span", {
        className: "eng-dia-per"
      }, fim && fim !== j.date ? fmtD(j.date) + ' → ' + fmtD(fim) : fmtD(j.date))), engH("span", {
        className: "eng-dia-sit",
        style: {
          background: cor.c,
          color: cor.t
        }
      }, tExp(cor.label)), v && engH("span", {
        className: "eng-dia-rc"
      }, engUsdCurto(v.rec), engH("i", null, ' · COGS ' + engUsdCurto(v.cogs).replace('US$ ', ''))), engH("span", {
        className: "eng-dia-ed"
      }, "Editar ›"));
    })), engH("div", {
      className: "ec-foot"
    }, engH("span", {
      style: {
        flex: 1
      }
    }), engH("button", {
      className: "btn-o",
      onClick: fechar
    }, "Fechar"), engH("button", {
      className: "btn-r eng-dia-nova",
      onClick: () => {
        setEngDia(null);
        setPlanDraft(newPlanDraft({
          date: engDia
        }));
      }
    }, "+ Nova operação neste dia"))));
  };

  /* ---- 3. cor da sonda na barra (a faixa de baixo fica na cor da legenda) ---- */
  var engCorDaSonda = rid => {
    var c = rid && (engCoresSonda || {})[rid];
    return /^#[0-9a-f]{6}$/i.test(c || '') ? c : '';
  };
  var engLuz = hex => {
    var m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
    if (!m) return 0;
    var n = parseInt(m[1], 16);
    return 0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255);
  };
  var engBarraCor = (j, cor, faixa) => {
    var c = engCorDaSonda(j && j.rigId);
    if (!c) return {};
    return {
      background: c,
      color: engLuz(c) > 165 ? '#1E2224' : '#FFFFFF',
      boxShadow: 'inset 0 -' + (faixa || 5) + 'px 0 ' + (cor && cor.c || '#6D757A')
    };
  };
  var engBarraTxt = (j, cor) => {
    var c = engCorDaSonda(j && j.rigId);
    if (!c) return cor && cor.t;
    return engLuz(c) > 165 ? '#1E2224' : '#FFFFFF';
  };
  // na legenda do Gantt: como fica a barra com a cor da sonda
  var engLgdSonda = () => engH("span", {
    className: "eng-lgd-sonda",
    title: "Clique no nome da sonda (à esquerda do Gantt) para escolher a cor dela"
  }, engH("b", null, "Cor da sonda"), engH("i", {
    className: "eng-lgd-sonda-i",
    style: {
      background: '#6D757A',
      boxShadow: 'inset 0 -4px 0 #CC0000'
    }
  }), "barra na cor da sonda (clique no nome dela) e faixa de baixo na cor da legenda");
