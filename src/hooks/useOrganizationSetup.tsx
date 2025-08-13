import { useState, useEffect } from 'react';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';

export function useOrganizationSetup() {
  const { user } = useEnhancedAuth();
  const { organizations, loading: orgLoading } = useOrganization();
  const [showSetup, setShowSetup] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (!user || !user.email || orgLoading || hasChecked) return;

    // Check if user has personal email domain and no organizations
    const domain = user.email.split('@')[1];
    const personalDomains = ['gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com', 'icloud.com', 'aol.com'];
    
    const isPersonalDomain = personalDomains.includes(domain);
    const hasNoOrganizations = organizations.length === 0;

    // Show setup for personal domain users with no organizations
    if (isPersonalDomain && hasNoOrganizations) {
      // Add a small delay to ensure all auth/org loading is complete
      const timer = setTimeout(() => {
        setShowSetup(true);
        setHasChecked(true);
      }, 1500);
      
      return () => clearTimeout(timer);
    } else {
      setHasChecked(true);
    }
  }, [user, organizations, orgLoading, hasChecked]);

  const handleSetupSuccess = () => {
    setShowSetup(false);
    // Refresh the page to update organization context
    window.location.reload();
  };

  const handleSetupClose = (open: boolean) => {
    setShowSetup(open);
    // Mark as checked even if user closes without completing
    if (!open) {
      setHasChecked(true);
    }
  };

  return {
    showSetup,
    onSetupSuccess: handleSetupSuccess,
    onSetupOpenChange: handleSetupClose,
  };
}