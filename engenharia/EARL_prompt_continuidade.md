# EARL: prompt de continuidade

> Cole este arquivo no início de uma nova conversa com o Claude e anexe a versão mais recente do `index.html` do EARL. Para continuar a unificação, anexe também o `hub_completo (N).html` do Hugo.

---

## 1. O que é o projeto

**EARL** (Execution · Alignment · Reporting · Lifecycle) é o sistema da **Halliburton Cementing Brasil** para a operação de cimentação. Cobre:
- o planejamento das operações pela engenharia;
- a mobilização e execução no campo (supervisor assume a operação, equipe, equipamentos e químicas);
- encerramento (HI, job-log, FARPACK), sondas e DAR, escalas, químicas, inventário, granéis e HCl;
- análises e um banco de dados central de contratos e PPU, clientes, pessoas, equipamentos, sondas e poços.

Duas regiões usam **o mesmo processo e o mesmo menu de apps**, cada uma com seu recorte de dados ("fotos" diferentes do mesmo app):
- **Nordeste** (`hubLocation` = `'nordeste'`/`'nne'`, `loc:'nne'`): Catu, Mossoró e Urucu.
- **Sudeste** (`hubLocation` = `'macae'`, `loc:'macae'`): Macaé offshore. Usa o mesmo menu do Nordeste. O antigo app **"Painéis offshore"** (`renderMacaeApp`, `mainTab 'mac'`, cartões do BD II do Hugo) **foi apagado na v90** a pedido do usuário, por redundância: sondas, DAR, logística e embarques já estão em Sondas, Logística e Pessoal. O código de `renderMacaeApp` ficou no arquivo, mas sem tile e sem rota (`safeTab 'mac'` volta ao menu).
- Há ainda o hub **Brasil (consolidado)**, só de consulta.

Está em andamento uma **unificação**: trazer as funcionalidades do app do Hugo (`hub_completo (N).html`) para dentro do EARL e chegar a um único aplicativo.

Dono e interlocutor: Camillo Guerrera (coordenador, Halliburton). Linguagem do app e da conversa: **português (BR)**. O usuário não é programador. Instruções de terminal devem ser passo a passo e prontas para colar.

---

## 2. Arquitetura (arquivo único)

- **Um único `index.html`** (~2,7 MB). Tem CSS no `<style>` e todo o app React num único `<script type="text/babel">`, compilado **no navegador** pelo Babel standalone.
- Bibliotecas por CDN (cdnjs): React 18.2 UMD, ReactDOM, `@babel/standalone` 7.23.2, xlsx 0.18.5, jsPDF 2.5.1, JSZip 3.10.1 e pdf-lib 1.17.1. Desde a v91, o pdf.js 3.11.174 (`pdf.min.js` + `pdf.worker.min.js`) é carregado sob demanda (`ensurePdfJs`) só quando alguém importa um SITOP em PDF; o worker roda na própria página, porque o CSP não aceita worker de outro domínio. O MSAL 3.7.1 vem de `alcdn.msauth.net`.
- **Persistência:** `localStorage`. O banco fica em `hal_cmt_db_v1` (`DB_KEY`) e as mobilizações num `MOB_KEY`. Há log de alterações e snapshots. A sincronização opcional é via Microsoft Graph (SharePoint/OneDrive), configurada em "Configurar sync".
- **Migração de dados:** a função `migrateDB(d)` roda em toda carga. Cria coleções novas, aplica sementes e faz importações únicas protegidas por flags (`casingSeedV1`, `hugoImportV1`), para que o que o usuário apagar não volte.
- **Tradução PT/EN/ES:** dicionários `I18N_EN` e `I18N_ES` (texto PT exato → tradução), aplicados por um tradutor de DOM com MutationObserver. Para um texto novo ficar traduzível, ele precisa ser um nó de texto inteiro igual à chave. Strings concatenadas não traduzem.
- **Navegação:** `mainTab` (`home`, `plan`, `ops`, `rig`, `sl`, `chem`, `equip`, `db`…) e `PAGE_META` define os rótulos. O Banco de Dados é o tile **"Ajustes"** (`mainTab==='db'`, com abas em `dbTab`). Desde a v89, **Ajustes existe só no hub Brasil** (um só para o EARL inteiro, com o recorte Brasil / Nordeste / Sudeste no topo); atalhos das frentes usam `irParaAjustes(tab)`, que troca para o hub Brasil.
- **Contratos:** `db.contratos[] = {id, clientName, name, numero, kind, bases[], items:[{ref,desc,unit,saldoIni,base}], aditivos[]}`. A semente está em `CONTRATOS_SEED`. `ctrItensNaData(ct, data)` devolve as linhas PPU vigentes, já com os aditivos.
- **Login:** Microsoft (Entra ID) via MSAL popup, ou login local de equipe, ou senha de admin (veja `ADMIN_PASSWORD` no código).
- **Versão:** constante `EARL_VERSION` (atual: `EARL v115`).
- **HTML de simulação com o app compilado:** desde a v112 o `EARL_HAL_CMT_NNN_SIMULACAO.html` vem com o JSX já compilado. Se só ele for enviado, a mudança vai por patch no código compilado (como na v113, v114 e v115, um `vNNN/patch_vNNN.py` por versão, cada um partindo do HTML da anterior) e precisa ser refeita depois no `index.html`.

### App do Hugo (`hub_completo (N).html`)
É um hub HTML que embute **dois apps em base64**:
- `FORECAST_B64`: contratos, receita, operações, químicos/casing/pessoal e price list.
- `DAR_B64`: logística, sondas, equipamentos e um banco de dados com `IMPORTED_BANCO_SEED`: casing (108), spare (75), cimento, commander (86), equipMovel (11), pessoal (180), sondas (41), localizações e tipos de contentor.

Para ler esses apps, decodifique o base64 com Python. O app de forecast traz o seletor `cxDropdown` ("☑ Selecionar itens"), que serviu de modelo para o seletor de recursos do EARL.

---

## 3. Deploy (Azure Static Web Apps)

- Site: `https://mango-ground-06534ae10.3.azurestaticapps.net`
- Pasta no laptop: `C:\deploy-root\earl-deploy\`, com **apenas** `index.html` e `staticwebapp.config.json`.
- O pacote vai como `earl-deploy-NN.zip`, contendo a pasta `earl-deploy/`.
- Comando, a partir de `C:\deploy-root` (o `swa` **não aceita** rodar de dentro da própria pasta publicada):

```powershell
$token = "<DEPLOYMENT TOKEN>"   # Portal Azure → Static Web App → Manage deployment token
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"   # proxy corporativo com inspeção TLS
Expand-Archive -Path "$env:USERPROFILE\Downloads\earl-deploy-NN.zip" -DestinationPath "C:\deploy-root" -Force
cd C:\deploy-root
Get-Content .\earl-deploy\staticwebapp.config.json -Raw | ConvertFrom-Json | Out-Null; "config OK"
swa deploy ./earl-deploy --deployment-token $token --env production
```

Armadilhas já resolvidas:
- O `staticwebapp.config.json` não aceita chaves extras (comentários `_xxx` quebram o schema).
- Não pode ter BOM (UTF-8 sem BOM). O Bloco de Notas e o `Set-Content -Encoding utf8` do PowerShell 5 colocam BOM. Use `[System.IO.File]::WriteAllText(..., [System.Text.UTF8Encoding]::new($false))`.
- O npm precisou de `strict-ssl false` na instalação, por causa do proxy corporativo.
- O laptop é corporativo e o Notepad não abre via linha de comando. Edite pelo Explorador de Arquivos.
- Nunca deixe outros arquivos (ex.: `erro.txt`) na pasta publicada: eles vão a público.

O CSP está em `globalHeaders`. Ele precisa de `'unsafe-inline'` e `'unsafe-eval'` em `script-src` (JSX compilado no navegador) e de `data:`, `blob:`, Graph, login.microsoftonline, cdnjs e `https://*.logic.azure.com` em `connect-src`. Se surgir webhook de outro domínio (ex.: n8n), acrescente o domínio ao `connect-src`.

**Fase B pendente:** App Registration no Entra ID, plataforma **SPA**. O redirect URI é a URL do site. Permissões delegadas: `User.Read`, `Files.ReadWrite.All`, `Sites.ReadWrite.All` e `Mail.Send`, com admin consent. Os Tenant ID, Client ID e URL do site SharePoint ainda podem ser embutidos em `DEFAULT_CFG`, para ninguém precisar digitar.

---

## 4-E. Desmembramento: EARL Engenharia (avulso) e1 a e6, EARL Gerencial g2–g7 e teste BP — pasta `engenharia/` do repositório `hugoregiani/DAR`

Pedido do Hugo (01/11/2026): como o EARL ainda não pode ser usado online, separar a **Engenharia** num HTML próprio, **sem login**, e trocar o envio do handover (que ia para a Coordenação/Logística) por um **e-mail .eml** gerado no app. Parte do `EARL_HAL_CMT_115_SIMULACAO.html` (compilado) pelo `engenharia/patch_engenharia.py`, que insere `engenharia/eng_app.js` (código novo, dentro do `App`, antes de `renderHandover`) e `engenharia/eng.css`. Saída: `engenharia/EARL_Engenharia.html` (~8,4 MB). Versão: `EARL_VERSION = 'EARL Engenharia e1 (base v115)'`.

- **Casca:** sai a simulação (dados, selo, "Reiniciar"); entra um armazenamento com prefixo `earleng:` (localStorage, sessionStorage e IndexedDB). O banco começa da semente do EARL (16 contratos, 41 sondas offshore, 116 químicas, 101 casing, 183 pessoas, 264 equipamentos; **nenhuma sonda no Nordeste**). React 18.2, ReactDOM, xlsx 0.18.5 e jsPDF 2.5.1 vão **embutidos** (abre do disco sem internet; os `/<!--` das regex do xlsx viram `/<\!--`).
- **Sem login:** `needLogin = false`; sem "Verificando acesso"; sem sino de pendências, "Configurar sync", Admin e o aviso "Sem conexão com o servidor" a cada alteração.
- **Só Engenharia:** `mainTab` é a constante `'plan'`; sem região, a escolha da região (só Nordeste e Sudeste; `'brasil'` salvo é ignorado). Trocar de região zera `planCt`/`planDraft`. Voltar: contrato → página inicial da Engenharia → escolha da região. `irParaAjustes` não faz nada. A cobertura de materiais do Gantt (`cobPj`) fica vazia e a legenda "Material" escondida. O anel da Visão geral passou a "% com handover enviado".
- **Barra:** no lugar do Admin, `renderEngTools()` = **Sondas** (janela com o `renderDBRigs()` do Ajustes; `renderRigForm` por cima), **⬇ Backup** (`EARL_Engenharia_backup_AAAA-MM-DD.json` com o `db`) e **⬆ Restaurar** (confere `people`/`rigs`, pede confirmação, grava com `saveDB` e recarrega).
- **Handover → e-mail:** status novo `HO_ST.email` ("Enviado por e-mail"). O rodapé dos itens virou "Continuar para o e-mail →" (`step:'mail'` → `renderHoMail`). `hoMontarRec` monta o registro (mesmo formato do EARL, com `operacoes[]` trazendo tipo, revestimento, data, duração, VIDA, notas, PPU e equipe, para o e-mail poder ser refeito igual); `hoEmailMontar(rec)` devolve `{assunto, arquivo, html, text}`; `gerarEmailHandover` baixa o .eml (`buildEmlBlob`, com `X-Unsent: 1`) e grava `db.handovers` (`versao` +1 a cada envio, `email {em, versao, para, cc, assunto, arquivo, por}`, `envios[]`), `plannedJobs[].handoverId/hoEmailEm/hoEmailVersao` (a operação **continua PLANEJADA e editável**) e `db.hoMail {emails, to, cc, nome}`. Log na operação: "Handover enviado por e-mail" / "reenviado por e-mail (versão N)".
  - Assunto: `HANDOVER - SONDA - TIPO REVEST. (POÇO) [+ N operações] - SO … - VIDA … [- REV N]`, em maiúsculas; sem VIDA → `VIDA N/A`. Arquivo: o assunto sem acentos (`asciiName(fnSafe(…))` + `.eml`). Com acento no nome, o Chromium do teste salvava como "download".
  - Corpo (`mailTable`/`mailH2`/`mailP`): identificação, operações incluídas, químicas, casing, equipamentos, pessoal (embarques offshore / funções onshore), itens PPU, observações e comentários, assinatura (`hoMail.nome`).
  - Janela do e-mail: assunto e arquivo, contagens, destinatários com Para/Cc e × (a lista salva na hora), "outro e-mail" + "＋ Para"/"＋ Cc", "Seu nome", pré-visualização (iframe `sandbox`). Sem "Para" não gera.
  - Handover já enviado abre editável (`readOnly` falso para `'email'`), com a faixa `hoEmailBanner` (versão, data, destinatários, "⬇ Baixar o e-mail de novo"). Disponibilidade também sai por handover (sem exigir pessoal; o HI é do campo).
  - Aba **Handovers** = `renderHoEmails` (cartões com assunto, Para/Cc, versão, "⬇ Baixar o e-mail" e "Revisar / nova versão →"). Lista: selo `hoEmailTag` "✉ handover vN" e botão "✉ Handover vN →".
- **Testes:** `engenharia/tests/e2e_engenharia.js` (58 verificações; abre por `file://` com a internet bloqueada): sem login, só Nordeste/Sudeste, operação offshore com PPU/químicas/casing/pessoal/equipamentos, handover → e-mail (assunto, nome do arquivo, `X-Unsent`, Para/Cc, corpo HTML e texto, 300 + 100% = 600), aba Handovers e baixar de novo, versão 2 (REV 2, destinatários salvos, tirar da lista), persistência e prefixo, backup e restaurar, sonda nova no Nordeste + handover onshore de bombeio (VIDA N/A), Voltar, celular e console sem erro.
- **Pendências:** os textos novos ainda não estão em `I18N_EN`/`I18N_ES`; a lista de destinatários começa vazia (sem DL padrão); contratos e linhas PPU só vêm da semente, porque o Ajustes não veio junto (para incluir um contrato, use o EARL completo e restaure o backup); a ida de volta ao EARL completo é pelo backup `.json` (mesmo formato de `hal_cmt_db_v1`).

### e2 (02/11/2026): Engenharia direto, sem região, e Contratos com valores, reajustes, consumo e receita

Pedido do Hugo, feito sobre a e1. O código novo fica em `engenharia/eng_contratos.js`, inserido junto com o `eng_app.js`. Versão: `EARL Engenharia e2 (base v115)`.

- **Sem a escolha de região:** `hubLocation` é sempre `'brasil'` (a inicialização devolve `'brasil'` e `setLocation` grava `'brasil'`), então a Engenharia mostra todos os contratos e operações. A trilha fica só com Engenharia / contrato. `newPlanDraft` nasce com `loc:''`; `savePlanned` grava `loc` pela base da sonda (`regiaoDaBase`), senão pelo contrato (`ctrRegioes`). O offshore do template vem do contrato. A janela Sondas abre na aba onshore se houver sonda onshore; senão, na offshore. A aba Handovers lista todas.
- **Modelo (compatível com o EARL):**
  - `db.contratos[].items[]` ganham `brl` e `usd` (valor unitário inicial);
  - o contrato ganha `inicio` e `reajustes[] = {id, desde, obs, em, por, precos: {ref: {brl?, usd?}}}`;
  - `plannedJobs[].ppuCons = {data, linhas: [{ref, desc, unit, qty}], em, por}`.
  - O preço numa data é `ctPreco(ct, ref, data)`: o valor inicial e, por cima, os reajustes com `desde ≤ data`, em ordem, item a item e moeda a moeda.
  - O saldo usa `ctrItensNaData` (com os aditivos do EARL) menos o consumo lançado em todas as operações não canceladas do contrato (`engConsDoCt`).
  - A receita de cada linha é a quantidade × o preço na data do serviço.
  - `savePlanned` preserva o `ppuCons` gravado: só a janela de consumo mexe nele.
- **Janela Contratos** (`renderEngContratos`; botão "Contratos" na barra e na aba de receita):
  - **Lista:** busca e arquivados.
  - **Editor:** cliente (datalist; cria o cliente com `ensureClientIn`), nome, número, tipo, início da vigência e bases; tabela de itens editável, com Consumido e Disponível e, havendo reajuste, "Vigente hoje"; "＋ Linha"; salvar, arquivar, e excluir só quando não há operação.
  - **Proteção:** o código do item usado em operação (`engRefsUsados`: `ppuNeeds` ou `ppuCons`) fica só leitura e o item não pode ser tirado.
  - **Planilha** (`engLerPlanilha` + `engPlanLinhas`): xlsx, xls ou CSV.
    - O cabeçalho é reconhecido pelo nome da coluna (Item/Ref/Código, Descrição, Unidade, Saldo/Quantidade, Valor R$/Preço/BRL, US$/USD/Dólar); sem cabeçalho, vale a ordem A a F.
    - O CSV é lido como texto: UTF-8 e, se falhar, Windows-1252, com `raw:true`, porque o SheetJS leria "1.500,00" como 1,5 e "1.10" como 1,1.
    - Os números passam por `engNum`, que aceita "1.234,56", "1,234.56" e "1.000" (milhar).
    - Os códigos usam o texto formatado da célula.
    - Modos: atualizar e acrescentar, ou substituir a lista (os itens usados em operações ficam).
    - "⬇ Baixar planilha / Modelo" gera o xlsx com o mesmo cabeçalho.
  - **Reajuste** (`renderEngReaj`): data "a partir de" (sem repetir a data de outro reajuste), observação, "% R$" e "% US$" aplicados sobre o valor vigente na data, valores linha a linha ou carregados da planilha (só os itens do contrato), coluna de variação e aviso de quantas operações com consumo a partir da data mudam de receita. O reajuste é salvo na hora junto com o contrato, e o × apaga com confirmação.
- **Consumo de PPU** (`abrirEngCons` / `renderEngCons`):
  - **Onde abre:** botão "Σ Consumo PPU" no rodapé da operação, "Σ Consumo" na Lista e botões na aba de receita.
  - **Data do serviço:** o padrão é a data da operação, e os preços valem nessa data.
  - **Linhas:** começam com os itens PPU previstos; "⇩ Copiar previsto"; "＋ Acrescentar item do contrato…".
  - **Colunas:** previsto, consumido, disponível (contratado menos o consumo das outras operações), valor R$/US$ e total.
  - **Avisos:** acima do saldo (salva mesmo assim) e item sem valor (fica fora da receita).
  - **Gravação:** salvar ou "Apagar consumo", com log na operação ("Consumo de PPU lançado/alterado/apagado").
  - **Onde aparece:** selo "Σ R$ …" na Lista (`engConsTag`) e faixa na janela da operação (`engConsBanner`).
- **Aba "Consumo e receita"** (`planView 'rec'`, `renderEngReceita`; respeita os filtros da barra):
  - **Barra:** período do serviço (de/até) e "⬇ Excel" (abas Operações, Itens e Lançamentos).
  - **Indicadores:** receita em R$, em US$, operações com consumo (e quantas já passaram sem consumo) e lançamentos sem valor.
  - **Num contrato:** receita por operação, saldo por item PPU (contratado, consumido, saldo, barra de % usado, valor vigente e receita no período) e receita por mês.
  - **Na Visão geral:** receita por contrato (abre o contrato), por operação e por mês.
  - A página inicial sem contrato abre a janela Contratos.
- **Celular:** a barra de abas da Engenharia rola dentro dela (`.toolbar>.db-tabs{max-width:100%}`) e a trilha não mostra o separador sozinho.
- **Testes:**
  - O `tests/harness.js` aceita `hoje` (relógio do navegador fixo).
  - O relógio fixo do Playwright tenta rodar um script na pré-visualização do e-mail (iframe com `sandbox`); esse aviso é ignorado.
  - Com o relógio fixo, as transições de CSS não andam: um botão que acabou de ser habilitado aparece cinza na foto, mas funciona.
  - `tests/e2e_engenharia.js` (61) e `tests/e2e_contratos.js` (45): lista, contrato novo por xlsx (com "1.10", "1.000" e "250,50") e por CSV Windows-1252 com ";", linha sem código, 10% em R$, reajuste em US$ pela planilha, valor vigente antes e depois do reajuste, consumo com previsto copiado e item acrescentado (R$ 8.705,00 / US$ 1.615,00), aviso acima do saldo, receita do contrato (R$ 17.395,00 / US$ 3.095,00), saldo por item, por mês, período, Excel, aviso de reajuste retroativo, trava do código, planilha baixada, consumo preservado ao salvar a operação, Visão geral, apagar consumo e persistência.
- **Pendências:** os textos novos não estão em EN/ES; não há câmbio (R$ e US$ são valores independentes do contrato, sem conversão); o consumo é lançado à mão (o HI de campo não existe nesta versão); medição/boletim por período e por contrato ficam para depois, se pedirem.

### e3 (02/11/2026): itens PPU visíveis em tela menor, e exportar/importar dados para outro computador

Retorno do Hugo sobre a e2, com 3 fotos:
- **Itens PPU sumindo:** num contrato existente e no contrato novo, as linhas não apareciam. Causa: o `.modal` é flex em coluna com `max-height`, e a `.ec-itens-wrap` (`overflow:auto`) encolhia até sumir quando faltava altura (22 px em 1366×768; zero no Windows dele).
  - Correção: `.ec-modal>*, .hm-modal>*, .eng-sondas-modal>*, .ec-imp-dados>*{flex-shrink:0}`, com a tabela em `min-height:180px` e `max-height:60vh`; quem rola é a janela.
  - O rodapé do contrato, do reajuste e do consumo (`.ec-modal>.ec-foot`) ficou fixo no fim da janela.
  - "＋ Linha" (`addLinha2`) rola até a linha nova e põe o foco no código.
- **Exportar dados / Importar dados** (no lugar de Backup / Restaurar):
  - **Exportar:** `EARL_Engenharia_dados_AAAA-MM-DD_HHhMM.json` = `{app, versao, geradoEm, por, resumo, db}`.
  - **Importar** (`engImportarArquivo` → janela `renderEngImpDados`, renderizada na árvore principal porque a barra de vidro prende `position:fixed`): mostra a tabela "neste computador × no arquivo × depois de juntar" (contratos, itens com valor, reajustes, operações, consumos, handovers, sondas e templates) e oferece **Juntar** ou **Substituir** (com confirmação). As duas opções gravam com `saveDB` e recarregam.
  - **Juntar** (`engMesclarDb`): listas cujos itens têm `id` são unidas; no mesmo `id` fica o de maior `engMarca` (o maior entre `updatedAt`, `atualizadoEm`, `criadoEm`, `createdAt`, `ppuCons.em`, `email.em` e os `log[].em`). `hoMail.emails` também é unido. Chaves que só existem no arquivo entram; as demais ficam como estão. Apagados voltam (está dito na tela).
  - Para isso, o contrato salvo ganhou `atualizadoEm` e a sonda salva (`saveRig`), `updatedAt`.
- **Testes:**
  - `e2e_engenharia` (62): exportar → apagar → importar → Substituir.
  - `e2e_contratos` (55) ganhou:
    - outro computador: exporta, cria uma operação noutro navegador e junta (3 operações, consumo, contrato com valores e reajustes, mesma receita);
    - tela 1366×768: tabela de 132 itens visível, rodapé visível, "＋ Linha" com foco e campos visíveis, contrato novo com 3 linhas.
- Versão: `EARL Engenharia e3 (base v115)`.

### e4 + EARL Gerencial g1 (02/11/2026): consumo completo da operação, arquivo do gerencial e app gerencial

Pedido do Hugo: cada engenheiro cuida de um tipo de contrato, extrai as informações para uma pasta no SharePoint, e um app gerencial carrega os arquivos de todos e mostra o consolidado (receita, consumo de PPU, químicas, casing equipment e pessoal).

- **Consumo completo** (`abrirEngCons` / `renderEngCons` reescritos; `ppuCons` mantém o nome e ganha `quim[{sap,name,unit,qty}]`, `cas[...]` e `pes[{funcao,pessoas,dias,hd}]`):
  - **Janela:** 4 seções. Itens PPU (receita, como antes), Químicas (catálogo `matCatalogo('quimico')`), Casing equipment (`matCatalogo('casing')`) e Pessoal (funções de `FUNCOES_EQUIPE` + as previstas; homem-dia = pessoas × dias).
  - **Previsto:** cada seção começa com o previsto da operação (`chems`, `casingNeeds`, `peopleNeeds`). "⇩ Copiar previsto" preenche as 4 seções, e os dias do pessoal vêm da duração da operação.
  - **Gravação:** salva se qualquer seção tiver quantidade.
  - **Onde aparece:** a faixa da operação resume as 4 partes; o log diz "Consumo da operação lançado/alterado/apagado". Uma operação com consumo só de materiais não conta como "sem consumo".
- **Arquivo do gerencial** (`engPacoteGerencial`, `abrirEngGer`, `renderEngGer`, `engGerar`; botão "⬇ Arquivo do gerencial" na barra e na aba de receita):
  - **Janela:** marca os contratos (o padrão é a última escolha, guardada em `db.gerCfg`, ou os contratos que têm operações) e o nome do engenheiro (`hoMail.nome`).
  - **Arquivo:** `EARL_Gerencial_<contrato ou engenheiro>_AAAA-MM-DD_HHhMM.json` = `{tipo:'EARL-Gerencial', formato:1, app, geradoEm, por, contratos[], operacoes[]}`.
  - **Conteúdo:** itens com o valor vigente hoje e o inicial; operações (as do contrato pelo `ctDoJob`, sem as canceladas) com previsto, realizado (PPU com valor na data do serviço) e receita.
- **EARL Gerencial g1** (pasta `gerencial/`):
  - **Arquivos:** `gerencial.html` (JavaScript puro) + `build_gerencial.py`, que gera o `EARL_Gerencial.html` (~1 MB) com xlsx, jszip e os logos do EARL embutidos.
  - **Carga:**
    - várias `.json`, `.zip` do SharePoint, pasta (`webkitdirectory`) ou arrastar;
    - ignora o que não é `EARL-Gerencial`, e não duplica (assinatura `geradoEm|por|contratos`);
    - para cada contrato vale o arquivo mais novo (`consolidar`).
  - **Filtros:** período do serviço, cliente, contrato, região e tipo.
  - **Indicadores:** receita R$/US$, operações com consumo, homem-dia e lançamentos sem valor.
  - **Abas:** Contratos (receita e uso do contrato em valor), Receita (mês, cliente, região), Itens PPU (saldo e % usado), Químicas, Casing, Pessoal (previsto × lançado), Operações (busca) e Arquivos (em uso / substituído, ×).
  - **Saída e dados:** Excel com 8 abas; os dados ficam em `localStorage` com prefixo `earlger:`.
