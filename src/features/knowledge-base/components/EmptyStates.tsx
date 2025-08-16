import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Upload, 
  Database, 
  AlertCircle, 
  RefreshCw, 
  Search,
  Settings,
  Plus,
  BookOpen,
  Zap,
  Clock,
  CheckCircle,
  ArrowRight,
  ExternalLink,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  actions?: Array<{
    label: string;
    variant?: 'default' | 'outline' | 'secondary' | 'ghost';
    icon?: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    href?: string;
    external?: boolean;
  }>;
  suggestions?: string[];
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

function EmptyState({ 
  title, 
  description, 
  icon: Icon = FileText, 
  actions = [], 
  suggestions = [],
  className,
  size = 'md'
}: EmptyStateProps) {
  const sizeClasses = {
    sm: 'py-8',
    md: 'py-12',
    lg: 'py-16'
  };

  const iconSizes = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  return (
    <div className={cn('text-center', sizeClasses[size], className)}>
      <div className="mx-auto mb-4 rounded-full bg-muted/50 p-4 w-fit">
        <Icon className={cn('text-muted-foreground', iconSizes[size])} />
      </div>
      
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">{description}</p>
      
      {actions.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'default'}
              onClick={action.onClick}
              className="flex items-center gap-2"
            >
              {action.icon && <action.icon className="h-4 w-4" />}
              {action.label}
              {action.external && <ExternalLink className="h-3 w-3" />}
            </Button>
          ))}
        </div>
      )}
      
      {suggestions.length > 0 && (
        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-2">Suggestions:</p>
          <ul className="space-y-1">
            {suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start gap-2 justify-center">
                <ArrowRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// No Files Uploaded Empty State
export function NoFilesUploadedState({ 
  onUploadClick, 
  onCreateKbClick,
  hasKnowledgeBases = true 
}: { 
  onUploadClick: () => void;
  onCreateKbClick?: () => void;
  hasKnowledgeBases?: boolean;
}) {
  const actions = hasKnowledgeBases ? [
    {
      label: 'Upload Your First File',
      icon: Upload,
      onClick: onUploadClick
    },
    {
      label: 'Learn About File Formats',
      variant: 'outline' as const,
      icon: HelpCircle,
      onClick: () => window.open('/help/file-formats', '_blank'),
      external: true
    }
  ] : [
    {
      label: 'Create Knowledge Base',
      icon: Plus,
      onClick: onCreateKbClick!
    }
  ];

  const suggestions = hasKnowledgeBases ? [
    'Start with a small document to test the system',
    'PDF, Word, and text files work best',
    'Organize files by topic for better searchability'
  ] : [
    'Create your first knowledge base to get started',
    'Each knowledge base can contain multiple files',
    'Organize by project, topic, or team'
  ];

  return (
    <EmptyState
      title={hasKnowledgeBases ? "No files uploaded yet" : "No knowledge bases found"}
      description={hasKnowledgeBases 
        ? "Upload your first document to start building your knowledge base and enable AI-powered search."
        : "Create a knowledge base to organize and search through your documents with AI."
      }
      icon={hasKnowledgeBases ? Upload : Database}
      actions={actions}
      suggestions={suggestions}
      size="lg"
    />
  );
}

// No Knowledge Bases Available State
export function NoKnowledgeBasesState({ 
  onCreateClick,
  onSettingsClick 
}: { 
  onCreateClick: () => void;
  onSettingsClick: () => void;
}) {
  return (
    <EmptyState
      title="No knowledge bases available"
      description="Knowledge bases help organize your documents by topic, project, or team. Create your first one to get started."
      icon={Database}
      actions={[
        {
          label: 'Create Knowledge Base',
          icon: Plus,
          onClick: onCreateClick
        },
        {
          label: 'KB Settings',
          variant: 'outline',
          icon: Settings,
          onClick: onSettingsClick
        }
      ]}
      suggestions={[
        'Start with a general knowledge base for mixed content',
        'Create topic-specific knowledge bases for better organization',
        'Each knowledge base can have different settings'
      ]}
    />
  );
}

// Processing Queue Empty State
export function ProcessingQueueEmptyState({ onUploadClick }: { onUploadClick: () => void }) {
  return (
    <EmptyState
      title="No files being processed"
      description="All files have been processed successfully. Upload more files to see processing activity here."
      icon={CheckCircle}
      actions={[
        {
          label: 'Upload More Files',
          icon: Upload,
          onClick: onUploadClick
        }
      ]}
      suggestions={[
        'Files typically process within a few minutes',
        'Larger files may take longer to process',
        'You can monitor progress in real-time'
      ]}
      size="md"
    />
  );
}

// Search Results Empty State
export function SearchResultsEmptyState({ 
  searchTerm, 
  onClearSearch,
  onUploadClick 
}: { 
  searchTerm: string;
  onClearSearch: () => void;
  onUploadClick: () => void;
}) {
  return (
    <EmptyState
      title={`No results found for "${searchTerm}"`}
      description="Try adjusting your search terms or filters, or upload more content to expand your knowledge base."
      icon={Search}
      actions={[
        {
          label: 'Clear Search',
          variant: 'outline',
          icon: RefreshCw,
          onClick: onClearSearch
        },
        {
          label: 'Upload More Files',
          icon: Upload,
          onClick: onUploadClick
        }
      ]}
      suggestions={[
        'Try different keywords or synonyms',
        'Check for typos in your search term',
        'Upload more relevant documents'
      ]}
      size="md"
    />
  );
}

// Error State with Recovery Actions
export function ErrorRecoveryState({ 
  title = "Something went wrong",
  description = "We encountered an unexpected error. Please try again or contact support if the problem persists.",
  errorCode,
  onRetry,
  onRefresh,
  onContactSupport,
  showDetails = false,
  technicalDetails
}: {
  title?: string;
  description?: string;
  errorCode?: string;
  onRetry?: () => void;
  onRefresh?: () => void;
  onContactSupport?: () => void;
  showDetails?: boolean;
  technicalDetails?: any;
}) {
  const actions = [];
  
  if (onRetry) {
    actions.push({
      label: 'Try Again',
      icon: RefreshCw,
      onClick: onRetry
    });
  }
  
  if (onRefresh) {
    actions.push({
      label: 'Refresh Page',
      variant: 'outline' as const,
      icon: RefreshCw,
      onClick: onRefresh
    });
  }
  
  if (onContactSupport) {
    actions.push({
      label: 'Contact Support',
      variant: 'outline' as const,
      icon: HelpCircle,
      onClick: onContactSupport
    });
  }

  return (
    <div className="text-center py-12">
      <div className="mx-auto mb-4 rounded-full bg-red-50 p-4 w-fit">
        <AlertCircle className="h-12 w-12 text-red-500" />
      </div>
      
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">{description}</p>
      
      {errorCode && (
        <div className="mb-6">
          <Badge variant="secondary" className="font-mono">
            Error: {errorCode}
          </Badge>
        </div>
      )}
      
      {actions.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'default'}
              onClick={action.onClick}
              className="flex items-center gap-2"
            >
              <action.icon className="h-4 w-4" />
              {action.label}
            </Button>
          ))}
        </div>
      )}
      
      {showDetails && technicalDetails && (
        <details className="text-left max-w-lg mx-auto">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
            Show technical details
          </summary>
          <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto">
            {JSON.stringify(technicalDetails, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

// Connection Lost State
export function ConnectionLostState({ 
  onRetryConnection,
  isRetrying = false 
}: { 
  onRetryConnection: () => void;
  isRetrying?: boolean;
}) {
  return (
    <Alert className="border-orange-200 bg-orange-50">
      <AlertCircle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="flex items-center justify-between">
        <div>
          <div className="font-medium text-orange-800">Connection lost</div>
          <div className="text-orange-700 text-sm">
            Real-time updates are disabled. Check your internet connection.
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRetryConnection}
          disabled={isRetrying}
          className="border-orange-300 text-orange-700 hover:bg-orange-100"
        >
          {isRetrying ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </>
          )}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

// Loading State with Skeleton
export function LoadingState({ 
  title = "Loading...",
  description = "Please wait while we fetch your data.",
  showProgress = false,
  progress = 0
}: {
  title?: string;
  description?: string;
  showProgress?: boolean;
  progress?: number;
}) {
  return (
    <div className="text-center py-12">
      <div className="mx-auto mb-4 rounded-full bg-primary/10 p-4 w-fit">
        <RefreshCw className="h-12 w-12 text-primary animate-spin" />
      </div>
      
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">{description}</p>
      
      {showProgress && (
        <div className="max-w-xs mx-auto">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">{Math.round(progress)}% complete</p>
        </div>
      )}
    </div>
  );
}

// Maintenance Mode State
export function MaintenanceModeState({ 
  estimatedDuration,
  onCheckStatus 
}: { 
  estimatedDuration?: string;
  onCheckStatus: () => void;
}) {
  return (
    <EmptyState
      title="System Maintenance"
      description={`We're performing scheduled maintenance to improve your experience. ${
        estimatedDuration ? `Estimated completion: ${estimatedDuration}` : 'We\'ll be back shortly.'
      }`}
      icon={Settings}
      actions={[
        {
          label: 'Check Status',
          variant: 'outline',
          icon: RefreshCw,
          onClick: onCheckStatus
        },
        {
          label: 'Status Page',
          variant: 'ghost',
          icon: ExternalLink,
          onClick: () => window.open('https://status.example.com', '_blank'),
          external: true
        }
      ]}
      suggestions={[
        'Maintenance typically takes 15-30 minutes',
        'Your data is safe and will be available when we return',
        'Check our status page for real-time updates'
      ]}
    />
  );
}

// Feature Coming Soon State
export function ComingSoonState({ 
  featureName,
  description,
  onNotifyMe,
  onLearnMore 
}: {
  featureName: string;
  description: string;
  onNotifyMe?: () => void;
  onLearnMore?: () => void;
}) {
  const actions = [];
  
  if (onNotifyMe) {
    actions.push({
      label: 'Notify Me',
      icon: Zap,
      onClick: onNotifyMe
    });
  }
  
  if (onLearnMore) {
    actions.push({
      label: 'Learn More',
      variant: 'outline' as const,
      icon: BookOpen,
      onClick: onLearnMore
    });
  }

  return (
    <EmptyState
      title={`${featureName} Coming Soon`}
      description={description}
      icon={Clock}
      actions={actions}
      suggestions={[
        'We\'re working hard to bring you this feature',
        'Sign up for notifications to be the first to know',
        'Check our roadmap for more upcoming features'
      ]}
    />
  );
}