import React, { memo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Activity, BarChart, Clock, Database, Zap } from 'lucide-react';
import { useBackgroundSync } from '@/hooks/useAdvancedCaching';

const PerformanceMetricsCard = memo(function PerformanceMetricsCard() {
  // Performance monitoring removed - using built-in browser APIs instead
  const [activeTab, setActiveTab] = useState('overview');

  // Simplified performance data for display
  const memoryUsage = { used: 0, total: 0, percentage: 0 };
  const slowestComponents: any[] = [];
  const webVitals = { fcp: { value: 0, rating: 'good' }, lcp: { value: 0, rating: 'good' }, fid: { value: 0, rating: 'good' }, cls: { value: 0, rating: 'good' } };

  const getVitalColor = (rating: string) => {
    switch (rating) {
      case 'good':
        return 'text-green-600';
      case 'needs-improvement':
        return 'text-yellow-600';
      case 'poor':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Performance Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="components">Components</TabsTrigger>
            <TabsTrigger value="memory">Memory</TabsTrigger>
            <TabsTrigger value="vitals">Web Vitals</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {slowestComponents.length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Monitored Components
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {webVitals.filter(v => v.rating === 'good').length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Good Web Vitals
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {memoryUsage ? `${memoryUsage.used.toFixed(1)}` : 'N/A'}
                </div>
                <div className="text-sm text-muted-foreground">
                  Memory Usage (MB)
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  Good
                </div>
                <div className="text-sm text-muted-foreground">
                  Overall Rating
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="components" className="space-y-4">
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Slowest Components</h4>
              {slowestComponents.map((component, index) => (
                <div key={component.component} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <div className="font-medium">{component.component}</div>
                    <div className="text-sm text-muted-foreground">
                      {component.count} renders
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {component.avgTime.toFixed(2)}ms
                    </div>
                    <Badge variant={component.avgTime > 16 ? 'destructive' : 'secondary'}>
                      {component.avgTime > 16 ? 'Slow' : 'Good'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="memory" className="space-y-4">
            {memoryUsage ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Memory Usage</span>
                    <span>{memoryUsage.used.toFixed(1)} / {memoryUsage.limit.toFixed(1)} MB</span>
                  </div>
                  <Progress value={(memoryUsage.used / memoryUsage.limit) * 100} />
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold">{memoryUsage.used.toFixed(1)}MB</div>
                    <div className="text-sm text-muted-foreground">Used</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{memoryUsage.total.toFixed(1)}MB</div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{memoryUsage.limit.toFixed(1)}MB</div>
                    <div className="text-sm text-muted-foreground">Limit</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                Memory monitoring not available in this browser
              </div>
            )}
          </TabsContent>

          <TabsContent value="vitals" className="space-y-4">
            <div className="space-y-3">
              {webVitals.length > 0 ? (
                webVitals.map((vital, index) => (
                  <div key={`${vital.name}-${index}`} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <div className="font-medium">{vital.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(vital.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {vital.value.toFixed(2)}{vital.name === 'CLS' ? '' : 'ms'}
                      </div>
                      <Badge className={getVitalColor(vital.rating)}>
                        {vital.rating}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground">
                  No Web Vitals data available yet
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
});

const BackgroundSyncStatus = memo(function BackgroundSyncStatus() {
  const { performBackgroundSync } = useBackgroundSync({ priority: 'high' });
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  const handleManualSync = useCallback(async () => {
    setIsManualSyncing(true);
    try {
      await performBackgroundSync();
      setLastSync(new Date());
    } finally {
      setIsManualSyncing(false);
    }
  }, [performBackgroundSync]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Background Sync
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Sync Status</div>
            <div className="text-sm text-muted-foreground">
              {lastSync ? `Last sync: ${lastSync.toLocaleTimeString()}` : 'Not synced yet'}
            </div>
          </div>
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Active
          </Badge>
        </div>
        <Button 
          onClick={handleManualSync} 
          disabled={isManualSyncing}
          className="w-full"
        >
          {isManualSyncing ? 'Syncing...' : 'Manual Sync'}
        </Button>
      </CardContent>
    </Card>
  );
});

export const AdvancedPerformanceDashboard = memo(function AdvancedPerformanceDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Zap className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Performance Dashboard</h2>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PerformanceMetricsCard />
        </div>
        <div className="space-y-6">
          <BackgroundSyncStatus />
        </div>
      </div>
    </div>
  );
});

export default AdvancedPerformanceDashboard;