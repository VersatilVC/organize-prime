import { useOptimizedUserRole } from '@/hooks/database/useOptimizedUserRole';

export function useKBPermissions() {
  const { role, isSuperAdmin } = useOptimizedUserRole();
  const isAdmin = isSuperAdmin || role === 'admin' || role === 'super_admin';

  return {
    can_upload: isAdmin,
    can_chat: true,
    can_create_kb: isAdmin,
    can_manage_files: isAdmin,
    can_view_analytics: isAdmin,
  } as const;
}
