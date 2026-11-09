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

- **Filtros** (valem para todas as abas e para os indicadores, como os segmentadores do Excel):
  - **Ano:** um ano por vez. Abre no ano de hoje (ou no mais recente, se não houver operação nele). Não tem "Todos".
  - **Quarto (início e fim)** (g14): uma caixa só, como a dos meses. Clicando nela aparecem Q1 (jan–mar), Q2, Q3 e Q4: clique no quarto inicial e depois no final (a ordem não importa), por exemplo Q2 e Q3 = Q2 – Q3 (abr – set). Para um quarto só, clique duas vezes no mesmo (ou um clique e clique fora). "Todos (ano todo)" limpa.
  - **Mês (início e fim):** uma caixa só. Clicando nela aparecem os 12 meses do ano: clique no mês inicial e depois no final (a ordem não importa). Um clique só e clique fora = um mês só. "Ano todo" limpa.
  - **Prévia da seleção** (g14): depois do primeiro clique, passando o cursor sobre os outros meses (ou quartos) aparece destacado o período que vai ficar, antes do segundo clique.
  - **O quarto sobressai ao mês:** com quarto escolhido, vale o quarto, os meses escolhidos são limpos e a caixa do mês fica travada ("vale o quarto").
  - Cliente, contrato, região e tipo de contrato. **Limpar filtros** limpa tudo menos o ano.
  - "Tipo Receita" do Excel (Drilling contract, Serviços, Outros) não existe nos arquivos dos engenheiros. O mais perto é o filtro **Tipo de contrato**.
- **Indicadores (só US$, 5 cartões do mesmo tamanho):** receita (realizado · previsto), COGS, operações (realizadas, previstas e "fora", com risco 100%), receita por operação (sem as de risco 100%) e margem. O homem-dia fica na aba Pessoal.
- **Contratos:** receita, COGS e margem por contrato, com o engenheiro e a data do arquivo, as operações e o uso do contrato em valor. Clique no contrato para filtrar.
- **Receita e margem** (aba inicial), por ano, no formato do "Relatório Receita" do Excel:
  - **Cards Q1, Q2, Q3, Q4 e Total do ano** (baixos, numa linha): só a receita e o COGS de cada quarto e do ano (com os filtros de cliente, contrato, região e tipo; sem o quarto/mês escolhido, para mostrar o ano todo). **São filtros** (Shift+clique num card soma os quartos entre o já escolhido e o clicado, g14): passando o mouse aparece "clique para filtrar"; clicando num quarto, a página toda filtra por ele e o card mostra "filtrando ✕"; clicando de novo, ou no card do ano ("ver o ano todo"), volta ao ano todo.
  - **Gráfico**, em cima da tabela (**Ocultar gráfico** esconde; a escolha fica guardada).
    - **Mostrar** (g10): **Receita**, **COGS**, **Receita e COGS** (o padrão, como antes) ou **Margem** (receita − COGS; a negativa fica em vermelho, abaixo do zero). Vale para as três formas de ver, para a tendência e para os gráficos da aba "Comparar registros"; a escolha fica guardada.
    - Três formas de ver:
    - **Por mês:** receita realizada e prevista empilhadas, com o COGS ao lado;
    - **Por mês e cliente:** a receita de cada mês empilhada por cliente;
    - **Por cliente:** barras horizontais, com os clientes no eixo vertical, da maior receita para a menor. Cada cliente tem a receita (realizada + prevista) e o COGS, com o valor na ponta. Clicando no cliente, a página toda filtra por ele.
  - **Detalhes dos gráficos:**
    - **meses vazios:** nas formas por mês, aparecem na ordem, sem barra;
    - **tendência da receita total do mês** (formas por mês): **linear** (reta dos mínimos quadrados), **média móvel de 3 meses** ou sem tendência; mês sem operação conta como zero;
    - **mouse e clique:** passando o mouse aparecem os valores (inclusive o da tendência); clicando num mês, a coluna dele fica destacada na tabela;
    - **cores dos clientes:** cada cliente tem sempre a mesma cor, pela receita total de todos os arquivos, e o filtro não troca as cores. Com mais de 8 clientes, os menores ficam juntos em "Outros clientes". As cores foram conferidas para daltonismo.
  - **Tabela "Receita, COGS e margem — ano"** (matriz; substituiu a tabela de drill-down por mês):
    - **Linhas:** Cliente › Contrato › Sonda › Poço › Operação › Item PPU, com a quantidade de operações de cada grupo. Clique numa linha para abrir ou fechar. **Mostrar até** abre tudo até Cliente, Contrato (o padrão), Sonda, Poço, Operação ou Item PPU.
    - **Colunas:** quarto (Q1/2026…) › mês › **Receita** e **COGS**, o **total de cada quarto** (em verde) e o **Total** (Receita, COGS e Margem). Só aparecem os meses com operação no período.
    - **Valores:** US$, com o risco de cada operação aplicado. A realizada vai pela data do serviço e a prevista pela data planejada. Célula vazia = sem operação no mês; operação com risco 100% aparece em cinza, com 0,00. COGS em vermelho, como no Excel.
    - **Operação:** data, tipo, revestimento, situação (realizada/prevista), risco e SO. **Item PPU:** item, descrição, quantidade × valor unitário e a receita no mês da operação (com o risco; "bruto" quando há risco). COGS e margem do item ficam em branco.
    - **Ordem:** clientes e grupos da maior receita para a menor; operações por data; itens pela receita.
    - A tabela rola dentro do quadro, com o cabeçalho e a primeira coluna fixos. A linha **Total do ano** é igual ao indicador "Receita em US$" e ao card do ano.
    - **⬇ Excel desta tabela:** baixa a matriz como está na tela (linhas abertas), com o cabeçalho em 3 linhas mescladas, uma coluna por nível (Cliente, Contrato, Sonda, Poço, Operação, Item PPU) e números de verdade.
  - **Valores em R$:** saíram desta aba e dos indicadores. Continuam nas abas Contratos, Itens PPU e Operações e no Excel.
