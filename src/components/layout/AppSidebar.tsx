import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { useDashboardData } from '@/hooks/useDashboardData';
// import { useAppInstallations } from '@/hooks/database/useMarketplaceApps'; // Removed - marketplace functionality
import { useOrganizationFeatureConfigs } from '@/hooks/useOrganizationFeatureConfigs';
import { useFeatureNavigationSections } from '@/hooks/database/useOrganizationFeatures';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Icons } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { prefetchByPath } from '@/lib/route-prefetch';
import { useQueryClient } from '@tanstack/react-query';
import { prefetchQueriesByPath } from '@/lib/query-prefetch';

// Define sidebar sections with their navigation items
interface SidebarSection {
  key: string;
  title: string;
  items: Array<{
    name: string;
    href: string;
    icon: any;
    badge?: number;
  }>;
  isVisible: (role: string) => boolean;
  isApp?: boolean;
  appIcon?: string;
}

// Helper function to get items for each section based on role
const getSectionItems = (sectionKey: string, role: string, section?: SidebarSection) => {
  // For app sections, return the items from the section itself
  if (sectionKey.startsWith('app-') && section) {
    console.log(`Returning items for app section ${sectionKey}:`, section.items);
    return section.items;
  }
  
  // For feature sections, return the items from the section itself
  if (sectionKey.startsWith('feature-') && section) {
    return section.items;
  }
  
  switch (sectionKey) {
    case 'main':
      const mainItems = [
        { name: 'Dashboard', href: '/', icon: Icons.home },
        { name: 'Notifications', href: '/notifications', icon: Icons.bell }
      ];
      if (role === 'super_admin') {
        mainItems.push({ name: 'Organizations', href: '/organizations', icon: Icons.building });
      }
      if (role === 'admin' || role === 'super_admin') {
        mainItems.push({ name: 'Users', href: '/users', icon: Icons.users });
      }
      return mainItems;
    
    case 'management':
      return [
        { name: 'Company Settings', href: '/settings/company', icon: Icons.settings },
        { name: 'Billing', href: '/billing', icon: Icons.creditCard },
      ];
    
    case 'system-admin':
      return [
        { name: 'System Settings', href: '/settings/system', icon: Icons.settings },
        { name: 'Notification Management', href: '/settings/notifications', icon: Icons.bell },
        { name: 'Feedback Management', href: '/admin/feedback', icon: Icons.mail },
      ];
    
    case 'support':
      return [
        { name: 'Send Feedback', href: '/feedback', icon: Icons.mail },
        { name: 'Help Center', href: '/help', icon: Icons.helpCircle },
      ];
    
    default:
      return [];
  }
};

// Create dynamic sections for installed marketplace apps
const createAppSections = (appInstallations: any[], configs: any[]): SidebarSection[] => {
  console.log('Creating app sections for installations:', appInstallations);
  console.log('Organization feature configs:', configs);
  
  // Helper function to check if app is enabled
  const isAppEnabled = (appSlug: string) => {
    const config = configs.find(c => c.feature_slug === appSlug);
    return config?.is_enabled !== false; // Default to enabled if no config exists
  };
  
  // Filter installations to only include enabled apps
  const enabledInstallations = appInstallations.filter(installation => {
    const app = installation.marketplace_apps;
    const enabled = isAppEnabled(app.slug);
    console.log(`App ${app.name} (${app.slug}) enabled:`, enabled);
    return enabled;
  });
  
  return enabledInstallations.map(installation => {
    const app = installation.marketplace_apps;
    const navigationConfig = installation.custom_navigation || {};
    
    // Default navigation items for all apps
    const defaultItems = [
      { name: 'Dashboard', href: `/features/${app.slug}`, icon: Icons.home },
      { name: 'Settings', href: `/features/${app.slug}/settings`, icon: Icons.settings }
    ];

    // Check if custom_navigation has items array, even if empty
    let navigationItems = defaultItems;
    if (navigationConfig && Array.isArray(navigationConfig.items) && navigationConfig.items.length > 0) {
      // Use custom navigation items if they exist
      navigationItems = navigationConfig.items.map((navItem: any) => ({
        name: navItem.name || navItem.label,
        href: navItem.href || navItem.path || `/features/${app.slug}/${navItem.slug || navItem.name.toLowerCase()}`,
        icon: Icons[navItem.icon as keyof typeof Icons] || Icons.package,
        badge: navItem.badge
      }));
    }
    // Otherwise, always use default items

    console.log(`Creating section for enabled app ${app.name}:`, {
      slug: app.slug,
      navigationItems,
      hasCustomNav: navigationConfig && Array.isArray(navigationConfig.items)
    });

    return {
      key: `app-${app.slug}`,
      title: app.name,
      items: navigationItems,
      isVisible: () => true,
      isApp: true,
      appIcon: app.icon_name || 'package',
    };
  });
};

