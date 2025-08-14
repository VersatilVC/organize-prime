// Progressive Web App manager for offline capabilities and push notifications
export class PWAManager {
  private static instance: PWAManager;
  private registration: ServiceWorkerRegistration | null = null;
  private updateAvailable = false;

  static getInstance(): PWAManager {
    if (!PWAManager.instance) {
      PWAManager.instance = new PWAManager();
    }
    return PWAManager.instance;
  }

  async initialize() {
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw-optimized.js');
        console.log('PWA Service Worker registered');
        
        // Check for updates
        this.registration.addEventListener('updatefound', () => {
          this.updateAvailable = true;
        });
      } catch (error) {
        console.error('PWA Service Worker registration failed:', error);
      }
    }
  }

  async requestNotificationPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      return await Notification.requestPermission();
    }
    return 'denied';
  }

  async subscribeToPushNotifications(): Promise<PushSubscription | null> {
    if (!this.registration) return null;
    
    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          // Add your VAPID public key here
          'BEl62iUYgUivxIkv69yViEuiBIa40HI6YrrfQAsxaq930DzxtR5iYar5E9l8lNOZNUhJwZOG3cUKs6m2Pv9MHFw'
        )
      });
      
      return subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async checkForUpdates(): Promise<boolean> {
    if (this.registration) {
      await this.registration.update();
      return this.updateAvailable;
    }
    return false;
  }

  async applyUpdate(): Promise<void> {
    if (this.registration && this.registration.waiting) {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }
}

export const pwaManager = PWAManager.getInstance();