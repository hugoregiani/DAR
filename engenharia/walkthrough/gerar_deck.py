#!/usr/bin/env python3
"""Gera deck.html (slides 1280x720 = 960x540 pt, no padrão do EARL_Demo_walkthrough.pdf) para virar PDF no Chromium."""
import html
import os

E = html.escape
DEMO = 'Dados de demonstração: poços, Sales Orders, VIDA, números de contrato e valores são fictícios.'

CSS = r'''
@page { size: 1280px 720px; margin: 0 }
* { box-sizing: border-box }
html, body { margin: 0; padding: 0; background: #fff }
body { font-family: Arial, 'Liberation Sans', Helvetica, sans-serif; color: #333; -webkit-print-color-adjust: exact; print-color-adjust: exact }
.s { position: relative; width: 1280px; height: 720px; overflow: hidden; page-break-after: always; break-after: page; background: #fff }
.s:last-child { page-break-after: auto; break-after: auto }
.linha { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: #CC0000 }
.copy { position: absolute; left: 64px; top: 683px; font-size: 8.6px; color: #8C8C8C }
.pg { position: absolute; left: 0; right: 0; top: 680px; text-align: center; font-size: 11.5px; color: #6E6E6E }
.hal { position: absolute; right: 61px; top: 676px; width: 186px }
.tit { position: absolute; left: 62px; top: 38px; right: 60px; font-size: 42px; line-height: 1.1; color: #333; font-weight: 400; letter-spacing: -.2px }
.kick { position: absolute; left: 62px; top: 112px; font-size: 13.5px; font-weight: 700; color: #CC0000; text-transform: uppercase; letter-spacing: .1px }
.corpo { position: absolute; left: 62px; top: 146px; right: 62px; font-size: 18.5px; line-height: 1.42; color: #333 }
.corpo p { margin: 0 0 11px }
.corpo b.v { color: #CC0000 }
.fecho { position: absolute; left: 62px; right: 62px; top: 505px; font-size: 17px; font-weight: 700; color: #CC0000; line-height: 1.35 }
/* passo com uma tela */
.lado { position: absolute; left: 62px; top: 150px; width: 312px; font-size: 15.6px; line-height: 1.42; color: #333 }
.lado p { margin: 0 0 10px }
.tela { position: absolute; left: 401px; top: 111px; width: 818px; height: 513px; border: 3px solid #8E979C; background: #E9ECEE; overflow: hidden }
.tela img { width: 100%; height: 100%; object-fit: cover; object-position: top left; display: block }
.leg { position: absolute; left: 403px; top: 634px; font-size: 12.3px; font-style: italic; color: #8C8C8C }
/* passo com duas telas */
.topo { position: absolute; left: 62px; right: 62px; top: 146px; font-size: 16.4px; line-height: 1.42; color: #333 }
.t2 { position: absolute; top: 219px; width: 569px; height: 356px; border: 3px solid #8E979C; background: #E9ECEE; overflow: hidden }
.t2 img { width: 100%; height: 100%; object-fit: cover; object-position: top left; display: block }
.c2 { position: absolute; top: 585px; width: 569px; font-size: 14px; color: #333 }
.c2 b { color: #CC0000; margin-right: 6px }
.leg2 { position: absolute; left: 62px; top: 634px; font-size: 12.3px; font-style: italic; color: #8C8C8C }
/* seção */
.secfundo { position: absolute; left: 63px; top: 62px; width: 1157px; height: 562px; background: #EFEFEF }
.secbox { position: absolute; left: 125px; top: 168px; width: 1030px; height: 288px; background: #fff }
.secn { position: absolute; left: 172px; top: 195px; font-size: 14px; font-weight: 700; color: #CC0000 }
.secbar { position: absolute; left: 172px; top: 232px; width: 144px; height: 6px; background: #CC0000 }
.sect { position: absolute; left: 172px; top: 263px; font-size: 35px; color: #333 }
.secd { position: absolute; left: 172px; top: 366px; right: 140px; font-size: 19.5px; color: #333; line-height: 1.35 }
.passos { position: absolute; left: 172px; top: 466px; width: 990px; display: grid; grid-template-columns: 494px 494px; grid-auto-flow: column; grid-template-rows: repeat(5, 26px) }
.passos div { font-size: 15px; color: #333; white-space: nowrap }
.passos b { display: inline-block; width: 82px; font-size: 13px; color: #CC0000 }
.canto1 { position: absolute; left: 1097px; top: 37px; width: 147px; height: 12px; background: #CC0000 }
.canto2 { position: absolute; left: 1232px; top: 37px; width: 12px; height: 147px; background: #CC0000 }
/* capa e fim */
.cfundo { position: absolute; left: 96px; top: 96px; width: 1184px; height: 457px; background: #EFEFEF }
.cfoto { position: absolute; left: 96px; top: 0; width: 494px; height: 622px; object-fit: cover }
.cearl { position: absolute; left: 716px; top: 32px; width: 150px }
.cbar { position: absolute; left: 664px; top: 167px; width: 6px; height: 143px; background: #CC0000 }
.ctit { position: absolute; left: 708px; top: 210px; font-size: 42px; color: #333; line-height: 1.12; width: 540px }
.csub { position: absolute; left: 708px; top: 392px; width: 500px; font-size: 17.5px; line-height: 1.35; color: #333 }
.csub p { margin: 0 0 9px }
.ffoto { position: absolute; left: 0; top: 0; width: 546px; height: 552px; object-fit: cover }
.fc1 { position: absolute; left: 558px; top: 432px; width: 12px; height: 147px; background: #CC0000 }
.fc2 { position: absolute; left: 424px; top: 567px; width: 146px; height: 12px; background: #CC0000 }
.ftit { position: absolute; left: 678px; top: 172px; font-size: 42px; color: #333 }
/* fluxo */
.cx { position: absolute; top: 168px; width: 168px; height: 154px; border: 1.3px solid #CFD3D6; border-radius: 12px; background: #fff; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 8px 10px }
.cx b { font-size: 16.5px; color: #333; margin-bottom: 4px }
.cx span { font-size: 12.3px; color: #444; line-height: 1.25 }
.cx.r { background: #CC0000; border-color: #CC0000 }
.cx.r b, .cx.r span { color: #fff }
.cxl { position: absolute; top: 334px; width: 168px; text-align: center; font-size: 11.5px; font-weight: 700; color: #8C8C8C; letter-spacing: .3px }
.seta { position: absolute; top: 244px; height: 2px; background: #CC0000 }
.seta::after { content: ''; position: absolute; right: -2px; top: -4px; border-left: 8px solid #CC0000; border-top: 5px solid transparent; border-bottom: 5px solid transparent }
.volta { position: absolute; left: 62px; top: 385px; font-size: 13.5px; font-weight: 700; color: #8C8C8C }
.vl { position: absolute; display: flex; align-items: center; gap: 22px; font-size: 14.8px; color: #333; line-height: 1.3 }
.vl i { display: inline-block; width: 200px; border-top: 2px dashed #A9B0B5; position: relative; flex: none }
.vl i::before { content: ''; position: absolute; left: -2px; top: -6px; border-right: 8px solid #A9B0B5; border-top: 5px solid transparent; border-bottom: 5px solid transparent }
'''


