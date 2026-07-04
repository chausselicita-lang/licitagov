// Rastreia se algum Modal está aberto no app, para não recarregar a página
// (atualização do Service Worker) enquanto o usuário está preenchendo um
// formulário — evita perder dados em edição.
let openCount = 0;

export function markModalOpen() {
  openCount += 1;
}

export function markModalClosed() {
  openCount = Math.max(0, openCount - 1);
}

export function isAnyModalOpen() {
  return openCount > 0;
}
