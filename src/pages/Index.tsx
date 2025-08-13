import React from 'react';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import Dashboard from './Dashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/ui/icons';
import { Link } from 'react-router-dom';
import { usePagePerformance } from '@/lib/performance';

// Loading component for auth check
const AuthLoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      <p className="text-sm text-muted-foreground">Checking authentication...</p>
    </div>
  </div>
);

const Index = () => {
  usePagePerformance('Home');
  
  // Safely try to get auth context, handle if provider not ready
  let user = null;
  let loading = true;
  
  try {
    const auth = useSimpleAuth();
    user = auth.user;
    loading = auth.loading;
  } catch (error) {
    console.warn('Auth context not available yet, showing loading state');
    return <AuthLoadingSpinner />;
  }

  // Show loading while auth is being determined
  if (loading) {
    return <AuthLoadingSpinner />;
  }

  // Show landing page for unauthenticated users
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Icons.building className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl">OrganizePrime</CardTitle>
            <CardDescription>
              Enterprise multi-tenant platform for managing organizations, teams, and workflows
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
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Secure multi-tenant architecture with role-based access control
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show dashboard for authenticated users
  return (
    <AppLayout>
      <Dashboard />
    </AppLayout>
  );
};

export default Index;
