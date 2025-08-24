export interface Webhook {
  id: string;
  organization_id: string;
  name: string;
  webhook_url: string;
  http_method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers: Record<string, string>;
  payload_template: Record<string, any>;
  is_active: boolean;
  last_tested_at?: string;
  last_test_status?: 'success' | 'failure' | 'pending';
  last_error_message?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface WebhookInput {
  name: string;
  webhook_url: string;
  http_method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  payload_template?: Record<string, any>;
  is_active?: boolean;
}

export interface WebhookTestResult {
  success: boolean;
  status_code?: number;
  response_data?: any;
  error_message?: string;
  response_time_ms?: number;
}