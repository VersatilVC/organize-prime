import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Copy, 
  CheckCircle, 
  Download, 
  Eye, 
  FileText,
  ExternalLink,
  Edit,
  Save,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import remarkGfm from 'remark-gfm';

interface MarkdownViewerProps {
  content: string;
  title?: string;
  className?: string;
  maxHeight?: string;
  showActions?: boolean;
  compact?: boolean;
}

interface MarkdownModalProps {
  content: string;
  title: string;
  trigger: React.ReactNode;
  fileName?: string;
  editable?: boolean;
  onSave?: (content: string) => void;
}

export function MarkdownModal({ content, title, trigger, fileName, editable = false, onSave }: MarkdownModalProps) {
  const [copied, setCopied] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editContent, setEditContent] = React.useState('');

  // Clean the content for the modal too
  const cleanContent = React.useMemo(() => {
    if (!content) return '';
    
    return content
      // Remove leading/trailing ```markdown and ``` tags
      .replace(/^```markdown\s*\n?/i, '')
      .replace(/^```\s*\n?/i, '')
      .replace(/\n?\s*```\s*$/g, '')
      // Remove any other code block markers that might wrap the entire content
      .replace(/^```[\w]*\s*\n?/gm, '')
      .replace(/\n?\s*```\s*$/gm, '')
      // Clean up extra whitespace
      .trim();
  }, [content]);

  // Initialize edit content when starting to edit
  React.useEffect(() => {
    if (isEditing && !editContent) {
      setEditContent(cleanContent);
    }
  }, [isEditing, cleanContent, editContent]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cleanContent);
      setCopied(true);
      toast.success('Content copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy content');
    }
  };

  const handleDownload = () => {
    try {
      const contentToDownload = isEditing ? editContent : cleanContent;
      const blob = new Blob([contentToDownload], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || `${title.toLowerCase().replace(/\s+/g, '-')}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Content downloaded successfully');
    } catch (error) {
      toast.error('Failed to download content');
    }
  };

  const handleSave = async () => {
    if (!onSave || !editContent.trim()) return;
    
    try {
      await onSave(editContent);
      setIsEditing(false);
      toast.success('Content saved successfully');
    } catch (error) {
      toast.error('Failed to save content');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(cleanContent);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-5xl h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {title}
              {isEditing && <Badge variant="secondary" className="ml-2">Editing</Badge>}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button variant="default" size="sm" onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={handleCopy}>
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
                  {editable && onSave && (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          {isEditing ? (
            <div className="h-full flex gap-4">
              <div className="w-1/2 flex flex-col">
                <h3 className="text-sm font-medium mb-2">Edit Content</h3>
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="flex-1 font-mono text-sm resize-none"
                  placeholder="Enter your markdown content..."
                />
              </div>
              <div className="w-1/2 flex flex-col">
                <h3 className="text-sm font-medium mb-2">Preview</h3>
                <div className="flex-1 border rounded-md p-4 overflow-hidden">
                  <ScrollArea className="h-full">
                    <MarkdownViewer 
                      content={editContent} 
                      showActions={false}
                      className="pr-4"
                    />
                  </ScrollArea>
                </div>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <MarkdownViewer 
                content={cleanContent} 
                className="pr-4"
                showActions={false}
              />
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MarkdownViewer({ 
  content, 
  title,
  className, 
  maxHeight = "60vh",
  showActions = true,
  compact = false
}: MarkdownViewerProps) {
  const [copied, setCopied] = React.useState(false);

  // Clean the content first - strip code block wrappers from N8N or other sources
  const cleanContent = React.useMemo(() => {
    if (!content) return '';
    
    return content
      // Remove leading/trailing ```markdown and ``` tags
      .replace(/^```markdown\s*\n?/i, '')
      .replace(/^```\s*\n?/i, '')
      .replace(/\n?\s*```\s*$/g, '')
      // Remove any other code block markers that might wrap the entire content
      .replace(/^```[\w]*\s*\n?/gm, '')
      .replace(/\n?\s*```\s*$/gm, '')
      // Clean up extra whitespace
      .trim();
  }, [content]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cleanContent);
      setCopied(true);
      toast.success('Content copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy content');
    }
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([cleanContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = title ? `${title.toLowerCase().replace(/\s+/g, '-')}.md` : 'content.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Content downloaded successfully');
    } catch (error) {
      toast.error('Failed to download content');
    }
  };

  if (!cleanContent) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-8 text-center border rounded-lg", className)}>
        <FileText className="h-12 w-12 text-muted-foreground mb-3" />
        <h3 className="text-lg font-medium mb-1">No Content Available</h3>
        <p className="text-muted-foreground">
          No markdown content to display
        </p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={cn("border rounded-lg p-4", className)}>
        {title && (
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-sm">{title}</h4>
            {showActions && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  {copied ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            )}
          </div>
        )}
        <div className="prose prose-sm max-w-none dark:prose-invert line-clamp-6">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    className="text-xs"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {cleanContent}
          </ReactMarkdown>
        </div>
        <div className="mt-2">
          <MarkdownModal
            content={cleanContent}
            title={title || 'Content'}
            trigger={
              <Button variant="ghost" size="sm" className="text-xs">
                <ExternalLink className="h-3 w-3 mr-1" />
                View Full Content
              </Button>
            }
            fileName={title ? `${title.toLowerCase().replace(/\s+/g, '-')}.md` : 'content.md'}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("", className)}>
      {(title || showActions) && (
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {title}
            </h3>
          )}
          {showActions && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
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
            </div>
          )}
        </div>
      )}
      
      <ScrollArea className={`w-full`} style={{ height: maxHeight }}>
        <div className="prose prose-sm max-w-none dark:prose-invert pr-4">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
              table({ children }) {
                return (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">{children}</table>
                  </div>
                );
              },
              th({ children }) {
                return (
                  <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 bg-gray-100 dark:bg-gray-800 font-semibold text-left">
                    {children}
                  </th>
                );
              },
              td({ children }) {
                return (
                  <td className="border border-gray-300 dark:border-gray-600 px-3 py-2">
                    {children}
                  </td>
                );
              },
            }}
          >
            {cleanContent}
          </ReactMarkdown>
        </div>
      </ScrollArea>
    </div>
  );
}

interface ContentStructureViewerProps {
  content: string;
  contentTypeName: string;
  className?: string;
}

export function ContentStructureViewer({ content, contentTypeName, className }: ContentStructureViewerProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 mb-4">
        <Badge variant="secondary" className="text-sm">
          <FileText className="h-3 w-3 mr-1" />
          Content Structure
        </Badge>
        <span className="text-sm text-muted-foreground">from {contentTypeName}</span>
      </div>
      
      <MarkdownViewer 
        content={content}
        title="Content Structure"
        showActions={true}
      />
    </div>
  );
}