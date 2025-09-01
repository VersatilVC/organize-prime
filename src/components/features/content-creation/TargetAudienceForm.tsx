import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  TargetAudience, 
  CreateTargetAudienceForm,
  COMPANY_SIZES,
  JOB_LEVELS,
  COMMON_INDUSTRIES,
  COMMON_DEPARTMENTS
} from '@/features/content-creation/types/contentCreationTypes';
import { useTargetAudiences } from '@/features/content-creation/hooks/useTargetAudiences';
import { useN8NIntegration } from '@/apps/shared/hooks/useN8NIntegration';
import { supabase } from '@/integrations/supabase/client';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, X, Sparkles, Eye, Edit } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Define the form schema
const targetAudienceFormSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less'),
  description: z.string()
    .max(500, 'Description must be 500 characters or less')
    .optional(),
  segment_analysis: z.string()
    .max(1000, 'Segment analysis must be 1000 characters or less')
    .optional(),
  is_active: z.boolean(),
});

type TargetAudienceFormData = z.infer<typeof targetAudienceFormSchema>;

interface TargetAudienceFormProps {
  isOpen: boolean;
  onClose: () => void;
  targetAudience?: TargetAudience | null;
}

export function TargetAudienceForm({ isOpen, onClose, targetAudience }: TargetAudienceFormProps) {
  const { createTargetAudience, updateTargetAudience, isCreating, isUpdating } = useTargetAudiences();
  const { executeWebhook, isTesting } = useN8NIntegration({ appId: 'content-creation' });
  
  // State for multi-select fields
  const [companyTypes, setCompanyTypes] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [companySizes, setCompanySizes] = useState<string[]>([]);
  const [jobTitles, setJobTitles] = useState<string[]>([]);
  const [jobLevels, setJobLevels] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [painPoints, setPainPoints] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  const [savedAudienceId, setSavedAudienceId] = useState<string | null>(null);
  const [showAnalysisPreview, setShowAnalysisPreview] = useState(false);

  // Helper function to extract markdown from code blocks
  const extractMarkdownFromCodeBlock = (text: string): string => {
    if (!text) return text;
    
    console.log('🔍 Raw text length:', text.length, 'starts with:', JSON.stringify(text.substring(0, 50)));
    
    // Handle different variations of code block wrappers
    const patterns = [
      // ```markdown ... ``` (most common from N8N)
      /^```markdown\s*\r?\n([\s\S]*?)\r?\n```\s*$/,
      // ``` ... ``` (generic code block)
      /^```\s*\r?\n([\s\S]*?)\r?\n```\s*$/,
      // Handle cases with extra leading/trailing whitespace
      /^\s*```markdown\s*\r?\n([\s\S]*?)\r?\n```\s*$/,
      /^\s*```\s*\r?\n([\s\S]*?)\r?\n```\s*$/,
      // Handle cases where there might be no newlines after opening
      /^```markdown\s*([\s\S]*?)\s*```$/,
      /^```\s*([\s\S]*?)\s*```$/,
    ];
    
    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      const match = text.match(pattern);
      if (match && match[1]) {
        const extracted = match[1].trim();
        console.log(`✅ Pattern ${i + 1} matched! Extracted ${extracted.length} characters`);
        console.log('✅ First 100 chars of extracted:', JSON.stringify(extracted.substring(0, 100)));
        return extracted;
      }
    }
    
    console.log('⚠️ No code block pattern matched, returning original text');
    return text;
  };

  // Test function for debugging markdown extraction (accessible via browser console)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).testMarkdownExtraction = (text: string) => {
        console.log('🧪 Testing markdown extraction...');
        return extractMarkdownFromCodeBlock(text);
      };
    }
  }, []);
  
  // State for custom input fields
  const [newCompanyType, setNewCompanyType] = useState('');
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newInterest, setNewInterest] = useState('');
  const [newPainPoint, setNewPainPoint] = useState('');
  const [newGoal, setNewGoal] = useState('');

  const isEditing = !!targetAudience;
  const isLoading = isCreating || isUpdating;

  const form = useForm<TargetAudienceFormData>({
    resolver: zodResolver(targetAudienceFormSchema),
    defaultValues: {
      name: '',
      description: '',
      segment_analysis: '',
      is_active: true,
    },
  });

  // Reset form when modal opens/closes or targetAudience changes
  useEffect(() => {
    if (isOpen && targetAudience) {
      // Editing existing target audience
      form.reset({
        name: targetAudience.name,
        description: targetAudience.description || '',
        segment_analysis: targetAudience.segment_analysis || '',
        is_active: targetAudience.is_active,
      });
      setCompanyTypes(targetAudience.company_types || []);
      setIndustries(targetAudience.industries || []);
      setCompanySizes(targetAudience.company_sizes || []);
      setJobTitles(targetAudience.job_titles || []);
      setJobLevels(targetAudience.job_levels || []);
      setDepartments(targetAudience.departments || []);
      setInterests(targetAudience.interests || []);
      setPainPoints(targetAudience.pain_points || []);
      setGoals(targetAudience.goals || []);
    } else if (isOpen && !targetAudience) {
      // Creating new target audience
      form.reset({
        name: '',
        description: '',
        segment_analysis: '',
        is_active: true,
      });
      setCompanyTypes([]);
      setIndustries([]);
      setCompanySizes([]);
      setJobTitles([]);
      setJobLevels([]);
      setDepartments([]);
      setInterests([]);
      setPainPoints([]);
      setGoals([]);
    }
  }, [isOpen, targetAudience, form]);

  // Real-time subscription for analysis updates from N8N
  useEffect(() => {
    if (!savedAudienceId || !isGeneratingAnalysis) return;

    console.log('🔔 Setting up real-time subscription for analysis updates:', savedAudienceId);
    
    const subscription = supabase
      .channel(`target_audience_analysis_${savedAudienceId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'target_audiences',
        filter: `id=eq.${savedAudienceId}`
      }, (payload) => {
        console.log('🔔 Real-time update received:', payload);
        console.log('🔔 Old analysis:', payload.old?.segment_analysis);
        console.log('🔔 New analysis:', payload.new?.segment_analysis);
        
        if (payload.new?.segment_analysis && payload.new.segment_analysis !== payload.old?.segment_analysis) {
          console.log('✅ Analysis updated by N8N, updating form field');
          const cleanMarkdown = extractMarkdownFromCodeBlock(payload.new.segment_analysis);
          form.setValue('segment_analysis', cleanMarkdown);
          setIsGeneratingAnalysis(false);
          // Auto-switch to preview mode to show the formatted result
          setShowAnalysisPreview(true);
        }
      })
      .subscribe();

    // Cleanup subscription
    return () => {
      console.log('🔕 Cleaning up analysis subscription');
      subscription.unsubscribe();
    };
  }, [savedAudienceId, isGeneratingAnalysis, form]);

  const handleClose = () => {
    form.reset();
    // Reset all state arrays
    setCompanyTypes([]);
    setIndustries([]);
    setCompanySizes([]);
    setJobTitles([]);
    setJobLevels([]);
    setDepartments([]);
    setInterests([]);
    setPainPoints([]);
    setGoals([]);
    // Reset input fields
    setNewCompanyType('');
    setNewJobTitle('');
    setNewInterest('');
    setNewPainPoint('');
    setNewGoal('');
    // Reset saved audience ID
    setSavedAudienceId(null);
    onClose();
  };

  const handleSubmit = (data: TargetAudienceFormData) => {
    const formData: CreateTargetAudienceForm = {
      name: data.name,
      description: data.description,
      company_types: companyTypes,
      industries: industries,
      company_sizes: companySizes,
      job_titles: jobTitles,
      job_levels: jobLevels,
      departments: departments,
      interests: interests,
      pain_points: painPoints,
      goals: goals,
      preferred_content_formats: [],
      communication_style: '',
      segment_analysis: data.segment_analysis,
      demographics: {},
      content_consumption_habits: {},
      ai_segments: {},
      is_active: data.is_active,
    };

    if (isEditing && targetAudience) {
      updateTargetAudience({ id: targetAudience.id, ...formData }, {
        onSuccess: handleClose,
      });
    } else if (savedAudienceId) {
      // Record was already saved during analysis generation, just update with any changes
      updateTargetAudience({ id: savedAudienceId, ...formData }, {
        onSuccess: handleClose,
      });
    } else {
      // Create new record
      createTargetAudience(formData, {
        onSuccess: handleClose,
      });
    }
  };

  // Helper functions for managing arrays
  const toggleArrayItem = (array: string[], setArray: (arr: string[]) => void, item: string) => {
    setArray(array.includes(item) ? array.filter(i => i !== item) : [...array, item]);
  };

  const addCustomItem = (array: string[], setArray: (arr: string[]) => void, item: string, setInput: (val: string) => void) => {
    if (item.trim() && !array.includes(item.trim())) {
      setArray([...array, item.trim()]);
      setInput('');
    }
  };

  const removeArrayItem = (array: string[], setArray: (arr: string[]) => void, item: string) => {
    setArray(array.filter(i => i !== item));
  };

  const generateSegmentAnalysis = async () => {
    setIsGeneratingAnalysis(true);
    try {
      // First, save the target audience record to database
      const formData: CreateTargetAudienceForm = {
        name: form.getValues('name'),
        description: form.getValues('description'),
        company_types: companyTypes,
        industries: industries,
        company_sizes: companySizes,
        job_titles: jobTitles,
        job_levels: jobLevels,
        departments: departments,
        interests: interests,
        pain_points: painPoints,
        goals: goals,
        preferred_content_formats: [],
        communication_style: '',
        segment_analysis: '', // Will be updated after AI generation
        demographics: {},
        content_consumption_habits: {},
        ai_segments: {},
        is_active: form.getValues('is_active'),
      };

      // Save the record first
      const savedAudience = await new Promise<TargetAudience>((resolve, reject) => {
        createTargetAudience(formData, {
          onSuccess: (data) => {
            setSavedAudienceId(data.id);
            resolve(data);
          },
          onError: (error) => reject(error),
        });
      });

      // Send the actual saved record data to webhook
      // N8N will process and store the analysis back to the database
      await executeWebhook({
        webhookId: 'segment-analysis',
        url: 'https://versatil.app.n8n.cloud/webhook/fe2c56a3-8bba-4cf0-8d10-21a1096ec0dc',
        method: 'POST'
      }, {
        action: 'generate_segment_analysis',
        targetAudience: savedAudience
      });

      // Real-time subscription will handle form updates
      // when N8N updates the database record
      // Keep loading state active until N8N completes
    } catch (error) {
      console.error('Failed to generate segment analysis:', error);
      setIsGeneratingAnalysis(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Target Audience' : 'Create Target Audience'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the target audience configuration'
              : 'Define a new target audience for your content creation'
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
                      <Input placeholder="e.g., Tech Startup Founders, Healthcare Professionals" {...field} />
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
                        placeholder="Describe this target audience and their characteristics"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Company Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Company Information</h4>
              
              {/* Company Types */}
              <div className="space-y-2">
                <Label>Company Types</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Startup, Enterprise, Non-profit"
                    value={newCompanyType}
                    onChange={(e) => setNewCompanyType(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomItem(companyTypes, setCompanyTypes, newCompanyType, setNewCompanyType))}
                  />
                  <Button 
                    type="button" 
                    onClick={() => addCustomItem(companyTypes, setCompanyTypes, newCompanyType, setNewCompanyType)} 
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {companyTypes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {companyTypes.map((type) => (
                      <Badge key={type} variant="secondary" className="flex items-center gap-1">
                        {type}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeArrayItem(companyTypes, setCompanyTypes, type)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Industries */}
              <div className="space-y-2">
                <Label>Industries</Label>
                <div className="grid grid-cols-3 gap-2">
                  {COMMON_INDUSTRIES.map((industry) => (
                    <div key={industry} className="flex items-center space-x-2">
                      <Checkbox
                        id={`industry-${industry}`}
                        checked={industries.includes(industry)}
                        onCheckedChange={() => toggleArrayItem(industries, setIndustries, industry)}
                      />
                      <Label htmlFor={`industry-${industry}`} className="text-sm">
                        {industry}
                      </Label>
                    </div>
                  ))}
                </div>
                {industries.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {industries.map((industry) => (
                      <Badge key={industry} variant="outline">
                        {industry}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Company Sizes */}
              <div className="space-y-2">
                <Label>Company Sizes</Label>
                <div className="grid grid-cols-2 gap-2">
                  {COMPANY_SIZES.map((size) => (
                    <div key={size.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`size-${size.value}`}
                        checked={companySizes.includes(size.value)}
                        onCheckedChange={() => toggleArrayItem(companySizes, setCompanySizes, size.value)}
                      />
                      <Label htmlFor={`size-${size.value}`} className="text-sm">
                        {size.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Job Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Job Information</h4>
              
              {/* Job Titles */}
              <div className="space-y-2">
                <Label>Job Titles</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., CEO, Marketing Manager, Developer"
                    value={newJobTitle}
                    onChange={(e) => setNewJobTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomItem(jobTitles, setJobTitles, newJobTitle, setNewJobTitle))}
                  />
                  <Button 
                    type="button" 
                    onClick={() => addCustomItem(jobTitles, setJobTitles, newJobTitle, setNewJobTitle)} 
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {jobTitles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {jobTitles.map((title) => (
                      <Badge key={title} variant="secondary" className="flex items-center gap-1">
                        {title}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeArrayItem(jobTitles, setJobTitles, title)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Job Levels */}
              <div className="space-y-2">
                <Label>Job Levels</Label>
                <div className="grid grid-cols-2 gap-2">
                  {JOB_LEVELS.map((level) => (
                    <div key={level.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`level-${level.value}`}
                        checked={jobLevels.includes(level.value)}
                        onCheckedChange={() => toggleArrayItem(jobLevels, setJobLevels, level.value)}
                      />
                      <Label htmlFor={`level-${level.value}`} className="text-sm">
                        {level.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Departments */}
              <div className="space-y-2">
                <Label>Departments</Label>
                <div className="grid grid-cols-3 gap-2">
                  {COMMON_DEPARTMENTS.map((dept) => (
                    <div key={dept} className="flex items-center space-x-2">
                      <Checkbox
                        id={`dept-${dept}`}
                        checked={departments.includes(dept)}
                        onCheckedChange={() => toggleArrayItem(departments, setDepartments, dept)}
                      />
                      <Label htmlFor={`dept-${dept}`} className="text-sm">
                        {dept}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Audience Insights */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Audience Insights</h4>
              
              {/* Interests */}
              <div className="space-y-2">
                <Label>Interests</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., AI/ML, Sustainable Business, Remote Work"
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomItem(interests, setInterests, newInterest, setNewInterest))}
                  />
                  <Button 
                    type="button" 
                    onClick={() => addCustomItem(interests, setInterests, newInterest, setNewInterest)} 
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {interests.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {interests.map((interest) => (
                      <Badge key={interest} variant="outline" className="flex items-center gap-1">
                        {interest}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeArrayItem(interests, setInterests, interest)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Pain Points */}
              <div className="space-y-2">
                <Label>Pain Points</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Limited budget, Time constraints, Skill gaps"
                    value={newPainPoint}
                    onChange={(e) => setNewPainPoint(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomItem(painPoints, setPainPoints, newPainPoint, setNewPainPoint))}
                  />
                  <Button 
                    type="button" 
                    onClick={() => addCustomItem(painPoints, setPainPoints, newPainPoint, setNewPainPoint)} 
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {painPoints.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {painPoints.map((pain) => (
                      <Badge key={pain} variant="destructive" className="flex items-center gap-1">
                        {pain}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeArrayItem(painPoints, setPainPoints, pain)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Goals */}
              <div className="space-y-2">
                <Label>Goals</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Increase efficiency, Reduce costs, Scale business"
                    value={newGoal}
                    onChange={(e) => setNewGoal(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomItem(goals, setGoals, newGoal, setNewGoal))}
                  />
                  <Button 
                    type="button" 
                    onClick={() => addCustomItem(goals, setGoals, newGoal, setNewGoal)} 
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {goals.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {goals.map((goal) => (
                      <Badge key={goal} variant="default" className="flex items-center gap-1">
                        {goal}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeArrayItem(goals, setGoals, goal)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>


            {/* Analysis */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Segment Analysis</h4>
                <div className="flex items-center gap-2">
                  {form.getValues('segment_analysis') && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAnalysisPreview(!showAnalysisPreview)}
                      className="flex items-center gap-2"
                    >
                      {showAnalysisPreview ? (
                        <Edit className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      {showAnalysisPreview ? 'Edit' : 'Preview'}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateSegmentAnalysis}
                    disabled={isGeneratingAnalysis || !form.getValues('name')}
                    className="flex items-center gap-2"
                  >
                    {isGeneratingAnalysis ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {isGeneratingAnalysis ? 'Generating...' : 'Generate AI Analysis'}
                  </Button>
                </div>
              </div>
              
              <FormField
                control={form.control}
                name="segment_analysis"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      {showAnalysisPreview && field.value ? (
                        <div className="min-h-[150px] p-4 border rounded-md bg-muted/30">
                          <div className="prose prose-sm max-w-none text-foreground">
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              components={{
                                // Override default styling to match the app theme
                                h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-3 text-foreground" {...props} />,
                                h2: ({node, ...props}) => <h2 className="text-lg font-semibold mb-2 text-foreground" {...props} />,
                                h3: ({node, ...props}) => <h3 className="text-base font-medium mb-2 text-foreground" {...props} />,
                                p: ({node, ...props}) => <p className="mb-2 text-foreground leading-relaxed" {...props} />,
                                ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2 text-foreground" {...props} />,
                                ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2 text-foreground" {...props} />,
                                li: ({node, ...props}) => <li className="mb-1" {...props} />,
                                strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                                em: ({node, ...props}) => <em className="italic" {...props} />,
                              }}
                            >
                              {extractMarkdownFromCodeBlock(field.value)}
                            </ReactMarkdown>
                          </div>
                        </div>
                      ) : (
                        <Textarea 
                          placeholder="Click 'Generate AI Analysis' to automatically create detailed analysis of this audience segment, including behavior patterns, decision-making factors, and content consumption habits"
                          rows={6}
                          {...field}
                        />
                      )}
                    </FormControl>
                    <FormDescription>
                      AI-powered comprehensive insights about this audience segment {field.value && '(supports Markdown formatting)'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Settings */}
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Update' : 'Create'} Target Audience
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}