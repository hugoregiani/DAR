# Walkthrough do EARL Forecast (antes "EARL Engenharia"; PDF no padrão Halliburton)

Pedido do Hugo (13/11/2026): "prepara um walkthrough no padrão do arquivo em anexo (EARL_Demo_walkthrough.pdf) para os
usuários do arquivo da engenharia. Simples, claro e direto."

Resultado: `EARL_Engenharia_passo_a_passo_V01.pdf` — 33 páginas de 960 × 540 pt (16:9, como o PowerPoint de referência):
capa com a foto, "O que você está vendo", "Antes de começar", o caminho de uma operação, 6 seções e 21 passos (uma tela
com o texto ao lado, ou duas telas), "O que este passo a passo não mostrou" e "Obrigado". As telas são do próprio
`EARL_Engenharia.html`, com **dados de demonstração** (`demo.js`: 3 contratos com números e valores inventados,
14 operações, consumo, inventário e câmbio).

**V04 (25/11/2026, e16):** o nome passou para "EARL Forecast". A página inicial tem as abas 📊 Indicadores e
📁 Contratos (o `capturar.js` troca de aba com `aba('ind')`/`aba('cts')`). O passo 1 é "A aba Contratos", o passo 3 é
"A aba Indicadores" e o passo 19 virou "Juntar os contratos de várias pessoas" (tela `20_por_contrato.jpg`: Indicadores ›
Por contrato), no lugar do antigo "Arquivo do gerencial". **Os vídeos (`video/` e `tutorial/`) ainda mostram o nome e a
página inicial antigos**; serão gravados de novo junto com a narração.

## Como gerar de novo (depois de mudar o app)

```bash
cd engenharia/walkthrough
python3 preparar_imagens.py <EARL_Demo_walkthrough.pdf>        # foto e logos (não vão para o repositório)
node capturar.js inicio,cards,matriz,logo,contratos,plano,novaop,handover,bancos,inventario,arquivos
node capturar.js consumo
python3 gerar_deck.py                                          # textos e ordem dos slides
node render.js EARL_Forecast_passo_a_passo_V04.pdf png # PDF (Chromium) e as prévias em prev/ (versão atual: V04, 25/11/2026)
```

Precisa do Playwright com o Chromium (como os testes) e de uma fonte compatível com Arial (Liberation Sans).

## Vídeos

- `video/` — vídeo de **apresentação** (1 min 44 s, no padrão do vídeo do EARL): o que é o EARL Engenharia.
- `tutorial/` — vídeo **tutorial** (como usar, passo a passo, em 12 partes): a tela do app gravada em uso, com o
  mouse clicando, o texto sendo digitado e uma faixa embaixo explicando cada passo. Ver `tutorial/README.md`.
