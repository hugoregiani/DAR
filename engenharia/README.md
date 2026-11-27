# EARL — Forecast (antes "EARL Engenharia", avulso)

A Engenharia do EARL separada do resto do sistema, agora chamada **EARL Forecast** (e16), para usar **sem servidor, sem login e sem internet**: é só abrir o arquivo `EARL_Engenharia.html` no Chrome ou no Edge. Ele abre direto na Engenharia, com todos os contratos (Nordeste e Sudeste juntos).

## O que tem

- **Planejamento de operações**, igual ao EARL v115: escolha do contrato, Visão geral, Gantt, Calendário, Lista, templates, previsão de recursos (PPU, químicas, casing, pessoal e equipamentos) e contingência.
- **Handover por e-mail.** No EARL completo, o handover ia para a Coordenação e depois para a Logística. Aqui, o último passo do handover gera um **arquivo de e-mail (.eml)**:
  - **Assunto padronizado:** `HANDOVER - SONDA - OPERAÇÃO (POÇO) - SO 123456789 - VIDA H123456`. Bombeio e acidificação, que não têm VIDA, saem com `VIDA N/A`. Quando o handover é reenviado, o assunto ganha `- REV 2`, `- REV 3` e assim por diante.
  - **Corpo:** identificação (cliente, contrato, sonda, poço, operação, data, duração, SO, WBS, VIDA, contingência), químicas (previsto, backup, necessidade, solicitado, embalagem e lotes), casing equipment, equipamentos, pessoal (embarques no offshore; funções no onshore), itens PPU previstos, observações da operação e comentários do handover, com a assinatura do engenheiro.
  - **Destinatários:** o engenheiro marca quem vai em **Para** e em **Cc**. A lista fica salva para os próximos handovers e vale para as duas regiões.
  - O `.eml` abre no **Outlook** como uma mensagem pronta para enviar. Confira e clique em **Enviar**.
  - A aba **Handovers** guarda os e-mails gerados. Dali dá para baixar o mesmo e-mail de novo ou abrir o handover para gerar uma nova versão.
- **Contratos:** botão na barra. Cada contrato tem a lista de itens PPU com **item, descrição, unidade, saldo e valor unitário em R$ e em US$**.
  - Os itens podem ser digitados ou **carregados de uma planilha** (Excel ou CSV) com as colunas `Item`, `Descrição`, `Unidade`, `Saldo`, `Valor R$` e `Valor US$`. O botão **⬇ Baixar planilha / Modelo da planilha** gera o modelo. Na hora de carregar, dá para **atualizar e acrescentar** ou **substituir a lista**.
  - **Reajustes:** cada reajuste vale **a partir de uma data**. Os valores novos podem ser digitados linha a linha, sair de um **% aplicado a todas as linhas** (separado para R$ e US$) ou vir de uma planilha. Operações com serviço antes dessa data continuam com o valor anterior.
  - Item já usado em operação não pode ser apagado nem ter o código trocado.
- **Consumo da operação:** em cada operação (botão **Σ Consumo PPU** na janela da operação, ou **Σ Consumo** na Lista), o engenheiro lança a data do serviço e o que foi usado, em quatro partes:
  1. **Itens PPU**, que geram a receita: saldo disponível, valor vigente na data e total em R$ e US$.
  2. **Químicas.**
  3. **Casing equipment.**
  4. **Pessoal:** pessoas e dias por função, que dão o homem-dia.

  Cada parte começa com o previsto da operação, e **⇩ Copiar previsto** preenche tudo de uma vez. O app avisa quando um item PPU passa do saldo ou não tem valor cadastrado.
- **Página inicial: Receita e margem** (e8; desde a e16 é a aba **📊 Indicadores**, ver e16). Logo abaixo do título fica a mesma seção "Receita e margem" do **EARL Gerencial**, com os dados desta Engenharia (todos os contratos não arquivados):
  - **Filtros iguais aos do Gerencial:** ano, **quarto (início e fim)**, mês (início e fim), cliente, contrato, região e tipo de contrato.
    - Para vários quartos, clique no quarto inicial e depois no final, como nos meses.
    - Depois do primeiro clique, passar o cursor sobre os outros quartos ou meses mostra a prévia do período.
  - **Cartões:** Receita, COGS, Operações, Receita / operação e Margem, em US$.
  - **Cartões dos quartos:** Q1 a Q4. São filtros: clique para um quarto; Shift+clique soma os quartos. Não há card do total do ano (e9): ele repetia o cartão "Receita em US$" de cima, que já é o total do ano com os quartos em "Todos".
  - **Gráfico:** por mês, por mês e cliente ou por cliente, com Receita, COGS, Receita e COGS ou Margem, e a tendência.
  - **Matriz:** cliente › contrato › sonda › poço › operação › item PPU, nos meses e quartos, com "⬇ Excel desta tabela".
  - **Regra:** a do Gerencial. Realizado é a operação com consumo lançado; previsto, o planejado. Tudo × (1 − risco).
  - **Recolher** esconde a seção, e a escolha fica guardada. A seção se atualiza sozinha quando os dados mudam.
- **Card do contrato: arquivar ou apagar** (e8). O botão **⋯** no canto do card abre:
  - **Arquivar:** o card sai da página inicial e o contrato sai da receita. Operações, consumos e valores continuam guardados. Para voltar: Contratos → "Mostrar arquivados" → abrir → Desarquivar → Salvar contrato.
  - **Apagar…:** apaga o contrato com os itens, valores e reajustes. Se ele tiver operações, apaga também as operações, os consumos e os handovers delas, e antes pede para digitar **APAGAR**. Não dá para desfazer, a não ser por um "⬇ Exportar dados" de antes. Um contrato apagado não volta quando o arquivo é aberto de novo, mesmo os que vêm do cadastro do EARL.
  - **Realizado:** operação com consumo lançado, pelo valor do contrato na data do serviço.
  - **Previsto:** operação ainda sem consumo, pelos itens PPU previstos × valor do contrato na data da operação. O COGS vem das químicas e do casing previstos.
