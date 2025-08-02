import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
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

// Helper function to get items for each section based on role
const getSectionItems = (sectionKey: string, role: string) => {
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
        { name: 'Company Settings', href: '/company-settings', icon: Icons.settings },
        { name: 'Billing', href: '/billing', icon: Icons.creditCard },
        { name: 'Feature Marketplace', href: '/marketplace', icon: Icons.plus },
      ];
    
    case 'system-admin':
      return [
        { name: 'System Settings', href: '/admin/settings', icon: Icons.settings },
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

export function AppSidebar() {
  const { role } = useUserRole();
  const location = useLocation();
  const { collapsedSections, toggleSection } = useSidebarSectionState();

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const getNavClassName = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : '';

  // Render a collapsible section
  const renderSection = (section: SidebarSection) => {
    if (!section.isVisible(role)) return null;
    
    const items = getSectionItems(section.key, role);
    if (items.length === 0) return null;
    
    const isCollapsed = collapsedSections[section.key];
    const itemCount = items.length;
    const activeItems = items.filter(item => isActive(item.href));
    const hasActiveItem = activeItems.length > 0;

    return (
      <Collapsible 
        key={section.key} 
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
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton asChild isActive={isActive(item.href)}>
                      <NavLink to={item.href} className={getNavClassName}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="space-y-1">
        {sidebarSections.map(section => renderSection(section))}
      </SidebarContent>
    </Sidebar>
  );
}