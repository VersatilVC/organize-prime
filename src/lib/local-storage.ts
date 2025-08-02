// Type-safe localStorage utilities for caching user preferences

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  dashboardLayout: string[];
  tablePreferences: Record<string, {
    columnsVisible: string[];
    pageSize: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }>;
  recentSearches: string[];
  language: string;
}

export interface OrganizationCache {
  id: string;
  name: string;
  logo_url: string | null;
  permissions: string[];
  lastUpdated: number;
  userRole: string;
}

export interface SearchCache {
  query: string;
  results: any[];
  timestamp: number;
  type: 'users' | 'organizations' | 'feedback';
}

const STORAGE_KEYS = {
  USER_PREFERENCES: 'app_user_preferences',
  ORGANIZATION_CACHE: 'app_organization_cache',
  SEARCH_CACHE: 'app_search_cache',
  IMAGE_CACHE: 'app_image_cache',
  RECENT_ACTIVITIES: 'app_recent_activities',
} as const;

const CACHE_DURATION = {
  ORGANIZATION: 5 * 60 * 1000, // 5 minutes
  SEARCH: 2 * 60 * 1000, // 2 minutes
  IMAGE: 24 * 60 * 60 * 1000, // 24 hours
  ACTIVITIES: 10 * 60 * 1000, // 10 minutes
} as const;

// Generic localStorage utilities
export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  },

  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  },

  clear: (): void => {
    try {
      localStorage.clear();
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  },
};

// User preferences management
export const userPreferences = {
  get: (): UserPreferences => {
    return storage.get(STORAGE_KEYS.USER_PREFERENCES, {
      theme: 'system' as const,
      sidebarCollapsed: false,
      dashboardLayout: [],
      tablePreferences: {},
      recentSearches: [],
      language: 'en',
    });
  },

  set: (preferences: Partial<UserPreferences>): void => {
    const current = userPreferences.get();
    storage.set(STORAGE_KEYS.USER_PREFERENCES, { ...current, ...preferences });
  },

  updateTablePreferences: (tableId: string, preferences: UserPreferences['tablePreferences'][string]): void => {
    const current = userPreferences.get();
    storage.set(STORAGE_KEYS.USER_PREFERENCES, {
      ...current,
      tablePreferences: {
        ...current.tablePreferences,
        [tableId]: preferences,
      },
    });
  },

  addRecentSearch: (query: string): void => {
    const current = userPreferences.get();
    const recentSearches = [query, ...current.recentSearches.filter(s => s !== query)].slice(0, 10);
    storage.set(STORAGE_KEYS.USER_PREFERENCES, {
      ...current,
      recentSearches,
    });
  },

  clear: (): void => {
    storage.remove(STORAGE_KEYS.USER_PREFERENCES);
  },
};

// Organization data caching
export const organizationCache = {
  get: (orgId: string): OrganizationCache | null => {
    const cache = storage.get<Record<string, OrganizationCache>>(STORAGE_KEYS.ORGANIZATION_CACHE, {});
    const org = cache[orgId];
    
    if (!org) return null;
    
    // Check if cache is expired
    if (Date.now() - org.lastUpdated > CACHE_DURATION.ORGANIZATION) {
      organizationCache.remove(orgId);
      return null;
    }
    
    return org;
  },

  set: (org: OrganizationCache): void => {
    const cache = storage.get<Record<string, OrganizationCache>>(STORAGE_KEYS.ORGANIZATION_CACHE, {});
    cache[org.id] = {
      ...org,
      lastUpdated: Date.now(),
    };
    storage.set(STORAGE_KEYS.ORGANIZATION_CACHE, cache);
  },

  remove: (orgId: string): void => {
    const cache = storage.get<Record<string, OrganizationCache>>(STORAGE_KEYS.ORGANIZATION_CACHE, {});
    delete cache[orgId];
    storage.set(STORAGE_KEYS.ORGANIZATION_CACHE, cache);
  },

  clear: (): void => {
    storage.remove(STORAGE_KEYS.ORGANIZATION_CACHE);
  },

  getAll: (): OrganizationCache[] => {
    const cache = storage.get<Record<string, OrganizationCache>>(STORAGE_KEYS.ORGANIZATION_CACHE, {});
    return Object.values(cache).filter(org => 
      Date.now() - org.lastUpdated <= CACHE_DURATION.ORGANIZATION
    );
  },
};