- **Testes:** `gerencial/tests/e2e_gerencial.js` (30): engenheiro A (contrato por planilha, operação com PPU, química, casing e pessoal, 2 arquivos), engenheiro B (PBR Land com valor), Gerencial com 3 arquivos (receita R$ 8.200,00 / US$ 1.540,00, o arquivo mais novo vale), PPU, químicas, casing, pessoal, mês e cliente, operações e busca, filtros, Excel, persistência, zip, pasta e celular. A regressão `e2e_engenharia` (62) e `e2e_contratos` (55) passa.
- **Pendências:** não há gravação direta no SharePoint (o app é offline, sem login; o engenheiro salva o arquivo na pasta sincronizada ou faz o upload). Os valores são calculados no momento em que o arquivo é gerado, então reajustes posteriores pedem um arquivo novo. Não há conversão R$↔US$.

### e5 + EARL Gerencial g2 + teste BP (02/11/2026): risco, COGS e margem, previsto no gerencial, painel na página inicial

Pedidos do Hugo:
- popular a Engenharia com a planilha `Contrato_BP_Teste_EARL.xlsx` (abas "Banco de dados Contratos" e "Forecast") para testar no Gerencial;
- operações com risco 100% ficam mapeadas, mas fora da receita e do COGS; com risco 0% contam inteiras;
- COGS e margem; o Gerencial mostra realizado + previsto;
- receita e COGS na página inicial da Engenharia, com filtros por ano, mês, contrato etc.

Decisões confirmadas com o Hugo:
- risco igual à "RECEITA FINAL" da planilha, num campo "Risco (%)" por operação, valor × (1 − risco);
- pessoal = time de embarque × duração;
- arquivo de teste separado.

- **Risco da receita / COGS** (`riscoRec`, 0–100, na operação):
  - **Na tela:** `engRiscoCampo(d, set)` na seção 2 do formulário (depois da contingência) e `engRiscoTag(j)` na Lista.
  - **No cálculo:** `engFator(j)` = 1 − riscoRec/100. Não confundir com `risco`, o "Risco de acontecer" da contingência do EARL.
- **COGS:**
  - **Cadastro:** `db.cogsItens[{id, sap, nome, unid, usd, brl, atualizadoEm}]`, editado em Contratos → "Custos (COGS)" (`engCogsAbrir`, `renderEngCogs`, planilha `SAP/Produto/Unidade/COGS US$/COGS R$`).
  - **Cálculo:** `engCogsIdx`/`engCogsDe`/`engCogsSoma` (pelo SAP, ou pelo nome); COGS = quantidade × custo unitário.
  - **Onde aparece:** o consumo da operação mostra a coluna de COGS e o resumo `.ec-resumo` (receita, COGS, margem, risco); a aba "Consumo e receita" mostra os KPIs de COGS e margem.
- **Painel "Receita e COGS"** na página inicial (`renderEngPainel`, `engValorOp`, `engSomaV`; inserido depois de `engAlerta(planJobs)` no `renderEngHub`):
  - **Regra:** a mesma do Gerencial. Operação com `ppuCons` = realizada (valor na data do serviço); sem consumo = prevista (`ppuNeeds` × `ctPreco` na data; COGS de `chems` + `casingNeeds`); tudo × `engFator`. Canceladas ficam fora.
  - **Filtros** (`engPn`): ano (padrão: o ano atual), mês, contrato, cliente e situação. O botão "Limpar" volta ao padrão.
  - **Conteúdo:** KPIs, tabela por mês com barra e tabela por contrato com total; clicar no contrato faz `setPlanCt` + aba `rec`.
- **Arquivo do gerencial formato 2** (`engPacoteGerencial`):
  - **Previsto:** `previsto` ganha `ppu` com valor, `receita`, `cogs`, e `quimicas`/`casing` com `cogsUsd`/`cogsBrl`; vai em toda operação.
  - **Realizado:** `realizado.cogs`.
  - **Risco:** `risco` = riscoRec. **Bug corrigido:** o objeto da operação tinha a chave `risco` duas vezes, e a segunda (a chance da contingência) apagava o risco da receita. Agora a contingência vai em `chanceConting`. Há teste de regressão em `e2e_contratos`.
- **EARL Gerencial g2** (`gerencial/gerencial.html`, núcleo reescrito):
  - **Regra:** realizado + previsto × (1 − risco), com COGS e margem; lê também o formato 1.
  - **Indicadores:** receita US$/R$ (realizado · previsto), COGS, margem, operações (realizadas, previstas, fora) e homem-dia.
  - **Abas:** "Receita e margem"; Operações com risco e receita bruta/com risco; Excel com as colunas novas. Os valores dos KPIs não quebram linha (`container-type` + `min(22px,10.5cqi)`).
- **Teste BP** (`engenharia/teste_bp/`; a planilha, o HTML gerado e o .json do gerencial não vão para o repositório):
  - **`gerar_seed_bp.js`** lê a planilha com o XLSX do próprio app e grava o banco com `loadDB`/`saveDB`:
    - **Contrato:** ct_bp com o US$ do Ano 1, os itens 8-1 e 8-2 e `inicio` 2026-06-22.
    - **Cadastros:** sonda `rig_bp_ns39` (NS-39, Macaé, offshore) e `cogsItens` (60 químicos + 102 casing).
    - **27 operações** `bp_op_01..27`, uma por coluna do Forecast, com `anchor:'fixed'`:
      - tipo: revestimento → Cimentação primária + tamanho; P&A → Abandono; LCP → Tampão; o resto → Outros + `tipoOutro`;
      - PPU, químicas (unidade da planilha) e pessoal (Tamponeiro e "Op. Cabeça" → Operador de Cabeça de Cimentação; `pePessoas`);
      - `riscoRec` = risco × 100; "Sim" na contingência vira `contingencia`;
      - "Concluído" vira `ppuCons` igual ao previsto, com a data da operação, `dias` = duração e `por` = Renata Alberton.
    - **Também:** `hoMail.nome` = Renata Alberton e `gerCfg` = [ct_bp].
  - **`montar_bp.py`:** prefixo `earlengbp:`, banco embutido gravado na primeira abertura, etiqueta "TESTE BP" com "Reiniciar" e `EARL_VERSION` "… · teste BP".
  - **`e2e_bp.js`** (31 verificações): por operação, receita, receita final, COGS, COGS final, risco, situação e homem-dia contra as linhas de total da própria planilha. Também o painel (anos, realizado/previsto), a aba do contrato, o consumo, "Reiniciar", o arquivo do gerencial e o Gerencial, incluindo o Excel.
  - **Resultado:** RECEITA FINAL US$ 4.436.331,22 e COGS FINAL US$ 983.836,59 (margem US$ 3.452.494,63); realizado US$ 1.795.916,91 e previsto US$ 2.640.414,31; 2026 US$ 3.114.498,59 e 2027 US$ 1.321.832,63. Batem na planilha, no painel, no arquivo e no Gerencial.
  - **Observações:**
    - 6 itens têm preço diferente entre as duas abas (1-42, 1-43, 6-28, 6-29, 6-35, 6-36), mas nenhum tem quantidade;
    - o SAP 1128066 (microesferas) está em kg na planilha e em lb no catálogo do EARL, e ficou em kg;
    - a LCP (contingência, risco 100%, sem consumo) aparece em "até hoje sem consumo lançado";
    - a Lista do EARL só mostra as operações futuras (horizonte de 15 a 180 dias), então as realizadas ficam no Gantt e na aba "Consumo e receita".
- **Testes:** `e2e_engenharia` 62, `e2e_contratos` 75 (COGS, risco, contingência no arquivo e painel com filtros), `e2e_gerencial` 30 e `e2e_bp` 31.

### e6 (02/11/2026): banco de produtos químicos

Pedido do Hugo: montar um banco de dados de produtos químicos com SAP, descrição, unidade e valor em US$, a partir da aba Forecast. Quando precisar atualizar, ele manda uma planilha para a engenharia e eles atualizam o banco.

- **Dados:**
  - `db.quimicos[{id:'q_<SAP>', sap, nome, unid, usd, atualizadoEm}]`;
  - `db.quimHist[{id, em, por, origem:'base'|'planilha'|'manual', arquivo, novos, alterados, removidos, total}]`, com as 60 últimas.
- **Base:**
  - `engenharia/quimicos_base.json` traz os 60 produtos da tabela "Químicos" (SAP, Químicos, UOM, COGS) da aba Forecast de `Contrato_BP_Teste_EARL.xlsx`; é gerado pelo `gerar_quimicos_base.py`;
  - o patch embute a base como `ENG_QUIM_BASE`, no nível do script, e cria `engQuimMig(d)`, chamada no `loadDB` em volta do `migrateDB`;
  - a base só entra se `!d.quimBaseV1` e o banco estiver vazio. Depois a flag fica gravada e a base não volta, nem se o usuário esvaziar o banco.
- **Tela** (`eng_quimicos.js`; botão "Químicos" na barra, `.eng-quimicos` → `abrirEngQuim` / `renderEngQuim`):
  - **Tabela:** SAP (só leitura depois de salvo), descrição, unidade, valor US$ (mostra até 4 casas, grava com a precisão toda), data e avisos (`engQuimAvisos`).
  - **Avisos:** fora do catálogo (`chemCatalog`, por `sapN`), unidade diferente da do EARL (`engUnNorm`: gl/gll→gal, lbr→lb, sack→sk, bg→bag…), SAP não numérico, sem valor, valor zero.
  - **Ferramentas:** busca, "só com aviso", "＋ Produto", "⬆ Atualizar pela planilha", "⬇ Baixar planilha" (`Banco_Quimicos_EARL_AAAA-MM-DD.xlsx`, aba Químicos, SAP numérico como número) e histórico (`details`).
  - **Gravação:** "Salvar" grava pelo `engQuimGravar`, que compara com o banco e registra novos, alterados e removidos.
- **Planilha:**
  - **Leitura:** `engLerWb` (extraído do `engLerPlanilha`; xlsx, ou CSV em UTF-8/1252). `engQuimLerWb` procura em todas as abas a linha de cabeçalho com SAP + valor (`cogs|valor|custo|us|usd|preço`) e prefere a que tem "Químicos" ou a aba de químicos. Lê até o próximo cabeçalho "SAP" (a tabela de Casing no Forecast) ou 3 linhas vazias. No SAP repetido vale a última linha; linha sem SAP é ignorada e listada.
  - **Prévia:** `renderEngQuimPlan` / `engQuimPlanCalc` mostra:
    - contagens: novos, valor alterado (antes, depois, %), descrição/unidade, sem mudança, só no banco;
    - a escolha "Atualizar e acrescentar" / "Substituir o banco pela planilha" e "Seu nome" (vai para `hoMail.nome`);
    - "Aplicar e salvar" (`engQuimAplicar`), desligado quando nada muda.
- **COGS:** `engCogsIdx` junta `cogsItens` e `quimicos`; no mesmo SAP vale o de `quimicos`. "Custos (COGS)" passou a ser para casing e outros materiais. O BP: 60 químicos em `quimicos` (iguais à base) e 102 casing em `cogsItens`.
- **Exportar e importar:** `quimicos` e `quimHist` vão no export e se juntam por id (no mesmo SAP, fica o alterado por último). A janela de importação mostra "Produtos químicos".
- **Avisos da base atual (8):**
  - unidade diferente do catálogo do EARL: BARITA (TON × bag), CLORETO DE SÓDIO (KG × bag), GOMA XANTANA (LB × bag), MICROESFERAS (KG × lb);
  - valor zero: CFR-6, CFR-6L, LIQUILITE 8000 e FLUORESCEINA (que também tem o SAP provisório "XXX").
- **Limite:** o valor não tem vigência por data. Ao mudar o valor, muda o COGS de todas as operações, inclusive das já lançadas.
- **Testes:** `engenharia/tests/e2e_quimicos.js` (36; 37 com a planilha do BP). A regressão `e2e_engenharia` 62, `e2e_contratos` 75, `e2e_gerencial` 30 e `e2e_bp` 31 passa.

### e6 (cont., 02/11/2026): teste BP vazio, espaço do navegador e cartões do painel

- **Relato:** o `EARL_Engenharia_BP_teste.html` abriu vazio (0 operações) e com os 16 contratos do EARL.
- **Causa** (reproduzida): no Chrome e no Edge, todos os HTML abertos do disco dividem o mesmo localStorage (~5.242.880 caracteres). A simulação v115 sozinha usa ~2,1 milhões ao abrir, e mais com o uso. Sem espaço, o `S.call(...SEED)` falhou calado e o `loadDB` caiu no `SEED_DB` vazio. Se o arquivo for aberto numa pré-visualização, o storage é bloqueado e o app nem abria: o EARL lê o localStorage fora de try em vários pontos.
- **Teste BP** (`montar_bp.py`):
  - **Marca da versão:** o seed ganha `testeBP` (hash do seed); `EARL_BP_SEED`/`EARL_BP_ID` ficam na página e `earlengbp:earl_bp_id` no navegador. Se o guardado não for desta versão, apaga as chaves `earlengbp:` e grava.
  - **Sem espaço:** se não couber, `EARL_BP_SEM_ESPACO` e a etiqueta avisa "este navegador não está salvando".
  - **loadDB:** usa o banco guardado só se `d.testeBP === EARL_BP_ID`; senão, `JSON.parse(EARL_BP_SEED)`, o que funciona sem storage.
  - **Contratos:** `gerar_seed_bp.js` arquiva (`archived`) os outros contratos. Apagar não adianta: a migração recria 6 contratos da semente.
- **Armazenamento bloqueado** (casca do `patch_engenharia.py`): se `localStorage` ou `sessionStorage` lançar erro, entra um storage em memória (`Object.defineProperty(window, …)`) e `EARL_ARMAZ_BLOQUEADO`. `window.EARL_ARMAZ = {P, G, S, R}` expõe as funções originais.
- **Espaço do navegador** (`eng_app.js`):
  - **Medição:** `engEspacoMedir` soma as chaves por prefixo, com cota de 5.242.880.
  - **Aviso:** `renderEngEspacoAviso` aparece na página inicial (antes do painel) quando o uso passa de 85%, quando uma gravação é recusada (`engEspacoFalhou`, chamado no `updateDB`, cuja mensagem de "Granéis & HCl" foi trocada) ou quando o storage está bloqueado.
  - **Tela:** `renderEngEspaco` traz uma tabela por arquivo. "Apagar" só aparece para `earlsimNNN:` e `earlengbp:` (quando não é o próprio arquivo); Engenharia, Gerencial e o EARL sem prefixo nunca.
- **Painel da página inicial:** pedido do Hugo, os cartões ficam na ordem Receita (US$), COGS, Operações, **Receita / operação (US$)** (`ec-pn-rec-op`, receita ÷ operações que contam, sem as de risco 100%; realizado e previsto em separado; `engSomaV` ganhou `nFR`/`nFP`) e Margem. O cartão "Receita em R$" saiu; as tabelas continuam com R$. O Gerencial ainda tem o layout antigo dos cartões.
- **Testes:** `e2e_espaco` 12 (novo), `e2e_bp` 38 (+ só BP ativo, receita/operação, alteração salva, sem espaço, versão anterior, bloqueado), `e2e_contratos` 76, `e2e_quimicos` 36, `e2e_engenharia` 62 e `e2e_gerencial` 30.

### EARL Gerencial g3 (03/11/2026): tabela única com drill-down e filtro por mês

Pedido do Hugo: no Gerencial, em vez de três tabelas (por mês, cliente e região), uma tabela só, com os filtros e drill-down (mês › cliente › sonda › operação…). O filtro de data vai só até o mês.

- **Aba "Receita e margem"** (agora a primeira e a padrão, `S.tab = 'receita'`):
  - `telas.receita` monta uma tabela `t-dd` em árvore a partir de `A.linhas` (o mesmo `valorOp`: realizado + previsto × fator de risco).
  - **Dimensões:** `DIMS` (`mes`, `ano`, `cliente`, `contrato`, `regiao`, `tipoct`, `sonda`, `poco`, `tipoop`, `situacao`), cada uma com `k` (chave), `r` (rótulo) e `cron` (ordem cronológica; as outras vão pela receita).
  - **Níveis:** `S.drill.niveis` (padrão `['mes', 'cliente', 'sonda']`, guardado em `earlger:drill`). As operações vêm sempre depois do último nível.
  - **Estado aberto:** `S.drill.abertos` guarda caminhos `/k1/k2` (`encodeURIComponent`). "Mostrar até" põe `S.drill.mostrar = profundidade`, aplicado no próximo `render`.
  - **Barra "Abrir por":** selects `.dd-sel[data-nivel]`, × `[data-ddrm]` e "＋ nível" `[data-a=ddAdd]`, que pega o próximo de cliente › contrato › sonda › poço…; trocar níveis zera os abertos.
  - **Linhas:** grupo `tr.dd-g.dd-n{d}[data-dd]` e operação `tr.dd-op` (`.fora` no risco 100%). A coluna R$ só aparece se houver valor em R$.
  - Saem `porCli`/`porReg`; `porMes` continua para a aba "Por mês" do Excel.
- **Filtro de período:** `input type="month"` ("Mês de" / "até o mês"); `noPer` compara `AAAA-MM`.
- **Testes:** `e2e_gerencial` 41; `e2e_bp` 41: cada mês do drill-down = Σ RECEITA FINAL / COGS FINAL da planilha; out/2026 › BP › NS-39 com as 4 operações (2 fora); filtro set–out/2026 = US$ 1.586.949,26 em 9 operações.

### EARL Gerencial g4 (03/11/2026): só US$ e gráfico de barras por mês

Pedido do Hugo: tirar a coluna de receita em R$ e deixar só os valores em dólares; permitir ver em gráfico de barras, mês a mês.

- **Indicadores:** sai "Receita em R$". A ordem passa a ser a da Engenharia: Receita US$ · COGS US$ · Operações · Receita / operação (US$) (`k-rec-op`; ÷ operações sem as de risco 100%, realizado e previsto em separado; `soma` ganhou `nFR`/`nFP`) · Margem US$ · Pessoal (homem-dia). Os textos menores não mostram mais R$.
- **Drill-down:** sem a coluna R$; só US$.
- **Gráfico** (`S.vis`, guardado em `earlger:vis`; chave `.vis-tg [data-vis]` no cabeçalho do cartão):
  - `desenharGrafico(A)` desenha um SVG com a largura real de `#graf` (é chamado depois do `innerHTML` e de novo no `resize`).
  - **Meses:** contínuos do primeiro ao último com operação (mês vazio fica com o espaço).
  - **Colunas:** receita realizada (`#2a78d6`) e prevista (`#1baf7a`) empilhadas, com 2px de vão; COGS (`#eb6834`) ao lado. São as 3 primeiras cores do palette de referência do skill dataviz, validadas com `--pairs all`; o verde-água fica abaixo de 3:1, por isso a tabela é a vista acessível.
  - **Marcas:** colunas de no máximo 24px, ponta arredondada de 4px, base reta; grade em linha fina; eixo compacto ("250 mil", "1,5 mi").
  - **Interação:** tooltip por mês (`g-tip`, montado com `textContent`, valor antes do rótulo); foco pelo teclado; clique ou Enter abre o mês na tabela (`S.drill.abertos`, quando o 1º nível é Mês).
- **Mantidos:** os valores em R$ continuam nas abas Contratos, Itens PPU e Operações e no Excel.
- **Testes:** `e2e_gerencial` 46 (cartões, só US$, gráfico, tooltip, guardar a escolha, clique abre a tabela); `e2e_bp` 43 (10 meses no gráfico, fev/2027 vazio, receita e COGS de cada mês = planilha; receita/operação = planilha).

### EARL Gerencial g5 (03/11/2026): drill-down até o item PPU e gráfico sempre visível com tendência

Pedido do Hugo: o drill-down deve ir até o item PPU; e ele não viu o gráfico de barras (estava atrás da chave "Tabela | Gráfico"); quer o gráfico com curva de tendência.

- **Item PPU:**
  - **Linha da operação:** `linhaOp(x, d, cam)` cria a linha com `data-dd` = caminho + `/op:<id>` (abre e fecha como os grupos).
  - **Itens:** `itensOp(x)` usa o PPU do realizado (ou do previsto): `valorUsd`, ou quantidade × `usd`, ou o valor do contrato. Multiplica pelo fator de risco, então a soma dá a receita da operação. Ordem: valor decrescente.
  - **Linha do item:** `tr.dd-it` com item, descrição, quantidade × valor unitário, receita (com "bruto" se houver risco) e % da operação.
  - **Mostrar até:** ganhou "Itens PPU" (`data-ddmostrar = niveis.length + 1`). O cabeçalho termina em "› Operação › Item PPU".
- **Gráfico:**
  - **Cartão próprio:** saiu a chave Tabela/Gráfico (`S.vis`). `cartaoGrafico()` fica sempre em cima da tabela; `S.graf` (`earlger:graf`) liga "Ocultar gráfico" / "Mostrar gráfico por mês". Clique no mês abre o mês na tabela e rola até ele.
  - **Tendência** (`S.tend`, `earlger:tend`): `linear` (mínimos quadrados sobre a receita total de cada mês, com mês vazio = 0) ou `mm3` (média móvel de 3 meses, do 3º mês em diante, com pontos) ou `nenhuma`.
  - **Desenho:** linha de 2px na cor do texto (tracejada na linear) com `clipPath` na área do gráfico; `data-v` guarda os valores para os testes. A legenda tem a chave de linha e some, com aviso, quando há menos de 2 (ou 3) meses. O tooltip mostra o valor da tendência.
- **Testes:**
  - `e2e_gerencial` 50: itens PPU somam a operação; ocultar e mostrar o gráfico e guardar a escolha; legenda sem tendência com 1 mês.
  - `e2e_bp` 48: 13 5/8" Intermed = 18 itens = US$ 827.061,86; DISPUTA SPACER = 7 itens a US$ 0,00 com o bruto; a linear = regressão calculada da planilha; a média móvel = médias da planilha.

### EARL Gerencial g6 (03/11/2026): gráfico por mês, por mês e cliente, e por cliente (barras horizontais)

Pedido do Hugo (ele achou o gráfico): poder ver o gráfico como está e também por cliente no mês, e um gráfico de barras por cliente com os clientes no eixo vertical.

- **Formas de ver** (`S.gmodo`, guardado em `earlger:gmodo`; botões `.g-modos [data-gmodo]` no cartão):
  - **`mes`:** o de antes.
  - **`mescli`:** uma coluna por mês, empilhada por cliente; segmentos `path[data-c][data-v]` com 2px de vão; a tendência vale para as duas formas por mês.
  - **`cli`** (`desenharClientes`): barras horizontais (`barraH`, ponta arredondada à direita). Clientes no eixo vertical, ordenados pela receita; em cada linha, a receita (realizada + prevista) e o COGS; valor compacto na ponta (`.g-vl`); tooltip com receita, COGS, margem, receita/operação e operações. Clique alterna `S.f.cliente` (filtra a página). A seleção "Tendência" some nesta forma.
- **Cores dos clientes** (`coresClientes(C)`): usa as 8 cores do palette de referência (validadas como pares vizinhos), pela ordem da receita total **sem filtro**, para o filtro não trocar as cores. Acima de 8 clientes, do 8º em diante vira "Outros clientes" (cinza).
- **Código comum:** `legenda(itens)` e `dica(box)` montam a legenda e o tooltip por DOM (`textContent`) para as três formas. A legenda saiu do HTML fixo e vai para `#g-leg`.
- **Testes:**
  - `e2e_gerencial` 60: arquivo com 3 clientes montado no teste, que confere as cores fixas, a soma por mês, a ordem e os valores por cliente, os tooltips, o clique que filtra, a cor que se mantém com o filtro e a forma guardada.
  - `e2e_bp` 50: por mês e cliente = 9 meses só BP, somando a RECEITA FINAL; por cliente = BP US$ 4,4 mi.

### EARL Gerencial g7 (05/11/2026): Receita por mês em matriz, como o "Relatório Receita" do Excel

Pedido do Hugo (foto da planilha "Relatório Receita": clientes nas linhas, trimestre › mês › Receita/COGS nas colunas, segmentadores de Ano, Contrato, Cliente, Mês, Quarter e Tipo Receita). Ele escolheu "visão igual no Gerencial", mantendo a tabela de drill-down.

- **Aba nova `matriz`** ("Receita por mês (matriz)", logo depois de "Receita e margem"; `telas.matriz`):
  - linhas `NIV_MX` = Cliente › Contrato › Sonda › Poço, e embaixo as operações. `arvoreMx(A, abrir)` percorre a árvore; `abrir(d, caminho)` vem da tela (`S.mx.abertos`/`S.mx.mostrar`, padrão: abre os clientes até o contrato) ou do Excel (tudo aberto);
  - colunas `colunasMx(A)`: só os meses com operação, agrupados em trimestres (`T1/2026`), cada mês com Receita | COGS, o total do trimestre (`.mx-q`, verde) e o Total (Receita, COGS, Margem). `somaMx`/`triMx` somam `x.rU`/`x.cU` (já com o risco) por mês;
  - célula vazia = sem operação no mês; risco 100% = linha cinza com 0,00. Cabeçalho (`thead` sticky) e 1ª coluna (`.mx-rot` sticky) fixos; o quadro `.mx-wrap` rola (máx. 72vh);
  - cliques: `[data-mx]` abre/fecha, `[data-mxmostrar]` = mostrar até (0 Cliente … 4 Operação).
- **Filtros novos no topo:** `Ano` e `Trimestre` (`S.f.ano`, `S.f.tri`, em `filtrar().noPer`, com `triDe(m)`). Valem para todas as abas e os indicadores. "Tipo Receita" não existe nos arquivos: o mais perto é "Tipo de contrato".
- **Excel:** `abaMatriz(A, abrir)` monta a planilha (cabeçalho em 3 linhas mescladas, colunas Nível + Cliente…Operação, números `#,##0.00`). "⬇ Excel desta tabela" (`excelMatriz`) baixa como está na tela; o Excel consolidado ganhou a aba "Receita por mês" (2ª aba, tudo aberto). `baixarXlsx(wb, nome)` é o download comum.
- **Testes:**
  - `gerencial/tests/e2e_matriz.js` 35: dados sintéticos, conferência célula a célula contra conta própria, abrir/fechar, filtros, Excel, celular;
  - `e2e_gerencial` 60 (lista de abas do Excel atualizada);
  - `e2e_bp` 50;
  - com o arquivo real do BP + 3 clientes, o Total geral da matriz = indicadores (US$ 6.796.331,22 de receita; US$ 1.455.836,59 de COGS).

### EARL Gerencial g8 (05/11/2026): a matriz no lugar da tabela, visão por ano, cards dos quartos, período numa caixa só

