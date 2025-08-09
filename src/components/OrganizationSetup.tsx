import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/ui/icons';

const createOrgSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters'),
  industry: z.string().min(1, 'Please select an industry'),
  companySize: z.string().min(1, 'Please select company size'),
  description: z.string().optional(),
});

const joinOrgSchema = z.object({
  invitationToken: z.string().min(1, 'Please enter an invitation code'),
});

const requestAccessSchema = z.object({
  adminEmail: z.string().email('Please enter a valid email address'),
  organizationName: z.string().min(1, 'Please enter organization name'),
  message: z.string().optional(),
});

interface OrganizationSetupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function OrganizationSetup({ open, onOpenChange, onSuccess }: OrganizationSetupProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('create');

  const createForm = useForm<z.infer<typeof createOrgSchema>>({
    resolver: zodResolver(createOrgSchema),
    defaultValues: {
      name: '',
      industry: '',
      companySize: '',
      description: '',
    },
  });

  const joinForm = useForm<z.infer<typeof joinOrgSchema>>({
    resolver: zodResolver(joinOrgSchema),
    defaultValues: {
      invitationToken: '',
    },
  });

  const requestForm = useForm<z.infer<typeof requestAccessSchema>>({
    resolver: zodResolver(requestAccessSchema),
    defaultValues: {
      adminEmail: '',
      organizationName: '',
      message: `Hi, I'd like to join your organization. Please send me an invitation to ${user?.email}.`,
    },
  });

  const industries = [
    'Technology',
    'Healthcare',
    'Finance',
    'Education',
    'Manufacturing',
    'Retail',
    'Real Estate',
    'Consulting',
    'Non-profit',
    'Government',
    'Other',
  ];

  const companySizes = [
    '1-10 employees',
    '11-50 employees',
    '51-200 employees',
    '201-1000 employees',
    '1000+ employees',
  ];

  const onCreateOrganization = async (values: z.infer<typeof createOrgSchema>) => {
    if (!user) return;

    setLoading(true);
    try {
      // Generate slug from organization name
      const slug = values.name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      // Create organization
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: values.name,
          slug: `${slug}-${Date.now()}`, // Add timestamp to ensure uniqueness
          is_active: true,
          settings: {
            industry: values.industry,
            company_size: values.companySize,
            description: values.description,
          },
        })
        .select()
        .maybeSingle();

      if (orgError) throw orgError;

      // Create admin membership
      const { error: membershipError } = await supabase
        .from('memberships')
        .insert({
          user_id: user.id,
          organization_id: newOrg.id,
          role: 'admin',
          status: 'active',
          joined_at: new Date().toISOString(),
        });

      if (membershipError) throw membershipError;

      toast({
        title: 'Organization Created!',
        description: `Welcome to ${values.name}! You're now the Company Admin.`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating organization:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create organization',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const onJoinOrganization = async (values: z.infer<typeof joinOrgSchema>) => {
    if (!user) return;

    setLoading(true);
    try {
      // Find invitation by token
      const { data: invitation, error: inviteError } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', values.invitationToken)
        .eq('email', user.email)
        .is('accepted_at', null)
        .maybeSingle();

      if (inviteError || !invitation) {
        throw new Error('Invalid invitation code or invitation not found');
      }

      // Check if invitation is not expired
      if (new Date(invitation.expires_at) < new Date()) {
        throw new Error('Invitation has expired');
      }

      // Accept invitation
      const { error: updateError } = await supabase
        .from('invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);

      if (updateError) throw updateError;

      // Create membership
      const { error: membershipError } = await supabase
        .from('memberships')
        .insert({
          user_id: user.id,
          organization_id: invitation.organization_id,
          role: invitation.role,
          status: 'active',
          joined_at: new Date().toISOString(),
        });

      if (membershipError) throw membershipError;

      toast({
        title: 'Successfully Joined!',
        description: 'You have joined the organization.',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error joining organization:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to join organization',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const onRequestAccess = async (values: z.infer<typeof requestAccessSchema>) => {
    setLoading(true);
    try {
      // This would typically send an email or create a notification
      // For now, we'll show a success message
      toast({
        title: 'Request Sent',
        description: `Your request has been sent to ${values.adminEmail}. They will contact you soon.`,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Error sending request:', error);
      toast({
        title: 'Error',
        description: 'Failed to send request',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Organization Setup</DialogTitle>
          <DialogDescription>
            Get started by creating a new organization, joining an existing one, or requesting access.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create">Create New</TabsTrigger>
            <TabsTrigger value="join">Join Existing</TabsTrigger>
            <TabsTrigger value="request">Request Access</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icons.building className="h-5 w-5" />
                  Create New Organization
                </CardTitle>
                <CardDescription>
                  Start your own organization and become the Company Admin.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...createForm}>
                  <form onSubmit={createForm.handleSubmit(onCreateOrganization)} className="space-y-4">
                    <FormField
                      control={createForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter organization name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="industry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Industry</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select industry" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {industries.map((industry) => (
                                <SelectItem key={industry} value={industry}>
                                  {industry}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="companySize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Size</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select company size" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {companySizes.map((size) => (
                                <SelectItem key={size} value={size}>
                                  {size}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Brief description of your organization"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Icons.clock className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create Organization'
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="join" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icons.users className="h-5 w-5" />
                  Join Existing Organization
                </CardTitle>
                <CardDescription>
                  Enter your invitation code to join an organization.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...joinForm}>
                  <form onSubmit={joinForm.handleSubmit(onJoinOrganization)} className="space-y-4">
                    <FormField
                      control={joinForm.control}
                      name="invitationToken"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invitation Code</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter invitation code" {...field} />
                          </FormControl>
                          <FormDescription>
                            You should have received this code from your organization admin.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Icons.clock className="mr-2 h-4 w-4 animate-spin" />
                          Joining...
                        </>
                      ) : (
                        'Join Organization'
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="request" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icons.mail className="h-5 w-5" />
                  Request Access
                </CardTitle>
                <CardDescription>
                  Contact an organization admin to request access.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...requestForm}>
                  <form onSubmit={requestForm.handleSubmit(onRequestAccess)} className="space-y-4">
                    <FormField
                      control={requestForm.control}
                      name="organizationName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter organization name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={requestForm.control}
                      name="adminEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Admin Email</FormLabel>
                          <FormControl>
                            <Input placeholder="admin@company.com" {...field} />
                          </FormControl>
                          <FormDescription>
                            Email address of the organization admin.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={requestForm.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message (Optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Additional message..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Icons.clock className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Request'
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}