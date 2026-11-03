# EARL — Gerencial

App de gestão que junta os arquivos dos engenheiros e mostra o consolidado de **todos os contratos**: receita em R$ e US$, consumo de itens PPU (com saldo), químicas, casing equipment e pessoal. É um arquivo só (`EARL_Gerencial.html`), funciona **sem internet** e abre com dois cliques no Chrome ou no Edge.

## Como funciona

1. Cada engenheiro trabalha no **EARL Engenharia** (`../engenharia/EARL_Engenharia.html`) com os contratos dele:
   - cadastra os valores e os reajustes;
   - planeja as operações;
   - depois do serviço, lança o **Σ Consumo** da operação: itens PPU, químicas, casing equipment e pessoal (pessoas × dias).
2. Quando quiser atualizar o gerencial, o engenheiro clica em **⬇ Arquivo do gerencial**, marca os contratos dele e salva o arquivo `.json` na **pasta do SharePoint do gerencial**.
3. No **EARL Gerencial**, carregue os arquivos de um destes jeitos:
   - **📁 Carregar pasta:** a pasta do SharePoint sincronizada no computador (OneDrive → "Sincronizar"/"Adicionar atalho a Meus arquivos");
   - **⬆ Carregar arquivos:** escolha vários `.json` de uma vez ou o **.zip** que o SharePoint baixa quando se clica em "Baixar" numa pasta;
   - **arrastar** os arquivos ou a pasta para a página.
4. Para cada contrato vale o **arquivo mais novo**. Os anteriores aparecem como "substituído" na aba Arquivos. Arquivos que não são do gerencial (por exemplo, a exportação completa de dados) são ignorados, com aviso.
5. Os arquivos ficam guardados neste navegador. Quando houver arquivos novos na pasta, carregue de novo: o que já estava carregado não duplica.

## O que mostra

Tudo é **realizado + previsto**, com o risco de cada operação aplicado:
- **Realizado:** operações com consumo lançado.
- **Previsto:** operações ainda sem consumo, pelo que a engenharia planejou.

- **Filtros:** período por **mês** (mês de / até o mês, sem o dia), cliente, contrato, região e tipo de contrato.
- **Indicadores (só US$):** receita (realizado · previsto), COGS, operações (realizadas, previstas e "fora", com risco 100%), receita por operação (sem as de risco 100%), margem e homem-dia lançado e previsto a realizar.
- **Contratos:** receita, COGS e margem por contrato, com o engenheiro e a data do arquivo, as operações e o uso do contrato em valor. Clique no contrato para filtrar.
- **Receita e margem** (aba inicial): **uma tabela só, com drill-down**.
  - **Níveis:** o padrão é **Mês › Cliente › Sonda › Operações › Itens PPU**. Em "Abrir por" dá para trocar cada nível, tirar (×) ou acrescentar (**＋ nível**). As opções são mês, ano, cliente, contrato, região, tipo de contrato, sonda, poço, tipo de operação e situação. A escolha fica guardada.
  - **Abrir e fechar:** clique numa linha para abrir o próximo nível. Depois do último nível aparecem as operações, com data, poço, tipo, sonda, contrato, SO e situação. Clicando na operação, aparecem os **itens PPU** dela: item, descrição, quantidade × valor unitário e receita em US$ (com o risco da operação; "bruto" quando há risco), e o % da operação. **Mostrar até** abre tudo até o nível escolhido de uma vez, inclusive até os itens PPU.
  - **Colunas, só em US$:** operações (realizadas, previstas, fora), receita (realizado · previsto), COGS, margem e receita por operação (sem as de risco 100%). A linha de total fica no fim.
  - **Gráfico por mês**, em cima da tabela (**Ocultar gráfico** esconde, e a escolha fica guardada):
    - receita realizada e prevista empilhadas, com o COGS ao lado; os meses sem operação aparecem vazios, na ordem;
    - **tendência** da receita total do mês: **linear** (reta dos mínimos quadrados), **média móvel de 3 meses** ou sem tendência. Mês sem operação conta como zero;
    - passando o mouse num mês aparecem os valores, inclusive o da tendência; clicando, o mês abre na tabela;
    - as cores (azul, verde-água e laranja) foram conferidas para daltonismo.
  - **Valores em R$:** saíram desta aba e dos indicadores. Continuam nas abas Contratos, Itens PPU e Operações e no Excel.
