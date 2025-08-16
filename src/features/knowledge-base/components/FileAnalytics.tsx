import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  HardDrive,
  TrendingUp,
  Zap,
  Database
} from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getFileProcessingStats, getKBAnalytics } from '../services/fileUploadApi';

interface FileAnalyticsProps {
  selectedKbId?: string;
  className?: string;
}

export function FileAnalytics({ selectedKbId, className }: FileAnalyticsProps) {
  const { currentOrganization } = useOrganization();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['file-processing-stats', currentOrganization?.id],
    queryFn: () => getFileProcessingStats(currentOrganization!.id),
    enabled: !!currentOrganization?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: kbAnalytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['kb-analytics', currentOrganization?.id],
    queryFn: () => getKBAnalytics(currentOrganization!.id),
    enabled: !!currentOrganization?.id,
    refetchInterval: 30000,
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSuccessRateVariant = (rate: number) => {
    if (rate >= 90) return 'default';
    if (rate >= 70) return 'secondary';
    return 'destructive';
  };

  if (statsLoading || analyticsLoading) {
    return (
      <div className={className}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats || !kbAnalytics) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="p-6 text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No analytics data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const successRate = stats.totalFiles > 0 ? (stats.completedFiles / stats.totalFiles) * 100 : 0;
  const filteredAnalytics = selectedKbId 
    ? kbAnalytics.filter(kb => kb.kbId === selectedKbId)
    : kbAnalytics;

  return (
    <div className={className}>
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Files</p>
                <p className="text-2xl font-bold">{stats.totalFiles}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className={`text-2xl font-bold ${getSuccessRateColor(successRate)}`}>
                  {successRate.toFixed(1)}%
                </p>
              </div>
              <TrendingUp className={`h-8 w-8 ${getSuccessRateColor(successRate)}`} />
            </div>
            <div className="mt-2">
              <Progress value={successRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Storage Used</p>
                <p className="text-2xl font-bold">{formatFileSize(stats.totalStorage)}</p>
              </div>
              <HardDrive className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Processing</p>
                <p className="text-2xl font-bold">
                  {stats.averageProcessingTime 
                    ? formatDuration(stats.averageProcessingTime)
                    : 'N/A'
                  }
                </p>
              </div>
              <Zap className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Processing Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stats.completedFiles}</span>
                  <Badge variant="default">{((stats.completedFiles / stats.totalFiles) * 100).toFixed(1)}%</Badge>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Processing</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stats.processingFiles}</span>
                  <Badge variant="secondary">{((stats.processingFiles / stats.totalFiles) * 100).toFixed(1)}%</Badge>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">Pending</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stats.pendingFiles}</span>
                  <Badge variant="outline">{((stats.pendingFiles / stats.totalFiles) * 100).toFixed(1)}%</Badge>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Failed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stats.errorFiles}</span>
                  <Badge variant="destructive">{((stats.errorFiles / stats.totalFiles) * 100).toFixed(1)}%</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Knowledge Base Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredAnalytics.length > 0 ? (
                filteredAnalytics.map((kb) => (
                  <div key={kb.kbId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium truncate">{kb.kbName}</span>
                      </div>
                      <Badge variant={getSuccessRateVariant(kb.successRate)}>
                        {kb.successRate.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {kb.totalFiles} files • {kb.totalVectors} vectors • {formatFileSize(kb.totalStorage)}
                    </div>
                    <Progress value={kb.successRate} className="h-1" />
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                  <p>No knowledge bases found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed KB Analytics Table */}
      {!selectedKbId && kbAnalytics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Knowledge Base Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Knowledge Base</th>
                    <th className="text-right py-2">Files</th>
                    <th className="text-right py-2">Completed</th>
                    <th className="text-right py-2">Failed</th>
                    <th className="text-right py-2">Vectors</th>
                    <th className="text-right py-2">Storage</th>
                    <th className="text-right py-2">Success Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {kbAnalytics.map((kb) => (
                    <tr key={kb.kbId} className="border-b">
                      <td className="py-3 font-medium">{kb.kbName}</td>
                      <td className="text-right py-3">{kb.totalFiles}</td>
                      <td className="text-right py-3 text-green-600">{kb.completedFiles}</td>
                      <td className="text-right py-3 text-red-600">{kb.errorFiles}</td>
                      <td className="text-right py-3">{kb.totalVectors.toLocaleString()}</td>
                      <td className="text-right py-3">{formatFileSize(kb.totalStorage)}</td>
                      <td className="text-right py-3">
                        <Badge variant={getSuccessRateVariant(kb.successRate)}>
                          {kb.successRate.toFixed(1)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}