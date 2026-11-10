// نور الإيمان - Service Worker
// يخزّن واجهة التطبيق فقط (لتعمل بدون إنترنت)، ولا يخزّن ملفات الصوت أو نتائج الـ API أبداً.
const CACHE_NAME = 'noor-al-iman-v2';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];
// نص القرآن ثابت لا يتغيّر، فهو آمن للتخزين الدائم (يسرّع وضع "آية بآية" ويشغّله حتى بلا إنترنت)
const CACHEABLE_STATIC_DATA = ['https://api.alquran.cloud/v1/quran/quran-uthmani'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // نص القرآن الكامل: ثابت أبدًا، فنخزّنه Cache-first لسرعة فورية وعمل بلا إنترنت
  if (CACHEABLE_STATIC_DATA.includes(url)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  const isRemoteData =
    url.includes('mp3quran.net') ||
    url.includes('everyayah.com') ||
    url.includes('alquran.cloud') ||
    url.includes('aladhan.com') ||
    url.includes('radiojar.com') ||
    url.includes('fonts.googleapis.com') ||
    url.includes('fonts.gstatic.com');

  // لا نتدخل إطلاقاً في بث الصوت أو باقي طلبات الـ API أو الخطوط الخارجية
  if (isRemoteData || event.request.destination === 'audio') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request)
          .then((response) => {
            if (response && response.ok && event.request.method === 'GET') {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => cached)
      );
    })
  );
});
