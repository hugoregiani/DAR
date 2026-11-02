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
  SP.getItem=function(k){return G.call(this,P+k);};
  SP.setItem=function(k,v){return S.call(this,P+k,v);};
  SP.removeItem=function(k){return R.call(this,P+k);};
  try{var IO=IDBFactory.prototype.open;IDBFactory.prototype.open=function(n,v){return v===undefined?IO.call(this,P+n):IO.call(this,P+n,v);};}catch(e){}
  window.EARL_ENG_AVULSO=true;
})();
</script>'''
s = s[:a] + ARMAZ + s[b:]
assert 'earl-sim-dados' not in s and 'earlsim115' not in s

rep('<title>EARL — Halliburton Cementing — SIMULAÇÃO</title>', '<title>EARL — Engenharia</title>')

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
rep("var EARL_VERSION = 'EARL v115';", "var EARL_VERSION = 'EARL Engenharia e2 (base v115)';")
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
    }, "Engenharia")), mainTab === 'mob' ''')
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
        className: "eng-cont-pill"''', '''pjBadge(j.status), hoEmailTag(j), engConsTag(j), j.contingencia && React.createElement("div", {
        className: "eng-cont-pill"''')
rep('''        onClick: () => abrirHandover(j)
      }, "Handover \\u2192")));''', '''        onClick: () => abrirHandover(j)
      }, handoverDoJob(j) ? '\\u2709 Handover v' + (handoverDoJob(j).versao || 1) + ' \\u2192' : "Handover \\u2192")));''')

# Texto do cadastro de sondas (aqui não há o app Sondas)
rep(r'Toda sonda ganha a sua p\xE1gina no app Sondas, com o invent\xE1rio a bordo (DAR), servi\xE7os, pessoas e hist\xF3rico."',
    r'As sondas cadastradas aqui aparecem no campo Sonda das opera\xE7\xF5es da Engenharia."')

# Contratos: aba "Consumo e receita", consumo de PPU na operação e na Lista
rep("[['gantt', 'Gantt'], ['cal', 'Calendário'], ['list', 'Lista'], ['ho', 'Handovers']]",
    "[['gantt', 'Gantt'], ['cal', 'Calendário'], ['list', 'Lista'], ['ho', 'Handovers'], ['rec', 'Consumo e receita']]")
rep("planView === 'ho' && renderPlanHandovers()));", "planView === 'ho' && renderPlanHandovers(), planView === 'rec' && renderEngReceita()));")
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

# Código novo (antes de renderHandover) e janelas novas na árvore
novo = open(os.path.join(AQUI, 'eng_app.js'), encoding='utf-8').read() + '\n' + open(os.path.join(AQUI, 'eng_contratos.js'), encoding='utf-8').read()
rep("  var renderHandover = () => {\n", novo.rstrip('\n') + "\n  var renderHandover = () => {\n")
rep("renderRigForm(), renderConfirmBox(),", "renderEngSondas(), renderEngContratos(), renderEngCons(), renderRigForm(), renderConfirmBox(),")

open(OUT, 'w', encoding='utf-8').write(s)
print('ok →', OUT, '(%.1f MB)' % (len(s.encode('utf-8')) / 1e6))
