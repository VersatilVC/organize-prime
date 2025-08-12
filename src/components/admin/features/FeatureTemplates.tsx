import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, Plus, Star, Download, Upload, Package, FileText, BarChart3 } from 'lucide-react';
import { Icons } from '@/components/ui/icons';
import { useFeatureTemplates } from '@/hooks/database/useFeatureTemplates';
import { useSystemFeatures } from '@/hooks/database/useSystemFeatures';
import type { FeatureTemplate, SystemFeature } from '@/types/features';

export function FeatureTemplates() {
  const { templates, isLoading, createFromTemplate, saveAsTemplate, exportFeatures, importFeatures, isCreating, isSaving, isExporting, isImporting } = useFeatureTemplates();
  const { features } = useSystemFeatures();
  
  const [selectedTemplate, setSelectedTemplate] = useState<FeatureTemplate | null>(null);
  const [isCreateFromTemplateOpen, setIsCreateFromTemplateOpen] = useState(false);
  const [isSaveAsTemplateOpen, setIsSaveAsTemplateOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<SystemFeature | null>(null);
  const [importData, setImportData] = useState<string>('');
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    version: '1.0',
    author: '',
    tags: '',
  });

  const [customizations, setCustomizations] = useState({
    display_name: '',
    description: '',
    category: '',
  });

  const handleCreateFromTemplate = () => {
    if (!selectedTemplate) return;
    
    createFromTemplate({
      templateId: selectedTemplate.id,
      customizations: {
        display_name: customizations.display_name || selectedTemplate.default_config.display_name,
        description: customizations.description || selectedTemplate.default_config.description,
        category: customizations.category || selectedTemplate.default_config.category,
      },
    });
    
    setIsCreateFromTemplateOpen(false);
    setSelectedTemplate(null);
    setCustomizations({ display_name: '', description: '', category: '' });
  };

  const handleSaveAsTemplate = () => {
    if (!selectedFeature) return;

    saveAsTemplate({
      featureId: selectedFeature.id,
      templateData: {
        name: templateForm.name,
        description: templateForm.description,
        category: selectedFeature.category,
        icon_name: selectedFeature.icon_name,
        color_hex: selectedFeature.color_hex,
        version: templateForm.version,
        author: templateForm.author,
        tags: templateForm.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        default_config: {
          display_name: selectedFeature.display_name,
          description: selectedFeature.description || '',
          category: selectedFeature.category,
          icon_name: selectedFeature.icon_name,
          color_hex: selectedFeature.color_hex,
          navigation_config: selectedFeature.navigation_config,
          pages: [],
          required_tables: selectedFeature.required_tables,
          webhook_endpoints: selectedFeature.webhook_endpoints,
          setup_sql: selectedFeature.setup_sql,
          cleanup_sql: selectedFeature.cleanup_sql,
        },
        dependencies: [],
        requirements: {
          min_plan: 'free',
          required_permissions: [],
          required_features: [],
        },
        is_system_template: true,
      },
    });

    setIsSaveAsTemplateOpen(false);
    setSelectedFeature(null);
    setTemplateForm({
      name: '',
      description: '',
      version: '1.0',
      author: '',
      tags: '',
    });
  };

  const handleExportFeatures = () => {
    const featureIds = features.map(f => f.id);
    exportFeatures(featureIds);
  };

  const handleImportFeatures = () => {
    try {
      const parsedData = JSON.parse(importData);
      importFeatures(parsedData);
      setIsImportDialogOpen(false);
      setImportData('');
    } catch (error) {
      console.error('Invalid JSON data:', error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImportData(e.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Feature Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading templates...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Feature Templates</CardTitle>
              <p className="text-sm text-muted-foreground">
                Create features from templates or save existing features as templates
              </p>
            </div>
            <div className="flex gap-2">
              <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Import Features</DialogTitle>
                    <DialogDescription>
                      Import features from a JSON export file
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="import-file">Upload File</Label>
                      <Input
                        id="import-file"
                        type="file"
                        accept=".json"
                        onChange={handleFileUpload}
                      />
                    </div>
                    <div>
                      <Label htmlFor="import-json">Or paste JSON data</Label>
                      <Textarea
                        id="import-json"
                        placeholder="Paste JSON export data here..."
                        value={importData}
                        onChange={(e) => setImportData(e.target.value)}
                        rows={8}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleImportFeatures} disabled={!importData || isImporting}>
                      {isImporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Import
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              <Button variant="outline" onClick={handleExportFeatures} disabled={isExporting}>
                {isExporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Download className="h-4 w-4 mr-2" />
                Export All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="browse" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="browse">Browse Templates</TabsTrigger>
              <TabsTrigger value="create">Create Template</TabsTrigger>
            </TabsList>
            
            <TabsContent value="browse" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => {
                  const IconComponent = Icons[template.icon_name as keyof typeof Icons] || Icons.package;
                  
                  return (
                    <Card key={template.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-10 h-10 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: `${template.color_hex}20` }}
                            >
                              <IconComponent 
                                className="w-5 h-5" 
                                style={{ color: template.color_hex }}
                              />
                            </div>
                            <div>
                              <CardTitle className="text-base">{template.name}</CardTitle>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {template.category}
                                </Badge>
                                <div className="flex items-center space-x-1">
                                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                  <span className="text-xs text-muted-foreground">
                                    {template.rating.toFixed(1)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground mb-3">
                          {template.description}
                        </p>
                        <div className="flex flex-wrap gap-1 mb-3">
                          {template.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                          <span>v{template.version}</span>
                          <span>{template.usage_count} uses</span>
                        </div>
                        <Button 
                          className="w-full" 
                          size="sm"
                          onClick={() => {
                            setSelectedTemplate(template);
                            setIsCreateFromTemplateOpen(true);
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Use Template
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              {templates.length === 0 && (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No templates available</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="create" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {features.map((feature) => {
                  const IconComponent = Icons[feature.icon_name as keyof typeof Icons] || Icons.package;
                  
                  return (
                    <Card key={feature.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${feature.color_hex}20` }}
                          >
                            <IconComponent 
                              className="w-5 h-5" 
                              style={{ color: feature.color_hex }}
                            />
                          </div>
                          <div>
                            <CardTitle className="text-base">{feature.display_name}</CardTitle>
                            <Badge variant="outline" className="text-xs mt-1">
                              {feature.category}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground mb-3">
                          {feature.description || 'No description available'}
                        </p>
                        <Button 
                          className="w-full" 
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedFeature(feature);
                            setIsSaveAsTemplateOpen(true);
                          }}
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Save as Template
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create from Template Dialog */}
      <Dialog open={isCreateFromTemplateOpen} onOpenChange={setIsCreateFromTemplateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Feature from Template</DialogTitle>
            <DialogDescription>
              Customize the feature before creating it from the template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="custom-name">Display Name</Label>
              <Input
                id="custom-name"
                placeholder={selectedTemplate?.default_config.display_name}
                value={customizations.display_name}
                onChange={(e) => setCustomizations(prev => ({ ...prev, display_name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="custom-description">Description</Label>
              <Textarea
                id="custom-description"
                placeholder={selectedTemplate?.default_config.description}
                value={customizations.description}
                onChange={(e) => setCustomizations(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="custom-category">Category</Label>
              <Select value={customizations.category} onValueChange={(value) => setCustomizations(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder={selectedTemplate?.default_config.category} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="productivity">Productivity</SelectItem>
                  <SelectItem value="communication">Communication</SelectItem>
                  <SelectItem value="analytics">Analytics</SelectItem>
                  <SelectItem value="integration">Integration</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateFromTemplateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFromTemplate} disabled={isCreating}>
              {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Feature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save as Template Dialog */}
      <Dialog open={isSaveAsTemplateOpen} onOpenChange={setIsSaveAsTemplateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>
              Create a reusable template from this feature
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                placeholder="Enter template name"
                value={templateForm.name}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                placeholder="Describe what this template does"
                value={templateForm.description}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="template-version">Version</Label>
                <Input
                  id="template-version"
                  placeholder="1.0"
                  value={templateForm.version}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, version: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="template-author">Author</Label>
                <Input
                  id="template-author"
                  placeholder="Your name"
                  value={templateForm.author}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, author: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="template-tags">Tags (comma-separated)</Label>
              <Input
                id="template-tags"
                placeholder="business, productivity, automation"
                value={templateForm.tags}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, tags: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveAsTemplateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAsTemplate} disabled={isSaving || !templateForm.name}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}