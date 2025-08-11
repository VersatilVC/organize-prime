import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FileText, MoreHorizontal, Download, Edit, Trash2, Tag } from 'lucide-react';
import { KBDocument } from '../types/knowledgeBaseTypes';

interface DocumentCardProps {
  document: KBDocument;
  onView?: (document: KBDocument) => void;
  onEdit?: (document: KBDocument) => void;
  onDelete?: (document: KBDocument) => void;
  onDownload?: (document: KBDocument) => void;
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

export function DocumentCard({ 
  document, 
  onView, 
  onEdit, 
  onDelete, 
  onDownload 
}: DocumentCardProps) {
  const handleCardClick = () => {
    onView?.(document);
  };

  return (
    <Card className="group hover:shadow-md transition-shadow cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <CardTitle className="text-base truncate" onClick={handleCardClick}>
              {document.title}
            </CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={() => onView(document)}>
                  <FileText className="mr-2 h-4 w-4" />
                  View
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(document)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDownload && document.file_path && (
                <DropdownMenuItem onClick={() => onDownload(document)}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete(document)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3" onClick={handleCardClick}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge className={getStatusColor(document.processing_status)}>
            {document.processing_status}
          </Badge>
          <span>•</span>
          <span className="capitalize">{document.category}</span>
          {document.word_count && (
            <>
              <span>•</span>
              <span>{document.word_count.toLocaleString()} words</span>
            </>
          )}
          {document.file_size && (
            <>
              <span>•</span>
              <span>{formatFileSize(document.file_size)}</span>
            </>
          )}
        </div>

        {document.content && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {document.content.substring(0, 150)}
            {document.content.length > 150 ? '...' : ''}
          </p>
        )}

        {document.tags && document.tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <Tag className="h-3 w-3 text-muted-foreground" />
            {document.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {document.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{document.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Created {formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}
        </div>
      </CardContent>
    </Card>
  );
}