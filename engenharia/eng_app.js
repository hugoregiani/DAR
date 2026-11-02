  /* ===================== EARL ENGENHARIA (avulso) =====================
     Handover por e-mail (.eml), histórico dos e-mails, sondas e backup.
     Inserido no App (antes de renderHandover) pelo patch_engenharia.py. */
  var engH = React.createElement;
  var [engSondas, setEngSondas] = useState(false);
  var engRestRef = useRef(null);
  var hoMailCfg = () => db.hoMail || {};
  var hoEmailValido = e => /^[^\s@<>,;"']+@[^\s@<>,;"']+\.[^\s@<>,;"']+$/.test(String(e || '').trim());
  var hoRegiaoLbl = loc => loc === 'macae' ? 'Sudeste' : 'Nordeste';
  var hoNum = v => v == null || v === '' ? '—' : fmtNum(v);
  var hoContTxt = (cont, ch) => cont ? 'Contingência' + (ch != null && ch !== '' ? ' · ' + ch + '%' : '') : '';

  /* Monta o registro do handover (o mesmo formato do EARL, com status 'email' e uma foto
     dos dados da operação, para o e-mail poder ser gerado de novo igual). Não grava nada. */
  var hoMontarRec = (hd, c) => {
    var agora = new Date().toISOString();
    var so = soLimpa(hd.so),
      wbs = String(hd.wbs || '').trim(),
      vida = vidaLimpa(hd.vida);
    var ex = hd.editId ? (db.handovers || []).find(h => h.id === hd.editId) : null;
    var p0 = c.ops[0] || {};
    var ct = ctDoJob(p0);
    var rig = c.rig || {};
    var nome = String(hd.mailNome != null ? hd.mailNome : hoMailCfg().nome || '').trim();
    var operacoes = c.ops.map(j => ({
      id: j.id,
      well: j.well || '',
      tipoOp: j.tipoOp || '',
      tipo: tipoTxt(j) || j.tipoOp || '',
      casing: j.casing || '',
      date: j.date || '',
      dur: Number(j.durationDays) || null,
      vida: j.id === hd.pjId ? vida || '' : vidaLimpa(hoVidaDe(hd, j)),
      vidaReq: vidaExigido(j.tipoOp),
      contingencia: !!j.contingencia,
      risco: j.contingencia ? Number(j.risco) || 0 : null,
      notes: String(j.notes || '').trim(),
      ppu: (j.ppuNeeds || []).filter(n => n && (n.ref || n.desc)).map(n => ({
        ref: n.ref || '',
        desc: n.desc || '',
        unit: n.unit || '',
        qty: n.qty,
        cont: !!n.cont,
        chance: n.cont ? Number(n.chance) || 0 : null
      })),
      equipe: (j.peopleNeeds || []).filter(n => n && n.funcao && Number(n.qty) > 0).map(n => ({
        funcao: n.funcao,
        qty: Number(n.qty) || 0,
        cont: !!n.cont || !!j.contingencia,
        chance: n.cont ? Number(n.chance) || 0 : j.contingencia ? Number(j.risco) || 0 : null
      }))
    }));
    var linhaMat = (q, comLotes) => {
      var sol = Number(q.solicitado) || 0;
      var l = comLotes ? lotesLimpos(q.lotes) : [];
      var o = {
        key: q.key,
        sap: q.sap,
        produto: q.produto,
        uom: q.uom,
        previsto: q.previsto,
        backup: q.backup,
        necessidade: q.necessidade,
        aBordo: q.aBordo,
        diferenca: q.diferenca,
        solicitado: sol,
        justificativa: sol < (Number(q.diferenca) || 0) - 0.0001 ? String(q.just || '').trim() : '',
        embalagem: q.emb ? {
          tipo: q.emb.tipo,
          cap: q.emb.cap,
          uom: q.emb.uom,
          capM: q.emb.capM,
          n: embQtd(q.emb, sol)
        } : null,
        cont: !!q.cont,
        chance: q.cont ? q.chance : null
      };
      if (comLotes) {
        o.lotes = l;
        o.lote = l.map(x => x.lote).filter(Boolean).join(', ');
      }
      return o;
    };
    return {
      ...(ex || {}),
      id: ex ? ex.id : uid(),
      status: 'email',
      partes: null,
      versao: ex ? (ex.versao || 1) + 1 : 1,
      criadoEm: ex ? ex.criadoEm : agora,
      criadoPor: ex ? ex.criadoPor : nome,
      atualizadoEm: agora,
      loc: p0.loc || (hubLocation === 'macae' ? 'macae' : 'nne'),
      contratoId: ct && ct.id || p0.contratoId || '',
      contratoLabel: ct && ct.name || p0.contratoLabel || '',
      contratoNumero: ct && ct.numero && ct.numero !== ct.name ? ct.numero : '',
      clienteName: p0.clienteName || ct && ct.clientName || c.cliente || '',
      rigId: rig.id || '',
      sonda: rig.name || '',
      base: rig.base || '',
      offshore: !!c.offshore,
      salesOrder: so,
      wbs,
      buQuim: hoBuDe(hd, 'quim'),
      buCas: hoBuDe(hd, 'cas'),
      buPadrao: null,
      opIds: c.ops.map(j => j.id),
      operacoes,
      quimicos: c.quim.map(q => linhaMat(q, true)),
      casing: c.cas.map(q => linhaMat(q, false)),
      equipamentos: c.eqp.map(e => ({
        key: e.key,
        subtypeId: e.subtypeId,
        label: e.label,
        previsto: e.previsto,
        aBordo: e.aBordo,
        solicitado: Number(e.solicitado) || 0,
        cont: !!e.cont,
        chance: e.cont ? e.chance : null
      })),
      equipe: operacoes.flatMap(o => o.equipe.map(n => ({
        ...n,
        opId: o.id
      }))),
      pessoal: c.pes.map(p => ({
        key: p.key,
        opId: p.opId,
        funcao: p.funcao,
        n: p.n,
        embarquePrevisto: p.embPrev,
        desembarquePrevisto: p.desembPrev,
        embarqueSolicitado: p.emb,
        desembarqueSolicitado: p.desemb,
        cont: !!p.cont
      })),
      comentarios: String(hd.comentarios || '').trim(),
      aBordoFonte: c.ab ? c.ab.fonte : '',
      engenheiro: nome,
      email: null
    };
  };

  /* Assunto, nome do arquivo e corpo (HTML + texto) do e-mail do handover. */
  var hoEmailMontar = rec => {
    var ops = rec.operacoes || [];
    var o0 = ops[0] || {};
    var opNome = [o0.tipo || o0.tipoOp || 'Operação', o0.casing].filter(Boolean).join(' ') + (o0.well ? ' (' + o0.well + ')' : '');
    if (ops.length > 1) opNome += ' + ' + (ops.length - 1) + (ops.length > 2 ? ' operações' : ' operação');
    var partes = ['HANDOVER', rec.sonda || 'SEM SONDA', opNome, 'SO ' + (rec.salesOrder || '—'), 'VIDA ' + (o0.vida || 'N/A')];
    if ((rec.versao || 1) > 1) partes.push('REV ' + rec.versao);
    var assunto = partes.join(' - ').toUpperCase();
    var arquivo = asciiName(fnSafe(assunto)).slice(0, 180) + '.eml';
    var quando = rec.email && rec.email.em || new Date().toISOString();
    var regiao = hoRegiaoLbl(rec.loc);
    var nomeOp = o => [o.tipo || o.tipoOp, o.casing].filter(Boolean).join(' ');
    var KV_K = 'padding:4px 10px 4px 0;font-size:12px;color:#6B7280;white-space:nowrap;vertical-align:top;border-bottom:1px solid #F0F1F2;';
    var KV_V = 'padding:4px 0;font-size:12.5px;color:#2A2F30;font-weight:600;vertical-align:top;border-bottom:1px solid #F0F1F2;';
    var kv = rows => '<table cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:2px 0 14px;font-family:Segoe UI,Arial,sans-serif">' + rows.filter(r => r[1] != null && r[1] !== '').map(r => `<tr><td style="${KV_K}">${hEsc(r[0])}</td><td style="${KV_V}">${hEsc(r[1])}</td></tr>`).join('') + '</table>';
    var vidaDe = o => o.vida || (o.vidaReq ? '—' : 'N/A');
    var ident = [['Cliente', rec.clienteName], ['Contrato', [rec.contratoLabel, rec.contratoNumero].filter(Boolean).join(' · ')], ['Sonda', [rec.sonda || '—', rec.offshore ? 'offshore' : 'onshore', rec.base].filter(Boolean).join(' · ')], ['Poço', o0.well || '—'], ['Operação', nomeOp(o0) || '—'], ['Data prevista', o0.date ? fmtD(o0.date) : '—'], ['Duração prevista', o0.dur ? o0.dur + (o0.dur === 1 ? ' dia' : ' dias') : ''], ['Sales Order (SO)', rec.salesOrder || '—'], ['WBS', rec.wbs || ''], ['Nº VIDA', vidaDe(o0)], ['Contingência', o0.contingencia ? 'Sim · chance ' + (o0.risco || 0) + '%' : 'Não'], ['Versão do handover', String(rec.versao || 1)], ['Engenheiro responsável', rec.engenheiro || ''], ['Gerado em', fmtDH(quando)]];
    var temBordo = l => (l || []).some(q => q.aBordo != null);
    var linhasMat = (l, comLotes) => (l || []).map(q => {
      var r = [q.sap || '—', q.produto || '—', q.uom || '', hoNum(q.previsto), hoNum(q.backup) + '%', hoNum(q.necessidade)];
      if (temBordo(l)) r.push(hoNum(q.aBordo));
      r.push(hoNum(q.solicitado));
      r.push(q.embalagem ? q.embalagem.tipo + ' ' + fmtNum(q.embalagem.cap) + ' ' + (q.embalagem.uom || '') + (q.embalagem.n ? ' · ' + fmtNum(q.embalagem.n) + ' emb.' : '') : '—');
      if (comLotes) r.push((q.lotes || []).length ? q.lotes.map(x => (x.lote || 's/ lote') + ': ' + fmtNum(x.qty)).join(' · ') : '—');
      r.push([hoContTxt(q.cont, q.chance), q.justificativa ? 'Abaixo da diferença: ' + q.justificativa : ''].filter(Boolean).join(' · ') || '—');
      return r;
    });
    var headMat = (l, comLotes) => {
      var h = ['SAP', 'Produto', 'Unid.', 'Previsto', 'Backup', 'Necessidade'];
      if (temBordo(l)) h.push('A bordo');
      h.push('Solicitado', 'Embalagem');
      if (comLotes) h.push('Lotes');
      h.push('Observação');
      return h;
    };
    var quim = rec.quimicos || [],
      cas = rec.casing || [],
      eqp = rec.equipamentos || [],
      pes = rec.pessoal || [];
    var opDe = id => ops.find(o => o.id === id) || {};
    var equipe = ops.flatMap(o => (o.equipe || []).map(n => ({
      ...n,
      op: o
    })));
    var ppu = ops.flatMap(o => (o.ppu || []).map(n => ({
      ...n,
      op: o
    })));
    var varias = ops.length > 1;
    var html = '';
    var add = s => {
      html += s;
    };
    add(`<div style="font-family:Segoe UI,Arial,sans-serif;color:#43494E;max-width:920px">`);
    add(`<div style="border-bottom:2px solid #CC0000;padding:0 0 5px;margin-bottom:10px"><span style="font-size:13px;font-weight:800;color:#CC0000;letter-spacing:.5px">HALLIBURTON</span><span style="font-size:12px;color:#8E979D"> | Cementing · Engenharia ${hEsc(regiao)}</span></div>`);
    add(`<div style="font-size:15px;font-weight:700;margin-bottom:2px;color:#2A2F30">Handover — ${hEsc(rec.sonda || '—')} — ${hEsc(opNome)}</div>`);
    add(`<div style="font-size:11.5px;color:#6B7280;margin-bottom:12px">SO ${hEsc(rec.salesOrder || '—')} · VIDA ${hEsc(vidaDe(o0))} · versão ${hEsc(rec.versao || 1)} · ${hEsc(fmtDH(quando))}</div>`);
    add(mailP('Prezados,<br>segue o handover da operação abaixo, com tudo o que a engenharia está solicitando para ela.' + ((rec.versao || 1) > 1 ? ' <b>Esta é a revisão ' + hEsc(rec.versao) + ' e substitui as versões anteriores.</b>' : '')));
    add(mailH2('1. Identificação'));
    add(kv(ident));
    var nSec = 1;
    var sec = t => add(mailH2(++nSec + '. ' + t));
    if (varias) {
      sec('Operações incluídas (' + ops.length + ')');
      add(mailTable(['Poço', 'Operação', 'Data', 'Duração', 'Nº VIDA', 'Contingência'], ops.map(o => [o.well || '—', nomeOp(o) || '—', o.date ? fmtD(o.date) : '—', o.dur ? o.dur + ' d' : '—', vidaDe(o), o.contingencia ? 'Sim · ' + (o.risco || 0) + '%' : 'Não'])));
    }
    sec('Químicas (' + quim.length + ')');
    add(quim.length ? mailTable(headMat(quim, true), linhasMat(quim, true)) : mailP('<span style="color:#8E979D">Nenhuma química prevista.</span>'));
    if (quim.length) add(mailP('<span style="font-size:11.5px;color:#6B7280">Backup padrão: ' + hEsc(fmtNum(rec.buQuim)) + '% no volume firme; linhas em contingência sem backup, salvo ajuste.</span>'));
    sec('Casing equipment (' + cas.length + ')');
    add(cas.length ? mailTable(headMat(cas, false), linhasMat(cas, false)) : mailP('<span style="color:#8E979D">Nenhum item de casing previsto.</span>'));
    sec('Equipamentos (' + eqp.length + ')');
    var eqBordo = eqp.some(e => e.aBordo != null);
    add(eqp.length ? mailTable(['Tipo', 'Previsto'].concat(eqBordo ? ['A bordo'] : []).concat(['Solicitado', 'Observação']), eqp.map(e => [e.label || '—', hoNum(e.previsto)].concat(eqBordo ? [hoNum(e.aBordo)] : []).concat([hoNum(e.solicitado), hoContTxt(e.cont, e.chance) || '—']))) : mailP('<span style="color:#8E979D">Nenhum equipamento previsto.</span>'));
    if (rec.offshore) {
      sec('Pessoal — embarques (' + pes.length + ')');
      add(pes.length ? mailTable(['Função', 'Nº'].concat(varias ? ['Operação'] : []).concat(['Embarque', 'Desembarque', 'Observação']), pes.map(p => [p.funcao || '—', String(p.n || '')].concat(varias ? [opDe(p.opId).well || nomeOp(opDe(p.opId)) || '—'] : []).concat([p.embarqueSolicitado ? fmtD(p.embarqueSolicitado) : '—', p.desembarqueSolicitado ? fmtD(p.desembarqueSolicitado) : '—', p.cont ? 'Contingência' : '—']))) : mailP('<span style="color:#8E979D">Nenhum embarque de pessoal previsto.</span>'));
    } else {
      sec('Pessoal (' + equipe.reduce((a, n) => a + (Number(n.qty) || 0), 0) + ')');
      add(equipe.length ? mailTable(['Função', 'Quantidade'].concat(varias ? ['Operação'] : []).concat(['Observação']), equipe.map(n => [n.funcao || '—', hoNum(n.qty)].concat(varias ? [n.op.well || nomeOp(n.op) || '—'] : []).concat([hoContTxt(n.cont, n.chance) || '—']))) : mailP('<span style="color:#8E979D">Nenhum pessoal previsto.</span>'));
    }
    sec('Itens PPU previstos (' + ppu.length + ')');
    add(ppu.length ? mailTable(['Item', 'Descrição', 'Unid.', 'Quantidade'].concat(varias ? ['Operação'] : []).concat(['Observação']), ppu.map(n => [n.ref || '—', n.desc || '—', n.unit || '', hoNum(n.qty)].concat(varias ? [n.op.well || nomeOp(n.op) || '—'] : []).concat([hoContTxt(n.cont, n.chance) || '—']))) : mailP('<span style="color:#8E979D">Nenhum item PPU previsto.</span>'));
    var notas = ops.filter(o => o.notes);
    if (notas.length || rec.comentarios) {
      sec('Observações e comentários');
      notas.forEach(o => add(mailP('<b>' + hEsc(varias ? (o.well || nomeOp(o)) + ' — observações da operação' : 'Observações da operação') + ':</b><br>' + hEsc(o.notes).replace(/\n/g, '<br>'))));
      if (rec.comentarios) add(mailP('<b>Comentários do handover:</b><br>' + hEsc(rec.comentarios).replace(/\n/g, '<br>')));
    }
    add(mailP('Atenciosamente,<br><b>' + hEsc(rec.engenheiro || 'Engenharia') + '</b><br>Engenharia · Halliburton Cementing · ' + hEsc(regiao)));
    add(`<div style="border-top:1px solid #E8EAEC;margin-top:16px;padding-top:6px;font-size:10.5px;color:#9CA3AF">Handover gerado pelo EARL Engenharia em ${hEsc(fmtDH(quando))}.</div></div>`);
    var T = [];
    T.push(assunto, '');
    T.push('Prezados,', 'segue o handover da operação abaixo, com tudo o que a engenharia está solicitando para ela.' + ((rec.versao || 1) > 1 ? ' Esta é a revisão ' + rec.versao + ' e substitui as versões anteriores.' : ''), '');
    T.push('1. IDENTIFICAÇÃO');
    ident.filter(r => r[1] != null && r[1] !== '').forEach(r => T.push('- ' + r[0] + ': ' + r[1]));
    var tl = (titulo, linhas) => {
      T.push('', titulo);
      if (!linhas.length) T.push('- (nenhum)');
      linhas.forEach(x => T.push('- ' + x));
    };
    var n2 = 1;
    var tt = t => ++n2 + '. ' + t.toUpperCase();
    if (varias) tl(tt('Operações incluídas'), ops.map(o => [o.well || '—', nomeOp(o), o.date ? fmtD(o.date) : '', 'VIDA ' + vidaDe(o)].filter(Boolean).join(' · ')));
    var txtMat = (q, comLotes) => [matNm(q.sap, q.produto), 'solicitado ' + hoNum(q.solicitado) + ' ' + (q.uom || ''), 'previsto ' + hoNum(q.previsto), 'backup ' + hoNum(q.backup) + '%', q.aBordo != null ? 'a bordo ' + hoNum(q.aBordo) : '', comLotes && (q.lotes || []).length ? 'lotes ' + q.lotes.map(x => (x.lote || 's/ lote') + ': ' + fmtNum(x.qty)).join(', ') : '', hoContTxt(q.cont, q.chance), q.justificativa ? 'abaixo da diferença: ' + q.justificativa : ''].filter(Boolean).join(' · ');
    tl(tt('Químicas'), quim.map(q => txtMat(q, true)));
    tl(tt('Casing equipment'), cas.map(q => txtMat(q, false)));
    tl(tt('Equipamentos'), eqp.map(e => [e.label, 'solicitado ' + hoNum(e.solicitado), 'previsto ' + hoNum(e.previsto), hoContTxt(e.cont, e.chance)].filter(Boolean).join(' · ')));
    if (rec.offshore) tl(tt('Pessoal — embarques'), pes.map(p => [p.funcao + ' ' + (p.n || ''), 'embarque ' + (p.embarqueSolicitado ? fmtD(p.embarqueSolicitado) : '—'), 'desembarque ' + (p.desembarqueSolicitado ? fmtD(p.desembarqueSolicitado) : '—'), p.cont ? 'contingência' : ''].filter(Boolean).join(' · ')));else tl(tt('Pessoal'), equipe.map(n => [n.funcao + ' ×' + n.qty, varias ? n.op.well : '', hoContTxt(n.cont, n.chance)].filter(Boolean).join(' · ')));
    tl(tt('Itens PPU previstos'), ppu.map(n => [n.ref, n.desc, hoNum(n.qty) + ' ' + (n.unit || ''), varias ? n.op.well : '', hoContTxt(n.cont, n.chance)].filter(Boolean).join(' · ')));
    if (notas.length || rec.comentarios) {
      T.push('', tt('Observações e comentários'));
      notas.forEach(o => T.push((varias ? (o.well || nomeOp(o)) + ' — ' : '') + 'Observações da operação: ' + o.notes));
      if (rec.comentarios) T.push('Comentários do handover: ' + rec.comentarios);
    }
    T.push('', 'Atenciosamente,', rec.engenheiro || 'Engenharia', 'Engenharia · Halliburton Cementing · ' + regiao, '', 'Handover gerado pelo EARL Engenharia em ' + fmtDH(quando) + '.');
    return {
      assunto,
      arquivo,
      html,
      text: T.join('\n')
    };
  };

  /* Baixa o .eml de um handover já registrado (mesmo conteúdo e destinatários). */
  var baixarEmailHo = async h => {
    if (!h) return;
    try {
      var em = hoEmailMontar(h);
      var blob = await buildEmlBlob({
        to: h.email && h.email.para || [],
        cc: h.email && h.email.cc || [],
        subject: em.assunto,
        html: em.html,
        text: em.text
      });
      forceDownload([new File([blob], em.arquivo, {
        type: 'message/rfc822'
      })]);
      setOkMsg('✉ E-mail baixado de novo — abra o arquivo .eml no Outlook para enviar');
      setTimeout(() => setOkMsg(''), 4500);
    } catch (e) {
      setSyncErr('Falha ao gerar o e-mail: ' + (e && e.message || e));
    }
  };
  var hoMailSalvarLista = lista => updateDB(d => ({
    ...d,
    hoMail: {
      ...(d.hoMail || {}),
      emails: lista
    }
  }));

  /* Gera o e-mail, baixa o .eml e registra o handover (status 'email') na operação. */
  var gerarEmailHandover = async (hd, c, sel) => {
    if (!hd || !c || !c.ops.length) return;
    if (hoPendencias(hd, c).length || !sel.para.length) return;
    var rec = hoMontarRec({
      ...hd,
      mailNome: sel.nome
    }, c);
    var agora = new Date().toISOString();
    var envio = {
      em: agora,
      versao: rec.versao,
      para: [...sel.para],
      cc: [...sel.cc],
      por: rec.engenheiro || ''
    };
    rec.email = envio;
    var em = hoEmailMontar(rec);
    envio.assunto = em.assunto;
    envio.arquivo = em.arquivo;
    rec.envios = [...(rec.envios || []), envio];
    var blob;
    try {
      blob = await buildEmlBlob({
        to: sel.para,
        cc: sel.cc,
        subject: em.assunto,
        html: em.html,
        text: em.text
      });
    } catch (e) {
      setSyncErr('Falha ao gerar o e-mail: ' + (e && e.message || e));
      return;
    }
    forceDownload([new File([blob], em.arquivo, {
      type: 'message/rfc822'
    })]);
    var ex = hd.editId ? (db.handovers || []).find(h => h.id === hd.editId) : null;
    var saiu = ex ? (ex.opIds || []).filter(id => !rec.opIds.includes(id)) : [];
    var so = rec.salesOrder,
      wbs = rec.wbs;
    var nQ = rec.quimicos.filter(q => q.solicitado > 0).length,
      nC = rec.casing.filter(q => q.solicitado > 0).length,
      nE = rec.equipamentos.filter(e => e.solicitado > 0).length;
    var resumo = 'SO ' + (so || '—') + ' · ' + nQ + ' química(s) · ' + nC + ' casing · ' + nE + ' tipo(s) de equipamento · ' + (rec.offshore ? rec.pessoal.length + ' embarque(s)' : rec.equipe.reduce((a, n) => a + n.qty, 0) + ' pessoa(s)') + ' · versão ' + rec.versao;
    updateDB(d => {
      var hs = [...(d.handovers || [])];
      var i = hs.findIndex(h => h.id === rec.id);
      if (i >= 0) hs[i] = rec;else hs.push(rec);
      var pjs = (d.plannedJobs || []).map(j => {
        if (rec.opIds.includes(j.id)) {
          var o = rec.operacoes.find(x => x.id === j.id) || {};
          var principal = j.id === hd.pjId;
          return {
            ...j,
            handoverId: rec.id,
            hoEmailEm: agora,
            hoEmailVersao: rec.versao,
            salesOrder: principal ? so : j.salesOrder || so,
            wbs: principal ? wbs : j.wbs || wbs,
            vida: o.vida || j.vida || ''
          };
        }
        if (saiu.includes(j.id)) return {
          ...j,
          handoverId: null,
          hoEmailEm: null,
          hoEmailVersao: null
        };
        return j;
      });
      return {
        ...d,
        handovers: hs,
        hoMail: {
          ...(d.hoMail || {}),
          emails: sel.lista,
          to: sel.para,
          cc: sel.cc,
          nome: rec.engenheiro
        },
        plannedJobs: comLog(pjs, rec.opIds, logE(rec.versao > 1 ? 'Handover reenviado por e-mail (versão ' + rec.versao + ')' : 'Handover enviado por e-mail', {
          detalhe: resumo + ' · para: ' + sel.para.join(', ') + (sel.cc.length ? ' · cc: ' + sel.cc.join(', ') : ''),
          comentario: rec.comentarios
        }))
      };
    }, {
      kind: 'Handover',
      action: ex ? 'Alteração' : 'Inclusão',
      name: (rec.sonda || '—') + ' — ' + rec.operacoes.map(o => o.well || o.tipo).join(', '),
      user: rec.engenheiro || '—',
      detail: 'E-mail ' + em.assunto + ' · para ' + sel.para.join(', ')
    });
    setHoDraft(null);
    setPlanDraft(null);
    setOkMsg('✉ E-mail do handover gerado (versão ' + rec.versao + ') — abra o arquivo .eml no Outlook, confira e clique em Enviar');
    setTimeout(() => setOkMsg(''), 8000);
  };

  /* Passo final do handover: escolher destinatários e gerar o .eml. */
  var renderHoMail = (hd, c) => {
    var cfg = hoMailCfg();
    var lista = hd.mailLista != null ? hd.mailLista : cfg.emails || [];
    var para = hd.mailTo != null ? hd.mailTo : (cfg.to || []).filter(e => lista.includes(e));
    var cc = hd.mailCc != null ? hd.mailCc : (cfg.cc || []).filter(e => lista.includes(e));
    var nome = hd.mailNome != null ? hd.mailNome : cfg.nome || '';
    var novo = hd.mailNovo || '';
    var rec = hoMontarRec({
      ...hd,
      mailNome: nome
    }, c);
    var em = hoEmailMontar(rec);
    var set = patch => setHoDraft(x => ({
      ...x,
      ...patch
    }));
    var novoOk = hoEmailValido(novo);
    var igual = novoOk ? lista.find(x => x.toLowerCase() === novo.trim().toLowerCase()) : null;
    var adicionar = onde => {
      if (!novoOk) return;
      var e = igual || novo.trim();
      var l = igual ? lista : [...lista, e];
      set({
        mailLista: l,
        mailNovo: '',
        mailTo: onde === 'to' ? [...para.filter(x => x !== e), e] : para.filter(x => x !== e),
        mailCc: onde === 'cc' ? [...cc.filter(x => x !== e), e] : cc.filter(x => x !== e)
      });
      if (!igual) hoMailSalvarLista(l);
    };
    var tirar = e => {
      var l = lista.filter(x => x !== e);
      set({
        mailLista: l,
        mailTo: para.filter(x => x !== e),
        mailCc: cc.filter(x => x !== e)
      });
      hoMailSalvarLista(l);
    };
    var marcar = (e, onde) => {
      if (onde === 'to') set({
        mailTo: para.includes(e) ? para.filter(x => x !== e) : [...para, e],
        mailCc: cc.filter(x => x !== e)
      });else set({
        mailCc: cc.includes(e) ? cc.filter(x => x !== e) : [...cc, e],
        mailTo: para.filter(x => x !== e)
      });
    };
    var falta = [];
    if (!para.length) falta.push('ao menos um destinatário em “Para”');
    var nQ = rec.quimicos.length,
      nC = rec.casing.length,
      nE = rec.equipamentos.length;
    var nP = rec.offshore ? rec.pessoal.length : rec.equipe.reduce((a, n) => a + n.qty, 0);
    var nPPU = rec.operacoes.reduce((a, o) => a + o.ppu.length, 0);
    var voltar = () => set({
      step: 'itens'
    });
    return engH("div", {
      className: "overlay",
      style: {
        zIndex: 270
      },
      onClick: e => {
        if (e.target === e.currentTarget) voltar();
      }
    }, engH("div", {
      className: "modal hm-modal",
      onClick: e => e.stopPropagation()
    }, engH("div", {
      className: "modal-title"
    }, engH("span", null, "✉ E-mail do handover"), engH("button", {
      className: "modal-close",
      onClick: voltar,
      title: "Voltar aos itens"
    }, "\xD7")), engH("div", {
      className: "hm-sum"
    }, engH("div", {
      className: "hm-k"
    }, "Assunto"), engH("div", {
      className: "hm-assunto"
    }, em.assunto), engH("div", {
      className: "hm-k"
    }, "Arquivo"), engH("div", {
      className: "hm-arq"
    }, em.arquivo), rec.versao > 1 && engH("div", {
      className: "hm-rev"
    }, 'Este handover já foi enviado ' + (rec.versao - 1) + (rec.versao - 1 === 1 ? ' vez' : ' vezes') + ' — este e-mail sai como revisão ' + rec.versao + '.')), engH("div", {
      className: "hm-chips"
    }, engH("span", null, engH("b", null, nQ), ' química(s)'), engH("span", null, engH("b", null, nC), ' casing'), engH("span", null, engH("b", null, nE), ' equipamento(s)'), engH("span", null, engH("b", null, nP), rec.offshore ? ' embarque(s)' : ' pessoa(s)'), engH("span", null, engH("b", null, nPPU), ' item(ns) PPU')), engH("div", {
      className: "hm-sec"
    }, "Destinat\xE1rios"), engH("div", {
      className: "eng-help",
      style: {
        marginTop: 0
      }
    }, "Marque quem recebe em Para e em Cc. A lista fica salva para os pr\xF3ximos handovers."), engH("div", {
      className: "tbl-scroll"
    }, engH("table", {
      className: "db-table hm-tab"
    }, engH("thead", null, engH("tr", null, engH("th", {
      style: {
        width: 54
      }
    }, "Para"), engH("th", {
      style: {
        width: 54
      }
    }, "Cc"), engH("th", null, "E-mail"), engH("th", {
      style: {
        width: 40
      }
    }))), engH("tbody", null, lista.map(e => engH("tr", {
      key: e
    }, engH("td", null, engH("input", {
      type: "checkbox",
      className: "hm-to",
      checked: para.includes(e),
      onChange: () => marcar(e, 'to'),
      "aria-label": 'Para: ' + e
    })), engH("td", null, engH("input", {
      type: "checkbox",
      className: "hm-cc",
      checked: cc.includes(e),
      onChange: () => marcar(e, 'cc'),
      "aria-label": 'Cc: ' + e
    })), engH("td", {
      className: "hm-addr"
    }, e), engH("td", null, engH("button", {
      className: "btn-o hm-x",
      title: "Tirar da lista salva",
      onClick: () => tirar(e)
    }, "\xD7")))), !lista.length && engH("tr", null, engH("td", {
      colSpan: 4,
      style: {
        color: 'var(--ink-3)',
        fontStyle: 'italic'
      }
    }, "Nenhum e-mail na lista ainda — adicione abaixo."))))), engH("div", {
      className: "hm-add"
    }, engH("input", {
      className: 'ipt hm-novo' + (novo && !novoOk ? ' ipt-err' : ''),
      type: "email",
      value: novo,
      placeholder: "outro e-mail — ex.: nome@halliburton.com",
      onChange: e => set({
        mailNovo: e.target.value
      }),
      onKeyDown: e => {
        if (e.key === 'Enter') adicionar('to');
      }
    }), engH("button", {
      className: "btn-o",
      disabled: !novoOk,
      onClick: () => adicionar('to')
    }, "＋ Para"), engH("button", {
      className: "btn-o",
      disabled: !novoOk,
      onClick: () => adicionar('cc')
    }, "＋ Cc")), novo && !novoOk && engH("div", {
      className: "fld-err"
    }, "E-mail incompleto."), engH("div", {
      className: "fld",
      style: {
        marginTop: 12
      }
    }, engH("label", {
      className: "lbl"
    }, "Seu nome (assina o e-mail)"), engH("input", {
      className: "ipt hm-nome",
      value: nome,
      placeholder: "ex.: Hugo Regiani",
      onChange: e => set({
        mailNome: e.target.value
      })
    })), engH("details", {
      className: "hm-prev"
    }, engH("summary", null, "👁 Pr\xE9-visualizar o e-mail"), engH("iframe", {
      title: "Pr\xE9-visualiza\xE7\xE3o do e-mail",
      sandbox: "",
      srcDoc: '<!doctype html><meta charset="utf-8"><body style="margin:12px;background:#fff">' + em.html + '</body>'
    })), engH("div", {
      className: "eng-help"
    }, "O arquivo .eml abre no Outlook como uma mensagem pronta, com destinat\xE1rios, assunto e corpo preenchidos. Confira e clique em Enviar."), falta.length > 0 && engH("div", {
      className: "ho-pend",
      style: {
        display: 'block',
        margin: '8px 0 0'
      }
    }, 'Para gerar, falta: ' + falta.join(' · ')), engH("div", {
      style: {
        display: 'flex',
        gap: 8,
        justifyContent: 'flex-end',
        marginTop: 14,
        flexWrap: 'wrap'
      }
    }, engH("button", {
      className: "btn-o",
      onClick: voltar
    }, "← Voltar aos itens"), engH("button", {
      className: "btn-r hm-gerar",
      disabled: falta.length > 0,
      onClick: () => gerarEmailHandover(hd, c, {
        lista,
        para,
        cc,
        nome
      })
    }, "⬇ Gerar e-mail (.eml)"))));
  };

  /* Selo "✉ vN" do handover enviado, usado na lista e no formulário. */
  var hoEmailTag = j => {
    var h = handoverDoJob(j);
    if (!h || h.status !== 'email') return null;
    return engH("span", {
      className: "hm-tag",
      title: 'Handover enviado por e-mail em ' + fmtDH(h.email && h.email.em || h.atualizadoEm)
    }, '✉ handover v' + (h.versao || 1));
  };
  var hoEmailBanner = h => {
    if (!h || h.status !== 'email') return null;
    var e = h.email || {};
    return engH("div", {
      className: "hm-banner"
    }, engH("div", null, engH("b", null, '✉ Handover enviado por e-mail · versão ' + (h.versao || 1)), engH("span", null, fmtDH(e.em || h.atualizadoEm) + ((e.para || []).length ? ' · para ' + e.para.join(', ') : '') + ((e.cc || []).length ? ' · cc ' + e.cc.join(', ') : ''))), engH("button", {
      className: "btn-o",
      onClick: ev => {
        ev.stopPropagation();
        baixarEmailHo(h);
      }
    }, "⬇ Baixar o e-mail de novo"));
  };

  /* Aba "Handovers": os e-mails gerados. */
  var renderHoEmails = () => {
    var lista = (db.handovers || []).filter(h => h.status !== 'cancelado' && (!ctSel || h.contratoId === ctSel.id || pjDoContrato({
      contratoLabel: h.contratoLabel
    }, ctSel))).slice().sort((a, b) => String(b.atualizadoEm || b.criadoEm || '').localeCompare(String(a.atualizadoEm || a.criadoEm || '')));
    if (!lista.length) return engH("div", {
      className: "empty-state"
    }, engH("div", {
      className: "icon"
    }, "✉"), engH("div", {
      className: "msg"
    }, "Nenhum handover enviado"), engH("div", {
      className: "sub"
    }, "Abra uma opera\xE7\xE3o e use “Enviar Handover →”: no fim sai o e-mail (.eml) para voc\xEA enviar."));
    return engH("div", {
      className: "ho-grid"
    }, lista.map(h => {
      var pj0 = (db.plannedJobs || []).find(j => j.id === (h.opIds || [])[0]);
      var e = h.email || {};
      var em = h.status === 'email' ? hoEmailMontar(h) : null;
      return engH("div", {
        key: h.id,
        className: "ho-card hm-card",
        onClick: () => pj0 && abrirHandover(pj0)
      }, engH("div", {
        className: "ho-card-top"
      }, engH("b", null, h.sonda || '—'), hoBadge(h.status), engH("span", null, fmtDH(e.em || h.atualizadoEm || h.criadoEm))), em && engH("div", {
        className: "hm-card-ass"
      }, em.assunto), engH("div", {
        className: "rev-row"
      }, engH("span", null, "Opera\xE7\xF5es"), engH("b", null, (h.operacoes || []).map(o => [o.well, o.tipo || o.tipoOp].filter(Boolean).join(' · ')).join(', ') || '—')), engH("div", {
        className: "rev-row"
      }, engH("span", null, "Sales Order"), engH("b", null, h.salesOrder || '—')), engH("div", {
        className: "rev-row"
      }, engH("span", null, "Vers\xE3o"), engH("b", null, String(h.versao || 1) + ((h.envios || []).length > 1 ? ' · ' + h.envios.length + ' envios' : ''))), (e.para || []).length > 0 && engH("div", {
        className: "rev-row"
      }, engH("span", null, "Para"), engH("b", null, e.para.join(', '))), (e.cc || []).length > 0 && engH("div", {
        className: "rev-row"
      }, engH("span", null, "Cc"), engH("b", null, e.cc.join(', '))), engH("div", {
        className: "hm-card-acts"
      }, h.status === 'email' && engH("button", {
        className: "btn-o",
        onClick: ev => {
          ev.stopPropagation();
          baixarEmailHo(h);
        }
      }, "⬇ Baixar o e-mail"), pj0 && engH("button", {
        className: "btn-r",
        onClick: ev => {
          ev.stopPropagation();
          abrirHandover(pj0);
        }
      }, "Revisar / nova vers\xE3o →")));
    }));
  };

  /* Sondas (o cadastro do Ajustes, na região escolhida). */
  var abrirEngSondas = () => {
    setRigAmbTab((db.rigs || []).some(r => r.active !== false && rigAmbiente(r) === 'onshore') ? 'onshore' : 'offshore');
    setEngSondas(true);
  };
  var renderEngSondas = () => {
    if (!engSondas || !hubLocation) return null;
    return engH("div", {
      className: "overlay",
      style: {
        zIndex: 240
      },
      onClick: e => {
        if (e.target === e.currentTarget) setEngSondas(false);
      }
    }, engH("div", {
      className: "modal eng-sondas-modal",
      onClick: e => e.stopPropagation()
    }, engH("div", {
      className: "modal-title"
    }, engH("span", null, 'Sondas'), engH("button", {
      className: "modal-close",
      onClick: () => setEngSondas(false)
    }, "\xD7")), renderDBRigs()));
  };

  /* Exportar / importar dados: o app é offline e os dados ficam só neste navegador. Para levar a outro
     computador, exporta-se um .json com tudo e importa-se lá — substituindo ou juntando (fica o registro
     mais recente de cada item: operações, handovers, contratos, sondas, templates…). */
  var [engImpDados, setEngImpDados] = useState(null);
  var engAgoraTxt = () => {
    var d = new Date(),
      p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '_' + p(d.getHours()) + 'h' + p(d.getMinutes());
  };
  var engResumoDb = d => ({
    contratos: (d.contratos || []).filter(c => c && !c.archived).length,
    precos: (d.contratos || []).reduce((a, c) => a + (c.items || []).filter(i => i.brl != null || i.usd != null).length, 0),
    reajustes: (d.contratos || []).reduce((a, c) => a + (c.reajustes || []).length, 0),
    operacoes: (d.plannedJobs || []).length,
    consumos: (d.plannedJobs || []).filter(j => j.ppuCons).length,
    handovers: (d.handovers || []).length,
    sondas: (d.rigs || []).length,
    templates: (d.opTemplates || []).length
  });
  var engExportar = () => {
    try {
      var blob = new Blob([JSON.stringify({
        app: 'EARL Engenharia',
        versao: EARL_VERSION,
        geradoEm: new Date().toISOString(),
        por: (db.hoMail || {}).nome || '',
        resumo: engResumoDb(db),
        db
      })], {
        type: 'application/json'
      });
      forceDownload([new File([blob], 'EARL_Engenharia_dados_' + engAgoraTxt() + '.json', {
        type: 'application/json'
      })]);
      setOkMsg('Dados exportados ✓ — leve o arquivo .json para o outro computador e use “⬆ Importar dados” lá');
      setTimeout(() => setOkMsg(''), 6000);
    } catch (e) {
      setSyncErr('Falha ao exportar os dados: ' + (e && e.message || e));
    }
  };
  var engImportarArquivo = file => {
    if (!file) return;
    var r = new FileReader();
    r.onload = () => {
      try {
        var j = JSON.parse(String(r.result || ''));
        var dados = j && j.db ? j.db : j;
        if (!dados || typeof dados !== 'object' || !Array.isArray(dados.people) || !Array.isArray(dados.rigs)) throw new Error('o arquivo não é uma exportação do EARL');
        setEngImpDados({
          nome: file.name,
          dados,
          geradoEm: j && j.geradoEm || '',
          por: j && j.por || ''
        });
      } catch (e) {
        setSyncErr('Não foi possível importar: ' + (e && e.message || e));
      }
    };
    r.readAsText(file);
  };
  /* Junta dois bancos: listas com id são unidas e, no mesmo id, fica o registro alterado por último. */
  var engMarca = x => {
    if (!x || typeof x !== 'object') return '';
    var l = [x.updatedAt, x.atualizadoEm, x.criadoEm, x.createdAt, x.ppuCons && x.ppuCons.em, x.email && x.email.em];
    (x.log || []).forEach(e => l.push(e && e.em));
    return l.filter(v => typeof v === 'string').sort().pop() || '';
  };
  var engMesclarDb = (atual, novo) => {
    var out = {
      ...atual
    };
    Object.keys(novo || {}).forEach(k => {
      var a = atual[k],
        b = novo[k];
      if (a == null) {
        out[k] = b;
        return;
      }
      var comId = l => Array.isArray(l) && l.every(x => x && typeof x === 'object' && x.id != null);
      if (Array.isArray(a) && Array.isArray(b) && comId(a) && comId(b)) {
        var m = new Map();
        a.forEach(x => m.set(x.id, x));
        b.forEach(x => {
          var y = m.get(x.id);
          if (!y || engMarca(x) > engMarca(y)) m.set(x.id, x);
        });
        out[k] = [...m.values()];
        return;
      }
      if (k === 'hoMail' && a && b && typeof a === 'object') out[k] = {
        ...b,
        ...a,
        emails: [...new Set([...(a.emails || []), ...(b.emails || [])])]
      };
    });
    return out;
  };
  var renderEngImpDados = () => {
    var im = engImpDados;
    if (!im) return null;
    var ra = engResumoDb(db),
      rb = engResumoDb(im.dados),
      rj = engResumoDb(engMesclarDb(db, im.dados));
    var linhas = [['Contratos', 'contratos'], ['Itens com valor', 'precos'], ['Reajustes', 'reajustes'], ['Operações', 'operacoes'], ['Consumos lançados', 'consumos'], ['Handovers', 'handovers'], ['Sondas', 'sondas'], ['Templates', 'templates']];
    var aplicar = modo => {
      var final = modo === 'juntar' ? engMesclarDb(db, im.dados) : im.dados;
      if (!saveDB(final)) {
        setSyncErr('O navegador não deixou gravar os dados (armazenamento cheio).');
        return;
      }
      location.reload();
    };
    var fechar = () => setEngImpDados(null);
    return engH("div", {
      className: "overlay",
      style: {
        zIndex: 300
      },
      onClick: e => {
        if (e.target === e.currentTarget) fechar();
      }
    }, engH("div", {
      className: "modal ec-imp-dados",
      onClick: e => e.stopPropagation()
    }, engH("div", {
      className: "modal-title"
    }, engH("span", null, "⬆ Importar dados"), engH("button", {
      className: "modal-close",
      onClick: fechar
    }, "\xD7")), engH("div", {
      className: "hm-sum"
    }, engH("div", {
      className: "hm-k"
    }, "Arquivo"), engH("div", {
      className: "hm-arq"
    }, im.nome), im.geradoEm && engH("div", {
      className: "hm-k"
    }, "Exportado"), im.geradoEm && engH("div", {
      className: "hm-arq"
    }, fmtDH(im.geradoEm) + (im.por ? ' · ' + im.por : ''))), engH("div", {
      className: "tbl-scroll"
    }, engH("table", {
      className: "db-table ec-imp-tab"
    }, engH("thead", null, engH("tr", null, engH("th", null), engH("th", null, "Neste computador"), engH("th", null, "No arquivo"), engH("th", null, "Depois de juntar"))), engH("tbody", null, linhas.map(([rot, k]) => engH("tr", {
      key: k
    }, engH("td", null, rot), engH("td", {
      className: "ec-num"
    }, ra[k]), engH("td", {
      className: "ec-num"
    }, rb[k]), engH("td", {
      className: "ec-num"
    }, rj[k])))))), engH("div", {
      className: "ec-imp-opcoes"
    }, engH("div", {
      className: "ec-imp-op"
    }, engH("b", null, "Juntar"), engH("span", null, "Acrescenta o que veio do arquivo ao que j\xE1 est\xE1 aqui. Quando o mesmo registro (opera\xE7\xE3o, handover, contrato, sonda…) existe nos dois, fica o alterado por \xFAltimo. O que foi apagado num computador volta ao juntar."), engH("button", {
      className: "btn-r ec-juntar",
      onClick: () => aplicar('juntar')
    }, "Juntar com os dados deste computador")), engH("div", {
      className: "ec-imp-op"
    }, engH("b", null, "Substituir"), engH("span", null, "Os dados deste computador passam a ser exatamente os do arquivo. Use para levar tudo para um computador novo."), engH("button", {
      className: "btn-o ec-substituir",
      onClick: () => askConfirm({
        title: 'Substituir os dados',
        okLabel: 'Substituir',
        danger: true,
        msg: engH("span", null, "Apagar os dados deste computador e ficar com os do arquivo?"),
        hint: 'Se tiver dúvida, exporte os dados daqui antes.',
        onOk: () => aplicar('substituir')
      })
    }, "Substituir pelos dados do arquivo"))), engH("div", {
      className: "ec-foot"
    }, engH("span", {
      style: {
        flex: 1
      }
    }), engH("button", {
      className: "btn-o",
      onClick: fechar
    }, "Cancelar"))));
  };
  var renderEngTools = () => hubLocation ? engH("div", {
    className: "eng-tools"
  }, engH("button", {
    className: "btn-o",
    onClick: abrirEngContratos,
    title: "Contratos, itens PPU, valores em R$ e US$ e reajustes"
  }, "Contratos"), engH("button", {
    className: "btn-o",
    onClick: abrirEngSondas,
    title: "Cadastro de sondas"
  }, "Sondas"), engH("button", {
    className: "btn-o eng-exportar",
    onClick: engExportar,
    title: "Baixa um arquivo .json com todos os dados (contratos, valores, reajustes, opera\xE7\xF5es, consumos, handovers, sondas e templates) para guardar ou levar para outro computador"
  }, "⬇ Exportar dados"), engH("button", {
    className: "btn-o eng-importar",
    onClick: () => engRestRef.current && engRestRef.current.click(),
    title: "Carrega um arquivo exportado de outro computador (juntar ou substituir)"
  }, "⬆ Importar dados"), engH("input", {
    ref: engRestRef,
    type: "file",
    accept: "application/json,.json",
    style: {
      display: 'none'
    },
    onChange: e => {
      var f = e.target.files && e.target.files[0];
      e.target.value = '';
      engImportarArquivo(f);
    }
  })) : null;
  /* =================== fim EARL ENGENHARIA (avulso) =================== */
