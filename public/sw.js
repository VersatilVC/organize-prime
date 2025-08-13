const CACHE_NAME = 'organize-prime-v2';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/placeholder.svg'
];

const API_CACHE_NAME = 'api-cache-v2';
const CHUNK_CACHE_NAME = 'chunks-cache-v2';
const IMAGE_CACHE_NAME = 'images-cache-v2';
const API_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const CHUNK_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const IMAGE_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (![CACHE_NAME, API_CACHE_NAME, CHUNK_CACHE_NAME, IMAGE_CACHE_NAME].includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - handle caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Do NOT cache authenticated requests or any Supabase traffic
  const hasAuth = request.headers.has('Authorization');
  if (hasAuth || url.hostname.includes('supabase.co')) {
    event.respondWith(fetch(request));
    return;
  }

  // Enhanced caching strategy by resource type
  if (request.destination === 'script' || request.destination === 'style') {
    // JavaScript/CSS chunks - long-term cache with background updates
    event.respondWith(
      caches.open(CHUNK_CACHE_NAME).then(cache => {
        return cache.match(request).then(response => {
          const fetchAndCache = fetch(request).then(fetchResponse => {
            if (fetchResponse.ok) {
              cache.put(request, fetchResponse.clone());
            }
            return fetchResponse;
          });
          
          // Return cached if available, otherwise fetch
          return response || fetchAndCache;
        });
      })
    );
    return;
  }
  
  if (request.destination === 'image') {
    // Images - cache-first with long expiration
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then(cache => {
        return cache.match(request).then(response => {
          if (response) return response;
          
          return fetch(request).then(fetchResponse => {
            if (fetchResponse.ok) {
              cache.put(request, fetchResponse.clone());
            }
            return fetchResponse;
          });
        });
      })
    );
    return;
  }
  
  if (request.destination === 'document' || request.destination === 'font') {
    // Documents and fonts - stale-while-revalidate
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(request).then(response => {
          // Update in background if cached
          if (response) {
            fetch(request).then(fetchResponse => {
              if (fetchResponse.ok) {
                cache.put(request, fetchResponse.clone());
              }
            }).catch(() => {});
            return response;
          }
          
          // Not cached - fetch and cache
          return fetch(request).then(fetchResponse => {
            if (fetchResponse.ok) {
              cache.put(request, fetchResponse.clone());
            }
            return fetchResponse;
          });
        });
      })
    );
    return;
  }

  // Default: network-first without caching
  event.respondWith(fetch(request));
});

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Handle any failed requests that were queued
  // This would typically retry failed API calls
  console.log('Background sync triggered');
}

// Handle push notifications (if needed)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: data
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
