  /* ================= e17 (pedido do Hugo, 25/11/2026) =================
     1. Filtro "Sonda" (Visão geral e contrato): só as sondas com operação nos contratos escolhidos.
     2. "✓ Concluir operação" na janela da operação: antes, cada item em contingência precisa ser respondido
        ("usou" fica como item normal; "não usou" sai da operação). A operação deixa de ser contingência e o risco de
        não acontecer vai a 0% (ela aconteceu). Depois, a tela do consumo (já com o previsto) confirma o que foi usado
        e a operação fica concluída (ppuCons + concluida {em, por}). "↺ Reabrir" apaga o consumo e a conclusão.
        Concluída = tem consumo lançado (como já era para os Indicadores e as planilhas); no Gantt fica preta.
     3. Cor das linhas de uma sonda no Gantt: clique no nome da sonda e escolha a cor (fica neste navegador).
     4. Receita e COGS (US$, valor cheio da operação, sem o risco) no Gantt, no Calendário e na Lista. */

  /* ---- 1. sondas do filtro ---- */
  var engRigsFiltro = () => {
    var ids = new Set();
    (planJobs || []).forEach(j => {
      if (!j || !j.rigId || j.status === PJ_STATUS.CANC) return;
      if (ctSel) {
        if (!pjDoContrato(j, ctSel)) return;
      } else {
        var c = ctDoJob(j);
        if (c && c.archived) return;
        if (planMF.ct.length && !planMF.ct.includes(c ? c.id : '__sem')) return;
      }
      ids.add(j.rigId);
    });
    if (planF.rig) ids.add(planF.rig); // a sonda escolhida continua na lista
    return (db.rigs || []).filter(r => ids.has(r.id)).sort((a, b) => String(rigFmt(a)).localeCompare(String(rigFmt(b)), 'pt'));
  };

  /* ---- 2. concluir a operação ---- */
  var engConcluida = j => !!(j && (j.concluida || j.ppuCons));
  var engComConclusao = (j, reg, concluir) => {
    var o = {
      ...j
    };
    if (!reg) delete o.concluida;else if (concluir) o.concluida = {
      em: new Date().toISOString(),
      por: (db.hoMail || {}).nome || currentUser() || ''
    };
    return o;
  };
  var ENG_CONT_LISTAS = [['ppuNeeds', 'Item PPU'], ['chems', 'Química'], ['casingNeeds', 'Casing'], ['peopleNeeds', 'Pessoal'], ['equipNeeds', 'Equipamento']];
  var engContItens = j => {
    var o = [];
    ENG_CONT_LISTAS.forEach(([k, tipo]) => (j && Array.isArray(j[k]) ? j[k] : []).forEach((n, i) => {
      if (!n || !n.cont) return;
      var nome = k === 'ppuNeeds' ? [n.ref, n.desc].filter(Boolean).join(' — ') : k === 'peopleNeeds' ? n.funcao : k === 'equipNeeds' ? subtypeLabel(n.subtypeId) : n.name || n.sap;
      o.push({
        key: k + ':' + i,
        k,
        i,
        tipo,
        nome: nome || '—',
        qty: n.qty,
        unit: n.unit || '',
        risco: engRiscoItem(n)
      });
    }));
    return o;
  };
  var [engConc, setEngConc] = useState(null);
  var abrirEngConcluir = d => {
    if (!d || !d.id) return;
    var pj = d;
    setPlanDraft(null);
    if (!engContItens(pj).length && !pj.contingencia && !(Number(pj.riscoRec) > 0)) {
      abrirEngCons(pj, {
        concluir: true
      });
      return;
    }
    setEngConc({
      pjId: pj.id,
      resp: {}
    });
  };
  var engReabrir = d => askConfirm({
    title: 'Reabrir a operação',
    okLabel: 'Reabrir',
    danger: true,
    msg: engH("span", null, "Reabrir ", engH("b", null, d.well || '—', " \xB7 ", tipoTxt(d) || d.tipoOp), "?"),
    hint: 'O consumo lançado é apagado: a receita e o COGS voltam a ser previstos. As contingências já resolvidas não voltam.',
    onOk: () => {
      updateDB(x => ({
        ...x,
        plannedJobs: comLog((x.plannedJobs || []).map(j => {
          if (j.id !== d.id) return j;
          var o = {
            ...j
          };
          delete o.ppuCons;
          delete o.concluida;
          return o;
        }), [d.id], logE('Operação reaberta (consumo apagado)'))
      }), {
        kind: 'Operação',
        action: 'Alteração',
        name: (d.well || '') + ' · ' + (d.tipoOp || ''),
        user: currentUser() || '—',
        detail: 'Reaberta'
      });
      setPlanDraft(x => {
        if (!x || x.id !== d.id) return x;
        var o = {
          ...x
        };
        delete o.ppuCons;
        delete o.concluida;
        return o;
      });
      setOkMsg('Operação reaberta ✓');
      setTimeout(() => setOkMsg(''), 4000);
    }
  });
  // botões da janela da operação (no rodapé, ao lado do "Σ Consumo PPU")
  var engConcBotoes = (d, travado, salvar) => {
    if (!d || !d.id || d.__tpl) return null;
    if (engConcluida(d)) return engH(React.Fragment, null, engH("span", {
      className: "ec-tag ec-tag-conc eng-conc-chip",
      title: d.concluida ? 'Concluída em ' + fmtDH(d.concluida.em) + (d.concluida.por ? ' por ' + d.concluida.por : '') : 'Consumo lançado'
    }, "\u2713 Conclu\xEDda"), engH("button", {
      className: "btn-o eng-reabrir",
      title: "Volta a opera\xE7\xE3o para prevista (apaga o consumo lan\xE7ado)",
      onClick: () => engReabrir(d)
    }, "\u21BA Reabrir"));
    return engH("button", {
      className: "btn-g eng-concluir",
      title: "Marca a opera\xE7\xE3o como conclu\xEDda: pergunta se as conting\xEAncias foram usadas e confirma o consumo",
      onClick: () => {
        var salvo = travado ? d : salvar(d);
        if (salvo) abrirEngConcluir(salvo);
      }
    }, "\u2713 Concluir opera\xE7\xE3o");
  };
  var engConcTag = j => engConcluida(j) ? engH("span", {
    className: "ec-tag ec-tag-conc",
    title: j.concluida ? 'Concluída em ' + fmtDH(j.concluida.em) + (j.concluida.por ? ' por ' + j.concluida.por : '') : 'Consumo lançado'
  }, "\u2713 Conclu\xEDda") : null;
  var renderEngConc = () => {
    if (!engConc) return null;
    var pj = (db.plannedJobs || []).find(j => j.id === engConc.pjId);
    if (!pj) return null;
    var itens = engContItens(pj);
    var resp = engConc.resp || {};
    var falta = itens.filter(x => !resp[x.key]).length;
    var rr = Number(pj.riscoRec) || 0;
    var rig = (db.rigs || []).find(r => r.id === pj.rigId) || {};
    var ct = ctDoJob(pj);
    var fechar = () => setEngConc(null);
    var marcar = (k, v) => setEngConc(x => ({
      ...x,
      resp: {
        ...x.resp,
        [k]: v
      }
    }));
    var todos = v => setEngConc(x => {
      var r = {
        ...x.resp
      };
      itens.forEach(it => {
        r[it.key] = v;
      });
      return {
        ...x,
        resp: r
      };
    });
    var continuar = () => {
      if (falta) return;
      var usados = [],
        tirados = [];
      var novo = {
        ...pj
      };
      ENG_CONT_LISTAS.forEach(([k]) => {
        if (!Array.isArray(pj[k])) return;
        novo[k] = pj[k].map((n, i) => {
          if (!n || !n.cont) return n;
          var it = itens.find(x => x.key === k + ':' + i);
          if (resp[k + ':' + i] === 'nao') {
            tirados.push(it);
            return null;
          }
          usados.push(it);
          var m = {
            ...n,
            cont: false
          };
          delete m.chance;
          return m;
        }).filter(Boolean);
      });
      novo.contingencia = false;
      novo.riscoRec = 0;
      novo.risco = null;
      var det = [usados.length ? 'usadas: ' + usados.map(x => x.nome).join(', ') : '', tirados.length ? 'não usadas (saíram): ' + tirados.map(x => x.nome).join(', ') : '', pj.contingencia ? 'deixou de ser operação em contingência' : '', rr > 0 ? 'risco de não acontecer ' + rr + '% → 0%' : ''].filter(Boolean).join(' · ');
      updateDB(x => ({
        ...x,
        plannedJobs: comLog((x.plannedJobs || []).map(j => j.id === pj.id ? novo : j), [pj.id], logE('Contingências resolvidas para concluir', {
          detalhe: det
        }))
      }), {
        kind: 'Operação',
        action: 'Alteração',
        name: (rigFmt(rig) || '—') + ' — ' + (pj.well || tipoTxt(pj) || ''),
        user: currentUser() || '—',
        detail: det
      });
      setEngConc(null);
      abrirEngCons(novo, {
        concluir: true
      });
    };
    return engH("div", {
      className: "overlay",
      style: {
        zIndex: 274
      },
      onClick: e => {
        if (e.target === e.currentTarget) fechar();
      }
    }, engH("div", {
      className: "modal ec-modal ec-conc-modal",
      onClick: e => e.stopPropagation()
    }, engH("div", {
      className: "modal-title"
    }, engH("span", null, '✓ Concluir a operação — ' + (pj.well || 'poço a definir') + ' · ' + (tipoTxt(pj) || pj.tipoOp || '')), engH("button", {
      className: "modal-close",
      onClick: fechar
    }, "\xD7")), engH("div", {
      className: "ec-cons-id"
    }, [rigFmt(rig), pj.date ? fmtD(pj.date) : '', ct ? ct.name : ''].filter(Boolean).join(' · ')), engH("div", {
      className: "ec-conc-nota"
    }, itens.length ? 'Antes de concluir, diga se cada item em contingência foi usado. A operação não pode ser concluída com itens ainda em contingência: os usados ficam como itens normais; os não usados saem da operação.' : 'Nenhum item em contingência.'), pj.contingencia ? engH("div", {
      className: "ec-aviso ec-conc-op"
    }, 'Esta operação está em contingência (risco ' + fmtNum(rr) + '% de não acontecer). Ao concluir, ela deixa de ser contingência e entra inteira na receita e no COGS (risco 0%).') : rr > 0 ? engH("div", {
      className: "ec-aviso ec-conc-op"
    }, 'Risco de não acontecer: ' + fmtNum(rr) + '% → 0% (a operação aconteceu).') : null, itens.length > 0 && engH("div", {
      className: "ec-conc-todos"
    }, engH("button", {
      className: "btn-o ec-conc-todos-sim",
      onClick: () => todos('sim')
    }, "Todas foram usadas"), engH("button", {
      className: "btn-o ec-conc-todos-nao",
      onClick: () => todos('nao')
    }, "Nenhuma foi usada")), itens.length > 0 && engH("div", {
      className: "tbl-scroll"
    }, engH("table", {
      className: "db-table ec-conc-tab"
    }, engH("thead", null, engH("tr", null, ['Tipo', 'Item', 'Qtd.', 'Risco', 'Foi usada?'].map(h => engH("th", {
      key: h
    }, h)))), engH("tbody", null, itens.map(it => engH("tr", {
      key: it.key,
      className: resp[it.key] ? '' : 'ec-conc-falta'
    }, engH("td", null, it.tipo), engH("td", null, it.nome), engH("td", {
      style: {
        whiteSpace: 'nowrap'
      }
    }, it.qty != null && it.qty !== '' ? fmtNum(engNum(it.qty) || 0) + (it.unit ? ' ' + it.unit : '') : '—'), engH("td", null, fmtNum(it.risco) + '%'), engH("td", {
      style: {
        whiteSpace: 'nowrap'
      }
    }, engH("button", {
      className: 'btn-o ec-conc-sim' + (resp[it.key] === 'sim' ? ' on' : ''),
      onClick: () => marcar(it.key, 'sim')
    }, "\u2713 Usou"), engH("button", {
      className: 'btn-o ec-conc-nao' + (resp[it.key] === 'nao' ? ' on' : ''),
      onClick: () => marcar(it.key, 'nao')
    }, "\u2715 N\xE3o usou"))))))), engH("div", {
      className: "ec-foot"
    }, falta > 0 && engH("em", {
      className: "ec-conc-falta-txt"
    }, 'Falta responder ' + falta + ' item(ns).'), engH("span", {
      style: {
        flex: 1
      }
    }), engH("button", {
      className: "btn-o",
      onClick: fechar
    }, "Cancelar"), engH("button", {
      className: "btn-r ec-conc-ok",
      disabled: falta > 0,
      onClick: continuar
    }, "Continuar \u2192 confirmar o consumo"))));
  };

  /* ---- 3. cor das linhas de cada sonda no Gantt (neste navegador) ---- */
  var ENG_CORES_SONDA = [['#CC0000', 'Vermelho'], ['#E67E22', 'Laranja'], ['#F1C40F', 'Amarelo'], ['#27AE60', 'Verde'], ['#16A085', 'Verde-água'], ['#2E86DE', 'Azul'], ['#6B3FA0', 'Roxo'], ['#E84393', 'Rosa'], ['#8D6E63', 'Marrom'], ['#6D757A', 'Cinza']];
  var [engCoresSonda, setEngCoresSonda] = useState(() => {
    try {
      var v = JSON.parse(localStorage.getItem('eng_cores_sonda_v1') || '{}');
      return v && typeof v === 'object' ? v : {};
    } catch (e) {
      return {};
    }
  });
  var [engCorPop, setEngCorPop] = useState(null);
  var engMudarCor = (rid, cor) => {
    setEngCoresSonda(x => {
      var o = {
        ...x
      };
      if (cor) o[rid] = cor;else delete o[rid];
      try {
        localStorage.setItem('eng_cores_sonda_v1', JSON.stringify(o));
      } catch (e) {}
      return o;
    });
    setEngCorPop(null);
  };
  var engAbrirCor = (rid, e) => {
    if (!rid) return;
    var r = e && e.currentTarget ? e.currentTarget.getBoundingClientRect() : {
      left: 40,
      bottom: 120
    };
    setEngCorPop({
      rid,
      x: Math.min(r.left, window.innerWidth - 270),
      y: Math.min(r.bottom + 6, window.innerHeight - 170)
    });
  };
  var engCorRgba = (hex, a) => {
    var m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
    if (!m) return 'transparent';
    var n = parseInt(m[1], 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  };
  // as regras de cor (linhas da sonda nos modos "Por sonda" e "Sonda contínua"; linhas da operação no "Por data")
  var renderEngCoresCss = () => {
    var ids = Object.keys(engCoresSonda || {}).filter(id => /^#[0-9a-f]{6}$/i.test(engCoresSonda[id]));
    if (!ids.length) return null;
    var q = id => String(id).replace(/["\\]/g, '\\$&');
    var css = ids.map(id => {
      var c = engCoresSonda[id],
        fundo = engCorRgba(c, .16),
        rot = engCorRgba(c, .34);
      var g = '.eng-gl[data-rig="' + q(id) + '"]',
        r = '.eng-gj[data-rigrow="' + q(id) + '"]';
      // linhas (e as células da linha, no modo "Sonda contínua") com a cor clara; a coluna do nome (fixa) mais forte
      return [g + ' > div, ' + r + '{background-color:' + fundo + ' !important}', g + ' div[style*="sticky"], ' + r + ' > div[style*="sticky"]{background-color:' + rot + ' !important;box-shadow:inset 4px 0 0 ' + c + '}'].join('\n');
    }).join('\n');
    return engH("style", {
      id: "eng-cores-sonda"
    }, css);
  };
  var renderEngCorPop = () => {
    if (!engCorPop) return null;
    var rig = (db.rigs || []).find(r => r.id === engCorPop.rid) || {};
    var atual = engCoresSonda[engCorPop.rid] || '';
    return engH("div", {
      className: "eng-cor-overlay",
      onClick: () => setEngCorPop(null)
    }, engH("div", {
      className: "eng-cor-pop",
      style: {
        left: engCorPop.x,
        top: engCorPop.y
      },
      onClick: e => e.stopPropagation()
    }, engH("b", null, "Cor das linhas \u2014 ", rigFmt(rig) || rig.name || ''), engH("div", {
      className: "eng-cor-grid"
    }, ENG_CORES_SONDA.map(([c, nome]) => engH("button", {
      key: c,
      type: "button",
      className: 'eng-cor-sw' + (atual === c ? ' on' : ''),
      "data-cor": c,
      title: nome,
      style: {
        background: c
      },
      onClick: () => engMudarCor(engCorPop.rid, c)
    }))), engH("button", {
      type: "button",
      className: "btn-o eng-cor-tirar",
      disabled: !atual,
      onClick: () => engMudarCor(engCorPop.rid, '')
    }, "Sem cor")));
  };

  /* ---- 4. receita e COGS da operação (US$, valor cheio, sem o risco) ---- */
  var engRcCache = useMemo(() => ({
    idx: null,
    m: new WeakMap()
  }), [db]);
  var engRC = j => {
    if (!j) return null;
    var C = engRcCache;
    var v = C.m.get(j);
    if (v) return v;
    if (!C.idx) C.idx = engCogsIdx();
    var ct = ctDoJob(j);
    var c = j.ppuCons;
    var real = !!c;
    var data = real ? c.data || j.date : j.date;
    var rec = 0,
      semPreco = 0;
    (real ? c.linhas || [] : j.ppuNeeds || []).forEach(l => {
      var q = engNum(l && l.qty) || 0;
      if (!q || !l.ref) return;
      var p = ct ? ctPreco(ct, l.ref, data) : {};
      var u = engUsdLinha(q, p, data);
      if (u != null) rec += u;else semPreco++;
    });
    var cg = engCogsSoma(C.idx, real ? (c.quim || []).concat(c.cas || []) : (j.chems || []).concat(j.casingNeeds || []));
    v = {
      rec,
      cogs: cg.u,
      real,
      semPreco,
      semCogs: cg.sem,
      temCt: !!ct
    };
    C.m.set(j, v);
    return v;
  };
  var engUsdCurto = v => {
    var a = Math.abs(v || 0);
    if (a >= 1e6) return 'US$ ' + fmtNum(Math.round(v / 1e4) / 100) + ' mi';
    if (a >= 1e3) return 'US$ ' + fmtNum(Math.round(v / 100) / 10) + ' mil';
    return 'US$ ' + fmtNum(Math.round(v || 0));
  };
  var engRcTit = j => {
    var v = engRC(j);
    if (!v) return '';
    var rr = Number(j.riscoRec) || 0;
    return ' · Receita ' + fmtUSD(v.rec) + ' · COGS ' + fmtUSD(v.cogs) + (v.real ? ' (realizado)' : ' (previsto)') + (rr > 0 ? ' · risco ' + rr + '% (nos indicadores entra ' + (100 - Math.min(100, rr)) + '%)' : '');
  };
  var engRcLinha = j => {
    var v = engRC(j);
    if (!v) return null;
    return engH("div", {
      className: 'eng-rc' + (v.real ? ' eng-rc-real' : ''),
      title: 'Valor cheio da operação (sem o risco), ' + (v.real ? 'realizado (consumo lançado)' : 'previsto') + ': receita ' + fmtUSD(v.rec) + ' · COGS ' + fmtUSD(v.cogs) + (v.semPreco ? ' · ' + v.semPreco + ' item(ns) sem preço' : '')
    }, engUsdCurto(v.rec), engH("i", null, " \xB7 COGS "), engUsdCurto(v.cogs).replace('US$ ', ''));
  };
  var engRcCal = j => {
    var v = engRC(j);
    if (!v) return null;
    return engH("b", {
      className: "eng-rc-cal"
    }, engUsdCurto(v.rec), " \xB7 COGS ", engUsdCurto(v.cogs).replace('US$ ', ''));
  };
  var engRcTd = (j, k) => {
    var v = engRC(j);
    return engH("td", {
      className: 'eng-rc-td eng-rc-' + k,
      style: {
        whiteSpace: 'nowrap',
        textAlign: 'right'
      },
      title: v ? (v.real ? 'Realizado (consumo lançado)' : 'Previsto') + ' — valor cheio, sem o risco' : ''
    }, v ? fmtUSD(k === 'rec' ? v.rec : v.cogs) : '—');
  };
