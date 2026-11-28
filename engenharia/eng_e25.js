  /* ================= e25 (pedidos do Hugo, 28/11/2026) =================
     1. A reorganização da fila da sonda ("Reorganizar a fila da sonda?") só propõe mover operações POSTERIORES à que foi
        salva/movida, em cascata, enquanto estiverem vinculadas e encostando; a operação sem vínculo não move nenhuma
        (planCascade, patch, bloco e25).
     2. Na aba Indicadores, "✎ abrir" na linha da operação (tabela Receita/COGS e aba Operações do Gerencial embutido,
        g24) abre a janela da operação para ver ou alterar, como o "Editar" da Lista. */
  window.engAbrirOperacao = id => {
    var j = ((dbAtual.current || db).plannedJobs || []).find(x => x && x.id === id);
    if (!j) {
      setSyncErr('Não achei esta operação no arquivo (ela pode ter sido apagada).');
      return false;
    }
    setPlanDraft({
      ...j
    });
    return true;
  };
