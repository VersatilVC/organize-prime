import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart3, 
  TrendingUp, 
  Activity, 
  Download,
  Users,
  Package
} from 'lucide-react';

interface AnalyticsData {
  totalApps: number;
  totalInstallations: number;
  recentInstallations: number;
  topApps: Array<{
    name: string;
    installs: number;
    category: string;
  }>;
  installationsByCategory: Array<{
    category: string;
    count: number;
  }>;
  recentActivity: Array<{
    app_name: string;
    organization_name: string;
    installed_at: string;
    event_type: string;
  }>;
}

export const MarketplaceAnalytics: React.FC = () => {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['marketplace-analytics'],
    queryFn: async (): Promise<AnalyticsData> => {
      // Fetch basic stats
      const [appsResponse, installationsResponse] = await Promise.all([
        supabase.from('marketplace_apps' as any).select('id, name, category, install_count').eq('is_active', true),
        supabase.from('marketplace_app_installations' as any).select(`
          id,
          installed_at,
          app_id,
          organization_id,
          marketplace_apps!inner(name, category),
          organizations!inner(name)
        `).eq('status', 'active')
      ]);

      if (appsResponse.error) throw appsResponse.error;
      if (installationsResponse.error) throw installationsResponse.error;

      const apps = (appsResponse.data || []) as any[];
      const installations = (installationsResponse.data || []) as any[];

      // Calculate recent installations (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentInstallations = installations.filter(
        install => new Date(install.installed_at) > thirtyDaysAgo
      ).length;

      // Top apps by install count
      const topApps = apps
        .sort((a, b) => b.install_count - a.install_count)
        .slice(0, 5)
        .map(app => ({
          name: app.name,
          installs: app.install_count,
          category: app.category
        }));

      // Installations by category
      const categoryMap = new Map<string, number>();
      apps.forEach(app => {
        const count = categoryMap.get(app.category) || 0;
        categoryMap.set(app.category, count + app.install_count);
      });
      const installationsByCategory = Array.from(categoryMap.entries()).map(([category, count]) => ({
        category,
        count
      }));

      // Recent activity (last 10 installations)
      const recentActivity = installations
        .sort((a, b) => new Date(b.installed_at).getTime() - new Date(a.installed_at).getTime())
        .slice(0, 10)
        .map(install => ({
          app_name: install.marketplace_apps.name,
          organization_name: install.organizations.name,
          installed_at: install.installed_at,
          event_type: 'installation'
        }));

      return {
        totalApps: apps.length,
        totalInstallations: installations.length,
        recentInstallations,
        topApps,
        installationsByCategory,
        recentActivity
      };
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analytics Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-full mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Analytics Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center space-x-4 p-4 border rounded-lg">
              <div className="p-2 bg-primary/10 rounded-md">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Apps</p>
                <p className="text-2xl font-bold">{analytics?.totalApps || 0}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-4 border rounded-lg">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-md">
                <Download className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Installs</p>
                <p className="text-2xl font-bold">{analytics?.totalInstallations || 0}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-4 border rounded-lg">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-md">
                <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Recent Installs (30d)</p>
                <p className="text-2xl font-bold">{analytics?.recentInstallations || 0}</p>
              </div>
            </div>
          </div>

          {/* Top Apps */}
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Top Apps by Installs
              </h3>
              <div className="space-y-3">
                {analytics?.topApps.map((app, index) => (
                  <div key={app.name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{app.name}</p>
                        <p className="text-xs text-muted-foreground">{app.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{app.installs}</p>
                      <p className="text-xs text-muted-foreground">installs</p>
                    </div>
                  </div>
                )) || (
                  <p className="text-muted-foreground text-center py-4">No apps available</p>
                )}
              </div>
            </div>

            {/* Category Distribution */}
            <div>
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Installs by Category
              </h3>
              <div className="space-y-3">
                {analytics?.installationsByCategory.map((category) => (
                  <div key={category.category} className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium capitalize">{category.category}</span>
                    <span className="text-muted-foreground">{category.count} installs</span>
                  </div>
                )) || (
                  <p className="text-muted-foreground text-center py-4">No data available</p>
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent Installation Activity
            </h3>
            <div className="space-y-2">
              {analytics?.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4 text-green-600" />
                    <span>
                      <strong>{activity.organization_name}</strong> installed{' '}
                      <strong>{activity.app_name}</strong>
                    </span>
                  </div>
                  <span className="text-muted-foreground">
                    {new Date(activity.installed_at).toLocaleDateString()}
                  </span>
                </div>
              )) || (
                <p className="text-muted-foreground text-center py-4">No recent activity</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};