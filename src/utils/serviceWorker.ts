/**
 * Service Worker registration and management for progressive enhancement
 */

interface ServiceWorkerConfig {
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onOffline?: () => void;
  onOnline?: () => void;
}

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

/**
 * Register service worker with progressive enhancement features
 */
export function registerServiceWorker(config: ServiceWorkerConfig = {}) {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker not supported');
    return;
  }

  window.addEventListener('load', () => {
    const swUrl = '/sw.js';

    if (isLocalhost) {
      // This is running on localhost. Let's check if a service worker still exists or not.
      checkValidServiceWorker(swUrl, config);

      // Add some additional logging to localhost, pointing developers to the
      // service worker/PWA documentation.
      navigator.serviceWorker.ready.then(() => {
        console.log(
          'This web app is being served cache-first by a service ' +
          'worker. To learn more, visit https://bit.ly/CRA-PWA'
        );
      });
    } else {
      // Is not localhost. Just register service worker
      registerValidServiceWorker(swUrl, config);
    }
  });

  // Listen for online/offline events
  window.addEventListener('online', () => {
    console.log('App is online');
    config.onOnline?.();
    
    // Trigger background sync when coming back online
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then(registration => {
        return registration.sync.register('background-sync');
      }).catch(error => {
        console.log('Background sync registration failed:', error);
      });
    }
  });

  window.addEventListener('offline', () => {
    console.log('App is offline');
    config.onOffline?.();
  });
}

function registerValidServiceWorker(swUrl: string, config: ServiceWorkerConfig) {
  navigator.serviceWorker
    .register(swUrl)
    .then(registration => {
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // At this point, the updated precached content has been fetched,
              // but the previous service worker will still serve the older
              // content until all client tabs are closed.
              console.log(
                'New content is available and will be used when all ' +
                'tabs for this page are closed. See https://bit.ly/CRA-PWA.'
              );

              // Execute callback
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              // At this point, everything has been precached.
              // It's the perfect time to display a
              // "Content is cached for offline use." message.
              console.log('Content is cached for offline use.');

              // Execute callback
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };
    })
    .catch(error => {
      console.error('Error during service worker registration:', error);
    });
}

function checkValidServiceWorker(swUrl: string, config: ServiceWorkerConfig) {
  // Check if the service worker can be found. If it can't reload the page.
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then(response => {
      // Ensure service worker exists, and that we really are getting a JS file.
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        // No service worker found. Probably a different app. Reload the page.
        navigator.serviceWorker.ready.then(registration => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        // Service worker found. Proceed as normal.
        registerValidServiceWorker(swUrl, config);
      }
    })
    .catch(() => {
      console.log(
        'No internet connection found. App is running in offline mode.'
      );
    });
}

/**
 * Unregister service worker
 */
export function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(registration => {
        registration.unregister();
      })
      .catch(error => {
        console.error(error.message);
      });
  }
}

/**
 * Update service worker manually
 */
export function updateServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(registration => {
        registration.update();
      })
      .catch(error => {
        console.error('Service worker update failed:', error);
      });
  }
}

/**
 * Check if there's a service worker update available
 */
export function checkForServiceWorkerUpdate(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!('serviceWorker' in navigator)) {
      resolve(false);
      return;
    }

    navigator.serviceWorker.ready
      .then(registration => {
        registration.update().then(() => {
          if (registration.waiting) {
            resolve(true);
          } else {
            resolve(false);
          }
        });
      })
      .catch(() => {
        resolve(false);
      });
  });
}

/**
 * Skip waiting and activate new service worker
 */
export function skipWaitingAndReload() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(registration => {
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          window.location.reload();
        }
      });
  }
}

/**
 * Get network status information
 */
export function getNetworkStatus() {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  
  return {
    online: navigator.onLine,
    effectiveType: connection?.effectiveType || 'unknown',
    downlink: connection?.downlink || 0,
    rtt: connection?.rtt || 0,
    saveData: connection?.saveData || false
  };
}

/**
 * Add data to offline queue for background sync
 */
export function addToOfflineQueue(data: {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
}) {
  if ('serviceWorker' in navigator && 'caches' in window) {
    caches.open('offline-queue').then(cache => {
      const request = new Request(`/offline-queue/${data.id}`);
      const response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
      cache.put(request, response);
    });
  }
}

/**
 * Listen for service worker messages
 */
export function listenForServiceWorkerMessages(
  callback: (message: any) => void
) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      callback(event.data);
    });
  }
}

/**
 * Send message to service worker
 */
export function sendMessageToServiceWorker(message: any) {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(message);
  }
}

/**
 * Progressive enhancement based on device capabilities
 */
export function getDeviceCapabilities() {
  return {
    hasServiceWorker: 'serviceWorker' in navigator,
    hasNotifications: 'Notification' in window,
    hasPushAPI: 'PushManager' in window,
    hasBackgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
    hasWebShare: 'share' in navigator,
    hasClipboard: 'clipboard' in navigator,
    hasVibration: 'vibrate' in navigator,
    hasGeolocation: 'geolocation' in navigator,
    hasCamera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
    hasInstallPrompt: 'BeforeInstallPromptEvent' in window,
    deviceMemory: (navigator as any).deviceMemory || 4,
    hardwareConcurrency: navigator.hardwareConcurrency || 4,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    connectionType: getNetworkStatus().effectiveType
  };
}

/**
 * Install prompt management for PWA
 */
export class PWAInstallManager {
  private deferredPrompt: any = null;
  private installCallback?: () => void;

  constructor(onInstallAvailable?: () => void) {
    this.installCallback = onInstallAvailable;
    this.setupInstallPrompt();
  }

  private setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      this.deferredPrompt = e;
      
      // Notify that install is available
      this.installCallback?.();
    });

    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      this.deferredPrompt = null;
    });
  }

  async showInstallPrompt(): Promise<boolean> {
    if (!this.deferredPrompt) {
      return false;
    }

    // Show the prompt
    this.deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await this.deferredPrompt.userChoice;
    
    // Clear the deferred prompt
    this.deferredPrompt = null;
    
    return outcome === 'accepted';
  }

  isInstallAvailable(): boolean {
    return this.deferredPrompt !== null;
  }

  isStandalone(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }
}

/**
 * Notification management with progressive enhancement
 */
export class NotificationManager {
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return Notification.permission;
  }

  async showNotification(title: string, options: NotificationOptions = {}) {
    const permission = await this.requestPermission();
    
    if (permission === 'granted') {
      if ('serviceWorker' in navigator) {
        // Use service worker for better notification handling
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          ...options
        });
      } else {
        // Fallback to direct notification
        new Notification(title, options);
      }
    }
  }

  isSupported(): boolean {
    return 'Notification' in window;
  }

  getPermission(): NotificationPermission {
    return Notification.permission;
  }
}