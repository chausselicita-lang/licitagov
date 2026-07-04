import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { ErrorBoundary } from './App.jsx';
import Portal from './pages/Portal.jsx';
import { registerSW } from 'virtual:pwa-register';
import { isAnyModalOpen } from './lib/modalGuard.js';

// Só recarrega quando não houver nenhum Modal aberto — evita perder dados
// que o usuário esteja digitando (ex.: formulário do Agente de Dispensas)
// quando uma nova versão do app é detectada em segundo plano.
let reloadScheduled = false;
function reloadWhenSafe() {
  if (reloadScheduled) return;
  reloadScheduled = true;
  const attempt = () => {
    if (isAnyModalOpen()) { setTimeout(attempt, 3000); return; }
    window.location.reload();
  };
  attempt();
}

registerSW({
  onRegisteredSW(_url, r) {
    if (r) setInterval(() => r.update(), 5 * 60 * 1000);
  },
  onNeedRefresh() {
    reloadWhenSafe();
  },
  immediate: true,
});

navigator.serviceWorker?.addEventListener('controllerchange', () => {
  reloadWhenSafe();
});

const path = window.location.pathname;
const isPortal = path.startsWith('/portal') || path.startsWith('/transparencia');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      {isPortal ? <Portal /> : <App />}
    </ErrorBoundary>
  </StrictMode>
);
