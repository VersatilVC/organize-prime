import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Bug, Lightbulb, TrendingUp, HelpCircle, Eye, MessageSquare, Calendar, Search, MoreHorizontal, Edit, Check, X, Trash2, User, Building } from 'lucide-react';

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
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Partial<FeedbackItem>>({});
  const [viewingItem, setViewingItem] = useState<FeedbackItem | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  
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

  const handleViewFeedback = (item: FeedbackItem) => {
    setViewingItem(item);
    setIsViewDialogOpen(true);
  };

  const handleEditStart = (item: FeedbackItem) => {
    setEditingItem(item.id);
    setEditingData({
      subject: item.subject,
      status: item.status,
      priority: item.priority,
    });
  };

  const handleEditCancel = () => {
    setEditingItem(null);
    setEditingData({});
  };

  const handleEditSave = async () => {
    if (!editingItem) return;

    try {
      const { error } = await supabase
        .from('feedback')
        .update({
          subject: editingData.subject,
          status: editingData.status,
          priority: editingData.priority,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingItem);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Feedback updated successfully.',
      });

      setEditingItem(null);
      setEditingData({});
      loadFeedback();
    } catch (error) {
      console.error('Error updating feedback:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update feedback.',
      });
    }
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    try {
      const { error } = await supabase
        .from('feedback')
        .delete()
        .eq('id', feedbackId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Feedback deleted successfully.',
      });

      loadFeedback();
    } catch (error) {
      console.error('Error deleting feedback:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete feedback.',
      });
    }
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
                      const isEditing = editingItem === item.id;
                      
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Badge className={typeConfig[item.type as keyof typeof typeConfig]?.color}>
                              <TypeIcon className="h-3 w-3 mr-1" />
                              {typeConfig[item.type as keyof typeof typeConfig]?.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <Input
                                value={editingData.subject || ''}
                                onChange={(e) => setEditingData(prev => ({ ...prev, subject: e.target.value }))}
                                className="max-w-xs"
                              />
                            ) : (
                              <button
                                onClick={() => navigate(`/feedback/${item.id}`)}
                                className="text-left hover:underline font-medium max-w-xs truncate block"
                                title={item.subject}
                              >
                                {item.subject}
                              </button>
                            )}
                          </TableCell>
                          <TableCell>{item.user_name}</TableCell>
                          <TableCell>{item.organization_name}</TableCell>
                          <TableCell>
                            {isEditing ? (
                              <Select
                                value={editingData.status || item.status}
                                onValueChange={(value) => setEditingData(prev => ({ ...prev, status: value }))}
                              >
                                <SelectTrigger className="w-32">
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
                            ) : (
                              <Badge className={statusConfig[item.status as keyof typeof statusConfig]?.color}>
                                {statusConfig[item.status as keyof typeof statusConfig]?.label}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <Select
                                value={editingData.priority || item.priority}
                                onValueChange={(value) => setEditingData(prev => ({ ...prev, priority: value }))}
                              >
                                <SelectTrigger className="w-28">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                  <SelectItem value="critical">Critical</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge className={priorityConfig[item.priority as keyof typeof priorityConfig]?.color}>
                                {priorityConfig[item.priority as keyof typeof priorityConfig]?.label}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleEditSave}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleEditCancel}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => navigate(`/feedback/${item.id}`)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEditStart(item)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This action cannot be undone. This will permanently delete the feedback item.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDeleteFeedback(item.id)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
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

        {/* Feedback Detail Modal */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>Feedback Details</span>
              </DialogTitle>
              <DialogDescription>
                View detailed information about this feedback submission
              </DialogDescription>
            </DialogHeader>
            
            {viewingItem && (
              <div className="space-y-6">
                {/* Header Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Badge className={typeConfig[viewingItem.type as keyof typeof typeConfig]?.color}>
                        {React.createElement(typeConfig[viewingItem.type as keyof typeof typeConfig]?.icon || HelpCircle, { className: "h-3 w-3 mr-1" })}
                        {typeConfig[viewingItem.type as keyof typeof typeConfig]?.label}
                      </Badge>
                      <Badge className={priorityConfig[viewingItem.priority as keyof typeof priorityConfig]?.color}>
                        {priorityConfig[viewingItem.priority as keyof typeof priorityConfig]?.label}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Created {formatDistanceToNow(new Date(viewingItem.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Badge className={statusConfig[viewingItem.status as keyof typeof statusConfig]?.color}>
                        {statusConfig[viewingItem.status as keyof typeof statusConfig]?.label}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>{viewingItem.user_name}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Building className="h-4 w-4" />
                      <span>{viewingItem.organization_name}</span>
                    </div>
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Subject</h3>
                  <p className="text-sm text-muted-foreground p-3 bg-muted/20 rounded-md">
                    {viewingItem.subject}
                  </p>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Description</h3>
                  <div className="p-4 bg-muted/20 rounded-md">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {viewingItem.description}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                    Close
                  </Button>
                  <Button 
                    onClick={() => {
                      setIsViewDialogOpen(false);
                      handleEditStart(viewingItem);
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Feedback
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}