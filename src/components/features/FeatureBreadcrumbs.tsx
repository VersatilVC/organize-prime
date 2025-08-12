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
  const { activeRoute, breadcrumbs } = useRouteHierarchy(routes);
  const rootPath = featureRootPath ?? `/features/${featureSlug}`;
  const pageLabel = activeRoute?.title ?? breadcrumbs[breadcrumbs.length - 1]?.label;
  const showPage = !!pageLabel && pageLabel !== featureLabel;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href={rootPath}>{featureLabel}</BreadcrumbLink>
        </BreadcrumbItem>
        {showPage && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{pageLabel}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
