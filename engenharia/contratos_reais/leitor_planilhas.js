/* Leitor das planilhas de contrato (abas "Forecast" e "Banco de dados contratos") para o EARL Engenharia.
   Funciona no navegador (dentro do app, com o XLSX dele) e no Node (com o pacote xlsx), sem mais nada.

   lerPlanilhaContratos(XLSX, wb, arquivo) → modelo:
     {arquivo, layout: 'colunas'|'linhas', contratos[], operacoes[], quimicos[], casing[], avisos[]}

   Dois formatos de "Forecast":
   - colunas (PA, BW, BDII, Shell, como o teste BP): rótulos na coluna F, uma operação por coluna a partir da G;
     depois as seções de itens PPU, químicos (SAP | Químicos), casing (SAP | Casing) e o time de embarque;
   - linhas (CE, DC): uma linha por item cobrado, com cliente, contrato, status, risco, item, quantidade, preço,
     sonda, poço, operação, data, receita/COGS (e os valores manuais). Vários contratos no mesmo arquivo.
   E dois formatos de "Banco de dados contratos":
   - por anos (colunas): a linha "Data:" dá a data de cada bloco de 6 colunas (índice, R$, US$, receita total,
     rev. share, receita CMT); o preço do bloco é a receita CMT (ou US$ × rev. share);
   - por linhas: preço inicial (US$, receita CMT ou R$ ÷ câmbio) e reajustes "Data reajuste / Índice / Valor
     reajustado" (índice acumulado sobre o preço inicial).

   Receita e COGS: o app calcula quantidade × preço do contrato na data. Quando o valor da planilha
   (RECEITA FINAL / COGS FINAL, antes do risco) for diferente — câmbio do mês já faturado, item não cobrado,
   crédito de NPT, valor manual —, a diferença vai para a operação como "ajuste" (ajRec, ajQuim, ajCE), para
   o total de cada operação ficar igual ao da planilha. */