Pedido do Hugo: não criar aba nova, e sim pôr a matriz no lugar da tabela "Receita, COGS e margem"; tirar o cartão Pessoal (homem-dia) e redistribuir os outros; visão por ano, com cards dos quartos e do total do ano; "quarto" no lugar de "trimestre" (Q1… no lugar de T1…); o filtro de mês numa caixa só (mês inicial e final), com o quarto sobressaindo ao mês.

- **Aba "Receita e margem"** (`telas.receita`): `cartoesQuartos(C)` + gráfico + `cartaoMatriz(F, A)`. Saíram a aba `matriz` (quem tinha `earlger:tab = matriz` cai em `receita`) e todo o drill-down antigo (`DIMS`, `S.drill`, `earlger:drill`, `.t-dd`).
- **Matriz:** mesma da g7, com quartos `Q1/2026` (`colunasMx`, `quartoMx`) e um nível a mais, o **Item PPU** (`itensOpMx`; a operação com itens abre/fecha por `data-mx` = caminho + `op:<id>`; "Mostrar até" vai de 0 Cliente a 5 Item PPU). Linha de item: só receita, COGS e margem em branco (`celulasMx(t, qs, semCogs)`). Células de mês têm `data-mes`; clique no mês do gráfico (`S.mxVer` → `verMesNaTabela`) destaca a coluna (`.mx-hl`) e rola até ela. Total = "Total <ano>".
- **Cards dos quartos** (`.qc`, `data-q` 1–4 e '' para o ano): somam o ano com os filtros de cliente/contrato/região/tipo, sem quarto/mês (`filtrar(C, true)`). Clique escolhe o quarto (de novo, ou no total, volta ao ano todo) e limpa os meses.
- **Filtros** (`S.f = {ano, tri, mIni, mFim, cliente, contrato, regiao, tipo, busca}`; `filtrar().noPer`): ano obrigatório (`anosDe`, `anoPadrao` = ano de hoje ou o mais recente; sem "Todos"); quarto (`tri`) vale no lugar dos meses e limpa `mIni/mFim`; mês numa caixa só (`.mes-box` → `popMes()`, `data-mesb`: 1º clique = início, 2º = fim, inverte se vier antes; clique fora ou Esc fecha; com quarto, a caixa fica `disabled`). "Limpar filtros" mantém o ano.
- **Cartões:** 5 (sem `k-hd`), `grid-template-columns:repeat(5,1fr)`; no celular a Margem ocupa a linha toda.
- **Excel:** "Excel desta tabela" = `EARL_Gerencial_receita_<ano>[_período]_<data>.xlsx`, aba "Receita <ano>", coluna "Item PPU"; o consolidado tem a aba "Receita <ano>" (tudo aberto) e vale para o ano/filtros escolhidos.
- **Testes:** `e2e_matriz` 46 (reescrito para a visão por ano), `e2e_gerencial` 62, `e2e_bp` 56 (agora ano a ano: 2026 e 2027 somam a planilha; cards dos quartos; meses da matriz; itens PPU; período e quarto; gráfico de ago–dez/2026).

---

## 4. Última mudança: v115 (Inventário a bordo: "Movimentar material" em cada contentor e na sacaria, em todas as categorias; Logística: desfazer a divisão da tesoura)

Pedido do Hugo (18/10), feito sobre a v114. Como na v113 e na v114, o app do HTML de simulação vem compilado: as mudanças estão no `v115/patch_v115.py` (que parte do `EARL_HAL_CMT_114_SIMULACAO.html`) e **precisam ser refeitas no `index.html` (JSX)**. Os pontos estão abaixo, pelo nome das funções.

- **Sonda › Inventário a bordo** (página da sonda, aba `inv`):
  - **cada contentor** (`tabCont(l, cat)`, agora recebe a categoria) tem, na linha do grupo, **"⇄ Movimentar material"** (vermelho) ao lado de **"⇄ Movimentar contentor"** (o antigo "⇄ Mover contentor", mesma janela `setLocBox`). Os dois ficam no `span.inv-grp-acts`. "Movimentar material" chama `abrirMov(cat, 'c:' + c.k)`, que abre a janela de movimentação que já existia (`setMovBox`) com a **origem já escolhida** = aquele contentor; fica desabilitado quando o contentor não tem material com saldo (cimento/sílica de silo não conta);
  - **sacaria / fora de contentor** (`tabSolto(l, cat)`, reescrita): os itens soltos são agrupados **por local** (`loc`), com uma linha de grupo "Sacaria · Localização: Convés" (ou "Avulso (fora de contentor)" fora de químicas, via `semCont(cat)`) e o botão **"⇄ Movimentar material"** → `abrirMov(cat, 's:' + local)` (origem = aquele local);
  - vale para **químicas, casing equipment, consumíveis e spare parts**. Consumíveis e spare parts passaram a ter três seções: **"Saldo e estoque mínimo"** (`tabCrit`, o que já existia), **"Em contentores"** e **"Fora de contentor"**;
  - **saiu o botão geral "Movimentar material"** do topo dos cards (Químicas, Casing, Consumíveis/Spare). A função `movBtn` ficou no código, sem uso.
- **Logística › Envios para sondas › montagem** (tesoura ✂):
  - **"↺" em cada porção** (`juntarPorcao(it, i)`): desfaz aquela divisão — a porção soma com a anterior (na primeira, com a seguinte), o lote da que fica é mantido; com duas porções volta a ser uma carga só (`setPorcoes(origem, null)`);
  - o rodapé das porções troca o link "↺ juntar" pelo botão **"↺ Desfazer divisão"** (`btn-o lg-desf`), que junta todas de volta;
  - ✂ e ↺ ficam juntos num `span.lg-cuts`, e a linha da montagem ganhou a classe `lg-mt` com uma coluna própria para eles (`grid-template-columns: auto minmax(0,1fr) 84px 34px 64px 150px auto`; no celular, a mesma de antes). Assim o "→ contentor" não cai para a linha de baixo e as linhas ficam alinhadas (inclusive a de equipamento, que não tem ✂). A linha do desembarque (que também usa `lg-it`) não muda;
  - o texto de ajuda da montagem explica o ↺.
- **Tradução:** textos novos em `I18N_EN`/`I18N_ES` ("⇄ Movimentar contentor", "Saldo e estoque mínimo", "↺ Desfazer divisão", títulos dos botões e o novo texto de ajuda da montagem); "Em contentores", "Fora de contentor" e "⇄ Movimentar material" já estavam nos dicionários.
- **CSS:** bloco "v115" no fim do `<style>` (`.inv-grp-acts`, `.lg-it.lg-mt`, `.lg-cuts`, `.lg-uncut`, `.lg-desf`).
- **Testes:** `tests/v115/e2e_v115.js` (23 verificações: sem botão geral nas Químicas, os dois botões em cada contentor, origem pré-escolhida no contentor e na sacaria, material indo do contentor para a sacaria e da sacaria para o contentor, Casing, Consumíveis e Spare parts com as seções novas e a origem por local, ✂ em 2 e 3 porções, ↺ por porção, "↺ Desfazer divisão", inglês). Regressão: `tests/v113/e2e_v113.js`, `tests/v113/smoke_v113.js` e `tests/v114/e2e_v114.js` passam na v115.
- **HTML de simulação v115** (`EARL_HAL_CMT_115_SIMULACAO.html`, prefixo `earlsim115:`): o mesmo banco da v112.

## 4-29. Mudança anterior: v114 (HI: consumo de materiais com "＋ Material não previsto" do inventário da sonda, sem itens críticos, e destinatários do e-mail escolhidos e salvos)

Pedido do Hugo (18/10), feito sobre a v113. Como na v113, o app do HTML de simulação vem compilado: as mudanças estão no `v114/patch_v114.py` (que parte do `EARL_HAL_CMT_113_SIMULACAO.html`) e **precisam ser refeitas no `index.html` (JSX)**. Os pontos estão abaixo, pelo nome das funções.

- **HI › Consumo de materiais** (`renderHI7`, passo 9):
  - o nome da química ficou em destaque (`.hi-q-nome`: nome 15 px em negrito, "SAP …" ao lado e o selo "não previsto" quando foi acrescentada no HI);
  - **"＋ Material não previsto"** (no lugar de "＋ Química não prevista") abre a janela `renderHIMatBox` (estado `hiMatBox {cat, q, cad, sel}`), no visual do seletor da engenharia (`rp-*`): abas Química · Casing equipment · Consumível · Spare parts · Cimento, com a contagem do que está a bordo; a lista é o inventário a bordo da sonda da operação (`darItemsOf`, agrupado por SAP + lote, com o saldo); "incluir o cadastro (não está a bordo)" acrescenta os itens de `matCatalogo(cat)`; busca por SAP, descrição ou lote; o que já está no HI aparece marcado e travado;
  - química e cimento entram em `hi.quimicas` com o lote escolhido (lote novo sem "mobilizado"; se a química já está no HI, entra como mais um lote; `naoPrevista:true`);
  - casing, consumível e spare parts entram em **"Outros materiais"** (`hi.criticos`, agora com `cat`, `lot`, `darId`, `daBordo`, `bordo`), com a quantidade consumida;
  - **saiu a parte de "Itens críticos"**: o HI não vem mais com o casing previsto pela engenharia (`criticos: []` no `openHI`); HIs antigos com `criticos` sem `cat` aparecem em "Outros materiais" como casing.
- **Baixa no inventário a bordo** (`postMobToDar`): o lote acrescentado no HI (sem "mobilizado") baixa pelo consumo informado nele; os "Outros materiais" que vieram de bordo (`daBordo`) baixam do DAR da sonda (`darId`, depois SAP + lote) com `darMoves` kind `consumo` (com `mobId`), também em operação com retirada da planta (a sonda sai de `mob.job.sonda`).
- **Excel do HI:** a aba "Itens críticos" virou **"Outros materiais"** (item, SAP, categoria, lote, quantidade, unidade). O PDF já listava esses itens junto das químicas.
- **Sonda › Consumo:** ganhou "Consumo de casing equipment"; em casing, consumíveis e spare parts, o que foi lançado em "Outros materiais" no HI aparece nos registros com a marca **"do HI"** (clicar abre a operação).
- **HI › Finalizar** (`renderHI10`): card **"E-mail da operação finalizada"** com a lista de destinatários (checkbox, no padrão das Escalas), "outro e-mail" + "＋ Adicionar" e × para tirar um e-mail da lista salva. Vem marcada a última escolha (`db.hiCfg.emailTo`) ou, na primeira vez, o `finEmailTo` da configuração. Sem destinatário o "✓ Finalizar HI" fica desabilitado. Ao finalizar, `saveAndDownloadHI` grava `db.hiCfg = {emailTo, emails}` e passa a lista para `sendFinEmail(…, toSel)` → `emitOpEml(…, toSel)` (o Cc continua o da configuração). Estado: `hiMailSel` (null = usar o salvo) e `hiMailNovo`, zerados a cada HI aberto.
- **Tradução:** textos novos em `I18N_EN`/`I18N_ES` e regras para "Material não previsto · sonda" e "N destinatário(s)".
- **CSS:** bloco "v114" no fim do `<style>` (`.hi-q-*`, `.hi-om-*`, `.hi-mat-*`, `.hi-mail-*`).
- **Testes:** `tests/v114/e2e_v114.js` (30 verificações: nome em destaque, janela por categoria, química com lote, consumível de bordo e casing do cadastro, e-mail escolhido no `.eml`, lista salva no próximo HI, × da lista, sem destinatário não finaliza, baixa no DAR por lote e do consumível, registro "do HI" na aba Consumo, aba do Excel, inglês). Regressão: `tests/v113/e2e_v113.js` e `tests/v113/smoke_v113.js` passam na v114 (os testes leem o prefixo da simulação do próprio arquivo).
- **HTML de simulação v114** (`EARL_HAL_CMT_114_SIMULACAO.html`, prefixo `earlsim114:`): o mesmo banco da v112.

## 4-28. Mudança anterior: v113 (página da sonda: desembarque com "⇠ Tirar" e equipamentos soltos, plano de embarque, consumo só com registros, janela da operação sem pílulas)

Pedido do Hugo (18/10), feito sobre o `EARL_HAL_CMT_112_SIMULACAO.html`. **O app desse arquivo vem compilado (sem o bloco `text/babel`)**, então as mudanças foram aplicadas no código compilado pelo `v113/patch_v113.py` (cada troca confere que o trecho original da v112 existe uma única vez). **Para levar ao `index.html` (JSX) é preciso refazer as mesmas mudanças no fonte**: os pontos estão abaixo, pelo nome das funções.

- **Desembarque** (`renderSdDesemb`, `novoDesemb`, `desComp`, `registrarDesembMat`):
  - **"⇠ Tirar"** em cada item "Já dentro do contentor" (cimento e sílica — `ehCimSil` — continuam com 🔒, porque se movimentam pelos silos). Abre a movimentação (`setMovBox`) já preenchida: origem = o contentor, produto, lote e quantidade do item, destino = sacaria/avulso (`dest:'s:'`) na localização do contentor. Confirmando (`moverMaterial`), o material sai do contentor de verdade (DAR + `darMoves` kind `movimentacao`) e volta para a lista "Inventário a bordo", de onde vai para qualquer contentor.
  - **Campo de quantidade** da coluna esquerda: não volta mais ao saldo quando fica vazio (`value = qtys[id] != null ? qtys[id] : disp`). Vazio + colocar → "Informe a quantidade que desce." (antes o vazio virava "tudo"). Depois de colocar, o campo volta a mostrar o saldo restante (`qtys[id] = undefined`).
  - **Equipamento não vai em contentor**: sem seletor e sem arraste; botão **"↓ Desce solto"** → `dd.soltos[] = {id, darId, nome}`, com `soltosRt`, `soltosFotos` e `soltosNfs` obrigatórios, no cartão "Equipamentos — descem soltos" ao lado dos contentores. `desComp` acrescenta o grupo `{c:{solto:true,…}, lines}`; no registro ele vira um item de `desembarques[].contentores` com `solto:true`, `tipo:'Equipamentos (soltos)'` e `bordo:false` (Logística → Retornos recebe esse grupo como recebe os contentores). A pendência passou a ser "ao menos um contentor ou equipamento".
- **Logística → montagem do envio**: o mesmo defeito do campo de quantidade, com a mesma correção (`value`, `colocar` e o reset de `e.qtys`).
- **Sonda › Pessoas**: "Próximos a subir" e "Plano à frente" viraram um card só, **"Plano de embarque (n)"**: tabela por data com Data, Movimento (↑ Embarque / ↓ Desembarque), Pessoa, Função, Situação (a bordo / aguardando embarque / programado) e Quando (hoje / em N dia(s) / atrasado N dia(s)), a partir dos embarques de Pessoal → A bordo. No mesmo dia, os desembarques vêm antes. Clicar abre as operações da pessoa na sonda.
- **Sonda › Consumo** (`renderConsSonda`): só registros.
  - "Consumo de químicas nas operações": filtros e a tabela "Registros que compõem o consumo" (do HI; clicar abre a operação). Saíram os indicadores, "Químicas de maior consumo", "Evolução no tempo", "Consumo por química", "Consumo por operação" e o atalho para Químicas.
  - "Consumo de consumíveis" e "Consumo de spare parts": "＋ Registrar consumo" e a lista dos consumos registrados. Saíram a tabela de saldo a bordo e a coluna Crítico (o saldo continua no Inventário a bordo).
- **Janela da operação** (`renderSummaryModal`) aberta na página da sonda (`mainTab==='rig'`): a seção Mobilização fica só com a identificação, sem "Etapas do processo" e sem os atalhos (Página da sonda, Pedido da engenharia, Processo completo, Ver na análise, DAR de origem, Log da operação). No app Operações continuam.
- **Tradução:** textos novos em `I18N_EN`/`I18N_ES` e regras para "Plano de embarque (n)", "em N dia(s)" e "atrasado N dia(s)".
- **CSS:** `.des-tirar`, `.lg-solto`, `.des-soltos`, `.pl-mov` (`.sobe`/`.desce`) e `td.pl-atras`, no bloco "v113" no fim do `<style>`.
- **Testes** (repositório `hugoregiani/projeto_earl`, pasta `earl/`):
  - `tests/v113/e2e_v113.js` (43 verificações): campo de quantidade, ⇠ Tirar → sacaria, equipamento solto, registro do desembarque (inventário e Retornos), plano de embarque, consumo, janela da operação na sonda × no app Operações, montagem do envio e inglês;
  - `tests/v113/smoke_v113.js`: abre como o usuário (login, selo, prefixo, versão) e percorre Desembarque, Pessoas, Consumo, Operações e Visão geral das 15 sondas da simulação, sem erro e sem texto quebrado;
  - `tests/harness.js` abre HTML com o app já compilado (`comGanchoCompilado`) e grava as chaves com o prefixo da simulação (`prefix`, `auth`).
- **HTML de simulação v113** (`EARL_HAL_CMT_113_SIMULACAO.html`, prefixo `earlsim113:`): o mesmo banco da v112 (50 operações).

## 4-27. v112

Não está descrita no prompt recebido junto com o `EARL_HAL_CMT_112_SIMULACAO.html` (a última seção era a v111). A v113 partiu desse arquivo.

## 4-26. Mudança anterior: v111 (Escalas: planejamento × execução — quadro de distribuição, versões imutáveis, PDF, e-mail, planejado × realizado pelo HI, histórico individual)

Patches `wk103/patch_eng66.py` (funcional; lê `v111_top.js`, `v111_app1.js`, `v111_app2.js`, `v111_render.js`, `v111_render2.js` e `v111.css` da mesma pasta) e `patch_eng67.py` (tradução; dados em `i18n111_dados.py`). Build: `./build_all.sh patch_eng39 … patch_eng67` (39–67 em ordem; saída idêntica à entregue). Tudo dentro de **Pessoal › Escalas**; a única outra área tocada é o perfil da pessoa (histórico), que agora também aparece em **Pessoal › Pessoas** nas frentes.

**Diagnóstico (antes):**
- três cartões redundantes (Operações do dia, Calendário, Distribuição) e um quadro “Quem está onde” em tabela;
- `db.slDays[dia] = {teams, presence, confirmed}`. “Confirmar” era um liga/desliga: reabrir apagava a confirmação;
- “Atualizar com o realizado” sobrescrevia a equipe planejada;
- nada impedia a mesma pessoa em duas frentes;
- o envio por Graph (`/me/sendMail`) existia no conector, mas não era usado.

**Modelo de dados (`db.slDays[AAAA-MM-DD]`, compatível com o anterior):**
- `teams[]`: o quadro em edição. Frente vinculada a uma operação (`pjId`) não tem nome editável, o rótulo vem da operação; frente avulsa (sem `pjId`) tem nome e atividade. `slots{pid:{ini,fim}}` guarda os períodos.
- `presence{pid:{status,base,sit,ini,fim}}`: destinos que não são operação. `status` pode ser `base` (com `base`), `folga`, `ferias`, `treino`, `atestado`, `embarcado` ou `outro` (com `sit`, ligado às situações configuráveis em `db.slCfg.situacoes`). Quem não tem alocação é **disponível** (antes o padrão era “na base”).
- `estado`: `rascunho` → `confirmada` → `encerrada`. “Em apuração” é derivado (confirmada e data ≤ hoje). `confirmed` continua gravado para a sugestão de equipe na mobilização (`escalaForPlanned`).
- `versions[]`: fotografias **imutáveis** (frentes com rótulo congelado, pessoas com nome/função/SAP/período, destinos com atividades, não alocados, `raw` para restaurar, `retroativa` se confirmada depois da data, `legada` para escala anterior à v111). **v1 = planejado original.**
- `revisao{at,by}`: escala confirmada reaberta. As alterações viram a próxima versão, com motivo obrigatório e diff (`events[].mudancas`). “Descartar alterações” volta à última versão.
- `events[]`: trilha do dia (alterações, rascunho, confirmação, revisão, descarte, PDF, e-mail, validação, encerramento, reversão).
- `envios[]`: e-mails com versão, modo (`graph` | `eml`), destinatários, assunto e resultado (`enviado` | `falhou` | `preparado`).
- `valid{pid:{st,nota,by,at,hist}}`: validação manual, camada separada. Não altera plano nem HI.
- O **Reverter** do log de alterações nunca apaga `versions`/`envios`/`valid`; em escala confirmada a reversão é ignorada e fica registrada.

**Tela (Pessoal › Escalas):**
- calendário no topo (faixa de 2 semanas ou mês) com operações por dia e o estado da escala;
- barra do dia com estado, contadores e ações conforme o estado;
- abas Distribuição · Planejado × realizado · Atividades da base · Versões e histórico.
- Distribuição:
  - coluna **Disponíveis** com busca, função, marcação múltipla + “Alocar N em…” e o atalho “Restantes → base do cadastro”;
  - cartões de **operações do dia** (previsto × alocado por função, sugestões da mobilização/handover, observação), **frentes avulsas**, **bases** (derivadas de `BASE_REGIAO` da região, com atividades por pessoa) e **situações**;
  - `EscPick` (seleção múltipla com confirmação explícita; “já alocadas” movem);
  - arrastar com realce dos destinos e retirar pelo × ou arrastando para Disponíveis;
  - ⏱ períodos sequenciais (sem sobreposição) e conflito bloqueia a confirmação;
  - avisos para operação cancelada/remarcada e para quem está a bordo segundo Embarques.
- Toda mudança passa por `escMut` (lê o estado mais recente, ignora duplicata, recusa se travado e registra evento).
- Permissão: papéis `pessoal` ou `lideranca` (quando “Exigir papéis” estiver ligado).

**PDF e e-mail:**
- `escPdfBlob(snapshot)`: A4 com frentes, bases (com atividades), situações e sem alocação. Identifica versão, quem confirmou, retroativa e data de geração; tem paginação e rodapé “versão N · página x de y”. Sai só da versão escolhida.
- E-mail:
  - com Microsoft 365 conectado (`sbRef.current.mail` + login m365), “Enviar agora” usa o Graph e registra `enviado` ou `falhou`;
  - sem isso, o botão fica desabilitado com a limitação explícita, e “Baixar .eml” gera a mensagem (assunto padronizado, corpo com o resumo, PDF anexo), registrada como **preparado — envio não confirmado**;
  - os destinatários vêm das listas cadastradas e a última escolha fica em `db.slCfg.emailTo`.

**Planejado × realizado (`escApurar`):**
- **Fontes:** HI = equipe + chegada (onshore), início e conclusão; em troca de turma, a entrada e a saída de cada pessoa (`escHi`/`escEvid`). Jornada do Job-log = saída e volta à base. Sem registro = pendente, nunca estimado.
- **Operações:** realizada (HI cobre o dia), adicionada, cancelada, HI em outra data, sem HI, sem registro.
- **Pessoas:** a situação é calculada contra a **última versão**; a aderência ao **plano original (v1)** aparece à parte. Situações possíveis:
  - comprovado;
  - escalado e não consta no HI;
  - retirado na revisão;
  - realocado;
  - extra;
  - plano fora do campo mas no HI;
  - pendente;
  - sem fonte (base, folga e férias não têm registro de execução, só validação).
- Filtros (situação, operação, pessoa), validação com nota e “Encerrar apuração”.

**Histórico individual (`escHistPessoa`, perfil da pessoa e janela a partir da escala):**
- **Horários, cada um com a sua fonte:** saída da base, chegada à locação, início e término do serviço, retorno, duração total e tempo em locação.
- **Escala × execução (v1/última versão):** situação e validação.
- **Indicadores:** operações comprovadas, dias, horas em locação, deslocamento (só com jornada e HI consistentes), divergências e pendentes.
- **Filtros:** período, operação, base e situação.
- **Excel:** aba “Histórico operacional” no Excel do perfil.
- Ajustes › Pessoas ganhou o atalho 📋.

**Dependências e limites (não simulados):**
- O envio direto exige o Microsoft 365 (Entra ID) conectado com Mail.Send. Sem ele, só o .eml.
- Presença na base, folga e férias não têm fonte de execução no app; ficam para validação manual.
- O HI offshore não registra chegada à locação.
- Saída e retorno à base dependem da jornada lançada no Job-log (onshore).

**Testes:**
- `sim/e2e23.js` (66 verificações): todos os critérios de aceite, do calendário ao encerramento, com PDF e .eml baixados e HI injetado para a apuração. Os arrastes usam o mouse em passos (o `dragTo` do Playwright falha com cabeçalhos fixos);
- `e2e8.js` ajustado ao quadro novo (Sudeste);
- regressão e2e7–e2e23 (`rodar_v111.sh`) ok.
- **HTML de simulação v111** (`EARL_HAL_CMT_111_SIMULACAO.html`, prefixo `earlsim111:`).

## 4-25. Mudança anterior: v110 (Gantt: janela do recorte transparente, ordenação, só o que está na janela, filtros múltiplos de contrato/base/cliente na visão geral)

Patches `wk103/patch_eng64.py` (funcional) e `patch_eng65.py` (tradução; dados em `i18n110_dados.py`). Build: `./build_all.sh patch_eng39 … patch_eng65` (39–65 em ordem; saída idêntica à entregue).

- **Barra de período (`GanttBrush`, usada nos dois Gantts):** a janela entre as alças era opaca (`#F2F4F5`) e escondia as marcas das operações. Agora é translúcida (`rgba(204,0,0,.05)`), com a borda vermelha, e as operações dentro do recorte continuam visíveis.
- **Gantt da Engenharia (`renderPlanGantt`):**
  - **Ordenar** (`planOrd`): Sonda (A–Z), Próxima operação, Mais operações na janela, Cliente, Contrato, Base. Vale para "Por sonda" e "Sonda contínua". "Por data" já é cronológico;
  - **só o que está na janela** (`planSoJan`, ligado por padrão): somem as sondas sem operação no recorte e, em "Por sonda", as linhas de operação fora dele. É dinâmico: muda ao arrastar a janela, dar zoom ou usar os atalhos. Um contador mostra quantas sondas ficaram fora. Desligar mostra todas;
  - as linhas levam `className="eng-gl" data-rig={rigId}`, o que ajuda nos testes.
- **Engenharia › Visão geral** (`planCt==='geral'`): filtros de múltipla escolha (`MultiSel`) por **Contrato** (`ctDoJob`), **Base** (`rig.base`) e **Cliente** (`clienteName`), guardados em `planMF {ct,base,cli}` e aplicados em `planFiltered`. As opções saem das operações que existem, e há o botão "Limpar filtros". Não aparecem com um contrato em foco. A toolbar sobe de camada (`.toolbar:has(.eng-mf-flt)`) para a lista não ficar atrás do Gantt.
- **Gantt das Operações:** já mostrava só as operações da janela. Ganhou **Ordenar** (`ganttOrd`): Início, Término (mais recente), SO, Sonda, Duração (maior), Status (em andamento primeiro).
- **Testes:**
  - `sim/e2e22.js` (24 verificações): janela translúcida nos dois Gantts, sondas que somem e voltam com a janela (24h / 15 dias / 90 dias / desligar), ordenações, filtros contrato/base/cliente combinados e limpeza, filtros ausentes no contrato em foco, ordenação das Operações;
  - regressão e2e7–e2e22 (`rodar_v110.sh`) ok; HTML de simulação verificado (63 operações, sem erros).
