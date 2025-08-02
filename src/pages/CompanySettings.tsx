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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Upload, Loader2, Building } from 'lucide-react';

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
    require_email_verification?: boolean;
  };
}

export default function CompanySettings() {
  const { user } = useAuth();
  const { currentOrganization, refreshOrganizations } = useOrganization();
  const { role, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    website_url: '',
    industry: '',
    company_size: '',
    default_role: 'user',
    require_email_verification: true
  });
  const [isDirty, setIsDirty] = useState(false);
  const [isLogoUploading, setIsLogoUploading] = useState(false);

  // Redirect non-admin users (only after role has loaded)
  useEffect(() => {
    if (!roleLoading && role && role !== 'admin' && role !== 'super_admin') {
      toast({
        title: 'Access Denied',
        description: 'You need admin permissions to access company settings',
        variant: 'destructive',
      });
      navigate('/settings/profile');
    }
  }, [role, roleLoading, navigate, toast]);

  // Fetch current organization data
  const { data: companyData, isLoading } = useQuery({
    queryKey: ['company-settings', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return null;
      
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', currentOrganization.id)
        .single();
      
      if (error) throw error;
      return data as CompanyData;
    },
    enabled: !!currentOrganization?.id && (role === 'admin' || role === 'super_admin')
  });

  // Initialize form data when company data loads
  useEffect(() => {
    if (companyData) {
      const settings = companyData.settings || {};
      setFormData({
        name: companyData.name || '',
        description: settings.description || '',
        website_url: settings.website_url || '',
        industry: settings.industry || '',
        company_size: settings.company_size || '',
        default_role: settings.default_role || 'user',
        require_email_verification: settings.require_email_verification ?? true
      });
    }
  }, [companyData]);

  // Update company mutation
  const updateCompanyMutation = useMutation({
    mutationFn: async (data: Partial<CompanyData>) => {
      if (!currentOrganization?.id) throw new Error('No organization selected');
      
      const { error } = await supabase
        .from('organizations')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentOrganization.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Company settings updated successfully',
      });
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['company-settings', currentOrganization?.id] });
      refreshOrganizations();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update company settings. Please try again.',
        variant: 'destructive',
      });
      console.error('Company update error:', error);
    }
  });

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Company name is required',
        variant: 'destructive',
      });
      return;
    }

    // Validate website URL if provided
    if (formData.website_url && formData.website_url.trim()) {
      try {
        new URL(formData.website_url.startsWith('http') ? formData.website_url : `https://${formData.website_url}`);
      } catch {
        toast({
          title: 'Validation Error',
          description: 'Please enter a valid website URL',
          variant: 'destructive',
        });
        return;
      }
    }

    const updateData = {
      name: formData.name,
      settings: {
        ...companyData?.settings,
        description: formData.description || null,
        website_url: formData.website_url || null,
        industry: formData.industry || null,
        company_size: formData.company_size || null,
        default_role: formData.default_role,
        require_email_verification: formData.require_email_verification
      }
    };

    updateCompanyMutation.mutate(updateData);
  };

  const handleLogoUpload = async (file: File) => {
    if (!user?.id || !currentOrganization?.id) {
      toast({
        title: 'Error',
        description: 'User or organization not available. Please try again.',
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

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast({
        title: 'File Too Large',
        description: 'Logo must be smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setIsLogoUploading(true);
    
    try {
      // Create organization-scoped filename: logos/[organization_id]/logo.[ext]
      const fileExt = file.name.split('.').pop();
      const fileName = `logos/${currentOrganization.id}/logo.${fileExt}`;
      
      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('avatars') // Using same bucket as avatars for now
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      // Update organization with new logo URL
      await updateCompanyMutation.mutateAsync({ logo_url: publicUrl });
      
      toast({
        title: 'Success',
        description: 'Company logo updated successfully',
      });
    } catch (error) {
      console.error('Logo upload error:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload logo. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLogoUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleLogoUpload(file);
    }
  };

  // Warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  // Don't render if user doesn't have permission
  if (role !== 'admin' && role !== 'super_admin') {
    return null;
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-6 py-6 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
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

        <div className="space-y-6">
          {/* Company Information Section */}
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
                      {companyData?.logo_url ? (
                        <img 
                          src={companyData.logo_url} 
                          alt="Company logo" 
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <Building className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    {isLogoUploading && (
                      <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLogoUploading}
                      className="flex items-center space-x-2"
                    >
                      <Upload className="h-4 w-4" />
                      <span>Upload Company Logo</span>
                    </Button>
                    <p className="text-sm text-muted-foreground mt-1">
                      JPG, PNG or SVG. Max size 5MB. Recommended: 120x60px
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

                {/* Company Name */}
                <div className="space-y-2">
                  <Label htmlFor="company_name">
                    Company Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="company_name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter company name"
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Company Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe your company..."
                    className="min-h-[100px]"
                    maxLength={500}
                  />
                  <div className="text-sm text-muted-foreground text-right">
                    {formData.description.length}/500 characters
                  </div>
                </div>

                {/* Website URL */}
                <div className="space-y-2">
                  <Label htmlFor="website_url">Website URL</Label>
                  <Input
                    id="website_url"
                    type="url"
                    value={formData.website_url}
                    onChange={(e) => handleInputChange('website_url', e.target.value)}
                    placeholder="https://yourcompany.com"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Industry */}
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Select value={formData.industry} onValueChange={(value) => handleInputChange('industry', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technology">Technology</SelectItem>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Company Size */}
                  <div className="space-y-2">
                    <Label htmlFor="company_size">Company Size</Label>
                    <Select value={formData.company_size} onValueChange={(value) => handleInputChange('company_size', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select company size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-10">1-10 employees</SelectItem>
                        <SelectItem value="11-50">11-50 employees</SelectItem>
                        <SelectItem value="51-200">51-200 employees</SelectItem>
                        <SelectItem value="201-1000">201-1000 employees</SelectItem>
                        <SelectItem value="1000+">1000+ employees</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Team Settings Section */}
          <Card>
            <CardHeader>
              <CardTitle>Team Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Default Role */}
              <div className="space-y-2">
                <Label htmlFor="default_role">Default Role for New Members</Label>
                <Select value={formData.default_role} onValueChange={(value) => handleInputChange('default_role', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Email Verification */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="require_email_verification">Require Email Verification</Label>
                  <p className="text-sm text-muted-foreground">
                    New users must verify their email before accessing the platform
                  </p>
                </div>
                <Switch
                  id="require_email_verification"
                  checked={formData.require_email_verification}
                  onCheckedChange={(checked) => handleInputChange('require_email_verification', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4">
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
      </div>
    </AppLayout>
  );
}