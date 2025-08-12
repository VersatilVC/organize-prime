import React from 'react';
import { KBProvider } from '../context/KBContext';
import { useFeatureRoutes } from '@/hooks/useFeatureRoutes';
import { useRouteHierarchy } from '@/hooks/useNavigationState';
import { FeatureBreadcrumbs } from '@/components/features/FeatureBreadcrumbs';

interface KBLayoutProps {
  children: React.ReactNode;
}

export function KBLayout({ children }: KBLayoutProps) {
  const { routes } = useFeatureRoutes('knowledge-base');
  const { activeRoute } = useRouteHierarchy(routes);

  React.useEffect(() => {
    if (activeRoute?.title) {
      document.title = `${activeRoute.title} - Knowledge Base`;
    } else {
      document.title = 'Knowledge Base';
    }
  }, [activeRoute]);

  return (
    <KBProvider>
      <div className="space-y-6">
        <div>
          <FeatureBreadcrumbs
            featureSlug="knowledge-base"
            featureLabel="Knowledge Base"
            routes={routes}
          />
        </div>
        <main className="space-y-6">
          {children}
        </main>
      </div>
    </KBProvider>
  );
}