- **HTML de simulação v110** (`EARL_HAL_CMT_110_SIMULACAO.html`, prefixo `earlsim110:`).

## 4-24. Mudança anterior: v109 (Equipamentos: inventário por região e tipo, overview com operação/local/pendências, checklists HSE com vencimento, alerta na sonda)

Patches `wk103/patch_eng62.py` (funcional) e `patch_eng63.py` (tradução; dados em `i18n109_dados.py`). Build: `./build_all.sh patch_eng39 … patch_eng63` (39–63 em ordem; saída idêntica à entregue).

- **Inventário** (`renderEquipmentList`, Equipamentos → Inventário):
  - separado por **região**: abas Nordeste / Sudeste no hub Brasil (e "Sem base" se houver); fixo nas frentes. A região vem da base (`eqBase`, `eqRegiao`);
  - depois por **tipo**: chips com contagem e pendências por tipo, e os cards agrupados por tipo;
  - KPIs (total, em operação agora, embarcados, com pendências, com pendência vencida) e filtros (busca, base da região, status, HSE, responsável, "só com pendências");
  - o card mostra o status exibido (`eqStatusVis`: "Disponível" vira "Em operação" ou "A bordo"), a base, a operação em andamento, a sonda e as pendências.
- **Página do equipamento — Overview:**
  - **Operação**: a em andamento (mobilização sem HI) ou a última, que abre o resumo (`eqOperacao`);
  - **Onde está**: embarcado na sonda (DAR → `darAlloc`, abre a sonda) ou na base;
  - **Pendências** (`eqPendencias`): manutenção e **ações** em aberto (`maintenance[].kind = 'manutencao' | 'acao'`), atividades da base (`slTasks`) e **checklists HSE** vencidos ou dentro da antecedência do alerta; as vencidas vêm primeiro; atalhos "+ manutenção / + ação / + atividade da base";
  - **Checklists HSE** com vencimento e status;
  - **Dados do equipamento** (status, base, dimensões, asset, marca, modelo, placa, chassi, CRLV, tacógrafo, ano, responsáveis, notas) e os **componentes**, quando houver.
- **Saíram**: functional location, localização fixa e a aba **Hierarquia**. A **base** só aceita Catu, Mossoró, Urucu e Macaé (grava em `equipment.base` e `equipmentMeta.fixedLocationBase`).
- **Checklists HSE** (aba renomeada):
  - `hseDocs[]` ganhou `dueDate` (vencimento informado, que manda) e `alertDays` (antecedência do alerta, padrão 30);
  - `hseDocStatus` usa o vencimento informado ou a última data + periodicidade;
  - não salva sem vencimento calculável.
- **Sonda › Visão geral:** cada equipamento a bordo com pendência vira um alerta (`.sd-aviso.eq-aviso`, vermelho se houver vencida) com as 3 primeiras pendências e o link "Ver equipamento →" (`abrirEquip`). É um link, para funcionar também no hub Brasil, onde a sonda é só consulta.
- **Testes:**
  - `sim/e2e21.js` (26 verificações): região e tipo, bases por região, overview, pendências, checklist com vencimento/alerta e alerta na sonda;
  - `e2e11` ajustado: componentes no overview, sem a aba Hierarquia;
  - `sim/vis109.js` tira as telas;
  - `e2e7` espera o aviso "salva ✓" sumir antes de arrastar no Gantt (o aviso empurrava a página no meio do arraste);
  - regressão e2e7–e2e21 ok.
- **HTML de simulação v109** (`EARL_HAL_CMT_109_SIMULACAO.html`, prefixo `earlsim109:`).

## 4-23. Mudança anterior: v108 (Disponibilidade simplificada, PPU previsto no HI, PPU por contrato nas Análises, painel do contrato, embalagens por material, aba Químicas)

Patches `wk103/patch_eng58.py` (Disponibilidade + PPU no HI), `patch_eng59.py` (PPU por contrato, Análises, painel do contrato, cards de clientes), `patch_eng60.py` (embalagens por material, Químicas, catálogos sem Origem) e `patch_eng61.py` (tradução; dados em `i18n108_dados.py`). Build: `./build_all.sh patch_eng39 … patch_eng61` (39–61 em ordem; saída idêntica à entregue).

- **Disponibilidade:**
  - sonda e poço são opcionais na engenharia (rótulos "(opcional)");
  - o HI tem 4 passos: Período, PPU, Cronológico (opcional) e Finalizar (`HI_STEPS=[8,10,11,12]`);
  - no Período só aparecem **Serviço iniciado** e **Serviço concluído**, mais o **tempo total em locação** calculado entre os dois (`.hi-tloc`); a chegada é igualada ao início e o cronológico não sobrescreve a conclusão;
  - no PDF/Excel do HI conta como início → conclusão (`mobEhDisp` entra no ramo offshore);
  - **sem FARPACK**: `supDocDefsDe` devolve lista vazia e a operação vira CONCLUÍDO só com o **HI assinado** (sem job-log); pendência "Disponibilidade: enviar o HI assinado".
- **HI › PPU** (`renderHI8`):
  - em cima, **"Previsto pela engenharia"**: as linhas que a engenharia previu, com a quantidade, **desmarcadas**; o check copia a quantidade (editável ali mesmo) e "⇩ Copiar todos" copia tudo;
  - embaixo, **"Outras linhas do contrato"**: linhas adicionadas uma a uma pelo seletor "+ adicionar linha PPU…", com × para tirar;
  - o previsto vem de `ppuInicialDoMob` (`prevEng`/`prevQty`, `checked:false`); a mobilização da disponibilidade leva `planRequest.ppuNeeds`.
- **PPU por contrato** (`ctrAnalise`, componente `CtrPpuPainel`):
  - por linha: contratado, consumido, saldo, % usado, média mensal dos últimos 6 meses e **término estimado** (saldo ÷ média; "esgotado", "sem consumo recente" ou "acima de 10 anos");
  - gráfico da **evolução do % usado** mês a mês, com a projeção tracejada até 100% e escala ampliada ou 0–100%; clique nas linhas da tabela para pôr ou tirar do gráfico;
  - Excel com as abas PPU e Evolução % (`ppuCtrExcel`).
- **Análises:**
  - saiu o bloco fixo dos contratos 23.2/25.2 da Petrobras;
  - entrou o card **"PPU por contrato — uso e término estimado"**, que segue o filtro "Contrato" do topo ou um seletor próprio (`anaPpuCt`; contratos vigentes da região).
- **Ajustes → Contratos:**
  - cada contrato abre no **📊 Painel do contrato** (`renderCtrPainel`): KPIs, operações por mês, por tipo, por sonda, PPU (o mesmo painel) e operações recentes que abrem o resumo;
  - a price list e os aditivos ficam na aba "Price list e aditivos" (`ctVista`).
- **Ajustes → Clientes:**
  - o logo fica numa placa própria (`.cl-plate`), sem empurrar o selo;
  - o selo **"N contrato(s) vigente(s) →"** abre o painel do contrato (com mais de um, a lista de contratos filtrada pelo cliente);
  - saiu o botão de embalagens.
- **Embalagens por material:**
  - `db.embalagens[] = {id, sap, material, tipo, cap, uom, padrao}`, sem cliente;
  - a migração `embMatV1` junta as antigas por material e marca a 1ª como padrão;
  - `embDoItem` usa a padrão do SAP.
- **Ajustes → Químicas:**
  - o cabeçalho não acompanha mais a rolagem;
  - sem o amarelo/"IMP";
  - nome e unidade editáveis em qualquer química (inclusive as da semente, via `chemMeta`);
  - excluir qualquer uma (as da semente ficam `oculto`);
  - coluna **Embalagem (padrão)** com o botão 📦 para cadastrar as embalagens do material;
  - um SAP (MN) por linha (`sapN`, migração `chemSapV1`); "+ Nova química" recusa SAP repetido; aviso de "mesmo nome com SAP diferente" para conferir.
- **Catálogos** (casing, spare parts, consumíveis e cimento): sem a coluna Origem.
- **Testes:**
  - `sim/e2e20.js` ampliado (Disponibilidade sem sonda, iniciado/concluído e tempo total, PPU previsto copiado e ajustado + linha manual, sem FARPACK) — 83 verificações;
  - `sim/e2e19.js` com as embalagens pela aba Químicas;
  - `sim/vis108.js` tira as telas novas;
  - regressão e2e7–e2e20 ok (e2e11 ajustado: o nome da química agora fica num campo editável).
- **HTML de simulação v108** (`EARL_HAL_CMT_108_SIMULACAO.html`, prefixo `earlsim108:`).

## 4-22. Mudança anterior: v107 (datas, linhas repetidas, tipos novos e Disponibilidade → HI, SO no handover, montagem do envio em partes, fotos e NF, ciência da divergência, Pessoas só consulta, silos consolidados, perfil da pessoa)

Patches `wk103/patch_eng53.py` (engenharia, tipos, Disponibilidade, SO, Gantt), `patch_eng54.py` (montagem do envio), `patch_eng55.py` (anexos, evidências e ciência), `patch_eng56.py` (pessoal, sonda › Pessoas, silos, perfis) e `patch_eng57.py` (perfil no Reporting do hub Brasil, breadcrumb e tradução; dados em `i18n107_dados.py`). Build: `./build_all.sh patch_eng39 … patch_eng57` (39–57 em ordem; saída idêntica à entregue).

- **Engenharia:**
  - operação nova não aceita data retroativa (`dataRetro`, `min` = hoje no calendário; aviso e "Salvar" travado). Editar operação existente continua livre.
  - **PPU, química e casing repetidos:** botão ⊕ em cada linha do `ResPicker` (`onDup`) cria outra linha do mesmo item (`_r` na chave, `baseK`); o rodapé `.rp-sum` mostra "N linhas · total X". O HI e o handover somam as linhas (`somaLinhas`).
  - **Gantt:** o drop lê o banco atual (`dbAtual.current`) e o arraste é desligado/cancelado de forma limpa (`planDragOff`), então dois arrastes seguidos e as pontas (início/duração) funcionam.
- **Tipos novos** (`TIPOS_OP`):
  - **HWO, LWO, PWC** (sem VIDA);
  - **Disponibilidade** (`disp:true`, sem VIDA): sem químicas, casing, pessoal ou equipamentos; no lugar do handover vem **"Gerar HI da disponibilidade →"** (`gerarHIDisp`, exige SO de 9 dígitos), que cria a mobilização (`disponibilidade:true`) e abre o HI em 3 passos — Período (início/fim cobrados), PPU e Finalizar (`HI_STEPS`, `hiProx`/`hiAnt`);
  - **Outros** (`outros:true`, VIDA facultativo): campo `tipoOutro` de até 20 caracteres, mostrado no lugar do tipo (`tipoTxt`).
- **Handover:** só avança com Sales Order válida (a WBS virou opcional).
- **Logística — montagem do envio:**
  - **lote editável** no item a embarcar (`e.loteOv`, mostra "pedido: …") e em cada item dentro do contentor (`setLoteItem`);
  - **porções da tesoura com lotes próprios** (`e.splitLote`) e **arrastáveis** para o contentor (`por::origem::i`);
  - **RT fora do modal**, no cabeçalho do contentor ao lado de "editar" (`.lg-rt-in`, rótulo "RT"); sem RT o envio não sai;
  - **envio em partes:** checkbox por contentor + "Selecionar todos"; só os marcados saem e os demais viram um rascunho (`status:'rascunho'`, `parteDe`) que continua na logística — dois recebimentos para o mesmo pedido;
  - pílulas dos cards ("ver rastro", "excluir", "continuar montagem", "novo envio complementar") sem texto vazando.
- **Fotos e notas fiscais** (`AnexoCampo`, IndexedDB `earl_anexos_v1`; no banco só a ficha):
  - cada contentor do envio exige **foto** e **nota fiscal** (`contentores[].fotos/nfs`);
  - o desembarque exige **RT, fotos e NF** (e aceita o nº do contentor);
  - tudo sobe ao SharePoint em `Logistica/<TIPO>/<SONDA>/` com o nome **"DD.MM.AAAA - EMBARQUE|DESEMBARQUE|DIVERGENCIA - SONDA - CONTENTOR X - RT Y - NOME"** (`nomeAnexoSP`, `subirAnexos`); sem conexão fica `spSt:'pendente'` (⏳) e o arquivo segue no aparelho.
- **Divergência no recebimento:** exige **evidência** (foto ou PDF) por item divergente (`r.evid`, `divergencias[].evid`). Na logística o card do envio mostra "Aguardando a ciência da logística" e **"Dar ciência da divergência →"** (`renderCiencia`): Esclarecido / Não esclarecido + o que houve (obrigatório), com as evidências da sonda; marcando "Reenviar a quantidade pendente" a ciência já abre o **envio complementar** com o que faltou (`complementoDe`, `hist.tipo:'div'`). Grava `divCiencia` e loga na operação; pendência `envd:` até a ciência.
- **Pessoal:** "Programar embarques" só libera com **todas as pessoas e datas** (`pesFalta`, "Para programar, falta: …"). As ações (projetar próxima turma, + embarque, editar, confirmar embarque, desembarcar) ficam em **Pessoal → A bordo** (`safeTab 'pab'`, seletor "+ embarque em…").
- **Sonda › Pessoas — só consulta:** a bordo agora (com desembarque previsto), próximos a subir, plano à frente, histórico por período (`pesHist`) e quem já trabalhou na sonda; atalho para Pessoal → A bordo.
- **Silos de cimento:** além de cada silo, o bloco **"Consolidado por tipo de cimento"** (`silosCons`: soma por tipo, ≈ t, silos e BATs).
- **Perfil da pessoa** (tile **"Pessoas"**, Reporting do hub Brasil — liderança; `renderPerfis`): busca, período e sonda; perfil com onde está agora, embarques/desembarques por sonda, operações e equipamentos; **Excel** da pessoa ou de todos do filtro (`pflExcel`: abas Pessoas, Embarques, Operações, Equipamentos).
- **Testes:**
  - `sim/t107.js` (RT no cabeçalho, fotos/NF, evidência, anexos do desembarque);
  - `sim/e2e20.js` cobre a v107 inteira (74 verificações, inclusive a aba Pessoas em inglês);
  - `drv.js`, e2e7, e2e8, e2e11, e2e13, e2e15 e e2e19 ajustados às regras novas;
  - regressão e2e7–e2e20 ok.
- **HTML de simulação v107** (`EARL_HAL_CMT_107_SIMULACAO.html`, prefixo `earlsim107:`): mesmo banco da simulação v102 (63 operações) com o app v107.

## 4-21. Mudança anterior: v106 (embalagens por cliente, handover com lotes automáticos, tesoura e RT por contentor, ajustar envio, envio complementar)

Patches `wk103/patch_eng49.py` (funcional), `patch_eng50.py` (SAP junto da descrição nos demais pontos + porções em linhas próprias), `patch_eng51.py` (tradução; dados em `i18n106_dados.py`) e `patch_eng52.py` (hub: nome da região sem espaçamento de letras, em "Nordeste / Sudeste / Brasil", centralizado). Build: `./build_all.sh patch_eng39 … patch_eng52` (39–52 em ordem).

- **Embalagens por cliente** (`db.embalagens[] = {id, clientId, clientName, sap, material, tipo, cap, uom}`): Banco de dados → Clientes → botão **📦 Embalagens** em cada cliente (`renderEmbModal`). Tipos sugeridos em `EMB_TIPOS` (capa/big bag, tote tank, bombona, tambor, saco…), unidade livre (`EMB_UOMS`). `embDoItem(db, cliente, sap, nome, uom)` acha a embalagem pelo SAP (ou nome) e converte lb↔kg e gal↔L (`uomConv`); `capM` = capacidade na unidade da química.
- **Handover:** a sugestão arredonda para cima em embalagens inteiras (`multAcima`); fora do múltiplo (`ehMultiplo`) o envio trava com a pendência "quantidade em embalagens inteiras". A linha mostra "📦 Tote tank 250 gal · 2 emb.". Gravado em `quimicos[].embalagem {tipo, cap, uom, capM, n}`.
- **Lotes automáticos** (`lotesAuto`, `LotesEditor`): o último lote é calculado (volume − soma dos anteriores); com um lote só, ele é o volume todo; "+ lote" abre o anterior para edição e o novo vira o último. `lotesFora` agora só acusa quando os lotes anteriores passam do volume (`lotesExcedem`). **Lote deixou de ser obrigatório** no handover.
- **Justificativa:** se "Solicitado p/ envio" < "Diferença a mobilizar", aparece a linha `.ho-just-row` com justificativa obrigatória (`quimicos[]/casing[].justificativa`); vai para o log e para os cards (`hoResumo`).
- **Comentários:** última seção do handover (`hd.comentarios` → `h.comentarios`), mostrada nos cards da coordenação e da logística.
- **Envio para a sonda — tesoura ✂:** cada item a embarcar pode ser porcionado (`e.splits[origem]`): a última porção leva a diferença (mesma lógica dos lotes); cada porção vai para o contentor que quiser e fica em linha própria (`porcao:true`). "↺ juntar" desfaz.
- **RT / romaneio por contentor** (`contentores[].rt`, obrigatório no modal do contentor); o RT do envio (`e.rt`) é a junção dos RTs. O cabeçalho da montagem só mostra os RTs.
- **Pedido programado (Logística):** saiu "✓ Marcar como atendido". Antes do 1º envio: "Ajustar volumes e lotes" e "Montar envio". Depois de enviado: **"✎ Ajustar envio"** (só enquanto a sonda não conferiu nenhum contentor — `envEditavel`), que reabre a montagem com contentores e itens (`e.ajuste`); salvar devolve ao estoque da base o que ia e tira o novo, grava `ajustes[]` e loga. "Montar envio complementar" só quando ainda falta item. O pedido passa a **Atendido sozinho** quando tudo foi recebido a bordo (`fecharPartesRecebidas`) e daí a logística não edita mais.
- **Recusa da sonda:** o card do envio mostra "⚠ Pendência: material recusado pela sonda" e o botão **"Novo envio complementar →"** (`novoComplementar`): cria o rascunho com os contentores recusados já carregados (RT em branco), com o histórico (RT original, data e motivos) no topo; `complementoDe` liga os dois envios e aparece no rastro. A pendência do aviso (`envr:`) some quando o complemento é enviado.
- **Recebimento na sonda:** saiu "Localização padrão a bordo"; cada contentor tem o seu local. O cabeçalho do contentor mostra o RT dele.
- **SAP junto da descrição** (`matNm(sap, nome)` → "100003670 · HALAD-344") no handover, revisão da logística, itens a embarcar, contentores, conferência, rastro, divergências, chips, desembarques, amostras e listas de pedido.
- **Diâmetros** (`TAMANHOS_REV`, em ordem decrescente): 36", 32", 30", 22", 20", 18 5/8", 18", 16", 14", 13 5/8", 13 3/8", 10 3/4", 9 7/8", 9 5/8", 7 7/8", 7", 5 1/2", 4 1/2", 3 1/2". Padrão `TAMANHO_PADRAO = '20"'`.
- **Testes:** `sim/e2e19.js` (fluxo completo: embalagens → handover → coordenação → tesoura/RT → ajustar envio → recusa → complemento → atendido). `drv.js` preenche o RT no modal do contentor e os lotes no novo modelo. Regressão e2e7–e2e19 ok (e2e7, e2e8, e2e13 e e2e15 atualizados para as regras novas: RT no contentor, lote opcional, último lote automático, "SAP · descrição" na tela).
- **HTML de simulação v106** (`EARL_HAL_CMT_106_SIMULACAO.html`, prefixo `earlsim106:`).

## 4-20. Mudança anterior: v105 (cards de região no hub e Engenharia branca no menu)

Patch `wk103/patch_eng48.py` (só visual, sem textos novos). Build: `./build_all.sh patch_eng39 … patch_eng48` (39–48 em ordem).

- **Hub de locação (Nordeste · Sudeste · Brasil):** os blocos chapados viraram cards de vidro no mesmo padrão do menu de apps (`.hub-card`: vidro `--glass-2`, borda `--glass-brd`, sombra `--sh-glass`, raio 26 px). O mapa fica num painel com o gradiente da região (`--reg`: vermelho, grafite e vinho), brilho suave no canto e sombra própria. Embaixo: nome, locais e a seta redonda (`.app-tile-go`). O selo LIDERANÇA virou pílula de vidro sobre o painel. No hover o card sobe, a sombra aumenta, o mapa cresce 5% e a seta fica preta. No celular cada card vira uma linha (painel 92 px à esquerda). Respeita `prefers-reduced-motion`.
- **Menu (Lifecycle):** o tile Engenharia deixou de ser o destaque vermelho (`primary`) e usa o mesmo card branco dos demais apps, com o chip vermelho e o ícone branco.
- **HTML de simulação v105** (`EARL_HAL_CMT_105_SIMULACAO.html`, prefixo `earlsim105:`): mesmo banco da simulação v102 (63 operações) com o app v105.
- **Testes:** regressão e2e7–e2e18 ok.

## 4-19. Mudança anterior: v104 (Análises por região, Operações com pílula única e filtros múltiplos, comentários de conversão e consumo por lote no HI)

Patches `wk103/patch_eng46.py` (funcional) e `patch_eng47.py` (tradução; dados em `i18n104_dados.py`). Build: `./build_all.sh patch_eng39 … patch_eng47` (39–47 em ordem).

