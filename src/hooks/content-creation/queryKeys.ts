// Content Creation Query Keys - Phase 2: Data Layer
// Query key factories for React Query cache management

import type {
  ContentIdeaFilters,
  ContentBriefFilters,
  ContentItemFilters,
  PaginationParams
} from '@/types/content-creation';

/**
 * Query key factory for content creation features
 * Follows the pattern: [scope, entity, ...identifiers, ...filters]
 * 
 * Examples:
 * ['content-creation', 'ideas'] - All ideas
 * ['content-creation', 'ideas', { status: 'draft' }] - Filtered ideas
 * ['content-creation', 'ideas', 'detail', ideaId] - Single idea detail
 */
export const contentCreationKeys = {
  // Root scope
  all: ['content-creation'] as const,
  
  // ========== CONTENT IDEAS ==========
  ideas: () => [...contentCreationKeys.all, 'ideas'] as const,
  ideasList: (filters?: ContentIdeaFilters, pagination?: PaginationParams) =>
    [...contentCreationKeys.ideas(), { filters, pagination }] as const,
  ideaDetail: (ideaId: string) => 
    [...contentCreationKeys.ideas(), 'detail', ideaId] as const,
  ideaBriefs: (ideaId: string) =>
    [...contentCreationKeys.ideas(), 'briefs', ideaId] as const,
  ideaExtractionStatus: (ideaId: string) =>
    [...contentCreationKeys.ideas(), 'extraction-status', ideaId] as const,

  // ========== CONTENT BRIEFS ==========
  briefs: () => [...contentCreationKeys.all, 'briefs'] as const,
  briefsList: (filters?: ContentBriefFilters, pagination?: PaginationParams) =>
    [...contentCreationKeys.briefs(), { filters, pagination }] as const,
  briefDetail: (briefId: string) =>
    [...contentCreationKeys.briefs(), 'detail', briefId] as const,
  briefItems: (briefId: string) =>
    [...contentCreationKeys.briefs(), 'items', briefId] as const,

  // ========== CONTENT GENERATION ==========
  generation: () => [...contentCreationKeys.all, 'generation'] as const,
  generationStatus: (briefId: string) =>
    [...contentCreationKeys.generation(), 'status', briefId] as const,
  generatedItems: (briefId: string) =>
    [...contentCreationKeys.generation(), 'items', briefId] as const,
  generationStats: (organizationId?: string) =>
    [...contentCreationKeys.generation(), 'stats', organizationId] as const,

  // ========== CONTENT ITEMS ==========
  items: () => [...contentCreationKeys.all, 'items'] as const,
  itemsList: (filters?: ContentItemFilters, pagination?: PaginationParams) =>
    [...contentCreationKeys.items(), { filters, pagination }] as const,
  itemDetail: (itemId: string) =>
    [...contentCreationKeys.items(), 'detail', itemId] as const,
  itemDerivatives: (itemId: string) =>
    [...contentCreationKeys.items(), 'derivatives', itemId] as const,

  // ========== DROPDOWN OPTIONS ==========
  options: () => [...contentCreationKeys.all, 'options'] as const,
  contentTypes: () => [...contentCreationKeys.options(), 'content-types'] as const,
  targetAudiences: () => [...contentCreationKeys.options(), 'target-audiences'] as const,

  // ========== STATISTICS & ANALYTICS ==========
  stats: () => [...contentCreationKeys.all, 'stats'] as const,
  dashboardStats: () => [...contentCreationKeys.stats(), 'dashboard'] as const,
  statusCounts: () => [...contentCreationKeys.stats(), 'status-counts'] as const,

  // ========== WORKFLOW RELATIONSHIPS ==========
  relationships: () => [...contentCreationKeys.all, 'relationships'] as const,
  ideaWorkflow: (ideaId: string) =>
    [...contentCreationKeys.relationships(), 'idea-workflow', ideaId] as const,
  briefWorkflow: (briefId: string) =>
    [...contentCreationKeys.relationships(), 'brief-workflow', briefId] as const,

} as const;

/**
 * Utility functions for cache invalidation patterns
 */
export const contentCreationInvalidation = {
  // Invalidate all content creation data
  all: () => contentCreationKeys.all,
  
  // Invalidate all ideas-related data
  allIdeas: () => contentCreationKeys.ideas(),
  
  // Invalidate all briefs-related data
  allBriefs: () => contentCreationKeys.briefs(),
  
  // Invalidate all items-related data
  allItems: () => contentCreationKeys.items(),
  
  // Invalidate specific idea and related data
  ideaAndRelated: (ideaId: string) => [
    contentCreationKeys.ideaDetail(ideaId),
    contentCreationKeys.ideaBriefs(ideaId),
    contentCreationKeys.ideaExtractionStatus(ideaId),
    contentCreationKeys.ideas()
  ],
  
  // Invalidate specific brief and related data
  briefAndRelated: (briefId: string) => [
    contentCreationKeys.briefDetail(briefId),
    contentCreationKeys.briefItems(briefId),
    contentCreationKeys.briefs()
  ],
  
  // Invalidate specific item and related data
  itemAndRelated: (itemId: string) => [
    contentCreationKeys.itemDetail(itemId),
    contentCreationKeys.itemDerivatives(itemId),
    contentCreationKeys.items()
  ],
  
  // Invalidate options/dropdowns
  options: () => [
    contentCreationKeys.contentTypes(),
    contentCreationKeys.targetAudiences()
  ],
  
  // Invalidate statistics
  stats: () => [
    contentCreationKeys.dashboardStats(),
    contentCreationKeys.statusCounts()
  ]
} as const;

/**
 * Helper function to generate cache tags for easier debugging
 */
export const getCacheTag = (queryKey: readonly unknown[]): string => {
  return queryKey.map(key => 
    typeof key === 'object' ? JSON.stringify(key) : String(key)
  ).join(':');
};

/**
 * Utility to check if two query keys match for the same entity type
 */
export const isSameEntityType = (
  key1: readonly unknown[], 
  key2: readonly unknown[]
): boolean => {
  if (key1.length < 2 || key2.length < 2) return false;
  return key1[0] === key2[0] && key1[1] === key2[1];
};

/**
 * Extract entity ID from query key if present
 */
export const extractEntityId = (queryKey: readonly unknown[]): string | null => {
  // Look for 'detail' followed by an ID
  const detailIndex = queryKey.findIndex(key => key === 'detail');
  if (detailIndex !== -1 && queryKey[detailIndex + 1]) {
    return String(queryKey[detailIndex + 1]);
  }
  return null;
};

/**
 * Type-safe query key validation
 */
export const isContentCreationKey = (queryKey: readonly unknown[]): boolean => {
  return Array.isArray(queryKey) && queryKey[0] === 'content-creation';
};

/**
 * Get entity type from query key
 */
export const getEntityType = (queryKey: readonly unknown[]): string | null => {
  if (!isContentCreationKey(queryKey) || queryKey.length < 2) return null;
  return String(queryKey[1]);
};

// Export types for TypeScript support
export type ContentCreationQueryKey = ReturnType<
  typeof contentCreationKeys[keyof typeof contentCreationKeys]
>;

export type EntityType = 'ideas' | 'briefs' | 'items' | 'options' | 'stats' | 'relationships';