/* رتّبها — Service Worker
   الفكرة:
   - نحفظ "قشرة التطبيق" (index.html والأيقونات) عشان يفتح أوفلاين.
   - بيانات مودل (moodle.ucas.edu.ps) ما بنكاشها إطلاقاً — دايماً من النت،
     والبيانات القديمة أصلاً محفوظة بالتطبيق نفسه (localStorage).
   - خطوط جوجل بنكاشها عشان الشكل يضل حلو أوفلاين.
*/
const CACHE = 'rattibha-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // بيانات مودل أو تسجيل الزيارات: دايماً من النت، بلا كاش
  if (url.hostname === 'moodle.ucas.edu.ps' || url.hostname.includes('script.google')) {
    return; // نخلّي المتصفح يتعامل معها عادي
  }

  // ملفات التطبيق نفسه: الكاش أولاً، وإذا فشل رجّع index.html
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then((hit) =>
        hit || fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        }).catch(() => caches.match('./index.html'))
      )
    );
    return;
  }

  // خطوط جوجل وغيرها: رجّع من الكاش إذا موجود، وحدّثه بالخلفية
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
