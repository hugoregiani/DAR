#!/usr/bin/env python3
"""EARL Engenharia (avulso) — desmembra a Engenharia do EARL v115.

Parte do EARL_HAL_CMT_115_SIMULACAO.html (app já compilado) e gera um HTML que:
  * abre sem login (sem senha), direto na escolha da região (Nordeste / Sudeste) e na Engenharia;
  * não traz os dados fictícios da simulação (começa com o cadastro do EARL: contratos, sondas
    offshore, químicas, casing, pessoas e equipamentos);
  * troca o envio do handover para a coordenação/logística por um e-mail (.eml) gerado no app;
  * tem cadastro de sondas, backup e restauração dos dados (ficam só no navegador);
  * leva React, ReactDOM, xlsx e jsPDF embutidos (funciona sem internet).

Uso:
  python3 patch_engenharia.py EARL_HAL_CMT_115_SIMULACAO.html EARL_Engenharia.html <pasta node_modules>
A pasta node_modules precisa de react@18.2.0, react-dom@18.2.0, xlsx@0.18.5 e jspdf@2.5.1
(as mesmas versões que o EARL carrega do cdnjs).
Cada troca confere que o trecho original existe o número de vezes esperado.
"""
import os
import re
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
SRC, OUT, NM = sys.argv[1], sys.argv[2], sys.argv[3]
s = open(SRC, encoding='utf-8').read()


def rep(old, new, n=1):
    global s
    c = s.count(old)
    if c != n:
        msg = 'ERRO: esperava %d ocorrência(s), achei %d: %r' % (n, c, old[:120])
        if os.environ.get('CHECAR'):  # CHECAR=1 lista todas as falhas sem parar
            print(msg)
            return
        raise SystemExit(msg)
    s = s.replace(old, new)


# ---------------------------------------------------------------- casca do HTML
# 1. Sai a simulação (dados fictícios, selo, "Reiniciar"); entra um armazenamento isolado.
a = s.find('<script id="earl-sim-dados"')
b = s.find('</style>', s.find('.earl-sim-tag{', a)) + len('</style>')
bloco = s[a:b]
assert a > 0 and 'EARL_SIMULACAO' in bloco and 'earl-sim-tag' in bloco, 'bloco da simulação não encontrado'
ARMAZ = r'''<script>
/* EARL Engenharia (avulso): os dados ficam neste navegador, com prefixo próprio, para não
   misturar com outros arquivos do EARL abertos do disco (file:// divide o mesmo armazenamento). */
(function(){
  var P='earleng:';var SP=Storage.prototype,G=SP.getItem,S=SP.setItem,R=SP.removeItem;
  /* armazenamento bloqueado (arquivo aberto dentro de uma pré-visualização): o app abre com um armazenamento
     só na memória, mostra os dados e avisa que nada fica salvo */
  function memoria(){var m={},o={getItem:function(k){return Object.prototype.hasOwnProperty.call(m,k)?m[k]:null;},setItem:function(k,v){m[k]=String(v);},removeItem:function(k){delete m[k];},clear:function(){m={};},key:function(i){return Object.keys(m)[i]||null;}};Object.defineProperty(o,'length',{get:function(){return Object.keys(m).length;}});return o;}
  ['localStorage','sessionStorage'].forEach(function(n){var b=false;try{window[n].getItem('earl');}catch(e){b=true;}
    if(b){try{Object.defineProperty(window,n,{configurable:true,value:memoria()});}catch(e){}if(n==='localStorage')window.EARL_ARMAZ_BLOQUEADO=true;}});
  /* e13: valores grandes (o banco de dados) ficam comprimidos (LZ-String, ~7x menor): os arquivos abertos do disco dividem
     o mesmo espaço do navegador e, sem isso, poucos contratos abertos já o enchiam. Ler e gravar continua igual para o
     app; valor antigo, sem compressão, é lido como está e comprimido na próxima gravação. Z(v) = como fica gravado. */
  var LZ='\u2603lz1:',ultC=null,ultD=null;
  var Z=function(v){v=String(v);if(v.length<20000||!window.LZString)return v;try{var c=LZ+LZString.compressToUTF16(v);return c.length<v.length?c:v;}catch(e){return v;}};
  var U=function(v){if(v==null||v.charCodeAt(0)!==0x2603||v.indexOf(LZ)!==0)return v;if(v===ultC)return ultD;try{var d=LZString.decompressFromUTF16(v.slice(LZ.length));if(d!=null){ultC=v;ultD=d;return d;}}catch(e){}return v;};
  SP.getItem=function(k){return U(G.call(this,P+k));};
  SP.setItem=function(k,v){return S.call(this,P+k,Z(v));};
  SP.removeItem=function(k){return R.call(this,P+k);};
  try{var IO=IDBFactory.prototype.open;IDBFactory.prototype.open=function(n,v){return v===undefined?IO.call(this,P+n):IO.call(this,P+n,v);};}catch(e){}
  window.EARL_ENG_AVULSO=true;
  window.EARL_ARMAZ={P:P,G:G,S:S,R:R,Z:Z,U:U}; /* funções originais, sem prefixo: tela "Espaço do navegador"; Z/U: comprimir/descomprimir */
})();
</script>'''
LZS = open(os.path.join(NM, 'lz-string', 'libs', 'lz-string.min.js'), encoding='utf-8').read()
assert '</script' not in LZS.lower()
ARMAZ = '<script>/* lz-string 1.5.0 (MIT, Pieroxy) — compressão dos dados no navegador (e13) */\n' + LZS + '\n</script>\n' + ARMAZ
s = s[:a] + ARMAZ + s[b:]
assert 'earl-sim-dados' not in s and 'earlsim115' not in s

rep('<title>EARL — Halliburton Cementing — SIMULAÇÃO</title>', '<title>EARL — Forecast</title>')
# e16 (25/11/2026, pedido do Hugo): o app passa a se chamar "Forecast" (os nomes internos — arquivos,
# prefixos do armazenamento earleng*, tipos das planilhas EARL-Eng-* do Painel de Compras — continuam os mesmos,
# para ninguém perder dados nem quebrar o Painel de Compras)
rep("    plan: {\n      label: 'Engenharia',", "    plan: {\n      label: 'Forecast',")
rep(r'''}, "Engenharia"), React.createElement("p", {
      className: "pg-sub"
    }, "Planejamento de opera\xE7\xF5es.")), React.createElement("div", {''', r'''}, "Forecast"), React.createElement("p", {
      className: "pg-sub"
    }, "Indicadores e contratos.")), React.createElement("div", {''')