def rodape(n=None):
    return ('<div class="copy">© 2026 Halliburton. Todos os direitos reservados</div>' +
            ('<div class="pg">%d</div>' % n if n else '') +
            '<img class="hal" src="img/halliburton.png" alt="HALLIBURTON"><div class="linha"></div>')


slides = []


def add(corpo, num=True):
    slides.append((corpo, num))


def capa():
    add('<div class="cfundo"></div><img class="cfoto" src="img/capa.jpg" alt=""><img class="cearl" src="img/earl.png" alt="EARL">'
        '<div class="cbar"></div><div class="ctit">EARL Engenharia —<br>passo a passo</div>'
        '<div class="csub"><p>Do contrato ao handover e à receita, no arquivo da Engenharia, passo a passo.</p>'
        '<p>Todas as telas foram capturadas do próprio arquivo, na versão atual.</p></div>', num=False)


def texto(tit, kick, pars, fecho):
    add('<div class="tit">%s</div><div class="kick">%s</div><div class="corpo">%s</div><div class="fecho">%s</div>' % (
        E(tit), E(kick), ''.join('<p>%s</p>' % p for p in pars), fecho))


def secao(n, tit, desc, passos):
    ps = ''.join('<div><b>PASSO %02d</b>%s</div>' % (k, E(t)) for k, t in passos)
    add('<div class="secfundo"></div><div class="secbox"></div><div class="canto1"></div><div class="canto2"></div>'
        '<div class="secn">SEÇÃO %02d</div><div class="secbar"></div><div class="sect">%s</div><div class="secd">%s</div>'
        '<div class="passos">%s</div>' % (n, E(tit), E(desc), ps), num=False)


