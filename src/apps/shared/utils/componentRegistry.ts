import React from 'react';
import { KBPlaceholderPage } from '@/apps/knowledge-base/components/KBPlaceholderPage';

// Lazy load the ManageKnowledgeBases component
const ManageKnowledgeBases = React.lazy(() => import('@/features/knowledge-base/pages/ManageKnowledgeBases'));

// Only implemented components - everything else gets placeholder
export const IMPLEMENTED_COMPONENTS: Set<string> = new Set([
  'Dashboard', // KB Dashboard/Manage Knowledgebases page is implemented
  'Chat',      // KB Chat page is implemented
  'ManageKnowledgeBases' // New KB management page
  // Analytics, Files, Settings are NOT implemented - will show placeholders
]);

// Registry with implemented components
export const COMPONENT_REGISTRY: Record<string, React.ComponentType<any>> = {
  'ManageKnowledgeBases': ManageKnowledgeBases,
};

export function getComponent(componentName: string): React.ComponentType<any> {
  const isDev = import.meta.env.DEV;
  
  if (isDev) {
    console.log('🔍 ComponentRegistry: Looking for component:', componentName);
    console.log('🔍 ComponentRegistry: IMPLEMENTED_COMPONENTS:', Array.from(IMPLEMENTED_COMPONENTS));
  }
  
  // Always return placeholder unless explicitly marked as implemented
  if (!IMPLEMENTED_COMPONENTS.has(componentName)) {
    if (isDev) console.log(`🔍 ComponentRegistry: Component "${componentName}" not implemented, using placeholder`);
    const PlaceholderComponent = () => {
      if (isDev) console.log('🔍 ComponentRegistry: Rendering placeholder for:', componentName);
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
    if (isDev) console.log(`🔍 ComponentRegistry: Component "${componentName}" marked as implemented but not found in registry, using placeholder`);
    const PlaceholderComponent = () => {
      if (isDev) console.log('🔍 ComponentRegistry: Rendering fallback placeholder for:', componentName);
      return React.createElement(KBPlaceholderPage, {
        component: componentName,
        title: componentName,
        description: `This page is currently under construction.`
      });
    };
    return PlaceholderComponent;
  }
  
  if (isDev) console.log('🔍 ComponentRegistry: Found implemented component:', componentName);
  return Component;
}

export function registerComponent(name: string, component: React.ComponentType<any>) {
  COMPONENT_REGISTRY[name] = component;
}