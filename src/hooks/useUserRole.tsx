import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'super_admin' | 'admin' | 'user';

interface UserProfile {
  is_super_admin: boolean;
}

interface Membership {
  role: string;
  organization_id: string;
  status: string;
}

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>('user');
  const [organizations, setOrganizations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔍 useUserRole: Effect triggered', { user: !!user, userId: user?.id });
    if (!user) {
      console.log('🔍 useUserRole: No user, setting defaults');
      setRole('user');
      setOrganizations([]);
      setLoading(false);
      return;
    }

    const fetchUserRole = async () => {
      console.log('🔍 useUserRole: Starting fetchUserRole for user:', user.id);
      try {
        // Check if user is super admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_super_admin')
          .eq('id', user.id)
          .single();

        if (profile?.is_super_admin) {
          console.log('🔍 useUserRole: User is super admin');
          setRole('super_admin');
          setLoading(false);
          return;
        }

        // Get user memberships to check for admin roles
        const { data: memberships } = await supabase
          .from('memberships')
          .select('role, organization_id, status')
          .eq('user_id', user.id)
          .eq('status', 'active');

        const orgIds = memberships?.map(m => m.organization_id) || [];
        setOrganizations(orgIds);

        // Check if user is admin in any organization
        const isAdmin = memberships?.some(m => m.role === 'admin');
        const finalRole = isAdmin ? 'admin' : 'user';
        console.log('🔍 useUserRole: Final role determined:', { finalRole, membershipCount: memberships?.length });
        setRole(finalRole);
      } catch (error) {
        console.error('🔍 useUserRole: Error fetching user role:', error);
        setRole('user');
      } finally {
        console.log('🔍 useUserRole: Setting loading to false');
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  return { role, organizations, loading };
}