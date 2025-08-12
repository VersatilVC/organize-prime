export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      admin_rate_limits: {
        Row: {
          action_type: string
          attempt_count: number | null
          blocked_until: string | null
          created_at: string | null
          id: string
          ip_address: unknown | null
          is_blocked: boolean | null
          last_attempt: string | null
          organization_id: string | null
          user_id: string | null
          window_start: string | null
        }
        Insert: {
          action_type: string
          attempt_count?: number | null
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          is_blocked?: boolean | null
          last_attempt?: string | null
          organization_id?: string | null
          user_id?: string | null
          window_start?: string | null
        }
        Update: {
          action_type?: string
          attempt_count?: number | null
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          is_blocked?: boolean | null
          last_attempt?: string | null
          organization_id?: string | null
          user_id?: string | null
          window_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_rate_limits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          organization_id: string | null
          permissions: Json | null
          rate_limit: number | null
          revoked_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          organization_id?: string | null
          permissions?: Json | null
          rate_limit?: number | null
          revoked_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          organization_id?: string | null
          permissions?: Json | null
          rate_limit?: number | null
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          changes: Json | null
          created_at: string | null
          id: string
          ip_address: unknown | null
          organization_id: string | null
          resource_id: string | null
          resource_name: string | null
          resource_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          organization_id?: string | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          organization_id?: string | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          content: string
          content_format: string | null
          created_at: string | null
          created_by: string | null
          generation_model: string | null
          generation_prompt: string | null
          id: string
          organization_id: string | null
          project_id: string | null
          reviewed_by: string | null
          status: string | null
          title: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          content: string
          content_format?: string | null
          created_at?: string | null
          created_by?: string | null
          generation_model?: string | null
          generation_prompt?: string | null
          id?: string
          organization_id?: string | null
          project_id?: string | null
          reviewed_by?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          content?: string
          content_format?: string | null
          created_at?: string | null
          created_by?: string | null
          generation_model?: string | null
          generation_prompt?: string | null
          id?: string
          organization_id?: string | null
          project_id?: string | null
          reviewed_by?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "content_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      content_projects: {
        Row: {
          assigned_to: string | null
          content_type: string
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          keywords: string[] | null
          organization_id: string | null
          status: string | null
          target_audience: string | null
          title: string
          tone: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          content_type: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          keywords?: string[] | null
          organization_id?: string | null
          status?: string | null
          target_audience?: string | null
          title: string
          tone?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          content_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          keywords?: string[] | null
          organization_id?: string | null
          status?: string | null
          target_audience?: string | null
          title?: string
          tone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_widgets: {
        Row: {
          configuration: Json | null
          created_at: string | null
          id: string
          is_visible: boolean | null
          organization_id: string | null
          position: number | null
          size: string | null
          title: string
          updated_at: string | null
          user_id: string | null
          widget_type: string
        }
        Insert: {
          configuration?: Json | null
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          organization_id?: string | null
          position?: number | null
          size?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
          widget_type: string
        }
        Update: {
          configuration?: Json | null
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          organization_id?: string | null
          position?: number | null
          size?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
          widget_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_widgets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_access_logs: {
        Row: {
          access_granted: boolean | null
          access_type: string
          created_at: string | null
          denial_reason: string | null
          feature_slug: string
          id: string
          ip_address: unknown | null
          organization_id: string | null
          user_id: string | null
        }
        Insert: {
          access_granted?: boolean | null
          access_type: string
          created_at?: string | null
          denial_reason?: string | null
          feature_slug: string
          id?: string
          ip_address?: unknown | null
          organization_id?: string | null
          user_id?: string | null
        }
        Update: {
          access_granted?: boolean | null
          access_type?: string
          created_at?: string | null
          denial_reason?: string | null
          feature_slug?: string
          id?: string
          ip_address?: unknown | null
          organization_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_access_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_analytics: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          feature_slug: string
          id: string
          ip_address: unknown | null
          organization_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          feature_slug: string
          id?: string
          ip_address?: unknown | null
          organization_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          feature_slug?: string
          id?: string
          ip_address?: unknown | null
          organization_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      feature_dependencies: {
        Row: {
          created_at: string | null
          dependency_slug: string
          dependency_type: string
          description: string | null
          feature_slug: string
          id: string
          minimum_version: string | null
        }
        Insert: {
          created_at?: string | null
          dependency_slug: string
          dependency_type?: string
          description?: string | null
          feature_slug: string
          id?: string
          minimum_version?: string | null
        }
        Update: {
          created_at?: string | null
          dependency_slug?: string
          dependency_type?: string
          description?: string | null
          feature_slug?: string
          id?: string
          minimum_version?: string | null
        }
        Relationships: []
      }
      feature_templates: {
        Row: {
          author: string
          category: string
          color_hex: string
          created_at: string | null
          created_by: string | null
          default_config: Json
          dependencies: Json | null
          description: string
          icon_name: string
          id: string
          is_system_template: boolean | null
          name: string
          rating: number | null
          requirements: Json | null
          tags: string[] | null
          updated_at: string | null
          usage_count: number | null
          version: string
        }
        Insert: {
          author: string
          category?: string
          color_hex?: string
          created_at?: string | null
          created_by?: string | null
          default_config?: Json
          dependencies?: Json | null
          description: string
          icon_name?: string
          id?: string
          is_system_template?: boolean | null
          name: string
          rating?: number | null
          requirements?: Json | null
          tags?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
          version?: string
        }
        Update: {
          author?: string
          category?: string
          color_hex?: string
          created_at?: string | null
          created_by?: string | null
          default_config?: Json
          dependencies?: Json | null
          description?: string
          icon_name?: string
          id?: string
          is_system_template?: boolean | null
          name?: string
          rating?: number | null
          requirements?: Json | null
          tags?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
          version?: string
        }
        Relationships: []
      }
      feature_webhooks: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          endpoint_url: string
          feature_id: string | null
          headers: Json | null
          id: string
          is_active: boolean | null
          last_tested_at: string | null
          method: string | null
          name: string
          retry_attempts: number | null
          test_response: string | null
          test_status: string | null
          timeout_seconds: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          endpoint_url: string
          feature_id?: string | null
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          last_tested_at?: string | null
          method?: string | null
          name: string
          retry_attempts?: number | null
          test_response?: string | null
          test_status?: string | null
          timeout_seconds?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          endpoint_url?: string
          feature_id?: string | null
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          last_tested_at?: string | null
          method?: string | null
          name?: string
          retry_attempts?: number | null
          test_response?: string | null
          test_status?: string | null
          timeout_seconds?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_webhooks_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "system_features"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          admin_response: string | null
          attachments: string[] | null
          category: string | null
          created_at: string | null
          description: string
          id: string
          internal_notes: string | null
          organization_id: string | null
          priority: string | null
          resolution_notes: string | null
          responded_at: string | null
          responded_by: string | null
          status: string | null
          status_history: Json | null
          subject: string
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_response?: string | null
          attachments?: string[] | null
          category?: string | null
          created_at?: string | null
          description: string
          id?: string
          internal_notes?: string | null
          organization_id?: string | null
          priority?: string | null
          resolution_notes?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string | null
          status_history?: Json | null
          subject: string
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_response?: string | null
          attachments?: string[] | null
          category?: string | null
          created_at?: string | null
          description?: string
          id?: string
          internal_notes?: string | null
          organization_id?: string | null
          priority?: string | null
          resolution_notes?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string | null
          status_history?: Json | null
          subject?: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          created_at: string | null
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          folder_path: string | null
          id: string
          is_public: boolean | null
          metadata: Json | null
          mime_type: string | null
          organization_id: string | null
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          folder_path?: string | null
          id?: string
          is_public?: boolean | null
          metadata?: Json | null
          mime_type?: string | null
          organization_id?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          folder_path?: string | null
          id?: string
          is_public?: boolean | null
          metadata?: Json | null
          mime_type?: string | null
          organization_id?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      help_articles: {
        Row: {
          category: string
          content: string
          created_at: string | null
          created_by: string | null
          helpful_count: number | null
          id: string
          is_published: boolean | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          category: string
          content: string
          created_at?: string | null
          created_by?: string | null
          helpful_count?: number | null
          id?: string
          is_published?: boolean | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string | null
          created_by?: string | null
          helpful_count?: number | null
          id?: string
          is_published?: boolean | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          message: string | null
          organization_id: string | null
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          message?: string | null
          organization_id?: string | null
          role?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          message?: string | null
          organization_id?: string | null
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_analytics: {
        Row: {
          created_at: string
          event_type: string
          id: string
          kb_config_id: string | null
          organization_id: string
          processing_time_ms: number | null
          tokens_consumed: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          kb_config_id?: string | null
          organization_id: string
          processing_time_ms?: number | null
          tokens_consumed?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          kb_config_id?: string | null
          organization_id?: string
          processing_time_ms?: number | null
          tokens_consumed?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      kb_configurations: {
        Row: {
          chunk_overlap: number
          chunk_size: number
          created_at: string
          created_by: string | null
          description: string | null
          display_name: string
          embedding_model: string
          file_count: number
          id: string
          is_default: boolean
          is_premium: boolean
          name: string
          organization_id: string
          status: string
          total_vectors: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          chunk_overlap?: number
          chunk_size?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_name: string
          embedding_model?: string
          file_count?: number
          id?: string
          is_default?: boolean
          is_premium?: boolean
          name: string
          organization_id: string
          status?: string
          total_vectors?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          chunk_overlap?: number
          chunk_size?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_name?: string
          embedding_model?: string
          file_count?: number
          id?: string
          is_default?: boolean
          is_premium?: boolean
          name?: string
          organization_id?: string
          status?: string
          total_vectors?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      kb_conversations: {
        Row: {
          created_at: string | null
          id: string
          kb_config_id: string | null
          last_message_at: string | null
          max_tokens: number | null
          message_count: number | null
          model: string | null
          organization_id: string | null
          summary: string | null
          temperature: number | null
          title: string | null
          total_tokens_used: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          kb_config_id?: string | null
          last_message_at?: string | null
          max_tokens?: number | null
          message_count?: number | null
          model?: string | null
          organization_id?: string | null
          summary?: string | null
          temperature?: number | null
          title?: string | null
          total_tokens_used?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          kb_config_id?: string | null
          last_message_at?: string | null
          max_tokens?: number | null
          message_count?: number | null
          model?: string | null
          organization_id?: string | null
          summary?: string | null
          temperature?: number | null
          title?: string | null
          total_tokens_used?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_documents: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          created_by: string | null
          embedding_status: string | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          id: string
          organization_id: string | null
          processing_status: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          updated_by: string | null
          word_count: number | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          embedding_status?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          organization_id?: string | null
          processing_status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          updated_by?: string | null
          word_count?: number | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          embedding_status?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          organization_id?: string | null
          processing_status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_files: {
        Row: {
          chunk_count: number | null
          created_at: string | null
          extracted_text_length: number | null
          file_hash: string | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          kb_config_id: string | null
          metadata: Json | null
          mime_type: string | null
          organization_id: string | null
          original_name: string
          processing_completed_at: string | null
          processing_error: string | null
          processing_progress: number | null
          processing_started_at: string | null
          processing_status: string | null
          updated_at: string | null
          uploaded_by: string | null
          vector_count: number | null
        }
        Insert: {
          chunk_count?: number | null
          created_at?: string | null
          extracted_text_length?: number | null
          file_hash?: string | null
          file_name: string
          file_path: string
          file_size: number
          id?: string
          kb_config_id?: string | null
          metadata?: Json | null
          mime_type?: string | null
          organization_id?: string | null
          original_name: string
          processing_completed_at?: string | null
          processing_error?: string | null
          processing_progress?: number | null
          processing_started_at?: string | null
          processing_status?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          vector_count?: number | null
        }
        Update: {
          chunk_count?: number | null
          created_at?: string | null
          extracted_text_length?: number | null
          file_hash?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          kb_config_id?: string | null
          metadata?: Json | null
          mime_type?: string | null
          organization_id?: string | null
          original_name?: string
          processing_completed_at?: string | null
          processing_error?: string | null
          processing_progress?: number | null
          processing_started_at?: string | null
          processing_status?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          vector_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_messages: {
        Row: {
          confidence_score: number | null
          content: string
          context_length: number | null
          conversation_id: string | null
          created_at: string | null
          id: string
          message_type: string
          metadata: Json | null
          model_used: string | null
          organization_id: string | null
          response_time_ms: number | null
          source_count: number | null
          sources: Json | null
          temperature_used: number | null
          tokens_used: number | null
        }
        Insert: {
          confidence_score?: number | null
          content: string
          context_length?: number | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          message_type: string
          metadata?: Json | null
          model_used?: string | null
          organization_id?: string | null
          response_time_ms?: number | null
          source_count?: number | null
          sources?: Json | null
          temperature_used?: number | null
          tokens_used?: number | null
        }
        Update: {
          confidence_score?: number | null
          content?: string
          context_length?: number | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          message_type?: string
          metadata?: Json | null
          model_used?: string | null
          organization_id?: string | null
          response_time_ms?: number | null
          source_count?: number | null
          sources?: Json | null
          temperature_used?: number | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "kb_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_searches: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string | null
          query: string
          results_count: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id?: string | null
          query: string
          results_count?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string | null
          query?: string
          results_count?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_searches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string | null
          department: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          joined_at: string | null
          organization_id: string | null
          position: string | null
          role: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          organization_id?: string | null
          position?: string | null
          role?: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          organization_id?: string | null
          position?: string | null
          role?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          category: string | null
          created_at: string | null
          data: Json | null
          id: string
          message: string
          organization_id: string | null
          read: boolean | null
          read_at: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          action_url?: string | null
          category?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          message: string
          organization_id?: string | null
          read?: boolean | null
          read_at?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          action_url?: string | null
          category?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string
          organization_id?: string | null
          read?: boolean | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_feature_configs: {
        Row: {
          created_at: string | null
          created_by: string | null
          feature_slug: string
          id: string
          is_enabled: boolean | null
          is_user_accessible: boolean | null
          org_menu_order: number | null
          organization_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          feature_slug: string
          id?: string
          is_enabled?: boolean | null
          is_user_accessible?: boolean | null
          org_menu_order?: number | null
          organization_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          feature_slug?: string
          id?: string
          is_enabled?: boolean | null
          is_user_accessible?: boolean | null
          org_menu_order?: number | null
          organization_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_feature_configs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_features: {
        Row: {
          created_at: string | null
          enabled_at: string | null
          enabled_by: string | null
          feature_id: string | null
          feature_settings: Json | null
          id: string
          is_enabled: boolean | null
          organization_id: string | null
          setup_error: string | null
          setup_status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enabled_at?: string | null
          enabled_by?: string | null
          feature_id?: string | null
          feature_settings?: Json | null
          id?: string
          is_enabled?: boolean | null
          organization_id?: string | null
          setup_error?: string | null
          setup_status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enabled_at?: string | null
          enabled_by?: string | null
          feature_id?: string | null
          feature_settings?: Json | null
          id?: string
          is_enabled?: boolean | null
          organization_id?: string | null
          setup_error?: string | null
          setup_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_features_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "system_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_features_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          key: string
          organization_id: string | null
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          key: string
          organization_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          key?: string
          organization_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          security_settings: Json | null
          settings: Json | null
          slug: string
          subscription_expires_at: string | null
          subscription_plan: string | null
          subscription_status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          security_settings?: Json | null
          settings?: Json | null
          slug: string
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          security_settings?: Json | null
          settings?: Json | null
          slug?: string
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          first_login_completed: boolean | null
          full_name: string | null
          id: string
          is_super_admin: boolean | null
          last_login_at: string | null
          last_login_ip: unknown | null
          mfa_enabled: boolean | null
          mfa_secret: string | null
          phone_number: string | null
          preferences: Json | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          first_login_completed?: boolean | null
          full_name?: string | null
          id: string
          is_super_admin?: boolean | null
          last_login_at?: string | null
          last_login_ip?: unknown | null
          mfa_enabled?: boolean | null
          mfa_secret?: string | null
          phone_number?: string | null
          preferences?: Json | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          first_login_completed?: boolean | null
          full_name?: string | null
          id?: string
          is_super_admin?: boolean | null
          last_login_at?: string | null
          last_login_ip?: unknown | null
          mfa_enabled?: boolean | null
          mfa_secret?: string | null
          phone_number?: string | null
          preferences?: Json | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action_type: string
          count: number | null
          created_at: string | null
          id: string
          identifier: string
          window_start: string | null
        }
        Insert: {
          action_type: string
          count?: number | null
          created_at?: string | null
          id?: string
          identifier: string
          window_start?: string | null
        }
        Update: {
          action_type?: string
          count?: number | null
          created_at?: string | null
          id?: string
          identifier?: string
          window_start?: string | null
        }
        Relationships: []
      }
      search_history: {
        Row: {
          clicked_results: Json | null
          created_at: string | null
          filters: Json | null
          id: string
          organization_id: string | null
          query: string
          results_count: number | null
          user_id: string | null
        }
        Insert: {
          clicked_results?: Json | null
          created_at?: string | null
          filters?: Json | null
          id?: string
          organization_id?: string | null
          query: string
          results_count?: number | null
          user_id?: string | null
        }
        Update: {
          clicked_results?: Json | null
          created_at?: string | null
          filters?: Json | null
          id?: string
          organization_id?: string | null
          query?: string
          results_count?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          created_at: string | null
          event_description: string
          event_metadata: Json | null
          event_severity: string | null
          event_type: string
          id: string
          ip_address: unknown | null
          organization_id: string | null
          request_headers: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_description: string
          event_metadata?: Json | null
          event_severity?: string | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          organization_id?: string | null
          request_headers?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_description?: string
          event_metadata?: Json | null
          event_severity?: string | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          organization_id?: string | null
          request_headers?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at: string | null
          canceled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          metadata: Json | null
          organization_id: string | null
          plan_name: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
        }
        Insert: {
          cancel_at?: string | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          plan_name: string
          status: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          cancel_at?: string | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          plan_name?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      system_feature_configs: {
        Row: {
          category: string | null
          color_hex: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          display_name: string | null
          feature_pages: Json | null
          feature_slug: string
          icon_name: string | null
          id: string
          is_enabled_globally: boolean | null
          is_marketplace_visible: boolean | null
          navigation_config: Json | null
          system_menu_order: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          category?: string | null
          color_hex?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name?: string | null
          feature_pages?: Json | null
          feature_slug: string
          icon_name?: string | null
          id?: string
          is_enabled_globally?: boolean | null
          is_marketplace_visible?: boolean | null
          navigation_config?: Json | null
          system_menu_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          category?: string | null
          color_hex?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name?: string | null
          feature_pages?: Json | null
          feature_slug?: string
          icon_name?: string | null
          id?: string
          is_enabled_globally?: boolean | null
          is_marketplace_visible?: boolean | null
          navigation_config?: Json | null
          system_menu_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      system_features: {
        Row: {
          category: string
          cleanup_sql: string | null
          color_hex: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          display_name: string
          icon_name: string | null
          id: string
          is_active: boolean | null
          is_system_feature: boolean | null
          name: string
          navigation_config: Json | null
          required_tables: Json | null
          setup_sql: string | null
          slug: string
          sort_order: number | null
          updated_at: string | null
          webhook_endpoints: Json | null
        }
        Insert: {
          category?: string
          cleanup_sql?: string | null
          color_hex?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name: string
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          is_system_feature?: boolean | null
          name: string
          navigation_config?: Json | null
          required_tables?: Json | null
          setup_sql?: string | null
          slug: string
          sort_order?: number | null
          updated_at?: string | null
          webhook_endpoints?: Json | null
        }
        Update: {
          category?: string
          cleanup_sql?: string | null
          color_hex?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name?: string
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          is_system_feature?: boolean | null
          name?: string
          navigation_config?: Json | null
          required_tables?: Json | null
          setup_sql?: string | null
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
          webhook_endpoints?: Json | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_sensitive: boolean | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_sensitive?: boolean | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_sensitive?: boolean | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      user_feature_access: {
        Row: {
          created_at: string | null
          created_by: string | null
          feature_slug: string
          id: string
          is_enabled: boolean | null
          organization_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          feature_slug: string
          id?: string
          is_enabled?: boolean | null
          organization_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          feature_slug?: string
          id?: string
          is_enabled?: boolean | null
          organization_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_feature_access_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string | null
          created_by: string | null
          events: string[]
          failure_count: number | null
          headers: Json | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          name: string
          organization_id: string | null
          secret: string | null
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          events: string[]
          failure_count?: number | null
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name: string
          organization_id?: string | null
          secret?: string | null
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          events?: string[]
          failure_count?: number | null
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name?: string
          organization_id?: string | null
          secret?: string | null
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          actions: Json
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          organization_id: string | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          actions: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          organization_id?: string | null
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          actions?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          organization_id?: string | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: {
        Args: { p_token: string }
        Returns: Json
      }
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      check_rate_limit: {
        Args:
          | {
              p_identifier: string
              p_action_type: string
              p_limit?: number
              p_window_minutes?: number
            }
          | {
              p_user_id: string
              p_action_type: string
              p_organization_id?: string
              p_ip_address?: unknown
              p_max_attempts?: number
              p_window_minutes?: number
            }
        Returns: boolean
      }
      cleanup_security_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_organization_vector_table: {
        Args: { org_name: string; table_suffix?: string }
        Returns: string
      }
      create_templated_notification: {
        Args: {
          p_template_type: string
          p_user_id: string
          p_organization_id: string
          p_variables?: Json
          p_action_url?: string
        }
        Returns: string
      }
      delete_feedback_with_files: {
        Args: { feedback_id: string }
        Returns: boolean
      }
      execute_kb_workflow: {
        Args: {
          workflow_name: string
          payload: Json
          org_id: string
          user_id_param?: string
        }
        Returns: Json
      }
      extract_org_id_from_path: {
        Args: { file_path: string }
        Returns: string
      }
      get_dashboard_stats: {
        Args: { p_user_id: string; p_organization_id?: string; p_role?: string }
        Returns: Json
      }
      get_dashboard_stats_optimized: {
        Args: {
          p_organization_id: string
          p_user_id: string
          p_is_super_admin?: boolean
        }
        Returns: Json
      }
      get_feature_usage_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          feature_slug: string
          total_installs: number
          active_installs: number
          total_organizations: number
          avg_rating: number
          weekly_usage: Json
          most_used_pages: Json
        }[]
      }
      get_invitation_by_token: {
        Args: { p_token: string }
        Returns: {
          id: string
          organization_id: string
          role: string
          invited_by: string
          organization_name: string
          invited_by_name: string
          message: string
          expires_at: string
          is_valid: boolean
        }[]
      }
      get_invitations_optimized: {
        Args: {
          p_user_id: string
          p_organization_id: string
          p_page?: number
          p_page_size?: number
        }
        Returns: {
          invitation_id: string
          email: string
          role: string
          token: string
          message: string
          created_at: string
          expires_at: string
          accepted_at: string
          invited_by: string
          organization_id: string
          invited_by_name: string
          total_count: number
        }[]
      }
      get_kb_analytics: {
        Args: {
          org_id: string
          date_range_start?: string
          date_range_end?: string
          metrics?: string[]
          kb_config_id_filter?: string
        }
        Returns: Json
      }
      get_kb_conversations: {
        Args: {
          org_id: string
          user_id_param: string
          user_role?: string
          kb_config_id_filter?: string
          limit_count?: number
          offset_count?: number
        }
        Returns: Json
      }
      get_kb_dashboard_stats: {
        Args: { org_id: string; user_id_param: string; user_role?: string }
        Returns: Json
      }
      get_kb_permissions: {
        Args: { org_id: string }
        Returns: Json
      }
      get_notification_template: {
        Args: { template_type: string }
        Returns: Json
      }
      get_organization_users: {
        Args: {
          p_organization_id: string
          p_requesting_user_id: string
          p_include_emails?: boolean
        }
        Returns: Json
      }
      get_performance_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          table_name: string
          row_count: number
          active_count: number
        }[]
      }
      get_security_dashboard_stats: {
        Args: { p_days?: number }
        Returns: Json
      }
      get_system_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_user_current_organization: {
        Args: { user_id: string }
        Returns: string
      }
      get_user_effective_features: {
        Args: { p_user_id: string; p_organization_id: string }
        Returns: {
          feature_slug: string
          is_enabled: boolean
          menu_order: number
          source: string
        }[]
      }
      get_user_emails_for_super_admin: {
        Args: { user_ids: string[] }
        Returns: {
          user_id: string
          email: string
        }[]
      }
      get_user_organizations: {
        Args: Record<PropertyKey, never>
        Returns: {
          organization_id: string
        }[]
      }
      get_users_optimized: {
        Args: {
          p_user_id: string
          p_organization_id?: string
          p_role?: string
          p_page?: number
          p_page_size?: number
          p_search?: string
        }
        Returns: {
          user_id: string
          full_name: string
          username: string
          avatar_url: string
          last_login_at: string
          email: string
          role: string
          status: string
          joined_at: string
          organization_id: string
          organization_name: string
          total_count: number
        }[]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hash_api_key: {
        Args: { key_text: string }
        Returns: string
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      initialize_default_kb: {
        Args: { org_id: string; org_name: string }
        Returns: string
      }
      is_kb_admin: {
        Args: { org_id: string }
        Returns: boolean
      }
      is_org_admin: {
        Args: { org_id: string }
        Returns: boolean
      }
      is_org_admin_for_org: {
        Args: { user_id: string; org_id: string }
        Returns: boolean
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      log_security_event: {
        Args: {
          p_user_id: string
          p_organization_id: string
          p_action: string
          p_resource_type: string
          p_resource_id: string
          p_ip_address?: unknown
          p_user_agent?: string
          p_details?: Json
        }
        Returns: string
      }
      manage_kb_configuration: {
        Args: {
          org_id: string
          config_data: Json
          user_id_param: string
          action?: string
        }
        Returns: Json
      }
      render_notification_template: {
        Args: { template_type: string; variables?: Json }
        Returns: {
          title: string
          message: string
        }[]
      }
      sanitize_input: {
        Args: { input_text: string }
        Returns: string
      }
      search_kb_files: {
        Args: {
          org_id: string
          search_query?: string
          kb_config_id_filter?: string
          status_filter?: string
          limit_count?: number
          offset_count?: number
        }
        Returns: Json
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      test_rls_security: {
        Args: Record<PropertyKey, never>
        Returns: {
          table_name: string
          rls_enabled: boolean
          policy_count: number
          test_result: string
        }[]
      }
      track_kb_usage: {
        Args: {
          org_id: string
          user_id_param: string
          event_type: string
          event_data?: Json
          kb_config_id_param?: string
          processing_time_ms?: number
          tokens_consumed?: number
        }
        Returns: undefined
      }
      update_user_profile_and_role: {
        Args: {
          p_user_id: string
          p_full_name?: string
          p_username?: string
          p_new_role?: string
          p_organization_id?: string
          p_requesting_user_id?: string
        }
        Returns: Json
      }
      user_has_org_access: {
        Args: { user_id: string; org_id: string }
        Returns: boolean
      }
      validate_email: {
        Args: { email_text: string }
        Returns: boolean
      }
      validate_password_strength: {
        Args: { password_text: string }
        Returns: Json
      }
      validate_session_security: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      verify_api_key: {
        Args: { key_text: string; hash_text: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
