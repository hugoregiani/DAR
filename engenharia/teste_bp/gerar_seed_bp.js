// Gera os dados do teste BP (contrato, sonda NS-39, COGS e as operações da planilha) dentro do
// EARL_Engenharia.html e grava o banco resultante em JSON, para o montar_bp.py embutir no arquivo de teste.
//
// Uso: node teste_bp/gerar_seed_bp.js <Contrato_BP_Teste_EARL.xlsx> <EARL_Engenharia.html> <saida_seed.json>
//
// Planilha:
//   aba "Banco de dados Contratos": itens PPU do BP (item, descrição, UOM, R$ e US$ do Ano 1) e a data do contrato;
//   aba "Forecast": uma coluna por operação (status, sonda, poço, campo, descrição, fase, risco, contingência,
//   data, SO, WBS), as quantidades de itens PPU, de químicas e de casing por operação, a tabela de COGS
//   (químicos e casing) e o time de embarque.
// Regras combinadas com o usuário:
//   - Risco (%) da planilha vai para o campo "Risco da receita / COGS" da operação (0% conta tudo; 100% fica
//     mapeada, fora da receita e do COGS);
//   - pessoal = time de embarque × duração da operação;
//   - "Concluído" = consumo lançado igual ao previsto, com a data da operação; "Previsto" = só o planejado;
//   - COGS: químicos no banco de produtos químicos (conferido com a base embutida no app) e casing em Custos (COGS).
const {abrir} = require('../tests/harness');
const fs = require('fs');
const path = require('path');

const [XLSX_ARQ, HTML, SAIDA] = process.argv.slice(2);
if (!XLSX_ARQ || !HTML || !SAIDA) {
  console.error('uso: node teste_bp/gerar_seed_bp.js <planilha.xlsx> <EARL_Engenharia.html> <saida_seed.json>');
  process.exit(2);
}

