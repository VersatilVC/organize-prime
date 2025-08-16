import React from 'react';
import { KBPlaceholderPage } from '@/apps/knowledge-base/components/KBPlaceholderPage';

// Lazy load the Knowledge Base components
const ManageKnowledgeBases = React.lazy(() => import('@/features/knowledge-base/pages/ManageKnowledgeBases'));
const ManageFiles = React.lazy(() => import('@/features/knowledge-base/pages/ManageFiles'));
const Chat = React.lazy(() => import('@/features/knowledge-base/pages/Chat'));
const ChatSettings = React.lazy(() => import('@/features/knowledge-base/chat/pages/ChatSettingsPage').then(module => ({ default: module.ChatSettingsPage })));

// Only implemented components - everything else gets placeholder
export const IMPLEMENTED_COMPONENTS: Set<string> = new Set([
  'Dashboard', // KB Dashboard/Manage Knowledgebases page is implemented
  'Chat',      // KB Chat page is implemented
  'ManageKnowledgeBases', // KB management page
  'ManageFiles', // KB file management page
  'ChatSettings' // KB chat settings page is implemented
  // Analytics, Settings are NOT implemented - will show placeholders
]);

// Registry with implemented components
export const COMPONENT_REGISTRY: Record<string, React.ComponentType<any>> = {
  'ManageKnowledgeBases': ManageKnowledgeBases,
  'ManageFiles': ManageFiles,
  'Chat': Chat,
  'ChatSettings': ChatSettings,
};

export function getComponent(componentName: string): React.ComponentType<any> {
  const isDev = import.meta.env.DEV;
  
  // Reduced logging to prevent flashing - only log when component not found
  // if (isDev) {
  //   console.log('🔍 ComponentRegistry: Looking for component:', componentName);
  //   console.log('🔍 ComponentRegistry: IMPLEMENTED_COMPONENTS:', Array.from(IMPLEMENTED_COMPONENTS));
  // }
  
  // Always return placeholder unless explicitly marked as implemented
  if (!IMPLEMENTED_COMPONENTS.has(componentName)) {
    if (isDev) console.log(`🔍 ComponentRegistry: Component "${componentName}" not implemented, using placeholder`);
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
    if (isDev) console.log(`🔍 ComponentRegistry: Component "${componentName}" marked as implemented but not found in registry, using placeholder`);
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
  return Component;
}

export function registerComponent(name: string, component: React.ComponentType<any>) {
  COMPONENT_REGISTRY[name] = component;
}