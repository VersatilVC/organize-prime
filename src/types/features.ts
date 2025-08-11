export interface SystemFeature {
  id: string;
  name: string;
  display_name: string;
  slug: string;
  description: string | null;
  category: string;
  icon_name: string;
  color_hex: string;
  is_active: boolean;
  is_system_feature: boolean;
  sort_order: number;
  navigation_config: Record<string, any>;
  required_tables: string[];
  webhook_endpoints: Record<string, any>;
  setup_sql: string | null;
  cleanup_sql: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeatureWebhook {
  id: string;
  feature_id: string | null;
  name: string;
  description: string | null;
  endpoint_url: string;
  method: string;
  headers: Record<string, any>;
  timeout_seconds: number;
  retry_attempts: number;
  is_active: boolean;
  last_tested_at: string | null;
  test_status: 'success' | 'failed' | 'pending' | null;
  test_response: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}