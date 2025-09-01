// Content Creation Generate Page - Phase 4: Integration
// Main page component with three-tab layout and workflow integration

import React, { useState, useCallback, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { GenerateIdeasTab } from './tabs/GenerateIdeasTab';
import { ContentBriefsTab } from './tabs/ContentBriefsTab';
import { ContentItemsTab } from './tabs/ContentItemsTab';
import { ContentIdeaForm, ContentBriefForm, ContentItemForm } from './forms';
import { BriefViewerModal } from './components/BriefViewerModal';
import type { 
  ContentIdeaWithDetails, 
  ContentBriefWithDetails, 
  ContentItemWithDetails 
} from '@/types/content-creation';
import { Badge } from '@/components/ui/badge';
import { 
  Lightbulb, 
  FileText, 
  Sparkles,
  AlertTriangle,
  RefreshCw 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

type TabValue = 'ideas' | 'briefs' | 'items';

interface ContentCreationGeneratePageProps {
  className?: string;
}

export const ContentCreationGeneratePage = React.memo<ContentCreationGeneratePageProps>(({
  className
}) => {
  // Tab state management
  const [activeTab, setActiveTab] = useState<TabValue>('ideas');

  // Form modal state management
  const [ideaFormOpen, setIdeaFormOpen] = useState(false);
  const [briefFormOpen, setBriefFormOpen] = useState(false);
  const [itemFormOpen, setItemFormOpen] = useState(false);

  // Edit state management
  const [editingIdea, setEditingIdea] = useState<ContentIdeaWithDetails | null>(null);
  const [editingBrief, setEditingBrief] = useState<ContentBriefWithDetails | null>(null);
  const [editingItem, setEditingItem] = useState<ContentItemWithDetails | null>(null);

  // Workflow state management (for creating from one entity to another)
  const [ideaForBrief, setIdeaForBrief] = useState<ContentIdeaWithDetails | null>(null);
  const [briefForItem, setBriefForItem] = useState<ContentBriefWithDetails | null>(null);

  // Brief viewer modal state
  const [briefViewerOpen, setBriefViewerOpen] = useState(false);
  const [viewingBriefId, setViewingBriefId] = useState<string | null>(null);

  const { toast } = useToast();

  // ========== IDEAS TAB HANDLERS ==========
  
  const handleCreateIdea = useCallback(() => {
    setEditingIdea(null);
    setIdeaFormOpen(true);
  }, []);

  const handleEditIdea = useCallback((idea: ContentIdeaWithDetails) => {
    setEditingIdea(idea);
    setIdeaFormOpen(true);
  }, []);

  const handleCreateBriefFromIdea = useCallback((idea: ContentIdeaWithDetails) => {
    setIdeaForBrief(idea);
    setEditingBrief(null);
    setBriefFormOpen(true);
    
    // Switch to briefs tab after a brief delay to show the action
    setTimeout(() => {
      setActiveTab('briefs');
      toast({
        title: 'Creating brief from idea',
        description: `Setting up brief based on "${idea.title}"`,
      });
    }, 500);
  }, [toast]);

  // ========== BRIEFS TAB HANDLERS ==========

  const handleCreateBrief = useCallback(() => {
    setEditingBrief(null);
    setIdeaForBrief(null);
    setBriefFormOpen(true);
  }, []);

  const handleEditBrief = useCallback((brief: ContentBriefWithDetails) => {
    setEditingBrief(brief);
    setIdeaForBrief(null);
    setBriefFormOpen(true);
  }, []);

  const handleGenerateContentFromBrief = useCallback((brief: ContentBriefWithDetails) => {
    setBriefForItem(brief);
    setEditingItem(null);
    setItemFormOpen(true);
    
    // Switch to items tab
    setTimeout(() => {
      setActiveTab('items');
      toast({
        title: 'Generating content from brief',
        description: `Creating content based on "${brief.title}"`,
      });
    }, 500);
  }, [toast]);

  // ========== ITEMS TAB HANDLERS ==========

  const handleCreateItem = useCallback(() => {
    setEditingItem(null);
    setBriefForItem(null);
    setItemFormOpen(true);
  }, []);

  const handleEditItem = useCallback((item: ContentItemWithDetails) => {
    setEditingItem(item);
    setBriefForItem(null);
    setItemFormOpen(true);
  }, []);

  // ========== FORM CLOSE HANDLERS ==========

  const handleIdeaFormClose = useCallback(() => {
    setIdeaFormOpen(false);
    setEditingIdea(null);
    setTimeout(() => {
      setIdeaForBrief(null);
    }, 300); // Delay to prevent flash during closing animation
  }, []);

  const handleBriefFormClose = useCallback(() => {
    setBriefFormOpen(false);
    setEditingBrief(null);
    setTimeout(() => {
      setIdeaForBrief(null);
    }, 300);
  }, []);

  const handleItemFormClose = useCallback(() => {
    setItemFormOpen(false);
    setEditingItem(null);
    setTimeout(() => {
      setBriefForItem(null);
    }, 300);
  }, []);

  // ========== BRIEF VIEWER HANDLERS ==========

  const handleViewBrief = useCallback((briefId: string) => {
    setViewingBriefId(briefId);
    setBriefViewerOpen(true);
  }, []);

  const handleBriefViewerClose = useCallback(() => {
    setBriefViewerOpen(false);
    setTimeout(() => {
      setViewingBriefId(null);
    }, 300);
  }, []);

  // ========== TAB CONFIGURATION ==========

  const tabConfig = useMemo(() => [
    {
      value: 'ideas' as const,
      label: 'Generate Ideas',
      icon: Lightbulb,
      description: 'Brainstorm and manage content ideas',
      color: 'text-yellow-600'
    },
    {
      value: 'briefs' as const,
      label: 'Content Briefs',
      icon: FileText,
      description: 'Define detailed content requirements',
      color: 'text-blue-600'
    },
    {
      value: 'items' as const,
      label: 'Content Items',
      icon: Sparkles,
      description: 'Create and publish final content',
      color: 'text-green-600'
    }
  ], []);

  return (
    <div className={className}>
      {/* Page Header */}
      <header className="mb-8" role="banner">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg" aria-hidden="true">
            <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Content Generation</h1>
            <p className="text-muted-foreground">
              Create compelling content from ideas to publication
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground" role="region" aria-label="Content creation workflow overview">
          <span>Workflow:</span>
          <div className="flex items-center gap-1" role="list" aria-label="Content creation workflow steps">
            <div role="listitem">
              <Badge variant="outline" className="text-yellow-600 border-yellow-200" aria-label="Step 1: Generate Ideas">
                <Lightbulb className="h-3 w-3 mr-1" aria-hidden="true" />
                Ideas
              </Badge>
            </div>
            <span aria-hidden="true">→</span>
            <div role="listitem">
              <Badge variant="outline" className="text-blue-600 border-blue-200" aria-label="Step 2: Create Briefs">
                <FileText className="h-3 w-3 mr-1" aria-hidden="true" />
                Briefs
              </Badge>
            </div>
            <span aria-hidden="true">→</span>
            <div role="listitem">
              <Badge variant="outline" className="text-green-600 border-green-200" aria-label="Step 3: Generate Content">
                <Sparkles className="h-3 w-3 mr-1" aria-hidden="true" />
                Content
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)}>
        {/* Tab Navigation */}
        <TabsList className="grid w-full grid-cols-3 mb-8" role="tablist" aria-label="Content creation workflow tabs">
          {tabConfig.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger 
                key={tab.value} 
                value={tab.value}
                className="flex items-center gap-2 px-4 py-3"
                role="tab"
                aria-describedby={`${tab.value}-description`}
                aria-label={`${tab.label} - ${tab.description}`}
              >
                <Icon className={`h-4 w-4 ${tab.color}`} aria-hidden="true" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                <span id={`${tab.value}-description`} className="sr-only">
                  {tab.description}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Tab Content with Error Boundaries */}
        <TabsContent value="ideas" className="mt-0 space-y-0" role="tabpanel" aria-labelledby="ideas-tab">
          <ErrorBoundary
            fallback={({ error, resetError }) => (
              <Alert variant="destructive" role="alert" aria-live="assertive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex flex-col gap-2">
                    <span>Failed to load the Ideas tab. Please try refreshing.</span>
                    <Button onClick={resetError} size="sm" className="w-fit">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          >
            <GenerateIdeasTab
              onCreateIdea={handleCreateIdea}
              onEditIdea={handleEditIdea}
              onCreateBrief={handleCreateBriefFromIdea}
              onViewBrief={handleViewBrief}
            />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="briefs" className="mt-0 space-y-0" role="tabpanel" aria-labelledby="briefs-tab">
          <ErrorBoundary
            fallback={({ error, resetError }) => (
              <Alert variant="destructive" role="alert" aria-live="assertive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex flex-col gap-2">
                    <span>Failed to load the Briefs tab. Please try refreshing.</span>
                    <Button onClick={resetError} size="sm" className="w-fit">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          >
            <ContentBriefsTab
              onCreateBrief={handleCreateBrief}
              onEditBrief={handleEditBrief}
              onGenerateContent={handleGenerateContentFromBrief}
              onViewBrief={handleViewBrief}
            />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="items" className="mt-0 space-y-0" role="tabpanel" aria-labelledby="items-tab">
          <ErrorBoundary
            fallback={({ error, resetError }) => (
              <Alert variant="destructive" role="alert" aria-live="assertive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex flex-col gap-2">
                    <span>Failed to load the Content Items tab. Please try refreshing.</span>
                    <Button onClick={resetError} size="sm" className="w-fit">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          >
            <ContentItemsTab
              onCreateItem={handleCreateItem}
              onEditItem={handleEditItem}
            />
          </ErrorBoundary>
        </TabsContent>
      </Tabs>

      {/* Modal Forms */}
      <ContentIdeaForm
        isOpen={ideaFormOpen}
        onClose={handleIdeaFormClose}
        idea={editingIdea}
      />

      <ContentBriefForm
        isOpen={briefFormOpen}
        onClose={handleBriefFormClose}
        brief={editingBrief}
        fromIdea={ideaForBrief}
      />

      <ContentItemForm
        isOpen={itemFormOpen}
        onClose={handleItemFormClose}
        item={editingItem}
        fromBrief={briefForItem}
      />

      {/* Brief Viewer Modal */}
      <BriefViewerModal
        isOpen={briefViewerOpen}
        onClose={handleBriefViewerClose}
        briefId={viewingBriefId}
        onEdit={(brief) => {
          setEditingBrief(brief);
          setBriefFormOpen(true);
          setBriefViewerOpen(false);
        }}
      />
    </div>
  );
});

ContentCreationGeneratePage.displayName = 'ContentCreationGeneratePage';