- **Risco da receita / COGS (%):** campo na janela da operação (seção 2). A receita e o COGS da operação contam × (1 − risco). Com **0%** contam inteiros; com **100%** a operação continua mapeada (Gantt, lista, handover), mas **fica fora da receita e do COGS**. A Lista mostra a etiqueta "risco N%". Esse campo é diferente do "Risco de acontecer" da contingência.
- **Químicos (banco de produtos químicos):** botão na barra. Lista **SAP, descrição, unidade e valor unitário em US$** (o COGS) de cada produto químico.
  - **Uso:** é o valor usado no COGS das químicas das operações, previstas e lançadas.
  - **Base:** já vem com os 60 produtos da tabela "Químicos" da aba Forecast da planilha do BP. Ela entra uma vez em cada computador. Depois disso, só muda pelo que o engenheiro fizer.
  - **Atualizar pela planilha:** o responsável manda a planilha e o engenheiro clica em **⬆ Atualizar pela planilha**. O app mostra antes de gravar:
    - os produtos novos;
    - os que mudaram de valor (antes, depois e variação %);
    - os que mudaram de descrição ou unidade;
    - os que não estão na planilha;
    - as linhas ignoradas (sem SAP) e os SAP repetidos.

    Aí ele escolhe **Atualizar e acrescentar** (os que não estão na planilha continuam) ou **Substituir o banco pela planilha**, e clica em **Aplicar e salvar**.
  - **Formatos de planilha aceitos:**
    - o modelo do app (`SAP`, `Descrição`, `Unidade`, `Valor US$`);
    - a própria aba Forecast: o app acha a tabela `SAP / Químicos / UOM / COGS` e ignora as de PPU e Casing;
    - Excel ou CSV.
  - **⬇ Baixar planilha** gera a planilha com o banco atual: é a planilha-mestre para editar e mandar.
  - **Edição na tela:** dá para mudar descrição, unidade e valor, incluir (**＋ Produto**) ou tirar produtos e clicar em **Salvar**. O SAP de um produto salvo não muda.
  - **Avisos:** produto fora do catálogo de químicas do EARL, unidade diferente da usada nas operações (o COGS é quantidade × valor, então as duas precisam estar na mesma unidade), SAP provisório e valor zero ou em branco.
  - **Histórico:** cada atualização fica registrada com data, origem (base, planilha ou tela), quem fez e quantos produtos ficaram novos, alterados e removidos.
  - **Atenção:** o valor vale para todas as operações, inclusive as já lançadas; ao mudar um valor, o COGS delas muda junto.
- **Custos (COGS):** botão na tela de Contratos, para outros materiais e ajustes (desde o e12 o casing equipment fica no banco de Casing). As químicas ficam no banco de Químicos; se o mesmo SAP estiver aqui e num banco, vale o do banco. Custo unitário pelo SAP, em US$ e/ou R$. Pode ser digitado ou carregado de planilha (colunas `SAP`, `Produto`, `Unidade`, `COGS US$` e/ou `COGS R$`; uma coluna só "COGS" vale como US$). O consumo da operação e a aba "Consumo e receita" mostram COGS e margem.
- **⬇ Arquivo do gerencial** (até a e15; **saiu na e16**, ver abaixo): botão na barra (e na aba Consumo e receita). O engenheiro marca os contratos sob a responsabilidade dele e gera um `.json` com os contratos (itens, saldos, valores, reajustes) e as operações (previsto com valores, consumo lançado, receita, COGS e risco). Esse arquivo vai para a pasta do SharePoint do gerencial e é lido pelo **EARL Gerencial** (`../gerencial`).
- **Inventário das sondas:** aba em cada contrato (e na Visão geral), para lançar o **inventário real dos produtos químicos a bordo** de cada sonda do contrato.
  - **Sondas do contrato:** as das operações do contrato e as cadastradas com o contrato. Uma sonda de fora entra por **＋ Contagem de outra sonda…**.
  - **Contagem:** cada uma tem data, responsável e observação, e uma linha por produto (SAP, produto, unidade e quantidade a bordo).
    - A primeira contagem de uma sonda começa com os produtos previstos nas operações dela.
    - As seguintes começam com a última contagem e mostram a **contagem anterior** e a **diferença**: é só alterar o que mudou.
    - Produto sem quantidade fica fora.
    - Duas contagens da mesma sonda na mesma data: a nova substitui a antiga (o app pergunta antes).
  - **Planilha:** **⬆ Carregar planilha** aceita uma planilha com as colunas `SAP` e `Quantidade`, a aba **DAR antiga** (uma coluna por sonda; o app usa a coluna da sonda) ou o próprio arquivo de inventário exportado. **⬇ Planilha / modelo** baixa a contagem.
  - **Na tela:** um cartão por sonda (última contagem, há quantos dias, histórico) e a tabela **Inventário atual** (produtos × sondas, com total e busca, e Excel).
- **⬇ Exportar planilhas:** botão na barra e na aba Inventário das sondas. O engenheiro marca os contratos e baixa **quatro planilhas Excel separadas**:
  1. **Inventário das sondas**: a última contagem de cada sonda dos contratos, com uma aba Histórico com todas as contagens.
  2. **Consumo de produtos químicos**: uma linha por operação e produto, com previsto e, nas operações concluídas, o consumo lançado.
  3. **Casing equipment**: uma linha por operação e item, previsto e lançado.
  4. **Pessoal**: uma linha por operação e função, com pessoas, dias e homem-dia previstos e lançados.

  Todas trazem contrato, cliente, sonda, poço, operação, data, situação (Previsto/Concluído), contingência e risco. As operações canceladas não entram. **O Painel de Compras usa as planilhas 1 e 2 no lugar das abas DAR e Compilado Geral da planilha do Forecast**: no quadro "Engenharia" da aba Carregar Dados dele, carregue as planilhas de todos os contratos de uma vez.
- **Consumo e receita:** aba nova na Engenharia.
  - **Num contrato:** receita em R$ e US$, receita por operação, saldo por item PPU (contratado, consumido, saldo e % usado), receita por mês e a lista das operações que já passaram e estão sem consumo lançado.
  - **Na Visão geral:** receita por contrato.
  - Tem filtro por período do serviço e **⬇ Excel** com as abas Operações, Itens e Lançamentos.
- **Sondas:** botão na barra, para cadastrar sondas. O cadastro já vem com as 41 sondas offshore; as do Nordeste precisam ser cadastradas.
- **Exportar dados e Importar dados:** botões na barra, para levar tudo de um computador para outro (veja abaixo). O inventário das sondas vai junto.

