import React from 'react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useRouteHierarchy } from '@/hooks/useNavigationState';
import { NavigationRoute } from '@/lib/navigation-service';

interface FeatureBreadcrumbsProps {
  featureSlug: string;
  featureLabel?: string;
  routes: NavigationRoute[];
  featureRootPath?: string;
}

export function FeatureBreadcrumbs({
  featureSlug,
  featureLabel = 'Feature',
  routes,
  featureRootPath
}: FeatureBreadcrumbsProps) {
  const { activeRoute } = useRouteHierarchy(routes);
  const rootPath = featureRootPath ?? `/features/${featureSlug}`;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href={rootPath}>{featureLabel}</BreadcrumbLink>
        </BreadcrumbItem>
        {activeRoute?.title && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{activeRoute.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
