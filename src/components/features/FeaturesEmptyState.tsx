import React from 'react';
import { Package, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface FeaturesEmptyStateProps {
  canManageFeatures?: boolean;
  title?: string;
  description?: string;
}

export function FeaturesEmptyState({ 
  canManageFeatures = false,
  title = "No Features Available",
  description = "There are no features available for your organization yet."
}: FeaturesEmptyStateProps) {
  return (
    <div className="text-center py-12">
      <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4">
        {description}
      </p>
      {canManageFeatures && (
        <Button asChild>
          <Link to="/settings/system">
            <Settings className="h-4 w-4 mr-2" />
            Manage Features
          </Link>
        </Button>
      )}
    </div>
  );
}