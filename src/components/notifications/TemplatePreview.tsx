import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Eye, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  replaceTemplateVariables, 
  getPreviewVariables, 
  validateTemplate, 
  extractVariables,
  type NotificationVariables 
} from '@/lib/notification-templates';

interface TemplatePreviewProps {
  title: string;
  message: string;
  onVariableChange?: (variables: NotificationVariables) => void;
}

export function TemplatePreview({ 
  title, 
  message, 
  onVariableChange 
}: TemplatePreviewProps) {
  const [customVariables, setCustomVariables] = useState<NotificationVariables>(getPreviewVariables());
  const [showCustomVariables, setShowCustomVariables] = useState(false);

  // Extract variables from both title and message
  const titleVariables = extractVariables(title);
  const messageVariables = extractVariables(message);
  const allVariables = [...new Set([...titleVariables, ...messageVariables])];

  // Validate templates
  const titleIssues = validateTemplate(title);
  const messageIssues = validateTemplate(message);
  const hasIssues = titleIssues.length > 0 || messageIssues.length > 0;

  // Render preview with current variables
  const previewTitle = replaceTemplateVariables(title, customVariables);
  const previewMessage = replaceTemplateVariables(message, customVariables);

  const updateVariable = (key: string, value: string) => {
    const newVariables = { ...customVariables, [key]: value };
    setCustomVariables(newVariables);
    onVariableChange?.(newVariables);
  };

  const resetToDefaults = () => {
    const defaultVars = getPreviewVariables();
    setCustomVariables(defaultVars);
    onVariableChange?.(defaultVars);
  };

  return (
    <div className="space-y-4">
      {/* Validation Issues */}
      {hasIssues && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {titleIssues.map((issue, index) => (
                <div key={`title-${index}`}>Title: {issue}</div>
              ))}
              {messageIssues.map((issue, index) => (
                <div key={`message-${index}`}>Message: {issue}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Variables Found */}
      {allVariables.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Variables Found:</Label>
          <div className="flex flex-wrap gap-1">
            {allVariables.map((variable) => (
              <Badge key={variable} variant="outline" className="text-xs">
                {`{{${variable}}}`}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Preview Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Live Preview
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCustomVariables(!showCustomVariables)}
              >
                {showCustomVariables ? 'Hide' : 'Customize'} Variables
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetToDefaults}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            </div>
          </div>
          <CardDescription>
            How the notification will appear to users
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Custom Variables Input */}
          {showCustomVariables && allVariables.length > 0 && (
            <div className="p-3 bg-muted rounded-lg space-y-3">
              <Label className="text-sm font-medium">Customize Variables:</Label>
              <div className="grid gap-3 md:grid-cols-2">
                {allVariables.map((variable) => (
                  <div key={variable} className="space-y-1">
                    <Label htmlFor={variable} className="text-xs">
                      {variable}
                    </Label>
                    <Input
                      id={variable}
                      value={customVariables[variable] || ''}
                      onChange={(e) => updateVariable(variable, e.target.value)}
                      placeholder={`Enter ${variable}`}
                      className="h-8 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notification Preview */}
          <div className="border rounded-lg p-4 bg-background">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                <span className="text-lg">🎉</span>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-semibold">
                      {previewTitle || 'No title'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {previewMessage || 'No message'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Just now
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-1 ml-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Template Syntax Guide */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Template Syntax:</strong></p>
            <p>• Use <code className="bg-muted px-1 rounded">{`{{variable_name}}`}</code> for variables</p>
            <p>• Common variables: user_name, organization_name, app_name</p>
            <p>• Missing variables will show as [variable_name]</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}