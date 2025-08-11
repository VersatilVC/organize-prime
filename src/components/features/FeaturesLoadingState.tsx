import React from 'react';
import { Loader2 } from 'lucide-react';

interface FeaturesLoadingStateProps {
  message?: string;
}

export function FeaturesLoadingState({ 
  message = "Loading features..." 
}: FeaturesLoadingStateProps) {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin mr-2" />
      <span className="text-muted-foreground">{message}</span>
    </div>
  );
}