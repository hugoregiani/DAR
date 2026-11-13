// Gera um EARL Engenharia pré-carregado com os dados de UMA planilha de contrato (abas "Forecast" e
// "Banco de dados contratos"), para compartilhar com outros usuários.
//
// Uso: node contratos_reais/gerar_html.js <planilha.xlsx> <NOME> <EARL_Engenharia.html> <saída.html> [relatório.json]
//   NOME = sigla curta do arquivo (PA, DC, CE, BW, BDII, Shell): vira o prefixo do armazenamento do navegador
//   ("earleng" + nome + ":"), a etiqueta no canto da tela e o sufixo da versão.
//
// Passos: abre o EARL_Engenharia.html no Chromium (sem internet), lê a planilha com o XLSX do próprio app e o
// leitor_planilhas.js, monta o banco (contratos com itens, preços e reajustes, sondas, químicos/casing com COGS,
// operações previstas e concluídas com o consumo), grava, reabre, confere operação por operação a receita e o
// COGS do app contra a RECEITA FINAL / COGS FINAL da planilha e embute o banco no HTML de saída.
const {abrir} = require('../tests/harness');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// e12: casing da planilha → banco de casing equipment (db.casingEquip, o catálogo de casing do EARL, com o valor em US$):
// atualiza o item de mesmo SAP ou acrescenta. Sem SAP, fica em Custos (COGS).
function casingParaBanco(d, itens, arquivo, agora) {
  if (!Array.isArray(d.casingEquip)) d.casingEquip = [];
  const fora = [];
  let novos = 0, alterados = 0;
  itens.forEach(m => {
    const sap = String(m.sap == null ? '' : m.sap).trim();
    if (!sap) { fora.push(m); return; }
    const e = d.casingEquip.find(x => x && String(x.sap || '').trim() === sap);
    if (e) { Object.assign(e, {id: e.id || 'ce_' + sap, usd: m.usd, atualizadoEm: agora}); alterados++; }
    else { d.casingEquip.push({id: 'ce_' + sap, sap, name: m.nome || sap, unit: m.unid || 'EA', origem: 'Planilha ' + arquivo, usd: m.usd, atualizadoEm: agora}); novos++; }
  });
  d.casingEquip.forEach(x => { if (x && !x.id && String(x.sap || '').trim()) x.id = 'ce_' + String(x.sap).trim(); });
  d.casHist = [...(d.casHist || []), {id: 'ce_h_' + String(arquivo).replace(/[^A-Za-z0-9]+/g, '_'), em: agora, por: '', origem: 'planilha', arquivo: arquivo + ' (aba Forecast)', novos, alterados, removidos: 0, total: d.casingEquip.length}];
  d.casDbV1 = d.casDbV1 || agora;
  return fora;
}


const [XLSX_ARQ, NOME, HTML, SAIDA, RELAT] = process.argv.slice(2);
if (!XLSX_ARQ || !NOME || !HTML || !SAIDA) {
  console.error('uso: node contratos_reais/gerar_html.js <planilha.xlsx> <NOME> <EARL_Engenharia.html> <saída.html> [relatório.json]');
  process.exit(2);
}
const HOJE = new Date().toISOString().slice(0, 10);
const LEITOR = fs.readFileSync(path.join(__dirname, 'leitor_planilhas.js'), 'utf8');

