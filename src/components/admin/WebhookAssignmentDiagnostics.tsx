import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UnifiedWebhookService } from '@/services/UnifiedWebhookService';
import { useOrganization } from '@/contexts/OrganizationContext';
import { CheckCircle, AlertCircle, Info, RefreshCw } from 'lucide-react';

interface DiagnosticResult {
  isValid: boolean;
  hasAssignment: boolean;
  hasGlobalFallback: boolean;
  webhookActive: boolean;
  issues: string[];
  suggestions: string[];
}

export function WebhookAssignmentDiagnostics() {
  const { currentOrganization } = useOrganization();
  const [selectedFeature, setSelectedFeature] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const commonFeatures = [
    { page: 'ManageFiles', position: 'upload-section', label: 'File Upload Processing' },
    { page: 'AIChatSettings', position: 'chat-input', label: 'AI Chat Input' },
    { page: 'KnowledgeBaseDashboard', position: 'quick-actions', label: 'KB Dashboard Actions' },
    { page: 'KnowledgeBaseChat', position: 'message-send', label: 'KB Chat Messages' },
  ];

  const runDiagnostics = async () => {
    if (!currentOrganization || !selectedFeature || !selectedPosition) return;

    setIsRunning(true);
    try {
      const result = await UnifiedWebhookService.validateAssignmentHealth(
        currentOrganization.id,
        selectedFeature,
        selectedPosition
      );
      setDiagnostics(result);
    } catch (error) {
      console.error('Diagnostics failed:', error);
      setDiagnostics({
        isValid: false,
        hasAssignment: false,
        hasGlobalFallback: false,
        webhookActive: false,
        issues: ['Failed to run diagnostics'],
        suggestions: ['Try again or contact support']
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusBadge = () => {
    if (!diagnostics) return null;
    
    if (diagnostics.isValid) {
      return (
        <Badge variant="default" className="gap-1">
          <CheckCircle className="h-3 w-3" />
          Healthy
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Issues Found
        </Badge>
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Webhook Assignment Diagnostics
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Validate webhook assignments and troubleshoot issues for your organization.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Feature Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Feature Page</label>
            <Select value={selectedFeature} onValueChange={setSelectedFeature}>
              <SelectTrigger>
                <SelectValue placeholder="Select feature page" />
              </SelectTrigger>
              <SelectContent>
                {commonFeatures.map((feature) => (
                  <SelectItem key={`${feature.page}-${feature.position}`} value={feature.page}>
                    {feature.page}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Button Position</label>
            <Select value={selectedPosition} onValueChange={setSelectedPosition}>
              <SelectTrigger>
                <SelectValue placeholder="Select position" />
              </SelectTrigger>
              <SelectContent>
                {commonFeatures
                  .filter(f => f.page === selectedFeature)
                  .map((feature) => (
                    <SelectItem key={feature.position} value={feature.position}>
                      {feature.position}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quick Select Buttons */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Quick Select</label>
          <div className="flex flex-wrap gap-2">
            {commonFeatures.map((feature) => (
              <Button
                key={`${feature.page}-${feature.position}`}
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedFeature(feature.page);
                  setSelectedPosition(feature.position);
                }}
              >
                {feature.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Run Diagnostics */}
        <Button
          onClick={runDiagnostics}
          disabled={!selectedFeature || !selectedPosition || isRunning}
          className="w-full"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
          {isRunning ? 'Running Diagnostics...' : 'Run Diagnostics'}
        </Button>

        {/* Results */}
        {diagnostics && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold">Diagnostic Results</h4>
              {getStatusBadge()}
            </div>

            {/* Status Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-2 border rounded">
                <div className={`font-semibold ${diagnostics.hasAssignment ? 'text-green-600' : 'text-gray-500'}`}>
                  {diagnostics.hasAssignment ? '✓' : '✗'}
                </div>
                <div className="text-xs">Org Assignment</div>
              </div>
              <div className="text-center p-2 border rounded">
                <div className={`font-semibold ${diagnostics.hasGlobalFallback ? 'text-green-600' : 'text-gray-500'}`}>
                  {diagnostics.hasGlobalFallback ? '✓' : '✗'}
                </div>
                <div className="text-xs">Global Fallback</div>
              </div>
              <div className="text-center p-2 border rounded">
                <div className={`font-semibold ${diagnostics.webhookActive ? 'text-green-600' : 'text-red-600'}`}>
                  {diagnostics.webhookActive ? '✓' : '✗'}
                </div>
                <div className="text-xs">Webhook Active</div>
              </div>
              <div className="text-center p-2 border rounded">
                <div className={`font-semibold ${diagnostics.isValid ? 'text-green-600' : 'text-red-600'}`}>
                  {diagnostics.isValid ? '✓' : '✗'}
                </div>
                <div className="text-xs">Overall Health</div>
              </div>
            </div>

            {/* Issues */}
            {diagnostics.issues.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="font-semibold">Issues Found:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {diagnostics.issues.map((issue, index) => (
                        <li key={index} className="text-sm">{issue}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Suggestions */}
            {diagnostics.suggestions.length > 0 && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="font-semibold">Suggested Actions:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {diagnostics.suggestions.map((suggestion, index) => (
                        <li key={index} className="text-sm">{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Help Section */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <h4 className="text-sm font-semibold mb-2">Understanding Webhook Assignments</h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Organization Assignment:</strong> Specific to your organization</p>
              <p><strong>Global Fallback:</strong> System-wide assignment that applies to all organizations</p>
              <p><strong>Webhook Active:</strong> The assigned webhook is enabled and functional</p>
              <p><strong>Overall Health:</strong> System can successfully trigger webhooks for this feature</p>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}