import React from 'react';
import { PlaceholderPage } from '@/components/ui/placeholder-page';

interface FeaturePlaceholderPageProps {
  featureSlug: string;
  featureName: string;
  currentPath: string;
  component?: string;
  title?: string;
  description?: string;
}

export function FeaturePlaceholderPage({
  component = 'Custom',
  title,
  description
}: FeaturePlaceholderPageProps) {
  const pageTitle = title || `${component} - Coming Soon`;
  const pageDescription = description || 'This functionality is coming soon.';

  return (
    <PlaceholderPage 
      title={pageTitle}
      description={pageDescription}
    />
  );
}