const CACHE_NAME = 'aloelujah-v5';
const OFFLINE_URL = '/offline.html';
const CACHE_URLS = [
  '/',
  '/index.html',
  OFFLINE_URL,
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://cdn.tailwindcss.com/3.4.1',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=Lora:ital,wght@0,400;0,500;1,400&family=Great+Vibes&family=Cormorant+Garamond:ital,wght@1,300;1,400;1,500&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) return caches.delete(cache);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.pathname.includes('/api/') || url.hostname.includes('connect.facebook.net') || url.hostname.includes('analytics.tiktok.com') || url.hostname.includes('clarity.ms') || url.hostname.includes('onesignal.com')) {
    return fetch(event.request);
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) cache.put(event.request, networkResponse.clone());
            return networkResponse;
          })
          .catch(() => null);

        if (event.request.headers.get('accept')?.includes('text/html')) {
          return fetchPromise.then(response => response || cachedResponse).catch(() => caches.match(OFFLINE_URL));
        }
        return cachedResponse || fetchPromise.then(response => response || caches.match(OFFLINE_URL));
      });
    })
  );
});

self.addEventListener('push', event => {
  if (!(self.Notification && self.Notification.permission === 'granted')) return;
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Dein Aloelujah Moment', {
      body: data.body || 'Dein tägliches Ritual wartet auf dich ✨',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      data: { url: data.url || '/' },
      actions: [{ action: 'open', title: 'Öffnen' }, { action: 'close', title: 'Später' }]
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'close') return;
  const urlToOpen = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      for (let client of windowClients) if (client.url.includes(urlToOpen) && 'focus' in client) return client.focus();
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});
