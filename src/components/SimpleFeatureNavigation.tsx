import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSimpleFeatureContext } from '@/contexts/SimpleFeatureContext';
import { Icons } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

export function SimpleFeatureNavigation() {
  const { slug, navigation, config } = useSimpleFeatureContext();
  const location = useLocation();

  if (!navigation || navigation.length === 0) {
    return null;
  }

  // Get current path segment for active tab
  const pathSegments = location.pathname.split('/');
  const currentPage = pathSegments[pathSegments.length - 1] || 'dashboard';

  return (
    <div className="border-b border-border mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {config?.icon_name && (
            <div className="p-2 rounded-lg bg-primary/10">
              {React.createElement(Icons[config.icon_name as keyof typeof Icons] || Icons.package, {
                className: "h-6 w-6 text-primary"
              })}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{config?.display_name || slug}</h1>
            {config?.description && (
              <p className="text-muted-foreground">{config.description}</p>
            )}
          </div>
        </div>
      </div>

      <nav className="flex space-x-8" aria-label="Feature tabs">
        {navigation.map((item: any) => {
          const ItemIcon = Icons[item.icon as keyof typeof Icons] || Icons.package;
          const tabValue = item.path.replace('/', '') || 'dashboard';
          const fullPath = `/features/${slug}${item.path}`;
          const isActive = currentPage === tabValue;
          
          return (
            <Link
              key={item.path}
              to={fullPath}
              className={cn(
                "flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"
              )}
            >
              <ItemIcon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}