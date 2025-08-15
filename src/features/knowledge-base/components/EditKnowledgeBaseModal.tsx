import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { knowledgeBaseApi, KnowledgeBase, UpdateKnowledgeBaseData } from '../services/knowledgeBaseApi';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const editKnowledgeBaseSchema = z.object({
  display_name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less'),
  description: z.string()
    .max(500, 'Description must be 500 characters or less')
    .optional(),
  chunk_size: z.number().min(100).max(2000),
  chunk_overlap: z.number().min(0).max(500),
});

type EditKnowledgeBaseFormData = z.infer<typeof editKnowledgeBaseSchema>;

interface EditKnowledgeBaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  knowledgeBase: KnowledgeBase;
  onSuccess?: () => void;
}

export function EditKnowledgeBaseModal({
  open,
  onOpenChange,
  knowledgeBase,
  onSuccess,
}: EditKnowledgeBaseModalProps) {
  const form = useForm<EditKnowledgeBaseFormData>({
    resolver: zodResolver(editKnowledgeBaseSchema),
    defaultValues: {
      display_name: knowledgeBase.display_name,
      description: knowledgeBase.description || '',
      chunk_size: knowledgeBase.chunk_size,
      chunk_overlap: knowledgeBase.chunk_overlap,
    },
  });

  // Reset form when knowledgeBase changes
  React.useEffect(() => {
    form.reset({
      display_name: knowledgeBase.display_name,
      description: knowledgeBase.description || '',
      chunk_size: knowledgeBase.chunk_size,
      chunk_overlap: knowledgeBase.chunk_overlap,
    });
  }, [knowledgeBase, form]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateKnowledgeBaseData) =>
      knowledgeBaseApi.updateKnowledgeBase(knowledgeBase.id, data),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Knowledge base updated successfully',
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update knowledge base',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: EditKnowledgeBaseFormData) => {
    const updateData: UpdateKnowledgeBaseData = {
      display_name: data.display_name,
      description: data.description,
      chunk_size: data.chunk_size,
      chunk_overlap: data.chunk_overlap,
    };

    updateMutation.mutate(updateData);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !updateMutation.isPending) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Knowledge Base</DialogTitle>
          <DialogDescription>
            Update the settings for "{knowledgeBase.display_name}"
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Display info */}
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <div className="font-medium">Internal Name: {knowledgeBase.name}</div>
              <div className="text-muted-foreground">
                Created: {new Date(knowledgeBase.created_at).toLocaleDateString()}
              </div>
            </div>

            {/* Display Name */}
            <FormField
              control={form.control}
              name="display_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Company Policies, Product Documentation"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The name shown to users
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what this knowledge base contains..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional description to help identify the purpose
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Chunking Settings */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="chunk_size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chunk Size</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={100}
                        max={2000}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1000)}
                      />
                    </FormControl>
                    <FormDescription>
                      Text chunk size (100-2000)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="chunk_overlap"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chunk Overlap</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={500}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 200)}
                      />
                    </FormControl>
                    <FormDescription>
                      Overlap between chunks (0-500)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 bg-muted/50 p-3 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold">{knowledgeBase.file_count}</div>
                <div className="text-xs text-muted-foreground">Files</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{knowledgeBase.total_vectors.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Vectors</div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Update Knowledge Base
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}