/* --------- monta o banco dentro do app (roda no navegador) --------- */
function montarBanco({b64, arquivo, nome}) {
  const L = window.EARL_LEITOR_CONTRATOS;
  const wb = XLSX.read(b64, {type: 'base64'});
  const M = L.lerPlanilhaContratos(XLSX, wb, arquivo);
  const d = loadDB();
  const agora = new Date().toISOString();
  const avisos = M.avisos.slice();
  const nN = s => L.semAcento(s).replace(/[^a-z0-9]/g, '');
  const contagem = l => { const o = {}; l.filter(Boolean).forEach(x => { o[x] = (o[x] || 0) + 1; }); return Object.keys(o).sort((a, b) => o[b] - o[a]); };
  const resp = contagem(M.operacoes.map(o => o.resp))[0] || '';
  const slugArq = L.slug(nome);

  /* ---- contratos ---- */
  const AJ = {
    rec: {'+': {ref: 'AJ+', desc: 'Ajuste de receita (+): diferença para o valor da planilha', unit: 'US$', usd: 1}, '-': {ref: 'AJ−', desc: 'Ajuste de receita (−): diferença para o valor da planilha', unit: 'US$', usd: -1}},
    quim: {'+': {sap: 'AJ-QUIM+', nome: 'Ajuste de COGS de químicos (+): valor da planilha', unid: 'US$', usd: 1}, '-': {sap: 'AJ-QUIM−', nome: 'Ajuste de COGS de químicos (−): valor da planilha', unid: 'US$', usd: -1}},
    ce: {'+': {sap: 'AJ-CE+', nome: 'Ajuste de COGS de casing equipment (+): valor da planilha', unid: 'US$', usd: 1}, '-': {sap: 'AJ-CE−', nome: 'Ajuste de COGS de casing equipment (−): valor da planilha', unid: 'US$', usd: -1}}
  };
  const kindDe = c => {
    if (M.layout === 'colunas') return 'servico';
    if (/spot/i.test(c.nome)) return 'spot';
    const tr = contagem(M.operacoes.filter(o => o.contrato === c.nome).map(o => L.semAcento(o.tipoReceita)))[0] || '';
    if (/venda/.test(tr) || / DS$/.test(c.nome)) return 'venda';
    if (/drilling/.test(tr)) return 'drilling';
    return 'servico';
  };
  const usados = new Set();
  const ctPorNome = {};
  const reaproveitados = [];
  M.contratos.forEach(c => {
    const ops = M.operacoes.filter(o => o.contrato === c.nome);
    const b = nN(c.numero);
    let ex = d.contratos.find(x => !usados.has(x.id) && b.length >= 8 && nN(x.numero).length >= 8 && (b.indexOf(nN(x.numero)) === 0 || nN(x.numero).indexOf(b) === 0));
    if (!ex) ex = d.contratos.find(x => !usados.has(x.id) && nN(String(x.name || '').replace(/\s+—.*$/, '')) === nN(c.nome));
    let id = ex ? ex.id : 'ct_pl_' + L.slug(c.nome);
    while (!ex && d.contratos.some(x => x.id === id)) id += '_';
    usados.add(id);
    // contrato que já existe no EARL: os campos dos itens que a planilha não traz (PO do item, saldo contratado) ficam
    const doEarl = ex ? Object.fromEntries((ex.items || []).map(i => [String(i.ref), i])) : {};
    const itens = c.itens.map(i => ({...(doEarl[i.ref] || {}), ref: i.ref, desc: i.desc + (i.po ? ' · ' + i.po : ''), unit: i.unit, base: 'Macaé', brl: i.brl != null ? i.brl : null, usd: i.usd != null ? i.usd : null}));
    const precisa = s => ops.some(o => s === '+' ? o.ajRec > 0.005 : o.ajRec < -0.005);
    ['+', '-'].forEach(s => { if (precisa(s)) itens.push({...AJ.rec[s], base: 'Macaé', brl: null}); });
    const reg = {
      ...(ex || {}),
      id, clientName: c.cliente || 'Sem cliente', name: ex ? ex.name : c.nome, numero: ex ? ex.numero : c.numero || c.nome, // o número de um contrato que já existe no EARL fica (o app recria a semente pelo número)
      numeroPlanilha: c.numero || '',
      kind: ex ? ex.kind || kindDe(c) : kindDe(c), bases: ['Macaé'], regiao: 'macae', version: 1, archived: false,
      items: itens, aditivos: [], inicio: c.inicio || '',
      reajustes: c.reajustes.map((r, k) => ({id: 'rj_' + slugArq + '_' + L.slug(c.nome) + '_' + k, desde: r.desde, obs: r.obs + ' (planilha ' + arquivo + ')', em: agora, por: resp, precos: Object.fromEntries(Object.entries(r.precos).map(([ref, p]) => [ref, {brl: p.brl != null ? p.brl : null, usd: p.usd != null ? p.usd : null}]))})),
      atualizadoEm: agora, origem: 'planilha ' + arquivo
    };
    if (ex) { Object.assign(ex, reg); reaproveitados.push(c.nome + ' → ' + ex.name); } else d.contratos.push(reg);
    ctPorNome[c.nome] = reg;
  });
  const meus = new Set(Object.values(ctPorNome).map(c => c.id));
  const arquivados = d.contratos.filter(c => !meus.has(c.id) && !c.archived).length;
  d.contratos.forEach(c => { if (!meus.has(c.id)) c.archived = true; });

  /* ---- sondas ---- */
  const nS = s => L.semAcento(s).replace(/\s+/g, '').replace(/-0+(\d)/g, '-$1');
  const rigsCriadas = [], rigsLigadas = {};
  const rigDe = (sonda, ct, texto) => {
    let s = sonda;
    if (!s || /^frente/i.test(s)) {
      const m = String(texto || '').match(/\b(NS|SS)-\d{2,3}\b/i);
      if (!m) return '';
      s = m[0].toUpperCase();
    }
    const k = nS(s);
    if (rigsLigadas[k] != null) return rigsLigadas[k];
    let r = d.rigs.find(x => [x.name, x.nomePetrobras].some(v => v && nS(v) === k));
    if (!r) { const l = d.rigs.filter(x => x.name && nS(x.name).indexOf(k) >= 0); if (l.length === 1) r = l[0]; }
    if (!r && ct) { const cn = nS(String(ct.name || '').replace(/_\d+$/, '')); r = d.rigs.find(x => x.name && nS(x.name) === cn); }
    if (r && !r.nomePetrobras && /^(NS|SS)-\d+$/i.test(s)) r.nomePetrobras = s.toUpperCase();
    if (!r) {
      r = {id: 'rig_pl_' + L.slug(s), name: s, nomePetrobras: /^(NS|SS)-\d+$/i.test(s) ? s.toUpperCase() : '', rigManager: '', cementUnit: '', rigTypeOff: '', floaterGen: '', client: ct ? ct.clientName : '', contract: ct ? ct.name : '', ambiente: 'offshore', base: 'Macaé', regiao: 'macae', active: true, type: 'perfuracao', polo: '', darEnabled: false, origem: 'planilha ' + arquivo, updatedAt: agora};
      d.rigs.push(r);
      rigsCriadas.push(s);
    }
    rigsLigadas[k] = r.id;
    return r.id;
  };

  /* ---- químicos e casing (COGS unitário) ---- */
  let quimSubst = false;
  if (M.quimicos.length) {
    const ch = l => l.map(q => [q.sap, q.nome, q.unid, q.usd].join('|')).sort().join('\n');
    if (ch(d.quimicos || []) !== ch(M.quimicos)) {
      d.quimicos = M.quimicos.map(q => ({id: 'q_' + q.sap, ...q, atualizadoEm: agora}));
      d.quimHist = [...(d.quimHist || []), {id: 'qh_' + slugArq, em: agora, por: resp, origem: 'planilha', arquivo: arquivo + ' (aba Forecast)', novos: 0, alterados: M.quimicos.length, removidos: 0, total: M.quimicos.length}];
      quimSubst = true;
    }
  }
  d.quimBaseV1 = d.quimBaseV1 || agora;
  // e12: casing no banco de casing equipment; em Custos (COGS) só o casing sem SAP e os ajustes
  d.cogsItens = casingParaBanco(d, M.casing, arquivo, agora).map((m, i) => ({id: 'cg_' + slugArq + '_' + (i + 1), sap: m.sap, nome: m.nome, unid: m.unid, usd: m.usd, brl: null, atualizadoEm: agora}));
  const ajUsados = new Set();
  M.operacoes.forEach(o => {
    if (o.ajQuim > 0.005) ajUsados.add('quim+'); if (o.ajQuim < -0.005) ajUsados.add('quim-');
    if (o.ajCE > 0.005) ajUsados.add('ce+'); if (o.ajCE < -0.005) ajUsados.add('ce-');
  });
  ['quim', 'ce'].forEach(t => ['+', '-'].forEach(s => { if (ajUsados.has(t + s)) d.cogsItens.push({id: 'cg_' + slugArq + '_aj_' + t + (s === '+' ? 'p' : 'm'), ...AJ[t][s], brl: null, atualizadoEm: agora}); }));

  // catálogo de químicas do EARL (nome pelo SAP)
  const cat = {};
  CHEMICALS.forEach(c => { cat[String(c.sap)] = {name: c.name, unit: c.unit}; });
  Object.entries(d.chemMeta || {}).forEach(([s, m]) => { if (m && m.name) cat[s] = {name: m.name, unit: m.unit}; });

  /* ---- operações ---- */
  const FUNC = {'tamponeiro': 'Tamponeiro', 'op. cabeca': 'Operador de Cabeça de Cimentação', 'op. casing': 'Especialista de Casing Equipment'};
  const semData = [];
  const ops = M.operacoes.map(o => {
    const ct = ctPorNome[o.contrato];
    const tp = L.tipoOperacao(o.desc, o.tipoPl, o.fase, TAMANHOS_REV, TIPO_OUTROS);
    const dur = durOfTipo(tp.tipoOp);
    const date = o.data || ct.inicio || HOJE_ISO;
    if (!o.data) semData.push(o.n);
    const it = ref => ct.items.find(i => i.ref === ref) || {ref, desc: ref, unit: ''};
    const ppuNeeds = o.ppu.map(l => { const i = it(l.ref); return {ref: i.ref, desc: i.desc, unit: i.unit, qty: l.qty}; });
    const mat = m => { const c = cat[m.sap]; return {sap: m.sap, name: c ? c.name : m.nome, unit: m.unit, qty: m.qty}; };
    const chems = o.quim.map(mat), casingNeeds = o.cas.map(mat);
    const ajR = Math.abs(o.ajRec) > 0.005 ? (a => ({ref: a.ref, desc: a.desc, unit: a.unit, qty: Math.round(Math.abs(o.ajRec) * 10000) / 10000}))(AJ.rec[o.ajRec > 0 ? '+' : '-']) : null;
    const ajM = (v, t) => Math.abs(v) > 0.005 ? (a => ({sap: a.sap, name: a.nome, unit: a.unid, qty: Math.round(Math.abs(v) * 10000) / 10000}))(AJ[t][v > 0 ? '+' : '-']) : null;
    const ajQ = ajM(o.ajQuim, 'quim'), ajC = ajM(o.ajCE, 'ce');
    const time = {};
    Object.entries(o.time || {}).forEach(([f, q]) => { const fn = FUNC[L.semAcento(f)] || f; time[fn] = (time[fn] || 0) + q; });
    const peopleNeeds = Object.entries(time).map(([funcao, qty]) => ({funcao, qty, pessoas: pePessoas({qty}, date)}));
    const local = M.layout === 'colunas' ? 'coluna ' + o.coluna : 'linha(s) ' + o.linhas.map(l => l.linha).join(', ');
    const j = {
      id: 'pl_' + slugArq + '_' + String(o.n).padStart(3, '0'),
      loc: 'macae', clienteName: ct.clientName, contratoLabel: ct.numero || ct.name, contratoId: ct.id,
      rigId: rigDe(o.sonda, ct, o.desc + ' ' + (o.notas || '')),
      well: o.poco, tipoOp: tp.tipoOp, tipoOutro: tp.tipoOutro || '', casing: tp.casing || '',
      date, baselineDate: date, durationDays: dur, salesOrder: o.so, wbs: o.wbs, vida: '', anchor: 'chain', // e10: a data acompanha a operação anterior da sonda (pedido do usuário)
      contingencia: !!o.contingencia, risco: o.contingencia ? 100 - Math.round(o.risco * 100) : null, riscoRec: Math.round(o.risco * 100), templateId: '', // e10: risco = chance de acontecer = 100 − risco de não acontecer
      notes: ['Planilha ' + arquivo + ' (' + local + '): ' + (o.notas || o.desc || '—'), o.fase ? 'fase ' + o.fase : '', o.campo ? 'campo ' + o.campo : '', o.tipoReceita ? o.tipoReceita : '', o.resp ? 'responsável ' + o.resp : '', o.status].filter(Boolean).join(' · '),
      // previstas: o ajuste vai no planejado; concluídas: só no consumo lançado (o planejado fica pelo contrato)
      equipNeeds: [],
      chems: o.concluida || !ajQ ? chems : chems.concat([ajQ]),
      ppuNeeds: o.concluida || !ajR ? ppuNeeds : ppuNeeds.concat([ajR]),
      casingNeeds: o.concluida || !ajC ? casingNeeds : casingNeeds.concat([ajC]),
      peopleNeeds, status: PJ_STATUS.PLAN, createdAt: agora, updatedAt: agora,
      log: [{em: agora, por: o.resp || resp, acao: 'Operação importada da planilha ' + arquivo, detalhe: (o.desc || '—') + ' · ' + o.status}]
    };
    if (o.concluida) {
      j.ppuCons = {
        data: date,
        linhas: ppuNeeds.concat(ajR ? [ajR] : []).map(n => ({ref: n.ref, desc: n.desc, unit: n.unit, qty: n.qty})),
        quim: chems.concat(ajQ ? [ajQ] : []).map(m => ({sap: m.sap, name: m.name, unit: m.unit, qty: m.qty})),
        cas: casingNeeds.concat(ajC ? [ajC] : []).map(m => ({sap: m.sap, name: m.name, unit: m.unit, qty: m.qty})),
        pes: peopleNeeds.map(n => ({funcao: n.funcao, pessoas: n.qty, dias: dur, hd: n.qty * dur})),
        em: agora, por: o.resp || resp
      };
    }
    return j;
  });
  d.plannedJobs = ops;
  d.hoMail = {...(d.hoMail || {}), nome: resp};
  d.gerCfg = {...(d.gerCfg || {}), contratos: [...meus]};
  // e10: câmbio do dólar por mês, com a cotação que a planilha usou em cada mês (itens com valor em R$)
  d.cambio = (M.cambio || []).map(c => ({ano: c.ano, mes: c.mes, valor: c.valor, em: agora, por: 'planilha ' + arquivo}));
  saveDB(d);
  const alvo = Object.fromEntries(M.operacoes.map((o, k) => [ops[k].id, {rf: o.rf, cf: o.cf, risco: o.risco, contrato: o.contrato, data: o.data, desc: o.desc, concluida: o.concluida}]));
  return {
    layout: M.layout, cambio: M.cambio || null, contratos: M.contratos.map(c => ({nome: c.nome, cliente: c.cliente, numero: c.numero, id: ctPorNome[c.nome].id, kind: ctPorNome[c.nome].kind, itens: c.itens.length, reajustes: c.reajustes.length, inicio: c.inicio, ops: M.operacoes.filter(o => o.contrato === c.nome).length})),
    reaproveitados, arquivados, rigsCriadas, rigsLigadas: Object.keys(rigsLigadas).length, semRig: ops.filter(j => !j.rigId).length, quimicos: (d.quimicos || []).length, quimSubst, cogsItens: d.cogsItens.length,
    ops: ops.length, concluidas: ops.filter(j => j.ppuCons).length, risco100: ops.filter(j => j.riscoRec >= 100).length, semData,
    ajustes: {receita: M.operacoes.filter(o => Math.abs(o.ajRec) > 0.005).length, cogs: M.operacoes.filter(o => Math.abs(o.ajQuim) > 0.005 || Math.abs(o.ajCE) > 0.005).length},
    tipos: contagem(ops.map(j => j.tipoOp === TIPO_OUTROS ? 'Outros' : j.tipoOp)),
    avisos, alvo
  };
}