- **📌 Registrar** (barra do topo, g10): guarda uma foto de **todas** as operações carregadas (todos os anos, clientes e contratos, sem os filtros), com a receita e o COGS em US$ já com o risco, na data escolhida (padrão: hoje) e com uma observação opcional.
  - **Um registro por data:** se já houver registro na data, a janela avisa e o botão vira **Sobrescrever**.
  - Fica neste navegador (`earlger:registros_v1`, formato compacto). Se o navegador estiver cheio, ele avisa e nada muda.
- **Comparar registros** (aba, g10):
  - **Lista dos registros** (e "Agora", os arquivos carregados), com data, hora do registro, observação, contratos, operações, receita, COGS e margem do ano/filtros escolhidos. Tem **🗑** para remover um registro (com confirmação), **⬇ Exportar registros** (.json) e **⬆ Importar registros** (junta com os daqui; na mesma data fica o registrado por último).
  - **Base** (qualquer registro ou "Agora") e **Comparar com: quantos registros quiser** (g12) — marque um ou vários (e "Agora"); **Todos** marca todos. Abre comparando o penúltimo com o último registro (com um registro só, ele com "Agora").
  - **Cards** só do que está em "Mostrar" (Receita, COGS ou Margem; "Receita e COGS" mostra as três): valor no último registro, valor da base e a variação de cada registro comparado sobre a base; e Operações (novas e removidas em cada registro).
  - **Gráfico "em cada registro":** uma coluna por registro escolhido (em ordem de data, a base marcada), com a variação % sobre a base em cima; o tooltip mostra também a variação sobre o registro anterior.
  - **Gráfico "Variação % por mês":** um gráfico por medida escolhida, com uma barra por registro comparado (legenda com as datas); "novo" (ou ◆ quando a barra é estreita) = mês sem valor na base.
  - **Tabela** no formato da matriz: Cliente › Contrato › Sonda › Poço › Operação nas linhas; quarto › mês nas colunas, com o valor e o **Δ%** sobre a base de cada registro comparado, o total de cada quarto e o **Total** (base e, para cada registro, valor, Δ US$ e Δ%). As operações são ligadas pelo contrato + número da operação, e cada uma diz o que mudou: nova, removida, data, risco, passou a realizada, valor mudou ou sem alteração. **Só o que mudou** esconde o resto; **⬇ Excel da comparação** baixa como está na tela.
  - **Cores:** verde = favorável, vermelho = desfavorável (receita e margem que sobem são favoráveis; COGS que sobe é desfavorável).
  - **Mostrar** (Receita, COGS, Receita e COGS, Margem) — no topo da aba e em cada gráfico e na tabela — isola a medida nos cards, nos gráficos, na tabela e no Excel; os filtros do topo (ano, quarto, mês, cliente, contrato, região, tipo) também valem.
