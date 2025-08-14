import React from 'react';

interface RouterGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RouterGuard({ children, fallback }: RouterGuardProps) {
  // Simple check - if React is available, render children
  if (typeof React === 'object' && React !== null) {
    return <>{children}</>;
  }
  return <>{fallback || <div>Loading...</div>}</>;
}