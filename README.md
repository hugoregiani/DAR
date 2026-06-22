# DAR — NS-63
**Relatório Diário de Atividade** — Halliburton / Petrobras

Aplicativo web de página única (SPA) para gestão operacional da sonda NS-63.

## Como usar

Abra o arquivo `index.html` diretamente no navegador — não requer servidor.

## Funcionalidades

- **Principal** — Visão geral: dados da sonda, poço, situação operacional, equipe a bordo, silos e químicos
- **Pessoal** — Embarque/desembarque de equipe com histórico
- **Inventário** — Químicos, cimento (silos), casing equipment, spare parts e consumíveis
- **Equipamentos** — Contentores, Commander, equipamentos móveis e fixos
- **Embarque / Desembarque** — Registro de entrada e saída de materiais com anexos
- **Relatório Diário** — Passagem de serviço e pendências da sonda
- **Operações** — Cimentações e testes de pressão com job log e KPIs
- **Histórico** — Log completo de todas as movimentações
- **Banco de Dados** — Cadastro de referências (químicos, pessoal, sondas, equipamentos, etc.)

## Dados

Todos os dados são armazenados no `localStorage` do navegador sob a chave `DAR_NS63_v3`. Use as funções de Exportar/Importar em cada seção do Banco de Dados para backup.
