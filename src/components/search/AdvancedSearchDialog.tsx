import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Filter, Clock, X, FileText, User, Building, MessageSquare, Bell } from 'lucide-react';
import { useAdvancedSearch } from '@/hooks/useAdvancedSearch';
import { format } from 'date-fns';

interface AdvancedSearchDialogProps {
  children: React.ReactNode;
}

const typeIcons = {
  user: User,
  organization: Building,
  feedback: MessageSquare,
  notification: Bell,
  file: FileText,
};

const typeLabels = {
  user: 'Users',
  organization: 'Organizations',
  feedback: 'Feedback',
  notification: 'Notifications',
  file: 'Files',
};

export function AdvancedSearchDialog({ children }: AdvancedSearchDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const {
    searchResults,
    isLoading,
    filters,
    searchHistory,
    setQuery,
    setFilters,
    clearHistory,
    removeFromHistory
  } = useAdvancedSearch();

  const handleSearch = () => {
    setQuery(searchInput);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const toggleTypeFilter = (type: string) => {
    const currentTypes = filters.type || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type];
    
    setFilters({ ...filters, type: newTypes.length > 0 ? newTypes : undefined });
  };

  const selectFromHistory = (historyQuery: string) => {
    setSearchInput(historyQuery);
    setQuery(historyQuery);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Advanced Search
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search across all content..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {/* Type Filters */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filter by type:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(typeLabels).map(([type, label]) => {
                const isSelected = filters.type?.includes(type);
                return (
                  <Badge
                    key={type}
                    variant={isSelected ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleTypeFilter(type)}
                  >
                    {label}
                  </Badge>
                );
              })}
            </div>
            {filters.type && filters.type.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters({ ...filters, type: undefined })}
              >
                Clear filters
              </Button>
            )}
          </div>

          <Separator />

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Results ({searchResults.length})</h3>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {searchResults.map((result) => {
                    const Icon = typeIcons[result.type];
                    return (
                      <div
                        key={`${result.type}-${result.id}`}
                        className="p-3 border rounded-lg hover:bg-accent cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          <Icon className="h-4 w-4 mt-1 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium truncate">{result.title}</h4>
                              <Badge variant="secondary" className="text-xs">
                                {typeLabels[result.type]}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {result.content}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(result.created_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Search History */}
          {searchHistory.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">Recent searches</span>
                </div>
                <Button variant="ghost" size="sm" onClick={clearHistory}>
                  Clear all
                </Button>
              </div>
              <div className="space-y-1">
                {searchHistory.slice(0, 5).map((historyItem, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 hover:bg-accent rounded cursor-pointer"
                    onClick={() => selectFromHistory(historyItem.query)}
                  >
                    <div className="flex-1">
                      <span className="text-sm">{historyItem.query}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({historyItem.results_count} results)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromHistory(historyItem.query);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty States */}
          {searchInput.length >= 2 && searchResults.length === 0 && !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No results found for "{searchInput}"</p>
              <p className="text-sm">Try adjusting your search terms or filters</p>
            </div>
          )}

          {searchInput.length < 2 && searchHistory.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Start typing to search across all content</p>
              <p className="text-sm">Users, organizations, feedback, and more</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}