# Instruções para o Claude — repositório DAR (EARL, EARL Engenharia, EARL Gerencial)

- **Usuário:** Hugo (Halliburton Cementing Brasil). Não é programador: responder em **português (BR)**, simples e passo a passo.
- **Prompt de continuidade:** `engenharia/EARL_prompt_continuidade.md` descreve o projeto, as versões e como continuar.
- **Regra de entrega (pedido do usuário):** sempre que houver alteração, **enviar ao usuário o `engenharia/EARL_prompt_continuidade.md` atualizado junto com os arquivos alterados**, e commitá-lo na mesma alteração. Ele precisa dizer o que foi feito por último, o que está pendente e como continuar.
- **Testar antes de entregar:** rodar os testes novos e todos os anteriores e dizer o resultado (inclusive falhas):
  - `gerencial/tests/`: `e2e_gerencial.js`, `e2e_matriz.js`, `e2e_registros.js`, `e2e_tabelas.js`, `e2e_compartilhar.js`;
  - `engenharia/tests/` e `engenharia/teste_bp/e2e_bp.js` (Engenharia e o Gerencial com os dados do BP).
- **Gerencial:** o app é `gerencial/gerencial.html`; o `gerencial/EARL_Gerencial.html` é gerado por `gerencial/build_gerencial.py` (ver `gerencial/README.md`). Atualizar `VERSAO` e o README a cada mudança.
