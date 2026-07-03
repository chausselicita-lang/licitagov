import { useEffect, useRef } from "react";

/**
 * Faz o botão/gesto físico de "voltar" do celular fechar apenas a tela/modal
 * aberta no momento, em vez de sair do app (que acontece quando não há
 * nenhuma entrada de histórico associada à tela).
 *
 * Cada tela aberta empilha uma entrada; o listener global de popstate
 * sempre fecha o item do topo da pilha, então overlays aninhados (ex:
 * um mini-modal aberto sobre outro) fecham um de cada vez, na ordem certa.
 *
 * Importante: ao fechar pela própria tela (botão Voltar/✕), NÃO chamamos
 * history.back() para "limpar" a entrada — só paramos de rastreá-la.
 * Ela fica inofensiva no histórico (não muda nada visualmente) e só é
 * consumida, sem efeito, se o usuário apertar voltar depois. Chamar
 * history.back() ativamente aqui é arriscado: qualquer coisa que mexa no
 * histórico entre a abertura e o fechamento (ex: diálogo de impressão do
 * celular) desbalanceia a contagem e pode fazer o app fechar de vez.
 */
const overlayStack = [];
let popstateBound = false;

function ensurePopstateBound() {
  if (popstateBound) return;
  popstateBound = true;
  window.addEventListener("popstate", () => {
    const top = overlayStack.pop();
    if (top) top.onBack();
  });
}

export function useOverlayBack(isOpen, onClose) {
  const entryRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    ensurePopstateBound();
    window.history.pushState({ __overlay: true }, "");
    const entry = { onBack: () => onCloseRef.current() };
    overlayStack.push(entry);
    entryRef.current = entry;

    return () => {
      const idx = overlayStack.indexOf(entryRef.current);
      if (idx !== -1) overlayStack.splice(idx, 1);
      entryRef.current = null;
    };
  }, [isOpen]);
}
