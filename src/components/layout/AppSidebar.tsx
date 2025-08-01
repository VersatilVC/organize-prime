import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Icons } from '@/components/ui/icons';

// Define navigation items with role permissions
const navigationItems = {
  // Super Admin only
  superAdminMain: [
    { name: 'Organizations', href: '/organizations', icon: Icons.building },
  ],
  
  // Super Admin + Company Admin
  adminMain: [
    { name: 'Users', href: '/users', icon: Icons.users },
    { name: 'Files', href: '/files', icon: Icons.fileText },
    { name: 'Analytics', href: '/analytics', icon: Icons.barChart },
  ],
  
  // All users
  commonMain: [
    { name: 'Dashboard', href: '/', icon: Icons.home },
  ],
  
  // User-specific main (only files for regular users)
  userMain: [
    { name: 'Files', href: '/files', icon: Icons.fileText },
  ],
  
  // Super Admin + Company Admin management
  adminManagement: [
    { name: 'Feedback', href: '/feedback', icon: Icons.mail },
    { name: 'Billing', href: '/billing', icon: Icons.creditCard },
    { name: 'API Keys', href: '/api-keys', icon: Icons.key },
    { name: 'Webhooks', href: '/webhooks', icon: Icons.webhook },
  ],
  
  // Super Admin only system admin
  superAdminSystem: [
    { name: 'System Settings', href: '/admin/settings', icon: Icons.settings },
    { name: 'Audit Logs', href: '/admin/audit', icon: Icons.shield },
    { name: 'Help Articles', href: '/admin/help', icon: Icons.helpCircle },
  ],
  
  // All users support
  support: [
    { name: 'Help Center', href: '/help', icon: Icons.helpCircle },
    { name: 'Settings', href: '/settings', icon: Icons.settings },
  ],
};

export function AppSidebar() {
  const { role } = useUserRole();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const getNavClassName = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : '';

  // Helper function to get main navigation items based on role
  const getMainNavigationItems = () => {
    const items = [...navigationItems.commonMain]; // Dashboard for everyone
    
    if (role === 'super_admin') {
      // Super admin sees everything
      items.push(...navigationItems.superAdminMain, ...navigationItems.adminMain);
    } else if (role === 'admin') {
      // Company admin sees admin main items but NOT organizations
      items.push(...navigationItems.adminMain);
    } else {
      // Regular users only see files (in addition to dashboard)
      items.push(...navigationItems.userMain);
    }
    
    return items;
  };

  const mainItems = getMainNavigationItems();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
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
        </SidebarGroup>

        {/* Management Navigation - Show only for admin and super_admin */}
        {(role === 'admin' || role === 'super_admin') && (
          <SidebarGroup>
            <SidebarGroupLabel>Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigationItems.adminManagement.map((item) => (
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
          </SidebarGroup>
        )}

        {/* System Admin Navigation - Show ONLY for super_admin */}
        {role === 'super_admin' && (
          <SidebarGroup>
            <SidebarGroupLabel>System Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigationItems.superAdminSystem.map((item) => (
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
          </SidebarGroup>
        )}

        {/* Support Navigation - Show for everyone */}
        <SidebarGroup>
          <SidebarGroupLabel>Support</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.support.map((item) => (
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
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}