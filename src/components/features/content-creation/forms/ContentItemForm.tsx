// Content Item Form - Phase 3: UI Components

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { 
  ContentItemSchema,
  type ContentItemFormData,
  type ContentItemWithDetails,
  type ContentBriefWithDetails,
  CONTENT_TYPES
} from '@/types/content-creation';
import {
  useCreateContentItem,
  useUpdateContentItem
} from '@/hooks/content-creation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, FileText, Star, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface ContentItemFormProps {
  isOpen: boolean;
  onClose: () => void;
  item?: ContentItemWithDetails | null;
  fromBrief?: ContentBriefWithDetails | null; // Pre-populate from a brief
}

export const ContentItemForm = React.memo<ContentItemFormProps>(({
  isOpen,
  onClose,
  item,
  fromBrief
}) => {
  const isEditing = !!item;
  
  // Form setup
  const form = useForm<ContentItemFormData>({
    resolver: zodResolver(ContentItemSchema),
    defaultValues: {
      title: '',
      content: '',
      content_type: '',
      is_major_item: false
    }
  });

  // Mutations
  const createItemMutation = useCreateContentItem({
    onSuccess: (data) => {
      toast.success('Content item created!', {
        description: `"${data.title}" has been added to your content library.`
      });
      onClose();
      form.reset();
    },
    onError: (error) => {
      toast.error('Failed to create content item', {
        description: error.message
      });
    }
  });

  const updateItemMutation = useUpdateContentItem(item?.id || '', {
    onSuccess: (data) => {
      toast.success('Content item updated!', {
        description: `"${data.title}" has been updated.`
      });
      onClose();
    },
    onError: (error) => {
      toast.error('Failed to update content item', {
        description: error.message
      });
    }
  });

  // Form submission
  const onSubmit = (data: ContentItemFormData) => {
    // Add brief_id if creating from a brief
    const submitData = fromBrief ? { ...data, brief_id: fromBrief.id } : data;
    
    if (isEditing) {
      updateItemMutation.mutate(submitData);
    } else {
      createItemMutation.mutate(submitData);
    }
  };

  // Reset form when item changes or when creating from brief
  useEffect(() => {
    if (item) {
      // Editing existing item
      form.reset({
        title: item.title,
        content: item.content || '',
        content_type: item.content_type,
        is_major_item: item.is_major_item
      });
    } else if (fromBrief) {
      // Creating from brief - pre-populate with brief data
      form.reset({
        title: fromBrief.title.replace(' - Brief', ''), // Remove "Brief" suffix
        content: fromBrief.requirements || '',
        content_type: fromBrief.content_type,
        is_major_item: true // Default to major when creating from brief
      });
    } else {
      // Creating new item
      form.reset({
        title: '',
        content: '',
        content_type: '',
        is_major_item: false
      });
    }
  }, [item, fromBrief, form]);

  // Close handler
  const handleClose = () => {
    form.reset();
    onClose();
  };

  const isSubmitting = createItemMutation.isPending || updateItemMutation.isPending;
  const watchedIsMajorItem = form.watch('is_major_item');

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <ErrorBoundary
          fallback={({ error, resetError }) => (
            <div className="p-6">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex flex-col gap-3">
                    <span>The content item form encountered an error and couldn't load properly.</span>
                    <div className="flex gap-2">
                      <Button onClick={resetError} size="sm" variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try Again
                      </Button>
                      <Button onClick={handleClose} size="sm">
                        Close Form
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}
        >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-1.5 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            {isEditing ? 'Edit Content Item' : fromBrief ? 'Create Content from Brief' : 'Create Content Item'}
          </DialogTitle>
          <DialogDescription>
            {fromBrief && (
              <div className="flex items-center gap-2 mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="text-sm">Creating content from brief: "{fromBrief.title}"</span>
              </div>
            )}
            {isEditing 
              ? 'Update your content item details and content'
              : 'Create a new content item ready for publication'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Title and Content Type Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content Title *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter the final content title"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The final published title for this content
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select content type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CONTENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Major Item Toggle */}
            <FormField
              control={form.control}
              name="is_major_item"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2 text-base">
                      <Star className="h-4 w-4 text-yellow-500" />
                      Major Content Item
                    </FormLabel>
                    <FormDescription>
                      Major items can be used to generate derivative content (social posts, emails, etc.)
                      {watchedIsMajorItem && (
                        <span className="block text-sm font-medium text-green-600 mt-1">
                          This item will be available for derivative creation
                        </span>
                      )}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Content */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={
                        fromBrief 
                          ? "Write your content based on the brief requirements..." 
                          : "Enter your content here..."
                      }
                      className="min-h-[300px] resize-y font-mono text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The full content for this item. You can use markdown formatting.
                    {fromBrief && (
                      <div className="mt-2 p-2 bg-muted rounded text-xs">
                        <strong>Brief requirements:</strong> {fromBrief.requirements}
                      </div>
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    {isEditing ? 'Update Item' : 'Create Item'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
        </ErrorBoundary>
      </DialogContent>
    </Dialog>
  );
});

ContentItemForm.displayName = 'ContentItemForm';