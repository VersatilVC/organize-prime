import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { RouterGuard } from '@/components/RouterGuard';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <RouterGuard fallback={<div className="w-60 bg-background border-r" />}>
          <AppSidebar />
        </RouterGuard>
        <div className="flex-1 flex flex-col">
          <RouterGuard fallback={<div className="h-14 bg-background border-b" />}>
            <AppHeader />
          </RouterGuard>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}