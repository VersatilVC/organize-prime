import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  ContentType, 
  CreateContentTypeForm,
  CONTENT_TYPE_CATEGORIES
} from '@/features/content-creation/types/contentCreationTypes';
import { useContentTypes } from '@/features/content-creation/hooks/useContentTypes';
import { useOrganization } from '@/contexts/OrganizationContext';
import { uploadContentExampleFiles, ContentExampleFile } from '@/features/content-creation/services/contentFileUploadService';
import { useContentExtraction } from '@/features/content-creation/hooks/useContentExtraction';
import { useAutomaticExtraction } from '@/features/content-creation/hooks/useAutomaticExtraction';
import { useToast } from '@/hooks/use-toast';
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, X, Upload, Link, FileText, Sparkles, CheckCircle, AlertCircle, Clock, Zap, RefreshCw } from 'lucide-react';

// Define the form schema
const contentTypeFormSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less'),
  description: z.string()
    .max(500, 'Description must be 500 characters or less')
    .optional(),
  type_category: z.enum(['major', 'derivative', 'both']),
  target_word_count: z.number()
    .min(1, 'Word count must be at least 1')
    .max(50000, 'Word count must be less than 50,000')
    .optional(),
  style_guidelines: z.string()
    .max(1000, 'Style guidelines must be 1000 characters or less')
    .optional(),
  custom_instructions: z.string()
    .max(1000, 'Custom instructions must be 1000 characters or less')
    .optional(),
  is_active: z.boolean(),
  is_default: z.boolean(),
});

type ContentTypeFormData = z.infer<typeof contentTypeFormSchema>;

interface ContentTypeFormProps {
  isOpen: boolean;
  onClose: () => void;
  contentType?: ContentType | null;
}

