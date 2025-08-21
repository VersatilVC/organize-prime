/**
 * Webhook Templates Component
 * Pre-defined webhook templates for common integrations
 */

import React, { useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Zap,
  Plus,
  Eye,
  Copy,
  Download,
  Upload,
  Code,
  Globe,
  MessageSquare,
  Mail,
  Bell,
  Database,
  BarChart3,
  Shield,
  Webhook as WebhookIcon
} from 'lucide-react';
import { toast } from 'sonner';

// Hooks
import { useCreateElementWebhook } from '@/hooks/useElementWebhooks';
import type { CreateElementWebhookRequest } from '@/types/webhook';

// Template definitions
interface WebhookTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  config: {
    httpMethod: string;
    payloadTemplate: any;
    headers: any;
    timeoutSeconds: number;
    retryCount: number;
    rateLimitPerMinute: number;
  };
  examples: {
    endpointUrl: string;
    description: string;
  }[];
  documentation?: string;
}

const WEBHOOK_TEMPLATES: WebhookTemplate[] = [
  {
    id: 'slack-notification',
    name: 'Slack Notification',
    description: 'Send notifications to Slack channels when actions occur',
    category: 'Communication',
    icon: <MessageSquare className="h-4 w-4" />,
    difficulty: 'beginner',
    tags: ['slack', 'notification', 'communication'],
    config: {
      httpMethod: 'POST',
      payloadTemplate: {
        text: 'Action performed in OrganizePrime: ${elementId}',
        channel: '#general',
        username: 'OrganizePrime Bot',
        icon_emoji: ':robot_face:',
        attachments: [
          {
            color: 'good',
            fields: [
              {
                title: 'Feature',
                value: '${featureSlug}',
                short: true
              },
              {
                title: 'User',
                value: '${userId}',
                short: true
              },
              {
                title: 'Timestamp',
                value: '${timestamp}',
                short: false
              }
            ]
          }
        ]
      },
      headers: {
        'Content-Type': 'application/json'
      },
      timeoutSeconds: 30,
      retryCount: 2,
      rateLimitPerMinute: 20
    },
    examples: [
      {
        endpointUrl: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
        description: 'Slack Incoming Webhook URL'
      }
    ],
    documentation: 'https://api.slack.com/messaging/webhooks'
  },
  {
    id: 'discord-notification',
    name: 'Discord Notification',
    description: 'Send rich notifications to Discord channels',
    category: 'Communication',
    icon: <MessageSquare className="h-4 w-4" />,
    difficulty: 'beginner',
    tags: ['discord', 'notification', 'gaming'],
    config: {
      httpMethod: 'POST',
      payloadTemplate: {
        content: 'OrganizePrime Activity',
        embeds: [
          {
            title: 'Action Performed',
            description: 'Element ${elementId} was triggered in ${featureSlug}',
            color: 3447003,
            fields: [
              {
                name: 'Feature',
                value: '${featureSlug}',
                inline: true
              },
              {
                name: 'Element',
                value: '${elementId}',
                inline: true
              },
              {
                name: 'User',
                value: '${userId}',
                inline: true
              }
            ],
            timestamp: '${timestamp}',
            footer: {
              text: 'OrganizePrime'
            }
          }
        ]
      },
      headers: {
        'Content-Type': 'application/json'
      },
      timeoutSeconds: 30,
      retryCount: 2,
      rateLimitPerMinute: 30
    },
    examples: [
      {
        endpointUrl: 'https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN',
        description: 'Discord Channel Webhook URL'
      }
    ],
    documentation: 'https://discord.com/developers/docs/resources/webhook'
  },
  {
    id: 'zapier-trigger',
    name: 'Zapier Integration',
    description: 'Trigger Zapier workflows for complex automation',
    category: 'Automation',
    icon: <Zap className="h-4 w-4" />,
    difficulty: 'intermediate',
    tags: ['zapier', 'automation', 'workflow'],
    config: {
      httpMethod: 'POST',
      payloadTemplate: {
        event_type: '${elementId}_triggered',
        feature: '${featureSlug}',
        user_id: '${userId}',
        timestamp: '${timestamp}',
        data: {
          element_id: '${elementId}',
          page_path: '${pagePath}',
          organization_id: '${organizationId}',
          additional_context: {}
        }
      },
      headers: {
        'Content-Type': 'application/json',
        'X-Source': 'OrganizePrime'
      },
      timeoutSeconds: 45,
      retryCount: 3,
      rateLimitPerMinute: 100
    },
    examples: [
      {
        endpointUrl: 'https://hooks.zapier.com/hooks/catch/YOUR_HOOK_ID/',
        description: 'Zapier Webhook Trigger URL'
      }
    ],
    documentation: 'https://zapier.com/help/create/code-webhooks/trigger-zaps-from-webhooks'
  },
  {
    id: 'email-notification',
    name: 'Email Notification',
    description: 'Send email notifications via services like SendGrid or Mailgun',
    category: 'Communication',
    icon: <Mail className="h-4 w-4" />,
    difficulty: 'intermediate',
    tags: ['email', 'notification', 'sendgrid', 'mailgun'],
    config: {
      httpMethod: 'POST',
      payloadTemplate: {
        personalizations: [
          {
            to: [
              {
                email: 'admin@yourdomain.com',
                name: 'Admin'
              }
            ],
            subject: 'OrganizePrime Action: ${elementId}'
          }
        ],
        from: {
          email: 'noreply@yourdomain.com',
          name: 'OrganizePrime'
        },
        content: [
          {
            type: 'text/html',
            value: '<h2>Action Performed</h2><p>Element <strong>${elementId}</strong> was triggered in <strong>${featureSlug}</strong></p><p>User: ${userId}<br>Time: ${timestamp}</p>'
          }
        ]
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_KEY'
      },
      timeoutSeconds: 30,
      retryCount: 3,
      rateLimitPerMinute: 50
    },
    examples: [
      {
        endpointUrl: 'https://api.sendgrid.com/v3/mail/send',
        description: 'SendGrid Email API'
      },
      {
        endpointUrl: 'https://api.mailgun.net/v3/YOUR_DOMAIN/messages',
        description: 'Mailgun Email API'
      }
    ],
    documentation: 'https://docs.sendgrid.com/api-reference/mail-send/mail-send'
  },
  {
    id: 'analytics-tracking',
    name: 'Analytics Tracking',
    description: 'Track user actions in Google Analytics or custom analytics platforms',
    category: 'Analytics',
    icon: <BarChart3 className="h-4 w-4" />,
    difficulty: 'advanced',
    tags: ['analytics', 'tracking', 'google-analytics', 'mixpanel'],
    config: {
      httpMethod: 'POST',
      payloadTemplate: {
        client_id: '${userId}',
        events: [
          {
            name: 'custom_action',
            params: {
              event_category: 'webhook',
              event_label: '${elementId}',
              feature_slug: '${featureSlug}',
              page_path: '${pagePath}',
              custom_parameter_1: 'value1',
              custom_parameter_2: 'value2'
            }
          }
        ]
      },
      headers: {
        'Content-Type': 'application/json'
      },
      timeoutSeconds: 15,
      retryCount: 2,
      rateLimitPerMinute: 200
    },
    examples: [
      {
        endpointUrl: 'https://www.google-analytics.com/mp/collect?measurement_id=YOUR_MEASUREMENT_ID&api_secret=YOUR_API_SECRET',
        description: 'Google Analytics 4 Measurement Protocol'
      },
      {
        endpointUrl: 'https://api.mixpanel.com/track',
        description: 'Mixpanel Event Tracking'
      }
    ],
    documentation: 'https://developers.google.com/analytics/devguides/collection/protocol/ga4'
  },
  {
    id: 'database-log',
    name: 'Database Logging',
    description: 'Log actions to external databases or data warehouses',
    category: 'Logging',
    icon: <Database className="h-4 w-4" />,
    difficulty: 'advanced',
    tags: ['database', 'logging', 'data-warehouse', 'api'],
    config: {
      httpMethod: 'POST',
      payloadTemplate: {
        table: 'webhook_logs',
        data: {
          event_id: '${timestamp}_${elementId}',
          feature_slug: '${featureSlug}',
          element_id: '${elementId}',
          page_path: '${pagePath}',
          user_id: '${userId}',
          organization_id: '${organizationId}',
          timestamp: '${timestamp}',
          event_type: 'webhook_triggered',
          metadata: {
            source: 'OrganizePrime',
            version: '1.0'
          }
        }
      },
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'YOUR_API_KEY'
      },
      timeoutSeconds: 30,
      retryCount: 3,
      rateLimitPerMinute: 500
    },
    examples: [
      {
        endpointUrl: 'https://api.airtable.com/v0/YOUR_BASE_ID/YOUR_TABLE_NAME',
        description: 'Airtable API'
      },
      {
        endpointUrl: 'https://your-api.com/v1/webhooks/log',
        description: 'Custom API Endpoint'
      }
    ]
  },
  {
    id: 'security-alert',
    name: 'Security Alert',
    description: 'Send security alerts for sensitive actions',
    category: 'Security',
    icon: <Shield className="h-4 w-4" />,
    difficulty: 'intermediate',
    tags: ['security', 'alert', 'monitoring'],
    config: {
      httpMethod: 'POST',
      payloadTemplate: {
        alert_type: 'user_action',
        severity: 'medium',
        title: 'User Action in ${featureSlug}',
        description: 'User ${userId} triggered ${elementId} in ${featureSlug}',
        details: {
          feature: '${featureSlug}',
          element: '${elementId}',
          user_id: '${userId}',
          page_path: '${pagePath}',
          timestamp: '${timestamp}',
          ip_address: '${ipAddress}',
          user_agent: '${userAgent}'
        },
        tags: ['webhook', 'user-action', '${featureSlug}']
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_SECURITY_TOKEN'
      },
      timeoutSeconds: 20,
      retryCount: 3,
      rateLimitPerMinute: 100
    },
    examples: [
      {
        endpointUrl: 'https://api.pagerduty.com/incidents',
        description: 'PagerDuty Incident API'
      },
      {
        endpointUrl: 'https://your-security-system.com/api/alerts',
        description: 'Custom Security System'
      }
    ]
  },
  {
    id: 'n8n-workflow',
    name: 'n8n Workflow',
    description: 'Trigger n8n workflows for complex business automation',
    category: 'Automation',
    icon: <WebhookIcon className="h-4 w-4" />,
    difficulty: 'intermediate',
    tags: ['n8n', 'automation', 'workflow', 'business-process'],
    config: {
      httpMethod: 'POST',
      payloadTemplate: {
        trigger_source: 'OrganizePrime',
        event: {
          type: '${elementId}_action',
          feature: '${featureSlug}',
          element_id: '${elementId}',
          user_id: '${userId}',
          timestamp: '${timestamp}',
          page_path: '${pagePath}',
          organization_id: '${organizationId}'
        },
        metadata: {
          source_system: 'OrganizePrime',
          webhook_version: '1.0',
          processing_priority: 'normal'
        }
      },
      headers: {
        'Content-Type': 'application/json',
        'X-Source': 'OrganizePrime'
      },
      timeoutSeconds: 60,
      retryCount: 3,
      rateLimitPerMinute: 60
    },
    examples: [
      {
        endpointUrl: 'https://your-n8n-instance.com/webhook/YOUR_WEBHOOK_ID',
        description: 'n8n Webhook Trigger URL'
      }
    ],
    documentation: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/'
  }
];

