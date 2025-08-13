// Service worker with advanced caching strategies
const CACHE_NAME = 'organizeprime-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';
const IMAGE_CACHE = 'images-v1';

// Cache strategies configuration
const CACHE_STRATEGIES = {
  // Static assets - cache first with network fallback
  static: {
    pattern: /\.(js|css|woff2?|png|jpg|jpeg|svg|ico)$/,
    strategy: 'cacheFirst',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  
  // API responses - network first with cache fallback
  api: {
    pattern: /\/api\//,
    strategy: 'networkFirst',
    maxAge: 5 * 60 * 1000, // 5 minutes
  },
  
  // Images - cache first with size limit
  images: {
    pattern: /\.(png|jpg|jpeg|gif|webp|svg)$/,
    strategy: 'cacheFirst',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxEntries: 100,
  },
  
  // Documents - stale while revalidate
  documents: {
    pattern: /\.(html|json)$/,
    strategy: 'staleWhileRevalidate',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  }
};

// Install event - cache critical resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll([
          '/',
          '/manifest.json',
          // Add other critical resources
        ]);
      }),
      self.skipWaiting()
    ])
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== IMAGE_CACHE) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim()
    ])
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) return;

  // Determine cache strategy based on request
  const strategy = getCacheStrategy(request);
  
  if (strategy) {
    event.respondWith(handleRequest(request, strategy));
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'explore',
        title: 'View',
        icon: '/icon-explore.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icon-close.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('OrganizePrime', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Helper functions
function getCacheStrategy(request) {
  const url = new URL(request.url);
  
  // Check each strategy pattern
  for (const [name, config] of Object.entries(CACHE_STRATEGIES)) {
    if (config.pattern.test(url.pathname) || config.pattern.test(url.href)) {
      return { name, ...config };
    }
  }
  
  return null;
}

async function handleRequest(request, strategy) {
  const cacheName = getCacheName(strategy.name);
  
  switch (strategy.strategy) {
    case 'cacheFirst':
      return cacheFirst(request, cacheName, strategy);
    case 'networkFirst':
      return networkFirst(request, cacheName, strategy);
    case 'staleWhileRevalidate':
      return staleWhileRevalidate(request, cacheName, strategy);
    default:
      return fetch(request);
  }
}

function getCacheName(strategyName) {
  switch (strategyName) {
    case 'static':
      return STATIC_CACHE;
    case 'images':
      return IMAGE_CACHE;
    default:
      return DYNAMIC_CACHE;
  }
}

async function cacheFirst(request, cacheName, strategy) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached && !isExpired(cached, strategy.maxAge)) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      await cacheResponse(cache, request, response.clone(), strategy);
    }
    return response;
  } catch (error) {
    return cached || new Response('Network error', { status: 503 });
  }
}

async function networkFirst(request, cacheName, strategy) {
  const cache = await caches.open(cacheName);
  
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      await cacheResponse(cache, request, response.clone(), strategy);
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    return cached || new Response('Network error', { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName, strategy) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  // Start network request in background
  const networkPromise = fetch(request).then(async (response) => {
    if (response.status === 200) {
      await cacheResponse(cache, request, response.clone(), strategy);
    }
    return response;
  });
  
  // Return cached version immediately if available
  if (cached) {
    // Don't await the network request
    networkPromise.catch(() => {}); // Prevent unhandled rejection
    return cached;
  }
  
  // Wait for network if no cache
  return networkPromise;
}

async function cacheResponse(cache, request, response, strategy) {
  // Check cache size limits
  if (strategy.maxEntries) {
    await enforceCacheLimit(cache, strategy.maxEntries);
  }
  
  // Add timestamp for expiration checking
  const responseWithTimestamp = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      ...response.headers,
      'sw-cache-timestamp': Date.now().toString(),
    },
  });
  
  await cache.put(request, responseWithTimestamp);
}

async function enforceCacheLimit(cache, maxEntries) {
  const requests = await cache.keys();
  
  if (requests.length >= maxEntries) {
    const oldestRequest = requests[0];
    await cache.delete(oldestRequest);
  }
}

function isExpired(response, maxAge) {
  const timestamp = response.headers.get('sw-cache-timestamp');
  if (!timestamp) return false;
  
  const age = Date.now() - parseInt(timestamp);
  return age > maxAge;
}

async function doBackgroundSync() {
  // Implement background sync logic
  console.log('Performing background sync...');
  
  // Example: sync pending offline actions
  try {
    // Get pending actions from IndexedDB
    // Send them to server
    // Clear successful actions
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Performance monitoring
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PERFORMANCE_METRICS') {
    // Handle performance metrics from main thread
    console.log('Performance metrics received:', event.data.metrics);
  }
});

// Enhanced error handling
self.addEventListener('error', (event) => {
  console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker unhandled rejection:', event.reason);
});

// Periodic cache cleanup
setInterval(async () => {
  try {
    const cacheNames = await caches.keys();
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      // Remove expired entries
      for (const request of requests) {
        const response = await cache.match(request);
        if (response && isExpired(response, 7 * 24 * 60 * 60 * 1000)) { // 7 days
          await cache.delete(request);
        }
      }
    }
  } catch (error) {
    console.error('Cache cleanup failed:', error);
  }
}, 60 * 60 * 1000); // Run every hour