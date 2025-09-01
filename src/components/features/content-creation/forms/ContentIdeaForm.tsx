// Content Idea Form - Phase 3: UI Components

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { 
  ContentIdeaSchema,
  type ContentIdeaFormData,
  type ContentIdeaWithDetails,
  CONTENT_TONES
} from '@/types/content-creation';
import {
  useCreateContentIdea,
  useUpdateContentIdea,
  useTargetAudienceOptions,
  useContentTypeOptions
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
import { Loader2, Plus, X, Lightbulb, AlertTriangle, RefreshCw } from 'lucide-react';
import { ContentIdeaFileUpload } from '../components/ContentIdeaFileUpload';
import { ContentSuggestions } from '../components/ContentSuggestions';
import { ResearchSummaryDisplay } from '../components/ResearchSummaryDisplay';
import { SuggestionCard } from '../components/SuggestionCard';
import { toast } from 'sonner';
import type { SourceFile } from '@/types/content-creation';
import { useUploadAndExtract } from '@/hooks/content-creation';

interface ContentIdeaFormProps {
  isOpen: boolean;
  onClose: () => void;
  idea?: ContentIdeaWithDetails | null;
}

export const ContentIdeaForm = React.memo<ContentIdeaFormProps>(({
  isOpen,
  onClose,
  idea
}) => {
  const isEditing = !!idea;
  
  // Form setup
  const form = useForm<ContentIdeaFormData>({
    resolver: zodResolver(ContentIdeaSchema),
    defaultValues: {
      title: '',
      description: '',
      target_audience: '',
      content_type: '',
      keywords: []
    }
  });

  // Data fetching
  const { data: audienceOptions = [] } = useTargetAudienceOptions();
  const { data: contentTypeOptions = [] } = useContentTypeOptions();

  // Mutations
  const createIdeaMutation = useCreateContentIdea({
    onSuccess: (data) => {
      toast.success('Content idea created!', {
        description: `"${data.title}" has been added to your ideas.`
      });
      
      // Process any pending files after idea creation
      if (pendingFiles.length > 0) {
        const urls = pendingFiles.filter(f => f.type === 'url').map(f => f.value);
        
        if (pendingFileObjects.length > 0 || urls.length > 0) {
          // Trigger extraction with the newly created idea ID
          toast.info('Processing uploaded files and URLs...');
          uploadAndExtractMutation.mutate({
            ideaId: data.id,
            files: pendingFileObjects,
            urls: urls
          });
        }
      }
      
      onClose();
      form.reset();
      setPendingFiles([]);
      setPendingFileObjects([]);
    },
    onError: (error) => {
      toast.error('Failed to create idea', {
        description: error.message
      });
    }
  });

  const updateIdeaMutation = useUpdateContentIdea(idea?.id || '', {
    onSuccess: (data) => {
      toast.success('Content idea updated!', {
        description: `"${data.title}" has been updated.`
      });
      onClose();
    },
    onError: (error) => {
      toast.error('Failed to update idea', {
        description: error.message
      });
    }
  });

  // File management
  const [pendingFiles, setPendingFiles] = React.useState<SourceFile[]>([]);
  const [pendingFileObjects, setPendingFileObjects] = React.useState<File[]>([]);
  const uploadAndExtractMutation = useUploadAndExtract();

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
  const onSubmit = (data: ContentIdeaFormData) => {
    if (isEditing) {
      updateIdeaMutation.mutate(data);
    } else {
      createIdeaMutation.mutate(data);
    }
  };

  // Reset form when idea changes
  useEffect(() => {
    if (idea) {
      form.reset({
        title: idea.title,
        description: idea.description || '',
        target_audience: idea.target_audience || '',
        content_type: idea.content_type,
        keywords: idea.keywords || []
      });
    } else {
      form.reset({
        title: '',
        description: '',
        target_audience: '',
        content_type: '',
        keywords: []
      });
    }
  }, [idea, form]);

  // Close handler
  const handleClose = () => {
    form.reset();
    setKeywordInput('');
    setPendingFiles([]);
    setPendingFileObjects([]);
    onClose();
  };

  const isSubmitting = createIdeaMutation.isPending || updateIdeaMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <ErrorBoundary
          fallback={({ error, resetError }) => (
            <div className="p-6">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex flex-col gap-3">
                    <span>The content idea form encountered an error and couldn't load properly.</span>
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
              <div className="p-1.5 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <Lightbulb className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              {isEditing ? 'Edit Content Idea' : 'Create Content Idea'}
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? 'Update the details of your content idea'
                : 'Define a new content idea for your marketing campaigns'
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
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter a descriptive title for your content idea"
                      {...field}
                      aria-describedby={form.formState.errors.title ? 'title-error' : 'title-description'}
                    />
                  </FormControl>
                  <FormDescription id="title-description">
                    A clear, concise title that captures the essence of your idea
                  </FormDescription>
                  <FormMessage id="title-error" />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => {
                const descriptionLength = field.value?.length || 0;
                const maxLength = 500;
                return (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your content idea in detail..."
                        className="min-h-[100px] resize-none"
                        maxLength={maxLength}
                        {...field}
                        aria-describedby="description-help description-count"
                      />
                    </FormControl>
                    <div className="flex justify-between items-center">
                      <FormDescription id="description-help">
                        Explain what this content idea is about and what it aims to achieve
                      </FormDescription>
                      <span 
                        id="description-count"
                        className={`text-xs ${
                          descriptionLength > maxLength * 0.8 
                            ? 'text-orange-600' 
                            : 'text-muted-foreground'
                        }`}
                        aria-live="polite"
                      >
                        {descriptionLength}/{maxLength}
                      </span>
                    </div>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {/* Content Type and Target Audience Row */}
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
                        {contentTypeOptions.map((type) => (
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
                name="target_audience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Audience</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select target audience" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {audienceOptions.map((audience) => (
                          <SelectItem key={audience.value} value={audience.value}>
                            {audience.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      Choose who this content is primarily aimed at
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Keywords */}
            <FormField
              control={form.control}
              name="keywords"
              render={() => (
                <FormItem>
                  <FormLabel>Keywords</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add keywords..."
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
                    Add relevant keywords to help categorize and find this idea later
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* File Upload Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-px bg-border flex-1" />
                <span className="text-sm text-muted-foreground px-2">Content Sources</span>
                <div className="h-px bg-border flex-1" />
              </div>
              
              <ContentIdeaFileUpload
                ideaId={idea?.id || ''} // Empty string for new ideas, will be populated after creation
                sourceFiles={isEditing ? (idea?.source_files || []) : pendingFiles}
                extractionStatus={idea?.extraction_status || 'none'}
                onFilesChange={isEditing ? undefined : setPendingFiles}
                onFileObjectsChange={isEditing ? undefined : setPendingFileObjects}
                disabled={isSubmitting}
              />
              
              {!isEditing && (
                <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  <strong>Note:</strong> Files and URLs can be uploaded immediately, but content extraction will begin after the idea is created.
                </div>
              )}
            </div>

            {/* AI Suggestions and Research Summary (only show when editing and data exists) */}
            {isEditing && idea && (idea.ai_suggestions?.suggestions?.length || idea.research_summary) && (
              <div className="mt-6 pt-6 border-t space-y-4">
                {/* Research Summary */}
                {idea.research_summary && (
                  <ResearchSummaryDisplay
                    researchSummary={idea.research_summary}
                    generatedAt={idea.ai_suggestions?.generated_at}
                    defaultExpanded={false}
                  />
                )}
                
                {/* AI Suggestions */}
                {idea.ai_suggestions?.suggestions?.length && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-purple-500" />
                      <h3 className="text-lg font-semibold">Content Suggestions</h3>
                      <Badge variant="secondary">
                        {idea.ai_suggestions.suggestions.length} suggestions
                      </Badge>
                    </div>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {idea.ai_suggestions.suggestions.map((suggestion, index) => (
                        <SuggestionCard
                          key={index}
                          suggestion={suggestion}
                          index={index}
                          compact={true}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

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
                    {isEditing ? 'Update Idea' : 'Create Idea'}
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

ContentIdeaForm.displayName = 'ContentIdeaForm';