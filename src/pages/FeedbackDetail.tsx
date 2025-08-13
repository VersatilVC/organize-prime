import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/lib/auth-migration';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { AttachmentViewer } from '@/components/ui/attachment-viewer';
import { 
  Bug, 
  Lightbulb, 
  TrendingUp, 
  HelpCircle, 
  ArrowLeft, 
  User, 
  Building, 
  Calendar, 
  CheckCircle, 
  Clock, 
  Play,
  XCircle,
  Save,
  Bell,
  MessageSquare,
  FileText,
  AlertTriangle
} from 'lucide-react';

interface FeedbackDetail {
  id: string;
  type: string;
  subject: string;
  description: string;
  category?: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  organization_id: string;
  admin_response?: string;
  responded_by?: string;
  responded_at?: string;
  internal_notes?: string;
  attachments?: string[] | null;
  status_history: any[];
  user_name?: string;
  user_email?: string;
  user_avatar?: string;
  user_role?: string;
  organization_name?: string;
  responder_name?: string;
}

const typeConfig = {
  bug: { label: 'Bug Report', color: 'bg-red-500 text-white', icon: Bug },
  feature: { label: 'Feature Request', color: 'bg-blue-500 text-white', icon: Lightbulb },
  improvement: { label: 'Improvement', color: 'bg-green-500 text-white', icon: TrendingUp },
  other: { label: 'Other', color: 'bg-gray-500 text-white', icon: HelpCircle },
};

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-500 text-white' },
  reviewing: { label: 'Reviewing', color: 'bg-blue-500 text-white' },
  in_progress: { label: 'In Progress', color: 'bg-orange-500 text-white' },
  resolved: { label: 'Resolved', color: 'bg-green-500 text-white' },
  closed: { label: 'Closed', color: 'bg-gray-500 text-white' },
};

const priorityConfig = {
  low: { label: 'Low', color: 'bg-gray-500 text-white' },
  medium: { label: 'Medium', color: 'bg-yellow-500 text-white' },
  high: { label: 'High', color: 'bg-orange-500 text-white' },
  critical: { label: 'Critical', color: 'bg-red-500 text-white' },
};

const statusFlow = ['pending', 'reviewing', 'in_progress', 'resolved', 'closed'];

