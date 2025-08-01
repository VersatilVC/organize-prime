import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/ui/icons';

export default function Dashboard() {
  const { user } = useAuth();
  const { role, organizations } = useUserRole();

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

  const stats = [
    {
      title: 'Organizations',
      value: organizations.length,
      description: 'Active organizations',
      icon: Icons.building,
    },
    {
      title: 'Notifications',
      value: 3,
      description: 'Unread notifications',
      icon: Icons.bell,
    },
    {
      title: 'Files',
      value: 12,
      description: 'Recent uploads',
      icon: Icons.fileText,
    },
    {
      title: 'API Calls',
      value: '1.2k',
      description: 'This month',
      icon: Icons.barChart,
    },
  ];

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