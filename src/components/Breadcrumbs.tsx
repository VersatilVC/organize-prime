import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

const routeLabels: Record<string, string> = {
  '/': 'Dashboard',
  '/users': 'Users',
  '/settings': 'Settings',
  '/settings/profile': 'Profile Settings',
  '/settings/company': 'Company Settings',
  '/settings/system': 'System Settings',
  '/feedback': 'Feedback',
  '/feedback/my': 'My Feedback',
  '/admin/feedback': 'Manage Feedback',
  '/notifications': 'Notifications',
  '/billing': 'Billing',
  '/marketplace': 'Feature Marketplace',
  '/organizations': 'Organizations',
  '/invite-acceptance': 'Accept Invitation',
};

export const Breadcrumbs = ({ className }: { className?: string }) => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', href: '/' }
  ];

  let currentPath = '';
  pathnames.forEach((pathname, index) => {
    currentPath += `/${pathname}`;
    const isLast = index === pathnames.length - 1;
    
    breadcrumbs.push({
      label: routeLabels[currentPath] || pathname.charAt(0).toUpperCase() + pathname.slice(1),
      href: isLast ? undefined : currentPath,
      current: isLast
    });
  });

  // Don't show breadcrumbs for single-level paths
  if (breadcrumbs.length <= 2 && location.pathname === '/') return null;

  return (
    <nav 
      aria-label="Breadcrumb" 
      className={cn("flex items-center space-x-1 text-sm text-muted-foreground mb-6", className)}
    >
      <ol className="flex items-center space-x-1" role="list">
        {breadcrumbs.map((item, index) => (
          <li key={item.label} className="flex items-center">
            {index > 0 && (
              <ChevronRight 
                className="h-4 w-4 mx-1 flex-shrink-0" 
                aria-hidden="true" 
              />
            )}
            {item.href ? (
              <Link 
                to={item.href} 
                className={cn(
                  "hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm px-1",
                  "flex items-center gap-1"
                )}
                aria-current={item.current ? 'page' : undefined}
              >
                {index === 0 ? (
                  <>
                    <Home className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">Home</span>
                  </>
                ) : (
                  item.label
                )}
              </Link>
            ) : (
              <span 
                className={cn(
                  "font-medium px-1", 
                  item.current && "text-foreground"
                )}
                aria-current={item.current ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

// Compact breadcrumbs for mobile
export const CompactBreadcrumbs = ({ className }: { className?: string }) => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);
  
  if (pathnames.length === 0) return null;
  
  const currentPage = routeLabels[location.pathname] || 
    pathnames[pathnames.length - 1].charAt(0).toUpperCase() + 
    pathnames[pathnames.length - 1].slice(1);

  return (
    <nav 
      aria-label="Breadcrumb" 
      className={cn("flex items-center text-sm text-muted-foreground", className)}
    >
      <Link 
        to="/" 
        className="hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm p-1"
        aria-label="Go to dashboard"
      >
        <Home className="h-4 w-4" />
      </Link>
      <ChevronRight className="h-4 w-4 mx-1" aria-hidden="true" />
      <span className="font-medium text-foreground truncate">
        {currentPage}
      </span>
    </nav>
  );
};