import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/hooks/useUserRole';
// Use the organization data structure from context
import { Loader2, Eye, Send, Clock, Users, Building2, User } from 'lucide-react';

interface SendAnnouncementFormProps {
  userRole: UserRole;
  currentOrganization: any | null;
}

interface User {
  id: string;
  full_name: string;
  username: string;
  email?: string;
}

interface AnnouncementData {
  title: string;
  message: string;
  recipientType: 'all_users' | 'org_users' | 'org_admins' | 'specific_users';
  organizationId?: string;
  specificUsers: string[];
  scheduleFor?: Date;
}

export function SendAnnouncementForm({ userRole, currentOrganization }: SendAnnouncementFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<AnnouncementData>({
    title: '',
    message: '',
    recipientType: 'all_users',
    specificUsers: [],
  });
  
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);

  // Fetch organizations (for super admin)
  const { data: organizations } = useQuery({
    queryKey: ['organizations-for-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: userRole === 'super_admin'
  });

  // Fetch users for specific selection
  const { data: availableUsers } = useQuery({
    queryKey: ['users-for-notifications', formData.organizationId, userRole],
    queryFn: async () => {
      if (userRole === 'super_admin') {
        if (formData.recipientType === 'specific_users' && !formData.organizationId) {
          // All users for super admin
          const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, username')
            .order('full_name');
          
          if (error) throw error;
          return data;
        } else if (formData.organizationId) {
          // Users from specific organization - simplified query
          const { data: membershipData, error: membershipError } = await supabase
            .from('memberships')
            .select('user_id')
            .eq('organization_id', formData.organizationId)
            .eq('status', 'active');
          
          if (membershipError) throw membershipError;
          
          const userIds = membershipData.map(m => m.user_id);
          
          const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, username')
            .in('id', userIds);
            
          if (error) throw error;
          return data;
        }
      } else if (userRole === 'admin' && currentOrganization) {
        // Users from current organization for admin - simplified query
        const { data: membershipData, error: membershipError } = await supabase
          .from('memberships')
          .select('user_id')
          .eq('organization_id', currentOrganization.id)
          .eq('status', 'active');
        
        if (membershipError) throw membershipError;
        
        const userIds = membershipData.map(m => m.user_id);
        
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, username')
          .in('id', userIds);
          
        if (error) throw error;
        return data;
      }
      return [];
    },
    enabled: formData.recipientType === 'specific_users' || (userRole === 'admin')
  });

  // Send announcement mutation
  const sendAnnouncementMutation = useMutation({
    mutationFn: async (announcementData: AnnouncementData) => {
      const { data, error } = await supabase.functions.invoke('send-announcement', {
        body: {
          title: announcementData.title,
          message: announcementData.message,
          recipientType: announcementData.recipientType,
          organizationId: announcementData.organizationId,
          specificUsers: announcementData.specificUsers,
          scheduleFor: announcementData.scheduleFor?.toISOString(),
          senderRole: userRole,
          currentOrganizationId: currentOrganization?.id
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Announcement sent successfully',
      });
      // Reset form
      setFormData({
        title: '',
        message: '',
        recipientType: 'all_users',
        specificUsers: [],
      });
      setSelectedUsers([]);
      queryClient.invalidateQueries({ queryKey: ['notification-history'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to send announcement. Please try again.',
        variant: 'destructive',
      });
      console.error('Send announcement error:', error);
    }
  });

  const handleUserSelection = (userId: string, checked: boolean) => {
    if (checked) {
      const foundUser = availableUsers?.find(u => u && u.id === userId);
      if (foundUser) {
        setSelectedUsers(prev => [...prev, foundUser]);
        setFormData(prev => ({
          ...prev,
          specificUsers: [...prev.specificUsers, userId]
        }));
      }
    } else {
      setSelectedUsers(prev => prev.filter(u => u.id !== userId));
      setFormData(prev => ({
        ...prev,
        specificUsers: prev.specificUsers.filter(id => id !== userId)
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.message.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Title and message are required',
        variant: 'destructive',
      });
      return;
    }

    if (formData.recipientType === 'specific_users' && formData.specificUsers.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one user',
        variant: 'destructive',
      });
      return;
    }

    sendAnnouncementMutation.mutate(formData);
  };

  const getRecipientTypeIcon = (type: string) => {
    switch (type) {
      case 'all_users': return <Users className="h-4 w-4" />;
      case 'org_users': return <Building2 className="h-4 w-4" />;
      case 'org_admins': return <User className="h-4 w-4" />;
      case 'specific_users': return <Users className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Announcement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title and Message */}
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter announcement title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  placeholder="Enter your announcement message"
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  rows={6}
                  required
                />
              </div>
            </div>

            {/* Recipient Selection */}
            <div className="space-y-4">
              <Label>Recipients</Label>
              
              <Select
                value={formData.recipientType}
                onValueChange={(value: any) => setFormData(prev => ({ 
                  ...prev, 
                  recipientType: value,
                  specificUsers: [],
                  organizationId: undefined
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {userRole === 'super_admin' && (
                    <>
                      <SelectItem value="all_users">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          All users system-wide
                        </div>
                      </SelectItem>
                      <SelectItem value="org_users">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          All users in specific organization
                        </div>
                      </SelectItem>
                      <SelectItem value="org_admins">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Only admins of specific organization
                        </div>
                      </SelectItem>
                      <SelectItem value="specific_users">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Specific user selection
                        </div>
                      </SelectItem>
                    </>
                  )}
                  {userRole === 'admin' && (
                    <>
                      <SelectItem value="org_users">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          All users in your organization
                        </div>
                      </SelectItem>
                      <SelectItem value="specific_users">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Specific users in your organization
                        </div>
                      </SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>

              {/* Organization Selection (for super admin) */}
              {userRole === 'super_admin' && (formData.recipientType === 'org_users' || formData.recipientType === 'org_admins') && (
                <div className="space-y-2">
                  <Label>Select Organization</Label>
                  <Select
                    value={formData.organizationId || ''}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, organizationId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations?.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Specific User Selection */}
              {formData.recipientType === 'specific_users' && (
                <div className="space-y-4">
                  {userRole === 'super_admin' && !formData.organizationId && (
                    <div className="space-y-2">
                      <Label>Select Organization (optional)</Label>
                      <Select
                        value={formData.organizationId || ''}
                        onValueChange={(value) => setFormData(prev => ({ 
                          ...prev, 
                          organizationId: value,
                          specificUsers: []
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All organizations" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All organizations</SelectItem>
                          {organizations?.map((org) => (
                            <SelectItem key={org.id} value={org.id}>
                              {org.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Select Users</Label>
                    <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
                      {availableUsers?.map((user) => (
                        <div key={user.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={user.id}
                            checked={formData.specificUsers.includes(user.id)}
                            onCheckedChange={(checked) => handleUserSelection(user.id, checked as boolean)}
                          />
                          <label htmlFor={user.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {user.full_name || user.username}
                          </label>
                        </div>
                      ))}
                    </div>
                    
                    {selectedUsers.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedUsers.map((user) => (
                          <Badge key={user.id} variant="secondary">
                            {user.full_name || user.username}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Preview
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Announcement Preview</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Title</Label>
                      <p className="font-semibold text-lg">{formData.title || 'Enter title...'}</p>
                    </div>
                    <div>
                      <Label>Message</Label>
                      <p className="whitespace-pre-wrap">{formData.message || 'Enter message...'}</p>
                    </div>
                    <div>
                      <Label>Recipients</Label>
                      <div className="flex items-center gap-2">
                        {getRecipientTypeIcon(formData.recipientType)}
                        <span>
                          {formData.recipientType === 'all_users' && 'All users system-wide'}
                          {formData.recipientType === 'org_users' && 'All users in selected organization'}
                          {formData.recipientType === 'org_admins' && 'Admins of selected organization'}
                          {formData.recipientType === 'specific_users' && `${selectedUsers.length} selected users`}
                        </span>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button 
                type="submit" 
                className="flex items-center gap-2"
                disabled={sendAnnouncementMutation.isPending}
              >
                {sendAnnouncementMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send Announcement
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}