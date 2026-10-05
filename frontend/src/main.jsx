import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import './index.css'
import App from './App.jsx'

// capture Chrome's install prompt early — it often fires before React mounts
window.__yoInstallEvent = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  window.__yoInstallEvent = e;
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// PWA: register the service worker in production builds only —
// in dev it would serve stale cached assets and confuse HMR
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}