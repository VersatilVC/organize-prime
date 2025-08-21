/**
 * Webhook Import/Export Component
 * Handles bulk import/export of webhook configurations
 */

import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  Download,
  FileJson,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Copy,
  Eye,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

// Hooks and services
import { useElementWebhooks, useCreateElementWebhook } from '@/hooks/useElementWebhooks';
import type { ElementWebhook, CreateElementWebhookRequest } from '@/types/webhook';

// Validation schemas
const importSchema = z.object({
  format: z.enum(['json', 'csv']),
  overwriteExisting: z.boolean(),
  validateBeforeImport: z.boolean(),
  skipErrors: z.boolean(),
});

const exportSchema = z.object({
  format: z.enum(['json', 'csv']),
  includeInactive: z.boolean(),
  includeSecrets: z.boolean(),
  selectedWebhooks: z.array(z.string()).optional(),
});

type ImportFormData = z.infer<typeof importSchema>;
type ExportFormData = z.infer<typeof exportSchema>;

interface ImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ line: number; error: string; data?: any }>;
  warnings: Array<{ line: number; warning: string; data?: any }>;
}

export function WebhookImportExport() {
  const [activeTab, setActiveTab] = useState('export');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importData, setImportData] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hooks
  const { data: webhooks = [] } = useElementWebhooks();
  const createWebhookMutation = useCreateElementWebhook();

  // Forms
  const importForm = useForm<ImportFormData>({
    resolver: zodResolver(importSchema),
    defaultValues: {
      format: 'json',
      overwriteExisting: false,
      validateBeforeImport: true,
      skipErrors: true,
    },
  });

  const exportForm = useForm<ExportFormData>({
    resolver: zodResolver(exportSchema),
    defaultValues: {
      format: 'json',
      includeInactive: true,
      includeSecrets: false,
      selectedWebhooks: [],
    },
  });

  // Export functionality
  const handleExport = async (data: ExportFormData) => {
    setIsProcessing(true);
    try {
      let webhooksToExport = webhooks;

      // Filter based on selection
      if (data.selectedWebhooks && data.selectedWebhooks.length > 0) {
        webhooksToExport = webhooks.filter(w => data.selectedWebhooks!.includes(w.id));
      }

      // Filter inactive if not included
      if (!data.includeInactive) {
        webhooksToExport = webhooksToExport.filter(w => w.isActive);
      }

      // Prepare export data
      const exportData = webhooksToExport.map(webhook => {
        const data: any = {
          featureSlug: webhook.featureSlug,
          pagePath: webhook.pagePath,
          elementId: webhook.elementId,
          elementType: webhook.elementType,
          displayName: webhook.displayName,
          endpointUrl: data.includeSecrets ? webhook.endpointUrl : '[REDACTED]',
          httpMethod: webhook.httpMethod,
          payloadTemplate: webhook.payloadTemplate,
          headers: data.includeSecrets ? webhook.headers : {},
          timeoutSeconds: webhook.timeoutSeconds,
          retryCount: webhook.retryCount,
          rateLimitPerMinute: webhook.rateLimitPerMinute,
          isActive: webhook.isActive,
          createdAt: webhook.createdAt,
          updatedAt: webhook.updatedAt,
        };

        return data;
      });

      if (data.format === 'json') {
        exportAsJSON(exportData);
      } else {
        exportAsCSV(exportData);
      }

      toast.success(`Exported ${exportData.length} webhooks successfully`);
    } catch (error) {
      toast.error('Export failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const exportAsJSON = (data: any[]) => {
    const exportObject = {
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        source: 'OrganizePrime Webhook Manager',
        count: data.length,
      },
      webhooks: data,
    };

    const blob = new Blob([JSON.stringify(exportObject, null, 2)], { type: 'application/json' });
    downloadFile(blob, `webhooks-export-${Date.now()}.json`);
  };

  const exportAsCSV = (data: any[]) => {
    const headers = [
      'featureSlug',
      'pagePath',
      'elementId',
      'elementType',
      'displayName',
      'endpointUrl',
      'httpMethod',
      'timeoutSeconds',
      'retryCount',
      'rateLimitPerMinute',
      'isActive',
    ];

    const csvContent = [
      headers.join(','),
      ...data.map(webhook =>
        headers.map(header => {
          const value = webhook[header];
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    downloadFile(blob, `webhooks-export-${Date.now()}.csv`);
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import functionality
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      parseImportFile(content, file.name);
    };
    reader.readAsText(file);
  };

  const parseImportFile = (content: string, filename: string) => {
    try {
      const format = importForm.getValues('format');
      let parsedData: any[] = [];

      if (format === 'json') {
        const jsonData = JSON.parse(content);
        parsedData = jsonData.webhooks || (Array.isArray(jsonData) ? jsonData : [jsonData]);
      } else {
        // Parse CSV
        const lines = content.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        parsedData = lines.slice(1).map((line, index) => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const row: any = {};
          headers.forEach((header, i) => {
            row[header] = values[i] || '';
          });
          row._lineNumber = index + 2; // +2 because of header and 0-based index
          return row;
        });
      }

      setImportData(parsedData);
      setPreviewData(parsedData.slice(0, 5)); // Show first 5 for preview
      toast.success(`Parsed ${parsedData.length} webhooks from ${filename}`);
    } catch (error) {
      toast.error('Failed to parse file: ' + error.message);
      setImportData([]);
      setPreviewData([]);
    }
  };

  const validateImportData = (data: any[]): { valid: any[]; errors: any[] } => {
    const valid: any[] = [];
    const errors: any[] = [];

    data.forEach((item, index) => {
      const validation = {
        line: item._lineNumber || index + 1,
        data: item,
        errors: [] as string[],
      };

      // Required fields validation
      if (!item.featureSlug) validation.errors.push('featureSlug is required');
      if (!item.pagePath) validation.errors.push('pagePath is required');
      if (!item.elementId) validation.errors.push('elementId is required');
      if (!item.endpointUrl) validation.errors.push('endpointUrl is required');
      if (!item.httpMethod) validation.errors.push('httpMethod is required');

      // URL validation
      if (item.endpointUrl && !isValidUrl(item.endpointUrl)) {
        validation.errors.push('Invalid endpoint URL');
      }

      // HTTP method validation
      if (item.httpMethod && !['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(item.httpMethod)) {
        validation.errors.push('Invalid HTTP method');
      }

      if (validation.errors.length > 0) {
        errors.push({
          line: validation.line,
          error: validation.errors.join(', '),
          data: item,
        });
      } else {
        valid.push(item);
      }
    });

    return { valid, errors };
  };

  const isValidUrl = (string: string): boolean => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleImport = async (data: ImportFormData) => {
    if (importData.length === 0) {
      toast.error('No data to import. Please select a file first.');
      return;
    }

    setIsProcessing(true);
    setImportProgress(0);

    try {
      let dataToImport = importData;

      // Validate data if requested
      let validationResult = { valid: dataToImport, errors: [] };
      if (data.validateBeforeImport) {
        validationResult = validateImportData(dataToImport);
        
        if (validationResult.errors.length > 0 && !data.skipErrors) {
          setImportResult({
            total: dataToImport.length,
            successful: 0,
            failed: validationResult.errors.length,
            errors: validationResult.errors,
            warnings: [],
          });
          toast.error('Validation failed. Fix errors or enable "Skip Errors" to continue.');
          setIsProcessing(false);
          return;
        }

        dataToImport = validationResult.valid;
      }

      // Import webhooks
      const result: ImportResult = {
        total: importData.length,
        successful: 0,
        failed: 0,
        errors: validationResult.errors,
        warnings: [],
      };

      for (let i = 0; i < dataToImport.length; i++) {
        const item = dataToImport[i];
        setImportProgress((i / dataToImport.length) * 100);

        try {
          const webhookData: CreateElementWebhookRequest = {
            featureSlug: item.featureSlug,
            pagePath: item.pagePath,
            elementId: item.elementId,
            elementType: item.elementType || 'button',
            displayName: item.displayName,
            endpointUrl: item.endpointUrl,
            httpMethod: item.httpMethod,
            payloadTemplate: item.payloadTemplate || {},
            headers: item.headers || {},
            timeoutSeconds: Number(item.timeoutSeconds) || 30,
            retryCount: Number(item.retryCount) || 3,
            rateLimitPerMinute: Number(item.rateLimitPerMinute) || 60,
            isActive: item.isActive !== false,
          };

          await createWebhookMutation.mutateAsync(webhookData);
          result.successful++;
        } catch (error) {
          result.failed++;
          result.errors.push({
            line: item._lineNumber || i + 1,
            error: error.message,
            data: item,
          });
        }
      }

      setImportProgress(100);
      setImportResult(result);
      
      if (result.successful > 0) {
        toast.success(`Successfully imported ${result.successful} webhooks`);
      }
      if (result.failed > 0) {
        toast.error(`Failed to import ${result.failed} webhooks`);
      }

    } catch (error) {
      toast.error('Import failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetImport = () => {
    setImportData([]);
    setPreviewData([]);
    setImportResult(null);
    setImportProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Import & Export Webhooks
          </CardTitle>
          <CardDescription>
            Bulk import and export webhook configurations using JSON or CSV formats
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import
          </TabsTrigger>
        </TabsList>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-6">
          <form onSubmit={exportForm.handleSubmit(handleExport)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Export Configuration</CardTitle>
                <CardDescription>
                  Export existing webhooks to JSON or CSV format
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="export-format">Export Format</Label>
                    <Select
                      value={exportForm.watch('format')}
                      onValueChange={(value) => exportForm.setValue('format', value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="json">
                          <div className="flex items-center gap-2">
                            <FileJson className="h-4 w-4" />
                            JSON (Recommended)
                          </div>
                        </SelectItem>
                        <SelectItem value="csv">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            CSV
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="includeInactive"
                        checked={exportForm.watch('includeInactive')}
                        onCheckedChange={(checked) => exportForm.setValue('includeInactive', checked)}
                      />
                      <Label htmlFor="includeInactive">Include inactive webhooks</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="includeSecrets"
                        checked={exportForm.watch('includeSecrets')}
                        onCheckedChange={(checked) => exportForm.setValue('includeSecrets', checked)}
                      />
                      <Label htmlFor="includeSecrets">Include sensitive data (URLs, headers)</Label>
                    </div>
                  </div>
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Export Summary:</strong> {webhooks.length} total webhooks available for export.
                    {exportForm.watch('includeInactive') ? '' : ' Inactive webhooks will be excluded.'}
                    {exportForm.watch('includeSecrets') ? ' Sensitive data will be included.' : ' Sensitive data will be redacted.'}
                  </AlertDescription>
                </Alert>

                <Button
                  type="submit"
                  disabled={isProcessing || webhooks.length === 0}
                  className="flex items-center gap-2"
                >
                  {isProcessing ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Export {webhooks.length} Webhooks
                </Button>
              </CardContent>
            </Card>
          </form>
        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-6">
          <form onSubmit={importForm.handleSubmit(handleImport)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Import Configuration</CardTitle>
                <CardDescription>
                  Import webhooks from JSON or CSV files
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="import-format">Import Format</Label>
                    <Select
                      value={importForm.watch('format')}
                      onValueChange={(value) => importForm.setValue('format', value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="overwriteExisting"
                        checked={importForm.watch('overwriteExisting')}
                        onCheckedChange={(checked) => importForm.setValue('overwriteExisting', checked)}
                      />
                      <Label htmlFor="overwriteExisting">Overwrite existing webhooks</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="validateBeforeImport"
                        checked={importForm.watch('validateBeforeImport')}
                        onCheckedChange={(checked) => importForm.setValue('validateBeforeImport', checked)}
                      />
                      <Label htmlFor="validateBeforeImport">Validate before import</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="skipErrors"
                        checked={importForm.watch('skipErrors')}
                        onCheckedChange={(checked) => importForm.setValue('skipErrors', checked)}
                      />
                      <Label htmlFor="skipErrors">Skip errors and continue</Label>
                    </div>
                  </div>
                </div>

                {/* File Upload */}
                <div className="space-y-2">
                  <Label htmlFor="file-upload">Select File</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      ref={fileInputRef}
                      id="file-upload"
                      type="file"
                      accept=".json,.csv"
                      onChange={handleFileSelect}
                      className="flex-1"
                    />
                    {importData.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetImport}
                        className="flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Clear
                      </Button>
                    )}
                  </div>
                </div>

                {/* Import Progress */}
                {isProcessing && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Import Progress</Label>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(importProgress)}%
                      </span>
                    </div>
                    <Progress value={importProgress} />
                  </div>
                )}

                {/* Preview Data */}
                {previewData.length > 0 && (
                  <Alert>
                    <Eye className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <strong>Preview ({previewData.length} of {importData.length} rows):</strong>
                        <div className="text-xs space-y-1">
                          {previewData.map((item, index) => (
                            <div key={index} className="font-mono bg-muted p-2 rounded">
                              {item.featureSlug} → {item.elementId} ({item.httpMethod} {item.endpointUrl})
                            </div>
                          ))}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={isProcessing || importData.length === 0}
                  className="flex items-center gap-2"
                >
                  {isProcessing ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Import {importData.length} Webhooks
                </Button>
              </CardContent>
            </Card>
          </form>

          {/* Import Results */}
          {importResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {importResult.successful > 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  Import Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{importResult.successful}</p>
                    <p className="text-sm text-muted-foreground">Successful</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{importResult.failed}</p>
                    <p className="text-sm text-muted-foreground">Failed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{importResult.total}</p>
                    <p className="text-sm text-muted-foreground">Total</p>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-destructive">Errors:</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {importResult.errors.map((error, index) => (
                        <Alert key={index} variant="destructive">
                          <AlertDescription>
                            Line {error.line}: {error.error}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </div>
                )}

                {importResult.warnings.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-yellow-600">Warnings:</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {importResult.warnings.map((warning, index) => (
                        <Alert key={index}>
                          <AlertDescription>
                            Line {warning.line}: {warning.warning}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}