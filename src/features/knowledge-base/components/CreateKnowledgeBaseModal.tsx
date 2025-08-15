import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { knowledgeBaseApi, CreateKnowledgeBaseData } from '../services/knowledgeBaseApi';
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
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const createKnowledgeBaseSchema = z.object({
  display_name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less'),
  description: z.string()
    .max(500, 'Description must be 500 characters or less')
    .optional(),
  type: z.enum(['Company', 'Industry', 'Competitor', 'Product', 'General'])
    .optional(),
  embedding_model: z.string().optional(),
  chunk_size: z.number().min(100).max(2000).optional(),
  chunk_overlap: z.number().min(0).max(500).optional(),
});

type CreateKnowledgeBaseFormData = z.infer<typeof createKnowledgeBaseSchema>;

interface CreateKnowledgeBaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateKnowledgeBaseModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateKnowledgeBaseModalProps) {
  const { currentOrganization } = useOrganization();

  const form = useForm<CreateKnowledgeBaseFormData>({
    resolver: zodResolver(createKnowledgeBaseSchema),
    defaultValues: {
      display_name: '',
      description: '',
      type: 'General',
      embedding_model: 'text-embedding-ada-002',
      chunk_size: 1000,
      chunk_overlap: 200,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateKnowledgeBaseData) =>
      knowledgeBaseApi.createKnowledgeBase(currentOrganization!.id, data),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Knowledge base created successfully',
      });
      form.reset();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create knowledge base',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: CreateKnowledgeBaseFormData) => {
    if (!currentOrganization) return;

    // Generate a unique name from display name
    const name = data.display_name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    const createData: CreateKnowledgeBaseData = {
      name: `kb_${name}_${Date.now()}`,
      display_name: data.display_name,
      description: data.description,
      type: data.type,
      embedding_model: data.embedding_model,
      chunk_size: data.chunk_size,
      chunk_overlap: data.chunk_overlap,
    };

    createMutation.mutate(createData);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !createMutation.isPending) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Knowledge Base</DialogTitle>
          <DialogDescription>
            Create a new vector database to store and search your organization's knowledge.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <FormField
              control={form.control}
              name="display_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Company Policies, Product Documentation"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for your knowledge base
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
                      placeholder="Describe what this knowledge base will contain..."
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

            {/* Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select knowledge base type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Company">Company</SelectItem>
                      <SelectItem value="Industry">Industry</SelectItem>
                      <SelectItem value="Competitor">Competitor</SelectItem>
                      <SelectItem value="Product">Product</SelectItem>
                      <SelectItem value="General">General</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Category to help organize your knowledge bases
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Advanced Settings */}
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Knowledge Base
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}