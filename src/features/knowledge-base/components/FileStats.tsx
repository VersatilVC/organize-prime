import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Files, 
  Clock, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  TrendingUp 
} from 'lucide-react';
import { useFileStats } from '../hooks/useFileUpload';

interface FileStatsProps {
  className?: string;
}

export function FileStats({ className }: FileStatsProps) {
  const { data: stats, isLoading, error } = useFileStats();

  if (isLoading) {
    return (
      <div className={className}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center text-muted-foreground">
            <AlertCircle className="h-5 w-5 mr-2" />
            Failed to load statistics
          </div>
        </CardContent>
      </Card>
    );
  }

  const statItems = [
    {
      title: 'Total Files',
      value: stats.totalFiles,
      icon: Files,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Pending',
      value: stats.pendingFiles,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'Processing',
      value: stats.processingFiles,
      icon: Loader2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      animate: stats.processingFiles > 0,
    },
    {
      title: 'Completed',
      value: stats.completedFiles,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Errors',
      value: stats.errorFiles,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ];

  const completionRate = stats.totalFiles > 0 
    ? Math.round((stats.completedFiles / stats.totalFiles) * 100)
    : 0;

  return (
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {statItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {item.title}
                    </p>
                    <p className="text-2xl font-bold">{item.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${item.bgColor}`}>
                    <Icon 
                      className={`h-6 w-6 ${item.color} ${
                        item.animate ? 'animate-spin' : ''
                      }`} 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Card */}
      {stats.totalFiles > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Processing Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Completion Rate:</span>
                  <Badge 
                    variant={completionRate >= 80 ? 'default' : completionRate >= 50 ? 'secondary' : 'destructive'}
                  >
                    {completionRate}%
                  </Badge>
                </div>
                
                {stats.processingFiles > 0 && (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span className="text-sm text-muted-foreground">
                      {stats.processingFiles} file{stats.processingFiles !== 1 ? 's' : ''} currently processing
                    </span>
                  </div>
                )}
                
                {stats.errorFiles > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-muted-foreground">
                      {stats.errorFiles} file{stats.errorFiles !== 1 ? 's' : ''} failed processing
                    </span>
                  </div>
                )}
              </div>
              
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Files</p>
                <p className="text-3xl font-bold">{stats.totalFiles}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}