(async () => {
  const {browser, page, errs} = await abrir(HTML, {hoje: '2026-11-02'});
  await page.waitForSelector('.eng-tools');
  const b64 = fs.readFileSync(XLSX_ARQ).toString('base64');
  const res = await page.evaluate(b64 => {
    /* ---------- leitura da planilha (com o XLSX embutido no app) ---------- */
    const wb = XLSX.read(b64, {type: 'base64'});
    const aba = n => XLSX.utils.sheet_to_json(wb.Sheets[n], {header: 1, raw: true, defval: null});
    const F = aba('Forecast');
    const B = aba('Banco de dados Contratos');
    const txt = v => v == null ? '' : String(v).trim();
    const num = v => typeof v === 'number' ? v : (v == null || v === '' ? 0 : Number(String(v).replace(',', '.')) || 0);
    const dataISO = v => {
      if (typeof v === 'number') { const d = XLSX.SSF.parse_date_code(v); return d.y + '-' + String(d.m).padStart(2, '0') + '-' + String(d.d).padStart(2, '0'); }
      return txt(v).slice(0, 10);
    };
    const avisos = [];
    // cabeçalho do Forecast: rótulo na coluna F (índice 5)
    const linhaDe = rot => F.findIndex(r => txt(r[5]).toLowerCase() === rot.toLowerCase());
    const L = {};
    ['Status', 'Sonda', 'Poço', 'Campo', 'Operação/Descrição', 'Fase do poço', 'Tipo operação', 'Risco', 'Contingência', 'Data da Operação', 'SO', 'WBS', 'RECEITA FINAL', 'COGS FINAL', 'Total receita', 'Total Cogs Químicos', 'HC', 'Responsável'].forEach(k => {
      L[k] = linhaDe(k);
      if (L[k] < 0) throw new Error('Forecast: linha "' + k + '" não encontrada');
    });
    const cols = [];
    for (let c = 6; c < F[L.Status].length; c++) if (txt(F[L.Status][c])) cols.push(c);
    const iPPU = F.findIndex(r => /^nome do contrato/i.test(txt(r[0])));
    const iQuim = F.findIndex(r => txt(r[0]) === 'SAP' && /qu[ií]micos/i.test(txt(r[1])));
    const iCas = F.findIndex(r => txt(r[0]) === 'SAP' && /casing/i.test(txt(r[1])));
    const iTime = F.findIndex(r => /time embarque/i.test(txt(r[5])));
    if ([iPPU, iQuim, iCas, iTime].some(i => i < 0)) throw new Error('Forecast: seções PPU/Químicos/Casing/Time não encontradas');
    const ppuRows = F.slice(iPPU + 1, iQuim).filter(r => txt(r[1]));
    const quimRows = F.slice(iQuim + 1, iCas).filter(r => txt(r[0]));
    const casRows = F.slice(iCas + 1, iTime).filter(r => txt(r[0]));
    const funcRows = F.slice(iTime + 1).filter(r => /^fun[cç][aã]o/i.test(txt(r[5])));

    /* ---------- contrato (Banco de dados Contratos) ---------- */
    const iCab = B.findIndex(r => /^nome do contrato/i.test(txt(r[0])));
    const linhaData = B.find(r => /^data/i.test(txt(r[5])));
    const inicio = linhaData ? dataISO(linhaData[6]) : '';
    const itensBanco = B.slice(iCab + 1).filter(r => txt(r[0]) === 'BP' && txt(r[3])).map(r => ({
      ref: txt(r[3]), desc: txt(r[4]), unit: txt(r[5]), brl: r[7] == null || r[7] === '' ? null : num(r[7]), usd: r[8] == null || r[8] === '' ? null : num(r[8])
    }));

    /* ---------- banco do app ---------- */
    const d = loadDB();
    const agora = new Date().toISOString();
    const ct = d.contratos.find(c => c.id === 'ct_bp');
    if (!ct) throw new Error('contrato ct_bp não existe no cadastro do EARL');
    const porRef = {};
    ct.items.forEach(i => { porRef[i.ref] = i; });
    let novos = 0;
    itensBanco.forEach(b => {
      let it = porRef[b.ref];
      if (!it) { it = {ref: b.ref, desc: b.desc, unit: b.unit, base: 'Macaé'}; ct.items.push(it); porRef[b.ref] = it; novos++; }
      it.brl = b.brl;
      it.usd = b.usd;
    });
    const semPreco = ct.items.filter(i => i.usd == null).map(i => i.ref);
    if (semPreco.length) avisos.push('itens do cadastro sem US$ na planilha: ' + semPreco.join(', '));
    ct.inicio = inicio;
    ct.reajustes = ct.reajustes || [];
    ct.atualizadoEm = agora;
    // preço do Forecast × preço do contrato (os diferentes não podem ter quantidade)
    const difPreco = ppuRows.filter(r => porRef[txt(r[1])] && Math.abs(num(r[5]) - (porRef[txt(r[1])].usd || 0)) > 1e-6).map(r => ({ref: txt(r[1]), forecast: num(r[5]), contrato: porRef[txt(r[1])].usd, usado: cols.some(c => num(r[c]) > 0)}));

    // sonda NS-39 (não está no cadastro de sondas offshore do EARL)
    let rig = d.rigs.find(r => [r.name, r.nomePetrobras].some(x => normNome(x) === 'ns-39'));
    if (!rig) {
      rig = {id: 'rig_bp_ns39', name: 'NS-39', nomePetrobras: 'NS-39', rigManager: '', cementUnit: '', rigTypeOff: '', floaterGen: '', client: 'BP', contract: 'BP', ambiente: 'offshore', base: 'Macaé', regiao: 'macae', active: true, type: 'perfuracao', polo: '', darEnabled: false, origem: 'teste_bp', updatedAt: agora};
      d.rigs.push(rig);
    }

    // químicos: banco de produtos químicos (e6), que já vem com a base desta mesma tabela; confere e, se diferir, usa a planilha
    const sapTxt = v => typeof v === 'number' && Number.isInteger(v) ? String(v) : txt(v);
    const quimPl = quimRows.map(r => ({sap: sapTxt(r[0]), nome: txt(r[1]), unid: txt(r[4]), usd: r[5] == null || r[5] === '' ? null : num(r[5])}));
    const quimAtual = (d.quimicos || []).map(q => [q.sap, q.nome, q.unid, q.usd].join('|')).sort().join('\n');
    const quimIguais = quimAtual === quimPl.map(q => [q.sap, q.nome, q.unid, q.usd].join('|')).sort().join('\n');
    if (!quimIguais) {
      d.quimicos = quimPl.map(q => ({id: 'q_' + q.sap, ...q, atualizadoEm: agora}));
      d.quimHist = [...(d.quimHist || []), {id: 'qh_bp', em: agora, por: '', origem: 'planilha', arquivo: 'Contrato_BP_Teste_EARL.xlsx (aba Forecast)', novos: 0, alterados: quimPl.length, removidos: 0, total: quimPl.length}];
      avisos.push('banco de químicos diferente da base: substituído pela tabela da planilha');
    }
    d.quimBaseV1 = d.quimBaseV1 || agora;
    // casing: COGS unitário em Contratos → Custos (COGS)
    d.cogsItens = casRows.map((r, i) => ({id: 'cg_bp_cas_' + (i + 1), sap: txt(r[0]), nome: txt(r[1]), unid: txt(r[4]), usd: num(r[5]), brl: null, atualizadoEm: agora}));

    // catálogo de químicas do EARL (nome e unidade pelo SAP)
    const cat = {};
    CHEMICALS.forEach(c => { cat[String(c.sap)] = {name: c.name, unit: c.unit}; });
    Object.entries(d.chemMeta || {}).forEach(([s, m]) => { if (m && m.name) cat[s] = {name: m.name, unit: m.unit}; });
    const difUnid = [];

    /* ---------- operações ---------- */
    const tipoDe = (desc, fase) => {
      const s = desc.toLowerCase();
      if (/p&a/.test(s)) return {tipoOp: 'Abandono'};
      if (/^lcp$/.test(s)) return {tipoOp: 'Tampão de combate à perda (LCP)'};
      const m = desc.match(/^\s*(\d+(?:\s+\d+\/\d+)?)"\s*(conductor|surface|liner|intermed|casing)/i);
      if (m) {
        const tam = m[1].replace(/\s+/g, ' ') + '"';
        if (!TAMANHOS_REV.includes(tam)) throw new Error('revestimento fora da lista: ' + tam);
        return {tipoOp: 'Cimentação primária', casing: tam};
      }
      let t = desc.trim();
      if (t.length > 20) t = t.replace('Diárias Eng e Offshore', 'Diárias Eng/Offshore').slice(0, 20);
      return {tipoOp: TIPO_OUTROS, tipoOutro: t};
    };
    const FUNC = {'tamponeiro': 'Tamponeiro', 'op. cabeça': 'Operador de Cabeça de Cimentação', 'op. casing': 'Especialista de Casing Equipment'};
    const ops = [];
    const resp = txt(F[L['Responsável']][cols[0]]) || 'Renata Alberton';
    d.plannedJobs = (d.plannedJobs || []).filter(j => !String(j.id).startsWith('bp_op_'));
    cols.forEach((c, k) => {
      const g = l => F[L[l]][c];
      const desc = txt(g('Operação/Descrição'));
      const fase = txt(g('Fase do poço'));
      const tp = tipoDe(desc, fase);
      const date = dataISO(g('Data da Operação'));
      const dur = durOfTipo(tp.tipoOp);
      const riscoRec = Math.round(num(g('Risco')) * 100);
      const ppuNeeds = ppuRows.filter(r => num(r[c]) > 0).map(r => {
        const it = porRef[txt(r[1])];
        if (!it) throw new Error('item PPU ' + txt(r[1]) + ' não está no contrato');
        return {ref: it.ref, desc: it.desc, unit: it.unit, qty: num(r[c])};
      });
      const mat = r => {
        const sap = txt(r[0]);
        const cc = cat[sap];
        const unit = txt(r[4]).toLowerCase();
        if (cc && String(cc.unit || '').toLowerCase() !== unit) difUnid.push({sap, catalogo: cc.unit, planilha: unit});
        return {sap, name: cc ? cc.name : txt(r[1]), unit, qty: num(r[c])};
      };
      const chems = quimRows.filter(r => num(r[c]) > 0).map(mat);
      const casingNeeds = casRows.filter(r => num(r[c]) > 0).map(mat);
      const time = {};
      funcRows.forEach(r => {
        const f = txt(r[c]);
        if (!f) return;
        const fn = FUNC[f.toLowerCase()] || f;
        time[fn] = (time[fn] || 0) + 1;
      });
      const peopleNeeds = Object.entries(time).map(([funcao, qty]) => ({funcao, qty, pessoas: pePessoas({qty}, date)}));
      const so = txt(g('SO'));
      const j = {
        id: 'bp_op_' + String(k + 1).padStart(2, '0'),
        loc: 'macae',
        clienteName: ct.clientName,
        contratoLabel: ct.numero || ct.name,
        contratoId: ct.id,
        rigId: rig.id,
        well: txt(g('Poço')),
        tipoOp: tp.tipoOp,
        tipoOutro: tp.tipoOutro || '',
        casing: tp.casing || '',
        date,
        baselineDate: date,
        durationDays: dur,
        salesOrder: so,
        wbs: txt(g('WBS')),
        vida: '',
        anchor: 'fixed',
        contingencia: /^sim/i.test(txt(g('Contingência'))),
        risco: /^sim/i.test(txt(g('Contingência'))) ? 0 : null,
        riscoRec,
        templateId: '',
        notes: 'Planilha BP: ' + desc + (fase ? ' · fase ' + fase : '') + ' · campo ' + txt(g('Campo')),
        equipNeeds: [],
        chems,
        ppuNeeds,
        casingNeeds,
        peopleNeeds,
        status: PJ_STATUS.PLAN,
        createdAt: agora,
        updatedAt: agora,
        log: [{em: agora, por: resp, acao: 'Operação importada da planilha do teste BP', detalhe: desc + ' · ' + txt(g('Status'))}]
      };
      if (/^conclu/i.test(txt(g('Status')))) {
        j.ppuCons = {
          data: date,
          linhas: ppuNeeds.map(n => ({ref: n.ref, desc: n.desc, unit: n.unit, qty: n.qty})),
          quim: chems.map(m => ({sap: m.sap, name: m.name, unit: m.unit, qty: m.qty})),
          cas: casingNeeds.map(m => ({sap: m.sap, name: m.name, unit: m.unit, qty: m.qty})),
          pes: peopleNeeds.map(n => ({funcao: n.funcao, pessoas: n.qty, dias: dur, hd: n.qty * dur})),
          em: agora,
          por: resp
        };
      }
      ops.push(j);
    });
    d.plannedJobs = [...d.plannedJobs, ...ops];
    d.hoMail = {...(d.hoMail || {}), nome: resp};
    d.gerCfg = {...(d.gerCfg || {}), contratos: [ct.id]};
    saveDB(d);
    return {
      inicio, itensBanco: itensBanco.length, itensContrato: ct.items.length, novos, rig: rig.id, quimicos: d.quimicos.length, quimIguais, cogsCasing: d.cogsItens.length,
      ops: ops.length, concluidas: ops.filter(j => j.ppuCons).length, risco100: ops.filter(j => j.riscoRec >= 100).map(j => j.id),
      tipos: ops.map(j => j.id + ' ' + j.date + ' ' + (j.tipoOp === TIPO_OUTROS ? j.tipoOutro : j.tipoOp + (j.casing ? ' ' + j.casing : '')) + ' · ' + j.ppuNeeds.length + ' PPU · ' + j.chems.length + ' quím · ' + j.peopleNeeds.map(n => n.qty + ' ' + n.funcao).join(' + ') + (j.ppuCons ? ' · CONSUMO' : '') + (j.riscoRec ? ' · risco ' + j.riscoRec + '%' : '')),
      difPreco, difUnid: [...new Map(difUnid.map(x => [x.sap, x])).values()], avisos
    };
  }, b64);
  // reabre para conferir que o app carrega o banco sem erro
  await page.reload();
  await page.waitForSelector('.eng-tools');
  await page.waitForTimeout(800);
  const banco = await page.evaluate(() => localStorage.getItem('hal_cmt_db_v1'));
  fs.writeFileSync(SAIDA, banco);
  console.log(JSON.stringify(res, null, 1));
  console.log('banco: %s (%s KB)', SAIDA, Math.round(banco.length / 1024));
  if (errs.length) { console.error('ERROS NO APP:', errs); process.exitCode = 1; }
  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });
