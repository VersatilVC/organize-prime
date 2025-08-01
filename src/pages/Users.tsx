import React, { useState, useEffect } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Icons } from '@/components/ui/icons';
import { useToast } from '@/hooks/use-toast';

interface UserWithMembership {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  last_login_at: string | null;
  role: string;
  status: string;
  joined_at: string | null;
  department: string | null;
  position: string | null;
}

export default function Users() {
  const { role } = useUserRole();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithMembership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role === 'admin' || role === 'super_admin') {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [role, currentOrganization]);

  const fetchUsers = async () => {
    try {
      let query = supabase
        .from('memberships')
        .select(`
          user_id,
          role,
          status,
          joined_at,
          department,
          position,
          profiles!memberships_user_id_fkey (
            id,
            full_name,
            username,
            avatar_url,
            last_login_at
          )
        `)
        .eq('status', 'active')

      // If company admin, only show users from their organization
      if (role === 'admin' && currentOrganization) {
        query = query.eq('organization_id', currentOrganization.id);
      }

      const { data: memberships, error } = await query;

      if (error) throw error;

      const usersData = memberships?.map((membership: any) => ({
        id: membership.profiles?.id || membership.user_id,
        full_name: membership.profiles?.full_name,
        username: membership.profiles?.username,
        avatar_url: membership.profiles?.avatar_url,
        last_login_at: membership.profiles?.last_login_at,
        role: membership.role,
        status: membership.status,
        joined_at: membership.joined_at,
        department: membership.department,
        position: membership.position,
      })) || [];

      setUsers(usersData);
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
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Position</TableHead>
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
                            <p className="font-medium">{user.full_name || user.username}</p>
                            <p className="text-sm text-muted-foreground">@{user.username}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role === 'admin' ? 'Admin' : 'User'}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.department || '-'}</TableCell>
                      <TableCell>{user.position || '-'}</TableCell>
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
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                          <Button variant="outline" size="sm">
                            <Icons.moreVertical className="h-3 w-3" />
                          </Button>
                        </div>
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