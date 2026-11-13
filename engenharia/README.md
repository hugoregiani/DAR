# EARL — Engenharia (avulso)

A Engenharia do EARL separada do resto do sistema, para usar **sem servidor, sem login e sem internet**: é só abrir o arquivo `EARL_Engenharia.html` no Chrome ou no Edge. Ele abre direto na Engenharia, com todos os contratos (Nordeste e Sudeste juntos).

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
- **Página inicial: Receita e margem** (e8). Logo abaixo do título fica a mesma seção "Receita e margem" do **EARL Gerencial**, com os dados desta Engenharia (todos os contratos não arquivados):
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
- **⬇ Arquivo do gerencial:** botão na barra (e na aba Consumo e receita). O engenheiro marca os contratos sob a responsabilidade dele e gera um `.json` com os contratos (itens, saldos, valores, reajustes) e as operações (previsto com valores, consumo lançado, receita, COGS e risco). Esse arquivo vai para a pasta do SharePoint do gerencial e é lido pelo **EARL Gerencial** (`../gerencial`).
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
- Versão: `EARL_VERSION = 'EARL Engenharia e13 (base v115)'`. O teste do fluxo completo com o Gerencial está em `../gerencial/tests/e2e_gerencial.js`.
