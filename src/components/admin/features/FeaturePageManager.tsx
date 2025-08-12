import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, GripVertical, Route, Shield, Star } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Icons } from '@/components/ui/icons';
import { useToast } from '@/hooks/use-toast';
import { useFeatureValidation } from '@/hooks/database/useFeatureValidation';
import type { FeaturePage, FeaturePageFormData } from '@/types/feature-pages';

const AVAILABLE_COMPONENTS = [
  { value: 'Dashboard', label: 'Dashboard', description: 'Main feature dashboard' },
  { value: 'Settings', label: 'Settings', description: 'Feature configuration page' },
  { value: 'Analytics', label: 'Analytics', description: 'Analytics and reporting' },
  { value: 'Users', label: 'Users', description: 'User management' },
  { value: 'Files', label: 'Files', description: 'File management' },
  { value: 'Chat', label: 'Chat', description: 'Chat interface' },
  { value: 'Search', label: 'Search', description: 'Search interface' },
  { value: 'Custom', label: 'Custom', description: 'Custom component' },
];

const AVAILABLE_PERMISSIONS = [
  { value: 'read', label: 'Read', description: 'View page content' },
  { value: 'write', label: 'Write', description: 'Edit page content' },
  { value: 'admin', label: 'Admin', description: 'Administrative access' },
  { value: 'super_admin', label: 'Super Admin', description: 'System-wide access' },
];

interface FeaturePageManagerProps {
  pages: FeaturePage[];
  onChange: (pages: FeaturePage[]) => void;
  featureSlug: string;
  disabled?: boolean;
}