def passo(k, secnome, tit, pars, img):
    add('<div class="tit">%s</div><div class="kick">PASSO %02d · %s</div><div class="lado">%s</div>'
        '<div class="tela"><img src="img/%s" alt=""></div><div class="leg">%s</div>' % (
            E(tit), k, E(secnome), ''.join('<p>%s</p>' % p for p in pars), img, DEMO))


def passo2(k, secnome, tit, topo, a, b):
    add('<div class="tit">%s</div><div class="kick">PASSO %02d · %s</div><div class="topo">%s</div>'
        '<div class="t2" style="left:62px"><img src="img/%s" alt=""></div><div class="t2" style="left:650px"><img src="img/%s" alt=""></div>'
        '<div class="c2" style="left:62px"><b>%s</b>%s</div><div class="c2" style="left:650px"><b>%s</b>%s</div>'
        '<div class="leg2">%s</div>' % (E(tit), k, E(secnome), topo, a[0], b[0], E(a[1]), E(a[2]), E(b[1]), E(b[2]), DEMO))


def fluxo():
    caixas = [('Contrato', 'itens PPU, valores em R$ ou US$ e reajustes', 'CONTRATO'),
              ('Planejamento', 'a operação no Gantt, com os recursos previstos', 'PLANEJADA'),
              ('Handover', 'o e-mail para logística e coordenação', 'HANDOVER ENVIADO'),
              ('Consumo', 'o que foi usado na operação', 'CONCLUÍDA'),
              ('Receita e margem', 'realizado + previsto, com o risco', 'RESULTADO'),
              ('Arquivos', 'Gerencial e Painel de Compras', 'COMPARTILHADO')]
    h = ''
    x0, w, gap = 62, 168, 30
    for i, (t, d, l) in enumerate(caixas):
        x = x0 + i * (w + gap)
        h += '<div class="cx%s" style="left:%dpx"><b>%s</b><span>%s</span></div><div class="cxl" style="left:%dpx">%s</div>' % (
            ' r' if i == len(caixas) - 1 else '', x, E(t), E(d), x, E(l))
        if i:
            h += '<div class="seta" style="left:%dpx;width:%dpx"></div>' % (x - gap + 5, gap - 12)
    voltas = [(130, 418, 'Mudou a data de uma operação? As seguintes da mesma sonda acompanham, mantendo a folga.'),
              (450, 476, 'O EARL Gerencial junta os arquivos de todos os engenheiros e mostra a receita de todos os contratos.'),
              (450, 534, 'O Painel de Compras lê o inventário das sondas e o consumo de químicos para planejar as compras.')]
    for x, y, t in voltas:
        h += '<div class="vl" style="left:%dpx;top:%dpx;width:%dpx"><i></i><span>%s</span></div>' % (x, y, 1218 - x, E(t))
    add('<div class="tit">Como uma operação anda no arquivo</div><div class="kick">O caminho todo em uma página</div>' + h +
        '<div class="volta">E DEPOIS</div><div class="fecho" style="top:606px">Cada passo é lançado uma vez; ninguém digita de novo o que já foi lançado.</div>')


def fim():
    add('<img class="ffoto" src="img/fim.jpg" alt=""><div class="fc1"></div><div class="fc2"></div><div class="ftit">OBRIGADO</div>', num=False)


