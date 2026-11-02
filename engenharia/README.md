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
- **Consumo de PPU:** em cada operação (botão **Σ Consumo PPU** na janela da operação, ou **Σ Consumo** na Lista), o engenheiro lança a data do serviço e a quantidade consumida de cada item. O app mostra o previsto (com **⇩ Copiar previsto**), o saldo disponível, o valor vigente na data e o total em R$ e US$. Ele avisa quando o consumo passa do saldo e quando o item não tem valor cadastrado.
- **Consumo e receita:** aba nova na Engenharia.
  - **Num contrato:** receita em R$ e US$, receita por operação, saldo por item PPU (contratado, consumido, saldo e % usado), receita por mês e a lista das operações que já passaram e estão sem consumo lançado.
  - **Na Visão geral:** receita por contrato.
  - Tem filtro por período do serviço e **⬇ Excel** com as abas Operações, Itens e Lançamentos.
- **Sondas:** botão na barra, para cadastrar sondas. O cadastro já vem com as 41 sondas offshore; as do Nordeste precisam ser cadastradas.
- **Backup e Restaurar:** botões na barra (veja abaixo).

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

## Onde ficam os dados (importante)

Os dados ficam **só no navegador** deste computador. Eles não vão para o servidor nem para outro computador.

- Use **⬇ Backup** de vez em quando: ele baixa um arquivo `.json` com tudo. Guarde-o no OneDrive ou na rede.
- **⬆ Restaurar** carrega um backup e **substitui** os dados do navegador. Serve para trocar de computador ou recuperar o que foi perdido.
- Limpar os dados de navegação do Chrome ou do Edge apaga as operações.

## Para quem mexe no código

- `EARL_Engenharia.html` é gerado pelo `patch_engenharia.py` a partir do `EARL_HAL_CMT_115_SIMULACAO.html`, que já vem com o app compilado:

  ```bash
  python3 patch_engenharia.py EARL_HAL_CMT_115_SIMULACAO.html EARL_Engenharia.html <pasta node_modules>
  ```

  A pasta `node_modules` precisa de `react@18.2.0`, `react-dom@18.2.0`, `xlsx@0.18.5` e `jspdf@2.5.1`, as mesmas versões que o EARL carrega do cdnjs. Elas vão embutidas no HTML.
- `eng_app.js` tem o código novo da e1 (e-mail do handover, aba Handovers, sondas e backup); `eng_contratos.js`, o da e2 (contratos, valores, reajustes, consumo e receita). `eng.css` tem o visual novo.
- Cada troca do patch confere que o trecho original existe. Com `CHECAR=1`, o script lista todas as falhas de uma vez.
- Os dados ficam com o prefixo `earleng:` no armazenamento do navegador, para não misturar com outros arquivos do EARL abertos do disco.
- Testes, com o arquivo aberto do disco, a internet bloqueada e o relógio do navegador fixo em 02/11/2026:
  - `node tests/e2e_engenharia.js EARL_Engenharia.html [pasta-das-telas]`: 61 verificações (abertura, handover e e-mail, sondas, backup);
  - `node tests/e2e_contratos.js EARL_Engenharia.html [pasta-das-telas]`: 45 verificações (contratos, planilhas, reajustes, consumo e receita).
- Versão: `EARL_VERSION = 'EARL Engenharia e2 (base v115)'`.
