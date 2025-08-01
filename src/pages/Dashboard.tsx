import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/ui/icons';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { user } = useAuth();
  const { role } = useUserRole();
  const { currentOrganization } = useOrganization();
  const { organizations, users, notifications, files, loading } = useDashboardData();


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

  const getStatsForRole = () => {
    if (role === 'super_admin') {
      return [
        {
          title: 'Organizations',
          value: organizations,
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
          title: 'Files',
          value: files,
          description: 'Total files',
          icon: Icons.fileText,
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
          title: 'Company Files',
          value: files,
          description: 'Shared documents',
          icon: Icons.fileText,
        },
      ];
    } else {
      return [
        {
          title: 'Organizations',
          value: organizations,
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
          title: 'My Files',
          value: files,
          description: 'Your uploads',
          icon: Icons.fileText,
        },
        {
          title: 'Activity',
          value: 0, // TODO: Add activity count
          description: 'Recent actions',
          icon: Icons.barChart,
        },
      ];
    }
  };

  const stats = getStatsForRole();

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.email}
          </p>
        </div>
        <Badge variant={getRoleBadgeVariant(role)}>
          {getRoleDisplayName(role)}
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

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
                <p className="text-sm font-medium">Profile updated</p>
                <p className="text-xs text-muted-foreground">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Icons.fileText className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">New file uploaded</p>
                <p className="text-xs text-muted-foreground">5 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Icons.bell className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">Notification preferences updated</p>
                <p className="text-xs text-muted-foreground">1 day ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}