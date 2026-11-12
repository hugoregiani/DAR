  /* =================== e7: inventário das sondas e exportações separadas ===================
     db.invSondas = [{id, rigId, sonda, ctId, data:'AAAA-MM-DD', por, obs, itens:[{sap, nome, unid, qtd}], criadoEm, atualizadoEm}]
     Cada registro é uma contagem física dos produtos químicos a bordo de uma sonda, numa data. A contagem mais
     recente de cada sonda é o "inventário atual" (a mesma sonda pode aparecer em mais de um contrato: vale sempre a
     última contagem). Duas contagens da mesma sonda na mesma data: a nova substitui a antiga.
     Exportações (janela "⬇ Exportar planilhas"): quatro arquivos .xlsx separados, para os contratos marcados —
     inventário das sondas, consumo de produtos químicos, casing equipment e pessoal. O Painel de Compras lê o
     inventário e o consumo de químicos no lugar das abas "DAR" e "Compilado Geral" da planilha do Forecast. */
  var [engInv, setEngInv] = useState({
    busca: '',
    soSaldo: false,
    hist: {}
  });
  var [engInvEd, setEngInvEd] = useState(null);
  var [engExp, setEngExp] = useState(null);
  var engInvRef = useRef(null);
  var engRigCod = r => String(r && (r.nomePetrobras || r.name) || '').trim();
  var engRigTxt = r => rigFmt(r) || '—'; // e10: NOME PETROBRAS - NOME DA SONDA
  var engInvTodas = () => Array.isArray(db.invSondas) ? db.invSondas : [];
  var engInvOrd = (a, b) => String(b.data || '').localeCompare(String(a.data || '')) || String(b.atualizadoEm || '').localeCompare(String(a.atualizadoEm || ''));
  var engInvDaSonda = rigId => engInvTodas().filter(c => c.rigId === rigId).sort(engInvOrd);
  var engInvUltimo = rigId => engInvDaSonda(rigId)[0] || null;
  /* contagem anterior a uma data (para mostrar a diferença na nova contagem) */
  var engInvAntes = (rigId, data, exceto) => engInvDaSonda(rigId).find(c => c.id !== exceto && (!data || String(c.data || '') <= data)) || null;
  var engInvDias = data => {
    if (!data) return null;
    var a = Date.parse(data + 'T12:00:00'),
      b = Date.parse(todayStr() + 'T12:00:00');
    return isFinite(a) && isFinite(b) ? Math.round((b - a) / 864e5) : null;
  };
  /* sondas de um contrato: as das operações do contrato, as que já têm contagem lançada nele e as cadastradas com
     o contrato (campo "contrato" da sonda) */
  var engInvRigsDoCt = ct => {
    if (!ct) return [];
    var ids = new Set();
    engGerOps(ct).forEach(j => {
      if (j.rigId) ids.add(j.rigId);
    });
    engInvTodas().forEach(c => {
      if (c.ctId === ct.id && c.rigId) ids.add(c.rigId);
    });
    var lbl = [ct.name, ct.numero].map(normNome).filter(l => l.length >= 3);
    (db.rigs || []).forEach(r => {
      var rc = normNome(r.contract);
      if (rc.length >= 3 && lbl.some(l => rc === l || rc.indexOf(l) === 0 || l.indexOf(rc) === 0)) ids.add(r.id);
    });
    return [...ids].map(id => (db.rigs || []).find(r => r.id === id)).filter(Boolean).sort((a, b) => engRigCod(a).localeCompare(engRigCod(b), 'pt', {
      numeric: true
    }));
  };
  var engInvRigsVisao = () => {
    var lista;
    if (ctSel) lista = engInvRigsDoCt(ctSel);else {
      var m = new Map();
      engContratos.forEach(ct => engInvRigsDoCt(ct).forEach(r => m.set(r.id, r)));
      engInvTodas().forEach(c => {
        var r = (db.rigs || []).find(x => x.id === c.rigId);
        if (r) m.set(r.id, r);
      });
      lista = [...m.values()].sort((a, b) => engRigCod(a).localeCompare(engRigCod(b), 'pt', {
        numeric: true
      }));
    }
    return planF.rig ? lista.filter(r => r.id === planF.rig) : lista;
  };
  var engInvCtsDaSonda = rigId => engContratos.filter(ct => engInvRigsDoCt(ct).some(r => r.id === rigId));
  /* catálogo de produtos químicos: o do EARL (o mesmo das operações) e o banco de Químicos */
  var engInvCat = () => {
    var m = new Map();
    (db.quimicos || []).forEach(q => {
      var s = String(q.sap || '').trim();
      if (s) m.set(s, {
        sap: s,
        nome: String(q.nome || s),
        unid: String(q.unid || '')
      });
    });
    chemCatalog.forEach(c => {
      var s = String(c.sap || '').trim();
      if (!s) return;
      var x = m.get(s);
      m.set(s, {
        sap: s,
        nome: String(c.name || x && x.nome || s),
        unid: String(c.unit || x && x.unid || '')
      });
    });
    return [...m.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
  };
  /* produtos químicos previstos nas operações (ainda não realizadas) de uma sonda */
  var engInvPrevistos = rigId => {
    var hoje = todayStr();
    var ops = (db.plannedJobs || []).filter(j => j.rigId === rigId && j.status !== PJ_STATUS.CANC && !j.ppuCons && String(j.date || '') >= hoje && (!ctSel || pjDoContrato(j, ctSel)));
    var m = new Map();
    ops.forEach(j => (j.chems || []).forEach(q => {
      var s = String(q.sap || '').trim();
      if (!s) return;
      var x = m.get(s) || {
        sap: s,
        nome: q.name || s,
        unid: q.unit || '',
        qtd: 0,
        ops: 0
      };
      x.qtd += engNum(q.qty) || 0;
      x.ops++;
      m.set(s, x);
    }));
    return [...m.values()];
  };

  /* ---------------- contagem (janela) ---------------- */
  var engInvLinha = (p, qtd, ant) => ({
    k: uid(),
    sap: String(p.sap || '').trim(),
    nome: String(p.nome || p.name || '').trim(),
    unid: String(p.unid || p.unit || '').trim(),
    qtd: qtd == null ? '' : engNumTxt(qtd),
    ant: ant == null ? null : ant
  });
  var engInvAbrir = (rigId, existente) => {
    var rig = (db.rigs || []).find(r => r.id === rigId);
    if (!rig) return;
    var nome = (db.hoMail || {}).nome || '';
    if (existente) {
      var ante = engInvAntes(rigId, existente.data, existente.id);
      var antQ = {};
      (ante && ante.itens || []).forEach(i => antQ[i.sap] = i.qtd);
      setEngInvEd({
        id: existente.id,
        rigId,
        ctId: existente.ctId || (ctSel ? ctSel.id : ''),
        data: existente.data || todayStr(),
        dataOrig: existente.data || '',
        por: existente.por || nome,
        obs: existente.obs || '',
        linhas: (existente.itens || []).map(i => engInvLinha(i, i.qtd, antQ[i.sap] != null ? antQ[i.sap] : null)),
        add: '',
        msg: null,
        sujo: false
      });
      return;
    }
    var ult = engInvUltimo(rigId);
    var linhas = ult ? (ult.itens || []).map(i => engInvLinha(i, i.qtd, i.qtd)) : engInvPrevistos(rigId).map(p => engInvLinha(p, null, null));
    var cts = engInvCtsDaSonda(rigId);
    setEngInvEd({
      id: null,
      rigId,
      ctId: ctSel ? ctSel.id : cts.length === 1 ? cts[0].id : '',
      data: todayStr(),
      dataOrig: '',
      por: nome,
      obs: '',
      linhas,
      base: ult ? ult.data : '',
      add: '',
      msg: null,
      sujo: false
    });
  };
  var engInvSetEd = patch => setEngInvEd(x => x ? {
    ...x,
    ...patch,
    sujo: true
  } : x);
  var engInvSetLinha = (k, patch) => setEngInvEd(x => x ? {
    ...x,
    sujo: true,
    linhas: x.linhas.map(l => l.k === k ? {
      ...l,
      ...patch
    } : l)
  } : x);
  var engInvAddProduto = txt => {
    var t = String(txt || '').trim();
    if (!t) return;
    var cat = engInvCat();
    var sap = t.split(' — ')[0].trim();
    var p = cat.find(c => c.sap === sap) || cat.find(c => normNome(c.nome) === normNome(t)) || (/^\d{4,}$/.test(sap) ? {
      sap,
      nome: '',
      unid: ''
    } : null);
    if (!p) {
      engInvSetEd({
        msg: {
          erro: true,
          txt: 'Produto não encontrado no catálogo: escolha da lista (SAP — produto) ou digite o SAP.'
        }
      });
      return;
    }
    setEngInvEd(x => {
      if (x.linhas.some(l => l.sap === p.sap)) return {
        ...x,
        add: '',
        msg: {
          txt: p.sap + ' já está na contagem.'
        }
      };
      var ante = engInvAntes(x.rigId, x.data, x.id);
      var a = (ante && ante.itens || []).find(i => i.sap === p.sap);
      return {
        ...x,
        sujo: true,
        add: '',
        msg: null,
        linhas: [...x.linhas, engInvLinha(p, null, a ? a.qtd : null)]
      };
    });
    setTimeout(() => {
      var ins = document.querySelectorAll('.ei-modal .ei-qtd');
      if (ins.length) ins[ins.length - 1].focus();
    }, 60);
  };
  var engInvAddPrevistos = () => setEngInvEd(x => {
    var tem = new Set(x.linhas.map(l => l.sap));
    var novos = engInvPrevistos(x.rigId).filter(p => !tem.has(p.sap));
    return {
      ...x,
      sujo: x.sujo || novos.length > 0,
      msg: {
        txt: novos.length ? novos.length + ' produto(s) previsto(s) nas operações incluído(s), sem quantidade.' : 'Todos os produtos previstos nas operações desta sonda já estão na contagem.'
      },
      linhas: [...x.linhas, ...novos.map(p => engInvLinha(p, null, null))]
    };
  });
  /* planilha da contagem: acha a coluna do SAP e a da quantidade pelo nome do cabeçalho; aceita também a aba DAR
     antiga (uma coluna por sonda: usa a coluna desta sonda) e o arquivo de inventário exportado pelo app */
  var engInvLerPlanilha = file => {
    if (!file || !engInvEd) return;
    var ed = engInvEd;
    var rig = (db.rigs || []).find(r => r.id === ed.rigId) || {};
    var nomesRig = [engRigCod(rig), rig.name, rig.nomePetrobras].map(v => normNome(asciiName(String(v || '')))).filter(Boolean);
    var nh = v => normNome(asciiName(String(v == null ? '' : v)));
    engLerWb(file).then(wb => {
      var achou = null;
      wb.SheetNames.some(nomeAba => {
        var rows = XLSX.utils.sheet_to_json(wb.Sheets[nomeAba], {
          header: 1,
          defval: '',
          raw: true
        });
        for (var i = 0; i < Math.min(rows.length, 15); i++) {
          var h = (rows[i] || []).map(nh);
          var cSap = h.findIndex(t => /^(sap|material|codigo sap|cod\.? sap|n(o|º)? sap|sap material)$/.test(t) || /^sap\b/.test(t));
          if (cSap < 0) continue;
          var cRig = h.findIndex((t, k) => k !== cSap && nomesRig.includes(t));
          var cQtd = cRig >= 0 ? cRig : h.findIndex((t, k) => k !== cSap && /quantidade|^qtd|saldo|inventario|estoque|a bordo|^dar$/.test(t));
          if (cQtd < 0) continue;
          var cNome = h.findIndex((t, k) => k !== cSap && /produto|descri|^nome|quimic/.test(t) && !/sonda/.test(t));
          var cUn = h.findIndex(t => /^(unid|unidade|un|uom|unit)/.test(t));
          var cSonda = cRig >= 0 ? -1 : h.findIndex(t => /^sonda$/.test(t));
          achou = {
            nomeAba,
            rows,
            i,
            cSap,
            cQtd,
            cNome,
            cUn,
            cSonda,
            colTxt: String(rows[i][cQtd] || '')
          };
          return true;
        }
        return false;
      });
      if (!achou) {
        engInvSetEd({
          msg: {
            erro: true,
            txt: 'Não achei na planilha uma coluna "SAP" e uma de quantidade ("Quantidade", "Saldo", "Estoque", ou o nome da sonda, como na aba DAR).'
          }
        });
        return;
      }
      var a = achou;
      var cat = engInvCat();
      var lidos = new Map(),
        ignorados = 0;
      for (var r = a.i + 1; r < a.rows.length; r++) {
        var row = a.rows[r] || [];
        var sap = String(row[a.cSap] == null ? '' : row[a.cSap]).trim().replace(/\.0+$/, '');
        if (!sap) continue;
        if (/^sap$/i.test(sap)) break;
        if (a.cSonda >= 0) {
          var sd = nh(row[a.cSonda]);
          if (sd && !nomesRig.includes(sd)) continue;
        }
        var v = row[a.cQtd];
        var q = typeof v === 'number' ? v : engNum(v);
        if (q == null) {
          if (String(v == null ? '' : v).trim()) ignorados++;
          continue;
        }
        var c = cat.find(x => x.sap === sap) || {};
        var ant = lidos.get(sap);
        lidos.set(sap, {
          sap,
          nome: String(a.cNome >= 0 && row[a.cNome] || c.nome || '').trim(),
          unid: String(c.unid || a.cUn >= 0 && row[a.cUn] || '').trim(),
          qtd: (ant ? ant.qtd : 0) + q
        });
      }
      setEngInvEd(x => {
        var linhas = x.linhas.map(l => ({
          ...l
        }));
        var novos = 0,
          atual = 0;
        var ante = engInvAntes(x.rigId, x.data, x.id);
        lidos.forEach(p => {
          var l = linhas.find(y => y.sap === p.sap);
          if (l) {
            l.qtd = engNumTxt(p.qtd);
            atual++;
          } else {
            var an = (ante && ante.itens || []).find(i => i.sap === p.sap);
            linhas.push(engInvLinha(p, p.qtd, an ? an.qtd : null));
            novos++;
          }
        });
        return {
          ...x,
          linhas,
          sujo: true,
          msg: {
            txt: 'Planilha "' + file.name + '" (aba ' + a.nomeAba + ', coluna "' + a.colTxt + '"): ' + lidos.size + ' produto(s) lido(s) — ' + novos + ' novo(s), ' + atual + ' atualizado(s)' + (ignorados ? ', ' + ignorados + ' linha(s) sem número ignorada(s)' : '') + '.'
          }
        };
      });
    }).catch(e => engInvSetEd({
      msg: {
        erro: true,
        txt: 'Não foi possível ler a planilha: ' + (e && e.message || e)
      }
    }));
  };
  var engInvFalta = ed => {
    var f = [];
    if (!ed.data) f.push('a data da contagem');
    var saps = ed.linhas.map(l => l.sap).filter(Boolean);
    var rep = saps.filter((s, i) => saps.indexOf(s) !== i);
    if (rep.length) f.push('SAP repetido (' + [...new Set(rep)].join(', ') + ')');
    if (ed.linhas.some(l => !l.sap && String(l.qtd).trim())) f.push('o SAP de todas as linhas');
    if (ed.linhas.some(l => String(l.qtd).trim() && (engNum(l.qtd) == null || engNum(l.qtd) < 0))) f.push('quantidades válidas (número, sem negativo)');
    return f;
  };
  var engInvSalvar = forcar => {
    var ed = engInvEd;
    if (!ed || engInvFalta(ed).length) return;
    var rig = (db.rigs || []).find(r => r.id === ed.rigId) || {};
    var outra = engInvTodas().find(c => c.rigId === ed.rigId && c.data === ed.data && c.id !== ed.id);
    if (outra && !forcar) {
      askConfirm({
        title: 'Já existe uma contagem nesta data',
        okLabel: 'Substituir',
        danger: true,
        msg: engH("span", null, "A ", engH("b", null, engRigTxt(rig)), " já tem uma contagem em ", engH("b", null, fmtD(ed.data)), " (" + (outra.itens || []).length + " produto(s)" + (outra.por ? ', por ' + outra.por : '') + "). Substituir pela contagem que está na tela?"),
        onOk: () => engInvSalvar(true)
      });
      return;
    }
    var agora = new Date().toISOString();
    var itens = ed.linhas.filter(l => l.sap && String(l.qtd).trim()).map(l => ({
      sap: l.sap,
      nome: l.nome || l.sap,
      unid: l.unid || '',
      qtd: engNum(l.qtd)
    }));
    var ex = ed.id ? engInvTodas().find(c => c.id === ed.id) : null;
    var id = outra ? outra.id : ed.id || 'inv_' + uid();
    var rec = {
      id,
      rigId: ed.rigId,
      sonda: engRigCod(rig),
      ctId: ed.ctId || '',
      data: ed.data,
      por: String(ed.por || '').trim(),
      obs: String(ed.obs || '').trim(),
      itens,
      criadoEm: outra && outra.criadoEm || ex && ex.criadoEm || agora,
      atualizadoEm: agora
    };
    updateDB(d => {
      var l = (Array.isArray(d.invSondas) ? d.invSondas : []).filter(c => c.id !== id && c.id !== ed.id);
      return {
        ...d,
        invSondas: [...l, rec],
        hoMail: rec.por ? {
          ...(d.hoMail || {}),
          nome: (d.hoMail || {}).nome || rec.por
        } : d.hoMail
      };
    }, {
      kind: 'Inventário da sonda',
      action: ex || outra ? 'Alteração' : 'Inclusão',
      name: engRigTxt(rig) + ' · ' + fmtD(ed.data),
      user: rec.por || currentUser() || '—',
      detail: itens.length + ' produto(s)'
    });
    setEngInvEd(null);
    setOkMsg('Contagem da ' + engRigCod(rig) + ' salva ✓ (' + itens.length + ' produto(s))');
    setTimeout(() => setOkMsg(''), 4000);
  };
  var engInvExcluir = c => {
    var rig = (db.rigs || []).find(r => r.id === c.rigId) || {};
    askDelete('a contagem da ' + engRigTxt(rig) + ' de ' + fmtD(c.data), () => {
      updateDB(d => ({
        ...d,
        invSondas: (d.invSondas || []).filter(x => x.id !== c.id)
      }), {
        kind: 'Inventário da sonda',
        action: 'Exclusão',
        name: engRigTxt(rig) + ' · ' + fmtD(c.data),
        user: currentUser() || '—',
        detail: (c.itens || []).length + ' produto(s)'
      });
      setEngInvEd(x => x && x.id === c.id ? null : x);
    });
  };
  var renderEngInvEd = () => {
    var ed = engInvEd;
    if (!ed) return null;
    var rig = (db.rigs || []).find(r => r.id === ed.rigId) || {};
    var fechar = () => {
      if (ed.sujo) {
        askConfirm({
          title: 'Fechar sem salvar',
          okLabel: 'Fechar sem salvar',
          danger: true,
          msg: engH("span", null, "A contagem tem altera\xE7\xF5es que n\xE3o foram salvas."),
          onOk: () => setEngInvEd(null)
        });
        return;
      }
      setEngInvEd(null);
    };
    var cat = engInvCat();
    var falta = engInvFalta(ed);
    var semQtd = ed.linhas.filter(l => l.sap && !String(l.qtd).trim()).length;
    var preench = ed.linhas.filter(l => l.sap && String(l.qtd).trim()).length;
    var cts = engInvCtsDaSonda(ed.rigId);
    var ex = ed.id ? engInvTodas().find(c => c.id === ed.id) : null;
    return engH("div", {
      className: "overlay",
      style: {
        zIndex: 250
      },
      onClick: e => {
        if (e.target === e.currentTarget) fechar();
      }
    }, engH("div", {
      className: "modal ec-modal ei-modal",
      onClick: e => e.stopPropagation()
    }, engH("div", {
      className: "modal-title"
    }, engH("span", null, (ed.id ? 'Contagem da ' : 'Nova contagem da ') + engRigTxt(rig)), engH("button", {
      className: "modal-close",
      onClick: fechar
    }, "\xD7")), engH("div", {
      className: "eng-help",
      style: {
        marginTop: 0
      }
    }, "Informe a quantidade real de cada produto qu\xEDmico a bordo, na unidade do produto. ", ed.base ? 'A contagem começa com a última, de ' + fmtD(ed.base) + ': altere o que mudou e confira o resto. ' : !ed.id ? 'Sem contagem anterior: a lista começa com os produtos previstos nas operações desta sonda. ' : '', "Produto sem quantidade fica fora da contagem."), engH("div", {
      className: "ec-dados ei-dados"
    }, engH("div", {
      className: "fld"
    }, engH("label", {
      className: "lbl"
    }, "Data da contagem"), engH("input", {
      className: "ipt ei-data",
      type: "date",
      value: ed.data,
      max: todayStr(),
      onChange: e => engInvSetEd({
        data: e.target.value
      })
    })), engH("div", {
      className: "fld"
    }, engH("label", {
      className: "lbl"
    }, "Respons\xE1vel"), engH("input", {
      className: "ipt ei-por",
      value: ed.por,
      placeholder: "quem fez a contagem",
      onChange: e => engInvSetEd({
        por: e.target.value
      })
    })), engH("div", {
      className: "fld"
    }, engH("label", {
      className: "lbl"
    }, "Contrato"), engH("select", {
      className: "sel ei-ct",
      value: ed.ctId,
      onChange: e => engInvSetEd({
        ctId: e.target.value
      })
    }, engH("option", {
      value: ""
    }, "—"), engContratos.map(c => engH("option", {
      key: c.id,
      value: c.id
    }, c.name + (cts.some(x => x.id === c.id) ? '' : ' (outra sonda)'))))), engH("div", {
      className: "fld",
      style: {
        gridColumn: '1 / -1'
      }
    }, engH("label", {
      className: "lbl"
    }, "Observa\xE7\xE3o"), engH("input", {
      className: "ipt ei-obs",
      value: ed.obs,
      placeholder: "ex.: contagem do fim da operação no poço …",
      onChange: e => engInvSetEd({
        obs: e.target.value
      })
    }))), engH("div", {
      className: "ec-bar"
    }, engH("input", {
      className: "ipt ei-add",
      list: "ei-cat",
      value: ed.add,
      placeholder: "＋ Produto: digite o SAP ou o nome e escolha",
      style: {
        maxWidth: 380
      },
      onChange: e => {
        var v = e.target.value;
        if (cat.some(c => c.sap + ' — ' + c.nome === v)) engInvAddProduto(v);else setEngInvEd(x => ({
          ...x,
          add: v
        }));
      },
      onKeyDown: e => {
        if (e.key === 'Enter') engInvAddProduto(ed.add);
      }
    }), engH("datalist", {
      id: "ei-cat"
    }, cat.map(c => engH("option", {
      key: c.sap,
      value: c.sap + ' — ' + c.nome
    }))), engH("button", {
      className: "btn-o",
      onClick: () => engInvAddProduto(ed.add)
    }, "＋ Incluir"), engH("button", {
      className: "btn-o ei-prev",
      onClick: engInvAddPrevistos,
      title: "Inclui os produtos químicos das operações previstas desta sonda que ainda não estão na lista"
    }, "⇩ Produtos previstos nas opera\xE7\xF5es"), engH("span", {
      style: {
        flex: 1
      }
    }), engH("button", {
      className: "btn-o ei-carregar",
      onClick: () => engInvRef.current && engInvRef.current.click(),
      title: "Planilha com as colunas SAP e Quantidade (ou a aba DAR antiga, com uma coluna por sonda)"
    }, "⬆ Carregar planilha"), engH("button", {
      className: "btn-o",
      onClick: () => engBaixarXlsx('Inventario ' + engRigCod(rig) + ' ' + (ed.data || todayStr()), [['Inventário', [['SAP', 'Produto', 'Unidade', 'Quantidade'], ...(ed.linhas.length ? ed.linhas.map(l => [l.sap, l.nome, l.unid, engNum(l.qtd)]) : [['210795', 'Exemplo (apague esta linha)', 'bag', 10]])], [14, 44, 10, 14]]])
    }, "⬇ Planilha / modelo"), engH("input", {
      ref: engInvRef,
      type: "file",
      accept: ".xlsx,.xls,.xlsm,.csv",
      style: {
        display: 'none'
      },
      onChange: e => {
        var f = e.target.files && e.target.files[0];
        e.target.value = '';
        engInvLerPlanilha(f);
      }
    })), ed.msg && engH("div", {
      className: 'ec-aviso ei-msg' + (ed.msg.erro ? ' ei-msg-erro' : '')
    }, ed.msg.txt), engH("div", {
      className: "ec-itens-wrap"
    }, engH("table", {
      className: "db-table ec-itens ei-itens"
    }, engH("thead", null, engH("tr", null, ['SAP', 'Produto', 'Unidade', 'Contagem anterior', 'Quantidade a bordo', 'Diferença', ''].map((h, k) => engH("th", {
      key: k,
      className: k >= 3 && k <= 5 ? 'ec-num' : undefined
    }, h)))), engH("tbody", null, ed.linhas.map(l => {
      var q = String(l.qtd).trim() ? engNum(l.qtd) : null;
      var dif = q != null && l.ant != null ? q - l.ant : null;
      return engH("tr", {
        key: l.k,
        className: q == null ? 'ei-vazia' : undefined
      }, engH("td", null, engH("input", {
        className: "ipt ec-in ei-sap",
        value: l.sap,
        style: {
          width: 96
        },
        onChange: e => {
          var s = e.target.value.trim();
          var c = cat.find(x => x.sap === s);
          engInvSetLinha(l.k, c ? {
            sap: s,
            nome: c.nome,
            unid: c.unid
          } : {
            sap: s
          });
        }
      })), engH("td", null, engH("input", {
        className: "ipt ec-in ei-nome",
        value: l.nome,
        style: {
          minWidth: 220
        },
        onChange: e => engInvSetLinha(l.k, {
          nome: e.target.value
        })
      })), engH("td", null, engH("input", {
        className: "ipt ec-in ei-un",
        value: l.unid,
        style: {
          width: 70
        },
        onChange: e => engInvSetLinha(l.k, {
          unid: e.target.value
        })
      })), engH("td", {
        className: "ec-num ei-ant"
      }, l.ant == null ? '—' : fmtNum(l.ant)), engH("td", {
        className: "ec-num"
      }, engH("input", {
        className: "ipt ec-in ec-qtd ei-qtd",
        inputMode: "decimal",
        value: l.qtd,
        placeholder: "—",
        onChange: e => engInvSetLinha(l.k, {
          qtd: e.target.value
        })
      })), engH("td", {
        className: 'ec-num' + (dif ? dif < 0 ? ' ei-menos' : ' ei-mais' : '')
      }, dif == null ? '' : dif === 0 ? '=' : (dif > 0 ? '+' : '') + fmtNum(dif)), engH("td", null, engH("button", {
        className: "btn-o ei-tirar",
        title: "Tirar o produto da contagem",
        style: {
          fontSize: 11,
          padding: '2px 8px'
        },
        onClick: () => setEngInvEd(x => ({
          ...x,
          sujo: true,
          linhas: x.linhas.filter(y => y.k !== l.k)
        }))
      }, "\xD7")));
    }), !ed.linhas.length && engH("tr", null, engH("td", {
      colSpan: 7,
      className: "ec-vazio"
    }, "Nenhum produto. Use “＋ Produto”, “⇩ Produtos previstos nas operações” ou “⬆ Carregar planilha”."))))), engH("div", {
      className: "ec-foot"
    }, falta.length ? engH("span", {
      className: "ho-pend"
    }, 'Falta: ' + falta.join(', ') + '.') : engH("span", {
      className: "ei-resumo"
    }, preench + ' produto(s) com quantidade' + (semQtd ? ' · ' + semQtd + ' sem quantidade (ficam fora)' : '')), ex && engH("button", {
      className: "btn-o ei-excluir",
      style: {
        color: '#CC0000'
      },
      onClick: () => engInvExcluir(ex)
    }, "Excluir contagem"), engH("span", {
      style: {
        flex: 1
      }
    }), engH("button", {
      className: "btn-o",
      onClick: fechar
    }, "Cancelar"), engH("button", {
      className: "btn-r ei-salvar",
      disabled: falta.length > 0,
      onClick: () => engInvSalvar(false)
    }, "Salvar contagem"))));
  };

  /* ---------------- aba "Inventário das sondas" ---------------- */
  var renderEngInventario = () => {
    var rigs = engInvRigsVisao();
    var hoje = todayStr();
    var ults = rigs.map(r => ({
      r,
      c: engInvUltimo(r.id),
      n: engInvDaSonda(r.id).length
    }));
    var semCont = ults.filter(x => !x.c).length;
    var antigas = ults.filter(x => x.c && engInvDias(x.c.data) > 30).length;
    var outras = (db.rigs || []).filter(r => r.active !== false && !rigs.some(x => x.id === r.id)).sort((a, b) => engRigCod(a).localeCompare(engRigCod(b), 'pt', {
      numeric: true
    }));
    /* matriz: produtos × sondas (última contagem de cada sonda) */
    var prod = new Map();
    ults.forEach(x => (x.c && x.c.itens || []).forEach(i => {
      var p = prod.get(i.sap) || {
        sap: i.sap,
        nome: i.nome,
        unid: i.unid,
        q: {}
      };
      p.q[x.r.id] = (p.q[x.r.id] || 0) + (Number(i.qtd) || 0);
      prod.set(i.sap, p);
    }));
    var qb = normNome(engInv.busca);
    var linhas = [...prod.values()].filter(p => (!qb || normNome(p.sap + ' ' + p.nome).includes(qb)) && (!engInv.soSaldo || Object.values(p.q).some(v => v))).sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt'));
    var comCont = ults.filter(x => x.c);
    var setI = patch => setEngInv(x => ({
      ...x,
      ...patch
    }));
    return engH("div", {
      className: "ec-rec ei-tab"
    }, engH("div", {
      className: "eng-help",
      style: {
        marginTop: 0
      }
    }, "Invent\xE1rio real dos produtos qu\xEDmicos a bordo de cada sonda", ctSel ? ' do contrato ' + ctSel.name : ' dos contratos', ". Cada contagem fica guardada com a data e o respons\xE1vel; a mais recente \xE9 o invent\xE1rio atual. O Painel de Compras usa esse invent\xE1rio (no lugar da aba DAR do Forecast) pelo arquivo de “⬇ Exportar planilhas”."), engH("div", {
      className: "ec-kpis"
    }, engKpi('Sondas', String(rigs.length), ctSel ? 'do contrato' : 'dos contratos', 'ei-kpi-sondas'), engKpi('Com contagem', String(rigs.length - semCont), semCont ? semCont + ' sem contagem' : 'todas contadas', semCont ? 'ec-kpi-alerta ei-kpi-cont' : 'ei-kpi-cont'), engKpi('Contagem com mais de 30 dias', String(antigas), 'atualize antes de exportar', antigas ? 'ec-kpi-alerta ei-kpi-antigas' : 'ei-kpi-antigas'), engKpi('Produtos a bordo', String(prod.size), 'na última contagem de cada sonda', 'ei-kpi-prod')), engH("div", {
      className: "ec-bar"
    }, engH("select", {
      className: "sel ei-outra",
      style: {
        width: 'auto'
      },
      value: "",
      onChange: e => {
        if (e.target.value) engInvAbrir(e.target.value);
      }
    }, engH("option", {
      value: ""
    }, "＋ Contagem de outra sonda…"), outras.map(r => engH("option", {
      key: r.id,
      value: r.id
    }, engRigTxt(r)))), engH("span", {
      style: {
        flex: 1
      }
    }), engH("button", {
      className: "btn-r ei-exportar",
      onClick: () => abrirEngExp()
    }, "⬇ Exportar planilhas")), !rigs.length && engH("div", {
      className: "ec-aviso"
    }, ctSel ? 'Este contrato ainda não tem sondas: elas aparecem aqui pelas operações do contrato. Para lançar o inventário de uma sonda sem operação, use “＋ Contagem de outra sonda…”.' : 'Nenhuma sonda com operação nos contratos. Use “＋ Contagem de outra sonda…”.'), engH("div", {
      className: "ei-cards"
    }, ults.map(({
      r,
      c,
      n
    }) => {
      var dias = c ? engInvDias(c.data) : null;
      var aberto = !!engInv.hist[r.id];
      return engH("div", {
        key: r.id,
        className: 'ei-card' + (!c ? ' ei-sem' : dias > 30 ? ' ei-velha' : '')
      }, engH("div", {
        className: "ei-card-t"
      }, engH("b", null, engRigTxt(r))), c ? engH("div", {
        className: "ei-card-l"
      }, 'Última contagem: ', engH("b", null, fmtD(c.data)), dias != null && engH("span", {
        className: dias > 30 ? 'ei-dias ei-dias-v' : 'ei-dias'
      }, dias <= 0 ? 'hoje' : 'há ' + dias + ' dia(s)'), engH("br", null), (c.itens || []).length + ' produto(s)' + (c.por ? ' · ' + c.por : '')) : engH("div", {
        className: "ei-card-l"
      }, engH("span", {
        className: "ec-sem"
      }, "sem contagem")), engH("div", {
        className: "ei-card-b"
      }, engH("button", {
        className: "btn-r ei-nova",
        onClick: () => engInvAbrir(r.id)
      }, "＋ Nova contagem"), c && engH("button", {
        className: "btn-o ei-editar",
        onClick: () => engInvAbrir(r.id, c)
      }, "✎ Editar"), n > 0 && engH("button", {
        className: "btn-o ei-hist",
        onClick: () => setI({
          hist: {
            ...engInv.hist,
            [r.id]: !aberto
          }
        })
      }, 'Histórico (' + n + ')')), aberto && engH("div", {
        className: "ei-hist-l"
      }, engInvDaSonda(r.id).map(h => engH("div", {
        key: h.id,
        className: "ei-hist-i"
      }, engH("span", null, fmtD(h.data)), engH("span", null, (h.itens || []).length + ' prod.' + (h.por ? ' · ' + h.por : '')), engH("button", {
        className: "btn-o",
        onClick: () => engInvAbrir(r.id, h)
      }, "Abrir")))));
    })), comCont.length > 0 && engH(React.Fragment, null, engH("div", {
      className: "hm-sec ec-sec"
    }, 'Inventário atual — última contagem de cada sonda (' + linhas.length + ' produto(s))'), engH("div", {
      className: "ec-bar"
    }, engH("input", {
      className: "ipt ei-busca",
      placeholder: "Buscar produto (SAP ou nome)",
      value: engInv.busca,
      style: {
        maxWidth: 300
      },
      onChange: e => setI({
        busca: e.target.value
      })
    }), engH("label", {
      className: "ec-ck"
    }, engH("input", {
      type: "checkbox",
      checked: engInv.soSaldo,
      onChange: e => setI({
        soSaldo: e.target.checked
      })
    }), "S\xF3 produtos com saldo"), engH("span", {
      style: {
        flex: 1
      }
    }), engH("button", {
      className: "btn-o",
      onClick: () => engBaixarXlsx('Inventario atual ' + (ctSel ? ctSel.name : 'contratos') + ' ' + hoje, [['Inventário atual', [['SAP', 'Produto', 'Unidade', ...comCont.map(x => engRigCod(x.r)), 'Total'], ['', '', 'Data da contagem', ...comCont.map(x => fmtD(x.c.data)), ''], ...linhas.map(p => [p.sap, p.nome, p.unid, ...comCont.map(x => p.q[x.r.id] != null ? p.q[x.r.id] : ''), comCont.reduce((a, x) => a + (p.q[x.r.id] || 0), 0)])], [12, 40, 12, ...comCont.map(() => 12), 12]]])
    }, "⬇ Excel desta tabela")), engH("div", {
      className: "tbl-scroll ec-mat-wrap ei-mat-wrap"
    }, engH("table", {
      className: "db-table ei-mat"
    }, engH("thead", null, engH("tr", null, engH("th", null, "SAP"), engH("th", null, "Produto"), engH("th", null, "Unid."), comCont.map(x => engH("th", {
      key: x.r.id,
      className: "ec-num",
      title: 'Contagem de ' + fmtD(x.c.data)
    }, engRigTxt(x.r), engH("br", null), engH("span", {
      className: "ei-th-data"
    }, fmtD(x.c.data)))), engH("th", {
      className: "ec-num"
    }, "Total"))), engH("tbody", null, linhas.map(p => engH("tr", {
      key: p.sap
    }, engH("td", null, p.sap), engH("td", null, p.nome), engH("td", null, p.unid), comCont.map(x => engH("td", {
      key: x.r.id,
      className: "ec-num"
    }, p.q[x.r.id] != null ? fmtNum(p.q[x.r.id]) : '')), engH("td", {
      className: "ec-num"
    }, engH("b", null, fmtNum(comCont.reduce((a, x) => a + (p.q[x.r.id] || 0), 0)))))), !linhas.length && engH("tr", null, engH("td", {
      colSpan: comCont.length + 4,
      className: "ec-vazio"
    }, "Nenhum produto com esse filtro.")))))));
  };

  /* ---------------- exportações separadas (.xlsx) ---------------- */
  var ENG_EXP_TIPOS = [{
    k: 'inv',
    tipo: 'EARL-Eng-Inventario',
    titulo: 'Inventário das sondas',
    arq: 'Inventario_Sondas',
    desc: 'A última contagem de cada sonda dos contratos (e o histórico das contagens). É o inventário a bordo que o Painel de Compras usa no lugar da aba DAR.',
    compras: true
  }, {
    k: 'quim',
    tipo: 'EARL-Eng-Quimicos',
    titulo: 'Consumo de produtos químicos',
    arq: 'Consumo_Quimicos',
    desc: 'Uma linha por operação e produto químico: previsto e, nas operações concluídas, o consumo lançado. É o que o Painel de Compras usa no lugar da aba Compilado Geral.',
    compras: true
  }, {
    k: 'cas',
    tipo: 'EARL-Eng-Casing',
    titulo: 'Casing equipment',
    arq: 'Casing_Equipment',
    desc: 'Uma linha por operação e item de casing equipment: previsto e lançado.'
  }, {
    k: 'pes',
    tipo: 'EARL-Eng-Pessoal',
    titulo: 'Pessoal',
    arq: 'Pessoal',
    desc: 'Uma linha por operação e função: pessoas, dias e homem-dia previstos e lançados.'
  }];
  var ENG_EXP_CAB_OP = ['Contrato', 'Cliente', 'Sonda', 'Nome da sonda', 'Poço', 'Operação', 'Data da operação', 'Duração (dias)', 'Situação', 'Contingência', 'Risco (%)', 'SO', 'WBS', 'ID da operação'];
  /* data como número de série do Excel (formato dd/mm/aaaa): não depende do fuso horário de quem abre */
  var engSerie = iso => {
    var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? (Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(1899, 11, 30)) / 864e5 : '';
  };
  var engExpArquivo = (nome, abas) => {
    var wb = XLSX.utils.book_new();
    abas.forEach(([titulo, aoa, larg, colsData]) => {
      var ws = XLSX.utils.aoa_to_sheet(aoa);
      if (larg) ws['!cols'] = larg.map(w => ({
        wch: w
      }));
      (colsData || []).forEach(c => {
        for (var r = 1; r < aoa.length; r++) {
          var a = XLSX.utils.encode_cell({
            r,
            c
          });
          if (ws[a] && typeof ws[a].v === 'number') ws[a].z = 'dd/mm/yyyy';
        }
      });
      if (aoa.length > 1 && aoa[0].length) ws['!autofilter'] = {
        ref: XLSX.utils.encode_range({
          s: {
            r: 0,
            c: 0
          },
          e: {
            r: aoa.length - 1,
            c: aoa[0].length - 1
          }
        })
      };
      XLSX.utils.book_append_sheet(wb, ws, titulo.slice(0, 31));
    });
    var buf = XLSX.write(wb, {
      bookType: 'xlsx',
      type: 'array'
    });
    return new File([buf], asciiName(fnSafe(nome)).replace(/ /g, '_') + '.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  };
  var engExpSobre = (t, cts, nome, extra) => [['Arquivo', 'EARL Engenharia — ' + t.titulo], ['Tipo', t.tipo], ['Formato', 1], ['Gerado em', new Date().toISOString()], ['Engenheiro', nome || ''], ['App', EARL_VERSION], ['Contratos', cts.map(c => c.name).join(' | ')], ...(extra || [])];
  /* prev = linhas previstas: levam a contingência e o risco de não acontecer de cada linha (e10) */
  var engExpMat = (l, prev) => (l || []).map(m => ({
    sap: String(m.sap || '').trim(),
    nome: m.name || m.nome || m.sap || '',
    unid: m.unit || m.unid || '',
    qtd: engNum(m.qty != null ? m.qty : m.qtd) || 0,
    cont: !!(prev && m.cont),
    risco: prev ? engRiscoItem(m) : 0
  })).filter(m => m.qtd > 0 && (m.sap || m.nome));
  var engExpOps = ids => {
    var out = [];
    (db.contratos || []).filter(c => ids.includes(c.id)).forEach(ct => engGerOps(ct).forEach(j => out.push({
      ct,
      j,
      rig: (db.rigs || []).find(r => r.id === j.rigId) || {}
    })));
    return out.sort((a, b) => String(a.j.date || '').localeCompare(String(b.j.date || '')) || engRigCod(a.rig).localeCompare(engRigCod(b.rig), 'pt', {
      numeric: true
    }));
  };
  var engExpColsOp = ({
    ct,
    j,
    rig
  }) => [ct.name || '', ct.clientName || '', engRigCod(rig), rig.name || '', j.well || '', engExpOpTxt(j), engSerie(j.date), Number(j.durationDays) || 1, j.ppuCons ? 'Concluído' : 'Previsto', j.contingencia ? 'Sim' : 'Não', Math.max(0, Math.min(100, Number(j.riscoRec) || 0)), j.salesOrder || '', j.wbs || '', j.id];
  /* nome da operação: tipo e, na cimentação primária, o tamanho do revestimento */
  var engExpOpTxt = j => {
    var t = tipoTxt(j) || j.tipoOp || '';
    var c = String(j.casing || '').trim();
    return c && t.indexOf(c) < 0 ? t + ' ' + c : t;
  };
  /* previsto × lançado por chave (SAP ou nome), na ordem do previsto */
  var engExpPares = (prev, real) => {
    // a mesma química em linhas com riscos diferentes (firme e contingência) fica em linhas separadas
    var k = m => (m.sap || 'n:' + normNome(m.nome)) + '|' + (m.cont ? 'c' + m.risco : '');
    var m = new Map();
    prev.forEach(p => {
      var x = m.get(k(p)) || {
        p,
        qp: 0,
        qr: 0
      };
      x.qp += p.qtd;
      m.set(k(p), x);
    });
    real.forEach(p => {
      var x = m.get(k(p)) || {
        p,
        qp: 0,
        qr: 0
      };
      x.qr += p.qtd;
      m.set(k(p), x);
    });
    return [...m.values()];
  };
  var engExpMontar = (k, ids, nome) => {
    var t = ENG_EXP_TIPOS.find(x => x.k === k);
    var cts = (db.contratos || []).filter(c => ids.includes(c.id));
    var c1 = cts.length === 1 ? cts[0].name : cts.length + ' contratos';
    var nomeArq = 'EARL_' + t.arq + '_' + c1 + '_' + engAgoraTxt();
    var nCab = ENG_EXP_CAB_OP.length;
    if (k === 'inv') {
      var rigs = new Map();
      cts.forEach(ct => engInvRigsDoCt(ct).forEach(r => {
        var x = rigs.get(r.id) || {
          r,
          cts: []
        };
        x.cts.push(ct);
        rigs.set(r.id, x);
      }));
      var cab = ['Sonda', 'Nome da sonda', 'Contrato', 'Cliente', 'Data da contagem', 'Responsável', 'SAP', 'Produto', 'Unidade', 'Quantidade a bordo', 'Observação'];
      var lin = [],
        hist = [],
        nCont = 0;
      var lc = (x, c, i) => [engRigCod(x.r), x.r.name || '', x.cts.map(ct => ct.name).join(' | '), [...new Set(x.cts.map(ct => ct.clientName).filter(Boolean))].join(' | '), c ? engSerie(c.data) : '', c ? c.por || '' : '', i ? i.sap : '', i ? i.nome : c ? '(contagem sem produtos)' : '(sem contagem)', i ? i.unid : '', i ? i.qtd : '', c ? c.obs || '' : ''];
      [...rigs.values()].sort((a, b) => engRigCod(a.r).localeCompare(engRigCod(b.r), 'pt', {
        numeric: true
      })).forEach(x => {
        var cs = engInvDaSonda(x.r.id);
        var c = cs[0];
        if (c) nCont++;
        if (c && (c.itens || []).length) c.itens.forEach(i => lin.push(lc(x, c, i)));else lin.push(lc(x, c, null));
        cs.forEach(h => (h.itens || []).length ? h.itens.forEach(i => hist.push(lc(x, h, i))) : hist.push(lc(x, h, null)));
      });
      var larg = [10, 22, 26, 16, 14, 18, 12, 38, 10, 14, 30];
      return {
        file: engExpArquivo(nomeArq, [['Inventário', [cab, ...lin], larg, [4]], ['Histórico', [cab, ...hist], larg, [4]], ['Sobre', engExpSobre(t, cts, nome, [['Sondas', rigs.size], ['Sondas com contagem', nCont], ['Como ler', 'Aba Inventário: a última contagem de cada sonda (uma linha por produto). Aba Histórico: todas as contagens. Quantidade na unidade do produto.']]), [16, 90]]]),
        n: rigs.size,
        txt: rigs.size + ' sonda(s), ' + nCont + ' com contagem'
      };
    }
    var ops = engExpOps(ids);
    var lin = [];
    var cab, larg;
    if (k === 'quim' || k === 'cas') {
      cab = [...ENG_EXP_CAB_OP, 'SAP', k === 'quim' ? 'Produto' : 'Descrição', 'Unidade', 'Qtd. prevista', 'Qtd. realizada', 'Data do serviço', 'Contingência (linha)', 'Risco da linha (%)'];
      ops.forEach(o => {
        var c = o.j.ppuCons;
        var prev = engExpMat(k === 'quim' ? o.j.chems : o.j.casingNeeds, true);
        var real = c ? engExpMat(k === 'quim' ? c.quim : c.cas) : [];
        var pares = engExpPares(prev, real);
        if (!pares.length) lin.push([...engExpColsOp(o), '', k === 'quim' ? '(sem produtos químicos)' : '(sem casing equipment)', '', '', '', c ? engSerie(c.data || o.j.date) : '', '', '']);
        pares.forEach(x => lin.push([...engExpColsOp(o), x.p.sap, x.p.nome, x.p.unid, x.qp, c ? x.qr : '', c ? engSerie(c.data || o.j.date) : '', x.p.cont ? 'Sim' : 'Não', x.p.cont ? x.p.risco : 0]));
      });
      larg = [24, 14, 10, 20, 16, 30, 12, 9, 11, 11, 9, 12, 14, 16, 12, 38, 9, 12, 12, 12, 12, 12];
    } else {
      cab = [...ENG_EXP_CAB_OP, 'Função', 'Pessoas previstas', 'Dias previstos', 'Homem-dia previsto', 'Pessoas realizadas', 'Dias realizados', 'Homem-dia realizado', 'Data do serviço', 'Contingência (linha)', 'Risco da linha (%)'];
      ops.forEach(o => {
        var c = o.j.ppuCons;
        var dur = Number(o.j.durationDays) || 1;
        var m = new Map();
        (o.j.peopleNeeds || []).filter(n => n && n.funcao && engNum(n.qty) > 0).forEach(n => {
          var x = m.get(n.funcao) || {
            f: n.funcao,
            pp: 0,
            pr: 0,
            dr: 0,
            hr: 0,
            cont: false,
            risco: 0
          };
          x.pp += engNum(n.qty) || 0;
          if (n.cont) {
            x.cont = true;
            x.risco = Math.max(x.risco, engRiscoItem(n));
          }
          m.set(n.funcao, x);
        });
        (c && c.pes || []).filter(p => p && p.funcao).forEach(p => {
          var x = m.get(p.funcao) || {
            f: p.funcao,
            pp: 0,
            pr: 0,
            dr: 0,
            hr: 0
          };
          x.pr += Number(p.pessoas) || 0;
          x.dr = Math.max(x.dr, Number(p.dias) || 0);
          x.hr += Number(p.hd) || 0;
          m.set(p.funcao, x);
        });
        if (!m.size) lin.push([...engExpColsOp(o), '(sem pessoal)', '', '', '', '', '', '', c ? engSerie(c.data || o.j.date) : '', '', '']);
        m.forEach(x => lin.push([...engExpColsOp(o), x.f, x.pp, x.pp ? dur : '', x.pp * dur, c ? x.pr : '', c ? x.dr : '', c ? x.hr : '', c ? engSerie(c.data || o.j.date) : '', x.cont ? 'Sim' : 'Não', x.cont ? x.risco : 0]));
      });
      larg = [24, 14, 10, 20, 16, 30, 12, 9, 11, 11, 9, 12, 14, 16, 34, 10, 10, 12, 10, 10, 12, 12, 12, 12];
    }
    var nOps = new Set(ops.map(o => o.j.id)).size;
    return {
      file: engExpArquivo(nomeArq, [[t.titulo.replace('Consumo de produtos químicos', 'Consumo de químicos'), [cab, ...lin], larg, [6, nCab + (k === 'pes' ? 7 : 5)]], ['Sobre', engExpSobre(t, cts, nome, [['Operações', nOps], ['Linhas', lin.length], ['Como ler', 'Uma linha por operação' + (k === 'pes' ? ' e função' : ' e item') + '. Situação: Concluído = operação com consumo lançado (Qtd. realizada); Previsto = só o planejado. Risco (%): risco de a operação não acontecer (a receita, o COGS e as quantidades previstas contam × (1 − risco)). Contingência (linha) e Risco da linha (%): a linha em contingência conta × (1 − risco da linha), além do risco da operação (a Qtd. prevista é a quantidade planejada, sem o risco). Operações canceladas não entram.']]), [16, 90]]]),
      n: nOps,
      txt: nOps + ' operação(ões), ' + lin.length + ' linha(s)'
    };
  };
  var abrirEngExp = () => {
    var salvos = (db.expCfg && db.expCfg.contratos || db.gerCfg && db.gerCfg.contratos || []).filter(id => engContratos.some(c => c.id === id));
    setEngExp({
      sel: ctSel ? [ctSel.id] : salvos.length ? salvos : engContratos.filter(c => engGerOps(c).length).map(c => c.id),
      nome: (db.hoMail || {}).nome || '',
      feitos: {}
    });
  };
  var engExpBaixar = ks => {
    var g = engExp;
    if (!g || !g.sel.length) return;
    var nome = String(g.nome || '').trim();
    var feitos = {
      ...g.feitos
    };
    var files = ks.map(k => {
      var r = engExpMontar(k, g.sel, nome);
      feitos[k] = r.file.name;
      return r.file;
    });
    files.forEach((f, i) => setTimeout(() => forceDownload([f]), i * 700));
    updateDB(d => ({
      ...d,
      expCfg: {
        ...(d.expCfg || {}),
        contratos: g.sel,
        ultimo: new Date().toISOString()
      },
      hoMail: nome ? {
        ...(d.hoMail || {}),
        nome
      } : d.hoMail
    }));
    setEngExp(x => x ? {
      ...x,
      feitos
    } : x);
  };
  var renderEngExp = () => {
    var g = engExp;
    if (!g) return null;
    var fechar = () => setEngExp(null);
    var set = patch => setEngExp(x => ({
      ...x,
      ...patch
    }));
    var linhas = engContratos.map(ct => {
      var ops = engGerOps(ct);
      var rigs = engInvRigsDoCt(ct);
      return {
        ct,
        ops: ops.length,
        quim: ops.filter(j => (j.chems || []).length || j.ppuCons && (j.ppuCons.quim || []).length).length,
        rigs: rigs.length,
        cont: rigs.filter(r => engInvUltimo(r.id)).length
      };
    });
    var marcar = id => set({
      sel: g.sel.includes(id) ? g.sel.filter(x => x !== id) : [...g.sel, id]
    });
    var selL = linhas.filter(l => g.sel.includes(l.ct.id));
    var semCont = selL.reduce((a, l) => a + l.rigs - l.cont, 0);
    return engH("div", {
      className: "overlay",
      style: {
        zIndex: 300
      },
      onClick: e => {
        if (e.target === e.currentTarget) fechar();
      }
    }, engH("div", {
      className: "modal ec-modal ec-ger-modal ei-exp-modal",
      onClick: e => e.stopPropagation()
    }, engH("div", {
      className: "modal-title"
    }, engH("span", null, "⬇ Exportar planilhas"), engH("button", {
      className: "modal-close",
      onClick: fechar
    }, "\xD7")), engH("div", {
      className: "eng-help",
      style: {
        marginTop: 0
      }
    }, "Marque os contratos e baixe cada planilha separada (Excel). O ", engH("b", null, "Painel de Compras"), " usa o invent\xE1rio das sondas e o consumo de produtos qu\xEDmicos no lugar das abas DAR e Compilado Geral do Forecast: na aba Carregar Dados dele, carregue esses arquivos de todos os contratos no quadro “Engenharia”."), engH("div", {
      className: "fld",
      style: {
        maxWidth: 360
      }
    }, engH("label", {
      className: "lbl"
    }, "Engenheiro respons\xE1vel"), engH("input", {
      className: "ipt ei-exp-nome",
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
    }, engH("thead", null, engH("tr", null, ['', 'Contrato', 'Cliente', 'Operações', 'Com químicos', 'Sondas', 'Com contagem'].map((h, k) => engH("th", {
      key: k
    }, h)))), engH("tbody", null, linhas.map(l => engH("tr", {
      key: l.ct.id,
      className: 'ec-row' + (g.sel.includes(l.ct.id) ? ' ec-sel' : ''),
      onClick: () => marcar(l.ct.id)
    }, engH("td", null, engH("input", {
      type: "checkbox",
      className: "ei-exp-ck",
      checked: g.sel.includes(l.ct.id),
      onChange: () => marcar(l.ct.id),
      onClick: e => e.stopPropagation()
    })), engH("td", null, engH("b", null, l.ct.name)), engH("td", null, l.ct.clientName || '—'), engH("td", {
      className: "ec-num"
    }, l.ops), engH("td", {
      className: "ec-num"
    }, l.quim), engH("td", {
      className: "ec-num"
    }, l.rigs), engH("td", {
      className: 'ec-num' + (l.cont < l.rigs ? ' ec-neg' : '')
    }, l.cont + ' de ' + l.rigs)))))), semCont > 0 && engH("div", {
      className: "ec-aviso ei-exp-aviso"
    }, semCont + ' sonda(s) dos contratos marcados ainda sem contagem: no Painel de Compras, elas ficam com estoque zero a bordo.'), engH("div", {
      className: "ei-exp-tipos"
    }, ENG_EXP_TIPOS.map(t => engH("div", {
      key: t.k,
      className: 'ec-imp-op ei-exp-' + t.k
    }, engH("b", null, t.titulo, t.compras && engH("span", {
      className: "ec-tag"
    }, "Painel de Compras")), engH("span", null, t.desc), g.feitos[t.k] && engH("span", {
      className: "ei-exp-feito"
    }, '✓ ' + g.feitos[t.k]), engH("button", {
      className: "btn-o ei-exp-btn",
      disabled: !g.sel.length,
      onClick: () => engExpBaixar([t.k])
    }, '⬇ Baixar ' + t.titulo.toLowerCase())))), engH("div", {
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
    }, "Fechar"), engH("button", {
      className: "btn-r ei-exp-todos",
      disabled: !g.sel.length,
      onClick: () => engExpBaixar(ENG_EXP_TIPOS.map(t => t.k))
    }, '⬇ Baixar as 4 planilhas'))));
  };
  /* ============ fim INVENTÁRIO e EXPORTAÇÕES (e7) ============ */
