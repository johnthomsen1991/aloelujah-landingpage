const CACHE_NAME = 'aloelujah-v4';  // Version erhöht wegen neuer Struktur
const OFFLINE_URL = '/offline.html';
const CACHE_URLS = [
  '/',
  '/index.html',
  OFFLINE_URL,
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  // 🆕 Wichtige externe Ressourcen cachen (für Offline-Funktionalität)
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Lora:wght@400;500;600&family=Great+Vibes&family=Cormorant+Garamond:wght@400;600&display=swap'
];

// Install Event
self.addEventListener('install', event => {
  console.log('🕰️ Aloelujah Service Worker wird installiert...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Caching essential files');
        return cache.addAll(CACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', event => {
  console.log('✨ Aloelujah Service Worker aktiviert');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('🗑️ Alten Cache löschen:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 🆕 Fetch Event mit Stale-While-Revalidate Strategie (besser für dynamische Inhalte)
self.addEventListener('fetch', event => {
  // Nur GET-Requests behandeln
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  
  // 🆕 API-Calls und externe Tracking-Skripte NICHT cachen
  if (url.pathname.includes('/api/') || 
      url.hostname.includes('connect.facebook.net') ||
      url.hostname.includes('analytics.tiktok.com') ||
      url.hostname.includes('clarity.ms') ||
      url.hostname.includes('onesignal.com')) {
    return fetch(event.request);
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        
        // Stale-While-Revalidate: Zeige Cache, hole aber im Hintergrund Update
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            // Nur erfolgreiche Responses cachen
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(error => {
            console.warn('⚠️ Fetch fehlgeschlagen:', event.request.url);
            return null;
          });

        // 🆕 Für HTML: Network-First (damit Inhalte aktuell bleiben)
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return fetchPromise.then(response => response || cachedResponse)
            .catch(() => caches.match(OFFLINE_URL));
        }

        // Für Bilder/CSS/JS: Cache-First mit Fallback
        return cachedResponse || fetchPromise.then(response => {
          return response || caches.match(OFFLINE_URL);
        });
      });
    })
  );
});

// 🆕 Push Notification Empfang (für OneSignal Integration)
self.addEventListener('push', event => {
  if (!(self.Notification && self.Notification.permission === 'granted')) return;
  
  const data = event.data?.json() || {};
  const options = {
    body: data.body || 'Dein tägliches Ritual wartet auf dich ✨',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'Öffnen' },
      { action: 'close', title: 'Später' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || '🌸 Aloelujah Moment',
      options
    )
  );
});

// 🆕 Notification Klick-Handling
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'close') return;
  
  const urlToOpen = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      for (let client of windowClients) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});