- **📤 Compartilhar (HTML)** (barra do topo, g12): gera um **.html** com o EARL Gerencial e os dados de agora dentro, para mandar por e-mail. Quem recebe abre com dois cliques no Chrome ou no Edge, sem instalar nada e sem internet, e tem a mesma interatividade: abas, filtros (ano, quarto, mês, cliente…), cards, gráficos, matriz, ordem e seleção nas tabelas, comparação de registros e Excel.
  - Abre na mesma aba, com os mesmos filtros, "Mostrar" e comparação que estavam na tela.
  - **Só consulta:** aparece a faixa "Versão compartilhada" com a data dos dados; não tem Carregar, Limpar, Registrar, Importar nem 🗑, e nada é gravado no navegador de quem abre (os dados guardados no Gerencial dessa pessoa não mudam). Dá para compartilhar de novo a partir dele.
  - **Opções:** levar ou não os registros; **levar só os contratos do filtro atual** (cliente, contrato, região ou tipo — também nos registros), por exemplo para mandar só o de um cliente.
  - **Saídas:** ⬇ Baixar HTML (~1,2 MB); ⬇ Baixar .zip (se o e-mail da empresa bloquear .html); ✉ Criar e-mail (.eml) — abre no Outlook como rascunho, com Para, Assunto, a mensagem e o HTML anexo.
- **Ordem e seleção nas tabelas** (g11), nas abas Contratos, Itens PPU, Químicas, Casing equipment, Pessoal, Operações e Arquivos:
  - **Ordenar:** clique no título da coluna para ordem **crescente (▲)**; clique de novo para **decrescente (▼)**. Valores vazios ficam sempre no fim.
  - **Selecionar itens (▾):** abre a lista dos valores da coluna, com a contagem de linhas de cada um, busca, "(Selecionar tudo)", **só este** (isola um item) e os botões ↑ Crescente / ↓ Decrescente. Marque um ou vários e clique em **Aplicar** (Enter na busca aplica o que ficou visível). **Mostrar todos** tira a seleção; Cancelar, Esc ou clique fora fecham sem mudar.
  - A lista de uma coluna mostra só o que sobrou com a seleção das outras colunas; dá para combinar várias colunas. Em "Contratos" (Químicas e Casing) cada contrato é um item; na Data (Operações) os itens são os meses.
  - Com seleção ou ordem, aparece "Mostrando X de Y linha(s)…" e **Limpar ordem e seleção**. O ▾ da coluna selecionada fica vermelho.
  - O **total** de cada tabela soma só as linhas que estão aparecendo. A escolha fica ao trocar de aba (até fechar a página). Os filtros do topo e a busca de Operações continuam valendo junto.
