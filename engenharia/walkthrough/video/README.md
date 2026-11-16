# Vídeo do passo a passo (EARL Engenharia)

Pedido do Hugo (13/11/2026): "faça um vídeo do passo a passo nos padrões do vídeo em anexo" (vídeo de apresentação
do EARL, 1280×720, 87 s). Resultado: `EARL_Engenharia_video_V01.mp4` — 1920×1080, 30 quadros/s, 1 min 44 s,
~8,8 MB, H.264 + AAC, em português, com as telas do app e os dados de demonstração (`../demo.js`).

Cenas (como no vídeo de referência): abertura EARL · o problema (cartão escuro + rede de planilhas e e-mails) ·
a solução em 5 passos · 01 Planejar, 02 Handover, 03 Consumo, 04 Receita, 05 Compartilhar (telas em janela,
tablet e celular, com os passos no topo e o cursor clicando) · uma operação, um registro · bancos de dados ·
indicadores (barras e contadores) · tudo num arquivo só · encerramento.

Sem narração (não há voz em português de boa qualidade aqui); trilha de fundo suave sintetizada em `trilha.py`
(sem direitos de terceiros). `EARL_Engenharia_video_V01_roteiro_narracao.txt` traz o texto com os tempos,
para gravar uma narração por cima, se quiserem.

## Como gerar de novo

1. Telas do computador: `../capturar.js` (ver `../README.md`); telas de celular: `node capturar_celular.js <pasta img>`.
2. Na pasta deste vídeo, uma pasta `img/` com as telas (`05_gantt.jpg`, `08_nova_op.jpg`, `10_handover.jpg`,
   `13_lancar_consumo.jpg`, `02_receita.jpg`, `02b_matriz.jpg`, `20_gerencial.jpg`, `21_planilhas.jpg`,
   `cel_email.jpg`) e os logos `earl_hd.png` e `hal_cem_hd.png` (recortados do quadro final do vídeo de referência).
3. `node gravar.js quadros 2.6,24,45 prev` (prévias) e `node gravar.js video video_mudo.mp4 30` (quadros → MP4).
4. `python3 trilha.py trilha.wav 104.5` e
   `ffmpeg -i video_mudo.mp4 -i trilha.wav -c:v copy -c:a aac -b:a 160k -shortest -movflags +faststart EARL_Engenharia_video_V01.mp4`.

`trilha.py` também serve ao vídeo tutorial (`../tutorial/`): `python3 trilha.py saida.wav <duração> "<trocas>"`
(segundos das trocas de cena, separados por vírgula) e `TRILHA_SUAVE=1` (sem o arpejo).

`video.html` é a animação: cada elemento tem `data-a` (início), `data-d` (duração) e `data-fx` (efeito); `render(t)`
desenha o quadro do tempo t. Textos, tempos e posições do cursor (`CURSOR`) ficam nesse arquivo.
