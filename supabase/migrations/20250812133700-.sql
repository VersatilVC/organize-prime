-- Update the knowledge-base feature navigation_config to include all pages from kbConfig.ts
UPDATE system_feature_configs 
SET navigation_config = '[
  {
    "id": "dashboard",
    "title": "Dashboard", 
    "route": "/apps/knowledge-base/dashboard",
    "component": "Dashboard",
    "permissions": [],
    "icon": "home",
    "menuOrder": 0,
    "isDefault": true
  },
  {
    "id": "databases",
    "title": "Knowledge Bases",
    "route": "/apps/knowledge-base/databases", 
    "component": "Databases",
    "permissions": [],
    "icon": "database",
    "menuOrder": 1,
    "isDefault": false
  },
  {
    "id": "files", 
    "title": "Files",
    "route": "/apps/knowledge-base/files",
    "component": "Files", 
    "permissions": [],
    "icon": "file",
    "menuOrder": 2,
    "isDefault": false
  },
  {
    "id": "chat",
    "title": "Chat",
    "route": "/apps/knowledge-base/chat",
    "component": "Chat",
    "permissions": [],
    "icon": "message-square", 
    "menuOrder": 3,
    "isDefault": false
  },
  {
    "id": "analytics",
    "title": "Analytics",
    "route": "/apps/knowledge-base/analytics",
    "component": "Analytics",
    "permissions": ["admin"],
    "icon": "bar-chart-3",
    "menuOrder": 4,
    "isDefault": false
  },
  {
    "id": "settings",
    "title": "Settings", 
    "route": "/apps/knowledge-base/settings",
    "component": "Settings",
    "permissions": ["admin"],
    "icon": "settings",
    "menuOrder": 5,
    "isDefault": false
  }
]'::jsonb
WHERE feature_slug = 'knowledge-base';