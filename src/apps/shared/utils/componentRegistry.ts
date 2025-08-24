import React from 'react';
import { KBPlaceholderPage } from '@/apps/knowledge-base/components/KBPlaceholderPage';

// Lazy load the Knowledge Base components
const ManageKnowledgeBases = React.lazy(() => import('@/features/knowledge-base/pages/ManageKnowledgeBases'));
const ManageFiles = React.lazy(() => import('@/features/knowledge-base/pages/ManageFiles'));
const Chat = React.lazy(() => import('@/apps/knowledge-base/components/KBChat'));
// Direct import to ensure component loads properly
const AIChatSettings = React.lazy(() => 
  import('@/apps/knowledge-base/pages/KnowledgeBaseAIChatSettings').then(module => ({ 
    default: module.default 
  }))
);
// ChatSettings removed - now using simple chat interface

// Only implemented components - everything else gets placeholder
export const IMPLEMENTED_COMPONENTS: Set<string> = new Set([
  'Dashboard', // KB Dashboard/Manage Knowledgebases page is implemented
  'Chat',      // KB Chat page is implemented
  'ManageKnowledgeBases', // KB management page
  'ManageFiles', // KB file management page
  'AIChatSettings', // AI Chat Settings page is implemented
  // Analytics, Settings are NOT implemented - will show placeholders
]);

// Registry with implemented components
export const COMPONENT_REGISTRY: Record<string, React.ComponentType<any>> = {
  'ManageKnowledgeBases': ManageKnowledgeBases,
  'ManageFiles': ManageFiles,
  'Chat': Chat,
  'AIChatSettings': AIChatSettings,
};

export function getComponent(componentName: string): React.ComponentType<any> {
  const isDev = import.meta.env.DEV;
  
  // Enhanced debugging
  if (isDev) {
    console.log('🔍 ComponentRegistry: Looking for component:', componentName);
    console.log('🔍 ComponentRegistry: IMPLEMENTED_COMPONENTS:', Array.from(IMPLEMENTED_COMPONENTS));
    console.log('🔍 ComponentRegistry: Has component?', IMPLEMENTED_COMPONENTS.has(componentName));
    console.log('🔍 ComponentRegistry: Available components:', Object.keys(COMPONENT_REGISTRY));
  }
  
  // Always return placeholder unless explicitly marked as implemented
  if (!IMPLEMENTED_COMPONENTS.has(componentName)) {
    if (isDev) console.log(`❌ ComponentRegistry: Component "${componentName}" not implemented, using placeholder`);
    const PlaceholderComponent = () => {
      // Reduced logging to prevent excessive re-renders
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
    if (isDev) console.log(`❌ ComponentRegistry: Component "${componentName}" marked as implemented but not found in registry, using placeholder`);
    const PlaceholderComponent = () => {
      // Reduced logging to prevent excessive re-renders
      return React.createElement(KBPlaceholderPage, {
        component: componentName,
        title: componentName,
        description: `This page is currently under construction.`
      });
    };
    return PlaceholderComponent;
  }
  
  // Component found successfully
  if (isDev) console.log(`✅ ComponentRegistry: Component "${componentName}" found successfully`);
  return Component;
}

export function registerComponent(name: string, component: React.ComponentType<any>) {
  COMPONENT_REGISTRY[name] = component;
}