- **Espaço do navegador:** no Chrome e no Edge, todos os HTML abertos do disco (EARL completo, simulações, Engenharia, Gerencial e testes) dividem o mesmo espaço, de cerca de 5 milhões de caracteres. Quando ele enche, nenhum desses arquivos consegue salvar.
  - **Aviso:** a página inicial avisa quando o uso passa de 85% ou quando uma gravação é recusada.
  - **Liberar espaço:** **Ver e liberar espaço** mostra quanto cada arquivo ocupa e deixa apagar só dados de simulação e de teste. Os dados da Engenharia, do Gerencial e do EARL completo não se apagam por ali.
  - **Armazenamento bloqueado:** se o arquivo foi aberto dentro de uma pré-visualização (e-mail, Teams, visualizador), o navegador bloqueia o armazenamento. O app abre mesmo assim e avisa que nada fica salvo.

### e10 (12/11/2026)

- **Contingência = risco de não acontecer.** Na operação em contingência, o campo virou **"Risco de não acontecer"** (0% = entra inteira na receita, no COGS e nas químicas; 100% = fica mapeada, mas fora da contagem). É o mesmo valor do "Risco da receita / COGS" (que some do formulário quando a operação está em contingência). Nas linhas (itens PPU, químicas, casing, pessoal, equipamentos), a coluna virou **"Contingência · risco"** com a mesma regra; a linha conta × (1 − risco da linha) na receita e no COGS previstos. Por dentro, o app continua guardando a chance de acontecer (`risco` da operação = 100 − riscoRec; `chance` da linha = 100 − risco), usada no forecast de químicas do EARL. Ao abrir, as operações em contingência antigas ficam com o risco que estava em "Risco da receita / COGS".
- **Câmbio do dólar por mês** (botão **💱 Câmbio** na barra): ano, mês e quanto vale US$ 1,00 em R$. Itens de contrato com valor em R$ entram em US$ pela cotação do mês do serviço (concluída) ou da data prevista (prevista): US$ da linha = qtd × valor US$ + qtd × valor R$ ÷ câmbio. Mês sem cotação: vale a do último mês informado antes. Vale para todos os contratos (Receita e margem, Consumo e receita e o arquivo do gerencial).
- **Handover:** o e-mail traz a coluna **"Saldo na sonda"** nas químicas (última contagem do Inventário das sondas; sem contagem, o DAR do EARL, quando houver), com a data da contagem. O mesmo saldo aparece em "A bordo" na janela do handover e desconta da sugestão do "Solicitado".
- **Lista:** horizonte **"Todas"** (todas as operações do contrato, passadas e futuras, por data).
- **Sondas:** sempre como **"NOME PETROBRAS - NOME DA SONDA"** (ex.: NS-60 - Deepwater Aquila); sem nome Petrobras, só o nome. Vale no Gantt, calendário, lista, seletores, handover (assunto e corpo), consumo, inventário e Receita e margem. As planilhas exportadas continuam com "Sonda" (código) e "Nome da sonda" separados.
- **Exportações:** "Consumo de produtos químicos", "Casing equipment" e "Pessoal" ganharam **Contingência (linha)** e **Risco da linha (%)**; a operação já tinha Contingência e Risco (%). O Painel de Compras aplica o risco da linha.
- **Cards** da aba "Consumo e receita" com profundidade, como os do Gerencial g16.

### e19 (27/11/2026) — exportar escolhendo os contratos, janelas de qualquer tamanho, calendário, cor da sonda nas barras

Pedidos do Hugo (código novo em `eng_e19.js` e `eng_redim.js`; duplicar e cor da sonda em `eng_e17.js`):
- **"⬇ Exportar dados" com mais de um contrato:** abre a janela "Exportar dados" (`engExportarPedir`,
  `renderEngExpSel`, `.eng-expsel`) com os contratos **todos marcados**; cada um vai com as operações, consumos,
  handovers e o inventário das sondas dele (`engExportar(ids)`); sondas, câmbio, químicos e casing vão sempre. Com um
  contrato só, exporta direto. A **importação** já perguntava (janela "⬆ Importar dados", contrato por contrato).
- **Nome do arquivo exportado:** `EARL_FORECAST_<CONTRATOS>_AAAA.MM.DD_HHhMM.json` (`engNomeArqCts`,
  `engCarimboArq`). Os nomes dos contratos saem em maiúsculas, sem acento e com "-" no lugar de espaço e pontuação
  (ex.: `EARL_FORECAST_P&A-MACAE-OFFSHORE_TAKATSUGU-J_2026.11.27_14h05.json`); com mais de 3 contratos, os 3 primeiros
  e `_E-MAIS-N`. A hora vai com **"h"** no lugar de ":" porque o Windows não aceita ":" em nome de arquivo.
- **Todas as janelas mudam de tamanho** puxando qualquer borda ou canto (`eng_redim.js`, script avulso no fim do
  `<body>`, fora do React): perto da borda (8 px por fora, 4 px por dentro; cantos 14 px) o cursor vira a seta; ao
  arrastar, a janela fica com posição e tamanho fixos (mínimo 280 × 160, sem sair da tela); **duplo clique na borda**
  volta ao tamanho normal. O clique que termina um arraste não chega ao app (não fecha a janela por engano); clicar
  fora sem arrastar continua fechando as janelas que já fechavam assim. O Gerencial tem uma cópia igual (janelas
  `.dlg`), entre `EARL_REDIM_INICIO` e `EARL_REDIM_FIM` no `gerencial.html` — o `patch_engenharia.py` confere que são
  iguais.
- **Cartão vermelho da Receita nos Indicadores** (Gerencial g21): o mesmo gradiente sólido e a mesma sombra cinza do
  card "Visão geral" dos Contratos, sem o brilho e sem a sombra vermelha luminosa.
- **Duplicar o poço:** cada operação tem uma caixa de marcar (todas marcadas no começo; a do cabeçalho marca/desmarca
  todas; clicar na linha também). Só as marcadas vão para o poço novo; a "Data da 1ª operação marcada" vale para a 1ª
  marcada e as outras ficam na mesma distância. A desmarcada aparece riscada, "(não vai)".
