export const KB_ROUTES = [
  {
    path: '/apps/knowledge-base/dashboard',
    component: 'KBDashboard',
    title: 'Dashboard',
    roles: ['user', 'admin', 'super_admin'],
    permissions: ['can_upload', 'can_chat'] as const,
  },
  {
    path: '/apps/knowledge-base/databases',
    component: 'KBDatabases',
    title: 'Knowledge Bases',
    roles: ['user', 'admin', 'super_admin'],
    permissions: ['can_upload'] as const,
  },
  {
    path: '/apps/knowledge-base/files',
    component: 'KBFiles',
    title: 'File Management',
    roles: ['user', 'admin', 'super_admin'],
    permissions: ['can_upload'] as const,
  },
  {
    path: '/apps/knowledge-base/chat',
    component: 'KBChat',
    title: 'AI Chat',
    roles: ['user', 'admin', 'super_admin'],
    permissions: ['can_chat'] as const,
  },
  {
    path: '/apps/knowledge-base/analytics',
    component: 'KBAnalytics',
    title: 'Analytics',
    roles: ['admin', 'super_admin'],
    permissions: ['can_view_analytics'] as const,
  },
  {
    path: '/apps/knowledge-base/settings',
    component: 'KBSettings',
    title: 'Settings',
    roles: ['admin', 'super_admin'],
    permissions: ['can_create_kb', 'can_manage_files'] as const,
  },
] as const;

export type KBRoute = (typeof KB_ROUTES)[number];
