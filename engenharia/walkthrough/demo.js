// Dados de demonstração para o walkthrough do EARL Engenharia: 3 contratos fictícios (números e valores inventados),
// operações em 2 sondas cada, consumo lançado nas concluídas, inventário, câmbio e preços de químicos/casing fictícios.
// Exporta montar(page): grava o banco no navegador e recarrega.
const montar = async page => {
  await page.evaluate(() => {
    const d = loadDB();
    const ag = '2026-11-13T12:00:00.000Z';
    // números "aleatórios" fixos (sempre o mesmo resultado)
    let semente = 7;
    const rnd = () => { semente = (semente * 9301 + 49297) % 233280; return semente / 233280; };
    const preco = (a, b) => Math.round((a + rnd() * (b - a)) * 100) / 100;
    const rigBy = np => d.rigs.find(r => r.nomePetrobras === np || r.name === np);
    const base = id => d.contratos.find(c => c.id === id);
    d.contratos.forEach(c => { c.archived = true; });
    const copia = (srcId, id, nome, numero, n, moeda, faixa) => {
      const s = base(srcId);
      const items = s.items.slice(0, n).map(i => {
        const o = {...i}; delete o.usd; delete o.brl;
        o[moeda] = preco(faixa[0], faixa[1]);
        if (o.qtd != null) o.qtd = Math.round(5 + rnd() * 60);
        return o;
      });
      return {...JSON.parse(JSON.stringify(s)), id, name: nome, numero, archived: false, items, reajustes: [], inicio: '2026-01-01', origem: 'demo', updatedAt: ag};
    };
    const PA = copia('ct_5900_0127108_24', 'ct_demo_pa', 'P&A — Macaé (offshore)', '5900.0000001.26', 24, 'brl', [18000, 160000]);
    const BP = copia('ct_bp', 'ct_demo_bp', 'BP — Macaé (offshore)', 'BP-0000-DEMO', 30, 'usd', [40, 9000]);
    const TK = copia('ct_takatsugu_j', 'ct_demo_tk', 'Takatsugu J', 'TKJ-0000-DEMO', 8, 'usd', [900, 14000]);
    d.contratos.push(PA, BP, TK);
    const QS = d.quimicos;
    QS.forEach(q => { if (typeof q.usd === 'number') q.usd = Math.round(q.usd * (0.8 + rnd() * 0.4) * 100) / 100; q.atualizadoEm = '2026-11-03T12:00:00.000Z'; });
    d.casingEquip.forEach(c => { c.usd = preco(120, 4800); c.atualizadoEm = '2026-11-03T12:00:00.000Z'; c.id = c.id || 'ce_' + c.sap; });
    d.casDbV1 = ag; d.cogsItens = [];
    d.quimHist = [...(d.quimHist || []), {id: 'qh_dm', em: '2026-11-03T12:00:00.000Z', por: 'Ana Ribeiro', origem: 'planilha', arquivo: 'Banco_Quimicos_Nov2026.xlsx', novos: 0, alterados: 52, removidos: 0, total: QS.length}];
    d.casHist = [{id: 'ce_h_dm', em: '2026-11-03T12:00:00.000Z', por: 'Ana Ribeiro', origem: 'planilha', arquivo: 'Banco_Casing_Nov2026.xlsx', novos: 0, alterados: d.casingEquip.length, removidos: 0, total: d.casingEquip.length}];
    const q = nome => QS.find(x => x.nome && x.nome.toUpperCase().indexOf(nome) === 0) || QS[0];
    const cas = (i) => d.casingEquip[i];
    const R = {
      n32: rigBy('NS-32'), n45: rigBy('NS-45'), olinda: rigBy('Olinda Star'), n38: rigBy('NS-38'), n40: rigBy('NS-40')
    };
    const job = (ct, rig, id, well, tipoOp, casing, date, extra) => {
      const it = k => ct.items[k];
      const ppu = (extra.ppu || [[0, 1], [2, 1]]).map(([k, qt]) => ({ref: it(k).ref, desc: it(k).desc, unit: it(k).unit, qty: qt}));
      const chems = (extra.quim || [['HALAD-344', 300], ['CIMENTO CLASS G', 600]]).map(([n, qt]) => { const x = q(n); return {sap: x.sap, name: x.nome, unit: x.unid, qty: qt}; });
      const casingNeeds = (extra.cas || [[3, 2]]).map(([k, qt]) => ({sap: cas(k).sap, name: cas(k).name, unit: cas(k).unit, qty: qt}));
      const peopleNeeds = (extra.pes || [['Supervisor de Cimentação', 1], ['Operador de Cimentação', 2]]).map(([f, qt]) => ({funcao: f, qty: qt, pessoas: pePessoas({qty: qt}, date)}));
      const j = {id, loc: 'macae', clienteName: ct.clientName, contratoLabel: ct.numero, contratoId: ct.id, rigId: rig.id, well, tipoOp, tipoOutro: '', casing: casing || '',
        date, baselineDate: date, durationDays: extra.dur || 2, salesOrder: extra.so || '', wbs: '', vida: extra.vida || '', anchor: extra.anchor || 'chain', templateId: '',
        notes: extra.notes || '', equipNeeds: [], chems, ppuNeeds: ppu, casingNeeds, peopleNeeds,
        contingencia: !!extra.cont, riscoRec: extra.risco || 0, risco: extra.cont ? 100 - (extra.risco || 0) : null,
        status: PJ_STATUS.PLAN, createdAt: ag, updatedAt: ag, log: [{em: ag, por: 'Ana Ribeiro', acao: 'Operação criada', detalhe: ''}]};
      if (extra.feita) j.ppuCons = {data: date, linhas: ppu.map(x => ({...x})), quim: chems.map(x => ({...x})), cas: casingNeeds.map(x => ({...x})),
        pes: peopleNeeds.map(n => ({funcao: n.funcao, pessoas: n.qty, dias: j.durationDays, hd: n.qty * j.durationDays})), em: ag, por: 'Ana Ribeiro'};
      return j;
    };
    d.plannedJobs = [
      job(PA, R.n32, 'dm01', '7-ABL-24-RJS', 'Abandono', '', '2026-09-08', {feita: 1, so: '460100101', vida: 'H100101', ppu: [[0, 1], [3, 2], [5, 1]]}),
      job(PA, R.n32, 'dm02', '7-ABL-31-RJS', 'Abandono', '', '2026-10-06', {feita: 1, so: '460100102', vida: 'H100102', ppu: [[1, 1], [3, 1]]}),
      job(PA, R.n45, 'dm03', '7-MRL-12-RJS', 'Squeeze', '', '2026-10-20', {feita: 1, so: '460100103', vida: 'H100103', ppu: [[2, 1], [6, 2]], quim: [['HALAD-413', 120], ['CIMENTO CLASS G', 400]]}),
      job(PA, R.n32, 'dm04', '7-ABL-40-RJS', 'Abandono', '', '2026-11-18', {so: '460100104', vida: 'H100104', ppu: [[0, 1], [3, 2]]}),
      job(PA, R.n45, 'dm05', '7-MRL-15-RJS', 'Abandono', '', '2026-12-02', {ppu: [[4, 1], [7, 1]], cont: 1, risco: 30}),
      job(PA, R.n32, 'dm06', '7-ABL-44-RJS', 'Abandono', '', '2026-12-15', {ppu: [[0, 1], [5, 1]]}),
      job(PA, R.n45, 'dm07', '7-MRL-20-RJS', 'Squeeze', '', '2027-01-12', {ppu: [[2, 1]], cont: 1, risco: 100}),
      job(BP, R.olinda, 'dm11', '9-BP-13-RJS', 'Cimentação primária', '9 5/8"', '2026-09-25', {feita: 1, so: '460200201', vida: 'H200201', ppu: [[0, 40], [5, 20], [9, 1]]}),
      job(BP, R.olinda, 'dm12', '9-BP-16-RJS', 'Cimentação primária', '13 3/8"', '2026-10-28', {feita: 1, so: '460200202', vida: 'H200202', ppu: [[1, 60], [9, 1]]}),
      job(BP, R.olinda, 'dm13', '9-BP-16-RJS', 'Cimentação primária', '9 5/8"', '2026-11-25', {ppu: [[0, 40], [9, 1]]}),
      job(BP, R.olinda, 'dm14', '9-BP-19-RJS', 'Top-job', '', '2027-01-20', {ppu: [[3, 10]], cont: 1, risco: 50}),
      job(TK, R.n38, 'dm21', '3-TKJ-2-RJS', 'Cimentação primária', '20"', '2026-10-12', {feita: 1, so: '460300301', vida: 'H300301', ppu: [[0, 3], [1, 1]]}),
      job(TK, R.n38, 'dm22', '3-TKJ-2-RJS', 'Cimentação primária', '13 3/8"', '2026-11-30', {ppu: [[0, 4], [2, 1]]}),
      job(TK, R.n38, 'dm23', '3-TKJ-5-RJS', 'Cimentação primária', '20"', '2027-02-08', {ppu: [[0, 3]]})
    ];
    d.cambio = [{ano: 2026, mes: 8, valor: 5.42}, {ano: 2026, mes: 9, valor: 5.38}, {ano: 2026, mes: 10, valor: 5.35}, {ano: 2026, mes: 11, valor: 5.31}].map(c => ({...c, em: ag, por: 'Ana Ribeiro'}));
    const it = (n, qt) => { const x = q(n); return {sap: x.sap, nome: x.nome, unid: x.unid, qtd: qt}; };
    d.invSondas = [
      {id: 'inv_dm1', rigId: R.n32.id, sonda: 'NS-32', ctId: PA.id, data: '2026-11-05', por: 'Ana Ribeiro', obs: '', itens: [it('HALAD-344', 180), it('CIMENTO CLASS G', 420), it('HALAD-413', 60)], criadoEm: ag, atualizadoEm: ag},
      {id: 'inv_dm2', rigId: R.n45.id, sonda: 'NS-45', ctId: PA.id, data: '2026-10-28', por: 'Ana Ribeiro', obs: '', itens: [it('HALAD-344', 95), it('CIMENTO CLASS G', 300)], criadoEm: ag, atualizadoEm: ag}
    ];
    d.hoMail = {...(d.hoMail || {}), nome: 'Ana Ribeiro', emails: ['logistica.macae@exemplo.com', 'materiais.macae@exemplo.com', 'coordenacao.macae@exemplo.com']};
    saveDB(d);
  });
  await page.reload();
  await page.waitForSelector('.eng2-card', {timeout: 60000});
};
module.exports = {montar};
