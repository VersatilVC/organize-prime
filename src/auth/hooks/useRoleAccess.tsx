import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../AuthProvider';

export type UserRole = 'super_admin' | 'admin' | 'user';

interface UserProfile {
  is_super_admin: boolean;
}

interface Membership {
  role: string;
  organization_id: string;
  status: string;
}

export function useRoleAccess() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<UserRole>('user');
  const [organizations, setOrganizations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setUserRole('user');
      setOrganizations([]);
      setLoading(false);
      return;
    }

    const fetchUserRole = async () => {
      try {
        // Check if user is super admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_super_admin')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.is_super_admin) {
          setUserRole('super_admin');
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
        setUserRole(finalRole);
      } catch (error) {
        console.error('Error fetching user role:', error);
        setUserRole('user');
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  const hasRole = (requiredRole: UserRole): boolean => {
    const roleHierarchy: Record<UserRole, number> = {
      'user': 1,
      'admin': 2,
      'super_admin': 3
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  };

  const isOrgAdmin = (organizationId: string): boolean => {
    return userRole === 'super_admin' || 
           (userRole === 'admin' && organizations.includes(organizationId));
  };

  return {
    userRole,
    organizations,
    loading,
    hasRole,
    isOrgAdmin
  };
}