// Create dynamic sections for enabled features
const createFeatureSections = (featureNavigationSections: any[]): SidebarSection[] => {
  return featureNavigationSections.map(featureSection => ({
    key: featureSection.key,
    title: featureSection.title,
    items: featureSection.items.map((item: any) => ({
      name: item.name,
      href: item.href,
      icon: Icons[item.icon as keyof typeof Icons] || Icons.package,
    })),
    isVisible: () => true,
    isApp: false,
    appIcon: featureSection.icon,
  }));
};

const baseSidebarSections: SidebarSection[] = [
  {
    key: 'main',
    title: 'Main',
    items: [], // Will be populated dynamically
    isVisible: () => true,
  },
  {
    key: 'management',
    title: 'Management',
    items: [], // Will be populated dynamically
    isVisible: (role) => role === 'admin' || role === 'super_admin',
  },
  {
    key: 'system-admin',
    title: 'System Admin',
    items: [], // Will be populated dynamically
    isVisible: (role) => role === 'super_admin',
  },
  {
    key: 'support',
    title: 'Support',
    items: [], // Will be populated dynamically
    isVisible: () => true,
  },
];

// Combine base sections with dynamic app and feature sections
const getAllSidebarSections = (appInstallations: any[], configs: any[], featureNavigationSections: any[]): SidebarSection[] => {
  const appSections = createAppSections(appInstallations, configs);
  const featureSections = createFeatureSections(featureNavigationSections);
  
  // Insert feature sections first, then app sections after 'main' section but before management sections
  const sections = [...baseSidebarSections];
  const mainIndex = sections.findIndex(s => s.key === 'main');
  sections.splice(mainIndex + 1, 0, ...featureSections, ...appSections);
  
  return sections;
};

// Hook for managing sidebar section states
function useSidebarSectionState(allSections: SidebarSection[] = []) {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const location = useLocation();

  // Load initial state from localStorage
  useEffect(() => {
    if (!allSections || allSections.length === 0) return;
    
    const savedStates: Record<string, boolean> = {};
    allSections.forEach(section => {
      const saved = localStorage.getItem(`sidebar_section_${section.key}_collapsed`);
      savedStates[section.key] = saved === 'true';
    });
    setCollapsedSections(savedStates);
  }, [allSections]);

  // Auto-expand section if user navigates to a page within collapsed section
  useEffect(() => {
    if (!allSections || allSections.length === 0) return;
    
    allSections.forEach(section => {
      const items = getSectionItems(section.key, 'user', section); // Pass section for feature sections
      const hasActiveItem = items.some(item => {
        if (item.href === '/') {
          return location.pathname === '/';
        }
        return location.pathname.startsWith(item.href);
      });

      if (hasActiveItem && collapsedSections[section.key]) {
        toggleSection(section.key);
      }
    });
  }, [location.pathname, allSections, collapsedSections]);

  const toggleSection = (sectionKey: string) => {
    setCollapsedSections(prev => {
      const newState = { ...prev, [sectionKey]: !prev[sectionKey] };
      localStorage.setItem(`sidebar_section_${sectionKey}_collapsed`, String(newState[sectionKey]));
      return newState;
    });
  };

  return { collapsedSections, toggleSection };
}

// Memoized NavigationItem component
const NavigationItem = React.memo(({ 
  item, 
  isActive, 
  feedbackCount 
}: {
  item: { name: string; href: string; icon: any; badge?: number };
  isActive: boolean;
  feedbackCount: number;
}) => {
  const location = useLocation();
  const queryClient = useQueryClient();
  
  const handleHover = () => {
    prefetchByPath(item.href);
    prefetchQueriesByPath(item.href, queryClient);
  };

  // More precise active state detection
  const isItemActive = useMemo(() => {
    if (!item.href) return false;
    
    // Exact match for current path
    if (location.pathname === item.href) return true;
    
    // For nested paths, only match if this is the most specific route
    if (location.pathname.startsWith(item.href + '/')) {
      // Don't highlight parent routes if a more specific child exists
      // This prevents both "/features/knowledge-base" and "/features/knowledge-base/ai-chat" 
      // from being active when on the AI Chat page
      const pathSegments = location.pathname.split('/');
      const hrefSegments = item.href.split('/');
      
      // Only active if this is the direct parent (no intermediate segments)
      return pathSegments.length === hrefSegments.length + 1;
    }
    
    return false;
  }, [location.pathname, item.href]);

  // Get the correct icon component, fallback to package if not found
  const IconComponent = typeof item.icon === 'string' ? Icons[item.icon as keyof typeof Icons] || Icons.package : item.icon;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isItemActive}>
        <NavLink 
          to={item.href} 
          className={isItemActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}
          onMouseEnter={handleHover}
        >
          <IconComponent className="h-4 w-4" />
          <span>{item.name}</span>
          {/* Show feature-specific badge if available */}
          {item.badge && item.badge > 0 && (
            <Badge 
              variant={item.badge > 10 ? "destructive" : "secondary"} 
              className="ml-auto h-5 px-1.5 text-xs"
            >
              {item.badge}
            </Badge>
          )}
          {/* Show feedback count badge for feedback-related items */}
          {(item.href === '/admin/feedback' || item.href === '/feedback/manage') && feedbackCount > 0 && (
            <Badge variant="destructive" className="ml-auto h-5 px-1.5 text-xs">
              {feedbackCount}
            </Badge>
          )}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.isActive === nextProps.isActive &&
    prevProps.feedbackCount === nextProps.feedbackCount &&
    prevProps.item.badge === nextProps.item.badge
  );
});

