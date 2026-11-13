# Walkthrough do EARL Engenharia (PDF no padrão Halliburton)

Pedido do Hugo (13/11/2026): "prepara um walkthrough no padrão do arquivo em anexo (EARL_Demo_walkthrough.pdf) para os
usuários do arquivo da engenharia. Simples, claro e direto."

Resultado: `EARL_Engenharia_passo_a_passo_V01.pdf` — 33 páginas de 960 × 540 pt (16:9, como o PowerPoint de referência):
capa com a foto, "O que você está vendo", "Antes de começar", o caminho de uma operação, 6 seções e 21 passos (uma tela
com o texto ao lado, ou duas telas), "O que este passo a passo não mostrou" e "Obrigado". As telas são do próprio
`EARL_Engenharia.html`, com **dados de demonstração** (`demo.js`: 3 contratos com números e valores inventados,
14 operações, consumo, inventário e câmbio).

## Como gerar de novo (depois de mudar o app)

```bash
cd engenharia/walkthrough
python3 preparar_imagens.py <EARL_Demo_walkthrough.pdf>        # foto e logos (não vão para o repositório)
node capturar.js inicio,cards,matriz,logo,contratos,plano,novaop,handover,bancos,inventario,arquivos
node capturar.js consumo
python3 gerar_deck.py                                          # textos e ordem dos slides
node render.js EARL_Engenharia_passo_a_passo_V01.pdf png       # PDF (Chromium) e as prévias em prev/
```

Precisa do Playwright com o Chromium (como os testes) e de uma fonte compatível com Arial (Liberation Sans).
