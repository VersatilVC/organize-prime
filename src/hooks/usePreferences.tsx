import { useState, useEffect, useCallback } from 'react';
import { userPreferences } from '@/lib/local-storage';
import type { UserPreferences } from '@/lib/local-storage';

export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(() => 
    userPreferences.get()
  );

  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    setPreferences(prev => {
      const updated = { ...prev, ...updates };
      userPreferences.set(updates);
      return updated;
    });
  }, []);

  const updateTablePreferences = useCallback((
    tableId: string, 
    tablePrefs: UserPreferences['tablePreferences'][string]
  ) => {
    setPreferences(prev => {
      const updated = {
        ...prev,
        tablePreferences: {
          ...prev.tablePreferences,
          [tableId]: tablePrefs,
        },
      };
      userPreferences.updateTablePreferences(tableId, tablePrefs);
      return updated;
    });
  }, []);

  const addRecentSearch = useCallback((query: string) => {
    setPreferences(prev => {
      const recentSearches = [query, ...prev.recentSearches.filter(s => s !== query)].slice(0, 10);
      const updated = { ...prev, recentSearches };
      userPreferences.addRecentSearch(query);
      return updated;
    });
  }, []);

  const clearPreferences = useCallback(() => {
    const defaultPrefs = userPreferences.get();
    setPreferences(defaultPrefs);
    userPreferences.clear();
  }, []);

  return {
    preferences,
    updatePreferences,
    updateTablePreferences,
    addRecentSearch,
    clearPreferences,
    
    // Convenient getters for common preferences
    theme: preferences.theme,
    sidebarCollapsed: preferences.sidebarCollapsed,
    dashboardLayout: preferences.dashboardLayout,
    recentSearches: preferences.recentSearches,
    language: preferences.language,
  };
}

// Hook for theme management
export function useThemePreference() {
  const { preferences, updatePreferences } = usePreferences();
  
  const setTheme = useCallback((theme: UserPreferences['theme']) => {
    updatePreferences({ theme });
    
    // Apply theme to document
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // System theme
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    }
  }, [updatePreferences]);

  // Initialize theme on mount
  useEffect(() => {
    setTheme(preferences.theme);
  }, [preferences.theme, setTheme]);

  return {
    theme: preferences.theme,
    setTheme,
  };
}

// Hook for sidebar state
export function useSidebarPreference() {
  const { preferences, updatePreferences } = usePreferences();
  
  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    updatePreferences({ sidebarCollapsed: collapsed });
  }, [updatePreferences]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(!preferences.sidebarCollapsed);
  }, [preferences.sidebarCollapsed, setSidebarCollapsed]);

  return {
    sidebarCollapsed: preferences.sidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebar,
  };
}

// Hook for table preferences
export function useTablePreferences(tableId: string) {
  const { preferences, updateTablePreferences } = usePreferences();
  const tablePrefs = preferences.tablePreferences[tableId] || {
    columnsVisible: [],
    pageSize: 10,
  };

  const updateColumns = useCallback((columns: string[]) => {
    updateTablePreferences(tableId, {
      ...tablePrefs,
      columnsVisible: columns,
    });
  }, [tableId, tablePrefs, updateTablePreferences]);

  const updatePageSize = useCallback((pageSize: number) => {
    updateTablePreferences(tableId, {
      ...tablePrefs,
      pageSize,
    });
  }, [tableId, tablePrefs, updateTablePreferences]);

  const updateSort = useCallback((sortBy: string, sortOrder: 'asc' | 'desc') => {
    updateTablePreferences(tableId, {
      ...tablePrefs,
      sortBy,
      sortOrder,
    });
  }, [tableId, tablePrefs, updateTablePreferences]);

  return {
    tablePreferences: tablePrefs,
    updateColumns,
    updatePageSize,
    updateSort,
  };
}