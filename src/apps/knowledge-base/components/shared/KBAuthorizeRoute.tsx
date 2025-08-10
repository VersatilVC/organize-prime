import React from 'react';
import { Navigate } from 'react-router-dom';
import { useKBPermissions } from '@/apps/knowledge-base/hooks/useKBPermissions';

interface KBAuthorizeRouteProps {
  permissions?: Array<'can_upload' | 'can_chat' | 'can_create_kb' | 'can_manage_files' | 'can_view_analytics'>;
  children: React.ReactNode;
}

export function KBAuthorizeRoute({ permissions = [], children }: KBAuthorizeRouteProps) {
  const perms = useKBPermissions();

  const hasAll = permissions.every((p) => perms[p]);
  if (!hasAll) {
    return <Navigate to="/apps/knowledge-base/dashboard" replace />;
  }
  return <>{children}</>;
}
