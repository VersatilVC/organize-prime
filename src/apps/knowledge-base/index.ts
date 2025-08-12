// Knowledge Base App Components Registry
import { registerComponent } from '@/apps/shared/utils/componentRegistry';
import { KBDashboard } from './components/KBDashboard';
import { KBChat } from './components/KBChat';

// Register implemented KB components
registerComponent('Dashboard', KBDashboard);
registerComponent('Chat', KBChat);

// Export components for direct imports
export { KBDashboard, KBChat };