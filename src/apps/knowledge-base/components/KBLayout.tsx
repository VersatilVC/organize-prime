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
    console.log('🔍 KBLayout: Finding current page for pathname:', pathname);
    console.log('🔍 KBLayout: Available routes:', routes);
    
    // Handle exact matches first
    const exactMatch = routes.find(route => route.path === pathname);
    if (exactMatch) {
      console.log('🔍 KBLayout: Found exact match:', exactMatch);
      return exactMatch;
    }
    
    // Try to match by converting current path to expected route format
    for (const route of routes) {
      // Extract the route suffix (everything after knowledge-base)
      let routeSuffix = '';
      if (route.path.includes('/features/knowledge-base/')) {
        routeSuffix = route.path.split('/features/knowledge-base/')[1];
      } else if (route.path.includes('/apps/knowledge-base/')) {
        routeSuffix = route.path.split('/apps/knowledge-base/')[1];
      }
      
      // Check if current path ends with this suffix
      if (routeSuffix && pathname.endsWith('/' + routeSuffix)) {
        console.log('🔍 KBLayout: Found suffix match:', route);
        return route;
      }
    }
    
    console.log('🔍 KBLayout: No matching route found');
    return null;
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
      // Ensure the route is in the correct format for breadcrumb links
      let routePath = defaultPage.path;
      if (routePath.startsWith('/apps/knowledge-base/')) {
        routePath = routePath.replace('/apps/knowledge-base/', '/features/knowledge-base/');
      }
      return routePath;
    }
    return '/features/knowledge-base/manage-knowledgebases';
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