  /* ================= e23 (pedido do Hugo, 27/11/2026) =================
     "📤 Compartilhar (HTML)" agora compartilha O PRÓPRIO ARQUIVO do EARL Forecast em que a pessoa está trabalhando (não
     existe mais o arquivo do Gerencial): sai uma cópia deste .html com todos os dados de agora — contratos, operações,
     consumos, handovers, inventário, sondas, câmbio, químicos, casing, grupos, filtros e os registros dos Indicadores.
     Antes de baixar ou de criar o e-mail, dá para escolher o nome do arquivo.
     Como a cópia é feita: o HTML vem da própria página (as partes que o app põe na tela depois de abrir saem; ver
     engShLimparClone) e os dados vão num script do tipo JSON, de id earl-sh-dados (só dados, não é código).
     A cópia tem um prefixo de armazenamento só dela ('earlengsh<id>:'), então não se mistura com os outros arquivos do
     EARL de quem receber (file:// divide o mesmo armazenamento). Na primeira vez que abre, os dados vão para o
     armazenamento; depois vale o que a pessoa lançar. O botão fica na barra de ferramentas e na aba Indicadores
     (o Gerencial embutido chama window.engCompartilharAbrir). */
  var [engSh, setEngSh] = useState(null);
  // fora do nome: o backup automático do navegador e marcas que só valem aqui
  var ENG_SH_FORA = ['hal_cmt_dbsnap_v1', 'earl_sh_id', 'earl_fotos_sig_v1'];
  // nome do arquivo: tira o que o Windows não aceita em nome de arquivo (\ / : * ? " < > | e caracteres de controle) e
  // os acentos (ã → a, — → -): o navegador não baixa arquivo com acento no nome (troca o nome por "download")
  var engShSemAcento = t => String(t || '').normalize('NFD').split('').filter(c => {
    var n = c.charCodeAt(0);
    return n >= 32 && n !== 127 && !(n >= 0x300 && n <= 0x36f);
  }).map(c => c.charCodeAt(0) < 128 ? c : {'\xBA': 'o', '\xAA': 'a', '\xDF': 'ss', '\xE6': 'ae', '\xC6': 'AE', '\xF8': 'o', '\xD8': 'O'}[c] || '-').join('');
  var engShNomeLimpo = t => {
    var s = engShSemAcento(t);
    s = s.replace(/[\\/:*?"<>|]+/g, '-').replace(/-{2,}/g, '-').replace(/\s+/g, ' ').trim().replace(/\.html?$/i, '').replace(/[. ]+$/, '').trim();
    if (/^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i.test(s)) s += '_';
    return s.slice(0, 150);
  };
  var engShNomeEscrito = t => String(t || '').replace(/[\r\n]+/g, ' ').trim().replace(/\.html?$/i, '').trim();
  var engShTemProibido = t => /[\\/:*?"<>|]/.test(String(t || ''));
  var engShTemAcento = t => engShSemAcento(t) !== String(t || '').split('').filter(c => c.charCodeAt(0) >= 32 && c.charCodeAt(0) !== 127).join('');
  var engShPadrao = () => {
    var ativos = (db.contratos || []).filter(c => c && !c.archived);
    var quando = engCarimboArq();
    if (ativos.length === 1) return engNomeArqCt(ativos[0], quando).replace(/\.json$/, '');
    return 'EARL_FORECAST_' + (window.EARL_PLANILHA ? engLimpaNomeArq(window.EARL_PLANILHA) + '_' : '') + quando;
  };
  var engShResumo = () => {
    var ativos = (db.contratos || []).filter(c => c && !c.archived);
    var nOps = (db.plannedJobs || []).filter(j => j && j.status !== PJ_STATUS.CANC).length;
    return {cts: ativos.length, arq: (db.contratos || []).length - ativos.length, ops: nOps};
  };
  var engShMsg = nome => {
    var r = engShResumo();
    return 'Olá,\n\nSegue em anexo o arquivo do EARL Forecast (' + nome + ') com os dados de ' + new Date().toLocaleDateString('pt-BR') + ': ' + r.cts + ' contrato(s) e ' + r.ops + ' operação(ões).\n\n' +
      'Para abrir: salve o arquivo anexo no computador e abra com dois cliques no Chrome ou no Edge (funciona sem internet; a pré-visualização do Outlook ou do Teams não abre o EARL, mostra só um aviso). É uma cópia completa do arquivo: dá para ver os Indicadores e os contratos, o Gantt e as operações, e continuar lançando. O que você lançar fica só no seu computador, separado dos outros arquivos do EARL que você tiver.\n';
  };
  var engShArqAberto = () => {
    try {
      return decodeURIComponent(String(location.pathname || '').split('/').pop() || '');
    } catch (e) {
      return '';
    }
  };
  var engShAbrir = () => {
    var nome = engShPadrao();
    setEngSh({nome: nome, para: '', assunto: '', assuntoMexido: false, msg: '', msgMexida: false, zip: false, gerando: ''});
  };
  window.engCompartilharAbrir = engShAbrir;
  // o que o app põe na página depois de abrir não vai na cópia (volta sozinho quando a cópia abre)
  /* e24 (Hugo, 28/11/2026: "o arquivo está indo em branco"): aberta numa pré-visualização (Outlook, Teams, SharePoint,
     OneDrive), que não roda o programa, a página ficava em branco. O #app da cópia leva um aviso com o resumo dos dados e
     como abrir; quando o programa roda, o React troca o aviso pela tela (o aviso só aparece depois de 2,5 s, ver eng.css). */
  var engShAviso = (doc, info) => {
    var el = (t, css, txt) => { var e = doc.createElement(t); if (css) e.setAttribute('style', css); if (txt != null) e.textContent = txt; return e; };
    var cx = el('div', 'max-width:660px;margin:56px auto;padding:28px 32px;font:15px/1.5 Arial,Helvetica,sans-serif;color:#1d2125;background:#fff;border-radius:16px;box-shadow:0 6px 24px rgba(0,0,0,.12);border-top:6px solid #CC0000');
    cx.className = 'earl-semjs';
    cx.appendChild(el('div', 'font-weight:700;font-size:20px;margin-bottom:8px', 'EARL Forecast — cópia compartilhada'));
    var p1 = el('p', 'margin:0 0 10px');
    p1.appendChild(doc.createTextNode('Arquivo '));
    p1.appendChild(el('b', null, info.nome));
    p1.appendChild(doc.createTextNode(', com os dados de ' + info.quando + ': '));
    p1.appendChild(el('b', null, info.cts + ' contrato(s) e ' + info.ops + ' operação(ões)'));
    p1.appendChild(doc.createTextNode('.'));
    cx.appendChild(p1);
    if (info.nomes.length) cx.appendChild(el('p', 'margin:0 0 10px;font-size:13px;color:#43494E', 'Contratos: ' + info.nomes.slice(0, 12).join(', ') + (info.nomes.length > 12 ? ' e mais ' + (info.nomes.length - 12) : '') + '.'));
    var p2 = el('p', 'margin:0 0 10px');
    p2.appendChild(doc.createTextNode('Para usar: '));
    p2.appendChild(el('b', null, 'salve este arquivo no computador'));
    p2.appendChild(doc.createTextNode(' (em Downloads, na área de trabalho ou numa pasta) e '));
    p2.appendChild(el('b', null, 'abra com dois cliques no Google Chrome ou no Microsoft Edge'));
    p2.appendChild(doc.createTextNode('. Funciona sem internet.'));
    cx.appendChild(p2);
    cx.appendChild(el('p', 'margin:0;font-size:13px;color:#5b6369', 'A pré-visualização do Outlook, do Teams, do SharePoint e do OneDrive não abre o EARL: nela aparece só este aviso.'));
    return cx;
  };
  var engShLimparClone = (cl, info) => {
    var app = cl.querySelector('#app');
    if (app) { app.innerHTML = ''; if (info) app.appendChild(engShAviso(cl.ownerDocument || document, info)); }
    Array.from(cl.querySelectorAll('[data-earl-rt], .earl-pl-tag, .eng-rz-alca')).forEach(e => e.parentNode && e.parentNode.removeChild(e));
    var body = cl.querySelector('body');
    if (body) Array.from(body.children).forEach(e => {
      if (e.tagName !== 'SCRIPT' && e.id !== 'app' && e.id !== 'btn-install') body.removeChild(e);
    });
    var bt = cl.querySelector('#btn-install');
    if (bt) bt.style.display = 'none';
    var mf = cl.querySelector('#pwa-manifest');
    if (mf) mf.removeAttribute('href');
    [cl, body].forEach(e => {
      if (!e) return;
      ['data-engrz-cur', 'data-engrz-arr'].forEach(a => e.removeAttribute(a));
      e.classList.remove('gantt-arrastando', 'mx-arr', 'eng-glbl-arr');
      if (!e.getAttribute('class')) e.removeAttribute('class');
    });
    var velho = cl.querySelector('#earl-sh-dados');
    if (velho) velho.parentNode.removeChild(velho);
  };
  // o bloco que vai no armazenamento da cópia (no começo do arquivo, antes do app ler os dados)
  var ENG_SH_BLOCO = ['  /*EARL_SH_INI*/',
    '  /* e23: CÓPIA COMPARTILHADA (botão "📤 Compartilhar (HTML)" do EARL Forecast). Os dados de quem compartilhou estão no',
    '     JSON de id earl-sh-dados (só dados). Na primeira vez que este arquivo abre num navegador, eles vão para o',
    '     armazenamento, com o prefixo desta cópia (separado dos outros arquivos do EARL); depois vale o que for lançado aqui.',
    '     Sem espaço (ou com o armazenamento bloqueado), o arquivo abre com os dados embutidos, sem salvar. */',
    '  (function(){',
    '    var el=document.getElementById(\'earl-sh-dados\'),d=null;',
    '    try{d=JSON.parse(el.textContent);}catch(e){}',
    '    if(!d||!d.chaves)return;',
    '    var ks=d.chaves,lz=d.lz||{},tem=function(k){return Object.prototype.hasOwnProperty.call(ks,k);};',
    '    window.EARL_COMPARTILHADO={id:d.id,geradoEm:d.geradoEm,nome:d.nome,versao:d.versao};',
    '    if(window.EARL_ARMAZ_BLOQUEADO){for(var k0 in ks)if(tem(k0))try{localStorage.setItem(k0,ks[k0]);}catch(e){}return;}',
    '    var feitos=[];',
    '    try{',
    '      if(G.call(localStorage,P+\'earl_sh_id\')===d.id)return;',
    '      for(var k1 in ks)if(tem(k1)){S.call(localStorage,P+k1,lz[k1]?Z(ks[k1]):ks[k1]);feitos.push(k1);}',
    '      S.call(localStorage,P+\'earl_sh_id\',d.id);',
    '    }catch(e){',
    '      feitos.forEach(function(k){try{R.call(localStorage,P+k);}catch(x){}});',
    '      window.EARL_SH_SEM_ESPACO=true;',
    '      var mex={},g=SP.getItem,s=SP.setItem,r=SP.removeItem;',
    '      SP.getItem=function(k){return this!==window.localStorage||mex[k]||!tem(k)?g.call(this,k):ks[k];};',
    '      SP.setItem=function(k,v){var x=s.call(this,k,v);if(this===window.localStorage)mex[k]=1;return x;};',
    '      SP.removeItem=function(k){var x=r.call(this,k);if(this===window.localStorage)mex[k]=1;return x;};',
    '    }',
    '  })();',
    '  /*EARL_SH_FIM*/',
    ''].join('\n');
  var engShMontar = nome => {
    var A = window.EARL_ARMAZ || {};
    var P = A.P || 'earleng:';
    var id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    var novoP = 'earlengsh' + id + ':';
    // 1. os dados: tudo o que este arquivo guarda no navegador (o banco, os filtros, os registros dos Indicadores...)
    var chaves = {}, lz = {}, ls = window.localStorage;
    var cru = k => window.EARL_ARMAZ_BLOQUEADO ? ls.getItem(k) : A.G.call(ls, k);
    for (var i = 0; i < ls.length; i++) {
      var k = ls.key(i);
      if (k == null) continue;
      var sub = window.EARL_ARMAZ_BLOQUEADO ? k : k.indexOf(P) === 0 ? k.slice(P.length) : null;
      if (sub == null || ENG_SH_FORA.includes(sub)) continue;
      var v = cru(k);
      if (v == null) continue;
      var plano = A.U ? A.U(v) : v;
      if (plano !== v) lz[sub] = 1; // estava comprimido: na cópia, grava comprimido de novo
      chaves[sub] = plano;
    }
    // os registros dos Indicadores de antes da g23 ficavam numa chave só, a mesma para todos os arquivos: vão também
    if (chaves['ger:registros_v1'] == null && !window.EARL_COMPARTILHADO) {
      try {
        var rg = window.EARL_ARMAZ_BLOQUEADO ? null : A.G.call(ls, 'earlger:registros_v1');
        if (rg) chaves['ger:registros_v1'] = rg;
      } catch (e) {}
    }
    chaves[DB_KEY] = JSON.stringify(db); // o banco como está na tela agora
    lz[DB_KEY] = 1;
    var dados = {tipo: 'EARL-Forecast-Compartilhado', formato: 1, id: id, versao: EARL_VERSION, geradoEm: new Date().toISOString(), nome: nome + '.html', de: P, chaves: chaves, lz: lz};
    // 2. o HTML: a própria página, sem o que o app pôs nela depois de abrir
    var cl = document.documentElement.cloneNode(true);
    var ativos = (db.contratos || []).filter(c => c && !c.archived), rs0 = engShResumo();
    engShLimparClone(cl, {nome: nome + '.html', quando: new Date().toLocaleString('pt-BR', {dateStyle: 'short', timeStyle: 'short'}), cts: rs0.cts, ops: rs0.ops, nomes: ativos.map(c => String(c.name || '').trim()).filter(Boolean)});
    var ancora = '  window.EARL_ENG_AVULSO=true;\n';
    var sc = Array.from(cl.querySelectorAll('script')).find(s => s.textContent.indexOf(ancora) >= 0 && s.textContent.indexOf('window.EARL_ARMAZ={P:P') >= 0);
    if (!sc) throw new Error('não achei o bloco de armazenamento do arquivo');
    var t = sc.textContent;
    var a0 = t.indexOf('  /*EARL_SH_INI*/'), a1 = t.indexOf('/*EARL_SH_FIM*/');
    if (a0 >= 0 && a1 > a0) t = t.slice(0, a0) + t.slice(t.indexOf('\n', a1) + 1); // cópia de uma cópia: sai o bloco antigo
    if (!/var P='[^']*';/.test(t)) throw new Error('não achei o prefixo do armazenamento');
    t = t.replace(/var P='[^']*';/, () => "var P='" + novoP + "';");
    if (t.indexOf(ancora) < 0) throw new Error('não achei o bloco de armazenamento do arquivo');
    t = t.replace(ancora, () => ancora + ENG_SH_BLOCO);
    sc.textContent = t;
    var el = document.createElement('script');
    el.type = 'application/json';
    el.id = 'earl-sh-dados';
    el.textContent = JSON.stringify(dados).replace(/</g, '\\u003c');
    sc.parentNode.insertBefore(el, sc);
    return {html: '<!DOCTYPE html>\n' + cl.outerHTML, prefixo: novoP, id: id};
  };
  /* .zip sem biblioteca: um arquivo só, comprimido pelo próprio navegador (CompressionStream); sem ele, guardado sem compressão */
  var ENG_CRC = (() => {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  var engShZip = async (nomeArq, texto) => {
    var dado = new TextEncoder().encode(texto), crc = 0xFFFFFFFF;
    for (var i = 0; i < dado.length; i++) crc = ENG_CRC[(crc ^ dado[i]) & 255] ^ (crc >>> 8);
    crc = (crc ^ 0xFFFFFFFF) >>> 0;
    var comp = dado, metodo = 0;
    if (typeof CompressionStream === 'function') {
      try {
        var cs = new Blob([dado]).stream().pipeThrough(new CompressionStream('deflate-raw'));
        var z = new Uint8Array(await new Response(cs).arrayBuffer());
        if (z.length < dado.length) { comp = z; metodo = 8; }
      } catch (e) {}
    }
    var nm = new TextEncoder().encode(nomeArq), d = new Date();
    var hora = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    var dia = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    var cab = (central) => {
      var b = new DataView(new ArrayBuffer(central ? 46 : 30)), o = 0;
      var u32 = v => { b.setUint32(o, v, true); o += 4; }, u16 = v => { b.setUint16(o, v, true); o += 2; };
      u32(central ? 0x02014b50 : 0x04034b50);
      if (central) u16(20);
      u16(20); u16(0x0800); u16(metodo); u16(hora); u16(dia); u32(crc); u32(comp.length); u32(dado.length); u16(nm.length); u16(0);
      if (central) { u16(0); u16(0); u16(0); u32(0); u32(0); }
      return new Uint8Array(b.buffer);
    };
    var loc = cab(false), cen = cab(true);
    var fim = new DataView(new ArrayBuffer(22));
    fim.setUint32(0, 0x06054b50, true); fim.setUint16(8, 1, true); fim.setUint16(10, 1, true);
    fim.setUint32(12, cen.length + nm.length, true); fim.setUint32(16, loc.length + nm.length + comp.length, true);
    return new Blob([loc, nm, comp, cen, nm, new Uint8Array(fim.buffer)], {type: 'application/zip'});
  };
  var engShB64 = texto => {
    var b = typeof texto === 'string' ? new TextEncoder().encode(texto) : texto, out = [];
    for (var i = 0; i < b.length; i += 24576) out.push(btoa(String.fromCharCode.apply(null, b.subarray(i, i + 24576))));
    return out.join('').replace(/.{76}/g, '$&\r\n');
  };
  // cabeçalho de e-mail com acento: =?UTF-8?B?...?= (o Outlook mostra certo)
  var engShCabMime = t => /^[\x20-\x7e]*$/.test(t) ? t : '=?UTF-8?B?' + engShB64(t).replace(/\r\n/g, '') + '?=';
  var engShMB = n => (n / 1048576).toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1}) + ' MB';
  var engShGerar = como => {
    if (!engSh || engSh.gerando) return;
    var nome = engShNomeLimpo(engSh.nome) || engShPadrao();
    var assunto = (engSh.assuntoMexido ? engSh.assunto : '') || 'EARL Forecast — ' + (engShNomeEscrito(engSh.nome) || nome);
    var msg = engSh.msgMexida ? engSh.msg : engShMsg(nome + (como === 'eml' && engSh.zip ? '.zip' : '.html'));
    var para = engSh.para;
    var zipNoEmail = engSh.zip;
    setEngSh(x => x && {...x, gerando: como});
    setTimeout(async () => {
      try {
        var r = engShMontar(nome), arq = nome + '.html', tam = new Blob([r.html]).size, saiu = arq;
        if (como === 'html') forceDownload([new File([r.html], arq, {type: 'text/html'})]);
        else if (como === 'zip') { var z = await engShZip(arq, r.html); saiu = nome + '.zip'; forceDownload([new File([z], saiu, {type: 'application/zip'})]); }
        else {
          var anexo = zipNoEmail ? await engShZip(arq, r.html) : null;
          var nAnexo = zipNoEmail ? nome + '.zip' : arq;
          var corpoAnexo = anexo ? engShB64(new Uint8Array(await anexo.arrayBuffer())) : engShB64(r.html);
          var B = 'earlsh_' + Date.now().toString(36), nmA = engShCabMime(nAnexo).replace(/"/g, '');
          var eml = ['X-Unsent: 1', 'To: ' + String(para || '').replace(/[\r\n]/g, ' '), 'Subject: ' + engShCabMime(String(assunto).replace(/[\r\n]/g, ' ')), 'MIME-Version: 1.0', 'Content-Type: multipart/mixed; boundary="' + B + '"', '',
            '--' + B, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', engShB64(msg),
            '--' + B, (anexo ? 'Content-Type: application/zip; name="' : 'Content-Type: text/html; charset=UTF-8; name="') + nmA + '"', 'Content-Disposition: attachment; filename="' + nmA + '"', 'Content-Transfer-Encoding: base64', '', corpoAnexo,
            '--' + B + '--', ''].join('\r\n');
          saiu = nome + '.eml';
          forceDownload([new File([eml], saiu, {type: 'message/rfc822'})]);
          arq = nAnexo;
        }
        setEngSh(null);
        var rs = engShResumo();
        setOkMsg((como === 'eml' ? 'E-mail criado ✓ — ' + saiu + ', com o anexo ' + arq : 'Arquivo gerado ✓ — ' + saiu) + ' (cópia deste arquivo, ' + engShMB(tam) + ', ' + rs.cts + ' contrato(s), ' + rs.ops + ' operação(ões)).' + (como === 'eml' ? ' Abra o .eml: ele abre no Outlook como rascunho; confira e clique em Enviar.' : ''));
        setTimeout(() => setOkMsg(''), 10000);
      } catch (e) {
        setEngSh(x => x && {...x, gerando: ''});
        setSyncErr('Não deu para gerar a cópia do arquivo: ' + (e && e.message || e));
      }
    }, 30);
  };
  var renderEngSh = () => {
    if (!engSh) return null;
    var fechar = () => setEngSh(null);
    var nome = engShNomeLimpo(engSh.nome);
    var rs = engShResumo();
    var ocupado = !!engSh.gerando;
    var campo = (rot, el) => engH("label", {className: "eng-sh-campo"}, engH("span", null, rot), el);
    return engH("div", {
      className: "overlay",
      style: {zIndex: 300},
      onClick: e => {} // só fecha pelos botões
    }, engH("div", {
      className: "modal ec-modal eng-sh",
      onClick: e => e.stopPropagation()
    }, engH("div", {className: "modal-title"}, engH("span", null, "📤 Compartilhar o arquivo (HTML)"), engH("button", {className: "modal-close", onClick: fechar, disabled: ocupado}, "\xD7")),
    engH("div", {className: "ec-imp-ajuda"}, "Gera uma ", engH("b", null, "cópia deste arquivo do EARL Forecast"), " com todos os dados de agora: ",
      engH("b", null, rs.cts + " contrato(s) ativo(s)" + (rs.arq ? " (e " + rs.arq + " arquivado(s))" : "") + " e " + rs.ops + " operação(ões)"),
      ", com os consumos, os handovers, o inventário das sondas, o câmbio, os químicos, o casing, os grupos e os registros dos Indicadores. Quem receber salva o arquivo e abre com dois cliques no Chrome ou no Edge, sem internet, e usa como este arquivo (a pré-visualização do Outlook, do Teams ou do SharePoint não abre o EARL: mostra só um aviso com o resumo). O que a pessoa lançar fica só no computador dela, separado dos outros arquivos do EARL que ela tiver."),
    engShArqAberto() && engH("div", {className: "eng-sh-origem"}, "Cópia de: ", engH("b", null, engShArqAberto())),
    !rs.ops && engH("div", {className: "eng-sh-vazio"}, "⚠ Este arquivo não tem nenhuma operação lançada: a cópia vai sair assim, sem operações. Os dados ficam no arquivo (e no navegador) em que foram lançados — por exemplo, no arquivo do contrato (EARL_Forecast_<CONTRATO>…html). Abra esse arquivo e compartilhe de lá, ou traga os contratos para cá com “⬆ Importar dados”."),
    campo("Nome do arquivo", engH("span", {className: "eng-sh-nomebox"}, engH("input", {
      type: "text",
      className: "eng-sh-nome",
      value: engSh.nome,
      autoFocus: true,
      maxLength: 160,
      spellCheck: false,
      onChange: e => { var v = e.target.value; setEngSh(x => ({...x, nome: v})); },
      onKeyDown: e => { if (e.key === 'Enter') { e.preventDefault(); engShGerar('html'); } }
    }), engH("span", {className: "eng-sh-ext"}, ".html"))),
    engH("div", {className: "eng-sh-saida"}, engH("span", {className: "eng-sh-vai"}, nome ? ["Vai sair: ", engH("b", {key: "n", className: "eng-sh-final"}, nome + ".html")] : engH("span", {className: "eng-sh-aviso"}, "Escreva um nome (vazio, sai " + engShPadrao() + ".html).")),
      engH("button", {className: "btn-o eng-sh-padrao", type: "button", onClick: () => setEngSh(x => ({...x, nome: engShPadrao()})), title: "Volta ao nome padrão, com a data e a hora de agora"}, "↺ nome padrão")),
    engShTemProibido(engSh.nome) && engH("div", {className: "eng-sh-aviso"}, "Os caracteres \\ / : * ? \" < > | não podem ir num nome de arquivo do Windows e viram “-”."),
    engShTemAcento(engSh.nome) && engH("div", {className: "eng-sh-aviso eng-sh-acento"}, "O nome do arquivo sai sem acento (ã → a, — → -): o navegador não baixa arquivo com acento no nome. No assunto do e-mail, o acento fica."),
    engH("div", {className: "eng-sh-bts"}, engH("button", {className: "btn-o eng-sh-html", disabled: ocupado, onClick: () => engShGerar('html')}, engSh.gerando === 'html' ? "Gerando…" : "⬇ Baixar HTML"),
      engH("button", {className: "btn-o eng-sh-zip", disabled: ocupado, onClick: () => engShGerar('zip'), title: "O mesmo arquivo, compactado (.zip): menor, e passa quando o e-mail da empresa bloqueia .html"}, engSh.gerando === 'zip' ? "Gerando…" : "⬇ Baixar .zip")),
    engH("div", {className: "eng-sh-email"}, engH("div", {className: "eng-sh-sub"}, "✉ Mandar por e-mail"),
      campo("Para (opcional)", engH("input", {type: "text", className: "eng-sh-para", value: engSh.para, placeholder: "nome@empresa.com; outro@empresa.com", onChange: e => { var v = e.target.value; setEngSh(x => ({...x, para: v})); }})),
      campo("Assunto", engH("input", {type: "text", className: "eng-sh-assunto", value: engSh.assuntoMexido ? engSh.assunto : 'EARL Forecast — ' + (engShNomeEscrito(engSh.nome) || nome || engShPadrao()), onChange: e => { var v = e.target.value; setEngSh(x => ({...x, assunto: v, assuntoMexido: true})); }})),
      campo("Mensagem", engH("textarea", {className: "eng-sh-msg", rows: 6, value: engSh.msgMexida ? engSh.msg : engShMsg((nome || engShPadrao()) + (engSh.zip ? '.zip' : '.html')), onChange: e => { var v = e.target.value; setEngSh(x => ({...x, msg: v, msgMexida: true})); }})),
      engH("label", {className: "eng-sh-chk"}, engH("input", {type: "checkbox", className: "eng-sh-anexozip", checked: !!engSh.zip, onChange: e => { var v = e.target.checked; setEngSh(x => ({...x, zip: v})); }}), " Anexar compactado (.zip) — use se o e-mail da empresa bloquear arquivos .html"),
      engH("div", {className: "eng-sh-bts"}, engH("button", {className: "btn-r eng-sh-eml", disabled: ocupado, onClick: () => engShGerar('eml')}, engSh.gerando === 'eml' ? "Gerando…" : "✉ Criar e-mail (.eml)")),
      engH("div", {className: "eng-sh-nota"}, "O e-mail (.eml) abre no Outlook como rascunho, com o arquivo anexo (" + ((nome || engShPadrao()) + (engSh.zip ? '.zip' : '.html')) + "); confira e clique em Enviar.")),
    engH("div", {className: "ec-imp-bts"}, engH("button", {className: "btn-o eng-sh-cancelar", onClick: fechar, disabled: ocupado}, "Cancelar"))));
  };
