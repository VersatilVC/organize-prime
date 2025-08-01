import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from './useUserRole';
import { useOrganization } from '@/contexts/OrganizationContext';

interface DashboardStats {
  organizations: number;
  users: number;
  notifications: number;
  files: number;
  loading: boolean;
}

export function useDashboardData(): DashboardStats {
  const { user } = useAuth();
  const { role } = useUserRole();
  const { currentOrganization } = useOrganization();
  const [stats, setStats] = useState<DashboardStats>({
    organizations: 0,
    users: 0,
    notifications: 0,
    files: 0,
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      setStats({ organizations: 0, users: 0, notifications: 0, files: 0, loading: false });
      return;
    }

    // Don't fetch until we have the role data loaded
    if (!role || (role === 'admin' && !currentOrganization)) {
      return;
    }

    const fetchStats = async () => {
      try {
        let organizationsCount = 0;
        let usersCount = 0;
        let notificationsCount = 0;
        let filesCount = 0;

        if (role === 'super_admin') {
          // Super Admin sees system-wide stats
          const [orgsResult, usersResult, notificationsResult, filesResult] = await Promise.all([
            supabase.from('organizations').select('id', { count: 'exact', head: true }),
            supabase.from('profiles').select('id', { count: 'exact', head: true }),
            supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('read', false),
            supabase.from('files').select('id', { count: 'exact', head: true }),
          ]);

          organizationsCount = orgsResult.count || 0;
          usersCount = usersResult.count || 0;
          notificationsCount = notificationsResult.count || 0;
          filesCount = filesResult.count || 0;

        } else if (role === 'admin' && currentOrganization) {
          // Company Admin sees organization-specific stats
          const [membershipsResult, invitationsResult, notificationsResult, filesResult] = await Promise.all([
            supabase.from('memberships').select('id', { count: 'exact', head: true })
              .eq('organization_id', currentOrganization.id)
              .eq('status', 'active'),
            supabase.from('invitations').select('id', { count: 'exact', head: true })
              .eq('organization_id', currentOrganization.id)
              .is('accepted_at', null),
            supabase.from('notifications').select('id', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('read', false),
            supabase.from('files').select('id', { count: 'exact', head: true })
              .eq('organization_id', currentOrganization.id),
          ]);

          organizationsCount = 1; // Current organization
          usersCount = membershipsResult.count || 0;
          notificationsCount = notificationsResult.count || 0;
          filesCount = filesResult.count || 0;

        } else {
          // Regular user sees personal stats
          const [orgsResult, notificationsResult, filesResult] = await Promise.all([
            supabase.from('memberships').select('id', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('status', 'active'),
            supabase.from('notifications').select('id', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('read', false),
            supabase.from('files').select('id', { count: 'exact', head: true })
              .eq('uploaded_by', user.id),
          ]);

          organizationsCount = orgsResult.count || 0;
          usersCount = 0; // Users don't see other users
          notificationsCount = notificationsResult.count || 0;
          filesCount = filesResult.count || 0;
        }

        setStats({
          organizations: organizationsCount,
          users: usersCount,
          notifications: notificationsCount,
          files: filesCount,
          loading: false,
        });

      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        setStats({ organizations: 0, users: 0, notifications: 0, files: 0, loading: false });
      }
    };

    fetchStats();
  }, [user?.id, role, currentOrganization?.id]); // Use more specific dependencies

  return stats;
}