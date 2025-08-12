import React, { useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Icons } from '@/components/ui/icons';

import { useOptimizedUserRole } from '@/hooks/database/useOptimizedUserRole';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useOrganizationFeatureConfigs } from '@/hooks/useOrganizationFeatureConfigs';
import { useFeatureNavigationSections } from '@/hooks/database/useOrganizationFeatures';
import { prefetchByPath } from '@/lib/route-prefetch';

// Types
interface SidebarItem {
  name: string;
  href: string;
  icon: any;
  badge?: number;
  requiresRole?: string;
}

interface SidebarSection {
  title: string;
  key: string;
  items: SidebarItem[];
  requiresRole?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

// Helper functions for section creation
const getSectionItems = (type: 'main' | 'management' | 'system-admin' | 'support', role: string) => {
  switch (type) {
    case 'main':
      return [
        { name: 'Dashboard', href: '/dashboard', icon: Icons.home },
      ];
    
    case 'management':
      const managementItems = [
        { name: 'Users', href: '/users', icon: Icons.users },
        { name: 'Feedback', href: '/feedback', icon: Icons.messageSquare },
      ];
      
      if (role === 'admin') {
        managementItems.push({ name: 'Manage Feedback', href: '/admin/feedback', icon: Icons.settings });
      }
      
      return managementItems;
    
    case 'system-admin':
      return role === 'super_admin' ? [
        { name: 'System Settings', href: '/settings/system', icon: Icons.settings },
      ] : [];
    
    case 'support':
      return [
        { name: 'Notifications', href: '/notifications', icon: Icons.bell },
        { name: 'Profile Settings', href: '/settings/profile', icon: Icons.user },
        { name: 'Company Settings', href: '/settings/company', icon: Icons.building, requiresRole: 'admin' },
      ];
    
    default:
      return [];
  }
};

// Create app sections for marketplace applications
const createAppSections = (installedApps: any[]) => {
  return installedApps
    .filter(app => app.status === 'enabled')
    .map(app => ({
      title: app.display_name || app.name,
      key: `app-${app.slug}`,
      items: app.navigation || [
        { name: 'Dashboard', href: `/apps/${app.slug}`, icon: Icons.home },
        { name: 'Settings', href: `/apps/${app.slug}/settings`, icon: Icons.settings, requiresRole: 'admin' }
      ],
      collapsible: true,
      defaultExpanded: false
    }));
};

// Create feature sections
const createFeatureSections = (featureNavigationSections: any[]) => {
  return featureNavigationSections.map(section => ({
    title: section.title,
    key: `feature-${section.title.toLowerCase().replace(/\s+/g, '-')}`,
    items: section.items,
    collapsible: true,
    defaultExpanded: true
  }));
};

// Base sidebar sections
const baseSidebarSections = (role: string): SidebarSection[] => [
  {
    title: 'Main',
    key: 'main',
    items: getSectionItems('main', role),
    collapsible: false,
    defaultExpanded: true
  },
  {
    title: 'Management',
    key: 'management',
    items: getSectionItems('management', role),
    collapsible: true,
    defaultExpanded: true
  },
  {
    title: 'System Administration',
    key: 'system-admin',
    items: getSectionItems('system-admin', role),
    collapsible: true,
    defaultExpanded: false,
    requiresRole: 'super_admin'
  },
  {
    title: 'Support',
    key: 'support',
    items: getSectionItems('support', role),
    collapsible: true,
    defaultExpanded: false
  }
];

// Get all sidebar sections
const getAllSidebarSections = (
  role: string,
  organizationFeatureConfigs: any[],
  featureNavigationSections: any[]
) => {
  const baseSections = baseSidebarSections(role).filter(section => {
    if (section.requiresRole) {
      return role === section.requiresRole;
    }
    return section.items.length > 0;
  });

  const featureSections = createFeatureSections(featureNavigationSections);

  // Insert feature sections after management
  const managementIndex = baseSections.findIndex(s => s.key === 'management');
  if (managementIndex >= 0) {
    baseSections.splice(managementIndex + 1, 0, ...featureSections);
  } else {
    baseSections.push(...featureSections);
  }

  return baseSections;
};

// Hook for managing section collapse state
const useSidebarSectionState = (sections: SidebarSection[]) => {
  const location = useLocation();

  const collapsedSections = useMemo(() => {
    const state: Record<string, boolean> = {};
    
    sections.forEach(section => {
      const storageKey = `sidebar-section-${section.key}`;
      const stored = localStorage.getItem(storageKey);
      const defaultState = !section.defaultExpanded;
      
      state[section.key] = stored !== null ? stored === 'true' : defaultState;

      // Auto-expand section if current route is within it
      const isCurrentSectionActive = section.items.some(item => 
        location.pathname === item.href || 
        (item.href !== '/' && item.href !== '/dashboard' && location.pathname.startsWith(item.href + '/'))
      );
      
      if (isCurrentSectionActive) {
        state[section.key] = false; // false means expanded
      }
    });
    
    return state;
  }, [sections, location.pathname]);

  const toggleSection = (sectionKey: string) => {
    const newState = !collapsedSections[sectionKey];
    const storageKey = `sidebar-section-${sectionKey}`;
    
    localStorage.setItem(storageKey, String(newState));
    
    // Force a re-render by updating a state value that affects the hook
    window.dispatchEvent(new CustomEvent('sidebar-toggle'));
  };

  return { collapsedSections, toggleSection };
};

// Enhanced NavigationItem component with precise active state detection
const NavigationItem = React.memo(({ 
  item, 
  feedbackCount
}: {
  item: { name: string; href: string; icon: any; badge?: number };
  feedbackCount: number;
}) => {
  const location = useLocation();
  const queryClient = useQueryClient();
  
  const handleHover = () => {
    prefetchByPath(item.href);
  };

  // Enhanced active state detection with hierarchical logic
  const isItemActive = useMemo(() => {
    const currentPath = location.pathname;
    
    // Exact match has highest priority
    if (item.href === currentPath) {
      return true;
    }

    // For feature routes, handle /features vs /apps prefix differences
    if (item.href.includes('/features/') || currentPath.includes('/features/')) {
      const normalizeFeaturePath = (path: string) => {
        return path.replace(/\/apps\/([^\/]+)/, '/features/$1');
      };
      
      const normalizedItemHref = normalizeFeaturePath(item.href);
      const normalizedCurrentPath = normalizeFeaturePath(currentPath);
      
      if (normalizedItemHref === normalizedCurrentPath) {
        return true;
      }
      
      // Only allow parent-child if this is the direct parent (not grandparent)
      if (normalizedCurrentPath.startsWith(normalizedItemHref + '/')) {
        const childPath = normalizedCurrentPath.replace(normalizedItemHref + '/', '');
        // Only active if there's exactly one more segment (direct child)
        return !childPath.includes('/');
      }
    }
    
    // Default parent-child logic for other routes (exclude dashboard from auto-expansion)
    if (currentPath.startsWith(item.href + '/') && item.href !== '/' && item.href !== '/dashboard') {
      const childPath = currentPath.replace(item.href + '/', '');
      // Only active if there's exactly one more segment (direct child)
      return !childPath.includes('/');
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
});

NavigationItem.displayName = 'NavigationItem';

// Memoized SidebarSection component
const SidebarSectionComponent = React.memo(({ 
  section, 
  role, 
  collapsedSections, 
  toggleSection, 
  feedback
}: {
  section: SidebarSection;
  role: string;
  collapsedSections: Record<string, boolean>;
  toggleSection: (key: string) => void;
  feedback: number;
}) => {
  const isCollapsed = collapsedSections[section.key];
  
  const filteredItems = section.items.filter(item => {
    if (item.requiresRole) {
      return role === item.requiresRole;
    }
    return true;
  });

  if (filteredItems.length === 0) {
    return null;
  }

  if (!section.collapsible) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {filteredItems.map((item) => (
              <NavigationItem
                key={item.href}
                item={item}
                feedbackCount={feedback}
              />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <Collapsible open={!isCollapsed} onOpenChange={() => toggleSection(section.key)}>
      <SidebarGroup>
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger className="flex w-full items-center justify-between">
            {section.title}
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <NavigationItem
                  key={item.href}
                  item={item}
                  feedbackCount={feedback}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
});

SidebarSectionComponent.displayName = 'SidebarSectionComponent';

// Main AppSidebar component
export function AppSidebar() {
  const { role } = useOptimizedUserRole();
  const dashboardData = useDashboardData();
  const organizationFeatureConfigs = useOrganizationFeatureConfigs();
  const featureNavigationSections = useFeatureNavigationSections();

  const allSections = useMemo(() => {
    if (!role || !organizationFeatureConfigs.configs) return [];
    
    console.log('🔍 AppSidebar: Building sections with role:', role);
    
    const sections = getAllSidebarSections(
      role, 
      organizationFeatureConfigs.configs, 
      featureNavigationSections
    );
    
    console.log('🔍 AppSidebar: Final sections:', sections.map(s => ({
      title: s.title,
      itemCount: s.items.length
    })));
    
    return sections;
  }, [role, organizationFeatureConfigs.configs, featureNavigationSections]);

  const { collapsedSections, toggleSection } = useSidebarSectionState(allSections);

  // Feedback count for badges
  const feedback = dashboardData?.feedback || 0;

  // Loading states
  const roleLoading = !role;
  const configsLoading = !organizationFeatureConfigs;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="space-y-1">
        {roleLoading || configsLoading ? (
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
            />
          ))
        )}
      </SidebarContent>
    </Sidebar>
  );
}