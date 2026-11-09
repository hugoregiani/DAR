# Contratos reais: um EARL Engenharia pré-carregado por planilha

Pedido do Hugo (09/11/2026): "recrie um HTML para cada arquivo em anexo, como já fiz o teste da BP … os arquivos HTML
venham carregados com as informações para que eu compartilhe com outros usuários".

Cada planilha (PA, DC, CE, BW, BDII, Shell) vira um `EARL_Engenharia_<NOME>.html`: o mesmo `EARL_Engenharia.html`, com
o banco já montado a partir das abas **Forecast** e **Banco de dados contratos**. As planilhas e os HTML gerados têm
dados reais de contrato e **não ficam no repositório**: só os scripts.

## Como gerar

```bash
cd engenharia
node contratos_reais/gerar_html.js <pasta>/PA.xlsx PA EARL_Engenharia.html <saída>/EARL_Engenharia_PA.html <saída>/rel_PA.json
```

O nome (PA, DC…) vira o prefixo do armazenamento do navegador (`earlengpa:`), a etiqueta no canto e o sufixo da
versão (`EARL Engenharia e9 (base v115) · PA`). O relatório `.json` traz os contratos, as sondas criadas, os ajustes e
a conferência de receita/COGS de cada operação.

Teste de ponta a ponta (abre cada HTML como o usuário abre):

```bash
node contratos_reais/e2e_contratos_reais.js <pasta das planilhas> <pasta dos HTML> [PA DC …] [--telas <pasta>]
```

## Os dois formatos de planilha (`leitor_planilhas.js`)

| | por colunas (PA, BW, BDII, Shell — como o BP) | por linhas (CE, DC) |
|---|---|---|
| Forecast | rótulos na coluna F, uma operação por coluna (G em diante); seções de itens PPU, químicos, casing e time de embarque | uma linha por item cobrado: cliente, contrato, status, risco, item, quantidade, preço, sonda, poço, operação, data, receita/COGS e valores manuais |
| Contratos no arquivo | um | vários (coluna "Contrato") |
| Banco de dados contratos | linha "Data:" com a data de cada bloco de 6 colunas (Ano 1, Ano 2, RENECOM…); preço do bloco = Receita CMT (US$) ou US$ × Rev. Share | preço inicial (US$, Receita CMT ou R$ ÷ câmbio) e "Data reajuste / Índice / Valor reajustado" (índice acumulado) |
| Operação no EARL | cada coluna | as linhas do mesmo contrato, sonda, poço, data, situação, risco e SO |

Regras:
- **Contratos:** só os que têm operação no Forecast. Os que só estão no Banco ficam de fora e aparecem nos avisos
  (Tenaris DS no CE, Baker DS no DC — os dois têm operações no outro arquivo). Contrato que já existe no EARL é
  reaproveitado pelo número ou pelo nome (P&A, Carolina, Deepwater Aquila, DS-04, ODN-I, Takatsugu J, Tidal Action),
  mantendo o número do EARL (o app recria a semente pelo número). Os demais contratos do EARL ficam **arquivados**.
- **Preços e reajustes:** o preço inicial e cada ano/reajuste do Banco viram os reajustes do contrato no EARL, com a
  data. Item que só está no Forecast entra com o preço do Forecast (aviso no relatório). Tipo do contrato: por colunas
  = serviço; por linhas = venda direta (DS), spot (SPOT), drilling contractor ou serviço, pelo tipo de receita.
- **Receita e COGS iguais aos da planilha:** o app calcula quantidade × preço do contrato na data. Quando a RECEITA
  FINAL / COGS FINAL da planilha (antes do risco) é diferente — câmbio do mês já faturado (PA e BDII de jan a set/2026),
  item não cobrado, crédito de NPT, valor manual, reajuste previsto (BDII mai/2027), venda com COGS informado (CE) —, a
  diferença entra na operação como **ajuste**:
  - receita: itens PPU `AJ+` (US$ 1) e `AJ−` (US$ −1) do contrato, com a quantidade = valor da diferença;
  - COGS: `AJ-QUIM+`/`AJ-QUIM−` (químicos) e `AJ-CE+`/`AJ-CE−` (casing equipment) em Custos (COGS), US$ ±1.
  - Concluída: o ajuste vai no consumo lançado; prevista: no planejado. O Painel de Compras ignora os `AJ-` (SAP não
    numérico).
- **Situação e risco:** "Concluído" = consumo lançado igual ao previsto (+ ajuste), com a data da operação; "Previsto" =
  só planejado. Risco 0–1 → "Risco da receita / COGS" 0–100%. Contingência "Sim" → contingência.
- **Sondas:** pelo nome ou pelo código Petrobras (DS-04 = DS-4/NS-54; KG2 = Dhirubhai Deepwater KG2; West Carina_24 →
  West Carina, que ganha o NS-48). Sonda que não existe é criada (NS-51, NS-57 no PA; V247 no BW). Sem sonda: vendas do
  CE, Câmbio/COPQ, Mero 4, Perenco, Tenaris DS e a "Frente" do PA; "Commander NS-40" (Drill Quip) usa a NS-40.
- **Tipo de operação:** pela descrição (LWO, HWO, PWC, Abandono, Squeeze, Top-job, Disponibilidade, Cimentação
  primária + revestimento); o resto vai para "Outros" com a descrição (até 20 letras).
- **Químicos e casing:** a tabela "SAP | Químicos" vira o banco de produtos químicos e "SAP | Casing" vira Custos
  (COGS), como no teste BP. Pessoal: linhas "Função:" do time de embarque.

## Resultado (09/11/2026)

| Arquivo | Contratos | Operações | Receita (= planilha) | COGS (= planilha) |
|---|---|---|---|---|
| PA | 1 (P&A) | 105 (83 concluídas) | US$ 7.646.930,14 | US$ 328.640,15 |
| DC | 23 | 218 (174 concluídas), de 437 linhas | US$ 28.248.137,63 | US$ 0,00 |
| CE | 5 | 15 (14 concluídas), de 32 linhas | US$ 959.688,51 | US$ 434.571,41 |
| BW | 1 (Maromba) | 18 | US$ 1.578.360,62 | US$ 437.335,88 |
| BDII | 1 (BD II) | 148 (68 concluídas) | US$ 14.951.595,10 | US$ 2.975.329,80 |
| Shell | 1 (BJSA) | 12 | US$ 79.401.083,86 | US$ 159.392,61 |
