import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Brain, 
  ChevronDown, 
  ChevronUp, 
  Target, 
  Tag, 
  TrendingUp,
  Lightbulb,
  Clock
} from 'lucide-react';
import type { AISuggestions, AISuggestion } from '@/types/content-creation';
import { AISuggestionsBadge } from './AISuggestionsBadge';

interface ContentSuggestionsProps {
  suggestions?: AISuggestions;
  researchSummary?: string;
  isLoading?: boolean;
  showCompact?: boolean;
}

export function ContentSuggestions({ 
  suggestions, 
  researchSummary, 
  isLoading = false,
  showCompact = false 
}: ContentSuggestionsProps) {
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<number>>(new Set());
  const [showResearchSummary, setShowResearchSummary] = useState(!showCompact);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-500 animate-pulse" />
            Processing Content Suggestions...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-muted animate-pulse rounded" />
            <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
            <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!suggestions?.suggestions?.length && !researchSummary) {
    return null;
  }

  const toggleSuggestionExpanded = (index: number) => {
    const newExpanded = new Set(expandedSuggestions);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSuggestions(newExpanded);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  if (showCompact) {
    return (
      <AISuggestionsBadge
        suggestions={suggestions}
        researchSummary={researchSummary}
        compact={true}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Research Summary Section */}
      {researchSummary && (
        <Card>
          <Collapsible open={showResearchSummary} onOpenChange={setShowResearchSummary}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    Research Summary
                  </div>
                  {showResearchSummary ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {researchSummary}
                </p>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* AI Suggestions Section */}
      {suggestions?.suggestions?.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-500" />
                Content Suggestions ({suggestions.suggestions.length})
              </div>
              {suggestions.generated_at && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(suggestions.generated_at).toLocaleDateString()}
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {suggestions.suggestions.map((suggestion: AISuggestion, index: number) => (
              <Card key={index} className="border-l-4 border-l-purple-500">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate pr-2">{suggestion.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {suggestion.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <div className="flex items-center gap-1">
                        <div 
                          className={`w-2 h-2 rounded-full ${getConfidenceColor(suggestion.confidence)}`}
                          title={`Confidence: ${Math.round(suggestion.confidence * 100)}%`}
                        />
                        <span className="text-xs text-muted-foreground">
                          {getConfidenceLabel(suggestion.confidence)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Keywords and Target Audience */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {suggestion.target_audience && (
                      <Badge variant="outline" className="text-xs">
                        <Target className="h-3 w-3 mr-1" />
                        {suggestion.target_audience}
                      </Badge>
                    )}
                    {suggestion.keywords?.slice(0, 3).map((keyword, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        <Tag className="h-3 w-3 mr-1" />
                        {keyword}
                      </Badge>
                    ))}
                    {suggestion.keywords && suggestion.keywords.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{suggestion.keywords.length - 3} more
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                {/* Expandable Reasoning Section */}
                {suggestion.reasoning && (
                  <Collapsible 
                    open={expandedSuggestions.has(index)} 
                    onOpenChange={() => toggleSuggestionExpanded(index)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full justify-between h-8 px-4 border-t"
                      >
                        <span className="flex items-center gap-1 text-xs">
                          <Lightbulb className="h-3 w-3" />
                          Reasoning
                        </span>
                        {expandedSuggestions.has(index) ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-3">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {suggestion.reasoning}
                        </p>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </Card>
            ))}

            {/* Processing Metadata */}
            {suggestions.processing_metadata && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                {suggestions.processing_metadata.processing_time && (
                  <span>
                    Processing Time: {suggestions.processing_metadata.processing_time}ms
                  </span>
                )}
                {suggestions.processing_metadata.model_used && (
                  <span>
                    Model: {suggestions.processing_metadata.model_used}
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}