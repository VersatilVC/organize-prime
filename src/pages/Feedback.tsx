import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Bug, Lightbulb, TrendingUp, HelpCircle, Loader2, CheckCircle, AlertTriangle, Circle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/auth/AuthProvider';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from '@/hooks/use-toast';
import { FileUpload } from '@/components/ui/file-upload';

const feedbackSchema = z.object({
  type: z.enum(['bug', 'feature', 'improvement', 'other'], {
    required_error: 'Please select a feedback type',
  }),
  category: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical'], {
    required_error: 'Please select a priority level',
  }),
  subject: z.string()
    .min(1, 'Subject is required')
    .max(100, 'Subject must be 100 characters or less'),
  description: z.string()
    .min(20, 'Description must be at least 20 characters')
    .max(1000, 'Description must be 1000 characters or less'),
  attachments: z.array(z.string()).optional(),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

const feedbackTypes = [
  { value: 'bug', label: 'Bug Report', icon: Bug, description: 'Report an issue or error' },
  { value: 'feature', label: 'Feature Request', icon: Lightbulb, description: 'Suggest a new feature' },
  { value: 'improvement', label: 'Improvement', icon: TrendingUp, description: 'Suggest an enhancement' },
  { value: 'other', label: 'Other', icon: HelpCircle, description: 'General feedback' },
];

const categories = [
  'UI/UX',
  'Performance',
  'Security',
  'Integration',
  'Documentation',
  'Other'
];

const priorityLevels = [
  { 
    value: 'low', 
    label: 'Low', 
    description: 'Minor issue or suggestion',
    color: 'bg-gray-500',
    textColor: 'text-gray-600',
    icon: Circle
  },
  { 
    value: 'medium', 
    label: 'Medium', 
    description: 'Standard priority',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-600',
    icon: Circle
  },
  { 
    value: 'high', 
    label: 'High', 
    description: 'Important issue',
    color: 'bg-orange-500',
    textColor: 'text-orange-600',
    icon: AlertTriangle
  },
  { 
    value: 'critical', 
    label: 'Critical', 
    description: 'Urgent issue requiring immediate attention',
    color: 'bg-red-500',
    textColor: 'text-red-600',
    icon: AlertTriangle
  },
];

// Memoized components for performance optimization
const FeedbackTypeSelector = React.memo(({ 
  value, 
  onChange, 
  error 
}: {
  value?: string;
  onChange: (value: string) => void;
  error?: string;
}) => (
  <RadioGroup
    onValueChange={onChange}
    value={value}
    className="grid grid-cols-1 gap-3"
  >
    {feedbackTypes.map((type) => (
      <div key={type.value} className="flex items-center space-x-2">
        <RadioGroupItem value={type.value} id={type.value} />
        <Label
          htmlFor={type.value}
          className="flex items-center space-x-2 cursor-pointer flex-1 p-3 border rounded-lg hover:bg-muted/50"
        >
          <type.icon className="h-5 w-5 text-primary" />
          <div>
            <div className="font-medium">{type.label}</div>
            <div className="text-sm text-muted-foreground">{type.description}</div>
          </div>
        </Label>
      </div>
    ))}
  </RadioGroup>
), (prevProps, nextProps) =>
  prevProps.value === nextProps.value &&
  prevProps.error === nextProps.error
);

const PrioritySelector = React.memo(({ 
  value, 
  onChange,
  error 
}: {
  value?: string;
  onChange: (value: string) => void;
  error?: string;
}) => (
  <RadioGroup
    onValueChange={onChange}
    value={value}
    className="grid grid-cols-2 sm:grid-cols-4 gap-3"
  >
    {priorityLevels.map((priority) => (
      <div key={priority.value} className="relative">
        <RadioGroupItem 
          value={priority.value} 
          id={priority.value}
          className="peer sr-only"
        />
        <Label
          htmlFor={priority.value}
          className="flex flex-col items-center justify-center p-4 border-2 border-muted rounded-lg cursor-pointer transition-colors hover:bg-muted/50 peer-checked:border-primary peer-checked:bg-primary/5"
        >
          <priority.icon className={`h-5 w-5 mb-2 ${priority.textColor}`} />
          <span className="font-medium text-sm">{priority.label}</span>
          <span className="text-xs text-muted-foreground text-center">{priority.description}</span>
          <Badge 
            variant="outline" 
            className={`mt-2 text-xs ${priority.color} text-white border-none`}
          >
            {priority.label}
          </Badge>
        </Label>
      </div>
    ))}
  </RadioGroup>
), (prevProps, nextProps) =>
  prevProps.value === nextProps.value &&
  prevProps.error === nextProps.error
);

