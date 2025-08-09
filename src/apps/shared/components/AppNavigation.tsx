import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NavigationItem } from '../types/AppTypes';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { prefetchByPath } from '@/lib/route-prefetch';
import { useQueryClient } from '@tanstack/react-query';
import { prefetchQueriesByPath } from '@/lib/query-prefetch';
import { Icons } from '@/components/ui/icons';

export interface AppNavigationProps {
  appId: string;
  orientation?: 'vertical' | 'horizontal';
  showIcons?: boolean;
  collapsible?: boolean;
  className?: string;
}

export function AppNavigation({
  appId,
  orientation = 'vertical',
  showIcons = true,
  collapsible = true,
  className,
}: AppNavigationProps) {
  const { navigationItems, activeItem } = useAppNavigation({ appId });
const location = useLocation();
  const queryClient = useQueryClient();

  // Render navigation item
  const renderNavItem = (item: NavigationItem, level: number = 0) => {
    const isActive = activeItem?.id === item.id;
    const hasChildren = item.children && item.children.length > 0;
    const isParentActive = item.children?.some(child => 
      location.pathname.startsWith(child.path)
    );

    const [isOpen, setIsOpen] = React.useState(isParentActive || isActive);

    const itemContent = (
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          isActive && "bg-accent text-accent-foreground font-medium",
          level > 0 && "ml-4"
        )}
      >
{showIcons && item.icon && (() => {
          const IconCmp = Icons[item.icon as keyof typeof Icons];
          return IconCmp ? (
            <IconCmp className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Icons.package className="h-4 w-4" aria-hidden="true" />
          );
        })()}
        <span className="flex-1">{item.label}</span>
        {hasChildren && collapsible && (
          <button
            onClick={(e) => {
              e.preventDefault();
              setIsOpen(!isOpen);
            }}
            className="p-0.5 hover:bg-background rounded-sm"
          >
            {isOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        )}
      </div>
    );

    const navElement = item.path ? (
      <Link key={item.id} to={item.path} className="block" onMouseEnter={() => { prefetchByPath(item.path!); prefetchQueriesByPath(item.path!, queryClient); }}>
        {itemContent}
      </Link>
    ) : (
      <div key={item.id}>
        {itemContent}
      </div>
    );

    if (hasChildren) {
      return (
        <div key={item.id}>
          {navElement}
          {collapsible ? (
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
              <CollapsibleContent className="space-y-1">
                {item.children!.map(child => renderNavItem(child, level + 1))}
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <div className="space-y-1">
              {item.children!.map(child => renderNavItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return navElement;
  };

  if (navigationItems.length === 0) {
    return null;
  }

  if (orientation === 'horizontal') {
    return (
      <nav className={cn("flex items-center gap-2", className)}>
        {navigationItems.map(item => (
          <Button
            key={item.id}
            variant={activeItem?.id === item.id ? "default" : "ghost"}
            size="sm"
            asChild={!!item.path}
          >
            {item.path ? (
              <Link to={item.path} className="flex items-center gap-2" onMouseEnter={() => { prefetchByPath(item.path!); prefetchQueriesByPath(item.path!, queryClient); }}>
{showIcons && item.icon && (() => {
                  const IconCmp = Icons[item.icon as keyof typeof Icons];
                  return IconCmp ? (
                    <IconCmp className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Icons.package className="h-4 w-4" aria-hidden="true" />
                  );
                })()}
                {item.label}
              </Link>
            ) : (
              <span className="flex items-center gap-2">
{showIcons && item.icon && (() => {
                  const IconCmp = Icons[item.icon as keyof typeof Icons];
                  return IconCmp ? (
                    <IconCmp className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Icons.package className="h-4 w-4" aria-hidden="true" />
                  );
                })()}
                {item.label}
              </span>
            )}
          </Button>
        ))}
      </nav>
    );
  }

  return (
    <ScrollArea className={cn("h-full", className)}>
      <nav className="space-y-1 p-2">
        {navigationItems.map(item => renderNavItem(item))}
      </nav>
    </ScrollArea>
  );
}

// Simplified navigation for sidebars
export function AppSidebarNavigation({ appId, className }: { appId: string; className?: string }) {
  return (
    <AppNavigation
      appId={appId}
      orientation="vertical"
      showIcons={true}
      collapsible={true}
      className={className}
    />
  );
}

// Simplified navigation for top bars
export function AppTopNavigation({ appId, className }: { appId: string; className?: string }) {
  return (
    <AppNavigation
      appId={appId}
      orientation="horizontal"
      showIcons={false}
      collapsible={false}
      className={className}
    />
  );
}

// Breadcrumb-style navigation
export function AppBreadcrumbNavigation({ appId }: { appId: string }) {
  const { breadcrumbs } = useAppNavigation({ appId });

  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground">
      {breadcrumbs.map((crumb, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span>/</span>}
          {crumb.path ? (
            <Link
              to={crumb.path}
              className="hover:text-foreground transition-colors"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{crumb.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}