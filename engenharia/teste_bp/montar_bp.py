#!/usr/bin/env python3
"""Monta o EARL_Engenharia_BP_teste.html: o mesmo EARL_Engenharia.html, com os dados do teste BP embutidos.

Uso: python3 teste_bp/montar_bp.py <EARL_Engenharia.html> <seed_db.json> <EARL_Engenharia_BP_teste.html>

- armazenamento próprio (prefixo "earlengbp:"), separado do EARL_Engenharia.html normal;
- na primeira abertura (ou quando não há dados), o app começa com o banco do teste BP
  (gerado pelo gerar_seed_bp.js a partir da planilha);
- etiqueta "TESTE BP" no canto, com o botão "Reiniciar" para voltar aos dados da planilha.
"""
import json
import sys

ENG, SEED, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
s = open(ENG, encoding='utf-8').read()
seed = open(SEED, encoding='utf-8').read()
json.loads(seed)  # tem de ser JSON válido


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
rep("  window.EARL_ENG_AVULSO=true;\n})();\n</script>", r"""  window.EARL_ENG_AVULSO=true;
  /* TESTE BP: banco inicial com os dados da planilha Contrato_BP_Teste_EARL.xlsx */
  var SEED=__SEED__;
  var semDados=false;try{semDados=!G.call(localStorage,P+'hal_cmt_db_v1');}catch(e){}
  if(semDados){try{S.call(localStorage,P+'hal_cmt_db_v1',SEED);}catch(e){}}
  window.EARL_TESTE_BP=true;
  window.earlBpReiniciar=function(){
    if(!confirm('Voltar aos dados da planilha do teste BP?\n\nTudo o que foi lançado neste arquivo, neste computador, será apagado.'))return;
    var ks=[];for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&k.indexOf(P)===0)ks.push(k);}
    ks.forEach(function(k){R.call(localStorage,k);});
    S.call(localStorage,P+'hal_cmt_db_v1',SEED);
    location.reload();
  };
  document.addEventListener('DOMContentLoaded',function(){
    var t=document.createElement('div');t.className='earl-bp-tag';
    t.innerHTML='<b>TESTE BP</b><span>dados da planilha Contrato_BP_Teste_EARL</span><button type="button">Reiniciar</button>';
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
</style>""".replace('__SEED__', lit))
rep('<title>EARL — Engenharia</title>', '<title>EARL — Engenharia (TESTE BP)</title>')
import re
m = re.findall(r"var EARL_VERSION = '([^']*)';", s)
assert len(m) == 1, 'EARL_VERSION'
rep("var EARL_VERSION = '%s';" % m[0], "var EARL_VERSION = '%s · teste BP';" % m[0])

open(OUT, 'w', encoding='utf-8').write(s)
print('ok →', OUT, '(%.1f MB)' % (len(s.encode('utf-8')) / 1e6))