(function (raiz) {
  'use strict';
  var txt = function (v) { return v == null ? '' : String(v).replace(/\s+/g, ' ').trim(); };
  var ehNum = function (v) {
    if (typeof v === 'number') return isFinite(v);
    var s = txt(v);
    return s !== '' && s !== '-' && isFinite(Number(s.replace(',', '.')));
  };
  var num = function (v) { return ehNum(v) ? (typeof v === 'number' ? v : Number(txt(v).replace(',', '.'))) : 0; };
  var r4 = function (v) { return Math.round(v * 10000) / 10000; };
  var semAcento = function (s) { return txt(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  var sapTxt = function (v) { return typeof v === 'number' && Number.isInteger(v) ? String(v) : txt(v); };
  var slug = function (s) { return semAcento(s).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'x'; };

  function dataISO(XLSX, v) {
    if (typeof v === 'number' && v > 20000 && v < 80000) {
      var d = XLSX.SSF.parse_date_code(v);
      return d.y + '-' + String(d.m).padStart(2, '0') + '-' + String(d.d).padStart(2, '0');
    }
    var s = txt(v), m;
    if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) return m[1] + '-' + m[2] + '-' + m[3];
    if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/))) return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
    return '';
  }

  // preço vigente numa data: a última entrada com "desde" ≤ data (antes da primeira, vale a primeira)
  function precoNaData(agenda, data) {
    if (!agenda || !agenda.length) return 0;
    var p = agenda[0].usd;
    agenda.forEach(function (a) { if (!a.desde || !data || a.desde <= data) p = a.usd; });
    return p;
  }
  function limparAgenda(ag) {
    ag = ag.filter(function (a) { return a.usd != null && isFinite(a.usd); }).sort(function (a, b) { return String(a.desde).localeCompare(String(b.desde)); });
    var o = [];
    ag.forEach(function (a) { if (!o.length || Math.abs(o[o.length - 1].usd - a.usd) > 1e-9) o.push(a); });
    return o;
  }

  function aba(XLSX, wb, re) {
    var n = wb.SheetNames.find(function (x) { return re.test(semAcento(x)); });
    return n ? XLSX.utils.sheet_to_json(wb.Sheets[n], {header: 1, raw: true, defval: null}) : null;
  }

  /* ===================== Forecast por colunas (PA, BW, BDII, Shell) ===================== */
  function lerColunas(XLSX, F, B, M) {
    var rot = function (r) { return semAcento(r && r[5]); };
    var L = {};
    var ROT = {resp: 'responsavel', status: 'status', sonda: 'sonda', poco: 'poco', campo: 'campo', desc: 'operacao/descricao', fase: 'fase do poco', tipo: 'tipo operacao', risco: 'risco', cont: 'contingencia', data: 'data da operacao', so: 'so', wbs: 'wbs', tipoRec: 'tipo receita', rf: 'receita final', cf: 'cogs final', tr: 'total receita', tc: 'total cogs', tq: 'total cogs quimicos', tce: 'total cogs ce', hc: 'hc'};
    Object.keys(ROT).forEach(function (k) { L[k] = F.findIndex(function (r) { return rot(r) === ROT[k]; }); });
    ['status', 'sonda', 'desc', 'data', 'rf'].forEach(function (k) { if (L[k] < 0) throw new Error('Forecast: linha "' + ROT[k] + '" não encontrada na coluna F'); });
    var cols = [];
    for (var c = 6; c < (F[L.status] || []).length; c++) if (txt(F[L.status][c])) cols.push(c);
    var iPPU = F.findIndex(function (r) { return /^nome do contrato/.test(semAcento(r && r[0])); });
    var iQ = F.findIndex(function (r) { return r && txt(r[0]) === 'SAP' && /quimicos/.test(semAcento(r[1])); });
    var iC = F.findIndex(function (r) { return r && txt(r[0]) === 'SAP' && /casing/.test(semAcento(r[1])); });
    var iT = F.findIndex(function (r) { return /time embarque/.test(rot(r)); });
    if (iPPU < 0 || iQ < 0) throw new Error('Forecast: seções de itens PPU / químicos não encontradas');
    if (iC < 0) iC = iT >= 0 ? iT : F.length;
    if (iT < 0) iT = F.length;
    var ppuRows = F.slice(iPPU + 1, iQ).filter(function (r) { return r && txt(r[1]); });
    var quimRows = F.slice(iQ + 1, iC).filter(function (r) { return r && txt(r[0]); });
    var casRows = F.slice(iC + 1, iT).filter(function (r) { return r && txt(r[0]); });
    var funcRows = F.slice(iT + 1).filter(function (r) { return /^funcao/.test(rot(r)); });

    /* ---- Banco por anos ---- */
    var iCab = B.findIndex(function (r) { return /^nome do contrato/.test(semAcento(r && r[0])); });
    if (iCab < 0) throw new Error('Banco de dados contratos: cabeçalho "Nome do Contrato" não encontrado');
    var cab = B[iCab];
    var linhaData = B.slice(0, iCab).find(function (r) { return /^data/.test(semAcento(r && r[5])); }) || [];
    var blocos = [];
    for (var b = 6; b < cab.length; b += 6) {
      if (!/indice/.test(semAcento(cab[b]))) break;
      var nomeB = (txt(cab[b + 5]).match(/(ano\s*\d+|renecom)/i) || txt(cab[b]).match(/(ano\s*\d+|renecom)/i) || [])[1] || ('bloco ' + (blocos.length + 1));
      blocos.push({c: b, desde: dataISO(XLSX, linhaData[b]), nome: nomeB.replace(/\s+/g, ' ').replace(/^ano/i, 'Ano').replace(/^renecom/i, 'RENECOM')});
    }
    var precoBloco = function (r, bl) {
      var c = bl.c, share = ehNum(r[c + 4]) ? num(r[c + 4]) : 1;
      if (ehNum(r[c + 5])) return num(r[c + 5]);
      if (ehNum(r[c + 3])) return num(r[c + 3]) * share;
      if (ehNum(r[c + 2])) return num(r[c + 2]) * share;
      return null;
    };
    var cts = {};
    B.slice(iCab + 1).forEach(function (r) {
      if (!r || !txt(r[0]) || !txt(r[3])) return;
      var nome = txt(r[0]);
      var ct = cts[nome] = cts[nome] || {chave: nome, nome: nome, cliente: txt(r[1]), numero: '', itens: [], porRef: {}, origem: 'banco'};
      if (!ct.numero && txt(r[2]) && /\d{4,}/.test(txt(r[2])) && !/^w\d/i.test(txt(r[2]))) ct.numero = txt(r[2]);
      var ref = txt(r[3]);
      if (ct.porRef[ref]) { M.avisos.push(nome + ': item ' + ref + ' repetido no Banco (fica o primeiro)'); return; }
      var ag = blocos.filter(function (bl) { return bl.desde; }).map(function (bl) { return {desde: bl.desde, usd: precoBloco(r, bl), nome: bl.nome}; });
      var it = {ref: ref, refPl: ref, desc: txt(r[4]), unit: txt(r[5]), agenda: limparAgenda(ag), po: /^w\d/i.test(txt(r[2])) ? txt(r[2]) : ''};
      ct.itens.push(it); ct.porRef[ref] = it;
    });
    var nomes = Object.keys(cts);
    if (!nomes.length) throw new Error('Banco de dados contratos: nenhum item');
    var ctNome = (ppuRows[0] && txt(ppuRows[0][0])) || nomes[0];
    if (!cts[ctNome]) { M.avisos.push('contrato "' + ctNome + '" do Forecast não está no Banco: usando "' + nomes[0] + '"'); ctNome = nomes[0]; }
    var ct = cts[ctNome];
    ct.inicio = blocos.map(function (bl) { return bl.desde; }).filter(Boolean).sort()[0] || '';
    ct.blocos = blocos.filter(function (bl) { return bl.desde; }).map(function (bl) { return {desde: bl.desde, nome: bl.nome}; });
    // itens do Forecast que não estão no Banco: entram com o preço do Forecast
    var hojeRef = null;
    ppuRows.forEach(function (r) {
      var ref = txt(r[1]);
      var it = ct.porRef[ref];
      var pf = ehNum(r[5]) ? num(r[5]) : null;
      if (!it) {
        it = {ref: ref, refPl: ref, desc: txt(r[2]), unit: txt(r[4]), agenda: pf != null ? [{desde: ct.inicio, usd: pf}] : []};
        ct.itens.push(it); ct.porRef[ref] = it;
        if (cols.some(function (c) { return num(r[c]) > 0; })) M.avisos.push(ctNome + ': item ' + ref + ' só está no Forecast (preço do Forecast: ' + pf + ')');
        return;
      }
      if (!it.agenda.length && pf != null) { it.agenda = [{desde: ct.inicio, usd: pf}]; M.avisos.push(ctNome + ': item ' + ref + ' sem preço no Banco (usado o do Forecast)'); }
      if (pf != null && it.agenda.length && !it.agenda.some(function (a) { return Math.abs(a.usd - pf) < 0.005; })) it.difForecast = pf;
    });
    var difF = ct.itens.filter(function (i) { return i.difForecast != null; });
    if (difF.length) M.avisos.push(ctNome + ': ' + difF.length + ' item(ns) com preço do Forecast diferente de todos os anos do Banco (ex.: ' + difF.slice(0, 3).map(function (i) { return i.ref + ' ' + r4(i.difForecast); }).join(', ') + ')');
    M.contratos.push(ct);
    Object.keys(cts).forEach(function (n) { if (n !== ctNome) M.avisos.push('contrato "' + n + '" só está no Banco (sem operações): não incluído'); });

    /* ---- tabelas de COGS ---- */
    var mats = function (rows) { return rows.map(function (r) { return {sap: sapTxt(r[0]), nome: txt(r[1]), unid: txt(r[4]), usd: ehNum(r[5]) ? num(r[5]) : null}; }); };
    M.quimicos = mats(quimRows);
    M.casing = mats(casRows);
    var custo = {};
    M.casing.forEach(function (m) { custo[m.sap] = m.usd || 0; });
    M.quimicos.forEach(function (m) { custo[m.sap] = m.usd || 0; });

    /* ---- operações ---- */
    var g = function (k, c) { return L[k] >= 0 ? F[L[k]][c] : null; };
    cols.forEach(function (c, k) {
      var risco = Math.max(0, Math.min(1, num(g('risco', c))));
      var data = dataISO(XLSX, g('data', c));
      var ppu = ppuRows.filter(function (r) { return num(r[c]) > 0; }).map(function (r) { return {ref: txt(r[1]), qty: num(r[c])}; });
      var mat = function (r) { return {sap: sapTxt(r[0]), nome: txt(r[1]), unit: txt(r[4]).toLowerCase(), qty: num(r[c])}; };
      var quim = quimRows.filter(function (r) { return num(r[c]) > 0; }).map(mat);
      var cas = casRows.filter(function (r) { return num(r[c]) > 0; }).map(mat);
      var time = {};
      funcRows.forEach(function (r) { var f = txt(r[c]); if (f) time[f] = (time[f] || 0) + 1; });
      var calcR = ppu.reduce(function (a, l) { return a + l.qty * precoNaData((ct.porRef[l.ref] || {}).agenda, data); }, 0);
      var calcQ = quim.reduce(function (a, m) { return a + m.qty * (custo[m.sap] || 0); }, 0);
      var calcC = cas.reduce(function (a, m) { return a + m.qty * (custo[m.sap] || 0); }, 0);
      var rf = num(g('rf', c)), cf = num(g('cf', c)), tq = num(g('tq', c)), tce = num(g('tce', c));
      // valores antes do risco: com risco 100% a planilha zera tudo; aí fica o calculado (sem ajuste)
      var alvoR = risco < 1 ? rf / (1 - risco) : calcR;
      var alvoC = risco < 1 ? cf / (1 - risco) : calcQ + calcC;
      var alvoQ = risco < 1 ? (L.tq >= 0 ? tq / (1 - risco) : calcQ) : calcQ;
      if (alvoQ > alvoC + 0.005) alvoQ = alvoC; // COGS de químicos não pode passar do COGS total
      M.operacoes.push({
        n: k + 1, coluna: XLSX.utils.encode_col(c), contrato: ctNome, cliente: ct.cliente,
        sonda: txt(g('sonda', c)), poco: txt(g('poco', c)), campo: txt(g('campo', c)), desc: txt(g('desc', c)),
        fase: txt(g('fase', c)), tipoPl: txt(g('tipo', c)), tipoReceita: txt(g('tipoRec', c)), status: txt(g('status', c)),
        concluida: /^conclu/.test(semAcento(g('status', c))), risco: risco, contingencia: /^sim/.test(semAcento(g('cont', c))),
        data: data, so: txt(g('so', c)).replace(/^-$/, ''), wbs: txt(g('wbs', c)).replace(/^-$/, ''), resp: txt(g('resp', c)),
        ppu: ppu, quim: quim, cas: cas, time: time,
        ajRec: r4(alvoR - calcR), ajQuim: r4(alvoQ - calcQ), ajCE: r4(alvoC - alvoQ - calcC),
        rf: rf, cf: cf, linhas: []
      });
    });
  }

  /* ===================== Forecast por linhas (CE, DC) ===================== */
  function colunasPorTitulo(cab, defs) {
    var o = {};
    Object.keys(defs).forEach(function (k) { o[k] = cab.findIndex(function (h) { return defs[k].test(semAcento(h)); }); });
    return o;
  }
  function lerLinhas(XLSX, F, B, M) {
    var iH = F.findIndex(function (r) { return r && r.some(function (v) { return /^nome do cliente/.test(semAcento(v)); }); });
    var I = colunasPorTitulo(F[iH], {
      cliente: /^nome do cliente/, numero: /^numero do contrato/, contrato: /^contrato$/, resp: /^responsavel/, status: /^status/,
      risco: /^risco/, item: /^item/, qtd: /^(qty|qtd)$/, uom: /^uom/, desc: /^descricao/, preco: /^preco unit/, sonda: /^sonda/,
      poco: /^poco/, campo: /^campo/, op: /^operacao/, tipoRec: /^tipo (de )?receita/, data: /^data/, cont: /^contingencia/,
      so: /^so( receita)?$/, wbs: /^wbs/, rf: /^receita final/, cf: /^cogs final/, rm: /^receita manual/, cm: /^cogs manual/,
      cq: /cogs quimicos/, cce: /cogs ce/
    });
    ['contrato', 'status', 'item', 'qtd', 'preco', 'data', 'rf'].forEach(function (k) { if (I[k] < 0) throw new Error('Forecast: coluna "' + k + '" não encontrada'); });
    var linhas = F.slice(iH + 1).filter(function (r) { return r && txt(r[I.contrato]) && txt(r[I.status]); });

    /* ---- Banco por linhas ---- */
    var iB = B.findIndex(function (r) { return r && r.some(function (v) { return /^nome do contrato/.test(semAcento(v)); }); });
    var cabB = B[iB];
    var J = colunasPorTitulo(cabB, {contrato: /^nome do contrato/, cliente: /^nome do cliente/, numero: /^numero do contrato/, item: /^item/, desc: /^descricao/, uom: /^uom/, brl: /^preco unitario \( ?r\$\)$/, usd: /^preco unitario \(us\$\)/, total: /^receita total/, share: /^rev\. ?share/, cmt: /^receita cmt/});
    var reajCols = [];
    cabB.forEach(function (h, c) { if (/^data reajuste/.test(semAcento(h))) reajCols.push({c: c, nome: (txt(h).match(/ano\s*\d+/i) || ['Ano ' + (reajCols.length + 1)])[0].replace(/\s+/g, ' ')}); });
    var banco = {};
    B.slice(iB + 1).forEach(function (r) {
      if (!r || !txt(r[J.contrato]) || !txt(r[J.item])) return;
      (banco[txt(r[J.contrato])] = banco[txt(r[J.contrato])] || []).push(r);
    });
    // câmbio dos itens só em R$: o que a planilha usou (R$ × índice ÷ preço da linha)
    var fxs = {};
    var precoBase = function (r) {
      var share = ehNum(r[J.share]) && num(r[J.share]) > 0 ? num(r[J.share]) : 1;
      if (J.cmt >= 0 && ehNum(r[J.cmt]) && num(r[J.cmt]) !== 0) return {usd: num(r[J.cmt])};
      if (J.total >= 0 && ehNum(r[J.total]) && num(r[J.total]) !== 0) return {usd: num(r[J.total]) * share};
      if (ehNum(r[J.usd])) return {usd: num(r[J.usd]) * share};
      if (ehNum(r[J.brl])) return {brl: num(r[J.brl]) * share};
      return {usd: null};
    };
    var cts = {}, ordem = [];
    var achaCt = function (nome, cliente) {
      if (cts[nome]) return cts[nome];
      var ct = cts[nome] = {chave: nome, nome: nome, cliente: cliente, numero: '', itens: [], porRef: {}, inicio: '', origem: banco[nome] ? 'banco' : 'forecast'};
      ordem.push(nome);
      var vistos = {};
      (banco[nome] || []).forEach(function (r) {
        var refPl = txt(r[J.item]);
        var ref = refPl;
        vistos[refPl] = (vistos[refPl] || 0) + 1;
        if (vistos[refPl] > 1) ref = refPl + ' #' + vistos[refPl];
        var pb = precoBase(r);
        var it = {ref: ref, refPl: refPl, desc: txt(r[J.desc]), unit: txt(r[J.uom]), base: pb, reajs: []};
        reajCols.forEach(function (rc) {
          var d = dataISO(XLSX, r[rc.c]);
          if (!d || !ehNum(r[rc.c + 1])) return;
          it.reajs.push({desde: d, idx: num(r[rc.c + 1]), valor: ehNum(r[rc.c + 2]) ? num(r[rc.c + 2]) : null, nome: rc.nome});
        });
        if (!ct.cliente && txt(r[J.cliente])) ct.cliente = txt(r[J.cliente]);
        ct.itens.push(it);
        (ct.porRef[refPl] = ct.porRef[refPl] || []).push(it);
      });
      return ct;
    };
    var acharItem = function (ct, refPl, desc) {
      var l = ct.porRef[refPl] || [];
      if (l.length <= 1) return l[0] || null;
      var d = semAcento(desc);
      return l.find(function (i) { return semAcento(i.desc) === d; }) || l.find(function (i) { return d && (semAcento(i.desc).indexOf(d) === 0 || d.indexOf(semAcento(i.desc)) === 0); }) || l[0];
    };
    // 1ª passada: contratos, câmbio dos itens em R$
    linhas.forEach(function (r) {
      var ct = achaCt(txt(r[I.contrato]), txt(r[I.cliente]));
      var it = acharItem(ct, txt(r[I.item]), txt(r[I.desc]));
      var p = num(r[I.preco]), d = dataISO(XLSX, r[I.data]);
      if (it && it.base.brl != null && p > 0) {
        var idx = 1;
        it.reajs.forEach(function (x) { if (x.desde <= d) idx = x.idx; });
        var fx = Math.round(it.base.brl * idx / p * 10000) / 10000;
        fxs[fx] = (fxs[fx] || 0) + 1;
      }
    });
    var fx = Number(Object.keys(fxs).sort(function (a, b) { return fxs[b] - fxs[a]; })[0]) || 5.0181;
    M.cambio = fx;
    // agendas de preço dos itens
    ordem.forEach(function (n) {
      var ct = cts[n];
      ct.itens.forEach(function (it) {
        var base = it.base.usd != null ? it.base.usd : it.base.brl != null ? it.base.brl / fx : null;
        it.agenda = limparAgenda([{desde: '', usd: base}].concat(it.reajs.map(function (x) {
          var v = x.valor != null && x.valor !== 0 ? (it.base.usd != null ? x.valor : x.valor / fx) : base != null ? base * x.idx : null;
          return {desde: x.desde, usd: v, nome: x.nome + ' (índice ' + x.idx + ')'};
        })));
        if (it.base.brl != null && it.base.usd == null) it.obsPreco = 'R$ ' + it.base.brl + ' ÷ câmbio ' + fx;
      });
    });

    // 2ª passada: operações (linhas da mesma operação: contrato, sonda, poço, data, status, risco e SO)
    var ops = {}, ordemOps = [];
    linhas.forEach(function (r, i) {
      var ct = cts[txt(r[I.contrato])];
      var risco = Math.max(0, Math.min(1, num(r[I.risco])));
      var data = dataISO(XLSX, r[I.data]);
      var sonda = txt(r[I.sonda]);
      var so = I.so >= 0 ? txt(r[I.so]).replace(/^-$/, '') : '';
      var poco = I.poco >= 0 ? txt(r[I.poco]).replace(/^-$/, '') : '';
      var st = txt(r[I.status]);
      var k = [ct.nome, sonda, poco, data, st, risco, so].join('|');
      var op = ops[k];
      if (!op) {
        op = ops[k] = {contrato: ct.nome, cliente: ct.cliente, sonda: sonda, poco: poco, campo: I.campo >= 0 ? txt(r[I.campo]).replace(/^-$/, '') : '', descs: [], fase: '', tipoPl: '',
          tipoReceita: I.tipoRec >= 0 ? txt(r[I.tipoRec]) : '', status: st, concluida: /^conclu/.test(semAcento(st)), risco: risco,
          contingencia: I.cont >= 0 && /^sim/.test(semAcento(r[I.cont])), data: data, so: so, wbs: I.wbs >= 0 ? txt(r[I.wbs]) : '',
          resp: txt(r[I.resp]), ppuQ: {}, valor: 0, calc: 0, cogs: 0, cogsQ: 0, rf: 0, cf: 0, linhas: [], quim: [], cas: [], time: {}};
        ordemOps.push(k);
      }
      var q = num(r[I.qtd]), p = num(r[I.preco]);
      var temRM = I.rm >= 0 && txt(r[I.rm]) !== '';
      var V = temRM ? num(r[I.rm]) : q * p;
      op.rf += num(r[I.rf]);
      op.cf += I.cf >= 0 ? num(r[I.cf]) : 0;
      if (I.cm >= 0) op.cogs += num(r[I.cm]);
      if (I.cq >= 0) op.cogsQ += num(r[I.cq]);
      var refPl = txt(r[I.item]), desc = txt(r[I.desc]);
      if (!(q > 0) && !V) return; // linha sem quantidade e sem valor: não entra
      var it = refPl ? acharItem(ct, refPl, desc) : null;
      if (!it && refPl && q > 0 && p > 0) {
        it = {ref: refPl, refPl: refPl, desc: desc || refPl, unit: txt(r[I.uom]), agenda: [{desde: '', usd: p}], reajs: [], base: {usd: p}};
        ct.itens.push(it); (ct.porRef[refPl] = ct.porRef[refPl] || []).push(it);
        M.avisos.push(ct.nome + ': item ' + refPl + ' só está no Forecast (preço da linha: ' + r4(p) + ')');
      }
      var opDesc = txt(r[I.op]) || (I.desc >= 0 ? txt(r[I.desc]) : '');
      if (opDesc && op.descs.indexOf(opDesc) < 0) op.descs.push(opDesc);
      if (txt(r[I.op])) op.temDescOp = true;
      op.valor += V;
      op.linhas.push({linha: iH + 2 + i, item: refPl, qtd: q, preco: p, valor: V, manual: temRM});
      if (it && q > 0 && V > 0) {
        op.ppuQ[it.ref] = (op.ppuQ[it.ref] || 0) + q;
        op.calc += q * precoNaData(it.agenda, data);
      }
    });
    ordem.forEach(function (n) {
      var ct = cts[n];
      var ds = ct.itens.map(function (i) { return i.agenda.length ? i.agenda[0].desde : ''; }).filter(Boolean);
      ct.inicio = ordemOps.map(function (k) { return ops[k]; }).filter(function (o) { return o.contrato === n && o.data; }).map(function (o) { return o.data; }).concat(ds).sort()[0] || '';
      ct.blocos = [];
      delete ct.porRef;
      M.contratos.push(ct);
    });
    Object.keys(banco).forEach(function (n) { if (!cts[n]) M.avisos.push('contrato "' + n + '" só está no Banco (sem operações no Forecast): não incluído'); });
    ordemOps.forEach(function (k, j) {
      var o = ops[k];
      o.n = j + 1;
      // tipo pela 1ª descrição da operação; sem "Operação/Descrição" (vendas do CE), pelo tipo de receita
      o.desc = o.temDescOp ? o.descs[0] : (o.tipoReceita || o.descs[0] || '');
      o.notas = o.descs.join(' · ');
      delete o.temDescOp;
      o.ppu = Object.keys(o.ppuQ).map(function (ref) { return {ref: ref, qty: r4(o.ppuQ[ref])}; });
      o.ajRec = r4(o.valor - o.calc);
      o.ajQuim = r4(o.cogsQ);
      o.ajCE = r4(o.cogs - o.cogsQ);
      o.rf = r4(o.rf); o.cf = r4(o.cf);
      delete o.ppuQ; delete o.descs;
      M.operacoes.push(o);
    });
    M.quimicos = []; M.casing = [];
  }

  function lerPlanilhaContratos(XLSX, wb, arquivo) {
    var F = aba(XLSX, wb, /^forecast/);
    var B = aba(XLSX, wb, /^banco de dados contrat/);
    if (!F) throw new Error('aba "Forecast" não encontrada');
    if (!B) throw new Error('aba "Banco de dados contratos" não encontrada');
    var M = {arquivo: arquivo || '', layout: '', contratos: [], operacoes: [], quimicos: [], casing: [], avisos: []};
    var porColunas = F.slice(0, 12).some(function (r) { return semAcento(r && r[5]) === 'status'; });
    M.layout = porColunas ? 'colunas' : 'linhas';
    if (porColunas) lerColunas(XLSX, F, B, M); else lerLinhas(XLSX, F, B, M);
    // agenda de preços → preço inicial + reajustes (formato do EARL)
    M.contratos.forEach(function (ct) {
      ct.itens.forEach(function (it) {
        it.usd = it.agenda.length ? it.agenda[0].usd : null;
        it.agenda.forEach(function (a) { if (a.desde && (!ct.inicio || a.desde < ct.inicio)) ct.inicio = a.desde; });
      });
      var datas = {};
      ct.itens.forEach(function (it) {
        it.agenda.slice(1).forEach(function (a) {
          var r = datas[a.desde] = datas[a.desde] || {desde: a.desde, nome: {}, precos: {}};
          r.precos[it.ref] = a.usd;
          if (a.nome) r.nome[a.nome.replace(/ \(índice.*$/, '')] = 1;
        });
      });
      ct.reajustes = Object.keys(datas).sort().map(function (d) { var r = datas[d]; return {desde: d, obs: Object.keys(r.nome).join(', ') || 'Reajuste', precos: r.precos}; });
    });
    return M;
  }

  // tipo de operação do EARL a partir da descrição da planilha
  function tipoOperacao(desc, tipoPl, fase, tamanhos, TIPO_OUTROS) {
    var s = semAcento(desc), tp = semAcento(tipoPl);
    var outro = function (t) { t = txt(t || desc || tipoPl || 'Outros'); return {tipoOp: TIPO_OUTROS, tipoOutro: t.length > 20 ? t.slice(0, 20).trim() : t}; };
    var tam = function () {
      var re = /(\d{1,2}(?:[ .]\d\/\d)?)\s*(?:"|''|in\b|pol\b)?/g, m, achados = [];
      while ((m = re.exec(String(desc || '')))) {
        var v = m[1].replace('.', ' ') + '"';
        if (tamanhos.indexOf(v) >= 0) achados.push(v);
      }
      return achados[0] || '';
    };
    if (/^(parcial_)?dispon/.test(s)) return {tipoOp: 'Disponibilidade'};
    if (/^lwo\b/.test(s)) return {tipoOp: 'LWO'};
    if (/^hwo\b/.test(s)) return {tipoOp: 'HWO'};
    if (/^pwc\b/.test(s) && !/tampao|abandono/.test(s)) return {tipoOp: 'PWC'};
    if (/top ?job/.test(s)) return {tipoOp: 'Top-job'};
    if (/squeeze/.test(s)) return {tipoOp: 'Squeeze'};
    if (/^lcp$/.test(s)) return {tipoOp: 'Tampão de combate à perda (LCP)'};
    if (/abandono|^p&a$|p&a\b/.test(s) || (tp === 'abandono' && !/kop/.test(s))) return {tipoOp: 'Abandono'};
    if (/^(rev\b|rev\.|liner|slender|scab|cmt \d|influxo rev|perf p\d \+ liner)/.test(s) || /\brev\.? condutor/.test(s)) {
      var t = tam();
      if (t) return {tipoOp: 'Cimentação primária', casing: t};
    }
    if (tp === 'perfuracao') return outro(desc.replace(/^perf(\.|f\.)? /i, 'Perfuração '));
    return outro(desc);
  }

  var api = {lerPlanilhaContratos: lerPlanilhaContratos, tipoOperacao: tipoOperacao, precoNaData: precoNaData, slug: slug, semAcento: semAcento};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.EARL_LEITOR_CONTRATOS = api;
})(typeof window !== 'undefined' ? window : this);
