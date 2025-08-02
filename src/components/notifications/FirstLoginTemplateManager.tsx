import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Edit, Eye, Save, RotateCcw, Heart } from 'lucide-react';

const DEFAULT_WELCOME_TEMPLATE = {
  name: 'Welcome First Login',
  type: 'welcome_first_login',
  title: 'Welcome to {{app_name}}, {{user_name}}!',
  message: `Hello {{user_name}},

Welcome to {{app_name}}! We're excited to have you join {{organization_name}}.

Here are a few things you can do to get started:
• Complete your profile setup
• Explore the dashboard
• Connect with your team members
• Check out our help center for guides and tutorials

If you have any questions, don't hesitate to reach out to our support team.

Best regards,
The {{app_name}} Team`,
  active: true,
  variables: ['{{user_name}}', '{{organization_name}}', '{{app_name}}'],
};

const AVAILABLE_VARIABLES = [
  '{{user_name}}',
  '{{organization_name}}',
  '{{app_name}}',
  '{{sender_name}}',
  '{{date}}',
  '{{time}}',
];

export function FirstLoginTemplateManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState({ title: '', message: '' });
  
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    active: true,
  });

  // Fetch welcome template
  const { data: welcomeTemplate, isLoading } = useQuery({
    queryKey: ['welcome-template'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .eq('key', 'notification_template_welcome_first_login')
        .maybeSingle();
      
      if (error) throw error;
      
      return data ? {
        id: data.key,
        key: data.key,
        value: data.value as typeof DEFAULT_WELCOME_TEMPLATE
      } : null;
    }
  });

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (templateData: any) => {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'notification_template_welcome_first_login',
          value: templateData,
          category: 'notifications',
          updated_by: user?.id,
        }, {
          onConflict: 'key'
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Welcome template updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['welcome-template'] });
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update template. Please try again.',
        variant: 'destructive',
      });
      console.error('Save template error:', error);
    }
  });

  const handleEdit = () => {
    const template = welcomeTemplate?.value || DEFAULT_WELCOME_TEMPLATE;
    setFormData({
      title: template.title,
      message: template.message,
      active: template.active,
    });
    setIsEditDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Title and message are required',
        variant: 'destructive',
      });
      return;
    }

    const templateData = {
      ...DEFAULT_WELCOME_TEMPLATE,
      title: formData.title,
      message: formData.message,
      active: formData.active,
      variables: AVAILABLE_VARIABLES.filter(variable => 
        formData.title.includes(variable) || formData.message.includes(variable)
      ),
    };

    saveTemplateMutation.mutate(templateData);
  };

  const handleResetToDefault = () => {
    setFormData({
      title: DEFAULT_WELCOME_TEMPLATE.title,
      message: DEFAULT_WELCOME_TEMPLATE.message,
      active: DEFAULT_WELCOME_TEMPLATE.active,
    });
  };

  const handlePreview = () => {
    // Replace variables with sample data
    const sampleData = {
      '{{user_name}}': 'John Doe',
      '{{organization_name}}': 'Acme Corporation',
      '{{app_name}}': 'SaaS Platform',
      '{{sender_name}}': 'Admin Team',
      '{{date}}': new Date().toLocaleDateString(),
      '{{time}}': new Date().toLocaleTimeString(),
    };

    let previewTitle = formData.title;
    let previewMessage = formData.message;

    Object.entries(sampleData).forEach(([variable, value]) => {
      previewTitle = previewTitle.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), value);
      previewMessage = previewMessage.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), value);
    });

    setPreviewData({ title: previewTitle, message: previewMessage });
    setIsPreviewOpen(true);
  };

  const insertVariable = (variable: string) => {
    setFormData(prev => ({
      ...prev,
      message: prev.message + variable
    }));
  };

  const currentTemplate = welcomeTemplate?.value || DEFAULT_WELCOME_TEMPLATE;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">First Login Welcome Template</h3>
        <p className="text-sm text-muted-foreground">
          Manage the welcome message that new users see when they first log in to the system
        </p>
      </div>

      {/* Current Template Display */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Current Welcome Template
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={currentTemplate.active ? 'default' : 'secondary'}>
              {currentTemplate.active ? 'Active' : 'Inactive'}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              <div className="h-4 bg-muted animate-pulse rounded" />
              <div className="h-20 bg-muted animate-pulse rounded" />
            </div>
          ) : (
            <>
              <div>
                <Label className="text-sm font-medium">Title</Label>
                <p className="text-lg font-semibold mt-1">{currentTemplate.title}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Message</Label>
                <p className="whitespace-pre-wrap text-sm mt-1 p-3 bg-muted/50 rounded-md">
                  {currentTemplate.message}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Variables Used</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {currentTemplate.variables?.map((variable, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {variable}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Preview for New Users
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Welcome Message Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border rounded-lg p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
              <div className="text-center mb-4">
                <Heart className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <h2 className="text-xl font-bold">
                  {currentTemplate.title.replace('{{user_name}}', 'John Doe').replace('{{app_name}}', 'SaaS Platform')}
                </h2>
              </div>
              <div className="text-sm">
                <p className="whitespace-pre-wrap">
                  {currentTemplate.message
                    .replace(/{{user_name}}/g, 'John Doe')
                    .replace(/{{organization_name}}/g, 'Acme Corporation')
                    .replace(/{{app_name}}/g, 'SaaS Platform')
                  }
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              This is how the welcome message appears to new users on their first login
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Welcome Template</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter welcome message title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  placeholder="Enter welcome message"
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  rows={12}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                />
                <Label htmlFor="active">Active (show to new users)</Label>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Available Variables</h4>
                <div className="space-y-2">
                  {AVAILABLE_VARIABLES.map((variable) => (
                    <Button
                      key={variable}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-xs"
                      onClick={() => insertVariable(variable)}
                    >
                      {variable}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handlePreview}
                  className="w-full flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Preview
                </Button>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleResetToDefault}
                  className="w-full flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset to Default
                </Button>
                
                <Button 
                  onClick={handleSave}
                  disabled={saveTemplateMutation.isPending}
                  className="w-full flex items-center gap-2"
                >
                  {saveTemplateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Template
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border rounded-lg p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
              <div className="text-center mb-4">
                <Heart className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <h2 className="text-xl font-bold">{previewData.title}</h2>
              </div>
              <div className="text-sm">
                <p className="whitespace-pre-wrap">{previewData.message}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              This preview shows how the template will look with sample data to new users.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}