# 2. Bibliotecas embutidas (mesmas versões do cdnjs).
LIBS = [
    ('https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js', 'react/umd/react.production.min.js'),
    ('https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js', 'react-dom/umd/react-dom.production.min.js'),
    ('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'xlsx/dist/xlsx.full.min.js'),
    ('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'jspdf/dist/jspdf.umd.min.js'),
]
for url, arq in LIBS:
    js = open(os.path.join(NM, arq), encoding='utf-8').read()
    # Dentro de <script> só "</script" fecha o bloco, e "<!--" seguido de "<script" o desvia.
    assert '</script' not in js.lower(), arq
    js = js.replace('/<!--', '/<\\!--')  # regex do xlsx (sem flag u): "\!" é o mesmo "!"
    assert '<!--' not in js, arq
    rep('<script src="%s"></script>' % url, '<script>/* %s (embutido) */\n%s\n</script>' % (url.rsplit('/libs/', 1)[1], js))

# 3. CSS do avulso no fim do último <style>.
css = open(os.path.join(AQUI, 'eng.css'), encoding='utf-8').read()
i = s.rfind('</style>\n</head>')
assert i > 0
s = s[:i] + css + s[i:]

# ---------------------------------------------------------------- app (código compilado)
rep("var EARL_VERSION = 'EARL v115';", "var EARL_VERSION = 'EARL Forecast e20 (base v115)';")
rep("var HO_ST = {\n  pendente: {", "var HO_ST = {\n  email: {\n    label: 'Enviado por e-mail',\n    c: '#304220',\n    bg: '#F1F5EC',\n    brd: '#D9E4CC'\n  },\n  pendente: {")
# quem gera o e-mail assina os registros (sem login)
rep("  var currentUser = () => authUser && authUser.email || sbUser || '';",
    "  var currentUser = () => authUser && authUser.email || sbUser || EARL_DB_REF && EARL_DB_REF.hoMail && EARL_DB_REF.hoMail.nome || '';")

# Sem login / sem senha
rep("  var needLogin = !authUser && !adminUnlocked;", "  var needLogin = false;")
rep("  if (authChecking && syncCfgReady(sbCfg)) {", "  if (false) {")

# Só a Engenharia, sem escolha de região: a aba é sempre 'plan' e o recorte é sempre o Brasil
# (todos os contratos e todas as operações; a região de cada operação sai da sonda).
rep("  var [mainTab, setMainTab] = useState('home');", "  var [mainTabEstado, setMainTab] = useState('plan');\n  var mainTab = 'plan';")
rep("      return localStorage.getItem('hal_earl_location_v1') || '';",
    "      return 'brasil';")
rep("    setHubLocation(loc || '');\n  };", "    setHubLocation('brasil');\n    setPlanCt('');\n    setPlanDraft(null);\n  };")
# Trilha: Engenharia / contrato (sem "trocar locação" e sem região)
rep("    var out = [{\n      key: 'hub',", "    var out = false ? [{\n      key: 'hub',")
rep("      title: 'Trocar locação'\n    }];\n    if (locLabel) out.push({", "      title: 'Trocar locação'\n    }] : [];\n    if (false) out.push({")
# Região da operação = base da sonda (ou do contrato)
rep("    loc: hubLocation === 'macae' ? 'macae' : 'nne',\n    clienteName: '',", "    loc: '',\n    clienteName: '',")
rep("      loc: draft.loc || (hubLocation === 'macae' ? 'macae' : 'nne'),",
    "      loc: regiaoDaBase(((db.rigs || []).find(r => r.id === draft.rigId) || {}).base) || ((ct0 => ct0 ? ctrRegioes(ct0)[0] : '')((db.contratos || []).find(c => c.id === draft.contratoId))) || draft.loc || 'nne',")
rep(": tplMode && hubLocation === 'macae';", ": tplMode && !!ctObj && ctrRegioes(ctObj).includes('macae');")
# Salvar a operação não mexe no consumo lançado (ele é gravado pela janela de consumo)
rep("      if (i >= 0) list[i] = {\n        ...clean,\n        log:", "      if (i >= 0) list[i] = {\n        ...clean,\n        ppuCons: list[i].ppuCons,\n        log:")
rep("  if (safeTab === 'db' && hubLocation !== 'brasil') safeTab = 'home';\n",
    "  if (safeTab === 'db' && hubLocation !== 'brasil') safeTab = 'home';\n  if (hubLocation) safeTab = 'plan';\n")

# Voltar: da Engenharia (sem contrato) volta para a escolha da região.
rep("    if (h.length > 1) {\n      var next = h.slice(0, -1);",
    "    if (h.length > 1 && h[h.length - 2].tab !== 'home') {\n      var next = h.slice(0, -1);")
rep("    if (mainTab !== 'home') {\n      navSkipRef.current = true;\n      clearSubState();\n      setMainTab('home');",
    "    if (false) {\n      navSkipRef.current = true;\n      clearSubState();\n      setMainTab('home');")
# "Nordeste/Sudeste" na trilha leva à página inicial da Engenharia
rep("  var navHome = useCallback(() => {\n    clearSubState();",
    "  var navHome = useCallback(() => {\n    setPlanCt('');\n    setPlanDraft(null);\n    clearSubState();")
# Ajustes não existe aqui
rep("  var irParaAjustes = tab => {\n    if (tab) setDbTab(tab);", "  var irParaAjustes = tab => {\n    return;\n    if (tab) setDbTab(tab);")
rep(r'''"Cadastre os contratos e as linhas PPU em Ajustes \u2192 Contratos."), React.createElement("button", {
      className: "btn-r",
      style: {
        marginTop: 12
      },
      onClick: () => irParaAjustes('contratos')
    }, "Abrir Contratos em Ajustes (Brasil) \u2192")));''',
    r'''"Cadastre os contratos e os itens PPU no bot\xE3o Contratos."), React.createElement("button", {
      className: "btn-r",
      style: {
        marginTop: 12
      },
      onClick: () => abrirEngContratos()
    }, "Abrir Contratos \u2192")));''')

# Cabeçalho: sem sino de pendências, sem "Configurar sync"; título "Engenharia".
rep('''}, "EARL"))), React.createElement("div", {
      className: "hdr-title",
      style: {
        flex: 1
      }
    }), mainTab === 'mob' ''', '''}, "EARL"))), React.createElement("div", {
      className: "hdr-title",
      style: {
        flex: 1
      }
    }, React.createElement("span", {
      className: "eng-hdr-tag"
    }, "Forecast")), mainTab === 'mob' ''')
rep("hubLocation && (authUser || adminUnlocked) && (() => {\n      var meus = pendMinhas();",
    "false && (() => {\n      var meus = pendMinhas();")
rep('''    }), React.createElement("button", {
      className: `sb-badge ${statusCls[sbStatus]}`,''', '''    }), false && React.createElement("button", {
      className: `sb-badge ${statusCls[sbStatus]}`,''')
# Barra: no lugar do Admin, Sondas · Backup · Restaurar
rep('''    })), !adminUnlocked && React.createElement("button", {
      className: "nav-admin-btn",''', '''    })), renderEngTools(), false && React.createElement("button", {
      className: "nav-admin-btn",''')
rep('''}, "Admin")), adminUnlocked && React.createElement("button", {
      className: "nav-admin-btn unlocked",''', '''}, "Admin")), false && React.createElement("button", {
      className: "nav-admin-btn unlocked",''')

# Escolha da região: só Nordeste e Sudeste
rep('''    }), React.createElement(Tile, {
      onClick: () => setLocation('brasil'),
      map: "brasil",
      name: "BRASIL",
      sub: "Vis\\xE3o consolidada",
      badge: "LIDERAN\\xC7A",
      bg: "linear-gradient(150deg,#94202D 0%,#720F1A 50%,#4A0A11 100%)"
    })), React.createElement("div", {''', '''    })), React.createElement("div", {''')
rep('''      className: "hub-grid"
    }, React.createElement(Tile, {
      onClick: () => setLocation('nordeste'),''', '''      className: "hub-grid eng-hub2"
    }, React.createElement(Tile, {
      onClick: () => setLocation('nordeste'),''')
rep(r'"Selecione a loca\xE7\xE3o para continuar"', r'"Engenharia \xB7 selecione a regi\xE3o para continuar"')

# Sem servidor: não mostrar "Sem conexão com o servidor" a cada alteração
rep("      } else {\n        setSyncErr('⚠ Sem conexão com o servidor — banco de dados salvo apenas neste aparelho.');\n      }",
    "      } else {}")

# Cobertura de materiais no Gantt depende do DAR/estoque das bases — não há aqui.
rep("      return calcCobertura(db, todayStr());", "      return {};")

# Anel da Visão geral: % com handover enviado
rep("var prontas = prox30.filter(j => j.status === PJ_STATUS.REL || j.status === PJ_STATUS.TAKEN).length;",
    "var prontas = prox30.filter(j => !!handoverDoJob(j)).length;")
rep("' prontas para o campo'", "' com handover enviado'")
rep('"prontas para o campo")', '"com handover enviado")')

# ---------------------------------------------------------------- handover → e-mail
rep("        readOnly: ex.status !== 'reprovado',", "        readOnly: ex.status !== 'reprovado' && ex.status !== 'email',")
rep("    var semGente = c.ops.filter(j => !(j.peopleNeeds || []).some(n => Number(n.qty) > 0));",
    "    var semGente = c.ops.filter(j => !ehDispTipo(j.tipoOp) && !(j.peopleNeeds || []).some(n => Number(n.qty) > 0));")
# Disponibilidade também sai por handover (o HI é do campo)
rep('(d.status || PJ_STATUS.PLAN) === PJ_STATUS.PLAN && (ehDisp ? React.createElement("button", {',
    '(d.status || PJ_STATUS.PLAN) === PJ_STATUS.PLAN && (false ? React.createElement("button", {')
rep("}, hoAtual.status === 'reprovado' && !travado ? '✎ Revisar e reenviar' : '▤ Ver handover')",
    "}, hoAtual.status === 'email' ? '\\u2709 Handover v' + (hoAtual.versao || 1) + ' — revisar / reenviar' : hoAtual.status === 'reprovado' && !travado ? '✎ Revisar e reenviar' : '▤ Ver handover')")
# Formulário da operação: aviso do e-mail já enviado
rep('''      className: "eng-mb"
    }, (() => {
      var mob = mobOfPlanned(d);''', '''      className: "eng-mb"
    }, hoEmailBanner(hoAtual), engConsBanner(d), (() => {
      var mob = mobOfPlanned(d);''')
# Janela do handover
rep("}, hd.editId ? ro ? 'Handover' : 'Revisar handover devolvido' : 'Enviar handover'), React.createElement(\"div\", {",
    "}, hd.editId ? ro ? 'Handover' : hd.status === 'email' ? 'Handover já enviado — nova versão' : 'Revisar handover devolvido' : 'Enviar handover'), React.createElement(\"div\", {")
rep('''    }, ro && React.createElement("div", {
      className: "eng-lock",
      style: {
        marginBottom: 12
      }
    }, React.createElement("b", null, hd.status === 'pendente' ''', '''    }, hd.status === 'email' && hoEmailBanner((db.handovers || []).find(h => h.id === hd.editId)), ro && React.createElement("div", {
      className: "eng-lock",
      style: {
        marginBottom: 12
      }
    }, React.createElement("b", null, hd.status === 'pendente' ''')
rep('''      onClick: () => setHoDraft(x => ({
        ...x,
        step: 'conf'
      }))
    }, "\\u2713 Conclu\\xEDdo"))));''', '''      onClick: () => setHoDraft(x => ({
        ...x,
        step: 'mail'
      }))
    }, "Continuar para o e-mail \\u2192"))));''')
rep('    if (hd.step === \'conf\') return React.createElement("div", {',
    '    if (hd.step === \'mail\') return renderHoMail(hd, c);\n    if (hd.step === \'conf\') return React.createElement("div", {')
rep("}, c.offshore ? 'Aprovado, o pedido vai para o app Equipamentos escolher as unidades e para a Logística embarcar.' : 'Onshore: o supervisor escolhe as unidades na mobilização.')",
    "}, 'Vai no e-mail do handover: o tipo e a quantidade solicitada.')")
rep(r'placeholder: "Informa\xE7\xF5es para a coordena\xE7\xE3o, a log\xEDstica e o campo\u2026"',
    r'placeholder: "Informa\xE7\xF5es para quem recebe o e-mail: log\xEDstica, coordena\xE7\xE3o e campo\u2026"')
# Aba Handovers = e-mails gerados
rep("  var renderPlanHandovers = () => {", "  var renderPlanHandovers = () => renderHoEmails();\n  var renderPlanHandoversEARL = () => {")
# Lista: selo do e-mail e botão
rep('''pjBadge(j.status), j.contingencia && React.createElement("div", {
        className: "eng-cont-pill"''', '''pjBadge(j.status), hoEmailTag(j), engConsTag(j), engRiscoTag(j), j.contingencia && React.createElement("div", {
        className: "eng-cont-pill"''')
rep('''        onClick: () => abrirHandover(j)
      }, "Handover \\u2192")));''', '''        onClick: () => abrirHandover(j)
      }, handoverDoJob(j) ? '\\u2709 Handover v' + (handoverDoJob(j).versao || 1) + ' \\u2192' : "Handover \\u2192")));''')

# Texto do cadastro de sondas (aqui não há o app Sondas)
rep(r'Toda sonda ganha a sua p\xE1gina no app Sondas, com o invent\xE1rio a bordo (DAR), servi\xE7os, pessoas e hist\xF3rico."',
    r'As sondas cadastradas aqui aparecem no campo Sonda das opera\xE7\xF5es da Engenharia."')

# Contratos: aba "Consumo e receita", consumo de PPU na operação e na Lista
rep("[['gantt', 'Gantt'], ['cal', 'Calendário'], ['list', 'Lista'], ['ho', 'Handovers']]",
    "[['gantt', 'Gantt'], ['cal', 'Calendário'], ['list', 'Lista'], ['ho', 'Handovers'], ['inv', 'Inventário das sondas']]") # e18: sem a pílula "Consumo e receita" (a receita está nos Indicadores)
rep("planView === 'ho' && renderPlanHandovers()));", "planView === 'ho' && renderPlanHandovers(), planView === 'rec' && renderEngReceita(), planView === 'inv' && renderEngInventario()));")
rep('''      onClick: () => setLogView(d.id)
    }, "\\u2630 Log"),''', '''      onClick: () => setLogView(d.id)
    }, "\\u2630 Log"), !tplMode && d.id && React.createElement("button", {
      className: "btn-o ec-btn-cons",
      title: "Lan\\xE7ar o consumo de PPU desta opera\\xE7\\xE3o (baixa o saldo do contrato e gera a receita)",
      onClick: () => abrirEngCons(d)
    }, "\\u03A3 Consumo PPU"),''')
rep('''        onClick: () => duplicatePlanned(j)
      }, "Duplicar"),''', '''        onClick: () => duplicatePlanned(j)
      }, "Duplicar"), React.createElement("button", {
        className: "btn-o ec-btn-cons",
        style: {
          fontSize: 10
        },
        onClick: () => abrirEngCons(j)
      }, "\\u03A3 Consumo"),''')

# e5: risco da receita/COGS na operação (seção 2 do formulário) e etiqueta na Lista
rep("aparece em roxo no Gantt.')))), React.createElement(\"div\", {", "aparece em roxo no Gantt.')), engRiscoCampo(d, set))), React.createElement(\"div\", {")

# e10: contingência = risco de NÃO acontecer (o mesmo valor do "Risco da receita / COGS", riscoRec): 0% = entra
# inteira na receita, no COGS e nas químicas; 100% = fica mapeada, mas fora. O campo antigo "risco" (chance de
# acontecer, usado no forecast de químicas do EARL) vira 100 − riscoRec ao salvar (e na migração do loadDB).
rep("""        setPlanDraft(x => ({
          ...x,
          contingencia: v,
          ...(v ? {
            risco: x.risco === '' || x.risco == null ? 50 : x.risco
          } : {})
        }));""", """        setPlanDraft(x => ({
          ...x,
          contingencia: v
        }));""")
rep("""d.contingencia ? React.createElement("div", {
      className: "eng-risco"
    }, React.createElement("span", null, "Risco de acontecer"), React.createElement("input", {
      type: "range",
      min: "0",
      max: "100",
      step: "5",
      value: Number(d.risco) || 0,
      onChange: e => set('risco', e.target.value)
    }), React.createElement("input", {
      className: "qty-input",
      type: "number",
      min: "0",
      max: "100",
      value: d.risco == null ? '' : d.risco,
      onChange: e => set('risco', e.target.value)
    }), React.createElement("b", null, "%")) : React.createElement("div", {""", """d.contingencia ? engContRisco(d, set) : React.createElement("div", {""")
rep("      risco: draft.contingencia ? Math.max(0, Math.min(100, Math.round(Number(draft.risco) || 0))) : null,",
    "      risco: draft.contingencia ? 100 - Math.max(0, Math.min(100, Math.round(Number(draft.riscoRec) || 0))) : null,")
rep("var TPL_FIELDS = ['tipoOp', 'casing', 'durationDays', 'anchor', 'contingencia', 'risco', 'notes',",
    "var TPL_FIELDS = ['tipoOp', 'casing', 'durationDays', 'anchor', 'contingencia', 'risco', 'riscoRec', 'notes',")
# o que aparece no Gantt, na lista e nas escolhas de operação: o risco de não acontecer
rep("j.contingencia ? ` · risco ${j.risco || 0}%` : ''", "j.contingencia ? ` · risco ${j.riscoRec || 0}%` : ''", 2)
rep("(j.contingencia ? ` · ${j.risco || 0}%` : '')", "(j.contingencia ? ` · risco ${j.riscoRec || 0}%` : '')", 2)
rep("'Contingência · ' + (j.risco || 0) + '%'", "'Contingência · risco ' + (j.riscoRec || 0) + '%'", 3)
rep("(j.contingencia ? ' (' + (j.risco || 0) + '%)' : '')", "(j.contingencia ? ' (risco ' + (j.riscoRec || 0) + '%)' : '')", 2)
# linhas em contingência (itens PPU, químicas, casing, pessoal, equipamentos): a linha continua guardando a chance de
# acontecer (como no EARL); a tela mostra e edita o risco de não acontecer = 100 − chance. Marcar = risco 0%.
rep('"Conting\\xEAncia \\xB7 chance"', '"Conting\\xEAncia \\xB7 risco"')
rep("""    onChange: e => onCont(x.key, e.target.checked ? {
      cont: true,
      chance: x.chance == null || x.chance === '' ? 50 : x.chance
    } : {""", """    onChange: e => onCont(x.key, e.target.checked ? {
      cont: true,
      chance: x.chance == null || x.chance === '' ? 100 : x.chance
    } : {""")
rep("""    title: "Chance de esta linha acontecer",
    value: x.chance == null ? '' : x.chance,
    onChange: e => onCont(x.key, {
      chance: e.target.value
    })""", """    title: "Risco de esta linha n\\xE3o acontecer: 0% = conta inteira; 100% = fica mapeada, mas fora da receita, do COGS e das qu\\xEDmicas",
    value: x.chance == null || x.chance === '' ? '' : Math.max(0, Math.min(100, 100 - Number(x.chance))),
    onChange: e => onCont(x.key, {
      chance: e.target.value === '' ? '' : 100 - Math.max(0, Math.min(100, Number(e.target.value) || 0))
    })""")
rep('title: "Marque se esta linha pode ou n\\xE3o acontecer"', 'title: "Marque se esta linha pode ou n\\xE3o acontecer e informe o risco de n\\xE3o acontecer"')

# e10: saldo da sonda no handover (coluna "Saldo na sonda" do e-mail e "A bordo" da janela): a última contagem do
# Inventário das sondas (aba do contrato); sem contagem, o DAR do EARL (quando a sonda tiver).
rep("""  var saldoABordo = useCallback(rigId => {
    var rig = (db.rigs || []).find(r => r.id === rigId);
    if (!rig) return null;""", """  var saldoABordo = useCallback(rigId => {
    var rig = (db.rigs || []).find(r => r.id === rigId);
    if (!rig) return null;
    var cInv = (Array.isArray(db.invSondas) ? db.invSondas : []).filter(c => c.rigId === rig.id).sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')) || String(b.atualizadoEm || '').localeCompare(String(a.atualizadoEm || '')))[0];
    if (cInv) {
      var oi = {
        bySap: {},
        byNome: {},
        fonte: 'Inventário das sondas, contagem de ' + fmtD(cInv.data) + (cInv.por ? ' (' + cInv.por + ')' : ''),
        data: cInv.data
      };
      (cInv.itens || []).forEach(i => {
        var v = parseFloat(String(i.qtd == null ? '' : i.qtd).replace(',', '.')) || 0;
        if (i.sap) oi.bySap[String(i.sap)] = (oi.bySap[String(i.sap)] || 0) + v;
        var kn = normNome(i.nome);
        if (kn) oi.byNome[kn] = (oi.byNome[kn] || 0) + v;
      });
      return oi;
    }""")
rep("  }, [db.rigs, db.darItems, db.macaeDar]);", "  }, [db.rigs, db.darItems, db.macaeDar, db.invSondas]);")

# e10: Lista com o horizonte "Todas" (todas as operações do contrato, passadas e futuras, por data)
rep("""    var lim = dAdd(hoje, planListDays);
    var list = planFiltered.filter(j => j.status !== PJ_STATUS.CANC && j.date >= dAdd(hoje, -3) && j.date <= lim);""", """    var listaTodas = planListDays === 'todas';
    var lim = listaTodas ? '' : dAdd(hoje, planListDays);
    var list = planFiltered.filter(j => j.status !== PJ_STATUS.CANC && (listaTodas || j.date >= dAdd(hoje, -3) && j.date <= lim));
    if (listaTodas) list = list.slice().sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));""")
rep("""      onClick: () => setPlanListDays(n)
    }, n, " dias")), React.createElement("span", {""", """      onClick: () => setPlanListDays(n)
    }, n, " dias")), React.createElement("button", {
      key: "todas",
      className: (planListDays === 'todas' ? 'btn-r' : 'btn-o') + ' eng-lista-todas',
      style: {
        fontSize: 11
      },
      title: "Todas as opera\\xE7\\xF5es, passadas e futuras, por data",
      onClick: () => setPlanListDays('todas')
    }, "Todas"), React.createElement("span", {""")

# e10: sondas identificadas como "NOME PETROBRAS - NOME DA SONDA" (só o nome quando não há nome Petrobras). O mapa
# rigById (Gantt, calendário, lista, logs) já entrega o nome nesse formato; os seletores e o handover usam rigFmt.
rep("""  var rigById = useMemo(() => {
    var m = {};
    (db.rigs || []).forEach(r => m[r.id] = r);
    return m;
  }, [db.rigs]);""", """  var rigById = useMemo(() => {
    var m = {};
    (db.rigs || []).forEach(r => m[r.id] = {
      ...r,
      name: rigFmt(r) || r.name
    });
    return m;
  }, [db.rigs]);""")
rep("""    }, "Sonda (todas)"), (db.rigs || []).filter(r => r.active !== false).map(r => React.createElement("option", {
      key: r.id,
      value: r.id
    }, r.name))), React.createElement("select", {""", """    }, "Sonda (todas)"), (db.rigs || []).filter(r => r.active !== false).map(r => React.createElement("option", {
      key: r.id,
      value: r.id
    }, rigFmt(r)))), React.createElement("select", {""")
rep("""    }, rigsCli.map(r => React.createElement("option", {
      key: r.id,
      value: r.id
    }, r.name))), rigsCli.length > 0 ? React.createElement("optgroup", {
      label: "Outras sondas"
    }, rigsOutros.map(r => React.createElement("option", {
      key: r.id,
      value: r.id
    }, r.name))) : rigsOutros.map(r => React.createElement("option", {
      key: r.id,
      value: r.id
    }, r.name)))), React.createElement("div", {""", """    }, rigsCli.map(r => React.createElement("option", {
      key: r.id,
      value: r.id
    }, rigFmt(r)))), rigsCli.length > 0 ? React.createElement("optgroup", {
      label: "Outras sondas"
    }, rigsOutros.map(r => React.createElement("option", {
      key: r.id,
      value: r.id
    }, rigFmt(r)))) : rigsOutros.map(r => React.createElement("option", {
      key: r.id,
      value: r.id
    }, rigFmt(r))))), React.createElement("div", {""")
rep("}, 'Handover — ' + (c.rig.name || '—'))), hd.status && hoBadge(hd.status)", "}, 'Handover — ' + (rigFmt(c.rig) || '—'))), hd.status && hoBadge(hd.status)")
rep("operação(ões) da sonda ' + (c.rig.name || '—') + ' para a Coordenação aprovar", "operação(ões) da sonda ' + (rigFmt(c.rig) || '—') + ' para a Coordenação aprovar")
rep('}, React.createElement("b", null, p.rig.name), React.createElement("span", null, p.ops.length ?', '}, React.createElement("b", null, rigFmt(p.rig)), React.createElement("span", null, p.ops.length ?')

# e6: gravação recusada pelo navegador: mensagem certa para a Engenharia e aviso na página inicial
rep("""      if (!saveDB(next)) setTimeout(() => setSyncErr('⚠ O navegador recusou a gravação — o armazenamento local está cheio ' + 'e esta alteração NÃO foi salva neste aparelho. Costuma ser anexo de nota fiscal grande demais: ' + 'apague anexos antigos em Granéis & HCl (ou exporte o banco) e repita a operação.'), 0);""",
    """      if (!saveDB(next)) setTimeout(() => {
        setSyncErr('⚠ O navegador recusou a gravação e esta alteração NÃO foi salva neste computador. O espaço do navegador para arquivos abertos do disco está cheio (ele é dividido com o EARL completo, as simulações, o Gerencial e os testes). Use “Ver e liberar espaço” na página inicial, ou “⬇ Exportar dados” para não perder o que foi feito.');
        engEspacoFalhou();
      }, 0);""")

# e5: painel "Receita e COGS" na página inicial da Engenharia
# e16: duas abas na página inicial — Indicadores (o Gerencial embutido) e Contratos (os cards)
rep("engContratos.length + ' contrato(s) vigente(s)')), engAlerta(planJobs), React.createElement(\"div\", {", "engContratos.length + ' contrato(s) vigente(s)')), engAlerta(planJobs), renderEngEspacoAviso(), renderEngHomeTabs(), engHomeTab === 'ind' ? renderEngIndicadores() : React.createElement(\"div\", {")
# e8: card do contrato com o botão ⋯ (Arquivar / Apagar)
rep('''      }, b))), React.createElement("span", {
        className: "eng2-go",
        "aria-hidden": "true"
      }, "\\u2192"));
    })), !engContratos.length && React.createElement("div", {''', '''      }, b))), engCtMenu(ct), React.createElement("span", {
        className: "eng2-go",
        "aria-hidden": "true"
      }, "\\u2192"));
    })), engHomeTab !== 'ind' && !engContratos.length && React.createElement("div", {''')

# e6: banco de produtos químicos. A base (quimicos_base.json, tabela Químicos da aba Forecast) entra uma vez
# em cada computador, no loadDB, quando o banco ainda não tem produtos químicos (flag quimBaseV1).
import json as _json
_base = _json.load(open(os.path.join(AQUI, 'quimicos_base.json'), encoding='utf-8'))
_lit = _json.dumps(_base, ensure_ascii=False).replace('</', '<\\/')
_ger = open(os.path.join(AQUI, '..', 'gerencial', 'gerencial.html'), encoding='utf-8').read()
for _m, _v in [('/*__LIB_XLSX__*/', ''), ('/*__LIB_JSZIP__*/', ''), ('__LOGO_HAL__', 'data:,'), ('__LOGO_EARL__', 'data:,')]:
    assert _ger.count(_m) == 1, _m
    _ger = _ger.replace(_m, _v)
assert _ger.count('<body>\n') == 1
_ger = _ger.replace('<body>\n', '<body>\n<script type="application/json" id="earlger-embutido">{"app":"engenharia"}</script>\n')
_gerLit = _json.dumps(_ger, ensure_ascii=False).replace('</', '<\\/').replace('<!--', '<\\!--')
rep("var loadDB = () => {\n", """/* EARL Engenharia e8: a seção "Receita e margem" do EARL Gerencial (gerencial/gerencial.html), no modo embutido */
/* e10: nome da sonda para mostrar: "NOME PETROBRAS - NOME DA SONDA" (só o nome quando não há nome Petrobras) */
var rigFmt = r => {
  if (!r) return '';
  var np = String(r.nomePetrobras || '').trim(),
    nm = String(r.name || '').trim();
  return np && nm && normNome(np) !== normNome(nm) ? np + ' - ' + nm : nm || np;
};
var ENG_GER_HTML = """ + _gerLit + """;
/* EARL Engenharia (avulso) e6: banco inicial de produtos químicos */
var ENG_QUIM_BASE = %s;
var engQuimMig = d => {
  try {
    if (d && !d.quimBaseV1) {
      if (!Array.isArray(d.quimicos) || !d.quimicos.length) {
        d.quimicos = ENG_QUIM_BASE.itens.map(q => ({
          id: 'q_' + q.sap,
          sap: q.sap,
          nome: q.nome,
          unid: q.unid,
          usd: q.usd,
          atualizadoEm: ENG_QUIM_BASE.geradoEm
        }));
        d.quimHist = [...(Array.isArray(d.quimHist) ? d.quimHist : []), {
          id: 'qh_base',
          em: ENG_QUIM_BASE.geradoEm,
          por: '',
          origem: 'base',
          arquivo: ENG_QUIM_BASE.origem,
          novos: d.quimicos.length,
          alterados: 0,
          removidos: 0,
          total: d.quimicos.length
        }];
      }
      d.quimBaseV1 = new Date().toISOString();
    }
  } catch (e) {}
  /* e18 (pedido do Hugo, 26/11/2026): COGS do Cimento Classe G (SAP 100003685) = US$ 7,77/sk em todos os arquivos.
     Corrige uma vez em cada arquivo (flag cogsCimentoGV1 {em, de, para}); depois, quem mudar o valor no banco de
     químicos fica com o seu. Entra no histórico do banco de químicos. */
  try {
    if (d && !d.cogsCimentoGV1) {
      var agoraCg = new Date().toISOString();
      d.quimicos = Array.isArray(d.quimicos) ? d.quimicos : [];
      var cg = d.quimicos.find(q => q && String(q.sap).trim() === '100003685');
      var deCg = cg ? cg.usd : null;
      if (!cg) d.quimicos.push({
        id: 'q_100003685',
        sap: '100003685',
        nome: 'CIMENTO CLASS G',
        unid: 'SK',
        usd: 7.77,
        atualizadoEm: agoraCg
      });else if (Number(cg.usd) !== 7.77) {
        cg.usd = 7.77;
        cg.atualizadoEm = agoraCg;
      }
      if (Number(deCg) !== 7.77) d.quimHist = [...(Array.isArray(d.quimHist) ? d.quimHist : []), {
        id: 'qh_e18_cimento_g',
        em: agoraCg,
        por: '',
        origem: 'correção',
        arquivo: 'Correção do COGS do Cimento Classe G (SAP 100003685): ' + (deCg == null ? '' : 'US$ ' + deCg + ' → ') + 'US$ 7,77/sk',
        novos: deCg == null ? 1 : 0,
        alterados: deCg == null ? 0 : 1,
        removidos: 0,
        total: d.quimicos.length
      }];
      d.cogsCimentoGV1 = {
        em: agoraCg,
        de: deCg,
        para: 7.77
      };
    }
  } catch (e) {}
  /* e10: operação em contingência: o risco de não acontecer é o riscoRec; a chance de acontecer (campo risco, usado no
     forecast de químicas) passa a ser 100 − riscoRec. Modelos de operação em contingência sem riscoRec ficam com 0%%. */
  try {
    var rnum = v => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
    (d && d.plannedJobs || []).forEach(j => {
      if (j && j.contingencia) j.risco = 100 - rnum(j.riscoRec);
    });
    (d && d.opTemplates || []).forEach(t => {
      var f = t && t.fields;
      if (f && f.contingencia) {
        if (f.riscoRec == null || f.riscoRec === '') f.riscoRec = 0;
        f.risco = 100 - rnum(f.riscoRec);
      }
    });
  } catch (e) {}
  /* e12: banco de casing equipment = db.casingEquip (o catálogo de casing do EARL, que as operações usam) com o valor em
     US$ (usd) e a data (atualizadoEm). Uma vez: cada item ganha id (ce_<SAP>, para juntar dados de outro computador) e o
     custo de casing que estava em Custos (COGS) (db.cogsItens com SAP e só US$, que não é ajuste AJ- nem químico do banco
     de químicos) passa para o banco de casing; o que não é casing (R$, sem SAP, ajustes) continua em Custos. */
  try {
    if (d && !d.casDbV1) {
      if (!Array.isArray(d.casingEquip)) d.casingEquip = [];
      var qSap = new Set((d.quimicos || []).map(q => String(q && q.sap || '').trim()).filter(Boolean));
      var fica = [],
        mov = 0,
        novosCe = 0;
      (d.cogsItens || []).forEach(c => {
        var sap = String(c && c.sap || '').trim();
        if (!c || !sap || /^AJ-/i.test(sap) || qSap.has(sap) || typeof c.usd !== 'number' || c.brl != null && c.brl !== '') {
          fica.push(c);
          return;
        }
        var e = d.casingEquip.find(x => x && String(x.sap || '').trim() === sap);
        if (e) {
          if (e.usd == null) {
            e.usd = c.usd;
            e.atualizadoEm = c.atualizadoEm || e.atualizadoEm;
          }
        } else {
          d.casingEquip.push({
            id: 'ce_' + sap,
            sap,
            name: String(c.nome || '').trim() || sap,
            unit: String(c.unid || '').trim() || 'EA',
            origem: 'Custos (COGS)',
            usd: c.usd,
            atualizadoEm: c.atualizadoEm || new Date().toISOString()
          });
          novosCe++;
        }
        mov++;
      });
      d.casingEquip.forEach(x => {
        if (x && !x.id && String(x.sap || '').trim()) x.id = 'ce_' + String(x.sap).trim();
      });
      if (mov) {
        d.cogsItens = fica;
        d.casHist = [...(d.casHist || []), {
          id: 'ce_h_mig',
          em: new Date().toISOString(),
          por: '',
          origem: 'custos',
          arquivo: mov + ' item(ns) de casing',
          novos: novosCe,
          alterados: mov - novosCe,
          removidos: 0,
          total: d.casingEquip.length
        }];
      }
      d.casDbV1 = new Date().toISOString();
    }
  } catch (e) {}
  /* e8: contrato apagado pelo card não volta pela migração da semente (que recria pelo número) */
  try {
    if (d && Array.isArray(d.ctApagados) && d.ctApagados.length) {
      var ap = new Set(d.ctApagados.map(x => x && x.id));
      d.contratos = (d.contratos || []).filter(c => !ap.has(c.id));
    }
  } catch (e) {}
  return d;
};
var loadDB = () => {
""" % _lit)
rep("      if (d.people && d.people.length > 0) return migrateDB(d);", "      if (d.people && d.people.length > 0) return engQuimMig(migrateDB(d));")
rep("  return migrateDB(JSON.parse(JSON.stringify(SEED_DB)));", "  return engQuimMig(migrateDB(JSON.parse(JSON.stringify(SEED_DB))));")

# Código novo (antes de renderHandover) e janelas novas na árvore
novo = open(os.path.join(AQUI, 'eng_app.js'), encoding='utf-8').read() + '\n' + open(os.path.join(AQUI, 'eng_contratos.js'), encoding='utf-8').read() + '\n' + open(os.path.join(AQUI, 'eng_quimicos.js'), encoding='utf-8').read() + '\n' + open(os.path.join(AQUI, 'eng_inventario.js'), encoding='utf-8').read() + '\n' + open(os.path.join(AQUI, 'eng_cambio.js'), encoding='utf-8').read() + '\n' + open(os.path.join(AQUI, 'eng_logo.js'), encoding='utf-8').read() + '\n' + open(os.path.join(AQUI, 'eng_e17.js'), encoding='utf-8').read() + '\n' + open(os.path.join(AQUI, 'eng_e19.js'), encoding='utf-8').read()
rep("  var renderHandover = () => {\n", novo.rstrip('\n') + "\n  var renderHandover = () => {\n")
rep("renderRigForm(), renderConfirmBox(),", "renderEngSondas(), renderEngContratos(), renderEngQuim(), renderEngCasDb(), renderEngEspaco(), renderEngCons(), renderEngImpDados(), renderEngGer(), renderEngInvEd(), renderEngExp(), renderEngCambio(), renderEngLogo(), renderRigForm(), renderConfirmBox(),")
# sonda salva com data de alteração (para o "juntar" da importação ficar com a mais recente)
rep("      regiao: regiaoDaBase(rigDraft.base) || rigDraft.regiao || 'nne',", "      regiao: regiaoDaBase(rigDraft.base) || rigDraft.regiao || 'nne',\n      updatedAt: new Date().toISOString(),")

# e13: a logo no topo do contrato vira botão para inserir/trocar a logo do cliente (eng_logo.js)
rep("""    }, ctSel ? React.createElement(ClientMark, {
      nome: ctSel.clientName,
      src: clientLogoOf(db, ctSel.clientName),
      size: 46
    }) : React.createElement(ClientMark, {""", """    }, ctSel ? engLogoBotao(ctSel.clientName, 46) : React.createElement(ClientMark, {""")

# ---------------------------------------------------------------- e14: segurança (23/11/2026)
# O antivírus do SharePoint/OneDrive (Microsoft) marcou os arquivos como "Malicious Payload". Era falso positivo
# (ClamAV: 0 vírus; os modelos não têm macro nem JavaScript), mas o EARL v115 traz, para os relatórios de campo
# (CSS, KPI, Job Log), três coisas com o mesmo desenho de ataque ("HTML smuggling" e phishing):
#   * modelos Word/Excel/PDF escondidos em base64 dentro do HTML;
#   * a JSZip em base64 executada com atob → <script> (e, se falhar, baixada do cdnjs);
#   * o login Microsoft (MSAL de alcdn.msauth.net, login.microsoftonline.com, Graph com Mail.Send) e o
#     carregamento de pdf-lib/pdf.js da internet.
# Nada disso é usado na Engenharia: sai daqui. E o arquivo ganha uma política de segurança (CSP) que proíbe
# carregar código ou enviar dados para qualquer endereço da internet.
for nome in ('CSS_XLSX_B64', 'CSS_BLANK_PDF_B64', 'JSZIP_B64', 'JOBLOG_DOCX_B64', 'KPI_XLSX_B64'):
    s, n = re.subn(r'var %s = "[A-Za-z0-9+/=]+";' % nome,
                   'var %s = ""; /* e14: modelo de relatório de campo removido (não usado na Engenharia) */' % nome, s)
    assert n == 1, nome
SEM_INTERNET = ("Promise.reject(new Error('EARL Forecast: recurso do EARL de campo, indisponível neste arquivo "
                "(ele não carrega nada da internet).'))")
i = s.index('var ensureJSZip = () => {')
j = s.index('\n};\n', i) + 4
assert 'atob(JSZIP_B64)' in s[i:j] and 'cdnjs' in s[i:j]
s = s[:i] + 'var ensureJSZip = () => ' + SEM_INTERNET + ';\n' + s[j:]
i = s.index('var loadScriptOnce = url => new Promise(')
j = s.index('\n});\n', i) + 5
assert 's.src = url' in s[i:j] and s.count('var loadScriptOnce') == 1
s = s[:i] + 'var loadScriptOnce = url => ' + SEM_INTERNET + ';\n' + s[j:]
rep("loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js')", "loadScriptOnce('')")
rep("var PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';", "var PDFJS_URL = '';")
rep("var GRAPH_BASE = 'https://graph.microsoft.com/v1.0';", "var GRAPH_BASE = '';")
rep("var GRAPH_SCOPES = ['User.Read', 'Files.ReadWrite.All', 'Sites.ReadWrite.All', 'Mail.Send'];", "var GRAPH_SCOPES = [];")
rep("var MSAL_CDN = 'https://alcdn.msauth.net/browser/3.7.1/js/msal-browser.min.js';", "var MSAL_CDN = '';")
rep("authority: 'https://login.microsoftonline.com/' + cfg.tenantId,", "authority: '',")
rep('placeholder: "https://prod-xx.westus.logic.azure.com:443/workflows/...",', 'placeholder: "",')
rep('placeholder: "https://prod-xx.brazilsouth.logic.azure.com:443/workflows/...",', 'placeholder: "",')
# CSP: só o código do próprio arquivo roda; nada é buscado nem enviado para a internet (fetch, XHR, imagens, fontes,
# formulários, iframes de fora). Os downloads (Excel, .eml, backup) são blob:/data: e continuam funcionando.
CSP = ("default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; "
       "font-src data:; media-src data: blob:; connect-src data: blob:; frame-src blob: data:; child-src blob: data:; "
       "worker-src blob:; form-action 'none'; base-uri 'none'; object-src 'none'")
rep('<head>\n', '<head>\n<meta charset="UTF-8">\n<meta http-equiv="Content-Security-Policy" content="%s">\n'
    '<meta name="referrer" content="no-referrer">\n' % CSP)
assert 'UEsDB' not in s and 'JVBER' not in s, 'sobrou arquivo Office/PDF em base64'
for proibido in ('login.microsoftonline.com', 'graph.microsoft.com', 'msauth.net', 'atob(JSZIP_B64)', 'logic.azure.com'):
    assert proibido not in s, proibido

# e15: "🗑 Apagar contrato" no topo do contrato (além do ⋯ do card): apaga o contrato e tudo o que é dele
rep(r"""    }, "\u21C4 Trocar contrato")), React.createElement("div", {
      className: "toolbar"
    }""", r"""    }, "\u21C4 Trocar contrato"), ctSel && React.createElement("button", {
      className: "btn-o eng2-ctbar-apagar",
      title: "Apagar este contrato e tudo o que é dele (operações, consumos, handovers, inventário)",
      onClick: () => engCtApagar(ctSel)
    }, "\uD83D\uDDD1 Apagar contrato")), React.createElement("div", {
      className: "toolbar"
    }""")

# e17 (pedido do Hugo, 25/11/2026): eng_e17.js — filtro de sonda só com as sondas que têm operação; "✓ Concluir
# operação" (contingências respondidas antes); cor das linhas de cada sonda no Gantt; receita e COGS de cada operação
# (US$, valor cheio) no Gantt, no Calendário e na Lista.
rep("renderEngCons(), renderEngImpDados(),", "renderEngCons(), renderEngConc(), renderEngCorPop(), renderEngCoresCss(), renderEngImpDados(),")
rep('}, "Sonda (todas)"), (db.rigs || []).filter(r => r.active !== false).map(r => React.createElement("option", {',
    '}, "Sonda (todas)"), engRigsFiltro().map(r => React.createElement("option", {')
rep("""    if (pj.contingencia) return 'contingencia';
    if (pj.status === PJ_STATUS.COORD) return 'coordenacao';""", """    if (engConcluida(pj)) return 'concluida'; // e17: concluída (consumo lançado) fica preta no Gantt
    if (pj.contingencia) return 'contingencia';
    if (pj.status === PJ_STATUS.COORD) return 'coordenacao';""")
rep(r"""      onClick: () => abrirEngCons(d)
    }, "\u03A3 Consumo PPU"),""", r"""      onClick: () => abrirEngCons(d)
    }, "\u03A3 Consumo PPU"), !tplMode && d.id && engConcBotoes(d, travado, savePlanned),""")
# Gantt: o nome da sonda escolhe a cor das linhas (no app avulso não há a página da sonda)
rep("""        title: rid ? 'Abrir a página da sonda' : '',
        onClick: () => {
          if (rid) {
            setRigSel(rid);
            setRigTab('ficha');
            setMainTab('rig');
          }
        }""", """        title: rid ? 'Escolher a cor das linhas desta sonda' : '',
        className: rid ? 'eng-rig-cor-b' : '',
        onClick: e => engAbrirCor(rid, e)""", 2)
rep(r"""      return React.createElement("div", {
        key: j.id,
        style: {
          display: 'flex',
          borderTop: '1px solid var(--line)'
        }
      }, React.createElement("div", {
        onClick: () => setPlanDraft({
          ...j
        }),
        title: "Abrir a opera\xE7\xE3o",""", r"""      return React.createElement("div", {
        key: j.id,
        className: "eng-gj",
        "data-rigrow": j.rigId || '',
        style: {
          display: 'flex',
          borderTop: '1px solid var(--line)'
        }
      }, React.createElement("div", {
        onClick: () => setPlanDraft({
          ...j
        }),
        title: "Abrir a opera\xE7\xE3o",""")
rep(r"""}, j.well || '—', " \xB7 ", tipoTxt(j))) : React.createElement(React.Fragment, null, React.createElement("div", {""",
    r"""}, j.well || '—', " \xB7 ", tipoTxt(j)), engRcLinha(j)) : React.createElement(React.Fragment, null, React.createElement("div", {""")
rep("""      }, j.well || '—'))), React.createElement("div", {
        style: {
          width: W,
          flexShrink: 0,
          position: 'relative',
          height: 38,""", """      }, j.well || '—'), engRcLinha(j))), React.createElement("div", {
        style: {
          width: W,
          flexShrink: 0,
          position: 'relative',
          minHeight: 38,
          alignSelf: 'stretch',""")
rep("${cobTit(j)}", "${cobTit(j)}${engRcTit(j)}", 2)
rep("title: `${j.tipoOp} · ${j.well || '—'}` + (mj ? ' — ▤ abre a operação completa' : ''),",
    "title: `${j.tipoOp} · ${j.well || '—'}` + (mj ? ' — ▤ abre a operação completa' : '') + engRcTit(j),")
rep(r"""}, (rigById[j.rigId] || {}).name || '', " \xB7 ", j.well || j.tipoOp), mj && React.createElement("span", {""",
    r"""}, (rigById[j.rigId] || {}).name || '', " \xB7 ", j.well || j.tipoOp, engRcCal(j)), mj && React.createElement("span", {""")
# Lista: receita e COGS (US$) e "✓ Concluída"
rep("""React.createElement("th", null, "Cliente / contrato"), React.createElement("th", null, "Status"), React.createElement("th", null))), React.createElement("tbody", null, list.map(j => {
      var slip = pjSlip(j);""", """React.createElement("th", null, "Cliente / contrato"), React.createElement("th", null, "Status"), React.createElement("th", null, "Receita (US$)"), React.createElement("th", null, "COGS (US$)"), React.createElement("th", null))), React.createElement("tbody", null, list.map(j => {
      var slip = pjSlip(j);""")
rep("""'Contingência · risco ' + (j.riscoRec || 0) + '%')), React.createElement("td", {
        className: "actions",""", """'Contingência · risco ' + (j.riscoRec || 0) + '%')), engRcTd(j, 'rec'), engRcTd(j, 'cogs'), React.createElement("td", {
        className: "actions",""")
rep("pjBadge(j.status), hoEmailTag(j), engConsTag(j),", "pjBadge(j.status), hoEmailTag(j), engConcTag(j), engConsTag(j),")

# e17 (2ª parte, 26/11/2026): pílulas de filtro, receita/COGS na janela da operação, duplicar o poço inteiro, Perfuração.
# Pílulas: o estado e o teste ficam no começo do App, porque o planBase (useMemo) roda antes do código novo.
rep("""  var [planF, setPlanF] = useState({
    rig: '',
    cliente: '',
    tipo: '',
    status: ''
  });""", """  var [planF, setPlanF] = useState({
    rig: '',
    cliente: '',
    tipo: '',
    status: ''
  });
  /* e17: pílulas de filtro do plano (eng_e17.js desenha). Grupos: situação (prev, conc, atras), marcas (cont, risco,
     fora) e handover (hoS, hoN); dentro do grupo vale "ou", entre grupos "e". */
  var [engPil, setEngPil] = useState(() => {
    try {
      var v = JSON.parse(localStorage.getItem('eng_pilulas_v1') || '[]');
      return Array.isArray(v) ? v : [];
    } catch (e) {
      return [];
    }
  });
  var engPilOk = (j, k) => {
    var conc = !!(j && (j.concluida || j.ppuCons));
    var linhas = ['ppuNeeds', 'chems', 'casingNeeds', 'peopleNeeds', 'equipNeeds'].reduce((a, kk) => a.concat(Array.isArray(j[kk]) ? j[kk] : []), []);
    var rr = Math.max(0, Math.min(100, Number(j.riscoRec) || 0));
    if (k === 'prev') return !conc;
    if (k === 'conc') return conc;
    if (k === 'atras') return !conc && String(pjEnd(j) || j.date || '') < todayStr();
    if (k === 'cont') return !!j.contingencia || linhas.some(n => n && n.cont);
    if (k === 'risco') return rr > 0 || linhas.some(n => n && n.cont && n.chance != null && n.chance !== '' && Number(n.chance) < 100);
    if (k === 'fora') return rr >= 100;
    if (k === 'hoS') return !!(j.handoverId || j.hoEmailEm);
    if (k === 'hoN') return !(j.handoverId || j.hoEmailEm);
    return true;
  };
  var engPilFiltra = (j, sel) => [['prev', 'conc', 'atras'], ['cont', 'risco', 'fora'], ['hoS', 'hoN']].every(g => {
    var s = g.filter(k => sel.includes(k));
    return !s.length || s.some(k => engPilOk(j, k));
  });""")
rep("""    if (planF.status) l = l.filter(j => (j.status || PJ_STATUS.PLAN) === planF.status);
    return l;
  }, [planJobs, planF]);""", """    if (planF.status) l = l.filter(j => (j.status || PJ_STATUS.PLAN) === planF.status);
    if (engPil.length) l = l.filter(j => engPilFiltra(j, engPil)); // e17: pílulas
    return l;
  }, [planJobs, planF, engPil]);""")
rep("planView === 'gantt' && renderPlanGantt(), planView === 'cal' && renderPlanCal(),", "engRenderPilulas(), planView === 'gantt' && renderPlanGantt(), planView === 'cal' && renderPlanCal(),")
# janela da operação: receita e COGS ao vivo (com a contingência e o risco), entre o formulário e os botões
rep(r"""    }, "\u25A4 Opera\xE7\xE3o completa"))), React.createElement("div", {
      className: "eng-mf"
    }""", r"""    }, "\u25A4 Opera\xE7\xE3o completa"))), !tplMode && engResumoOp(d), React.createElement("div", {
      className: "eng-mf"
    }""")
# duplicar: só a operação ou o poço inteiro
rep("""      onClick: () => {
        duplicatePlanned(d);
      }""", """      onClick: () => engDuplicar(d)""")
rep("onClick: () => duplicatePlanned(j)", "onClick: () => engDuplicar(j)")
rep("renderEngConc(), renderEngCorPop(),", "renderEngConc(), renderEngDup(), renderEngCorPop(),")
# tipo de operação "Perfuração" (antes de "Outros")
rep("""}, {
  op: 'Outros',
  casing: false,
  vida: 'optional',
  outros: true
}];""", """}, {
  op: 'Perfuração',
  casing: false,
  vida: 'optional'
}, {
  op: 'Outros',
  casing: false,
  vida: 'optional',
  outros: true
}];""")
rep("""var DUR_BY_TIPO = {
  'Cimentação primária': 3
};""", """var DUR_BY_TIPO = {
  'Cimentação primária': 3,
  'Perfuração': 3
};""")
rep("""var HORIZON_DAYS = {
  'Cimentação primária': 180
};""", """var HORIZON_DAYS = {
  'Cimentação primária': 180,
  'Perfuração': 180
};""")
_i = s.find("  'Top-job': 'Top-job',\n")
_j = s.find("  'Top-job': 'Top-job',\n", _i + 1)
assert _i > 0 and _j > _i and s.find("  'Top-job': 'Top-job',\n", _j + 1) < 0, 'Top-job nas traduções'
s = s[:_j] + "  'Perfuração': 'Perforación',\n" + s[_j:]
s = s[:_i] + "  'Perfuração': 'Drilling',\n" + s[_i:]

# e18 (pedido do Hugo, 26/11/2026): operação nova com data passada; a janela da operação só fecha pelos botões
rep("""    var ok = tplMode ? !!d.tipoOp : !!((d.rigId || ehDisp) && d.tipoOp && d.date && (!d.salesOrder || soValida(d.salesOrder)) && !(!d.id && d.date < todayStr()) && """,
    """    var ok = tplMode ? !!d.tipoOp : !!((d.rigId || ehDisp) && d.tipoOp && d.date && (!d.salesOrder || soValida(d.salesOrder)) && """)
rep("""      className: 'ipt' + (dataRetro ? ' ipt-err-hal' : ''),
      type: "date",
      min: !d.id ? todayStr() : undefined,""", """      className: 'ipt',
      type: "date",""")
rep(r"""    }), dataRetro && React.createElement("div", {
      className: "fld-err"
    }, "Data retroativa: a opera\xE7\xE3o nova come\xE7a hoje ou depois."))), React.createElement("div", {""", r"""    }), dataRetro && React.createElement("div", {
      className: "fld-hint eng-retro"
    }, "Data no passado: se a opera\xE7\xE3o j\xE1 aconteceu, depois de salvar use “✓ Concluir opera\xE7\xE3o”."))), React.createElement("div", {""")
rep("""      onClick: e => {
        if (e.target.className === 'overlay') setPlanDraft(null);
      }""", """      onClick: e => {} // e18: a janela da operação só fecha pelos botões""")

# e19 (pedido do Hugo, 27/11/2026): eng_e19.js — exportar escolhendo os contratos (nome EARL_FORECAST_…); calendário com
# o tipo da operação e a janela do dia (só as operações daquele dia); cor da sonda na barra com a faixa da legenda embaixo;
# tipo "Entrega de Cimento/Blend". As janelas mudam de tamanho (eng_redim.js, no fim do <body>).
rep("renderEngDup(), renderEngCorPop(),", "renderEngDup(), renderEngExpSel(), renderEngDia(), renderEngCorPop(),")
rep("""      onClick: () => setDiaPanel(d),
      title: "Abrir o dia completo",""", """      onClick: () => setEngDia(d),
      title: "Ver as operações deste dia (clique numa para editar)",""")
rep(""" j.well || j.tipoOp, engRcCal(j)), mj && React.createElement("span", {""", """ j.well || j.tipoOp, engCalTipo(j), engRcCal(j)), mj && React.createElement("span", {""")
rep("""          background: (PJ_GANTT_COR[pjCor(j)] || PJ_GANTT_COR.criada).c,
          display: 'flex',""", """          background: (PJ_GANTT_COR[pjCor(j)] || PJ_GANTT_COR.criada).c,
          ...engBarraCor(j, PJ_GANTT_COR[pjCor(j)] || PJ_GANTT_COR.criada, 3),
          display: 'flex',""")
rep("""          background: cor.c,
          touchAction: 'pan-y',""", """          background: cor.c,
          ...engBarraCor(j, cor, 5),
          touchAction: 'pan-y',""")
rep("""            background: cor.c,
            display: 'flex',
            alignItems: 'center',
            padding: '0 5px',""", """            background: cor.c,
            ...engBarraCor(j, cor, 4),
            display: 'flex',
            alignItems: 'center',
            padding: '0 5px',""")
rep("color: cor.t,", "color: engBarraTxt(j, cor),", 3)
rep("""as vinculadas acompanham")), React.createElement("div", {
      className: "gantt-wrap\"""", """as vinculadas acompanham"), engLgdSonda()), React.createElement("div", {
      className: "gantt-wrap\"""")
# tipo "Entrega de Cimento/Blend" (com a Perfuração, antes de "Outros")
rep("""}, {
  op: 'Perfuração',
  casing: false,
  vida: 'optional'
}, {""", """}, {
  op: 'Perfuração',
  casing: false,
  vida: 'optional'
}, {
  op: 'Entrega de Cimento/Blend',
  casing: false,
  vida: 'optional'
}, {""")
rep("  'Perfuração': 'Drilling',\n  'Top-job': 'Top-job',\n", "  'Perfuração': 'Drilling',\n  'Entrega de Cimento/Blend': 'Cement/Blend delivery',\n  'Top-job': 'Top-job',\n")
rep("  'Perfuração': 'Perforación',\n  'Top-job': 'Top-job',\n", "  'Perfuração': 'Perforación',\n  'Entrega de Cimento/Blend': 'Entrega de Cemento/Blend',\n  'Top-job': 'Top-job',\n")

# e12: filtro e ordem em todas as tabelas (script avulso, fora do React), no fim do <body>
tf = open(os.path.join(AQUI, 'eng_tabelas.js'), encoding='utf-8').read()
assert '</script' not in tf.lower()
i = s.rfind('</body>')
assert i > 0 and s[i:].strip() == '</body>\n</html>'.strip() or s[i:].replace('\n', '').strip() == '</body></html>', repr(s[i:i + 40])
s = s[:i] + '<script>\n' + tf + '</script>\n' + s[i:]
# e19: as janelas mudam de tamanho puxando qualquer borda ou canto (script avulso); o Gerencial tem uma cópia igual
rz = open(os.path.join(AQUI, 'eng_redim.js'), encoding='utf-8').read()
assert '</script' not in rz.lower()
_g = open(os.path.join(AQUI, '..', 'gerencial', 'gerencial.html'), encoding='utf-8').read()
_gi = _g.find('*/\n', _g.find('/* EARL_REDIM_INICIO')) + 3
assert _g.find('/* EARL_REDIM_INICIO') > 0 and _g[_gi:_g.find('/* EARL_REDIM_FIM */')] == rz, 'a cópia do eng_redim.js no gerencial.html está diferente'
i = s.rfind('</body>')
s = s[:i] + '<script>\n' + rz + '</script>\n' + s[i:]

open(OUT, 'w', encoding='utf-8').write(s)
print('ok →', OUT, '(%.1f MB)' % (len(s.encode('utf-8')) / 1e6))
