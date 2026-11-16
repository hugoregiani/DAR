# Vídeo tutorial do EARL Engenharia (como usar, passo a passo)

Pedido do Hugo (16/11/2026), depois do vídeo de apresentação (`../video/`): "o que eu preciso é um vídeo com passo a
passo, com walkthrough… um vídeo didático que mostra como usa."

Resultado: `EARL_Engenharia_tutorial_V01.mp4` (9 min 10 s, 33,6 MB) — a tela do próprio `EARL_Engenharia.html` gravada em uso, com os dados
de demonstração (`../demo.js`): o mouse anda e clica, o texto é digitado, o que vai ser clicado fica destacado em
vermelho e a **faixa embaixo da tela** explica cada passo (número da parte, nome da parte e o que fazer). 1920×1080,
30 quadros/s, H.264 + AAC (trilha suave e baixa, sem narração), com **capítulos** (um por parte) e a lista em
`capitulos.txt`.

As 12 partes (cada uma abre com um cartão "Parte N de 12"; o tempo é o início do capítulo na V01):

1. 0:05 — Abrir o arquivo (ferramentas, Receita e margem, cards dos contratos)
2. 0:30 — Ver o plano do contrato (Gantt, Calendário, Lista)
3. 1:00 — Planejar uma operação (dados, vínculo de data, contingência, Itens PPU, químicas, casing, pessoal, risco da linha)
4. 3:28 — Enviar o handover (o que vai para a sonda, comentários, Para/Cc, pré-visualização, .eml, REV 2)
5. 4:39 — Lançar o consumo (data do serviço, Copiar previsto, ajustar, Consumo e receita)
6. 5:17 — Informar o câmbio do mês
7. 5:48 — Atualizar o banco de químicos pela planilha (e o de casing, igual)
8. 6:20 — Contar o inventário da sonda
9. 7:04 — Filtrar e ordenar as tabelas
10. 7:42 — Colocar a logo do cliente
11. 8:16 — Arquivo do gerencial e planilhas para Compras
12. 8:49 — Guardar uma cópia (exportar/importar dados; não abrir pela pré-visualização do Outlook/Teams)

## Como gerar de novo (depois de mudar uma tela que aparece aqui)

```bash
cd engenharia/walkthrough/tutorial
RAPIDO=1 node gravar_tutorial.js saida        # confere o roteiro em ~3 min (sem gravar); tem de terminar sem "ERRO"
EARL_LOGO=<earl_hd.png> node gravar_tutorial.js saida   # grava (~15 min); a logo EARL é a do ../video (não vai para o repositório)
node montar_tutorial.js saida saida/EARL_Engenharia_tutorial_V01.mp4
```

- `gravar_tutorial.js`: abre o app no Chromium (1440×720 × 4/3 = 1920×960; o Chromium sobe com
  `--force-device-scale-factor=1.3333333`, senão o screencast sai em 1440×720 e fica borrado), monta os dados de
  demonstração e grava pelo *screencast* do Chromium (quadros JPEG com o horário de cada um). O roteiro está em `PARTES[1..12]`: cada passo é
  `legenda(texto)`, `clicar(alvo, texto)`, `digitar(alvo, valor, texto)`, `escolher`, `preencher` (datas), `rolar`,
  `destacar` e `arquivo` (janela "Abrir" de mentira + o arquivo escolhido). O alvo fora da tela, ou coberto por uma
  barra fixa, é trazido com rolagem suave antes do clique, e o clique mede o alvo de novo logo antes de clicar (um
  aviso que some no topo desloca a tela). Grava `sessao.json` (quadros, legendas com o horário, capítulos e o caminho
  do cursor). Para gravar só algumas partes: `node gravar_tutorial.js saida <html> 1,2,3`.
- **Cursor:** em 1920×960 o screencast dá só ~15 quadros/s nos movimentos; por isso o cursor da página fica escondido
  e o `montar_tutorial.js` desenha o cursor a 30 quadros/s pelo caminho gravado (`sendcmd` + `overlay@c` do ffmpeg).
- `overlay.js`: a camada por cima do app (onda do clique, destaque vermelho, cartões das partes, janela "Abrir").
- `montar_tutorial.js`: desenha a faixa de cada legenda (1920×120, Inter), junta tela + faixa, a trilha
  (`../video/trilha.py` com `TRILHA_SUAVE=1`, um "whoosh" por parte, volume 0,32) e os capítulos (ffmetadata) no MP4.

Precisa do Playwright com o Chromium (como os testes), do ffmpeg, de Python 3 com numpy e da fonte Inter.
