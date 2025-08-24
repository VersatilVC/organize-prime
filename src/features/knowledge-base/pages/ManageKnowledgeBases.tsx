import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useStableLoading } from '@/hooks/useLoadingState';
import { knowledgeBaseApi, KnowledgeBase } from '../services/knowledgeBaseApi';
import { CreateKnowledgeBaseModal } from '../components/CreateKnowledgeBaseModal';
import { EditKnowledgeBaseModal } from '../components/EditKnowledgeBaseModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Search, MoreHorizontal, Pencil, Trash2, Database } from 'lucide-react';
import { format } from 'date-fns';

export default function ManageKnowledgeBases() {
  const { currentOrganization } = useOrganization();
  const { role, loading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKB, setSelectedKB] = useState<KnowledgeBase | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const {
    data: knowledgeBases = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['knowledge-bases', currentOrganization?.id],
    queryFn: () => knowledgeBaseApi.getKnowledgeBases(currentOrganization!.id),
    enabled: !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Check if user has admin access
  const canManageKB = (role === 'super_admin' || role === 'admin');

  // Use stable loading to prevent access denied flash during role loading
  const isCurrentlyLoading = roleLoading || isLoading;
  const stableLoading = useStableLoading(isCurrentlyLoading, 600);

  // Debug logging to track the access check timing
  if (import.meta.env.DEV) {
    console.log(`🔍 ManageKnowledgeBases - Access Check:`, {
      role,
      roleLoading,
      isLoading,
      stableLoading,
      canManageKB,
      currentOrganization: currentOrganization?.id,
      timestamp: new Date().toISOString()
    });
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => knowledgeBaseApi.deleteKnowledgeBase(id),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Knowledge base deleted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['knowledge-bases'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete knowledge base',
        variant: 'destructive',
      });
    },
  });

  // Filter knowledge bases based on search query
  const filteredKnowledgeBases = React.useMemo(() => {
    if (!searchQuery.trim()) return knowledgeBases;
    
    const query = searchQuery.toLowerCase();
    return knowledgeBases.filter((kb) =>
      kb.display_name.toLowerCase().includes(query) ||
      kb.name.toLowerCase().includes(query) ||
      (kb.description && kb.description.toLowerCase().includes(query))
    );
  }, [knowledgeBases, searchQuery]);

  const handleDelete = (kb: KnowledgeBase) => {
    if (window.confirm(`Are you sure you want to delete "${kb.display_name}"?`)) {
      deleteMutation.mutate(kb.id);
    }
  };

  const handleEdit = (kb: KnowledgeBase) => {
    setSelectedKB(kb);
    setShowEditModal(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Show stable loading to prevent access denied flash during role loading
  if (stableLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading permissions...</p>
        </div>
      </div>
    );
  }

  if (!canManageKB) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You need administrator privileges to manage knowledge bases.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>
            Failed to load knowledge bases. Please try again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => refetch()} variant="outline">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Manage Knowledge Bases</h1>
          <p className="text-muted-foreground">
            Create and manage vector databases for your organization
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Knowledge Base
        </Button>
      </div>

      {/* Search and Stats */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search knowledge bases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Database className="h-4 w-4" />
          {knowledgeBases.length} total knowledge bases
        </div>
      </div>

      {/* Knowledge Bases Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading knowledge bases...</span>
            </div>
          ) : filteredKnowledgeBases.length === 0 ? (
            <div className="text-center py-8">
              <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {knowledgeBases.length === 0 ? 'No knowledge bases' : 'No matching knowledge bases'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {knowledgeBases.length === 0 
                  ? 'Get started by creating your first knowledge base.'
                  : 'Try adjusting your search query.'
                }
              </p>
              {knowledgeBases.length === 0 && (
                <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Knowledge Base
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Files</TableHead>
                  <TableHead>Vectors</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[50px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredKnowledgeBases.map((kb) => (
                  <TableRow key={kb.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{kb.display_name}</div>
                        <div className="text-xs text-muted-foreground">{kb.name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate">
                        {kb.description || 'No description'}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(kb.status)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{kb.file_count}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{kb.total_vectors.toLocaleString()}</Badge>
                    </TableCell>
                    <TableCell>
                      <time dateTime={kb.created_at} className="text-sm text-muted-foreground">
                        {format(new Date(kb.created_at), 'MMM d, yyyy')}
                      </time>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(kb)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(kb)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateKnowledgeBaseModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['knowledge-bases'] });
          setShowCreateModal(false);
        }}
      />

      {selectedKB && (
        <EditKnowledgeBaseModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          knowledgeBase={selectedKB}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['knowledge-bases'] });
            setShowEditModal(false);
            setSelectedKB(null);
          }}
        />
      )}
    </div>
  );
}