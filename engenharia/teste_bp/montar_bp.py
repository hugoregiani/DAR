#!/usr/bin/env python3
"""Monta o EARL_Engenharia_BP_teste.html: o mesmo EARL_Engenharia.html, com os dados do teste BP embutidos.

Uso: python3 teste_bp/montar_bp.py <EARL_Engenharia.html> <seed_db.json> <EARL_Engenharia_BP_teste.html>

- armazenamento próprio (prefixo "earlengbp:"), separado do EARL_Engenharia.html normal;
- o app começa com o banco do teste BP (gerado pelo gerar_seed_bp.js a partir da planilha). O banco guardado
  no navegador só é usado se for desta mesma versão; sem espaço no navegador, o app usa os dados embutidos
  (e a etiqueta avisa que as alterações não ficam salvas);
- etiqueta "TESTE BP" no canto, com o botão "Reiniciar" para voltar aos dados da planilha.
"""
import hashlib
import json
import sys

ENG, SEED, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
s = open(ENG, encoding='utf-8').read()
seed = open(SEED, encoding='utf-8').read()
_obj = json.loads(seed)  # tem de ser JSON válido
# marca desta versão dos dados: o app só usa o que está guardado no navegador se for desta mesma versão
BPID = 'bp-' + hashlib.sha1(seed.encode('utf-8')).hexdigest()[:12]
_obj['testeBP'] = BPID
seed = json.dumps(_obj, ensure_ascii=False, separators=(',', ':'))


def rep(old, new, n=1):
    global s
    c = s.count(old)
    if c != n:
        raise SystemExit('ERRO: esperava %d ocorrência(s), achei %d: %r' % (n, c, old[:120]))
    s = s.replace(old, new)


# string JS segura dentro de <script>: ASCII puro, sem "</" nem "<!--"
lit = json.dumps(seed, ensure_ascii=True).replace('</', '<\\/').replace('<!--', '<\\!--')
assert '</script' not in lit.lower() and '<!--' not in lit

rep("var P='earleng:';", "var P='earlengbp:';")
_i = s.index("  window.EARL_ENG_AVULSO=true;\n")
_j = s.index("})();\n</script>", _i) + len("})();\n</script>")
_ini = s[_i:_j - len("})();\n</script>")]
rep(s[_i:_j], _ini + r"""  /* TESTE BP: banco com os dados da planilha Contrato_BP_Teste_EARL.xlsx. Se o navegador não tiver esta versão
     guardada, grava; se não houver espaço (ou o navegador não deixar), o app usa os dados embutidos mesmo assim. */
  var SEED=__SEED__;var BPID='__BPID__';
  window.EARL_TESTE_BP=true;window.EARL_BP_SEED=SEED;window.EARL_BP_ID=BPID;window.EARL_BP_SEM_ESPACO=false;
  function gravar(){
    var ks=[];for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&k.indexOf(P)===0)ks.push(k);}
    ks.forEach(function(k){R.call(localStorage,k);});
    S.call(localStorage,P+'hal_cmt_db_v1',typeof Z==='function'?Z(SEED):SEED);S.call(localStorage,P+'earl_bp_id',BPID);
  }
  var precisa=true;try{precisa=G.call(localStorage,P+'earl_bp_id')!==BPID||!G.call(localStorage,P+'hal_cmt_db_v1');}catch(e){}
  if(precisa){try{gravar();}catch(e){window.EARL_BP_SEM_ESPACO=true;}}
  window.earlBpReiniciar=function(){
    if(!confirm('Voltar aos dados da planilha do teste BP?\n\nTudo o que foi lançado neste arquivo, neste computador, será apagado.'))return;
    try{gravar();}catch(e){}
    location.reload();
  };
  document.addEventListener('DOMContentLoaded',function(){
    var t=document.createElement('div');t.className='earl-bp-tag'+(window.EARL_BP_SEM_ESPACO?' sem':'');
    t.innerHTML='<b>TESTE BP</b><span>'+(window.EARL_BP_SEM_ESPACO?'⚠ este navegador não está salvando: o teste abre, mas as alterações não ficam salvas':'dados da planilha Contrato_BP_Teste_EARL')+'</span><button type="button">Reiniciar</button>';
    t.querySelector('button').onclick=window.earlBpReiniciar;
    document.body.appendChild(t);
  });
})();
</script>
<style>
.earl-bp-tag{position:fixed;left:12px;bottom:12px;z-index:9000;display:flex;align-items:center;gap:10px;background:#5B2A86;color:#fff;border-radius:999px;padding:5px 6px 5px 14px;font:500 12px/1.2 Roboto,system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.18)}
.earl-bp-tag b{font-weight:700;letter-spacing:.06em}
.earl-bp-tag span{opacity:.85}
.earl-bp-tag button{background:#fff;color:#5B2A86;border:0;border-radius:999px;padding:4px 11px;font:600 12px Roboto,system-ui,sans-serif;cursor:pointer}
@media(max-width:700px){.earl-bp-tag span{display:none}}
.earl-bp-tag.sem{background:#8A3B1B}
</style>""".replace('__SEED__', lit).replace('__BPID__', BPID))
rep('<title>EARL — Engenharia</title>', '<title>EARL — Engenharia (TESTE BP)</title>')
# loadDB: só usa o banco guardado se for desta versão do teste; senão (ou sem espaço), os dados embutidos
rep("      if (d.people && d.people.length > 0) return engQuimMig(migrateDB(d));", "      if (d.people && d.people.length > 0 && d.testeBP === window.EARL_BP_ID) return engQuimMig(migrateDB(d));")
rep("  return engQuimMig(migrateDB(JSON.parse(JSON.stringify(SEED_DB))));", "  return engQuimMig(migrateDB(JSON.parse(window.EARL_BP_SEED)));")
import re
m = re.findall(r"var EARL_VERSION = '([^']*)';", s)
assert len(m) == 1, 'EARL_VERSION'
rep("var EARL_VERSION = '%s';" % m[0], "var EARL_VERSION = '%s · teste BP';" % m[0])

open(OUT, 'w', encoding='utf-8').write(s)
print('ok →', OUT, '(%.1f MB)' % (len(s.encode('utf-8')) / 1e6))
