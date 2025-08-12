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
  'Settings', // KB Settings page
  'KBSettings', // Alternative name
]);

export const COMPONENT_REGISTRY: Record<string, React.ComponentType<any>> = {
  // Knowledge Base Components
  KBDashboard,
  KBDatabases,
  KBFiles,
  KBChat,
  KBAnalytics,
  KBSettings,
  // Map Settings to KBSettings for route compatibility
  Settings: KBSettings,
};

export function getComponent(componentName: string): React.ComponentType<any> {
  console.log('🔍 ComponentRegistry: Looking for component:', componentName);
  console.log('🔍 ComponentRegistry: IMPLEMENTED_COMPONENTS:', Array.from(IMPLEMENTED_COMPONENTS));
  
  // Always return placeholder unless explicitly marked as implemented
  if (!IMPLEMENTED_COMPONENTS.has(componentName)) {
    console.log(`🔍 ComponentRegistry: Component "${componentName}" not implemented, using placeholder`);
    const PlaceholderComponent = () => {
      console.log('🔍 ComponentRegistry: Rendering placeholder for:', componentName);
      return React.createElement(KBPlaceholderPage, {
        component: componentName,
        title: componentName,
        description: `This page is currently under construction.`
      });
    };
    return PlaceholderComponent;
  }
  
  const Component = COMPONENT_REGISTRY[componentName];
  if (!Component) {
    console.log(`🔍 ComponentRegistry: Component "${componentName}" marked as implemented but not found in registry, using placeholder`);
    const PlaceholderComponent = () => {
      console.log('🔍 ComponentRegistry: Rendering fallback placeholder for:', componentName);
      return React.createElement(KBPlaceholderPage, {
        component: componentName,
        title: componentName,
        description: `This page is currently under construction.`
      });
    };
    return PlaceholderComponent;
  }
  
  console.log('🔍 ComponentRegistry: Found implemented component:', componentName);
  return Component;
}

export function registerComponent(name: string, component: React.ComponentType<any>) {
  COMPONENT_REGISTRY[name] = component;
}