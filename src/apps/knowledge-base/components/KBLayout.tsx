import React from 'react';
import { useLocation } from 'react-router-dom';
import { KBProvider } from '../context/KBContext';
import { useFeatureRoutes } from '@/hooks/useFeatureRoutes';
import { useRouteHierarchy } from '@/hooks/useNavigationState';
import { FeatureBreadcrumbs } from '@/components/features/FeatureBreadcrumbs';

interface KBLayoutProps {
  children: React.ReactNode;
}

export function KBLayout({ children }: KBLayoutProps) {
  const { routes } = useFeatureRoutes('knowledge-base');
  const { activeRoute, breadcrumbs } = useRouteHierarchy(routes);
  const location = useLocation();

  // Check if we're on the chat page
  const isChatPage = location.pathname.includes('/chat');

  React.useEffect(() => {
    const pageLabel = activeRoute?.title ?? breadcrumbs[breadcrumbs.length - 1]?.label;
    if (pageLabel) {
      document.title = `${pageLabel} - Knowledge Base`;
    } else {
      document.title = 'Knowledge Base';
    }
  }, [activeRoute, breadcrumbs]);

  // For chat pages, render without the standard layout constraints
  if (isChatPage) {
    return (
      <KBProvider>
        <div className="h-full">
          {children}
        </div>
      </KBProvider>
    );
  }

  // Standard layout for other pages
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