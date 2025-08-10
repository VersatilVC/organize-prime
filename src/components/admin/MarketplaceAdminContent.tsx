import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Package, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  BarChart3, 
  Eye, 
  EyeOff,
  Users,
  TrendingUp,
  Activity,
  Store,
  RotateCcw
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { AppCreationModal } from './AppCreationModal';
import { AppEditModal } from './AppEditModal';
import { MarketplaceAnalytics } from './MarketplaceAnalytics';
import { MarketplaceSettings } from './MarketplaceSettings';
import { useAppCategories, type AppCategory } from '@/hooks/database/useAppCategories';

interface MarketplaceApp {
  id: string;
  name: string;
  slug: string;
  description: string;
  long_description: string;
  category: string;
  subcategory?: string;
  pricing_model: 'free' | 'paid' | 'freemium';
  base_price: number;
  currency?: string;
  app_config?: Record<string, any> | null;
  navigation_config?: Record<string, any> | null;
  settings_schema?: Record<string, any> | null;
  icon_name: string;
  is_featured: boolean;
  is_active: boolean;
  is_system_app?: boolean;
  requires_approval: boolean;
  install_count: number;
  rating_average: number;
  rating_count: number;
  version?: string;
  created_at: string;
  updated_at?: string;
  required_permissions: string[];
  n8n_webhooks: Record<string, string>;
}


// AppCategory interface now imported from useAppCategories hook

export const MarketplaceAdminContent: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingApp, setEditingApp] = useState<MarketplaceApp | null>(null);

  // Fetch marketplace apps
  const { data: apps = [], isLoading: appsLoading } = useQuery({
    queryKey: ['marketplace-apps'],
    queryFn: async () => {
      console.log('Fetching marketplace apps...');
      const { data, error } = await supabase
        .from('marketplace_apps' as any)
        .select(`
          id, name, slug, description, long_description,
          category, subcategory, pricing_model, base_price, currency,
          app_config, navigation_config, settings_schema,
          icon_name, is_featured, is_active, is_system_app, requires_approval,
          install_count, rating_average, rating_count, version,
          created_at, updated_at,
          required_permissions, n8n_webhooks
        `)
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('is_system_app', { ascending: false })
        .order('name', { ascending: true });
      console.log('Marketplace apps data:', data);
      console.log('Marketplace apps error:', error);
      const kbApp = (data || []).find((a: any) => a.slug === 'knowledge-base');
      console.log('Knowledge Base app found:', kbApp);
      if (error) throw error;
      return (data || []) as unknown as MarketplaceApp[];
    }
  });

  // Fetch app categories using unified hook
  const { data: categories = [], isLoading: categoriesLoading } = useAppCategories();

  // Toggle app status mutation
  const toggleAppStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('marketplace_apps' as any)
        .update({ is_active: !isActive })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-apps'] });
      toast({
        title: 'Success',
        description: 'App status updated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update app status',
        variant: 'destructive',
      });
    }
  });

  // Delete app mutation
  const deleteAppMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('marketplace_apps' as any)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-apps'] });
      toast({
        title: 'Success',
        description: 'App deleted successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete app',
        variant: 'destructive',
      });
    }
  });

  // Handle edit app
  const handleEditApp = (app: MarketplaceApp) => {
    setEditingApp(app);
    setShowEditModal(true);
  };

  // Filter apps based on search and filters
  const filteredApps = apps.filter(app => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = app.name.toLowerCase().includes(term) ||
                         app.slug?.toLowerCase().includes(term) ||
                         app.description.toLowerCase().includes(term);
    const matchesCategory = selectedCategory === 'all' || app.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || 
                         (selectedStatus === 'active' ? app.is_active : !app.is_active);
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalInstalls = apps.reduce((sum, app) => sum + app.install_count, 0);
  const activeApps = apps.filter(app => app.is_active).length;
  const featuredApps = apps.filter(app => app.is_featured).length;

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Apps</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apps.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeApps} active apps
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Installs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInstalls}</div>
            <p className="text-xs text-muted-foreground">
              Across all organizations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Featured Apps</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{featuredApps}</div>
            <p className="text-xs text-muted-foreground">
              Currently featured
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground">
              Available categories
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Apps Management Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Marketplace Apps
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['marketplace-apps'] })} variant="outline" className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                Refresh
              </Button>
              <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create New App
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search apps..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.slug}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Apps Grid */}
          {appsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                      <div className="h-3 bg-muted rounded w-full"></div>
                      <div className="flex gap-2">
                        <div className="h-6 bg-muted rounded w-16"></div>
                        <div className="h-6 bg-muted rounded w-20"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No apps found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first marketplace app to get started'}
              </p>
              {!searchTerm && selectedCategory === 'all' && selectedStatus === 'all' && (
                <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 mx-auto">
                  <Plus className="h-4 w-4" />
                  Create New App
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredApps.map((app) => (
                <Card key={app.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const IconComponent = (LucideIcons as any)[app.icon_name] || Package;
                          return <IconComponent className="h-5 w-5 text-muted-foreground" />;
                        })()}
                        <h3 className="font-semibold truncate" title={app.name}>{app.name}</h3>
                      </div>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {app.version && (
                          <Badge variant="outline" className="text-[10px]">v{app.version}</Badge>
                        )}
                        {app.is_system_app && (
                          <Badge variant="outline" className="text-[10px]">System App</Badge>
                        )}
                        {app.is_featured && (
                          <Badge variant="secondary" className="text-[10px]">Featured</Badge>
                        )}
                        <Badge variant={app.is_active ? 'default' : 'secondary'} className="text-[10px]">
                          {app.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {app.description}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                      <span>Category: {app.category}</span>
                      <span>{app.install_count} installs</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => handleEditApp(app)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleAppStatusMutation.mutate({ 
                          id: app.id, 
                          isActive: app.is_active 
                        })}
                      >
                        {app.is_active ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {/* TODO: Show analytics */}}
                      >
                        <BarChart3 className="h-3 w-3" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete App</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{app.name}"? This action cannot be undone and will remove the app from all organizations.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteAppMutation.mutate(app.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analytics Section */}
      <MarketplaceAnalytics />

      {/* Settings Section */}
      <MarketplaceSettings />

      {/* App Creation Modal */}
      <AppCreationModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        categories={categories}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['marketplace-apps'] });
        }}
      />

      {/* App Edit Modal */}
      <AppEditModal
        open={showEditModal}
        onOpenChange={(open) => {
          setShowEditModal(open);
          if (!open) {
            setEditingApp(null);
          }
        }}
        app={editingApp}
        categories={categories}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['marketplace-apps'] });
        }}
      />
    </div>
  );
};