import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { RouterGuard } from '@/components/RouterGuard';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { MobileNav } from './MobileNav';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <ErrorBoundary>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          {/* Desktop Sidebar - hidden on mobile */}
          <RouterGuard fallback={<div className="hidden md:block w-60 bg-sidebar border-r" />}>
            <div className="hidden md:block">
              <AppSidebar />
            </div>
          </RouterGuard>

          <div className="flex-1 flex flex-col min-w-0">
            {/* Header with mobile nav support */}
            <RouterGuard fallback={<div className="h-14 bg-background border-b" />}>
              <AppHeader />
            </RouterGuard>

            {/* Main content with proper scrolling */}
            <main className="flex-1 overflow-auto">
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </main>
          </div>
        </div>

        {/* Toast notifications */}
        <Toaster />
      </SidebarProvider>
    </ErrorBoundary>
  );
}