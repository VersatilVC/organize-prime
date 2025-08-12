import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Upload, Loader2, Building } from 'lucide-react';
import { CompanyFeatureManagement } from '@/components/admin/CompanyFeatureManagement';
import { InstalledAppsManagement } from '@/components/admin/InstalledAppsManagement';

interface CompanyData {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  settings: {
    description?: string;
    website_url?: string;
    industry?: string;
    company_size?: string;
    default_role?: string;
    timezone?: string;
    allow_invitations?: boolean;
    require_approval?: boolean;
    enforce_2fa?: boolean;
    session_timeout?: number;
  };
}

const industryOptions = [
  { value: 'technology', label: 'Technology' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'finance', label: 'Finance' },
  { value: 'education', label: 'Education' },
  { value: 'retail', label: 'Retail' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'other', label: 'Other' },
];

const companySizeOptions = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '501-1000', label: '501-1000 employees' },
  { value: '1000+', label: '1000+ employees' },
];

const timezoneOptions = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time' },
  { value: 'America/Chicago', label: 'Central Time' },
  { value: 'America/Denver', label: 'Mountain Time' },
  { value: 'America/Los_Angeles', label: 'Pacific Time' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
];

export default function CompanySettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentOrganization, refreshOrganizations } = useOrganization();
  const { role } = useUserRole();
  const queryClient = useQueryClient();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<CompanyData>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isLogoUploading, setIsLogoUploading] = useState(false);

  // Fetch company data
  const { data: companyData, isLoading } = useQuery({
    queryKey: ['company-data', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return null;
      
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug, logo_url, settings')
        .eq('id', currentOrganization.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as CompanyData;
    },
    enabled: !!currentOrganization?.id && (role === 'admin' || role === 'super_admin'),
  });

  // Initialize form data when company data loads
  useEffect(() => {
    if (companyData) {
      setFormData(companyData);
    }
  }, [companyData]);

  // Update company mutation
  const updateCompanyMutation = useMutation({
    mutationFn: async (updates: Partial<CompanyData>) => {
      if (!currentOrganization?.id) throw new Error('No organization selected');
      
      const { error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', currentOrganization.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Company settings updated successfully' });
      setIsDirty(false);
      refreshOrganizations();
      queryClient.invalidateQueries({ queryKey: ['company-data'] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update company settings',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev };
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        newData[parent as keyof CompanyData] = {
          ...(prev[parent as keyof CompanyData] as any),
          [child]: value,
        };
      } else {
        (newData as any)[field] = value;
      }
      return newData;
    });
    setIsDirty(true);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    updateCompanyMutation.mutate(formData);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentOrganization) return;

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPEG, PNG, or SVG image.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsLogoUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logos/${currentOrganization.id}/logo.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      handleInputChange('logo_url', publicUrl);
      
      toast({ title: 'Logo uploaded successfully' });
    } catch (error) {
      toast({
        title: 'Failed to upload logo',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLogoUploading(false);
    }
  };

  if (role !== 'admin' && role !== 'super_admin') {
    return (
      <AppLayout>
        <div className="container mx-auto py-6">
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">
                You don't have permission to access company settings.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto py-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading company settings...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Company Settings</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-3xl font-bold mt-4">Company Settings</h1>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="apps">Installed Apps</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Company Logo Upload */}
                  <div className="flex items-center space-x-6">
                    <div className="relative">
                      <div className="w-30 h-15 border-2 border-dashed border-muted-foreground rounded-lg flex items-center justify-center bg-muted/10 p-4" style={{width: '120px', height: '60px'}}>
                        {formData?.logo_url ? (
                          <img 
                            src={formData.logo_url} 
                            alt="Company logo" 
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : (
                          <Building className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Company Logo</Label>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={isLogoUploading}
                        className="w-full"
                      >
                        {isLogoUploading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Logo
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG or SVG. Max 5MB.
                      </p>
                    </div>
                  </div>

                  {/* Company Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">Company Name</Label>
                    <Input
                      id="name"
                      value={formData?.name || ''}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter company name"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData?.settings?.description || ''}
                      onChange={(e) => handleInputChange('settings.description', e.target.value)}
                      placeholder="Describe your company"
                      rows={3}
                    />
                  </div>

                  {/* Website URL */}
                  <div className="space-y-2">
                    <Label htmlFor="website_url">Website URL</Label>
                    <Input
                      id="website_url"
                      type="url"
                      value={formData?.settings?.website_url || ''}
                      onChange={(e) => handleInputChange('settings.website_url', e.target.value)}
                      placeholder="https://example.com"
                    />
                  </div>

                  {/* Industry */}
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Select
                      value={formData?.settings?.industry || ''}
                      onValueChange={(value) => handleInputChange('settings.industry', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {industryOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Company Size */}
                  <div className="space-y-2">
                    <Label htmlFor="company_size">Company Size</Label>
                    <Select
                      value={formData?.settings?.company_size || ''}
                      onValueChange={(value) => handleInputChange('settings.company_size', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select company size" />
                      </SelectTrigger>
                      <SelectContent>
                        {companySizeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Timezone */}
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Default Timezone</Label>
                    <Select
                      value={formData?.settings?.timezone || 'UTC'}
                      onValueChange={(value) => handleInputChange('settings.timezone', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        {timezoneOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="space-y-6">
            <CompanyFeatureManagement />
          </TabsContent>

          <TabsContent value="apps">
            <InstalledAppsManagement />
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Allow Invitations */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Team Invitations</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow admins to send invitations to new team members
                    </p>
                  </div>
                  <Switch
                    checked={formData?.settings?.allow_invitations ?? true}
                    onCheckedChange={(checked) => handleInputChange('settings.allow_invitations', checked)}
                  />
                </div>

                {/* Require Approval */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Admin Approval</Label>
                    <p className="text-sm text-muted-foreground">
                      New members must be approved by an admin before gaining access
                    </p>
                  </div>
                  <Switch
                    checked={formData?.settings?.require_approval ?? false}
                    onCheckedChange={(checked) => handleInputChange('settings.require_approval', checked)}
                  />
                </div>

                {/* Enforce 2FA */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enforce Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Require all users to enable 2FA for their accounts
                    </p>
                  </div>
                  <Switch
                    checked={formData?.settings?.enforce_2fa ?? false}
                    onCheckedChange={(checked) => handleInputChange('settings.enforce_2fa', checked)}
                  />
                </div>

                {/* Session Timeout */}
                <div className="space-y-2">
                  <Label htmlFor="session_timeout">Session Timeout (minutes)</Label>
                  <Input
                    id="session_timeout"
                    type="number"
                    value={formData?.settings?.session_timeout || 480}
                    onChange={(e) => handleInputChange('settings.session_timeout', parseInt(e.target.value))}
                    min={5}
                    max={1440}
                  />
                  <p className="text-sm text-muted-foreground">
                    Automatically log out users after this period of inactivity (5-1440 minutes)
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save/Cancel Actions */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/')}
            disabled={updateCompanyMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isDirty || updateCompanyMutation.isPending}
          >
            {updateCompanyMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}