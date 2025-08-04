// Safe localStorage wrapper to prevent race conditions and errors
class SafeStorage {
  private static instance: SafeStorage;
  private locks = new Map<string, Promise<void>>();

  static getInstance(): SafeStorage {
    if (!SafeStorage.instance) {
      SafeStorage.instance = new SafeStorage();
    }
    return SafeStorage.instance;
  }

  private async acquireLock(key: string): Promise<void> {
    while (this.locks.has(key)) {
      await this.locks.get(key);
    }
  }

  private releaseLock(key: string): void {
    this.locks.delete(key);
  }

  async getItem(key: string): Promise<string | null> {
    await this.acquireLock(key);
    
    const promise = new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
    this.locks.set(key, promise);

    try {
      if (typeof window === 'undefined') return null;
      const value = localStorage.getItem(key);
      return value;
    } catch (error) {
      console.error('LocalStorage getItem error:', error);
      return null;
    } finally {
      this.releaseLock(key);
    }
  }

  async setItem(key: string, value: string): Promise<boolean> {
    await this.acquireLock(key);
    
    const promise = new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
    this.locks.set(key, promise);

    try {
      if (typeof window === 'undefined') return false;
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('LocalStorage setItem error:', error);
      return false;
    } finally {
      this.releaseLock(key);
    }
  }

  async removeItem(key: string): Promise<boolean> {
    await this.acquireLock(key);
    
    const promise = new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
    this.locks.set(key, promise);

    try {
      if (typeof window === 'undefined') return false;
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('LocalStorage removeItem error:', error);
      return false;
    } finally {
      this.releaseLock(key);
    }
  }

  // Synchronous methods for backward compatibility (with error handling)
  getItemSync(key: string): string | null {
    try {
      if (typeof window === 'undefined') return null;
      return localStorage.getItem(key);
    } catch (error) {
      console.error('LocalStorage getItemSync error:', error);
      return null;
    }
  }

  setItemSync(key: string, value: string): boolean {
    try {
      if (typeof window === 'undefined') return false;
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('LocalStorage setItemSync error:', error);
      return false;
    }
  }

  removeItemSync(key: string): boolean {
    try {
      if (typeof window === 'undefined') return false;
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('LocalStorage removeItemSync error:', error);
      return false;
    }
  }
}

export const safeStorage = SafeStorage.getInstance();