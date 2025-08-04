const CACHE_NAME = 'organize-prime-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/placeholder.svg'
];

const API_CACHE_NAME = 'api-cache-v1';
const API_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
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

  // Cache static assets (stale-while-revalidate)
  if (
    request.destination === 'document' ||
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(request).then(response => {
          // Return cached version and update in background
          if (response) {
            // Update cache in background
            fetch(request).then(fetchResponse => {
              if (fetchResponse.ok) {
                cache.put(request, fetchResponse.clone());
              }
            }).catch(() => {
              // Network failed, keep using cache
            });
            return response;
          }
          
          // Not in cache, fetch and cache
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

  // Cache API responses with TTL (network-first with cache fallback)
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then(cache => {
        return fetch(request).then(fetchResponse => {
          // Only cache successful responses
          if (fetchResponse.ok) {
            const responseClone = fetchResponse.clone();
            const headers = new Headers(responseClone.headers);
            headers.set('cached-time', new Date().toISOString());
            
            const responseWithTime = new Response(responseClone.body, {
              status: responseClone.status,
              statusText: responseClone.statusText,
              headers: headers
            });

            cache.put(request, responseWithTime);
          }
          return fetchResponse;
        }).catch(() => {
          // Network failed, try cache
          return cache.match(request).then(response => {
            if (response) {
              const cachedTime = new Date(response.headers.get('cached-time') || 0);
              const now = new Date();
              
              // Return cached response if it's still fresh
              if (now.getTime() - cachedTime.getTime() < API_CACHE_DURATION) {
                return response;
              }
            }
            
            // No valid cache, return network error
            return new Response('Network error', { 
              status: 503, 
              statusText: 'Service Unavailable' 
            });
          });
        });
      })
    );
  }
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
