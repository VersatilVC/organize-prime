import React from 'react';
import { Navigate } from 'react-router-dom';
import { useKBPermissions } from '@/apps/knowledge-base/hooks/useKBPermissions';
import { IMPLEMENTED_COMPONENTS } from '@/apps/shared/utils/componentRegistry';
import { logger } from '@/lib/secure-logger';

interface KBAuthorizeRouteProps {
  permissions?: Array<'can_upload' | 'can_chat' | 'can_create_kb' | 'can_manage_files' | 'can_view_analytics'>;
  children: React.ReactNode;
  component?: string;
}

export function KBAuthorizeRoute({ permissions = [], children, component }: KBAuthorizeRouteProps) {
  const perms = useKBPermissions();

  logger.debug('KB authorization check', {
    component: 'KBAuthorizeRoute',
    action: 'permission_check'
  });

  // Allow access to placeholder pages regardless of permissions
  const isPlaceholderPage = component && !IMPLEMENTED_COMPONENTS.has(component);
  if (isPlaceholderPage) {
    logger.debug('Allowing placeholder page access');
    return <>{children}</>;
  }

  const hasAll = permissions.every((p) => perms[p]);
  if (!hasAll) {
    logger.debug('Insufficient permissions for KB route');
    return <Navigate to="/" replace />;
  }
  
  logger.debug('KB route access granted');
  return <>{children}</>;
}
