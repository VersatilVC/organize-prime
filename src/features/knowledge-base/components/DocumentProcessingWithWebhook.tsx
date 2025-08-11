import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { FileText, Upload, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useDocumentProcessingWebhook } from '../hooks/useKBWebhooks';
import { toast } from 'sonner';

interface ProcessingOptions {
  extractImages: boolean;
  extractTables: boolean;
  chunkSize: number;
  overlap: number;
}

interface DocumentProcessingWithWebhookProps {
  onProcessingComplete?: (result: any) => void;
}

export const DocumentProcessingWithWebhook: React.FC<DocumentProcessingWithWebhookProps> = ({
  onProcessingComplete
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processingResult, setProcessingResult] = useState<any>(null);
  const [options, setOptions] = useState<ProcessingOptions>({
    extractImages: false,
    extractTables: true,
    chunkSize: 1000,
    overlap: 200
  });

  const { processDocument, isProcessing } = useDocumentProcessingWebhook();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setProcessingResult(null);
    }
  };

  const handleProcessDocument = async () => {
    if (!selectedFile) {
      toast.error('Please select a document to process');
      return;
    }

    try {
      const result = await processDocument(selectedFile, options);
      setProcessingResult(result);
      onProcessingComplete?.(result);
      toast.success('Document processed successfully!');
    } catch (error) {
      console.error('Document processing failed:', error);
      // Error handling is done in the webhook hook
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* File Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Document Processing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="file-upload" className="text-sm font-medium mb-2 block">
              Select Document
            </Label>
            <input
              id="file-upload"
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md"
              onChange={handleFileSelect}
              className="w-full px-3 py-2 border border-input rounded-md text-sm"
            />
            {selectedFile && (
              <div className="mt-2 text-sm text-muted-foreground">
                Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </div>
            )}
          </div>

          {/* Processing Options */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="extract-images"
                checked={options.extractImages}
                onCheckedChange={(checked) => setOptions(prev => ({ ...prev, extractImages: checked }))}
              />
              <Label htmlFor="extract-images" className="text-sm">Extract Images</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="extract-tables"
                checked={options.extractTables}
                onCheckedChange={(checked) => setOptions(prev => ({ ...prev, extractTables: checked }))}
              />
              <Label htmlFor="extract-tables" className="text-sm">Extract Tables</Label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="chunk-size" className="text-sm font-medium mb-1 block">
                Chunk Size: {options.chunkSize}
              </Label>
              <input
                id="chunk-size"
                type="range"
                min="500"
                max="2000"
                step="100"
                value={options.chunkSize}
                onChange={(e) => setOptions(prev => ({ ...prev, chunkSize: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>

            <div>
              <Label htmlFor="overlap" className="text-sm font-medium mb-1 block">
                Overlap: {options.overlap}
              </Label>
              <input
                id="overlap"
                type="range"
                min="0"
                max="500"
                step="50"
                value={options.overlap}
                onChange={(e) => setOptions(prev => ({ ...prev, overlap: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>
          </div>

          <Button
            onClick={handleProcessDocument}
            disabled={!selectedFile || isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Processing Document...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Process Document
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Processing Progress */}
      {isProcessing && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                <span className="font-medium">Processing document...</span>
              </div>
              <Progress value={75} className="w-full" />
              <div className="text-sm text-muted-foreground">
                This may take a few minutes depending on document size and complexity.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Results */}
      {processingResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Processing Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {processingResult.success ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Chunks Created</div>
                    <div className="text-2xl font-bold text-primary">
                      {processingResult.chunksCreated || 0}
                    </div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Processing Time</div>
                    <div className="text-2xl font-bold text-primary">
                      {processingResult.processingTime || '0'}s
                    </div>
                  </div>
                </div>

                {processingResult.extractedText && (
                  <div>
                    <Label className="text-sm font-medium">Extracted Text Preview</Label>
                    <div className="mt-1 p-3 bg-muted rounded-lg text-sm max-h-40 overflow-y-auto">
                      {processingResult.extractedText.substring(0, 500)}
                      {processingResult.extractedText.length > 500 && '...'}
                    </div>
                  </div>
                )}

                {processingResult.images && processingResult.images.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Extracted Images</Label>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {processingResult.images.length} image(s) extracted
                    </div>
                  </div>
                )}

                {processingResult.tables && processingResult.tables.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Extracted Tables</Label>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {processingResult.tables.length} table(s) extracted
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-destructive">Processing Failed</div>
                  <div className="text-destructive/80">
                    {processingResult.error || 'An unknown error occurred during processing'}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};