// Content Creation Hooks - Phase 2: Data Layer
// Barrel exports for all content creation React Query hooks

// Query key factories
export * from './queryKeys';

// Content Ideas hooks
export * from './useContentIdeas';

// Content Briefs hooks  
export * from './useContentBriefs';

// Content Items hooks
export * from './useContentItems';

// Content Idea Extraction hooks
export * from './useContentIdeaExtraction';

// Auto Generate Ideas hooks
export * from './useAutoGenerateIdeas';

// Brief Generation hooks
export * from './useBriefGeneration';

// Content Generation hooks
export * from './useContentGeneration';

// Re-export common types for convenience
export type {
  ContentIdea,
  ContentBrief,  
  ContentItem,
  ContentIdeaWithDetails,
  ContentBriefWithDetails,
  ContentItemWithDetails,
  CreateContentIdeaInput,
  UpdateContentIdeaInput,
  CreateContentBriefInput,
  UpdateContentBriefInput,
  CreateContentItemInput,
  UpdateContentItemInput,
  ContentIdeaFilters,
  ContentBriefFilters,
  ContentItemFilters,
  PaginationParams,
  PaginatedResponse,
} from '@/types/content-creation';