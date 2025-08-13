import React from 'react';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';

interface FastAppLayoutProps {
  children?: React.ReactNode;
  showSkeleton?: boolean;
}

// Optimized layout for faster loading with optional skeleton state
export function FastAppLayout({ children, showSkeleton = false }: FastAppLayoutProps) {
  if (showSkeleton || !children) {
    return (
      <div className="flex h-screen bg-background">
        <aside className="w-64 border-r bg-background">
          <div className="p-4 space-y-4">
            <Skeleton className="h-8 w-32" />
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          </div>
        </aside>
        <div className="flex-1 flex flex-col">
          <header className="border-b bg-background p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </header>
          <main className="flex-1 p-6">
            <div className="space-y-4">
              <Skeleton className="h-8 w-64" />
              <div className="grid gap-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 p-6 pt-0">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}