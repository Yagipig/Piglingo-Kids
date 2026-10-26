import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

/**
 * HTML gốc cho bản web (Expo Router) — bổ sung cho PWA:
 * - link manifest + theme-color + apple-touch-icon (đường dẫn gồm baseUrl
 *   "/Piglingo-Kids" khớp đường dẫn GitHub Pages của repo),
 * - đăng ký service worker public/sw.js để cài app lên màn hình chính
 *   Android/iOS và chạy offline với tài nguyên tĩnh đã cache.
 */

const BASE_URL = "/Piglingo-Kids";

const registerServiceWorker = `
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker
      .register("${BASE_URL}/sw.js", { scope: "${BASE_URL}/" })
      .catch(function () {});
  });
}
`;

const responsiveBackground = `
body {
  background-color: #ffffff;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #131f24;
  }
}`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="vi">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <title>Piglingo Kids 🐷 — Học ngoại ngữ cho bé</title>
        <link rel="manifest" href={`${BASE_URL}/manifest.json`} />
        <meta name="theme-color" content="#22c55e" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Piglingo" />
        <link rel="apple-touch-icon" href={`${BASE_URL}/icon-1024.png`} />
        <link rel="icon" type="image/png" href={`${BASE_URL}/favicon.png`} />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>
        {children}
        <script dangerouslySetInnerHTML={{ __html: registerServiceWorker }} />
      </body>
    </html>
  );
}
