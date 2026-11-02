  /* ============ CONTRATOS (avulso): preços em R$ e US$, reajustes, consumo e receita ============
     Usa o mesmo cadastro do EARL (db.contratos): items[] {ref, desc, unit, saldoIni, base} ganham
     brl / usd (valor unitário inicial); o contrato ganha inicio e reajustes[] {id, desde, obs, em, por,
     precos: {ref: {brl, usd}}}. A operação planejada ganha ppuCons {data, linhas[{ref, desc, unit, qty}],
     em, por}: o consumo lançado pelo engenheiro, que baixa o saldo e gera a receita (preço da data). */
  var [engCt, setEngCt] = useState(null);
  var [engCons, setEngCons] = useState(null);
  var [engRec, setEngRec] = useState({
    de: '',
    ate: ''
  });
  var engImpRef = useRef(null);
  var engNum = v => {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    var s = String(v).replace(/[^\d,.\-]/g, '');
    if (!s || s === '-') return null;
    var c = s.lastIndexOf(','),
      p = s.lastIndexOf('.');
    if (c >= 0 && p >= 0) s = c > p ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');else if (c >= 0) s = (s.match(/,/g) || []).length > 1 ? s.replace(/,/g, '') : s.replace(',', '.');else if ((s.match(/\./g) || []).length > 1 || /^-?[1-9]\d{0,2}\.\d{3}$/.test(s)) s = s.replace(/\./g, '');
    var n = parseFloat(s);
    return isFinite(n) ? n : null;
  };
  var engNumTxt = v => v == null || v === '' ? '' : typeof v === 'number' ? String(v).replace('.', ',') : String(v);
  var engMoeda = (pref, min, max) => v => v == null || !isFinite(v) ? '—' : pref + ' ' + Number(v).toLocaleString('pt-BR', {
    minimumFractionDigits: min,
    maximumFractionDigits: max
  });
  var fmtBRL = engMoeda('R$', 2, 2),
    fmtUSD = engMoeda('US$', 2, 2),
    fmtPBRL = engMoeda('R$', 2, 4),
    fmtPUSD = engMoeda('US$', 2, 4);
  var engR4 = v => Math.round(v * 10000) / 10000;
  /* Preço vigente de uma linha numa data: o inicial do item e, por cima, os reajustes até a data. */
  var ctPreco = (ct, ref, data) => {
    var it = (ct && ct.items || []).find(i => i.ref === ref) || {};
    var p = {
      brl: engNum(it.brl),
      usd: engNum(it.usd),
      desde: ct && ct.inicio || '',
      reaj: null
    };
    (ct && ct.reajustes || []).slice().sort((a, b) => String(a.desde || '').localeCompare(String(b.desde || ''))).forEach(r => {
      if (data && String(r.desde || '') > String(data)) return;
      var x = (r.precos || {})[ref];
      if (!x) return;
      if (engNum(x.brl) != null) p.brl = engNum(x.brl);
      if (engNum(x.usd) != null) p.usd = engNum(x.usd);
      p.desde = r.desde;
      p.reaj = r;
    });
    return p;
  };
  var engOpsDoCt = ct => (db.plannedJobs || []).filter(j => j.status !== PJ_STATUS.CANC && ct && pjDoContrato(j, ct));
  var engConsDoCt = (ct, exceto) => {
    var o = {};
    engOpsDoCt(ct).forEach(j => {
      if (j.id === exceto) return;
      (j.ppuCons && j.ppuCons.linhas || []).forEach(l => {
        o[l.ref] = (o[l.ref] || 0) + (engNum(l.qty) || 0);
      });
    });
    return o;
  };
  var engRefsUsados = ct => {
    var o = {};
    if (!ct || !ct.id) return o;
    engOpsDoCt(ct).forEach(j => {
      var refs = new Set([...(j.ppuNeeds || []).map(n => n.ref), ...(j.ppuCons && j.ppuCons.linhas || []).map(l => l.ref)]);
      refs.forEach(r => {
        if (r) o[r] = (o[r] || 0) + 1;
      });
    });
    return o;
  };
  /* Receita de uma operação (linhas lançadas × preço vigente na data do serviço). */
  var engOpValor = j => {
    var c = j && j.ppuCons;
    if (!c || !(c.linhas || []).length) return null;
    var ct = ctDoJob(j);
    var data = c.data || j.date;
    var vB = 0,
      vU = 0,
      semB = 0,
      semU = 0;
    c.linhas.forEach(l => {
      var q = engNum(l.qty) || 0;
      var p = ct ? ctPreco(ct, l.ref, data) : {};
      if (p.brl != null) vB += q * p.brl;else semB++;
      if (p.usd != null) vU += q * p.usd;else semU++;
    });
    return {
      ct,
      data,
      n: c.linhas.length,
      vB,
      vU,
      semB,
      semU
    };
  };
  /* ---- e5: risco da receita/COGS (riscoRec, 0–100% na operação) e COGS unitário por SAP (db.cogsItens) ---- */
  var engFator = j => {
    var r = Number(j && j.riscoRec);
    return isFinite(r) && r > 0 ? Math.max(0, 1 - Math.min(100, r) / 100) : 1;
  };
  var engCogsIdx = () => {
    var o = {};
    (db.cogsItens || []).forEach(c => {
      if (c && String(c.sap || '').trim()) o['s:' + String(c.sap).trim()] = c;
      if (c && c.nome) o['n:' + normNome(c.nome)] = c;
    });
    return o;
  };
  var engCogsDe = (idx, m) => m ? idx['s:' + String(m.sap || '').trim()] || idx['n:' + normNome(m.name || m.nome || '')] || null : null;
  var engCogsSoma = (idx, lista) => {
    var u = 0,
      b = 0,
      sem = 0;
    (lista || []).forEach(m => {
      var q = engNum(m.qty != null ? m.qty : m.qtd) || 0;
      if (!q) return;
      var c = engCogsDe(idx, m);
      var cu = c ? engNum(c.usd) : null,
        cb = c ? engNum(c.brl) : null;
      if (cu == null && cb == null) {
        sem++;
        return;
      }
      if (cu != null) u += q * cu;
      if (cb != null) b += q * cb;
    });
    return {
      u,
      b,
      sem
    };
  };
  var engRiscoTag = j => {
    var rr = Number(j && j.riscoRec) || 0;
    if (rr <= 0) return null;
    return engH("span", {
      className: "ec-tag ec-tag-risco",
      title: rr >= 100 ? 'Operação mapeada, mas fora da receita e do COGS' : 'Receita e COGS contam ' + (100 - rr) + '%'
    }, 'risco ' + fmtNum(rr) + '%');
  };
  var engRiscoCampo = (d, set) => {
    if (!d || d.__tpl) return null;
    var rr = Number(d.riscoRec) || 0;
    return engH("div", {
      className: "fld ec-risco-fld"
    }, engH("label", {
      className: "lbl"
    }, "Risco da receita / COGS"), engH("div", {
      className: "eng-risco"
    }, engH("input", {
      type: "range",
      min: "0",
      max: "100",
      step: "5",
      value: rr,
      onChange: e => set('riscoRec', Number(e.target.value))
    }), engH("input", {
      className: "qty-input ec-risco-in",
      type: "number",
      min: "0",
      max: "100",
      value: d.riscoRec == null || d.riscoRec === '' ? '' : d.riscoRec,
      placeholder: "0",
      onChange: e => set('riscoRec', e.target.value === '' ? '' : Math.max(0, Math.min(100, Number(e.target.value) || 0)))
    }), engH("b", null, "%")), engH("div", {
      className: "eng-help"
    }, rr >= 100 ? 'Risco 100%: a opera\xE7\xE3o fica mapeada, mas fora da receita e do COGS.' : rr > 0 ? 'Receita e COGS contam ' + (100 - rr) + '% (\xD7 ' + fmtNum((100 - rr) / 100) + ').' : '0% = receita e COGS contam inteiros. 100% = a opera\xE7\xE3o fica mapeada, mas fora da receita e do COGS.'));
  };
  var engConsTag = j => {
    var v = engOpValor(j);
    if (!v) return null;
    return engH("span", {
      className: "ec-tag",
      title: 'Consumo de PPU lançado (serviço em ' + fmtD(v.data) + ')'
    }, 'Σ ' + (v.n - v.semB > 0 ? fmtBRL(v.vB) : v.n - v.semU > 0 ? fmtUSD(v.vU) : v.n + ' item(ns)') + (engFator(j) === 0 ? ' · fora da receita' : ''));
  };
  var engConsBanner = d => {
    if (!d || !d.id || d.__tpl) return null;
    var pj = (db.plannedJobs || []).find(j => j.id === d.id);
    var c = pj && pj.ppuCons;
    if (!c) return null;
    var v = engOpValor(pj) || {
      n: 0,
      vB: 0,
      vU: 0
    };
    var hd = (c.pes || []).reduce((a, p) => a + (Number(p.hd) || 0), 0);
    return engH("div", {
      className: "hm-banner ec-banner"
    }, engH("div", null, engH("b", null, 'Σ Consumo da operação lançado'), engH("span", null, ['serviço em ' + fmtD(c.data || pj.date), v.n + ' item(ns) PPU · ' + fmtBRL(v.vB) + ' · ' + fmtUSD(v.vU), (c.quim || []).length ? c.quim.length + ' química(s)' : '', (c.cas || []).length ? c.cas.length + ' casing' : '', hd ? fmtNum(hd) + ' homem-dia' : ''].filter(Boolean).join(' · '))), engH("button", {
      className: "btn-o",
      onClick: () => abrirEngCons(pj)
    }, "Editar consumo"));
  };

  /* ---------------- planilha (Excel/CSV) ---------------- */
  var engPlanLinhas = (rows, rowsTxt) => {
    rowsTxt = rowsTxt || rows;
    var nh = v => asciiName(String(v == null ? '' : v)).toLowerCase().trim();
    var tipoCol = h => {
      if (!h) return '';
      if (/descri|produto|material|quimic|casing/.test(h)) return 'desc';
      if (/^(unid|un$|un |uom|unit)/.test(h)) return 'unit';
      if (/saldo|quant|qtd|qtde|volume/.test(h)) return 'saldo';
      if (/(^|[^a-z])us($|[^a-z])|usd|dolar|dollar/.test(h)) return 'usd';
      if (/(^|[^a-z])r($|[^a-z])|brl|reais|real|preco|valor|price/.test(h)) return 'brl';
      if (/cogs|custo/.test(h)) return 'usd';
      if (/^(item|ref|referencia|cod|codigo|sap|n|no|numero)($|[^a-z])/.test(h)) return 'ref';
      return '';
    };
    var hi = -1,
      cols = null;
    for (var i = 0; i < Math.min(rows.length, 20); i++) {
      var m = {};
      (rowsTxt[i] || []).forEach((v, k) => {
        var t = tipoCol(nh(v));
        if (t && m[t] == null) m[t] = k;
      });
      if (m.ref != null && (m.desc != null || m.brl != null || m.usd != null)) {
        hi = i;
        cols = m;
        break;
      }
    }
    if (!cols) {
      hi = -1;
      cols = {
        ref: 0,
        desc: 1,
        unit: 2,
        saldo: 3,
        brl: 4,
        usd: 5
      };
    }
    var out = [];
    rows.forEach((r, n) => {
      if (n <= hi || !r) return;
      var rt = rowsTxt[n] || r;
      var txt = k => k == null ? '' : String(rt[k] == null ? '' : rt[k]).trim();
      // números: o valor da célula quando é número; senão o texto, lido no padrão brasileiro
      var num = k => k == null ? null : typeof r[k] === 'number' ? r[k] : engNum(rt[k]);
      var ref = txt(cols.ref);
      if (!ref) return;
      out.push({
        ref,
        desc: txt(cols.desc),
        unit: txt(cols.unit),
        saldo: num(cols.saldo),
        brl: num(cols.brl),
        usd: num(cols.usd)
      });
    });
    return {
      linhas: out,
      cabecalho: hi >= 0,
      cols
    };
  };
  var engLerPlanilha = file => new Promise((res, rej) => {
    var r = new FileReader();
    r.onload = () => {
      try {
        var buf = new Uint8Array(r.result);
        var wb;
        if (/\.(csv|txt)$/i.test(file.name || '')) {
          // CSV: texto puro (UTF-8 ou Windows-1252, o padrão do Excel em português), sem conversão
          // automática de números — "1.500,00" e o item "1.10" ficam como estão e são lidos aqui.
          var txt;
          try {
            txt = new TextDecoder('utf-8', {
              fatal: true
            }).decode(buf);
          } catch (e) {
            txt = new TextDecoder('windows-1252').decode(buf);
          }
          if (txt.charCodeAt(0) === 0xFEFF) txt = txt.slice(1);
          wb = XLSX.read(txt, {
            type: 'string',
            raw: true
          });
        } else wb = XLSX.read(buf, {
          type: 'array'
        });
        var ws = wb.Sheets[wb.SheetNames[0]];
        var op = raw => ({
          header: 1,
          defval: '',
          raw
        });
        res(engPlanLinhas(XLSX.utils.sheet_to_json(ws, op(true)), XLSX.utils.sheet_to_json(ws, op(false))));
      } catch (e) {
        rej(e);
      }
    };
    r.onerror = () => rej(r.error);
    r.readAsArrayBuffer(file);
  });
  var engBaixarXlsx = (nome, abas) => {
    var wb = XLSX.utils.book_new();
    abas.forEach(([titulo, aoa, larg]) => {
      var ws = XLSX.utils.aoa_to_sheet(aoa);
      if (larg) ws['!cols'] = larg.map(w => ({
        wch: w
      }));
      XLSX.utils.book_append_sheet(wb, ws, titulo.slice(0, 31));
    });
    var buf = XLSX.write(wb, {
      bookType: 'xlsx',
      type: 'array'
    });
    forceDownload([new File([buf], asciiName(fnSafe(nome)) + '.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })]);
  };
  var engCtPlanilha = dr => {
    var it = dr.items || [];
    var linhas = it.length ? it.map(i => [i.ref, i.desc || '', i.unit || '', engNum(i.saldoIni), engNum(i.brl), engNum(i.usd)]) : [['1.1', 'Exemplo: taxa de serviço de cimentação (apague esta linha)', 'dia', 100, 1500, 280]];
    engBaixarXlsx('PPU - ' + (dr.name || 'modelo'), [['PPU', [['Item', 'Descrição', 'Unidade', 'Saldo', 'Valor unitário R$', 'Valor unitário US$'], ...linhas], [10, 70, 10, 12, 18, 18]]]);
  };

  /* ---------------- janela Contratos ---------------- */
  var abrirEngContratos = () => setEngCt({
    view: 'lista',
    busca: '',
    arq: false
  });
  var engCtAbrir = ct => setEngCt(x => ({
    ...(x || {}),
    view: 'edit',
    sujo: false,
    ibusca: '',
    reaj: null,
    imp: null,
    draft: ct ? {
      ...JSON.parse(JSON.stringify(ct)),
      reajustes: ct.reajustes || [],
      items: (ct.items || []).map(i => ({
        ...i,
        _k: uid()
      }))
    } : {
      id: '',
      clientName: '',
      name: '',
      numero: '',
      kind: 'servico',
      bases: [],
      inicio: '',
      items: [],
      aditivos: [],
      reajustes: [],
      archived: false,
      version: 1
    }
  }));
  var engCtFalta = dr => {
    var f = [];
    if (!String(dr.name || '').trim()) f.push('nome do contrato');
    if (!String(dr.clientName || '').trim()) f.push('cliente');
    var refs = (dr.items || []).map(i => String(i.ref || '').trim());
    if (refs.some(r => !r)) f.push('item (código) em todas as linhas');
    var rep = refs.filter((r, i) => r && refs.indexOf(r) !== i);
    if (rep.length) f.push('itens repetidos (' + [...new Set(rep)].join(', ') + ')');
    return f;
  };
  var engCtSalvar = (dr, msg) => {
    if (engCtFalta(dr).length) return false;
    var nome = String(dr.name || '').trim();
    var items = (dr.items || []).map(i => {
      var o = {
        ...i,
        ref: String(i.ref).trim(),
        desc: String(i.desc || '').trim(),
        unit: String(i.unit || '').trim()
      };
      delete o._k;
      delete o._novo;
      [['saldoIni', i.saldoIni], ['brl', i.brl], ['usd', i.usd]].forEach(([k, v]) => {
        var n = engNum(v);
        if (n == null) delete o[k];else o[k] = n;
      });
      if (!o.base) o.base = (dr.bases || []).join(' / ');
      return o;
    });
    var novo = !dr.id;
    var id = dr.id || 'ct_' + uid();
    var reajustes = (dr.reajustes || []).slice().sort((a, b) => String(a.desde || '').localeCompare(String(b.desde || '')));
    updateDB(d => {
      var [clients, cli] = ensureClientIn(d, dr.clientName);
      var ct = {
        ...dr,
        id,
        name: nome,
        numero: String(dr.numero || '').trim() || nome,
        clientName: cli ? cli.name : String(dr.clientName || '').trim(),
        clientId: cli ? cli.id : '',
        items,
        reajustes,
        regiao: ctrRegioes(dr)[0],
        version: dr.version || 1,
        aditivos: dr.aditivos || [],
        archived: !!dr.archived,
        atualizadoEm: new Date().toISOString()
      };
      var l = [...(d.contratos || [])];
      var i = l.findIndex(c => c.id === id);
      if (i >= 0) l[i] = ct;else l.push(ct);
      return {
        ...d,
        clients,
        contratos: l
      };
    }, {
      kind: 'Contrato',
      action: novo ? 'Inclusão' : 'Alteração',
      name: nome,
      user: currentUser() || '—',
      detail: items.length + ' linha(s) PPU · ' + items.filter(i => i.brl != null || i.usd != null).length + ' com preço · ' + reajustes.length + ' reajuste(s)'
    });
    setEngCt(x => x && x.draft ? {
      ...x,
      sujo: false,
      reaj: null,
      draft: {
        ...x.draft,
        id,
        reajustes
      }
    } : x);
    setOkMsg(msg || 'Contrato salvo ✓');
    setTimeout(() => setOkMsg(''), 3500);
    return true;
  };
  var engCtSair = () => {
    if (engCt && engCt.view === 'edit' && engCt.sujo) {
      askConfirm({
        title: 'Sair sem salvar',
        okLabel: 'Sair sem salvar',
        danger: true,
        msg: engH("span", null, "O contrato tem altera\xE7\xF5es que n\xE3o foram salvas."),
        hint: 'Para guardar, cancele e clique em “Salvar contrato”.',
        onOk: () => setEngCt(x => x && {
          ...x,
          view: 'lista',
          draft: null,
          sujo: false
        })
      });
      return;
    }
    setEngCt(x => x && {
      ...x,
      view: 'lista',
      draft: null
    });
  };
  var renderEngContratos = () => {
    if (!engCt) return null;
    var fechar = () => {
      if ((engCt.view === 'edit' || engCt.view === 'cogs') && engCt.sujo) {
        askConfirm({
          title: 'Fechar sem salvar',
          okLabel: 'Fechar sem salvar',
          danger: true,
          msg: engH("span", null, "O contrato tem altera\xE7\xF5es que n\xE3o foram salvas."),
          onOk: () => setEngCt(null)
        });
        return;
      }
      setEngCt(null);
    };
    return engH("div", {
      className: "overlay",
      style: {
        zIndex: 245
      },
      onClick: e => {
        if (e.target === e.currentTarget) fechar();
      }
    }, engH("div", {
      className: "modal ec-modal",
      onClick: e => e.stopPropagation()
    }, engCt.view === 'edit' && engCt.draft ? renderEngCtEdit(fechar) : engCt.view === 'cogs' ? renderEngCogs(fechar) : renderEngCtLista(fechar)), engCt.reaj && renderEngReaj(), engCt.imp && renderEngImp(), engH("input", {
      ref: engImpRef,
      type: "file",
      accept: ".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv",
      style: {
        display: 'none'
      },
      onChange: e => {
        var f = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!f) return;
        var destino = engCt.impDestino || 'itens';
        engLerPlanilha(f).then(r => destino === 'cogs' ? engCogsAplicar(r) : setEngCt(x => x && {
          ...x,
          imp: {
            nome: f.name,
            destino,
            modo: 'mesclar',
            ...r
          }
        })).catch(err => setSyncErr('Não foi possível ler a planilha: ' + (err && err.message || err)));
      }
    }));
  };
  var engCarregar = destino => {
    setEngCt(x => ({
      ...x,
      impDestino: destino
    }));
    setTimeout(() => engImpRef.current && engImpRef.current.click(), 0);
  };
  var renderEngCtLista = fechar => {
    var q = normNome(engCt.busca);
    var todos = db.contratos || [];
    var lista = todos.filter(c => c && !!c.archived === !!engCt.arq && (!q || [c.name, c.numero, c.clientName, (c.bases || []).join(' ')].join(' ').toLowerCase().includes(q))).sort((a, b) => String(a.clientName || '').localeCompare(String(b.clientName || ''), 'pt') || String(a.name || '').localeCompare(String(b.name || ''), 'pt'));
    var nArq = todos.filter(c => c && c.archived).length;
    return engH(React.Fragment, null, engH("div", {
      className: "modal-title"
    }, engH("span", null, "Contratos"), engH("button", {
      className: "modal-close",
      onClick: fechar
    }, "\xD7")), engH("div", {
      className: "eng-help",
      style: {
        marginTop: 0
      }
    }, "Cada contrato tem a sua lista de itens PPU com saldo e valor unit\xE1rio em R$ e US$. Os reajustes mudam os valores a partir de uma data. Os engenheiros lan\xE7am o consumo de cada opera\xE7\xE3o, que baixa o saldo e gera a receita."), engH("div", {
      className: "ec-bar"
    }, engH("input", {
      className: "ipt",
      style: {
        maxWidth: 280
      },
      placeholder: "Buscar contrato, n\xFAmero, cliente…",
      value: engCt.busca || '',
      onChange: e => {
        var v = e.target.value;
        setEngCt(x => ({
          ...x,
          busca: v
        }));
      }
    }), engH("label", {
      className: "ec-ck"
    }, engH("input", {
      type: "checkbox",
      checked: !!engCt.arq,
      onChange: e => {
        var v = e.target.checked;
        setEngCt(x => ({
          ...x,
          arq: v
        }));
      }
    }), ' Arquivados (' + nArq + ')'), engH("span", {
      style: {
        flex: 1
      }
    }), engH("button", {
      className: "btn-o ec-cogs-btn",
      onClick: engCogsAbrir,
      title: "COGS unitário por material (SAP) — químicas e casing equipment"
    }, "Custos (COGS)"), engH("button", {
      className: "btn-r ec-novo",
      onClick: () => engCtAbrir(null)
    }, "＋ Novo contrato")), engH("div", {
      className: "tbl-scroll"
    }, engH("table", {
      className: "db-table ec-lista"
    }, engH("thead", null, engH("tr", null, ['Cliente', 'Contrato', 'Número', 'Tipo', 'Bases', 'Linhas PPU', 'Com preço', 'Reajustes', 'Operações', ''].map((h, i) => engH("th", {
      key: i
    }, h)))), engH("tbody", null, lista.map(c => {
      var it = c.items || [];
      var nP = it.filter(i => engNum(i.brl) != null || engNum(i.usd) != null).length;
      var rj = (c.reajustes || []).slice().sort((a, b) => String(b.desde || '').localeCompare(String(a.desde || '')));
      return engH("tr", {
        key: c.id,
        className: "ec-row",
        onClick: () => engCtAbrir(c)
      }, engH("td", null, c.clientName || '—'), engH("td", null, engH("b", null, c.name || '—')), engH("td", null, c.numero && c.numero !== c.name ? c.numero : '—'), engH("td", null, ctKindLabel(c.kind)), engH("td", null, (c.bases || []).join(', ') || '—'), engH("td", null, it.length), engH("td", null, engH("span", {
        className: nP === it.length && it.length ? 'ec-ok' : nP ? 'ec-parc' : 'ec-sem'
      }, nP + ' de ' + it.length)), engH("td", null, rj.length ? rj.length + ' · último ' + fmtD(rj[0].desde) : '—'), engH("td", null, engOpsDoCt(c).length), engH("td", null, engH("button", {
        className: "btn-o",
        onClick: ev => {
          ev.stopPropagation();
          engCtAbrir(c);
        }
      }, "Abrir →")));
    }), !lista.length && engH("tr", null, engH("td", {
      colSpan: 10,
      style: {
        color: 'var(--ink-3)',
        fontStyle: 'italic'
      }
    }, "Nenhum contrato."))))));
  };
  var renderEngCtEdit = fechar => {
    var dr = engCt.draft;
    var setDr = patch => setEngCt(x => ({
      ...x,
      sujo: true,
      draft: {
        ...x.draft,
        ...patch
      }
    }));
    var setItem = (k, patch) => setEngCt(x => ({
      ...x,
      sujo: true,
      draft: {
        ...x.draft,
        items: x.draft.items.map(i => i._k === k ? {
          ...i,
          ...patch
        } : i)
      }
    }));
    var falta = engCtFalta(dr);
    var usados = engRefsUsados(dr);
    var cons = dr.id ? engConsDoCt(dr) : {};
    var contratado = {};
    ctrItensNaData(dr, null).forEach(i => {
      contratado[i.ref] = i.saldoIni;
    });
    var temAd = (dr.aditivos || []).length > 0;
    var hoje = todayStr();
    var temReaj = (dr.reajustes || []).length > 0;
    var ib = normNome(engCt.ibusca);
    var itens = dr.items.filter(i => !ib || (String(i.ref) + ' ' + String(i.desc || '')).toLowerCase().includes(ib));
    var nOps = dr.id ? engOpsDoCt(dr).length : 0;
    var tirar = i => {
      if (usados[i.ref] && !i._novo) {
        setSyncErr('O item ' + i.ref + ' é usado em ' + usados[i.ref] + ' operação(ões) — não dá para tirar. Deixe o saldo em zero se ele saiu do contrato.');
        return;
      }
      setEngCt(x => ({
        ...x,
        sujo: true,
        draft: {
          ...x.draft,
          items: x.draft.items.filter(y => y._k !== i._k)
        }
      }));
    };
    var addLinha = () => setEngCt(x => ({
      ...x,
      sujo: true,
      ibusca: '',
      draft: {
        ...x.draft,
        items: [...x.draft.items, {
          _k: uid(),
          _novo: true,
          ref: '',
          desc: '',
          unit: '',
          saldoIni: '',
          brl: '',
          usd: ''
        }]
      }
    }));
    var addLinha2 = () => {
      addLinha();
      // a linha nova entra no fim da lista: rola até ela e põe o cursor no código
      setTimeout(() => {
        var w = document.querySelector('.ec-modal .ec-itens-wrap');
        if (w) w.scrollTop = w.scrollHeight;
        var ins = document.querySelectorAll('.ec-modal .ec-itens input.ec-ref');
        if (ins.length) ins[ins.length - 1].focus();
      }, 60);
    };
    var inp = (i, k, extra) => engH("input", {
      className: 'ipt ec-in ec-' + k,
      value: k === 'ref' || k === 'desc' || k === 'unit' ? i[k] || '' : engNumTxt(i[k]),
      inputMode: k === 'ref' || k === 'desc' || k === 'unit' ? undefined : 'decimal',
      onChange: e => setItem(i._k, {
        [k]: e.target.value
      }),
      ...(extra || {})
    });
    var arquivar = () => setDr({
      archived: !dr.archived
    });
    var excluir = () => askDelete('o contrato ' + (dr.name || ''), () => {
      updateDB(d => ({
        ...d,
        contratos: (d.contratos || []).filter(c => c.id !== dr.id)
      }), {
        kind: 'Contrato',
        action: 'Exclusão',
        name: dr.name || '—',
        user: currentUser() || '—',
        detail: (dr.items || []).length + ' linha(s) PPU'
      });
      setEngCt(x => ({
        ...x,
        view: 'lista',
        draft: null,
        sujo: false
      }));
    });
    var rjs = (dr.reajustes || []).slice().sort((a, b) => String(b.desde || '').localeCompare(String(a.desde || '')));
    return engH(React.Fragment, null, engH("div", {
      className: "modal-title"
    }, engH("span", null, engH("button", {
      className: "btn-o ec-volta",
      onClick: engCtSair,
      title: "Voltar \xE0 lista de contratos"
    }, "← Contratos"), ' ', dr.id ? dr.name || 'Contrato' : 'Novo contrato'), engH("button", {
      className: "modal-close",
      onClick: fechar
    }, "\xD7")), dr.archived && engH("div", {
      className: "eng-lock",
      style: {
        marginBottom: 10
      }
    }, engH("b", null, "Arquivado"), engH("span", null, "N\xE3o aparece na Engenharia. Clique em “Desarquivar” para voltar.")), engH("div", {
      className: "hm-sec"
    }, "Dados do contrato"), engH("div", {
      className: "ec-dados"
    }, engH("div", {
      className: "fld"
    }, engH("label", {
      className: "lbl"
    }, "Cliente *"), engH("input", {
      className: "ipt ec-cli",
      list: "ec-clientes",
      value: dr.clientName || '',
      placeholder: "ex.: Petrobras",
      onChange: e => setDr({
        clientName: e.target.value
      })
    }), engH("datalist", {
      id: "ec-clientes"
    }, (db.clients || []).map(c => engH("option", {
      key: c.id,
      value: c.name
    })))), engH("div", {
      className: "fld"
    }, engH("label", {
      className: "lbl"
    }, "Nome do contrato *"), engH("input", {
      className: "ipt ec-nome",
      value: dr.name || '',
      placeholder: "ex.: P&A — Maca\xE9 (offshore)",
      onChange: e => setDr({
        name: e.target.value
      })
    })), engH("div", {
      className: "fld"
    }, engH("label", {
      className: "lbl"
    }, "N\xFAmero"), engH("input", {
      className: "ipt ec-numero",
      value: dr.numero || '',
      placeholder: "ex.: 5900.0127108.24",
      onChange: e => setDr({
        numero: e.target.value
      })
    })), engH("div", {
      className: "fld"
    }, engH("label", {
      className: "lbl"
    }, "Tipo"), engH("select", {
      className: "sel",
      value: dr.kind || 'servico',
      onChange: e => setDr({
        kind: e.target.value
      })
    }, CT_KINDS.map(k => engH("option", {
      key: k.k,
      value: k.k
    }, k.label)))), engH("div", {
      className: "fld"
    }, engH("label", {
      className: "lbl"
    }, "In\xEDcio da vig\xEAncia"), engH("input", {
      className: "ipt ec-inicio",
      type: "date",
      value: dr.inicio || '',
      onChange: e => setDr({
        inicio: e.target.value
      })
    })), engH("div", {
      className: "fld"
    }, engH("label", {
      className: "lbl"
    }, "Bases"), engH("div", {
      className: "ec-bases"
    }, RIG_BASES.map(b => engH("label", {
      key: b.b,
      className: "ec-ck"
    }, engH("input", {
      type: "checkbox",
      checked: (dr.bases || []).includes(b.b),
      onChange: e => setDr({
        bases: e.target.checked ? [...(dr.bases || []), b.b] : (dr.bases || []).filter(x => x !== b.b)
      })
    }), ' ' + b.b))))), engH("div", {
      className: "hm-sec ec-sec"
    }, 'Itens PPU (' + dr.items.length + ')'), engH("div", {
      className: "ec-bar"
    }, engH("input", {
      className: "ipt",
      style: {
        maxWidth: 240
      },
      placeholder: "Buscar item ou descri\xE7\xE3o…",
      value: engCt.ibusca || '',
      onChange: e => {
        var v = e.target.value;
        setEngCt(x => ({
          ...x,
          ibusca: v
        }));
      }
    }), engH("span", {
      style: {
        flex: 1
      }
    }), engH("button", {
      className: "btn-o",
      onClick: addLinha2
    }, "＋ Linha"), engH("button", {
      className: "btn-o ec-carregar",
      onClick: () => engCarregar('itens'),
      title: "Excel ou CSV com as colunas Item, Descri\xE7\xE3o, Unidade, Saldo, Valor R$ e Valor US$"
    }, "⬆ Carregar planilha"), engH("button", {
      className: "btn-o",
      onClick: () => engCtPlanilha(dr),
      title: "Baixa a lista atual em Excel — serve de modelo para carregar"
    }, dr.items.length ? '⬇ Baixar planilha' : '⬇ Modelo da planilha')), engH("div", {
      className: "eng-help",
      style: {
        marginTop: 2
      }
    }, "Valores unit\xE1rios iniciais (antes de qualquer reajuste). Use v\xEDrgula para os decimais.", temAd ? ' Os aditivos do contrato somam saldo — a coluna “Contratado” já mostra o total.' : ''), engH("div", {
      className: "tbl-scroll ec-itens-wrap"
    }, engH("table", {
      className: "db-table ec-itens"
    }, engH("thead", null, engH("tr", null, engH("th", null, "Item"), engH("th", null, "Descri\xE7\xE3o"), engH("th", null, "Unid."), engH("th", null, "Saldo"), engH("th", null, "Valor R$"), engH("th", null, "Valor US$"), temAd && engH("th", null, "Contratado"), engH("th", null, "Consumido"), engH("th", null, "Dispon\xEDvel"), temReaj && engH("th", null, "Vigente hoje"), engH("th", null))), engH("tbody", null, itens.map(i => {
      var c = cons[i.ref] || 0;
      var tot = temAd ? contratado[i.ref] : engNum(i.saldoIni);
      var disp = tot != null ? tot - c : null;
      var pv = temReaj ? ctPreco(dr, i.ref, hoje) : null;
      return engH("tr", {
        key: i._k
      }, engH("td", null, inp(i, 'ref', {
        readOnly: !i._novo && !!usados[i.ref],
        title: !i._novo && usados[i.ref] ? 'Usado em operações — o código não muda' : undefined
      })), engH("td", null, inp(i, 'desc')), engH("td", null, inp(i, 'unit')), engH("td", null, inp(i, 'saldoIni')), engH("td", null, inp(i, 'brl')), engH("td", null, inp(i, 'usd')), temAd && engH("td", {
        className: "ec-num"
      }, hoNum(tot)), engH("td", {
        className: "ec-num"
      }, c ? fmtNum(c) : '—'), engH("td", {
        className: 'ec-num' + (disp != null && disp < 0 ? ' ec-neg' : '')
      }, disp == null ? '—' : fmtNum(disp)), temReaj && engH("td", {
        className: "ec-num ec-vig"
      }, fmtPBRL(pv.brl), engH("br", null), fmtPUSD(pv.usd)), engH("td", null, engH("button", {
        className: "btn-o hm-x",
        title: "Tirar a linha",
        onClick: () => tirar(i)
      }, "\xD7")));
    }), !dr.items.length && engH("tr", null, engH("td", {
      colSpan: 11,
      style: {
        color: 'var(--ink-3)',
        fontStyle: 'italic'
      }
    }, "Nenhum item ainda — use “⬆ Carregar planilha” ou “＋ Linha”."))))), engH("div", {
      className: "hm-sec ec-sec"
    }, 'Reajustes (' + rjs.length + ')'), engH("div", {
      className: "eng-help",
      style: {
        marginTop: 0
      }
    }, "Um reajuste muda os valores a partir de uma data. Opera\xE7\xF5es com servi\xE7o antes dessa data continuam com o valor anterior."), engH("div", {
      className: "ec-reajs"
    }, rjs.map(r => engH("div", {
      key: r.id,
      className: "ec-reaj"
    }, engH("b", null, 'A partir de ' + fmtD(r.desde)), engH("span", null, Object.keys(r.precos || {}).length + ' item(ns)' + (r.obs ? ' · ' + r.obs : '') + (r.por ? ' · ' + r.por : '')), engH("span", {
      style: {
        flex: 1
      }
    }), engH("button", {
      className: "btn-o",
      onClick: () => setEngCt(x => ({
        ...x,
        reaj: {
          ...JSON.parse(JSON.stringify(r)),
          pctBrl: '',
          pctUsd: ''
        }
      }))
    }, "Abrir"), engH("button", {
      className: "btn-o hm-x",
      title: "Apagar o reajuste",
      onClick: () => askConfirm({
        title: 'Apagar reajuste',
        okLabel: 'Apagar',
        danger: true,
        msg: engH("span", null, 'Apagar o reajuste de ', engH("b", null, fmtD(r.desde)), '?'),
        hint: 'As operações a partir dessa data voltam a usar o valor anterior. O contrato é salvo na hora.',
        onOk: () => engCtSalvar({
          ...engCt.draft,
          reajustes: (engCt.draft.reajustes || []).filter(x => x.id !== r.id)
        }, 'Reajuste apagado ✓')
      })
    }, "\xD7"))), !rjs.length && engH("div", {
      className: "ec-vazio"
    }, "Nenhum reajuste."), engH("button", {
      className: "btn-o ec-novo-reaj",
      disabled: !dr.items.length,
      onClick: () => setEngCt(x => ({
        ...x,
        reaj: {
          id: '',
          desde: '',
          obs: '',
          precos: {},
          pctBrl: '',
          pctUsd: ''
        }
      }))
    }, "＋ Novo reajuste")), engH("div", {
      className: "ec-foot"
    }, falta.length > 0 && engH("span", {
      className: "ho-pend"
    }, 'Para salvar, falta: ' + falta.join(' · ')), engCt.sujo && !falta.length && engH("span", {
      className: "ec-sujo"
    }, "Altera\xE7\xF5es n\xE3o salvas"), engH("span", {
      style: {
        flex: 1
      }
    }), dr.id && !nOps && engH("button", {
      className: "btn-o",
      onClick: excluir
    }, "Excluir"), dr.id && engH("button", {
      className: "btn-o",
      onClick: arquivar
    }, dr.archived ? 'Desarquivar' : 'Arquivar'), engH("button", {
      className: "btn-r ec-salvar",
      disabled: falta.length > 0,
      onClick: () => engCtSalvar(engCt.draft)
    }, "Salvar contrato")));
  };

  /* ---------------- reajuste ---------------- */
  var renderEngReaj = () => {
    var r = engCt.reaj;
    var dr = engCt.draft;
    var setR = patch => setEngCt(x => ({
      ...x,
      reaj: {
        ...x.reaj,
        ...patch
      }
    }));
    var setP = (ref, k, v) => setEngCt(x => ({
      ...x,
      reaj: {
        ...x.reaj,
        precos: {
          ...x.reaj.precos,
          [ref]: {
            ...(x.reaj.precos[ref] || {}),
            [k]: v
          }
        }
      }
    }));
    var semEste = {
      ...dr,
      reajustes: (dr.reajustes || []).filter(x => x.id !== r.id || !r.id)
    };
    var dataRef = r.desde || todayStr();
    var atual = ref => ctPreco(semEste, ref, dataRef);
    var aplicarPct = () => {
      var pb = engNum(r.pctBrl),
        pu = engNum(r.pctUsd);
      var pr = {
        ...r.precos
      };
      dr.items.forEach(i => {
        var a = atual(i.ref);
        var o = {
          ...(pr[i.ref] || {})
        };
        if (pb != null && a.brl != null) o.brl = engNumTxt(engR4(a.brl * (1 + pb / 100)));
        if (pu != null && a.usd != null) o.usd = engNumTxt(engR4(a.usd * (1 + pu / 100)));
        pr[i.ref] = o;
      });
      setR({
        precos: pr
      });
    };
    var linhas = dr.items.filter(i => String(i.ref || '').trim());
    var preench = linhas.filter(i => {
      var x = r.precos[i.ref] || {};
      return engNum(x.brl) != null || engNum(x.usd) != null;
    });
    var dup = r.desde && (dr.reajustes || []).some(x => x.desde === r.desde && x.id !== r.id);
    var afet = r.desde ? engOpsDoCt(dr).filter(j => j.ppuCons && (j.ppuCons.data || j.date) >= r.desde).length : 0;
    var falta = [];
    if (!r.desde) falta.push('a data a partir da qual vale');
    if (dup) falta.push('outra data (já existe reajuste nesta)');
    if (!preench.length) falta.push('ao menos um valor novo');
    var confirmar = () => {
      if (falta.length) return;
      var precos = {};
      preench.forEach(i => {
        var x = r.precos[i.ref] || {};
        var o = {};
        if (engNum(x.brl) != null) o.brl = engNum(x.brl);
        if (engNum(x.usd) != null) o.usd = engNum(x.usd);
        precos[i.ref] = o;
      });
      var reg = {
        id: r.id || uid(),
        desde: r.desde,
        obs: String(r.obs || '').trim(),
        precos,
        em: new Date().toISOString(),
        por: currentUser() || ''
      };
      var lista = [...(dr.reajustes || []).filter(x => x.id !== reg.id), reg];
      if (!engCtSalvar({
        ...dr,
        reajustes: lista
      }, 'Reajuste salvo ✓ — vale a partir de ' + fmtD(reg.desde))) setSyncErr('Antes do reajuste, complete o contrato: ' + engCtFalta(dr).join(' · '));
    };
    return engH("div", {
      className: "overlay",
      style: {
        zIndex: 255
      },
      onClick: e => {
        if (e.target === e.currentTarget) setEngCt(x => ({
          ...x,
          reaj: null
        }));
      }
    }, engH("div", {
      className: "modal ec-modal ec-reaj-modal",
      onClick: e => e.stopPropagation()
    }, engH("div", {
      className: "modal-title"
    }, engH("span", null, r.id ? 'Reajuste de ' + fmtD(r.desde) : 'Novo reajuste — ' + (dr.name || 'contrato')), engH("button", {
      className: "modal-close",
      onClick: () => setEngCt(x => ({
        ...x,
        reaj: null
      }))
    }, "\xD7")), engH("div", {
      className: "ec-dados"
    }, engH("div", {
      className: "fld"
    }, engH("label", {
      className: "lbl"
    }, "Vale a partir de *"), engH("input", {
      className: "ipt ec-desde",
      type: "date",
      value: r.desde || '',
      onChange: e => setR({
        desde: e.target.value
      })
    })), engH("div", {
      className: "fld",
      style: {
        gridColumn: 'span 2'
      }
    }, engH("label", {
      className: "lbl"
    }, "Observa\xE7\xE3o"), engH("input", {
      className: "ipt ec-obs",
      value: r.obs || '',
      placeholder: "ex.: reajuste anual IPCA 2026",
      onChange: e => setR({
        obs: e.target.value
      })
    }))), engH("div", {
      className: "ec-bar ec-pct"
    }, engH("span", null, "Aplicar a todas as linhas:"), engH("input", {
      className: "ipt ec-pct-brl",
      inputMode: "decimal",
      placeholder: "% R$",
      value: r.pctBrl || '',
      onChange: e => setR({
        pctBrl: e.target.value
      })
    }), engH("input", {
      className: "ipt ec-pct-usd",
      inputMode: "decimal",
      placeholder: "% US$",
      value: r.pctUsd || '',
      onChange: e => setR({
        pctUsd: e.target.value
      })
    }), engH("button", {
      className: "btn-o",
      disabled: engNum(r.pctBrl) == null && engNum(r.pctUsd) == null,
      onClick: aplicarPct
    }, "Aplicar %"), engH("span", {
      style: {
        flex: 1
      }
    }), engH("button", {
      className: "btn-o",
      onClick: () => engCarregar('reaj'),
      title: "Planilha com Item e os valores novos em R$ e/ou US$"
    }, "⬆ Carregar valores da planilha")), engH("div", {
      className: "eng-help",
      style: {
        marginTop: 2
      }
    }, "“Atual” \xE9 o valor vigente na data escolhida, antes deste reajuste. Deixe em branco o que n\xE3o muda."), engH("div", {
      className: "tbl-scroll ec-itens-wrap"
    }, engH("table", {
      className: "db-table ec-itens"
    }, engH("thead", null, engH("tr", null, ['Item', 'Descrição', 'Unid.', 'Atual R$', 'Novo R$', 'Atual US$', 'Novo US$', 'Variação'].map((h, k) => engH("th", {
      key: k
    }, h)))), engH("tbody", null, linhas.map(i => {
      var a = atual(i.ref);
      var x = r.precos[i.ref] || {};
      var nb = engNum(x.brl),
        nu = engNum(x.usd);
      var vb = nb != null && a.brl ? (nb / a.brl - 1) * 100 : null;
      var vu = nu != null && a.usd ? (nu / a.usd - 1) * 100 : null;
      return engH("tr", {
        key: i._k || i.ref
      }, engH("td", null, i.ref), engH("td", {
        className: "ec-desc"
      }, i.desc), engH("td", null, i.unit), engH("td", {
        className: "ec-num"
      }, fmtPBRL(a.brl)), engH("td", null, engH("input", {
        className: "ipt ec-in ec-nbrl",
        inputMode: "decimal",
        value: engNumTxt(x.brl),
        onChange: e => setP(i.ref, 'brl', e.target.value)
      })), engH("td", {
        className: "ec-num"
      }, fmtPUSD(a.usd)), engH("td", null, engH("input", {
        className: "ipt ec-in ec-nusd",
        inputMode: "decimal",
        value: engNumTxt(x.usd),
        onChange: e => setP(i.ref, 'usd', e.target.value)
      })), engH("td", {
        className: "ec-num"
      }, [vb != null ? 'R$ ' + (vb >= 0 ? '+' : '') + fmtNum(vb) + '%' : '', vu != null ? 'US$ ' + (vu >= 0 ? '+' : '') + fmtNum(vu) + '%' : ''].filter(Boolean).join(' · ') || '—'));
    })))), afet > 0 && engH("div", {
      className: "ec-aviso"
    }, afet + ' operação(ões) com consumo lançado a partir desta data passam a usar os valores novos na receita.'), engH("div", {
      className: "ec-foot"
    }, falta.length > 0 && engH("span", {
      className: "ho-pend"
    }, 'Para salvar, falta: ' + falta.join(' · ')), engH("span", {
      style: {
        flex: 1
      }
    }), engH("button", {
      className: "btn-o",
      onClick: () => setEngCt(x => ({
        ...x,
        reaj: null
      }))
    }, "Cancelar"), engH("button", {
      className: "btn-r ec-reaj-ok",
      disabled: falta.length > 0,
      onClick: confirmar
    }, preench.length ? 'Salvar reajuste (' + preench.length + ' item(ns))' : 'Salvar reajuste'))));
  };

  /* ---------------- importação da planilha ---------------- */
  var renderEngImp = () => {
    var im = engCt.imp;
    var dr = engCt.draft;
    var fecharImp = () => setEngCt(x => ({
      ...x,
      imp: null
    }));
    if (!dr) return null;
    var existe = {};
    dr.items.forEach(i => {
      existe[String(i.ref).trim()] = i;
    });
    var lin = im.linhas || [];
    var novas = lin.filter(l => !existe[l.ref]);
    var atual = lin.filter(l => existe[l.ref]);
    var usados = engRefsUsados(dr);
    var ficam = im.modo === 'substituir' ? dr.items.filter(i => usados[i.ref] && !lin.some(l => l.ref === i.ref)) : [];
    var aplicar = () => {
      if (im.destino === 'reaj') {
        var pr = {
          ...engCt.reaj.precos
        };
        atual.forEach(l => {
          var o = {
            ...(pr[l.ref] || {})
          };
          if (l.brl != null) o.brl = engNumTxt(l.brl);
          if (l.usd != null) o.usd = engNumTxt(l.usd);
          pr[l.ref] = o;
        });
        setEngCt(x => ({
          ...x,
          imp: null,
          reaj: {
            ...x.reaj,
            precos: pr
          }
        }));
        return;
      }
      var mesclar = (i, l) => ({
        ...i,
        desc: l.desc || i.desc,
        unit: l.unit || i.unit,
        saldoIni: l.saldo != null ? l.saldo : i.saldoIni,
        brl: l.brl != null ? l.brl : i.brl,
        usd: l.usd != null ? l.usd : i.usd
      });
      var nova = l => ({
        _k: uid(),
        _novo: true,
        ref: l.ref,
        desc: l.desc,
        unit: l.unit,
        saldoIni: l.saldo,
        brl: l.brl,
        usd: l.usd
      });
      var vistos = new Set();
      var lin1 = lin.filter(l => !vistos.has(l.ref) && vistos.add(l.ref));
      var items;
      if (im.modo === 'substituir') items = [...lin1.map(l => existe[l.ref] ? mesclar({
        ...existe[l.ref],
        desc: '',
        unit: '',
        saldoIni: '',
        brl: '',
        usd: ''
      }, l) : nova(l)), ...ficam];else items = [...dr.items.map(i => {
        var l = lin1.find(x => x.ref === String(i.ref).trim());
        return l ? mesclar(i, l) : i;
      }), ...lin1.filter(l => !existe[l.ref]).map(nova)];
      setEngCt(x => ({
        ...x,
        imp: null,
        sujo: true,
        draft: {
          ...x.draft,
          items
        }
      }));
      setOkMsg('Planilha carregada ✓ — confira e clique em “Salvar contrato”');
      setTimeout(() => setOkMsg(''), 5000);
    };
    var cont = k => lin.filter(l => l[k] != null).length;
    return engH("div", {
      className: "overlay",
      style: {
        zIndex: 260
      },
      onClick: e => {
        if (e.target === e.currentTarget) fecharImp();
      }
    }, engH("div", {
      className: "modal",
      style: {
        width: 560,
        maxWidth: '95vw'
      },
      onClick: e => e.stopPropagation()
    }, engH("div", {
      className: "modal-title"
    }, engH("span", null, "Carregar planilha"), engH("button", {
      className: "modal-close",
      onClick: fecharImp
    }, "\xD7")), engH("div", {
      className: "hm-sum"
    }, engH("div", {
      className: "hm-k"
    }, "Arquivo"), engH("div", {
      className: "hm-arq"
    }, im.nome), engH("div", {
      className: "hm-k"
    }, "Linhas"), engH("div", {
      className: "ec-imp-n"
    }, lin.length + ' item(ns) lido(s)' + (im.cabecalho ? '' : ' (sem cabeçalho reconhecido: colunas na ordem Item, Descrição, Unidade, Saldo, R$, US$)'))), lin.length > 0 && engH("div", {
      className: "hm-chips"
    }, engH("span", null, engH("b", null, cont('saldo')), ' com saldo'), engH("span", null, engH("b", null, cont('brl')), ' com valor R$'), engH("span", null, engH("b", null, cont('usd')), ' com valor US$')), im.destino === 'reaj' ? engH("div", {
      className: "ec-imp-res"
    }, engH("b", null, atual.length), ' item(ns) do contrato recebem os valores novos', novas.length ? ' · ' + novas.length + ' item(ns) da planilha não estão no contrato e ficam de fora' : '', '.') : engH(React.Fragment, null, engH("div", {
      className: "ec-imp-modos"
    }, engH("label", {
      className: "ec-ck"
    }, engH("input", {
      type: "radio",
      name: "ec-modo",
      checked: im.modo !== 'substituir',
      onChange: () => setEngCt(x => ({
        ...x,
        imp: {
          ...x.imp,
          modo: 'mesclar'
        }
      }))
    }), engH("span", null, engH("b", null, " Atualizar e acrescentar"), " — atualiza os itens que j\xE1 existem e inclui os novos; o resto fica como est\xE1")), engH("label", {
      className: "ec-ck"
    }, engH("input", {
      type: "radio",
      name: "ec-modo",
      checked: im.modo === 'substituir',
      onChange: () => setEngCt(x => ({
        ...x,
        imp: {
          ...x.imp,
          modo: 'substituir'
        }
      }))
    }), engH("span", null, engH("b", null, " Substituir a lista"), " — a lista do contrato passa a ser a da planilha"))), engH("div", {
      className: "ec-imp-res"
    }, engH("b", null, novas.length), ' novo(s) · ', engH("b", null, atual.length), ' atualizado(s)', im.modo === 'substituir' && dr.items.length - atual.length - ficam.length > 0 ? ' · ' + (dr.items.length - atual.length - ficam.length) + ' saem' : '', ficam.length ? ' · ' + ficam.length + ' ficam porque são usados em operações' : '')), engH("div", {
      className: "ec-foot"
    }, engH("span", {
      style: {
        flex: 1
      }
    }), engH("button", {
      className: "btn-o",
      onClick: fecharImp
    }, "Cancelar"), engH("button", {
      className: "btn-r ec-imp-ok",
      disabled: !lin.length || im.destino === 'reaj' && !atual.length,
      onClick: aplicar
    }, im.destino === 'reaj' ? 'Usar os valores' : 'Carregar'))));
  };

  /* ---------------- consumo da operação: PPU (receita), químicas, casing equipment e pessoal ----------------
     ppuCons = {data, linhas[{ref, desc, unit, qty}] (PPU), quim[{sap, name, unit, qty}], cas[{sap, name, unit, qty}],
     pes[{funcao, pessoas, dias, hd}], em, por}. O nome ppuCons ficou da e2 (só PPU) para não mudar o formato. */
  var engKeyMat = n => String(n && (n.sap || n.name) || '').trim();
  var engPrevMat = lista => {
    var o = {};
    (lista || []).forEach(n => {
      var k = engKeyMat(n);
      if (k) o[k] = (o[k] || 0) + (engNum(n.qty) || 0);
    });
    return o;
  };
  var engUniq = (l, k) => {
    var s = new Set();
    return (l || []).filter(x => {
      var v = k(x);
      if (!v || s.has(v)) return false;
      s.add(v);
      return true;
    });
  };
  var abrirEngCons = pj0 => {
    if (!pj0) return;
    var pj = (db.plannedJobs || []).find(j => j.id === pj0.id) || pj0;
    var c = pj.ppuCons || {};
    var linhas = (c.linhas || []).length ? engUniq(c.linhas, l => l.ref).map(l => ({
      ref: l.ref,
      qty: engNumTxt(l.qty)
    })) : engUniq(pj.ppuNeeds, n => n.ref).map(n => ({
      ref: n.ref,
      qty: ''
    }));
    var mat = (salvo, prev) => (salvo || []).length ? engUniq(salvo, engKeyMat).map(x => ({
      sap: x.sap || '',
      name: x.name || '',
      unit: x.unit || '',
      qty: engNumTxt(x.qty)
    })) : engUniq(prev, engKeyMat).map(x => ({
      sap: x.sap || '',
      name: x.name || x.sap || '',
      unit: x.unit || '',
      qty: ''
    }));
    var pes = (c.pes || []).length ? c.pes.map(p => ({
      funcao: p.funcao,
      pessoas: engNumTxt(p.pessoas),
      dias: engNumTxt(p.dias)
    })) : engUniq(pj.peopleNeeds, n => n.funcao).map(n => ({
      funcao: n.funcao,
      pessoas: '',
      dias: ''
    }));
    setEngCons({
      pjId: pj.id,
      data: c.data || pj.date || todayStr(),
      linhas,
      quim: mat(c.quim, pj.chems),
      cas: mat(c.cas, pj.casingNeeds),
      pes
    });
  };
  var renderEngCons = () => {
    if (!engCons) return null;
    var pj = (db.plannedJobs || []).find(j => j.id === engCons.pjId);
    if (!pj) return null;
    var ct = ctDoJob(pj);
    var rig = (db.rigs || []).find(r => r.id === pj.rigId) || {};
    var data = engCons.data || pj.date;
    var itens = ct ? ctrItensNaData(ct, data) : [];
    var byRef = {};
    itens.forEach(i => {
      byRef[i.ref] = i;
    });
    var prev = {};
    (pj.ppuNeeds || []).forEach(n => {
      if (n.ref) prev[n.ref] = (prev[n.ref] || 0) + (engNum(n.qty) || 0);
    });
    var prevQ = engPrevMat(pj.chems),
      prevC = engPrevMat(pj.casingNeeds);
    var prevP = {};
    (pj.peopleNeeds || []).forEach(n => {
      if (n.funcao) prevP[n.funcao] = (prevP[n.funcao] || 0) + (engNum(n.qty) || 0);
    });
    var dur = Number(pj.durationDays) || 1;
    var outros = ct ? engConsDoCt(ct, pj.id) : {};
    var cIdx = engCogsIdx();
    var setQ = (ref, v) => setEngCons(x => ({
      ...x,
      linhas: x.linhas.map(l => l.ref === ref ? {
        ...l,
        qty: v
      } : l)
    }));
    var setM = (campo, k, v) => setEngCons(x => ({
      ...x,
      [campo]: x[campo].map(m => engKeyMat(m) === k ? {
        ...m,
        qty: v
      } : m)
    }));
    var setPe = (f, patch) => setEngCons(x => ({
      ...x,
      pes: x.pes.map(p => p.funcao === f ? {
        ...p,
        ...patch
      } : p)
    }));
    var rows = engCons.linhas.map(l => {
      var it = byRef[l.ref] || (ct && (ct.items || []).find(i => i.ref === l.ref)) || {
        ref: l.ref
      };
      var q = engNum(l.qty);
      var p = ct ? ctPreco(ct, l.ref, data) : {};
      var contr = it.saldoIni != null && it.saldoIni !== '' ? Number(it.saldoIni) : null;
      var disp = contr != null ? contr - (outros[l.ref] || 0) : null;
      return {
        l,
        it,
        q,
        p,
        disp,
        vB: q != null && p.brl != null ? q * p.brl : null,
        vU: q != null && p.usd != null ? q * p.usd : null
      };
    });
    var tB = rows.reduce((a, r) => a + (r.vB || 0), 0),
      tU = rows.reduce((a, r) => a + (r.vU || 0), 0);
    var acima = rows.filter(r => r.q > 0 && r.disp != null && r.q > r.disp + 1e-9);
    var semPreco = rows.filter(r => r.q > 0 && r.p.brl == null && r.p.usd == null);
    var nQ = rows.filter(r => r.q > 0).length;
    var nMq = engCons.quim.filter(m => engNum(m.qty) > 0).length,
      nMc = engCons.cas.filter(m => engNum(m.qty) > 0).length;
    var pesRows = engCons.pes.map(p => {
      var n = engNum(p.pessoas),
        d = engNum(p.dias);
      return {
        p,
        n,
        d,
        hd: n > 0 && d > 0 ? n * d : null
      };
    });
    var tHD = pesRows.reduce((a, r) => a + (r.hd || 0), 0);
    var nPe = pesRows.filter(r => r.n > 0).length;
    var nTot = nQ + nMq + nMc + nPe;
    var temPrev = Object.keys(prev).length || Object.keys(prevQ).length || Object.keys(prevC).length || Object.keys(prevP).length;
    var add = ref => {
      if (!ref) return;
      setEngCons(x => ({
        ...x,
        linhas: [...x.linhas, {
          ref,
          qty: ''
        }]
      }));
    };
    var addMat = (campo, it) => {
      if (!it) return;
      setEngCons(x => x[campo].some(m => engKeyMat(m) === engKeyMat(it)) ? x : {
        ...x,
        [campo]: [...x[campo], {
          sap: it.sap || '',
          name: it.name || it.sap || '',
          unit: it.unit || '',
          qty: ''
        }]
      });
    };
    var addPe = f => {
      if (!f) return;
      setEngCons(x => x.pes.some(p => p.funcao === f) ? x : {
        ...x,
        pes: [...x.pes, {
          funcao: f,
          pessoas: '',
          dias: ''
        }]
      });
    };
    var copiar = () => setEngCons(x => ({
      ...x,
      linhas: x.linhas.map(l => engNum(l.qty) == null && prev[l.ref] ? {
        ...l,
        qty: engNumTxt(prev[l.ref])
      } : l),
      quim: x.quim.map(m => engNum(m.qty) == null && prevQ[engKeyMat(m)] ? {
        ...m,
        qty: engNumTxt(prevQ[engKeyMat(m)])
      } : m),
      cas: x.cas.map(m => engNum(m.qty) == null && prevC[engKeyMat(m)] ? {
        ...m,
        qty: engNumTxt(prevC[engKeyMat(m)])
      } : m),
      pes: x.pes.map(p => ({
        ...p,
        pessoas: engNum(p.pessoas) == null && prevP[p.funcao] ? engNumTxt(prevP[p.funcao]) : p.pessoas,
        dias: engNum(p.dias) == null ? engNumTxt(dur) : p.dias
      }))
    }));
    var fechar = () => setEngCons(null);
    var resumo = reg => [reg.linhas.length + ' item(ns) PPU', fmtBRL(tB), fmtUSD(tU), reg.quim.length ? reg.quim.length + ' química(s)' : '', reg.cas.length ? reg.cas.length + ' casing' : '', reg.pes.length ? fmtNum(tHD) + ' homem-dia' : '', 'serviço em ' + fmtD(reg.data)].filter(Boolean).join(' · ');
    var gravar = reg => {
      updateDB(d => ({
        ...d,
        plannedJobs: comLog((d.plannedJobs || []).map(j => j.id === pj.id ? {
          ...j,
          ppuCons: reg
        } : j), [pj.id], logE(reg ? pj.ppuCons ? 'Consumo da operação alterado' : 'Consumo da operação lançado' : 'Consumo da operação apagado', {
          detalhe: reg ? resumo(reg) : ''
        }))
      }), {
        kind: 'Consumo',
        action: reg ? pj.ppuCons ? 'Alteração' : 'Inclusão' : 'Exclusão',
        name: (rig.name || '—') + ' — ' + (pj.well || tipoTxt(pj) || ''),
        user: currentUser() || '—',
        detail: reg ? resumo(reg) : ''
      });
      setPlanDraft(x => x && x.id === pj.id ? {
        ...x,
        ppuCons: reg
      } : x);
      setEngCons(null);
      setOkMsg(reg ? 'Consumo salvo ✓ — ' + fmtBRL(tB) + ' · ' + fmtUSD(tU) : 'Consumo apagado ✓');
      setTimeout(() => setOkMsg(''), 4000);
    };
    var salvar = () => {
      var linhas = rows.filter(r => r.q > 0).map(r => ({
        ref: r.l.ref,
        desc: r.it.desc || '',
        unit: r.it.unit || '',
        qty: r.q
      }));
      var mats = campo => engCons[campo].filter(m => engNum(m.qty) > 0).map(m => ({
        sap: m.sap || '',
        name: m.name || '',
        unit: m.unit || '',
        qty: engNum(m.qty)
      }));
      var pes = pesRows.filter(r => r.n > 0).map(r => ({
        funcao: r.p.funcao,
        pessoas: r.n,
        dias: r.d || 0,
        hd: r.hd || 0
      }));
      var reg = {
        data,
        linhas,
        quim: mats('quim'),
        cas: mats('cas'),
        pes,
        em: new Date().toISOString(),
        por: currentUser() || ''
      };
      gravar(linhas.length || reg.quim.length || reg.cas.length || pes.length ? reg : null);
    };
    var disponiveis = itens.filter(i => !engCons.linhas.some(l => l.ref === i.ref));
    var semLinhas = (n, txt) => engH("tr", null, engH("td", {
      colSpan: n,
      style: {
        color: 'var(--ink-3)',
        fontStyle: 'italic'
      }
    }, txt));
    var secMat = (num, titulo, campo, prevM, catalogo) => {
      var lista = engCons[campo];
      var livres = catalogo.filter(i => !lista.some(m => engKeyMat(m) === engKeyMat(i)));
      return engH(React.Fragment, null, engH("div", {
        className: "hm-sec ec-sec"
      }, num + ' · ' + titulo + ' (' + lista.length + ')'), engH("div", {
        className: "tbl-scroll ec-mat-wrap"
      }, engH("table", {
        className: 'db-table ec-itens ec-mat ec-mat-' + campo
      }, engH("thead", null, engH("tr", null, ['SAP', 'Produto', 'Unid.', 'Previsto', 'Consumido', 'COGS unit.', 'COGS total', ''].map((h, k) => engH("th", {
        key: k
      }, h)))), engH("tbody", null, lista.map(m => {
        var k = engKeyMat(m);
        return engH("tr", {
          key: k
        }, engH("td", null, m.sap || '—'), engH("td", {
          className: "ec-desc"
        }, m.name || '—'), engH("td", null, m.unit || ''), engH("td", {
          className: "ec-num"
        }, prevM[k] != null ? fmtNum(prevM[k]) : '—'), engH("td", null, engH("input", {
          className: 'ipt ec-in ec-qtd ec-q-' + campo,
          inputMode: "decimal",
          value: m.qty || '',
          placeholder: "0",
          onChange: e => setM(campo, k, e.target.value)
        })), (() => {
          var c = engCogsDe(cIdx, m);
          var cu = c ? engNum(c.usd) : null,
            cb = c ? engNum(c.brl) : null,
            q = engNum(m.qty) || 0;
          return [engH("td", {
            key: 'cu',
            className: "ec-num"
          }, cu != null ? fmtPUSD(cu) : cb != null ? fmtPBRL(cb) : '—'), engH("td", {
            key: 'ct',
            className: "ec-num"
          }, cu != null ? fmtUSD(q * cu) : cb != null ? fmtBRL(q * cb) : '—')];
        })(), engH("td", null, engH("button", {
          className: "btn-o hm-x",
          title: "Tirar a linha",
          onClick: () => setEngCons(x => ({
            ...x,
            [campo]: x[campo].filter(y => engKeyMat(y) !== k)
          }))
        }, "\xD7")));
      }), !lista.length && semLinhas(8, 'Nada previsto — acrescente abaixo o que foi usado.')))), engH("select", {
        className: 'sel ec-add ec-add-' + campo,
        value: "",
        onChange: e => addMat(campo, catalogo.find(i => engKeyMat(i) === e.target.value))
      }, engH("option", {
        value: ""
      }, '＋ Acrescentar ' + (campo === 'quim' ? 'química' : 'item de casing') + ' do cadastro…'), livres.map(i => engH("option", {
        key: engKeyMat(i),
        value: engKeyMat(i)
      }, (i.sap ? i.sap + ' — ' : '') + String(i.name || '').slice(0, 80) + (i.unit ? ' (' + i.unit + ')' : '')))));
    };
    var funcoesLivres = [...FUNCOES_EQUIPE, ...Object.keys(prevP)].filter((f, i, a) => a.indexOf(f) === i && !engCons.pes.some(p => p.funcao === f));
    return engH("div", {
      className: "overlay",
      style: {
        zIndex: 275
      },
      onClick: e => {
        if (e.target === e.currentTarget) fechar();
      }
    }, engH("div", {
      className: "modal ec-modal ec-cons-modal",
      onClick: e => e.stopPropagation()
    }, engH("div", {
      className: "modal-title"
    }, engH("span", null, 'Σ Consumo da operação — ' + (pj.well || 'poço a definir') + ' · ' + (tipoTxt(pj) || pj.tipoOp || '')), engH("button", {
      className: "modal-close",
      onClick: fechar
    }, "\xD7")), engH("div", {
      className: "ec-cons-id"
    }, [rig.name, pj.date ? 'planejada para ' + fmtD(pj.date) : '', ct ? ct.name + (ct.numero && ct.numero !== ct.name ? ' · ' + ct.numero : '') : '', pj.salesOrder ? 'SO ' + pj.salesOrder : ''].filter(Boolean).join(' · ')), !ct ? engH("div", {
      className: "ec-aviso"
    }, "Esta opera\xE7\xE3o n\xE3o est\xE1 ligada a um contrato — abra a opera\xE7\xE3o e escolha o contrato.") : engH(React.Fragment, null, engH("div", {
      className: "ec-bar"
    }, engH("div", {
      className: "fld",
      style: {
        margin: 0
      }
    }, engH("label", {
      className: "lbl"
    }, "Data do servi\xE7o *"), engH("input", {
      className: "ipt ec-cons-data",
      type: "date",
      value: engCons.data || '',
      onChange: e => {
        var v = e.target.value;
        setEngCons(x => ({
          ...x,
          data: v
        }));
      }
    })), engH("div", {
      className: "eng-help",
      style: {
        margin: '18px 0 0',
        flex: 1,
        minWidth: 220
      }
    }, "Os valores dos itens PPU s\xE3o os vigentes nesta data (com os reajustes). Lance tamb\xE9m as qu\xEDmicas, o casing equipment e o pessoal usados."), engH("button", {
      className: "btn-o ec-copiar",
      style: {
        alignSelf: 'flex-end'
      },
      disabled: !temPrev,
      onClick: copiar
    }, "⇩ Copiar previsto")), engH("div", {
      className: "hm-sec ec-sec"
    }, '1 · Itens PPU — receita (' + rows.length + ')'), engH("div", {
      className: "tbl-scroll ec-itens-wrap"
    }, engH("table", {
      className: "db-table ec-itens ec-cons"
    }, engH("thead", null, engH("tr", null, ['Item', 'Descrição', 'Unid.', 'Previsto', 'Consumido', 'Disponível', 'Valor R$', 'Valor US$', 'Total R$', 'Total US$', ''].map((h, k) => engH("th", {
      key: k
    }, h)))), engH("tbody", null, rows.map(r => engH("tr", {
      key: r.l.ref,
      className: r.q > 0 && r.disp != null && r.q > r.disp + 1e-9 ? 'ec-tr-neg' : undefined
    }, engH("td", null, r.l.ref), engH("td", {
      className: "ec-desc"
    }, r.it.desc || '—'), engH("td", null, r.it.unit || ''), engH("td", {
      className: "ec-num"
    }, prev[r.l.ref] != null ? fmtNum(prev[r.l.ref]) : '—'), engH("td", null, engH("input", {
      className: "ipt ec-in ec-qtd",
      inputMode: "decimal",
      value: r.l.qty || '',
      placeholder: "0",
      onChange: e => setQ(r.l.ref, e.target.value)
    })), engH("td", {
      className: 'ec-num' + (r.disp != null && r.disp - (r.q || 0) < 0 ? ' ec-neg' : '')
    }, r.disp == null ? '—' : fmtNum(r.disp)), engH("td", {
      className: "ec-num"
    }, fmtPBRL(r.p.brl)), engH("td", {
      className: "ec-num"
    }, fmtPUSD(r.p.usd)), engH("td", {
      className: "ec-num"
    }, r.vB == null ? '—' : fmtBRL(r.vB)), engH("td", {
      className: "ec-num"
    }, r.vU == null ? '—' : fmtUSD(r.vU)), engH("td", null, engH("button", {
      className: "btn-o hm-x",
      title: "Tirar a linha",
      onClick: () => setEngCons(x => ({
        ...x,
        linhas: x.linhas.filter(y => y.ref !== r.l.ref)
      }))
    }, "\xD7")))), !rows.length && semLinhas(11, 'Nenhum item — acrescente abaixo os itens do contrato usados na operação.')), rows.length > 0 && engH("tfoot", null, engH("tr", null, engH("td", {
      colSpan: 8
    }, engH("b", null, 'Total da operação')), engH("td", {
      className: "ec-num ec-tot-brl"
    }, engH("b", null, fmtBRL(tB))), engH("td", {
      className: "ec-num ec-tot-usd"
    }, engH("b", null, fmtUSD(tU))), engH("td", null))))), engH("select", {
      className: "sel ec-add",
      value: "",
      onChange: e => add(e.target.value)
    }, engH("option", {
      value: ""
    }, "＋ Acrescentar item do contrato…"), disponiveis.map(i => engH("option", {
      key: i.ref,
      value: i.ref
    }, i.ref + ' — ' + String(i.desc || '').slice(0, 90)))), acima.length > 0 && engH("div", {
      className: "ec-aviso"
    }, 'Acima do saldo disponível: ' + acima.map(r => r.l.ref).join(', ') + '. Dá para salvar, mas o saldo do contrato fica negativo.'), semPreco.length > 0 && engH("div", {
      className: "ec-aviso"
    }, 'Sem valor cadastrado no contrato: ' + semPreco.map(r => r.l.ref).join(', ') + ' — não entram na receita até o contrato ter o valor.'), secMat(2, 'Químicas', 'quim', prevQ, matCatalogo('quimico')), secMat(3, 'Casing equipment', 'cas', prevC, matCatalogo('casing')), engH("div", {
      className: "hm-sec ec-sec"
    }, '4 · Pessoal (' + engCons.pes.length + ')'), engH("div", {
      className: "tbl-scroll ec-mat-wrap"
    }, engH("table", {
      className: "db-table ec-itens ec-pes"
    }, engH("thead", null, engH("tr", null, ['Função', 'Previsto', 'Pessoas', 'Dias', 'Homem-dia', ''].map((h, k) => engH("th", {
      key: k
    }, h)))), engH("tbody", null, pesRows.map(r => engH("tr", {
      key: r.p.funcao
    }, engH("td", null, r.p.funcao), engH("td", {
      className: "ec-num"
    }, prevP[r.p.funcao] != null ? fmtNum(prevP[r.p.funcao]) : '—'), engH("td", null, engH("input", {
      className: "ipt ec-in ec-qtd ec-p-pes",
      inputMode: "decimal",
      value: r.p.pessoas || '',
      placeholder: "0",
      onChange: e => setPe(r.p.funcao, {
        pessoas: e.target.value
      })
    })), engH("td", null, engH("input", {
      className: "ipt ec-in ec-qtd ec-p-dias",
      inputMode: "decimal",
      value: r.p.dias || '',
      placeholder: String(dur),
      onChange: e => setPe(r.p.funcao, {
        dias: e.target.value
      })
    })), engH("td", {
      className: "ec-num"
    }, r.hd == null ? '—' : fmtNum(r.hd)), engH("td", null, engH("button", {
      className: "btn-o hm-x",
      title: "Tirar a linha",
      onClick: () => setEngCons(x => ({
        ...x,
        pes: x.pes.filter(y => y.funcao !== r.p.funcao)
      }))
    }, "\xD7")))), !pesRows.length && semLinhas(6, 'Nenhuma função — acrescente abaixo.')), pesRows.length > 0 && engH("tfoot", null, engH("tr", null, engH("td", {
      colSpan: 4
    }, engH("b", null, 'Total')), engH("td", {
      className: "ec-num ec-tot-hd"
    }, engH("b", null, fmtNum(tHD))), engH("td", null))))), engH("select", {
      className: "sel ec-add ec-add-pes",
      value: "",
      onChange: e => addPe(e.target.value)
    }, engH("option", {
      value: ""
    }, "＋ Acrescentar fun\xE7\xE3o…"), funcoesLivres.map(f => engH("option", {
      key: f,
      value: f
    }, f))), (() => {
      var cg = engCogsSoma(cIdx, engCons.quim.concat(engCons.cas));
      var rr = Number(pj.riscoRec) || 0;
      return engH("div", {
        className: "ec-resumo"
      }, engH("span", null, 'Receita ', engH("b", {
        className: "ec-res-rec"
      }, fmtUSD(tU) + (tB ? ' · ' + fmtBRL(tB) : ''))), engH("span", null, 'COGS ', engH("b", {
        className: "ec-res-cogs"
      }, fmtUSD(cg.u) + (cg.b ? ' · ' + fmtBRL(cg.b) : ''))), engH("span", null, 'Margem ', engH("b", {
        className: "ec-res-margem"
      }, fmtUSD(tU - cg.u) + (tB || cg.b ? ' · ' + fmtBRL(tB - cg.b) : ''))), rr > 0 && engH("em", {
        className: "ec-res-risco"
      }, rr >= 100 ? 'Risco 100%: a operação fica mapeada, mas fora da receita e do COGS nas análises.' : 'Risco ' + fmtNum(rr) + '%: entram ' + fmtNum(100 - rr) + '% da receita e do COGS nas análises.'), cg.sem > 0 && engH("em", null, cg.sem + ' material(is) sem COGS cadastrado (Contratos → Custos).'));
    })()), engH("div", {
      className: "ec-foot"
    }, pj.ppuCons && engH("button", {
      className: "btn-o",
      onClick: () => askConfirm({
        title: 'Apagar consumo',
        okLabel: 'Apagar',
        danger: true,
        msg: engH("span", null, "Apagar o consumo desta opera\xE7\xE3o (PPU, qu\xEDmicas, casing e pessoal)?"),
        hint: 'O saldo volta ao contrato e a receita sai das análises.',
        onOk: () => gravar(null)
      })
    }, "Apagar consumo"), engH("span", {
      style: {
        flex: 1
      }
    }), engH("button", {
      className: "btn-o",
      onClick: fechar
    }, "Cancelar"), engH("button", {
      className: "btn-r ec-cons-ok",
      disabled: !ct || !engCons.data,
      onClick: salvar
    }, nTot ? 'Salvar consumo (' + nTot + ' linha(s))' : 'Salvar consumo'))));
  };

  /* ---------------- aba "Consumo e receita" ---------------- */
  var engPerOk = d => (!engRec.de || String(d) >= engRec.de) && (!engRec.ate || String(d) <= engRec.ate);
  var engCalcCt = (ct, ops) => {
    var itens = ctrItensNaData(ct, null);
    var consTot = engConsDoCt(ct);
    var cIdx = engCogsIdx();
    var lanc = [],
      porOp = {};
    ops.forEach(j => {
      var c = j.ppuCons;
      if (!c) return;
      var data = c.data || j.date;
      if (!engPerOk(data)) return;
      var f = engFator(j);
      var cg = engCogsSoma(cIdx, (c.quim || []).concat(c.cas || []));
      var o = porOp[j.id] = {
        j,
        ct,
        data,
        n: 0,
        vB: 0,
        vU: 0,
        cU: cg.u * f,
        cB: cg.b * f,
        fator: f,
        risco: Number(j.riscoRec) || 0
      };
      (c.linhas || []).forEach(l => {
        var q = engNum(l.qty) || 0;
        if (!q) return;
        var p = ctPreco(ct, l.ref, data);
        var x = {
          j,
          ct,
          data,
          ref: l.ref,
          desc: l.desc,
          unit: l.unit,
          q,
          pB: p.brl,
          pU: p.usd,
          vB: p.brl != null ? q * p.brl * f : null,
          vU: p.usd != null ? q * p.usd * f : null,
          fator: f
        };
        lanc.push(x);
        o.n++;
        o.vB += x.vB || 0;
        o.vU += x.vU || 0;
      });
    });
    var hoje = todayStr();
    var porItem = itens.map(i => {
      var ls = lanc.filter(x => x.ref === i.ref);
      var contr = i.saldoIni != null && i.saldoIni !== '' ? Number(i.saldoIni) : null;
      var c = consTot[i.ref] || 0;
      var p = ctPreco(ct, i.ref, hoje);
      return {
        i,
        contr,
        c,
        saldo: contr != null ? contr - c : null,
        pct: contr ? c / contr * 100 : null,
        p,
        qP: ls.reduce((a, x) => a + x.q, 0),
        vB: ls.reduce((a, x) => a + (x.vB || 0), 0),
        vU: ls.reduce((a, x) => a + (x.vU || 0), 0)
      };
    });
    var porMes = {};
    Object.values(porOp).forEach(o => {
      var k = String(o.data).slice(0, 7);
      var m = porMes[k] || (porMes[k] = {
        k,
        ops: new Set(),
        vB: 0,
        vU: 0,
        cU: 0
      });
      m.ops.add(o.j.id);
      m.vB += o.vB;
      m.vU += o.vU;
      m.cU += o.cU;
    });
    var po = Object.values(porOp);
    return {
      ct,
      lanc,
      porOp: po.sort((a, b) => String(b.data).localeCompare(String(a.data))),
      porItem,
      porMes: Object.values(porMes).sort((a, b) => a.k.localeCompare(b.k)),
      tB: lanc.reduce((a, x) => a + (x.vB || 0), 0),
      tU: lanc.reduce((a, x) => a + (x.vU || 0), 0),
      cU: po.reduce((a, o) => a + o.cU, 0),
      cB: po.reduce((a, o) => a + o.cB, 0),
      semPreco: lanc.filter(x => x.pB == null && x.pU == null).length
    };
  };
  var engMesTxt = k => {
    var [a, m] = String(k).split('-');
    return ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Number(m) - 1] + '/' + a;
  };
  var engRecExcel = (titulo, calcs, comItens) => {
    var ops = calcs.flatMap(c => c.porOp);
    var lanc = calcs.flatMap(c => c.lanc);
    var rigNm = j => ((db.rigs || []).find(r => r.id === j.rigId) || {}).name || '';
    var abas = [['Operações', [['Data do serviço', 'Contrato', 'Sonda', 'Poço', 'Operação', 'SO', 'Itens', 'Risco %', 'Receita R$', 'Receita US$', 'COGS R$', 'COGS US$', 'Margem US$'], ...ops.map(o => [fmtD(o.data), o.ct.name, rigNm(o.j), o.j.well || '', tipoTxt(o.j) || o.j.tipoOp || '', o.j.salesOrder || '', o.n, o.risco, engR4(o.vB), engR4(o.vU), engR4(o.cB), engR4(o.cU), engR4(o.vU - o.cU)])], [14, 28, 16, 16, 26, 12, 8, 8, 16, 16, 14, 14, 14]]];
    if (comItens) calcs.forEach(c => abas.push(['Itens' + (calcs.length > 1 ? ' ' + c.ct.name : ''), [['Item', 'Descrição', 'Unid.', 'Contratado', 'Consumido (total)', 'Saldo', '% usado', 'Valor vigente R$', 'Valor vigente US$', 'Consumido no período', 'Receita R$', 'Receita US$'], ...c.porItem.map(x => [x.i.ref, x.i.desc || '', x.i.unit || '', x.contr, x.c, x.saldo, x.pct != null ? engR4(x.pct) : null, x.p.brl, x.p.usd, x.qP, engR4(x.vB), engR4(x.vU)])], [10, 60, 8, 12, 14, 12, 9, 14, 14, 14, 14, 14]]));
    abas.push(['Lançamentos', [['Data do serviço', 'Contrato', 'Sonda', 'Poço', 'Operação', 'SO', 'Item', 'Descrição', 'Unid.', 'Quantidade', 'Valor R$', 'Valor US$', 'Total R$', 'Total US$'], ...lanc.map(x => [fmtD(x.data), x.ct.name, rigNm(x.j), x.j.well || '', tipoTxt(x.j) || x.j.tipoOp || '', x.j.salesOrder || '', x.ref, x.desc || '', x.unit || '', x.q, x.pB, x.pU, x.vB != null ? engR4(x.vB) : null, x.vU != null ? engR4(x.vU) : null])], [14, 28, 16, 16, 26, 12, 10, 50, 8, 12, 12, 12, 14, 14]]);
    engBaixarXlsx('Consumo e receita - ' + titulo + ' - ' + todayStr(), abas);
  };
  var engKpi = (rot, val, sub, cls) => engH("div", {
    className: 'ec-kpi' + (cls ? ' ' + cls : '')
  }, engH("span", null, rot), engH("b", null, val), sub && engH("em", null, sub));
  var engBarra = pct => engH("div", {
    className: "ec-barra",
    title: pct == null ? '' : fmtNum(pct) + '%'
  }, engH("i", {
    style: {
      width: Math.max(0, Math.min(100, pct || 0)) + '%',
      background: pct > 100 ? '#CC0000' : pct >= 80 ? '#B4561E' : '#43494E'
    }
  }));
  var renderEngReceita = () => {
    var ops = planFiltered.filter(j => j.status !== PJ_STATUS.CANC);
    var hoje = todayStr();
    var rigNm = j => ((db.rigs || []).find(r => r.id === j.rigId) || {}).name || '—';
    var cts = ctSel ? [ctSel] : engContratos;
    var calcs = cts.map(ct => engCalcCt(ct, ops.filter(j => {
      var c = ctDoJob(j);
      return c && c.id === ct.id;
    })));
    var tB = calcs.reduce((a, c) => a + c.tB, 0),
      tU = calcs.reduce((a, c) => a + c.tU, 0);
    var opsCons = calcs.flatMap(c => c.porOp).sort((a, b) => String(b.data).localeCompare(String(a.data)));
    var semCons = ops.filter(j => !j.ppuCons && String(j.date || '') <= hoje).sort((a, b) => String(b.date).localeCompare(String(a.date)));
    var semPreco = calcs.reduce((a, c) => a + c.semPreco, 0);
    var cU = calcs.reduce((a, c) => a + c.cU, 0),
      cB = calcs.reduce((a, c) => a + c.cB, 0);
    var periodo = engH("div", {
      className: "ec-bar ec-per"
    }, engH("b", null, "Per\xEDodo do servi\xE7o"), engH("input", {
      className: "ipt ec-de",
      type: "date",
      value: engRec.de,
      onChange: e => {
        var v = e.target.value;
        setEngRec(r => ({
          ...r,
          de: v
        }));
      }
    }), engH("span", null, "a"), engH("input", {
      className: "ipt ec-ate",
      type: "date",
      value: engRec.ate,
      onChange: e => {
        var v = e.target.value;
        setEngRec(r => ({
          ...r,
          ate: v
        }));
      }
    }), (engRec.de || engRec.ate) && engH("button", {
      className: "btn-o",
      onClick: () => setEngRec({
        de: '',
        ate: ''
      })
    }, "Limpar"), engH("span", {
      style: {
        flex: 1
      }
    }), engH("button", {
      className: "btn-o",
      onClick: abrirEngContratos
    }, "Contratos"), engH("button", {
      className: "btn-o",
      onClick: abrirEngGer
    }, "\u2B07 Arquivo do gerencial"), engH("button", {
      className: "btn-o ec-excel",
      onClick: () => engRecExcel(ctSel ? ctSel.name : 'todos os contratos', calcs, !!ctSel)
    }, "⬇ Excel"));
    var kpis = engH("div", {
      className: "ec-kpis"
    }, engKpi('Receita em R$', fmtBRL(tB), 'consumo lançado no período', 'ec-kpi-brl'), engKpi('Receita em US$', fmtUSD(tU), 'consumo lançado no período', 'ec-kpi-usd'), engKpi('COGS', fmtUSD(cU) + (cB ? ' · ' + fmtBRL(cB) : ''), 'químicas e casing lançados', 'ec-kpi-cogs'), engKpi('Margem em US$', fmtUSD(tU - cU), tU ? fmtNum((tU - cU) / tU * 100) + '% da receita' : 'receita − COGS', 'ec-kpi-margem'), engKpi('Operações com consumo', String(opsCons.length), semCons.length ? semCons.length + ' realizada(s) sem consumo' : 'nenhuma pendente'), semPreco ? engKpi('Lançamentos sem valor', String(semPreco), 'item sem valor no contrato', 'ec-kpi-alerta') : null);
    var tabOps = engH(React.Fragment, null, engH("div", {
      className: "hm-sec ec-sec"
    }, 'Receita por operação (' + opsCons.length + ')'), engH("div", {
      className: "tbl-scroll"
    }, engH("table", {
      className: "db-table ec-ops"
    }, engH("thead", null, engH("tr", null, ['Serviço', !ctSel && 'Contrato', 'Sonda', 'Poço', 'Operação', 'SO', 'Itens', 'Receita R$', 'Receita US$', 'COGS US$', ''].filter(x => x !== false).map((h, k) => engH("th", {
      key: k
    }, h)))), engH("tbody", null, opsCons.map(o => engH("tr", {
      key: o.j.id
    }, engH("td", null, fmtD(o.data)), !ctSel && engH("td", null, o.ct.name), engH("td", null, rigNm(o.j)), engH("td", null, o.j.well || '—'), engH("td", null, tipoTxt(o.j) || o.j.tipoOp, engRiscoTag(o.j)), engH("td", null, o.j.salesOrder || '—'), engH("td", {
      className: "ec-num"
    }, o.n), engH("td", {
      className: "ec-num"
    }, engH("b", null, fmtBRL(o.vB))), engH("td", {
      className: "ec-num"
    }, engH("b", null, fmtUSD(o.vU))), engH("td", {
      className: "ec-num"
    }, fmtUSD(o.cU)), engH("td", null, engH("button", {
      className: "btn-o",
      onClick: () => abrirEngCons(o.j)
    }, "Σ Consumo")))), !opsCons.length && engH("tr", null, engH("td", {
      colSpan: 11,
      style: {
        color: 'var(--ink-3)',
        fontStyle: 'italic'
      }
    }, "Nenhum consumo lan\xE7ado neste per\xEDodo. Use “Σ Consumo” na opera\xE7\xE3o."))))), semCons.length > 0 && engH("details", {
      className: "ec-pend"
    }, engH("summary", null, 'Operações até hoje sem consumo lançado (' + semCons.length + ')'), engH("div", {
      className: "tbl-scroll"
    }, engH("table", {
      className: "db-table"
    }, engH("tbody", null, semCons.map(j => engH("tr", {
      key: j.id
    }, engH("td", null, fmtD(j.date)), engH("td", null, rigNm(j)), engH("td", null, j.well || '—'), engH("td", null, tipoTxt(j) || j.tipoOp), engH("td", null, j.salesOrder || '—'), engH("td", null, engH("button", {
      className: "btn-r",
      onClick: () => abrirEngCons(j)
    }, "Lan\xE7ar consumo →")))))))));
    var meses = {};
    calcs.forEach(c => c.porMes.forEach(m => {
      var o = meses[m.k] || (meses[m.k] = {
        k: m.k,
        ops: new Set(),
        vB: 0,
        vU: 0
      });
      m.ops.forEach(x => o.ops.add(x));
      o.vB += m.vB;
      o.vU += m.vU;
    }));
    var mesesL = Object.values(meses).sort((a, b) => a.k.localeCompare(b.k));
    var maxB = Math.max(1, ...mesesL.map(m => m.vB));
    var tabMes = mesesL.length > 0 && engH(React.Fragment, null, engH("div", {
      className: "hm-sec ec-sec"
    }, "Receita por m\xEAs"), engH("div", {
      className: "tbl-scroll"
    }, engH("table", {
      className: "db-table ec-mes"
    }, engH("thead", null, engH("tr", null, ['Mês', 'Operações', 'Receita R$', 'Receita US$', ''].map((h, k) => engH("th", {
      key: k
    }, h)))), engH("tbody", null, mesesL.map(m => engH("tr", {
      key: m.k
    }, engH("td", null, engMesTxt(m.k)), engH("td", {
      className: "ec-num"
    }, m.ops.size), engH("td", {
      className: "ec-num"
    }, fmtBRL(m.vB)), engH("td", {
      className: "ec-num"
    }, fmtUSD(m.vU)), engH("td", {
      style: {
        width: '30%'
      }
    }, engBarra(m.vB / maxB * 100))))))));
    if (!ctSel) return engH("div", {
      className: "ec-rec"
    }, periodo, kpis, engH("div", {
      className: "hm-sec ec-sec"
    }, "Receita por contrato"), engH("div", {
      className: "tbl-scroll"
    }, engH("table", {
      className: "db-table ec-cts"
    }, engH("thead", null, engH("tr", null, ['Contrato', 'Cliente', 'Operações com consumo', 'Receita R$', 'Receita US$', ''].map((h, k) => engH("th", {
      key: k
    }, h)))), engH("tbody", null, calcs.filter(c => c.porOp.length || ops.some(j => {
      var x = ctDoJob(j);
      return x && x.id === c.ct.id;
    })).map(c => engH("tr", {
      key: c.ct.id
    }, engH("td", null, engH("b", null, c.ct.name)), engH("td", null, c.ct.clientName || '—'), engH("td", {
      className: "ec-num"
    }, c.porOp.length), engH("td", {
      className: "ec-num"
    }, fmtBRL(c.tB)), engH("td", {
      className: "ec-num"
    }, fmtUSD(c.tU)), engH("td", null, engH("button", {
      className: "btn-o",
      onClick: () => setPlanCt(c.ct.id)
    }, "Abrir →"))))), engH("tfoot", null, engH("tr", null, engH("td", {
      colSpan: 3
    }, engH("b", null, "Total")), engH("td", {
      className: "ec-num"
    }, engH("b", null, fmtBRL(tB))), engH("td", {
      className: "ec-num"
    }, engH("b", null, fmtUSD(tU))), engH("td", null))))), tabOps, tabMes);
    var c0 = calcs[0];
    var nPreco = (ctSel.items || []).filter(i => engNum(i.brl) != null || engNum(i.usd) != null).length;
    return engH("div", {
      className: "ec-rec"
    }, periodo, !nPreco && engH("div", {
      className: "ec-aviso"
    }, "Este contrato ainda n\xE3o tem valores em R$ ou US$. Cadastre em ", engH("button", {
      className: "btn-o",
      onClick: () => {
        setEngCt({
          view: 'lista',
          busca: '',
          arq: false
        });
        engCtAbrir(ctSel);
      }
    }, "Contratos → ", ctSel.name)), kpis, tabOps, engH("div", {
      className: "hm-sec ec-sec"
    }, 'Saldo por item PPU (' + c0.porItem.length + ')'), engH("div", {
      className: "tbl-scroll"
    }, engH("table", {
      className: "db-table ec-saldo"
    }, engH("thead", null, engH("tr", null, ['Item', 'Descrição', 'Unid.', 'Contratado', 'Consumido', 'Saldo', '% usado', 'Valor vigente', 'Receita no período'].map((h, k) => engH("th", {
      key: k
    }, h)))), engH("tbody", null, c0.porItem.map(x => engH("tr", {
      key: x.i.ref,
      className: x.c ? 'ec-tr-uso' : undefined
    }, engH("td", null, x.i.ref), engH("td", {
      className: "ec-desc"
    }, x.i.desc || '—'), engH("td", null, x.i.unit || ''), engH("td", {
      className: "ec-num"
    }, x.contr == null ? '—' : fmtNum(x.contr)), engH("td", {
      className: "ec-num"
    }, x.c ? fmtNum(x.c) : '—'), engH("td", {
      className: 'ec-num' + (x.saldo != null && x.saldo < 0 ? ' ec-neg' : '')
    }, x.saldo == null ? '—' : fmtNum(x.saldo)), engH("td", {
      style: {
        minWidth: 110
      }
    }, x.pct == null ? '—' : engH("div", {
      className: "ec-pct-cel"
    }, engBarra(x.pct), engH("span", null, fmtNum(x.pct) + '%'))), engH("td", {
      className: "ec-num"
    }, fmtPBRL(x.p.brl), engH("br", null), fmtPUSD(x.p.usd)), engH("td", {
      className: "ec-num"
    }, x.vB || x.vU ? engH(React.Fragment, null, fmtBRL(x.vB), engH("br", null), fmtUSD(x.vU)) : '—')))))), tabMes);
  };
  /* ---------------- custos (COGS) por material ----------------
     db.cogsItens = [{id, sap, nome, unid, usd, brl, atualizadoEm}]: custo unitário de químicas e casing
     equipment. COGS da operação = quantidade lançada (ou prevista) × COGS unitário do SAP. */
  var engCogsAbrir = () => setEngCt(x => ({
    ...(x || {}),
    view: 'cogs',
    sujo: false,
    cbusca: '',
    cogs: (db.cogsItens || []).map(c => ({
      ...c,
      _k: uid()
    }))
  }));
  var engCogsFalta = lista => {
    var saps = (lista || []).map(c => String(c.sap || '').trim()).filter(Boolean);
    var rep = saps.filter((s, i) => saps.indexOf(s) !== i);
    var f = [];
    if ((lista || []).some(c => !String(c.sap || '').trim() && !String(c.nome || '').trim())) f.push('SAP ou produto em todas as linhas');
    if (rep.length) f.push('SAP repetido (' + [...new Set(rep)].join(', ') + ')');
    return f;
  };
  var engCogsAplicar = r => {
    var lin = r && r.linhas || [];
    var novos = 0,
      atual = 0;
    setEngCt(x => {
      if (!x) return x;
      var l = [...(x.cogs || [])];
      lin.forEach(m => {
        var sap = String(m.ref || '').trim();
        var i = l.findIndex(c => sap && String(c.sap || '').trim() === sap || !sap && normNome(c.nome) === normNome(m.desc));
        var o = {
          sap,
          nome: m.desc || '',
          unid: m.unit || '',
          usd: m.usd,
          brl: m.brl
        };
        if (i >= 0) {
          atual++;
          l[i] = {
            ...l[i],
            nome: o.nome || l[i].nome,
            unid: o.unid || l[i].unid,
            usd: o.usd != null ? o.usd : l[i].usd,
            brl: o.brl != null ? o.brl : l[i].brl,
            _mud: true
          };
        } else {
          novos++;
          l.push({
            ...o,
            _k: uid(),
            _mud: true
          });
        }
      });
      return {
        ...x,
        sujo: true,
        cogs: l
      };
    });
    setTimeout(() => {
      setOkMsg('Planilha de COGS carregada ✓ — ' + novos + ' novo(s), ' + atual + ' atualizado(s). Confira e clique em “Salvar COGS”');
      setTimeout(() => setOkMsg(''), 6000);
    }, 0);
  };
  var engCogsSalvar = () => {
    var lista = engCt && engCt.cogs || [];
    if (engCogsFalta(lista).length) return;
    var agora = new Date().toISOString();
    var l = lista.map(c => {
      var sap = String(c.sap || '').trim();
      var o = {
        id: c.id || 'cg_' + (sap || uid()),
        sap,
        nome: String(c.nome || '').trim(),
        unid: String(c.unid || '').trim(),
        atualizadoEm: c._mud || !c.atualizadoEm ? agora : c.atualizadoEm
      };
      var u = engNum(c.usd),
        b = engNum(c.brl);
      if (u != null) o.usd = u;
      if (b != null) o.brl = b;
      return o;
    });
    updateDB(d => ({
      ...d,
      cogsItens: l
    }), {
      kind: 'COGS',
      action: 'Alteração',
      name: l.length + ' material(is)',
      user: currentUser() || '—',
      detail: 'COGS unitário por SAP'
    });
    setEngCt(x => ({
      ...x,
      sujo: false,
      cogs: l.map(c => ({
        ...c,
        _k: uid()
      }))
    }));
    setOkMsg('COGS salvo ✓');
    setTimeout(() => setOkMsg(''), 3000);
  };
  var renderEngCogs = fechar => {
    var lista = engCt.cogs || [];
    var setC = (k, patch) => setEngCt(x => ({
      ...x,
      sujo: true,
      cogs: x.cogs.map(c => c._k === k ? {
        ...c,
        ...patch,
        _mud: true
      } : c)
    }));
    var q = normNome(engCt.cbusca);
    var vis = lista.filter(c => !q || (String(c.sap || '') + ' ' + String(c.nome || '')).toLowerCase().includes(q));
    var falta = engCogsFalta(lista);
    var voltar = () => {
      if (engCt.sujo) {
        askConfirm({
          title: 'Sair sem salvar',
          okLabel: 'Sair sem salvar',
          danger: true,
          msg: engH("span", null, "Os custos t\xEAm altera\xE7\xF5es que n\xE3o foram salvas."),
          onOk: () => setEngCt(x => x && {
            ...x,
            view: 'lista',
            sujo: false
          })
        });
        return;
      }
      setEngCt(x => x && {
        ...x,
        view: 'lista'
      });
    };
    var inp = (c, k, num) => engH("input", {
      className: 'ipt ec-in ec-c-' + k,
      value: num ? engNumTxt(c[k]) : c[k] || '',
      inputMode: num ? 'decimal' : undefined,
      onChange: e => setC(c._k, {
        [k]: e.target.value
      })
    });
    return engH(React.Fragment, null, engH("div", {
      className: "modal-title"
    }, engH("span", null, engH("button", {
      className: "btn-o ec-volta",
      onClick: voltar
    }, "← Contratos"), ' Custos (COGS) por material'), engH("button", {
      className: "modal-close",
      onClick: fechar
    }, "\xD7")), engH("div", {
      className: "eng-help",
      style: {
        marginTop: 0
      }
    }, "Custo unit\xE1rio de cada qu\xEDmica e casing equipment, pelo SAP. O COGS da opera\xE7\xE3o \xE9 a quantidade lan\xE7ada (ou prevista) \xD7 este custo. Planilha: colunas SAP, Produto, Unidade, COGS US$ e/ou COGS R$ (uma coluna s\xF3 “COGS” vale como US$)."), engH("div", {
      className: "ec-bar"
    }, engH("input", {
      className: "ipt",
      style: {
        maxWidth: 260
      },
      placeholder: "Buscar SAP ou produto…",
      value: engCt.cbusca || '',
      onChange: e => {
        var v = e.target.value;
        setEngCt(x => ({
          ...x,
          cbusca: v
        }));
      }
    }), engH("b", null, lista.length + ' material(is)'), engH("span", {
      style: {
        flex: 1
      }
    }), engH("button", {
      className: "btn-o",
      onClick: () => setEngCt(x => ({
        ...x,
        sujo: true,
        cbusca: '',
        cogs: [...x.cogs, {
          _k: uid(),
          _mud: true,
          sap: '',
          nome: '',
          unid: '',
          usd: '',
          brl: ''
        }]
      }))
    }, "＋ Linha"), engH("button", {
      className: "btn-o ec-cogs-carregar",
      onClick: () => engCarregar('cogs')
    }, "⬆ Carregar planilha"), engH("button", {
      className: "btn-o",
      onClick: () => engBaixarXlsx('COGS', [['COGS', [['SAP', 'Produto', 'Unidade', 'COGS US$', 'COGS R$'], ...(lista.length ? lista.map(c => [c.sap || '', c.nome || '', c.unid || '', engNum(c.usd), engNum(c.brl)]) : [['100003685', 'Exemplo: CIMENTO CLASS G (apague esta linha)', 'SK', 13.15, null]])], [12, 50, 10, 14, 14]]])
    }, lista.length ? "⬇ Baixar planilha" : "⬇ Modelo da planilha")), engH("div", {
      className: "tbl-scroll ec-itens-wrap"
    }, engH("table", {
      className: "db-table ec-itens ec-cogs-tab"
    }, engH("thead", null, engH("tr", null, ['SAP', 'Produto', 'Unid.', 'COGS US$', 'COGS R$', ''].map((h, k) => engH("th", {
      key: k
    }, h)))), engH("tbody", null, vis.map(c => engH("tr", {
      key: c._k
    }, engH("td", null, inp(c, 'sap')), engH("td", null, inp(c, 'nome')), engH("td", null, inp(c, 'unid')), engH("td", null, inp(c, 'usd', 1)), engH("td", null, inp(c, 'brl', 1)), engH("td", null, engH("button", {
      className: "btn-o hm-x",
      title: "Tirar a linha",
      onClick: () => setEngCt(x => ({
        ...x,
        sujo: true,
        cogs: x.cogs.filter(y => y._k !== c._k)
      }))
    }, "\xD7")))), !vis.length && engH("tr", null, engH("td", {
      colSpan: 6,
      style: {
        color: 'var(--ink-3)',
        fontStyle: 'italic'
      }
    }, "Nenhum custo cadastrado — use “⬆ Carregar planilha” ou “＋ Linha”."))))), engH("div", {
      className: "ec-foot"
    }, falta.length > 0 && engH("span", {
      className: "ho-pend"
    }, 'Para salvar, falta: ' + falta.join(' · ')), engCt.sujo && !falta.length && engH("span", {
      className: "ec-sujo"
    }, "Altera\xE7\xF5es n\xE3o salvas"), engH("span", {
      style: {
        flex: 1
      }
    }), engH("button", {
      className: "btn-r ec-cogs-salvar",
      disabled: falta.length > 0,
      onClick: engCogsSalvar
    }, "Salvar COGS")));
  };

  /* ---------------- painel "Receita e COGS" (página inicial da Engenharia) ----------------
     Mesma regra do Gerencial: operação realizada (consumo lançado, pela data do serviço) ou prevista
     (itens PPU previstos × valor do contrato na data; químicas e casing previstos × COGS), × (1 − risco). */
  var [engPn, setEngPn] = useState(() => ({
    ano: String(new Date().getFullYear()),
    mes: '',
    ct: '',
    cli: '',
    sit: 'todos',
    aberto: true
  }));
  var engValorOp = (j, cIdx) => {
    if (!j || j.status === PJ_STATUS.CANC) return null;
    var ct = ctDoJob(j);
    if (!ct) return null;
    var f = engFator(j);
    var c = j.ppuCons;
    if (c) {
      var v = engOpValor(j) || {
        vB: 0,
        vU: 0
      };
      var cg = engCogsSoma(cIdx, (c.quim || []).concat(c.cas || []));
      return {
        j,
        ct,
        tipo: 'real',
        data: c.data || j.date,
        f,
        rU: v.vU * f,
        rB: v.vB * f,
        cU: cg.u * f,
        cB: cg.b * f
      };
    }
    var u = 0,
      b = 0;
    (j.ppuNeeds || []).forEach(n => {
      if (!n || !n.ref) return;
      var q = engNum(n.qty) || 0;
      var p = ctPreco(ct, n.ref, j.date);
      if (p.usd != null) u += q * p.usd;
      if (p.brl != null) b += q * p.brl;
    });
    var cg2 = engCogsSoma(cIdx, (j.chems || []).concat(j.casingNeeds || []));
    return {
      j,
      ct,
      tipo: 'prev',
      data: j.date,
      f,
      rU: u * f,
      rB: b * f,
      cU: cg2.u * f,
      cB: cg2.b * f
    };
  };
  var engSomaV = arr => arr.reduce((t, x) => {
    t.n++;
    t.rU += x.rU;
    t.rB += x.rB;
    t.cU += x.cU;
    t.cB += x.cB;
    if (x.tipo === 'real') {
      t.nR++;
      t.rRU += x.rU;
      t.rRB += x.rB;
    } else {
      t.nP++;
      t.rPU += x.rU;
      t.rPB += x.rB;
    }
    if (x.f === 0) t.nF++;
    return t;
  }, {
    n: 0,
    nR: 0,
    nP: 0,
    nF: 0,
    rU: 0,
    rB: 0,
    cU: 0,
    cB: 0,
    rRU: 0,
    rRB: 0,
    rPU: 0,
    rPB: 0
  });
  var renderEngPainel = () => {
    var p = engPn;
    var set = patch => setEngPn(x => ({
      ...x,
      ...patch
    }));
    var cIdx = engCogsIdx();
    var ctIds = {};
    engContratos.forEach(c => {
      ctIds[c.id] = 1;
    });
    var todas = (db.plannedJobs || []).map(j => engValorOp(j, cIdx)).filter(x => x && ctIds[x.ct.id]);
    var anos = [...new Set(todas.map(x => String(x.data || '').slice(0, 4)).filter(a => /^\d{4}$/.test(a)))].sort();
    if (p.ano && !anos.includes(p.ano)) anos.push(p.ano);
    anos.sort();
    var cts = engContratos.filter(c => todas.some(x => x.ct.id === c.id));
    var clis = [...new Set(cts.map(c => c.clientName).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt'));
    var ls = todas.filter(x => (!p.ano || String(x.data).slice(0, 4) === p.ano) && (!p.mes || String(x.data).slice(5, 7) === p.mes) && (!p.ct || x.ct.id === p.ct) && (!p.cli || x.ct.clientName === p.cli) && (p.sit === 'todos' || x.tipo === p.sit));
    var T = engSomaV(ls);
    var g = {};
    ls.forEach(x => {
      var k = String(x.data).slice(0, 7);
      (g[k] = g[k] || []).push(x);
    });
    var meses = Object.keys(g).sort().map(k => ({
      k,
      t: engSomaV(g[k])
    }));
    var gc = {};
    ls.forEach(x => {
      (gc[x.ct.id] = gc[x.ct.id] || {
        ct: x.ct,
        l: []
      }).l.push(x);
    });
    var porCt = Object.values(gc).map(o => ({
      ct: o.ct,
      t: engSomaV(o.l)
    })).sort((a, b) => b.t.rU + b.t.rB - (a.t.rU + a.t.rB));
    var emU = T.rU || !T.rB;
    var vb = t => emU ? t.rU : t.rB;
    var mx = Math.max(1, ...meses.map(m => vb(m.t)));
    var margem = (r, c) => r ? fmtNum((r - c) / r * 100) + '%' : '—';
    var sel = (cls, val, campo, ops, todos) => engH("select", {
      className: 'sel ' + cls,
      value: val,
      onChange: e => set({
        [campo]: e.target.value
      })
    }, engH("option", {
      value: ""
    }, todos), ops.map(o => engH("option", {
      key: o[0],
      value: o[0]
    }, o[1])));
    var MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    var filtrado = p.mes || p.ct || p.cli || p.sit !== 'todos' || p.ano !== String(new Date().getFullYear());
    var linhaT = (k, rot, t, onClick) => engH("tr", {
      key: k,
      className: onClick ? 'ec-row' : undefined,
      onClick
    }, engH("td", null, rot), engH("td", {
      className: "ec-num"
    }, t.n, engH("span", {
      className: "ec-pn-sub"
    }, t.nR + ' real. · ' + t.nP + ' prev.' + (t.nF ? ' · ' + t.nF + ' fora' : ''))), engH("td", {
      className: "ec-num"
    }, engH("b", null, fmtUSD(t.rU))), engH("td", {
      className: "ec-num"
    }, fmtBRL(t.rB)), engH("td", {
      className: "ec-num"
    }, fmtUSD(t.cU), t.cB ? engH("span", {
      className: "ec-pn-sub"
    }, fmtBRL(t.cB)) : null), engH("td", {
      className: "ec-num"
    }, fmtUSD(t.rU - t.cU), engH("span", {
      className: "ec-pn-sub"
    }, margem(t.rU, t.cU))));
    var cab = ['', 'Operações', 'Receita US$', 'Receita R$', 'COGS', 'Margem US$'];
    return engH("div", {
      className: "ec-painel"
    }, engH("div", {
      className: "ec-painel-h"
    }, engH("div", null, engH("h2", null, "Receita e COGS"), engH("span", null, "Realizado (consumo lan\xE7ado) + previsto (opera\xE7\xF5es ainda sem consumo), com o risco de cada opera\xE7\xE3o aplicado.")), engH("button", {
      className: "btn-o ec-painel-tg",
      onClick: () => set({
        aberto: !p.aberto
      })
    }, p.aberto ? 'Recolher' : 'Mostrar')), p.aberto && engH(React.Fragment, null, engH("div", {
      className: "ec-bar ec-pn-filtros"
    }, sel('ec-pn-ano', p.ano, 'ano', anos.map(a => [a, a]), 'Todos os anos'), sel('ec-pn-mes', p.mes, 'mes', MES.map((m, i) => [String(i + 1).padStart(2, '0'), m]), 'Todos os meses'), sel('ec-pn-ct', p.ct, 'ct', cts.map(c => [c.id, c.name]), 'Todos os contratos'), sel('ec-pn-cli', p.cli, 'cli', clis.map(c => [c, c]), 'Todos os clientes'), engH("select", {
      className: "sel ec-pn-sit",
      value: p.sit,
      onChange: e => set({
        sit: e.target.value
      })
    }, engH("option", {
      value: "todos"
    }, "Realizado + previsto"), engH("option", {
      value: "real"
    }, "S\xF3 realizado"), engH("option", {
      value: "prev"
    }, "S\xF3 previsto")), filtrado && engH("button", {
      className: "btn-o",
      onClick: () => set({
        ano: String(new Date().getFullYear()),
        mes: '',
        ct: '',
        cli: '',
        sit: 'todos'
      })
    }, "Limpar")), engH("div", {
      className: "ec-kpis"
    }, engKpi('Receita em US$', fmtUSD(T.rU), 'realizado ' + fmtUSD(T.rRU) + ' · previsto ' + fmtUSD(T.rPU), 'ec-pn-rec-usd'), engKpi('Receita em R$', fmtBRL(T.rB), 'realizado ' + fmtBRL(T.rRB) + ' · previsto ' + fmtBRL(T.rPB), 'ec-pn-rec-brl'), engKpi('COGS', fmtUSD(T.cU) + (T.cB ? ' · ' + fmtBRL(T.cB) : ''), 'químicas e casing', 'ec-pn-cogs'), engKpi('Margem em US$', fmtUSD(T.rU - T.cU), margem(T.rU, T.cU) + ' da receita' + (T.rB || T.cB ? ' · ' + fmtBRL(T.rB - T.cB) : ''), 'ec-pn-margem'), engKpi('Operações', String(T.n), T.nR + ' realizada(s) · ' + T.nP + ' prevista(s)' + (T.nF ? ' · ' + T.nF + ' fora (risco 100%)' : ''), 'ec-pn-ops')), engH("div", {
      className: "ec-pn-grid"
    }, engH("div", null, engH("div", {
      className: "hm-sec"
    }, "Por m\xEAs"), engH("div", {
      className: "tbl-scroll"
    }, engH("table", {
      className: "db-table ec-pn-mes-tab"
    }, engH("thead", null, engH("tr", null, ['Mês', ...cab.slice(1), ''].map((h, k) => engH("th", {
      key: k
    }, h)))), engH("tbody", null, meses.map(m => {
      var tr = linhaT(m.k, engMesTxt(m.k), m.t);
      return engH("tr", {
        key: m.k
      }, ...tr.props.children, engH("td", {
        style: {
          minWidth: 90
        }
      }, engBarra(vb(m.t) / mx * 100)));
    }), !meses.length && engH("tr", null, engH("td", {
      colSpan: 7,
      className: "ec-vazio"
    }, "Nenhuma opera\xE7\xE3o no filtro.")))))), engH("div", null, engH("div", {
      className: "hm-sec"
    }, "Por contrato"), engH("div", {
      className: "tbl-scroll"
    }, engH("table", {
      className: "db-table ec-pn-ct-tab"
    }, engH("thead", null, engH("tr", null, ['Contrato', ...cab.slice(1)].map((h, k) => engH("th", {
      key: k
    }, h)))), engH("tbody", null, porCt.map(o => linhaT(o.ct.id, engH("b", null, o.ct.name), o.t, () => {
      setPlanCt(o.ct.id);
      setPlanView('rec');
    })), !porCt.length && engH("tr", null, engH("td", {
      colSpan: 6,
      className: "ec-vazio"
    }, "Nenhuma opera\xE7\xE3o no filtro."))), porCt.length > 1 && engH("tfoot", null, linhaT('tot', engH("b", null, "Total"), T)))))), engH("div", {
      className: "ec-pn-nota"
    }, "Clique no contrato para abrir “Consumo e receita”. Risco 100% = opera\xE7\xE3o mapeada, mas fora da receita e do COGS. O COGS vem de Contratos → Custos (COGS).")));
  };
  /* ---------------- arquivo para o gerencial ----------------
     Pacote com os contratos escolhidos pelo engenheiro e as operações deles, já calculado (valores na data do
     serviço), para a pasta do SharePoint. O EARL Gerencial junta os arquivos de todos os engenheiros e, para
     cada contrato, usa o arquivo mais novo. Formato: {tipo:'EARL-Gerencial', formato:1, app, geradoEm, por,
     contratos[], operacoes[]}. */
  var [engGer, setEngGer] = useState(null);
  var engGerOps = ct => engOpsDoCt(ct).filter(j => {
    var c = ctDoJob(j);
    return c && c.id === ct.id;
  });
  var engPacoteGerencial = (ids, nome) => {
    var hoje = todayStr();
    var cts = (db.contratos || []).filter(c => ids.includes(c.id));
    var cIdx = engCogsIdx();
    var mat = l => (l || []).map(m => {
      var c = engCogsDe(cIdx, m);
      return {
        sap: m.sap || '',
        nome: m.name || m.sap || '',
        unid: m.unit || '',
        qtd: engNum(m.qty) || 0,
        cogsUsd: c ? engNum(c.usd) : null,
        cogsBrl: c ? engNum(c.brl) : null
      };
    }).filter(m => m.qtd > 0);
    var somaCogs = l => ({
      usd: engR4(l.reduce((a, m) => a + (m.cogsUsd != null ? m.qtd * m.cogsUsd : 0), 0)),
      brl: engR4(l.reduce((a, m) => a + (m.cogsBrl != null ? m.qtd * m.cogsBrl : 0), 0)),
      semCogs: l.filter(m => m.cogsUsd == null && m.cogsBrl == null).length
    });
    var contratos = cts.map(ct => ({
      id: ct.id,
      nome: ct.name || '',
      numero: ct.numero && ct.numero !== ct.name ? ct.numero : '',
      cliente: ct.clientName || '',
      tipo: ctKindLabel(ct.kind),
      bases: ct.bases || [],
      regiao: REGIAO_LABEL[ctrRegioes(ct)[0]] || '',
      inicio: ct.inicio || '',
      atualizadoEm: ct.atualizadoEm || '',
      itens: ctrItensNaData(ct, null).map(i => {
        var p = ctPreco(ct, i.ref, hoje);
        return {
          ref: i.ref,
          desc: i.desc || '',
          unit: i.unit || '',
          contratado: i.saldoIni != null && i.saldoIni !== '' ? Number(i.saldoIni) : null,
          brl: p.brl,
          usd: p.usd,
          brlIni: engNum(i.brl),
          usdIni: engNum(i.usd)
        };
      }),
      reajustes: (ct.reajustes || []).map(r => ({
        desde: r.desde,
        obs: r.obs || '',
        itens: Object.keys(r.precos || {}).length
      }))
    }));
    var operacoes = [];
    cts.forEach(ct => engGerOps(ct).forEach(j => {
      var rig = (db.rigs || []).find(r => r.id === j.rigId) || {};
      var h = handoverDoJob(j);
      var c = j.ppuCons;
      var data = c ? c.data || j.date : '';
      var dur = Number(j.durationDays) || 1;
      var ppu = c ? (c.linhas || []).map(l => {
        var q = engNum(l.qty) || 0;
        var p = ctPreco(ct, l.ref, data);
        return {
          ref: l.ref,
          desc: l.desc || '',
          unit: l.unit || '',
          qtd: q,
          brl: p.brl,
          usd: p.usd,
          valorBrl: p.brl != null ? engR4(q * p.brl) : null,
          valorUsd: p.usd != null ? engR4(q * p.usd) : null
        };
      }) : [];
      var pq = mat(j.chems),
        pc = mat(j.casingNeeds),
        rq = c ? mat(c.quim) : [],
        rc = c ? mat(c.cas) : [];
      var ppuP = (j.ppuNeeds || []).filter(n => n && n.ref).map(n => {
        var q = engNum(n.qty) || 0;
        var p = ctPreco(ct, n.ref, j.date);
        return {
          ref: n.ref,
          desc: n.desc || '',
          unit: n.unit || '',
          qtd: q,
          brl: p.brl,
          usd: p.usd,
          valorBrl: p.brl != null ? engR4(q * p.brl) : null,
          valorUsd: p.usd != null ? engR4(q * p.usd) : null
        };
      });
      operacoes.push({
        id: j.id,
        contratoId: ct.id,
        risco: Math.max(0, Math.min(100, Number(j.riscoRec) || 0)),
        sonda: rig.name || '',
        base: rig.base || '',
        ambiente: rig.id ? rigAmbiente(rig) : '',
        regiao: REGIAO_LABEL[j.loc] || REGIAO_LABEL[ctrRegioes(ct)[0]] || '',
        poco: j.well || '',
        tipo: tipoTxt(j) || j.tipoOp || '',
        revestimento: j.casing || '',
        data: j.date || '',
        duracao: dur,
        status: c ? 'consumo' : h ? 'handover' : 'planejada',
        so: j.salesOrder || '',
        wbs: j.wbs || '',
        vida: j.vida || '',
        contingencia: !!j.contingencia,
        /* chance de a contingência acontecer (campo do EARL); "risco" acima é o risco da receita/COGS */
        chanceConting: j.contingencia ? Number(j.risco) || 0 : null,
        handover: h ? {
          versao: h.versao || 1,
          em: h.email && h.email.em || h.atualizadoEm || '',
          para: h.email && h.email.para || []
        } : null,
        previsto: {
          ppu: ppuP,
          receita: {
            brl: engR4(ppuP.reduce((a, x) => a + (x.valorBrl || 0), 0)),
            usd: engR4(ppuP.reduce((a, x) => a + (x.valorUsd || 0), 0)),
            semValor: ppuP.filter(x => x.brl == null && x.usd == null && x.qtd).length
          },
          cogs: somaCogs(pq.concat(pc)),
          quimicas: pq,
          casing: pc,
          pessoal: (j.peopleNeeds || []).filter(n => n && n.funcao).map(n => ({
            funcao: n.funcao,
            pessoas: engNum(n.qty) || 0,
            dias: dur,
            hd: (engNum(n.qty) || 0) * dur
          })),
          equipamentos: (j.equipNeeds || []).filter(n => Number(n.qty) > 0).map(n => ({
            tipo: subtypeLabel(n.subtypeId),
            qtd: Number(n.qty) || 0
          }))
        },
        realizado: c ? {
          data,
          em: c.em || '',
          por: c.por || '',
          ppu,
          quimicas: rq,
          casing: rc,
          cogs: somaCogs(rq.concat(rc)),
          pessoal: (c.pes || []).map(p => ({
            funcao: p.funcao,
            pessoas: Number(p.pessoas) || 0,
            dias: Number(p.dias) || 0,
            hd: Number(p.hd) || 0
          }))
        } : null,
        receita: c ? {
          brl: engR4(ppu.reduce((a, x) => a + (x.valorBrl || 0), 0)),
          usd: engR4(ppu.reduce((a, x) => a + (x.valorUsd || 0), 0)),
          semValor: ppu.filter(x => x.brl == null && x.usd == null).length
        } : null
      });
    }));
    return {
      tipo: 'EARL-Gerencial',
      formato: 2,
      app: EARL_VERSION,
      geradoEm: new Date().toISOString(),
      por: nome || (db.hoMail || {}).nome || '',
      contratos,
      operacoes
    };
  };
  var abrirEngGer = () => {
    var salvos = (db.gerCfg && db.gerCfg.contratos || []).filter(id => engContratos.some(c => c.id === id));
    setEngGer({
      sel: salvos.length ? salvos : engContratos.filter(c => engGerOps(c).length).map(c => c.id),
      nome: (db.hoMail || {}).nome || ''
    });
  };
  var engGerar = () => {
    var g = engGer;
    if (!g || !g.sel.length) return;
    var pac = engPacoteGerencial(g.sel, String(g.nome || '').trim());
    var c1 = pac.contratos.length === 1 ? pac.contratos[0].nome : '';
    var nomeArq = 'EARL_Gerencial_' + (c1 || String(g.nome || '').trim() || pac.contratos.length + ' contratos') + '_' + engAgoraTxt();
    forceDownload([new File([JSON.stringify(pac)], asciiName(fnSafe(nomeArq)).replace(/ /g, '_') + '.json', {
      type: 'application/json'
    })]);
    updateDB(d => ({
      ...d,
      gerCfg: {
        ...(d.gerCfg || {}),
        contratos: g.sel,
        ultimo: pac.geradoEm
      },
      hoMail: String(g.nome || '').trim() ? {
        ...(d.hoMail || {}),
        nome: String(g.nome).trim()
      } : d.hoMail
    }));
    setEngGer(null);
    setOkMsg('Arquivo do gerencial gerado ✓ — salve na pasta do SharePoint do gerencial');
    setTimeout(() => setOkMsg(''), 7000);
  };
  var renderEngGer = () => {
    var g = engGer;
    if (!g) return null;
    var fechar = () => setEngGer(null);
    var set = patch => setEngGer(x => ({
      ...x,
      ...patch
    }));
    var linhas = engContratos.map(ct => {
      var ops = engGerOps(ct);
      var cons = ops.filter(j => j.ppuCons);
      var rec = cons.reduce((a, j) => {
        var v = engOpValor(j);
        return v ? [a[0] + v.vB, a[1] + v.vU] : a;
      }, [0, 0]);
      return {
        ct,
        ops: ops.length,
        cons: cons.length,
        rec,
        nP: (ct.items || []).filter(i => engNum(i.brl) != null || engNum(i.usd) != null).length
      };
    });
    var marcar = id => set({
      sel: g.sel.includes(id) ? g.sel.filter(x => x !== id) : [...g.sel, id]
    });
    var ult = db.gerCfg && db.gerCfg.ultimo;
    return engH("div", {
      className: "overlay",
      style: {
        zIndex: 300
      },
      onClick: e => {
        if (e.target === e.currentTarget) fechar();
      }
    }, engH("div", {
      className: "modal ec-modal ec-ger-modal",
      onClick: e => e.stopPropagation()
    }, engH("div", {
      className: "modal-title"
    }, engH("span", null, "⬇ Arquivo para o gerencial"), engH("button", {
      className: "modal-close",
      onClick: fechar
    }, "\xD7")), engH("div", {
      className: "eng-help",
      style: {
        marginTop: 0
      }
    }, "Marque os contratos sob a sua responsabilidade. O arquivo leva os contratos (itens, saldos, valores e reajustes) e as opera\xE7\xF5es deles, com o previsto e o consumo lan\xE7ado (PPU, qu\xEDmicas, casing equipment e pessoal) e a receita calculada. Salve o arquivo na pasta do SharePoint do gerencial: o EARL Gerencial junta os arquivos de todos os engenheiros e, para cada contrato, usa o arquivo mais novo."), ult && engH("div", {
      className: "ec-cons-id"
    }, '\xDAltimo arquivo gerado neste computador: ' + fmtDH(ult)), engH("div", {
      className: "fld",
      style: {
        maxWidth: 360
      }
    }, engH("label", {
      className: "lbl"
    }, "Engenheiro respons\xE1vel"), engH("input", {
      className: "ipt ec-ger-nome",
      value: g.nome || '',
      placeholder: "seu nome",
      onChange: e => set({
        nome: e.target.value
      })
    })), engH("div", {
      className: "ec-bar"
    }, engH("b", null, g.sel.length + ' de ' + linhas.length + ' contrato(s) marcado(s)'), engH("span", {
      style: {
        flex: 1
      }
    }), engH("button", {
      className: "btn-o",
      onClick: () => set({
        sel: linhas.filter(l => l.ops).map(l => l.ct.id)
      })
    }, "Os que t\xEAm opera\xE7\xF5es"), engH("button", {
      className: "btn-o",
      onClick: () => set({
        sel: []
      })
    }, "Nenhum")), engH("div", {
      className: "tbl-scroll ec-mat-wrap"
    }, engH("table", {
      className: "db-table ec-ger-tab"
    }, engH("thead", null, engH("tr", null, ['', 'Contrato', 'Cliente', 'Operações', 'Com consumo', 'Receita R$', 'Receita US$', 'Itens com valor'].map((h, k) => engH("th", {
      key: k
    }, h)))), engH("tbody", null, linhas.map(l => engH("tr", {
      key: l.ct.id,
      className: 'ec-row' + (g.sel.includes(l.ct.id) ? ' ec-sel' : ''),
      onClick: () => marcar(l.ct.id)
    }, engH("td", null, engH("input", {
      type: "checkbox",
      className: "ec-ger-ck",
      checked: g.sel.includes(l.ct.id),
      onChange: () => marcar(l.ct.id),
      onClick: e => e.stopPropagation()
    })), engH("td", null, engH("b", null, l.ct.name)), engH("td", null, l.ct.clientName || '—'), engH("td", {
      className: "ec-num"
    }, l.ops), engH("td", {
      className: "ec-num"
    }, l.cons), engH("td", {
      className: "ec-num"
    }, l.cons ? fmtBRL(l.rec[0]) : '—'), engH("td", {
      className: "ec-num"
    }, l.cons ? fmtUSD(l.rec[1]) : '—'), engH("td", {
      className: "ec-num"
    }, l.nP + ' de ' + (l.ct.items || []).length)))))), engH("div", {
      className: "ec-foot"
    }, !g.sel.length && engH("span", {
      className: "ho-pend"
    }, "Marque ao menos um contrato."), engH("span", {
      style: {
        flex: 1
      }
    }), engH("button", {
      className: "btn-o",
      onClick: fechar
    }, "Cancelar"), engH("button", {
      className: "btn-r ec-ger-ok",
      disabled: !g.sel.length,
      onClick: engGerar
    }, '⬇ Gerar arquivo (' + g.sel.length + ' contrato(s))'))));
  };
  /* ============ fim CONTRATOS (avulso) ============ */
