# Instruções para o Claude — repositório DAR (EARL, EARL Engenharia, EARL Gerencial)

- **Usuário:** Hugo (Halliburton Cementing Brasil). Não é programador: responder em **português (BR)**, simples e passo a passo.
- **Prompt de continuidade:** `engenharia/EARL_prompt_continuidade.md` descreve o projeto, as versões e como continuar.
- **Regra de entrega (pedido do usuário):** sempre que houver alteração, **enviar ao usuário o `engenharia/EARL_prompt_continuidade.md` atualizado junto com os arquivos alterados**, e commitá-lo na mesma alteração. Ele precisa dizer o que foi feito por último, o que está pendente e como continuar.
- **Testar antes de entregar:** rodar os testes novos e todos os anteriores e dizer o resultado (inclusive falhas):
  - `gerencial/tests/`: `e2e_gerencial.js`, `e2e_matriz.js`, `e2e_registros.js`, `e2e_tabelas.js`, `e2e_compartilhar.js`;
  - `engenharia/tests/`: `e2e_engenharia.js`, `e2e_contratos.js`, `e2e_quimicos.js`, `e2e_espaco.js`, `e2e_inventario.js`; e `engenharia/teste_bp/e2e_bp.js` (Engenharia e o Gerencial com os dados do BP).
- **Painel de Compras** (repositório `hugoregiani/painel-compras-quimicos`): lê as planilhas "Inventário das sondas" e "Consumo de produtos químicos" exportadas pela Engenharia (`eng_inventario.js`). Ao mudar colunas dessas planilhas, mude também a leitura lá (`COLUNAS_ENGENHARIA`) e rode `testes/compras-simulacao/engenharia.js`.
- **Gerencial:** o app é `gerencial/gerencial.html`; o `gerencial/EARL_Gerencial.html` é gerado por `gerencial/build_gerencial.py` (ver `gerencial/README.md`). Atualizar `VERSAO` e o README a cada mudança.
