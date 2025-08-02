import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Loader2, Users, Building, Clock, Mail, Upload, Image } from 'lucide-react';

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
  
  const [formData, setFormData] = useState<SystemSettings>(defaultSettings);
  const [isDirty, setIsDirty] = useState(false);
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

  // Initialize form data when settings load
  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

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
      setIsDirty(false);
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
      setFormData(defaultSettings);
      setIsDirty(false);
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

  const handleInputChange = (field: keyof SystemSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.app_name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Application name is required',
        variant: 'destructive',
      });
      return;
    }

    if (formData.max_users_per_org < 0) {
      toast({
        title: 'Validation Error',
        description: 'Maximum users per organization must be 0 or greater',
        variant: 'destructive',
      });
      return;
    }

    updateSettingsMutation.mutate(formData);
  };

  const handleReset = () => {
    resetSettingsMutation.mutate();
  };

  const handleLogoUpload = async (file: File) => {
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
      setFormData(prev => ({ ...prev, app_logo_url: publicUrl }));
      setIsDirty(true);
      
      toast({
        title: 'Success',
        description: 'Logo uploaded successfully. Click "Save System Settings" to apply changes.',
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
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleLogoUpload(file);
    }
  };

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* System Stats */}
          <div className="lg:col-span-1">
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
          </div>

          {/* App Branding Section */}
          <div className="lg:col-span-3 mb-6">
            <Card>
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
                        {/* Logo Preview */}
                        <div className="relative flex-shrink-0">
                          <div className="w-10 h-10 bg-muted rounded border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
                            {formData.app_logo_url ? (
                              <img 
                                src={formData.app_logo_url} 
                                alt="App logo" 
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                                }}
                              />
                            ) : (
                              <Image className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          {isUploading && (
                            <div className="absolute inset-0 bg-black/50 rounded flex items-center justify-center">
                              <Loader2 className="h-4 w-4 animate-spin text-white" />
                            </div>
                          )}
                        </div>
                        
                        {/* Upload Button */}
                        <div className="flex-1">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="flex items-center gap-2"
                          >
                            <Upload className="h-4 w-4" />
                            {formData.app_logo_url ? 'Replace Logo' : 'Upload Logo'}
                          </Button>
                          <p className="text-sm text-muted-foreground mt-1">
                            JPG, PNG or SVG. Max size 2MB. Recommended: Square image.
                          </p>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/svg+xml"
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                        </div>
                      </div>
                      {formData.app_logo_url && (
                        <p className="text-sm text-muted-foreground">
                          Logo will appear in the header next to the application name.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* System Configuration */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>System Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-6">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                        <div className="h-10 bg-muted rounded w-full"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Application Name */}
                    <div className="space-y-2">
                      <Label htmlFor="app_name">
                        Application Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="app_name"
                        type="text"
                        value={formData.app_name}
                        onChange={(e) => handleInputChange('app_name', e.target.value)}
                        placeholder="Enter application name"
                        required
                      />
                    </div>

                    {/* Application Description */}
                    <div className="space-y-2">
                      <Label htmlFor="app_description">Application Description</Label>
                      <Textarea
                        id="app_description"
                        value={formData.app_description}
                        onChange={(e) => handleInputChange('app_description', e.target.value)}
                        placeholder="Enter application description for login/registration pages"
                        className="min-h-[80px]"
                      />
                    </div>

                    {/* Allow User Registration */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor="allow_registration">Allow User Registration</Label>
                        <p className="text-sm text-muted-foreground">
                          Controls if new users can register for accounts
                        </p>
                      </div>
                      <Switch
                        id="allow_registration"
                        checked={formData.allow_registration}
                        onCheckedChange={(checked) => handleInputChange('allow_registration', checked)}
                      />
                    </div>

                    {/* Require Email Verification */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor="require_verification">Require Email Verification</Label>
                        <p className="text-sm text-muted-foreground">
                          Requires email verification for all new registrations
                        </p>
                      </div>
                      <Switch
                        id="require_verification"
                        checked={formData.require_verification}
                        onCheckedChange={(checked) => handleInputChange('require_verification', checked)}
                      />
                    </div>

                    {/* Default Timezone */}
                    <div className="space-y-2">
                      <Label htmlFor="default_timezone">Default Timezone</Label>
                      <Select
                        value={formData.default_timezone}
                        onValueChange={(value) => handleInputChange('default_timezone', value)}
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

                    {/* Maximum Users Per Organization */}
                    <div className="space-y-2">
                      <Label htmlFor="max_users_per_org">Maximum Users Per Organization</Label>
                      <Input
                        id="max_users_per_org"
                        type="number"
                        min="0"
                        value={formData.max_users_per_org}
                        onChange={(e) => handleInputChange('max_users_per_org', parseInt(e.target.value) || 0)}
                        placeholder="0 = unlimited"
                      />
                      <p className="text-sm text-muted-foreground">
                        Set to 0 for unlimited users per organization
                      </p>
                    </div>

                    {/* Form Actions */}
                    <div className="flex items-center justify-between pt-4">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={updateSettingsMutation.isPending || resetSettingsMutation.isPending}
                          >
                            Reset to Defaults
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reset System Settings</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action will reset all system settings to their default values. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleReset}>
                              Reset Settings
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <Button
                        type="submit"
                        disabled={!isDirty || updateSettingsMutation.isPending || resetSettingsMutation.isPending}
                      >
                        {updateSettingsMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Saving...
                          </>
                        ) : (
                          'Save System Settings'
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}