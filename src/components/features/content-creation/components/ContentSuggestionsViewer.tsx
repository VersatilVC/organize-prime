import React, { useState } from 'react';
import { 
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Brain,
  TrendingUp,
  X,
  Lightbulb,
  FileText,
  Download,
  Share,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AISuggestions, AISuggestion, ContentIdeaWithDetails } from '@/types/content-creation';
import { SuggestionCard } from './SuggestionCard';
import { EnhancedSuggestionCard } from './EnhancedSuggestionCard';
import { ResearchSummaryDisplay } from './ResearchSummaryDisplay';
import { useEnhancedSuggestions } from '@/hooks/content-creation';
import { toast } from 'sonner';

interface ContentSuggestionsViewerProps {
  idea: ContentIdeaWithDetails;
  suggestions?: AISuggestions;
  researchSummary?: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUse?: (suggestion: AISuggestion) => void;
  onCreateBrief?: (suggestion: AISuggestion) => void;
  onViewBrief?: (briefId: string) => void;
  children?: React.ReactNode;
}

export function ContentSuggestionsViewer({
  idea,
  suggestions,
  researchSummary,
  isOpen,
  onOpenChange,
  onUse,
  onCreateBrief,
  onViewBrief,
  children
}: ContentSuggestionsViewerProps) {
  const [activeTab, setActiveTab] = useState<'suggestions' | 'research'>('suggestions');

  // Get enhanced suggestions with brief generation status
  const { data: enhancedSuggestions, isLoading: isLoadingEnhanced } = useEnhancedSuggestions(
    idea,
    suggestions?.suggestions || null
  );

  const suggestionsCount = suggestions?.suggestions?.length || 0;
  const hasResearch = !!researchSummary;

  // Auto-switch to research tab if no suggestions but has research
  React.useEffect(() => {
    if (!suggestionsCount && hasResearch) {
      setActiveTab('research');
    }
  }, [suggestionsCount, hasResearch]);

  const handleExport = async () => {
    try {
      const exportData = {
        idea: {
          title: idea.title,
          description: idea.description,
          target_audience: idea.target_audience,
          content_type: idea.content_type,
          keywords: idea.keywords
        },
        suggestions: suggestions?.suggestions || [],
        researchSummary: researchSummary || '',
        generatedAt: suggestions?.generated_at || new Date().toISOString(),
        processingMetadata: suggestions?.processing_metadata
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `content-idea-${idea.title.toLowerCase().replace(/\s+/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Content idea exported successfully');
    } catch (error) {
      toast.error('Failed to export content idea');
    }
  };

  const handleShare = async () => {
    try {
      const shareText = `Content Idea: ${idea.title}\n\n${idea.description}\n\nContent Suggestions: ${suggestionsCount}\nResearch: ${hasResearch ? 'Available' : 'Not available'}`;
      
      if (navigator.share) {
        await navigator.share({
          title: `Content Idea: ${idea.title}`,
          text: shareText,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast.success('Content idea copied to clipboard');
      }
    } catch (error) {
      toast.error('Failed to share content idea');
    }
  };

  const getTabLabel = (tab: 'suggestions' | 'research') => {
    if (tab === 'suggestions') {
      return (
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4" />
          <span>Content Suggestions</span>
          {suggestionsCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {suggestionsCount}
            </Badge>
          )}
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4" />
        <span>Research</span>
        {hasResearch && (
          <Badge variant="outline" className="ml-1">
            Available
          </Badge>
        )}
      </div>
    );
  };

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      {children && (
        <DrawerTrigger asChild>
          {children}
        </DrawerTrigger>
      )}
      <DrawerContent className="max-h-[90vh]">
        <div className="mx-auto w-full max-w-6xl">
          <DrawerHeader className="border-b">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <DrawerTitle className="text-xl font-semibold text-left mb-2">
                  {idea.title}
                </DrawerTitle>
                <DrawerDescription className="text-left text-muted-foreground mb-3">
                  {idea.description}
                </DrawerDescription>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">
                    <FileText className="h-3 w-3 mr-1" />
                    {idea.content_type?.replace('_', ' ')}
                  </Badge>
                  {idea.target_audience && (
                    <Badge variant="secondary">
                      {idea.target_audience}
                    </Badge>
                  )}
                  {idea.keywords?.slice(0, 3).map((keyword, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                  {idea.keywords && idea.keywords.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{idea.keywords.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                >
                  <Share className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <DrawerClose asChild>
                  <Button variant="outline" size="sm">
                    <X className="h-4 w-4" />
                  </Button>
                </DrawerClose>
              </div>
            </div>
          </DrawerHeader>

          <div className="p-6">
            {(suggestionsCount > 0 || hasResearch) ? (
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger 
                    value="suggestions" 
                    disabled={suggestionsCount === 0}
                    className="flex items-center gap-2"
                  >
                    {getTabLabel('suggestions')}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="research" 
                    disabled={!hasResearch}
                    className="flex items-center gap-2"
                  >
                    {getTabLabel('research')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="suggestions" className="space-y-4">
                  {suggestionsCount > 0 ? (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Brain className="h-5 w-5 text-purple-500" />
                          <h3 className="text-lg font-semibold">AI Content Suggestions</h3>
                          <Badge variant="secondary">{suggestionsCount} suggestions</Badge>
                        </div>
                        {suggestions?.generated_at && (
                          <div className="text-sm text-muted-foreground">
                            Generated {new Date(suggestions.generated_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                      
                      <ScrollArea className="h-[50vh]">
                        <div className="space-y-4">
                          {isLoadingEnhanced ? (
                            // Show loading skeleton while fetching enhanced data
                            suggestions!.suggestions.map((suggestion, index) => (
                              <SuggestionCard
                                key={index}
                                suggestion={suggestion}
                                index={index}
                                onUse={onUse}
                                onCreateBrief={onCreateBrief}
                              />
                            ))
                          ) : enhancedSuggestions ? (
                            // Show enhanced suggestions with brief status
                            enhancedSuggestions.map((suggestion, index) => (
                              <EnhancedSuggestionCard
                                key={index}
                                suggestion={suggestion}
                                idea={idea}
                                index={index}
                                onUse={onUse}
                                onViewBrief={onViewBrief}
                              />
                            ))
                          ) : (
                            // Fallback to regular suggestions
                            suggestions!.suggestions.map((suggestion, index) => (
                              <SuggestionCard
                                key={index}
                                suggestion={suggestion}
                                index={index}
                                onUse={onUse}
                                onCreateBrief={onCreateBrief}
                              />
                            ))
                          )}
                        </div>
                      </ScrollArea>

                      {suggestions?.processing_metadata && (
                        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Processing Time: {suggestions.processing_metadata.processing_time}ms</span>
                            {suggestions.processing_metadata.model_used && (
                              <span>Model: {suggestions.processing_metadata.model_used}</span>
                            )}
                            {suggestions.processing_metadata.confidence_threshold && (
                              <span>Confidence Threshold: {Math.round(suggestions.processing_metadata.confidence_threshold * 100)}%</span>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-center">
                      <Lightbulb className="h-12 w-12 text-muted-foreground mb-3" />
                      <h3 className="text-lg font-medium mb-1">No Content Suggestions Available</h3>
                      <p className="text-muted-foreground">
                        AI suggestions haven't been generated for this content idea yet.
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="research">
                  {hasResearch ? (
                    <ScrollArea className="h-[55vh]">
                      <ResearchSummaryDisplay
                        researchSummary={researchSummary!}
                        generatedAt={suggestions?.generated_at}
                        defaultExpanded={true}
                      />
                    </ScrollArea>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-center">
                      <TrendingUp className="h-12 w-12 text-muted-foreground mb-3" />
                      <h3 className="text-lg font-medium mb-1">No Research Summary Available</h3>
                      <p className="text-muted-foreground">
                        Research summary hasn't been generated for this content idea yet.
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex flex-col items-center justify-center h-60 text-center">
                <Sparkles className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No AI Content Available</h3>
                <p className="text-muted-foreground mb-4">
                  This content idea doesn't have any AI-generated suggestions or research yet.
                </p>
                <Button variant="outline">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate AI Content
                </Button>
              </div>
            )}
          </div>

          <DrawerFooter className="border-t">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {suggestionsCount > 0 && hasResearch && (
                  <span>Content includes {suggestionsCount} AI suggestions and research summary</span>
                )}
                {suggestionsCount > 0 && !hasResearch && (
                  <span>Content includes {suggestionsCount} AI suggestions</span>
                )}
                {!suggestionsCount && hasResearch && (
                  <span>Content includes research summary</span>
                )}
              </div>
              <DrawerClose asChild>
                <Button variant="outline">Close</Button>
              </DrawerClose>
            </div>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}