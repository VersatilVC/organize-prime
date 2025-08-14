import React from 'react';
import { useLocation } from 'react-router-dom';

interface SafeLinkProps {
  to: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function SafeLink({ to, children, className, onClick }: SafeLinkProps) {
  // Check if we can safely use React Router
  let canUseRouter = true;
  try {
    useLocation();
  } catch {
    canUseRouter = false;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onClick?.();
    
    if (canUseRouter) {
      // Use programmatic navigation if router is available
      window.history.pushState(null, '', to);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else {
      // Fallback to direct navigation
      window.location.href = to;
    }
  };

  return (
    <a href={to} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}