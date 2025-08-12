import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { KBProvider } from '../context/KBContext';
import { useFeatureRoutes } from '@/hooks/useFeatureRoutes';
import { useRouteHierarchy } from '@/hooks/useNavigationState';

interface KBLayoutProps {
  children: React.ReactNode;
}

export function KBLayout({ children }: KBLayoutProps) {
  const location = useLocation();
  const { routes } = useFeatureRoutes('knowledge-base');

  // Simple route matching for KB pages
  const currentRoute = React.useMemo(() => {
    if (!routes.length) return null;
    
    const path = location.pathname;
    if (path.includes('/chat')) {
      return routes.find(r => r.title === 'AI Chat') || null;
    }
    if (path.includes('/manage-knowledgebases') || path === '/features/knowledge-base') {
      return routes.find(r => r.title === 'Manage Knowledgebases') || null;
    }
    
    return routes.find(r => r.isDefault) || routes[0] || null;
  }, [routes, location.pathname]);

  const defaultPage = React.useMemo(() => {
    return routes.find(route => route.isDefault) || routes[0];
  }, [routes]);

  React.useEffect(() => {
    if (currentRoute) {
      document.title = `${currentRoute.title} - Knowledge Base`;
    }
  }, [currentRoute]);

  return (
    <KBProvider>
      <div className="space-y-6">
        <div>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/features/knowledge-base">Knowledge Base</BreadcrumbLink>
              </BreadcrumbItem>
              {currentRoute && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{currentRoute.title}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <main className="space-y-6">
          {children}
        </main>
      </div>
    </KBProvider>
  );
}