- **Itens PPU** (g13), por contrato e item: contratado; **consumido** (lançado nas operações já concluídas, em todo o contrato) e o **Realizado US$**; saldo; % usado; **Preço unitário** (vigente, em US$ e R$); **Lançado no período** (concluídas com data do serviço no ano/quarto/mês escolhido) e a **Seleção US$**; **A realizar** (previsto nas operações ainda não concluídas, em todo o contrato, × (1 − risco)) e o **A realizar US$**; **Projetado** = consumido + a realizar, e o **Projetado US$**. Os US$ usam o preço da data de cada operação (com os reajustes), como vem do Engenharia. Sem coluna em R$. O total soma os quatro valores em US$ das linhas visíveis.
- **15 linhas visíveis** (g13) em todas as tabelas (matriz da Receita, comparação e lista de registros, Contratos, Itens PPU, Químicas, Casing, Pessoal, Operações, Arquivos): o resto rola dentro do quadro, com barra vertical e horizontal; o cabeçalho fica fixo em cima e o total embaixo. Tabela com até 15 linhas não tem limite.
- **Químicas** e **Casing equipment:** planejado × lançado por SAP, com o COGS, o número de operações e os contratos.
- **Pessoal:** por função, pessoas e homem-dia planejado × lançado.
- **Operações:** todas as operações, com situação (realizada ou prevista), risco, receita bruta e com risco, COGS e margem. Tem busca.
- **Arquivos:** os arquivos carregados e se estão em uso.
- **⬇ Excel consolidado** (do ano e dos filtros escolhidos): abas Contratos, Receita <ano> (a matriz com tudo aberto até os itens PPU), Por mês, Itens PPU, Químicas, Casing, Pessoal, Operações e Lançamentos (cada linha lançada).

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
  - dois engenheiros geram arquivos no app de Engenharia, e o Gerencial carrega por arquivos, `.zip` e pasta. Inclui os 5 indicadores em US$, os cards dos quartos, a matriz do ano (cliente › contrato, até as operações e os itens PPU, que somam a receita da operação), o gráfico (por mês, por mês e cliente e por cliente; ocultar/mostrar; tooltip; cores fixas por cliente; clicar no cliente filtra; clicar no mês destaca a coluna) e o filtro de período numa caixa só, com o quarto valendo no lugar dos meses (62 verificações);
  - a visão por ano (`tests/e2e_matriz.js`, 59 verificações, com os quartos de início e fim, o Shift+clique nos cards e a prévia ao passar o cursor (g14)) monta arquivos sintéticos (2 engenheiros, 4 clientes, 16 operações de dez/2025 a fev/2027, realizadas e previstas, risco 0/50/100%, itens PPU). Confere os 5 cartões do mesmo tamanho (sem Pessoal), os cards Q1–Q4 e do ano, célula a célula da matriz (mês, quarto e total) contra uma conta feita no próprio teste, cada ano, a caixa de período (início e fim, ordem invertida, um mês só, clique fora, Esc), o quarto sobressaindo ao mês, o clique nos cards, o abrir e fechar até o item PPU, o destaque do mês pelo gráfico, o Excel da tabela e do consolidado e o celular;
  - versão para compartilhar (`tests/e2e_compartilhar.js`, 27 verificações): gera o HTML e abre em outro navegador (sem nada guardado) — mesma aba, filtros, "Mostrar" e comparação, mesmos números, registros, só consulta, abas/filtros/ordem/gráficos/Excel funcionando, nada gravado no navegador; abre no mesmo navegador sem mexer nos dados guardados; compartilhar de novo; só os contratos do filtro (também nos registros); .zip; e-mail .eml (rascunho, destinatários, assunto com acentos, anexo, corpo);
  - registros e comparação (`tests/e2e_registros.js`, 66 verificações): registra a versão 1 dos arquivos em 01/10/2026 e a versão 2 em 01/11/2026 (operação nova, removida, data, risco e valor mudados, passou a realizada, margem negativa) e a versão 3 em 01/12/2026, para comparar os três ao mesmo tempo. Confere contra uma conta feita no próprio teste os cards, os dois gráficos, a linha de total da tabela (mês, quarto e total), o que mudou em cada operação, "só o que mudou", Receita/COGS/Margem na comparação e na aba Receita (por mês, por cliente, por mês e cliente), filtros, Agora, inverter, Excel, sobrescrever na mesma data, remover, exportar/importar, armazenamento cheio, Esc/clique fora e celular;
  - ordem e seleção nas tabelas (`tests/e2e_tabelas.js`, 53 verificações): 3 contratos com itens PPU, químicas, casing e pessoal; ordena todas as colunas de todas as 7 tabelas nos dois sentidos e confere a ordem; confere "só este", marcar mais um, a lista que depende das outras colunas, duas colunas juntas, buscar + Enter, "Mostrar todos", Aplicar desligado sem nada marcado, Cancelar, Esc, clique fora, o total só das linhas visíveis, os meses da Data, os vários contratos de uma química, a busca e os filtros do topo junto, guardar ao trocar de aba, o clique no contrato que filtra a página, as colunas novas dos Itens PPU contra uma conta feita no teste (no ano e só no Q1), a aba do Excel, as 15 linhas com rolagem (vertical, horizontal, cabeçalho e total fixos) e o celular;
  - o teste BP (`../engenharia/teste_bp/e2e_bp.js`) confere o Gerencial contra os totais da planilha do BP, ano a ano (2026 e 2027, que somam a planilha): receita, COGS, margem, operações fora, os cards dos quartos, cada mês da matriz e do gráfico, os itens PPU, a tendência linear e a média móvel, as formas por cliente, o período e o quarto, aba Operações e Excel.

  ```bash
  node tests/e2e_gerencial.js ../engenharia/EARL_Engenharia.html EARL_Gerencial.html [pasta-das-telas]
  ```

  ```bash
  node tests/e2e_matriz.js EARL_Gerencial.html [pasta-das-telas]
  ```

  ```bash
  node tests/e2e_registros.js EARL_Gerencial.html [pasta-das-telas]
  ```

  ```bash
  node tests/e2e_tabelas.js EARL_Gerencial.html [pasta-das-telas]
  ```

  ```bash
  node tests/e2e_compartilhar.js EARL_Gerencial.html [pasta-das-telas]
  ```

- **Modo embutido** (g14): o EARL Engenharia mostra a aba "Receita e margem" deste app na página inicial dele. O `patch_engenharia.py` embute o `gerencial.html` (sem as bibliotecas; o xlsx vem da página da Engenharia) num quadro (iframe) com `<script id="earlger-embutido">`. Nesse modo: sem cabeçalho, título, barra de arquivos, abas e registros; os dados vêm de `window.parent.engGerDados()` (o pacote do "Arquivo do gerencial" com todos os contratos não arquivados) e `window.earlGerAtualizar()` recarrega quando a Engenharia muda; as preferências do gráfico ficam com o prefixo do arquivo da Engenharia + `ger:`; a altura do quadro acompanha o conteúdo. **Mudou o `gerencial.html`? Gere de novo os dois arquivos** (`EARL_Gerencial.html` e `EARL_Engenharia.html`).
- Versão: `EARL Gerencial g14`.
