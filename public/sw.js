const CACHE_NAME = 'amali-v5';
const urlsToCache = [
  '/',
  '/index.html',
  '/assets/logoamali.png',
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache ouvert');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Réception des push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'amali', body: event.data.text() };
  }

  const { title, body, icon, badge, data } = payload;

  // Mettre à jour le badge de l'icône
  if ('setAppBadge' in self.navigator && badge != null) {
    self.navigator.setAppBadge(badge).catch(() => {});
  }

  event.waitUntil(
    self.registration.showNotification(title || 'amali', {
      body: body || '',
      icon: icon || '/assets/logoamali.png',
      badge: '/assets/web-app-manifest-192x192.png',
      data: data || {},
      vibrate: [200, 100, 200],
    })
  );
});

// Clic sur une notification push
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) {
        const client = clients[0];
        client.focus();
        client.postMessage({ type: 'NOTIFICATION_CLICK', data: event.notification.data });
      } else {
        self.clients.openWindow('/');
      }
    })
  );
});

// Interception des requêtes
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ne pas intercepter les requêtes vers Supabase ou APIs externes
  if (
    url.hostname.includes('supabase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('gstatic') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached); // Si réseau indisponible, retourner le cache

      // Network-first : essayer réseau, fallback cache
      return networkFetch || cached;
    })
  );
});