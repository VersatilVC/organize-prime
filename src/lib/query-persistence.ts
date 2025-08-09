import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { safeStorage } from './safe-storage';

// LocalStorage-based persister using our SafeStorage wrapper
export const queryPersister = createSyncStoragePersister({
  storage: {
    getItem: (key: string) => safeStorage.getItemSync(key),
    setItem: (key: string, value: string) => {
      safeStorage.setItemSync(key, value);
    },
    removeItem: (key: string) => {
      safeStorage.removeItemSync(key);
    },
  },
});
