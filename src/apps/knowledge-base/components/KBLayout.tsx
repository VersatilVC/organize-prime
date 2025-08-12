import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { KBProvider } from '../context/KBContext';
import { useFeatureRoutes } from '@/hooks/useFeatureRoutes';

interface KBLayoutProps {
  children: React.ReactNode;
}

export function KBLayout({ children }: KBLayoutProps) {
  const { pathname } = useLocation();
  const { routes } = useFeatureRoutes('knowledge-base');

  // Find current page from routes for dynamic breadcrumbs
  const currentPage = React.useMemo(() => {
    const normalizedPath = pathname.replace('/features/knowledge-base/', '').replace('/apps/knowledge-base/', '');
    return routes.find(route => {
      const routePath = route.path.replace('/apps/knowledge-base/', '');
      return routePath === normalizedPath;
    });
  }, [pathname, routes]);

  // Get default page for navigation
  const defaultPage = React.useMemo(() => {
    return routes.find(route => route.isDefault) || routes[0];
  }, [routes]);

  const currentPageTitle = currentPage?.title || defaultPage?.title || 'Knowledge Base';

  // SEO: set document title
  React.useEffect(() => {
    document.title = `Knowledge Base - ${currentPageTitle}`;
  }, [currentPageTitle]);

  const getDefaultRoute = () => {
    if (defaultPage) {
      return defaultPage.path.replace('/apps/knowledge-base/', '/features/knowledge-base/');
    }
    return '/features/knowledge-base/knowledgebase-management';
  };

  return (
    <KBProvider>
      <div className="space-y-6">
        <div>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to={getDefaultRoute()}>Knowledge Base</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{currentPageTitle}</BreadcrumbPage>
              </BreadcrumbItem>
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