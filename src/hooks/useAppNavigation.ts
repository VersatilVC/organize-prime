import { useMemo } from 'react';
import { useAppInstallations } from '@/hooks/database/useMarketplaceApps';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface AppNavigationItem {
  label: string;
  href: string;
  icon: string;
  badge?: string;
  children?: AppNavigationItem[];
}

export interface AppNavigationSection {
  id: string;
  title: string;
  icon: string;
  items: AppNavigationItem[];
  isApp: boolean;
  appSlug?: string;
}

export const useAppNavigation = (organizationId?: string) => {
  const { currentOrganization } = useOrganization();
  const { data: appInstallations = [], isLoading } = useAppInstallations();
  
  const effectiveOrgId = organizationId || currentOrganization?.id;

  const appNavigationSections = useMemo(() => {
    if (!effectiveOrgId || !appInstallations.length) return [];

    return appInstallations.map(installation => {
      const app = installation.marketplace_apps;
      const navigationConfig = installation.custom_navigation || {};
      
      // Default navigation items for all apps
      const defaultItems: AppNavigationItem[] = [
        { 
          label: 'Dashboard', 
          href: `/apps/${app.slug}`, 
          icon: 'home' 
        },
        { 
          label: 'Settings', 
          href: `/apps/${app.slug}/settings`, 
          icon: 'settings' 
        }
      ];

      // Parse custom navigation from app installation
      const customItems = navigationConfig.items || [];
      const navigationItems = customItems.length > 0 ? customItems.map((item: any) => ({
        label: item.label || item.name,
        href: item.href || item.path || `/apps/${app.slug}/${item.slug || item.name.toLowerCase()}`,
        icon: item.icon || 'package',
        badge: item.badge,
        children: item.children?.map((child: any) => ({
          label: child.label || child.name,
          href: child.href || child.path || `/apps/${app.slug}/${child.slug || child.name.toLowerCase()}`,
          icon: child.icon || 'package',
          badge: child.badge,
        })) || []
      })) : defaultItems;

      return {
        id: app.slug,
        title: app.name,
        icon: app.icon_name || 'package',
        items: navigationItems,
        isApp: true,
        appSlug: app.slug,
      };
    });
  }, [appInstallations, effectiveOrgId]);

  return {
    sections: appNavigationSections,
    isLoading,
  };
};

export const useAppNavigationItem = (appSlug: string, itemId: string) => {
  const { sections } = useAppNavigation();
  
  return useMemo(() => {
    const appSection = sections.find(section => section.appSlug === appSlug);
    if (!appSection) return null;

    const findItem = (items: AppNavigationItem[]): AppNavigationItem | null => {
      for (const item of items) {
        if (item.href.includes(itemId)) {
          return item;
        }
        if (item.children?.length) {
          const found = findItem(item.children);
          if (found) return found;
        }
      }
      return null;
    };

    return findItem(appSection.items);
  }, [sections, appSlug, itemId]);
};

export const useIsAppNavigationItemActive = (href: string, currentPath: string) => {
  return useMemo(() => {
    if (href === currentPath) return true;
    if (href !== '/' && currentPath.startsWith(href)) return true;
    return false;
  }, [href, currentPath]);
};