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
      onClick: e => {} // e18: só fecha pelos botões
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
  var engMudarCor = (rid, cor, manter) => {
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
    if (!manter) setEngCorPop(null); // e19: "Outra cor" muda sem fechar (o seletor do navegador continua aberto)
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
        fundo = engCorRgba(c, .10), // e19: mais clara, para a barra (na cor da sonda) aparecer
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
    }, engH("b", null, "Cor da sonda \u2014 ", rigFmt(rig) || rig.name || ''), engH("div", {
      className: "eng-cor-ajuda"
    }, "As barras das opera\xE7\xF5es ficam nesta cor; a faixa de baixo continua na cor da legenda (situa\xE7\xE3o)."), engH("div", {
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
    })), engH("label", {
      className: "eng-cor-outra",
      title: "Escolher outra cor"
    }, engH("input", {
      type: "color",
      className: "eng-cor-input",
      value: /^#[0-9a-f]{6}$/i.test(atual) ? atual : '#6D757A',
      onChange: e => engMudarCor(engCorPop.rid, String(e.target.value || '').toUpperCase(), true)
    }), "Outra cor")), engH("button", {
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

  /* ---- 5. pílulas de filtro do plano (Gantt, Calendário e Lista; Visão geral e contrato) ----
     O estado (engPil) e o teste de cada pílula (engPilOk/engPilFiltra) ficam no começo do App (patch), porque o
     planBase (useMemo) roda antes deste código. Dentro de cada grupo vale "ou"; entre os grupos, "e". */
  var ENG_PILULAS = [['sit', 'Situação', [['prev', 'Previstas'], ['conc', 'Concluídas'], ['atras', 'Atrasadas']]], ['marc', 'Marcas', [['cont', 'Contingência'], ['risco', 'Com risco'], ['fora', 'Risco 100%']]], ['ho', 'Handover', [['hoS', 'Handover enviado'], ['hoN', 'Sem handover']]]];
  var engPilEscopo = () => (planJobs || []).filter(j => {
    if (!j || j.status === PJ_STATUS.CANC) return false;
    if (ctSel) return pjDoContrato(j, ctSel);
    var c = ctDoJob(j);
    if (c && c.archived) return false;
    return !planMF.ct.length || planMF.ct.includes(c ? c.id : '__sem');
  });
  var engMudarPil = k => setEngPil(x => {
    var o = k === null ? [] : x.includes(k) ? x.filter(y => y !== k) : [...x, k];
    try {
      localStorage.setItem('eng_pilulas_v1', JSON.stringify(o));
    } catch (e) {}
    return o;
  });
  var engRenderPilulas = () => {
    if (!['gantt', 'cal', 'list'].includes(planView)) return null;
    var esc = engPilEscopo();
    return engH("div", {
      className: "eng-pils"
    }, ENG_PILULAS.map(([g, tit, ps]) => engH("div", {
      key: g,
      className: "eng-pil-g"
    }, engH("span", {
      className: "eng-pil-t"
    }, tit), ps.map(([k, l]) => {
      var n = esc.filter(j => engPilOk(j, k)).length;
      var on = engPil.includes(k);
      return engH("button", {
        key: k,
        type: "button",
        className: 'eng-pil eng-pil-' + k + (on ? ' on' : ''),
        "aria-pressed": on,
        title: on ? 'Clique para tirar este filtro' : 'Mostrar só as operações: ' + l.toLowerCase(),
        onClick: () => engMudarPil(k)
      }, l, engH("b", null, n));
    }))), engPil.length > 0 && engH("button", {
      type: "button",
      className: "eng-pil eng-pil-limpar",
      onClick: () => engMudarPil(null)
    }, "✕ Limpar"));
  };

  /* ---- 6. receita e COGS na janela da operação (ao vivo, com a contingência e o risco) ----
     receita = Σ itens PPU × preço vigente na data × (1 − risco da linha) × (1 − risco da operação);
     COGS = Σ químicas e casing × COGS unitário × (1 − risco da linha) × (1 − risco da operação).
     Risco 100% = não acontece (conta 0); 0% = acontece (conta inteiro). */
  var engResumoOp = d => {
    if (!d || d.__tpl) return null;
    var ct = d.contratoId ? (db.contratos || []).find(c => c.id === d.contratoId) : ctDoJob(d);
    var idx = engRcCache.idx || (engRcCache.idx = engCogsIdx());
    var data = d.date || todayStr();
    var rOp = engRiscoNum(d.riscoRec);
    var fOp = 1 - rOp / 100;
    var recC = 0,
      rec = 0,
      semPreco = 0,
      nCont = 0;
    (d.ppuNeeds || []).forEach(n => {
      if (!n || !n.ref) return;
      var q = engNum(n.qty) || 0;
      if (!q) return;
      if (n.cont) nCont++;
      var u = ct ? engUsdLinha(q, ctPreco(ct, n.ref, data), data) : null;
      if (u == null) {
        semPreco++;
        return;
      }
      recC += u;
      rec += u * (1 - engRiscoItem(n) / 100);
    });
    var cgC = 0,
      cg = 0,
      semCogs = 0;
    (d.chems || []).concat(d.casingNeeds || []).forEach(m => {
      if (!m || !(m.sap || m.name)) return;
      var q = engNum(m.qty) || 0;
      if (!q) return;
      if (m.cont) nCont++;
      var c = engCogsDe(idx, m);
      var cu = c ? engNum(c.usd) : null;
      if (cu == null) {
        semCogs++;
        return;
      }
      cgC += q * cu;
      cg += q * cu * (1 - engRiscoItem(m) / 100);
    });
    rec *= fOp;
    cg *= fOp;
    var temRisco = rOp > 0 || nCont > 0;
    var rv = d.ppuCons ? engRC(d) : null;
    return engH("div", {
      className: "eng-resumo-op"
    }, engH("div", {
      className: "eng-ro-nums"
    }, engH("span", null, 'Receita', engH("b", {
      className: "eng-ro-rec"
    }, fmtUSD(rec))), engH("span", null, 'COGS', engH("b", {
      className: "eng-ro-cogs"
    }, fmtUSD(cg))), engH("span", null, 'Margem', engH("b", {
      className: "eng-ro-mg"
    }, fmtUSD(rec - cg))), rv && engH("span", {
      className: "eng-ro-real"
    }, 'Realizado', engH("b", null, fmtUSD(rv.rec) + ' · COGS ' + fmtUSD(rv.cogs)))), engH("div", {
      className: "eng-ro-sub"
    }, !ct ? 'Escolha o contrato para calcular a receita. ' : '', temRisco ? 'Com o risco: ' + [rOp > 0 ? 'operação ' + fmtNum(rOp) + '%' + (d.contingencia ? ' (contingência)' : '') : '', nCont ? nCont + ' linha(s) em contingência, cada uma com o seu risco' : ''].filter(Boolean).join(' e ') + ' — conta × (1 − risco). Valor cheio: receita ' + fmtUSD(recC) + ' · COGS ' + fmtUSD(cgC) + '.' : 'Itens previstos, sem risco (valor cheio).', semPreco ? ' ' + semPreco + ' item(ns) sem preço no contrato.' : '', semCogs ? ' ' + semCogs + ' material(is) sem COGS.' : ''));
  };

  /* ---- 7. duplicar: só a operação ou o poço inteiro ---- */
  var [engDup, setEngDup] = useState(null);
  var engNormPoco = w => String(w || '').trim().toUpperCase();
  var engMesmoPoco = pj => {
    var w = engNormPoco(pj && pj.well);
    if (!w || !pj.id) return pj ? [pj] : [];
    var ct = ctDoJob(pj);
    return (db.plannedJobs || []).filter(j => j.status !== PJ_STATUS.CANC && engNormPoco(j.well) === w && (ctDoJob(j) || {}).id === (ct || {}).id).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  };
  var engDuplicar = pj => {
    if (!pj) return;
    var l = engMesmoPoco(pj);
    if (l.length <= 1) {
      duplicatePlanned(pj);
      return;
    }
    var fim = l.reduce((a, j) => pjEnd(j) > a ? pjEnd(j) : a, '');
    setEngDup({
      draft: pj,
      ids: l.map(j => j.id),
      marc: l.map(j => j.id), // e19: as operações marcadas (todas, no começo)
      modo: 'op',
      poco: '',
      data: dAdd(fim, 1),
      rig: ''
    });
  };
  var renderEngDup = () => {
    if (!engDup) return null;
    var l = engDup.ids.map(id => (db.plannedJobs || []).find(j => j.id === id)).filter(Boolean);
    var pj = engDup.draft;
    var fechar = () => setEngDup(null);
    var set = (k, v) => setEngDup(x => ({
      ...x,
      [k]: v
    }));
    // e19: só as operações marcadas vão para o poço novo; a "Data da 1ª operação" é a da 1ª marcada
    var marc = engDup.marc || engDup.ids;
    var lSel = l.filter(j => marc.includes(j.id));
    var todasM = lSel.length === l.length;
    var marcar = id => setEngDup(x => {
      var m = x.marc || x.ids;
      return {
        ...x,
        marc: m.includes(id) ? m.filter(y => y !== id) : [...m, id]
      };
    });
    var pocoOk = !!String(engDup.poco || '').trim() && !!engDup.data && lSel.length > 0;
    var duplicarPoco = () => {
      if (!pocoOk || !lSel.length) return;
      var novoPoco = String(engDup.poco).trim();
      var off = dDiff(lSel[0].date, engDup.data);
      var agora = new Date().toISOString();
      var rig = engDup.rig ? (db.rigs || []).find(r => r.id === engDup.rig) : null;
      var novos = lSel.map(j => {
        var o = JSON.parse(JSON.stringify(j));
        ['ppuCons', 'concluida', 'handoverId', 'hoEmailEm', 'hoEmailVersao', 'mobId', 'releasedAt', 'releasedBy', 'devolvida'].forEach(k => {
          delete o[k];
        });
        o.id = uid();
        o.well = novoPoco;
        o.date = dAdd(j.date, off);
        o.baselineDate = o.date;
        o.status = PJ_STATUS.PLAN;
        if (rig) {
          o.rigId = rig.id;
          o.loc = regiaoDaBase(rig.base) || o.loc;
        }
        o.createdAt = agora;
        o.updatedAt = agora;
        o.createdBy = currentUser();
        o.log = [{
          em: agora,
          por: currentUser() || '—',
          acao: 'Operação criada pela engenharia (cópia do poço ' + (j.well || '—') + ')',
          detalhe: (o.tipoOp || '') + ' · ' + fmtD(o.date)
        }];
        return o;
      });
      updateDB(x => ({
        ...x,
        plannedJobs: [...(x.plannedJobs || []), ...novos]
      }), {
        kind: 'Operação planejada',
        action: 'Inclusão',
        name: novoPoco + ' — ' + novos.length + ' operação(ões)',
        user: currentUser() || '—',
        detail: 'cópia do poço ' + (pj.well || '')
      });
      setEngDup(null);
      setPlanDraft(null);
      setOkMsg('Poço duplicado ✓ — ' + novos.length + ' de ' + l.length + ' operação(ões) em ' + novoPoco + ', a partir de ' + fmtD(engDup.data));
      setTimeout(() => setOkMsg(''), 5000);
    };
    var rigsAt = (db.rigs || []).filter(r => r.active !== false).slice().sort((a, b) => String(rigFmt(a)).localeCompare(String(rigFmt(b)), 'pt'));
    var opcao = (k, tit, sub) => engH("label", {
      className: 'eng-dup-op' + (engDup.modo === k ? ' on' : '')
    }, engH("input", {
      type: "radio",
      name: "eng-dup-modo",
      className: 'eng-dup-' + k,
      checked: engDup.modo === k,
      onChange: () => set('modo', k)
    }), engH("span", null, engH("b", null, tit), engH("em", null, sub)));
    return engH("div", {
      className: "overlay",
      style: {
        zIndex: 276
      },
      onClick: e => {} // e18: só fecha pelos botões
    }, engH("div", {
      className: "modal ec-modal eng-dup-modal",
      onClick: e => e.stopPropagation()
    }, engH("div", {
      className: "modal-title"
    }, engH("span", null, "Duplicar"), engH("button", {
      className: "modal-close",
      onClick: fechar
    }, "\xD7")), engH("div", {
      className: "ec-conc-nota"
    }, 'Esta operação é uma das ', engH("b", null, l.length + ' operações'), ' do poço ', engH("b", null, pj.well), '. O que você quer duplicar?'), opcao('op', 'Só esta operação', 'abre uma cópia (' + (tipoTxt(pj) || pj.tipoOp || '') + ') para você ajustar e salvar'), opcao('poco', 'O poço (' + l.length + ' operações)', 'cria um poço novo com as operações que você marcar (todas, no começo), na mesma sequência e com os mesmos recursos'), engDup.modo === 'poco' && engH("div", {
      className: "eng-dup-poco"
    }, engH("table", {
      className: "db-table eng-dup-tab",
      "data-tf": "0"
    }, engH("thead", null, engH("tr", null, engH("th", null, engH("input", {
      type: "checkbox",
      className: "eng-dup-todas",
      checked: todasM,
      onChange: () => set('marc', todasM ? [] : l.map(j => j.id)),
      "aria-label": "Marcar todas"
    })), ['Data', 'Sonda', 'Operação'].map(h => engH("th", {
      key: h
    }, h)))), engH("tbody", null, l.map(j => engH("tr", {
      key: j.id,
      className: marc.includes(j.id) ? 'eng-dup-on' : 'eng-dup-off',
      onClick: e => {
        if (e.target.tagName !== 'INPUT') marcar(j.id);
      }
    }, engH("td", null, engH("input", {
      type: "checkbox",
      className: "eng-dup-cb",
      checked: marc.includes(j.id),
      onChange: () => marcar(j.id),
      "aria-label": 'Copiar ' + (tipoTxt(j) || j.tipoOp || '') + ' de ' + fmtD(j.date)
    })), engH("td", null, marc.includes(j.id) ? fmtD(j.date) + ' → ' + fmtD(dAdd(j.date, dDiff((lSel[0] || l[0]).date, engDup.data || (lSel[0] || l[0]).date))) : fmtD(j.date) + ' (não vai)'), engH("td", null, rigFmt(engDup.rig ? (db.rigs || []).find(r => r.id === engDup.rig) || {} : (db.rigs || []).find(r => r.id === j.rigId) || {}) || '—'), engH("td", null, tipoTxt(j) || j.tipoOp))))), engH("div", {
      className: "eng-dup-flds"
    }, engH("div", {
      className: "fld"
    }, engH("label", {
      className: "lbl"
    }, "Novo po\xE7o *"), engH("input", {
      className: "ipt eng-dup-nome",
      value: engDup.poco,
      placeholder: "ex.: 7-ABL-60-RJS",
      onChange: e => set('poco', e.target.value)
    })), engH("div", {
      className: "fld"
    }, engH("label", {
      className: "lbl"
    }, "Data da 1\xAA opera\xE7\xE3o marcada *"), engH("input", {
      className: "ipt eng-dup-data",
      type: "date",
      value: engDup.data || '',
      onChange: e => set('data', e.target.value)
    })), engH("div", {
      className: "fld"
    }, engH("label", {
      className: "lbl"
    }, "Sonda"), engH("select", {
      className: "sel eng-dup-rig",
      value: engDup.rig,
      onChange: e => set('rig', e.target.value)
    }, engH("option", {
      value: ""
    }, "A mesma de cada opera\xE7\xE3o"), rigsAt.map(r => engH("option", {
      key: r.id,
      value: r.id
    }, rigFmt(r))))))), engH("div", {
      className: "ec-foot"
    }, engDup.modo === 'poco' && !pocoOk && engH("em", {
      className: "ec-conc-falta-txt"
    }, !lSel.length ? "Marque pelo menos uma opera\xE7\xE3o." : "Informe o novo po\xE7o e a data."), engH("span", {
      style: {
        flex: 1
      }
    }), engH("button", {
      className: "btn-o",
      onClick: fechar
    }, "Cancelar"), engH("button", {
      className: "btn-r eng-dup-ok",
      disabled: engDup.modo === 'poco' && !pocoOk,
      onClick: () => {
        if (engDup.modo === 'op') {
          setEngDup(null);
          duplicatePlanned(pj);
        } else duplicarPoco();
      }
    }, engDup.modo === 'poco' ? 'Duplicar o poço (' + lSel.length + (lSel.length === 1 ? ' operação)' : ' operações)') : 'Duplicar a operação'))));
  };

  /* e18: a pílula "Consumo e receita" saiu das abas do plano; a tela continua para os testes e para quem precisar */
  window.engPlanView = v => setPlanView(v);
