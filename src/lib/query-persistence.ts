import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { safeStorage } from './safe-storage';
import LZString from 'lz-string';

// LocalStorage-based persister with transparent compression
const PREFIX = 'lz:';

export const queryPersister = createSyncStoragePersister({
  storage: {
    getItem: (key: string) => {
      const raw = safeStorage.getItemSync(key);
      if (!raw) return raw as any;
      try {
        if (raw.startsWith(PREFIX)) {
          const decompressed = LZString.decompressFromUTF16(raw.slice(PREFIX.length));
          return decompressed ?? raw;
        }
        return raw;
      } catch {
        return raw;
      }
    },
    setItem: (key: string, value: string) => {
      try {
        const compressed = LZString.compressToUTF16(value);
        const finalValue = compressed && compressed.length < value.length ? PREFIX + compressed : value;
        safeStorage.setItemSync(key, finalValue);
      } catch {
        safeStorage.setItemSync(key, value);
      }
    },
    removeItem: (key: string) => {
      safeStorage.removeItemSync(key);
    },
  },
});