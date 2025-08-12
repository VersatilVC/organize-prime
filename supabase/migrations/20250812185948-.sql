-- Fix Knowledge Base navigation config to remove unwanted pages and set correct routes
UPDATE system_features 
SET navigation_config = '{
  "pages": [
    {
      "id": 1754999413838,
      "title": "Manage Knowledgebases", 
      "route": "/manage-knowledgebases",
      "description": "This page is for managing your knowledgebases, we recommend starting with a general company one and then moving on to industry, competitor and news knowledgebases.",
      "component": "Dashboard",
      "permissions": ["read", "write", "admin", "super_admin"],
      "isDefault": true,
      "menuOrder": 0,
      "icon": "Database"
    },
    {
      "id": 1754999413839,
      "title": "AI Chat",
      "route": "/chat", 
      "description": "Chat with your knowledge bases using AI",
      "component": "Chat",
      "permissions": ["read", "write", "admin", "super_admin"],
      "isDefault": false,
      "menuOrder": 1,
      "icon": "MessageSquare"
    }
  ]
}'::jsonb
WHERE slug = 'knowledge-base';