const CharacterCounter = React.memo(({ 
  current, 
  max, 
  label 
}: {
  current: number;
  max: number;
  label: string;
}) => {
  const percentage = (current / max) * 100;
  const isNearLimit = percentage > 80;
  const isOverLimit = current > max;

  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${
        isOverLimit ? 'text-destructive' : 
        isNearLimit ? 'text-orange-500' : 
        'text-muted-foreground'
      }`}>
        {current}/{max}
      </span>
    </div>
  );
}, (prevProps, nextProps) =>
  prevProps.current === nextProps.current &&
  prevProps.max === nextProps.max &&
  prevProps.label === nextProps.label
);

FeedbackTypeSelector.displayName = 'FeedbackTypeSelector';
PrioritySelector.displayName = 'PrioritySelector';
CharacterCounter.displayName = 'CharacterCounter';

export default function Feedback() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    mode: 'onChange', // Enable real-time validation
    defaultValues: {
      type: undefined,
      category: '',
      priority: 'medium' as const,
      subject: '',
      description: '',
      attachments: [],
    },
  });

  const { watch, formState: { isValid, errors } } = form;
  const watchedSubject = watch('subject') || '';
  const watchedDescription = watch('description') || '';

  // Stable callbacks to prevent re-renders
  const handleFileUploaded = useCallback((filePath: string, fileName: string) => {
    setUploadedFiles(prev => [...prev, filePath]);
  }, []);

  const handleFileRemoved = useCallback(() => {
    setUploadedFiles([]);
  }, []);

  const onSubmit = useCallback(async (data: FeedbackFormData) => {
    if (!user || !currentOrganization) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to submit feedback.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('feedback')
        .insert({
          user_id: user.id,
          organization_id: currentOrganization.id,
          type: data.type,
          category: data.category || null,
          priority: data.priority,
          subject: data.subject,
          description: data.description,
          attachments: uploadedFiles.length > 0 ? uploadedFiles : null,
        });

      if (error) throw error;

      setIsSubmitted(true);
      setUploadedFiles([]);
      form.reset();
      
      toast({
        title: 'Success!',
        description: 'Thank you! Your feedback has been submitted.',
        action: <CheckCircle className="h-4 w-4 text-green-600" />,
      });

      // Reset submitted state after 3 seconds
      setTimeout(() => setIsSubmitted(false), 3000);
      
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to submit feedback. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [user, currentOrganization, uploadedFiles, form]);

  return (
    <>
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        <div className="space-y-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Send Feedback</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          <h1 className="text-3xl font-bold">Send Feedback</h1>
        </div>

        <div className="max-w-2xl mx-auto px-4 sm:px-0">
          <Card>
            <CardHeader>
              <CardTitle>We value your feedback</CardTitle>
              <p className="text-muted-foreground">
                Help us improve by sharing your thoughts, reporting issues, or suggesting new features.
              </p>
            </CardHeader>
            <CardContent>
              {isSubmitted ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-16 w-16 mx-auto text-green-600 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Thank you!</h3>
                  <p className="text-muted-foreground">Your feedback has been submitted successfully.</p>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Feedback Type */}
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">
                            Feedback Type <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <FeedbackTypeSelector
                              value={field.value}
                              onChange={field.onChange}
                              error={errors.type?.message}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Priority */}
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">
                            Priority <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <PrioritySelector
                              value={field.value}
                              onChange={field.onChange}
                              error={errors.priority?.message}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Category */}
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category (Optional)</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((category) => (
                                  <SelectItem key={category} value={category}>
                                    {category}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Subject */}
                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Subject <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Brief description of your feedback"
                              {...field}
                              maxLength={100}
                            />
                          </FormControl>
                          <div className="flex justify-between items-center">
                            <FormMessage />
                            <CharacterCounter
                              current={watchedSubject.length}
                              max={100}
                              label=""
                            />
                          </div>
                        </FormItem>
                      )}
                    />

                    {/* Description */}
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Description <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Please provide detailed information about your feedback..."
                              className="min-h-[120px]"
                              {...field}
                              maxLength={1000}
                            />
                          </FormControl>
                          <div className="flex justify-between items-center">
                            <FormMessage />
                            <CharacterCounter
                              current={watchedDescription.length}
                              max={1000}
                              label=""
                            />
                          </div>
                        </FormItem>
                      )}
                    />

                    {/* Screenshot Upload */}
                    <div className="space-y-3">
                      <label className="text-base font-medium">
                        Screenshot (Optional)
                      </label>
                      <p className="text-sm text-muted-foreground">
                        Attach a screenshot to help us understand your feedback better.
                      </p>
                      <FileUpload
                        onFileUploaded={handleFileUploaded}
                        onFileRemoved={handleFileRemoved}
                        disabled={isSubmitting}
                      />
                    </div>

                    {/* Submit Button */}
                    <div className="space-y-2">
                      {/* Debug info - remove in production */}
                      {process.env.NODE_ENV === 'development' && (
                        <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                          Form valid: {isValid ? 'Yes' : 'No'} | 
                          Errors: {Object.keys(errors).length > 0 ? Object.keys(errors).join(', ') : 'None'}
                        </div>
                      )}
                      
                      <Button
                        type="submit"
                        disabled={!isValid || isSubmitting}
                        className="w-full"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          'Submit Feedback'
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}