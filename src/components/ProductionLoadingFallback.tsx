import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ProductionLoadingFallbackProps {
  error?: boolean;
  retry?: () => void;
}

export const ProductionLoadingFallback: React.FC<ProductionLoadingFallbackProps> = ({ 
  error = false, 
  retry 
}) => {
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="mt-2">
            <div className="space-y-3">
              <p>Unable to load the application. This might be due to:</p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>Network connectivity issues</li>
                <li>Authentication configuration</li>
                <li>Server maintenance</li>
              </ul>
              {retry && (
                <button 
                  onClick={retry}
                  className="text-primary hover:text-primary/80 underline text-sm"
                >
                  Try again
                </button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Loading Application</h3>
          <p className="text-sm text-muted-foreground">
            Please wait while we initialize your workspace...
          </p>
        </div>
      </div>
    </div>
  );
};