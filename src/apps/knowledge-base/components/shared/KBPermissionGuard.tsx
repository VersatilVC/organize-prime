import React from 'react';
import { useOptimizedUserRole } from '@/hooks/database/useOptimizedUserRole';

interface KBPermissionGuardProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  can?: 'can_upload' | 'can_chat' | 'can_create_kb' | 'can_manage_files' | 'can_view_analytics';
}

export function KBPermissionGuard({ children, adminOnly, can }: KBPermissionGuardProps) {
  const { role, isSuperAdmin } = useOptimizedUserRole();
  const isAdmin = isSuperAdmin || role === 'admin' || role === 'super_admin';

  if (adminOnly && !isAdmin) return null;

  // Fine-grained permissions could be mapped here; for now, admins can do everything, users limited
  if (can && !isAdmin) {
    const userAllowed = can === 'can_chat';
    if (!userAllowed) return null;
  }

  return <>{children}</>;
}
