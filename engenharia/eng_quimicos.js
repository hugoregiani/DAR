  /* =================== e6: banco de produtos químicos ===================
     db.quimicos = [{id: 'q_<SAP>', sap, nome, unid, usd, atualizadoEm}]: valor unitário em US$ (o COGS) de cada
     produto químico, pelo SAP. É o valor usado no COGS das químicas das operações (vale sobre db.cogsItens).
     db.quimHist = [{id, em, por, origem: 'base'|'planilha'|'manual', arquivo, novos, alterados, removidos, total}].
     A base (ENG_QUIM_BASE, tabela Químicos da aba Forecast) entra uma vez por computador, no loadDB (engQuimMig).
     Atualização: o responsável manda a planilha; o engenheiro usa "⬆ Atualizar pela planilha", confere e aplica. */
  var engUnNorm = u => {
    var s = asciiName(String(u || '')).toLowerCase().replace(/[^a-z0-9]/g, '');
    return {
      gl: 'gal',
      gll: 'gal',
      gals: 'gal',
      galao: 'gal',
      galoes: 'gal',
      lbr: 'lb',
      lbs: 'lb',
      libra: 'lb',
      libras: 'lb',
      sack: 'sk',
      sacks: 'sk',
      bg: 'bag',
      bags: 'bag',
      t: 'ton',
      tons: 'ton',
      tonelada: 'ton',
      kgs: 'kg'
    }[s] || s;
  };
  var engQuimCat = () => {
    var o = {};
    (chemCatalog || []).forEach(c => {
      if (c && String(c.sap || '').trim()) o[sapN(c.sap)] = c;
    });
    return o;
  };
  /* e12: banco de casing equipment, igual ao de químicos. engBancoMat(cfg) monta uma tela de banco de materiais (SAP,
     descrição, unidade e valor US$, com "⬆ Atualizar pela planilha", "⬇ Baixar planilha" e histórico):
     - químicos: db.quimicos (+ db.quimHist), classes ec-quim-*;
     - casing equipment: db.casingEquip (o catálogo de casing do EARL, que as operações usam para escolher o casing),
       com o valor em US$ (usd) e a data (atualizadoEm) em cada item (+ db.casHist), classes ec-casdb-*.
     O valor US$ de cada banco é o COGS unitário usado nas operações (engCogsIdx). */
  var engBancoMat = cfg => {
  var [engQ, setEngQ] = useState(null);
  var engQRef = useRef(null);
  var CL = x => 'ec-bm-' + x + ' ec-' + cfg.p + '-' + x;
  var engQuimAvisos = (q, cat) => {
    var a = [];
    var sap = String(q.sap || '').trim();
    if (!sap) return a;
    if (!/^\d+$/.test(sap)) a.push(['SAP provisório', 'O SAP não é um número. Confira o código.']);
    var c = cat && cat[sapN(sap)];
    if (cat && !c) a.push(['fora do catálogo', 'Este SAP não está no catálogo de químicas do EARL, então não aparece para escolher nas operações.']);else if (c && c.unit && q.unid && engUnNorm(c.unit) !== engUnNorm(q.unid)) a.push(['unidade no EARL: ' + c.unit, 'As operações usam este produto em ' + c.unit + ' e o valor aqui é por ' + q.unid + '. O COGS da operação é quantidade × valor: confira se o valor está na mesma unidade.']);
    var u = engNum(q.usd);
    if (u == null) a.push(['sem valor', 'Sem valor em US$: o COGS deste ' + cfg.item + ' fica de fora.']);else if (u === 0) a.push(['valor zero', 'Valor US$ 0: o COGS deste ' + cfg.item + ' fica zerado.']);
    return a;
  };
  var engQuimFalta = lista => {
    var f = [];
    var saps = lista.map(q => String(q.sap || '').trim());
    if (saps.some(s => !s)) f.push('SAP em todas as linhas');
    var rep = saps.filter((s, i) => s && saps.indexOf(s) !== i);
    if (rep.length) f.push('SAP repetido (' + [...new Set(rep)].join(', ') + ')');
    if (lista.some(q => !String(q.nome || '').trim())) f.push('descrição em todas as linhas');
    if (lista.some(q => String(q.usd == null ? '' : q.usd).trim() !== '' && engNum(q.usd) == null)) f.push('valor US$ válido');
    if (lista.some(q => engNum(q.usd) < 0)) f.push('valor US$ sem sinal negativo');
    return f;
  };
  var engQuimMudou = (a, b) => {
    var ua = engNum(a.usd),
      ub = engNum(b.usd);
    return {
      valor: ua == null !== (ub == null) || ua != null && Math.abs(ua - ub) > 1e-9,
      texto: String(a.nome || '').trim() !== String(b.nome || '').trim() || String(a.unid || '').trim() !== String(b.unid || '').trim()
    };
  };
  // compara o banco (ou o rascunho) com outra lista: novos, alterados e removidos, pelo SAP
  var engQuimComparar = (antes, depois) => {
    var idx = {};
    antes.forEach(q => {
      idx[String(q.sap || '').trim()] = q;
    });
    var vistos = {},
      novos = [],
      alterados = [];
    depois.forEach(q => {
      var s = String(q.sap || '').trim();
      vistos[s] = 1;
      var a = idx[s];
      if (!a) novos.push(q);else {
        var m = engQuimMudou(a, q);
        if (m.valor || m.texto) alterados.push(q);
      }
    });
    return {
      novos,
      alterados,
      removidos: antes.filter(q => !vistos[String(q.sap || '').trim()])
    };
  };
  var engQuimGravar = (lista, h) => {
    var agora = new Date().toISOString();
    var l = lista.map(q => {
      var sap = String(q.sap || '').trim();
      var u = engNum(q.usd);
      var {
        _k,
        _mud,
        _sap0,
        linha,
        ...resto
      } = q;
      return {
        ...(cfg.manter ? resto : {}),
        id: q.id || cfg.idPre + sap,
        sap,
        nome: String(q.nome || '').trim(),
        unid: String(q.unid || '').trim(),
        usd: u == null ? null : u,
        atualizadoEm: q._mud || !q.atualizadoEm ? agora : q.atualizadoEm
      };
    });
    var cmp = engQuimComparar(cfg.ler(db), l);
    var reg = {
      id: cfg.idPre + 'h_' + uid(),
      em: agora,
      por: String(h.por != null ? h.por : (db.hoMail || {}).nome || '').trim(),
      origem: h.origem,
      arquivo: h.arquivo || '',
      novos: cmp.novos.length,
      alterados: cmp.alterados.length,
      removidos: cmp.removidos.length,
      total: l.length
    };
    updateDB(d => ({
      ...cfg.gravar(d, l, reg, agora),
      hoMail: h.por && String(h.por).trim() ? {
        ...(d.hoMail || {}),
        nome: String(h.por).trim()
      } : d.hoMail
    }), {
      kind: cfg.kind,
      action: 'Alteração',
      name: l.length + ' ' + cfg.nLog,
      user: currentUser() || '—',
      detail: (h.origem === 'planilha' ? 'Planilha ' + (h.arquivo || '') + ': ' : '') + reg.novos + ' novo(s), ' + reg.alterados + ' alterado(s), ' + reg.removidos + ' removido(s)'
    });
    return {
      l,
      reg
    };
  };
  var abrirEngQuim = () => setEngQ({
    busca: '',
    soAviso: false,
    sujo: false,
    lista: cfg.ler(db).map(q => ({
      ...q,
      _k: uid(),
      _sap0: q.sap
    }))
  });
  var engQuimSalvar = () => {
    var lista = engQ && engQ.lista || [];
    if (engQuimFalta(lista).length) return;
    var {
      l,
      reg
    } = engQuimGravar(lista, {
      origem: 'manual'
    });
    setEngQ(x => ({
      ...x,
      sujo: false,
      lista: l.map(q => ({
        ...q,
        _k: uid(),
        _sap0: q.sap
      }))
    }));
    setOkMsg(cfg.titulo + ' salvo ✓ — ' + reg.novos + ' novo(s), ' + reg.alterados + ' alterado(s), ' + reg.removidos + ' removido(s)');
    setTimeout(() => setOkMsg(''), 5000);
  };
  var engQuimBaixar = lista => {
    var l = [...lista].sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt'));
    var sapCel = s => /^\d{1,15}$/.test(String(s || '').trim()) ? Number(s) : String(s || '');
    engBaixarXlsx(cfg.arq + dToday(), [[cfg.aba, [['SAP', 'Descrição', 'Unidade', 'Valor US$', 'Atualizado em'], ...(l.length ? l.map(q => [sapCel(q.sap), q.nome || '', q.unid || '', engNum(q.usd), q.atualizadoEm ? fmtD(String(q.atualizadoEm).slice(0, 10)) : '']) : [cfg.exemplo])], [14, 46, 10, 14, 14]]]);
  };

  /* ---- leitura da planilha de químicos: acha a tabela com SAP + valor (em qualquer aba; prefere "Químicos") ---- */
  var engQuimLerWb = wb => {
    var nh = v => asciiName(String(v == null ? '' : v)).toLowerCase().trim();
    var melhor = null;
    wb.SheetNames.forEach(aba => {
      var ws = wb.Sheets[aba];
      var raw = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        defval: '',
        raw: true
      });
      var txt = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        defval: '',
        raw: false
      });
      txt.forEach((r, i) => {
        var m = {};
        (r || []).forEach((v, k) => {
          var h = nh(v);
          if (!h) return;
          if (m.sap == null && /^(sap|cod(igo)? ?sap|material sap|n(o)? ?sap)$/.test(h)) m.sap = k;else if (m.nome == null && /descri|produto|quimic|casing|equipamento|equipment|nome/.test(h)) m.nome = k;else if (m.unid == null && /^(unid|un$|un |uom|unit)/.test(h)) m.unid = k;else if (m.usd == null && /(^| )us( |$)|usd|dolar|dollar|cogs|custo|valor|preco|price/.test(h)) m.usd = k;
        });
        if (m.sap == null || m.usd == null) return;
        var tit = (m.nome != null ? nh(r[m.nome]) : '') + ' | ' + nh(aba);
        var pts = (cfg.pref.test(tit) ? 2 : 0) - (cfg.evita.test(tit) ? 3 : 0) + (m.nome != null ? 1 : 0) + (m.unid != null ? 1 : 0);
        if (!melhor || pts > melhor.pts) melhor = {
          pts,
          aba,
          i,
          m,
          raw,
          txt
        };
      });
    });
    if (!melhor) return null;
    var {
      m,
      raw,
      txt
    } = melhor;
    var linhas = [],
      ignoradas = [],
      porSap = {},
      repetidos = [];
    var vazias = 0;
    for (var i = melhor.i + 1; i < txt.length; i++) {
      var t = k => k == null ? '' : String((txt[i] || [])[k] == null ? '' : txt[i][k]).trim();
      var sap = t(m.sap),
        nome = t(m.nome);
      if (nh(sap) === 'sap') break; // começou outra tabela (ex.: Casing no Forecast)
      if (!sap && !nome) {
        if (++vazias >= 3) break;
        continue;
      }
      vazias = 0;
      if (!sap) {
        ignoradas.push({
          linha: i + 1,
          txt: nome,
          motivo: 'sem SAP'
        });
        continue;
      }
      if (/^\d+\.0+$/.test(sap)) sap = sap.replace(/\.0+$/, '');
      var rv = (raw[i] || [])[m.usd];
      var usd = typeof rv === 'number' ? rv : engNum(t(m.usd));
      var o = {
        sap,
        nome,
        unid: t(m.unid),
        usd,
        linha: i + 1
      };
      if (porSap[sap]) {
        repetidos.push(sap);
        linhas[linhas.indexOf(porSap[sap])] = o;
      } else linhas.push(o);
      porSap[sap] = o;
    }
    return {
      aba: melhor.aba,
      cabecalho: melhor.i + 1,
      linhas,
      porSap,
      ignoradas,
      repetidos: [...new Set(repetidos)]
    };
  };
  var engQuimArquivo = f => {
    if (!f) return;
    engLerWb(f).then(wb => {
      var r = engQuimLerWb(wb);
      if (!r || !r.linhas.length) {
        setSyncErr(cfg.semTabela);
        return;
      }
      setEngQ(x => x && {
        ...x,
        plan: {
          ...r,
          nome: f.name,
          modo: 'mesclar',
          por: (db.hoMail || {}).nome || ''
        }
      });
    }).catch(err => setSyncErr('Não foi possível ler a planilha: ' + (err && err.message || err)));
  };
  var engQuimPlanCalc = (lista, p) => {
    var idx = {};
    lista.forEach(q => {
      idx[String(q.sap || '').trim()] = q;
    });
    var novos = [],
      valor = [],
      texto = [],
      iguais = [];
    p.linhas.forEach(r => {
      var a = idx[r.sap];
      if (!a) {
        novos.push(r);
        return;
      }
      var alvo = {
        nome: r.nome || a.nome,
        unid: r.unid || a.unid,
        usd: r.usd != null ? r.usd : a.usd
      };
      var mu = engQuimMudou(a, alvo);
      if (mu.valor) valor.push({
        a,
        r
      });else if (mu.texto) texto.push({
        a,
        r
      });else iguais.push(r);
    });
    return {
      novos,
      valor,
      texto,
      iguais,
      soBanco: lista.filter(q => !p.porSap[String(q.sap || '').trim()])
    };
  };
  var engQuimAplicar = () => {
    var p = engQ.plan;
    var c = engQuimPlanCalc(engQ.lista, p);
    var subst = p.modo === 'substituir';
    var fora = new Set(subst ? c.soBanco.map(q => q._k) : []);
    var l = engQ.lista.filter(q => !fora.has(q._k)).map(q => {
      var r = p.porSap[String(q.sap || '').trim()];
      if (!r) return q;
      var alvo = {
        ...q,
        nome: r.nome || q.nome,
        unid: r.unid || q.unid,
        usd: r.usd != null ? r.usd : q.usd
      };
      var mu = engQuimMudou(q, alvo);
      return mu.valor || mu.texto ? {
        ...alvo,
        _mud: true
      } : q;
    });
    c.novos.forEach(r => l.push({
      sap: r.sap,
      nome: r.nome,
      unid: r.unid,
      usd: r.usd,
      _mud: true
    }));
    var falta = engQuimFalta(l);
    if (falta.length) {
      setSyncErr('A planilha não pode ser aplicada: falta ' + falta.join(' · ') + '.');
      return;
    }
    var {
      l: final,
      reg
    } = engQuimGravar(l, {
      origem: 'planilha',
      arquivo: p.nome,
      por: p.por
    });
    setEngQ(x => ({
      ...x,
      plan: null,
      sujo: false,
      lista: final.map(q => ({
        ...q,
        _k: uid(),
        _sap0: q.sap
      }))
    }));
    setOkMsg(cfg.titulo + ' atualizado ✓ — ' + reg.novos + ' novo(s), ' + reg.alterados + ' alterado(s), ' + reg.removidos + ' removido(s)');
    setTimeout(() => setOkMsg(''), 6000);
  };

  /* ---- telas ---- */
  var renderEngQuimPlan = () => {
    var p = engQ.plan;
    var c = engQuimPlanCalc(engQ.lista, p);
    var subst = p.modo === 'substituir';
    var setP = patch => setEngQ(x => ({
      ...x,
      plan: {
        ...x.plan,
        ...patch
      }
    }));
    var fechar = () => setEngQ(x => ({
      ...x,
      plan: null
    }));
    var nMuda = c.novos.length + c.valor.length + c.texto.length + (subst ? c.soBanco.length : 0);
    var u4 = v => v == null ? '—' : 'US$ ' + Number(v).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    });
    var tab = (cls, cab, linhas) => engH("div", {
      className: "tbl-scroll ec-qp-wrap"
    }, engH("table", {
      className: 'db-table ' + cls
    }, engH("thead", null, engH("tr", null, cab.map((h, k) => engH("th", {
      key: k
    }, h)))), engH("tbody", null, linhas)));
    var sec = (titulo, n, corpo, aberto) => n > 0 && engH("details", {
      className: "ec-qp-sec",
      open: aberto
    }, engH("summary", null, titulo + ' (' + n + ')'), corpo);
    return engH("div", {
      className: "overlay",
      style: {
        zIndex: 320
      },
      onClick: e => {
        if (e.target === e.currentTarget) fechar();
      }
    }, engH("div", {
      className: "modal ec-modal " + CL('plan'),
      onClick: e => e.stopPropagation()
    }, engH("div", {
      className: "modal-title"
    }, engH("span", null, "Atualizar pela planilha"), engH("button", {
      className: "modal-close",
      onClick: fechar
    }, "\xD7")), engH("div", {
      className: "hm-sum"
    }, engH("div", {
      className: "hm-k"
    }, "Arquivo"), engH("div", {
      className: "hm-arq"
    }, p.nome), engH("div", {
      className: "hm-k"
    }, "Tabela"), engH("div", {
      className: "hm-arq"
    }, 'aba “' + p.aba + '”, cabeçalho na linha ' + p.cabecalho + ' · ' + p.linhas.length + ' ' + cfg.nItens + ' lido(s)')), engH("div", {
      className: "ec-qp-chips"
    }, [['ec-qp-novos', c.novos.length, 'novo(s)'], ['ec-qp-valor', c.valor.length, 'com valor alterado'], ['ec-qp-texto', c.texto.length, 'com descrição ou unidade alterada'], ['ec-qp-iguais', c.iguais.length, 'sem mudança'], ['ec-qp-so', c.soBanco.length, 'só no banco (não estão na planilha)']].map(([cls, n, rot]) => engH("span", {
      key: cls,
      className: 'ec-qp-chip ' + cls + (n ? '' : ' zero')
    }, engH("b", null, n), ' ' + rot))), (p.ignoradas.length > 0 || p.repetidos.length > 0) && engH("div", {
      className: "hm-banner ec-qp-aviso"
    }, engH("div", null, p.ignoradas.length > 0 && engH("span", null, p.ignoradas.length + ' linha(s) sem SAP ignorada(s): ' + p.ignoradas.slice(0, 6).map(x => 'linha ' + x.linha + (x.txt ? ' (' + x.txt + ')' : '')).join(', ') + (p.ignoradas.length > 6 ? '…' : '') + '. '), p.repetidos.length > 0 && engH("span", null, 'SAP repetido na planilha (vale a última linha): ' + p.repetidos.join(', ') + '.'))), engH("div", {
      className: "ec-qp-modo"
    }, engH("label", {
      className: 'ec-qp-op' + (!subst ? ' on' : '')
    }, engH("input", {
      type: "radio",
      name: "ec-qp-modo",
      className: "ec-qp-mesclar",
      checked: !subst,
      onChange: () => setP({
        modo: 'mesclar'
      })
    }), engH("b", null, "Atualizar e acrescentar"), engH("span", null, "Atualiza os produtos que est\xE3o na planilha e acrescenta os novos. Os que n\xE3o est\xE3o na planilha continuam no banco.")), engH("label", {
      className: 'ec-qp-op' + (subst ? ' on' : '')
    }, engH("input", {
      type: "radio",
      name: "ec-qp-modo",
      className: "ec-qp-substituir",
      checked: subst,
      onChange: () => setP({
        modo: 'substituir'
      })
    }), engH("b", null, "Substituir o banco pela planilha"), engH("span", null, 'O banco fica igual à planilha' + (c.soBanco.length ? ': ' + c.soBanco.length + ' ' + cfg.nItens + ' que não estão nela saem do banco.' : '.')))), engH("div", {
      className: "ec-bar"
    }, engH("label", {
      className: "lbl",
      style: {
        margin: 0
      }
    }, "Seu nome"), engH("input", {
      className: "ipt ec-qp-por",
      style: {
        maxWidth: 260
      },
      value: p.por || '',
      onChange: e => setP({
        por: e.target.value
      })
    }), engQ.sujo && engH("span", {
      className: "ec-sujo"
    }, "As altera\xE7\xF5es feitas \xE0 m\xE3o na tela do banco tamb\xE9m ser\xE3o salvas.")), sec('Valor alterado', c.valor.length, tab('ec-qp-tab-valor', ['SAP', 'Descrição', 'Unid.', 'Antes', 'Depois', 'Variação'], c.valor.map(({
      a,
      r
    }) => {
      var va = engNum(a.usd);
      var d = va && r.usd != null ? (r.usd - va) / va * 100 : null;
      return engH("tr", {
        key: r.sap
      }, engH("td", null, r.sap), engH("td", null, r.nome || a.nome), engH("td", null, r.unid || a.unid), engH("td", {
        className: "ec-num"
      }, u4(va)), engH("td", {
        className: "ec-num"
      }, engH("b", null, u4(r.usd))), engH("td", {
        className: 'ec-num' + (d > 0 ? ' ec-qp-sobe' : d < 0 ? ' ec-qp-desce' : '')
      }, d == null ? '—' : (d > 0 ? '+' : '') + fmtNum(d) + '%'));
    })), true), sec(cfg.Novos, c.novos.length, tab('ec-qp-tab-novos', ['SAP', 'Descrição', 'Unid.', 'Valor US$'], c.novos.map(r => engH("tr", {
      key: r.sap
    }, engH("td", null, r.sap), engH("td", null, r.nome), engH("td", null, r.unid), engH("td", {
      className: "ec-num"
    }, u4(r.usd))))), true), sec('Descrição ou unidade alterada', c.texto.length, tab('ec-qp-tab-texto', ['SAP', 'Antes', 'Depois'], c.texto.map(({
      a,
      r
    }) => engH("tr", {
      key: r.sap
    }, engH("td", null, r.sap), engH("td", null, a.nome + ' · ' + (a.unid || '—')), engH("td", null, engH("b", null, (r.nome || a.nome) + ' · ' + (r.unid || a.unid || '—')))))), true), sec('Só no banco', c.soBanco.length, tab('ec-qp-tab-so', ['SAP', 'Descrição', 'Unid.', 'Valor US$', ''], c.soBanco.map(q => engH("tr", {
      key: q._k
    }, engH("td", null, q.sap), engH("td", null, q.nome), engH("td", null, q.unid), engH("td", {
      className: "ec-num"
    }, u4(engNum(q.usd))), engH("td", null, subst ? engH("span", {
      className: "ec-tag ec-tag-risco"
    }, "sai do banco") : engH("span", {
      className: "ec-tag"
    }, "continua"))))), subst), engH("div", {
      className: "ec-foot"
    }, engH("span", {
      className: "ec-qp-res"
    }, nMuda ? nMuda + ' mudança(s) no banco' : 'A planilha não muda nada no banco.'), engH("span", {
      style: {
        flex: 1
      }
    }), engH("button", {
      className: "btn-o",
      onClick: fechar
    }, "Cancelar"), engH("button", {
      className: "btn-r ec-qp-aplicar",
      disabled: !nMuda,
      onClick: engQuimAplicar
    }, "Aplicar e salvar"))));
  };
  var renderEngQuim = () => {
    if (!engQ) return null;
    var lista = engQ.lista || [];
    var cat = cfg.catalogo ? engQuimCat() : null;
    var setQ = (k, patch) => setEngQ(x => ({
      ...x,
      sujo: true,
      lista: x.lista.map(q => q._k === k ? {
        ...q,
        ...patch,
        _mud: true
      } : q)
    }));
    var fechar = () => {
      if (engQ.sujo) {
        askConfirm({
          title: 'Fechar sem salvar',
          okLabel: 'Fechar sem salvar',
          danger: true,
          msg: engH("span", null, 'O ' + cfg.titulo.charAt(0).toLowerCase() + cfg.titulo.slice(1) + ' tem alterações que não foram salvas.'),
          onOk: () => setEngQ(null)
        });
        return;
      }
      setEngQ(null);
    };
    var comAviso = lista.map(q => ({
      q,
      av: engQuimAvisos(q, cat)
    }));
    var nAviso = comAviso.filter(x => x.av.length).length;
    var qb = normNome(engQ.busca);
    var vis = comAviso.filter(x => (!qb || normNome(String(x.q.sap || '') + ' ' + String(x.q.nome || '')).includes(qb)) && (!engQ.soAviso || x.av.length)).sort((a, b) => !a.q.id !== !b.q.id ? a.q.id ? 1 : -1 : String(a.q.nome || '').localeCompare(String(b.q.nome || ''), 'pt'));
    var falta = engQuimFalta(lista);
    var hist = (db[cfg.hist] || []).slice().reverse();
    var ult = hist[0];
    var origemTxt = h => h.origem === 'base' ? 'Base inicial — ' + (h.arquivo || 'aba Forecast') : h.origem === 'custos' ? 'Vindos de Custos (COGS) — ' + (h.arquivo || 'casing equipment') : h.origem === 'planilha' ? 'Planilha ' + (h.arquivo || '') : 'Alteração na tela';
    var inp = (q, k, num) => engH("input", {
      className: 'ipt ec-in ec-q-' + k,
      value: num ? typeof q[k] === 'number' ? engNumTxt(Math.round(q[k] * 10000) / 10000) : q[k] == null ? '' : q[k] : q[k] || '',
      inputMode: num ? 'decimal' : undefined,
      readOnly: k === 'sap' && !!q.id && !!String(q._sap0 || '').trim(),
      title: k === 'sap' && q.id && String(q._sap0 || '').trim() ? 'O SAP de um ' + cfg.item + ' salvo não muda. Para trocar, tire a linha e inclua o ' + cfg.item + ' de novo.' : undefined,
      onChange: e => setQ(q._k, {
        [k]: e.target.value
      })
    });
    return engH("div", {
      className: "overlay",
      style: {
        zIndex: 245
      },
      onClick: e => {
        if (e.target === e.currentTarget) fechar();
      }
    }, engH("div", {
      className: "modal ec-modal " + CL('modal'),
      onClick: e => e.stopPropagation()
    }, engH("div", {
      className: "modal-title"
    }, engH("span", null, cfg.tituloModal), engH("button", {
      className: "modal-close",
      onClick: fechar
    }, "\xD7")), engH("div", {
      className: "eng-help",
      style: {
        marginTop: 0
      }
    }, cfg.ajuda), engH("div", {
      className: CL('info')
    }, engH("b", {
      className: CL('n')
    }, lista.length + ' ' + cfg.nItens), ult && engH("span", {
      className: CL('ult')
    }, '· última atualização ' + fmtDH(ult.em) + ' — ' + origemTxt(ult) + (ult.por ? ' · ' + ult.por : '')), nAviso > 0 && engH("span", {
      className: CL('nav')
    }, '· ⚠ ' + nAviso + ' com aviso')), engH("div", {
      className: "ec-bar"
    }, engH("input", {
      className: "ipt " + CL('busca'),
      style: {
        maxWidth: 260
      },
      placeholder: cfg.busca,
      value: engQ.busca || '',
      onChange: e => {
        var v = e.target.value;
        setEngQ(x => ({
          ...x,
          busca: v
        }));
      }
    }), engH("label", {
      className: "ec-ck"
    }, engH("input", {
      type: "checkbox",
      className: CL('soaviso'),
      checked: !!engQ.soAviso,
      onChange: e => {
        var v = e.target.checked;
        setEngQ(x => ({
          ...x,
          soAviso: v
        }));
      }
    }), " s\xF3 com aviso"), engH("span", {
      style: {
        flex: 1
      }
    }), engH("button", {
      className: "btn-o " + CL('novo'),
      onClick: () => setEngQ(x => ({
        ...x,
        sujo: true,
        busca: '',
        soAviso: false,
        lista: [...x.lista, {
          _k: uid(),
          _mud: true,
          sap: '',
          nome: '',
          unid: '',
          usd: ''
        }]
      }))
    }, cfg.novo), engH("button", {
      className: "btn-r " + CL('carregar'),
      onClick: () => engQRef.current && engQRef.current.click()
    }, "⬆ Atualizar pela planilha"), engH("button", {
      className: "btn-o " + CL('baixar'),
      onClick: () => engQuimBaixar(lista)
    }, lista.length ? '⬇ Baixar planilha' : '⬇ Modelo da planilha')), engH("div", {
      className: "tbl-scroll ec-itens-wrap"
    }, engH("table", {
      className: "db-table ec-itens " + CL('tab')
    }, engH("thead", null, engH("tr", null, ['SAP', 'Descrição', 'Unid.', 'Valor US$', 'Atualizado', 'Aviso', ''].map((h, k) => engH("th", {
      key: k
    }, h)))), engH("tbody", null, vis.map(({
      q,
      av
    }) => engH("tr", {
      key: q._k,
      'data-sap': String(q.sap || '')
    }, engH("td", null, inp(q, 'sap')), engH("td", null, inp(q, 'nome')), engH("td", null, inp(q, 'unid')), engH("td", null, inp(q, 'usd', 1)), engH("td", {
      className: CL('em')
    }, q.atualizadoEm ? fmtD(String(q.atualizadoEm).slice(0, 10)) : '—'), engH("td", null, av.map(a => engH("span", {
      key: a[0],
      className: "ec-tag " + CL('aviso'),
      title: a[1]
    }, '⚠ ' + a[0]))), engH("td", null, engH("button", {
      className: "btn-o hm-x",
      title: "Tirar o produto do banco",
      onClick: () => setEngQ(x => ({
        ...x,
        sujo: true,
        lista: x.lista.filter(y => y._k !== q._k)
      }))
    }, "\xD7")))), !vis.length && engH("tr", null, engH("td", {
      colSpan: 7,
      className: "ec-vazio"
    }, lista.length ? 'Nenhum ' + cfg.item + ' no filtro.' : 'Nenhum ' + cfg.item + ' — use “⬆ Atualizar pela planilha” ou “' + cfg.novo + '”.'))))), hist.length > 0 && engH("details", {
      className: CL('hist')
    }, engH("summary", null, 'Histórico de atualizações (' + hist.length + ')'), engH("div", {
      className: "tbl-scroll"
    }, engH("table", {
      className: "db-table"
    }, engH("thead", null, engH("tr", null, ['Quando', 'Origem', 'Por', 'Novos', 'Alterados', 'Removidos', 'Total'].map((h, k) => engH("th", {
      key: k
    }, h)))), engH("tbody", null, hist.slice(0, 30).map(h => engH("tr", {
      key: h.id
    }, engH("td", null, fmtDH(h.em)), engH("td", null, origemTxt(h)), engH("td", null, h.por || '—'), engH("td", {
      className: "ec-num"
    }, h.novos), engH("td", {
      className: "ec-num"
    }, h.alterados), engH("td", {
      className: "ec-num"
    }, h.removidos), engH("td", {
      className: "ec-num"
    }, h.total))))))), engH("div", {
      className: "ec-foot"
    }, falta.length > 0 && engH("span", {
      className: "ho-pend"
    }, 'Para salvar, falta: ' + falta.join(' · ')), engQ.sujo && !falta.length && engH("span", {
      className: "ec-sujo"
    }, "Altera\xE7\xF5es n\xE3o salvas"), engH("span", {
      style: {
        flex: 1
      }
    }), engH("button", {
      className: "btn-r " + CL('salvar'),
      disabled: falta.length > 0 || !engQ.sujo,
      onClick: engQuimSalvar
    }, "Salvar"))), engQ.plan && renderEngQuimPlan(), engH("input", {
      ref: engQRef,
      type: "file",
      accept: ".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv",
      style: {
        display: 'none'
      },
      onChange: e => {
        var f = e.target.files && e.target.files[0];
        e.target.value = '';
        engQuimArquivo(f);
      }
    }));
  };
  return {
    abrir: abrirEngQuim,
    render: renderEngQuim,
    lerWb: engQuimLerWb
  };
  };
  // químicos (e6): db.quimicos
  var engBQ = engBancoMat({
    p: 'quim',
    item: 'produto',
    nItens: 'produto(s)',
    Novos: 'Produtos novos',
    novo: '＋ Produto',
    busca: 'Buscar SAP ou produto…',
    titulo: 'Banco de químicos',
    tituloModal: 'Banco de produtos químicos',
    kind: 'Químicos',
    nLog: 'produto(s) químico(s)',
    idPre: 'q_',
    catalogo: true,
    manter: false,
    pref: /quimic/,
    evita: /casing/,
    arq: 'Banco_Quimicos_EARL_',
    aba: 'Químicos',
    exemplo: [100003685, 'Exemplo: CIMENTO CLASS G (apague esta linha)', 'SK', 13.15, ''],
    semTabela: 'Não achei a tabela de químicos na planilha. Ela precisa de uma linha de cabeçalho com SAP, Descrição, Unidade e Valor US$ (ou SAP, Químicos, UOM e COGS, como na aba Forecast).',
    ajuda: 'SAP, descrição, unidade e valor unitário em US$ (COGS) de cada produto químico. É o valor usado no COGS das químicas das operações (previstas e lançadas). Para atualizar, receba a planilha do responsável, clique em “⬆ Atualizar pela planilha”, confira as mudanças e aplique. Planilha com as abas de químicos e de casing equipment: aqui entra a aba de químicos.',
    hist: 'quimHist',
    ler: d => d.quimicos || [],
    gravar: (d, l, reg, agora) => ({
      ...d,
      quimicos: l,
      quimHist: [...(d.quimHist || []), reg].slice(-60),
      quimBaseV1: d.quimBaseV1 || agora
    })
  });
  // casing equipment (e12): db.casingEquip, o catálogo de casing do EARL ({sap, name, unit, origem}) com usd e atualizadoEm
  var engBC = engBancoMat({
    p: 'casdb',
    item: 'item',
    nItens: 'item(ns)',
    Novos: 'Itens novos',
    novo: '＋ Item',
    busca: 'Buscar SAP ou item…',
    titulo: 'Banco de casing equipment',
    tituloModal: 'Banco de casing equipment',
    kind: 'Casing equipment',
    nLog: 'item(ns) de casing equipment',
    idPre: 'ce_',
    catalogo: false,
    manter: true,
    pref: /casing|equip/,
    evita: /quimic/,
    arq: 'Banco_Casing_Equipment_EARL_',
    aba: 'Casing Equipment',
    exemplo: [103101982, 'Exemplo: ASSY BAF,BYP,9-5/8 TO 10-3/4IN,FOR SSRII (apague esta linha)', 'EA', 250, ''],
    semTabela: 'Não achei a tabela de casing equipment na planilha. Ela precisa de uma linha de cabeçalho com SAP, Descrição, Unidade e Valor US$ (ou SAP, Casing, UOM e COGS, como na aba Forecast).',
    ajuda: 'SAP, descrição, unidade e valor unitário em US$ (COGS) de cada item de casing equipment. É a lista de casing que aparece para escolher nas operações, e o valor é o COGS do casing das operações (previstas e lançadas). Para atualizar, receba a planilha do responsável, clique em “⬆ Atualizar pela planilha”, confira as mudanças e aplique. Planilha com as abas de químicos e de casing equipment: aqui entra a aba de casing.',
    hist: 'casHist',
    ler: d => (d.casingEquip || []).map(c => ({
      ...c,
      id: c.id || (String(c.sap || '').trim() ? 'ce_' + String(c.sap).trim() : ''),
      nome: c.name || '',
      unid: c.unit || ''
    })),
    gravar: (d, l, reg) => ({
      ...d,
      casingEquip: l.map(({
        nome,
        unid,
        name,
        unit,
        ...r
      }) => ({
        ...r,
        name: nome,
        unit: unid || 'EA'
      })),
      casHist: [...(d.casHist || []), reg].slice(-60)
    })
  });
  var abrirEngQuim = engBQ.abrir,
    renderEngQuim = engBQ.render,
    engQuimLerWb = engBQ.lerWb,
    abrirEngCasDb = engBC.abrir,
    renderEngCasDb = engBC.render;
