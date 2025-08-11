import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Clock, FileText, ExternalLink } from 'lucide-react';
import { useDocumentSearch } from '../hooks/useDocumentSearch';
import { formatDistanceToNow } from 'date-fns';

interface SearchInterfaceProps {
  onDocumentSelect?: (documentId: string) => void;
  className?: string;
}

export function SearchInterface({ onDocumentSelect, className }: SearchInterfaceProps) {
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    saveSearch,
    searchHistory,
  } = useDocumentSearch();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      saveSearch(searchQuery);
    }
  };

  const handleHistoryClick = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Knowledge Base
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents, content, tags..."
              className="flex-1"
            />
            <Button type="submit" disabled={isSearching || !searchQuery.trim()}>
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchQuery && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Search Results
              {searchResults.length > 0 && (
                <span className="text-sm text-muted-foreground font-normal ml-2">
                  ({searchResults.length} found)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isSearching ? (
              <div className="text-center py-8 text-muted-foreground">
                Searching documents...
              </div>
            ) : searchResults.length === 0 && searchQuery ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No documents found for "{searchQuery}"</p>
                <p className="text-sm mt-1">Try different keywords or check your spelling</p>
              </div>
            ) : (
              <div className="space-y-4">
                {searchResults.map((result) => (
                  <div
                    key={result.document.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => onDocumentSelect?.(result.document.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate group-hover:text-primary">
                          {result.document.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {result.document.category}
                          </Badge>
                          {result.document.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          <span>•</span>
                          <span>
                            {formatDistanceToNow(new Date(result.document.created_at), { addSuffix: true })}
                          </span>
                          {result.document.word_count && (
                            <>
                              <span>•</span>
                              <span>{result.document.word_count} words</span>
                            </>
                          )}
                        </div>
                        
                        {/* Highlights */}
                        {result.highlights.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {result.highlights.map((highlight, index) => (
                              <p key={index} className="text-sm text-muted-foreground bg-muted p-2 rounded italic">
                                {highlight}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">
                            Relevance: {Math.round(result.relevance_score * 100)}%
                          </div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search History */}
      {searchHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" />
              Recent Searches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {searchHistory.map((search) => (
                <div
                  key={search.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer"
                  onClick={() => handleHistoryClick(search.query)}
                >
                  <span className="text-sm">{search.query}</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{search.results_count} results</span>
                    <span>•</span>
                    <span>
                      {formatDistanceToNow(new Date(search.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}