import React, { useState } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { useOrganization } from '@/contexts/OrganizationContext';
import { 
  useUsersQuery, 
  useUpdateUserMutation, 
  useDeleteUserMutation, 
  UserWithMembership 
} from '@/hooks/useUsersQuery';
import { 
  useInvitationsQuery, 
  useResendInvitationMutation, 
  useCancelInvitationMutation, 
  Invitation 
} from '@/hooks/useInvitationsQuery';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InviteUserDialog } from '@/components/InviteUserDialog';
import { Icons } from '@/components/ui/icons';
import { useToast } from '@/hooks/use-toast';

export default function Users() {
  const { role, loading: roleLoading } = useUserRole();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  
  // Search and pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [invitationsPage, setInvitationsPage] = useState(0);
  const pageSize = 50;
  
  // UI state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    username: '',
    role: 'user'
  });

  // Optimized queries
  const { 
    data: usersData, 
    isLoading: usersLoading, 
    error: usersError 
  } = useUsersQuery({ 
    page: currentPage, 
    pageSize, 
    search: searchTerm || undefined 
  });

  const { 
    data: invitationsData, 
    isLoading: invitationsLoading 
  } = useInvitationsQuery({ 
    page: invitationsPage, 
    pageSize 
  });

  // Mutations with optimistic updates
  const updateUserMutation = useUpdateUserMutation();
  const deleteUserMutation = useDeleteUserMutation();
  const resendInvitationMutation = useResendInvitationMutation();
  const cancelInvitationMutation = useCancelInvitationMutation();

  const users = usersData?.users || [];
  const totalUsers = usersData?.totalCount || 0;
  const invitations = invitationsData?.invitations || [];
  const totalInvitations = invitationsData?.totalCount || 0;

  const totalPages = Math.ceil(totalUsers / pageSize);
  const totalInvitationPages = Math.ceil(totalInvitations / pageSize);

  const handleEditUser = (user: UserWithMembership) => {
    setEditingUserId(user.user_id);
    setEditForm({
      full_name: user.full_name || '',
      username: user.username || '',
      role: user.role
    });
  };

  const handleSaveEdit = async (userId: string) => {
    const currentUser = users.find(u => u.user_id === userId);
    if (!currentUser) return;

    const updates: { full_name?: string; username?: string; role?: string } = {};
    
    if (editForm.full_name !== currentUser.full_name) {
      updates.full_name = editForm.full_name;
    }
    if (editForm.username !== currentUser.username) {
      updates.username = editForm.username;
    }
    if (editForm.role !== currentUser.role) {
      updates.role = editForm.role;
    }

    updateUserMutation.mutate(
      { userId, updates },
      {
        onSuccess: () => {
          setEditingUserId(null);
        }
      }
    );
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditForm({ full_name: '', username: '', role: 'user' });
  };

  const handleDeleteUser = async (user: UserWithMembership) => {
    if (!confirm(`Are you sure you want to delete ${user.full_name || user.username}?`)) {
      return;
    }

    deleteUserMutation.mutate(user.user_id);
  };

  const handleResendInvitation = (invitation: Invitation) => {
    resendInvitationMutation.mutate(invitation);
  };

  const handleCancelInvitation = (invitation: Invitation) => {
    if (!confirm(`Are you sure you want to cancel the invitation for ${invitation.email}?`)) {
      return;
    }

    cancelInvitationMutation.mutate(invitation.invitation_id);
  };

  const handleCopyInvitationLink = async (invitation: Invitation) => {
    const currentOrigin = window.location.origin;
    const inviteLink = `${currentOrigin}/invite/${invitation.token}`;
    
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast({
        title: "Copied",
        description: "Invitation link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const getInvitationStatus = (invitation: Invitation) => {
    if (invitation.accepted_at) return 'Accepted';
    if (new Date(invitation.expires_at) < new Date()) return 'Expired';
    return 'Pending';
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Accepted':
        return 'default';
      case 'Expired':
        return 'destructive';
      case 'Pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRoleBadgeVariant = (userRole: string) => {
    switch (userRole) {
      case 'admin':
        return 'default';
      case 'user':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (roleLoading) {
    return (
      <AppLayout>
        <div className="flex-1 p-6">
          <div className="space-y-4 w-full max-w-md">
            <div className="h-8 w-full animate-pulse rounded-md bg-muted" />
            <div className="h-8 w-3/4 animate-pulse rounded-md bg-muted" />
            <div className="h-8 w-1/2 animate-pulse rounded-md bg-muted" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (role !== 'admin' && role !== 'super_admin') {
    return (
      <AppLayout>
        <div className="flex-1 p-6">
          <Card>
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>
                You need admin privileges to view this page.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Users</h1>
            <p className="text-muted-foreground">
              {role === 'super_admin' 
                ? 'Manage all users in the system'
                : `Manage users in ${currentOrganization?.name || 'your organization'}`
              }
            </p>
          </div>
          <Button onClick={() => setInviteDialogOpen(true)}>
            <Icons.plus className="h-4 w-4 mr-2" />
            Invite User
          </Button>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList>
            <TabsTrigger value="users">Users ({totalUsers})</TabsTrigger>
            <TabsTrigger value="invitations">Invitations ({totalInvitations})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="users" className="space-y-4">
            {/* Search and filters */}
            <div className="flex items-center gap-4">
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(0); // Reset to first page on search
                }}
                className="max-w-sm"
              />
              {searchTerm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setCurrentPage(0);
                  }}
                >
                  Clear
                </Button>
              )}
            </div>

            <Card>
              <CardContent className="p-0">
                {usersLoading ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Loading users...</p>
                  </div>
                ) : usersError ? (
                  <div className="p-6 text-center">
                    <p className="text-destructive">Failed to load users</p>
                  </div>
                ) : users.length === 0 ? (
                  <div className="p-6 text-center">
                    <Icons.users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No users found</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {searchTerm ? 'No users match your search criteria.' : 'Start by inviting users to join your organization.'}
                    </p>
                    {!searchTerm && (
                      <Button onClick={() => setInviteDialogOpen(true)}>
                        <Icons.plus className="h-4 w-4 mr-2" />
                        Invite First User
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          {role === 'super_admin' && <TableHead>Email</TableHead>}
                          {role === 'super_admin' && <TableHead>Organization</TableHead>}
                          <TableHead>Role</TableHead>
                          <TableHead>Last Active</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.user_id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  {user.avatar_url ? (
                                    <img 
                                      src={user.avatar_url} 
                                      alt={user.full_name || user.username || 'User'} 
                                      className="h-8 w-8 rounded-full"
                                    />
                                  ) : (
                                    <Icons.user className="h-4 w-4" />
                                  )}
                                </div>
                                <div>
                                  {editingUserId === user.user_id ? (
                                    <div className="space-y-1">
                                      <Input
                                        value={editForm.full_name}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                                        placeholder="Full name"
                                        className="h-8 text-sm"
                                      />
                                      <Input
                                        value={editForm.username}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                                        placeholder="Username"
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                  ) : (
                                    <>
                                      <p className="font-medium">{user.full_name || user.username}</p>
                                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                                    </>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            {role === 'super_admin' && (
                              <TableCell>
                                <span className="text-sm">{user.email || 'N/A'}</span>
                              </TableCell>
                            )}
                            {role === 'super_admin' && (
                              <TableCell>
                                <span className="text-sm">{user.organization_name || 'N/A'}</span>
                              </TableCell>
                            )}
                            <TableCell>
                              {editingUserId === user.user_id ? (
                                <Select
                                  value={editForm.role}
                                  onValueChange={(value) => setEditForm(prev => ({ ...prev, role: value }))}
                                >
                                  <SelectTrigger className="w-24 h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge variant={getRoleBadgeVariant(user.role)}>
                                  {user.role === 'admin' ? 'Admin' : 'User'}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {user.last_login_at 
                                ? new Date(user.last_login_at).toLocaleDateString()
                                : 'Never'
                              }
                            </TableCell>
                            <TableCell>
                              {user.joined_at
                                ? new Date(user.joined_at).toLocaleDateString()
                                : '-'
                              }
                            </TableCell>
                            <TableCell>
                              {editingUserId === user.user_id ? (
                                <div className="flex items-center gap-1">
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleSaveEdit(user.user_id)}
                                    disabled={updateUserMutation.isPending}
                                  >
                                    {updateUserMutation.isPending ? (
                                      <Icons.loader className="h-3 w-3 animate-spin" />
                                    ) : (
                                      '✓'
                                    )}
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={handleCancelEdit}
                                    disabled={updateUserMutation.isPending}
                                  >
                                    ✕
                                  </Button>
                                </div>
                              ) : (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <Icons.moreVertical className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                      <Icons.edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleDeleteUser(user)}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Icons.trash className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between px-6 py-4 border-t">
                        <div className="text-sm text-muted-foreground">
                          Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, totalUsers)} of {totalUsers} users
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                            disabled={currentPage === 0}
                          >
                            <Icons.chevronLeft className="h-4 w-4" />
                            Previous
                          </Button>
                          <span className="text-sm">
                            Page {currentPage + 1} of {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={currentPage >= totalPages - 1}
                          >
                            Next
                            <Icons.chevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invitations" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                {invitationsLoading ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Loading invitations...</p>
                  </div>
                ) : invitations.length === 0 ? (
                  <div className="p-6 text-center">
                    <Icons.mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No invitations sent</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Start by inviting users to join your organization.
                    </p>
                    <Button onClick={() => setInviteDialogOpen(true)}>
                      <Icons.plus className="h-4 w-4 mr-2" />
                      Send First Invitation
                    </Button>
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Sent Date</TableHead>
                          <TableHead>Invited By</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invitations.map((invitation) => {
                          const status = getInvitationStatus(invitation);
                          return (
                            <TableRow key={invitation.invitation_id}>
                              <TableCell className="font-medium">{invitation.email}</TableCell>
                              <TableCell>
                                <Badge variant={getRoleBadgeVariant(invitation.role)}>
                                  {invitation.role === 'admin' ? 'Admin' : 'User'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={getStatusBadgeVariant(status)}>
                                  {status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {new Date(invitation.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <span className="text-sm">{invitation.invited_by_name}</span>
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <Icons.moreVertical className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {status === 'Pending' && (
                                      <>
                                        <DropdownMenuItem onClick={() => handleResendInvitation(invitation)}>
                                          <Icons.mail className="h-4 w-4 mr-2" />
                                          Resend
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleCopyInvitationLink(invitation)}>
                                          <Icons.copy className="h-4 w-4 mr-2" />
                                          Copy Link
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    <DropdownMenuItem 
                                      onClick={() => handleCancelInvitation(invitation)}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Icons.trash className="h-4 w-4 mr-2" />
                                      {status === 'Pending' ? 'Cancel' : 'Delete'}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>

                    {/* Invitations pagination */}
                    {totalInvitationPages > 1 && (
                      <div className="flex items-center justify-between px-6 py-4 border-t">
                        <div className="text-sm text-muted-foreground">
                          Showing {invitationsPage * pageSize + 1} to {Math.min((invitationsPage + 1) * pageSize, totalInvitations)} of {totalInvitations} invitations
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setInvitationsPage(p => Math.max(0, p - 1))}
                            disabled={invitationsPage === 0}
                          >
                            <Icons.chevronLeft className="h-4 w-4" />
                            Previous
                          </Button>
                          <span className="text-sm">
                            Page {invitationsPage + 1} of {totalInvitationPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setInvitationsPage(p => Math.min(totalInvitationPages - 1, p + 1))}
                            disabled={invitationsPage >= totalInvitationPages - 1}
                          >
                            Next
                            <Icons.chevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <InviteUserDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          onInviteSent={() => {
            // React Query will automatically refresh the data
            setInviteDialogOpen(false);
          }}
        />
      </div>
    </AppLayout>
  );
}