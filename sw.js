const CACHE_NAME = 'khoa-noi-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/index.tsx',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Với ứng dụng này, chúng ta ưu tiên Network để lấy dữ liệu mới nhất
  // Chỉ dùng cache nếu mất mạng (offline)
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});