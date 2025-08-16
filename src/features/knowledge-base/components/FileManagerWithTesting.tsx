import React, { useState } from 'react';
import { TestTube, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TestingPanel } from './TestingPanel';
import { useDevTesting } from '../hooks/useTesting';
import { cn } from '@/lib/utils';

interface FileManagerWithTestingProps {
  children: React.ReactNode;
  className?: string;
  showTestingPanel?: boolean;
}

/**
 * Wrapper component that adds testing capabilities to any file manager
 * Only shows testing features in development or when explicitly enabled
 */
export function FileManagerWithTesting({ 
  children, 
  className,
  showTestingPanel = false 
}: FileManagerWithTestingProps) {
  const [isTestingVisible, setIsTestingVisible] = useState(showTestingPanel);
  const testing = useDevTesting();
  
  // Only show testing features in development or when explicitly enabled
  const shouldShowTesting = process.env.NODE_ENV === 'development' || 
    window.location.search.includes('testing=true') ||
    showTestingPanel;
  
  if (!shouldShowTesting) {
    return <div className={className}>{children}</div>;
  }
  
  return (
    <div className={cn('relative', className)}>
      {/* Main file manager content */}
      <div className={cn(isTestingVisible && 'mb-4')}>
        {children}
      </div>
      
      {/* Testing controls */}
      {shouldShowTesting && (
        <div className="fixed bottom-4 right-4 z-50">
          {/* Quick testing controls when panel is hidden */}
          {!isTestingVisible && (
            <div className="flex items-center gap-2">
              {testing.isTestingMode && (
                <div className="flex items-center gap-2 bg-background border rounded-lg px-3 py-2 shadow-lg">
                  <Badge variant="outline" className="text-xs">
                    Testing Mode
                  </Badge>
                  
                  {testing.isRunningTests && (
                    <Badge variant="default" className="text-xs animate-pulse">
                      Running
                    </Badge>
                  )}
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={testing.runQuickTest}
                    disabled={testing.isRunningTests}
                    className="h-6 px-2"
                  >
                    Quick Test
                  </Button>
                </div>
              )}
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsTestingVisible(true)}
                className="bg-background shadow-lg"
              >
                <TestTube className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {/* Full testing panel */}
          {isTestingVisible && (
            <div className="w-96 max-h-[80vh] overflow-hidden shadow-xl">
              <TestingPanel
                isVisible={true}
                onToggle={() => setIsTestingVisible(false)}
              />
            </div>
          )}
        </div>
      )}
      
      {/* Development indicator */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 right-4 z-40">
          <Badge variant="secondary" className="text-xs">
            DEV MODE
          </Badge>
        </div>
      )}
    </div>
  );
}

/**
 * Development helper component for testing file upload scenarios
 */
export function DevFileUploadTester() {
  const testing = useDevTesting();
  
  if (process.env.NODE_ENV !== 'development' || !testing.isTestingMode) {
    return null;
  }
  
  return (
    <div className="border-2 border-dashed border-orange-300 rounded-lg p-4 mb-4 bg-orange-50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TestTube className="h-5 w-5 text-orange-600" />
          <span className="font-medium text-orange-800">Development Testing</span>
        </div>
        <Badge variant="outline" className="text-orange-700">
          DEV ONLY
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => testing.simulateError('NETWORK_ERROR')}
          className="text-xs"
        >
          Network Error
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={() => testing.simulateError('SERVER_ERROR')}
          className="text-xs"
        >
          Server Error
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={() => testing.simulateNetworkConditions('slow')}
          className="text-xs"
        >
          Slow Network
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={testing.clearSimulation}
          className="text-xs"
        >
          Clear Simulation
        </Button>
      </div>
      
      {testing.logs.length > 0 && (
        <div className="mt-3 text-xs text-orange-700">
          Latest: {testing.logs[testing.logs.length - 1]}
        </div>
      )}
    </div>
  );
}

/**
 * Hook to add testing keyboard shortcuts
 */
export function useTestingKeyboardShortcuts() {
  const testing = useDevTesting();
  
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Shift+T: Toggle testing mode
      if (event.ctrlKey && event.shiftKey && event.key === 'T') {
        event.preventDefault();
        if (testing.isTestingMode) {
          testing.disableTestingMode();
        } else {
          testing.enableTestingMode();
        }
      }
      
      // Ctrl+Shift+Q: Quick test
      if (event.ctrlKey && event.shiftKey && event.key === 'Q') {
        event.preventDefault();
        testing.runQuickTest();
      }
      
      // Ctrl+Shift+E: Simulate error
      if (event.ctrlKey && event.shiftKey && event.key === 'E') {
        event.preventDefault();
        testing.simulateError('NETWORK_ERROR');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [testing]);
  
  return testing;
}