// Search results caching
export const searchCache = {
  get: (query: string, type: SearchCache['type']): SearchCache | null => {
    const cache = storage.get<SearchCache[]>(STORAGE_KEYS.SEARCH_CACHE, []);
    const result = cache.find(item => item.query === query && item.type === type);
    
    if (!result) return null;
    
    // Check if cache is expired
    if (Date.now() - result.timestamp > CACHE_DURATION.SEARCH) {
      searchCache.remove(query, type);
      return null;
    }
    
    return result;
  },

  set: (searchResult: SearchCache): void => {
    const cache = storage.get<SearchCache[]>(STORAGE_KEYS.SEARCH_CACHE, []);
    const updated = cache.filter(item => 
      !(item.query === searchResult.query && item.type === searchResult.type)
    );
    
    updated.unshift({
      ...searchResult,
      timestamp: Date.now(),
    });
    
    // Keep only the latest 50 search results
    storage.set(STORAGE_KEYS.SEARCH_CACHE, updated.slice(0, 50));
  },

  remove: (query: string, type: SearchCache['type']): void => {
    const cache = storage.get<SearchCache[]>(STORAGE_KEYS.SEARCH_CACHE, []);
    const filtered = cache.filter(item => 
      !(item.query === query && item.type === type)
    );
    storage.set(STORAGE_KEYS.SEARCH_CACHE, filtered);
  },

  clear: (): void => {
    storage.remove(STORAGE_KEYS.SEARCH_CACHE);
  },

  getRecentQueries: (type?: SearchCache['type']): string[] => {
    const cache = storage.get<SearchCache[]>(STORAGE_KEYS.SEARCH_CACHE, []);
    return cache
      .filter(item => !type || item.type === type)
      .slice(0, 10)
      .map(item => item.query);
  },
};

// Image caching utilities
export const imageCache = {
  get: (url: string): string | null => {
    const cache = storage.get<Record<string, { data: string; timestamp: number }>>(STORAGE_KEYS.IMAGE_CACHE, {});
    const cached = cache[url];
    
    if (!cached) return null;
    
    // Check if cache is expired
    if (Date.now() - cached.timestamp > CACHE_DURATION.IMAGE) {
      imageCache.remove(url);
      return null;
    }
    
    return cached.data;
  },

  set: (url: string, data: string): void => {
    const cache = storage.get<Record<string, { data: string; timestamp: number }>>(STORAGE_KEYS.IMAGE_CACHE, {});
    cache[url] = {
      data,
      timestamp: Date.now(),
    };
    storage.set(STORAGE_KEYS.IMAGE_CACHE, cache);
  },

  remove: (url: string): void => {
    const cache = storage.get<Record<string, { data: string; timestamp: number }>>(STORAGE_KEYS.IMAGE_CACHE, {});
    delete cache[url];
    storage.set(STORAGE_KEYS.IMAGE_CACHE, cache);
  },

  clear: (): void => {
    storage.remove(STORAGE_KEYS.IMAGE_CACHE);
  },

  cleanup: (): void => {
    const cache = storage.get<Record<string, { data: string; timestamp: number }>>(STORAGE_KEYS.IMAGE_CACHE, {});
    const now = Date.now();
    const cleaned: typeof cache = {};
    
    Object.entries(cache).forEach(([url, item]) => {
      if (now - item.timestamp <= CACHE_DURATION.IMAGE) {
        cleaned[url] = item;
      }
    });
    
    storage.set(STORAGE_KEYS.IMAGE_CACHE, cleaned);
  },
};

// Clear all caches
export const clearAllCaches = (): void => {
  Object.values(STORAGE_KEYS).forEach(key => {
    storage.remove(key);
  });
};

// Initialize cache cleanup on app start
export const initializeCacheCleanup = (): void => {
  // Clean up expired image cache entries
  imageCache.cleanup();
  
  // Clean up expired search cache entries
  const searchResults = storage.get<SearchCache[]>(STORAGE_KEYS.SEARCH_CACHE, []);
  const validSearchResults = searchResults.filter(item => 
    Date.now() - item.timestamp <= CACHE_DURATION.SEARCH
  );
  storage.set(STORAGE_KEYS.SEARCH_CACHE, validSearchResults);
  
  // Clean up expired organization cache entries
  const orgCache = storage.get<Record<string, OrganizationCache>>(STORAGE_KEYS.ORGANIZATION_CACHE, {});
  const validOrgCache: typeof orgCache = {};
  Object.entries(orgCache).forEach(([id, org]) => {
    if (Date.now() - org.lastUpdated <= CACHE_DURATION.ORGANIZATION) {
      validOrgCache[id] = org;
    }
  });
  storage.set(STORAGE_KEYS.ORGANIZATION_CACHE, validOrgCache);
};
