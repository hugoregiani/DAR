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
- **Página inicial: Receita e COGS.** Logo abaixo do título, um painel com a receita em US$ e em R$, o COGS, a margem e o número de operações, com filtros por **ano, mês, contrato, cliente e situação** (realizado + previsto, só realizado ou só previsto). Tem a tabela **por mês** e a **por contrato**; clicar no contrato abre a aba "Consumo e receita" dele. **Recolher** esconde o painel.
  - **Realizado:** operação com consumo lançado, pelo valor do contrato na data do serviço.
  - **Previsto:** operação ainda sem consumo, pelos itens PPU previstos × valor do contrato na data da operação. O COGS vem das químicas e do casing previstos.
- **Risco da receita / COGS (%):** campo na janela da operação (seção 2). A receita e o COGS da operação contam × (1 − risco). Com **0%** contam inteiros; com **100%** a operação continua mapeada (Gantt, lista, handover), mas **fica fora da receita e do COGS**. A Lista mostra a etiqueta "risco N%". Esse campo é diferente do "Risco de acontecer" da contingência.
- **Custos (COGS):** botão na tela de Contratos. Custo unitário de cada química e casing equipment, pelo SAP, em US$ e/ou R$. Pode ser digitado ou carregado de planilha (colunas `SAP`, `Produto`, `Unidade`, `COGS US$` e/ou `COGS R$`; uma coluna só "COGS" vale como US$). O consumo da operação e a aba "Consumo e receita" mostram COGS e margem.
- **⬇ Arquivo do gerencial:** botão na barra (e na aba Consumo e receita). O engenheiro marca os contratos sob a responsabilidade dele e gera um `.json` com os contratos (itens, saldos, valores, reajustes) e as operações (previsto com valores, consumo lançado, receita, COGS e risco). Esse arquivo vai para a pasta do SharePoint do gerencial e é lido pelo **EARL Gerencial** (`../gerencial`).
- **Consumo e receita:** aba nova na Engenharia.
  - **Num contrato:** receita em R$ e US$, receita por operação, saldo por item PPU (contratado, consumido, saldo e % usado), receita por mês e a lista das operações que já passaram e estão sem consumo lançado.
  - **Na Visão geral:** receita por contrato.
  - Tem filtro por período do serviço e **⬇ Excel** com as abas Operações, Itens e Lançamentos.
- **Sondas:** botão na barra, para cadastrar sondas. O cadastro já vem com as 41 sondas offshore; as do Nordeste precisam ser cadastradas.
- **Exportar dados e Importar dados:** botões na barra, para levar tudo de um computador para outro (veja abaixo).

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

1. No computador de origem, clique em **⬇ Exportar dados**. Baixa um arquivo `EARL_Engenharia_dados_AAAA-MM-DD_HHhMM.json` com **tudo**: contratos, itens, valores, reajustes, operações, consumos, handovers, destinatários dos e-mails, sondas e templates.
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
- **COGS:** a tabela de químicos e casing da planilha (162 linhas).
- **27 operações**, uma por coluna do Forecast:
  - **Tipo:** revestimento → Cimentação primária com o tamanho; P&A → Abandono; LCP → Tampão de combate à perda; o resto → Outros, com a descrição da planilha.
  - **Datas:** fixas, sem acompanhar a operação anterior da sonda.
  - **Itens:** PPU, químicas e pessoal (time de embarque × duração).
  - **Risco da planilha** vira o "Risco da receita / COGS".
  - **Concluído** = consumo lançado igual ao previsto, com a data da operação; **Previsto** = só o planejado.
- **Arquivo de teste:** o `EARL_Engenharia_BP_teste.html` guarda os dados com prefixo próprio (`earlengbp:`) e tem a etiqueta **TESTE BP** com **Reiniciar**, que volta aos dados da planilha.
- **Verificação:** o `e2e_bp.js` (31 verificações) confere, operação por operação, a receita, a receita final, o COGS, o COGS final, o risco, a situação e o homem-dia contra os totais da própria planilha. Confere também o painel da página inicial, a aba do contrato, o arquivo do gerencial e o EARL Gerencial com esse arquivo, incluindo o Excel. Na pasta de saída fica o arquivo do gerencial do BP.

## Para quem mexe no código

- `EARL_Engenharia.html` é gerado pelo `patch_engenharia.py` a partir do `EARL_HAL_CMT_115_SIMULACAO.html`, que já vem com o app compilado:

  ```bash
  python3 patch_engenharia.py EARL_HAL_CMT_115_SIMULACAO.html EARL_Engenharia.html <pasta node_modules>
  ```

  A pasta `node_modules` precisa de `react@18.2.0`, `react-dom@18.2.0`, `xlsx@0.18.5` e `jspdf@2.5.1`, as mesmas versões que o EARL carrega do cdnjs. Elas vão embutidas no HTML.
- `eng_app.js` tem o código novo da e1 (e-mail do handover, aba Handovers, sondas e backup); `eng_contratos.js`, o da e2 em diante (contratos, valores, reajustes, consumo, receita, COGS, risco, arquivo do gerencial e o painel da página inicial). `eng.css` tem o visual novo.
- Cada troca do patch confere que o trecho original existe. Com `CHECAR=1`, o script lista todas as falhas de uma vez.
- Os dados ficam com o prefixo `earleng:` no armazenamento do navegador, para não misturar com outros arquivos do EARL abertos do disco.
- Testes, com o arquivo aberto do disco, a internet bloqueada e o relógio do navegador fixo em 02/11/2026:
  - `node tests/e2e_engenharia.js EARL_Engenharia.html [pasta-das-telas]`: 62 verificações (abertura, handover e e-mail, sondas, exportar e importar substituindo);
  - `node tests/e2e_contratos.js EARL_Engenharia.html [pasta-das-telas]`: 75 verificações (contratos, planilhas, reajustes, consumo, receita, juntar dados de outro computador, tela pequena 1366×768, COGS e risco, e o painel Receita e COGS com os filtros).
- Versão: `EARL_VERSION = 'EARL Engenharia e5 (base v115)'`. O teste do fluxo completo com o Gerencial está em `../gerencial/tests/e2e_gerencial.js`.