/* --------- confere receita/COGS de cada operação pelo pacote do Gerencial (o mesmo que a tela usa) --------- */
function conferir(alvo) {
  const pac = window.engGerDados && window.engGerDados().pacote;
  if (!pac) return {erro: 'pacote do Gerencial indisponível'};
  const r4 = v => Math.round(v * 10000) / 10000;
  const dif = [];
  let tRec = 0, tCogs = 0, tRecPl = 0, tCogsPl = 0, n = 0;
  pac.operacoes.forEach(o => {
    const a = alvo[o.id];
    if (!a) return;
    n++;
    const f = o.risco >= 100 ? 0 : 1 - o.risco / 100;
    const rec = (o.realizado ? o.receita.usd : o.previsto.receita.usd) * f;
    const cogs = (o.realizado ? o.realizado.cogs.usd : o.previsto.cogs.usd) * f;
    tRec += rec; tCogs += cogs; tRecPl += a.rf; tCogsPl += a.cf;
    if (Math.abs(rec - a.rf) > 0.05 || Math.abs(cogs - a.cf) > 0.05) dif.push({id: o.id, data: o.data, desc: a.desc, rec: r4(rec), rf: r4(a.rf), cogs: r4(cogs), cf: r4(a.cf)});
  });
  const porCt = {};
  pac.operacoes.forEach(o => { const a = alvo[o.id]; if (a) porCt[a.contrato] = (porCt[a.contrato] || 0) + 1; });
  return {conferidas: n, noPacote: pac.operacoes.length, contratosNoPacote: pac.contratos.length, receitaApp: r4(tRec), receitaPlanilha: r4(tRecPl), cogsApp: r4(tCogs), cogsPlanilha: r4(tCogsPl), diferencas: dif.slice(0, 20), nDiferencas: dif.length, porCt};
}

