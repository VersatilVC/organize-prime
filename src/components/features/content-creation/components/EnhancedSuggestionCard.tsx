import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Brain,
  Target,
  Tag,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Copy,
  CheckCircle,
  FileText,
  Sparkles,
  TrendingUp,
  Clock,
  AlertCircle,
  RotateCcw,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AISuggestion, ContentIdeaWithDetails } from '@/types/content-creation';
import { useBriefGeneration, useBriefGenerationRetry, type EnhancedAISuggestion } from '@/hooks/content-creation';
import { toast } from 'sonner';

interface EnhancedSuggestionCardProps {
  suggestion: EnhancedAISuggestion;
  idea: ContentIdeaWithDetails;
  index: number;
  className?: string;
  showActions?: boolean;
  onUse?: (suggestion: AISuggestion) => void;
  onViewBrief?: (briefId: string) => void;
  compact?: boolean;
}

export function EnhancedSuggestionCard({
  suggestion,
  idea,
  index,
  className,
  showActions = true,
  onUse,
  onViewBrief,
  compact = false
}: EnhancedSuggestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Brief generation mutations
  const briefGenerationMutation = useBriefGeneration({
    onSuccess: (briefId) => {
      console.log('✅ Brief generation started for:', briefId);
    }
  });

  const briefRetryMutation = useBriefGenerationRetry({
    onSuccess: (briefId) => {
      console.log('✅ Brief generation retry started for:', briefId);
    }
  });

  const getConfidenceLevel = (confidence: number): {
    level: string;
    color: string;
    bgColor: string;
    progressColor: string;
  } => {
    if (confidence >= 0.8) {
      return {
        level: 'High',
        color: 'text-green-700 dark:text-green-300',
        bgColor: 'bg-green-100 dark:bg-green-900/20',
        progressColor: 'bg-green-500'
      };
    }
    if (confidence >= 0.6) {
      return {
        level: 'Medium',
        color: 'text-yellow-700 dark:text-yellow-300',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
        progressColor: 'bg-yellow-500'
      };
    }
    return {
      level: 'Low',
      color: 'text-orange-700 dark:text-orange-300',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20',
      progressColor: 'bg-orange-500'
    };
  };

  const getBriefStatusInfo = () => {
    switch (suggestion.briefStatus) {
      case 'pending':
        return {
          icon: Clock,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100 dark:bg-blue-900/20',
          label: 'Queued for AI',
          showPulse: true
        };
      case 'processing':
        return {
          icon: Brain,
          color: 'text-purple-600',
          bgColor: 'bg-purple-100 dark:bg-purple-900/20',
          label: 'AI Writing Brief...',
          showPulse: true
        };
      case 'completed':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-100 dark:bg-green-900/20',
          label: 'Completed'
        };
      case 'failed':
        return {
          icon: AlertCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-100 dark:bg-red-900/20',
          label: 'Failed'
        };
      default:
        return null;
    }
  };

  const confidenceInfo = getConfidenceLevel(suggestion.confidence);
  const confidencePercentage = Math.round(suggestion.confidence * 100);
  const briefStatusInfo = getBriefStatusInfo();

  const handleCopy = async () => {
    try {
      const text = `Title: ${suggestion.title}\n\nDescription: ${suggestion.description}\n\nReasoning: ${suggestion.reasoning}\n\nConfidence: ${confidencePercentage}%\n\nKeywords: ${suggestion.keywords?.join(', ') || 'None'}\n\nTarget Audience: ${suggestion.target_audience || 'Not specified'}`;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Suggestion copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleGenerateBrief = async () => {
    if (briefGenerationMutation.isPending) return;

    try {
      await briefGenerationMutation.mutateAsync({
        idea,
        suggestion
      });
    } catch (error) {
      // Error handling is done in the mutation
      console.error('Brief generation failed:', error);
    }
  };

  const handleRetryBrief = async () => {
    if (!suggestion.briefId || briefRetryMutation.isPending) return;

    try {
      await briefRetryMutation.mutateAsync(suggestion.briefId);
    } catch (error) {
      // Error handling is done in the mutation
      console.error('Brief retry failed:', error);
    }
  };

  const handleViewBrief = () => {
    if (suggestion.briefId && onViewBrief) {
      onViewBrief(suggestion.briefId);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={cn("p-2 rounded-full", confidenceInfo.bgColor)}>
            <Brain className={cn("h-4 w-4", confidenceInfo.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{suggestion.title}</h4>
            <p className="text-xs text-muted-foreground truncate">
              {suggestion.description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {confidencePercentage}%
          </Badge>
          {briefStatusInfo && (
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs flex items-center gap-1", 
                briefStatusInfo.color,
                briefStatusInfo.showPulse && "animate-pulse"
              )}
            >
              <briefStatusInfo.icon className={cn("h-3 w-3", briefStatusInfo.showPulse && "animate-spin")} />
              {briefStatusInfo.label}
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            {copied ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn(
      "w-full border-l-4 transition-all duration-200 hover:shadow-md",
      confidenceInfo.bgColor.replace('bg-', 'border-l-'),
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn("p-2 rounded-lg shrink-0", confidenceInfo.bgColor)}>
              <Brain className={cn("h-5 w-5", confidenceInfo.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold leading-tight mb-2">
                {suggestion.title}
              </CardTitle>
              <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
                {suggestion.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge 
              variant="outline" 
              className={cn("text-xs font-medium", confidenceInfo.color)}
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              {confidenceInfo.level}
            </Badge>
            {briefStatusInfo && (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs flex items-center gap-1", 
                  briefStatusInfo.color,
                  briefStatusInfo.showPulse && "animate-pulse"
                )}
              >
                <briefStatusInfo.icon className={cn("h-3 w-3", briefStatusInfo.showPulse && "animate-spin")} />
                {briefStatusInfo.label}
              </Badge>
            )}
          </div>
        </div>

        {/* Confidence Progress Bar */}
        <div className="space-y-2 mt-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Confidence Score</span>
            <span className={cn("font-medium", confidenceInfo.color)}>
              {confidencePercentage}%
            </span>
          </div>
          <div className="relative">
            <Progress 
              value={confidencePercentage} 
              className="h-2"
            />
            <div 
              className={cn("absolute top-0 left-0 h-2 rounded-full transition-all", confidenceInfo.progressColor)}
              style={{ width: `${confidencePercentage}%` }}
            />
          </div>
        </div>

        {/* Keywords and Target Audience */}
        <div className="flex flex-wrap gap-2 mt-3">
          {suggestion.target_audience && (
            <Badge variant="outline" className="text-xs">
              <Target className="h-3 w-3 mr-1" />
              {suggestion.target_audience}
            </Badge>
          )}
          {suggestion.keywords?.slice(0, 4).map((keyword, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              <Tag className="h-3 w-3 mr-1" />
              {keyword}
            </Badge>
          ))}
          {suggestion.keywords && suggestion.keywords.length > 4 && (
            <Badge variant="secondary" className="text-xs">
              +{suggestion.keywords.length - 4} more
            </Badge>
          )}
        </div>
      </CardHeader>

      {/* Expandable Reasoning Section */}
      {suggestion.reasoning && (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-between h-10 px-6 border-t hover:bg-muted/50"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <Lightbulb className="h-4 w-4" />
                Reasoning
              </span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-3 pb-0">
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {suggestion.reasoning}
                </p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Action Buttons */}
      {showActions && (
        <CardFooter className="pt-3 border-t">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleCopy}
                className="text-xs"
              >
                {copied ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <Copy className="h-3 w-3 mr-1" />
                )}
                Copy
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {/* Brief Generation Actions */}
              {!suggestion.hasBrief && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleGenerateBrief}
                  disabled={briefGenerationMutation.isPending}
                  className="text-xs"
                >
                  {briefGenerationMutation.isPending ? (
                    <>
                      <Clock className="h-3 w-3 mr-1 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="h-3 w-3 mr-1" />
                      Create Brief
                    </>
                  )}
                </Button>
              )}

              {suggestion.briefStatus === 'failed' && suggestion.briefId && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRetryBrief}
                  disabled={briefRetryMutation.isPending}
                  className="text-xs text-orange-600 hover:text-orange-700"
                >
                  {briefRetryMutation.isPending ? (
                    <>
                      <Clock className="h-3 w-3 mr-1 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Retry
                    </>
                  )}
                </Button>
              )}

              {suggestion.briefStatus === 'completed' && suggestion.briefId && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleViewBrief}
                  className="text-xs text-green-600 hover:text-green-700"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View Brief
                </Button>
              )}

              {suggestion.briefStatus === 'processing' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled
                  className="text-xs"
                >
                  <Brain className="h-3 w-3 mr-1 animate-pulse" />
                  Generating...
                </Button>
              )}

              {onUse && (
                <Button 
                  size="sm" 
                  onClick={() => onUse(suggestion)}
                  className="text-xs"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Use This
                </Button>
              )}
            </div>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}