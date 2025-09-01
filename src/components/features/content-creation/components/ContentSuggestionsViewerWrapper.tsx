import React, { useState } from 'react';
import { ContentSuggestionsViewer } from './ContentSuggestionsViewer';
import type { ContentIdeaWithDetails, AISuggestions, AISuggestion } from '@/types/content-creation';

interface ContentSuggestionsViewerWrapperProps {
  idea: ContentIdeaWithDetails;
  suggestions?: AISuggestions;
  researchSummary?: string;
  onUse?: (suggestion: AISuggestion) => void;
  onCreateBrief?: (suggestion: AISuggestion) => void;
  onViewBrief?: (briefId: string) => void;
  children: React.ReactNode;
}

export function ContentSuggestionsViewerWrapper({
  idea,
  suggestions,
  researchSummary,
  onUse,
  onCreateBrief,
  onViewBrief,
  children
}: ContentSuggestionsViewerWrapperProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ContentSuggestionsViewer
      idea={idea}
      suggestions={suggestions}
      researchSummary={researchSummary}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      onUse={onUse}
      onCreateBrief={onCreateBrief}
      onViewBrief={onViewBrief}
    >
      {children}
    </ContentSuggestionsViewer>
  );
}