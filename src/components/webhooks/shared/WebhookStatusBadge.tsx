/**
 * Webhook Status Badge Component
 * Displays health status with appropriate colors and icons
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type WebhookHealthStatus = 'healthy' | 'warning' | 'error' | 'unknown';

interface WebhookStatusBadgeProps {
  status: WebhookHealthStatus;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'default' | 'lg';
}

const statusConfig = {
  healthy: {
    label: 'Healthy',
    variant: 'default' as const,
    className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100',
    icon: CheckCircle,
  },
  warning: {
    label: 'Warning',
    variant: 'secondary' as const,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100',
    icon: AlertTriangle,
  },
  error: {
    label: 'Error',
    variant: 'destructive' as const,
    className: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100',
    icon: XCircle,
  },
  unknown: {
    label: 'Unknown',
    variant: 'outline' as const,
    className: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100',
    icon: HelpCircle,
  },
};

export function WebhookStatusBadge({ 
  status, 
  className, 
  showIcon = true,
  size = 'default'
}: WebhookStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    default: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    default: 'h-4 w-4',
    lg: 'h-4 w-4',
  };

  return (
    <Badge
      variant={config.variant}
      className={cn(
        config.className,
        sizeClasses[size],
        'flex items-center gap-1.5 font-medium',
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </Badge>
  );
}