# ------------------------------------------------------------------ conteúdo
capa()
texto('O que você está vendo', 'Leia primeiro', [
    'O <b>EARL Engenharia</b> é um arquivo (.html) que abre no Chrome ou no Edge, sem instalar nada e sem internet. Cada contrato tem o seu arquivo, já carregado com os itens, os valores e as operações da planilha do contrato.',
    'As telas deste passo a passo usam <b class="v">dados de demonstração</b>. Poços, Sales Orders, números VIDA, números de contrato e valores são fictícios. Os nomes de clientes e sondas foram mantidos para as telas ficarem naturais.',
    'Nenhuma tela foi editada depois da captura.'],
    'Um arquivo por contrato e um registro por operação, do planejamento ao handover e à receita.')
texto('Antes de começar', 'O arquivo', [
    'Abra o arquivo com dois cliques, no <b>Chrome</b> ou no <b>Edge</b>. Não abra pela pré-visualização do Outlook ou do Teams: ali o navegador não deixa salvar.',
    'Os dados ficam guardados <b>no navegador deste computador</b>. Para guardar uma cópia ou levar para outro computador, use <b>⬇ Exportar dados</b> (passo 21).',
    'Na barra do topo ficam as ferramentas de todos os contratos: Contratos, Sondas, Químicos, Casing, Câmbio e os arquivos para exportar.'],
    'Exporte os dados de vez em quando: é a sua cópia de segurança.')
fluxo()

S1 = 'Começando'
secao(1, S1, 'A página inicial, a logo do cliente, a receita de todos os contratos e os contratos com os seus itens e valores.',
      [(1, 'A página inicial'), (2, 'A logo do cliente'), (3, 'Receita e margem'), (4, 'A receita mês a mês'), (5, 'Contratos, itens e valores')])
passo(1, S1, 'A página inicial', [
    'Cada contrato é um card: o cliente, as operações dos próximos 30 dias numa faixa, quantas sondas e a próxima data.',
    'O card vermelho junta todos os contratos. Clique num card para abrir o contrato.',
    'No “…” do card dá para arquivar ou apagar um contrato.'], '01b_cards.jpg')
passo(2, S1, 'A logo do cliente', [
    'Ao abrir o contrato, clique na logo (ou nas iniciais) ao lado do nome do contrato.',
    'Na janela, <b>⬆ Inserir a logo</b>: escolha a imagem (PNG, JPG ou SVG). Ela aparece no card da página inicial, no topo do contrato e nas operações, em todos os contratos do cliente.',
    'Dá para trocar ou tirar a logo depois.'], '23_logo.jpg')
passo(3, S1, 'Receita e margem', [
    'Receita, COGS e margem em US$, já com o risco de cada operação: o realizado (consumo lançado) mais o previsto.',
    'Os cards Q1 a Q4 também são filtros: clique num quarto para ver só ele.',
    'Filtre por ano, mês, cliente, contrato, região ou tipo de contrato.'], '02_receita.jpg')
passo(4, S1, 'A receita mês a mês', [
    'A tabela abre por cliente › contrato › sonda › poço › operação › item PPU. Clique numa linha para abrir.',
    'Arraste a borda da primeira coluna para deixá-la mais larga ou mais estreita; duplo clique volta ao tamanho padrão.',
    '“⬇ Excel desta tabela” baixa o que está na tela.'], '02b_matriz.jpg')
passo2(5, S1, 'Contratos, itens e valores',
       '<b>Contratos</b> (barra do topo) lista todos os contratos. <b>Abrir</b> mostra os itens PPU com o valor em R$ ou US$, o consumido e o saldo, e os reajustes com a data de cada um.',
       ('03_contratos.jpg', 'Contratos', 'a lista, com filtro em cada coluna'), ('04_contrato.jpg', 'Contrato', 'itens, valores e reajustes'))

S2 = 'Planejar'
secao(2, S2, 'Como a engenharia monta o plano e prevê os recursos de cada operação.',
      [(6, 'O plano por sonda'), (7, 'Lista e calendário'), (8, 'Nova operação'), (9, 'Recursos, contingência e risco')])
