import React, { useState, useEffect } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Icons } from '@/components/ui/icons';
import { useToast } from '@/hooks/use-toast';

interface UserWithMembership {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  last_login_at: string | null;
  email?: string | null;
  role: string;
  status: string;
  joined_at: string | null;
  organization_name?: string | null;
}

export default function Users() {
  const { role, loading: roleLoading } = useUserRole();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    username: '',
    role: 'user'
  });

  useEffect(() => {
    console.log('Users component loaded with role:', role);
    if (role === 'admin' || role === 'super_admin') {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [role, currentOrganization]);

  const fetchUsers = async () => {
    try {
      // Start with getting all profiles, then join with memberships
      let profileQuery = supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, last_login_at');

      console.log('Fetching profiles...');
      const { data: profiles, error: profileError } = await profileQuery;
      console.log('Profiles fetched:', JSON.stringify(profiles, null, 2));
      if (profileError) {
        console.error('Profile fetch error:', profileError);
        throw profileError;
      }

      if (!profiles || profiles.length === 0) {
        setUsers([]);
        return;
      }

      const userIds = profiles.map(p => p.id);

      // Get memberships for these users
      let membershipQuery = supabase
        .from('memberships')
        .select(`
          user_id,
          role,
          status,
          joined_at,
          organization_id
        `)
        .in('user_id', userIds)
        .eq('status', 'active');

      // If company admin, only show users from their organization
      if (role === 'admin' && currentOrganization) {
        membershipQuery = membershipQuery.eq('organization_id', currentOrganization.id);
        
        // For admin, we need to filter profiles to only show users from their org
        const { data: adminMemberships } = await membershipQuery;
        const orgUserIds = adminMemberships?.map(m => m.user_id) || [];
        const filteredProfiles = profiles.filter(p => orgUserIds.includes(p.id));
        
        if (filteredProfiles.length === 0) {
          setUsers([]);
          return;
        }
      }

      const { data: memberships, error: membershipError } = await membershipQuery;
      if (membershipError) throw membershipError;

      // For super admin, get organization names and user emails
      let organizations: any[] = [];
      let userEmailsData: any[] = [];

      if (role === 'super_admin') {
        // Get organization names
        if (memberships && memberships.length > 0) {
          const orgIds = [...new Set(memberships.map(m => m.organization_id))];
          const { data: orgsData } = await supabase
            .from('organizations')
            .select('id, name')
            .in('id', orgIds);
          
          organizations = orgsData || [];
        }

        // Get user emails using the secure function
        const { data: emailsData } = await supabase
          .rpc('get_user_emails_for_super_admin', { user_ids: userIds });
        
        userEmailsData = emailsData || [];
      }

      // Combine the data - show all profiles, with membership info if available
      const usersData = profiles.map((profile) => {
        const membership = memberships?.find(m => m.user_id === profile.id);
        const organization = organizations.find(org => org.id === membership?.organization_id);
        const emailData = userEmailsData.find(e => e.user_id === profile.id);
        
        return {
          id: profile.id,
          full_name: profile.full_name || null,
          username: profile.username || null,
          avatar_url: profile.avatar_url || null,
          last_login_at: profile.last_login_at || null,
          email: emailData?.email || null,
          role: membership?.role || 'user',
          status: membership?.status || 'inactive',
          joined_at: membership?.joined_at || null,
          organization_name: organization?.name || null,
        };
      });

      // Filter for admin users to only show their org users
      if (role === 'admin' && currentOrganization) {
        const filteredUsers = usersData.filter(user => user.organization_name === currentOrganization.name || !user.organization_name);
        setUsers(filteredUsers);
      } else {
        setUsers(usersData);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: UserWithMembership) => {
    setEditingUserId(user.id);
    setEditForm({
      full_name: user.full_name || '',
      username: user.username || '',
      role: user.role
    });
  };

  const handleSaveEdit = async (userId: string) => {
    console.log('Starting save edit for user:', userId, 'with form data:', editForm);
    
    try {
      // Update profile information
      console.log('Updating profile...');
      const updateResult = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          username: editForm.username
        })
        .eq('id', userId)
        .select(); // Add select to see what was actually updated

      console.log('Update result:', updateResult);
      
      if (updateResult.error) {
        console.error('Profile update error:', updateResult.error);
        throw updateResult.error;
      }
      
      console.log('Profile updated successfully, updated data:', updateResult.data);
      
      // Verify the update worked by fetching the specific user
      const { data: verifyUpdate, error: verifyError } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .eq('id', userId)
        .single();
      
      console.log('Verification fetch:', verifyUpdate);
      if (verifyError) {
        console.error('Verification error:', verifyError);
      }

      // Update membership role if changed
      const currentUser = users.find(u => u.id === userId);
      console.log('Current user found:', currentUser);
      
      if (currentUser && editForm.role !== currentUser.role) {
        console.log('Updating membership role from', currentUser.role, 'to', editForm.role);
        
        // Find the active membership for this user
        const { data: memberships, error: membershipFindError } = await supabase
          .from('memberships')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'active');

        if (membershipFindError) {
          console.error('Error finding membership:', membershipFindError);
          throw membershipFindError;
        }

        console.log('Found memberships:', memberships);

        if (memberships && memberships.length > 0) {
          // Update the first active membership (there should only be one per org)
          const membershipToUpdate = memberships[0];
          console.log('Updating membership:', membershipToUpdate.id);
          
          const { error: membershipError } = await supabase
            .from('memberships')
            .update({ role: editForm.role })
            .eq('id', membershipToUpdate.id);

          if (membershipError) {
            console.error('Membership update error:', membershipError);
            throw membershipError;
          }
          console.log('Membership role updated successfully');
        } else {
          console.warn('No active membership found for user');
        }
      }

      toast({
        title: "User Updated",
        description: `User has been updated successfully.`,
      });

      setEditingUserId(null);
      console.log('Refreshing user list...');
      await fetchUsers(); // Wait for the refresh to complete
      console.log('User list refreshed');
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditForm({ full_name: '', username: '', role: 'user' });
  };

  const handleDeleteUser = async (user: UserWithMembership) => {
    if (!confirm(`Are you sure you want to delete ${user.full_name || user.username}?`)) {
      return;
    }

    try {
      // For super admin, they can delete any user's membership
      // For org admin, they can only delete users from their organization
      if (role === 'super_admin' || (role === 'admin' && currentOrganization)) {
        const { error } = await supabase
          .from('memberships')
          .update({ status: 'inactive' })
          .eq('user_id', user.id);

        if (error) throw error;

        toast({
          title: "User Removed",
          description: `${user.full_name || user.username} has been removed from the organization.`,
        });

        // Refresh the user list
        fetchUsers();
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to remove user",
        variant: "destructive",
      });
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
          <Button>
            <Icons.plus className="h-4 w-4 mr-2" />
            Invite User
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading users...</p>
              </div>
            ) : (
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
                    <TableRow key={user.id}>
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
                            {editingUserId === user.id ? (
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
                        {editingUserId === user.id ? (
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
                        {editingUserId === user.id ? (
                          <div className="flex items-center gap-1">
                            <Button size="sm" onClick={() => {
                              console.log('Save button clicked!', user.id);
                              handleSaveEdit(user.id);
                            }}>
                              ✓
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEdit}>
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
            )}
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}