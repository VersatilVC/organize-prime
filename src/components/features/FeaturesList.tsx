import React from 'react';
import { useSystemFeatures } from '@/hooks/database/useSystemFeatures';
import { useUserRole } from '@/hooks/useUserRole';
import { FEATURE_ERROR_MESSAGES } from '@/lib/error-messages';
import { EmptyState } from '@/components/composition/EmptyState';
import { FeatureListSkeleton } from '@/components/ui/feature-skeleton';
import { AlertTriangle, Package } from 'lucide-react';
import { FeatureCard } from './FeatureCard';

export function FeaturesList() {
  const { features, isLoading, error } = useSystemFeatures();
  const { role } = useUserRole();
  
  if (isLoading) {
    return <FeatureListSkeleton count={6} />;
  }
  
  if (error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Failed to Load Features"
        description={FEATURE_ERROR_MESSAGES.LOAD_FAILED}
        action={{
          label: "Try Again",
          onClick: () => window.location.reload()
        }}
      />
    );
  }
  
  if (!features || features.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No Features Available"
        description="There are no features available at this time. Check back later or contact your administrator."
        action={role === 'super_admin' ? {
          label: "Manage Features",
          onClick: () => window.location.href = "/settings/system"
        } : undefined}
      />
    );
  }
  
  const enabledFeatures = features.filter(f => f.is_active);
  
  if (enabledFeatures.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No Features Enabled"
        description="All features are currently disabled. Contact your administrator to enable features."
        action={role === 'super_admin' ? {
          label: "Enable Features",
          onClick: () => window.location.href = "/settings/system"
        } : undefined}
      />
    );
  }
  
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {enabledFeatures.map((feature) => (
        <FeatureCard key={feature.id} feature={feature} />
      ))}
    </div>
  );
}