passo(6, S2, 'O plano por sonda', [
    'Cada barra é uma operação planejada, na cor da etapa. Em roxo, as operações de contingência.',
    'Arraste a barra para mudar a data. As operações ligadas na mesma sonda acompanham, para a frente ou para trás.',
    'Filtre por sonda, tipo e situação no topo.'], '05_gantt.jpg')
passo2(7, S2, 'Lista e calendário',
       'A <b>Lista</b> mostra as operações por data. Escolha o horizonte: 15, 30, 90, 180 dias ou <b>Todas</b>. Cada linha tem Editar, Duplicar, Σ Consumo e Handover.',
       ('06_lista.jpg', 'Lista', 'as operações e os botões de cada uma'), ('07_calendario.jpg', 'Calendário', 'o mês de uma vez'))
passo(8, S2, 'Nova operação', [
    'Sonda, poço, tipo, data e duração. Sales Order e Nº VIDA podem ficar para depois: só são exigidos para enviar o handover.',
    '<b>Vincular data à operação anterior</b>: se a anterior mudar, esta acompanha.',
    '<b>Contingência</b>: marque se a operação pode ou não acontecer e informe o risco de não acontecer. 0% conta tudo; 100% fica fora da receita.'], '08_nova_op.jpg')
passo(9, S2, 'Recursos, contingência e risco', [
    'Itens PPU do contrato, químicas, casing equipment, pessoal e equipamentos, com a quantidade prevista.',
    'Cada linha também pode ser contingência, com o seu próprio risco: a receita e o COGS previstos contam × (1 − risco).',
    'Um template guarda os recursos para a próxima operação parecida.'], '09_recursos.jpg')

S3 = 'Handover'
secao(3, S3, 'O que vai para a sonda e o e-mail para a logística e a coordenação.',
      [(10, 'Revisar o handover'), (11, 'O e-mail pronto no Outlook')])
passo(10, S3, 'Revisar o handover', [
    'O handover junta tudo o que a operação precisa: químicas (com o saldo a bordo da última contagem da sonda), casing, equipamentos e o embarque de cada pessoa.',
    'Ajuste as datas de embarque, escreva os comentários e continue para o e-mail.'], '10_handover.jpg')
passo2(11, S3, 'O e-mail pronto no Outlook',
       'Marque quem recebe em <b>Para</b> e em <b>Cc</b> (a lista fica salva). O assunto segue o padrão: sonda, operação, poço, SO e VIDA. <b>⬇ Gerar e-mail</b> baixa um .eml, que abre no Outlook pronto para enviar. Mudou algo? Gere de novo: sai como REV 2.',
       ('11_email.jpg', 'Destinatários', 'Para, Cc e quem assina'), ('11b_email_prev.jpg', 'Pré-visualização', 'o e-mail como vai sair'))

S4 = 'Consumo e receita'
secao(4, S4, 'O que foi usado em cada operação e quanto isso gera de receita.',
      [(12, 'Lançar o consumo'), (13, 'Consumo e receita do contrato'), (14, 'O câmbio do mês')])
passo(12, S4, 'Lançar o consumo', [
    'Depois da operação, clique em <b>Σ Consumo</b>: a data do serviço, os itens PPU (com o valor vigente na data), as químicas, o casing e o pessoal.',
    '“Copiar previsto” traz o planejado para você só ajustar.',
    'O app avisa quando um item passa do saldo do contrato.'], '13_lancar_consumo.jpg')
passo(13, S4, 'Consumo e receita do contrato', [
    'Receita em R$ e em US$, COGS e margem do consumo lançado no período escolhido.',
    'Abaixo: a receita por operação, o saldo de cada item PPU e a receita por mês.',
    '“⬇ Excel” baixa tudo isso numa planilha.'], '12_consumo_receita.jpg')
passo(14, S4, 'O câmbio do mês', [
    'Para os contratos com valores em R$: informe quanto vale US$ 1,00 em cada mês.',
    'A receita em US$ usa a cotação do mês do serviço (ou da data prevista). Mês sem cotação usa o último informado antes.',
    'O mês mais recente fica sempre em cima.'], '14_cambio.jpg')

