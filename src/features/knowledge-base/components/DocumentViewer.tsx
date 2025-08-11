import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, Download, Edit, Trash2, Calendar, User, Tag, BarChart3 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { KBDocument } from '../types/knowledgeBaseTypes';

interface DocumentViewerProps {
  document: KBDocument;
  onEdit?: () => void;
  onDelete?: () => void;
  onDownload?: () => void;
  onClose?: () => void;
  className?: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'processing':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    case 'error':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  }
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '';
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

export function DocumentViewer({
  document,
  onEdit,
  onDelete,
  onDownload,
  onClose,
  className
}: DocumentViewerProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <FileText className="h-6 w-6 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <CardTitle className="text-xl leading-tight">{document.title}</CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={getStatusColor(document.processing_status)}>
                  {document.processing_status}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {document.category}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            {onDownload && document.file_path && (
              <Button variant="outline" size="sm" onClick={onDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
            {onDelete && (
              <Button variant="outline" size="sm" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Document Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="text-sm font-medium">
                {formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          
          {document.word_count && (
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Word Count</p>
                <p className="text-sm font-medium">{document.word_count.toLocaleString()}</p>
              </div>
            </div>
          )}
          
          {document.file_size && (
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">File Size</p>
                <p className="text-sm font-medium">{formatFileSize(document.file_size)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Tags */}
        {document.tags && document.tags.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Tags</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {document.tags.map((tag, index) => (
                <Badge key={index} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Document Content */}
        <div>
          <h3 className="text-sm font-medium mb-3">Content</h3>
          <div className="prose prose-sm max-w-none">
            {document.file_path && !document.content ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>This document is a file upload.</p>
                <p className="text-sm mt-1">
                  {onDownload ? 'Download the file to view its contents.' : 'Content preview not available.'}
                </p>
              </div>
            ) : document.content ? (
              <div className="whitespace-pre-wrap text-sm leading-relaxed bg-muted/20 p-4 rounded-lg border">
                {document.content}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No content available</p>
              </div>
            )}
          </div>
        </div>

        {/* Processing Status */}
        {document.processing_status !== 'completed' && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse"></div>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                {document.processing_status === 'processing' 
                  ? 'This document is being processed for search indexing.'
                  : document.processing_status === 'error'
                  ? 'There was an error processing this document.'
                  : 'This document is pending processing.'
                }
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}