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

  console.log('🔍 KBAuthorizeRoute: Checking permissions for component:', component);
  console.log('🔍 KBAuthorizeRoute: Required permissions:', permissions);
  console.log('🔍 KBAuthorizeRoute: User permissions:', perms);
  console.log('🔍 KBAuthorizeRoute: IMPLEMENTED_COMPONENTS:', Array.from(IMPLEMENTED_COMPONENTS));

  // Allow access to placeholder pages regardless of permissions
  const isPlaceholderPage = component && !IMPLEMENTED_COMPONENTS.has(component);
  console.log('🔍 KBAuthorizeRoute: Is placeholder page:', isPlaceholderPage);
  
  if (isPlaceholderPage) {
    console.log('🔍 KBAuthorizeRoute: Allowing placeholder page access');
    return <>{children}</>;
  }

  const hasAll = permissions.every((p) => perms[p]);
  console.log('🔍 KBAuthorizeRoute: Has all permissions:', hasAll);
  
  if (!hasAll) {
    console.log('🔍 KBAuthorizeRoute: Redirecting due to insufficient permissions');
    return <Navigate to="/" replace />;
  }
  
  console.log('🔍 KBAuthorizeRoute: Allowing access');
  return <>{children}</>;
}