S5 = 'Bancos de dados'
secao(5, S5, 'Químicos, casing equipment, o inventário das sondas e o filtro das tabelas.',
      [(15, 'Banco de químicos'), (16, 'Banco de casing equipment'), (17, 'Inventário das sondas'), (18, 'Filtro e ordem nas tabelas')])
passo(15, S5, 'Banco de químicos', [
    'SAP, descrição, unidade e valor em US$ (o COGS) de cada química.',
    'Para atualizar: <b>⬆ Atualizar pela planilha</b>, confira as mudanças (novos, valor alterado) e aplique.',
    'O ⚠ mostra o que precisa de atenção, como um produto sem valor.'], '15_quimicos.jpg')
passo(16, S5, 'Banco de casing equipment', [
    'Igual ao de químicos, para o casing equipment. É a lista que aparece para escolher nas operações, e o valor entra no COGS.',
    'A mesma planilha (uma aba de químicos e outra de casing) atualiza os dois bancos.'], '16_casing.jpg')
passo2(17, S5, 'Inventário das sondas',
       'A contagem do que está a bordo de cada sonda: a data, o responsável e a quantidade de cada produto. A última contagem entra no handover (saldo na sonda) e vai para o Painel de Compras.',
       ('17_inventario.jpg', 'Inventário', 'um card por sonda'), ('18_contagem.jpg', 'Contagem', 'produto a produto'))
passo(18, S5, 'Filtro e ordem nas tabelas', [
    'Em todas as tabelas: clique no título da coluna para ordem crescente (▲); clique de novo para decrescente (▼).',
    'No <b>▾</b>, escolha os itens: busca, “só este” e “(Selecionar tudo)”.',
    'Com filtro, a tabela mostra “Mostrando X de Y” e o botão “Limpar filtro e ordem”.'], '19_filtro.jpg')

S6 = 'Compartilhar e guardar'
secao(6, S6, 'Os arquivos para o gerencial e para compras, e a cópia dos seus dados.',
      [(19, 'Arquivo do gerencial'), (20, 'Planilhas para o Painel de Compras'), (21, 'Exportar e importar dados')])
passo(19, S6, 'Arquivo do gerencial', [
    'Marque os contratos sob sua responsabilidade e gere o arquivo.',
    'Salve na pasta do SharePoint do gerencial: o EARL Gerencial junta os arquivos de todos os engenheiros. Para cada contrato, vale o arquivo mais novo.'], '20_gerencial.jpg')
passo(20, S6, 'Planilhas para o Painel de Compras', [
    'Quatro planilhas separadas: inventário das sondas e consumo de químicos (o Painel de Compras usa estas duas), casing equipment e pessoal.',
    'Cada linha leva a contingência e o risco de não acontecer.'], '21_planilhas.jpg')
passo(21, S6, 'Exportar e importar dados', [
    '<b>⬇ Exportar dados</b> baixa um arquivo .json com tudo.',
    'Em outro computador, <b>⬆ Importar dados</b> mostra o que há aqui e no arquivo. <b>Juntar</b> fica com o mais recente de cada registro; <b>Substituir</b> deixa igual ao arquivo.'], '22_importar.jpg')

texto('O que este passo a passo não mostrou', 'Mais no mesmo arquivo', [
    'O cadastro de sondas e os templates de operação.',
    'A aba Handovers, com todos os e-mails gerados e as versões de cada um.',
    'O Espaço do navegador (quanto cada arquivo ocupa) e Custos (COGS) de outros materiais.',
    'Português, inglês e espanhol: um clique nas bandeiras do topo.'],
    'Tudo isso já está no mesmo arquivo. Ficou de fora para o passo a passo continuar curto.')
fim()

out = ['<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>EARL Engenharia — passo a passo</title><style>', CSS, '</style></head><body>']
n = 0
for corpo, num in slides:
    n += 1
    out.append('<section class="s">' + corpo + rodape(n if num else None) + '</section>')
out.append('</body></html>')
open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'deck.html'), 'w', encoding='utf-8').write('\n'.join(out))
print(n, 'slides')
