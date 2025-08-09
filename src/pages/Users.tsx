import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
import { usePagePerformance } from '@/lib/performance';
import { debounce } from '@/lib/utils';

// Memoized UserRow component to prevent unnecessary re-renders
const UserRow = React.memo(({ 
  user, 
  role, 
  editingUserId, 
  editForm, 
  setEditForm, 
  onEdit, 
  onSaveEdit, 
  onCancelEdit, 
  onDeleteUser,
  updateUserMutation 
}: {
  user: UserWithMembership;
  role: string;
  editingUserId: string | null;
  editForm: { full_name: string; username: string; role: string };
  setEditForm: React.Dispatch<React.SetStateAction<{ full_name: string; username: string; role: string }>>;
  onEdit: (user: UserWithMembership) => void;
  onSaveEdit: (userId: string) => void;
  onCancelEdit: () => void;
  onDeleteUser: (user: UserWithMembership) => void;
  updateUserMutation: any;
}) => {
  const getRoleBadgeVariant = useMemo(() => (userRole: string) => {
    switch (userRole) {
      case 'admin':
        return 'default';
      case 'user':
        return 'secondary';
      default:
        return 'outline';
    }
  }, []);

  const isEditing = editingUserId === user.user_id;

  return (
    <TableRow>
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
            {isEditing ? (
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
        {isEditing ? (
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
        {isEditing ? (
          <div className="flex items-center gap-1">
            <Button 
              size="sm" 
              onClick={() => onSaveEdit(user.user_id)}
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
              onClick={onCancelEdit}
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
              <DropdownMenuItem onClick={() => onEdit(user)}>
                <Icons.edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDeleteUser(user)}
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
  );
}, (prevProps, nextProps) => {
  // Only re-render if user data or editing state changes
  return (
    prevProps.user.user_id === nextProps.user.user_id &&
    prevProps.user.full_name === nextProps.user.full_name &&
    prevProps.user.username === nextProps.user.username &&
    prevProps.user.role === nextProps.user.role &&
    prevProps.user.last_login_at === nextProps.user.last_login_at &&
    prevProps.editingUserId === nextProps.editingUserId &&
    prevProps.updateUserMutation.isPending === nextProps.updateUserMutation.isPending
  );
});

UserRow.displayName = 'UserRow';

// Memoized InvitationRow component
const InvitationRow = React.memo(({ 
  invitation, 
  onResend, 
  onCancel, 
  onCopyLink,
  resendMutation,
  cancelMutation 
}: {
  invitation: Invitation;
  onResend: (invitation: Invitation) => void;
  onCancel: (invitation: Invitation) => void;
  onCopyLink: (invitation: Invitation) => void;
  resendMutation: any;
  cancelMutation: any;
}) => {
  const getInvitationStatus = useCallback((inv: Invitation) => {
    if (inv.accepted_at) return 'Accepted';
    if (new Date(inv.expires_at) < new Date()) return 'Expired';
    return 'Pending';
  }, []);

  const getStatusBadgeVariant = useCallback((status: string) => {
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
  }, []);

  const status = getInvitationStatus(invitation);

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Icons.mail className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium">{invitation.email}</p>
            <p className="text-sm text-muted-foreground">Invited by {invitation.invited_by_name || 'Admin'}</p>
          </div>
        </div>
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
        {new Date(invitation.expires_at).toLocaleDateString()}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Icons.moreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onCopyLink(invitation)}>
              <Icons.copy className="h-4 w-4 mr-2" />
              Copy Link
            </DropdownMenuItem>
            {status === 'Pending' && (
              <DropdownMenuItem 
                onClick={() => onResend(invitation)}
                disabled={resendMutation.isPending}
              >
                <Icons.mail className="h-4 w-4 mr-2" />
                Resend
              </DropdownMenuItem>
            )}
            {(status === 'Pending' || status === 'Expired') && (
              <DropdownMenuItem 
                onClick={() => onCancel(invitation)}
                className="text-destructive focus:text-destructive"
                disabled={cancelMutation.isPending}
              >
                <Icons.trash className="h-4 w-4 mr-2" />
                Cancel
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.invitation.invitation_id === nextProps.invitation.invitation_id &&
    prevProps.invitation.accepted_at === nextProps.invitation.accepted_at &&
    prevProps.resendMutation.isPending === nextProps.resendMutation.isPending &&
    prevProps.cancelMutation.isPending === nextProps.cancelMutation.isPending
  );
});

InvitationRow.displayName = 'InvitationRow';

export default function Users() {
  const { role, loading: roleLoading } = useUserRole();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  
  // Search and pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [invitationsPage, setInvitationsPage] = useState(0);
  const [usersPageSize, setUsersPageSize] = useState(50);
  const [invitationsPageSize, setInvitationsPageSize] = useState(50);
  
  // Performance tracking
  usePagePerformance('Users');
  
  // Debounce search input
  const applyDebouncedSearch = useMemo(() => debounce((v: string) => setDebouncedSearch(v), 300), []);
  useEffect(() => {
    applyDebouncedSearch(searchTerm);
  }, [searchTerm, applyDebouncedSearch]);
  
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
    pageSize: usersPageSize, 
    search: debouncedSearch || undefined 
  });

  const { 
    data: invitationsData, 
    isLoading: invitationsLoading 
  } = useInvitationsQuery({ 
    page: invitationsPage, 
    pageSize: invitationsPageSize 
  });

  // Mutations with optimistic updates
  const updateUserMutation = useUpdateUserMutation();
  const deleteUserMutation = useDeleteUserMutation();
  const resendInvitationMutation = useResendInvitationMutation();
  const cancelInvitationMutation = useCancelInvitationMutation();

  // Memoized data processing
  const { users, totalUsers, invitations, totalInvitations } = useMemo(() => ({
    users: usersData?.users || [],
    totalUsers: usersData?.totalCount || 0,
    invitations: invitationsData?.invitations || [],
    totalInvitations: invitationsData?.totalCount || 0,
  }), [usersData, invitationsData]);

  // Memoized callbacks to prevent unnecessary re-renders
  const handleEditUser = useCallback((user: UserWithMembership) => {
    setEditingUserId(user.user_id);
    setEditForm({
      full_name: user.full_name || '',
      username: user.username || '',
      role: user.role
    });
  }, []);

  const handleSaveEdit = useCallback(async (userId: string) => {
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
  }, [users, editForm, updateUserMutation]);

  const handleCancelEdit = useCallback(() => {
    setEditingUserId(null);
    setEditForm({ full_name: '', username: '', role: 'user' });
  }, []);

  const handleDeleteUser = useCallback(async (user: UserWithMembership) => {
    if (!confirm(`Are you sure you want to delete ${user.full_name || user.username}?`)) {
      return;
    }

    deleteUserMutation.mutate(user.user_id);
  }, [deleteUserMutation]);

  const handleResendInvitation = useCallback((invitation: Invitation) => {
    resendInvitationMutation.mutate(invitation);
  }, [resendInvitationMutation]);

  const handleCancelInvitation = useCallback((invitation: Invitation) => {
    if (!confirm(`Are you sure you want to cancel the invitation for ${invitation.email}?`)) {
      return;
    }

    cancelInvitationMutation.mutate(invitation.invitation_id);
  }, [cancelInvitationMutation]);

  const handleCopyInvitationLink = useCallback(async (invitation: Invitation) => {
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
  }, [toast]);

  // Memoized computed values
  const totalPages = useMemo(() => Math.ceil(totalUsers / usersPageSize), [totalUsers, usersPageSize]);
  const totalInvitationPages = useMemo(() => Math.ceil(totalInvitations / invitationsPageSize), [totalInvitations, invitationsPageSize]);

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

            <div className="flex items-center justify-end gap-2">
              <span className="text-sm text-muted-foreground">Rows per page</span>
              <Select value={String(usersPageSize)} onValueChange={(v) => { setUsersPageSize(parseInt(v, 10)); setCurrentPage(0); }}>
                <SelectTrigger className="w-24 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
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
                          <UserRow
                            key={user.user_id}
                            user={user}
                            role={role}
                            editingUserId={editingUserId}
                            editForm={editForm}
                            setEditForm={setEditForm}
                            onEdit={handleEditUser}
                            onSaveEdit={handleSaveEdit}
                            onCancelEdit={handleCancelEdit}
                            onDeleteUser={handleDeleteUser}
                            updateUserMutation={updateUserMutation}
                          />
                        ))}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between px-6 py-4 border-t">
                        <div className="text-sm text-muted-foreground">
                          Showing {currentPage * usersPageSize + 1} to {Math.min((currentPage + 1) * usersPageSize, totalUsers)} of {totalUsers} users
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
            <div className="flex items-center justify-end gap-2">
              <span className="text-sm text-muted-foreground">Rows per page</span>
              <Select value={String(invitationsPageSize)} onValueChange={(v) => { setInvitationsPageSize(parseInt(v, 10)); setInvitationsPage(0); }}>
                <SelectTrigger className="w-24 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                        {invitations.map((invitation) => (
                          <InvitationRow
                            key={invitation.invitation_id}
                            invitation={invitation}
                            onResend={handleResendInvitation}
                            onCancel={handleCancelInvitation}
                            onCopyLink={handleCopyInvitationLink}
                            resendMutation={resendInvitationMutation}
                            cancelMutation={cancelInvitationMutation}
                          />
                        ))}
                      </TableBody>
                    </Table>

                    {/* Invitations pagination */}
                    {totalInvitationPages > 1 && (
                      <div className="flex items-center justify-between px-6 py-4 border-t">
                        <div className="text-sm text-muted-foreground">
                          Showing {invitationsPage * invitationsPageSize + 1} to {Math.min((invitationsPage + 1) * invitationsPageSize, totalInvitations)} of {totalInvitations} invitations
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