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

const navigation = {
  main: [
    { name: 'Dashboard', href: '/', icon: Icons.home },
    { name: 'Organizations', href: '/organizations', icon: Icons.building },
    { name: 'Users', href: '/users', icon: Icons.users },
    { name: 'Files', href: '/files', icon: Icons.fileText },
    { name: 'Analytics', href: '/analytics', icon: Icons.barChart },
  ],
  admin: [
    { name: 'Feedback', href: '/feedback', icon: Icons.mail },
    { name: 'Billing', href: '/billing', icon: Icons.creditCard },
    { name: 'API Keys', href: '/api-keys', icon: Icons.key },
    { name: 'Webhooks', href: '/webhooks', icon: Icons.webhook },
  ],
  superAdmin: [
    { name: 'System Settings', href: '/admin/settings', icon: Icons.settings },
    { name: 'Audit Logs', href: '/admin/audit', icon: Icons.shield },
    { name: 'Help Articles', href: '/admin/help', icon: Icons.helpCircle },
  ],
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

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.main.map((item) => (
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

        {/* Admin Navigation - Show for admin and super_admin */}
        {(role === 'admin' || role === 'super_admin') && (
          <SidebarGroup>
            <SidebarGroupLabel>Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigation.admin.map((item) => (
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

        {/* Super Admin Navigation - Show only for super_admin */}
        {role === 'super_admin' && (
          <SidebarGroup>
            <SidebarGroupLabel>System Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigation.superAdmin.map((item) => (
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

        {/* Support Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Support</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.support.map((item) => (
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