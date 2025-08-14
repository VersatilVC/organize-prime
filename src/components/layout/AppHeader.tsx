import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Icons } from '@/components/ui/icons';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { NotificationBell } from '@/components/NotificationBell';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { useAvatarCache } from '@/hooks/useImageCache';
import { AdvancedSearchDialog } from '@/components/search/AdvancedSearchDialog';
import { Search } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { MobileNavTrigger } from './MobileNav';
import { OrganizationSwitcher } from '../OrganizationSwitcher';

export function AppHeader() {
  const { user, signOut } = useAuth();
  const { role } = useUserRole();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch current user profile for avatar and display name
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch system settings for app branding
  const { data: systemSettings } = useQuery({
    queryKey: ['system-settings-branding'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['app_name', 'app_logo_url']);
      
      if (error) throw error;
      
      const settings: Record<string, any> = {};
      data?.forEach(setting => {
        settings[setting.key] = setting.value;
      });
      
      return {
        app_name: settings.app_name || 'SaaS Platform',
        app_logo_url: settings.app_logo_url || null
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement global search
    console.log('Searching for:', searchQuery);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'destructive';
      case 'admin':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      default:
        return 'User';
    }
  };

  const { src: avatarSrc } = useAvatarCache(profile?.avatar_url || undefined);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          {/* Mobile nav trigger for small screens */}
          <MobileNavTrigger className="md:hidden" />
          
          {/* Desktop sidebar trigger */}
          <SidebarTrigger className="hidden md:flex" />
          
          <button onClick={() => window.location.href = '/'} className="flex items-center space-x-2">
            {systemSettings?.app_logo_url ? (
              <OptimizedImage
                src={systemSettings.app_logo_url}
                alt="App logo"
                className="h-6 w-6"
                aspectRatio="square"
                sizes="24px"
                priority
                showSkeleton={false}
              />
            ) : (
              <Icons.building className="h-6 w-6" />
            )}
            <span className="hidden font-bold sm:inline-block">
              {systemSettings?.app_name || 'SaaS Platform'}
            </span>
          </button>
          
          {/* Organization switcher */}
          <OrganizationSwitcher />
        </div>

        <div className="flex flex-1 items-center justify-center px-4">
          {/* Replaced with Advanced Search Dialog */}
        </div>

        <div className="flex items-center gap-2">
          {/* Advanced Search */}
          <AdvancedSearchDialog>
            <Button variant="outline" size="sm" className="hidden sm:flex">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button variant="outline" size="sm" className="sm:hidden">
              <Search className="h-4 w-4" />
            </Button>
          </AdvancedSearchDialog>
          
          {/* Theme Toggle */}
          <ThemeToggle />
          
          {/* Notifications */}
          <NotificationBell />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={avatarSrc || undefined} alt={profile?.full_name || user?.email} />
                  <AvatarFallback>
                    {profile?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {profile?.full_name || user?.email}
                  </p>
                  {profile?.full_name && (
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  )}
                  <Badge variant={getRoleBadgeVariant(role)} className="w-fit">
                    {getRoleDisplayName(role)}
                  </Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.location.href = '/settings/profile'}>
                <Icons.settings className="mr-2 h-4 w-4" />
                Profile Settings
              </DropdownMenuItem>
              {role === 'super_admin' && (
                <DropdownMenuItem onClick={() => window.location.href = '/admin'}>
                  <Icons.shield className="mr-2 h-4 w-4" />
                  System Admin
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <Icons.logOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}