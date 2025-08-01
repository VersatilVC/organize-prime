import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import Dashboard from './Dashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/ui/icons';
import { Link } from 'react-router-dom';

const Index = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Icons.building className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl">Multi-Tenant SaaS Platform</CardTitle>
            <CardDescription>
              Manage your organizations, teams, and workflows in one place
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <Icons.users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <h4 className="font-medium">Team Management</h4>
                <p className="text-sm text-muted-foreground">Collaborate with your team</p>
              </div>
              <div>
                <Icons.shield className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <h4 className="font-medium">Secure</h4>
                <p className="text-sm text-muted-foreground">Enterprise-grade security</p>
              </div>
              <div>
                <Icons.barChart className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <h4 className="font-medium">Analytics</h4>
                <p className="text-sm text-muted-foreground">Powerful insights</p>
              </div>
              <div>
                <Icons.webhook className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <h4 className="font-medium">Integrations</h4>
                <p className="text-sm text-muted-foreground">Connect your tools</p>
              </div>
            </div>
            <Button asChild className="w-full">
              <Link to="/auth">Get Started</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AppLayout>
      <Dashboard />
    </AppLayout>
  );
};

export default Index;
