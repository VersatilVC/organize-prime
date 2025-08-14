import React from 'react';
import { useAuth } from '../AuthProvider';
import { useDomainLogic } from '../hooks/useDomainLogic';
import { OrganizationSetupModal } from './OrganizationSetupModal';

export function DomainLogicHandler() {
  const { user } = useAuth();
  const {
    showOrgSetup,
    setupUser,
    setShowOrgSetup,
    handlePostAuthSetup,
    createPersonalOrganization
  } = useDomainLogic();

  // Handle post-auth setup when user changes
  React.useEffect(() => {
    if (user && user.email) {
      handlePostAuthSetup(user);
    }
  }, [user, handlePostAuthSetup]);

  return <OrganizationSetupModal />;
}