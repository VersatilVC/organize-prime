// Phase 4: Visual Button-Level Webhook System - Configuration Panel
// Slide-out panel for configuring webhooks on selected elements

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  X,
  Webhook,
  Settings,
  MousePointer,
  FormInput,
  Send,
  Copy,
  TestTube,
  Save,
  Trash2,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { usePreview } from './PreviewController';
import { useAuth } from '@/auth/AuthProvider';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateElementSignature, generateElementContentHash, getElementDisplayInfo } from '@/lib/element-utils';

// Types
interface WebhookConfiguration {
  id?: string;
  webhook_name: string;
  webhook_url: string;
  is_enabled: boolean;
  event_type: 'click' | 'submit' | 'change' | 'input';
  description?: string;
  headers?: Record<string, string>;
  payload_template?: Record<string, any>;
}

interface ConfigurationPanelProps {
  isOpen: boolean;
  elementId: string | null;
  onClose: () => void;
}

// Main configuration panel component
export function ConfigurationPanel({ isOpen, elementId, onClose }: ConfigurationPanelProps) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  
  // Form state
  const [config, setConfig] = useState<WebhookConfiguration>({
    webhook_name: '',
    webhook_url: '',
    is_enabled: true,
    event_type: 'click',
    description: '',
    headers: {},
    payload_template: {}
  });
  
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // State for element reference with retry mechanism
  const [element, setElement] = useState<HTMLElement | null>(null);
  
  // Get element information with retry mechanism
  useEffect(() => {
    if (!elementId || !isOpen) {
      setElement(null);
      return;
    }
    
    // First attempt - immediate lookup
    let foundElement = document.querySelector(`[data-webhook-signature="${elementId}"]`) as HTMLElement;
    
    if (foundElement) {
      setElement(foundElement);
    } else {
      // If not found, try again after a short delay to allow DOM updates
      const retryTimeout = setTimeout(() => {
        foundElement = document.querySelector(`[data-webhook-signature="${elementId}"]`) as HTMLElement;
        setElement(foundElement);
      }, 100);
      
      return () => clearTimeout(retryTimeout);
    }
  }, [elementId, isOpen]);

  const elementInfo = useMemo(() => {
    if (!element) return null;
    return getElementDisplayInfo(element);
  }, [element]);

  // Load existing webhook configuration
  const { data: existingWebhook, isLoading: isLoadingWebhook } = useQuery({
    queryKey: ['element-webhook', elementId, currentOrganization?.id],
    queryFn: async () => {
      console.log('🔍 Loading existing webhook...', { elementId, orgId: currentOrganization?.id, hasElement: !!element });
      
      if (!elementId || !currentOrganization?.id || !element) {
        console.log('⚠️ Missing data for webhook lookup');
        return null;
      }
      
      const elementSignature = generateElementSignature(element);
      console.log('🔍 Generated signature for lookup:', elementSignature);
      
      // Primary approach: Try fuzzy matching first (more reliable)
      const currentPath = window.location.pathname;
      const elementText = element.textContent?.trim();
      
      let data = null;
      let error = null;
      
      if (elementText) {
        console.log('🔍 Trying fuzzy search by element text and path:', { elementText, currentPath });
        
        const { data: fuzzyData, error: fuzzyError } = await supabase
          .rpc('get_element_webhook_by_fuzzy_match', {
            org_id: currentOrganization.id,
            path_param: currentPath,
            text_param: elementText
          });
          
        if (fuzzyError && fuzzyError.code !== 'PGRST116') {
          console.error('❌ Error in fuzzy search:', fuzzyError);
          error = fuzzyError;
        } else if (fuzzyData) {
          console.log('✅ Found webhook via fuzzy matching:', fuzzyData);
          data = fuzzyData;
        }
      }
      
      // Fallback: Try signature match if fuzzy search didn't work
      if (!data && !error) {
        console.log('🔍 No fuzzy match found, trying signature match:', elementSignature);
        
        const { data: signatureData, error: signatureError } = await supabase
          .rpc('get_element_webhook_by_signature', {
            org_id: currentOrganization.id,
            signature: elementSignature
          });

        if (signatureError && signatureError.code !== 'PGRST116') {
          console.error('❌ Error in signature search:', signatureError);
          error = signatureError;
        } else if (signatureData) {
          console.log('✅ Found webhook via signature matching:', signatureData);
          data = signatureData;
        }
      }
      
      if (error) {
        throw error;
      }
      
      console.log('📖 Existing webhook found:', data);
      return data;
    },
    enabled: !!(elementId && currentOrganization?.id && element && isOpen)
  });

  // Update form when existing webhook loads
  useEffect(() => {
    if (existingWebhook) {
      console.log('📝 Populating form with existing webhook:', existingWebhook);
      
      // Handle the new JSON response format from RPC functions
      let webhookData = existingWebhook;
      
      // If the data is wrapped in function name properties, unwrap it
      if (existingWebhook.get_element_webhook_by_signature) {
        webhookData = existingWebhook.get_element_webhook_by_signature;
      } else if (existingWebhook.get_element_webhook_by_fuzzy_match) {
        webhookData = existingWebhook.get_element_webhook_by_fuzzy_match;
      }
      
      console.log('📝 Using webhook data:', webhookData);
      
      setConfig({
        id: webhookData.id,
        webhook_name: webhookData.webhook_name,
        webhook_url: webhookData.webhook_url,
        is_enabled: webhookData.is_enabled,
        event_type: (webhookData.trigger_events?.[0] || 'click') as 'click' | 'submit' | 'change' | 'input',
        description: '', // description not stored in current schema
        headers: webhookData.headers || {},
        payload_template: webhookData.payload_template || {}
      });
    } else if (elementInfo && isOpen) {
      console.log('📝 Setting defaults for new webhook:', elementInfo);
      // Set defaults for new webhook
      setConfig(prev => ({
        ...prev,
        webhook_name: `${elementInfo.label} Webhook`,
        event_type: elementInfo.type as 'click' | 'submit' | 'change' | 'input'
      }));
    }
  }, [existingWebhook, elementInfo, isOpen]);

  // Save webhook configuration
  const saveWebhookMutation = useMutation({
    mutationFn: async (webhookConfig: WebhookConfiguration) => {
      
      if (!element || !currentOrganization?.id || !user?.id) {
        const errorMsg = `Missing required data: element=${!!element}, org=${!!currentOrganization?.id}, user=${!!user?.id}`;
        console.error('❌ Save failed:', errorMsg);
        throw new Error(errorMsg);
      }

      const elementSignature = generateElementSignature(element);
      const contentHash = generateElementContentHash(element);
      

      // First, ensure element is registered
      
      // Get current page path
      const currentPath = window.location.pathname;
      
      // Generate element selector (simplified for now)
      const generateSelector = (el: HTMLElement) => {
        if (el.id) return `#${el.id}`;
        if (el.className) return `.${el.className.split(' ').filter(c => c.length > 0).join('.')}`;
        return el.tagName.toLowerCase();
      };
      
      const registryData = {
        organization_id: currentOrganization.id,
        element_signature: elementSignature,
        page_path: currentPath,
        element_type: element.tagName.toLowerCase(),
        element_selector: generateSelector(element),
        element_content_hash: contentHash,
        element_text: elementInfo?.label || '',
        element_attributes: {
          id: element.id || null,
          className: element.className || null,
          tagName: element.tagName.toLowerCase(),
          textContent: element.textContent?.trim() || null
        },
        element_position: {
          x: element.getBoundingClientRect().x,
          y: element.getBoundingClientRect().y,
          width: element.getBoundingClientRect().width,
          height: element.getBoundingClientRect().height
        },
        is_active: true,
        is_verified: false,
        created_by: user.id
      };
      
      console.log('📝 Registry data:', registryData);

      const { data: registryEntry, error: registryError } = await supabase
        .from('element_registry')
        .upsert(registryData, {
          onConflict: 'organization_id,element_signature',
          ignoreDuplicates: false
        })
        .select('id')
        .single();

      if (registryError) {
        console.error('❌ Registry error:', registryError);
        throw new Error(`Failed to register element: ${registryError.message}`);
      }
      
      console.log('✅ Registry entry created/found:', registryEntry);

      // Then save/update webhook configuration
      console.log('💾 Preparing webhook data...');
      const webhookData = {
        element_id: registryEntry.id,
        organization_id: currentOrganization.id,
        webhook_name: webhookConfig.webhook_name,
        webhook_url: webhookConfig.webhook_url,
        http_method: 'POST', // Default to POST
        headers: webhookConfig.headers,
        payload_template: webhookConfig.payload_template,
        trigger_events: [webhookConfig.event_type], // Convert single event to array
        is_enabled: webhookConfig.is_enabled,
        is_async: true,
        timeout_seconds: 30,
        retry_attempts: 3,
        total_executions: 0,
        successful_executions: 0,
        failed_executions: 0,
        created_by: user.id,
        updated_by: user.id
      };
      
      console.log('💾 Webhook data to save:', webhookData);

      if (webhookConfig.id) {
        // Update existing
        console.log('🔄 Updating existing webhook with ID:', webhookConfig.id);
        const { data, error } = await supabase
          .from('element_webhooks')
          .update(webhookData)
          .eq('id', webhookConfig.id)
          .select()
          .single();

        if (error) {
          console.error('❌ Update error:', error);
          throw new Error(`Failed to update webhook: ${error.message}`);
        }
        
        console.log('✅ Webhook updated successfully:', data);
        return data;
      } else {
        // Create new
        console.log('➕ Creating new webhook...');
        const { data, error } = await supabase
          .from('element_webhooks')
          .insert(webhookData)
          .select()
          .single();

        if (error) {
          console.error('❌ Insert error:', error);
          throw new Error(`Failed to create webhook: ${error.message}`);
        }
        
        console.log('✅ Webhook created successfully:', data);
        return data;
      }
    },
    onSuccess: (data) => {
      console.log('🎉 Save mutation completed successfully:', data);
      toast.success('Webhook configuration saved successfully');
      queryClient.invalidateQueries({ queryKey: ['element-webhook'] });
      // Don't close immediately to let user see the success
      setTimeout(() => onClose(), 1000);
    },
    onError: (error) => {
      console.error('❌ Save mutation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to save webhook: ${errorMessage}`);
    }
  });

  // Delete webhook configuration
  const deleteWebhookMutation = useMutation({
    mutationFn: async () => {
      if (!config.id) throw new Error('No webhook to delete');

      const { error } = await supabase
        .from('element_webhooks')
        .delete()
        .eq('id', config.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Webhook configuration deleted');
      queryClient.invalidateQueries({ queryKey: ['element-webhook'] });
      onClose();
    },
    onError: (error) => {
      console.error('Failed to delete webhook:', error);
      toast.error('Failed to delete webhook configuration');
    }
  });

  // Test webhook
  const testWebhook = useCallback(async () => {
    
    if (!config.webhook_url || !element) {
      console.warn('⚠️ Missing webhook URL or element for test', { url: config.webhook_url, hasElement: !!element });
      toast.error('Missing webhook URL or element data');
      return;
    }

    setIsTestingWebhook(true);
    setTestResult(null);

    try {
      // Create test payload
      const testPayload = {
        event_type: config.event_type,
        element: {
          tag: element.tagName.toLowerCase(),
          text: elementInfo?.label || '',
          description: elementInfo?.description || '',
          id: element.id || null,
          className: element.className || null
        },
        organization_id: currentOrganization?.id,
        user_id: user?.id,
        timestamp: new Date().toISOString(),
        test: true,
        webhook_name: config.webhook_name
      };

      console.log('📦 Test payload:', testPayload);
      
      const requestHeaders = {
        'Content-Type': 'application/json',
        'User-Agent': 'OrganizePrime-Webhook-Test/1.0',
        ...config.headers
      };
      
      console.log('📨 Sending request to:', config.webhook_url);
      console.log('📨 Request headers:', requestHeaders);
      
      const startTime = Date.now();
      
      const response = await fetch(config.webhook_url, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(testPayload),
        mode: 'cors', // Explicit CORS mode
        credentials: 'omit' // Don't send cookies
      });

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log('📥 Response received:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        duration: `${duration}ms`
      });

      let responseText = '';
      try {
        responseText = await response.text();
        console.log('📄 Response body:', responseText);
      } catch (textError) {
        console.warn('⚠️ Could not read response body:', textError);
      }

      if (response.ok) {
        setTestResult({ 
          success: true, 
          message: `✅ Test successful (${response.status} ${response.statusText}) - ${duration}ms${responseText ? `\nResponse: ${responseText.substring(0, 100)}` : ''}` 
        });
        toast.success(`Webhook test successful (${response.status})`);
      } else {
        setTestResult({ 
          success: false, 
          message: `❌ Test failed (${response.status} ${response.statusText}) - ${duration}ms${responseText ? `\nResponse: ${responseText.substring(0, 100)}` : ''}` 
        });
        toast.error(`Webhook test failed (${response.status})`);
      }
    } catch (error) {
      console.error('❌ Test webhook error:', error);
      
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Provide more specific error messages
        if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Network error - check CORS settings or if URL is accessible';
        } else if (error.message.includes('TypeError')) {
          errorMessage = 'Invalid URL format or network issue';
        }
      }
      
      setTestResult({ 
        success: false, 
        message: `❌ Test failed: ${errorMessage}` 
      });
      
      toast.error(`Test failed: ${errorMessage}`);
    } finally {
      setIsTestingWebhook(false);
      console.log('🧪 Test webhook completed');
    }
  }, [config, element, elementInfo, currentOrganization, user]);

  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    saveWebhookMutation.mutate(config);
  }, [config, saveWebhookMutation]);

  // Don't render if not open
  if (!isOpen || !elementId) return null;

  // Render loading state
  if (isLoadingWebhook) {
    return (
      <ConfigurationPanelContainer onClose={onClose}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </ConfigurationPanelContainer>
    );
  }

  return (
    <ConfigurationPanelContainer onClose={onClose}>
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Configure Webhook
            </h2>
            {elementInfo && (
              <p className="text-sm text-muted-foreground mt-1">
                {elementInfo.description} • {elementInfo.type} event
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Configuration */}
          <div className="space-y-4">
            <h3 className="font-medium">Basic Configuration</h3>
            
            <div className="space-y-2">
              <Label htmlFor="webhook_name">Webhook Name</Label>
              <Input
                id="webhook_name"
                value={config.webhook_name}
                onChange={(e) => setConfig(prev => ({ ...prev, webhook_name: e.target.value }))}
                placeholder="Enter webhook name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhook_url">Webhook URL</Label>
              <Input
                id="webhook_url"
                type="url"
                value={config.webhook_url}
                onChange={(e) => setConfig(prev => ({ ...prev, webhook_url: e.target.value }))}
                placeholder="https://your-webhook-endpoint.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={config.description}
                onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this webhook does"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_enabled">Enable Webhook</Label>
                <p className="text-xs text-muted-foreground">
                  Webhook will trigger when the element is interacted with
                </p>
              </div>
              <Switch
                id="is_enabled"
                checked={config.is_enabled}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, is_enabled: checked }))}
              />
            </div>
          </div>

          <Separator />

          {/* Event Configuration */}
          <div className="space-y-4">
            <h3 className="font-medium">Event Configuration</h3>
            
            <div className="space-y-2">
              <Label htmlFor="event_type">Event Type</Label>
              <Select
                value={config.event_type}
                onValueChange={(value: any) => setConfig(prev => ({ ...prev, event_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="click">Click</SelectItem>
                  <SelectItem value="submit">Submit</SelectItem>
                  <SelectItem value="change">Change</SelectItem>
                  <SelectItem value="input">Input</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                When should this webhook be triggered?
              </p>
            </div>
          </div>

          <Separator />

          {/* Test Section */}
          <div className="space-y-4">
            <h3 className="font-medium">Test Webhook</h3>
            
            {testResult && (
              <Alert variant={testResult.success ? "default" : "destructive"}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {testResult.message}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={testWebhook}
              disabled={!config.webhook_url || isTestingWebhook}
              className="w-full"
            >
              {isTestingWebhook ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <TestTube className="h-4 w-4 mr-2" />
                  Test Webhook
                </>
              )}
            </Button>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={saveWebhookMutation.isPending}
              className="flex-1"
            >
              {saveWebhookMutation.isPending ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Configuration
                </>
              )}
            </Button>

            {config.id && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => deleteWebhookMutation.mutate()}
                disabled={deleteWebhookMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </form>
      </ScrollArea>
    </ConfigurationPanelContainer>
  );
}

// Container component for the slide-out panel
function ConfigurationPanelContainer({ 
  children, 
  onClose 
}: { 
  children: React.ReactNode; 
  onClose: () => void; 
}) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[10003] bg-black/50" onClick={onClose} data-preview-system="true">
      <div 
        className="absolute right-0 top-0 h-full w-full max-w-md bg-background border-l shadow-xl flex flex-col configuration-panel"
        onClick={(e) => e.stopPropagation()}
        data-preview-system="true"
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

// Hook integration with preview system
export function useConfigurationPanel() {
  const { state, actions } = usePreview();
  
  return {
    isOpen: state.isConfiguring,
    elementId: state.selectedElementId,
    onClose: actions.stopConfiguration
  };
}