// Extraction Status Badge Component
// Displays extraction and processing status with appropriate colors and icons

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Bot,
  FileText,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContentIdea } from '@/types/content-creation';

interface ExtractionStatusBadgeProps {
  extraction_status?: ContentIdea['extraction_status'];
  processing_status?: ContentIdea['processing_status'];
  className?: string;
  showIcon?: boolean;
}

export const ExtractionStatusBadge: React.FC<ExtractionStatusBadgeProps> = ({
  extraction_status = 'none',
  processing_status = 'draft',
  className,
  showIcon = true
}) => {
  // Determine the primary status to display (processing takes precedence)
  const getPrimaryStatus = () => {
    // New status flow
    if (processing_status === 'ready') {
      return {
        label: 'Ready',
        variant: 'default' as const,
        icon: CheckCircle,
        animate: false
      };
    }
    
    if (processing_status === 'generating ideas') {
      return {
        label: 'Generating Ideas',
        variant: 'default' as const,
        icon: Bot,
        animate: true
      };
    }
    
    if (processing_status === 'extracting' || extraction_status === 'processing') {
      return {
        label: 'Extracting',
        variant: 'secondary' as const,
        icon: Loader2,
        animate: true
      };
    }
    
    // Legacy status support (for backward compatibility)
    if (processing_status === 'processing_ai') {
      return {
        label: 'Generating Ideas',
        variant: 'default' as const,
        icon: Bot,
        animate: true
      };
    }
    
    if (processing_status === 'ai_completed') {
      return {
        label: 'Ready',
        variant: 'default' as const,
        icon: CheckCircle,
        animate: false
      };
    }
    
    if (extraction_status === 'completed') {
      return {
        label: 'Extracted',
        variant: 'secondary' as const,
        icon: CheckCircle,
        animate: false
      };
    }
    
    if (extraction_status === 'pending') {
      return {
        label: 'Pending',
        variant: 'outline' as const,
        icon: Clock,
        animate: false
      };
    }
    
    if (extraction_status === 'failed' || processing_status === 'failed') {
      return {
        label: 'Failed',
        variant: 'destructive' as const,
        icon: XCircle,
        animate: false
      };
    }
    
    return {
      label: 'Draft',
      variant: 'outline' as const,
      icon: FileText,
      animate: false
    };
  };

  const status = getPrimaryStatus();
  const Icon = status.icon;

  return (
    <Badge 
      variant={status.variant}
      className={cn(
        "flex items-center gap-1 text-xs",
        className
      )}
    >
      {showIcon && (
        <Icon 
          className={cn(
            "h-3 w-3",
            status.animate && "animate-spin"
          )}
        />
      )}
      {status.label}
    </Badge>
  );
};

// Individual status badges for more granular display
export const ProcessingStatusBadge: React.FC<{
  status: ContentIdea['processing_status'];
  className?: string;
}> = ({ status = 'draft', className }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'extracting':
        return {
          label: 'Extracting Files',
          variant: 'secondary' as const,
          icon: Loader2,
          animate: true
        };
      case 'generating ideas':
        return {
          label: 'Generating Ideas',
          variant: 'default' as const,
          icon: Bot,
          animate: true
        };
      case 'ready':
        return {
          label: 'Ready',
          variant: 'default' as const,
          icon: CheckCircle,
          animate: false
        };
      case 'brief created':
        return {
          label: 'Brief Created',
          variant: 'default' as const,
          icon: FileText,
          animate: false
        };
      // Legacy status support
      case 'processing_ai':
        return {
          label: 'Generating Ideas',
          variant: 'default' as const,
          icon: Bot,
          animate: true
        };
      case 'ai_completed':
        return {
          label: 'Ready',
          variant: 'default' as const,
          icon: CheckCircle,
          animate: false
        };
      case 'failed':
        return {
          label: 'Processing Failed',
          variant: 'destructive' as const,
          icon: AlertCircle,
          animate: false
        };
      default:
        return {
          label: 'Draft',
          variant: 'outline' as const,
          icon: FileText,
          animate: false
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant}
      className={cn("flex items-center gap-1 text-xs", className)}
    >
      <Icon className={cn("h-3 w-3", config.animate && "animate-spin")} />
      {config.label}
    </Badge>
  );
};

export const ExtractionOnlyStatusBadge: React.FC<{
  status: ContentIdea['extraction_status'];
  className?: string;
}> = ({ status = 'none', className }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          label: 'Pending',
          variant: 'outline' as const,
          icon: Clock,
          animate: false
        };
      case 'processing':
        return {
          label: 'Extracting',
          variant: 'secondary' as const,
          icon: Loader2,
          animate: true
        };
      case 'completed':
        return {
          label: 'Complete',
          variant: 'default' as const,
          icon: CheckCircle,
          animate: false
        };
      case 'failed':
        return {
          label: 'Failed',
          variant: 'destructive' as const,
          icon: XCircle,
          animate: false
        };
      default:
        return {
          label: 'No Files',
          variant: 'outline' as const,
          icon: FileText,
          animate: false
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant}
      className={cn("flex items-center gap-1 text-xs", className)}
    >
      <Icon className={cn("h-3 w-3", config.animate && "animate-spin")} />
      {config.label}
    </Badge>
  );
};