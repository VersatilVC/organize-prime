import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function MinimalApp() {
  const navigateTo = (path: string) => {
    window.location.href = path;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b p-4">
        <h1 className="text-2xl font-bold">OrganizePrime - Minimal Mode</h1>
        <p className="text-muted-foreground">Testing without React Router</p>
      </header>
      
      <main className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>App is Working!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              React is properly initialized and components are rendering correctly.
              This proves the issue was with React Router integration.
            </p>
            
            <div className="space-y-2">
              <h3 className="font-semibold">Test Navigation (using window.location):</h3>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => navigateTo('/auth')}>
                  Go to Auth
                </Button>
                <Button onClick={() => navigateTo('/dashboard')}>
                  Go to Dashboard
                </Button>
                <Button onClick={() => navigateTo('/')}>
                  Go to Home
                </Button>
              </div>
            </div>

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Debug Info:</h3>
              <ul className="text-sm space-y-1">
                <li>React Version: {React.version}</li>
                <li>Current URL: {window.location.href}</li>
                <li>React Context Available: {React.useContext ? 'Yes' : 'No'}</li>
                <li>Environment: {import.meta.env.MODE}</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}