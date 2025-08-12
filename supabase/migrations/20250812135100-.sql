-- Update the knowledge-base feature navigation_config to use proper pages structure
UPDATE system_feature_configs 
SET navigation_config = '{
  "pages": [
    {
      "id": "dashboard",
      "title": "Dashboard", 
      "route": "/apps/knowledge-base/dashboard",
      "component": "KBDashboard",
      "permissions": [],
      "icon": "home",
      "menuOrder": 0,
      "isDefault": true
    },
    {
      "id": "databases",
      "title": "Knowledge Bases",
      "route": "/apps/knowledge-base/databases", 
      "component": "KBDatabases",
      "permissions": [],
      "icon": "database",
      "menuOrder": 1,
      "isDefault": false
    },
    {
      "id": "files", 
      "title": "Files",
      "route": "/apps/knowledge-base/files",
      "component": "KBFiles", 
      "permissions": [],
      "icon": "file",
      "menuOrder": 2,
      "isDefault": false
    },
    {
      "id": "chat",
      "title": "AI Chat",
      "route": "/apps/knowledge-base/chat",
      "component": "KBChat",
      "permissions": [],
      "icon": "message-square", 
      "menuOrder": 3,
      "isDefault": false
    },
    {
      "id": "analytics",
      "title": "Analytics",
      "route": "/apps/knowledge-base/analytics",
      "component": "KBAnalytics",
      "permissions": ["admin"],
      "icon": "bar-chart-3",
      "menuOrder": 4,
      "isDefault": false
    },
    {
      "id": "settings",
      "title": "Settings", 
      "route": "/apps/knowledge-base/settings",
      "component": "KBSettings",
      "permissions": ["admin"],
      "icon": "settings",
      "menuOrder": 5,
      "isDefault": false
    }
  ]
}'::jsonb
WHERE feature_slug = 'knowledge-base';