"use client";

import { useEffect } from "react";

/** Statik siteyi PWA olarak kaydeder; çevrimdışıyken son anlık görüntüyü gösterir. */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    const register = () => {
      void navigator.serviceWorker
        .register(`${base}/sw.js`, { scope: `${base}/` })
        .catch(() => {
          /* desteklenmiyorsa sessizce geç */
        });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