/* --------- embute o banco no HTML (mesma ideia do teste BP: armazenamento e etiqueta próprios) --------- */
function embutir(base, seed, nome, arquivo) {
  let s = base;
  const obj = JSON.parse(seed);
  const pid = 'pl-' + crypto.createHash('sha1').update(seed).digest('hex').slice(0, 12);
  obj.earlPlanilhaId = pid;
  seed = JSON.stringify(obj);
  const rep = (a, b) => {
    const c = s.split(a).length - 1;
    if (c !== 1) throw new Error('esperava 1 ocorrência, achei ' + c + ': ' + a.slice(0, 100));
    s = s.replace(a, () => b);
  };
  const lit = JSON.stringify(seed).replace(/[\u007f-￿]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')).replace(/<\//g, '<\\/').replace(/<!--/g, '<\\!--');
  if (/<\/script/i.test(lit) || lit.indexOf('<!--') >= 0) throw new Error('seed com </script');
  const pref = 'earleng' + nome.toLowerCase().replace(/[^a-z0-9]/g, '') + ':';
  const geradoEm = new Date().toLocaleDateString('pt-BR');
  const esc = t => String(t).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const jsStr = t => JSON.stringify(String(t)).replace(/[\u007f-￿]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')).replace(/<\//g, '<\\/');
  rep("var P='earleng:';", "var P='" + pref + "';");
  const i = s.indexOf("  window.EARL_ENG_AVULSO=true;\n");
  const fim = "})();\n</script>";
  const j = s.indexOf(fim, i);
  if (i < 0 || j < 0) throw new Error('bloco de armazenamento não encontrado');
  const bloco = `  /* DADOS DA PLANILHA ${esc(arquivo)}: banco gerado pelo contratos_reais/gerar_html.js. Se o navegador não tiver esta
     versão guardada, grava; sem espaço (ou se o navegador não deixar), o app usa os dados embutidos mesmo assim. */
  var SEED=${lit};var PLID='${pid}';var PL_NOME=${jsStr(nome)};var PL_ARQ=${jsStr(arquivo)};
  window.EARL_PLANILHA=PL_NOME;window.EARL_PL_SEED=SEED;window.EARL_PL_ID=PLID;window.EARL_PL_SEM_ESPACO=false;
  function gravar(){
    var ks=[];for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&k.indexOf(P)===0)ks.push(k);}
    ks.forEach(function(k){R.call(localStorage,k);});
    S.call(localStorage,P+'hal_cmt_db_v1',SEED);S.call(localStorage,P+'earl_pl_id',PLID);
  }
  var precisa=true;try{precisa=G.call(localStorage,P+'earl_pl_id')!==PLID||!G.call(localStorage,P+'hal_cmt_db_v1');}catch(e){}
  if(precisa){try{gravar();}catch(e){window.EARL_PL_SEM_ESPACO=true;}}
  window.earlPlReiniciar=function(){
    if(!confirm('Voltar aos dados da planilha '+PL_ARQ+'?\\n\\nTudo o que foi lançado neste arquivo, neste computador, será apagado.'))return;
    try{gravar();}catch(e){}
    location.reload();
  };
  document.addEventListener('DOMContentLoaded',function(){
    var t=document.createElement('div');t.className='earl-pl-tag'+(window.EARL_PL_SEM_ESPACO?' sem':'');
    t.innerHTML='<b>'+PL_NOME+'</b><span>'+(window.EARL_PL_SEM_ESPACO?'⚠ este navegador não está salvando: o arquivo abre, mas as alterações não ficam salvas':'dados da planilha '+PL_ARQ+' · gerado em ${geradoEm}')+'</span><button type="button" title="Voltar aos dados da planilha">Reiniciar</button>';
    t.querySelector('button').onclick=window.earlPlReiniciar;
    document.body.appendChild(t);
  });
`;
  s = s.slice(0, j) + bloco + s.slice(j);
  s = s.replace(fim, () => fim + `
<style>
.earl-pl-tag{position:fixed;left:12px;bottom:12px;z-index:9000;display:flex;align-items:center;gap:10px;background:#1F4E79;color:#fff;border-radius:999px;padding:5px 6px 5px 14px;font:500 12px/1.2 Roboto,system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.18)}
.earl-pl-tag b{font-weight:700;letter-spacing:.06em}
.earl-pl-tag span{opacity:.85}
.earl-pl-tag button{background:#fff;color:#1F4E79;border:0;border-radius:999px;padding:4px 11px;font:600 12px Roboto,system-ui,sans-serif;cursor:pointer}
@media(max-width:700px){.earl-pl-tag span{display:none}}
.earl-pl-tag.sem{background:#8A3B1B}
</style>`);
  rep('<title>EARL — Engenharia</title>', '<title>EARL — Engenharia (' + esc(nome) + ')</title>');
  rep('      if (d.people && d.people.length > 0) return engQuimMig(migrateDB(d));', '      if (d.people && d.people.length > 0 && d.earlPlanilhaId === window.EARL_PL_ID) return engQuimMig(migrateDB(d));');
  rep('  return engQuimMig(migrateDB(JSON.parse(JSON.stringify(SEED_DB))));', '  return engQuimMig(migrateDB(JSON.parse(window.EARL_PL_SEED)));');
  const m = s.match(/var EARL_VERSION = '([^']*)';/g);
  if (!m || m.length !== 1) throw new Error('EARL_VERSION');
  const v = m[0].match(/'([^']*)'/)[1];
  rep("var EARL_VERSION = '" + v + "';", "var EARL_VERSION = '" + v + ' · ' + nome.replace(/'/g, '') + "';");
  return {html: s, pid, pref};
}

(async () => {
  const arquivo = path.basename(XLSX_ARQ);
  const {browser, page, errs} = await abrir(HTML, {hoje: HOJE});
  await page.waitForSelector('.eng-tools');
  await page.addScriptTag({content: LEITOR});
  await page.addScriptTag({content: casingParaBanco.toString()}); // roda dentro da página, como o montarBanco
  await page.evaluate(h => { window.HOJE_ISO = h; }, HOJE);
  const b64 = fs.readFileSync(XLSX_ARQ).toString('base64');
  const res = await page.evaluate(montarBanco, {b64, arquivo, nome: NOME});
  await page.reload();
  await page.waitForSelector('.eng-tools');
  await page.waitForFunction(() => typeof window.engGerDados === 'function', null, {timeout: 20000});
  const conf = await page.evaluate(conferir, res.alvo);
  const banco = await page.evaluate(() => localStorage.getItem('hal_cmt_db_v1'));
  if (!banco) throw new Error('banco não gravado');
  const base = fs.readFileSync(HTML, 'utf8');
  const out = embutir(base, banco, NOME, arquivo);
  fs.writeFileSync(SAIDA, out.html);
  delete res.alvo;
  const rel = {arquivo, nome: NOME, geradoEm: new Date().toISOString(), saida: path.basename(SAIDA), tamanhoMB: Math.round(out.html.length / 1e5) / 10, prefixo: out.pref, id: out.pid, ...res, conferencia: conf, errosApp: errs};
  if (RELAT) fs.writeFileSync(RELAT, JSON.stringify(rel, null, 1));
  console.log(JSON.stringify(rel, null, 1).slice(0, 6000));
  if (errs.length) { console.error('ERROS NO APP:', errs); process.exitCode = 1; }
  if (conf.nDiferencas) { console.error('DIFERENÇAS DE RECEITA/COGS:', conf.nDiferencas); process.exitCode = 1; }
  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });
