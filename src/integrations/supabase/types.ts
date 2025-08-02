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
          organization_id: string | null
          priority: string | null
          resolution_notes: string | null
          responded_at: string | null
          responded_by: string | null
          status: string | null
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
          organization_id?: string | null
          priority?: string | null
          resolution_notes?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string | null
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
          organization_id?: string | null
          priority?: string | null
          resolution_notes?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string | null
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
      extract_org_id_from_path: {
        Args: { file_path: string }
        Returns: string
      }
      get_user_current_organization: {
        Args: { user_id: string }
        Returns: string
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
        Returns: string[]
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
      user_has_org_access: {
        Args: { user_id: string; org_id: string }
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
