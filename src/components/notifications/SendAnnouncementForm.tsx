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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/hooks/useUserRole';
import { Loader2, Eye, Send, Clock, Users, Building2, User, Calendar, FileText } from 'lucide-react';

interface SendAnnouncementFormProps {
  userRole: UserRole;
  currentOrganization: any | null;
}

interface UserData {
  id: string;
  full_name: string;
  username: string;
  email?: string;
}

interface NotificationTemplate {
  id: string;
  key: string;
  value: {
    name: string;
    type: string;
    title: string;
    message: string;
    active: boolean;
    variables?: string[];
  };
}

interface AnnouncementData {
  title: string;
  message: string;
  recipientType: 'all_users' | 'org_users' | 'org_admins' | 'specific_users';
  organizationId?: string;
  specificUsers: string[];
  scheduleFor?: Date;
  sendImmediately: boolean;
  selectedTemplate?: string;
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
    sendImmediately: true,
  });
  
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<UserData[]>([]);
  const [scheduleDateTime, setScheduleDateTime] = useState('');

  // Fetch notification templates for selection
  const { data: templates } = useQuery({
    queryKey: ['notification-templates-for-announcement'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .like('key', 'notification_template_%');
      
      if (error) throw error;
      
      return data
        .filter(setting => setting.value && typeof setting.value === 'object' && (setting.value as any).active)
        .map(setting => ({
          id: setting.key,
          key: setting.key,
          value: setting.value as NotificationTemplate['value']
        })) as NotificationTemplate[];
    }
  });

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
        if (formData.recipientType === 'specific_users' && (!formData.organizationId || formData.organizationId === 'all')) {
          // All users for super admin
          const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, username')
            .order('full_name');
          
          if (error) throw error;
          return data;
        } else if (formData.organizationId && formData.organizationId !== 'all') {
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

  // Handle template selection
  const handleTemplateSelect = (templateKey: string) => {
    const template = templates?.find(t => t.key === templateKey);
    if (template) {
      setFormData(prev => ({
        ...prev,
        title: template.value.title,
        message: template.value.message,
        selectedTemplate: templateKey
      }));
    }
  };

  // Replace variables in template with actual data
  const replaceTemplateVariables = (text: string) => {
    const sampleData = {
      '{{user_name}}': 'John Doe',
      '{{organization_name}}': currentOrganization?.name || 'Your Organization',
      '{{app_name}}': 'SaaS Platform',
      '{{sender_name}}': (user as any)?.full_name || 'Admin Team',
      '{{date}}': new Date().toLocaleDateString(),
      '{{time}}': new Date().toLocaleTimeString(),
    };

    let result = text;
    Object.entries(sampleData).forEach(([variable, value]) => {
      result = result.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), value);
    });
    return result;
  };

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
          sendImmediately: announcementData.sendImmediately,
          senderRole: userRole,
          currentOrganizationId: currentOrganization?.id,
          templateUsed: announcementData.selectedTemplate
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: formData.sendImmediately ? 'Announcement sent successfully' : 'Announcement scheduled successfully',
      });
      // Reset form
      setFormData({
        title: '',
        message: '',
        recipientType: 'all_users',
        specificUsers: [],
        sendImmediately: true,
      });
      setSelectedUsers([]);
      setScheduleDateTime('');
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

    if (!formData.sendImmediately && !scheduleDateTime) {
      toast({
        title: 'Validation Error',
        description: 'Please select a date and time for scheduling',
        variant: 'destructive',
      });
      return;
    }

    const finalData = {
      ...formData,
      scheduleFor: formData.sendImmediately ? undefined : new Date(scheduleDateTime)
    };

    sendAnnouncementMutation.mutate(finalData);
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
            {/* Template Selection */}
            <div className="space-y-2">
              <Label>Template (Optional)</Label>
              <Select
                value={formData.selectedTemplate || ''}
                onValueChange={handleTemplateSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template or create custom message" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Custom Message</SelectItem>
                  {templates?.map((template) => (
                    <SelectItem key={template.key} value={template.key}>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {template.value.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.selectedTemplate && (
                <p className="text-xs text-muted-foreground">
                  Template variables will be automatically replaced when sent
                </p>
              )}
            </div>

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
                          <SelectItem value="all">All organizations</SelectItem>
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

            {/* Scheduling Options */}
            <div className="space-y-4">
              <Label>Scheduling</Label>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="sendImmediately"
                  checked={formData.sendImmediately}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sendImmediately: checked }))}
                />
                <Label htmlFor="sendImmediately">Send immediately</Label>
              </div>

              {!formData.sendImmediately && (
                <div className="space-y-2">
                  <Label htmlFor="scheduleDateTime">Schedule Date & Time</Label>
                  <Input
                    id="scheduleDateTime"
                    type="datetime-local"
                    value={scheduleDateTime}
                    onChange={(e) => setScheduleDateTime(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {scheduleDateTime && `Will be sent on ${new Date(scheduleDateTime).toLocaleString()}`}
                  </p>
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
                      <p className="font-semibold text-lg">
                        {formData.selectedTemplate ? replaceTemplateVariables(formData.title) : formData.title || 'Enter title...'}
                      </p>
                    </div>
                    <div>
                      <Label>Message</Label>
                      <p className="whitespace-pre-wrap">
                        {formData.selectedTemplate ? replaceTemplateVariables(formData.message) : formData.message || 'Enter message...'}
                      </p>
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
                    <div>
                      <Label>Delivery</Label>
                      <div className="flex items-center gap-2">
                        {formData.sendImmediately ? (
                          <>
                            <Send className="h-4 w-4" />
                            <span>Send immediately</span>
                          </>
                        ) : (
                          <>
                            <Clock className="h-4 w-4" />
                            <span>Scheduled for {scheduleDateTime ? new Date(scheduleDateTime).toLocaleString() : 'Select date & time'}</span>
                          </>
                        )}
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
                ) : formData.sendImmediately ? (
                  <Send className="h-4 w-4" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
                {formData.sendImmediately ? 'Send Now' : 'Schedule Announcement'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}