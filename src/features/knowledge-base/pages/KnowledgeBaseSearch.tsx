import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Search, FileText, TrendingUp } from 'lucide-react';
import { SearchInterface } from '../components/SearchInterface';
import { DocumentViewer } from '../components/DocumentViewer';
import { useKnowledgeBaseData } from '../hooks/useKnowledgeBaseData';
import { useDocumentSearch } from '../hooks/useDocumentSearch';
import { KBDocument } from '../types/knowledgeBaseTypes';

export function KnowledgeBaseSearch() {
  const [selectedDocument, setSelectedDocument] = useState<KBDocument | null>(null);
  const { data: documents } = useKnowledgeBaseData();
  const { searchHistory } = useDocumentSearch();

  const handleDocumentSelect = (documentId: string) => {
    const document = documents?.find(doc => doc.id === documentId);
    if (document) {
      setSelectedDocument(document);
    }
  };

  // Get popular search terms
  const popularSearches = searchHistory
    ?.reduce((acc, search) => {
      acc[search.query] = (acc[search.query] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
    ? Object.entries(searchHistory.reduce((acc, search) => {
        acc[search.query] = (acc[search.query] || 0) + 1;
        return acc;
      }, {} as Record<string, number>))
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([query]) => query)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Search Knowledge Base</h1>
          <p className="text-muted-foreground mt-2">
            Find information quickly across all your documents
          </p>
        </div>
      </div>

      {/* Search Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Documents</p>
                <p className="text-2xl font-bold mt-2">{documents?.length || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-900/20">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Searchable Content</p>
                <p className="text-2xl font-bold mt-2">
                  {documents?.filter(doc => doc.processing_status === 'completed').length || 0}
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-50 dark:bg-green-900/20">
                <Search className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Search History</p>
                <p className="text-2xl font-bold mt-2">{searchHistory?.length || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-50 dark:bg-purple-900/20">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Popular Searches */}
      {popularSearches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Popular Searches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {popularSearches.map((query, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-muted rounded-full text-sm cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => {
                    // Set search query - this would need to be passed to SearchInterface
                    console.log('Set search query:', query);
                  }}
                >
                  {query}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Interface */}
      <SearchInterface onDocumentSelect={handleDocumentSelect} />

      {/* Search Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Search Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">General Search</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Use keywords from document titles or content</li>
                <li>• Search terms are case-insensitive</li>
                <li>• Results are ranked by relevance</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Advanced Search</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Search by document tags</li>
                <li>• Filter by document categories</li>
                <li>• Use specific keywords for better results</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Viewer Modal */}
      <Dialog open={!!selectedDocument} onOpenChange={() => setSelectedDocument(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedDocument && (
            <DocumentViewer
              document={selectedDocument}
              onDownload={() => {
                // Handle download
                console.log('Download document:', selectedDocument.id);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default KnowledgeBaseSearch;