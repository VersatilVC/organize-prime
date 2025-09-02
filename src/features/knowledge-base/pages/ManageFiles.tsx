import React, { useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { KBFileUploadArea } from '../components/KBFileUploadArea';
import { FileList } from '../components/FileList';
import { FileStats } from '../components/FileStats';
import { FileManagementErrorBoundary } from '../components/FileManagementErrorBoundary';
import { useKnowledgeBases } from '../hooks/useKnowledgeBases';
import { useEffectiveOrganization } from '@/hooks/useEffectiveOrganization';

export default function ManageFiles() {
  const [selectedKbId, setSelectedKbId] = useState<string>('');
  const { effectiveOrganization } = useEffectiveOrganization();
  const { data: knowledgeBases, isLoading: kbLoading } = useKnowledgeBases();

  if (!effectiveOrganization) {
    return (
      <div className="container mx-auto py-6">
        <Alert>
          <AlertDescription>
            Please select an organization to manage files.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (kbLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading knowledge bases...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!knowledgeBases || knowledgeBases.length === 0) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Manage Files
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Knowledge Bases Found</h3>
              <p className="text-muted-foreground mb-4">
                You need to create a knowledge base before you can upload files.
              </p>
              <Alert>
                <AlertDescription>
                  Go to Knowledge Base settings to create your first knowledge base.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Files</h1>
          <p className="text-sm text-muted-foreground">
            Upload and manage your knowledge base documents
          </p>
        </div>
      </div>

      {/* Statistics */}
      <FileStats />

      {/* Main Content */}
      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Files
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            File Library
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <FileManagementErrorBoundary 
            fallbackTitle="Upload Error"
            fallbackDescription="There was an issue with the file upload system."
          >
            <KBFileUploadArea 
              selectedKbId={selectedKbId}
              onKbChange={setSelectedKbId}
            />
          </FileManagementErrorBoundary>
          
          
          {/* Recent uploads preview */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Uploads</CardTitle>
            </CardHeader>
            <CardContent>
              <FileManagementErrorBoundary 
                fallbackTitle="File List Error"
                fallbackDescription="Unable to display recent uploads."
              >
                <FileList selectedKbId={selectedKbId} />
              </FileManagementErrorBoundary>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="space-y-6">
          <FileManagementErrorBoundary 
            fallbackTitle="File Library Error"
            fallbackDescription="Unable to display the file library."
          >
            <FileList />
          </FileManagementErrorBoundary>
        </TabsContent>


        <TabsContent value="monitoring" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Processing Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Processing Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <FileManagementErrorBoundary 
                  fallbackTitle="Processing Activity Error"
                  fallbackDescription="Unable to display processing activity."
                >
                  <FileList selectedKbId={selectedKbId} showProcessingOnly={true} />
                </FileManagementErrorBoundary>
              </CardContent>
            </Card>
            
            {/* System Health Overview */}
            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">File Processing</span>
                    <span className="text-sm text-green-600">Operational</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Vector Generation</span>
                    <span className="text-sm text-green-600">Operational</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Storage Backend</span>
                    <span className="text-sm text-green-600">Connected</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Supported Formats</h4>
              <ul className="text-muted-foreground space-y-1">
                <li>• PDF documents</li>
                <li>• Word documents (.docx, .doc)</li>
                <li>• PowerPoint (.pptx, .ppt)</li>
                <li>• Excel (.xlsx, .xls)</li>
                <li>• Text files (.txt, .md, .rtf)</li>
                <li>• OpenDocument (.odt)</li>
                <li>• Web URLs</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">File Limits</h4>
              <ul className="text-muted-foreground space-y-1">
                <li>• Maximum size: 50MB</li>
                <li>• Multiple files supported</li>
                <li>• Automatic processing</li>
                <li>• Real-time status updates</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Processing Steps</h4>
              <ul className="text-muted-foreground space-y-1">
                <li>• File upload & validation</li>
                <li>• ConvertAPI text extraction</li>
                <li>• Intelligent content chunking</li>
                <li>• OpenAI embedding generation</li>
                <li>• Vector storage & indexing</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Best Practices</h4>
              <ul className="text-muted-foreground space-y-1">
                <li>• Use clear file names</li>
                <li>• Ensure text quality</li>
                <li>• Organize by topic</li>
                <li>• Monitor processing status</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}