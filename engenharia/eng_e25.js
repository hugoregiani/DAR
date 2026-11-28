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
  /* 3. A primeira coluna do Gantt (sondas e operações) muda de largura puxando a alça do cabeçalho, como a da tabela dos
        Indicadores; duplo clique volta ao padrão (190 px); a largura fica guardada (eng_gantt_lblw_v1). O patch (bloco
        e25) troca a largura fixa LBLW0 por engGanttLblW e põe a alça (engGanttAlca) nas células do cabeçalho. */
  var ENG_GLBL_PADRAO = 190;
  var [engGanttLblW, setEngGanttLblW] = useState(() => {
    try {
      var n = Number(localStorage.getItem('eng_gantt_lblw_v1'));
      return n >= 120 && n <= 700 ? Math.round(n) : ENG_GLBL_PADRAO;
    } catch (e) {
      return ENG_GLBL_PADRAO;
    }
  });
  var engGanttLblRef = useRef(engGanttLblW);
  engGanttLblRef.current = engGanttLblW;
  var engGanttAlca = () => engH("span", {
    className: "eng-glbl-rsz",
    role: "separator",
    "aria-orientation": "vertical",
    "aria-label": "Largura da primeira coluna do Gantt",
    title: "Arraste para aumentar ou diminuir a largura desta coluna (duplo clique: largura padrão)",
    onPointerDown: e => {
      if (e.button > 0) return;
      e.preventDefault();
      e.stopPropagation();
      var x0 = e.clientX,
        w0 = engGanttLblRef.current,
        w = w0,
        quadro = 0;
      document.documentElement.classList.add('eng-glbl-arr');
      var mover = ev => {
        w = Math.max(120, Math.min(700, Math.round(w0 + ev.clientX - x0)));
        if (!quadro) quadro = requestAnimationFrame(() => {
          quadro = 0;
          setEngGanttLblW(w);
        });
      };
      var soltar = () => {
        document.removeEventListener('pointermove', mover);
        document.removeEventListener('pointerup', soltar);
        document.removeEventListener('pointercancel', soltar);
        document.documentElement.classList.remove('eng-glbl-arr');
        setEngGanttLblW(w);
        try {
          localStorage.setItem('eng_gantt_lblw_v1', String(w));
        } catch (x) {}
      };
      document.addEventListener('pointermove', mover);
      document.addEventListener('pointerup', soltar);
      document.addEventListener('pointercancel', soltar);
    },
    onDoubleClick: e => {
      e.preventDefault();
      e.stopPropagation();
      setEngGanttLblW(ENG_GLBL_PADRAO);
      try {
        localStorage.removeItem('eng_gantt_lblw_v1');
      } catch (x) {}
    }
  });