export function ContentTypeForm({ isOpen, onClose, contentType }: ContentTypeFormProps) {
  const { createContentType, updateContentType, isCreating, isUpdating } = useContentTypes();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const { 
    extractFromFile, 
    extractFromUrl, 
    isExtracting, 
    isConfigured: isExtractionConfigured,
    supportedFileTypes 
  } = useContentExtraction();
  const {
    triggerExtraction,
    isExtractionInProgress,
    isExtractionCompleted,
    isExtractionFailed,
    getLocalExtractionStatus,
    getLocalExtractionStatusSync
  } = useAutomaticExtraction();
  const [requiredSections, setRequiredSections] = useState<string[]>([]);
  const [examples, setExamples] = useState<Array<{ type: 'file' | 'url'; value: string; description?: string }>>([]);
  const [newSection, setNewSection] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [newExample, setNewExample] = useState({ type: 'url' as 'file' | 'url', value: '', description: '' });
  const [extractedContent, setExtractedContent] = useState<Record<string, string>>({});
  const [extractionStatus, setExtractionStatus] = useState<Record<string, 'pending' | 'processing' | 'completed' | 'failed'>>({});
  const [isProcessingExtraction, setIsProcessingExtraction] = useState(false);
  const [processingContentTypeId, setProcessingContentTypeId] = useState<string | null>(null);

  const isEditing = !!contentType;
  const isLoading = isCreating || isUpdating || isUploading || isExtracting || isProcessingExtraction;

  const form = useForm<ContentTypeFormData>({
    resolver: zodResolver(contentTypeFormSchema),
    defaultValues: {
      name: '',
      description: '',
      type_category: 'major',
      target_word_count: undefined,
      style_guidelines: '',
      custom_instructions: '',
      is_active: true,
      is_default: false,
    },
  });

  // Define handleClose function before useEffect that references it
  const handleClose = () => {
    form.reset();
    setRequiredSections([]);
    setExamples([]);
    setUploadedFiles([]);
    setUploadProgress(0);
    setIsUploading(false);
    setNewSection('');
    setNewExample({ type: 'url', value: '', description: '' });
    onClose();
  };

  // Monitor extraction completion for real-time updates
  useEffect(() => {
    if (isProcessingExtraction && processingContentTypeId) {
      console.log(`🔍 Monitoring extraction for content type: ${processingContentTypeId}`);
      
      // Check extraction status every 2 seconds
      const checkExtractionStatus = async () => {
        const status = await getLocalExtractionStatus(processingContentTypeId);
        console.log(`📊 Extraction status for ${processingContentTypeId}:`, status);
        
        if (status?.status === 'completed') {
          console.log('✅ Extraction completed!');
          setIsProcessingExtraction(false);
          setProcessingContentTypeId(null);
          toast({
            title: "Extraction completed",
            description: "Content has been successfully extracted and processed.",
          });
          handleClose();
        } else if (status?.status === 'failed') {
          console.log('❌ Extraction failed!');
          setIsProcessingExtraction(false);
          setProcessingContentTypeId(null);
          toast({
            title: "Extraction failed",
            description: status.error_message || "Content extraction encountered an error.",
            variant: "destructive",
          });
          // Don't close modal on failure, let user retry
        }
      };

      // Check immediately and then every 2 seconds
      checkExtractionStatus();
      const interval = setInterval(checkExtractionStatus, 2000);
      
      // Cleanup function
      return () => {
        clearInterval(interval);
      };
    }
  }, [isProcessingExtraction, processingContentTypeId, getLocalExtractionStatus, toast, handleClose]);

  // Reset form when modal opens/closes or contentType changes
  useEffect(() => {
    if (isOpen && contentType) {
      // Editing existing content type
      form.reset({
        name: contentType.name,
        description: contentType.description || '',
        type_category: contentType.type_category,
        target_word_count: contentType.target_word_count || undefined,
        style_guidelines: contentType.style_guidelines || '',
        custom_instructions: contentType.custom_instructions || '',
        is_active: contentType.is_active,
        is_default: contentType.is_default,
      });
      setRequiredSections(contentType.required_sections || []);
      setExamples(contentType.examples || []);
    } else if (isOpen && !contentType) {
      // Creating new content type
      form.reset({
        name: '',
        description: '',
        type_category: 'major',
        target_word_count: undefined,
        style_guidelines: '',
        custom_instructions: '',
        is_active: true,
        is_default: false,
      });
      setRequiredSections([]);
      setExamples([]);
      setUploadedFiles([]);
      setUploadProgress(0);
      setIsUploading(false);
    }
  }, [isOpen, contentType, form]);

  const handleSubmit = (data: ContentTypeFormData) => {
    const formData: CreateContentTypeForm = {
      name: data.name,
      description: data.description,
      type_category: data.type_category,
      target_word_count: data.target_word_count,
      style_guidelines: data.style_guidelines,
      custom_instructions: data.custom_instructions,
      required_sections: requiredSections,
      examples: examples,
      is_active: data.is_active,
      is_default: data.is_default,
    };

    // Debug: Log what we're about to submit
    console.log('🚀 Submitting content type with examples:', examples);
    console.log('📝 Form data examples:', formData.examples);

    // Check if this will trigger automatic extraction
    const hasExtractableExamples = examples.length > 0 && 
      examples.some(ex => ex.type === 'file' || ex.type === 'url');

    if (isEditing && contentType) {
      updateContentType({ id: contentType.id, ...formData }, {
        onSuccess: (updatedContentType) => {
          if (hasExtractableExamples) {
            // Start monitoring extraction process
            setIsProcessingExtraction(true);
            setProcessingContentTypeId(updatedContentType.id);
            toast({
              title: "Content type updated",
              description: "Processing automatic extraction...",
            });
            // Don't close modal yet - wait for extraction completion
          } else {
            toast({
              title: "Content type updated",
              description: "Content type updated successfully.",
            });
            handleClose();
          }
        },
      });
    } else {
      createContentType(formData, {
        onSuccess: (newContentType) => {
          if (hasExtractableExamples) {
            // Start monitoring extraction process
            setIsProcessingExtraction(true);
            setProcessingContentTypeId(newContentType.id);
            toast({
              title: "Content type created",
              description: "Processing automatic extraction...",
            });
            // Don't close modal yet - wait for extraction completion
          } else {
            toast({
              title: "Content type created",
              description: "Content type created successfully.",
            });
            handleClose();
          }
        },
      });
    }
  };

  // Handle required sections
  const addRequiredSection = () => {
    if (newSection.trim() && !requiredSections.includes(newSection.trim())) {
      setRequiredSections(prev => [...prev, newSection.trim()]);
      setNewSection('');
    }
  };

  const removeRequiredSection = (section: string) => {
    setRequiredSections(prev => prev.filter(s => s !== section));
  };

  // Handle examples
  const addExample = () => {
    if (newExample.value.trim()) {
      const newExampleData = {
        type: newExample.type,
        value: newExample.value.trim(),
        description: newExample.description.trim() || undefined,
      };
      
      console.log('➕ Adding URL example:', newExampleData);
      
      setExamples(prev => {
        const updated = [...prev, newExampleData];
        console.log('📋 Updated examples array:', updated);
        return updated;
      });
      setNewExample({ type: 'url', value: '', description: '' });
    }
  };

  const removeExample = (index: number) => {
    setExamples(prev => prev.filter((_, i) => i !== index));
  };

  // Handle file uploads
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0 || !currentOrganization?.id) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Upload files to Supabase Storage
      const uploadedFileData = await uploadContentExampleFiles(
        currentOrganization.id,
        files,
        (progress) => setUploadProgress(progress)
      );

      // Add uploaded files to examples list with their storage URLs
      const newFileExamples = uploadedFileData.map(file => ({
        type: 'file' as const,
        value: file.url, // Store the signed URL
        description: file.name, // Use original filename as description
      }));

      setExamples(prev => [...prev, ...newFileExamples]);
      setUploadedFiles(prev => [...prev, ...files]);

      toast({
        title: "Files uploaded successfully",
        description: `${files.length} file(s) uploaded and ready to use as examples.`,
      });

    } catch (error) {
      console.error('File upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : 'Failed to upload files',
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // Reset the file input
      event.target.value = '';
    }
  };

  const removeUploadedFile = (index: number) => {
    const fileToRemove = uploadedFiles[index];
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    
    // Also remove from examples if it's a file type
    setExamples(prev => prev.filter(example => 
      !(example.type === 'file' && example.description === fileToRemove.name)
    ));
  };

  // Handle content extraction from files
  const handleExtractFromFile = async (file: File, exampleIndex: number) => {
    if (!contentType?.id) {
      toast({
        title: "Content type required",
        description: "Please save the content type first before extracting content.",
        variant: "destructive",
      });
      return;
    }

    const key = `file-${exampleIndex}`;
    setExtractionStatus(prev => ({ ...prev, [key]: 'processing' }));

    try {
      const result = await extractFromFile(file, contentType.id);
      if (result.success) {
        setExtractedContent(prev => ({ ...prev, [key]: result.markdown }));
        setExtractionStatus(prev => ({ ...prev, [key]: 'completed' }));
        toast({
          title: "Content extracted successfully",
          description: `Extracted ${result.metadata.wordCount || 0} words from ${file.name}`,
        });
      } else {
        setExtractionStatus(prev => ({ ...prev, [key]: 'failed' }));
        toast({
          title: "Extraction failed",
          description: result.error || "Failed to extract content",
          variant: "destructive",
        });
      }
    } catch (error) {
      setExtractionStatus(prev => ({ ...prev, [key]: 'failed' }));
      toast({
        title: "Extraction error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  // Handle content extraction from URLs
  const handleExtractFromUrl = async (url: string, exampleIndex: number) => {
    if (!contentType?.id) {
      toast({
        title: "Content type required",
        description: "Please save the content type first before extracting content.",
        variant: "destructive",
      });
      return;
    }

    const key = `url-${exampleIndex}`;
    setExtractionStatus(prev => ({ ...prev, [key]: 'processing' }));

    try {
      const result = await extractFromUrl(url, contentType.id);
      if (result.success) {
        setExtractedContent(prev => ({ ...prev, [key]: result.markdown }));
        setExtractionStatus(prev => ({ ...prev, [key]: 'completed' }));
        toast({
          title: "Content extracted successfully",
          description: `Extracted ${result.metadata.wordCount || 0} words from URL`,
        });
      } else {
        setExtractionStatus(prev => ({ ...prev, [key]: 'failed' }));
        toast({
          title: "Extraction failed",
          description: result.error || "Failed to extract content from URL",
          variant: "destructive",
        });
      }
    } catch (error) {
      setExtractionStatus(prev => ({ ...prev, [key]: 'failed' }));
      toast({
        title: "Extraction error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Content Type' : 'Create Content Type'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the content type configuration'
              : 'Define a new content type for your organization'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Basic Information</h4>
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Blog Post, Social Media, Email Campaign" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe this content type and its purpose"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type_category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select content category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CONTENT_TYPE_CATEGORIES.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Major types are standalone content, derivative types are based on other content
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Word Count Configuration */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Word Count Configuration</h4>
              
              <FormField
                control={form.control}
                name="target_word_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Word Count</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="e.g., 1500"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>
                      Recommended word count for this content type
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>


            {/* Required Sections */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Required Sections</h4>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., Introduction, Main Content, Call to Action"
                  value={newSection}
                  onChange={(e) => setNewSection(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRequiredSection())}
                />
                <Button type="button" onClick={addRequiredSection} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {requiredSections.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {requiredSections.map((section) => (
                    <Badge key={section} variant="outline" className="flex items-center gap-1">
                      {section}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeRequiredSection(section)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Examples */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Examples</h4>
              
              {/* File Upload */}
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <div className="mt-4">
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.txt,.md"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="cursor-pointer"
                      onClick={() => document.getElementById('file-upload')?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      {isUploading ? 'Uploading...' : 'Upload example files'}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      PDF, DOC, DOCX, TXT, MD files up to 10MB each
                    </p>
                    
                    {/* Upload Progress */}
                    {isUploading && uploadProgress > 0 && (
                      <div className="mt-4">
                        <div className="flex justify-between text-sm">
                          <span>Uploading files...</span>
                          <span>{Math.round(uploadProgress)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-green-600 h-2 rounded-full transition-all duration-200" 
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Uploaded Files Display */}
              {examples.filter(ex => ex.type === 'file').length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Uploaded Example Files:</p>
                  {examples
                    .filter(ex => ex.type === 'file')
                    .map((example, index) => (
                      <div key={index} className="flex items-center justify-between bg-muted/50 rounded-md p-2">
                        <div className="flex items-center gap-2">
                          <Upload className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">{example.description}</span>
                          <span className="text-xs text-muted-foreground">
                            (Stored securely)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isEditing && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const file = uploadedFiles.find(f => f.name === example.description);
                                if (file) handleExtractFromFile(file, index);
                              }}
                              disabled={isExtracting || extractionStatus[`file-${index}`] === 'processing'}
                            >
                              {extractionStatus[`file-${index}`] === 'processing' ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : extractionStatus[`file-${index}`] === 'completed' ? (
                                <CheckCircle className="h-3 w-3 text-green-600" />
                              ) : extractionStatus[`file-${index}`] === 'failed' ? (
                                <AlertCircle className="h-3 w-3 text-red-600" />
                              ) : (
                                <Sparkles className="h-3 w-3" />
                              )}
                              <span className="ml-1 text-xs">
                                {extractionStatus[`file-${index}`] === 'processing' ? 'Extracting...' :
                                 extractionStatus[`file-${index}`] === 'completed' ? 'Extracted' :
                                 extractionStatus[`file-${index}`] === 'failed' ? 'Failed' : 'Extract'}
                              </span>
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeExample(examples.indexOf(example))}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* URL Examples */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Link className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Add example URL</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://example.com/sample-content"
                    value={newExample.value}
                    onChange={(e) => setNewExample(prev => ({ ...prev, value: e.target.value }))}
                  />
                  <Input
                    placeholder="Description (optional)"
                    value={newExample.description}
                    onChange={(e) => setNewExample(prev => ({ ...prev, description: e.target.value }))}
                    className="max-w-xs"
                  />
                  <Button type="button" onClick={addExample} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Display all examples */}
              {examples.filter(ex => ex.type === 'url').length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">URL Examples:</p>
                  {examples
                    .filter(ex => ex.type === 'url')
                    .map((example, index) => (
                      <div key={index} className="flex items-center justify-between bg-muted/50 rounded-md p-2">
                        <div className="flex items-center gap-2">
                          <Link className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{example.value}</span>
                          {example.description && (
                            <span className="text-xs text-muted-foreground">
                              - {example.description}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isEditing && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleExtractFromUrl(example.value, index)}
                              disabled={isExtracting || extractionStatus[`url-${index}`] === 'processing'}
                            >
                              {extractionStatus[`url-${index}`] === 'processing' ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : extractionStatus[`url-${index}`] === 'completed' ? (
                                <CheckCircle className="h-3 w-3 text-green-600" />
                              ) : extractionStatus[`url-${index}`] === 'failed' ? (
                                <AlertCircle className="h-3 w-3 text-red-600" />
                              ) : (
                                <Sparkles className="h-3 w-3" />
                              )}
                              <span className="ml-1 text-xs">
                                {extractionStatus[`url-${index}`] === 'processing' ? 'Extracting...' :
                                 extractionStatus[`url-${index}`] === 'completed' ? 'Extracted' :
                                 extractionStatus[`url-${index}`] === 'failed' ? 'Failed' : 'Extract'}
                              </span>
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeExample(examples.indexOf(example))}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>


            {/* Automatic Extraction Status */}
            {isEditing && contentType && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Automatic Extraction Status
                </h4>
                <div className="border rounded-lg p-4 bg-muted/20">
                  {isExtractionInProgress(contentType.id) ? (
                    <div className="flex items-center gap-3">
                      <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-blue-600">Extraction in Progress</p>
                        <p className="text-xs text-muted-foreground">
                          Automatically extracting content from {examples.length} example(s)...
                        </p>
                      </div>
                    </div>
                  ) : isExtractionCompleted(contentType.id) ? (
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-600">Extraction Completed</p>
                        <p className="text-xs text-muted-foreground">
                          Content has been automatically extracted and is ready for use.
                        </p>
                      </div>
                    </div>
                  ) : isExtractionFailed(contentType.id) ? (
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-600">Extraction Failed</p>
                        <p className="text-xs text-muted-foreground">
                          {getLocalExtractionStatusSync(contentType.id)?.error_message || 'Automatic extraction encountered an error.'}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => triggerExtraction(contentType.id)}
                        disabled={isProcessingExtraction}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Retry
                      </Button>
                    </div>
                  ) : examples.length > 0 ? (
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-600">Pending Extraction</p>
                        <p className="text-xs text-muted-foreground">
                          {examples.length} example(s) queued for automatic extraction.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => triggerExtraction(contentType.id)}
                        disabled={isProcessingExtraction}
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        Extract Now
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">No Examples Added</p>
                        <p className="text-xs text-muted-foreground">
                          Add file or URL examples to enable automatic content extraction.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Extracted Content Display */}
            {Object.keys(extractedContent).length > 0 && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Extracted Content (Manual)
                </h4>
                <div className="space-y-3">
                  {Object.entries(extractedContent).map(([key, content]) => (
                    <div key={key} className="border rounded-lg p-4 bg-muted/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          {key.startsWith('file-') ? 'File Extract' : 'URL Extract'} - {content.split(' ').length} words
                        </span>
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Extracted
                        </Badge>
                      </div>
                      <div className="text-sm bg-background rounded border p-3 max-h-32 overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-xs font-mono">{content.substring(0, 300)}...</pre>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Style Guidelines */}
            <FormField
              control={form.control}
              name="style_guidelines"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Style Guidelines</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Specific style rules, formatting requirements, or brand guidelines for this content type"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Guidelines that help maintain consistency across content of this type
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Custom Instructions */}
            <FormField
              control={form.control}
              name="custom_instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom AI Instructions</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Special instructions for AI when generating this type of content"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    These instructions will be included in AI prompts for this content type
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Settings */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Settings</h4>
              
              <div className="flex items-center space-x-2">
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Active</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center space-x-2">
                <FormField
                  control={form.control}
                  name="is_default"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Default Content Type</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isProcessingExtraction ? (
                  <>
                    <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                    Processing Extraction...
                  </>
                ) : isCreating || isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    {isEditing ? 'Update' : 'Create'} Content Type
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}