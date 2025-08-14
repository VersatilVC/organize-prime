import React from 'react';
import { useLocation } from 'react-router-dom';

interface RouterGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RouterGuard({ children, fallback }: RouterGuardProps) {
  try {
    useLocation();
    return <>{children}</>;
  } catch {
    return <>{fallback || <div>Loading...</div>}</>;
  }
}