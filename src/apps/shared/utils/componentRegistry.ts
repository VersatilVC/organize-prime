import React from 'react';

// Knowledge Base Components
import KBDashboard from '@/apps/knowledge-base/pages/KBDashboard';
import KBDatabases from '@/apps/knowledge-base/pages/KBDatabases';
import KBFiles from '@/apps/knowledge-base/pages/KBFiles';
import KBChat from '@/apps/knowledge-base/pages/KBChat';
import KBAnalytics from '@/apps/knowledge-base/pages/KBAnalytics';
import KBSettings from '@/apps/knowledge-base/pages/KBSettings';
import { KBPlaceholderPage } from '@/apps/knowledge-base/components/KBPlaceholderPage';

// Only implemented components - everything else gets placeholder
export const IMPLEMENTED_COMPONENTS: Set<string> = new Set([
  // Add component names here when they're ready for production
  // Example: 'KBDashboard', 'KBSettings'
]);

export const COMPONENT_REGISTRY: Record<string, React.ComponentType<any>> = {
  // Knowledge Base Components
  KBDashboard,
  KBDatabases,
  KBFiles,
  KBChat,
  KBAnalytics,
  KBSettings,
};

export function getComponent(componentName: string): React.ComponentType<any> {
  console.log('🔍 ComponentRegistry: Looking for component:', componentName);
  
  // Always return placeholder unless explicitly marked as implemented
  if (!IMPLEMENTED_COMPONENTS.has(componentName)) {
    console.log(`🔍 ComponentRegistry: Component "${componentName}" not implemented, using placeholder`);
    return () => React.createElement(KBPlaceholderPage, {
      component: componentName,
      title: componentName,
      description: `This page is currently under construction.`
    });
  }
  
  const Component = COMPONENT_REGISTRY[componentName];
  if (!Component) {
    console.log(`🔍 ComponentRegistry: Component "${componentName}" marked as implemented but not found in registry, using placeholder`);
    return () => React.createElement(KBPlaceholderPage, {
      component: componentName,
      title: componentName,
      description: `This page is currently under construction.`
    });
  }
  
  console.log('🔍 ComponentRegistry: Found implemented component:', componentName);
  return Component;
}

export function registerComponent(name: string, component: React.ComponentType<any>) {
  COMPONENT_REGISTRY[name] = component;
}