import type { FeaturePage } from './feature-pages';

export interface FeatureTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon_name: string;
  color_hex: string;
  version: string;
  author: string;
  tags: string[];
  default_config: {
    display_name: string;
    description: string;
    category: string;
    icon_name: string;
    color_hex: string;
    navigation_config: Record<string, any>;
    pages: FeaturePage[];
    required_tables: string[];
    webhook_endpoints: Record<string, any>;
    setup_sql: string | null;
    cleanup_sql: string | null;
  };
  dependencies: FeatureDependency[];
  requirements: {
    min_plan: string;
    required_permissions: string[];
    required_features: string[];
  };
  is_system_template: boolean;
  usage_count: number;
  rating: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeatureDependency {
  id: string;
  feature_slug: string;
  dependency_slug: string;
  dependency_type: 'required' | 'optional' | 'recommended';
  minimum_version?: string;
  description?: string;
  created_at: string;
}

export interface FeatureAnalytics {
  id: string;
  feature_slug: string;
  organization_id: string;
  event_type: 'install' | 'uninstall' | 'enable' | 'disable' | 'page_view' | 'action_trigger';
  event_data: Record<string, any>;
  user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface FeatureUsageStats {
  feature_slug: string;
  total_installs: number;
  active_installs: number;
  total_organizations: number;
  avg_rating: number;
  weekly_usage: {
    week_start: string;
    page_views: number;
    actions: number;
    active_users: number;
  }[];
  most_used_pages: {
    page_slug: string;
    page_title: string;
    view_count: number;
  }[];
}

export interface FeatureExport {
  version: string;
  exported_at: string;
  exported_by: string;
  features: {
    feature: Omit<FeatureTemplate, 'id' | 'created_at' | 'updated_at' | 'usage_count' | 'rating'>;
    dependencies: FeatureDependency[];
    analytics_summary?: {
      total_usage: number;
      avg_rating: number;
      popular_pages: string[];
    };
  }[];
}

export interface FeatureImportResult {
  success: boolean;
  imported_features: string[];
  skipped_features: string[];
  errors: {
    feature_slug: string;
    error: string;
  }[];
  warnings: string[];
}