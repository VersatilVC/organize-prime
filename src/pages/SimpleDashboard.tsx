import React, { useMemo } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { useUserRole } from '@/hooks/useUserRole';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOptimizedDashboard } from '@/hooks/useOptimizedDashboard';
import { useOrganizationCreation } from '@/hooks/useOrganizationCreation';
import { useOrganizationSetup } from '@/hooks/useOrganizationSetup';
import { OrganizationSetup } from '@/components/OrganizationSetup';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/ui/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

// Optimized StatCard with minimal re-renders
const StatCard = React.memo(({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  loading 
}: {
  title: string;
  value: number;
  description: string;
  icon: any;
  loading: boolean;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {loading ? (
        <>
          <Skeleton className="h-8 w-16 mb-1" />
          <Skeleton className="h-3 w-24" />
        </>
      ) : (
        <>
          <div className="text-2xl font-bold">{value}</div>
          <p className="text-xs text-muted-foreground">{description}</p>
        </>
      )}
    </CardContent>
  </Card>
));

StatCard.displayName = 'StatCard';

export default function SimpleDashboard() {
  const { user } = useAuth();
  const { role } = useUserRole();
  const { currentOrganization, organizations } = useOrganization();
  const { stats, isLoading, isCoreReady, isFullyLoaded, notifications } = useOptimizedDashboard();
  
  // Check for automatic organization creation (business domains)
  useOrganizationCreation();
  
  // Check for organization setup modal (personal domains)
  const { showSetup, onSetupSuccess, onSetupOpenChange } = useOrganizationSetup();

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'destructive';
      case 'admin':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      default:
        return 'User';
    }
  };

  // Memoized stats calculation
  const dashboardStats = useMemo(() => {
    if (!stats) return [];
    
    if (role === 'super_admin') {
      return [
        {
          title: 'Organizations',
          value: 1, // Placeholder for organizations count
          description: 'Total organizations',
          icon: Icons.building,
        },
        {
          title: 'Total Users',
          value: stats.totalUsers || 0,
          description: 'Across all orgs',
          icon: Icons.users,
        },
        {
          title: 'Notifications',
          value: 0, // Placeholder for notifications
          description: 'System alerts',
          icon: Icons.bell,
        },
        {
          title: 'Pending Feedback',
          value: stats.totalFeedback || 0,
          description: 'Needs attention',
          icon: Icons.messageSquare,
        },
      ];
    } else if (role === 'admin') {
      return [
        {
          title: 'Team Members',
          value: stats.totalUsers || 0,
          description: `In ${currentOrganization?.name || 'organization'}`,
          icon: Icons.users,
        },
        {
          title: 'Notifications',
          value: 0, // Placeholder for notifications
          description: 'Unread messages',
          icon: Icons.bell,
        },
        {
          title: 'Pending Feedback',
          value: stats.totalFeedback || 0,
          description: 'Needs review',
          icon: Icons.messageSquare,
        },
      ];
    } else {
      return [
        {
          title: 'Organizations',
          value: 1, // Placeholder for organizations count
          description: 'Your memberships',
          icon: Icons.building,
        },
        {
          title: 'Notifications',
          value: 0, // Placeholder for notifications
          description: 'Unread messages',
          icon: Icons.bell,
        },
        {
          title: 'My Feedback',
          value: stats.totalFeedback || 0,
          description: 'Submitted feedback',
          icon: Icons.messageSquare,
        },
      ];
    }
  }, [stats, role, currentOrganization?.name]);

  // Show empty state for users with no organizations
  const showEmptyState = organizations.length === 0 && !isLoading;

  // Show skeleton while core data is loading
  if (!isCoreReady) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-5 w-64" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getRoleBadgeVariant(role)}>
              {getRoleDisplayName(role)}
            </Badge>
            {showEmptyState && (
              <Button onClick={() => onSetupOpenChange(true)} size="sm">
                <Icons.plus className="h-4 w-4 mr-2" />
                Setup Organization
              </Button>
            )}
          </div>
        </div>

        {/* Empty State for users with no organizations */}
        {showEmptyState ? (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-xl">
                <Icons.building className="h-6 w-6" />
                Get Started with Organizations
              </CardTitle>
              <CardDescription>
                You're not currently part of any organization. Create a new one or join an existing organization to get started.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => onSetupOpenChange(true)} size="lg">
                <Icons.plus className="h-4 w-4 mr-2" />
                Setup Organization
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {dashboardStats.map((stat) => (
                <StatCard
                  key={stat.title}
                  title={stat.title}
                  value={stat.value}
                  description={stat.description}
                  icon={stat.icon}
                  loading={isLoading}
                />
              ))}
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icons.zap className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>
                  Common tasks and shortcuts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <Button asChild variant="outline" className="h-auto flex-col py-4">
                    <Link to="/feedback">
                      <Icons.messageSquare className="h-6 w-6 mb-2" />
                      <span className="text-sm">Send Feedback</span>
                    </Link>
                  </Button>
                  
                  {role === 'admin' && (
                    <Button asChild variant="outline" className="h-auto flex-col py-4">
                      <Link to="/users">
                        <Icons.userPlus className="h-6 w-6 mb-2" />
                        <span className="text-sm">Invite Users</span>
                      </Link>
                    </Button>
                  )}
                  
                  <Button asChild variant="outline" className="h-auto flex-col py-4 relative">
                    <Link to="/notifications">
                      <Icons.bell className="h-6 w-6 mb-2" />
                      <span className="text-sm">Notifications</span>
                      {notifications && notifications.length > 0 && (
                        <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                          {notifications.length}
                        </Badge>
                      )}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Your latest actions and updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <Icons.user className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">Dashboard loaded</p>
                      <p className="text-xs text-muted-foreground">Just now</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Organization Setup Modal */}
      <OrganizationSetup
        open={showSetup}
        onOpenChange={onSetupOpenChange}
        onSuccess={onSetupSuccess}
      />
    </>
  );
}