export default function FeedbackDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { role, loading: roleLoading } = useUserRole();
  
  const [feedback, setFeedback] = useState<FeedbackDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Admin response form
  const [adminResponse, setAdminResponse] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  useEffect(() => {
    if (!roleLoading && id) {
      loadFeedback();
    }
  }, [id, roleLoading]);

  const loadFeedback = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      // Get feedback details
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('feedback')
        .select('id, type, subject, description, category, status, priority, created_at, updated_at, user_id, organization_id, admin_response, responded_by, responded_at, internal_notes, attachments, status_history')
        .eq('id', id)
        .maybeSingle();

      if (feedbackError) throw feedbackError;
      
      if (!feedbackData) {
        toast({
          variant: 'destructive',
          title: 'Feedback Not Found',
          description: 'The feedback you are looking for does not exist.',
        });
        navigate(role === 'super_admin' ? '/admin/feedback' : '/');
        return;
      }

      // Check access permissions
      const hasAccess = checkAccess(feedbackData);
      if (!hasAccess) {
        toast({
          variant: 'destructive',
          title: 'Access Denied',
          description: 'You do not have permission to view this feedback.',
        });
        navigate(role === 'super_admin' ? '/admin/feedback' : '/');
        return;
      }

      // Get user details
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', feedbackData.user_id)
        .maybeSingle();

      // Get user email and organization details
      const { data: membershipData } = await supabase
        .from('memberships')
        .select(`
          role,
          organizations(name)
        `)
        .eq('user_id', feedbackData.user_id)
        .eq('organization_id', feedbackData.organization_id)
        .maybeSingle();

      // Get user email (only if super admin)
      let userEmail = '';
      if (role === 'super_admin') {
        try {
          const { data: emailData } = await supabase
            .rpc('get_user_emails_for_super_admin', { user_ids: [feedbackData.user_id] });
          userEmail = emailData?.[0]?.email || '';
        } catch (error) {
          console.warn('Could not fetch user email:', error);
        }
      }

      // Get responder details if available
      let responderName = '';
      if (feedbackData.responded_by) {
        const { data: responderData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', feedbackData.responded_by)
          .maybeSingle();
        responderName = responderData?.full_name || 'Unknown Admin';
      }

      const enrichedFeedback: FeedbackDetail = {
        ...feedbackData,
        status_history: Array.isArray(feedbackData.status_history) ? feedbackData.status_history : [],
        user_name: profileData?.full_name || 'Unknown User',
        user_email: userEmail,
        user_avatar: profileData?.avatar_url,
        user_role: membershipData?.role || 'user',
        organization_name: membershipData?.organizations?.name || 'Unknown Organization',
        responder_name: responderName,
      };

      setFeedback(enrichedFeedback);
      setAdminResponse(enrichedFeedback.admin_response || '');
      setNewStatus(enrichedFeedback.status);
      setNewPriority(enrichedFeedback.priority);
      setInternalNotes(enrichedFeedback.internal_notes || '');

    } catch (error) {
      console.error('Error loading feedback:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load feedback details.',
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const checkAccess = (feedbackData: any): boolean => {
    if (!user) return false;
    
    // Super admins can view all feedback
    if (role === 'super_admin') return true;
    
    // Users can only view their own feedback
    if (feedbackData.user_id === user.id) return true;
    
    // Org admins can view feedback from their organization
    if (role === 'admin' && currentOrganization && feedbackData.organization_id === currentOrganization.id) {
      return true;
    }
    
    return false;
  };

  const handleSaveResponse = async () => {
    if (!feedback || !user) return;
    
    setSaving(true);
    try {
      const updates: any = {
        updated_at: new Date().toISOString(),
      };

      if (role === 'super_admin' || (role === 'admin' && currentOrganization && feedback.organization_id === currentOrganization.id)) {
        if (adminResponse.trim()) {
          updates.admin_response = adminResponse.trim();
          updates.responded_by = user.id;
          updates.responded_at = new Date().toISOString();
        }
        
        if (newStatus !== feedback.status) {
          updates.status = newStatus;
        }
        
        if (newPriority !== feedback.priority) {
          updates.priority = newPriority;
        }
        
        if (internalNotes !== feedback.internal_notes) {
          updates.internal_notes = internalNotes;
        }
      }

      const { error } = await supabase
        .from('feedback')
        .update(updates)
        .eq('id', feedback.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Feedback status updated to ${newStatus.replace('_', ' ')}.`,
      });

      loadFeedback(); // Reload to get updated data
    } catch (error) {
      console.error('Error updating feedback:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update feedback.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendNotification = async (userId: string) => {
    if (!userId || !feedback) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Missing feedback information.',
      });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-feedback-notification', {
        body: {
          feedbackId: feedback.id,
          title: `Update on your feedback: ${feedback.subject}`,
          message: adminResponse.trim() 
            ? `Admin response: ${adminResponse.trim()}` 
            : `Your feedback "${feedback.subject}" has been updated with status: ${newStatus.replace('_', ' ')}.`,
          senderRole: role,
          currentOrganizationId: currentOrganization?.id
        }
      });

      if (error) throw error;

      toast({
        title: 'Notification Sent',
        description: 'User has been notified about the feedback update.',
      });
    } catch (error) {
      console.error('Error sending notification:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send notification.',
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = (status: string, isCompleted: boolean) => {
    if (isCompleted) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (status === feedback?.status) return <Clock className="h-5 w-5 text-blue-500" />;
    return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
  };

  const getBackLink = () => {
    if (role === 'super_admin') return '/admin/feedback';
    return '/';
  };

  const getBackLabel = () => {
    if (role === 'super_admin') return 'Feedback Management';
    return 'Dashboard';
  };

  if (roleLoading || loading) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-96" />
              <Skeleton className="h-64" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-48" />
              <Skeleton className="h-64" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!feedback) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Feedback not found</h3>
            <p className="text-muted-foreground mb-4">The feedback you're looking for doesn't exist or you don't have access to it.</p>
            <Button onClick={() => navigate(getBackLink())}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to {getBackLabel()}
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const TypeIcon = typeConfig[feedback.type as keyof typeof typeConfig]?.icon || HelpCircle;

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              {role === 'super_admin' && (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/admin/feedback">Feedback Management</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </>
              )}
              <BreadcrumbItem>
                <BreadcrumbPage>Feedback Details</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => navigate(getBackLink())}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to {getBackLabel()}
              </Button>
              <div className="flex items-center space-x-2">
                <Badge className={typeConfig[feedback.type as keyof typeof typeConfig]?.color}>
                  <TypeIcon className="h-3 w-3 mr-1" />
                  {typeConfig[feedback.type as keyof typeof typeConfig]?.label}
                </Badge>
                <Badge className={statusConfig[feedback.status as keyof typeof statusConfig]?.color}>
                  {statusConfig[feedback.status as keyof typeof statusConfig]?.label}
                </Badge>
                <Badge className={priorityConfig[feedback.priority as keyof typeof priorityConfig]?.color}>
                  {priorityConfig[feedback.priority as keyof typeof priorityConfig]?.label}
                </Badge>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              <Calendar className="inline h-4 w-4 mr-1" />
              Created {formatDistanceToNow(new Date(feedback.created_at), { addSuffix: true })}
            </div>
          </div>
          
          <h1 className="text-3xl font-bold">{feedback.subject}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Feedback Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Feedback Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <div className="p-4 bg-muted/20 rounded-md">
                    <p className="whitespace-pre-wrap leading-relaxed">{feedback.description}</p>
                  </div>
                </div>
                
                {feedback.category && (
                  <div>
                    <h4 className="font-medium mb-2">Category</h4>
                    <Badge variant="outline">{feedback.category}</Badge>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Submitted:</span>
                    <p className="text-muted-foreground">
                      {format(new Date(feedback.created_at), 'PPpp')}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Last Updated:</span>
                    <p className="text-muted-foreground">
                      {format(new Date(feedback.updated_at), 'PPpp')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attachments Section */}
            {feedback.attachments && feedback.attachments.length > 0 && (
              <AttachmentViewer
                attachments={feedback.attachments}
                canDownload={role === 'super_admin' || (role === 'admin' && currentOrganization && feedback.organization_id === currentOrganization.id)}
              />
            )}

            {/* Status Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Status Timeline</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {statusFlow.map((status, index) => {
                    const isCompleted = statusFlow.indexOf(feedback.status) > index || 
                                       (feedback.status === status && status !== 'pending');
                    const isCurrent = feedback.status === status;
                    
                    return (
                      <div key={status} className="flex items-center space-x-3">
                        {getStatusIcon(status, isCompleted)}
                        <div className="flex-1">
                          <div className={`font-medium ${isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {statusConfig[status as keyof typeof statusConfig]?.label}
                          </div>
                          {isCurrent && (
                            <div className="text-sm text-muted-foreground">Current status</div>
                          )}
                        </div>
                        {index < statusFlow.length - 1 && (
                          <div className={`w-px h-8 ${isCompleted ? 'bg-green-300' : 'bg-gray-200'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Admin Response Display */}
            {feedback.admin_response && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5" />
                    <span>Admin Response</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-md">
                      <p className="whitespace-pre-wrap leading-relaxed">{feedback.admin_response}</p>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>Response by {feedback.responder_name}</span>
                      <span>•</span>
                      <span>{format(new Date(feedback.responded_at!), 'PPpp')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* User Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>User Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={feedback.user_avatar} />
                    <AvatarFallback>
                      {feedback.user_name?.split(' ').map(n => n[0]).join('') || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{feedback.user_name}</div>
                    {feedback.user_email && role === 'super_admin' && (
                      <div className="text-sm text-muted-foreground">{feedback.user_email}</div>
                    )}
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Organization:</span>
                  </div>
                  <p className="text-sm">{feedback.organization_name}</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Role:</span>
                  </div>
                  <Badge variant="outline" className="capitalize">{feedback.user_role}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Admin Response Section - For Super Admins and Org Admins */}
            {(role === 'super_admin' || (role === 'admin' && currentOrganization && feedback.organization_id === currentOrganization.id)) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5" />
                    <span>Admin Panel</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Admin Response</label>
                    <Textarea
                      placeholder="Write your response to the user..."
                      value={adminResponse}
                      onChange={(e) => setAdminResponse(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Status</label>
                      <Select value={newStatus} onValueChange={setNewStatus}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="reviewing">Reviewing</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Priority</label>
                      <Select value={newPriority} onValueChange={setNewPriority}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Internal Notes</label>
                    <Textarea
                      placeholder="Admin-only notes for tracking..."
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      These notes are only visible to administrators
                    </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      onClick={handleSaveResponse} 
                      disabled={saving}
                      className="flex-1"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? 'Saving...' : 'Save Response'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleSendNotification(feedback.user_id)}
                      disabled={saving}
                      className="sm:w-auto"
                    >
                      <Bell className="mr-2 h-4 w-4" />
                      Send Notification
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}