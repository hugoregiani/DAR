# Instruções para o Claude — repositório DAR (EARL, EARL Engenharia, EARL Gerencial)

- **Usuário:** Hugo (Halliburton Cementing Brasil). Não é programador: responder em **português (BR)**, simples e passo a passo.
- **Prompt de continuidade:** `engenharia/EARL_prompt_continuidade.md` descreve o projeto, as versões e como continuar.
- **Regra de entrega (pedido do usuário):** sempre que houver alteração, **enviar ao usuário o `engenharia/EARL_prompt_continuidade.md` atualizado junto com os arquivos alterados**, e commitá-lo na mesma alteração. Ele precisa dizer o que foi feito por último, o que está pendente e como continuar.
- **Testar antes de entregar:** rodar os testes novos e todos os anteriores e dizer o resultado (inclusive falhas):
  - `gerencial/tests/`: `e2e_gerencial.js`, `e2e_matriz.js`, `e2e_registros.js`, `e2e_tabelas.js`, `e2e_compartilhar.js`;
  - `engenharia/tests/`: `e2e_engenharia.js`, `e2e_contratos.js`, `e2e_quimicos.js`, `e2e_espaco.js`, `e2e_inventario.js`, `e2e_painel.js`, `e2e_e10.js`; e `engenharia/teste_bp/e2e_bp.js` (Engenharia e o Gerencial com os dados do BP).
  - Ao mexer em `engenharia/contratos_reais/` (ou no app), gerar de novo os HTML dos contratos reais e rodar `engenharia/contratos_reais/e2e_contratos_reais.js` (precisa das planilhas do usuário, que não ficam no repositório).
- **Painel de Compras** (repositório `hugoregiani/painel-compras-quimicos`): lê as planilhas "Inventário das sondas" e "Consumo de produtos químicos" exportadas pela Engenharia (`eng_inventario.js`). Ao mudar colunas dessas planilhas, mude também a leitura lá (`COLUNAS_ENGENHARIA`) e rode `testes/compras-simulacao/engenharia.js`.
- **Engenharia × Gerencial:** a seção "Receita e margem" da página inicial da Engenharia é o próprio `gerencial/gerencial.html` (modo embutido, iframe), embutido pelo `engenharia/patch_engenharia.py`. Mudou o Gerencial? Gere de novo o `EARL_Gerencial.html` **e** o `EARL_Engenharia.html` e rode os testes dos dois.
- **Contratos reais (`engenharia/contratos_reais/`):** um `EARL_Engenharia_<NOME>.html` pré-carregado por planilha de contrato (PA, DC, CE, BW, BDII, Shell), gerado pelo `gerar_html.js` (leitor: `leitor_planilhas.js`). Mudou o `EARL_Engenharia.html`? Gere de novo esses arquivos para o usuário. Planilhas e HTML gerados não vão para o repositório (dados reais).
- **Gerencial:** o app é `gerencial/gerencial.html`; o `gerencial/EARL_Gerencial.html` é gerado por `gerencial/build_gerencial.py` (ver `gerencial/README.md`). Atualizar `VERSAO` e o README a cada mudança.
