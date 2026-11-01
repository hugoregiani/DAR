# EARL — Engenharia (avulso)

A Engenharia do EARL separada do resto do sistema, para usar **sem servidor, sem login e sem internet**: é só abrir o arquivo `EARL_Engenharia.html` no Chrome ou no Edge.

## O que tem

- **Planejamento de operações**, igual ao EARL v115: escolha do contrato, Visão geral, Gantt, Calendário, Lista, templates, previsão de recursos (PPU, químicas, casing, pessoal e equipamentos) e contingência.
- **Handover por e-mail.** No EARL completo, o handover ia para a Coordenação e depois para a Logística. Aqui, o último passo do handover gera um **arquivo de e-mail (.eml)**:
  - **Assunto padronizado:** `HANDOVER - SONDA - OPERAÇÃO (POÇO) - SO 123456789 - VIDA H123456`. Bombeio e acidificação, que não têm VIDA, saem com `VIDA N/A`. Quando o handover é reenviado, o assunto ganha `- REV 2`, `- REV 3` e assim por diante.
  - **Corpo:** identificação (cliente, contrato, sonda, poço, operação, data, duração, SO, WBS, VIDA, contingência), químicas (previsto, backup, necessidade, solicitado, embalagem e lotes), casing equipment, equipamentos, pessoal (embarques no offshore; funções no onshore), itens PPU previstos, observações da operação e comentários do handover, com a assinatura do engenheiro.
  - **Destinatários:** o engenheiro marca quem vai em **Para** e em **Cc**. A lista fica salva para os próximos handovers e vale para as duas regiões.
  - O `.eml` abre no **Outlook** como uma mensagem pronta para enviar. Confira e clique em **Enviar**.
  - A aba **Handovers** guarda os e-mails gerados. Dali dá para baixar o mesmo e-mail de novo ou abrir o handover para gerar uma nova versão.
- **Sondas:** botão na barra, para cadastrar as sondas da região. O Nordeste começa sem nenhuma; o Sudeste já vem com as 41 sondas offshore do cadastro.
- **Backup e Restaurar:** botões na barra (veja abaixo).

## O que não tem

Não tem login, Coordenação, Logística, Pessoal, Equipamentos, Operações, Sondas (a página da sonda), Análises, Ajustes nem sincronização com SharePoint. A simulação também ficou de fora: o arquivo começa só com o cadastro do EARL (contratos, sondas offshore, químicas, casing, pessoas e equipamentos), sem as operações fictícias.

## Como usar

1. Abra `EARL_Engenharia.html` com dois cliques (Chrome ou Edge).
2. Escolha **Nordeste** ou **Sudeste**. A escolha fica salva.
3. Escolha o contrato e use **+ Nova operação**.
4. Na operação, clique em **Enviar Handover →**, confira a SO e o VIDA e clique em **Continuar →**.
5. Revise os itens (backup, solicitado, lotes, comentários) e clique em **Continuar para o e-mail →**.
6. Marque os destinatários (ou adicione e-mails), escreva seu nome e clique em **⬇ Gerar e-mail (.eml)**.
7. Abra o arquivo baixado: ele abre no Outlook. Confira e clique em **Enviar**.

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
- `eng_app.js` tem o código novo (e-mail do handover, aba Handovers, sondas e backup). `eng.css` tem o visual novo.
- Cada troca do patch confere que o trecho original existe. Com `CHECAR=1`, o script lista todas as falhas de uma vez.
- Os dados ficam com o prefixo `earleng:` no armazenamento do navegador, para não misturar com outros arquivos do EARL abertos do disco.
- Testes: `node tests/e2e_engenharia.js EARL_Engenharia.html [pasta-das-telas]`. São 58 verificações. O arquivo é aberto do disco com a internet bloqueada, e o teste lê o `.eml` gerado (cabeçalhos e corpo).
- Versão: `EARL_VERSION = 'EARL Engenharia e1 (base v115)'`.
