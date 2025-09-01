// Content Brief Form - Phase 3: UI Components

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { 
  ContentBriefSchema,
  type ContentBriefFormData,
  type ContentBriefWithDetails,
  type ContentIdeaWithDetails,
  CONTENT_TYPES,
  CONTENT_TONES
} from '@/types/content-creation';
import {
  useCreateContentBrief,
  useUpdateContentBrief,
  useTargetAudienceOptions
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
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, X, FileText, Lightbulb, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface ContentBriefFormProps {
  isOpen: boolean;
  onClose: () => void;
  brief?: ContentBriefWithDetails | null;
  fromIdea?: ContentIdeaWithDetails | null; // Pre-populate from an idea
}

export const ContentBriefForm = React.memo<ContentBriefFormProps>(({
  isOpen,
  onClose,
  brief,
  fromIdea
}) => {
  const isEditing = !!brief;
  
  // Form setup
  const form = useForm<ContentBriefFormData>({
    resolver: zodResolver(ContentBriefSchema),
    defaultValues: {
      title: '',
      content_type: '',
      requirements: '',
      brief_content: '',
      tone: '',
      target_audience: '',
      keywords: []
    }
  });

  // Data fetching
  const { data: audienceOptions = [] } = useTargetAudienceOptions();

  // Mutations
  const createBriefMutation = useCreateContentBrief({
    onSuccess: (data) => {
      toast.success('Content brief created!', {
        description: `"${data.title}" has been added to your briefs.`
      });
      onClose();
      form.reset();
    },
    onError: (error) => {
      toast.error('Failed to create brief', {
        description: error.message
      });
    }
  });

  const updateBriefMutation = useUpdateContentBrief(brief?.id || '', {
    onSuccess: (data) => {
      toast.success('Content brief updated!', {
        description: `"${data.title}" has been updated.`
      });
      onClose();
    },
    onError: (error) => {
      toast.error('Failed to update brief', {
        description: error.message
      });
    }
  });

  // Keywords management
  const [keywordInput, setKeywordInput] = React.useState('');
  const watchedKeywords = form.watch('keywords') || [];

  const addKeyword = () => {
    if (keywordInput.trim() && !watchedKeywords.includes(keywordInput.trim())) {
      const newKeywords = [...watchedKeywords, keywordInput.trim()];
      form.setValue('keywords', newKeywords);
      setKeywordInput('');
    }
  };

  const removeKeyword = (keywordToRemove: string) => {
    const newKeywords = watchedKeywords.filter(k => k !== keywordToRemove);
    form.setValue('keywords', newKeywords);
  };

  const handleKeywordInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    } else if (e.key === 'Backspace' && !keywordInput && watchedKeywords.length > 0) {
      removeKeyword(watchedKeywords[watchedKeywords.length - 1]);
    }
  };

  // Form submission
  const onSubmit = (data: ContentBriefFormData) => {
    // Add idea_id if creating from an idea
    const submitData = fromIdea ? { ...data, idea_id: fromIdea.id } : data;
    
    if (isEditing) {
      updateBriefMutation.mutate(submitData);
    } else {
      createBriefMutation.mutate(submitData);
    }
  };

  // Reset form when brief changes or when creating from idea
  useEffect(() => {
    if (brief) {
      // Editing existing brief
      form.reset({
        title: brief.title,
        content_type: brief.content_type,
        requirements: brief.requirements || '',
        brief_content: (brief as any).brief_content || '',
        tone: brief.tone || '',
        target_audience: brief.target_audience || '',
        keywords: brief.keywords || []
      });
    } else if (fromIdea) {
      // Creating from idea - pre-populate with idea data
      form.reset({
        title: `${fromIdea.title} - Brief`,
        content_type: fromIdea.content_type,
        requirements: fromIdea.description || '',
        brief_content: '',
        tone: '',
        target_audience: fromIdea.target_audience || '',
        keywords: fromIdea.keywords || []
      });
    } else {
      // Creating new brief
      form.reset({
        title: '',
        content_type: '',
        requirements: '',
        brief_content: '',
        tone: '',
        target_audience: '',
        keywords: []
      });
    }
  }, [brief, fromIdea, form]);

  // Close handler
  const handleClose = () => {
    form.reset();
    setKeywordInput('');
    onClose();
  };

  const isSubmitting = createBriefMutation.isPending || updateBriefMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <ErrorBoundary
          fallback={({ error, resetError }) => (
            <div className="p-6">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex flex-col gap-3">
                    <span>The content brief form encountered an error and couldn't load properly.</span>
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
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            {isEditing ? 'Edit Content Brief' : fromIdea ? 'Create Brief from Idea' : 'Create Content Brief'}
          </DialogTitle>
          <DialogDescription>
            {fromIdea && (
              <div className="flex items-center gap-2 mb-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <Lightbulb className="h-4 w-4 text-yellow-600" />
                <span className="text-sm">Creating brief from idea: "{fromIdea.title}"</span>
              </div>
            )}
            {isEditing 
              ? 'Update the detailed specifications for your content brief'
              : 'Define detailed requirements and specifications for content creation'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brief Title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter a specific title for this brief"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    A clear, specific title that describes what content will be created
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Content Type and Tone Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <FormField
                control={form.control}
                name="tone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tone</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select tone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CONTENT_TONES.map((tone) => (
                          <SelectItem key={tone.value} value={tone.value}>
                            {tone.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      The voice and style for this content
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Target Audience */}
            <FormField
              control={form.control}
              name="target_audience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Audience</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Who is this content specifically for?"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Be specific about demographics, interests, or job roles
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Requirements */}
            <FormField
              control={form.control}
              name="requirements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content Requirements</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detailed requirements, objectives, key points to cover, structure, length, etc..."
                      className="min-h-[120px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Include specific objectives, key points, structure requirements, word count, etc.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Brief Content (AI-generated or manually edited) */}
            <FormField
              control={form.control}
              name="brief_content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brief Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="AI-generated brief content will appear here, or you can write your own..."
                      className="min-h-[200px] resize-none font-mono text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    This is the detailed content brief, either AI-generated from N8N or manually written. Supports Markdown formatting.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Keywords */}
            <FormField
              control={form.control}
              name="keywords"
              render={() => (
                <FormItem>
                  <FormLabel>Keywords & Topics</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add keywords or topics..."
                          value={keywordInput}
                          onChange={(e) => setKeywordInput(e.target.value)}
                          onKeyDown={handleKeywordInputKeyDown}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={addKeyword}
                          disabled={!keywordInput.trim()}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {watchedKeywords.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {watchedKeywords.map((keyword) => (
                            <Badge
                              key={keyword}
                              variant="secondary"
                              className="flex items-center gap-1 pr-1"
                            >
                              {keyword}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 p-0 hover:bg-transparent"
                                onClick={() => removeKeyword(keyword)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    Important keywords, topics, or themes to include in the content
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
                    {isEditing ? 'Update Brief' : 'Create Brief'}
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

ContentBriefForm.displayName = 'ContentBriefForm';