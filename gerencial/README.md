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

- **Filtros:** período do serviço, cliente, contrato, região e tipo de contrato.
- **Indicadores:** receita em R$ e em US$, operações com consumo, homem-dia e lançamentos sem valor.
- **Contratos:** receita por contrato, com o engenheiro e a data do arquivo, as operações e o uso do contrato em valor. Clique no contrato para filtrar.
- **Receita:** por mês, por cliente e por região.
- **Itens PPU:** contratado, consumido, saldo, % usado, consumido no período, receita e valor vigente, por contrato e item.
- **Químicas** e **Casing equipment:** previsto × lançado por SAP, com o número de operações e os contratos.
- **Pessoal:** por função, pessoas e homem-dia previsto × lançado.
- **Operações:** todas as operações, com situação (planejada, handover enviado, consumo lançado), receita e o que foi lançado; tem busca.
- **Arquivos:** os arquivos carregados e se estão em uso.
- **⬇ Excel consolidado:** abas Contratos, Receita por mês, Itens PPU, Químicas, Casing, Pessoal, Operações e Lançamentos (cada linha lançada).

## Regras de cálculo

- **Receita:** a quantidade lançada × o valor do item vigente na **data do serviço**, com os reajustes. O app de Engenharia calcula e grava no arquivo; o Gerencial soma. Se um reajuste mudar valores já lançados, o engenheiro gera um arquivo novo.
- **Saldo do item:** contratado (com aditivos) − tudo o que foi lançado no contrato (sem filtro de data).
- **Previsto:** o que a engenharia planejou nas operações com data no período. **Lançado:** o consumo informado pelo engenheiro com data do serviço no período.
- **Homem-dia:** pessoas × dias, informado no consumo da operação. No previsto, é pessoas × duração da operação.
- **Moedas:** R$ e US$ são valores do contrato, sem conversão entre eles.

## Para quem mexe no código

- `gerencial.html` é o app: HTML, CSS e JavaScript puro, sem React. `build_gerencial.py` gera o `EARL_Gerencial.html`, embutindo as bibliotecas (xlsx 0.18.5 e jszip 3.10.1) e os logos do EARL:

  ```bash
  python3 build_gerencial.py EARL_HAL_CMT_115_SIMULACAO.html EARL_Gerencial.html <pasta node_modules>
  ```

- **Formato do arquivo** (gerado por `engPacoteGerencial`, em `engenharia/eng_contratos.js`):
  - envelope `{tipo: 'EARL-Gerencial', formato: 1, app, geradoEm, por, contratos[], operacoes[]}`;
  - `contratos[]`: `{id, nome, numero, cliente, tipo, bases, regiao, inicio, atualizadoEm, itens[{ref, desc, unit, contratado, brl, usd, brlIni, usdIni}], reajustes[{desde, obs, itens}]}`;
  - `operacoes[]`: `{id, contratoId, sonda, base, ambiente, regiao, poco, tipo, revestimento, data, duracao, status, so, wbs, vida, contingencia, risco, handover, previsto, realizado, receita}`;
  - `previsto` e `realizado` trazem `ppu`, `quimicas`, `casing` e `pessoal`. O `previsto` traz também `equipamentos`; o `realizado` traz `data` e o PPU com os valores.
- Os dados ficam em `localStorage` com o prefixo `earlger:`.
- **Teste de ponta a ponta:** dois engenheiros geram arquivos no app de Engenharia, e o Gerencial carrega por arquivos, `.zip` e pasta (30 verificações):

  ```bash
  node tests/e2e_gerencial.js ../engenharia/EARL_Engenharia.html EARL_Gerencial.html [pasta-das-telas]
  ```

- Versão: `EARL Gerencial g1`.
