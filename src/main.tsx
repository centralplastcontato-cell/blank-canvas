import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

// PWA: Register service worker only in production (not in iframes or preview hosts)
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("lovable") ||
  window.location.hostname === "localhost";

const registerFreshServiceWorker = async () => {
  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      updateViaCache: "none",
    });

    let hasReloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (hasReloaded) return;
      hasReloaded = true;
      window.location.reload();
    });

    const forceUpdate = () => {
      registration.update().catch((err) => {
        console.warn("SW update failed:", err);
      });
    };

    window.addEventListener("load", forceUpdate, { once: true });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        forceUpdate();
      }
    });
    window.addEventListener("focus", forceUpdate);
  } catch (err) {
    console.warn("SW registration failed:", err);
  }
};

if (!isInIframe && !isPreviewHost && "serviceWorker" in navigator) {
  void registerFreshServiceWorker();
} else if (isPreviewHost || isInIframe) {
  // Clean up any stale service workers in preview/iframe
  navigator.serviceWorker?.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
