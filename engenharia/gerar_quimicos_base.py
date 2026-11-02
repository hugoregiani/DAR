#!/usr/bin/env python3
"""Gera o quimicos_base.json (banco inicial de produtos químicos da Engenharia) a partir da tabela
"Químicos" da aba Forecast da planilha (colunas SAP, Químicos, UOM e COGS).

Uso: python3 gerar_quimicos_base.py <Contrato_BP_Teste_EARL.xlsx> quimicos_base.json

O patch_engenharia.py embute este arquivo no EARL_Engenharia.html. Ele entra uma vez em cada computador
(quando o banco ainda não tem produtos químicos). Depois disso, a atualização é pela planilha, dentro do app
(botão "Químicos" → "⬆ Atualizar pela planilha").
"""
import datetime
import json
import os
import sys

import openpyxl

ARQ, SAIDA = sys.argv[1], sys.argv[2]
wb = openpyxl.load_workbook(ARQ, data_only=True)
ws = wb['Forecast']
rows = list(ws.iter_rows(values_only=True))
txt = lambda v: '' if v is None else str(v).strip()
ini = next(i for i, r in enumerate(rows) if txt(r[0]) == 'SAP' and txt(r[1]).lower().startswith('qu'))
fim = next(i for i, r in enumerate(rows) if i > ini and txt(r[0]) == 'SAP')
itens = []
for r in rows[ini + 1:fim]:
    sap = r[0]
    if sap is None and r[1] is None:
        continue
    if isinstance(sap, float) and sap.is_integer():
        sap = int(sap)
    usd = r[5]
    itens.append({'sap': txt(sap), 'nome': txt(r[1]), 'unid': txt(r[4]), 'usd': usd if isinstance(usd, (int, float)) else None})
saps = [i['sap'] for i in itens]
assert len(saps) == len(set(saps)), 'SAP repetido na tabela de químicos'
base = {
    'origem': os.path.basename(ARQ) + ' — aba Forecast, tabela Químicos (SAP, Químicos, UOM, COGS)',
    'geradoEm': datetime.date.today().isoformat() + 'T12:00:00.000Z',
    'itens': itens,
}
json.dump(base, open(SAIDA, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('ok →', SAIDA, len(itens), 'produtos')
