import React, { useMemo } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { useOptimizedUserRole } from '@/hooks/database/useOptimizedUserRole';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOptimizedDashboard } from '@/hooks/useOptimizedDashboard';
import { useDashboardFeatureStats } from '@/hooks/useDashboardFeatureStats';
import { FeatureCard } from '@/components/dashboard/FeatureCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { useOrganizationCreation } from '@/hooks/useOrganizationCreation';
import { useOrganizationSetup } from '@/hooks/useOrganizationSetup';
import { OrganizationSetup } from '@/components/OrganizationSetup';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isWelcomeNotification } from '@/lib/notification-templates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/ui/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
// import { usePagePerformance } from '@/lib/performance';

// Memoized StatCard component to prevent unnecessary re-renders
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
  icon: React.ComponentType<{ className?: string }>;
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
), (prevProps, nextProps) => {
  // Only re-render if value or loading state changes
  return (
    prevProps.value === nextProps.value &&
    prevProps.loading === nextProps.loading &&
    prevProps.title === nextProps.title
  );
});

StatCard.displayName = 'StatCard';

// Removed old QuickActionButton - now using enhanced QuickActions component

export default function Dashboard() {
  // usePagePerformance('Dashboard'); // Temporarily disabled
  const { user } = useAuth();
  const { role } = useOptimizedUserRole();
  const { currentOrganization, organizations } = useOrganization();
  const { 
    stats, 
    notifications: notificationsList, 
    unreadCount: notifications, 
    isLoading 
  } = useOptimizedDashboard();
  
  const {
    features,
    quickActions,
    recentActivity,
    hasProcessingItems,
    hasAttentionItems,
    isLoading: isFeatureStatsLoading
  } = useDashboardFeatureStats();
  
  // Extract data from the new hook structure
  const orgCount = organizations.length; // Use organizations from useOrganization
  const users = stats?.totalUsers || 0;
  const feedback = stats?.totalFeedback || 0;
  const loading = isLoading;
  const queryClient = useQueryClient();
  
  // Check for automatic organization creation (business domains)
  useOrganizationCreation();
  
  // Check for organization setup modal (personal domains)
  const { showSetup, onSetupSuccess, onSetupOpenChange } = useOrganizationSetup();

  // Fetch welcome notifications for new users
  const { data: welcomeNotifications } = useQuery({
    queryKey: ['welcome-notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select('id, title, message, type, read, action_url, created_at, category')
        .eq('user_id', user.id)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data?.filter(notification => isWelcomeNotification(notification)) || [];
    },
    enabled: !!user,
  });


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

  // Memoized stats calculation to prevent recalculation on every render
  const dashboardStats = useMemo(() => {
    if (role === 'super_admin') {
      return [
        {
          title: 'Organizations',
          value: orgCount,
          description: 'Total organizations',
          icon: Icons.building,
        },
        {
          title: 'Total Users',
          value: users,
          description: 'Across all orgs',
          icon: Icons.users,
        },
        {
          title: 'Notifications',
          value: notifications,
          description: 'System alerts',
          icon: Icons.bell,
        },
        {
          title: 'Pending Feedback',
          value: feedback,
          description: 'Needs attention',
          icon: Icons.messageSquare,
        },
      ];
    } else if (role === 'admin') {
      return [
        {
          title: 'Team Members',
          value: users,
          description: `In ${currentOrganization?.name || 'organization'}`,
          icon: Icons.users,
        },
        {
          title: 'Pending Invites',
          value: 0, // TODO: Add invitations count
          description: 'Awaiting response',
          icon: Icons.mail,
        },
        {
          title: 'Notifications',
          value: notifications,
          description: 'Unread messages',
          icon: Icons.bell,
        },
        {
          title: 'Pending Feedback',
          value: feedback,
          description: 'Needs review',
          icon: Icons.messageSquare,
        },
      ];
    } else {
      return [
        {
          title: 'Organizations',
          value: orgCount,
          description: 'Your memberships',
          icon: Icons.building,
        },
        {
          title: 'Notifications',
          value: notifications,
          description: 'Unread messages',
          icon: Icons.bell,
        },
        {
          title: 'My Feedback',
          value: feedback,
          description: 'Submitted feedback',
          icon: Icons.messageSquare,
        },
      ];
    }
  }, [role, orgCount, users, notifications, feedback, currentOrganization?.name]);

  // Show empty state for users with no organizations
  const showEmptyState = organizations.length === 0 && !loading;

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
            {/* Welcome Notifications for New Users */}
            {welcomeNotifications && welcomeNotifications.length > 0 && (
              <div className="space-y-3">
                {welcomeNotifications.map((notification) => (
                  <Card key={notification.id} className="border-l-4 border-l-green-500 bg-green-50/50 dark:bg-green-950/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          🎉 {notification.title}
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            await supabase
                              .from('notifications')
                              .update({ read: true, read_at: new Date().toISOString() })
                              .eq('id', notification.id);
                            
                            // Invalidate the query to refetch and update the UI
                            queryClient.invalidateQueries({ queryKey: ['welcome-notifications', user?.id] });
                          }}
                        >
                          <Icons.close className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{notification.message}</p>
                      {notification.action_url && (
                        <Button asChild className="mt-3" size="sm">
                          <Link to={notification.action_url}>
                            Get Started
                            <Icons.arrowRight className="h-4 w-4 ml-2" />
                          </Link>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Feature Overview Cards */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Feature Overview</h2>
                {(hasProcessingItems || hasAttentionItems) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {hasProcessingItems && (
                      <div className="flex items-center gap-1">
                        <Icons.refreshCw className="h-4 w-4 text-blue-500" />
                        <span>Processing</span>
                      </div>
                    )}
                    {hasAttentionItems && (
                      <div className="flex items-center gap-1">
                        <Icons.alertCircle className="h-4 w-4 text-orange-500" />
                        <span>Needs attention</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {isFeatureStatsLoading ? (
                  <>  
                    {Array.from({ length: 3 }, (_, i) => (
                      <Card key={i} className="animate-pulse">
                        <CardHeader className="space-y-0 pb-2">
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-lg" />
                            <div className="space-y-1">
                              <Skeleton className="h-4 w-24" />
                              <Skeleton className="h-3 w-16" />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex justify-between">
                            <div className="space-y-1">
                              <Skeleton className="h-6 w-8" />
                              <Skeleton className="h-3 w-12" />
                            </div>
                            <div className="space-y-1">
                              <Skeleton className="h-5 w-6" />
                              <Skeleton className="h-3 w-10" />
                            </div>
                          </div>
                          <Skeleton className="h-8 w-full" />
                        </CardContent>
                      </Card>
                    ))}
                  </>
                ) : (
                  features.map((feature) => (
                    <FeatureCard
                      key={feature.slug}
                      slug={feature.slug}
                      name={feature.name}
                      icon={feature.icon as keyof typeof Icons}
                      color={feature.color}
                      stats={feature.stats}
                      status={feature.status}
                      quickAction={feature.quickAction}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Legacy Stats for Reference (can be removed later) */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {dashboardStats.map((stat) => (
                <StatCard
                  key={stat.title}
                  title={stat.title}
                  value={stat.value}
                  description={stat.description}
                  icon={stat.icon}
                  loading={loading}
                />
              ))}
            </div>

            {/* Enhanced Quick Actions */}
            <QuickActions actions={quickActions} />

            {/* Role-specific content */}
            {role === 'super_admin' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icons.shield className="h-5 w-5" />
                    System Administrator
                  </CardTitle>
                  <CardDescription>
                    You have system-wide administrative privileges
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Access system settings, manage all organizations, and view audit logs.
                  </p>
                </CardContent>
              </Card>
            )}

            {role === 'admin' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icons.users className="h-5 w-5" />
                    Organization Administrator
                  </CardTitle>
                  <CardDescription>
                    You have administrative privileges for your organizations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Manage team members, organization settings, and access advanced features.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Recent Activity with Real Data */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  {recentActivity.length > 0 
                    ? "Latest actions and updates from your organization"
                    : "No recent activity to show"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isFeatureStatsLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }, (_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => {
                      const IconComponent = Icons[activity.icon as keyof typeof Icons] || Icons.circle;
                      const timeAgo = new Date(activity.timestamp).toLocaleString();
                      
                      return (
                        <div key={`${activity.type}-${index}`} className="flex items-center space-x-4">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                            <IconComponent className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium">{activity.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {activity.description} • {timeAgo}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <div className="text-center">
                      <Icons.clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No recent activity</p>
                      <p className="text-xs">Start by uploading documents or creating content</p>
                    </div>
                  </div>
                )}
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