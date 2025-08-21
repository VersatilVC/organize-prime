import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Icons } from '@/components/ui/icons';

import { useOptimizedUserRole } from '@/hooks/database/useOptimizedUserRole';
import { useOptimizedDashboard } from '@/hooks/useOptimizedDashboard';
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
        { name: 'Users', href: '/users', icon: Icons.users, requiresRole: 'admin' },
        { name: 'Send Feedback', href: '/feedback', icon: Icons.messageSquare },
      ];
      
      if (role === 'admin' || role === 'super_admin') {
        managementItems.push({ name: 'Manage Feedback', href: '/admin/feedback', icon: Icons.settings });
      }
      
      return managementItems;
    
    case 'system-admin':
      return role === 'super_admin' ? [
        { name: 'Organizations', href: '/organizations', icon: Icons.building },
        { name: 'Webhook Management', href: '/admin/webhooks', icon: Icons.webhook },
        { name: 'System Settings', href: '/settings/system', icon: Icons.settings },
      ] : [];
    
    case 'support':
      return [
        { name: 'Notifications', href: '/notifications', icon: Icons.bell },
        { name: 'Profile Settings', href: '/settings/profile', icon: Icons.user },
        { name: 'Company Settings', href: '/settings/company', icon: Icons.building, requiresRole: 'admin' },
        { name: 'Help Center', href: '/help', icon: Icons.helpCircle },
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
  return featureNavigationSections.map(section => {
    // Filter out invalid items but allow all valid knowledge base routes
    const filteredItems = Array.isArray(section.items)
      ? section.items.filter((item: any) => {
          if (typeof item?.href !== 'string') return false;
          // Allow all properly formatted routes
          return true;
        })
      : [];

    return {
      title: section.title,
      key: `feature-${section.title.toLowerCase().replace(/\s+/g, '-')}`,
      items: filteredItems,
      collapsible: true,
      defaultExpanded: true
    };
  });
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
  const roleRank: Record<string, number> = { user: 1, admin: 2, super_admin: 3 };
  const baseSections = baseSidebarSections(role).filter(section => {
    if (section.requiresRole) {
      const required = roleRank[section.requiresRole] ?? 1;
      const actual = roleRank[role] ?? 1;
      return actual >= required;
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
  // Memoize sections keys to prevent unnecessary recalculations
  const sectionKeys = React.useMemo(() => 
    sections.map(s => s.key).join(','), 
    [sections]
  );

  // Initialize state from localStorage and sections
  const initializeState = React.useCallback(() => {
    const state: Record<string, boolean> = {};
    const currentPath = window.location.pathname;
    
    sections.forEach(section => {
      const storageKey = `sidebar-section-${section.key}`;
      const stored = localStorage.getItem(storageKey);
      const defaultState = !section.defaultExpanded;
      
      state[section.key] = stored !== null ? stored === 'true' : defaultState;

      // Auto-expand section if current route is within it
      const isCurrentSectionActive = section.items.some(item => 
        currentPath === item.href || 
        (item.href !== '/' && item.href !== '/dashboard' && currentPath.startsWith(item.href + '/'))
      );
      
      if (isCurrentSectionActive) {
        state[section.key] = false; // false means expanded
      }
    });
    
    return state;
  }, [sectionKeys]); // Use stable sectionKeys instead of sections

  const [collapsedSections, setCollapsedSections] = React.useState(() => initializeState());

  // Update state when sections keys change (only when sections actually change)
  React.useEffect(() => {
    setCollapsedSections(initializeState());
  }, [sectionKeys]); // Use sectionKeys instead of initializeState

  // Listen for custom toggle events
  React.useEffect(() => {
    const handleToggle = () => {
      setCollapsedSections(initializeState());
    };

    window.addEventListener('sidebar-toggle', handleToggle);
    return () => window.removeEventListener('sidebar-toggle', handleToggle);
  }, [sectionKeys]); // Use sectionKeys instead of initializeState

  const toggleSection = React.useCallback((sectionKey: string) => {
    setCollapsedSections(prev => {
      const newState = !prev[sectionKey];
      const storageKey = `sidebar-section-${sectionKey}`;
      
      localStorage.setItem(storageKey, String(newState));
      
      return {
        ...prev,
        [sectionKey]: newState
      };
    });
  }, []);

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
  const handleHover = () => {
    prefetchByPath(item.href);
  };

  const handleClick = () => {
    window.location.href = item.href;
  };

  // Enhanced active state detection with hierarchical logic
  const isItemActive = React.useMemo(() => {
    const currentPath = window.location.pathname;
    
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
  }, [item.href]);

  // Get the correct icon component, fallback to package if not found
  const IconComponent = typeof item.icon === 'string' ? Icons[item.icon as keyof typeof Icons] || Icons.package : item.icon;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton 
        onClick={handleClick}
        isActive={isItemActive}
        onMouseEnter={handleHover}
        aria-label={`Navigate to ${item.name}${isItemActive ? ' (current page)' : ''}`}
        aria-current={isItemActive ? 'page' : undefined}
        title={`Navigate to ${item.name}`}
        className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        <IconComponent className="h-4 w-4" aria-hidden="true" />
        <span>{item.name}</span>
        {/* Show feature-specific badge if available */}
        {item.badge && item.badge > 0 && (
          <Badge 
            variant={item.badge > 10 ? "destructive" : "secondary"} 
            className="ml-auto h-5 px-1.5 text-xs"
            aria-label={`${item.badge} notifications`}
          >
            {item.badge}
          </Badge>
        )}
        {/* Show feedback count badge for feedback-related items */}
        {(item.href === '/admin/feedback' || item.href === '/feedback/manage') && feedbackCount > 0 && (
          <Badge 
            variant="destructive" 
            className="ml-auto h-5 px-1.5 text-xs"
            aria-label={`${feedbackCount} unread feedback items`}
          >
            {feedbackCount}
          </Badge>
        )}
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
  
  const roleRank: Record<string, number> = { user: 1, admin: 2, super_admin: 3 };
  const filteredItems = section.items.filter(item => {
    if (!item.requiresRole) return true;
    const required = roleRank[item.requiresRole] ?? 1;
    const actual = roleRank[role] ?? 1;
    return actual >= required;
  });

  if (filteredItems.length === 0) {
    return null;
  }

  if (!section.collapsible) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel 
          id={`sidebar-label-${section.key}`}
        >
          {section.title}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu 
            role="group"
            aria-labelledby={`sidebar-label-${section.key}`}
          >
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
          <CollapsibleTrigger 
            className="flex w-full items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm"
            aria-expanded={!isCollapsed}
            aria-controls={`sidebar-section-${section.key}`}
            aria-label={`Toggle ${section.title} section`}
          >
            {section.title}
            {isCollapsed ? 
              <ChevronRight className="h-4 w-4" aria-hidden="true" /> : 
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            }
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu 
              id={`sidebar-section-${section.key}`}
              role="group"
              aria-labelledby={`sidebar-label-${section.key}`}
            >
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
  // Only load the essential role data immediately
  const { role, loading: roleLoading } = useOptimizedUserRole();
  
  // Load heavy data lazily after role is available
  const dashboardData = useOptimizedDashboard();
  const organizationFeatureConfigs = useOrganizationFeatureConfigs();
  const featureNavigationSections = useFeatureNavigationSections();

  // Render basic navigation immediately, even while feature data loads
  const baseSections = React.useMemo(() => {
    if (roleLoading || !role) return [];
    
    // Return basic sections immediately without waiting for features
    return baseSidebarSections(role).filter(section => {
      if (section.requiresRole) {
        const roleRank: Record<string, number> = { user: 1, admin: 2, super_admin: 3 };
        const required = roleRank[section.requiresRole] ?? 1;
        const actual = roleRank[role] ?? 1;
        return actual >= required;
      }
      return section.items.length > 0;
    });
  }, [role, roleLoading]);

  // Add feature sections when they're loaded (non-blocking)
  const allSections = React.useMemo(() => {
    if (roleLoading || !role) return [];
    
    // Start with base sections
    let sections = [...baseSections];
    
    // Only add feature sections if they're loaded
    if (organizationFeatureConfigs?.configs && featureNavigationSections) {
      const featureSections = createFeatureSections(featureNavigationSections);
      
      // Insert feature sections after management
      const managementIndex = sections.findIndex(s => s.key === 'management');
      if (managementIndex >= 0) {
        sections.splice(managementIndex + 1, 0, ...featureSections);
      } else {
        sections.push(...featureSections);
      }
    }
    
    return sections;
  }, [baseSections, organizationFeatureConfigs?.configs, featureNavigationSections]);

  const { collapsedSections, toggleSection } = useSidebarSectionState(allSections);

  // Feedback count for badges (non-blocking)
  const feedback = dashboardData?.stats?.totalFeedback || 0;

  return (
    <Sidebar 
      collapsible="icon"
      role="navigation"
      aria-label="Main navigation sidebar"
    >
      <SidebarContent className="space-y-1">
        {roleLoading ? (
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