- **Tipos de operação:** "Entrega de Cimento/Blend" (nova, ao lado de "Perfuração", antes de "Outros"; EN "Cement/Blend
  delivery", ES "Entrega de Cemento/Blend").
- **Calendário:** o dia mostra o **tipo da operação** embaixo da sonda e do poço (`engCalTipo`). O "abrir" do dia
  abre a janela **"Dia DD/MM/AAAA"** (`renderEngDia`, `.eng-dia-modal`) só com as operações daquele dia (com os filtros
  da tela): sonda e poço, tipo, período, situação (cor da legenda), receita e COGS; **clicar numa operação abre a
  janela dela para editar**; "+ Nova operação neste dia" já vem com a data. Saiu daí a janela antiga do EARL
  (Operações do dia, Frentes e atividades, Na base).
- **Cor da sonda nas barras** (Gantt nos 3 modos e calendário): com cor escolhida (clique no nome da sonda), a barra
  fica na **cor da sonda** e a **faixa de baixo** (5 px no Gantt, 4 px no "Sonda contínua", 3 px no calendário) na
  **cor da legenda** (situação), como no EARL (`engBarraCor`, `engBarraTxt`: texto escuro em cor clara). Sem cor,
  a barra fica como antes. A janelinha da cor ganhou **"Outra cor"** (qualquer cor, `<input type="color">`). A legenda
  explica (`engLgdSonda`). A linha da sonda no Gantt ficou mais clara (10%), para a barra aparecer.
- **Testes:** `tests/e2e_e19.js` (41). `tests/harness.js` ganhou `exportarDados(p)` (clica em "⬇ Exportar dados" e
  confirma a janela, se ela abrir), usado pelos testes que exportam.

### e18 (26/11/2026) — data passada, janela que só fecha pelos botões, Cimento G a US$ 7,77/sk, sem "Consumo e receita"

Pedidos do Hugo:
- **Operação nova com data anterior a hoje:** saiu o bloqueio (`min` do campo e a condição do botão Salvar). Aparece
  só um aviso: "Data no passado: se a operação já aconteceu, depois de salvar use “✓ Concluir operação”".
- **A janela da operação só fecha pelos botões** (Cancelar/Fechar/×), não ao clicar fora. As janelas que abrem a
  partir dela (consumo, concluir, duplicar) também.
- **COGS do Cimento Classe G (SAP 100003685) = US$ 7,77/sk em todos os arquivos:**
  - a base (`quimicos_base.json`) passou de 13,15 para 7,77;
  - ao abrir, o `engQuimMig` corrige uma vez o banco de químicos do arquivo (flag `cogsCimentoGV1 {em, de, para}`;
    sem o cimento no banco, ele entra) e registra no histórico ("Correção do COGS do Cimento Classe G");
  - um valor mudado depois pela pessoa fica como ela deixou;
  - vale para o arquivo geral, os contratos reais (o `gerar_html.js` deixa a correção para a abertura, depois dos
    químicos da planilha) e o teste BP. A demonstração (`walkthrough/demo.js`) não sorteia o custo do cimento;
  - o COGS das operações com cimento cai: qtd × (custo antigo − 7,77). Os testes que comparam com a planilha
    (`e2e_bp`, `e2e_contratos_reais` e a conferência do `gerar_html.js`) esperam a planilha com o cimento a 7,77.
    Ex.: BP 13,15 → 7,77.
- **Sem a pílula "Consumo e receita"** no contrato e na Visão geral (a receita fica nos Indicadores, na Lista e na
  janela da operação). A tela continua no código: `window.engPlanView('rec')` (usada pelos testes).
- **Teste:** `tests/e2e_e18.js` (15).

### e17 (25–26/11/2026) — concluir a operação, pílulas, receita/COGS nas telas, duplicar o poço, cor das sondas

Pedidos do Hugo (código novo em `eng_e17.js`; ligações no `patch_engenharia.py`, bloco "e17"):
- **Filtro "Sonda"** (Visão geral e contrato): só as sondas que têm operação nos contratos escolhidos (no filtro
  "Contrato" da Visão geral, ou o contrato aberto), em vez das 41 sondas do cadastro (`engRigsFiltro`).
- **✓ Concluir operação** (janela da operação, ao lado do "Σ Consumo PPU"): salva a operação e
  1. se houver contingência (a operação ou linhas de PPU, químicas, casing, pessoal, equipamentos), pergunta linha a
     linha se foi usada (`renderEngConc`): **usou** = vira item normal; **não usou** = sai da operação. Não continua
     enquanto faltar resposta ("não pode fechar a operação com itens de contingência"). A operação deixa de ser
     contingência e o risco de não acontecer vai a 0% (ela aconteceu); fica no Log;
  2. abre o consumo em modo "concluir" (`abrirEngCons(pj, {concluir: true})`), já preenchido com o previsto; ao
     salvar, grava `ppuCons` e `concluida {em, por}` (`engComConclusao`).
  - **Concluída = tem consumo lançado** (`engConcluida`): fica **preta** no Gantt (`pjCor` → 'concluida'), com o selo
    "✓ Concluída" na Lista e na janela; nos Indicadores e nas planilhas já era "realizado/Concluído".
  - **↺ Reabrir** apaga o consumo e a conclusão (as contingências resolvidas não voltam).
- **Pílulas de filtro** (Gantt, Calendário e Lista; `engRenderPilulas`): Situação (Previstas, Concluídas, Atrasadas),
  Marcas (Contingência, Com risco, Risco 100%) e Handover (enviado, sem). Dentro do grupo vale "ou"; entre grupos,
  "e". Cada pílula mostra quantas operações tem; a escolha fica no navegador (`eng_pilulas_v1`). O estado e o teste
  (`engPil`, `engPilOk`, `engPilFiltra`) ficam no começo do App (o `planBase` roda antes do código novo).
- **Receita e COGS (US$) de cada operação**: valor cheio (sem o risco), realizado se tem consumo, senão previsto
  (`engRC`): no Gantt (3ª linha embaixo do poço e no texto da barra), no Calendário e na Lista (colunas Receita e
  COGS).
- **Na janela da operação** (`engResumoOp`, entre o formulário e os botões): Receita, COGS e Margem ao vivo, conforme
  os itens escolhidos: Σ × (1 − risco da linha em contingência) × (1 − risco da operação). 100% = não acontece (0);
  0% = acontece (inteiro). Mostra também o valor cheio e, se concluída, o realizado.
- **Duplicar** (janela e Lista): se o poço tem mais operações, pergunta "só esta operação" (a cópia de sempre) ou
  **"o poço inteiro"**: todas as operações do mesmo poço (e contrato), num poço novo, a partir da data escolhida, na
  mesma sequência, com os mesmos recursos, na mesma sonda ou numa escolhida; sem consumo, handover ou conclusão.
- **Cor das linhas da sonda no Gantt**: clique no nome da sonda (por sonda / sonda contínua) e escolha a cor (10
  cores ou "Sem cor"); fica neste navegador (`eng_cores_sonda_v1`), por sonda.
- **Tipo "Perfuração"** na lista de tipos de operação (duração padrão 3 dias, horizonte 180, VIDA opcional). As
  planilhas dos contratos reais continuam lendo perfuração como "Outros" com a descrição (não mudou o leitor).
- **Teste:** `tests/e2e_e17.js` (42 verificações).

### e16 (25/11/2026) — Forecast: abas Indicadores e Contratos

Pedido do Hugo: "Vamos trocar o nome de engenharia para forecast de receita. Crie uma aba para indicadores e uma aba
para os contratos. Assim a gente pode acabar com esse botão de exportar para o arquivo do gerencial. Vão ter várias
pessoas trabalhando em diferentes contratos: elas exportam os dados, eu importo todos os contratos no meu aplicativo e
vejo todos os indicadores ali de uma vez."
Logo depois (mesmo dia): "Ao invés de escrever forecast de receita, deixa o título somente como forecast, porque a
partir daí eu também quero tirar consumo de produto químico, consumo de casing equipment, o scheduling do pessoal …
além da receita. Isso daí vai para um outro arquivo." Por isso o nome é só **EARL Forecast**: do mesmo arquivo saem a
receita (aba Indicadores) e, pelas planilhas exportadas ("⬇ Exportar planilhas"), o consumo de químicos, de casing e o
pessoal, que vão para outros arquivos (o Painel de Compras já lê o consumo de químicos e o inventário).

- **Nome:** "EARL Forecast" no título da página, na faixa vermelha, na trilha, no título da página inicial
  (`patch_engenharia.py`) e nos arquivos dos contratos reais (`EARL — Forecast (PA)`). O nome dos arquivos
  no repositório, o prefixo do armazenamento (`earleng…`) e os tipos das planilhas (`EARL-Eng-…`, lidos pelo Painel de
  Compras) **não mudaram**, para não perder dados nem quebrar a leitura nas outras ferramentas. A exportação agora se
  chama `EARL_Forecast_dados_<data>.json` (campo `app: 'EARL Forecast'`).
- **Página inicial com duas abas** (`renderEngHomeTabs` em `eng_contratos.js`, CSS `.fr-tabs`/`.fr-tab`):
  - **📊 Indicadores** (`renderEngIndicadores`): o Gerencial embutido (`ENG_GER_HTML`, iframe `.ec-ger-frame`), com
    todos os contratos ativos deste arquivo. Agora com as abas do Gerencial (Receita e margem, Comparar registros, Por
    contrato, Itens PPU, Químicas, Casing equipment, Pessoal, Operações) e a barra com ⬇ Excel consolidado,
    📌 Registrar e 📤 Compartilhar (HTML). Ver o g20 em `../gerencial/README.md`.
  - **📁 Contratos:** os cartões dos contratos (Visão geral + um por contrato), como antes.
  - A aba escolhida fica guardada (`eng_home_tab_v1`). Sem nada guardado, abre em Indicadores. Os testes abrem em
    Contratos (`window.EARL_ABA_INICIAL`, posto pelo `tests/harness.js`; `aba: 'ind'` ou `''` muda).
- **Saiu o botão "⬇ Arquivo do gerencial"** (da barra do topo e da aba Consumo e receita). O pacote continua sendo
  gerado (`engPacoteGerencial`) para a aba Indicadores, e a janela antiga ainda abre por código
  (`window.engArquivoGerencial()`, usada nos testes).
- **Juntar os contratos de várias pessoas:** cada pessoa usa "⬇ Exportar dados"; o Hugo usa "⬆ Importar dados" (e15:
  contrato por contrato, o de mesmo nome é substituído) e vê todos os contratos na aba Indicadores.
- **Gerencial separado** (`EARL_Gerencial.html`): não é mais entregue; continua no repositório e abre os
  "Arquivo do gerencial" das versões anteriores. A tela inicial dele explica o jeito novo.
- **Testes:** `tests/e2e_e16.js` (29): duas pessoas exportam, o Hugo importa e vê os 5 contratos nos indicadores
  (receita de cada ano, filtro por contrato, aba Por contrato), alterar uma operação muda os indicadores, a aba é
  lembrada, Registrar (janela na parte visível, guarda e continua depois de reabrir) e Compartilhar (HTML independente
  que abre sozinho com os mesmos números e baixa o Excel). Os outros testes passaram a escolher a aba
  (`.fr-tab-ind`/`.fr-tab-cts`).

### e15 (24/11/2026) — exportar, importar contrato por contrato e apagar

Pedido do Hugo: "quando eu exportar, tem que exportar não só cada operação, mas o contrato, tudo. Quando importar em
outro arquivo, se o contrato já existe (mesmo nome), deve substituir o contrato e as operações. E tenho que poder
deletar um contrato; ao deletar, apaga junto todas as operações, deixando o aplicativo em branco."

- **⬇ Exportar dados:** o arquivo .json leva o banco inteiro. São os contratos (itens, valores, reajustes), as
  operações (consumos, handovers), o inventário, o câmbio, os bancos de químicos e casing, as sondas e as logos. Ganhou
  a lista `contratos` (nome, cliente, número, nº de operações), e o aviso diz o que foi exportado.
- **⬆ Importar dados (`engImportarContratos` em `eng_app.js`):** a tela lista os contratos do arquivo (os arquivados
  sem operações, que são o cadastro do EARL, ficam de fora). Os ativos vêm marcados, e cada linha diz o que acontece
  aqui. Para cada contrato marcado:
  - **já existe aqui** → o contrato daqui é **substituído** pelo do arquivo, com as operações: saem as daqui (com
    consumos, handovers, contagens de inventário e templates do contrato) e entram as do arquivo. O "mesmo" contrato é,
    nesta ordem: o ativo de mesmo nome (sem acento, maiúscula ou espaço extra), o de mesmo id, o arquivado de mesmo nome;
  - **não existe** → entra como contrato novo.

  Os detalhes:
  - Os outros contratos daqui não mudam.
  - O id do contrato daqui é mantido. Operação, handover, contagem ou template com id repetido ganha id novo.
  - O contrato sai de `ctApagados`, para voltar mesmo se tinha sido apagado aqui.
  - Pede confirmação quando substitui. Depois de recarregar, avisa o que entrou.
- **Junto com os contratos:**
  - as sondas que as operações usam;
  - os bancos (químicos, casing, clientes, pessoas, logos, e-mails): fica o registro alterado por último;
  - as contagens de inventário sem contrato.
- **Câmbio:**
  - Vale para todos os contratos do arquivo. Por padrão fica o daqui e só entram os meses que faltam, para os outros
    contratos não mudarem de valor.
  - Se o arquivo tem cotações diferentes, a tela mostra os meses e oferece "Usar o câmbio do arquivo nesses meses".
  - Achado no teste com os arquivos reais: PA e BD II diferem em out–dez/26 (5,1496 × 5,1918/5,4153). Antes, importar
    o P&A no arquivo do BD II mudava a receita do BD II.
- **Saiu o "Juntar"** (registro por registro, que trazia de volta o que tinha sido apagado). Ficou o "Substituir tudo".
- **Apagar contrato:**
  - Pode ser pelo botão **🗑 Apagar contrato** no topo do contrato, além do ⋯ do card.
  - Apaga também as contagens de inventário e os templates do contrato.
  - Se era o último contrato ativo, saem também os arquivados sem operações (o cadastro do EARL), e o arquivo fica
    **em branco**. Eles vão para `ctApagados`, e a migração da semente não os recria.
- **Testes:**
  - `tests/e2e_e15.js` (26): exporta, importa (substitui pelo nome mesmo com outro id, contrato novo, não marcado não
    muda, sem duplicar ao importar de novo, apagado volta ao importar) e apaga até ficar em branco.
  - `contratos_reais/e2e_importar.js` (com os arquivos reais): A → B, câmbio, importar no próprio arquivo, apagar tudo.

### e14 (23/11/2026) — segurança

O antivírus do SharePoint/OneDrive (Microsoft) marcou os arquivos como "Virus Found — Malicious Payload". Era **falso
positivo**: o ClamAV (3,6 milhões de assinaturas) não achou nada, e os modelos não têm macro nem JavaScript. O que
disparava o alerta era o desenho de três trechos do EARL v115, usados só nos relatórios de campo:
- modelos Word/Excel/PDF escondidos em base64 dentro do HTML (CSS, KPI, Job Log);
- a JSZip em base64 executada com `atob` → `<script>`;
- o login Microsoft (MSAL de alcdn.msauth.net, login.microsoftonline.com, Graph com Mail.Send) e o pdf-lib/pdf.js
  baixados da internet.

Isso é o mesmo desenho de "HTML smuggling" e de phishing. Mudanças no `patch_engenharia.py`:
- Saem os modelos, a JSZip em base64 e todo carregamento de código da internet (`loadScriptOnce` e `ensureJSZip`
  devolvem erro), além dos endereços de login/Graph/Logic Apps.
- Entra uma política de segurança (**Content-Security-Policy**) logo no início do `<head>`:
  - só roda o código do próprio arquivo, sem `eval`;
  - nada é buscado nem enviado para a internet (fetch, XHR, beacon, imagens, fontes, formulários, iframes de fora);
  - os downloads (Excel, .eml, backup) são `blob:`/`data:` e continuam funcionando.
- O Gerencial (g19) ganhou a mesma política.

O teste `tests/e2e_seguranca.js` confere tudo isso:
- os arquivos não têm conteúdo escondido, nem código ou login da internet;
- a política não atrapalha o uso normal;
- as tentativas de mandar dados para fora são barradas (nenhum pedido chega à rede);
- texto malicioso nos dados (nomes de cliente, contrato, sonda, poço, produto, função, e o arquivo do Gerencial de
  outra pessoa) aparece como texto e não executa, na tela, no filtro, no e-mail do handover e no Gerencial.

### e13 (13/11/2026)

- **Logo do cliente** (`eng_logo.js`): ao abrir o contrato, clique na logo (ou nas iniciais) ao lado do nome → janela "Logo do cliente": **⬆ Inserir a logo** / **Trocar a logo** (PNG, JPG, SVG…; reduzida para no máximo 240 px) e **Tirar**. Fica em `db.clientLogos` (o mesmo lugar do EARL), vale para todos os contratos do cliente: card da página inicial, topo do contrato e operações. Vai no "⬇ Exportar dados"; no "Juntar" fica a mais recente de cada cliente.
- **Espaço do navegador:** os dados grandes (o banco) ficam **comprimidos** (LZ-String, ~7× menor) na camada de armazenamento (`patch_engenharia.py`, `Z`/`U` em `EARL_ARMAZ`); o app lê e grava como antes. Os 6 contratos reais abertos no mesmo navegador ocupam ~1 milhão de caracteres (eram ~6,4 milhões e enchiam o espaço que todos os arquivos do disco dividem). Os HTML pré-carregados (contratos reais, teste BP) também gravam os dados embutidos comprimidos.
- **Walkthrough** (`walkthrough/`): PDF "passo a passo" no padrão Halliburton (33 páginas, dados de demonstração).

### e12 (13/11/2026)

- **Banco de casing equipment** (botão **Casing** na barra, ao lado de "Químicos"): igual ao banco de químicos — SAP, descrição, unidade e valor US$ (COGS), busca, "só com aviso", "＋ Item", **⬆ Atualizar pela planilha** (confere novos, valor alterado, descrição/unidade alterada e "só no banco"; atualizar e acrescentar ou substituir), **⬇ Baixar planilha** e histórico. É o próprio catálogo de casing do EARL (`db.casingEquip`), então item novo do banco aparece para escolher nas operações. O valor é o COGS do casing das operações (o banco de químicos vale sobre o de casing, que vale sobre Custos). Uma vez, ao abrir: o casing que estava em **Contratos → Custos (COGS)** passa para o banco (em Custos ficam os ajustes `AJ-`, o que está em R$ e o que não tem SAP).
- **Planilha com as duas abas:** a mesma planilha (aba de químicos + aba "Casing Equipment") atualiza os dois bancos: em "Químicos" o app lê a aba de químicos; em "Casing", a de casing (pelo nome da aba ou do título da coluna).
- **Câmbio:** a lista fica sempre com o mês mais recente em cima (ordem decrescente); "＋ Mês" entra em cima.
- **Filtro e ordem em todas as tabelas** (`eng_tabelas.js`): clique no título da coluna ordena (▲ crescente, de novo ▼ decrescente; vazios no fim); o **▾** abre a lista dos valores com a contagem, busca, "(Selecionar tudo)", "só este", ↑/↓ e Aplicar, como no Gerencial. Com filtro ou ordem aparece "Mostrando X de Y linha(s)" e **Limpar filtro e ordem**. Vale para os bancos de dados (químicos, casing, Custos, câmbio, sondas, contratos), a Lista, Consumo e receita, inventário, handovers e as demais tabelas com uma linha de títulos; tabelas de edição leem o valor dos campos; linha nova (＋) aparece mesmo com filtro.

### e11 (12/11/2026)

- **Sombra dos cards** (pedido do Hugo: "a parte superior do card parece se misturar com o fundo"): borda fina cinza em volta de todo o card (também em cima) e sombra macia, no modelo dos indicadores de Pessoal do EARL. Vale nos cards de "Consumo e receita" e na seção "Receita e margem" da página inicial (Gerencial g17), que agora tem fundo cinza claro para o card branco se destacar.

## O que não tem

Não tem login, escolha de região, Coordenação, Logística, Pessoal, Equipamentos, Operações, Sondas (a página da sonda), Análises, Ajustes nem sincronização com SharePoint. A simulação também ficou de fora: o arquivo começa só com o cadastro do EARL (contratos, sondas offshore, químicas, casing, pessoas e equipamentos), sem as operações fictícias.

## Como usar

1. Abra `EARL_Engenharia.html` com dois cliques (Chrome ou Edge).
2. Escolha o contrato e use **+ Nova operação**. A região da operação sai da base da sonda.
3. Na operação, clique em **Enviar Handover →**, confira a SO e o VIDA e clique em **Continuar →**.
4. Revise os itens (backup, solicitado, lotes, comentários) e clique em **Continuar para o e-mail →**.
5. Marque os destinatários (ou adicione e-mails), escreva seu nome e clique em **⬇ Gerar e-mail (.eml)**.
6. Abra o arquivo baixado: ele abre no Outlook. Confira e clique em **Enviar**.

## Contratos, consumo e receita — passo a passo

1. **Contratos** → abra o contrato (ou **＋ Novo contrato**).
2. Preencha os valores em R$ e US$ de cada item ou use **⬆ Carregar planilha**. Para ter o modelo, use **⬇ Baixar planilha**, preencha no Excel e carregue de volta.
3. Clique em **Salvar contrato**.
4. Para um reajuste: **＋ Novo reajuste** → data a partir da qual vale → % ou valores novos → **Salvar reajuste**.
5. Depois do serviço, o engenheiro abre a operação → **Σ Consumo PPU** → confere a data do serviço → informa as quantidades → **Salvar consumo**.
6. Para acompanhar: aba **Consumo e receita** do contrato (ou da Visão geral).

## Onde ficam os dados e como levar para outro computador (importante)

O app funciona offline e os dados ficam **só no navegador** do computador onde foram lançados. Para levar a outro computador:

1. No computador de origem, clique em **⬇ Exportar dados**. Baixa um arquivo `EARL_Engenharia_dados_AAAA-MM-DD_HHhMM.json` com **tudo**: contratos, itens, valores, reajustes, operações, consumos, handovers, destinatários dos e-mails, sondas, templates e o banco de químicos.
2. Leve o arquivo (OneDrive, rede, e-mail, pendrive) e abra o mesmo `EARL_Engenharia.html` no outro computador.
3. Lá, clique em **⬆ Importar dados** e escolha o arquivo. A janela compara o que há neste computador, o que há no arquivo e como fica depois de juntar.
   - **Juntar com os dados deste computador:** soma os dois. Quando o mesmo registro existe nos dois, fica o alterado por último. Use quando os dois computadores lançaram coisas. Atenção: o que foi apagado num computador volta ao juntar.
   - **Substituir pelos dados do arquivo:** este computador fica exatamente igual ao arquivo. Use num computador novo.

Exporte também de vez em quando, como cópia de segurança. Limpar os dados de navegação do Chrome ou do Edge apaga as operações deste computador.

## Teste BP (pasta `teste_bp/`)

Gera um arquivo de teste com os dados da planilha `Contrato_BP_Teste_EARL.xlsx` (aba "Banco de dados Contratos" para o contrato e aba "Forecast" para as operações). A planilha e o arquivo gerado não ficam no repositório.

```bash
node teste_bp/gerar_seed_bp.js Contrato_BP_Teste_EARL.xlsx EARL_Engenharia.html seed_bp.json
```

```bash
python3 teste_bp/montar_bp.py EARL_Engenharia.html seed_bp.json EARL_Engenharia_BP_teste.html
```

```bash
node teste_bp/e2e_bp.js Contrato_BP_Teste_EARL.xlsx EARL_Engenharia_BP_teste.html ../gerencial/EARL_Gerencial.html saida
```

- **Contrato BP:** os 134 itens com o valor em US$ do Ano 1 (os itens 8-1 e 8-2 entram no cadastro) e início em 22/06/2026.
- **Sonda NS-39:** cadastrada, com base em Macaé.
- **COGS:** os 60 químicos no banco de Químicos (iguais à base do app) e os 102 casing com valor no banco de Casing (e12; antes em Custos (COGS)).
- **27 operações**, uma por coluna do Forecast:
  - **Tipo:** revestimento → Cimentação primária com o tamanho; P&A → Abandono; LCP → Tampão de combate à perda; o resto → Outros, com a descrição da planilha.
  - **Datas:** vinculadas à operação anterior da sonda (e10, pedido do Hugo).
  - **Itens:** PPU, químicas e pessoal (time de embarque × duração).
  - **Risco da planilha** vira o "Risco da receita / COGS".
  - **Concluído** = consumo lançado igual ao previsto, com a data da operação; **Previsto** = só o planejado.
- **Arquivo de teste:**
  - guarda os dados com prefixo próprio (`earlengbp:`) e tem a etiqueta **TESTE BP** com **Reiniciar**, que volta aos dados da planilha;
  - só o contrato BP fica ativo; os outros contratos do EARL vão para "arquivados";
  - os dados guardados no navegador só valem se forem desta mesma versão do teste (marca `testeBP`);
  - sem espaço no navegador, ou com o armazenamento bloqueado, o teste abre com os dados da planilha mesmo assim, e a etiqueta avisa que as alterações não ficam salvas.
- **Verificação:** o `e2e_bp.js` (58 verificações) confere, operação por operação, a receita, a receita final, o COGS, o COGS final, o risco, a situação e o homem-dia contra os totais da própria planilha. Confere também a seção Receita e margem da página inicial (2026 e 2027 somam a planilha, receita por operação, realizado e previsto, meses e quartos), a aba do contrato, uma alteração salva, o navegador sem espaço, dados de versão anterior, o armazenamento bloqueado, o arquivo do gerencial e o EARL Gerencial com esse arquivo, ano a ano (2026 e 2027 somam a planilha), incluindo os cards dos quartos, cada mês da matriz e do gráfico, os itens PPU, a tendência, o período, o quarto e o Excel. Na pasta de saída fica o arquivo do gerencial do BP.

## Contratos reais pré-carregados (pasta `contratos_reais/`)

Um `EARL_Engenharia_<NOME>.html` por planilha de contrato (PA, DC, CE, BW, BDII, Shell), já com os contratos, as
sondas, os químicos/casing com COGS e as operações (previstas e concluídas) das abas **Forecast** e **Banco de dados
contratos**, para compartilhar com outros usuários. Lê os dois formatos de planilha: por colunas (como o BP) e por
linhas (CE e DC, vários contratos no mesmo arquivo). A receita e o COGS de cada operação ficam iguais à RECEITA FINAL e
ao COGS FINAL da planilha (a diferença para quantidade × preço do contrato, como o câmbio do mês já faturado, entra
como ajuste `AJ+`/`AJ−`). As planilhas e os HTML gerados não ficam no repositório. Detalhes e regras em
[`contratos_reais/README.md`](contratos_reais/README.md).

```bash
node contratos_reais/gerar_html.js PA.xlsx PA EARL_Engenharia.html EARL_Engenharia_PA.html rel_PA.json
```

```bash
node contratos_reais/e2e_contratos_reais.js <pasta das planilhas> <pasta dos HTML>
```

## Para quem mexe no código

- `EARL_Engenharia.html` é gerado pelo `patch_engenharia.py` a partir do `EARL_HAL_CMT_115_SIMULACAO.html`, que já vem com o app compilado:

  ```bash
  python3 patch_engenharia.py EARL_HAL_CMT_115_SIMULACAO.html EARL_Engenharia.html <pasta node_modules>
  ```

  A pasta `node_modules` precisa de `react@18.2.0`, `react-dom@18.2.0`, `xlsx@0.18.5` e `jspdf@2.5.1`, as mesmas versões que o EARL carrega do cdnjs. Elas vão embutidas no HTML.
- `eng_inventario.js` tem o inventário das sondas e as exportações separadas (e7): `db.invSondas = [{id, rigId, sonda, ctId, data, por, obs, itens:[{sap, nome, unid, qtd}], criadoEm, atualizadoEm}]`. Cada planilha tem uma aba "Sobre" com o Tipo (`EARL-Eng-Inventario`, `EARL-Eng-Quimicos`, `EARL-Eng-Casing`, `EARL-Eng-Pessoal`), que o Painel de Compras usa para reconhecer o arquivo. As datas são gravadas como datas do Excel. Se mudar as colunas, mude também a leitura no Painel de Compras (`COLUNAS_ENGENHARIA` em `painel_compras_quimicos.html`).
- `eng_quimicos.js` tem o banco de produtos químicos (e6). A base inicial fica no `quimicos_base.json`, gerado pelo `gerar_quimicos_base.py` a partir da aba Forecast; o patch embute a base e a aplica uma vez no `loadDB` (flag `quimBaseV1`).
- `eng_app.js` tem o código novo da e1 (e-mail do handover, aba Handovers, sondas e backup); `eng_contratos.js`, o da e2 em diante (contratos, valores, reajustes, consumo, receita, COGS, risco, arquivo do gerencial e o painel da página inicial). `eng.css` tem o visual novo.
- Cada troca do patch confere que o trecho original existe. Com `CHECAR=1`, o script lista todas as falhas de uma vez.
- Os dados ficam com o prefixo `earleng:` no armazenamento do navegador, para não misturar com outros arquivos do EARL abertos do disco.
- Testes, com o arquivo aberto do disco, a internet bloqueada e o relógio do navegador fixo em 02/11/2026:
  - `node tests/e2e_engenharia.js EARL_Engenharia.html [pasta-das-telas]`: 62 verificações (abertura, handover e e-mail, sondas, exportar e importar substituindo);
  - `node tests/e2e_quimicos.js EARL_Engenharia.html [pasta-das-telas] [planilha do BP]`: 36 verificações (37 com a planilha). Cobre a base, os avisos, baixar a planilha, atualizar juntando e substituindo, a planilha no formato do Forecast, a edição na tela, o histórico, o COGS das operações, exportar e a base aplicada uma vez;
  - `node tests/e2e_espaco.js EARL_Engenharia.html [pasta-das-telas]`: 12 verificações (espaço quase cheio, gravação recusada, apagar simulação antiga, gravação de volta e armazenamento bloqueado);
  - `node tests/e2e_inventario.js EARL_Engenharia.html [pasta-das-telas]`: 54 verificações. Cobre:
    - as sondas do contrato;
    - a primeira contagem, com os produtos previstos, e a seguinte, com a contagem anterior e a diferença;
    - a mesma data substituindo a contagem antiga, e a validação;
    - as planilhas no modelo DAR antigo e no do app;
    - outra sonda, o histórico, excluir e a matriz;
    - as 4 planilhas exportadas, conferidas célula a célula;
    - exportar e importar dados, a recarga da página e a tela do celular.
  - `node tests/e2e_contratos.js EARL_Engenharia.html [pasta-das-telas]`: 75 verificações (contratos, planilhas, reajustes, consumo, receita, juntar dados de outro computador, tela pequena 1366×768, COGS e risco, e a seção Receita e margem com os mesmos números, filtros, quartos e recolher);
  - `node tests/e2e_painel.js EARL_Engenharia.html [pasta-das-telas]`: 23 verificações (e8). Cobre:
    - a seção Receita e margem do Gerencial: valores por ano, cartões dos quartos, gráfico, matriz, altura do quadro, vários quartos com prévia, Shift+clique e o Excel baixado de dentro;
    - arquivar pelo card: some da página inicial, a seção atualiza na hora e o contrato aparece nos arquivados;
    - apagar sem operações;
    - apagar com operações: só com APAGAR, levando as operações e o handover;
    - os contratos apagados não voltam ao reabrir.
- **A seção Receita e margem é o `../gerencial/gerencial.html`**, embutido pelo patch (`ENG_GER_HTML`, num iframe, no modo embutido do Gerencial). Mudou o Gerencial? Gere de novo o `EARL_Engenharia.html`.
- Versão: `EARL_VERSION = 'EARL Forecast e19 (base v115)'`. O teste do fluxo completo com o Gerencial está em `../gerencial/tests/e2e_gerencial.js`.
