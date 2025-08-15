import * as React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

// Memoized main content wrapper to prevent unnecessary re-renders
const MainContent = React.memo(({ children }: { children: React.ReactNode }) => (
  <main 
    id="main-content"
    className="flex flex-1 flex-col gap-4 p-4 pt-0"
    role="main"
    aria-label="Main content"
    tabIndex={-1}
  >
    {children}
  </main>
));

MainContent.displayName = 'MainContent';

// Memoized sidebar inset to prevent unnecessary header re-renders
const SidebarInsetContent = React.memo(({ children }: { children: React.ReactNode }) => (
  <SidebarInset>
    <AppHeader />
    <MainContent>{children}</MainContent>
  </SidebarInset>
));

SidebarInsetContent.displayName = 'SidebarInsetContent';

export const AppLayout = React.memo(({ children }: AppLayoutProps) => {
  // Memoize sidebar provider props to prevent unnecessary re-renders
  const sidebarProviderProps = React.useMemo(() => ({
    defaultOpen: true
  }), []);

  return (
    <SidebarProvider {...sidebarProviderProps}>
      <AppSidebar />
      <SidebarInsetContent>{children}</SidebarInsetContent>
    </SidebarProvider>
  );
});

AppLayout.displayName = 'AppLayout';