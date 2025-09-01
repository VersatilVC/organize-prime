import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  FileText,
  Clock,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ResearchSummaryDisplayProps {
  researchSummary: string;
  generatedAt?: string;
  className?: string;
  showActions?: boolean;
  defaultExpanded?: boolean;
  compact?: boolean;
}

export function ResearchSummaryDisplay({
  researchSummary,
  generatedAt,
  className,
  showActions = true,
  defaultExpanded = false,
  compact = false
}: ResearchSummaryDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(researchSummary);
      setCopied(true);
      toast.success('Research summary copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).length;
  };

  const getEstimatedReadTime = (text: string) => {
    const wordsPerMinute = 200;
    const words = getWordCount(text);
    const minutes = Math.ceil(words / wordsPerMinute);
    return minutes;
  };

  if (compact) {
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <TrendingUp className="h-3 w-3" />
        Research ({getWordCount(researchSummary)} words)
      </Badge>
    );
  }

  const customComponents = {
    h1: ({ children }: any) => (
      <h1 className="text-2xl font-bold text-foreground mt-6 mb-4 pb-2 border-b">
        {children}
      </h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="text-xl font-semibold text-foreground mt-5 mb-3">
        {children}
      </h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-lg font-medium text-foreground mt-4 mb-2">
        {children}
      </h3>
    ),
    p: ({ children }: any) => (
      <p className="text-muted-foreground leading-relaxed mb-3">
        {children}
      </p>
    ),
    ul: ({ children }: any) => (
      <ul className="list-disc pl-6 mb-3 space-y-1">
        {children}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol className="list-decimal pl-6 mb-3 space-y-1">
        {children}
      </ol>
    ),
    li: ({ children }: any) => (
      <li className="text-muted-foreground">
        {children}
      </li>
    ),
    strong: ({ children }: any) => (
      <strong className="font-semibold text-foreground">
        {children}
      </strong>
    ),
    em: ({ children }: any) => (
      <em className="italic text-muted-foreground">
        {children}
      </em>
    ),
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-blue-500 pl-4 italic text-muted-foreground bg-muted/30 p-3 rounded-r-md mb-3">
        {children}
      </blockquote>
    ),
    code: ({ children, className }: any) => {
      const isInline = !className;
      if (isInline) {
        return (
          <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
            {children}
          </code>
        );
      }
      return (
        <pre className="bg-muted p-4 rounded-md overflow-x-auto mb-3">
          <code className="text-sm font-mono">{children}</code>
        </pre>
      );
    },
    hr: () => <hr className="border-muted-foreground/20 my-6" />
  };

  return (
    <Card className={cn("w-full", className)}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex flex-col items-start gap-1">
                  <span className="text-lg font-semibold">Research Summary</span>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {getWordCount(researchSummary)} words
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {getEstimatedReadTime(researchSummary)} min read
                    </span>
                    {generatedAt && (
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        {new Date(generatedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {showActions && (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className="h-8 w-8 p-0"
                      title="Copy to clipboard"
                    >
                      {copied ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowRaw(!showRaw)}
                      className="h-8 w-8 p-0"
                      title={showRaw ? "Show formatted" : "Show raw text"}
                    >
                      {showRaw ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {showRaw ? (
              <pre className="whitespace-pre-wrap text-sm text-muted-foreground bg-muted p-4 rounded-md overflow-auto max-h-96">
                {researchSummary}
              </pre>
            ) : (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={customComponents}
                >
                  {researchSummary}
                </ReactMarkdown>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}