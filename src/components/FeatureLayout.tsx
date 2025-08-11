import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useFeatureContext } from '@/contexts/FeatureContext';
import { Icons } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeatureLayoutProps {
  children: React.ReactNode;
}

export function FeatureLayout({ children }: FeatureLayoutProps) {
  const { feature, userRole } = useFeatureContext();
  const location = useLocation();

  if (!feature) {
    return <div>Loading feature...</div>;
  }

  const FeatureIcon = Icons[feature.iconName as keyof typeof Icons] || Icons.package;
  
  // Get current path segment for active tab
  const pathSegments = location.pathname.split('/');
  const currentPage = pathSegments[pathSegments.length - 1] || 'dashboard';

  // Filter navigation based on user role
  const visibleNavigation = feature.navigation.filter(item => {
    if (!item.requiresRole) return true;
    if (item.requiresRole === 'admin') return userRole === 'admin' || userRole === 'super_admin';
    if (item.requiresRole === 'super_admin') return userRole === 'super_admin';
    return true;
  });

  return (
    <div className="flex flex-col space-y-6 p-6">
      {/* Header Section */}
      <div className="space-y-4">
        {/* Breadcrumb Navigation */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/features">Features</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{feature.displayName}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Feature Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FeatureIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{feature.displayName}</h1>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          </div>
          
          <Button variant="outline" asChild>
            <Link to="/features">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Features
            </Link>
          </Button>
        </div>

        {/* Feature Navigation Tabs */}
        <div className="border-b border-border">
          <nav className="flex space-x-8" aria-label="Tabs">
            {visibleNavigation.map((item) => {
              const ItemIcon = Icons[item.icon as keyof typeof Icons] || Icons.package;
              const tabValue = item.path.replace('/', '') || 'dashboard';
              const fullPath = `/features/${feature.slug}${item.path}`;
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
      </div>

      {/* Content Area */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}