export function FeaturePageManager({ pages, onChange, featureSlug, disabled = false }: FeaturePageManagerProps) {
  const { toast } = useToast();
  const { validateFeatureRoutes } = useFeatureValidation();
  
  // Debug: Log the pages received
  console.log('🔍 FeaturePageManager: Received pages:', pages);
  console.log('🔍 FeaturePageManager: Feature slug:', featureSlug);
  const [isAddingPage, setIsAddingPage] = useState(false);
  const [editingPage, setEditingPage] = useState<FeaturePage | null>(null);
  const [formData, setFormData] = useState<FeaturePageFormData>({
    title: '',
    route: '',
    description: '',
    component: 'Dashboard',
    permissions: ['read'],
    isDefault: false,
    icon: 'FileText'
  });

  const generateRoute = (title: string) => {
    if (!title) return '';
    const baseRoute = `/${featureSlug}/${title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-')}`;
    return baseRoute;
  };

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      route: generateRoute(title)
    }));
  };

  const handleAddPage = () => {
    const validation = validateFeatureRoutes([...pages, formData]);
    
    if (!validation.isValid) {
      validation.errors.forEach(error => {
        toast({
          title: 'Validation Error',
          description: error,
          variant: 'destructive',
        });
      });
      return;
    }

    const newPage: FeaturePage = {
      id: Date.now().toString(),
      title: formData.title,
      route: formData.route,
      description: formData.description,
      component: formData.component,
      permissions: formData.permissions,
      isDefault: formData.isDefault,
      menuOrder: pages.length,
      icon: formData.icon
    };

    // If this is the first page or marked as default, make it default
    let updatedPages = [...pages, newPage];
    if (formData.isDefault || pages.length === 0) {
      updatedPages = updatedPages.map(page => ({
        ...page,
        isDefault: page.id === newPage.id
      }));
    }

    onChange(updatedPages);
    setIsAddingPage(false);
    resetForm();

    if (validation.warnings.length > 0) {
      validation.warnings.forEach(warning => {
        toast({
          title: 'Warning',
          description: warning,
          variant: 'default',
        });
      });
    }
  };

  const handleEditPage = (page: FeaturePage) => {
    setEditingPage(page);
    setFormData({
      title: page.title,
      route: page.route,
      description: page.description || '',
      component: page.component,
      permissions: page.permissions,
      isDefault: page.isDefault,
      icon: page.icon || 'FileText'
    });
  };

  const handleUpdatePage = () => {
    if (!editingPage) return;

    const otherPages = pages.filter(p => p.id !== editingPage.id);
    const validation = validateFeatureRoutes([...otherPages, formData]);
    
    if (!validation.isValid) {
      validation.errors.forEach(error => {
        toast({
          title: 'Validation Error',
          description: error,
          variant: 'destructive',
        });
      });
      return;
    }

    let updatedPages = pages.map(page => 
      page.id === editingPage.id 
        ? {
            ...page,
            title: formData.title,
            route: formData.route,
            description: formData.description,
            component: formData.component,
            permissions: formData.permissions,
            isDefault: formData.isDefault,
            icon: formData.icon
          }
        : page
    );

    // If marked as default, unmark others
    if (formData.isDefault) {
      updatedPages = updatedPages.map(page => ({
        ...page,
        isDefault: page.id === editingPage.id
      }));
    }

    onChange(updatedPages);
    setEditingPage(null);
    resetForm();
  };

  const handleDeletePage = (pageId: string) => {
    const updatedPages = pages.filter(page => page.id !== pageId);
    
    // If we deleted the default page and there are others, make the first one default
    const hasDefault = updatedPages.some(page => page.isDefault);
    if (!hasDefault && updatedPages.length > 0) {
      updatedPages[0].isDefault = true;
    }

    onChange(updatedPages);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const reorderedPages = Array.from(pages);
    const [removed] = reorderedPages.splice(result.source.index, 1);
    reorderedPages.splice(result.destination.index, 0, removed);

    // Update menu orders
    const updatedPages = reorderedPages.map((page, index) => ({
      ...page,
      menuOrder: index
    }));

    onChange(updatedPages);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      route: '',
      description: '',
      component: 'Dashboard',
      permissions: ['read'],
      isDefault: false,
      icon: 'FileText'
    });
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: checked 
        ? [...prev.permissions, permission]
        : prev.permissions.filter(p => p !== permission)
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Route className="h-5 w-5" />
          Feature Pages
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure the pages and routes that belong to this feature
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Page List */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="pages">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                {pages.map((page, index) => (
                  <Draggable key={page.id} draggableId={page.id} index={index} isDragDisabled={disabled}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="flex items-center gap-3 p-3 border rounded-lg bg-background"
                      >
                        <div {...provided.dragHandleProps} className="text-muted-foreground">
                          <GripVertical className="h-4 w-4" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{page.title}</h4>
                            {page.isDefault && (
                              <Badge variant="default" className="text-xs">
                                <Star className="h-3 w-3 mr-1" />
                                Default
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {page.component}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Route className="h-3 w-3" />
                              {page.route}
                            </span>
                            <span className="flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              {page.permissions.join(', ')}
                            </span>
                          </div>
                          {page.description && (
                            <p className="text-sm text-muted-foreground mt-1">{page.description}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditPage(page)}
                            disabled={disabled}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={disabled}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Page</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{page.title}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeletePage(page.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {pages.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Route className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No pages configured yet</p>
            <p className="text-sm">Add your first page to get started</p>
          </div>
        )}

        {/* Add New Page */}
        {!isAddingPage && !editingPage && (
          <Button 
            onClick={() => setIsAddingPage(true)} 
            variant="outline" 
            className="w-full"
            disabled={disabled}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Page
          </Button>
        )}

        {/* Add/Edit Page Form */}
        {(isAddingPage || editingPage) && (
          <Card className="p-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Page Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g., Dashboard"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Route *</Label>
                  <Input
                    value={formData.route}
                    onChange={(e) => setFormData(prev => ({ ...prev, route: e.target.value }))}
                    placeholder={`/${featureSlug}/dashboard`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this page does..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Component Type</Label>
                  <Select
                    value={formData.component}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, component: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_COMPONENTS.map((comp) => (
                        <SelectItem key={comp.value} value={comp.value}>
                          <div>
                            <div className="font-medium">{comp.label}</div>
                            <div className="text-xs text-muted-foreground">{comp.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Icon</Label>
                  <Select
                    value={formData.icon}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, icon: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['FileText', 'BarChart3', 'Users', 'Settings', 'Database', 'MessageSquare'].map((icon) => (
                        <SelectItem key={icon} value={icon}>
                          <div className="flex items-center gap-2">
                            {(() => {
                              const IconComponent = Icons[icon as keyof typeof Icons];
                              return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
                            })()}
                            {icon}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Permissions</Label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_PERMISSIONS.map((perm) => (
                    <div key={perm.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={perm.value}
                        checked={formData.permissions.includes(perm.value)}
                        onCheckedChange={(checked) => handlePermissionChange(perm.value, checked as boolean)}
                      />
                      <Label htmlFor={perm.value} className="text-sm">
                        {perm.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isDefault"
                  checked={formData.isDefault}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isDefault: checked as boolean }))}
                />
                <Label htmlFor="isDefault" className="text-sm">
                  Make this the default page for the feature
                </Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsAddingPage(false);
                    setEditingPage(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={editingPage ? handleUpdatePage : handleAddPage}
                  disabled={!formData.title || !formData.route}
                >
                  {editingPage ? 'Update Page' : 'Add Page'}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}