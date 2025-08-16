import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Clock,
  MessageSquare,
  Calendar,
  Filter,
  X,
  ChevronDown,
  Star,
  Bookmark,
  Hash,
  User,
  Bot,
  ArrowRight,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useChatSessions } from '../hooks/useChatSessions';
import { useToast } from '@/hooks/use-toast';

interface SearchFilters {
  dateRange: {
    start?: Date;
    end?: Date;
  };
  messageTypes: ('user' | 'assistant' | 'system')[];
  knowledgeBases: string[];
  hasBookmarks: boolean;
  minMessages: number;
  sortBy: 'relevance' | 'date' | 'messages' | 'title';
  sortOrder: 'desc' | 'asc';
}

interface SearchResult {
  type: 'conversation' | 'message';
  conversationId: string;
  conversationTitle: string;
  messageId?: string;
  messageContent?: string;
  messageType?: 'user' | 'assistant' | 'system';
  timestamp: string;
  relevanceScore: number;
  context?: {
    previousMessage?: string;
    nextMessage?: string;
  };
  knowledgeBases?: string[];
  messageCount?: number;
  isBookmarked?: boolean;
}

interface GlobalChatSearchProps {
  onSelectConversation: (conversationId: string, messageId?: string) => void;
  onSelectResult?: (result: SearchResult) => void;
  className?: string;
  placeholder?: string;
  showFilters?: boolean;
  maxResults?: number;
}