- **Análises por região:** `renderAnalytics(mobs)` agora recebe só as operações do recorte (`mobs.filter(mobNoRecorte)`): Nordeste = só Nordeste, Sudeste = só Macaé/offshore, Brasil = tudo. O dashboard mostra o selo da região (`.ana-reg`). Todos os gráficos, listas, Excel e filtros da aba usam esse recorte.
- **Operações — pílula única:** `opsSwitch` agora tem `Todas as operações · Lista · Gantt` (Lista e Gantt = o que era "Execução em campo", `opsModo='campo'` + `opsView`); o seletor Lista/Gantt separado foi removido.
- **Fila "Liberadas para o campo"** (topo da Lista): compacta, uma linha por operação (`.rq`), com "Detalhes" e "Assumir →"; recolhível pelo cabeçalho. A versão em cards grandes continua só na tela do supervisor (`renderRelQueue(false)`).
- **Filtros múltiplos em "Todas as operações"** (`MultiSel`, componente de topo): Cliente, Contrato, Poço, Sonda, Supervisor/equipe e Equipamento (SAP#, junta equipamentos da mobilização e do handover). Dentro de cada caixa vale "qualquer um dos marcados"; entre caixas, todas valem. Chips das seleções e "Limpar filtros (n)". Estado em `opsMF[app]`.
- **Comentários do HI:** só conversão de unidade — libra → quilo e galão → litro (`unitConvTxt`), além das conversões que já existiam (HCl, cimento). Saiu o comentário "Item crítico" e os lotes do PDF.
- **Consumo POR LOTE no HI:** cada química mostra uma tabela de lotes (mobilizado · consumo · retorno automático). O total consumido (`q.qty`) e o retorno (`q.retorno`) saem da soma dos lotes (`lots[].cons` / `lots[].ret = vol − cons`), então a baixa do DAR/estoque (`vol − ret` por lote) segue funcionando. Avançar exige o consumo de todos os lotes mobilizados (0 vale). Química não prevista: um lote editável e "+ lote". HI antigo é convertido ao reabrir (`hiConsDeLotes`).
- **HTML de simulação v104** (`EARL_HAL_CMT_104_SIMULACAO.html`, prefixo `earlsim104:`): mesmo banco da simulação v102 (63 operações) com o app v104.
- **Testes:** `sim/e2e18.js` (análises por região, pílula, filtros múltiplos, consumo por lote, conversões). `drv.js` preenche `input.hi-cons`. e2e14 usa a aba "Lista". Regressão e2e7–e2e18 ok.

## 4-18. Mudança anterior: v103 (consumo de materiais no HI, base certa nos arquivos, HI sem documentos, offshore sem chegada, botões dos cards)

Pedido do Camillo (patches `wk103/patch_eng44.py` + `patch_eng45.py` = tradução; build: `./build_all.sh patch_eng39 patch_eng40 patch_eng41 patch_eng42 patch_eng43 patch_eng44 patch_eng45`):

- **Consumo de materiais (HI, passo 4/7):** o passo "Químicas" passou a se chamar "Consumo de materiais". Além das químicas (mobilizado / utilizado / retorno), traz os **itens críticos** da operação (casing equipment previsto na engenharia — `pj.casingNeeds`), com "＋ Item crítico não previsto" (catálogo `db.casingEquip`). Gravados em `hiData.criticos` (`{key,sap,name,unit,previsto,qty}`); não entram em Forecast/DAR/estoque (só químicas). No **PDF** o bloco virou "CONSUMO DE MATERIAIS" (químicas + críticos com a marca "Item crítico") e **sem lotes**; no Excel há a aba "Itens críticos". O retorno é só pelo **total** (por lote ficou opcional, `Retorno por lote (opcional)`), a trava de avanço exige só o retorno total.
- **Base nos nomes de arquivo (bug):** `baseOfMob` usava só a UF do poço; poço offshore (`…-RJS`) caía em "Catu". Agora `baseDoJob/baseNomeMob/baseOfMob` usam, nesta ordem: Urucu (texto), base da sonda (`rig.base`), sonda offshore → Macaé, região da operação planejada (`pj.loc`), UF do poço. Vale para nome dos arquivos, pasta do SharePoint, assunto dos e-mails, Teams e a coluna de base. `EARL_DB_REF` (variável de topo, atualizada a cada render do App) dá acesso ao banco aos helpers de topo; `mobEhOffshore(mob)` usa o mesmo caminho.
- **HI sem JSQA / 401 / JSA:** o HI é gerado sem esses documentos (o upload no passo final continua, opcional). Eles são do **FARPACK**, com **prazo de 48 h** (`hiData.farpackPrazo`, `FARPACK_PRAZO_H`): aparecem na lista do FARPACK (`supDocDefsDe` agora inclui `jsqa` para não bombeio/acidificação; `supDocsDe` considera o CP#3 enviado no HI antigo), no resumo ("Prazo de 48 h: até …"/"Prazo vencido em …"), no sino (`fp:<id>` "FARPACK: documentos pendentes", urgente depois do prazo) e no alerta de operação parada (que já existia, a 48 h).
- **Offshore sem "chegada na locação":** o formulário só pede "Serviço iniciado" (conclusão = última linha do cronológico). Ao gerar o HI offshore, `chegada = início` e `hiData.offshore=true` (assim janela do Gantt, jornada e marcos continuam funcionando). **PDF offshore: 3 cards** — serviço iniciado, serviço concluído e **tempo total de serviço** (início → conclusão); onshore continua com 4 cards (chegada, iniciado, concluído, tempo total em locação). Excel, resumo, texto do HI, e-mail e marcos (indicadores: some "Chegada → início") seguem a mesma regra.
- **Botões dos cards (Logística, Coordenação, Pessoal, Equipamentos, Laboratório):** `.lc-acts` virou grade (`repeat(auto-fit,minmax(128px,1fr))`), botões com a mesma largura e no rodapé do card; o selo de status fica sempre numa linha própria sob o título.
- **HTML de simulação v103** (`EARL_HAL_CMT_103_SIMULACAO.html`, prefixo `earlsim103:`): mesmo banco da simulação v102 (63 operações) com o app v103; as operações offshore antigas não têm `hiData.offshore`, mas o app reconhece pela sonda.
- **Teste:** `sim/e2e17.js` (consumo, base, HI sem docs, offshore, FARPACK/JSQA, sino, cards). Regressão e2e7–e2e15 e e2e16 ok. O driver `drv.js` agora entende "Consumo de materiais", `cfg.critico` e `cfg.docsNoHI`.
- **Interpretação a confirmar:** "itens críticos" = casing equipment da engenharia; "não precisa colocar … os lotes consumidos" = lotes fora do PDF do HI e retorno por lote opcional.

## 4-17. Mudança anterior: v102 (jornada da equipe e horas extras; plano × bordo, cobertura no Gantt, compras, medição, papéis/pendências e metas)

Pedido do Camillo: fazer as 6 propostas do relatório da v101 e, nas operações **onshore**, o supervisor lançar no job-log (só no app, não no .docx) a jornada de cada pessoa da equipe para estimar horas extras. Pipeline: `patch_eng39.py` (jornada + Indicadores › Jornada e horas extras + Excel), `patch_eng40.py` (compras e medição no Forecast; metas nos Indicadores), `patch_eng41.py` (Logística › Plano × bordo e cobertura no Gantt), `patch_eng42.py` (papéis e acessos, sino de pendências) e `patch_eng43.py` (EN/ES: `i18n102_dados.py` → `i18n_novos102.json`/`i18n_regras102.json`), depois do `patch_eng38.py`. Build: `./build_all.sh patch_eng39 patch_eng40 patch_eng41 patch_eng42 patch_eng43` (pasta `wk103/`; o `build_all.sh` já aplica 12–38).

- **Jornada da equipe** (job-log onshore; `mobOnshore`): `jl.jornadas` (gravado em `mob.jobLog.jornadas`, que o `sanitizeJL` preserva; o .docx não lê) = uma linha por pessoa (`jnEquipe`: `mob.people` + quem só está no HI) e por dia ("+ dia"): `{id, personId, nome, pos, sap, origem:'base'|'hotel', passouBase, iniD/iniT, viaD/viaT, volD/volT, refMin}`. Ids iniciais **estáveis** (`jnDefaults`, 'jn'+i+'-'+personId) — com `uid()` a 1ª edição se perdia. `jnCalc(r, hi)`: início = início da jornada (base ou hotel que passou na base) ou da viagem; fim = chegada na base; jornada = fim − início − refeições; extra = jornada − 8 h (`JN_LIM_H`); ida = chegada (HI) − viagem; volta = chegada na base − fim (HI); alertas > 16 h, sem refeição, descanso < 11 h (em `calcJornadas`) e "datas não batem com o HI". `genJobLogKPI` não gera sem a jornada completa (`jnPend`). Horas digitadas "0500" viram 05:00 (`jnHHMM`).
- **Indicadores › Jornada e horas extras** (`calcJornadas(db,mobs,{loc,de,ate})`, `renderJornadas`, `jnExcel`): período (este mês/mês passado/90 dias/datas), busca; KPIs; barras de extras por pessoa; consolidado por pessoa com **saldo de extras por mês** (clique abre as jornadas); por serviço; operações onshore sem jornada. Excel: Por pessoa, Saldo por mês, Por operação, Viagens, Sem jornada.
- **Compras** (Forecast): `db.compras[] = {id,sap,name,unit,qty,base,dataLimite,prevChegada,obs,status:'solicitada'|'pedido'|'recebida'|'cancelada',po,criadoEm,criadoPor,hist[]}`. "Solicitar compra" no detalhe da química; aba Compras (pedido feito com PO; recebido → `db.inventory` com lote/validade + `invMoves` kind 'compra'); e-mail .eml para `purchaseEmailTo`. `calcForecast` soma as abertas como chegada no mês de `prevChegada` (`x.entra`) e desconta da sugestão (`x.compra`).
- **Medição** (Forecast): `calcMedicao(db,mobs,ct,mes)` (PPU marcado dos HIs do mês; casa pelo nº do contrato no `contratoLabel`); preço unitário em `ct.precos[ref]`; boletim Excel; `db.medicoes[] = {ctId,mes,linhas,total,ops,assin,fechadaEm,fechadaPor}` (avisa se um HI mudou depois: `medAssin`).
- **Metas** (Indicadores › Tempos): `db.metas` (padrão `METAS_PADRAO` hoDias 7, aprovH 24, libDias 2, hiH 24, fpH 72), % dentro e operações fora (clique abre).
- **Plano × bordo** (Logística): `calcPlanoBordo(db,{hoje,dias,rigs})` por sonda offshore (plano pesado pela chance, bordo = DAR, a caminho = envios); estoque mínimo `db.rigMinimos[rigId][chave]={sap,name,unit,qty}`; "Montar envio com o que falta" abre `envDraft` com `manuais` (ref 'plano').
- **Cobertura no Gantt** (Engenharia): `calcCobertura(db,hoje)` → `{pjId:{st:'ok'|'caminho'|'falta',faltas}}`, consumo em ordem de data por sonda (offshore: DAR + envios) ou por base (onshore: estoque + compras com chegada até a data); faixa `.gp-cob` nas pílulas, tooltip e legenda.
- **Papéis e acessos** (Ajustes, hub Brasil): `db.acessos={exigir,teamsAuto,usuarios:[{id,email,nome,papeis[],regiao}]}`; `papelPermite`/`papelOk(papeis,acao)` nas ações (enviar handover, aprovar/devolver, programar logística/pessoal/equipamentos, montar envio, receber, assumir, salvar job-log, compras, medição, metas, mínimos). Desligado por padrão; admin sempre pode.
- **Pendências** (sino no topo): `calcPendencias(db,mobs,{hoje,loc,cob})` por área; filtra pelos papéis de quem está logado (sem cadastro vê tudo); clique leva à tela; resumo .eml (para o `notifyDL`) e Teams (`teamsPostMessage`); com `teamsAuto`, posta as novas (dedupe em `localStorage earl_av_teams_v1`).
- **HTML de simulação v102** (`EARL_HAL_CMT_102_SIMULACAO.html`, prefixo `earlsim102:`): banco final da simulação v102 (63 operações, 45 jornadas lançadas em 14 operações onshore, compras, medição de setembro fechada, mínimos em 2 sondas e 7 pessoas com papéis — "exigir" desligado). Relatório: `Relatorio_EARL_v102.html` (`sim/gera_relatorio102.js`).
- **Testes**: simulação refeita na v102 (`drv.jornada` lança a jornada no job-log; `extras_v102.js` cria compras, medição fechada, mínimos e papéis pela interface); `e2e16.js` (jornada, horas extras/Excel, compras, medição, metas, Gantt, plano × bordo, pendências e papéis); regressão e2e7–e2e15.

## 4-16. Mudança anterior: v101 (fluxo revisado pela simulação: inventário libera o offshore, HI com km e documentos, Forecast e Indicadores)

Origem: a transcrição "EARL – Flow review" (o fluxo que o Camillo espera) e uma **simulação de ~63 operações** (Nordeste e Sudeste) conduzida **pela interface** com Playwright, com o relógio do navegador andando de março a outubro/2026 (pasta `sim/`). Pipeline: `patch_eng34.py` (fluxo), `patch_eng35.py` (Forecast, Indicadores e estoque da base × logística), `patch_eng36.py` (EN/ES dos textos novos, `i18n101_dados.py` → `i18n_novos101.json`/`i18n_regras101.json`) e `patch_eng37.py` (sonda no hub Brasil só consulta) e `patch_eng38.py` (cancelar em campo), depois do `patch_eng33.py`. Build completo: `./build.sh patch_eng12 patch_eng12b patch_eng13 … patch_eng38` (pasta `wk103/`).

- **Bug corrigido (achado pela simulação)**: `mobOfPlanned` ligava uma operação nova à execução de outra fase do mesmo poço (mesma sonda, poço e tipo) e a mostrava como "HI gerado", travada. Agora só operações antigas já assumidas (`ASSUMIDA` sem `mobId`) usam esse vínculo, e nunca um mob que já pertence a outra operação planejada.
- **PPU do HI** (`ppuInicialDoMob(mob,db)`): as linhas vêm do contrato cadastrado (`db.contratos`, `ctrItensNaData` na data do serviço; contrato achado pelo `contratoId` da operação planejada ou pelo nº no `contratoLabel`), com as flags de HCl/pressão da lista fixa (`CONTRACT_PPU`) quando houver; o que a engenharia previu (`ppuNeeds`) já vem marcado com a quantidade (`prevEng`). Antes o rótulo "nº — base" não batia e o passo PPU vinha vazio em todas as operações da Engenharia (e em todo contrato que não fosse Petrobras), e o saldo dos contratos nunca baixava.
- **Sudeste — liberação pelo inventário** (`fecharSeProntas`): logística e equipamentos só contam quando **atendidos** (tudo recebido a bordo; `fecharPartesRecebidas` chama `fecharSeProntas`); pessoal basta programado. Recebimento parcial ou recusa mantêm "Em mobilização".
- **Assumir offshore**: `assumePlanned` preenche equipe = embarques a bordo hoje (`embAbordo`) e equipamentos = DAR `cat:'equipamento'` da sonda; `mobOff` faz o passo 1 ir direto às Químicas (rótulos "Equipe a bordo"/"Equip. a bordo"); sem ninguém a bordo não avança. LND-0501 só no onshore.
- **Handover**: VIDA com o "H" fixo (`VidaInput`, aceita colar "H123456") na engenharia, handover, operações incluídas e liberação; **pessoal obrigatório** (também em `faltaParaLiberar`) e **lote obrigatório** em cada química pedida (exceto ácido a granel, `quimSemLote`); equipamentos com coluna "A bordo" (offshore) e solicitado = previsto − a bordo.
- **HI**: fiscal opcional e no passo "Local e tempos" (offshore começa nele: `hiOff`); município da lista `db.municipios` (`MUNICIPIOS_SEED`, estimado, editável em Ajustes → Municípios e importável de planilha Município/UF/Base/Km) com km (só ida) desde a base; `kmDoHI` grava `hiData.kmEquip` = ida e volta para cada equipamento sobre rodas (`subtipoRodas`: flag `rodas` dos subtipos, Ajustes → Subtipos; padrão por `RODAS_RX`); chegada e início obrigatórios para todos; químicas com **Liberado (coord.)** × mobilizado × utilizado × retorno (catálogo só em "＋ Química não prevista"); cimentação só finaliza com **CP#3 JSQA, 401 e JSA** (`HI_DOC_FIN`; JSA e 401 já entram nos checklists do FARPACK); **avaliação gerada com o HI** (Petrobras → Avaliação; demais → CSS Excel) e o checklist exige a assinada certa (Petrobras: `avalPetro`; demais: `cssSigned`); SAP e lote no PDF do HI; tela final enxuta (sem a caixa de WhatsApp — botão "Copiar texto do HI").
- **Inventário vivo**: `postMobToDar` tira primeiro do lote declarado (mobilizado − retorno de cada lote); `postMobToBase` (retirada da planta) baixa `db.inventory` da base (lote, depois vencimento) e grava `db.invMoves`; `salvarEnvio` baixa a base ao enviar e `receberEnvio` devolve o contentor recusado (`movEstoqueBase`). Barco só leva granel seco (`granelSeco`).
- **Equipamentos**: no app Equipamentos a unidade a bordo de qualquer sonda aparece desabilitada ("já a bordo desta sonda" / "a bordo da X").
- **Marcos e tempos** (`marcosDaOp`, `fmtDur`): na janela da operação, criação → handover → aprovação → liberação → assumida → chegada → início → fim → HI → FARPACK, com a duração de cada etapa.
- **Forecast** (tile em Alignment e no Brasil; `calcForecast`, `renderForecast`, gráficos `FcProjChart`/`FcOpsChart`): horizonte 6/12 meses; base "plano + tendência" (maior entre plano do mês e média 6M) ou "só o plano"; contingência pesa pela chance; estoque = base + bordo (DAR + silos de classe G) + a caminho; por química: projeção mês a mês, ruptura, comprar até (lead-time da classificação), sugestão (demanda + mínimo − estoque); abas Por sonda (próx. 90 dias × bordo/base), Contratos (contratado, consumido, saldo, média 6M, previsto, fim pela tendência e pelo plano), Casing, Pessoal e equipamentos (pico simultâneo por mês × cadastrados); Excel.
- **Indicadores** (Reporting; `calcIndicadores`, `renderIndicadores`): tempos médios por etapa e por operação, logística por sonda (envios, recusas, divergências, a caminho > 7 dias, tempo até receber) e quilometragem por equipamento/SAP e por mês.
- **Brasil**: a página da sonda aberta pelo hub Brasil fica só consulta (`fieldset.sd-ro`); Exportar foto continua.
- **Cancelar em campo** (`patch_eng38.py`, achado pela simulação): `cancelMob(id,motivo)` grava `cancelMotivo`/`canceladaAt`/`canceladaBy` na mobilização e marca a operação planejada como `PJ_STATUS.CANC` com o motivo no `log` ("Cancelada em campo"). Antes a planejada ficava "Assumida" para sempre (Gantt, fila da sonda, escala, Forecast). A caixa `askConfirm` aceita `input:{label,placeholder,required}` e passa o texto ao `onOk`.
- **Espaço do navegador** (`patch_eng38.py`, achado pela simulação): depois de 63 operações os snapshots de "reverter" (`hal_cmt_dbsnap_v1`) ocupavam 3,4 de ~5 milhões de caracteres do localStorage. `gravaComEspaco` faz `saveDB`/`saveMobs` terem prioridade (se não couber, apaga os snapshots mais antigos — metade, depois todos — e tenta de novo) e `putSnap` limita os snapshots a `SNAP_MAX_CHARS` (1,5 milhão).
- **Indicadores › Logística**: além dos envios por contentor (offshore), mostra o **estoque das bases** a partir de `db.invMoves` — consumos do HI (retirada da planta), envios, devoluções e "sem saldo na base" (baixa maior que o estoque), com os últimos 40 movimentos.
- **HTML de simulação** (`EARL_HAL_CMT_101_SIMULACAO.html`): app v101 + banco final da simulação (63 operações; os snapshots de reverter ficam fora para caber no navegador). Pede o login normal do EARL; depois de entrar, escolher Nordeste, Sudeste ou Brasil. As chaves ficam com prefixo `earlsim101:` (não mistura com o EARL real no mesmo navegador) e as datas andam para o dia em que o arquivo é aberto. O selo "SIMULAÇÃO" (canto inferior esquerdo) tem o botão Reiniciar.
- **Simulação** (`sim/`): `harness.js` (servidor com CSP, CDN local, `page.clock.setFixedTime`), `base.js` (sondas do Nordeste fictícias, estoque das bases, DAR/silos/equipamentos de bordo e equipe embarcada), `cenario.js` (63 operações e ~290 eventos), `drv.js` (cada passo do fluxo pela interface), `roda.js <app> <pasta>` (executa com checkpoint `ckpt.json` — o container reinicia; rodar de novo retoma), `gera_sim.js` (HTML de simulação com armazenamento isolado `earlsim101:` e datas deslocadas para o dia em que é aberto, botão "Reiniciar") e `gera_relatorio.js`. Para testar rápido, `precompila_rapido.js` gera uma cópia com o JSX já compilado (carga em 2 s em vez de 3 min).
- Visual (revisado com as fotos da simulação): gráficos do Forecast ocupam a largura do card (`viewBox`), tempo médio por etapa em barras horizontais (`FcHBars`, rótulo inteiro), fim de PPU além de 5 anos aparece como "> 5 anos", UF mais largo em Ajustes → Municípios.
- Regressão (e2e7–e2e15) toda verde na v101. Testes atualizados para as regras novas: `e2e7` (lote em todas as químicas; RT obrigatória no envio de equipamento), `e2e8` (offshore assume com quem está a bordo — a sugestão da escala é testada numa sonda onshore) e `e2e11` (nome normalizado "Tanque 5000 L"; Barco é fixo desde a v100). Pendente: varredura de tradução EN/ES das telas antigas.

## 4-15. Mudança anterior: v100 (conferência de recebimento: contentor a contentor, lingada travada e certificada a bordo, Barco → silos)

Pipeline: `patch_eng31.py`, depois do `patch_eng30.py`. Atalho completo: `./build.sh patch_eng12 patch_eng12b patch_eng13 patch_eng14 patch_eng15 patch_eng16 patch_eng17 patch_eng18 patch_eng19 patch_eng20 patch_eng21 patch_eng22 patch_eng23 patch_eng24 patch_eng25 patch_eng26 patch_eng27 patch_eng28 patch_eng29 patch_eng30 patch_eng31` (parte do `EARL_HAL_CMT_88.html`; precisa de `seed97.json`, `i18n_*.json`, `hugo/` e `hugo35/` ao lado; use uma pasta própria — `wk100/` — para construir sem mexer no arquivo que um teste está lendo). Teste novo: `e2e15.js` (porta 8161). Regressão completa: `e2e7`, `e2e8`, `e2e13`, `e2e9`, `e2e10`, `e2e11`, `e2e12`, `e2e14`, `e2e15`, sempre em sequência. Traduções EN/ES dos textos novos (v97–v100) ainda não feitas.

- **Modelo**: cada contentor de `envio.contentores[]` ganha `rec={st:'recebido'|'recusado',em,por,loc|motivo}` quando a sonda decide; sem `rec` = ainda em trânsito. O envio guarda `contentoresRecebidos[]` (com as quantidades conferidas), `contentoresRecusados[]`, `recebimentos[]` (histórico de cada conferência: recebidos, recusados, adiados, local, motivos), `divergencias[]` e `alteracoes[]` acumulados. `status`: continua `enviado` enquanto sobrar contentor sem decisão; vira `recebido` (mesmo com recusa parcial) quando tudo foi decidido e algo foi recebido, ou `recusado` se tudo foi recusado.
- **Conferência** (`renderRecBox`, `receberEnvio`, `recusarEnvio`, `envPend`): um bloco por contentor com **Receber / Recusar / Receber depois**. Recusar exige o motivo do contentor; os itens dele voltam para “A embarcar” (`envPoolCalc` ignora contentor recusado; `aCaminho` de `fecharPartesRecebidas` ignora contentor já decidido). “Receber depois” deixa o contentor em trânsito; ao reabrir só ele aparece (os decididos viram etiquetas `.sd-feito`). “✕ Recusar tudo” (com motivo) vale só para o que falta decidir.
- **Localização a bordo**: passou a ser **por contentor** (`recDraft.locC`; “Localização padrão” só preenche os que não foram escolhidos). Todo material recebido fica dentro de um contentor: `cont` = `contRotulo(e,c)` (nº do contentor ou, sem número, `tipo · RT` + `#n` se houver irmãos), `loc` = local do contentor. O nº da lingada (`ling`), que antes não ia para o DAR, agora vai junto com os vencimentos.
- **Lingada e vencimentos travados**: na conferência são só leitura (campos 🔒 desabilitados; some a gravação de `alteracoes` por troca de data). No DAR, na tabela de contentores (✎), nos equipamentos móveis e no formulário do item, nº da lingada e vencimentos só se editam com **administrador**; a correção do administrador no contentor fica no log (`tipo:'correcao'`). Os demais usam a janela da lingada.
- **Janela da lingada** (`renderLingBox`, estado `lingBox`; aberta pelo alerta de vencimento de contentor/lingada na Visão geral, pelo nº da lingada na tabela “Contentores & tanques” e pelo botão 🔖 nos equipamentos móveis): **Certificar a bordo** (data da certificação, novo vencimento da lingada, opcionalmente o do contentor, nº do certificado; `lingCertificar`), **Embarcar outra lingada** (novo nº e vencimento, motivo; `lingTrocar`) e **Desembarcar** (`lingDesembarcar`: marca os itens do contentor no manifesto e abre a aba Desembarque). Tudo grava em `db.contLog[]` ({rigId,alvo,kind,tipo:'certificacao'|'troca_lingada'|'correcao',em,por,dataCert,certNo,obs,antes,depois}) + log de atividade; a aba Equipamentos mostra o card “Certificações e trocas de lingada”.
- **Barco**: novo tipo em `CONT_TIPOS` (`contEhBarco`). Na montagem do envio não pede nº/certificação/lingada (“Embarcação / nº da viagem”) e só aceita cimento e químicos. Na conferência o contentor Barco não tem local: cada item é distribuído em **silos** (`siloAloc`, soma precisa fechar com o recebido; dá para dividir em vários silos); `receberEnvio` soma no volume do silo (`rigBordo[rig].silos[].vol`, conversão para ft³ por `siloFator`: ft³/sk = 1, lb ÷ 94, kg ÷ 42,64, t), preenche `tipo`/`bat` do silo se vazio e **não** cria item de DAR.
- **Logística / Sonda**: cartão do envio mostra ✓/✕ por contentor, “Recebimento parcial” e a recusa com motivo; “Com divergência” inclui recusa parcial; rastro (`renderEnvView`) lista cada conferência (`recebimentos`) e o status de cada contentor; “Corrigir e reenviar” limpa o `rec` dos contentores copiados. Na sonda › Recebimento: “Recebimento parcial: n recebido(s) · m recusado(s) — faltam k”.
- **Robustez (patch_eng32.py)**: o arraste das pills do Gantt liga os ouvintes `pointermove/up` no próprio clique (`planDragLigar`), não mais num efeito após a renderização (com o app maior, o primeiro movimento chegava antes e o arraste se perdia).
- **Tradução (patch_eng33.py + `i18n100_dados.py` → `i18n_novos100.json` / `i18n_regras100.json`)**: ~460 textos das v90–v100 em EN/ES, 131 regras para frases com números/nomes e uma regra genérica final (`i18nJunta`) que traduz frases compostas parte por parte (" · " e " — "), deixando dados (nomes, SO, datas) intactos. Auditoria dos dicionários: EN e ES com as mesmas chaves. **Pendente**: terminar a varredura `i18n100_crawl.js <arquivo> en|es` (lista o que ficou em PT por tela) e traduzir o restante; nomes de pessoas, descrições SAP e modelos de e-mail ficam em PT de propósito. Atalho de build completo: `./build.sh patch_eng12 patch_eng12b patch_eng13 … patch_eng33` (pasta `wk102/`).
- Ambiente: depois de um reinício o container compila o app no navegador em ~3 min; os testes e a varredura usam `ready` com 420 s.
- Limitação conhecida: o desembarque da lingada reaproveita o manifesto de desembarque existente (não há “solicitar nova lingada à logística”; “Embarcar outra lingada” registra a troca já feita a bordo).

## 4-14. Mudança anterior: v99 (pílulas de Operações clicáveis, aba Operações dentro da sonda, janela de resumo da operação no padrão do planejamento)

Pipeline: `patch_eng30.py`, depois do `patch_eng29.py`. Atalho completo (parte do `EARL_HAL_CMT_88.html`; precisa de `seed97.json`, `i18n_*.json`, `hugo/` e `hugo35/` ao lado): `./build.sh patch_eng12 patch_eng12b patch_eng13 patch_eng14 patch_eng15 patch_eng16 patch_eng17 patch_eng18 patch_eng19 patch_eng20 patch_eng21 patch_eng22 patch_eng23 patch_eng24 patch_eng25 patch_eng26 patch_eng27 patch_eng28 patch_eng29 patch_eng30`. Teste: `e2e14.js` (porta 8159); regressão completa da v97–v99: `e2e11`, `e2e12`, `e2e10`, `e2e8`, `e2e7`, `e2e9`, `e2e13`, `e2e14`, sempre em sequência (nunca em paralelo com rebuild do arquivo testado). Traduções (EN/ES) dos textos novos das v97–v99 ainda não feitas. Observação de testes: a mobilização esconde pessoas com `inativo` (vindas das planilhas), então contagens de pessoas nos testes devem excluí-las; a lista geral de Operações só traz operações já aprovadas (MOB/REL/TAKEN), as só planejadas ficam em "Em planejamento na engenharia" na aba da sonda.

- **`renderOpsLista(rg)`** (substitui o corpo de `renderOpsTodas`, que agora só chama `renderOpsLista(null)`): a mesma lista (filtros `fBarra`/`fAplica`, pílulas de etapa, linhas `.ops-lc-r`) serve para "Todas as operações" e, com `rg` (a sonda), para a aba **Operações** da página da sonda (chave de filtro `sdops`, estado `sdOpsEtapa`; padrão `ord:'asc'`). Com `rg` a base é `plannedJobs` da sonda nos status MOB/REL/TAKEN (igual à lista geral, sem recorte por região) e o filtro por sonda some. Helpers novos: `opEt(j)` (etapa), `opEtapas(j,ho,mob,et)` (passos do processo, só os que existem), `irOpDaSonda(j)`.
- **Linha clicável**: na lista geral a linha (`.ops-lc-clk`, `role=button`, Enter/Espaço) chama `irOpDaSonda(j)` → `abrirSonda(j.rigId,'serv')` + `setMainTab('rig')`, zera os filtros `sdops` e destaca a operação (`sdOpFoco`, classe `lg-foco`, rola até `#op-r-<id>` por ~5 s). Os botões da linha (☰ Log, Abrir, Assumir, Handover) usam `stopPropagation` e continuam como antes. Dentro da sonda a linha abre a própria operação (`openSummary(mob)`, ou o processo completo `setProcView(ho.id)`, ou o log, conforme a etapa).
- **Aba da sonda**: a chave continua `serv` (alias `ops:'serv'`, `abrirSonda(...,'serv')`), o rótulo virou **Operações**. Abaixo da lista ficam dois cards só quando há conteúdo: "Em planejamento na engenharia" (planejadas ainda sem handover aprovado) e "Outros serviços realizados nesta sonda" (mobilizações sem pedido da engenharia). O atalho da Visão geral agora diz "todas as operações →".
- **Janela de resumo** (`renderSummaryModal`, aberta por "Abrir"/linha em Execução em campo, pelo processo completo e pela aba da sonda): refeita no padrão das janelas de planejamento (`.modal.eng-modal.ho-modal.proc-modal.sm-modal`, 1080 px, cabeçalho `.eng-mh`, corpo rolável `.eng-mb`, seções numeradas `.eng-sec`, linhas `.rev-row`, `.ho-chips`, `.db-table`, rodapé fixo `.eng-mf`). Seções: Mobilização (identificação, etapas do processo, atalhos: página da sonda, pedido da engenharia, **processo completo**, ver na análise, DAR de origem, log) · Químicas (pedido da engenharia × mobilizado × lotes, e consumido/retorno do HI) · Recursos no trabalho (pessoas e equipamentos, mobilização e HI) · HI (+ HI assinado) · Job-log / KPI · Checklists e documentos da operação · Documentos e envio (.json compilado, SharePoint, e-mail do FARPACK) · Conclusão (validação manual do admin) · Histórico (log do pedido + ações da operação numa linha do tempo só) · Gestão (edição compartilhada, editar mobilização, devolver, cancelar, excluir). Rodapé: Gerar HI · Baixar documentos · Job-log / KPI · Subir HI assinado · Editar HI · Fechar. Nenhuma função foi removida; só mudou de lugar.
- CSS novo no fim do `<style>` (`.ops-lc-clk`, `.ops-rig`, `.sm-*`).

## 4-13. Mudança anterior: v98 (Recebimento → Logística, demanda adicional com seleção múltipla, programar → montagem do envio, RT obrigatória, envios parciais)

Pipeline: `patch_eng29.py`, depois do `patch_eng28.py` (a `build.sh` precisa também de `seed97.json`, `i18n_*.json`, `hugo/` e `hugo35/` na mesma pasta — use a pasta `wk98/` para construir sem mexer no `earl_work.html` enquanto há teste rodando). Teste: `e2e13.js` (porta 8157). Traduções da v98 ainda não feitas.

- **Sonda › Recebimento → Logística**: `irLogistica(go)` leva ao card certo — pedido (aba Pedidos, Programados/A programar, `#lg-ho-<id>`), envio (aba Envios, `#lg-env-<id>`, desarquivando o filtro se preciso) ou Equipamentos. Cada movimentação de `matMovsDe` carrega `go`. Botões: "Ir para a Logística →" em "Aguardando envio", "Ver na Logística →" em "Em trânsito", na janela dos itens (`renderMatBox`) e na conferência do recebimento. O card de destino pisca por ~5 s (`lgFoco`, classe `lg-foco`).
- **Demanda adicional**: químicas, casing, equipamentos e pessoal usam o mesmo `ResPicker` da criação da operação (lista suspensa com busca e marcação de vários de uma vez; novo prop `qtyLabel`). Pessoal ganhou, abaixo do seletor, as datas de embarque/desembarque por função. O estado (`adicDraft.quim/cas/eqp/pes`) e `criarAdic` não mudaram de formato.
- **Logística › "Revisar e programar →"**: programa o pedido como veio (`programarHo` → `marcarParte(...'programado')`) e abre direto a montagem do envio (`abrirMontagem`: "A embarcar" à esquerda × contentores à direita, com o pedido em foco — banner e itens destacados primeiro). Só abre a janela de revisão quando os lotes não somam o volume (`lotesFora`); depois de programar nessa janela também vai à montagem. No cartão "Programados" há **Ajustar volumes e lotes** (reabre a revisão, sem redirecionar) e **Montar envio →**.
- **RT obrigatória**: a montagem só envia com RT (`falta`, campo com asterisco, guarda em `salvarEnvio(true)`); o rascunho continua sem RT. O envio de **equipamentos** programado pelo app Equipamentos (sai direto "em trânsito") também exige RT (`parteRev.rt`).
- **Envios parciais**: já era possível (itens fora do contentor ficam em "A embarcar" para outro envio, com data e RT próprias). Agora `hoAtend(h)` deriva o atendimento do pedido: `aguardando` · `parcial` (saiu algo e falta) · `transito` (tudo saiu, falta a sonda receber) · `completo`. Na Logística o cartão em "Programados" mostra "Atendida parcialmente · n envio(s) feito(s) · faltam k itens", com os envios (RT/situação) clicáveis. Na sonda: o envio em trânsito avisa "Atendimento parcial: faltam k item(ns) — aguardando outro envio" (`envParcial`), o card de materiais vira "Aguardando outro envio" e a Visão geral ganha o aviso "Pedido atendido parcialmente". A parte de logística só fecha como `atendido` quando tudo foi enviado **e** recebido (`fecharPartesRecebidas`).

## 4-12. Mudança anterior: v97 (planilhas no banco, filtro por tipo de contrato, etapas numa linha, pílulas e cards de Sondas)

Pipeline: `build97_seed.js` lê as planilhas (pasta `xl97/`, descompactada do zip enviado) e grava `seed97.json`; `patch_eng27.py` embute esse JSON como `PLAN97` e `patch_eng28.py` faz as telas de Sondas. Atalho: `./build.sh patch_eng12 patch_eng12b patch_eng13 patch_eng14 patch_eng15 patch_eng16 patch_eng17 patch_eng18 patch_eng19 patch_eng20 patch_eng21 patch_eng22 patch_eng23 patch_eng24 patch_eng25 patch_eng26 patch_eng27 patch_eng28`. Testes: `e2e11.js` (planilhas, operações, equipamentos, Ajustes), `e2e12.js` (pílulas e cards de Sondas) e `rodar_tudo.sh` (roda tudo em sequência; **não rode dois testes ao mesmo tempo**: cada página compila o Babel e estoura o tempo). Traduções da v97 ainda não feitas.

### Atualização do banco pelas planilhas (`plan97Aplicar(d)`, uma vez, flag `d.plan97V1`)
Mescla por chave e **nunca apaga** o que não consta nas planilhas. Roda dentro de `migrateDB` (depois das outras migrações) e grava o resumo em `d.plan97V1.resumo`, mostrado como cartão "Banco atualizado pelas planilhas" em Ajustes (botão "Entendi" grava `visto`).
- **Pessoas** (`Pessoal CMTG.xlsm` — abas Sheet2/HC; as outras duas cópias são iguais): chave = nº pessoal (SAP) ou nome sem acento. Atualiza HAL ID, nome (só se diferir de verdade), `cargo` (job do RH) e campos novos `statusRh`, `inativo`, `unidade`, `cargoRh`, `atividade`, `supervisorId/Nome`. `base`/`regiao` e `subtypeId` só são preenchidos se estavam vazios ou "Outros" (a função operacional que o usuário definiu não é sobrescrita; as divergências viram contagem no resumo). **Inativos** (`inativo:true`, 5 no RH) saem das escolhas de equipe, embarque, escala, responsável etc. (`pessoaAtiva(p)`), mas ficam no cadastro (etiqueta "inativo") e no histórico. Não foram importados datas de admissão nem centro de custo.
- **Equipamentos do Nordeste** (`Equipment NNE 1.xlsx`, aba "Listagem de equipamentos"): linhas SUPERIOR casam por SAP (com desempate por modelo/capacidade; `ref97` evita duplicar em nova execução); as que faltam entram (silos e compressores das plantas Catu/Mossoró, skids, prancha — subtipo novo `et_pr`, cabeças "Importada"; as linhas "Importada" têm colunas deslocadas e são reconhecidas pelo conteúdo). Subtipo vem da coluna "Tipo:" (`Planta`→`et_pl`, etc.). Os campos extras vão para `db.equipmentMeta[id]`: `assetNum, marca, modelo, placa, chassi, yearMade, functionalLocation, crlv, tacografo, fixedLocationBase, fixedLocation, notes`. As linhas HIERARQUIA (motores, bombas, computadores…) **não viram equipamento**: ficam em `equipmentMeta[pai].componentes` e aparecem na aba Hierarquia (rótulo conta os componentes). Pendências da contagem de ativos viram nota + `pendAtivo` (aviso no Overview); a lista inteira fica em `db.pendAtivos`. Os campos novos aparecem no Overview do equipamento (inline, salvam ao sair do campo).
- **Químicas**: `chemMeta[sap]` ganha `familia, familiaUn, fator, cogs, descSap, unSap, convSap` (116 materiais SAP de `Químicos_COMPLETO` + `Tabela de Conversões`, aba BANCO DE DADOS) e, vindo de `Químicos_Cadastro`, `leadDays, estoqueMin, fornInterno, fabInterno, backup, famCad` (lead time e flags propagam para os SAP da mesma família; estoque mínimo só no SAP da família). Materiais que não estão em `CHEMICALS` entram como químicas "custom" (aparecem nos seletores). **Sugestão de compra**: `leadDays` e `estoqueMin` do cadastro, quando > 0, passam a valer no lugar do padrão por classificação/3 meses. Ajustes → Químicas ganhou colunas (família, lead time e estoque mínimo editáveis, flags) e o cartão **LBP** (`db.lbp` = conversões base→produto; `db.lbpDil` = tabelas de diluição aditivo líquido × água × aditivo seco).
- **Contratos** (price lists): 9 contratos **drilling contractor** novos (Carolina, DS-04, DS-17, Deepwater Aquila, ODN-I, Takatsugu J, Tidal Action, West Jupiter, West Tellus; `kind:'drilling'`, base Macaé, cliente criado/ligado por `ensureClientIn`). BP e P&A já estavam iguais às price lists (mescla por `ref`). **`Price List BDII.xlsx` e `Price List Drilling Contracts.xlsm` estão protegidos por senha e não puderam ser lidos** — pedir cópias sem senha.
- **Locais de bordo** (`db.locaisDar`, 28 com movimentação e tipo de material) e **tipos de contentor** (`db.contTipos`): `rigLocaisOf(db)` e `contTiposOf(db)` somam os da planilha aos fixos `RIG_LOCAIS`/`CONT_TIPOS` (datalists e seletores do DAR e dos envios).
- Já estavam no sistema e não mudaram: sondas (41, idênticas), casing equipment, spare parts, cimento, Commander e equipamentos móveis. Ignorados: abas Sheet3/Sheet4 do `Equipment NNE` (quadro de headcount), aba "Químicos - OLD", `Tabela de Conversões`/Sheet1 (relatório de estoque por SO), a linha FLUORESCEINA (sem SAP).

### Operações (Execution → "Todas as operações")
- **Tipo de contrato**: select novo na barra de filtros (`tct`, com contagem por tipo; `ctKindDe(contratoId, label)` resolve o `kind` do contrato); a lista "Execução em campo" ganhou o mesmo filtro no painel de filtros.
- **Etapas na linha da operação** (`.ops-lc-steps`): uma única linha (`nowrap`, setas `›` entre as etapas, rolagem horizontal abaixo de 1100 px). Etapas que não se aplicam (logística/pessoal/equipamentos sem fluxo — ex.: onshore do Nordeste) **não aparecem**; vai direto de Coordenação a Campo. "Campo" ainda não iniciado fica tracejado (`st-fut`), não riscado.
- Menu: **Operações antes de Sondas** em Execution.

### Sondas
- **Pílulas do topo são filtros** (`sdKpiF`): pessoas a bordo hoje, pendências, contentores, cimento, envios a receber e alertas de equipamentos mostram só as sondas que compõem o número (ativas ou inativas), com uma faixa "n sondas · total X" e, em cada cartão, a contribuição da sonda. Clicar de novo, "✕ Limpar filtro", trocar de aba Ativas/Inativas ou clicar em "Sondas ativas" limpa.
- **Visão geral da sonda**, nova ordem: dados da sonda · dados do poço · situação operacional · alertas de equipamentos · [equipe a bordo | próximas movimentações] · [silos de cimento | produtos químicos] · programação da engenharia (largura total).

## 4-11. Mudança anterior: v96 (Sondas em Execution, amostra para o laboratório, app Laboratório)

Pipeline: `patch_eng26.py`, depois do `patch_eng25.py`. Atalho: `./build.sh patch_eng12 patch_eng12b patch_eng13 patch_eng14 patch_eng15 patch_eng16 patch_eng17 patch_eng18 patch_eng19 patch_eng20 patch_eng21 patch_eng22 patch_eng23 patch_eng24 patch_eng25 patch_eng26`. Teste: `e2e10.js` (porta 8143, imagens em `shots96/`). Traduções da v96 ainda não feitas.

### Menu
- O app **Sondas** passou de Alignment para **Execution** (`GRUPO_EARL.rig='exe'`). O novo tile **Laboratório** está em **Lifecycle** (`lab`; não aparece no hub Brasil consolidado; selo = amostras em trânsito). O selo de Logística também soma as amostras a aceitar.

### Fluxo da amostra para o laboratório (substitui o fluxo da v95)
`db.solicDesemb[] = {id,rigId,sonda,lab:'Catu'|'Macaé',itens:[{darId,sap,name,lot,qty,unit,qtyDar,unitDar,fator,qtyConf}],obs,status,fotos:[{id,name,dataUrl}],rt,logObs,labItens:[{idx,qty,lot,ifacts}],labDiv[],hist:[{at,by,acao,det,st}]}` e estados `solicitada → na_logistica → em_transito → recebida` (ou `cancelada`). Cada etapa grava um evento em `hist` (linha do tempo) e uma entrada no log (`kind:'Amostra'`). A migração `amoV96` converte registros da v95 (`rt_emitido→solicitada`, `desembarcada→em_transito`).
1. **Engenheiro** (botão "Solicitar desembarque de amostra" no inventário, no card de químicas da visão geral e na aba Desembarque): escolhe o **laboratório (Catu/Macaé)**, as químicas, os lotes e a quantidade. **Líquido (gal, bbl, L, m³) é pedido em litros; sólido (lb, ton, kg, sk de cimento) em quilos.** Conversão em `amoUn(unit,name)` (módulo, perto de `KG_PER_SK`); para saco/unidade sem peso conhecido o formulário pede os **kg por unidade**. O limite é o que há a bordo, convertido. Nada baixa do inventário nesta etapa.
2. **Supervisor** (aba **Desembarque** da sonda; pílulas também na **Visão geral** como alerta `.amo-aviso`, selo na aba e aviso no Inventário): `renderAmoSup` — marca cada química que desceu, ajusta a quantidade se foi diferente, **anexa foto obrigatória** (reduzida por `imgReduzir`, máx. 1024 px JPEG, até 4) e confirma. Aí **baixa o DAR** (`darItems` + `darMoves kind:'desembarque'`, na unidade do DAR) e o pedido vai para a logística. Também pode cancelar o pedido (antes da baixa).
3. **Logística** (Retornos → bloco "Amostras para o laboratório"; selo no tile e na aba): `renderAmoLog` — vê a foto, **aceita e despacha** informando **RT ou, sem RT, ao menos uma observação** → `em_transito`.
4. **Laboratório** (novo app `renderLab`, `mainTab==='lab'`, abas **Laboratório Catu / Laboratório Macaé**, padrão pelo hub; sub-abas **A receber** e **Histórico**): cartões das amostras em trânsito do respectivo laboratório; clicar abre o **processo completo** (`renderAmoView`: tabela solicitado → desceu → recebido, RT/observação, fotos com ampliação, linha do tempo). **Receber amostra** (`renderAmoLab`): por química, marca "confere", confirma **quantidade** e **lote** e informa o **ID IFACTS** (obrigatório e único na amostra). Diferenças de quantidade/lote viram divergência (`labDiv`, destaque no processo e no histórico). O **Histórico** lista cada química com lote conferido, quantidade, ID IFACTS, RT e quem recebeu, com busca e **⬇ Excel**.
- O **Excel/PDF da foto da sonda** (aba "Amostras para o laboratório") traz laboratório, situação na data, quantidades pedida/confirmada/recebida, RT, observação e IFACTS; o estado na data vem do `hist`.
- O snapshot de reversão do log tira as fotos (`dataUrl` vazio) para não estourar o localStorage.
- Pontos de atenção: as fotos moram no banco (sincroniza como o resto); papéis ainda não existem (qualquer usuário no app executa cada etapa); o fluxo geral de "Desembarque" (manifesto para a base) não mudou.

## 4-10. Mudança anterior: v95 (foto da sonda, processo completo, demanda adicional, amostras) — o fluxo de amostra descrito aqui foi substituído pela v96

Pipeline: `patch_eng24.py` (A) e `patch_eng25.py` (B), depois do `patch_eng23.py`. Atalho: `./build.sh patch_eng12 patch_eng12b patch_eng13 patch_eng14 patch_eng15 patch_eng16 patch_eng17 patch_eng18 patch_eng19 patch_eng20 patch_eng21 patch_eng22 patch_eng23 patch_eng24 patch_eng25`. Teste: `e2e9.js` (demora ~15 min, cada recarga compila o Babel). Traduções da v95 ainda não feitas.

### Foto da sonda (Excel + PDF)
- Botão **⬇ Exportar foto** na página de cada sonda (qualquer hub). Gera um Excel com 18 abas (Resumo, dados da sonda, poço, situação operacional, silos, pendências, inventário a bordo, químicas por SAP e lote, equipamentos, contentores, pessoal, envios, itens dos envios, desembarques, solicitações de amostra, serviços, handovers e adicionais, log) e um PDF consolidado com as mesmas seções. Código: `fotoSonda`, `fotoXlsx`, `fotoPdf` (módulo, antes de `function App()`).
- **Data passada** (`podeRetro = hubLocation==='brasil' && adminUnlocked`): só no hub Brasil e para a liderança. Ordem de fontes: (1) a **foto automática** do dia (IndexedDB `earl_fotos_v1`, chave `rigId|dia`) — o app grava uma foto por sonda sempre que o conteúdo muda (debounce de 6 s, com hash em `localStorage earl_fotos_sig_v1`); (2) se não houver foto daquela época, **reconstitui** pelos registros datados (embarques, envios, recebimentos, desembarques, amostras, movimentações do inventário `darMoves`, imagem anterior do log para poço e situação). O arquivo informa a fonte e o que é aproximado.
- Limites a lembrar: o log guarda a imagem anterior só das últimas 60 alterações (`SNAP_MAX`), por isso a reconstituição de poço e situação é limitada; lotes só são reconstituídos nos itens sem movimento depois da data; o cadastro da sonda não tem histórico. As fotos automáticas ficam no navegador de quem usa o app (como o resto do banco local) e o histórico automático só começa na data em que a v95 for publicada. Cada exportação entra no log (kind "Exportação").

### Coordenação
- Todo cartão que não está pendente abre o **processo completo** (`renderProcView`, estado `procView`): pedido da engenharia (pedido × aprovado, lotes), coordenação (comentário, alterações, histórico), áreas, envios (clicam para o rastro), operação (**Abrir a operação** ou **Abrir na Engenharia**, log e a página da sonda), demandas adicionais e a linha do tempo. A visão também abre pelas Engenharia (chips das demandas adicionais).

### Demanda adicional
- Na janela da operação planejada, quando ela é **offshore** e está em coordenação, mobilização, liberada ou assumida (não finalizada): **＋ Demanda adicional** (`renderAdicForm` / `criarAdic`). Pede motivo e itens: químicas e casing do cadastro (`MatSelect`), equipamentos por subtipo, pessoal por função e datas.
- Cria um handover novo `{adicional:true, baseId, ordem, motivo, status:'pendente'}` com o mesmo fluxo do inicial (Coordenação → Logística/Pessoal/Equipamentos → envios → sonda). **A etapa da operação não muda**: `aprovar`, `fecharSeProntas` e `devolver` têm tratamento para `h.adicional`. Recusar encerra só a demanda (`encerrada:true`). `handoverDoJob` e `puxarDeVolta` ignoram os adicionais (puxar de volta cancela os pendentes). Tudo vai para o log da operação ("Demanda adicional #n …"). Cartões e revisões mostram a etiqueta e o motivo.

### Sondas: químicas por SAP e lote
- Visão geral (card Produtos químicos), Inventário a bordo (novo card "Químicas a bordo — por SAP e lote", com validade) e "Saldo e operações em andamento" mostram **SAP, total e cada lote com a quantidade** (`quimSap`).

### Solicitação de desembarque de amostra
- Botão **Solicitar desembarque de amostra** no inventário (e no card de químicas): janela para escolher química e lote e a quantidade da amostra (até o que há a bordo). Grava `db.solicDesemb[]` (`solicitada` → `rt_emitido` → `desembarcada` ou `cancelada`).
- **Logística → Retornos** (com selo na aba): bloco "Solicitações de desembarque de amostra"; **Tratar → informar RT** (RT obrigatório, destino, observação) ou cancelar.
- Na aba **Desembarque** da sonda aparece a solicitação com o RT: **Confirmar desembarque** baixa o lote do inventário (`darMoves` com `lot`), cria o retorno (`desembarques[]`, `amostra:true`) e a solicitação vira `desembarcada`. O retorno segue como os demais (recebido na base).

## 4-9. Mudança anterior: v94 (materiais do cadastro, vencimentos, rastro dos envios, filtros e escala)

Pipeline: `patch_eng21.py` (A), `patch_eng22.py` (B) e `patch_eng23.py` (C), depois do `patch_eng20.py`. Atalho: `./build.sh patch_eng12 patch_eng12b patch_eng13 patch_eng14 patch_eng15 patch_eng16 patch_eng17 patch_eng18 patch_eng19 patch_eng20 patch_eng21 patch_eng22 patch_eng23`. Testes: `e2e8.js` (tudo o que é da v94), `e2e7.js` (fluxo completo) e `e2e6.js` (SITOP). Traduções da v94 ainda não feitas.

### Materiais sempre ligados ao banco de dados
- Componente `MatSelect` (módulo): lista pesquisável (▾ ou digitar), mostra **SAP — descrição — unidade**, e só aceita o que está no cadastro. A unidade vem do cadastro e fica somente leitura.
- Catálogos por categoria (`matCatalogo(cat)`): químicas (`chemCatalog` = CHEMICALS + `db.chemMeta`), casing (`db.casingEquip`), **spare parts** (`db.spareParts`, 75 itens do Hugo), **cimento** (`db.cimentos`, 5 itens do Hugo) e **consumíveis** (`db.consumiveis`, vazio — o usuário cadastra). A migração `matCatV1` cria as coleções.
- Ajustes ganhou as abas **Spare parts**, **Consumíveis** e **Cimento** (`renderDBCatalogo`; SAP e descrição não podem repetir).
- Usam o `MatSelect`: "+ item avulso" da Logística (categoria padrão: Química), formulário do DAR (todas as categorias, exceto equipamento), operação planejada e inventário do app Químicas, e transferência entre bases. Os assistentes de mobilização e do HI passaram a listar `chemCatalog`.

### Logística: arrastar itens
- A causa do bug era a quantidade gravada como `''` após o primeiro arrastar, lida depois como zero (`colocar`). Corrigido.
- Agora dá para arrastar nos dois sentidos: da lista "A embarcar" para o contentor, do contentor de volta para a lista (ou para outro contentor), e o ✕ continua valendo.

### Vencimentos (regra única)
- `certStatus` (módulo): vencida ou menos de **30 dias** → vermelho; menos de **60 dias** → laranja. Mensagens: "Vence em N dias — menos de 60/30 dias" e "Vencido há N dias". Componentes `VencTag` e `VencAviso`.
- Aparecem na montagem do envio (cabeçalho do contentor e aviso ao digitar a data), no cartão do envio, no recebimento (bloco "Atenção aos vencimentos"), no rastro do envio, no DAR (formulário e tabela), na aba Equipamentos da sonda, nos alertas da visão geral e em "Equipamentos → Nas sondas".
- Atenção: a regra de 90 dias para lingada e contentor do Hugo foi substituída por esta regra única (60 / 30).

### Logística: rastro dos envios
- Todo cartão de envio é clicável e abre o **rastro** (`renderEnvView`): linha do tempo (criado, enviado, recebido ou recusado, com quem e quando), divergências (enviado × recebido, com o comentário), vencimentos e a tabela por contentor.
- Envio recebido com divergência: o cartão fica marcado, a aba "Envios para sondas" ganha selo e aparece uma faixa "N envio(s) recebido(s) com divergência". Ao abrir o rastro, a divergência vira "vista" (`divVisto`).

### Filtros, ordem, períodos e arquivo (`fBarra` / `fAplica`)
- Em **Logística** (Pedidos e Envios), **Coordenação**, **Pessoal**, **Equipamentos** e **Operações**: busca (SO, WBS, sonda, poço, cliente, RT, material), períodos **Tudo | 30 | 60 | 90 dias | Período** (de/até), ordem **mais recentes ou mais antigos primeiro**, filtro por sonda e **🗄 Arquivados**. Em Operações não há arquivo.
- Envios: pills de situação (Aguardando envio, Em trânsito, Recebidos, Com divergência, Recusados). Coordenação › Aprovadas: Todas, Em andamento, Atendidas.
- Arquivar: `envio.arquivado`, ou `handover.arq[app]` (um por app: coord, ped, pes, eqp). Itens arquivados saem das listas e dos contadores, mas continuam em "Arquivados", e dá para desarquivar.

### Escala e região
- Na Escala, o painel **Operações do dia** (acima do calendário) é um alvo direto: arraste pessoas do quadro "Quem está onde", escolha no seletor ou use as "Programadas em Pessoal" (equipe pedida no handover). Ele cria ou atualiza a frente vinculada à operação (`pjId`). Ao assumir a operação, o supervisor continua recebendo a sugestão "Equipe já escalada", que já existia.
- A escala mostra só as pessoas da região do hub, com o botão **+ Incluir outra região**.
- Na mobilização (pessoas e equipamentos), as listas vêm com a região do hub (Nordeste ou Sudeste) e as pills **Nordeste | Sudeste | Todas**, com contagem. Itens já selecionados nunca somem.

## 4-8. Mudança anterior: v93 (faixa vermelha de lado a lado)

`patch_eng20.py` (depois do `patch_eng19.py`): a barra superior vermelha (`.hdr`) voltou a ser uma **faixa de largura total**, sem margem e sem cantos arredondados, no desktop e no celular. A barra branca de navegação logo abaixo continua como cápsula.

## 4-7. Mudança anterior: v92 (Sondas, recebimento com conferência, revisão visual)

Pipeline: `patch_eng19.py` roda depois do `patch_eng18.py`. Atalho: `./build.sh patch_eng12 patch_eng12b patch_eng13 patch_eng14 patch_eng15 patch_eng16 patch_eng17 patch_eng18 patch_eng19`. Testes: `e2e7.js` (fluxo completo da v89 adaptado + checagens da v92), `e2e6.js` (SITOP / v91) e `audit92.js` (contraste, fontes e janelas translúcidas em 19 telas). Traduções da v92 ainda não feitas.

### Sondas
- Página inicial: abas **Ativas | Inativas** (substituem o "mostrar inativas"). No **Nordeste** (`sdEscopo==='nne'`) há também **Todos os tipos | Perfuração | Workover** (`sdTipo`, pelo `rig.type`). Os cartões mostram o tipo.
- Página da sonda: primeira linha com **três quadros simétricos** (`.sd-top3`): Dados da sonda, Dados do poço e Situação operacional. As alturas são iguais; o conteúdo longo rola dentro do quadro (`.sd-top-body`, até 430px). A situação operacional agora é editada numa **janela** (`renderSitForm`). As demais linhas também esticam para a mesma altura.

### Engenharia
- A contingência por linha e a contingência da operação viraram **checkbox** (`.rp-cont-ck`). Saíram o pill "Firme/Contingência" e o "Não / Sim — contingência".
- Arrastar ou redimensionar no Gantt não mostra mais o aviso verde no topo (o aviso de operação travada continua).

### Handover — lotes
- `lotesFora(lista)`: se houver lotes informados, a soma tem de ser **igual** ao volume solicitado.
- Isso trava o "✓ Concluído" do handover (entra em `hoPendencias`) e o "✓ Programar" da revisão da logística, com aviso em vermelho.

### Equipamentos (pós-aprovação) → sonda
- "Programar envio" (app Equipamentos): uma lista **SAP# — descrição** por unidade solicitada, vinda de `db.equipment` filtrado pelo subtipo (a região primeiro). É obrigatória. Ao programar, nasce um envio `tipoEnvio:'equipamentos'` já **em trânsito** (`status:'enviado'`); os itens levam `origem` `hoId|e|id`, então saem do pool da logística.
- Visão geral da sonda, em Próximas movimentações → Materiais:
  - **"Materiais aguardando envio"** e **"Equipamentos aguardando envio"** são clicáveis e abrem uma caixa com os itens (`matBox` / `renderMatBox`);
  - **"… em trânsito"** leva à aba **Recebimento**.
- Aba Recebimento: "Em trânsito — aguardando o recebimento" (cartões que abrem a **conferência**, `recBox` / `renderRecBox`), "Aguardando envio" e o histórico, com a coluna Conferência.
- Na conferência, cada item é marcado ✓ Conferido ou **Divergência**. Com divergência, é preciso informar a quantidade recebida de fato e um **comentário obrigatório**. O envio guarda `divergencias[]`, e o inventário recebe a quantidade real com o comentário nas observações. Materiais vão para o Inventário a bordo; equipamentos (com `fleetId`) aparecem na aba Equipamentos.
- `fecharPartesRecebidas` fecha cada parte separadamente: a logística quando chegam os materiais, e os equipamentos quando chegam os equipamentos.

### Revisão visual
- **Fontes:** `--fm` (era monoespaçada) passou a usar a fonte do app (Univers) com algarismos tabulares. Os `fontFamily:'monospace'` inline e o Calibri de um campo de texto saíram. Os e-mails gerados continuam em Segoe UI/Calibri.
- **Janelas:** os modais ficaram opacos (fundo branco, sem `backdrop-filter`). O fundo atrás das janelas escurece mais e desfoca menos.
- **Contraste:** `--ink-3` passou a `#4D545A` e `--ink-4` a `#5F676E`, além de verde, vermelho e rótulos pequenos mais escuros. A auditoria passou de 178 achados para casos no limite, medidos contra o pior caso do gradiente.

## 4-6. Mudança anterior: v91 (DAR do Hugo na página da sonda: SITOP, pessoal e equipamentos)

Pipeline: `patch_eng18.py` roda depois do `patch_eng17.py`. Atalho: `./build.sh patch_eng12 patch_eng12b patch_eng13 patch_eng14 patch_eng15 patch_eng16 patch_eng17 patch_eng18`. Teste: `e2e6.js` (gera `sitop_teste.html` e `sitop_teste.pdf`). Traduções da v91 ainda **não** foram feitas (pedido do usuário: "não foque em traduções").

Tudo veio do card SONDAS do app Operações do Hugo (`hub_completo (35).html`, app DAR). Foi copiada a funcionalidade, não o layout.

### Visão geral da sonda (ordem pedida)
1. Dados da sonda.
2. Dados do poço — botões **⬆ Importar SITOP** e **✎ Editar**. O Editar abre uma **janela** (`pocoDraft` / `renderPocoForm`) com os campos do Hugo, do Poço até a Próxima intervenção. Não vai mais para a Passagem de serviço.
3. Situação operacional — Resumo, Situação atual e Próximas operações × MP (operação principal) e MA (operação paralela). Fica em `rigBordo.relatorio.{resumoMP,resumoMA,atualMP,atualMA,proxMP,proxMA}` (mesmas chaves do Hugo). O Editar abre o formulário no próprio card.
4. Alertas de equipamentos (`eqAlertasDe`, igual ao `renderEquipAlertas` do Hugo). A preventiva avisa 60 dias antes; a lingada e a certificação de contentor, 90 dias antes. Também entram as manutenções pendentes da frota (equipamento ligado por `fleetId`).
5. Equipe a bordo — só os embarques confirmados.
6. Silos de cimento — em ft³, com a conversão em toneladas do Hugo (ft³ × 0,0283168 × 1,85).
7. Produtos químicos — químicos do DAR somados por SAP.
8. Próximas movimentações — **Pessoal** (regra do Hugo: quem está a bordo desce na data prevista, quem aguarda sobe na data marcada) e **Materiais** (envios a caminho ou em montagem, pedidos do handover aguardando a logística ou os equipamentos, retornos para a base).

Depois desses cards vem a Programação da engenharia. Os antigos cards "A bordo (DAR)" e "Certificações" saíram, porque os alertas cobrem as certificações.

### SITOP
- Funções no nível do módulo, antes de `function App()`: `sitopLer` (HTML via FileReader; PDF via pdf.js), `sitopBloco` (acha "Unidade: NOME"), `sitopPoco`, `sitopSituacao` e `sitopLista`. Os regex são os mesmos do Hugo.
- **Uma sonda:** botão no card Dados do poço (`importarSitopSonda`). Procura o `nomePetrobras` e, se não achar, o nome da sonda.
- **Todas as offshore:** botão "⬆ Importar SITOP" na página inicial das Sondas (`importarSitopTodas`, para as sondas ativas e offshore do recorte). Mostra quais foram atualizadas e quais não foram encontradas no arquivo.
- Só os campos não vazios do arquivo sobrescrevem os dados. Ficam gravados também `rigBordo.sitopEm` e `sitopArquivo`.
- A página inicial das Sondas ganhou os indicadores do hub do Hugo: pendências totais, contentores a bordo e cimento em estoque (ft³). Os cartões das sondas mostram poço e fase.

### Pessoal (regra do Hugo)
- `embStatus(e)`: o embarque novo nasce `confirmado:false` ("Aguardando embarque"). Na data de subida aparece **✓ Confirmar embarque**, e a pessoa passa a contar como a bordo. **↓ Desembarcar** grava `desReal` (com observação); o `down` continua sendo a descida prevista.
- Registros antigos, sem `confirmado`, seguem as datas.
- Valem para "+ embarque", "projetar próxima turma" e embarques vindos do handover.
- Aba Pessoas da sonda: Solicitações pendentes do handover, Embarque, Desembarque e Quem já trabalhou nesta sonda.
- Pessoal → A bordo ganhou a lista "Aguardando confirmação de embarque".
- As Escalas continuam pelas datas planejadas.

### Equipamentos (segmentos do Hugo)
- Aba Equipamentos da sonda: Contentores & tanques (agrupados pelo `cont` dos itens do DAR; editar certificação, nº e validade da lingada e local aplica a todos os itens do contentor), Cabeças de cimentação, Equipamentos móveis, Equipamentos fixos e Ferramentas.
- Cada segmento é editável na própria linha (＋ Adicionar, ✎). Fixos e ferramentas também podem ser excluídos.
- Esses equipamentos são itens do DAR (`cat:'equipamento'`), com `classe` (`cabeca` / `movel` / `fixo` / `ferramenta`) e os campos `ultimaPrev`, `vencPrev`, `proximaPrev`, `ling`, `vencLing`, `descSap`, `peso`, `dim` e `loc`. Sem `classe`, vale a classe da frota ou o nome.
- Novo **Equipamentos → Nas sondas** (`mainTab 'eqs'`, `renderEqSondas`): o consolidado de todas as sondas com status e filtro por categoria. No hub Brasil a barra de seções é `eqpBr` (Inventário | Nas sondas).

### Passagem de serviço
- Saíram o quadro do poço (agora na janela da visão geral) e os campos MP/MA, que estavam com o nome errado de "manutenção".
- A migração `sitOpV1` move o texto antigo `relatorio.mp`/`ma` para `atualMP`/`atualMA`.

## 4-5. Mudança anterior: v90 (menus mais limpos)

Pipeline: `patch_eng17.py` roda depois do `patch_eng16.py`.
- **"Painéis offshore" apagado** (tile e rota) — redundante.
- **Quadros de app só com o nome**, sem a descrição embaixo, nos menus do Nordeste, do Sudeste e do Brasil (classe `.app-tile-so-nome`; a descrição `desc` continua no código, mas não aparece). No celular os quadros ficam em duas colunas, com o ícone acima do nome.
- O subtítulo do grupo Alignment virou "Gestão da base — químicas e compras, sondas, equipamentos e ajustes".

## 4-4. Mudança anterior: v89 (Engenharia, handover, Gantt, navegação, Sondas e processos do Hugo)

Pipeline: depois do `patch_eng11.py` rodam `patch_eng12.py`, `patch_eng12b.py`, `patch_eng13.py`, `patch_eng14.py`, `patch_eng15.py`, `patch_eng16.py` (e, na v90, `patch_eng17.py`), nessa ordem. Atalho: `./build.sh patch_eng12 patch_eng12b patch_eng13 patch_eng14 patch_eng15 patch_eng16 patch_eng17` parte do `EARL_HAL_CMT_88.html` (que é a saída dos 11 primeiros). Traduções novas em `i18n_v89.py` → `i18n_novos89.json` / `i18n_regras89.json`.

### Engenharia
- **Contingência por linha** (`ResPicker` ganhou `onCont`): cada linha de PPU, química, casing, pessoal e equipamento pode ser marcada "Contingência" com a **chance (%)**. Campos `cont` e `chance` na própria linha (`chems[]`, `ppuNeeds[]`, …).
- **Vínculo da data:** os botões viraram **"Vincular data à operação anterior" / "Não vincular"** (`PJ_ANCORAS`, valores `chain`/`fixed` mantidos).
- **Bug do vínculo corrigido:** antes só havia sugestão quando as datas se sobrepunham (com folga, ou movendo para trás, a seguinte não andava). Agora `planChain(jobs, antes, depois, travada)` move as seguintes da mesma sonda **pela mesma diferença do fim** da anterior (a folga se mantém), para a frente e para trás, até a primeira "Não vincular" ou travada. Aplicado em `savePlanned` (janela e data da Lista) e no arraste do Gantt (`moverPlanejada`), com log "Data ajustada pelo vínculo…" em cada operação movida. A cascata antiga (`planCascade`) continua só como sugestão para as não vinculadas.
- **Gantt (todos os modos: por sonda, sonda contínua e por data):** arrastar a pill muda a data; puxar as pontas muda o início ou a duração (estado `planDrag`, eventos `pointer*`). Clique sem arrastar abre a operação; o rótulo da linha também abre. As pills têm `data-pj`. O Gantt de Operações (execução real, por horas) **não** é arrastável de propósito: são registros do campo.
- **Trava:** do envio do handover em diante (`coordenacao`, `mobilizacao`, `liberada`, `assumida`, `finalizada` → `pjTravadaEng`) a engenharia só consulta (janela, Gantt e data da Lista). Para mexer: **"↩ Puxar de volta"** (agora vale também depois da aprovação, enquanto nenhum supervisor assumiu; cancela o handover e as áreas param) ou a coordenação devolver.
- **Sales Order:** só números, exatamente 9 dígitos, em todo o app (`soLimpa` / `soValida`). **Nº VIDA:** `H` + 6 dígitos (`vidaLimpa` / `vidaValida`), **obrigatório para enviar o handover** de tudo que não é bombeio/acidificação (`faltaParaLiberar`, `hoPendencias`).

### Handover
- Linhas em contingência ficam separadas das firmes (chave `…:cont`). **Backup padrão por tipo de material** (`buQuim`, `buCas`; padrão `HO_BU_PADRAO = 100`): 100% no volume firme e **0% nas linhas em contingência**; tudo editável. **"✨ Aplicar sugestão"** e "Copiar previsto" separados por tipo (químicas, casing).
- **Lotes por aditivo** (`LotesEditor`, `lotesLimpos`, `lotesTxt`): várias linhas lote + quantidade por química; gravados em `quimicos[].lotes` (e `lote` com os códigos, para compatibilidade). A logística revê/edita os lotes; o coordenador vê.
- **Equipamentos na última página** (o bug): seção própria com tipo, previsto, frota e "Solicitado p/ envio" (`hd.eqp`); entra na confirmação e no `handovers[].equipamentos`.
- VIDA por operação incluída (a principal na identificação; as demais na lista de operações).
- Com a coordenação o handover abre só para consulta; só volta a editar se for devolvido.

### Coordenação
- Devolver sem comentário: o campo fica **contornado em vermelho Halliburton** (`.ipt-err-hal`) e recebe o foco. Com comentário: **janela de confirmação** antes de devolver (`askConfirm`, que agora fica por cima das janelas do lifecycle, `zIndex 400`).

### Supervisor (mobilização)
- `chemsFromPlan` desce **um lote por linha** (`req:true`); cada lote tem "conferir" e o passo de químicas só avança com todos conferidos (`lotesPendentes`). Mexer em volume ou lote desfaz a conferência.

### Navegação
- O histórico (`navHist`) passou a guardar **aba + sub-tela** (`navKey`: contrato da Engenharia, sonda aberta, cartão do painel do Sudeste, equipamento aberto) e o efeito que empilha fica no fim do `App`. "Voltar" restaura exatamente a página anterior (ex.: Engenharia › contrato → sonda → Voltar = o contrato). Corrigido também o `navSkipRef` que ficava preso e "pulava" o próximo empilhamento.
- Os tiles abrem sempre a página inicial do app: **Sondas** na lista de todas as sondas (zera `rigSel`) e **Engenharia** na escolha do contrato (zera `planCt`). O Voltar é que devolve a sub-tela anterior.
- Os campos de Sales Order não usam `maxLength`: o corte em 9 acontece depois de tirar as letras (colar "46a0067500123" vira 460067500).

### Sondas (app `rig`, `renderRigXray` → `renderSondasHome` / `renderSondaPage`)
- **Página inicial:** indicadores, busca, filtro de ambiente, inativas; cartões por **base** (Nordeste: Mossoró, Catu, Urucu; Sudeste: Macaé) com logo do cliente, serviços, gente a bordo, itens no DAR, envios a receber, certificações e o próximo serviço. Respeita a região do hub (no Brasil, todas).
- **Página da sonda** (modelo do DAR do Hugo): Visão geral (quadro do poço, dados da sonda, equipe a bordo, próximas movimentações, silos, resumo do DAR, programação da engenharia, certificações), Serviços (programados + realizados), Inventário a bordo (`renderDarFor`), **Recebimento**, **Desembarque**, Pessoas (a bordo, embarques, quem já trabalhou), Consumo, Equipamentos (com certificação e lingada), **Passagem de serviço** (quadro do poço, pendências, MP/MA/passagem, silos) e Histórico (inventário, envios, recebimentos, recusas, desembarques, embarques, serviços e log da engenharia).
- **Toda sonda tem DAR** (acabou o `darEnabled`): `darRigs`, `saldoABordo` e a origem padrão do material olham quem tem itens declarados. Categoria nova **Casing equipment** e campo **Contentor** no item do DAR.
- Dados novos: `db.rigBordo[rigId] = {silos, poco, relatorio, pendencias[]}`. Migração **`rigBordoV1`**: o que o Sudeste guardava por nome em `db.macaeDar` foi para a sonda (itens → `darItems`, silos/poço/passagem → `rigBordo`, gente → `embarques`); o painel do Sudeste agora aponta para a página da sonda.
- **Cadastro** (`renderRigForm`, janela global; abre de Ajustes ou de "✎ Editar cadastro"): bases só **Mossoró, Catu, Urucu (Nordeste) e Macaé (Sudeste)** (`RIG_BASES`; migração `rigBasesV1`: "Offshore" → Macaé); **cliente do cadastro** (select de `db.clients`, grava `clientId`); contrato entre os do cliente; **sem "Polo"** (a sugestão de envio de 6 meses agrupa pela base).

### Processos do app do Hugo trazidos para o EARL
- **Logística** ganhou seções: **Pedidos** (handovers), **Envios para sondas** e **Retornos**.
  - Envio (`db.envios[]`): sonda, data, RT, contentores (`CONT_TIPOS`; contentor/tanque/caixa/cesta/cementing box exigem número, certificação e lingada — `contExigeCert`) e itens. O que falta embarcar (`envPoolCalc`) vem dos handovers programados (químicas **por lote**, casing) e das **unidades de equipamento** programadas, menos o que já foi em outros envios; dá para mandar item avulso. Itens entram no contentor arrastando ou pela lista (quantidade menor divide o item). Rascunho, envio, "Corrigir e reenviar" quando a sonda recusa.
  - Na sonda, **Recebimento**: confere quantidades, certificação/lingada e local; "Receber a bordo" lança no DAR (`darItems` + `darMoves` kind `recebimento`) e, quando tudo de um handover chegou, marca Logística/Equipamentos como **atendido** (`fecharPartesRecebidas`). "Recusar" exige motivo e devolve à logística.
  - Na sonda, **Desembarque**: manifesto do que sai (DAR baixa na hora, `darMoves` kind `desembarque`), destino e RT → `db.desembarques[]`; a logística marca "Recebido na base" em Retornos.
- **Pessoal:** a programação de cada vaga vira **embarque na sonda** (`db.embarques`, `origem:'handover'`); seção nova **"A bordo"** (`mainTab 'pab'`): quem está a bordo de cada sonda hoje e as trocas dos próximos 14 dias.
- **Equipamentos:** classes novas no inventário — **Equipamentos fixos (sondas)** e **Ferramentas** (`EQ_CLASSES`). As unidades programadas seguem no envio da logística.

### Testes
- `smoke89.js` abre cada tela nova (Sondas, as 10 abas da sonda, Logística, Pessoal a bordo, cadastro no Brasil).
- `i18n89_crawl.js` (com o banco que o `e2e5.js` grava em `e2e5_db.json`) percorre as telas novas em EN/ES; sobraram só nomes próprios.
- `e2e5.js` cobre o fluxo do v89: vínculo (para a frente e para trás), arrastar e redimensionar no Gantt, contingência por linha, handover (SO, VIDA, backup 100/0, lotes, equipamentos), trava, devolução com confirmação, reenvio/aprovação, logística/pessoal/equipamentos, envio em contentor, recebimento e desembarque na sonda, e o Voltar.

## 4-3. Mudança anterior: v83 (Lifecycle, clientes ligados aos contratos, menu EARL, tradução)

O pipeline ganhou `patch_eng7.py` (clientes), `patch_eng8.py` (lifecycle), `patch_eng9.py` (visual), `patch_eng10.py` (textos e tradução) e `patch_eng11.py` (Pessoal e Equipamentos seccionados), nessa ordem, depois do `patch_eng6.py`. Insumos: `hugo/clients_seed.js` (gerado por `logobbox.js` mais o script em Python que recorta os SVGs) e `i18n_v83.py` (gera `i18n_novos.json` e `i18n_regras.json`).

### Clientes (cadastro único) ↔ contratos
- **Cadastro:** `db.clients[] = {id, name, aliases[], seedId, criadoEm}`.
  - A migração `clientsV2` semeia as **35 operadoras** (mais DOW, Braskem, SLB e Foresea, estas duas a pedido do usuário; `db.clientsSeedIds` guarda o que já foi semeado, então cliente novo no `CLIENT_SEED` entra também em bancos já abertos) do zip do usuário (`CLIENT_SEED`; ANP 2026) como potenciais clientes, mais os clientes padrão (`CLIENTES_CONTRATOS`).
  - Os apelidos casam nomes antigos: "Origem" → Origem Energia, "Brava" → Brava Energia, "Petrorecôncavo" → PetroReconcavo, "Seacrest" → Seacrest Petróleo.
- **Contratos:** todo `db.contratos[]` recebe `clientId`, e o `clientName` vira cópia do nome do cliente. A migração roda a cada carga para os contratos novos.
- **Helpers** (topo do script, depois de `normNome`):
  - `findClient(db, nome)`: busca por nome e apelidos.
  - `ensureClientIn(d, nome)`: cria o cliente se faltar.
  - `clientLogoOf`: símbolo quadrado. `clientWordmarkOf`: logo completo. `clientUpload`: logo enviado em Ajustes, que tem prioridade.
- **Logos reais** (gerados por `logoreal.js` a partir de `../logos_real/`; as reconstruções vetoriais do zip foram descartadas a pedido do usuário):
  - Petrobras, Shell e BP: zips do seeklogo enviados pelo usuário (símbolo), mais o logo completo do worldvectorlogo (repositório GitHub `detain/svg-logos`).
  - Brava Energia, BGM, Alvopetro, Origem Energia, PRIO, BW Energy (v85) e Capixaba, Petrosynergy, Petroborn, Mandacaru, Nova Petróleo, Petro-Victory, Imetame, Carmo Energy, Seacrest, Foresea, Perenco, Trident Energy e Karoon (v86) SLB (v87, cadastrada como cliente com o apelido Schlumberger), FS Bioenergia e Hidroingá (v88): imagens enviadas pelo usuário, com o fundo removido e recortadas (`cropMark`/`cropFull` em `logoreal.js`; o símbolo da BGM entra sozinho no quadrado).
  - Equinor, TotalEnergies, Chevron, ExxonMobil, Galp, Petronas, CNOOC, CNPC (emblema PetroChina), Petrom e DOW: SVGs do worldvectorlogo (`detain/svg-logos`).
  - Repsol: `MrChartist/global-stock-logos`. QatarEnergy: pacote npm `@thesvg/icons`. Braskem e o símbolo da Equinor: `nvstly/icons`. Eneva e PetroReconcavo: `thefintz/icones-b3`, com o fundo cinza removido.
  - Os SVGs são recortados no conteúdo. PNGs/JPGs têm o fundo liso removido e saem em WebP.
  - **Potiguar** usa o mesmo logo da PetroReconcavo (indicação do usuário; copiado no `logoreal.js`). **CERTA** e **Creative Energy** foram removidos do cadastro a pedido (v88): CERTA saiu de `CLIENTES_CONTRATOS`, Creative saiu do `CLIENT_SEED`, e a migração `clientsPurgeV1` apaga os dois de bancos já abertos, desde que não tenham contrato. Hoje **todos** os clientes têm logo.
  - Os sites das empresas, a Wikimedia e os CDNs de logos ficam bloqueados pela rede do ambiente; dá para liberá-los em Network access.
- **Ajustes → Clientes** (`renderDBClients` reescrito):
  - Cards com o logo completo, o status ("N contrato(s) vigente(s)" ou "Potencial cliente") e os contratos reais (`db.contratos`). Clicar abre o contrato na aba Contratos.
  - Nomes antigos da mobilização sem cadastro aparecem com "Cadastrar contrato", que traz as linhas PPU do `getContractPPU`.
  - Filtros Todos / Com contrato / Potenciais; busca; apelidos editáveis.
  - Renomear o cliente propaga o nome para os contratos.
- **Contratos:** o campo Cliente virou um select do cadastro, com a opção "+ Novo cliente…".
- **Mobilização:** `contractsForClient` e `clientOptions` leem o mesmo cadastro e os contratos dele.

### Lifecycle
- **Status da operação planejada:** PLANEJADA → **EM COORDENAÇÃO** (handover enviado) → [offshore: **EM MOBILIZAÇÃO**] → LIBERADA → ASSUMIDA.
  - Cores no Gantt: coordenação `#DDA32F`, mobilização `#CA5728`.
  - `pjFase` devolve `coordenacao` / `mobilizacao`.
- **Handover** (`HO_ST`):
  - `pendente` = aguardando coordenação;
  - `reprovado` = devolvido à engenharia;
  - `aprovado` = em mobilização (offshore);
  - `programado` = liberado para o campo;
  - depois `atendimento` / `atendido` / `cancelado`.
  - Campos novos: `versao`, `equipamentos[]` (tipo × quantidade, das `equipNeeds`), `equipe[]`, `partes{logistica, pessoal, equipamentos: {status: pendente|programado|atendido}}`, `historicoCoord[]`, `comentarioCoord`, `alteracoesCoord`, `solicitadoEng` (o pedido original de cada linha).
- **Coordenação** (`mainTab 'coord'`, `renderCoord` / `renderCoordRev`):
  - Abas: Aguardando / Devolvidas / Aprovadas.
  - A revisão permite editar o aprovado de químicas, casing, datas de embarque, equipe e equipamentos.
  - **Reprovar** exige comentário. As operações voltam a PLANEJADA com `devolvida{em, por, comentario}`; a Engenharia mostra o alerta (`engAlerta`) e a janela da operação mostra o comentário; o botão "✎ Revisar e reenviar" gera a versão +1.
  - **Aprovar:** onshore → LIBERADA (fila do supervisor). Offshore → EM MOBILIZAÇÃO e `partes` para Logística (químicas/casing), Pessoal (embarques) e Equipamentos.
  - As alterações vão para o log.
- **Logística** (`'logi'`, `renderHoInbox` + `renderHoReview`): programa (volumes e lotes) e marca como atendido.
- **Pessoal** (`'pes'`) e **Equipamentos** (`'eqp'`) (`renderParteApp` / `renderParteRev`): Pessoal escolhe a pessoa por vaga e as datas; Equipamentos escolhe as unidades por tipo.
- `marcarParte` muda o status da parte. `fecharSeProntas` libera as operações (LIBERADA) quando todas as partes estão programadas.
- **Log da operação:**
  - Fica em `plannedJobs[].log[] = {em, por (currentUser = e-mail do Entra ID quando ligado), acao, detalhe, comentario, alteracoes[]}`.
  - Registra criação, revisão, envio/reenvio, reprovação, aprovação (com alterações), distribuição, programação de cada área, liberação, assunção (no salvar da mobilização) e "puxar de volta".
  - Janela: `renderLogView` (`logView` = id da operação). Aparece em Operações, Coordenação, nas três áreas e na janela da operação.
- **Operações (Execution):** `opsModo` `'todas'` (padrão, `renderOpsTodas`) | `'campo'` (a lista antiga de mobilizações).
  - "Todas as operações" lista o que a coordenação aprovou (EM MOBILIZAÇÃO, LIBERADA, ASSUMIDA), com status, etapas (Engenharia, Coordenação, Logística, Pessoal, Equipamentos, Campo), log e as ações Abrir / Assumir / Handover. Há filtro por etapa.

### Menu EARL
- Seções (só o nome, sem a letra — v84, pedido do usuário): **Execution** (Operações), **Alignment** (Químicas, Sondas, Painéis offshore, Ajustes), **Reporting** (Análises, Brasil consolidado) e **Lifecycle** (Engenharia, Coordenação, Logística, Pessoal, Equipamentos).
- **Pessoal e Equipamentos são um app cada, seccionado** (`patch_eng11.py`, `APP_SECOES` + `secBar`). O usuário reorganizou apps que já existiam, sem criar novos:
  - Pessoal = **Liberações** (`'pes'`, embarques vindos da coordenação) | **Escalas** (`'sl'`).
  - Equipamentos = **Liberações** (`'eqp'`) | **Inventário** (`'equip'`).
  - Escalas e Inventário saíram do menu como tiles soltos; a trilha mostra "Pessoal" / "Equipamentos". No Brasil consolidado nada muda.
- O mapeamento fica em `GRUPO_EARL`. O tile "Logística offshore" saiu (a Logística nova substitui).
- Selos de pendência nos tiles (`SELO`): devolvidas na Engenharia; aguardando na Coordenação; partes pendentes em cada área; liberadas em Operações.

### Engenharia
- Título "Engenharia" + subtítulo "Planejamento de operações.".
- O angle bracket segue o guia (pg. 35): 0,75 X, no canto superior esquerdo, afastado 1 X da linha das maiúsculas (`.pg-head{font-size:40px}` e `::before` em em).
- O chip da região fica à direita.

### Tradução
- `i18n_crawl.js` percorre as telas em EN e em ES e lista o texto que ficou em PT (`i18n_faltando_<lang>.json`).
- As entradas novas estão em `i18n_v83.py`. As regras com número ou variável usam regex; com prefixo `JS:`, a função é escrita à mão.
- Rótulos de região nas telas do Brasil consolidado: NNE → Nordeste, Macaé → Sudeste. Nomes próprios (grupo "Mobilização CMT NNE", e-mails, arquivos) não mudaram.

### Testes
- `e2e4.js` cobre o fluxo completo: offshore com reprovação → reenvio → aprovação com alteração → Logística → Pessoal → Equipamentos → Operações/log/assumir, e o caso onshore (aprovação → campo).
- `e2e3.js` é a regressão da v80.

## 4-2. Mudança anterior: v82 (referência "AI dashboard", sem azul)

O usuário mandou como referência um dashboard de IA do Dribbble (azul/lavanda), pedindo o mesmo ar de modernidade **sem nada azul**. Pipeline: `patch_eng5.py` roda depois de `patch_eng4.py`.

**Visual** (camada CSS `EARL v82` no fim do `<style>`):
- **Casco flutuante:** a faixa vermelha do topo e a barra de navegação viraram cápsulas arredondadas, com margem. O logo continua sobre vermelho sólido.
- **Superfícies:** cartões com lavagem de luz neutra (token `--card-wash`), raios de 26 a 32 px, fundo com focos de luz cinza.
- **Botões em pílula:** vermelho para a ação principal, preto `#141718` para a secundária, branco para a terciária.
- **Abas** (Gantt/Calendário/Lista/Handovers e as de Ajustes): controle segmentado com a aba ativa em pílula preta.
- **Engenharia:**
  - O card **Visão geral** virou o destaque: gradiente entre vermelhos **sólidos** da marca (`--red-wash`: `#D71F34` → `#CC0000` → `#961B24`), número grande e fino com as operações dos próximos 30 dias, faixa de 30 dias em branco e pílulas `#961B24` (total, contratos, próxima, contingência).
  - Esse card tem um **anel** com o "% prontas para o campo": operações dos próximos 30 dias com status LIBERADA ou ASSUMIDA.
  - O card ocupa 2 colunas no desktop.
  - O kicker em caixa alta virou um chip com o mapa da região.
  - As setas dos cards viraram botões redondos.
- O tile Engenharia do menu usa o mesmo gradiente vermelho.

**Escala tipográfica** (`patch_eng6.py`, bloco `ESCALA TIPOGRÁFICA (v82)`). O usuário achou as fontes desproporcionais: a medição mostrou mais de 16 tamanhos, de 9 a 84 px. Ficaram 9 degraus, em tokens `--t-*`, e nada abaixo de 11 px:
- 11 rótulo
- 12 legenda
- 13 secundário e controles (botões, abas, trilha)
- 14 corpo e campos
- 16 título de card
- 20 título de janela
- 26 número ou título de seção
- 40 título de página
- 56 número de destaque

Display em peso 300, títulos em 700. Também entraram nessa escala estilos inline que fugiam dela: rótulos de grupo do menu, "Densidade", botões de logo dos clientes e os selos "PADRÃO". O botão antigo "📍 TROCAR LOCAÇÃO" virou pílula `btn-o`.

No celular, o card de destaque usa grid: número e anel lado a lado. Para re-medir os tamanhos, rode `typeaudit.js`, que gera `typeaudit_run.js` a partir de `shots81.js`.

**Sem azul e sem rosa:**
- O turquesa `#06868C` saiu de `CT_ICON_CORES`, do selo da região Sudeste (agora grafite `#43494E`) e do subtipo Skid Silo. O `migrateDB` também troca a cor que já estava salva.
- O status de handover "Programado" passou a âmbar (`#6B4E0E`/`#FBF4E4`).
- Bordas azul-claras (`#BAE6FD`, `#C7D2FE`, `#BFDBFE`, `#94A3B8`, `#CBD5E1`) viraram os neutros da marca.
- Os rosas `#FBEDEE`/`#F0D3D6` viraram neutros, inclusive o selo "Liberada".
- Ficam apenas o roxo da contingência (pedido na v79) e as bandeiras dos idiomas.

## 4-1. Mudança anterior: v81 (design "Vidro Halliburton")

### O que entrou na v81
Redesign visual do sistema inteiro, com foco na Engenharia, na barra de navegação e no menu. O pipeline de patches ganhou `patch_eng4.py` (roda depois de `patch_eng3.py`).

**Direção visual:**
- Uso de escritório, de dia: base clara `#ECEFF0` com luzes neutras e painéis de vidro fosco **branco** (`backdrop-filter`).
- Regras do brand guide Halliburton v1.2:
  - Vermelho `#CC0000` sempre sólido, só em ação primária, estado atual e no angle bracket dos títulos H1. Nunca com transparência, nunca em tom de rosa: os tokens `--acc-soft`, `--acc-brd` e `--dgr-soft` viraram neutros, e o botão vermelho desabilitado fica cinza chapado.
  - Transparência apenas em neutros. Sem azul.
  - Univers → Arial (o CSP não permite fontes externas). Títulos em peso Light 300, grandes; numerais tabulares.
- Camada CSS no fim do `<style>`, sob o comentário `EARL · VIDRO HALLIBURTON (v81)`. Tokens novos: `--glass`, `--glass-2`, `--glass-3`, `--glass-brd`, `--hair`, `--hair-2`, `--blur`, `--sh-glass`, `--ring`. Os raios passaram a 10/16/22/28.

**O que mudou na tela:**
- **Barra de navegação** (`renderMainTabs`, `buildCrumbs`):
  - Voltar virou um botão redondo (o texto "Voltar" fica só para leitor de tela).
  - O chip ▦ troca a locação (`.crumb-hub`). O chip da região, com mapa (`.crumb-loc`, "Nordeste"/"Sudeste"/"Brasil"), abre o menu.
  - Separadores "/" e o título atual em negrito.
  - O antigo botão "⌂ Hub" saiu.
  - Na Engenharia a trilha é Região / Engenharia / *contrato*; clicar em "Engenharia" volta à escolha do contrato.
  - No celular só aparecem região e página atual.
- **Menu de apps:** tiles de vidro (`.app-tile-v2`) com chip de cor sólida (variável `--tile`), nome, descrição em 2 linhas e seta. A Engenharia é o tile primário, em vermelho sólido. Os tiles do painel Macaé seguem o mesmo padrão; os tiles do hub de locação continuam chapados.
- **Engenharia** (`renderEngHub`, classes `eng2-*`):
  - Cabeçalho `pg-head`: kicker, H1 "Engenharia" grande com bracket e subtítulo.
  - Cards de contrato em vidro: logo do cliente (`ClientMark`), nome, cliente e número, faixa de carga dos próximos 30 dias (cada operação é um traço na cor da etapa do Gantt; contingência em roxo), números (operações, sondas, próxima, contingência), tags (tipo e bases) e entrada animada.
  - O card "Visão geral" é grafite sólido.
  - Com um contrato aberto, a barra `eng2-ctbar` mostra logo, título, cliente, número de operações e "⇄ Trocar contrato".
- **Logos dos clientes:**
  - `CLIENT_LOGO_SEED` guarda os padrões embutidos (chave = `normNome(cliente)`, valor = data URL). **Ainda está vazio**: aguarda os arquivos oficiais do usuário.
  - `db.clientLogos[normNome] = {src, nome, arquivo, updatedAt, updatedBy}` é a versão substituível.
  - `clientLogoOf(db, nome)` dá prioridade ao banco e, sem logo, cai no seed.
  - `ClientMark({nome, src, size, geral})` mostra o logo numa caixa branca; sem logo, mostra o monograma com `ctCor` e `ctIniciais`.
  - Em Ajustes → Clientes ficam os botões "Enviar logo", "Trocar logo" e "Remover logo". SVG é guardado como está; PNG, JPG e WEBP são reduzidos a no máximo 640 px. A lista inclui os clientes de `db.contratos`.
- **Componentes:** abas viraram controle segmentado; tabelas e cabeçalhos ficaram mais leves; os botões (`btn-r`, `btn-g`, `btn-o`) e campos são arredondados, com foco grafite; modais e overlay em vidro. `ana-head h2` ganhou o bracket no lugar da linha vermelha.
- As telas de menu e hub ficaram com fundo transparente, para o vidro funcionar.

**Testes:**
- `shots81.js` gera screenshots de desktop e de 390 px.
- `e2e3.js` foi atualizado: seletores `.eng2-card`, `.crumb-loc` e `.app-tile:has(.app-tile-name:text-is(...))`, porque as descrições dos tiles agora contêm palavras como "Operações".

## 4-0. Mudança anterior: v80 (Nordeste/Sudeste, offshore e Handover)

### O que entrou na v80
- **Hub:** NNE virou **Nordeste** e Macaé virou **Sudeste**.
  - O Sudeste deixou de abrir o app separado de Macaé e passou a usar o mesmo menu do Nordeste (Engenharia, Escalas, Químicas, Equipamentos, Sondas, Operações…). Os painéis do Hugo continuam disponíveis em "Acompanhamento offshore".
  - Os rótulos da região estão em `REGIAO_LABEL`, no `locLabel` e no chip de região da barra (v81).
  - A lista de Operações filtra por região via `mobRegiao` / `mobNoRecorte`: a região vem da operação planejada de origem (`plannedJobId` → `loc`) ou da sonda.
- **Sondas offshore do Hugo:** `HUGO_RIGS_SEED` (41) entra em `db.rigs` com `ambiente:'offshore'`, `base:'Macaé'` e cliente/contrato deduzidos do forecast. Flag `hugoRigsV1`.
- **Operação offshore** (sonda com `rigAmbiente(r)==='offshore'`): o painel "Embarque do pessoal (offshore)" aparece abaixo do Pessoal.
  - Funciona por pessoa, como no Hugo: com 🔗, embarque = D + `offEmb` (padrão −5) e desembarque = D + `offDesemb` (padrão +5); sem vínculo, datas fixas.
  - Grava `peopleNeeds[].pessoas=[{vinc,offEmb,offDesemb,emb,desemb}]`. Helper `pePessoas(n,date)`.
- **"Salvar e liberar" virou "Enviar Handover →"** (rodapé da operação e botão "Handover →" na lista). Em `renderHandover`, estado `hoDraft`:
  1. **Identificação:** box com Sales Order e WBS. Basta **uma das duas**; o Nº VIDA é opcional (o supervisor confirma). `faltaParaLiberar` agora cobra só "Sales Order ou WBS".
  2. **Itens**, no modelo do handover do Hugo:
     - "Operações incluídas" permite somar outras operações planejadas da mesma sonda.
     - Tabela de **químicas** e de **casing**: necessidade da operação, backup % (padrão do handover ou por linha), necessidade com backup, **a bordo**, diferença a mobilizar e **solicitado** (editável).
     - O "a bordo" vem do DAR da sonda (`db.darItems` no Nordeste, `db.macaeDar[sonda].itens` no Sudeste), via `saldoABordo`.
     - Botões "✨ Aplicar sugestão" e "📋 Copiar previsto → solicitado".
     - No offshore, há a tabela de **embarque de pessoal** (previsto × solicitado).
  3. **Confirmação**, que grava em `db.handovers[]`: `{id, status, loc, contratoId, contratoLabel, clienteName, rigId, sonda, offshore, salesOrder, wbs, buPadrao, opIds, operacoes, quimicos[], casing[], pessoal[], aBordoFonte, criadoEm/Por}`. As operações incluídas ficam **LIBERADAS**, com `handoverId`.
- **Ciclo do handover** (`HO_ST`):
  - `pendente`: a engenharia ainda edita ("✎ Editar handover") ou cancela com "Puxar de volta".
  - `programado`: a logística offshore revisou volumes e lotes e programou. Fica travado para a engenharia.
  - `atendimento` / `atendido`: o supervisor assumiu uma ou todas as operações.
  - `cancelado`.
- **Recebimento:**
  - A Engenharia ganhou a vista **Handovers**, que mostra o status de cada envio.
  - A **Logística offshore** mostra os handovers recebidos (`renderHoInbox`) e "Revisar pedido → ✓ Programar" (`renderHoReview`). A janela de embarque inclui o pessoal pedido nos handovers (tag HANDOVER).
  - Na fila "Liberadas para o campo" (Operações), cada card mostra o resumo do handover.
  - Ao assumir, as químicas pré-carregadas são o **solicitado** do handover (`chemsFromPlan`).
  - O passo 1 do supervisor aceita **SO ou WBS** (`canNextMob`); o campo `job.wbs` foi incluído.
- A lista de clientes do cadastro do serviço inclui os clientes dos contratos (ex.: BP).

## 4-A. Mudança anterior: v79 (Engenharia + dados do Hugo)

### 4.1 "Planejamento" virou **Engenharia**
- Mudou o rótulo do tile e da trilha (`PAGE_META.plan`) e as referências "módulo Planejamento" na interface. A sub-aba "🗺 Planejamento" de Químicas e os cartões do hub Macaé **não** mudaram.
- **Tela inicial = escolha do contrato.** São cards no estilo `contract-card` do Hugo: ícone com as iniciais do cliente, nome, cliente, número, tipo, bases, operações, sondas, próxima data e contingências. Há também um card **Geral**, que mostra todos os contratos juntos.
  - Os cards vêm de `db.contratos` (não arquivados, do recorte NNE/Macaé do hub).
  - Estado: `planCt` (`''` = tela de escolha, `'geral'`, ou o id do contrato). `ctSel` é o contrato em foco.
  - Com contrato em foco, `planFiltered` filtra por `pjDoContrato(j, ct)` (por `contratoId`, ou pelo número dentro do `contratoLabel` nas operações antigas). O conflito de frota continua olhando todos os contratos (`planBase`).

### 4.2 Janela de nova operação (redesenhada)
Função `renderPlanForm`, classes CSS `eng-*`.
- **Cliente e contrato não são mais pedidos:** vêm do card escolhido e aparecem num chip no cabeçalho. No modo **Geral** aparece um seletor de contrato.
- Seções: Template → 1 Identificação → 2 Programação → 3 Previsão de recursos → 4 Observações.
- "Ocupa (dias)" virou **"Duração (dias)"**.
- Campo **WBS** novo, depois da Sales Order (`wbs`).
- **Ancoragem** com só duas opções: "Ancorar na operação anterior" (`chain`) e "Não ancorar" (`fixed`).
- **Contingência** Sim/Não. Com Sim aparece o **risco de 0 a 100%** (slider e campo), gravado em `contingencia` e `risco`.
- Saíram da janela os atalhos "Raio-X da sonda", "Escala do dia" e "Forecast de químicas". O "▤ Operação completa" continua quando já foi assumida.
- **Previsão de recursos** usa o componente `ResPicker` (top-level, antes de `function App`). É um dropdown com checkboxes e busca por código ou descrição (até 400 itens), com "Concluir seleção" e a lista do que foi escolhido (código, descrição, unidade e quantidade prevista):
  - **Itens PPU** → `ppuNeeds:[{ref,desc,unit,qty}]`, a partir de `ctrItensNaData(contrato, data)`.
  - **Químicas** → `chems:[{sap,name,unit,qty,lot}]` (mesmo formato de antes, porque o forecast de químicas o consome). Vêm de `CHEMICALS` mais as químicas cadastradas em `db.chemMeta`.
  - **Casing equipment** → `casingNeeds:[{sap,name,unit,qty}]`, a partir de `db.casingEquip`.
  - **Pessoal** → `peopleNeeds:[{funcao,qty}]`, com as funções em `FUNCOES_EQUIPE` e um campo "Outra função…".
  - **Equipamentos** → `equipNeeds:[{subtypeId,qty}]`. **Só o tipo e a quantidade**, mostrando a frota disponível.

### 4.3 Templates de operação
- Coleção `db.opTemplates[] = {id, name, contratoId, clienteName, contratoLabel, fields, createdAt/By, updatedAt/By}`. Os campos guardados estão em `TPL_FIELDS`: tipo, revestimento, duração, ancoragem, contingência, risco, observações e recursos. Sonda, poço, data, SO, WBS e VIDA ficam de fora.
- **"⧉ Salvar como template"** fica ao lado de "Duplicar", no rodapé da janela. Pede um nome; se o nome já existe no mesmo contrato, o template é atualizado.
- **"⧉ Criar template"** fica ao lado de "+ Nova operação". Abre a mesma janela em modo template (`planDraft.__tpl`) e salva sem criar operação.
- **Seletor "Template"** no topo da janela: aplica o template e auto-preenche os campos. O botão "Excluir template" apaga o template selecionado.
- Funções: `saveTemplate`, `deleteTemplate`, `tplPick`. Estado do diálogo de nome: `tplAsk`.

### 4.4 Gantt
- `PJ_GANTT_COR.contingencia` (roxo `#6B3FA0`). `pjCor` devolve roxo enquanto a contingência ainda não foi assumida pelo campo; depois disso a barra segue a etapa real.
- **Legenda** acima do Gantt, com todas as cores, a data original e "agora". O calendário usa as mesmas cores. A lista mostra cliente/contrato e uma etiqueta "Contingência · N%".

### 4.5 Dados do Hugo incorporados (em `migrateDB`)
- **Casing equipment:** `CASING_EQ_SEED` traz 101 itens (banco de casing e forecast do Hugo, sem duplicar o SAP) para `db.casingEquip`. Há uma aba nova **Ajustes → "Casing equipment"** (buscar, incluir, editar e excluir).
- **Equipamentos:** `HUGO_EQUIP_SEED` traz 97 itens (11 skids/silos e 86 cabeças/peças Commander) para `db.equipment`, com `base:'Macaé'`, `regiao:'macae'`, `classe` móvel/cabeça, subtipo deduzido e `origem:'hugo'`.
- **Pessoas:** `HUGO_PEOPLE_SEED` (180) vai para `db.people`, sem duplicar SAP ou nome; 124 entraram. A base vem da área (Macaé/Catu/Mossoró), o nível é deduzido do cargo e o cargo original fica em `cargo`.
- **Correção de bug:** excluir uma química customizada em Ajustes → Químicas referenciava a variável inexistente `cc`; foi trocada por `cm`.

---

## 5. Como testar (o que foi usado)
1. **Sintaxe:** extrair o bloco `<script type="text/babel">` e compilar com `@babel/core` + `@babel/preset-react` (script `check_jsx.js`).
2. **Execução:** Playwright + Chromium com as bibliotecas servidas localmente via `npm` (mesmas versões), interceptando cdnjs e alcdn, com o mesmo CSP do deploy.
   - Liberar admin com `sessionStorage['hal_cmt_admin_unlock_v1']='1'` e a região com `localStorage['hal_earl_location_v1']='nne'`.
   - Para ter sondas, gravar um banco a partir de `SEED_DB` com `rigs` no `localStorage`.
3. Fluxo verificado na v79:
   - escolher contrato, criar operação e salvar como template;
   - nova operação a partir do template (auto-preenche, inclusive contingência e risco);
   - criar template avulso;
   - modo Geral (pede contrato);
   - barra roxa e legenda no Gantt, calendário, lista;
   - Ajustes → Casing, Equipamentos (Macaé) e Pessoas;
   - tela de celular (390 px) e inglês.
   - Nenhum erro de página.

---

## 6. Próximos passos sugeridos / pendências
- **Achados da simulação de 50 operações na v104 (conferidos no código da v112, ainda abertos):**
  - Logística → Retornos: "✓ Recebido na base" (`retRecebido`) só muda a situação; o material devolvido não entra no estoque da base (`db.inventory`/`invMoves`). Sugestão: dar entrada pelas químicas e cimento do retorno com `movEstoqueBase(+1)`, motivo "retorno RT …".
  - Handover → Pessoal: confirmar o embarque de todos não marca a parte `pessoal` como `atendido` (fica "programado"; a liberação aceita assim de propósito).
  - Reenvio depois de devolução: `abrirHandover` reabre com o `solicitado` antigo mesmo com o plano revisado.
  - Sugestão de envio: "a bordo" é o saldo de hoje, sem reservar o que as operações anteriores da mesma sonda ainda vão consumir (hoje só há a justificativa).
  - Montagem do envio: não confere o saldo da base; envio maior que o estoque só vira "falta" no movimento.
- **Municípios (v101):** a lista `MUNICIPIOS_SEED` (~43 municípios de Catu, Mossoró e Urucu) e os km são **estimados**. O Camillo vai mandar a lista real (Município, UF, Base, Km só ida) — importar em Ajustes → Municípios → Importar planilha. As linhas importadas perdem a etiqueta "estimado".
- **Brasil só consulta (v101):** a página da sonda no hub Brasil está travada (`fieldset.sd-ro`), mas janelas abertas a partir dela (divs clicáveis que abrem modais) ainda podem permitir ações. Revisar uma a uma.
- **Forecast (v101/v102):** lead-time e estoque mínimo vêm da classificação das químicas (planilha). Desde a v102 há a solicitação de compra (registro + .eml); o pedido em si continua no SAP.
- **Horas extras (v102):** estimativa pela regra de 8 h por jornada menos refeições. Não considera DSR, feriados, adicional noturno nem acordos — se o RH quiser usar para folha, definir as regras com eles.
- **Papéis (v102):** "Exigir papéis" e "Avisar no Teams" desligados por padrão; ligar quando o Entra ID estiver ativo e os e-mails dos usuários estiverem cadastrados em Ajustes › Papéis e acessos.
- **Tradução:** a varredura EN/ES das telas antigas está parada esperando o OK do Camillo (os textos novos da v101 a v104 já têm EN/ES).
- **Logos:** todos os clientes do cadastro têm logo. Clientes novos criados em Ajustes começam com monograma até alguém enviar o arquivo. Basta o usuário mandar o arquivo (incluir em `logoreal.js` e regenerar `hugo/clients_seed.js`) ou enviá-lo por Ajustes → Clientes.
- Avaliar se Químicas também deve virar seções do app Logística (Liberações | Inventário/compras), como Pessoal e Equipamentos. Hoje Químicas fica em Alignment.
- **Lifecycle:** papéis e permissões (quem pode aprovar na Coordenação ou programar em cada área) ainda não existem; hoje qualquer usuário age. Quando o Entra ID estiver ativo, ligar a grupos. Faltam também os e-mails e notificações a cada passo, e levar as alterações do coordenador nos equipamentos onshore de volta ao `equipNeeds` da operação.
- O vidro v81 cobre os componentes compartilhados. Telas antigas com estilo inline (ex.: callout com `borderLeft:'3px solid var(--acc)'` nas Análises) ainda podem ter detalhes do visual anterior.
- Recorte por região ainda **não** aplicado em: Escalas, Químicas e Equipamentos. Engenharia, fila de liberadas, Operações, Sondas, Logística e Pessoal → A bordo já respeitam Nordeste/Sudeste.
- Do DAR do Hugo ainda faltam: **fotos** dos contentores, troca de turma com anexos, relatório diário em .docx, KPI/satisfação por operação e a importação do SITOP. O envio em contentores, o recebimento/recusa, o desembarque, a passagem de serviço, pendências, silos e quadro do poço já estão no EARL.
- O backup padrão é por tipo de material dentro de cada handover (100% firme / 0% contingência). Se quiserem um padrão fixo por produto no Banco de Dados, falta o cadastro.
- Os cartões do **hub Macaé** ("Engenharia" e "Planejamento" no modelo do Hugo) ainda são a cópia do BD II. O próximo passo natural da unificação é levar Macaé para a mesma Engenharia por contrato (os contratos BP e P&A já existem em `db.contratos`).
- Os recursos previstos (PPU, casing, pessoal) ainda **não** alimentam outras telas. Só as químicas entram no forecast e só os equipamentos entram no conflito de frota. Possíveis próximos passos: saldo de contrato previsto × consumido, forecast de casing e pessoal, e pré-preenchimento da mobilização.
- O subtipo de equipamento "Outros PSL ou Macaé" não tem cor e aparece com texto branco sobre branco em Ajustes → Equipamentos. É anterior à v79.
- Ativar a Fase B (Entra ID e SharePoint) e embutir os IDs em `DEFAULT_CFG`.
- Não existe repositório git para o arquivo único. O versionamento é pelo nome do arquivo (`EARL_HAL_CMT_NN.html` / `earl-deploy-NN.zip`) e pela constante `EARL_VERSION`.

## 7. Como pedir mudanças ao próximo Claude
- Anexe o `index.html` atual e diga o que mudar.
- Peça para ele **mapear antes de editar**: grep pelas funções citadas acima (`renderPlanForm`, `renderEngHub`, `migrateDB`, `ResPicker`, `I18N_EN`…).
- Peça para ele **validar** (compilar com Babel e testar no Chromium) e para entregar um zip `earl-deploy-NN.zip` com `index.html` + `staticwebapp.config.json`, mais os comandos PowerShell de deploy.
- Peça para ele **atualizar este `.md`** a cada nova versão.
