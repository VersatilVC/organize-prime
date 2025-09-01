import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText,
  Copy,
  CheckCircle,
  Download,
  Edit,
  Clock,
  AlertCircle,
  Brain,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useBriefGenerationRetry } from '@/hooks/content-creation';
import type { ContentBriefWithDetails } from '@/types/content-creation';

interface BriefMarkdownViewerProps {
  brief: ContentBriefWithDetails & {
    brief_content?: string;
    generation_status?: 'pending' | 'processing' | 'completed' | 'failed';
    generation_error?: string;
    generation_started_at?: string;
    generation_completed_at?: string;
  };
  className?: string;
  onEdit?: (brief: ContentBriefWithDetails) => void;
  compact?: boolean;
}

export function BriefMarkdownViewer({
  brief,
  className,
  onEdit,
  compact = false
}: BriefMarkdownViewerProps) {
  const [copied, setCopied] = React.useState(false);
  
  const briefRetryMutation = useBriefGenerationRetry({
    onSuccess: (briefId) => {
      console.log('✅ Brief generation retry started for:', briefId);
    }
  });

  const getStatusInfo = () => {
    switch (brief.generation_status) {
      case 'pending':
        return {
          icon: Clock,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100 dark:bg-blue-900/20',
          label: 'Pending Generation'
        };
      case 'processing':
        return {
          icon: Brain,
          color: 'text-purple-600',
          bgColor: 'bg-purple-100 dark:bg-purple-900/20',
          label: 'Generating Content...'
        };
      case 'completed':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-100 dark:bg-green-900/20',
          label: 'AI Generated'
        };
      case 'failed':
        return {
          icon: AlertCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-100 dark:bg-red-900/20',
          label: 'Generation Failed'
        };
      default:
        return {
          icon: FileText,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100 dark:bg-gray-900/20',
          label: 'Manual Brief'
        };
    }
  };

  const statusInfo = getStatusInfo();

  const handleCopyContent = async () => {
    try {
      const content = brief.brief_content || brief.requirements || 'No content available';
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success('Brief content copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy content to clipboard');
    }
  };

  const handleDownload = () => {
    try {
      const content = brief.brief_content || brief.requirements || 'No content available';
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${brief.title.toLowerCase().replace(/\s+/g, '-')}-brief.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Brief downloaded successfully');
    } catch (error) {
      toast.error('Failed to download brief');
    }
  };

  const handleRetry = async () => {
    if (!brief.id || briefRetryMutation.isPending) return;

    try {
      await briefRetryMutation.mutateAsync(brief.id);
    } catch (error) {
      // Error handling is done in the mutation
      console.error('Brief retry failed:', error);
    }
  };

  const formatMarkdown = (content: string) => {
    // Clean the content first - strip code block wrappers from N8N
    let cleanContent = content
      // Remove leading/trailing ```markdown and ``` tags
      .replace(/^```markdown\s*\n?/i, '')
      .replace(/^```\s*\n?/i, '')
      .replace(/\n?\s*```\s*$/g, '')
      // Remove any other code block markers that might wrap the entire content
      .replace(/^```[\w]*\s*\n?/gm, '')
      .replace(/\n?\s*```\s*$/gm, '')
      // Clean up extra whitespace
      .trim();

    // Split content into lines for better processing
    const lines = cleanContent.split('\n');
    const processedLines: string[] = [];
    let inList = false;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      // Check if this is a list item
      const isListItem = /^[•\-\*]\s+(.+)$/.test(line.trim());
      
      if (isListItem) {
        // Start a list if we're not already in one
        if (!inList) {
          processedLines.push('<ul class="list-disc list-inside space-y-1 ml-4 mb-4">');
          inList = true;
        }
        
        // Extract the list item content (without the bullet)
        const listContent = line.trim().replace(/^[•\-\*]\s+/, '');
        processedLines.push(`<li class="text-sm leading-relaxed">${listContent}</li>`);
      } else {
        // Close the list if we were in one
        if (inList) {
          processedLines.push('</ul>');
          inList = false;
        }
        
        // Process non-list line
        if (line.trim() === '') {
          // Empty line - add spacing
          processedLines.push('');
        } else {
          processedLines.push(line);
        }
      }
    }
    
    // Close list if we ended while still in one
    if (inList) {
      processedLines.push('</ul>');
    }
    
    // Join back into single string
    let processed = processedLines.join('\n');
    
    // Enhanced markdown-to-HTML conversion
    return processed
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-6 mb-3">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-8 mb-4">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-10 mb-6">$1</h1>')
      
      // Citations - convert [number] to clickable references
      .replace(/\[(\d+)\]/g, '<sup><a href="#ref-$1" class="text-blue-600 hover:text-blue-800 underline text-xs font-medium cursor-pointer" onclick="event.preventDefault(); console.log(\'Citation $1 clicked\')" title="Citation $1">[$1]</a></sup>')
      
      // URLs - convert to clickable links
      .replace(/(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline break-all">$1</a>')
      
      // Email addresses
      .replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '<a href="mailto:$1" class="text-blue-600 hover:text-blue-800 underline">$1</a>')
      
      // Bold and italic
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      
      // Paragraph processing - handle double line breaks
      .replace(/\n\n+/g, '</p><p class="mb-4 text-sm leading-relaxed">')
      
      // Wrap remaining content in paragraphs
      .split('\n')
      .map(line => {
        const trimmed = line.trim();
        // Skip empty lines, headers, lists, and already processed HTML
        if (!trimmed || 
            trimmed.startsWith('<h') || 
            trimmed.startsWith('<ul') || 
            trimmed.startsWith('</ul>') ||
            trimmed.startsWith('<li') ||
            trimmed.startsWith('</p>') ||
            trimmed.startsWith('<p class=')) {
          return line;
        }
        return `<p class="mb-4 text-sm leading-relaxed">${trimmed}</p>`;
      })
      .join('\n')
      
      // Clean up empty paragraphs and extra spacing
      .replace(/<p class="mb-4 text-sm leading-relaxed"><\/p>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  if (compact) {
    return (
      <div className={cn("border rounded-lg p-4 hover:bg-muted/50 transition-colors", className)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn("p-2 rounded-lg", statusInfo.bgColor)}>
              <statusInfo.icon className={cn("h-4 w-4", statusInfo.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate mb-1">{brief.title}</h4>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  {brief.content_type?.replace('_', ' ')}
                </Badge>
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", statusInfo.color)}
                >
                  {statusInfo.label}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleCopyContent}>
              {copied ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </Button>
            {onEdit && (
              <Button variant="ghost" size="sm" onClick={() => onEdit(brief)}>
                <Edit className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const hasContent = brief.brief_content || brief.requirements;
  const displayContent = brief.brief_content || brief.requirements || 'No content available yet.';

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn("p-3 rounded-lg", statusInfo.bgColor)}>
              <statusInfo.icon className={cn("h-5 w-5", statusInfo.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xl font-semibold leading-tight mb-2">
                {brief.title}
              </CardTitle>
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant="outline" className="text-sm">
                  <FileText className="h-3 w-3 mr-1" />
                  {brief.content_type?.replace('_', ' ')}
                </Badge>
                <Badge 
                  variant="outline" 
                  className={cn("text-sm", statusInfo.color)}
                >
                  <statusInfo.icon className="h-3 w-3 mr-1" />
                  {statusInfo.label}
                </Badge>
                {brief.target_audience && (
                  <Badge variant="secondary" className="text-sm">
                    {brief.target_audience}
                  </Badge>
                )}
              </div>
              
              {/* Generation timestamps */}
              {brief.generation_started_at && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>
                    Started: {new Date(brief.generation_started_at).toLocaleString()}
                  </span>
                  {brief.generation_completed_at && (
                    <span>
                      Completed: {new Date(brief.generation_completed_at).toLocaleString()}
                    </span>
                  )}
                </div>
              )}
              
              {/* Error message */}
              {brief.generation_status === 'failed' && brief.generation_error && (
                <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/10 rounded text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  {brief.generation_error}
                </div>
              )}
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {brief.generation_status === 'processing' && (
              <Button variant="outline" size="sm" disabled>
                <Brain className="h-4 w-4 mr-2 animate-pulse" />
                Generating...
              </Button>
            )}
            
            {brief.generation_status === 'failed' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRetry}
                disabled={briefRetryMutation.isPending}
                className="text-orange-600 hover:text-orange-700"
              >
                {briefRetryMutation.isPending ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Retry Generation
                  </>
                )}
              </Button>
            )}
            
            {hasContent && (
              <>
                <Button variant="outline" size="sm" onClick={handleCopyContent}>
                  {copied ? (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </>
            )}
            
            {onEdit && (
              <Button variant="outline" size="sm" onClick={() => onEdit(brief)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {hasContent ? (
          <ScrollArea className="h-[60vh] w-full">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              {brief.brief_content ? (
                // Render markdown content
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: formatMarkdown(brief.brief_content) 
                  }}
                  className="markdown-content"
                />
              ) : (
                // Fallback to requirements as plain text
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {brief.requirements}
                </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-3" />
            <h3 className="text-lg font-medium mb-1">No Content Available</h3>
            <p className="text-muted-foreground">
              {brief.generation_status === 'pending' 
                ? 'Content generation is pending...'
                : brief.generation_status === 'processing'
                ? 'Content is being generated...'
                : 'This brief doesn\'t have content yet.'
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}