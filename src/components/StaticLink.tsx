import React from 'react';

interface StaticLinkProps {
  to: string;
  children: React.ReactNode;
  className?: string;
}

export function StaticLink({ to, children, className }: StaticLinkProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.href = to;
  };

  return (
    <a href={to} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}