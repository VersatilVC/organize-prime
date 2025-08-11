import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { EmptyState } from '@/components/composition/EmptyState';

interface FeatureErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface FeatureErrorBoundaryProps {
  children: React.ReactNode;
  featureName?: string;
}

export class FeatureErrorBoundary extends React.Component<
  FeatureErrorBoundaryProps,
  FeatureErrorBoundaryState
> {
  constructor(props: FeatureErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): FeatureErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Feature Error:', error, errorInfo);
    // You could send this to an error reporting service
  }

  render() {
    if (this.state.hasError) {
      return (
        <EmptyState
          icon={AlertTriangle}
          title="Feature Error"
          description={`Something went wrong with the ${this.props.featureName || 'feature'}. Please try refreshing the page.`}
          action={{
            label: "Refresh Page",
            onClick: () => window.location.reload()
          }}
        />
      );
    }

    return this.props.children;
  }
}