import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IframeUtils } from '@/lib/iframe-utils';
import { AuthProvider } from '@/auth/AuthProvider';
import { AuthPage } from '@/auth/pages/AuthPage';
import { AuthGuard } from '@/auth/AuthGuard';

export function MinimalApp() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const iframeContext = IframeUtils.getIframeContext();
  
  useEffect(() => {
    // Listen for URL changes
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  const navigateTo = (path: string) => {
    console.log('Navigation attempt:', { path, iframeContext });
    
    if (iframeContext.isInIframe) {
      console.log('Using iframe-aware navigation');
      // For iframe navigation, use postMessage to parent
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ 
          type: 'LOVABLE_NAVIGATE', 
          url: window.location.origin + path 
        }, '*');
      }
      // Also update local state for immediate visual feedback
      setCurrentPath(path);
      window.history.pushState({}, '', path);
    } else {
      console.log('Using standard navigation');
      window.location.href = path;
    }
  };

  const renderContent = () => {
    switch (currentPath) {
      case '/auth':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
            </CardHeader>
            <CardContent>
              <p>This would be the authentication page.</p>
              <Button onClick={() => navigateTo('/dashboard')} className="mt-4">
                Continue to Dashboard
              </Button>
            </CardContent>
          </Card>
        );
      
      case '/dashboard':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Welcome to your dashboard!</p>
              <div className="flex gap-2 mt-4">
                <Button onClick={() => navigateTo('/users')}>
                  View Users
                </Button>
                <Button onClick={() => navigateTo('/settings')}>
                  Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      
      case '/users':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
            </CardHeader>
            <CardContent>
              <p>User management page.</p>
              <Button onClick={() => navigateTo('/dashboard')} className="mt-4">
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        );
      
      case '/settings':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Application settings page.</p>
              <Button onClick={() => navigateTo('/dashboard')} className="mt-4">
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        );
      
      default:
        return (
          <Card>
            <CardHeader>
              <CardTitle>OrganizePrime - Welcome</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Welcome to OrganizePrime! This is a simplified version running without React Router to avoid context initialization issues.
              </p>
              
              <div className="space-y-2">
                <h3 className="font-semibold">Navigate to:</h3>
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={() => navigateTo('/auth')}>
                    Authentication
                  </Button>
                  <Button onClick={() => navigateTo('/dashboard')}>
                    Dashboard
                  </Button>
                  <Button onClick={() => navigateTo('/users')}>
                    Users
                  </Button>
                  <Button onClick={() => navigateTo('/settings')}>
                    Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <AuthProvider>
      {currentPath === '/auth' ? (
        <AuthPage onAuthenticated={() => navigateTo('/dashboard')} />
      ) : (
        <div className="min-h-screen bg-background text-foreground">
          <header className="border-b p-4">
            <h1 className="text-2xl font-bold">OrganizePrime</h1>
            <p className="text-muted-foreground">Current path: {currentPath}</p>
          </header>
      
      <main className="container mx-auto p-6">
        {renderContent()}

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">Debug Info:</h3>
          <ul className="text-sm space-y-1">
            <li>React Version: {React.version}</li>
            <li>Current URL: {window.location.href}</li>
            <li>Current Path: {currentPath}</li>
            <li>Environment: {import.meta.env.MODE}</li>
          </ul>
        </div>

        <div className="mt-4 p-4 bg-secondary rounded-lg">
          <h3 className="font-semibold mb-2">Iframe Context:</h3>
          <ul className="text-sm space-y-1">
            <li>Is in Iframe: <span className={iframeContext.isInIframe ? 'text-green-600' : 'text-gray-600'}>{iframeContext.isInIframe ? 'Yes' : 'No'}</span></li>
            <li>Is Lovable Preview: <span className={iframeContext.isLovablePreview ? 'text-purple-600' : 'text-gray-600'}>{iframeContext.isLovablePreview ? 'Yes' : 'No'}</span></li>
            <li>Current Origin: {iframeContext.currentOrigin}</li>
            <li>Parent Origin: {iframeContext.parentOrigin || 'N/A'}</li>
            <li>Navigation Method: <span className="font-mono">{iframeContext.isInIframe ? 'postMessage to parent' : 'window.location.href'}</span></li>
          </ul>
          </div>
        </main>
        </div>
      )}
    </AuthProvider>
  );
}