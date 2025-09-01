import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Brain,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AISuggestions } from '@/types/content-creation';

interface AISuggestionsBadgeProps {
  suggestions?: AISuggestions;
  researchSummary?: string;
  className?: string;
  showIcon?: boolean;
  compact?: boolean;
}

export const AISuggestionsBadge: React.FC<AISuggestionsBadgeProps> = ({
  suggestions,
  researchSummary,
  className,
  showIcon = true,
  compact = false
}) => {
  const suggestionsCount = suggestions?.suggestions?.length || 0;
  const hasResearch = !!researchSummary;
  
  // If neither suggestions nor research summary exist, don't render anything
  if (!suggestionsCount && !hasResearch) {
    return null;
  }

  // Show both indicators in compact mode
  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {suggestionsCount > 0 && (
          <Badge variant="secondary" className="flex items-center gap-1 text-xs">
            {showIcon && <Brain className="h-3 w-3" />}
            {suggestionsCount}
          </Badge>
        )}
        {hasResearch && (
          <Badge variant="outline" className="flex items-center gap-1 text-xs">
            {showIcon && <TrendingUp className="h-3 w-3" />}
            R
          </Badge>
        )}
      </div>
    );
  }

  // Full display mode
  if (suggestionsCount > 0 && hasResearch) {
    return (
      <Badge 
        variant="default" 
        className={cn("flex items-center gap-1 text-xs", className)}
      >
        {showIcon && <Brain className="h-3 w-3" />}
        {suggestionsCount} AI + Research
      </Badge>
    );
  }

  if (suggestionsCount > 0) {
    return (
      <Badge 
        variant="secondary" 
        className={cn("flex items-center gap-1 text-xs", className)}
      >
        {showIcon && <Brain className="h-3 w-3" />}
        {suggestionsCount} AI Suggestion{suggestionsCount !== 1 ? 's' : ''}
      </Badge>
    );
  }

  if (hasResearch) {
    return (
      <Badge 
        variant="outline" 
        className={cn("flex items-center gap-1 text-xs", className)}
      >
        {showIcon && <TrendingUp className="h-3 w-3" />}
        Research Available
      </Badge>
    );
  }

  return null;
};

// Individual badges for more specific use cases
export const AISuggestionsCountBadge: React.FC<{
  count: number;
  className?: string;
  variant?: 'default' | 'secondary' | 'outline';
}> = ({ count, className, variant = 'secondary' }) => {
  if (count === 0) return null;

  return (
    <Badge 
      variant={variant}
      className={cn("flex items-center gap-1 text-xs", className)}
    >
      <Brain className="h-3 w-3" />
      {count}
    </Badge>
  );
};

export const ResearchSummaryBadge: React.FC<{
  hasResearch: boolean;
  className?: string;
  variant?: 'default' | 'secondary' | 'outline';
}> = ({ hasResearch, className, variant = 'outline' }) => {
  if (!hasResearch) return null;

  return (
    <Badge 
      variant={variant}
      className={cn("flex items-center gap-1 text-xs", className)}
    >
      <TrendingUp className="h-3 w-3" />
      Research
    </Badge>
  );
};

export const AIProcessingStatusBadge: React.FC<{
  isProcessing?: boolean;
  hasAIData?: boolean;
  className?: string;
}> = ({ isProcessing, hasAIData, className }) => {
  if (isProcessing) {
    return (
      <Badge 
        variant="secondary" 
        className={cn("flex items-center gap-1 text-xs", className)}
      >
        <Clock className="h-3 w-3 animate-pulse" />
        AI Processing...
      </Badge>
    );
  }

  if (hasAIData) {
    return (
      <Badge 
        variant="default" 
        className={cn("flex items-center gap-1 text-xs", className)}
      >
        <CheckCircle className="h-3 w-3" />
        AI Complete
      </Badge>
    );
  }

  return null;
};