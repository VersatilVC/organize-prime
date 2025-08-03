import React, { useState, useEffect } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Icons } from '@/components/ui/icons';
import { useToast } from '@/hooks/use-toast';
import { InviteUserDialog } from '@/components/InviteUserDialog';

interface Organization {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  admin_count?: number;
  user_count?: number;
}

export default function Organizations() {
  const { role, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', slug: '' });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', slug: '' });
  const [creating, setCreating] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedOrgForInvite, setSelectedOrgForInvite] = useState<Organization | null>(null);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const { data: orgs, error } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          slug,
          is_active,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get membership counts for each organization
      const orgsWithCounts = await Promise.all(
        (orgs || []).map(async (org) => {
          const { data: memberships } = await supabase
            .from('memberships')
            .select('role')
            .eq('organization_id', org.id)
            .eq('status', 'active');

          const adminCount = memberships?.filter(m => m.role === 'admin').length || 0;
          const userCount = memberships?.length || 0;

          return {
            ...org,
            admin_count: adminCount,
            user_count: userCount,
          };
        })
      );

      setOrganizations(orgsWithCounts);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast({
        title: "Error",
        description: "Failed to load organizations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleOrganizationStatus = async (orgId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ is_active: !isActive })
        .eq('id', orgId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Organization ${!isActive ? 'activated' : 'deactivated'}`,
      });

      fetchOrganizations();
    } catch (error) {
      console.error('Error updating organization:', error);
      toast({
        title: "Error",
        description: "Failed to update organization",
        variant: "destructive",
      });
    }
  };

  const handleEditOrganization = (org: Organization) => {
    setEditingOrgId(org.id);
    setEditForm({ name: org.name, slug: org.slug });
  };

  const handleSaveEdit = async (orgId: string) => {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: editForm.name.trim(),
          slug: editForm.slug.trim(),
        })
        .eq('id', orgId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Organization updated successfully",
      });

      setEditingOrgId(null);
      setEditForm({ name: '', slug: '' });
      fetchOrganizations();
    } catch (error) {
      console.error('Error updating organization:', error);
      toast({
        title: "Error",
        description: "Failed to update organization",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingOrgId(null);
    setEditForm({ name: '', slug: '' });
  };

  const handleCreateOrganization = async () => {
    if (!createForm.name.trim() || !createForm.slug.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .insert({
          name: createForm.name.trim(),
          slug: createForm.slug.trim(),
          is_active: true,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Organization created successfully",
      });

      setShowCreateDialog(false);
      setCreateForm({ name: '', slug: '' });
      fetchOrganizations();
    } catch (error) {
      console.error('Error creating organization:', error);
      toast({
        title: "Error",
        description: "Failed to create organization",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (name: string) => {
    setCreateForm(prev => ({
      ...prev,
      name,
      slug: generateSlug(name)
    }));
  };

  const handleInviteUser = (org: Organization) => {
    setSelectedOrgForInvite(org);
    setInviteDialogOpen(true);
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

  if (role !== 'super_admin') {
    return (
      <AppLayout>
        <div className="flex-1 p-6">
          <Card>
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>
                You need super admin privileges to view this page.
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
            <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
            <p className="text-muted-foreground">
              Manage all organizations in the system
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Icons.plus className="h-4 w-4 mr-2" />
            Create Organization
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading organizations...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Admins</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium">
                        {editingOrgId === org.id ? (
                          <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            className="h-8 text-sm font-medium"
                          />
                        ) : (
                          org.name
                        )}
                      </TableCell>
                      <TableCell>
                        {editingOrgId === org.id ? (
                          <Input
                            value={editForm.slug}
                            onChange={(e) => setEditForm(prev => ({ ...prev, slug: e.target.value }))}
                            className="h-8 text-sm"
                          />
                        ) : (
                          org.slug
                        )}
                      </TableCell>
                      <TableCell>{org.admin_count}</TableCell>
                      <TableCell>{org.user_count}</TableCell>
                      <TableCell>
                        <Badge variant={org.is_active ? "default" : "secondary"}>
                          {org.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(org.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {editingOrgId === org.id ? (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              onClick={() => handleSaveEdit(org.id)}
                            >
                              ✓
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelEdit}
                            >
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Icons.moreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                               <DropdownMenuItem 
                                 onClick={() => handleEditOrganization(org)}
                               >
                                 <Icons.edit className="h-4 w-4 mr-2" />
                                 Edit
                               </DropdownMenuItem>
                               <DropdownMenuItem 
                                 onClick={() => handleInviteUser(org)}
                               >
                                 <Icons.mail className="h-4 w-4 mr-2" />
                                 Invite User
                               </DropdownMenuItem>
                               <DropdownMenuItem 
                                 onClick={() => toggleOrganizationStatus(org.id, org.is_active)}
                               >
                                 {org.is_active ? (
                                   <>
                                     <Icons.pause className="h-4 w-4 mr-2" />
                                     Deactivate
                                   </>
                                 ) : (
                                   <>
                                     <Icons.play className="h-4 w-4 mr-2" />
                                     Activate
                                   </>
                                 )}
                               </DropdownMenuItem>
                               <DropdownMenuItem>
                                 <Icons.externalLink className="h-4 w-4 mr-2" />
                                 View Details
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

        {/* Create Organization Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Organization</DialogTitle>
              <DialogDescription>
                Add a new organization to the system. The domain will be auto-generated from the name.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  placeholder="Enter organization name"
                  value={createForm.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-slug">Domain/Slug</Label>
                <Input
                  id="org-slug"
                  placeholder="organization-domain"
                  value={createForm.slug}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, slug: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  setCreateForm({ name: '', slug: '' });
                }}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateOrganization}
                disabled={creating}
              >
                {creating ? (
                  <>
                    <Icons.loader className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Organization'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Invite User Dialog */}
        {selectedOrgForInvite && (
          <InviteUserDialog
            open={inviteDialogOpen}
            onOpenChange={(open) => {
              setInviteDialogOpen(open);
              if (!open) setSelectedOrgForInvite(null);
            }}
            organizationOverride={selectedOrgForInvite}
            onInviteSent={() => {
              // Optional: Refresh org data if needed
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}