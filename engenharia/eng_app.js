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
  /* e10: a linha guarda a chance de acontecer (como no EARL); o e-mail mostra o risco de não acontecer = 100 − chance */
  var hoContTxt = (cont, ch) => cont ? 'Contingência' + (ch != null && ch !== '' ? ' · risco ' + fmtNum(Math.max(0, Math.min(100, 100 - Number(ch)))) + '%' : '') : '';
  /* operação em contingência: registros novos guardam riscoNao (risco de não acontecer = risco da receita/COGS);
     os antigos, só a chance (campo risco) */
  var hoOpCont = (o, curto) => !o.contingencia ? 'Não' : o.riscoNao != null ? 'Sim · risco ' + (curto ? '' : 'de não acontecer ') + fmtNum(o.riscoNao) + '%' : 'Sim · chance ' + (o.risco || 0) + '%';

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
      riscoNao: j.contingencia ? Math.max(0, Math.min(100, Number(j.riscoRec) || 0)) : null,
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
      sonda: rigFmt(rig) || '', // e10: NOME PETROBRAS - NOME DA SONDA
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
    var ident = [['Cliente', rec.clienteName], ['Contrato', [rec.contratoLabel, rec.contratoNumero].filter(Boolean).join(' · ')], ['Sonda', [rec.sonda || '—', rec.offshore ? 'offshore' : 'onshore', rec.base].filter(Boolean).join(' · ')], ['Poço', o0.well || '—'], ['Operação', nomeOp(o0) || '—'], ['Data prevista', o0.date ? fmtD(o0.date) : '—'], ['Duração prevista', o0.dur ? o0.dur + (o0.dur === 1 ? ' dia' : ' dias') : ''], ['Sales Order (SO)', rec.salesOrder || '—'], ['WBS', rec.wbs || ''], ['Nº VIDA', vidaDe(o0)], ['Contingência', hoOpCont(o0)], ['Versão do handover', String(rec.versao || 1)], ['Engenheiro responsável', rec.engenheiro || ''], ['Gerado em', fmtDH(quando)]];
    /* e10: as químicas sempre com a coluna "Saldo na sonda" (última contagem do Inventário das sondas, ou o DAR);
       o casing só quando houver saldo */
    var temBordo = (l, comLotes) => comLotes || (l || []).some(q => q.aBordo != null);
    var linhasMat = (l, comLotes) => (l || []).map(q => {
      var r = [q.sap || '—', q.produto || '—', q.uom || '', hoNum(q.previsto), hoNum(q.backup) + '%', hoNum(q.necessidade)];
      if (temBordo(l, comLotes)) r.push(hoNum(q.aBordo));
      r.push(hoNum(q.solicitado));
      r.push(q.embalagem ? q.embalagem.tipo + ' ' + fmtNum(q.embalagem.cap) + ' ' + (q.embalagem.uom || '') + (q.embalagem.n ? ' · ' + fmtNum(q.embalagem.n) + ' emb.' : '') : '—');
      if (comLotes) r.push((q.lotes || []).length ? q.lotes.map(x => (x.lote || 's/ lote') + ': ' + fmtNum(x.qty)).join(' · ') : '—');
      r.push([hoContTxt(q.cont, q.chance), q.justificativa ? 'Abaixo da diferença: ' + q.justificativa : ''].filter(Boolean).join(' · ') || '—');
      return r;
    });
    var headMat = (l, comLotes) => {
      var h = ['SAP', 'Produto', 'Unid.', 'Previsto', 'Backup', 'Necessidade'];
      if (temBordo(l, comLotes)) h.push('Saldo na sonda');
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
      add(mailTable(['Poço', 'Operação', 'Data', 'Duração', 'Nº VIDA', 'Contingência'], ops.map(o => [o.well || '—', nomeOp(o) || '—', o.date ? fmtD(o.date) : '—', o.dur ? o.dur + ' d' : '—', vidaDe(o), hoOpCont(o, true)])));
    }
    sec('Químicas (' + quim.length + ')');
    add(quim.length ? mailTable(headMat(quim, true), linhasMat(quim, true)) : mailP('<span style="color:#8E979D">Nenhuma química prevista.</span>'));
    if (quim.length) add(mailP('<span style="font-size:11.5px;color:#6B7280">Backup padrão: ' + hEsc(fmtNum(rec.buQuim)) + '% no volume firme; linhas em contingência sem backup, salvo ajuste. Saldo na sonda: ' + hEsc(rec.aBordoFonte || 'sem contagem de inventário desta sonda (—)') + '.</span>'));
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
    add(`<div style="border-top:1px solid #E8EAEC;margin-top:16px;padding-top:6px;font-size:10.5px;color:#9CA3AF">Handover gerado pelo EARL Forecast em ${hEsc(fmtDH(quando))}.</div></div>`);
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
    var txtMat = (q, comLotes) => [matNm(q.sap, q.produto), 'solicitado ' + hoNum(q.solicitado) + ' ' + (q.uom || ''), 'previsto ' + hoNum(q.previsto), 'backup ' + hoNum(q.backup) + '%', q.aBordo != null ? 'saldo na sonda ' + hoNum(q.aBordo) : comLotes ? 'saldo na sonda —' : '', comLotes && (q.lotes || []).length ? 'lotes ' + q.lotes.map(x => (x.lote || 's/ lote') + ': ' + fmtNum(x.qty)).join(', ') : '', hoContTxt(q.cont, q.chance), q.justificativa ? 'abaixo da diferença: ' + q.justificativa : ''].filter(Boolean).join(' · ');
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
    T.push('', 'Atenciosamente,', rec.engenheiro || 'Engenharia', 'Engenharia · Halliburton Cementing · ' + regiao, '', 'Handover gerado pelo EARL Forecast em ' + fmtDH(quando) + '.');
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
  // e21: "＋ Adicionar arquivos" na janela de importar e arrastar os .json para a tela
  var engImpSomarRef = useRef(false),
    engImpSeqRef = useRef(0),
    engImpFnRef = useRef(null);
  var [engArrastando, setEngArrastando] = useState(false);
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
    templates: (d.opTemplates || []).length,
    quimicos: (d.quimicos || []).length,
    casing: (d.casingEquip || []).length,
    inventarios: (d.invSondas || []).length
  });
  /* e20 (pedido do Hugo, 27/11/2026): "⬇ Exportar dados" gera UM ARQUIVO .json POR CONTRATO (os ativos marcados; os
     arquivados não vão), com o nome EARL_FORECAST_<CLIENTE>_<CONTRATO>_AAAA.MM.DD_HHhMM.json ("h" no lugar de ":", que o
     Windows não aceita em nome de arquivo). Cada arquivo leva o contrato (itens, valores, reajustes), as operações dele
     com consumos e handovers, o inventário das sondas dele e as bases comuns (sondas, câmbio, químicos, casing, logos).
     Sem contrato ativo, sai um arquivo só, com tudo (EARL_FORECAST_SEM-CONTRATOS_…). */
  var engLimpaNomeArq = t => String(t || '').normalize('NFD').replace(/[^\x00-\x7F]/g, '').replace(/[^A-Za-z0-9&]+/g, '-').replace(/^-+|-+$/g, '').toUpperCase();
  var engCarimboArq = () => {
    var d = new Date(),
      p2 = x => String(x).padStart(2, '0');
    return d.getFullYear() + '.' + p2(d.getMonth() + 1) + '.' + p2(d.getDate()) + '_' + p2(d.getHours()) + 'h' + p2(d.getMinutes());
  };
  var engNomeArqCt = (c, quando) => 'EARL_FORECAST_' + (engLimpaNomeArq(c && c.clientName) || 'SEM-CLIENTE') + '_' + (engLimpaNomeArq(c && c.name) || 'CONTRATO') + '_' + (quando || engCarimboArq()) + '.json';
  var engDbDoContrato = c => {
    var jobs = (db.plannedJobs || []).filter(j => pjDoContrato(j, c));
    var jIds = new Set(jobs.map(j => j.id));
    return {
      ...db,
      contratos: [c],
      plannedJobs: jobs,
      handovers: (db.handovers || []).filter(h => (h.opIds || []).length && h.opIds.every(id => jIds.has(id))),
      invSondas: (db.invSondas || []).filter(v => v.ctId === c.id),
      opTemplates: (db.opTemplates || []).filter(t => !t.contratoId || t.contratoId === c.id)
    };
  };
  var engArqExport = (out, cts, nome, extra) => {
    var blob = new Blob([JSON.stringify({
      ...(extra || {}),
      app: 'EARL Forecast',
      versao: EARL_VERSION,
      geradoEm: new Date().toISOString(),
      por: (db.hoMail || {}).nome || '',
      resumo: engResumoDb(out),
      contratos: cts.map(c => ({
        id: c.id,
        nome: c.name,
        cliente: c.clientName || '',
        numero: c.numero || '',
        operacoes: (out.plannedJobs || []).filter(j => pjDoContrato(j, c)).length
      })),
      db: out
    })], {
      type: 'application/json'
    });
    return new File([blob], nome, {
      type: 'application/json'
    });
  };
  var engExportar = (ids, gids) => {
    try {
      var ativos = (db.contratos || []).filter(c => !c.archived);
      var sel = Array.isArray(ids) ? ativos.filter(c => ids.includes(c.id)) : ativos;
      var quando = engCarimboArq();
      // e22: e um arquivo por grupo marcado (todos os contratos do grupo juntos)
      var grs = (engCardsCfg().grupos || []).filter(g => (gids || []).includes(g.id));
      var arqs = ativos.length ? sel.map(c => engArqExport(engDbDoContrato(c), [c], engNomeArqCt(c, quando))).concat(grs.map(g => engArqGrupo(g, quando))) : [engArqExport(db, [], 'EARL_FORECAST_SEM-CONTRATOS_' + quando + '.json')];
      // um arquivo de cada vez (o navegador pode perguntar se a página pode baixar vários arquivos: "Permitir")
      arqs.forEach((f, i) => setTimeout(() => forceDownload([f]), i * 400));
      var nOps = sel.reduce((a, c) => a + (db.plannedJobs || []).filter(j => pjDoContrato(j, c)).length, 0);
      setOkMsg(sel.length || grs.length ? 'Dados exportados ✓ — ' + arqs.length + ' arquivo(s)' + (sel.length ? ', um por contrato (' + nOps + ' operação(ões) com consumos e handovers, inventário, sondas, câmbio, químicos e casing)' : '') + (grs.length ? (sel.length ? ' e ' : ': ') + grs.length + ' de grupo(s) (' + grs.map(g => g.nome).join(', ') + ')' : '') + (arqs.length > 1 ? '. Se o navegador perguntar se pode baixar vários arquivos, clique em “Permitir”' : '') + '. No outro arquivo (o de quem junta os contratos), use “⬆ Importar dados”: os contratos entram nos Indicadores.' : 'Dados exportados ✓ — sem contrato ativo: um arquivo com as sondas, o câmbio, os químicos e o casing.');
      setTimeout(() => setOkMsg(''), 8000);
    } catch (e) {
      setSyncErr('Falha ao exportar os dados: ' + (e && e.message || e));
    }
  };
  /* e20 (pedido do Hugo): dá para escolher vários arquivos .json de uma vez (um por contrato, como sai o exportar).
     Os contratos de todos aparecem na mesma janela; os arquivos entram do exportado primeiro ao último, então, se o
     mesmo contrato estiver em mais de um, fica o mais recente. Chave de cada contrato: "<nº do arquivo>|<id>". */
  var engImportarArquivo = (files, somar) => {
    var l = (Array.isArray(files) ? files : files && files.length != null && typeof files !== 'string' && !(files instanceof Blob) ? Array.from(files) : [files]).filter(Boolean);
    if (!l.length) return;
    Promise.all(l.map(file => new Promise(res => {
      var r = new FileReader();
      r.onload = () => {
        try {
          var j = JSON.parse(String(r.result || ''));
          var dados = j && j.db ? j.db : j;
          if (!dados || typeof dados !== 'object' || !Array.isArray(dados.people) || !Array.isArray(dados.rigs)) throw new Error('não é uma exportação do EARL');
          res({
            nome: file.name,
            dados,
            geradoEm: j && j.geradoEm || '',
            por: j && j.por || '',
            grupo: j && j.grupo && j.grupo.nome ? j.grupo : null // e22: arquivo de um grupo de contratos
          });
        } catch (e) {
          res({
            nome: file.name,
            erro: e && e.message || String(e)
          });
        }
      };
      r.onerror = () => res({
        nome: file.name,
        erro: 'não foi possível ler'
      });
      r.readAsText(file);
    }))).then(rs => {
      var ruins = rs.filter(x => x.erro);
      var novos = rs.filter(x => !x.erro).map(x => ({
        ...x,
        k: 'a' + ++engImpSeqRef.current
      }));
      if (ruins.length) setSyncErr('Não foi possível importar ' + ruins.map(x => '“' + x.nome + '” (' + x.erro + ')').join(', ') + (novos.length ? '. Os outros arquivos estão na janela.' : '.'));
      if (!novos.length) return;
      // e21: somar à janela aberta (o mesmo arquivo de novo não entra duas vezes)
      setEngImpDados(prev => {
        var base = somar && prev && prev.arqs ? prev.arqs : [];
        var mesmo = (a, b) => a.nome === b.nome && String(a.geradoEm) === String(b.geradoEm);
        var entram = novos.filter(n => !base.some(b => mesmo(b, n)));
        var arqs = base.concat(entram).sort((a, b) => String(a.geradoEm).localeCompare(String(b.geradoEm)));
        var sel = (somar && prev && prev.arqs ? prev.sel || [] : []).concat(...entram.map(a => (a.dados.contratos || []).filter(c => !c.archived).map(c => a.k + '|' + c.id)));
        return {
          ...(somar && prev && prev.arqs ? prev : {}),
          arqs,
          nome: arqs.length === 1 ? arqs[0].nome : arqs.length + ' arquivos',
          dados: arqs[0].dados,
          geradoEm: arqs.length === 1 ? arqs[0].geradoEm : '',
          por: arqs.length === 1 ? arqs[0].por : '',
          sel
        };
      });
    });
  };
  engImpFnRef.current = engImportarArquivo;
  // arrastar os .json para a tela (de qualquer lugar do Forecast): abre a janela de importar ou soma a ela
  useEffect(() => {
    var temArq = e => {
      var t = e.dataTransfer && e.dataTransfer.types;
      return !!t && Array.prototype.indexOf.call(t, 'Files') >= 0;
    };
    var saiu = 0;
    var over = e => {
      if (!temArq(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      setEngArrastando(true);
      clearTimeout(saiu);
      saiu = setTimeout(() => setEngArrastando(false), 400);
    };
    var drop = e => {
      if (!temArq(e)) return;
      e.preventDefault(); // sem isso o navegador abriria o arquivo no lugar do Forecast
      clearTimeout(saiu);
      setEngArrastando(false);
      var l = Array.from(e.dataTransfer.files || []);
      var js = l.filter(f => /\.json$/i.test(f.name));
      if (js.length) engImpFnRef.current && engImpFnRef.current(js, true);else if (l.length) setSyncErr('Para importar, solte os arquivos .json exportados pelo Forecast (“⬇ Exportar dados”).');
    };
    window.addEventListener('dragover', over);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragover', over);
      window.removeEventListener('drop', drop);
      clearTimeout(saiu);
    };
  }, []);
  // aplica os arquivos um depois do outro (do exportado primeiro ao último), só com os contratos marcados de cada um
  var engImportarVarios = (im, sel, cambioArq) => {
    var cur = db,
      rel = [];
    (im.arqs || []).forEach((a, i) => {
      var pre = (a.k || i) + '|';
      var ids = (sel || []).filter(k => k.indexOf(pre) === 0).map(k => k.slice(pre.length));
      if (!ids.length) return;
      var r = engImportarContratos(cur, a.dados, ids, {
        cambioArq
      });
      cur = r.db;
      // e22: arquivo de um grupo: o grupo (mesmo nome) passa a ter os contratos importados
      if (a.grupo && a.grupo.nome) {
        var nomesImp = (a.dados.contratos || []).filter(c => ids.includes(c.id)).map(c => engNormNome(c.name));
        var dest = (cur.contratos || []).filter(c => !c.archived && nomesImp.includes(engNormNome(c.name))).map(c => c.id);
        if (dest.length) {
          var cfg0 = cur.engCards && typeof cur.engCards === 'object' ? cur.engCards : {
            ordem: [],
            grupos: []
          };
          var grs = (cfg0.grupos || []).map(g => ({
            ...g,
            ctIds: (g.ctIds || []).filter(x => !dest.includes(x))
          }));
          var g0 = grs.find(g => engNormNome(g.nome) === engNormNome(a.grupo.nome));
          if (g0) g0.ctIds = g0.ctIds.concat(dest);else grs.push({
            id: 'gr_' + uid(),
            nome: a.grupo.nome,
            ctIds: dest
          });
          cur = {
            ...cur,
            engCards: {
              ...cfg0,
              ordem: (cfg0.ordem || []).filter(k => !dest.includes(String(k).slice(3))),
              grupos: grs
            }
          };
        }
      }
      rel = rel.concat(r.rel.map(x => ({
        ...x,
        arquivo: a.nome
      })));
    });
    if ((im.arqs || []).length > 1) {
      // o que acontece com o que está AQUI (antes de importar): no mesmo contrato em 2 arquivos, vale o último
      var u = [];
      rel.forEach(x => {
        var locO = engCtAqui(db.contratos || [], {
          name: x.nome,
          id: x.srcId
        });
        var y = {
          ...x,
          substituido: !!locO,
          nomeAqui: locO ? locO.name : '',
          sairam: locO ? (db.plannedJobs || []).filter(j => pjDoContrato(j, locO)).length : 0
        };
        var k = u.findIndex(z => engNormNome(z.nome) === engNormNome(x.nome));
        if (k >= 0) u[k] = y;else u.push(y);
      });
      rel = u;
    }
    return {
      db: cur,
      rel
    };
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
      if (k === 'clientLogos' && a && b && typeof a === 'object' && typeof b === 'object') {
        var lg = {
          ...a
        };
        Object.keys(b).forEach(c => {
          if (!lg[c] || String(b[c] && b[c].updatedAt || '') > String(lg[c] && lg[c].updatedAt || '')) lg[c] = b[c];
        });
        out[k] = lg;
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
  /* ---- e15: importar = contrato por contrato (pedido do Hugo, 24/11/2026) ----
     O arquivo exportado leva tudo (o banco inteiro). Ao importar, para cada contrato marcado:
       * já existe aqui (mesmo nome; ou o mesmo id) → o contrato daqui é SUBSTITUÍDO pelo do arquivo, e as operações
         dele também: as daqui saem (com consumos, handovers, contagens de inventário e templates do contrato) e
         entram as do arquivo;
       * não existe → entra como contrato novo, com as operações.
     Os outros contratos daqui não mudam. Junto vêm as sondas que as operações usam e os bancos (químicos, casing,
     clientes, logos, e-mails), ficando o registro alterado por último; o câmbio fica o lançado por último em cada mês.
     O id do contrato daqui é mantido (as referências continuam valendo); operação, handover, contagem e template com
     id repetido ganham id novo. */
  var engNormNome = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  var engNovoId = pre => pre + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  /* contrato daqui que corresponde ao do arquivo: o ativo de mesmo nome; senão o de mesmo id; senão um arquivado de
     mesmo nome (o cadastro do EARL traz cópias arquivadas com os mesmos nomes) */
  var engCtAqui = (lista, ct) => {
    var l = lista || [],
      n = engNormNome(ct.name);
    return l.find(c => !c.archived && engNormNome(c.name) === n) || l.find(c => c.id === ct.id) || l.find(c => engNormNome(c.name) === n) || null;
  };
  var engCtsArquivo = d => (d.contratos || []).map(ct => ({
    ct,
    ops: (d.plannedJobs || []).filter(j => pjDoContrato(j, ct)).length
  })).filter(x => !x.ct.archived || x.ops > 0);
  /* câmbio: um por mês, vale para todos os contratos do arquivo. Por padrão fica o daqui (os outros contratos não
     mudam) e só entram os meses que faltam; com "usar o câmbio do arquivo", os meses diferentes ficam com o do arquivo. */
  var engCambioDif = (atual, novo) => {
    var aqui = {};
    (atual.cambio || []).forEach(c => {
      if (c && c.ano != null) aqui[c.ano + '-' + c.mes] = c;
    });
    return (novo.cambio || []).filter(c => {
      var a = c && aqui[c.ano + '-' + c.mes];
      return a && Number(a.valor) !== Number(c.valor);
    }).map(c => ({
      ano: c.ano,
      mes: c.mes,
      arquivo: Number(c.valor),
      aqui: Number(aqui[c.ano + '-' + c.mes].valor)
    })).sort((a, b) => a.ano - b.ano || a.mes - b.mes);
  };
  var engImportarContratos = (atual, novo, ids, op) => {
    var cambioArq = !!(op && op.cambioArq);
    var GLOBAIS = ['quimicos', 'quimHist', 'casingEquip', 'casHist', 'clients', 'people', 'equipment', 'wells', 'clientLogos', 'hoMail', 'subtypesPeople', 'subtypesEquip'];
    var base = {};
    GLOBAIS.forEach(k => {
      if (novo[k] != null) base[k] = novo[k];
    });
    var out = engMesclarDb(atual, base);
    var cts = [...(out.contratos || [])],
      jobs = [...(out.plannedJobs || [])],
      hos = [...(out.handovers || [])],
      inv = [...(out.invSondas || [])],
      tpls = [...(out.opTemplates || [])],
      rigs = [...(out.rigs || [])];
    var apagados = Array.isArray(out.ctApagados) ? out.ctApagados.slice() : [];
    var rel = [];
    var poeSonda = id => {
      if (!id || rigs.some(r => r.id === id)) return;
      var r = (novo.rigs || []).find(x => x.id === id);
      if (r) rigs.push(r);
    };
    (novo.contratos || []).filter(c => ids.indexOf(c.id) >= 0).forEach(src => {
      var loc = engCtAqui(cts, src);
      var dest = loc ? loc.id : cts.some(c => c.id === src.id) ? engNovoId('ct_') : src.id;
      var srcOps = (novo.plannedJobs || []).filter(j => pjDoContrato(j, src));
      var locOps = loc ? jobs.filter(j => pjDoContrato(j, loc)) : [];
      var fora = new Set(locOps.map(j => j.id));
      jobs = jobs.filter(j => !fora.has(j.id));
      hos = hos.filter(h => !((h.opIds || []).length && h.opIds.every(id => fora.has(id))));
      if (loc) {
        inv = inv.filter(v => v.ctId !== loc.id);
        tpls = tpls.filter(t => t.contratoId !== loc.id);
      }
      var mapa = {},
        usados = new Set(jobs.map(j => j.id));
      srcOps.forEach(j => {
        var id = usados.has(j.id) ? engNovoId('pj_') : j.id;
        mapa[j.id] = id;
        usados.add(id);
      });
      var mapaH = {},
        hUs = new Set(hos.map(h => h.id));
      var srcHos = (novo.handovers || []).filter(h => (h.opIds || []).length && h.opIds.every(id => id in mapa));
      srcHos.forEach(h => {
        var id = hUs.has(h.id) ? engNovoId('ho_') : h.id;
        mapaH[h.id] = id;
        hUs.add(id);
      });
      var mapaT = {},
        tUs = new Set(tpls.map(t => t.id));
      var srcTpls = (novo.opTemplates || []).filter(t => t.contratoId === src.id);
      srcTpls.forEach(t => {
        var id = tUs.has(t.id) ? engNovoId('tpl_') : t.id;
        mapaT[t.id] = id;
        tUs.add(id);
      });
      hos = hos.concat(srcHos.map(h => ({
        ...h,
        id: mapaH[h.id],
        opIds: h.opIds.map(id => mapa[id])
      })));
      tpls = tpls.concat(srcTpls.map(t => ({
        ...t,
        id: mapaT[t.id],
        contratoId: dest
      })));
      jobs = jobs.concat(srcOps.map(j => {
        poeSonda(j.rigId);
        return {
          ...j,
          id: mapa[j.id],
          contratoId: dest,
          handoverId: j.handoverId ? mapaH[j.handoverId] || null : j.handoverId,
          templateId: j.templateId && mapaT[j.templateId] || j.templateId
        };
      }));
      var iUs = new Set(inv.map(v => v.id));
      (novo.invSondas || []).filter(v => v.ctId === src.id).forEach(v => {
        poeSonda(v.rigId);
        var id = iUs.has(v.id) ? engNovoId('inv_') : v.id;
        iUs.add(id);
        inv.push({
          ...v,
          id,
          ctId: dest
        });
      });
      var novoCt = {
        ...src,
        id: dest
      };
      cts = loc ? cts.map(c => c.id === loc.id ? novoCt : c) : cts.concat([novoCt]);
      apagados = apagados.filter(x => x && x.id !== dest);
      rel.push({
        nome: src.name,
        srcId: src.id,
        substituido: !!loc,
        nomeAqui: loc ? loc.name : '',
        sairam: locOps.length,
        entraram: srcOps.length
      });
    });
    /* contagens de inventário sem contrato (feitas na Visão geral): entram as que não existem aqui; no mesmo id, a mais recente */
    var ctsArq = new Set((novo.contratos || []).map(c => c.id));
    (novo.invSondas || []).filter(v => !v.ctId || !ctsArq.has(v.ctId)).forEach(v => {
      var k = inv.findIndex(x => x.id === v.id);
      if (k < 0) {
        poeSonda(v.rigId);
        inv.push(v);
      } else if (engMarca(v) > engMarca(inv[k])) inv[k] = v;
    });
    var cb = {};
    (atual.cambio || []).forEach(c => {
      if (c && c.ano != null && c.mes != null) cb[c.ano + '-' + c.mes] = c;
    });
    (novo.cambio || []).forEach(c => {
      if (!c || c.ano == null || c.mes == null) return;
      var k = c.ano + '-' + c.mes;
      if (!cb[k] || cambioArq) cb[k] = c;
    });
    return {
      db: {
        ...out,
        contratos: cts,
        plannedJobs: jobs,
        handovers: hos,
        invSondas: inv,
        opTemplates: tpls,
        rigs,
        cambio: Object.values(cb),
        ctApagados: apagados
      },
      rel
    };
  };
  /* aviso que sobrevive ao recarregar (importar recarrega a página) */
  useEffect(() => {
    try {
      var f = sessionStorage.getItem('eng_aviso');
      if (f) {
        sessionStorage.removeItem('eng_aviso');
        setOkMsg(f);
        setTimeout(() => setOkMsg(''), 9000);
      }
    } catch (e) {}
  }, []);
  var renderEngImpDados = () => engH(React.Fragment, null, engArrastando && engH("div", {
    className: "eng-soltar"
  }, engH("div", null, engH("b", null, "⬆ Solte aqui os arquivos .json"), engH("span", null, engImpDados ? "eles entram na janela de importar, junto com os que já estão lá" : "abre a janela de importar com os contratos de todos os arquivos"))), renderEngImpJanela());
  var renderEngImpJanela = () => {
    var im = engImpDados;
    if (!im) return null;
    var arqs = im.arqs || [{
      nome: im.nome,
      dados: im.dados,
      geradoEm: im.geradoEm,
      por: im.por
    }];
    var varios = arqs.length > 1;
    // e20: os contratos de todos os arquivos (chave "<nº do arquivo>|<id>")
    var lista = [].concat(...arqs.map((a, i) => engCtsArquivo(a.dados).map(x => ({
      ...x,
      k: (a.k || i) + '|' + x.ct.id,
      ai: i
    }))));
    var maisArquivos = () => {
      engImpSomarRef.current = true;
      engRestRef.current && engRestRef.current.click();
    };
    var tirarArquivo = a => setEngImpDados(x => {
      var resto = (x.arqs || []).filter(y => y !== a);
      if (!resto.length) return null;
      return {
        ...x,
        arqs: resto,
        nome: resto.length === 1 ? resto[0].nome : resto.length + ' arquivos',
        dados: resto[0].dados,
        geradoEm: resto.length === 1 ? resto[0].geradoEm : '',
        por: resto.length === 1 ? resto[0].por : '',
        sel: (x.sel || []).filter(k => k.indexOf(a.k + '|') !== 0)
      };
    });
    var sel = im.sel || [];
    var difCb = [];
    arqs.forEach(a => engCambioDif(db, a.dados).forEach(c => {
      var k = difCb.findIndex(x => x.ano === c.ano && x.mes === c.mes);
      if (k >= 0) difCb[k] = c;else difCb.push(c);
    }));
    difCb.sort((a, b) => a.ano - b.ano || a.mes - b.mes);
    var sim = engImportarVarios({
      arqs
    }, sel, im.cambioArq);
    var rbs = arqs.map(a => engResumoDb(a.dados));
    var ra = engResumoDb(db),
      rb = rbs.length === 1 ? rbs[0] : Object.keys(rbs[0]).reduce((o, k) => {
        o[k] = ['sondas', 'quimicos', 'casing'].includes(k) ? Math.max(...rbs.map(r => r[k] || 0)) : rbs.reduce((a, r) => a + (r[k] || 0), 0);
        return o;
      }, {}),
      rj = engResumoDb(sim.db);
    // o mesmo contrato marcado em mais de um arquivo: fica o do arquivo mais recente (o último na ordem)
    // "Substituir tudo": os dados ficam exatamente os do(s) arquivo(s) (vários arquivos: o 1º e, por cima, os contratos dos outros)
    var tudoArqs = () => arqs.slice(1).reduce((base, a) => engImportarContratos(base, a.dados, engCtsArquivo(a.dados).map(x => x.ct.id), {
      cambioArq: true
    }).db, arqs[0].dados);
    var nCtsArqs = varios ? new Set(lista.map(x => engNormNome(x.ct.name))).size : (im.dados.contratos || []).filter(c => !c.archived).length;
    var depois = x => lista.find(y => y.ai > x.ai && sel.indexOf(y.k) >= 0 && engNormNome(y.ct.name) === engNormNome(x.ct.name));
    var linhas = [['Contratos', 'contratos'], ['Itens com valor', 'precos'], ['Reajustes', 'reajustes'], ['Operações', 'operacoes'], ['Consumos lançados', 'consumos'], ['Handovers', 'handovers'], ['Sondas', 'sondas'], ['Templates', 'templates'], ['Produtos químicos', 'quimicos'], ['Casing equipment (banco)', 'casing'], ['Contagens de inventário das sondas', 'inventarios']];
    var ocultos = arqs.reduce((a, x) => a + (x.dados.contratos || []).length, 0) - lista.length;
    var marcar = id => setEngImpDados(x => ({
      ...x,
      sel: (x.sel || []).indexOf(id) >= 0 ? x.sel.filter(y => y !== id) : [...(x.sel || []), id]
    }));
    var gravar = (final, aviso) => {
      if (!saveDB(final)) {
        setSyncErr('O navegador não deixou gravar os dados (armazenamento cheio).');
        return;
      }
      try {
        sessionStorage.setItem('eng_aviso', aviso);
      } catch (e) {}
      location.reload();
    };
    var importar = () => {
      var r = engImportarVarios({
        arqs
      }, sel, im.cambioArq);
      var subs = r.rel.filter(x => x.substituido),
        novos = r.rel.filter(x => !x.substituido);
      var aviso = 'Importado ✓ — ' + r.rel.map(x => x.nome + (x.substituido ? ' (substituído: ' + x.entraram + ' operação(ões))' : ' (novo: ' + x.entraram + ' operação(ões))')).join(' · ');
      if (!subs.length) return gravar(r.db, aviso);
      askConfirm({
        title: 'Importar e substituir',
        okLabel: 'Substituir e importar',
        danger: true,
        msg: engH("span", null, subs.length === 1 ? "O contrato " : "Os contratos ", subs.map((x, i) => engH(React.Fragment, {
          key: i
        }, i ? ', ' : '', engH("b", null, x.nomeAqui))), subs.length === 1 ? " já existe aqui e será substituído" : " já existem aqui e serão substituídos", " pelo do arquivo, com as operações: saem ", engH("b", null, subs.reduce((a, x) => a + x.sairam, 0) + " operação(ões) daqui"), " e entram ", engH("b", null, subs.reduce((a, x) => a + x.entraram, 0) + " do arquivo"), "." + (novos.length ? ' ' + novos.length + ' contrato(s) novo(s) entra(m).' : '')),
        hint: 'Os outros contratos daqui não mudam. Se tiver dúvida, exporte os dados daqui antes.',
        onOk: () => gravar(r.db, aviso)
      });
    };
    var fechar = () => {
      engImpSomarRef.current = false;
      setEngImpDados(null);
    };
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
    }, varios ? "Arquivos (" + arqs.length + ")" : "Arquivo"), engH("div", {
      className: "hm-arq ec-imp-arqs"
    }, varios ? arqs.map((a, i) => engH("div", {
      key: a.k || i,
      className: "ec-imp-arqlin"
    }, engH("span", null, (i + 1) + '. ' + a.nome + (a.geradoEm ? ' · ' + fmtDH(a.geradoEm) : '') + (a.por ? ' · ' + a.por : '') + (a.grupo ? ' · grupo “' + a.grupo.nome + '”' : '')), engH("button", {
      type: "button",
      className: "ec-imp-tirar",
      title: "Tirar este arquivo da importação",
      onClick: () => tirarArquivo(a)
    }, "\xD7"))) : im.nome + (arqs[0] && arqs[0].grupo ? ' · grupo “' + arqs[0].grupo.nome + '” (o grupo é recriado aqui)' : '')), !varios && im.geradoEm && engH("div", {
      className: "hm-k"
    }, "Exportado"), !varios && im.geradoEm && engH("div", {
      className: "hm-arq"
    }, fmtDH(im.geradoEm) + (im.por ? ' · ' + im.por : ''))), engH("div", {
      className: "ec-imp-mais-l"
    }, engH("button", {
      type: "button",
      className: "btn-o ec-imp-mais",
      onClick: maisArquivos,
      title: "Escolher outro arquivo .json (de outro contrato) para importar junto"
    }, "＋ Adicionar arquivos"), engH("span", null, "Para escolher vários de uma vez, segure ", engH("b", null, "Ctrl"), " ao clicar nos arquivos; ou arraste os arquivos .json para esta tela.")), engH("div", {
      className: "ec-imp-ajuda"
    }, varios ? "Marque os contratos que vêm dos arquivos. " : "Marque os contratos que vêm do arquivo. ", engH("b", null, "Contrato que já existe aqui (mesmo nome) é substituído"), ", com as operações dele; contrato novo entra; os outros contratos daqui não mudam.", varios ? " Os arquivos entram do exportado primeiro ao último: se o mesmo contrato estiver em mais de um, fica o mais recente." : ""), lista.length ? engH("div", {
      className: "tbl-scroll"
    }, engH("table", {
      className: "db-table ec-imp-cts",
      "data-tf": "0"
    }, engH("thead", null, engH("tr", null, engH("th", null), engH("th", null, varios ? "Contrato" : "Contrato no arquivo"), varios && engH("th", null, "Arquivo"), engH("th", null, "Cliente"), engH("th", null, "Operações no arquivo"), engH("th", null, "O que acontece aqui"))), engH("tbody", null, lista.map(x => {
      var ct = x.ct,
        ops = x.ops;
      var loc = engCtAqui(db.contratos, ct);
      var nAqui = loc ? (db.plannedJobs || []).filter(j => pjDoContrato(j, loc)).length : 0;
      var on = sel.indexOf(x.k) >= 0;
      var dep = on && depois(x);
      return engH("tr", {
        key: x.k,
        className: on ? 'ec-imp-on' : ''
      }, engH("td", null, engH("input", {
        type: "checkbox",
        className: "ec-imp-ct-cb",
        checked: on,
        onChange: () => marcar(x.k),
        "aria-label": 'Importar ' + ct.name
      })), engH("td", null, engH("b", null, ct.name), ct.archived ? engH("em", {
        className: "ec-imp-arq"
      }, " arquivado") : null), varios && engH("td", {
        className: "ec-imp-arqnome"
        , title: arqs[x.ai].nome + (arqs[x.ai].geradoEm ? ' · exportado em ' + fmtDH(arqs[x.ai].geradoEm) : '')
      }, 'nº ' + (x.ai + 1)), engH("td", null, ct.clientName || '—'), engH("td", {
        className: "ec-num"
      }, ops), engH("td", {
        className: dep ? 'ec-imp-fica' : loc ? 'ec-imp-subst' : 'ec-imp-novo'
      }, !on ? engH("span", {
        className: "ec-imp-fica"
      }, loc ? 'não muda (o daqui fica)' : 'não entra') : dep ? 'repetido: fica o do arquivo ' + (dep.ai + 1) + ' (mais recente)' : loc ? 'substitui “' + loc.name + '” daqui: saem ' + nAqui + ' operação(ões), entram ' + ops : 'entra como contrato novo, com ' + ops + ' operação(ões)'));
    })))) : engH("div", {
      className: "ec-vazio"
    }, "O arquivo não tem contratos com operações."), ocultos > 0 && engH("div", {
      className: "ec-imp-nota"
    }, ocultos + ' contrato(s) arquivado(s) e sem operações do arquivo ficam de fora (são do cadastro do EARL).'), difCb.length > 0 && engH("div", {
      className: "ec-imp-cambio"
    }, engH("div", null, "💱 O câmbio do arquivo é diferente do daqui em ", engH("b", null, difCb.length + " mês(es)"), " (", difCb.slice(0, 4).map(c => String(c.mes).padStart(2, '0') + '/' + String(c.ano).slice(2) + ': ' + c.arquivo.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }) + ' no arquivo × ' + c.aqui.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }) + ' aqui').join('; ') + (difCb.length > 4 ? '…' : ''), "). O câmbio vale para todos os contratos deste arquivo: fica o daqui, para os outros contratos não mudarem."), engH("label", {
      className: "ec-imp-cbx"
    }, engH("input", {
      type: "checkbox",
      className: "ec-imp-cambio-arq",
      checked: !!im.cambioArq,
      onChange: e => {
        var v = e.target.checked;
        setEngImpDados(x => ({
          ...x,
          cambioArq: v
        }));
      }
    }), " Usar o câmbio do arquivo nesses meses (muda a receita em US$ dos contratos daqui que têm valores em R$)")), engH("details", {
      className: "ec-imp-det"
    }, engH("summary", null, "Ver os números (neste computador, no arquivo e depois de importar)"), engH("div", {
      className: "tbl-scroll"
    }, engH("table", {
      className: "db-table ec-imp-tab",
      "data-tf": "0"
    }, engH("thead", null, engH("tr", null, engH("th", null), engH("th", null, "Neste computador"), engH("th", null, varios ? "Nos arquivos" : "No arquivo"), engH("th", null, "Depois de importar"))), engH("tbody", null, linhas.map(([rot, k]) => engH("tr", {
      key: k
    }, engH("td", null, rot), engH("td", {
      className: "ec-num"
    }, ra[k]), engH("td", {
      className: "ec-num"
    }, rb[k]), engH("td", {
      className: "ec-num"
    }, rj[k]))))))), engH("div", {
      className: "ec-imp-opcoes"
    }, engH("div", {
      className: "ec-imp-op"
    }, engH("b", null, "Importar contratos"), engH("span", null, "Os contratos marcados entram; os que já existem aqui são substituídos, com as operações. Vêm junto as sondas, os produtos químicos, o casing e as logos do arquivo (fica o mais recente) e os meses de câmbio que faltam aqui."), engH("button", {
      className: "btn-r ec-importar",
      disabled: !sel.length,
      onClick: importar
    }, sel.length ? 'Importar ' + (varios ? new Set(lista.filter(x => sel.indexOf(x.k) >= 0).map(x => engNormNome(x.ct.name))).size : sel.length) + ' contrato(s)' : 'Marque um contrato')), engH("div", {
      className: "ec-imp-op"
    }, engH("b", null, "Substituir tudo"), engH("span", null, (varios ? "Os dados deste computador passam a ser exatamente os dos arquivos: ficam só os contratos que estão neles (" : "Os dados deste computador passam a ser exatamente os do arquivo: ficam só os contratos que estão nele (") + nCtsArqs + "); os outros contratos daqui saem. Para levar tudo para um computador novo, escolha os arquivos de todos os contratos de uma vez."), engH("button", {
      className: "btn-o ec-substituir",
      onClick: () => askConfirm({
        title: 'Substituir os dados',
        okLabel: 'Substituir',
        danger: true,
        msg: engH("span", null, "Apagar os dados deste computador (" + (db.contratos || []).filter(c => !c.archived).length + " contrato(s)) e ficar só com os " + (varios ? "dos arquivos" : "do arquivo") + " (" + nCtsArqs + " contrato(s))?"),
        hint: 'Se tiver dúvida, exporte os dados daqui antes.',
        onOk: () => gravar(varios ? tudoArqs() : im.dados, varios ? 'Dados substituídos pelos dos ' + arqs.length + ' arquivos ✓' : 'Dados substituídos pelos do arquivo ✓')
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
  /* ---- e6: espaço do navegador ----
     No Chrome e no Edge, todos os HTML abertos do disco (file://) dividem o mesmo localStorage, de cerca de
     5 milhões de caracteres: EARL completo, simulações (earlsimNNN:), esta Engenharia (earleng:), o teste BP
     (earlengbp:) e o Gerencial (earlger:). Quando enche, nenhum deles grava. Esta tela mostra quem ocupa o
     espaço e deixa apagar só dados de simulação e de teste. */
  var ENG_COTA = 5242880;
  var [engEsp, setEngEsp] = useState(null);
  var [engEspMed, setEngEspMed] = useState(null);
  var [engEspFalhou, setEngEspFalhou] = useState(false);
  var engEspacoMedir = () => {
    var A = window.EARL_ARMAZ;
    if (window.EARL_ARMAZ_BLOQUEADO) return {
      ok: false,
      erro: 'o navegador bloqueou o armazenamento deste arquivo'
    };
    try {
      var por = {},
        tot = 0;
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k == null) continue;
        var v = A ? A.G.call(localStorage, k) : null;
        var n = k.length + (v ? v.length : 0);
        tot += n;
        var m = /^([a-z][a-z0-9]*):/i.exec(k);
        var g = m ? m[1] + ':' : '';
        (por[g] = por[g] || {
          g,
          n: 0,
          chaves: 0
        }).n += n;
        por[g].chaves++;
      }
      return {
        ok: true,
        tot,
        pct: tot / ENG_COTA * 100,
        por: Object.values(por).sort((a, b) => b.n - a.n)
      };
    } catch (e) {
      return {
        ok: false,
        erro: String(e && e.message || e)
      };
    }
  };
  useEffect(() => {
    setEngEspMed(engEspacoMedir());
  }, []);
  var engEspacoFalhou = () => {
    setEngEspFalhou(true);
    setEngEspMed(engEspacoMedir());
  };
  var engEspacoNome = g => {
    var P = window.EARL_ARMAZ && window.EARL_ARMAZ.P;
    var m = /^earlsim(\d+)/.exec(g);
    var este = g === P ? ' — este arquivo' : '';
    if (g === 'earleng:') return {
      nome: 'EARL Forecast' + este,
      obs: 'dados da engenharia: não se apagam por aqui'
    };
    if (g === 'earlengbp:') return {
      nome: 'EARL Forecast — teste BP' + este,
      apaga: !este,
      obs: este ? 'para voltar aos dados da planilha, use “Reiniciar” na etiqueta TESTE BP' : 'dados de teste; ao abrir o teste de novo, ele volta aos dados da planilha'
    };
    if (g === 'earlger:') return {
      nome: 'EARL Gerencial',
      obs: 'arquivos carregados no Gerencial: use “Limpar” lá'
    };
    if (m) return {
      nome: 'EARL — simulação v' + m[1],
      apaga: true,
      obs: 'dados fictícios; ao abrir a simulação de novo, ela recomeça do início'
    };
    if (!g) return {
      nome: 'EARL completo e outros arquivos sem prefixo',
      obs: 'não se apaga por aqui'
    };
    return {
      nome: 'Outro arquivo (' + g.slice(0, -1) + ')' + este,
      obs: 'não se apaga por aqui'
    };
  };
  var engMilhoes = n => (n / 1e6).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' mi';
  var engEspacoApagar = (g, nome) => askConfirm({
    title: 'Apagar ' + nome,
    okLabel: 'Apagar',
    danger: true,
    msg: engH("span", null, 'Apagar do navegador os dados de “' + nome + '”?'),
    hint: 'Os dados do Forecast, do Gerencial e do EARL completo não são tocados.',
    onOk: () => {
      var A = window.EARL_ARMAZ;
      try {
        var del = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf(g) === 0) del.push(k);
        }
        del.forEach(k => A.R.call(localStorage, k));
      } catch (e) {}
      var med = engEspacoMedir();
      setEngEspMed(med);
      if (med.ok && med.pct < 95) setEngEspFalhou(false);
      setOkMsg('Espaço liberado ✓ — ' + nome);
      setTimeout(() => setOkMsg(''), 4000);
    }
  });
  var renderEngEspacoAviso = () => {
    var med = engEspMed;
    if (!med) return null;
    var abrir = () => {
      setEngEspMed(engEspacoMedir());
      setEngEsp({});
    };
    if (!med.ok) return engH("div", {
      className: "hm-banner ec-esp-aviso"
    }, engH("div", null, engH("b", null, "⚠ Este arquivo não consegue guardar dados no navegador"), engH("span", null, "O que for lan\xE7ado aqui n\xE3o fica salvo. Isso acontece quando o arquivo \xE9 aberto dentro de uma pr\xE9-visualiza\xE7\xE3o (e-mail, Teams, visualizador de arquivos). Salve o arquivo no computador e abra direto no Chrome ou no Edge.")));
    if (!engEspFalhou && med.pct < 85) return null;
    return engH("div", {
      className: "hm-banner ec-esp-aviso"
    }, engH("div", null, engH("b", null, engEspFalhou ? '⚠ O espaço do navegador está cheio: o que foi lançado não está sendo salvo' : '⚠ O espaço do navegador está quase cheio (' + fmtNum(Math.round(med.pct)) + '%)'), engH("span", null, "Os arquivos do EARL abertos do disco dividem o mesmo espa\xE7o. Libere espa\xE7o apagando simula\xE7\xF5es e testes antigos.")), engH("button", {
      className: "btn-r ec-esp-abrir",
      onClick: abrir
    }, "Ver e liberar espa\xE7o"));
  };
  var renderEngEspaco = () => {
    if (!engEsp) return null;
    var med = engEspMed || engEspacoMedir();
    var fechar = () => setEngEsp(null);
    var pct = med.ok ? Math.min(100, med.pct) : 0;
    return engH("div", {
      className: "overlay",
      style: {
        zIndex: 300
      },
      onClick: e => {
        if (e.target === e.currentTarget) fechar();
      }
    }, engH("div", {
      className: "modal ec-esp-modal",
      onClick: e => e.stopPropagation()
    }, engH("div", {
      className: "modal-title"
    }, engH("span", null, "Espa\xE7o do navegador"), engH("button", {
      className: "modal-close",
      onClick: fechar
    }, "\xD7")), engH("div", {
      className: "eng-help",
      style: {
        marginTop: 0
      }
    }, "No Chrome e no Edge, todos os arquivos HTML abertos do disco (EARL completo, simula\xE7\xF5es, Forecast, Gerencial e testes) dividem o mesmo espa\xE7o, de cerca de 5 milh\xF5es de caracteres. Quando ele enche, nenhum desses arquivos consegue salvar."), !med.ok ? engH("div", {
      className: "ho-pend"
    }, 'O navegador não deixa este arquivo usar o armazenamento (' + med.erro + ').') : engH(React.Fragment, null, engH("div", {
      className: "ec-esp-total"
    }, engH("b", null, engMilhoes(med.tot) + ' de ~' + engMilhoes(ENG_COTA) + ' de caracteres (' + fmtNum(Math.round(med.pct)) + '%)'), engBarra(pct)), engH("div", {
      className: "tbl-scroll"
    }, engH("table", {
      className: "db-table ec-esp-tab"
    }, engH("thead", null, engH("tr", null, ['Arquivo', 'Espaço', '%', ''].map((h, k) => engH("th", {
      key: k
    }, h)))), engH("tbody", null, med.por.map(x => {
      var nm = engEspacoNome(x.g);
      return engH("tr", {
        key: x.g || '-',
        'data-g': x.g
      }, engH("td", null, engH("b", null, nm.nome), engH("span", {
        className: "ec-pn-sub"
      }, nm.obs || '')), engH("td", {
        className: "ec-num"
      }, engMilhoes(x.n)), engH("td", {
        className: "ec-num"
      }, fmtNum(Math.round(x.n / ENG_COTA * 1000) / 10) + '%'), engH("td", null, nm.apaga && engH("button", {
        className: "btn-o ec-esp-apagar",
        onClick: () => engEspacoApagar(x.g, nm.nome)
      }, "Apagar")));
    }))))), engH("div", {
      className: "ec-pn-nota"
    }, "Antes de apagar, se tiver d\xFAvida, use “⬇ Exportar dados”. Os dados do Forecast, do Gerencial e do EARL completo n\xE3o se apagam por aqui."), engH("div", {
      className: "ec-foot"
    }, engH("span", {
      style: {
        flex: 1
      }
    }), engH("button", {
      className: "btn-o",
      onClick: fechar
    }, "Fechar"))));
  };
  var renderEngTools = () => hubLocation ? engH("div", {
    className: "eng-tools"
  }, engHistBotoes(), engH("button", {
    className: "btn-o",
    onClick: abrirEngContratos,
    title: "Contratos, itens PPU, valores em R$ e US$ e reajustes"
  }, "Contratos"), engH("button", {
    className: "btn-o",
    onClick: abrirEngSondas,
    title: "Cadastro de sondas"
  }, "Sondas"), engH("button", {
    className: "btn-o eng-quimicos",
    onClick: abrirEngQuim,
    title: "Banco de produtos qu\xEDmicos: SAP, descri\xE7\xE3o, unidade e valor em US$ (COGS), atualizado por planilha"
  }, "Qu\xEDmicos"), engH("button", {
    className: "btn-o eng-casing",
    onClick: abrirEngCasDb,
    title: "Banco de casing equipment: SAP, descri\xE7\xE3o, unidade e valor em US$ (COGS), atualizado por planilha. \xC9 a lista de casing para escolher nas opera\xE7\xF5es"
  }, "Casing"), engH("button", {
    className: "btn-o eng-cambio",
    onClick: abrirEngCambio,
    title: "C\xE2mbio do d\xF3lar por m\xEAs (R$ por US$ 1,00): converte em US$ os valores em R$ dos contratos, com a cota\xE7\xE3o do m\xEAs"
  }, "\uD83D\uDCB1 C\xE2mbio"), engH("button", {
    className: "btn-o eng-exportar",
    onClick: () => engExportarPedir(), // e19: com mais de um contrato, pergunta quais exportar
    title: "Baixa um arquivo .json com todos os dados (contratos, valores, reajustes, opera\xE7\xF5es, consumos, handovers, sondas, templates, os bancos de qu\xEDmicos e de casing equipment e o invent\xE1rio das sondas) para guardar ou levar para outro computador"
  }, "⬇ Exportar dados"), engH("button", {
    className: "btn-o eng-importar",
    onClick: () => engRestRef.current && engRestRef.current.click(),
    title: "Carrega os arquivos .json exportados por outras pessoas ou por outro computador: os contratos entram (o de mesmo nome é substituído, com as operações) e aparecem nos Indicadores. Para escolher vários de uma vez, segure Ctrl ao clicar nos arquivos — ou arraste os arquivos .json para esta tela."
  }, "⬆ Importar dados"), engH("button", {
    className: "btn-o eng-planilhas",
    onClick: () => abrirEngExp(),
    title: "Baixa planilhas separadas dos contratos marcados: invent\xE1rio das sondas, consumo de produtos qu\xEDmicos, casing equipment e pessoal (o Painel de Compras usa o invent\xE1rio e o consumo de qu\xEDmicos)"
  }, "\u2B07 Exportar planilhas"), engH("input", {
    ref: engRestRef,
    type: "file",
    accept: "application/json,.json",
    multiple: true,
    style: {
      display: 'none'
    },
    onChange: e => {
      var fs = Array.from(e.target.files || []);
      e.target.value = '';
      var somar = engImpSomarRef.current;
      engImpSomarRef.current = false;
      engImportarArquivo(fs, somar); // e20: um ou vários arquivos; e21: "＋ Adicionar arquivos" soma à janela aberta
    }
  })) : null;
  /* =================== fim EARL ENGENHARIA (avulso) =================== */
