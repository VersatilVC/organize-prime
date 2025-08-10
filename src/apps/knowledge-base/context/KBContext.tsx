import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useOrganizationData } from '@/contexts/OrganizationContext';
import { kbService } from '../services/kbService';
import { supabase } from '@/integrations/supabase/client';
import { useKBPermissions } from '../hooks/useKBPermissions';

export type KBPermissionKey = keyof ReturnType<typeof useKBPermissions>;

export interface KBConfiguration {
  id: string;
  name: string;
  display_name: string;
  is_default: boolean;
}

interface KBContextValue {
  currentKBId: string | null;
  setCurrentKBId: (id: string | null) => void;
  configurations: KBConfiguration[];
  isLoadingConfigs: boolean;
  permissions: ReturnType<typeof useKBPermissions>;
  processingFileCount: number;
  activeConversations: number;
}

const KBContext = createContext<KBContextValue | undefined>(undefined);

export function useKBContext() {
  const ctx = useContext(KBContext);
  if (!ctx) throw new Error('useKBContext must be used within KBProvider');
  return ctx;
}

export function KBProvider({ children }: { children: React.ReactNode }) {
  const { currentOrganization } = useOrganizationData();
  const orgId = currentOrganization?.id ?? null;
  const permissions = useKBPermissions();

  const [searchParams, setSearchParams] = useSearchParams();
  const [configurations, setConfigurations] = useState<KBConfiguration[]>([]);
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(false);
  const [processingFileCount, setProcessingFileCount] = useState(0);
  const [activeConversations, setActiveConversations] = useState(0);

  const currentKBId = searchParams.get('kbId');

  const setCurrentKBId = useCallback((id: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set('kbId', id); else next.delete('kbId');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // Load configurations
  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!orgId) return;
      try {
        setIsLoadingConfigs(true);
        const data = await kbService.listConfigurations(orgId);
        if (!isMounted) return;
        setConfigurations((data as any[]).map((c) => ({
          id: c.id,
          name: c.name,
          display_name: c.display_name,
          is_default: c.is_default,
        })));
      } catch (e) {
        console.error('Failed to load KB configurations', e);
      } finally {
        if (isMounted) setIsLoadingConfigs(false);
      }
    })();
    return () => { isMounted = false; };
  }, [orgId]);

  // Realtime subscriptions for processing status and conversations
  useEffect(() => {
    if (!orgId) return;
    const channel = (supabase as any)
      .channel('kb-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kb_files', filter: `organization_id=eq.${orgId}` }, (payload: any) => {
        // Recount processing files cheaply by increment/decrement when possible
        const newStatus = payload.new?.processing_status;
        const oldStatus = payload.old?.processing_status;
        if (oldStatus !== 'processing' && newStatus === 'processing') {
          setProcessingFileCount((c) => c + 1);
        } else if (oldStatus === 'processing' && newStatus !== 'processing') {
          setProcessingFileCount((c) => Math.max(0, c - 1));
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'kb_conversations', filter: `organization_id=eq.${orgId}` }, () => {
        setActiveConversations((c) => c + 1);
      })
      .subscribe();

    return () => {
      try { (supabase as any).removeChannel(channel); } catch {}
    };
  }, [orgId]);

  const value = useMemo<KBContextValue>(() => ({
    currentKBId,
    setCurrentKBId,
    configurations,
    isLoadingConfigs,
    permissions,
    processingFileCount,
    activeConversations,
  }), [currentKBId, setCurrentKBId, configurations, isLoadingConfigs, permissions, processingFileCount, activeConversations]);

  return <KBContext.Provider value={value}>{children}</KBContext.Provider>;
}
