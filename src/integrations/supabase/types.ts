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
      app_categories: {
        Row: {
          color_hex: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          color_hex?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          color_hex?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
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
      marketplace_app_analytics: {
        Row: {
          app_id: string | null
          created_at: string | null
          event_category: string | null
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          organization_id: string | null
          page_path: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          app_id?: string | null
          created_at?: string | null
          event_category?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          organization_id?: string | null
          page_path?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          app_id?: string | null
          created_at?: string | null
          event_category?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          organization_id?: string | null
          page_path?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_app_analytics_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "marketplace_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_app_analytics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_app_installations: {
        Row: {
          app_id: string | null
          app_settings: Json | null
          created_at: string | null
          custom_navigation: Json | null
          feature_flags: Json | null
          id: string
          installation_type: string | null
          installed_at: string | null
          installed_by: string | null
          last_used_at: string | null
          organization_id: string | null
          status: string | null
          uninstalled_at: string | null
          uninstalled_by: string | null
          updated_at: string | null
          usage_stats: Json | null
        }
        Insert: {
          app_id?: string | null
          app_settings?: Json | null
          created_at?: string | null
          custom_navigation?: Json | null
          feature_flags?: Json | null
          id?: string
          installation_type?: string | null
          installed_at?: string | null
          installed_by?: string | null
          last_used_at?: string | null
          organization_id?: string | null
          status?: string | null
          uninstalled_at?: string | null
          uninstalled_by?: string | null
          updated_at?: string | null
          usage_stats?: Json | null
        }
        Update: {
          app_id?: string | null
          app_settings?: Json | null
          created_at?: string | null
          custom_navigation?: Json | null
          feature_flags?: Json | null
          id?: string
          installation_type?: string | null
          installed_at?: string | null
          installed_by?: string | null
          last_used_at?: string | null
          organization_id?: string | null
          status?: string | null
          uninstalled_at?: string | null
          uninstalled_by?: string | null
          updated_at?: string | null
          usage_stats?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_app_installations_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "marketplace_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_app_installations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_app_reviews: {
        Row: {
          app_id: string | null
          cons: string[] | null
          created_at: string | null
          helpful_count: number | null
          id: string
          is_featured: boolean | null
          is_verified: boolean | null
          organization_id: string | null
          pros: string[] | null
          rating: number
          review_text: string | null
          review_title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          app_id?: string | null
          cons?: string[] | null
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_featured?: boolean | null
          is_verified?: boolean | null
          organization_id?: string | null
          pros?: string[] | null
          rating: number
          review_text?: string | null
          review_title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          app_id?: string | null
          cons?: string[] | null
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_featured?: boolean | null
          is_verified?: boolean | null
          organization_id?: string | null
          pros?: string[] | null
          rating?: number
          review_text?: string | null
          review_title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_app_reviews_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "marketplace_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_app_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_apps: {
        Row: {
          app_config: Json | null
          approved_at: string | null
          approved_by: string | null
          banner_url: string | null
          base_price: number | null
          category: string
          changelog: string | null
          compatibility_version: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          dashboard_config: Json | null
          database_tables: string[] | null
          demo_url: string | null
          description: string
          documentation_url: string | null
          github_repo_url: string | null
          icon_name: string | null
          icon_url: string | null
          id: string
          install_count: number | null
          is_active: boolean | null
          is_featured: boolean | null
          is_system_app: boolean | null
          long_description: string | null
          lovable_project_url: string | null
          n8n_webhooks: Json | null
          name: string
          navigation_config: Json | null
          pricing_model: string
          rating_average: number | null
          rating_count: number | null
          required_permissions: string[] | null
          requires_approval: boolean | null
          screenshots: string[] | null
          settings_schema: Json | null
          slug: string
          subcategory: string | null
          updated_at: string | null
          version: string | null
        }
        Insert: {
          app_config?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          banner_url?: string | null
          base_price?: number | null
          category?: string
          changelog?: string | null
          compatibility_version?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          dashboard_config?: Json | null
          database_tables?: string[] | null
          demo_url?: string | null
          description: string
          documentation_url?: string | null
          github_repo_url?: string | null
          icon_name?: string | null
          icon_url?: string | null
          id?: string
          install_count?: number | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_system_app?: boolean | null
          long_description?: string | null
          lovable_project_url?: string | null
          n8n_webhooks?: Json | null
          name: string
          navigation_config?: Json | null
          pricing_model?: string
          rating_average?: number | null
          rating_count?: number | null
          required_permissions?: string[] | null
          requires_approval?: boolean | null
          screenshots?: string[] | null
          settings_schema?: Json | null
          slug: string
          subcategory?: string | null
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          app_config?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          banner_url?: string | null
          base_price?: number | null
          category?: string
          changelog?: string | null
          compatibility_version?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          dashboard_config?: Json | null
          database_tables?: string[] | null
          demo_url?: string | null
          description?: string
          documentation_url?: string | null
          github_repo_url?: string | null
          icon_name?: string | null
          icon_url?: string | null
          id?: string
          install_count?: number | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_system_app?: boolean | null
          long_description?: string | null
          lovable_project_url?: string | null
          n8n_webhooks?: Json | null
          name?: string
          navigation_config?: Json | null
          pricing_model?: string
          rating_average?: number | null
          rating_count?: number | null
          required_permissions?: string[] | null
          requires_approval?: boolean | null
          screenshots?: string[] | null
          settings_schema?: Json | null
          slug?: string
          subcategory?: string | null
          updated_at?: string | null
          version?: string | null
        }
        Relationships: []
      }
      marketplace_settings: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
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
          is_public?: boolean | null
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
          is_public?: boolean | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
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
          created_at: string | null
          created_by: string | null
          feature_slug: string
          id: string
          is_enabled_globally: boolean | null
          is_marketplace_visible: boolean | null
          system_menu_order: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          feature_slug: string
          id?: string
          is_enabled_globally?: boolean | null
          is_marketplace_visible?: boolean | null
          system_menu_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          feature_slug?: string
          id?: string
          is_enabled_globally?: boolean | null
          is_marketplace_visible?: boolean | null
          system_menu_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
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
      v_index_stats: {
        Row: {
          index_name: unknown | null
          schemaname: unknown | null
          table_name: unknown | null
          times_used: number | null
          tuples_fetched: number | null
          tuples_read: number | null
        }
        Relationships: []
      }
      v_performance_summary: {
        Row: {
          active_count: number | null
          row_count: number | null
          table_name: string | null
        }
        Relationships: []
      }
      v_table_stats: {
        Row: {
          dead_rows: number | null
          deletes: number | null
          inserts: number | null
          last_analyze: string | null
          last_autoanalyze: string | null
          last_autovacuum: string | null
          last_vacuum: string | null
          live_rows: number | null
          schemaname: unknown | null
          table_name: unknown | null
          updates: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_invitation: {
        Args: { p_token: string }
        Returns: Json
      }
      check_rate_limit: {
        Args: {
          p_identifier: string
          p_action_type: string
          p_limit?: number
          p_window_minutes?: number
        }
        Returns: boolean
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
      hash_api_key: {
        Args: { key_text: string }
        Returns: string
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
      test_rls_security: {
        Args: Record<PropertyKey, never>
        Returns: {
          table_name: string
          rls_enabled: boolean
          policy_count: number
          test_result: string
        }[]
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
