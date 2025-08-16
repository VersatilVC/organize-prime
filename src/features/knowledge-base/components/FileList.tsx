import React, { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  Eye, 
  Trash2, 
  RefreshCw, 
  Download, 
  MoreHorizontal,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  Wifi,
  WifiOff
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useKBFiles, useFileUpload } from '../hooks/useFileUpload';
import { useKnowledgeBases } from '../hooks/useKnowledgeBases';
import { useKBFileStatus } from '../hooks/useKBFileStatus';
import { FileDetailsModal } from './FileDetailsModal';
import { KBFile, resetFileForRetry } from '../services/fileUploadApi';
import { KBFileProcessingService } from '../services/KBFileProcessingService';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/contexts/OrganizationContext';

interface FileListProps {
  selectedKbId?: string;
  showProcessingOnly?: boolean;
  className?: string;
}

export function FileList({ selectedKbId, showProcessingOnly = false, className }: FileListProps) {
  const [page, setPage] = useState(0);
  const [filterKbId, setFilterKbId] = useState<string>(selectedKbId || 'all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);
  const [viewFileId, setViewFileId] = useState<string | null>(null);
  const [retryingFileId, setRetryingFileId] = useState<string | null>(null);
  
  const pageSize = 10;
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  
  const { data: knowledgeBases } = useKnowledgeBases();
  const { 
    data: filesData, 
    isLoading, 
    error 
  } = useKBFiles(
    filterKbId === 'all' ? undefined : filterKbId, 
    page, 
    pageSize
  );
  
  const { deleteFile, isDeleting } = useFileUpload();
  
  // Real-time file status updates
  const { 
    fileStatuses, 
    isConnected, 
    connectionError, 
    lastUpdateTime,
    getFileStatus,
    retryConnection
  } = useKBFileStatus(currentOrganization?.id);

  // Filter files based on search term, status, and processing state
  const filteredFiles = useMemo(() => {
    if (!filesData?.files) return [];
    
    return filesData.files.filter(file => {
      const matchesSearch = file.file_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || file.status === filterStatus;
      const matchesProcessing = showProcessingOnly ? 
        ['pending', 'processing'].includes(file.status) : true;
      return matchesSearch && matchesStatus && matchesProcessing;
    });
  }, [filesData?.files, searchTerm, filterStatus, showProcessingOnly]);

  const handleDelete = (fileId: string) => {
    deleteFile(fileId);
    setDeleteFileId(null);
  };

  const handleRetry = async (fileId: string) => {
    try {
      setRetryingFileId(fileId);
      
      // Reset file status first
      await resetFileForRetry(fileId);
      
      // Then trigger processing
      await KBFileProcessingService.retryFileProcessing(fileId);
      
      toast({
        title: 'Retry Started',
        description: 'File processing has been restarted.',
      });
    } catch (error) {
      console.error('Retry failed:', error);
      toast({
        title: 'Retry Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setRetryingFileId(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusBadge = (file: KBFile) => {
    // Check for real-time status updates
    const realtimeStatus = getFileStatus(file.id);
    const currentStatus = realtimeStatus?.status || file.status;
    
    const statusConfig = {
      pending: {
        variant: 'secondary' as const,
        icon: Clock,
        label: 'Pending'
      },
      processing: {
        variant: 'default' as const,
        icon: Loader2,
        label: 'Processing'
      },
      completed: {
        variant: 'default' as const,
        icon: CheckCircle,
        label: 'Completed'
      },
      error: {
        variant: 'destructive' as const,
        icon: AlertCircle,
        label: 'Error'
      }
    };

    const config = statusConfig[currentStatus as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={cn("h-3 w-3", currentStatus === 'processing' && "animate-spin")} />
        {config.label}
      </Badge>
    );
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType?.includes('pdf')) return '📄';
    if (mimeType?.includes('word')) return '📝';
    if (mimeType?.includes('text')) return '📄';
    return '📄';
  };

  const totalPages = Math.ceil((filesData?.totalCount || 0) / pageSize);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Files</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Files</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <AlertCircle className="h-5 w-5 mr-2" />
            Failed to load files
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle>Files ({filesData?.totalCount || 0})</CardTitle>
            
            {/* Real-time connection status */}
            <div className="flex items-center gap-2">
              {isConnected ? (
                <div className="flex items-center gap-1 text-green-600">
                  <Wifi className="h-4 w-4" />
                  <span className="text-xs">Live</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-600 cursor-pointer" onClick={retryConnection}>
                  <WifiOff className="h-4 w-4" />
                  <span className="text-xs">Offline</span>
                </div>
              )}
              
              {lastUpdateTime && (
                <span className="text-xs text-muted-foreground">
                  Updated {format(lastUpdateTime, 'HH:mm:ss')}
                </span>
              )}
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48"
            />
            
            <Select value={filterKbId} onValueChange={setFilterKbId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Knowledge Bases" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Knowledge Bases</SelectItem>
                {knowledgeBases?.map((kb) => (
                  <SelectItem key={kb.id} value={kb.id}>
                    {kb.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredFiles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {filesData?.files?.length === 0 ? (
              <>
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No files uploaded</h3>
                <p>Upload your first file to get started</p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium mb-2">No files match your filters</h3>
                <p>Try adjusting your search or filter criteria</p>
              </>
            )}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Knowledge Base</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Upload Date</TableHead>
                  <TableHead className="w-[50px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFiles.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">
                          {getFileIcon(file.mime_type)}
                        </span>
                        <div>
                          <p className="font-medium">{file.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {file.mime_type}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {file.kb_configuration?.display_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {file.kb_configuration?.name}
                        </p>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {formatFileSize(file.file_size)}
                    </TableCell>
                    
                    <TableCell>
                      {getStatusBadge(file)}
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        {file.status === 'completed' && (
                          <div className="text-xs text-muted-foreground">
                            {file.chunk_count} chunks, {file.vector_count} vectors
                          </div>
                        )}
                        {file.status === 'error' && file.processing_error && (
                          <div className="text-xs text-red-600 max-w-xs truncate">
                            {file.processing_error}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div>
                        <p className="text-sm">
                          {format(new Date(file.created_at), 'MMM d, yyyy')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(file.created_at), 'h:mm a')}
                        </p>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewFileId(file.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          
                          {file.status === 'error' && (
                            <DropdownMenuItem 
                              onClick={() => handleRetry(file.id)}
                              disabled={retryingFileId === file.id}
                            >
                              <RefreshCw className={cn(
                                "h-4 w-4 mr-2",
                                retryingFileId === file.id && "animate-spin"
                              )} />
                              Retry Processing
                            </DropdownMenuItem>
                          )}
                          
                          {file.status === 'completed' && (
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuItem 
                            onClick={() => setDeleteFileId(file.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, filesData?.totalCount || 0)} of {filesData?.totalCount || 0} files
                </p>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                  >
                    Previous
                  </Button>
                  
                  <span className="text-sm">
                    Page {page + 1} of {totalPages}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteFileId} onOpenChange={() => setDeleteFileId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete File</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this file? This action cannot be undone and will remove all associated data including vectors and chunks.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteFileId && handleDelete(deleteFileId)}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* File Details Modal */}
        <FileDetailsModal
          fileId={viewFileId}
          isOpen={!!viewFileId}
          onClose={() => setViewFileId(null)}
        />
      </CardContent>
    </Card>
  );
}