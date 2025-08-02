import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { useDashboardData } from '@/hooks/useDashboardData';
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

// Define sidebar sections with their navigation items
interface SidebarSection {
  key: string;
  title: string;
  items: Array<{
    name: string;
    href: string;
    icon: any;
  }>;
  isVisible: (role: string) => boolean;
}

// Memoized helper function to get items for each section based on role
const getSectionItems = useMemo(() => (sectionKey: string, role: string) => {
  switch (sectionKey) {
    case 'main':
      const mainItems = [{ name: 'Dashboard', href: '/', icon: Icons.home }];
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
        { name: 'Feature Marketplace', href: '/marketplace', icon: Icons.plus },
      ];
    
    case 'system-admin':
      return [
        { name: 'System Settings', href: '/settings/system', icon: Icons.settings },
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
}, []);

const sidebarSections: SidebarSection[] = [
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

// Hook for managing sidebar section states
function useSidebarSectionState() {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const location = useLocation();

  // Load initial state from localStorage
  useEffect(() => {
    const savedStates: Record<string, boolean> = {};
    sidebarSections.forEach(section => {
      const saved = localStorage.getItem(`sidebar_section_${section.key}_collapsed`);
      savedStates[section.key] = saved === 'true';
    });
    setCollapsedSections(savedStates);
  }, []);

  // Auto-expand section if user navigates to a page within collapsed section
  useEffect(() => {
    sidebarSections.forEach(section => {
      const hasActiveItem = section.items.some(item => {
        if (item.href === '/') {
          return location.pathname === '/';
        }
        return location.pathname.startsWith(item.href);
      });

      if (hasActiveItem && collapsedSections[section.key]) {
        toggleSection(section.key);
      }
    });
  }, [location.pathname]);

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
  item: { name: string; href: string; icon: any };
  isActive: boolean;
  feedbackCount: number;
}) => (
  <SidebarMenuItem>
    <SidebarMenuButton asChild isActive={isActive}>
      <NavLink 
        to={item.href} 
        className={isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}
      >
        <item.icon className="h-4 w-4" />
        <span>{item.name}</span>
        {(item.href === '/admin/feedback' || item.href === '/feedback/manage') && feedbackCount > 0 && (
          <Badge variant="destructive" className="ml-auto h-5 px-1.5 text-xs">
            {feedbackCount}
          </Badge>
        )}
      </NavLink>
    </SidebarMenuButton>
  </SidebarMenuItem>
), (prevProps, nextProps) => {
  return (
    prevProps.isActive === nextProps.isActive &&
    prevProps.feedbackCount === nextProps.feedbackCount
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
  
  const items = getSectionItems(section.key, role);
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
            <span>
              {section.title}
              {isCollapsed && ` (${itemCount})`}
            </span>
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
  const { role, loading: roleLoading } = useUserRole();
  const { feedback } = useDashboardData();
  const location = useLocation();
  const { collapsedSections, toggleSection } = useSidebarSectionState();

  // Memoized isActive function to prevent recreation on every render
  const isActive = useCallback((path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  // Memoized visible sections to prevent filtering on every render
  const visibleSections = useMemo(() => {
    return sidebarSections.filter(section => section.isVisible(role));
  }, [role]);

  return (
    <Sidebar collapsible="icon">
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
          visibleSections.map(section => (
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
}