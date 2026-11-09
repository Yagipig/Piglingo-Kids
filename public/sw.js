// Piglingo Kids — service worker cho bản web PWA (bản 2026-11-09).
//
// CHIẾN LƯỢC (sửa triệt để lỗi "kẹt giao diện cũ"):
// - Điều hướng trang + tài liệu HTML: NETWORK-FIRST — có mạng là luôn lấy
//   bản mới nhất từ server (kèm no-cache để bỏ qua HTTP cache trung gian),
//   chỉ khi mất mạng mới dùng bản đã lưu để app vẫn mở được offline.
// - Tài nguyên tĩnh (JS/CSS/ảnh/font, tên file đã băm theo bản dựng):
//   cache-first trong cache RIÊNG của phiên bản này.
// - Mọi request không phải GET và mọi request khác origin (ví dụ Supabase
//   API): không can thiệp, không cache — chạy thẳng qua mạng.
//
// PHIÊN BẢN CACHE: SW_VERSION là dấu phiên bản của CHÍNH file này. Mỗi lần
// sửa sw.js PHẢI tăng SW_VERSION. Khi trình duyệt phát hiện sw.js đổi nội
// dung, worker mới cài đặt, skipWaiting ngay, và lúc activate nó XÓA MỌI
// cache không thuộc phiên bản hiện tại — kể cả cache tên cố định của bản
// sw.js đầu tiên — rồi clients.claim() giành quyền điều khiển ngay lập
// tức. Nhờ vậy máy đang kẹt bản cũ chỉ cần tải lại tối đa MỘT lần (trang
// tự nạp lại khi controller đổi) là dùng bản mới; từ đó điều hướng luôn
// network-first nên không kẹt lại nữa.
const SW_VERSION = "20261109-2";
const CACHE_NAME = "piglingo-cache-" + SW_VERSION;
const APP_SHELL = ["./", "./index.html", "./manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Điều hướng / tài liệu HTML: network-first.
  const isDocument =
    request.mode === "navigate" ||
    request.destination === "document" ||
    (request.headers.get("accept") || "").includes("text/html");
  if (isDocument) {
    event.respondWith(
      fetch(request, { cache: "no-cache" })
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put("./index.html", copy))
              .catch(() => {});
          }
          return response;
        })
        .catch(() =>
          caches
            .match("./index.html", { ignoreSearch: true })
            .then((cached) => cached || Response.error())
        )
    );
    return;
  }

  // Tài nguyên tĩnh: cache-first trong cache của phiên bản hiện tại,
  // chưa có thì tải mạng rồi lưu lại cho lần sau.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, copy))
            .catch(() => {});
        }
        return response;
      });
    })
  );
});
