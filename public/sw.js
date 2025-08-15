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

// Progressive enhancement based on connection
function getConnectionStrategy() {
  // Access connection info if available
  if ('connection' in navigator) {
    const connection = navigator.connection;
    return {
      effectiveType: connection.effectiveType,
      saveData: connection.saveData,
      downlink: connection.downlink
    };
  }
  return { effectiveType: '4g', saveData: false, downlink: 10 };
}

// Enhanced caching based on network conditions
function shouldCacheResource(request, connectionInfo) {
  const url = new URL(request.url);
  
  // Always cache critical resources
  if (STATIC_ASSETS.some(asset => url.pathname.includes(asset))) {
    return true;
  }
  
  // Reduce caching on slow connections or data saver mode
  if (connectionInfo.saveData || connectionInfo.effectiveType === 'slow-2g') {
    return false;
  }
  
  return true;
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Handle any offline mutations that were queued
    const offlineQueue = await getOfflineQueue();
    
    for (const item of offlineQueue) {
      try {
        await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body
        });
        
        // Remove from queue after successful sync
        await removeFromOfflineQueue(item.id);
        
        // Notify clients of successful sync
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SYNC_SUCCESS',
              id: item.id
            });
          });
        });
      } catch (error) {
        console.log('Failed to sync offline request:', error);
      }
    }
  } catch (error) {
    console.log('Background sync error:', error);
  }
}

// Offline queue management (simplified - in real app would use IndexedDB)
async function getOfflineQueue() {
  try {
    const cache = await caches.open('offline-queue');
    const requests = await cache.keys();
    const queue = [];
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const data = await response.json();
        queue.push(data);
      }
    }
    
    return queue;
  } catch {
    return [];
  }
}

async function removeFromOfflineQueue(id) {
  try {
    const cache = await caches.open('offline-queue');
    await cache.delete(`/offline-queue/${id}`);
  } catch (error) {
    console.log('Failed to remove from offline queue:', error);
  }
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
