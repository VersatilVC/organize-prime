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
import { useAuth } from '@/auth/AuthProvider';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Users, Building, Clock, Mail, Upload, Image, Settings } from 'lucide-react';
import { useOptimizedForm, commonValidationRules } from '@/hooks/useOptimizedForm';
import FeatureCategoryManagement from '@/components/settings/FeatureCategoryManagement';
import { SystemFeatureManagement } from '@/components/admin/SystemFeatureManagement';
import { FeatureManagement } from '@/components/admin/FeatureManagement';
import { SuperAdminFeatureManagement } from '@/components/admin/SuperAdminFeatureManagement';

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

  // KB Admin configuration moved into Feature Management → Feature Edit for Knowledge Base feature
  // Removed standalone KB system config from System Settings to avoid duplication and ensure a unified admin experience.

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
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const isLoading = settingsLoading || statsLoading;

  return (
    <>
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="application">Application</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="organizations">Organizations</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
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

          <TabsContent value="organizations">
            <SuperAdminFeatureManagement />
          </TabsContent>

          <TabsContent value="categories">
            <FeatureCategoryManagement />
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
    </>
  );
}