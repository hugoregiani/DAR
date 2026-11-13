  /* =================== e10: câmbio do dólar por mês ===================
     db.cambio = [{ano, mes, valor, em, por}] — valor = R$ por US$ 1,00 (cotação do mês), lançado pelo usuário.
     Item de contrato com valor em R$ vira US$ pela cotação do mês do serviço (operação concluída) ou da data prevista
     (operação prevista): US$ da linha = qtd × valor US$ + qtd × valor R$ ÷ câmbio do mês. Vale para todos os contratos.
     Mês sem cotação: vale a do último mês informado antes dele (ou, sem nenhum antes, a do primeiro depois). Sem
     nenhuma cotação na tabela, o valor em R$ não entra no US$ (como antes da e10). */
  var [engCb, setEngCb] = useState(null);
  var ENG_MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var engCambioLista = () => (Array.isArray(db.cambio) ? db.cambio : []).filter(c => c && Number(c.ano) > 1999 && Number(c.mes) >= 1 && Number(c.mes) <= 12 && Number(c.valor) > 0).map(c => ({
    ...c,
    ano: Number(c.ano),
    mes: Number(c.mes),
    valor: Number(c.valor)
  })).sort((a, b) => a.ano - b.ano || a.mes - b.mes);
  var engCambioDe = data => {
    var l = engCambioLista();
    var d = String(data || '');
    if (!l.length || !/^\d{4}-\d{2}/.test(d)) return null;
    var k = Number(d.slice(0, 4)) * 12 + Number(d.slice(5, 7)) - 1;
    var ex = null,
      ant = null,
      dep = null;
    l.forEach(c => {
      var kc = c.ano * 12 + c.mes - 1;
      if (kc === k) ex = c;else if (kc < k) ant = c;else if (!dep) dep = c;
    });
    var c = ex || ant || dep;
    return c ? {
      valor: c.valor,
      ano: c.ano,
      mes: c.mes,
      exato: !!ex
    } : null;
  };
  var engCambioTxt = c => c ? ENG_MESES[c.mes - 1] + '/' + c.ano + ' (R$ ' + fmtNum(c.valor) + ')' : '';
  /* valor em US$ de uma linha: a parte em US$ do contrato + a parte em R$ convertida pelo câmbio do mês */
  var engUsdLinha = (q, p, data) => {
    var u = p && p.usd != null ? q * p.usd : null;
    if (p && p.brl != null) {
      var c = engCambioDe(data);
      if (c) u = (u || 0) + q * p.brl / c.valor;
    }
    return u;
  };
  var engCtTemBrl = ct => (ct && ct.items || []).some(i => engNum(i.brl) != null) || (ct && ct.reajustes || []).some(r => Object.values(r.precos || {}).some(x => x && engNum(x.brl) != null));
  var abrirEngCambio = () => {
    var l = engCambioLista();
    var hoje = todayStr();
    setEngCb({
      linhas: (l.length ? l : [{
        ano: Number(hoje.slice(0, 4)),
        mes: Number(hoje.slice(5, 7)),
        valor: ''
      }]).map((c, i) => ({
        _k: 'c' + i,
        ano: String(c.ano),
        mes: String(c.mes),
        valor: c.valor === '' ? '' : engNumTxt(c.valor)
      })),
      sujo: !l.length,
      erro: ''
    });
  };
  var renderEngCambio = () => {
    if (!engCb) return null;
    /* e12: sempre o mês mais recente primeiro (ordem decrescente de ano e mês); linha sem ano/mês válido fica no topo */
    var kCb = l => {
      var a = Number(l.ano),
        m = Number(l.mes);
      return a > 1999 && m >= 1 && m <= 12 ? a * 12 + m : Infinity;
    };
    var linhas = (engCb.linhas || []).map((l, i) => ({
      l,
      i
    })).sort((x, y) => kCb(y.l) - kCb(x.l) || x.i - y.i).map(x => x.l);
    var set = (k, patch) => setEngCb(x => ({
      ...x,
      sujo: true,
      erro: '',
      linhas: x.linhas.map(l => l._k === k ? {
        ...l,
        ...patch
      } : l)
    }));
    var maisUm = () => setEngCb(x => {
      var ult = x.linhas.slice().filter(l => Number(l.ano) > 1999 && Number(l.mes) >= 1).sort((a, b) => Number(a.ano) * 12 + Number(a.mes) - (Number(b.ano) * 12 + Number(b.mes))).pop();
      var hoje = todayStr();
      var a = ult ? Number(ult.ano) : Number(hoje.slice(0, 4)),
        m = ult ? Number(ult.mes) + 1 : Number(hoje.slice(5, 7));
      if (m > 12) {
        m = 1;
        a++;
      }
      return {
        ...x,
        sujo: true,
        erro: '',
        linhas: [...x.linhas, {
          _k: 'n' + Date.now() + x.linhas.length,
          ano: String(a),
          mes: String(m),
          valor: ''
        }]
      };
    });
    var fechar = () => {
      if (engCb.sujo && linhas.some(l => String(l.valor || '').trim())) {
        askConfirm({
          title: 'Fechar sem salvar',
          okLabel: 'Fechar sem salvar',
          danger: true,
          msg: engH("span", null, "A tabela do c\xE2mbio tem altera\xE7\xF5es que n\xE3o foram salvas."),
          onOk: () => setEngCb(null)
        });
        return;
      }
      setEngCb(null);
    };
    var salvar = () => {
      var vistos = {},
        out = [],
        erros = [];
      linhas.forEach((l, i) => {
        var vazio = !String(l.valor || '').trim();
        if (vazio) return;
        var a = Number(l.ano),
          m = Number(l.mes),
          v = engNum(l.valor);
        if (!(a > 1999 && a < 2101)) erros.push('linha ' + (i + 1) + ': ano inválido');else if (!(m >= 1 && m <= 12)) erros.push('linha ' + (i + 1) + ': mês inválido');else if (!(v > 0)) erros.push('linha ' + (i + 1) + ': valor inválido');else if (vistos[a * 12 + m]) erros.push(ENG_MESES[m - 1] + '/' + a + ' repetido');else {
          vistos[a * 12 + m] = 1;
          out.push({
            ano: a,
            mes: m,
            valor: v,
            em: new Date().toISOString(),
            por: (db.hoMail || {}).nome || currentUser() || ''
          });
        }
      });
      if (erros.length) {
        setEngCb(x => ({
          ...x,
          erro: erros.join(' · ')
        }));
        return;
      }
      out.sort((a, b) => a.ano - b.ano || a.mes - b.mes);
      var antes = engCambioLista();
      var mud = out.length !== antes.length || out.some((c, i) => !antes[i] || antes[i].ano !== c.ano || antes[i].mes !== c.mes || antes[i].valor !== c.valor);
      if (mud) updateDB(d => ({
        ...d,
        cambio: out.map(c => {
          var a = antes.find(x => x.ano === c.ano && x.mes === c.mes && x.valor === c.valor);
          return a ? {
            ano: a.ano,
            mes: a.mes,
            valor: a.valor,
            em: a.em || c.em,
            por: a.por || c.por
          } : c;
        })
      }), {
        kind: 'Câmbio',
        action: 'Alteração',
        name: 'Câmbio do dólar por mês',
        user: currentUser() || '—',
        detail: out.length + ' mês(es) · ' + out.map(c => ENG_MESES[c.mes - 1] + '/' + c.ano + ' ' + fmtNum(c.valor)).slice(-3).join(', ')
      });
      setEngCb(null);
      setOkMsg(mud ? 'Câmbio salvo ✓ — ' + out.length + ' mês(es); a receita dos itens em R$ já usa a cotação de cada mês' : 'Nada mudou no câmbio');
      setTimeout(() => setOkMsg(''), 4000);
    };
    var cts = (db.contratos || []).filter(c => c && !c.archived);
    var comBrl = cts.filter(engCtTemBrl);
    var anos = [];
    var a0 = Number(todayStr().slice(0, 4));
    for (var a = a0 - 4; a <= a0 + 3; a++) anos.push(a);
    linhas.forEach(l => {
      var n = Number(l.ano);
      if (n > 1999 && !anos.includes(n)) anos.push(n);
    });
    anos.sort((x, y) => x - y);
    return engH("div", {
      className: "overlay",
      style: {
        zIndex: 300
      },
      onClick: e => {
        if (e.target === e.currentTarget) fechar();
      }
    }, engH("div", {
      className: "modal ec-modal ec-cb-modal",
      onClick: e => e.stopPropagation()
    }, engH("div", {
      className: "modal-title"
    }, engH("span", null, "💱 C\xE2mbio do d\xF3lar por m\xEAs"), engH("button", {
      className: "modal-close",
      onClick: fechar
    }, "\xD7")), engH("div", {
      className: "eng-help",
      style: {
        marginTop: 0
      }
    }, "Informe o ano, o m\xEAs e quanto vale ", engH("b", null, "US$ 1,00 em R$"), " naquele m\xEAs. Nos contratos com valores em R$, a receita em US$ (cart\xF5es, Receita e margem e arquivo do gerencial) usa a cota\xE7\xE3o do m\xEAs do servi\xE7o (opera\xE7\xE3o conclu\xEDda) ou da data prevista. M\xEAs sem cota\xE7\xE3o: vale a do \xFAltimo m\xEAs informado antes dele. A lista fica sempre com o m\xEAs mais recente em cima."), engH("div", {
      className: "ec-aviso ec-cb-cts"
    }, comBrl.length ? comBrl.length + ' contrato(s) com valores em R$: ' + comBrl.map(c => c.name).join(', ') + '.' : 'Nenhum contrato ativo tem valor em R$ hoje: a tabela vale para quando houver.'), engH("div", {
      className: "tbl-scroll ec-mat-wrap"
    }, engH("table", {
      className: "db-table ec-cb-tab"
    }, engH("thead", null, engH("tr", null, engH("th", null, "Ano"), engH("th", null, "M\xEAs"), engH("th", {
      className: "ec-num"
    }, "R$ por US$ 1,00"), engH("th", null))), engH("tbody", null, linhas.map(l => engH("tr", {
      key: l._k
    }, engH("td", null, engH("select", {
      className: "sel ec-cb-ano",
      value: l.ano,
      onChange: e => set(l._k, {
        ano: e.target.value
      })
    }, anos.map(a => engH("option", {
      key: a,
      value: String(a)
    }, a)))), engH("td", null, engH("select", {
      className: "sel ec-cb-mes",
      value: l.mes,
      onChange: e => set(l._k, {
        mes: e.target.value
      })
    }, ENG_MESES.map((m, i) => engH("option", {
      key: i,
      value: String(i + 1)
    }, String(i + 1).padStart(2, '0') + ' · ' + m)))), engH("td", {
      className: "ec-num"
    }, engH("input", {
      className: "ipt ec-in ec-cb-valor",
      inputMode: "decimal",
      placeholder: "ex.: 5,4321",
      value: l.valor,
      onChange: e => set(l._k, {
        valor: e.target.value
      })
    })), engH("td", null, engH("button", {
      className: "rp-x",
      title: "Tirar este m\xEAs",
      onClick: () => setEngCb(x => ({
        ...x,
        sujo: true,
        linhas: x.linhas.filter(y => y._k !== l._k)
      }))
    }, "✕"))))))), engCb.erro && engH("div", {
      className: "ec-aviso ec-neg ec-cb-erro"
    }, engCb.erro), engH("div", {
      className: "ec-foot"
    }, engH("button", {
      className: "btn-o ec-cb-mais",
      onClick: maisUm
    }, "＋ M\xEAs"), engH("span", {
      style: {
        flex: 1
      }
    }), engH("button", {
      className: "btn-o",
      onClick: fechar
    }, "Cancelar"), engH("button", {
      className: "btn-r ec-cb-salvar",
      onClick: salvar
    }, "Salvar c\xE2mbio"))));
  };
  /* ============ fim CÂMBIO (e10) ============ */
