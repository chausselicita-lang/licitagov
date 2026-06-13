import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
