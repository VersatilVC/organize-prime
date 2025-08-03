import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Icons } from '@/components/ui/icons';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

interface FeatureCategory {
  id: string;
  name: string;
  description: string;
  slug: string;
  color: string;
  isActive: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

const categorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(50),
  description: z.string().max(200).optional(),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens"),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be valid hex color"),
  isActive: z.boolean()
});

type CategoryFormData = z.infer<typeof categorySchema>;

const defaultCategories: FeatureCategory[] = [
  {
    id: '1',
    name: 'Productivity',
    description: 'Tools to enhance team productivity and efficiency',
    slug: 'productivity',
    color: '#3b82f6',
    isActive: true,
    isSystem: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'Analytics',
    description: 'Data analysis and reporting tools',
    slug: 'analytics',
    color: '#10b981',
    isActive: true,
    isSystem: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '3',
    name: 'Automation',
    description: 'Workflow and process automation tools',
    slug: 'automation',
    color: '#f59e0b',
    isActive: true,
    isSystem: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '4',
    name: 'Intelligence',
    description: 'AI-powered insights and market intelligence',
    slug: 'intelligence',
    color: '#8b5cf6',
    isActive: true,
    isSystem: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

export default function FeatureCategoryManagement() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<FeatureCategory[]>(defaultCategories);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'created'>('name');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FeatureCategory | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      isActive: true,
      color: '#3b82f6'
    }
  });

  const filteredCategories = useMemo(() => {
    let filtered = categories.filter(category =>
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return filtered;
  }, [categories, searchQuery, sortBy]);

  const handleAddCategory = (data: CategoryFormData) => {
    const newCategory: FeatureCategory = {
      id: Math.random().toString(36).substr(2, 9),
      name: data.name,
      description: data.description || '',
      slug: data.slug,
      color: data.color,
      isActive: data.isActive,
      isSystem: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setCategories([...categories, newCategory]);
    setIsAddDialogOpen(false);
    reset();
    
    toast({
      title: "Category Added",
      description: `${data.name} has been successfully created.`,
    });
  };

  const handleEditCategory = (data: CategoryFormData) => {
    if (!editingCategory) return;

    const updatedCategories = categories.map(cat =>
      cat.id === editingCategory.id
        ? {
            ...cat,
            name: data.name,
            description: data.description || '',
            slug: data.slug,
            color: data.color,
            isActive: data.isActive,
            updatedAt: new Date().toISOString()
          }
        : cat
    );

    setCategories(updatedCategories);
    setEditingCategory(null);
    reset();
    
    toast({
      title: "Category Updated",
      description: `${data.name} has been successfully updated.`,
    });
  };

  const handleDeleteCategory = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    if (category?.isSystem) {
      toast({
        title: "Cannot Delete",
        description: "System categories cannot be deleted.",
        variant: "destructive"
      });
      return;
    }

    setCategories(categories.filter(cat => cat.id !== categoryId));
    
    toast({
      title: "Category Deleted",
      description: "The category has been successfully deleted.",
    });
  };

  const openEditDialog = (category: FeatureCategory) => {
    setEditingCategory(category);
    setValue('name', category.name);
    setValue('description', category.description);
    setValue('slug', category.slug);
    setValue('color', category.color);
    setValue('isActive', category.isActive);
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  const watchName = watch('name');
  React.useEffect(() => {
    if (watchName && !editingCategory) {
      setValue('slug', generateSlug(watchName));
    }
  }, [watchName, editingCategory, setValue]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium">Feature Categories</h3>
          <p className="text-sm text-muted-foreground">
            Manage categories for organizing marketplace features
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Icons.plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Category</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(handleAddCategory)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Category Name</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="e.g., Productivity"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Brief description of this category"
                  rows={2}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  {...register('slug')}
                  placeholder="e.g., productivity"
                />
                {errors.slug && (
                  <p className="text-sm text-destructive">{errors.slug.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Badge Color</Label>
                <Input
                  id="color"
                  type="color"
                  {...register('color')}
                  className="w-20 h-10"
                />
                {errors.color && (
                  <p className="text-sm text-destructive">{errors.color.message}</p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  {...register('isActive')}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  Add Category
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Sort */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Icons.search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setSortBy(sortBy === 'name' ? 'created' : 'name')}
        >
          Sort by {sortBy === 'name' ? 'Name' : 'Date'}
          <Icons.chevronDown className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Categories Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCategories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="font-medium">{category.name}</span>
                    {category.isSystem && (
                      <Badge variant="outline" className="text-xs">System</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="max-w-xs">
                  <span className="text-sm text-muted-foreground truncate">
                    {category.description}
                  </span>
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {category.slug}
                  </code>
                </TableCell>
                <TableCell>
                  <Badge variant={category.isActive ? 'default' : 'secondary'}>
                    {category.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(category)}
                    >
                      <Icons.edit className="h-4 w-4" />
                    </Button>
                    {!category.isSystem && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Icons.trash className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Category</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{category.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteCategory(category.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleEditCategory)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Category Name</Label>
              <Input
                id="edit-name"
                {...register('name')}
                placeholder="e.g., Productivity"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                {...register('description')}
                placeholder="Brief description of this category"
                rows={2}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-slug">Slug</Label>
              <Input
                id="edit-slug"
                {...register('slug')}
                placeholder="e.g., productivity"
                disabled={editingCategory?.isSystem}
              />
              {errors.slug && (
                <p className="text-sm text-destructive">{errors.slug.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-color">Badge Color</Label>
              <Input
                id="edit-color"
                type="color"
                {...register('color')}
                className="w-20 h-10"
              />
              {errors.color && (
                <p className="text-sm text-destructive">{errors.color.message}</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isActive"
                {...register('isActive')}
              />
              <Label htmlFor="edit-isActive">Active</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setEditingCategory(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                Update Category
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}