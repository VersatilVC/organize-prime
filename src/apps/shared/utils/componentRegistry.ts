import React from 'react';

// Knowledge Base Components
import KBDashboard from '@/apps/knowledge-base/pages/KBDashboard';
import KBDatabases from '@/apps/knowledge-base/pages/KBDatabases';
import KBFiles from '@/apps/knowledge-base/pages/KBFiles';
import KBChat from '@/apps/knowledge-base/pages/KBChat';
import KBAnalytics from '@/apps/knowledge-base/pages/KBAnalytics';
import KBSettings from '@/apps/knowledge-base/pages/KBSettings';
import { KBPlaceholderPage } from '@/apps/knowledge-base/components/KBPlaceholderPage';

export const COMPONENT_REGISTRY: Record<string, React.ComponentType<any>> = {
  // Knowledge Base Components
  KBDashboard,
  KBDatabases,
  KBFiles,
  KBChat,
  KBAnalytics,
  KBSettings,
  
  // Generic Components
  Dashboard: KBDashboard, // Fallback mapping
  Databases: KBDatabases,
  Files: KBFiles,
  Chat: KBChat,
  Analytics: KBAnalytics,
  Settings: KBSettings,
};

export function getComponent(componentName: string): React.ComponentType<any> {
  console.log('🔍 ComponentRegistry: Looking for component:', componentName);
  const Component = COMPONENT_REGISTRY[componentName];
  
  if (!Component) {
    console.log(`🔍 ComponentRegistry: Component "${componentName}" not found in registry, using placeholder`);
    return () => React.createElement(KBPlaceholderPage, {
      component: componentName,
      title: componentName,
      description: `Component "${componentName}" is not yet implemented.`
    });
  }
  
  console.log('🔍 ComponentRegistry: Found component:', componentName);
  return Component;
}

export function registerComponent(name: string, component: React.ComponentType<any>) {
  COMPONENT_REGISTRY[name] = component;
}