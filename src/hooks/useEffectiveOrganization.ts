import { useMemo } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';

/**
 * Hook that provides the effective organization and organization ID 
 * taking impersonation state into account
 */
export function useEffectiveOrganization() {
  const { getEffectiveOrganization, getEffectiveOrganizationId } = useOrganization();
  const { impersonationState } = useImpersonation();

  const effectiveOrganization = useMemo(() => {
    return getEffectiveOrganization(impersonationState);
  }, [getEffectiveOrganization, impersonationState]);

  const effectiveOrganizationId = useMemo(() => {
    return getEffectiveOrganizationId(impersonationState);
  }, [getEffectiveOrganizationId, impersonationState]);

  return {
    effectiveOrganization,
    effectiveOrganizationId,
    isImpersonating: impersonationState.isImpersonating,
    impersonatedOrganization: impersonationState.impersonatedOrganization,
    impersonatedUser: impersonationState.impersonatedUser,
  };
}