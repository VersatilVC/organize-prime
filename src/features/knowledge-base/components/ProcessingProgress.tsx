import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  FileText,
  Zap,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { KBFile } from '../services/fileUploadApi';

interface ProcessingProgressProps {
  fileId: string;
  onComplete?: () => void;
  className?: string;
}

interface ProcessingStep {
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  message?: string;
  estimatedTime?: number;
}

export function ProcessingProgress({ fileId, onComplete, className }: ProcessingProgressProps) {
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([
    { name: 'File Upload', status: 'completed', progress: 100 },
    { name: 'Text Extraction', status: 'pending', progress: 0 },
    { name: 'Content Chunking', status: 'pending', progress: 0 },
    { name: 'Vector Generation', status: 'pending', progress: 0 },
    { name: 'Knowledge Base Update', status: 'pending', progress: 0 }
  ]);

  // Get file status and processing progress
  const { data: fileData, refetch } = useQuery({
    queryKey: ['kb-file', fileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kb_files')
        .select('*')
        .eq('id', fileId)
        .single();
      
      if (error) throw error;
      return data as KBFile;
    },
    refetchInterval: 2000, // Poll every 2 seconds during processing
    enabled: !!fileId,
  });

  // Get processing logs for detailed progress
  const { data: processingLogs } = useQuery({
    queryKey: ['processing-logs', fileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kb_processing_logs')
        .select('*')
        .eq('file_id', fileId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 2000,
    enabled: !!fileId,
  });

  // Update processing steps based on file status and logs
  useEffect(() => {
    if (!fileData) return;

    setProcessingSteps(prev => {
      const updated = [...prev];
      
      // Update based on file status
      switch (fileData.status) {
        case 'pending':
          updated[1].status = 'processing';
          updated[1].progress = 25;
          break;
          
        case 'processing':
          updated[1].status = 'completed';
          updated[1].progress = 100;
          updated[2].status = 'processing';
          updated[2].progress = 50;
          
          // Update based on processing logs
          if (processingLogs) {
            const latestLog = processingLogs[processingLogs.length - 1];
            if (latestLog?.step_name === 'chunking') {
              updated[2].status = 'completed';
              updated[2].progress = 100;
              updated[3].status = 'processing';
              updated[3].progress = latestLog.progress || 25;
            } else if (latestLog?.step_name === 'embedding') {
              updated[3].status = 'processing';
              updated[3].progress = latestLog.progress || 50;
            }
          }
          break;
          
        case 'completed':
          updated.forEach((step, index) => {
            updated[index] = { ...step, status: 'completed', progress: 100 };
          });
          onComplete?.();
          break;
          
        case 'error':
          const errorStepIndex = updated.findIndex(step => 
            step.status === 'processing' || step.status === 'pending'
          );
          if (errorStepIndex !== -1) {
            updated[errorStepIndex].status = 'error';
            updated[errorStepIndex].message = fileData.processing_error || 'Processing failed';
          }
          break;
      }
      
      return updated;
    });
  }, [fileData, processingLogs, onComplete]);

  // Real-time subscription for processing updates
  useEffect(() => {
    if (!fileId) return;

    const channel = supabase
      .channel(`file-processing-${fileId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'kb_files',
        filter: `id=eq.${fileId}`
      }, () => {
        refetch();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'kb_processing_logs',
        filter: `file_id=eq.${fileId}`
      }, () => {
        refetch();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fileId, refetch]);

  const getStepIcon = (step: ProcessingStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getOverallProgress = () => {
    const totalSteps = processingSteps.length;
    const completedSteps = processingSteps.filter(step => step.status === 'completed').length;
    const processingStep = processingSteps.find(step => step.status === 'processing');
    
    let progress = (completedSteps / totalSteps) * 100;
    
    if (processingStep) {
      progress += (processingStep.progress / 100) * (1 / totalSteps) * 100;
    }
    
    return Math.min(progress, 100);
  };

  const getStatusBadge = () => {
    if (!fileData) return null;
    
    const config = {
      pending: { variant: 'secondary' as const, label: 'Pending', icon: Clock },
      processing: { variant: 'default' as const, label: 'Processing', icon: Activity },
      completed: { variant: 'default' as const, label: 'Completed', icon: CheckCircle },
      error: { variant: 'destructive' as const, label: 'Error', icon: XCircle }
    };
    
    const { variant, label, icon: Icon } = config[fileData.status];
    
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  if (!fileData) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading file details...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Processing Progress
          </CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Overall Progress</span>
            <span className="text-muted-foreground">{Math.round(getOverallProgress())}%</span>
          </div>
          <Progress value={getOverallProgress()} className="h-2" />
        </div>

        {/* Processing Steps */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Processing Steps</h4>
          {processingSteps.map((step, index) => (
            <div key={step.name} className="flex items-center gap-3">
              {getStepIcon(step)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{step.name}</span>
                  {step.status === 'processing' && (
                    <span className="text-xs text-muted-foreground">
                      {step.progress}%
                    </span>
                  )}
                </div>
                {step.status === 'processing' && (
                  <Progress value={step.progress} className="h-1 mt-1" />
                )}
                {step.message && (
                  <p className="text-xs text-muted-foreground mt-1">{step.message}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* File Information */}
        <div className="pt-4 border-t space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">File Name:</span>
            <span className="font-medium truncate ml-2" title={fileData.file_name}>
              {fileData.file_name}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">File Size:</span>
            <span className="font-medium">
              {(fileData.file_size / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>
          {fileData.chunk_count > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Chunks Generated:</span>
              <span className="font-medium">{fileData.chunk_count}</span>
            </div>
          )}
          {fileData.vector_count > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vectors Created:</span>
              <span className="font-medium">{fileData.vector_count}</span>
            </div>
          )}
        </div>

        {/* Processing Error */}
        {fileData.status === 'error' && fileData.processing_error && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200">
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-red-800">Processing Error</p>
                <p className="text-red-700 mt-1">{fileData.processing_error}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}