- **Itens PPU:** contratado, consumido, saldo, % usado, a realizar, receita e valor vigente, por contrato e item.
- **Químicas** e **Casing equipment:** planejado × lançado por SAP, com o COGS, o número de operações e os contratos.
- **Pessoal:** por função, pessoas e homem-dia planejado × lançado.
- **Operações:** todas as operações, com situação (realizada ou prevista), risco, receita bruta e com risco, COGS e margem. Tem busca.
- **Arquivos:** os arquivos carregados e se estão em uso.
- **⬇ Excel consolidado:** abas Contratos, Por mês, Itens PPU, Químicas, Casing, Pessoal, Operações e Lançamentos (cada linha lançada).

## Regras de cálculo

- **Receita realizada:** a quantidade lançada × o valor do item vigente na **data do serviço**, com os reajustes. O app de Engenharia calcula e grava no arquivo; o Gerencial soma. Se um reajuste mudar valores já lançados, o engenheiro gera um arquivo novo.
- **Receita prevista:** os itens PPU previstos × o valor do contrato na data da operação, só para as operações ainda sem consumo.
- **COGS:** quantidade (lançada, ou prevista se ainda não houver consumo) × COGS unitário do SAP. Na Engenharia, as químicas vêm do banco de **Químicos** e o casing de Contratos → Custos (COGS).
- **Risco da operação (0–100%):** receita e COGS contam × (1 − risco). Com 100%, a operação aparece, mas fica fora da receita e do COGS.
- **Saldo do item:** contratado (com aditivos) − tudo o que foi lançado no contrato (sem filtro de data).
- **Homem-dia:** pessoas × dias, informado no consumo da operação. No previsto, é pessoas × duração da operação.
- **Moedas:** R$ e US$ são valores do contrato, sem conversão entre eles.

## Para quem mexe no código

- `gerencial.html` é o app: HTML, CSS e JavaScript puro, sem React. `build_gerencial.py` gera o `EARL_Gerencial.html`, embutindo as bibliotecas (xlsx 0.18.5 e jszip 3.10.1) e os logos do EARL:

  ```bash
  python3 build_gerencial.py EARL_HAL_CMT_115_SIMULACAO.html EARL_Gerencial.html <pasta node_modules>
  ```

- **Formato do arquivo** (gerado por `engPacoteGerencial`, em `engenharia/eng_contratos.js`):
  - envelope `{tipo: 'EARL-Gerencial', formato: 2, app, geradoEm, por, contratos[], operacoes[]}` (arquivos do formato 1 continuam sendo lidos, valorizados pelo valor vigente do contrato);
  - `contratos[]`: `{id, nome, numero, cliente, tipo, bases, regiao, inicio, atualizadoEm, itens[{ref, desc, unit, contratado, brl, usd, brlIni, usdIni}], reajustes[{desde, obs, itens}]}`;
  - `operacoes[]`: `{id, contratoId, sonda, base, ambiente, regiao, poco, tipo, revestimento, data, duracao, status, so, wbs, vida, contingencia, chanceConting, risco, handover, previsto, realizado, receita}`;
  - `risco` é o risco da receita/COGS (0–100). `chanceConting` é o "Risco de acontecer" da contingência, que não entra no cálculo;
  - `previsto` traz `ppu` (com valor e total), `receita`, `cogs`, `quimicas` e `casing` (com COGS unitário), `pessoal` e `equipamentos`;
  - `realizado` traz `data`, `ppu` com os valores, `quimicas`, `casing`, `cogs` e `pessoal`; `receita` é a receita bruta do realizado.
- Os dados ficam em `localStorage` com o prefixo `earlger:`.
- **Testes de ponta a ponta:**
  - dois engenheiros geram arquivos no app de Engenharia, e o Gerencial carrega por arquivos, `.zip` e pasta. Inclui os indicadores em US$, o drill-down (níveis, abrir/fechar, trocar, tirar e acrescentar nível, guardar a escolha, itens PPU somando a receita da operação), o gráfico por mês (ocultar/mostrar, tooltip) e o filtro por mês (50 verificações);
  - o teste BP (`../engenharia/teste_bp/e2e_bp.js`) confere o Gerencial contra os totais da planilha do BP: receita, COGS, margem, operações fora, cada mês do drill-down e do gráfico, os itens PPU, a tendência linear e a média móvel, o filtro por mês, aba Operações e Excel.

  ```bash
  node tests/e2e_gerencial.js ../engenharia/EARL_Engenharia.html EARL_Gerencial.html [pasta-das-telas]
  ```

- Versão: `EARL Gerencial g5`.