const templateSchema = z.object({
  templateId: z.string().min(1, 'Please select a template'),
  featureSlug: z.string().min(1, 'Feature is required'),
  pagePath: z.string().min(1, 'Page path is required'),
  elementId: z.string().min(1, 'Element ID is required'),
  displayName: z.string().optional(),
  endpointUrl: z.string().url('Must be a valid URL'),
});

type TemplateFormData = z.infer<typeof templateSchema>;

export function WebhookTemplates() {
  const [selectedTemplate, setSelectedTemplate] = useState<WebhookTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Hooks
  const createWebhookMutation = useCreateElementWebhook();

  // Form
  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      templateId: '',
      featureSlug: '',
      pagePath: '',
      elementId: '',
      displayName: '',
      endpointUrl: '',
    },
  });

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(WEBHOOK_TEMPLATES.map(t => t.category)))];

  // Filter templates by category
  const filteredTemplates = selectedCategory === 'all' 
    ? WEBHOOK_TEMPLATES 
    : WEBHOOK_TEMPLATES.filter(t => t.category === selectedCategory);

  const handleTemplateSelect = (template: WebhookTemplate) => {
    setSelectedTemplate(template);
    form.setValue('templateId', template.id);
    if (template.examples.length > 0) {
      form.setValue('endpointUrl', template.examples[0].endpointUrl);
    }
  };

  const handlePreview = (template: WebhookTemplate) => {
    setSelectedTemplate(template);
    setPreviewOpen(true);
  };

  const handleCreateFromTemplate = (template: WebhookTemplate) => {
    setSelectedTemplate(template);
    form.setValue('templateId', template.id);
    if (template.examples.length > 0) {
      form.setValue('endpointUrl', template.examples[0].endpointUrl);
    }
    setCreateOpen(true);
  };

  const onSubmit = async (data: TemplateFormData) => {
    if (!selectedTemplate) return;

    try {
      const webhookData: CreateElementWebhookRequest = {
        featureSlug: data.featureSlug,
        pagePath: data.pagePath,
        elementId: data.elementId,
        displayName: data.displayName || `${selectedTemplate.name} - ${data.elementId}`,
        endpointUrl: data.endpointUrl,
        httpMethod: selectedTemplate.config.httpMethod as any,
        payloadTemplate: selectedTemplate.config.payloadTemplate,
        headers: selectedTemplate.config.headers,
        timeoutSeconds: selectedTemplate.config.timeoutSeconds,
        retryCount: selectedTemplate.config.retryCount,
        rateLimitPerMinute: selectedTemplate.config.rateLimitPerMinute,
        isActive: true,
      };

      await createWebhookMutation.mutateAsync(webhookData);
      toast.success('Webhook created from template successfully');
      setCreateOpen(false);
      form.reset();
    } catch (error) {
      toast.error('Failed to create webhook: ' + error.message);
    }
  };

  const copyTemplate = (template: WebhookTemplate) => {
    const templateData = {
      name: template.name,
      config: template.config,
      examples: template.examples,
    };
    navigator.clipboard.writeText(JSON.stringify(templateData, null, 2));
    toast.success('Template configuration copied to clipboard');
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Webhook Templates
          </CardTitle>
          <CardDescription>
            Pre-configured webhook templates for popular integrations and use cases
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Category Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label>Filter by Category:</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {template.icon}
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <Badge className={getDifficultyColor(template.difficulty)}>
                      {template.difficulty}
                    </Badge>
                  </div>
                </div>
              </div>
              <CardDescription className="mt-2">
                {template.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tags */}
              <div className="flex flex-wrap gap-1">
                {template.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {template.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{template.tags.length - 3}
                  </Badge>
                )}
              </div>

              {/* Method and Category */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{template.config.httpMethod}</span>
                <span>{template.category}</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreview(template)}
                  className="flex-1"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Preview
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyTemplate(template)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleCreateFromTemplate(template)}
                  className="flex-1"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Use
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTemplate?.icon}
              {selectedTemplate?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate?.description}
            </DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <Tabs defaultValue="config" className="space-y-4">
              <TabsList>
                <TabsTrigger value="config">Configuration</TabsTrigger>
                <TabsTrigger value="payload">Payload</TabsTrigger>
                <TabsTrigger value="examples">Examples</TabsTrigger>
              </TabsList>

              <TabsContent value="config" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>HTTP Method</Label>
                    <Input value={selectedTemplate.config.httpMethod} readOnly />
                  </div>
                  <div>
                    <Label>Timeout</Label>
                    <Input value={`${selectedTemplate.config.timeoutSeconds}s`} readOnly />
                  </div>
                  <div>
                    <Label>Retry Count</Label>
                    <Input value={selectedTemplate.config.retryCount} readOnly />
                  </div>
                  <div>
                    <Label>Rate Limit</Label>
                    <Input value={`${selectedTemplate.config.rateLimitPerMinute}/min`} readOnly />
                  </div>
                </div>

                <div>
                  <Label>Headers</Label>
                  <Textarea
                    value={JSON.stringify(selectedTemplate.config.headers, null, 2)}
                    rows={4}
                    className="font-mono text-sm"
                    readOnly
                  />
                </div>
              </TabsContent>

              <TabsContent value="payload" className="space-y-4">
                <div>
                  <Label>Payload Template</Label>
                  <Textarea
                    value={JSON.stringify(selectedTemplate.config.payloadTemplate, null, 2)}
                    rows={12}
                    className="font-mono text-sm"
                    readOnly
                  />
                </div>
              </TabsContent>

              <TabsContent value="examples" className="space-y-4">
                {selectedTemplate.examples.map((example, index) => (
                  <Alert key={index}>
                    <Globe className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-medium">{example.description}</p>
                        <code className="block bg-muted p-2 rounded text-sm break-all">
                          {example.endpointUrl}
                        </code>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}

                {selectedTemplate.documentation && (
                  <Alert>
                    <AlertDescription>
                      <p className="font-medium">Documentation:</p>
                      <a 
                        href={selectedTemplate.documentation} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {selectedTemplate.documentation}
                      </a>
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setPreviewOpen(false);
              if (selectedTemplate) handleCreateFromTemplate(selectedTemplate);
            }}>
              Use This Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create From Template Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Webhook from Template</DialogTitle>
            <DialogDescription>
              Configure your webhook using the {selectedTemplate?.name} template
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="featureSlug">Feature Slug *</Label>
                <Input
                  id="featureSlug"
                  {...form.register('featureSlug')}
                  placeholder="e.g., knowledge-base"
                />
                {form.formState.errors.featureSlug && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.featureSlug.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pagePath">Page Path *</Label>
                <Input
                  id="pagePath"
                  {...form.register('pagePath')}
                  placeholder="e.g., /features/knowledge-base"
                />
                {form.formState.errors.pagePath && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.pagePath.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="elementId">Element ID *</Label>
                <Input
                  id="elementId"
                  {...form.register('elementId')}
                  placeholder="e.g., submit-button"
                />
                {form.formState.errors.elementId && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.elementId.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  {...form.register('displayName')}
                  placeholder="Auto-generated if empty"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endpointUrl">Endpoint URL *</Label>
              <Input
                id="endpointUrl"
                {...form.register('endpointUrl')}
                placeholder="Enter your webhook endpoint URL"
              />
              {form.formState.errors.endpointUrl && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.endpointUrl.message}
                </p>
              )}
            </div>

            {selectedTemplate && (
              <Alert>
                <AlertDescription>
                  <strong>Template:</strong> {selectedTemplate.name}<br />
                  <strong>Method:</strong> {selectedTemplate.config.httpMethod}<br />
                  <strong>Difficulty:</strong> {selectedTemplate.difficulty}
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createWebhookMutation.isPending}
                className="flex items-center gap-2"
              >
                {createWebhookMutation.isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Create Webhook
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}