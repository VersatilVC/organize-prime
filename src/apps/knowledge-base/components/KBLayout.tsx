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
  const { pathname } = useLocation();
  const { routes } = useFeatureRoutes('knowledge-base');
  const { activeRoute } = useRouteHierarchy(routes);

  // Use the centralized navigation system for route matching
  const currentPage = React.useMemo(() => {
    console.log('🔍 KBLayout: Finding current page for pathname:', pathname);
    console.log('🔍 KBLayout: Available routes:', routes);
    
    // Find the best matching route for current pathname
    const matchingRoute = routes.find(route => {
      // Check exact match first
      if (route.path === pathname) return true;
      
      // Check if current path ends with the route's path (for normalized routes)
      const routeSuffix = route.path.replace('/features/knowledge-base', '');
      return pathname.endsWith(routeSuffix) || pathname.includes(routeSuffix);
    });
    
    console.log('🔍 KBLayout: Matching route:', matchingRoute);
    return matchingRoute;
  }, [pathname, routes]);

  // Get default page for navigation
  const defaultPage = React.useMemo(() => {
    return routes.find(route => route.isDefault) || routes[0];
  }, [routes]);

  const currentPageTitle = currentPage?.title || 'Knowledge Base';

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