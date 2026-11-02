#!/usr/bin/env python3
"""Monta o EARL_Gerencial.html (offline, arquivo único).

Uso:
  python3 build_gerencial.py EARL_HAL_CMT_115_SIMULACAO.html EARL_Gerencial.html <pasta node_modules>

- gerencial.html (nesta pasta) é o app; aqui só entram as bibliotecas e os logos.
- Bibliotecas embutidas: xlsx@0.18.5 (Excel) e jszip@3.10.1 (ler o .zip baixado do SharePoint).
- Logos (Halliburton e EARL, brancos) são os mesmos do EARL, lidos do HTML de origem.
"""
import os
import re
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
SRC, OUT, NM = sys.argv[1], sys.argv[2], sys.argv[3]
earl = open(SRC, encoding='utf-8').read()
logo = lambda nome: re.search(r"\nvar " + nome + r" = '(data:image/[^']+)';", earl).group(1)

s = open(os.path.join(AQUI, 'gerencial.html'), encoding='utf-8').read()
for marca, arq in [('/*__LIB_XLSX__*/', 'xlsx/dist/xlsx.full.min.js'), ('/*__LIB_JSZIP__*/', 'jszip/dist/jszip.min.js')]:
    js = open(os.path.join(NM, arq), encoding='utf-8').read()
    assert '</script' not in js.lower(), arq
    js = js.replace('/<!--', '/<\\!--')  # regex do xlsx (sem flag u): "\!" é o mesmo "!"
    assert '<!--' not in js, arq
    assert s.count(marca) == 1, marca
    s = s.replace(marca, '/* ' + arq + ' (embutido) */\n' + js)
for marca, nome in [('__LOGO_HAL__', 'LOGO'), ('__LOGO_EARL__', 'LOGO_CT')]:
    assert s.count(marca) == 1, marca
    s = s.replace(marca, logo(nome))
open(OUT, 'w', encoding='utf-8').write(s)
print('ok →', OUT, '(%.2f MB)' % (len(s.encode('utf-8')) / 1e6))
