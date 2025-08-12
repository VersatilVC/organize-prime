import React from 'react';
import { PlaceholderPage } from '@/components/ui/placeholder-page';

interface KBPlaceholderPageProps {
  component: string;
  title: string;
  description?: string;
}

export function KBPlaceholderPage({ title, description }: KBPlaceholderPageProps) {
  return (
    <PlaceholderPage 
      title={title}
      description={description}
    />
  );
}