import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable, TableColumn } from '@/components/composition/DataTable';
import { TargetAudienceForm } from './TargetAudienceForm';
import { useTargetAudiences } from '@/features/content-creation/hooks/useTargetAudiences';
import { TargetAudience } from '@/features/content-creation/types/contentCreationTypes';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  Users,
  Building,
  Clock,
  Activity,
  Briefcase
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

interface TargetAudiencesTabProps {
  className?: string;
}

export const TargetAudiencesTab = React.memo<TargetAudiencesTabProps>(({ className }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTargetAudience, setSelectedTargetAudience] = useState<TargetAudience | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewTargetAudience, setViewTargetAudience] = useState<TargetAudience | null>(null);
  const [deleteTargetAudience, setDeleteTargetAudience] = useState<TargetAudience | null>(null);
  const [sortBy, setSortBy] = useState<string>('usage_count');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const {
    targetAudiences,
    isLoading,
    error,
    deleteTargetAudience: deleteTargetAudienceFn,
    updateUsageCount,
    isDeleting
  } = useTargetAudiences();

  // Filter target audiences based on search query
  const filteredTargetAudiences = useMemo(() => {
    if (!searchQuery.trim()) return targetAudiences;
    
    const query = searchQuery.toLowerCase();
    return targetAudiences.filter(audience =>
      audience.name.toLowerCase().includes(query) ||
      audience.description?.toLowerCase().includes(query) ||
      audience.industries.some(industry => industry.toLowerCase().includes(query)) ||
      audience.job_titles.some(title => title.toLowerCase().includes(query)) ||
      audience.company_types.some(type => type.toLowerCase().includes(query))
    );
  }, [targetAudiences, searchQuery]);

  // Sort target audiences
  const sortedTargetAudiences = useMemo(() => {
    return [...filteredTargetAudiences].sort((a, b) => {
      let aValue: any = a[sortBy as keyof TargetAudience];
      let bValue: any = b[sortBy as keyof TargetAudience];

      // Handle special sorting cases
      if (sortBy === 'created_at' || sortBy === 'updated_at') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredTargetAudiences, sortBy, sortOrder]);

  // Handle sorting
  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  };

  // Handle edit
  const handleEdit = (targetAudience: TargetAudience) => {
    setSelectedTargetAudience(targetAudience);
    setIsFormOpen(true);
  };

  // Handle view/use - open view modal and increment usage count
  const handleView = (targetAudience: TargetAudience) => {
    setViewTargetAudience(targetAudience);
    updateUsageCount(targetAudience.id);
  };

  // Handle delete
  const handleDelete = (targetAudience: TargetAudience) => {
    setDeleteTargetAudience(targetAudience);
  };

  const confirmDelete = () => {
    if (deleteTargetAudience) {
      deleteTargetAudienceFn(deleteTargetAudience.id);
      setDeleteTargetAudience(null);
    }
  };

  // Table columns configuration
  const columns: TableColumn<TargetAudience>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (audience) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
            <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <div className="font-medium">{audience.name}</div>
            {audience.description && (
              <div className="text-sm text-muted-foreground line-clamp-1">
                {audience.description}
              </div>
            )}
          </div>
        </div>
      ),
      width: '300px'
    },
    {
      key: 'industries',
      label: 'Industries',
      render: (audience) => (
        <div className="flex flex-wrap gap-1">
          {audience.industries.slice(0, 2).map((industry, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {industry}
            </Badge>
          ))}
          {audience.industries.length > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{audience.industries.length - 2}
            </Badge>
          )}
        </div>
      ),
      width: '150px'
    },
    {
      key: 'job_titles',
      label: 'Job Titles',
      render: (audience) => (
        <div className="flex flex-wrap gap-1">
          {audience.job_titles.slice(0, 2).map((title, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {title}
            </Badge>
          ))}
          {audience.job_titles.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{audience.job_titles.length - 2}
            </Badge>
          )}
        </div>
      ),
      width: '150px'
    },
    {
      key: 'company_sizes',
      label: 'Company Size',
      render: (audience) => (
        <div className="flex items-center gap-2">
          <Building className="h-4 w-4 text-muted-foreground" />
          <div className="flex flex-wrap gap-1">
            {audience.company_sizes.slice(0, 2).map((size, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {size}
              </Badge>
            ))}
            {audience.company_sizes.length > 2 && (
              <span className="text-xs text-muted-foreground">
                +{audience.company_sizes.length - 2}
              </span>
            )}
          </div>
        </div>
      ),
      width: '150px'
    },
    {
      key: 'usage_count',
      label: 'Usage',
      sortable: true,
      render: (audience) => (
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{audience.usage_count}</span>
        </div>
      ),
      width: '100px'
    },
    {
      key: 'updated_at',
      label: 'Last Updated',
      sortable: true,
      render: (audience) => (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {new Date(audience.updated_at).toLocaleDateString()}
          </span>
        </div>
      ),
      width: '150px'
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (audience) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleView(audience)}
            className="h-8 w-8 p-0"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(audience)}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(audience)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      width: '120px'
    }
  ];

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-destructive mb-2">Error loading target audiences</div>
        <div className="text-sm text-muted-foreground">{error.message}</div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search target audiences..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          onClick={() => {
            setSelectedTargetAudience(null);
            setIsFormOpen(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Target Audience
        </Button>
      </div>

      {/* Target Audiences Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : sortedTargetAudiences.length === 0 ? (
        <EmptyState
          icon={Users}
          title={searchQuery ? "No target audiences found" : "No target audiences yet"}
          description={
            searchQuery 
              ? "Try adjusting your search query"
              : "Create your first target audience to better understand who you're creating content for"
          }
          action={
            !searchQuery ? (
              <Button
                onClick={() => {
                  setSelectedTargetAudience(null);
                  setIsFormOpen(true);
                }}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Target Audience
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DataTable
          data={sortedTargetAudiences}
          columns={columns}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          className="rounded-lg border"
        />
      )}

      {/* Target Audience Form Modal */}
      <TargetAudienceForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedTargetAudience(null);
        }}
        targetAudience={selectedTargetAudience}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTargetAudience} onOpenChange={() => setDeleteTargetAudience(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Target Audience</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTargetAudience?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Target Audience Modal */}
      <Dialog open={!!viewTargetAudience} onOpenChange={() => setViewTargetAudience(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              {viewTargetAudience?.name}
            </DialogTitle>
          </DialogHeader>
          
          {viewTargetAudience && (
            <div className="space-y-6">
              {/* Description */}
              {viewTargetAudience.description && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground">{viewTargetAudience.description}</p>
                </div>
              )}

              {/* Audience Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Industries */}
                {viewTargetAudience.industries.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Industries</h4>
                    <div className="flex flex-wrap gap-1">
                      {viewTargetAudience.industries.map((industry, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {industry}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Job Titles */}
                {viewTargetAudience.job_titles.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Job Titles</h4>
                    <div className="flex flex-wrap gap-1">
                      {viewTargetAudience.job_titles.map((title, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {title}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Company Types */}
                {viewTargetAudience.company_types.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Company Types</h4>
                    <div className="flex flex-wrap gap-1">
                      {viewTargetAudience.company_types.map((type, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Company Sizes */}
                {viewTargetAudience.company_sizes.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Company Sizes</h4>
                    <div className="flex flex-wrap gap-1">
                      {viewTargetAudience.company_sizes.map((size, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {size}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Job Levels */}
                {viewTargetAudience.job_levels.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Job Levels</h4>
                    <div className="flex flex-wrap gap-1">
                      {viewTargetAudience.job_levels.map((level, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {level}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Departments */}
                {viewTargetAudience.departments.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Departments</h4>
                    <div className="flex flex-wrap gap-1">
                      {viewTargetAudience.departments.map((dept, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {dept}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Interests, Pain Points, Goals */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Interests */}
                {viewTargetAudience.interests.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-green-600 dark:text-green-400">Interests</h4>
                    <ul className="space-y-1">
                      {viewTargetAudience.interests.map((interest, index) => (
                        <li key={index} className="text-sm text-muted-foreground">• {interest}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Pain Points */}
                {viewTargetAudience.pain_points.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-red-600 dark:text-red-400">Pain Points</h4>
                    <ul className="space-y-1">
                      {viewTargetAudience.pain_points.map((pain, index) => (
                        <li key={index} className="text-sm text-muted-foreground">• {pain}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Goals */}
                {viewTargetAudience.goals.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-blue-600 dark:text-blue-400">Goals</h4>
                    <ul className="space-y-1">
                      {viewTargetAudience.goals.map((goal, index) => (
                        <li key={index} className="text-sm text-muted-foreground">• {goal}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* AI Segment Analysis */}
              {viewTargetAudience.segment_analysis && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">AI Segment Analysis</h3>
                  <div className="p-4 border rounded-md bg-muted/30">
                    <div className="prose prose-sm max-w-none text-foreground">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-3 text-foreground" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-lg font-semibold mb-2 text-foreground" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-base font-medium mb-2 text-foreground" {...props} />,
                          p: ({node, ...props}) => <p className="mb-2 text-foreground leading-relaxed" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2 text-foreground" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2 text-foreground" {...props} />,
                          li: ({node, ...props}) => <li className="mb-1" {...props} />,
                          strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                          em: ({node, ...props}) => <em className="italic" {...props} />,
                        }}
                      >
                        {viewTargetAudience.segment_analysis.replace(/^```markdown\s*\n?|\n?```\s*$/g, '').trim()}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}

              {/* Usage Stats */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    <span>Used {viewTargetAudience.usage_count} times</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Last updated {new Date(viewTargetAudience.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewTargetAudience(null);
                    handleEdit(viewTargetAudience);
                  }}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
});

TargetAudiencesTab.displayName = 'TargetAudiencesTab';