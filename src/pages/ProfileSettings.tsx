import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Upload, Loader2 } from 'lucide-react';
import { useOptimizedForm, commonValidationRules } from '@/hooks/useOptimizedForm';

interface ProfileData {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  bio: string | null;
  avatar_url: string | null;
}

export default function ProfileSettings() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Validation rules for the form
  const validationRules = useMemo(() => [
    {
      field: 'full_name' as const,
      validate: commonValidationRules.required('Full name is required')
    },
    {
      field: 'bio' as const,
      validate: commonValidationRules.maxLength(160, 'Bio must be 160 characters or less')
    },
    {
      field: 'phone_number' as const,
      validate: (value: string) => {
        if (value && !/^[\+]?[1-9][\d\s\-\(\)]{7,20}$/.test(value)) {
          return 'Please enter a valid phone number';
        }
        return null;
      }
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
    initialData: {
      full_name: '',
      phone_number: '',
      bio: ''
    },
    validationRules,
    debounceMs: 300
  });

  const [isUploading, setIsUploading] = useState(false);

  // Fetch current profile data
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as ProfileData | null;
    },
    enabled: !!user?.id
  });

  // Initialize form data when profile loads - use the form's reset method
  useEffect(() => {
    if (profile) {
      const profileData = {
        full_name: profile.full_name || '',
        phone_number: profile.phone_number || '',
        bio: profile.bio || ''
      };
      // Reset the optimized form with new data
      reset();
      setTimeout(() => {
        handleChange('full_name', profileData.full_name);
        handleChange('phone_number', profileData.phone_number);
        handleChange('bio', profileData.bio);
      }, 0);
    }
  }, [profile, reset, handleChange]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<ProfileData>) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...data,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
      reset();
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
      console.error('Profile update error:', error);
    }
  });

  // Memoized event handlers to prevent child re-renders
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields first
    if (!validateAll()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form',
        variant: 'destructive',
      });
      return;
    }

    updateProfileMutation.mutate(formData);
  }, [formData, validateAll, updateProfileMutation, toast]);

  const handleAvatarUpload = useCallback(async (file: File) => {
    if (!user?.id || !currentOrganization?.id) {
      toast({
        title: 'Error',
        description: 'User or organization not available. Please try again.',
        variant: 'destructive',
      });
      return;
    }
    
    // Validate file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid File',
        description: 'Please upload a JPG, PNG, or GIF image',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast({
        title: 'File Too Large',
        description: 'Image must be smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    
    try {
      // Create organization-scoped filename: /[organization_id]/[user_id]/avatar.[ext]
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentOrganization.id}/${user.id}/avatar.${fileExt}`;
      
      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      // Update profile with new avatar URL
      await updateProfileMutation.mutateAsync({ avatar_url: publicUrl });
      
      toast({
        title: 'Success',
        description: 'Avatar updated successfully',
      });
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload avatar. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }, [user?.id, currentOrganization?.id, updateProfileMutation, toast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleAvatarUpload(file);
    }
  }, [handleAvatarUpload]);

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
                <BreadcrumbPage>Profile Settings</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-3xl font-bold mt-4">Profile Settings</h1>
        </div>

        {/* Profile Information Section */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Avatar Upload */}
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage 
                      src={profile?.avatar_url || undefined} 
                      alt="Profile avatar" 
                    />
                    <AvatarFallback className="text-lg">
                      {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center space-x-2"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Upload New Photo</span>
                  </Button>
                  <p className="text-sm text-muted-foreground mt-1">
                    JPG, PNG or GIF. Max size 5MB.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="full_name">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="full_name"
                  type="text"
                  value={getFieldState('full_name').value}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
                {getFieldState('full_name').error && (
                  <p className="text-sm text-destructive">{getFieldState('full_name').error}</p>
                )}
              </div>

              {/* Email (Read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => toast({
                      title: 'Coming Soon',
                      description: 'Email change functionality will be available soon',
                    })}
                  >
                    Change Email
                  </Button>
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input
                  id="phone_number"
                  type="tel"
                  value={getFieldState('phone_number').value}
                  onChange={(e) => handleChange('phone_number', e.target.value)}
                  placeholder="Enter your phone number"
                />
                {getFieldState('phone_number').error && (
                  <p className="text-sm text-destructive">{getFieldState('phone_number').error}</p>
                )}
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={getFieldState('bio').value}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  placeholder="Tell us about yourself..."
                  className="min-h-[100px]"
                  maxLength={160}
                />
                <div className="flex justify-between items-center text-sm">
                  {getFieldState('bio').error ? (
                    <span className="text-destructive">{getFieldState('bio').error}</span>
                  ) : (
                    <span></span>
                  )}
                  <span className="text-muted-foreground">
                    {getFieldState('bio').value?.length || 0}/160 characters
                  </span>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end space-x-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/')}
                  disabled={updateProfileMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!isDirty || updateProfileMutation.isPending || hasErrors || isFormValidating}
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}