import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Edit, Plus, Eye, Save, X } from 'lucide-react';

interface NotificationTemplate {
  id: string;
  key: string;
  value: {
    name: string;
    type: string;
    title: string;
    message: string;
    active: boolean;
    variables?: string[];
  };
}

const TEMPLATE_TYPES = [
  { value: 'welcome_first_login', label: 'Welcome First Login' },
  { value: 'user_invitation_accepted', label: 'User Invitation Accepted' },
  { value: 'feedback_response', label: 'Feedback Response' },
  { value: 'system_maintenance', label: 'System Maintenance' },
];

const AVAILABLE_VARIABLES = [
  '{{user_name}}',
  '{{organization_name}}',
  '{{app_name}}',
  '{{sender_name}}',
  '{{date}}',
  '{{time}}',
];

export function NotificationTemplatesManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState({ title: '', message: '' });
  
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    title: '',
    message: '',
    active: true,
  });

  // Fetch notification templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .like('key', 'notification_template_%');
      
      if (error) throw error;
      
      return data.map(setting => ({
        id: setting.key,
        key: setting.key,
        value: setting.value as any
      })) as NotificationTemplate[];
    }
  });

  // Create/Update template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async ({ templateKey, templateData }: { templateKey: string, templateData: any }) => {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: templateKey,
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
        description: 'Template saved successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      setIsCreateDialogOpen(false);
      setEditingTemplate(null);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to save template. Please try again.',
        variant: 'destructive',
      });
      console.error('Save template error:', error);
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      title: '',
      message: '',
      active: true,
    });
  };

  const handleEdit = (template: NotificationTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.value.name,
      type: template.value.type,
      title: template.value.title,
      message: template.value.message,
      active: template.value.active,
    });
  };

  const handleSave = () => {
    if (!formData.name.trim() || !formData.type || !formData.title.trim() || !formData.message.trim()) {
      toast({
        title: 'Validation Error',
        description: 'All fields are required',
        variant: 'destructive',
      });
      return;
    }

    const templateKey = editingTemplate 
      ? editingTemplate.key 
      : `notification_template_${formData.type}`;

    const templateData = {
      name: formData.name,
      type: formData.type,
      title: formData.title,
      message: formData.message,
      active: formData.active,
      variables: AVAILABLE_VARIABLES.filter(variable => 
        formData.title.includes(variable) || formData.message.includes(variable)
      ),
    };

    saveTemplateMutation.mutate({ templateKey, templateData });
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Notification Templates</h3>
          <p className="text-sm text-muted-foreground">
            Manage system-wide notification templates with customizable variables
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Template
        </Button>
      </div>

      {/* Templates Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Variables</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : templates?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No templates found. Create your first template to get started.
                  </TableCell>
                </TableRow>
              ) : (
                templates?.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.value.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {TEMPLATE_TYPES.find(t => t.value === template.value.type)?.label || template.value.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={template.value.active ? 'default' : 'secondary'}>
                        {template.value.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {template.value.variables?.slice(0, 3).map((variable, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {variable}
                          </Badge>
                        ))}
                        {template.value.variables && template.value.variables.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{template.value.variables.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(template)}
                        className="flex items-center gap-1"
                      >
                        <Edit className="h-3 w-3" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Template Dialog */}
      <Dialog 
        open={isCreateDialogOpen || !!editingTemplate} 
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingTemplate(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Create Template'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    placeholder="Enter template name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter notification title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  placeholder="Enter notification message"
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  rows={8}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                />
                <Label htmlFor="active">Active</Label>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <p className="font-semibold text-lg">{previewData.title}</p>
            </div>
            <div>
              <Label>Message</Label>
              <p className="whitespace-pre-wrap">{previewData.message}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              This preview shows how the template will look with sample data.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}