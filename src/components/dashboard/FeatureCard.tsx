import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface FeatureCardProps {
  slug: string;
  name: string;
  icon: keyof typeof Icons;
  color: string;
  stats: {
    primary: number;
    primaryLabel: string;
    secondary: number;
    secondaryLabel: string;
  };
  status: 'active' | 'processing' | 'attention' | 'idle';
  quickAction: string;
  className?: string;
}

const statusConfig = {
  active: {
    color: 'bg-green-500',
    label: 'Active',
    variant: 'default' as const
  },
  processing: {
    color: 'bg-blue-500',
    label: 'Processing',
    variant: 'secondary' as const
  },
  attention: {
    color: 'bg-orange-500',
    label: 'Needs Attention',
    variant: 'destructive' as const
  },
  idle: {
    color: 'bg-gray-400',
    label: 'Idle',
    variant: 'outline' as const
  }
};

export const FeatureCard = React.memo<FeatureCardProps>(({
  slug,
  name,
  icon,
  color,
  stats,
  status,
  quickAction,
  className
}) => {
  const IconComponent = Icons[icon] || Icons.square;
  const statusInfo = statusConfig[status];

  return (
    <Card className={cn("relative overflow-hidden transition-all hover:shadow-md", className)}>
      {/* Status indicator */}
      <div 
        className={cn("absolute top-0 left-0 right-0 h-1", statusInfo.color)}
      />
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <div 
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
            style={{ backgroundColor: color }}
          >
            <IconComponent className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {name}
            </h3>
            <Badge 
              variant={statusInfo.variant}
              className="h-5 text-xs mt-1"
            >
              {statusInfo.label}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Primary and Secondary Stats */}
        <div className="flex items-center justify-between">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats.primary.toLocaleString()}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {stats.primaryLabel}
            </div>
          </div>
          
          {stats.secondary > 0 && (
            <div className="text-center">
              <div className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                {stats.secondary.toLocaleString()}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {stats.secondaryLabel}
              </div>
            </div>
          )}
        </div>

        {/* Quick Action Button */}
        <Button 
          asChild 
          variant="outline" 
          size="sm" 
          className="w-full justify-center"
        >
          <Link to={quickAction} className="flex items-center gap-2">
            {status === 'attention' ? (
              <Icons.alertCircle className="h-4 w-4" />
            ) : status === 'processing' ? (
              <Icons.refresh className="h-4 w-4" />
            ) : (
              <Icons.arrowRight className="h-4 w-4" />
            )}
            {status === 'attention' ? 'Review' : 
             status === 'processing' ? 'Monitor' : 
             stats.primary === 0 ? 'Get Started' : 'View'}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Only re-render if essential props change
  return (
    prevProps.stats.primary === nextProps.stats.primary &&
    prevProps.stats.secondary === nextProps.stats.secondary &&
    prevProps.status === nextProps.status &&
    prevProps.quickAction === nextProps.quickAction
  );
});

FeatureCard.displayName = 'FeatureCard';