export function GlobalChatSearch({
  onSelectConversation,
  onSelectResult,
  className,
  placeholder = "Search conversations and messages...",
  showFilters = true,
  maxResults = 50
}: GlobalChatSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<SearchFilters>({
    dateRange: {},
    messageTypes: ['user', 'assistant'],
    knowledgeBases: [],
    hasBookmarks: false,
    minMessages: 0,
    sortBy: 'relevance',
    sortOrder: 'desc'
  });

  const { currentOrganization } = useOrganization();
  const { data: conversations } = useChatSessions();
  const { toast } = useToast();

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((query: string, filters: SearchFilters) => {
      performSearch(query, filters);
    }, 300),
    [conversations]
  );

  // Trigger search when query or filters change
  useEffect(() => {
    if (searchQuery.trim()) {
      setIsSearching(true);
      debouncedSearch(searchQuery, activeFilters);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery, activeFilters, debouncedSearch]);

  // Mock search function - in real implementation, this would call the backend
  const performSearch = async (query: string, filters: SearchFilters) => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));

      if (!conversations) {
        setSearchResults([]);
        return;
      }

      const results: SearchResult[] = [];
      const queryLower = query.toLowerCase();

      // Search through conversations and messages
      conversations.forEach(conversation => {
        // Check if conversation matches filters
        if (filters.minMessages > 0 && (conversation.message_count || 0) < filters.minMessages) {
          return;
        }

        if (filters.hasBookmarks && !conversation.is_bookmarked) {
          return;
        }

        // Title match
        if (conversation.title.toLowerCase().includes(queryLower)) {
          results.push({
            type: 'conversation',
            conversationId: conversation.id,
            conversationTitle: conversation.title,
            timestamp: conversation.updated_at || conversation.created_at,
            relevanceScore: calculateRelevanceScore(conversation.title, query),
            messageCount: conversation.message_count,
            isBookmarked: conversation.is_bookmarked,
            knowledgeBases: conversation.kb_ids
          });
        }

        // Mock message search within conversations
        // In real implementation, this would search the kb_messages table
        const mockMessages = generateMockMessages(conversation, query);
        mockMessages.forEach(message => {
          if (filters.messageTypes.includes(message.messageType!)) {
            results.push({
              type: 'message',
              conversationId: conversation.id,
              conversationTitle: conversation.title,
              messageId: message.messageId,
              messageContent: message.messageContent,
              messageType: message.messageType,
              timestamp: message.timestamp,
              relevanceScore: message.relevanceScore,
              context: {
                previousMessage: message.context?.previousMessage,
                nextMessage: message.context?.nextMessage
              }
            });
          }
        });
      });

      // Sort results
      results.sort((a, b) => {
        let comparison = 0;
        switch (filters.sortBy) {
          case 'relevance':
            comparison = b.relevanceScore - a.relevanceScore;
            break;
          case 'date':
            comparison = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            break;
          case 'messages':
            comparison = (b.messageCount || 0) - (a.messageCount || 0);
            break;
          case 'title':
            comparison = a.conversationTitle.localeCompare(b.conversationTitle);
            break;
        }
        return filters.sortOrder === 'desc' ? comparison : -comparison;
      });

      setSearchResults(results.slice(0, maxResults));
    } catch (error) {
      console.error('Search failed:', error);
      toast({
        title: 'Search Failed',
        description: 'An error occurred while searching. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (result: SearchResult) => {
    onSelectConversation(result.conversationId, result.messageId);
    onSelectResult?.(result);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const resetFilters = () => {
    setActiveFilters({
      dateRange: {},
      messageTypes: ['user', 'assistant'],
      knowledgeBases: [],
      hasBookmarks: false,
      minMessages: 0,
      sortBy: 'relevance',
      sortOrder: 'desc'
    });
  };

  const hasActiveFilters = useMemo(() => {
    return (
      activeFilters.dateRange.start ||
      activeFilters.dateRange.end ||
      activeFilters.messageTypes.length !== 2 ||
      activeFilters.knowledgeBases.length > 0 ||
      activeFilters.hasBookmarks ||
      activeFilters.minMessages > 0 ||
      activeFilters.sortBy !== 'relevance'
    );
  }, [activeFilters]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-20"
        />
        
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          
          {showFilters && (
            <Popover open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-6 w-6 p-0",
                    hasActiveFilters && "text-primary"
                  )}
                >
                  <Filter className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <SearchFiltersPanel
                  filters={activeFilters}
                  onFiltersChange={setActiveFilters}
                  onReset={resetFilters}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {/* Search Results */}
      {searchQuery.trim() && (
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="max-h-96">
              {isSearching ? (
                <div className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                    <span className="text-sm text-muted-foreground">Searching...</span>
                  </div>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center">
                  <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    No results found for "{searchQuery}"
                  </p>
                </div>
              ) : (
                <div className="p-2">
                  <div className="text-xs text-muted-foreground px-2 py-1 mb-2">
                    {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                  </div>
                  
                  <div className="space-y-1">
                    {searchResults.map((result, index) => (
                      <SearchResultItem
                        key={`${result.conversationId}-${result.messageId || 'conv'}-${index}`}
                        result={result}
                        query={searchQuery}
                        onClick={() => handleSelectResult(result)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Search Filters Panel Component
interface SearchFiltersPanelProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onReset: () => void;
}

function SearchFiltersPanel({ filters, onFiltersChange, onReset }: SearchFiltersPanelProps) {
  const updateFilters = (updates: Partial<SearchFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Search Filters</h4>
        <Button variant="ghost" size="sm" onClick={onReset}>
          Reset
        </Button>
      </div>

      {/* Message Types */}
      <div>
        <Label className="text-sm font-medium">Message Types</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {(['user', 'assistant', 'system'] as const).map(type => (
            <div key={type} className="flex items-center space-x-2">
              <Checkbox
                id={type}
                checked={filters.messageTypes.includes(type)}
                onCheckedChange={(checked) => {
                  const newTypes = checked
                    ? [...filters.messageTypes, type]
                    : filters.messageTypes.filter(t => t !== type);
                  updateFilters({ messageTypes: newTypes });
                }}
              />
              <Label htmlFor={type} className="text-sm capitalize">
                {type === 'user' ? 'User' : type === 'assistant' ? 'Assistant' : 'System'}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Sort Options */}
      <div>
        <Label className="text-sm font-medium">Sort By</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {[
            { value: 'relevance', label: 'Relevance' },
            { value: 'date', label: 'Date' },
            { value: 'messages', label: 'Messages' },
            { value: 'title', label: 'Title' }
          ].map(option => (
            <Button
              key={option.value}
              variant={filters.sortBy === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => updateFilters({ sortBy: option.value as any })}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Additional Filters */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Bookmarked Only</Label>
          <Checkbox
            checked={filters.hasBookmarks}
            onCheckedChange={(checked) => updateFilters({ hasBookmarks: !!checked })}
          />
        </div>
      </div>
    </div>
  );
}

// Search Result Item Component
interface SearchResultItemProps {
  result: SearchResult;
  query: string;
  onClick: () => void;
}

function SearchResultItem({ result, query, onClick }: SearchResultItemProps) {
  const isMessage = result.type === 'message';
  
  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  return (
    <div
      className="p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {isMessage ? (
            result.messageType === 'user' ? (
              <User className="h-4 w-4 text-blue-500" />
            ) : result.messageType === 'assistant' ? (
              <Bot className="h-4 w-4 text-green-500" />
            ) : (
              <Hash className="h-4 w-4 text-gray-500" />
            )
          ) : (
            <MessageSquare className="h-4 w-4 text-primary" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm truncate">
              {highlightText(result.conversationTitle, query)}
            </span>
            
            {result.isBookmarked && (
              <Bookmark className="h-3 w-3 text-yellow-500 fill-current" />
            )}
            
            <Badge variant="outline" className="text-xs">
              {result.type}
            </Badge>
          </div>

          {isMessage && result.messageContent && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-1">
              {highlightText(result.messageContent.substring(0, 150), query)}
              {result.messageContent.length > 150 && '...'}
            </p>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{new Date(result.timestamp).toLocaleDateString()}</span>
            
            {result.messageCount !== undefined && (
              <>
                <Separator orientation="vertical" className="h-3" />
                <MessageSquare className="h-3 w-3" />
                <span>{result.messageCount} messages</span>
              </>
            )}

            <Separator orientation="vertical" className="h-3" />
            <span>{Math.round(result.relevanceScore * 100)}% match</span>
          </div>
        </div>

        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </div>
    </div>
  );
}

// Utility functions
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

function calculateRelevanceScore(text: string, query: string): number {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);
  
  let score = 0;
  let matches = 0;

  queryWords.forEach(word => {
    if (textLower.includes(word)) {
      matches++;
      score += word.length / text.length;
    }
  });

  if (matches > 0) {
    score = Math.min(1, score + (matches / queryWords.length) * 0.5);
  }

  return score;
}

function generateMockMessages(conversation: any, query: string): SearchResult[] {
  // Mock message generation for demonstration
  // In real implementation, this would query the database
  const mockResults: SearchResult[] = [];
  
  if (conversation.title.toLowerCase().includes(query.toLowerCase())) {
    mockResults.push({
      type: 'message',
      conversationId: conversation.id,
      conversationTitle: conversation.title,
      messageId: `msg-${Date.now()}-1`,
      messageContent: `This is a mock message containing "${query}" for demonstration purposes.`,
      messageType: 'user',
      timestamp: conversation.created_at,
      relevanceScore: calculateRelevanceScore(`mock message ${query}`, query)
    });
  }

  return mockResults;
}