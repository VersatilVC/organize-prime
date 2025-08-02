import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Bug, Lightbulb, TrendingUp, HelpCircle, Eye, MessageSquare, Calendar, Search } from 'lucide-react';

interface FeedbackItem {
  id: string;
  type: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  user_id: string;
  organization_id: string;
  user_name?: string;
  organization_name?: string;
}

interface FeedbackStats {
  total: number;
  pending: number;
  averageResponseTime: number;
  resolvedThisMonth: number;
}

const typeConfig = {
  bug: { label: 'Bug', color: 'bg-red-500 text-white', icon: Bug },
  feature: { label: 'Feature', color: 'bg-blue-500 text-white', icon: Lightbulb },
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

export default function FeedbackManagement() {
  const { role, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [stats, setStats] = useState<FeedbackStats>({ total: 0, pending: 0, averageResponseTime: 0, resolvedThisMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('all');

  const itemsPerPage = 10;

  // Check access control
  useEffect(() => {
    if (!roleLoading && role !== 'super_admin') {
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'You do not have permission to access feedback management.',
      });
      navigate('/');
    }
  }, [role, roleLoading, navigate]);

  // Load feedback and stats
  useEffect(() => {
    if (role === 'super_admin') {
      loadFeedback();
      loadStats();
    }
  }, [role, currentPage, statusFilter, typeFilter, priorityFilter, searchTerm, dateRange]);

  const loadFeedback = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('feedback')
        .select(`
          id,
          type,
          subject,
          description,
          status,
          priority,
          created_at,
          user_id,
          organization_id
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      // Apply filters
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
      }
      if (priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter);
      }
      if (searchTerm) {
        query = query.or(`subject.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      // Apply date range filter
      if (dateRange !== 'all') {
        const daysAgo = dateRange === '7' ? 7 : 30;
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        query = query.gte('created_at', date.toISOString());
      }

      const { data, error, count } = await query;

      if (error) throw error;

      // Enrich data with user and organization names
      const enrichedData = await Promise.all((data || []).map(async (item) => {
        // Get user name
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', item.user_id)
          .single();

        // Get organization name
        const { data: organization } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', item.organization_id)
          .single();

        return {
          ...item,
          user_name: profile?.full_name || 'Unknown User',
          organization_name: organization?.name || 'Unknown Organization',
        };
      }));

      setFeedback(enrichedData);
      setTotalItems(count || 0);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
    } catch (error) {
      console.error('Error loading feedback:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load feedback data.',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Total feedback
      const { count: total } = await supabase
        .from('feedback')
        .select('*', { count: 'exact', head: true });

      // Pending feedback
      const { count: pending } = await supabase
        .from('feedback')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Resolved this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { count: resolvedThisMonth } = await supabase
        .from('feedback')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'resolved')
        .gte('updated_at', startOfMonth.toISOString());

      setStats({
        total: total || 0,
        pending: pending || 0,
        averageResponseTime: 2.5, // Mock value - would need to calculate from actual response times
        resolvedThisMonth: resolvedThisMonth || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleViewFeedback = (feedbackId: string) => {
    // Navigate to feedback detail page (to be implemented)
    toast({
      title: 'Feature Coming Soon',
      description: 'Feedback detail view will be available soon.',
    });
  };

  if (roleLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </AppLayout>
    );
  }

  if (role !== 'super_admin') {
    return null; // Will redirect via useEffect
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Feedback Management</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          <h1 className="text-3xl font-bold">Feedback Management</h1>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Feedback</CardTitle>
              <Calendar className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-700">{stats.pending}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageResponseTime} days</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.resolvedThisMonth}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search feedback..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reviewing">Reviewing</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="feature">Feature</SelectItem>
                  <SelectItem value="improvement">Improvement</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="7">Last 7 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                onClick={() => {
                  setStatusFilter('all');
                  setTypeFilter('all');
                  setPriorityFilter('all');
                  setSearchTerm('');
                  setDateRange('all');
                  setCurrentPage(1);
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Feedback Table */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Feedback Items</CardTitle>
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} feedback items
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : feedback.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No feedback found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || priorityFilter !== 'all' || dateRange !== 'all'
                    ? 'Try adjusting your filters to see more results.'
                    : 'No feedback has been submitted yet.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feedback.map((item) => {
                      const TypeIcon = typeConfig[item.type as keyof typeof typeConfig]?.icon || HelpCircle;
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Badge className={typeConfig[item.type as keyof typeof typeConfig]?.color}>
                              <TypeIcon className="h-3 w-3 mr-1" />
                              {typeConfig[item.type as keyof typeof typeConfig]?.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => handleViewFeedback(item.id)}
                              className="text-left hover:underline font-medium max-w-xs truncate block"
                              title={item.subject}
                            >
                              {item.subject}
                            </button>
                          </TableCell>
                          <TableCell>{item.user_name}</TableCell>
                          <TableCell>{item.organization_name}</TableCell>
                          <TableCell>
                            <Badge className={statusConfig[item.status as keyof typeof statusConfig]?.color}>
                              {statusConfig[item.status as keyof typeof statusConfig]?.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={priorityConfig[item.priority as keyof typeof priorityConfig]?.color}>
                              {priorityConfig[item.priority as keyof typeof priorityConfig]?.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewFeedback(item.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center space-x-2 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    {[...Array(totalPages)].map((_, i) => (
                      <Button
                        key={i + 1}
                        variant={currentPage === i + 1 ? 'default' : 'outline'}
                        onClick={() => setCurrentPage(i + 1)}
                      >
                        {i + 1}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}