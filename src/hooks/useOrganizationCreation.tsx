// Placeholder for backward compatibility - domain logic removed for now
export function useOrganizationCreation() {
  return {
    showOrgSetup: false,
    setupUser: null,
    setShowOrgSetup: () => {},
    handlePostAuthSetup: (user: any) => {},
    createPersonalOrganization: (name: string) => {},
    isPersonalDomain: () => false,
    showSetup: false,
    onSetupSuccess: () => {},
    onSetupOpenChange: (open: boolean) => {}
  };
}