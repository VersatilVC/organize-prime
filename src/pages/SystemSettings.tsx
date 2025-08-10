import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Loader2, Users, Building, Clock, Mail, Upload, Image, Store } from 'lucide-react';
import { useOptimizedForm, commonValidationRules } from '@/hooks/useOptimizedForm';
import FeatureCategoryManagement from '@/components/settings/FeatureCategoryManagement';
import { SystemFeatureManagement } from '@/components/admin/SystemFeatureManagement';
import { MarketplaceAdminContent } from '@/components/admin/MarketplaceAdminContent';

interface SystemSettings {
  app_name: string;
  app_description: string;
  app_logo_url: string;
  allow_registration: boolean;
  require_verification: boolean;
  default_timezone: string;
  max_users_per_org: number;
}

interface SystemStats {
  totalOrganizations: number;
  totalUsers: number;
  activeUsersLast30Days: number;
  pendingInvitations: number;
}

const timezones = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
];

const defaultSettings: SystemSettings = {
  app_name: 'SaaS Platform',
  app_description: '',
  app_logo_url: '',
  allow_registration: true,
  require_verification: true,
  default_timezone: 'UTC',
  max_users_per_org: 0,
};

export default function SystemSettings() {
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Validation rules for system settings
  const validationRules = useMemo(() => [
    {
      field: 'app_name' as const,
      validate: commonValidationRules.required('Application name is required')
    },
    {
      field: 'max_users_per_org' as const,
      validate: commonValidationRules.min(0, 'Maximum users per organization must be 0 or greater')
    }
  ], []);

  // Optimized form with debouncing and validation caching
  const {
    formData,
    handleChange,
    getFieldState,
    isDirty,
    hasErrors,
    isFormValidating,
    validateAll,
    reset
  } = useOptimizedForm({
    initialData: defaultSettings,
    validationRules,
    debounceMs: 300
  });

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Check access permissions
  useEffect(() => {
    if (!roleLoading && role !== 'super_admin') {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to access system settings',
        variant: 'destructive',
      });
      navigate('/settings/profile');
    }
  }, [role, roleLoading, navigate, toast]);

  // Fetch system settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['app_name', 'app_description', 'app_logo_url', 'allow_registration', 'require_verification', 'default_timezone', 'max_users_per_org']);
      
      if (error) throw error;
      
      const settingsMap: Partial<SystemSettings> = {};
      data?.forEach(setting => {
        if (setting.key === 'app_name') settingsMap.app_name = setting.value as string;
        if (setting.key === 'app_description') settingsMap.app_description = setting.value as string;
        if (setting.key === 'app_logo_url') settingsMap.app_logo_url = setting.value as string;
        if (setting.key === 'allow_registration') settingsMap.allow_registration = setting.value as boolean;
        if (setting.key === 'require_verification') settingsMap.require_verification = setting.value as boolean;
        if (setting.key === 'default_timezone') settingsMap.default_timezone = setting.value as string;
        if (setting.key === 'max_users_per_org') settingsMap.max_users_per_org = setting.value as number;
      });
      
      return { ...defaultSettings, ...settingsMap };
    },
    enabled: role === 'super_admin'
  });

  // Fetch system stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['system-stats'],
    queryFn: async () => {
      const [orgsResponse, usersResponse, pendingInvitationsResponse] = await Promise.all([
        supabase.from('organizations').select('id', { count: 'exact' }),
        supabase.from('profiles').select('id, last_login_at', { count: 'exact' }),
        supabase.from('invitations').select('id', { count: 'exact' }).is('accepted_at', null)
      ]);

      if (orgsResponse.error) throw orgsResponse.error;
      if (usersResponse.error) throw usersResponse.error;
      if (pendingInvitationsResponse.error) throw pendingInvitationsResponse.error;

      // Calculate active users in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const activeUsers = usersResponse.data?.filter(user => 
        user.last_login_at && new Date(user.last_login_at) > thirtyDaysAgo
      ).length || 0;

      return {
        totalOrganizations: orgsResponse.count || 0,
        totalUsers: usersResponse.count || 0,
        activeUsersLast30Days: activeUsers,
        pendingInvitations: pendingInvitationsResponse.count || 0,
      } as SystemStats;
    },
    enabled: role === 'super_admin'
  });

  // KB Admin - system-wide Knowledge Base configuration
  const kbConfigKeys = [
    'kb_enabled',
    'kb_default_embedding_model',
    'kb_global_file_size_mb',
    'kb_free_kb_limit',
    'kb_premium_kb_price_usd',
    'kb_enable_premium',
    'kb_enable_chat',
    'kb_enable_processing',
    'kb_enable_cross_kb_search',
    'kb_enable_analytics',
    'kb_default_chunk_size',
    'kb_default_chunk_overlap',
    'kb_default_temperature',
    'kb_default_max_tokens',
    'kb_processing_timeout_ms',
    'kb_n8n_base_url',
    'kb_n8n_master_api_key',
    'kb_n8n_webhook_file_processing',
    'kb_n8n_webhook_ai_chat',
    'kb_n8n_webhook_vector_search',
    'kb_n8n_webhook_batch_process',
    'kb_n8n_retry_max',
    'kb_n8n_retry_backoff',
    'kb_n8n_timeout_ms',
  ] as const;

  const defaultKbSystemConfig = {
    kb_enabled: true,
    kb_default_embedding_model: 'text-embedding-ada-002',
    kb_global_file_size_mb: 50,
    kb_free_kb_limit: 1,
    kb_premium_kb_price_usd: 29,
    kb_enable_premium: true,
    kb_enable_chat: true,
    kb_enable_processing: true,
    kb_enable_cross_kb_search: false,
    kb_enable_analytics: true,
    kb_default_chunk_size: 1000,
    kb_default_chunk_overlap: 200,
    kb_default_temperature: 0.7,
    kb_default_max_tokens: 2000,
    kb_processing_timeout_ms: 5 * 60 * 1000,
    kb_n8n_base_url: '',
    kb_n8n_master_api_key: '',
    kb_n8n_webhook_file_processing: '/webhook/kb-process-file',
    kb_n8n_webhook_ai_chat: '/webhook/kb-ai-chat',
    kb_n8n_webhook_vector_search: '/webhook/kb-vector-search',
    kb_n8n_webhook_batch_process: '/webhook/kb-batch-process',
    kb_n8n_retry_max: 3,
    kb_n8n_retry_backoff: 2,
    kb_n8n_timeout_ms: 30000,
  };

  const { data: kbSystemConfig, isLoading: kbLoading } = useQuery({
    queryKey: ['kb-system-config'],
    enabled: role === 'super_admin',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', [...kbConfigKeys]);
      if (error) throw error;
      const map: any = { ...defaultKbSystemConfig };
      data?.forEach((row: any) => {
        map[row.key] = row.value;
      });
      return map as typeof defaultKbSystemConfig;
    },
    staleTime: 5 * 60 * 1000,
  });

  const [kbCfg, setKbCfg] = useState(defaultKbSystemConfig);
  useEffect(() => { if (kbSystemConfig) setKbCfg(kbSystemConfig); }, [kbSystemConfig]);

  const saveKbConfig = useMutation({
    mutationFn: async (cfg: typeof defaultKbSystemConfig) => {
      if (!user?.id) throw new Error('User not authenticated');
      for (const key of kbConfigKeys) {
        const { error } = await supabase
          .from('system_settings')
          .upsert({ key, value: (cfg as any)[key], updated_by: user.id, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: 'Knowledge Base system config saved' });
      queryClient.invalidateQueries({ queryKey: ['kb-system-config'] });
    },
    onError: (e) => {
      toast({ title: 'Failed to save KB config', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    }
  });

  // Update system settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: SystemSettings) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const settingsToUpdate = [
        { key: 'app_name', value: newSettings.app_name },
        { key: 'app_description', value: newSettings.app_description },
        { key: 'app_logo_url', value: newSettings.app_logo_url },
        { key: 'allow_registration', value: newSettings.allow_registration },
        { key: 'require_verification', value: newSettings.require_verification },
        { key: 'default_timezone', value: newSettings.default_timezone },
        { key: 'max_users_per_org', value: newSettings.max_users_per_org },
      ];

      for (const setting of settingsToUpdate) {
        const { error } = await supabase
          .from('system_settings')
          .upsert({
            key: setting.key,
            value: setting.value,
            updated_by: user.id,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'key'
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'System settings updated successfully',
      });
      reset();
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      queryClient.invalidateQueries({ queryKey: ['system-settings-branding'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update system settings. Please try again.',
        variant: 'destructive',
      });
      console.error('System settings update error:', error);
    }
  });

  // Reset settings mutation
  const resetSettingsMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const defaultSettingsArray = [
        { key: 'app_name', value: defaultSettings.app_name },
        { key: 'app_description', value: defaultSettings.app_description },
        { key: 'app_logo_url', value: defaultSettings.app_logo_url },
        { key: 'allow_registration', value: defaultSettings.allow_registration },
        { key: 'require_verification', value: defaultSettings.require_verification },
        { key: 'default_timezone', value: defaultSettings.default_timezone },
        { key: 'max_users_per_org', value: defaultSettings.max_users_per_org },
      ];

      for (const setting of defaultSettingsArray) {
        const { error } = await supabase
          .from('system_settings')
          .upsert({
            key: setting.key,
            value: setting.value,
            updated_by: user.id,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'key'
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'System settings reset to defaults',
      });
      reset();
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      queryClient.invalidateQueries({ queryKey: ['system-settings-branding'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to reset system settings. Please try again.',
        variant: 'destructive',
      });
      console.error('System settings reset error:', error);
    }
  });

  // Initialize form data when settings load - use the form's reset method
  useEffect(() => {
    if (settings) {
      // Reset the optimized form with new data
      reset();
      setTimeout(() => {
        Object.entries(settings).forEach(([key, value]) => {
          handleChange(key as keyof SystemSettings, value);
        });
      }, 0);
    }
  }, [settings, reset, handleChange]);

  // Optimized submit handler with validation
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateAll()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form',
        variant: 'destructive',
      });
      return;
    }

    updateSettingsMutation.mutate(formData);
  }, [formData, validateAll, updateSettingsMutation, toast]);

  const handleReset = useCallback(() => {
    resetSettingsMutation.mutate();
  }, [resetSettingsMutation]);

  const handleLogoUpload = useCallback(async (file: File) => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'User not authenticated',
        variant: 'destructive',
      });
      return;
    }
    
    // Validate file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid File',
        description: 'Please upload a JPG, PNG, or SVG image',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB
      toast({
        title: 'File Too Large',
        description: 'Image must be smaller than 2MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    
    try {
      // Create system-level filename: /system/app-logo.[ext]
      const fileExt = file.name.split('.').pop();
      const fileName = `system/app-logo.${fileExt}`;
      
      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('system-assets')
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('system-assets')
        .getPublicUrl(fileName);
      
      // Update form data and mark as dirty
      handleChange('app_logo_url', publicUrl);
      
      toast({
        title: 'Success',
        description: 'Logo uploaded successfully. Remember to save your settings to apply changes permanently.',
        duration: 5000,
      });
    } catch (error) {
      console.error('Logo upload error:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload logo. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }, [user?.id, handleChange, toast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleLogoUpload(file);
    }
  }, [handleLogoUpload]);


  if (roleLoading || role !== 'super_admin') {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const isLoading = settingsLoading || statsLoading;

  return (
    <AppLayout>
      <div className="container mx-auto px-6 py-6 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>System Settings</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-3xl font-bold mt-4">System Settings</h1>
        </div>

        <Tabs defaultValue="application" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="application">Application</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="marketplace">
              <Store className="h-4 w-4 mr-1" />
              Marketplace Admin
            </TabsTrigger>
            <TabsTrigger value="kb_admin">Knowledge Base Admin</TabsTrigger>
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="application" className="space-y-6">
            {/* System Stats - Full Width */}
            <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    System Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-4 bg-muted rounded w-full"></div>
                          <div className="h-6 bg-muted rounded w-1/2 mt-2"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Total Organizations</span>
                        </div>
                        <span className="font-semibold">{stats?.totalOrganizations || 0}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Total Users</span>
                        </div>
                        <span className="font-semibold">{stats?.totalUsers || 0}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Active Users (30d)</span>
                        </div>
                        <span className="font-semibold">{stats?.activeUsersLast30Days || 0}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Pending Invitations</span>
                        </div>
                        <span className="font-semibold">{stats?.pendingInvitations || 0}</span>
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* App Branding and System Configuration - Side by Side */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* App Branding Section */}
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="h-5 w-5" />
                    Application Branding
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="animate-pulse">
                      <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                      <div className="h-16 bg-muted rounded w-full"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>App Logo</Label>
                        <div className="flex items-center gap-4">
                          {formData.app_logo_url && (
                            <div className="relative w-16 h-16 border rounded-lg overflow-hidden bg-muted">
                              <img 
                                src={formData.app_logo_url} 
                                alt="App Logo" 
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="flex items-center gap-2"
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4" />
                                Upload Logo
                              </>
                            )}
                          </Button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/svg+xml"
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          JPG, PNG or SVG. Max file size 2MB.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* System Configuration Form */}
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle>System Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                          <div className="h-10 bg-muted rounded w-full"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* Application Name */}
                      <div className="space-y-2">
                        <Label htmlFor="app_name">Application Name</Label>
                        <Input
                          id="app_name"
                          value={formData.app_name}
                          onChange={(e) => handleChange('app_name', e.target.value)}
                          placeholder="Enter application name"
                        />
                        {getFieldState('app_name').error && (
                          <p className="text-sm text-destructive">{getFieldState('app_name').error}</p>
                        )}
                      </div>

                      {/* Application Description */}
                      <div className="space-y-2">
                        <Label htmlFor="app_description">Application Description</Label>
                        <Textarea
                          id="app_description"
                          value={formData.app_description}
                          onChange={(e) => handleChange('app_description', e.target.value)}
                          placeholder="Describe your application"
                          rows={3}
                        />
                      </div>

                      {/* Registration Settings */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="allow_registration">Allow User Registration</Label>
                            <p className="text-sm text-muted-foreground">
                              Allow new users to register accounts
                            </p>
                          </div>
                          <Switch
                            id="allow_registration"
                            checked={formData.allow_registration}
                            onCheckedChange={(checked) => handleChange('allow_registration', checked)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="require_verification">Require Email Verification</Label>
                            <p className="text-sm text-muted-foreground">
                              Require email verification for new accounts
                            </p>
                          </div>
                          <Switch
                            id="require_verification"
                            checked={formData.require_verification}
                            onCheckedChange={(checked) => handleChange('require_verification', checked)}
                          />
                        </div>
                      </div>

                      {/* Default Timezone */}
                      <div className="space-y-2">
                        <Label htmlFor="default_timezone">Default Timezone</Label>
                        <Select
                          value={formData.default_timezone}
                          onValueChange={(value) => handleChange('default_timezone', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select timezone" />
                          </SelectTrigger>
                          <SelectContent>
                            {timezones.map((timezone) => (
                              <SelectItem key={timezone} value={timezone}>
                                {timezone}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Max Users Per Organization */}
                      <div className="space-y-2">
                        <Label htmlFor="max_users_per_org">Max Users Per Organization</Label>
                        <Input
                          id="max_users_per_org"
                          type="number"
                          min="0"
                          value={formData.max_users_per_org}
                          onChange={(e) => handleChange('max_users_per_org', parseInt(e.target.value) || 0)}
                          placeholder="0 for unlimited"
                        />
                        <p className="text-xs text-muted-foreground">
                          Set to 0 for unlimited users
                        </p>
                        {getFieldState('max_users_per_org').error && (
                          <p className="text-sm text-destructive">{getFieldState('max_users_per_org').error}</p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-2 pt-4">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              type="button" 
                              variant="outline"
                              disabled={resetSettingsMutation.isPending || updateSettingsMutation.isPending}
                              className="sm:order-1"
                            >
                              Reset to Defaults
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Reset System Settings</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will reset all system settings to their default values. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={handleReset}
                                disabled={resetSettingsMutation.isPending}
                              >
                                {resetSettingsMutation.isPending ? 'Resetting...' : 'Reset Settings'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <Button 
                          type="submit"
                          disabled={!isDirty || updateSettingsMutation.isPending || resetSettingsMutation.isPending || hasErrors || isFormValidating}
                          className={isDirty ? "bg-primary hover:bg-primary/90 sm:order-2" : "sm:order-2"}
                        >
                          {updateSettingsMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Saving...
                            </>
                          ) : (
                            <>
                              Save System Settings
                              {isDirty && <span className="ml-2 text-xs">•</span>}
                            </>
                          )}
                        </Button>
                      </div>
                  </form>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        
          <TabsContent value="features">
            <SystemFeatureManagement />
          </TabsContent>

          <TabsContent value="categories">
            <FeatureCategoryManagement />
          </TabsContent>

          <TabsContent value="marketplace" className="space-y-6">
            <MarketplaceAdminContent />
          </TabsContent>

          <TabsContent value="kb_admin" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Global KB Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {kbLoading ? (
                  <div className="space-y-3">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-8 bg-muted rounded animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable Knowledge Base App</Label>
                        <p className="text-xs text-muted-foreground">Turn the KB app on or off system-wide</p>
                      </div>
                      <Switch checked={kbCfg.kb_enabled} onCheckedChange={(v) => setKbCfg((p) => ({ ...p, kb_enabled: v }))} />
                    </div>
                    <div>
                      <Label>Default Embedding Model</Label>
                      <Select value={kbCfg.kb_default_embedding_model} onValueChange={(v) => setKbCfg((p) => ({ ...p, kb_default_embedding_model: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text-embedding-ada-002">text-embedding-ada-002</SelectItem>
                          <SelectItem value="text-embedding-3-small">text-embedding-3-small</SelectItem>
                          <SelectItem value="text-embedding-3-large">text-embedding-3-large</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Global File Size Limit (MB)</Label>
                      <Input type="number" value={kbCfg.kb_global_file_size_mb} onChange={(e) => setKbCfg((p) => ({ ...p, kb_global_file_size_mb: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <Label>Free KB Limit per Organization</Label>
                      <Input type="number" value={kbCfg.kb_free_kb_limit} onChange={(e) => setKbCfg((p) => ({ ...p, kb_free_kb_limit: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <Label>Premium KB Pricing (USD/month)</Label>
                      <Input type="number" value={kbCfg.kb_premium_kb_price_usd} onChange={(e) => setKbCfg((p) => ({ ...p, kb_premium_kb_price_usd: Number(e.target.value) }))} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feature Flags & Defaults</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable Premium KBs</Label>
                      <p className="text-xs text-muted-foreground">Allow creation of premium knowledge bases</p>
                    </div>
                    <Switch checked={kbCfg.kb_enable_premium} onCheckedChange={(v) => setKbCfg((p) => ({ ...p, kb_enable_premium: v }))} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable AI Chat</Label>
                      <p className="text-xs text-muted-foreground">System-wide chat functionality</p>
                    </div>
                    <Switch checked={kbCfg.kb_enable_chat} onCheckedChange={(v) => setKbCfg((p) => ({ ...p, kb_enable_chat: v }))} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable File Processing</Label>
                      <p className="text-xs text-muted-foreground">Automatic ingestion pipeline</p>
                    </div>
                    <Switch checked={kbCfg.kb_enable_processing} onCheckedChange={(v) => setKbCfg((p) => ({ ...p, kb_enable_processing: v }))} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable Cross-KB Search</Label>
                      <p className="text-xs text-muted-foreground">Search across multiple KBs</p>
                    </div>
                    <Switch checked={kbCfg.kb_enable_cross_kb_search} onCheckedChange={(v) => setKbCfg((p) => ({ ...p, kb_enable_cross_kb_search: v }))} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable Analytics</Label>
                      <p className="text-xs text-muted-foreground">Collect usage analytics</p>
                    </div>
                    <Switch checked={kbCfg.kb_enable_analytics} onCheckedChange={(v) => setKbCfg((p) => ({ ...p, kb_enable_analytics: v }))} />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Default Chunk Size</Label>
                    <Input type="number" value={kbCfg.kb_default_chunk_size} onChange={(e) => setKbCfg((p) => ({ ...p, kb_default_chunk_size: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <Label>Default Chunk Overlap</Label>
                    <Input type="number" value={kbCfg.kb_default_chunk_overlap} onChange={(e) => setKbCfg((p) => ({ ...p, kb_default_chunk_overlap: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <Label>Default Temperature</Label>
                    <Input type="number" step="0.1" value={kbCfg.kb_default_temperature} onChange={(e) => setKbCfg((p) => ({ ...p, kb_default_temperature: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <Label>Default Max Tokens</Label>
                    <Input type="number" value={kbCfg.kb_default_max_tokens} onChange={(e) => setKbCfg((p) => ({ ...p, kb_default_max_tokens: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <Label>Processing Timeout (ms)</Label>
                    <Input type="number" value={kbCfg.kb_processing_timeout_ms} onChange={(e) => setKbCfg((p) => ({ ...p, kb_processing_timeout_ms: Number(e.target.value) }))} />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={() => saveKbConfig.mutate(kbCfg)} disabled={saveKbConfig.isPending}> 
                    {saveKbConfig.isPending ? 'Saving...' : 'Save KB Settings'}
                  </Button>
                  <Button variant="outline" onClick={() => setKbCfg(defaultKbSystemConfig)}>Reset Section</Button>
                  <Button variant="outline" onClick={() => {
                    const blob = new Blob([JSON.stringify(kbCfg, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = 'kb-system-config.json'; a.click(); URL.revokeObjectURL(url);
                  }}>Export</Button>
                  <Button variant="outline" onClick={() => (document.getElementById('kb-config-import') as HTMLInputElement)?.click()}>Import</Button>
                  <input id="kb-config-import" type="file" accept="application/json" className="hidden" onChange={async (e) => {
                    const f = e.target.files?.[0]; if (!f) return; const text = await f.text();
                    try { const json = JSON.parse(text); setKbCfg((p) => ({ ...p, ...json })); } catch { 
                      toast({ title: 'Invalid file', variant: 'destructive' }); }
                  }} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>N8N Webhook Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>N8N Base URL</Label>
                    <Input value={kbCfg.kb_n8n_base_url} onChange={(e) => setKbCfg((p) => ({ ...p, kb_n8n_base_url: e.target.value }))} placeholder="https://n8n.example.com" />
                  </div>
                  <div>
                    <Label>Master API Key</Label>
                    <Input type="password" value={kbCfg.kb_n8n_master_api_key} onChange={(e) => setKbCfg((p) => ({ ...p, kb_n8n_master_api_key: e.target.value }))} placeholder="••••••" />
                  </div>
                  <div>
                    <Label>File Processing Endpoint</Label>
                    <Input value={kbCfg.kb_n8n_webhook_file_processing} onChange={(e) => setKbCfg((p) => ({ ...p, kb_n8n_webhook_file_processing: e.target.value }))} />
                  </div>
                  <div>
                    <Label>AI Chat Endpoint</Label>
                    <Input value={kbCfg.kb_n8n_webhook_ai_chat} onChange={(e) => setKbCfg((p) => ({ ...p, kb_n8n_webhook_ai_chat: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Vector Search Endpoint</Label>
                    <Input value={kbCfg.kb_n8n_webhook_vector_search} onChange={(e) => setKbCfg((p) => ({ ...p, kb_n8n_webhook_vector_search: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Batch Processing Endpoint</Label>
                    <Input value={kbCfg.kb_n8n_webhook_batch_process} onChange={(e) => setKbCfg((p) => ({ ...p, kb_n8n_webhook_batch_process: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Max Retries</Label>
                    <Input type="number" value={kbCfg.kb_n8n_retry_max} onChange={(e) => setKbCfg((p) => ({ ...p, kb_n8n_retry_max: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <Label>Backoff Multiplier</Label>
                    <Input type="number" step="0.1" value={kbCfg.kb_n8n_retry_backoff} onChange={(e) => setKbCfg((p) => ({ ...p, kb_n8n_retry_backoff: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <Label>Timeout (ms)</Label>
                    <Input type="number" value={kbCfg.kb_n8n_timeout_ms} onChange={(e) => setKbCfg((p) => ({ ...p, kb_n8n_timeout_ms: Number(e.target.value) }))} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={async () => {
                    const base = (kbCfg.kb_n8n_base_url || '').replace(/\/+$/, '');
                    const url = `${base}${kbCfg.kb_n8n_webhook_file_processing}`;
                    try {
                      await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(kbCfg.kb_n8n_master_api_key ? { 'X-API-Key': kbCfg.kb_n8n_master_api_key } : {}) }, mode: 'no-cors', body: JSON.stringify({ ping: 'kb-admin-test', type: 'file' }) });
                      toast({ title: 'Request Sent', description: 'Check N8N execution logs.' });
                    } catch (e) { toast({ title: 'Webhook failed', variant: 'destructive' }); }
                  }}>Test File Processing</Button>
                  <Button variant="secondary" onClick={async () => {
                    const base = (kbCfg.kb_n8n_base_url || '').replace(/\/+$/, '');
                    const url = `${base}${kbCfg.kb_n8n_webhook_ai_chat}`;
                    try {
                      await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(kbCfg.kb_n8n_master_api_key ? { 'X-API-Key': kbCfg.kb_n8n_master_api_key } : {}) }, mode: 'no-cors', body: JSON.stringify({ ping: 'kb-admin-test', type: 'chat', message: 'Hello' }) });
                      toast({ title: 'Request Sent', description: 'Check N8N execution logs.' });
                    } catch (e) { toast({ title: 'Webhook failed', variant: 'destructive' }); }
                  }}>Test AI Chat</Button>
                  <Button onClick={() => saveKbConfig.mutate(kbCfg)} disabled={saveKbConfig.isPending}>{saveKbConfig.isPending ? 'Saving...' : 'Save N8N Settings'}</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statistics">
            <Card>
              <CardHeader>
                <CardTitle>System Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Advanced statistics and reporting coming soon.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}