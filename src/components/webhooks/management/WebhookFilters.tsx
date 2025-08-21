/**
 * Webhook Filters Component
 * Advanced filtering options for webhook inventory
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';

interface WebhookFiltersProps {
  filters: {
    isActive?: boolean;
    healthStatus?: string;
    featureSlug?: string;
  };
  onFiltersChange: (filters: any) => void;
  onClearFilters: () => void;
}

export function WebhookFilters({ filters, onFiltersChange, onClearFilters }: WebhookFiltersProps) {
  const handleFilterChange = (key: string, value: string | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value === 'all' ? undefined : value
    });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Filter Webhooks</h4>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-8 px-2 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status Filter */}
        <div className="space-y-2">
          <Label htmlFor="status-filter" className="text-xs font-medium">
            Status
          </Label>
          <Select
            value={filters.isActive === undefined ? 'all' : filters.isActive ? 'active' : 'inactive'}
            onValueChange={(value) => 
              handleFilterChange('isActive', 
                value === 'all' ? undefined : value === 'active'
              )
            }
          >
            <SelectTrigger id="status-filter" className="h-8">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Health Status Filter */}
        <div className="space-y-2">
          <Label htmlFor="health-filter" className="text-xs font-medium">
            Health Status
          </Label>
          <Select
            value={filters.healthStatus || 'all'}
            onValueChange={(value) => handleFilterChange('healthStatus', value)}
          >
            <SelectTrigger id="health-filter" className="h-8">
              <SelectValue placeholder="All health statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Health Statuses</SelectItem>
              <SelectItem value="healthy">Healthy</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Feature Filter */}
        <div className="space-y-2">
          <Label htmlFor="feature-filter" className="text-xs font-medium">
            Feature
          </Label>
          <Select
            value={filters.featureSlug || 'all'}
            onValueChange={(value) => handleFilterChange('featureSlug', value)}
          >
            <SelectTrigger id="feature-filter" className="h-8">
              <SelectValue placeholder="All features" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Features</SelectItem>
              <SelectItem value="knowledge-base">Knowledge Base</SelectItem>
              <SelectItem value="user-management">User Management</SelectItem>
              <SelectItem value="feedback">Feedback</SelectItem>
              <SelectItem value="notifications">Notifications</SelectItem>
              <SelectItem value="settings">Settings</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active Filter Summary */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 pt-2 border-t">
          <span className="text-xs text-muted-foreground">Active filters:</span>
          <div className="flex items-center gap-1 flex-wrap">
            {filters.isActive !== undefined && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                Status: {filters.isActive ? 'Active' : 'Inactive'}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1 hover:bg-transparent"
                  onClick={() => handleFilterChange('isActive', undefined)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </span>
            )}
            {filters.healthStatus && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                Health: {filters.healthStatus}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1 hover:bg-transparent"
                  onClick={() => handleFilterChange('healthStatus', undefined)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </span>
            )}
            {filters.featureSlug && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-purple-100 text-purple-800">
                Feature: {filters.featureSlug}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1 hover:bg-transparent"
                  onClick={() => handleFilterChange('featureSlug', undefined)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}