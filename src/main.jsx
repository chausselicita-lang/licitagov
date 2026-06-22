import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { ErrorBoundary } from './App.jsx';
import Portal from './pages/Portal.jsx';
import { registerSW } from 'virtual:pwa-register';

registerSW({
  onRegisteredSW(_url, r) {
    if (r) setInterval(() => r.update(), 5 * 60 * 1000);
  },
  onNeedRefresh() {
    window.location.reload();
  },
  immediate: true,
});

navigator.serviceWorker?.addEventListener('controllerchange', () => {
  window.location.reload();
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