NavigationItem.displayName = 'NavigationItem';

// Memoized SidebarSection component
const SidebarSectionComponent = React.memo(({ 
  section, 
  role, 
  collapsedSections, 
  toggleSection, 
  feedback, 
  isActive 
}: {
  section: SidebarSection;
  role: string;
  collapsedSections: Record<string, boolean>;
  toggleSection: (key: string) => void;
  feedback: number;
  isActive: (path: string) => boolean;
}) => {
  if (!section.isVisible(role)) return null;
  
  const items = getSectionItems(section.key, role, section);
  if (items.length === 0) return null;
  
  const isCollapsed = collapsedSections[section.key];
  const itemCount = items.length;
  const activeItems = items.filter(item => isActive(item.href));
  const hasActiveItem = activeItems.length > 0;

  return (
    <Collapsible 
      open={!isCollapsed} 
      onOpenChange={() => toggleSection(section.key)}
    >
      <SidebarGroup>
        <CollapsibleTrigger asChild>
          <SidebarGroupLabel
            className={cn(
              "group flex w-full items-center justify-between py-2 px-2 text-sm font-medium transition-colors",
              "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground cursor-pointer",
              hasActiveItem && "text-sidebar-accent-foreground"
            )}
          >
            <div className="flex items-center gap-2">
              {section.isApp && section.appIcon && (
                <div className="w-4 h-4 flex items-center justify-center">
                  {React.createElement(Icons[section.appIcon as keyof typeof Icons] || Icons.package, {
                    className: "w-4 h-4"
                  })}
                </div>
              )}
              <span>
                {section.title}
                {isCollapsed && ` (${itemCount})`}
              </span>
            </div>
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 transition-transform duration-300 ease-in-out" />
            ) : (
              <ChevronDown className="h-4 w-4 transition-transform duration-300 ease-in-out" />
            )}
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="overflow-hidden transition-all duration-300 ease-in-out data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <NavigationItem
                  key={item.name}
                  item={item}
                  isActive={isActive(item.href)}
                  feedbackCount={feedback}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.role === nextProps.role &&
    prevProps.feedback === nextProps.feedback &&
    JSON.stringify(prevProps.collapsedSections) === JSON.stringify(nextProps.collapsedSections)
  );
});

SidebarSectionComponent.displayName = 'SidebarSectionComponent';

export function AppSidebar() {
  // Add early return if React context is not available
  try {
    const { role, loading: roleLoading } = useUserRole();
    const { feedback } = useDashboardData();
    // Mock app installations data - marketplace functionality removed
    const appInstallations: any[] = [];
    const appsLoading = false;
    const { configs, isLoading: configsLoading } = useOrganizationFeatureConfigs();
    const featureNavigationSections = useFeatureNavigationSections();
    const location = useLocation();

    // Get all sections including dynamic app and feature sections
    const allSections = useMemo(() => {
      if (!role) return [];
      return getAllSidebarSections(appInstallations, configs, featureNavigationSections).filter(section => section.isVisible(role));
    }, [role, appInstallations, configs, featureNavigationSections]);

    const { collapsedSections, toggleSection } = useSidebarSectionState(allSections);

    // Memoized isActive function to prevent recreation on every render
    const isActive = useCallback((path: string) => {
      if (path === '/') {
        return location.pathname === '/';
      }
      return location.pathname.startsWith(path);
    }, [location.pathname]);

    return (
      <Sidebar collapsible="icon">
        <SidebarContent className="space-y-1">
          {roleLoading || appsLoading || configsLoading ? (
            // Show loading skeleton while role is being determined
            <div className="space-y-4 p-4">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-8 bg-muted rounded"></div>
                <div className="h-8 bg-muted rounded"></div>
              </div>
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-1/3"></div>
                <div className="h-8 bg-muted rounded"></div>
              </div>
            </div>
          ) : (
            allSections.map(section => (
              <SidebarSectionComponent
                key={section.key}
                section={section}
                role={role}
                collapsedSections={collapsedSections}
                toggleSection={toggleSection}
                feedback={feedback}
                isActive={isActive}
              />
            ))
          )}
        </SidebarContent>
      </Sidebar>
    );
  } catch (error) {
    console.error('AppSidebar error:', error);
    // Fallback UI
    return (
      <div className="w-60 h-screen bg-sidebar border-r">
        <div className="p-4">
          <div className="text-sm text-muted-foreground">Loading sidebar...</div>
        </div>
      </div>
    );
  }
}