import * as React from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ImpersonatedUser {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  email?: string;
}

interface ImpersonatedOrganization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

interface ImpersonationState {
  isImpersonating: boolean;
  originalUserId: string | null;
  impersonatedUser: ImpersonatedUser | null;
  impersonatedOrganization: ImpersonatedOrganization | null;
  startedAt: Date | null;
}

interface ImpersonationContextType {
  impersonationState: ImpersonationState;
  startImpersonation: (organization: ImpersonatedOrganization, user?: ImpersonatedUser) => Promise<void>;
  stopImpersonation: () => Promise<void>;
  logImpersonationAction: (action: string, details?: Record<string, any>) => Promise<void>;
}

const defaultState: ImpersonationState = {
  isImpersonating: false,
  originalUserId: null,
  impersonatedUser: null,
  impersonatedOrganization: null,
  startedAt: null,
};

const ImpersonationContext = React.createContext<ImpersonationContextType | undefined>(undefined);

export function ImpersonationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [impersonationState, setImpersonationState] = React.useState<ImpersonationState>(defaultState);

  // Reset impersonation state when user changes (logout/login)
  React.useEffect(() => {
    if (!user) {
      setImpersonationState(defaultState);
    }
  }, [user]);

  const logImpersonationAction = React.useCallback(async (action: string, details: Record<string, any> = {}) => {
    if (!user) return;

    try {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: `impersonation_${action}`,
        resource_type: 'user_impersonation',
        resource_id: impersonationState.impersonatedUser?.id || impersonationState.impersonatedOrganization?.id,
        details: {
          ...details,
          original_user_id: user.id,
          impersonated_user_id: impersonationState.impersonatedUser?.id,
          impersonated_organization_id: impersonationState.impersonatedOrganization?.id,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to log impersonation action:', error);
    }
  }, [user, impersonationState]);

  const startImpersonation = React.useCallback(async (
    organization: ImpersonatedOrganization,
    impersonatedUser?: ImpersonatedUser
  ) => {
    if (!user || !organization) {
      toast({
        title: "Invalid Selection",
        description: "Please select both organization and user to impersonate.",
        variant: "destructive",
      });
      return;
    }

    const newState: ImpersonationState = {
      isImpersonating: true,
      originalUserId: user.id,
      impersonatedUser: impersonatedUser || null,
      impersonatedOrganization: organization,
      startedAt: new Date(),
    };

    setImpersonationState(newState);

    await logImpersonationAction('started', {
      impersonated_user: impersonatedUser,
      impersonated_organization: organization,
    });

    toast({
      title: "Impersonation Started",
      description: impersonatedUser 
        ? `Now viewing as ${impersonatedUser.full_name || impersonatedUser.username || 'User'} in ${organization.name}`
        : `Now viewing ${organization.name}`,
      duration: 3000,
    });
  }, [user, toast, logImpersonationAction]);

  const stopImpersonation = React.useCallback(async () => {
    if (!impersonationState.isImpersonating) return;

    await logImpersonationAction('stopped', {
      duration_minutes: impersonationState.startedAt 
        ? Math.round((Date.now() - impersonationState.startedAt.getTime()) / 1000 / 60)
        : 0,
    });

    setImpersonationState(defaultState);

    toast({
      title: "Impersonation Ended",
      description: "Returned to your regular super admin view",
      duration: 2000,
    });
  }, [impersonationState, logImpersonationAction, toast]);

  const contextValue = React.useMemo(() => ({
    impersonationState,
    startImpersonation,
    stopImpersonation,
    logImpersonationAction,
  }), [impersonationState, startImpersonation, stopImpersonation, logImpersonationAction]);

  return React.createElement(
    ImpersonationContext.Provider,
    { value: contextValue },
    children
  );
}

export function useImpersonation() {
  const context = React.useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider');
  }
  return context;
}

export type { ImpersonatedUser, ImpersonatedOrganization, ImpersonationState };