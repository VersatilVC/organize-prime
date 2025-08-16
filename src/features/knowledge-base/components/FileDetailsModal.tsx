import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Activity,
  BarChart3,
  AlertTriangle,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { getFileDetails } from '../services/fileUploadApi';
import { KBFile } from '../services/fileUploadApi';

interface FileDetailsModalProps {
  fileId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function FileDetailsModal({ fileId, isOpen, onClose }: FileDetailsModalProps) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['file-details', fileId],
    queryFn: () => getFileDetails(fileId!),
    enabled: !!fileId && isOpen,
    refetchInterval: 5000, // Refresh every 5 seconds if processing
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { variant: 'secondary' as const, icon: Clock, label: 'Pending' },
      processing: { variant: 'default' as const, icon: Activity, label: 'Processing' },
      completed: { variant: 'default' as const, icon: CheckCircle, label: 'Completed' },
      error: { variant: 'destructive' as const, icon: XCircle, label: 'Error' }
    };

    const { variant, icon: Icon, label } = config[status as keyof typeof config] || config.pending;

    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  const getLogIcon = (stepName: string) => {
    switch (stepName) {
      case 'upload': return <FileText className="h-4 w-4 text-blue-500" />;
      case 'extraction': return <Activity className="h-4 w-4 text-yellow-500" />;
      case 'chunking': return <BarChart3 className="h-4 w-4 text-purple-500" />;
      case 'embedding': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleDownload = () => {
    if (data?.downloadUrl) {
      window.open(data.downloadUrl, '_blank');
    }
  };

  if (!isOpen || !fileId) return null;

  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              File Details
            </DialogTitle>
          </DialogHeader>
          
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load file details. Please try again.
            </AlertDescription>
          </Alert>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              File Details
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading file details...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const { file, processingLogs, downloadUrl } = data!;
  const processingTime = file.status === 'completed' ? 
    new Date(file.updated_at).getTime() - new Date(file.created_at).getTime() : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              File Details
            </DialogTitle>
            {getStatusBadge(file.status)}
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="processing">Processing Logs</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">File Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Basic Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">File Name:</span>
                        <span className="font-medium truncate ml-2" title={file.file_name}>
                          {file.file_name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Size:</span>
                        <span className="font-medium">{formatFileSize(file.file_size)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type:</span>
                        <span className="font-medium">{file.mime_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Knowledge Base:</span>
                        <span className="font-medium">
                          {file.kb_configuration?.display_name || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Processing Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <span className="font-medium">{file.status}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Chunks:</span>
                        <span className="font-medium">{file.chunk_count || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Vectors:</span>
                        <span className="font-medium">{file.vector_count || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Uploaded:</span>
                        <span className="font-medium">
                          {format(new Date(file.created_at), 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                      {processingTime && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Processing Time:</span>
                          <span className="font-medium">{formatDuration(processingTime)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {file.processing_error && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Processing Error:</strong> {file.processing_error}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2 pt-4 border-t">
                  {downloadUrl && (
                    <Button variant="outline" onClick={handleDownload}>
                      <Download className="h-4 w-4 mr-2" />
                      Download File
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => refetch()}>
                    <Activity className="h-4 w-4 mr-2" />
                    Refresh Status
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="processing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Processing Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                {processingLogs && processingLogs.length > 0 ? (
                  <div className="space-y-4">
                    {processingLogs.map((log, index) => (
                      <div key={log.id || index} className="flex items-start gap-3 p-3 rounded-lg border">
                        {getLogIcon(log.step_name)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium capitalize">{log.step_name}</h4>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(log.created_at), 'HH:mm:ss')}
                            </span>
                          </div>
                          {log.message && (
                            <p className="text-sm text-muted-foreground mt-1">{log.message}</p>
                          )}
                          {log.progress && (
                            <div className="mt-2">
                              <div className="flex justify-between text-xs mb-1">
                                <span>Progress</span>
                                <span>{log.progress}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1">
                                <div 
                                  className="bg-blue-600 h-1 rounded-full"
                                  style={{ width: `${log.progress}%` }}
                                />
                              </div>
                            </div>
                          )}
                          {log.error_message && (
                            <Alert className="mt-2">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription className="text-xs">
                                {log.error_message}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4" />
                    <p>No processing logs available yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Processing Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 rounded-lg bg-blue-50">
                      <div className="text-2xl font-bold text-blue-600">
                        {file.chunk_count || 0}
                      </div>
                      <div className="text-sm text-blue-600">Text Chunks</div>
                    </div>
                    <div className="p-3 rounded-lg bg-green-50">
                      <div className="text-2xl font-bold text-green-600">
                        {file.vector_count || 0}
                      </div>
                      <div className="text-sm text-green-600">Vectors Generated</div>
                    </div>
                  </div>
                  
                  {processingTime && (
                    <div className="p-3 rounded-lg bg-purple-50">
                      <div className="text-center">
                        <div className="text-lg font-bold text-purple-600">
                          {formatDuration(processingTime)}
                        </div>
                        <div className="text-sm text-purple-600">Total Processing Time</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">File Metadata</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">File ID:</span>
                    <span className="font-mono text-xs">{file.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">KB ID:</span>
                    <span className="font-mono text-xs">{file.kb_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Storage Path:</span>
                    <span className="font-mono text-xs truncate max-w-48" title={file.file_path}>
                      {file.file_path}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Updated:</span>
                    <span className="font-medium">
                      {format(new Date(file.updated_at), 'MMM dd, yyyy HH:mm:ss')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}