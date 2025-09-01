import { supabase } from '@/integrations/supabase/client';
import { Organization } from '@/contexts/OrganizationContext';
import { ImpersonatedUser, ImpersonatedOrganization } from '@/contexts/ImpersonationContext';

export interface UserWithMembership {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  email?: string;
  role: string;
  status: string;
  joined_at: string | null;
}

/**
 * Fetch all organizations in the system (super admin only)
 */
export async function getAllOrganizations(): Promise<Organization[]> {
  const { data, error } = await supabase
    .from('organizations')
    .select(`
      id,
      name,
      slug,
      logo_url,
      is_active,
      created_at,
      updated_at
    `)
    .eq('is_active', true)
    .order('name');

  if (error) {
    throw new Error(`Failed to fetch all organizations: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch all users in a specific organization (super admin only)
 */
export async function getAllUsersInOrganization(organizationId: string): Promise<UserWithMembership[]> {
  const { data, error } = await supabase
    .from('memberships')
    .select(`
      role,
      status,
      joined_at,
      profiles!inner (
        id,
        full_name,
        username,
        avatar_url
      )
    `)
    .eq('organization_id', organizationId)
    .eq('status', 'active');

  if (error) {
    throw new Error(`Failed to fetch users for organization: ${error.message}`);
  }

  const users = data?.map(membership => ({
    id: membership.profiles.id,
    full_name: membership.profiles.full_name,
    username: membership.profiles.username,
    avatar_url: membership.profiles.avatar_url,
    role: membership.role,
    status: membership.status,
    joined_at: membership.joined_at,
  })) || [];

  // Sort by full_name in JavaScript since Supabase doesn't support ordering by joined table columns directly
  return users.sort((a, b) => {
    const nameA = a.full_name || a.username || '';
    const nameB = b.full_name || b.username || '';
    return nameA.localeCompare(nameB);
  });
}

/**
 * Get detailed user information for impersonation
 */
export async function getUserForImpersonation(userId: string): Promise<ImpersonatedUser | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, username, avatar_url')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch user for impersonation: ${error.message}`);
  }

  return data ? {
    id: data.id,
    full_name: data.full_name,
    username: data.username,
    avatar_url: data.avatar_url,
  } : null;
}

/**
 * Convert Organization to ImpersonatedOrganization
 */
export function toImpersonatedOrganization(org: Organization): ImpersonatedOrganization {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    logo_url: org.logo_url,
  };
}

/**
 * Convert UserWithMembership to ImpersonatedUser
 */
export function toImpersonatedUser(user: UserWithMembership): ImpersonatedUser {
  return {
    id: user.id,
    full_name: user.full_name,
    username: user.username,
    avatar_url: user.avatar_url,
    email: user.email,
  };
}

/**
 * Verify if current user is a super admin
 */
export async function verifySuperAdminStatus(): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('is_super_admin');

  if (error) {
    console.error('Failed to verify super admin status:', error);
    return false;
  }

  return data === true;
}

/**
 * Get user's effective role in a specific organization (accounting for impersonation)
 */
export async function getUserRoleInOrganization(
  userId: string, 
  organizationId: string
): Promise<{ role: string; isSuperAdmin: boolean; isOrgAdmin: boolean }> {
  // First check if user is super admin
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Failed to fetch user profile: ${profileError.message}`);
  }

  const isSuperAdmin = profile?.is_super_admin || false;

  if (isSuperAdmin) {
    return {
      role: 'super_admin',
      isSuperAdmin: true,
      isOrgAdmin: false,
    };
  }

  // Get organization membership
  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .maybeSingle();

  if (membershipError) {
    throw new Error(`Failed to fetch membership: ${membershipError.message}`);
  }

  const role = membership?.role || 'user';
  const isOrgAdmin = role === 'admin';

  return {
    role,
    isSuperAdmin: false,
    isOrgAdmin,
  };
}