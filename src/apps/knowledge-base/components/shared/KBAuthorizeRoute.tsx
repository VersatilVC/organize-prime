import React from 'react';
import { Navigate } from 'react-router-dom';
import { useKBPermissions } from '@/apps/knowledge-base/hooks/useKBPermissions';
import { IMPLEMENTED_COMPONENTS } from '@/apps/shared/utils/componentRegistry';

interface KBAuthorizeRouteProps {
  permissions?: Array<'can_upload' | 'can_chat' | 'can_create_kb' | 'can_manage_files' | 'can_view_analytics'>;
  children: React.ReactNode;
  component?: string;
}

export function KBAuthorizeRoute({ permissions = [], children, component }: KBAuthorizeRouteProps) {
  const perms = useKBPermissions();

  // Allow access to placeholder pages regardless of permissions
  const isPlaceholderPage = component && !IMPLEMENTED_COMPONENTS.has(component);
  if (isPlaceholderPage) {
    return <>{children}</>;
  }

  const hasAll = permissions.every((p) => perms[p]);
  if (!hasAll) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
