import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Search, Upload, BarChart3, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useKnowledgeBaseStats, useRecentDocuments } from '../hooks/useKnowledgeBaseData';
import { DocumentCard } from '../components/DocumentCard';
import { Skeleton } from '@/components/ui/skeleton';

export function KnowledgeBaseDashboard() {
  const { data: stats, isLoading: statsLoading } = useKnowledgeBaseStats();
  const { data: recentDocuments, isLoading: documentsLoading } = useRecentDocuments(5);

  const statCards = [
    {
      title: 'Total Documents',
      value: stats?.total_documents || 0,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      title: 'Completed',
      value: stats?.completed_documents || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      title: 'Processing',
      value: stats?.processing_documents || 0,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    },
    {
      title: 'Total Searches',
      value: stats?.total_searches || 0,
      icon: Search,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Knowledge Base</h1>
          <p className="text-muted-foreground mt-2">
            Manage and search your organization's knowledge base
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild>
            <Link to="/features/knowledge-base/documents">
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/features/knowledge-base/search">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16 mt-2" />
                  ) : (
                    <p className="text-2xl font-bold mt-2">{stat.value.toLocaleString()}</p>
                  )}
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-auto p-4 flex-col gap-2" asChild>
              <Link to="/features/knowledge-base/documents">
                <Upload className="h-8 w-8" />
                <div className="text-center">
                  <p className="font-medium">Upload Documents</p>
                  <p className="text-xs text-muted-foreground">Add new content to your knowledge base</p>
                </div>
              </Link>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 flex-col gap-2" asChild>
              <Link to="/features/knowledge-base/search">
                <Search className="h-8 w-8" />
                <div className="text-center">
                  <p className="font-medium">Search Knowledge Base</p>
                  <p className="text-xs text-muted-foreground">Find information quickly</p>
                </div>
              </Link>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 flex-col gap-2" asChild>
              <Link to="/features/knowledge-base/settings">
                <BarChart3 className="h-8 w-8" />
                <div className="text-center">
                  <p className="font-medium">View Analytics</p>
                  <p className="text-xs text-muted-foreground">Monitor usage and performance</p>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Documents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Documents</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link to="/features/knowledge-base/documents">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {documentsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2 mb-3" />
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : recentDocuments && recentDocuments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentDocuments.map((document) => (
                <DocumentCard
                  key={document.id}
                  document={document}
                  onView={(doc) => {
                    // Navigate to document viewer or modal
                    console.log('View document:', doc.id);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No documents yet</h3>
              <p className="text-muted-foreground mb-4">
                Start building your knowledge base by uploading your first document.
              </p>
              <Button asChild>
                <Link to="/features/knowledge-base/documents">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processing Status */}
      {stats && (stats.processing_documents > 0 || stats.error_documents > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Processing Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.processing_documents > 0 && (
                <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">
                      {stats.processing_documents} document{stats.processing_documents !== 1 ? 's' : ''} processing
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Documents are being indexed for search. This may take a few minutes.
                    </p>
                  </div>
                </div>
              )}
              
              {stats.error_documents > 0 && (
                <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-medium text-red-800 dark:text-red-200">
                      {stats.error_documents} document{stats.error_documents !== 1 ? 's' : ''} failed to process
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Check the document library for more details and try re-uploading.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default KnowledgeBaseDashboard;