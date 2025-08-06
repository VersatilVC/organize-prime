-- Insert missing default categories for unified category system
INSERT INTO app_categories (name, slug, description, color_hex, icon_name, sort_order, is_active)
VALUES 
  ('Productivity', 'productivity', 'Tools to enhance team productivity and efficiency', '#3b82f6', 'Zap', 100, true),
  ('Analytics', 'analytics', 'Data analysis and reporting tools', '#10b981', 'BarChart3', 101, true),
  ('Intelligence', 'intelligence', 'AI-powered insights and market intelligence', '#8b5cf6', 'Brain', 102, true)
ON CONFLICT (slug) DO NOTHING;