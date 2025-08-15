import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Icons } from '@/components/ui/icons';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/auth/AuthProvider';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Feedback {
  id: string;
  type: string;
  subject: string;
  status: 'pending' | 'reviewing' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  responded_at: string | null;
  admin_response: string | null;
}

export default function MyFeedback() {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchFeedback = async () => {
      try {
        const { data, error } = await supabase
          .from('feedback')
          .select('id, type, subject, status, priority, created_at, responded_at, admin_response')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setFeedback(data as Feedback[] || []);
      } catch (error) {
        console.error('Error fetching feedback:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load your feedback history.',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchFeedback();
  }, [user]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug':
        return Icons.alertCircle;
      case 'feature':
        return Icons.plus;
      case 'improvement':
        return Icons.barChart;
      default:
        return Icons.helpCircle;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'bug':
        return 'destructive';
      case 'feature':
        return 'default';
      case 'improvement':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'outline';
      case 'reviewing':
        return 'secondary';
      case 'in_progress':
        return 'default';
      case 'resolved':
        return 'default';
      case 'closed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <>
        <div className="container mx-auto p-4 sm:p-6 space-y-6">
          <div className="space-y-4">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>My Feedback</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            
            <h1 className="text-3xl font-bold">My Feedback</h1>
          </div>

          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-64" />
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-5 w-18" />
                      </div>
                    </div>
                    <Skeleton className="h-9 w-24" />
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>My Feedback</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">My Feedback</h1>
            <Button asChild>
              <Link to="/feedback">
                <Icons.plus className="h-4 w-4 mr-2" />
                Submit New Feedback
              </Link>
            </Button>
          </div>
        </div>

        {feedback.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Icons.messageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No feedback submitted yet</h3>
              <p className="text-muted-foreground mb-6">
                Start by submitting your first feedback to help us improve.
              </p>
              <Button asChild>
                <Link to="/feedback">
                  <Icons.plus className="h-4 w-4 mr-2" />
                  Submit Feedback
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {feedback.map((item) => {
              const TypeIcon = getTypeIcon(item.type);
              
              return (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <TypeIcon className="h-5 w-5 text-muted-foreground" />
                          <h3 className="font-semibold text-lg">{item.subject}</h3>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mb-2">
                          <Badge variant={getTypeColor(item.type) as any}>
                            {item.type}
                          </Badge>
                          <Badge variant={getStatusColor(item.status) as any}>
                            {item.status.replace('_', ' ')}
                          </Badge>
                          <Badge variant={getPriorityColor(item.priority) as any}>
                            {item.priority} priority
                          </Badge>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Icons.calendar className="h-4 w-4" />
                            Submitted {format(new Date(item.created_at), 'MMM d, yyyy')}
                          </div>
                          {item.responded_at && (
                            <div className="flex items-center gap-1">
                              <Icons.mail className="h-4 w-4" />
                              Response received
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <Button asChild variant="outline" size="sm" className="shrink-0">
                        <Link to={`/feedback/${item.id}`}>
                          <Icons.eye className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">View Details</span>
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>
                  
                  {item.admin_response && (
                    <CardContent>
                      <div className="bg-muted/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Icons.user className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Admin Response</span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {item.admin_response}
                        </p>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}