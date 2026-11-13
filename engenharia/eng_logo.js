  /* =================== e13: logo do cliente (inserir ao abrir o contrato) ===================
     Pedido do Hugo (13/11/2026): "insira uma opção de inserir a logo do cliente ao abrir o contrato. A logo deve
     ficar no lugar de onde em alguns contratos já tem a logo."
     Clique na logo (ou nas iniciais) no topo do contrato → janela "Logo do cliente": escolher uma imagem (PNG, JPG,
     SVG…), trocar ou tirar. Grava em db.clientLogos[normNome(cliente)] = {src, nome, arquivo, updatedAt, updatedBy} —
     o mesmo lugar que o EARL usa (clientLogoOf): vale para todos os contratos do cliente, nos cards da página inicial,
     no topo do contrato e nas operações. A imagem é reduzida para no máximo 240 px (ocupa pouco espaço no navegador). */
  var [engLogo, setEngLogo] = useState(null);
  var engLogoRef = useRef(null);
  var abrirEngLogo = nome => setEngLogo({
    nome: String(nome || '').trim(),
    erro: ''
  });
  var engLogoKey = nome => normNome(nome);
  var engLogoEnviado = nome => {
    var l = db.clientLogos || {};
    var c = findClient(db, nome) || {
      name: nome
    };
    var k = clientKeys(c).find(k => l[k] && l[k].src);
    return k ? {
      ...l[k],
      _k: k
    } : null;
  };
  var engLogoGravar = (nome, src, arquivo) => {
    var k = engLogoKey(nome);
    updateDB(d => ({
      ...d,
      clientLogos: {
        ...(d.clientLogos || {}),
        [k]: {
          src,
          nome,
          arquivo: arquivo || '',
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser() || ''
        }
      }
    }), {
      kind: 'Cliente',
      action: 'Alteração',
      name: nome,
      user: currentUser() || '—',
      detail: 'logo do cliente (' + (arquivo || 'imagem') + ')'
    });
    setEngLogo(null);
    setOkMsg('Logo de ' + nome + ' salva ✓ — vale para todos os contratos deste cliente');
    setTimeout(() => setOkMsg(''), 4000);
  };
  var engLogoArquivo = f => {
    if (!f || !engLogo) return;
    var nome = engLogo.nome;
    if (!/^image\//i.test(f.type || '') && !/\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(f.name || '')) {
      setEngLogo(x => x && {
        ...x,
        erro: 'Escolha um arquivo de imagem (PNG, JPG, SVG…).'
      });
      return;
    }
    var rd = new FileReader();
    rd.onerror = () => setEngLogo(x => x && {
      ...x,
      erro: 'Não foi possível ler a imagem.'
    });
    if (/svg/i.test(f.type || '') || /\.svg$/i.test(f.name || '')) {
      rd.onload = () => engLogoGravar(nome, rd.result, f.name);
      rd.readAsDataURL(f);
      return;
    }
    rd.onload = () => {
      var img = new Image();
      img.onerror = () => setEngLogo(x => x && {
        ...x,
        erro: 'Esta imagem não abriu. Tente outro arquivo (PNG ou JPG).'
      });
      img.onload = () => {
        var k = Math.min(1, 240 / Math.max(img.width || 1, img.height || 1));
        var cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(img.width * k));
        cv.height = Math.max(1, Math.round(img.height * k));
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        engLogoGravar(nome, cv.toDataURL('image/png'), f.name);
      };
      img.src = rd.result;
    };
    rd.readAsDataURL(f);
  };
  var engLogoTirar = nome => {
    var c = findClient(db, nome) || {
      name: nome
    };
    updateDB(d => {
      var l = {
        ...(d.clientLogos || {})
      };
      clientKeys(c).forEach(k => delete l[k]);
      return {
        ...d,
        clientLogos: l
      };
    }, {
      kind: 'Cliente',
      action: 'Alteração',
      name: nome,
      user: currentUser() || '—',
      detail: 'logo do cliente removida'
    });
    setEngLogo(null);
    setOkMsg('Logo de ' + nome + ' removida');
    setTimeout(() => setOkMsg(''), 3000);
  };
  // a logo no topo do contrato vira um botão (o lápis aparece no canto)
  var engLogoBotao = (nome, size) => engH("button", {
    type: "button",
    className: "eng-logo-btn",
    title: 'Inserir ou trocar a logo do cliente ' + nome,
    "aria-label": 'Logo do cliente ' + nome + ': inserir ou trocar',
    onClick: () => abrirEngLogo(nome)
  }, engH(ClientMark, {
    nome,
    src: clientLogoOf(db, nome),
    size
  }), engH("span", {
    className: "eng-logo-ed",
    "aria-hidden": "true"
  }, "✎"));
  var renderEngLogo = () => {
    if (!engLogo) return null;
    var nome = engLogo.nome;
    var env = engLogoEnviado(nome);
    var atual = clientLogoOf(db, nome);
    var cts = (db.contratos || []).filter(c => c && !c.archived && normNome(c.clientName) === normNome(nome));
    var fechar = () => setEngLogo(null);
    return engH("div", {
      className: "overlay",
      style: {
        zIndex: 330
      },
      onClick: e => {
        if (e.target === e.currentTarget) fechar();
      }
    }, engH("div", {
      className: "modal ec-modal eng-logo-modal",
      onClick: e => e.stopPropagation()
    }, engH("div", {
      className: "modal-title"
    }, engH("span", null, "Logo do cliente"), engH("button", {
      className: "modal-close",
      onClick: fechar
    }, "\xD7")), engH("div", {
      className: "eng-logo-box"
    }, engH(ClientMark, {
      nome,
      src: atual,
      size: 96
    }), engH("div", null, engH("b", {
      className: "eng-logo-nome"
    }, nome), engH("span", {
      className: "eng-logo-st"
    }, env ? 'Logo enviada' + (env.arquivo ? ' (' + env.arquivo + ')' : '') + (env.updatedAt ? ' em ' + fmtD(String(env.updatedAt).slice(0, 10)) : '') : atual ? 'Logo padrão do EARL' : 'Sem logo: aparecem as iniciais'), engH("span", {
      className: "eng-logo-cts"
    }, cts.length ? 'Vale para ' + cts.length + ' contrato(s) deste cliente: ' + cts.map(c => c.name).join(', ') + '.' : 'Vale para todos os contratos deste cliente.'))), engH("div", {
      className: "eng-help"
    }, "Escolha a imagem da logo (PNG, JPG ou SVG; de preferência quadrada e com fundo branco ou transparente). Ela aparece no card da p\xE1gina inicial, no topo do contrato e nas opera\xE7\xF5es. Fica guardada neste arquivo e vai junto no “⬇ Exportar dados”."), engLogo.erro && engH("div", {
      className: "ec-aviso ec-neg eng-logo-erro"
    }, engLogo.erro), engH("div", {
      className: "ec-foot"
    }, env && engH("button", {
      className: "btn-o eng-logo-tirar",
      onClick: () => engLogoTirar(nome)
    }, atual && env ? 'Tirar a logo enviada' : 'Tirar'), engH("span", {
      style: {
        flex: 1
      }
    }), engH("button", {
      className: "btn-o",
      onClick: fechar
    }, "Cancelar"), engH("button", {
      className: "btn-r eng-logo-escolher",
      onClick: () => engLogoRef.current && engLogoRef.current.click()
    }, env || atual ? '⬆ Trocar a logo' : '⬆ Inserir a logo')), engH("input", {
      ref: engLogoRef,
      type: "file",
      accept: "image/*,.svg",
      style: {
        display: 'none'
      },
      onChange: e => {
        var f = e.target.files && e.target.files[0];
        e.target.value = '';
        engLogoArquivo(f);
      }
    })));
  };
  /* ============ fim LOGO DO CLIENTE (e13) ============ */
