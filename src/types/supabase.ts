export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          check_in_at: string
          check_out_at: string | null
          checked_out_by: string | null
          client_id: string
          created_at: string
          created_by: string | null
          gym_id: string
          id: string
          membership_id: string | null
          notes: string | null
          source: string
          updated_at: string
        }
        Insert: {
          check_in_at?: string
          check_out_at?: string | null
          checked_out_by?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          gym_id: string
          id?: string
          membership_id?: string | null
          notes?: string | null
          source?: string
          updated_at?: string
        }
        Update: {
          check_in_at?: string
          check_out_at?: string | null
          checked_out_by?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          gym_id?: string
          id?: string
          membership_id?: string | null
          notes?: string | null
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          gym_id: string
          id: string
          metadata: Json
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          gym_id: string
          id?: string
          metadata?: Json
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          gym_id?: string
          id?: string
          metadata?: Json
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          age: number | null
          bmi: number | null
          chest: number | null
          created_at: string
          email: string | null
          gender: string | null
          gym_id: string
          height: number | null
          id: string
          membership_due_date: string | null
          membership_status: string
          name: string
          phone: string | null
          phone_e164: string | null
          photo_path: string | null
          photo_url: string | null
          qr_token: string
          registration_date: string
          sync_version: number
          updated_at: string
          waist: number | null
          weight: number | null
        }
        Insert: {
          age?: number | null
          bmi?: number | null
          chest?: number | null
          created_at?: string
          email?: string | null
          gender?: string | null
          gym_id: string
          height?: number | null
          id?: string
          membership_due_date?: string | null
          membership_status?: string
          name: string
          phone?: string | null
          phone_e164?: string | null
          photo_path?: string | null
          photo_url?: string | null
          qr_token?: string
          registration_date?: string
          sync_version?: number
          updated_at?: string
          waist?: number | null
          weight?: number | null
        }
        Update: {
          age?: number | null
          bmi?: number | null
          chest?: number | null
          created_at?: string
          email?: string | null
          gender?: string | null
          gym_id?: string
          height?: number | null
          id?: string
          membership_due_date?: string | null
          membership_status?: string
          name?: string
          phone?: string | null
          phone_e164?: string | null
          photo_path?: string | null
          photo_url?: string | null
          qr_token?: string
          registration_date?: string
          sync_version?: number
          updated_at?: string
          waist?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          gym_id: string
          id: string
          notes: string | null
          payment_method: string
          reference_number: string | null
          status: string
          updated_at: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          expense_date?: string
          gym_id: string
          id?: string
          notes?: string | null
          payment_method?: string
          reference_number?: string | null
          status?: string
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          gym_id?: string
          id?: string
          notes?: string | null
          payment_method?: string
          reference_number?: string | null
          status?: string
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string
          email: string | null
          expires_at: string
          gym_id: string
          id: string
          revoked_at: string | null
          role: string
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          expires_at: string
          gym_id: string
          id?: string
          revoked_at?: string | null
          role: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          expires_at?: string
          gym_id?: string
          id?: string
          revoked_at?: string | null
          role?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_invitations_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_receipt_counters: {
        Row: {
          gym_id: string
          next_number: number
          updated_at: string
        }
        Insert: {
          gym_id: string
          next_number?: number
          updated_at?: string
        }
        Update: {
          gym_id?: string
          next_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_receipt_counters_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: true
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_users: {
        Row: {
          created_at: string
          gym_id: string
          id: string
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gym_id: string
          id?: string
          role?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          gym_id?: string
          id?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_users_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gyms: {
        Row: {
          address: string | null
          country_code: string
          created_at: string
          currency_code: string
          email: string | null
          id: string
          join_code: string
          locale: string
          logo_url: string | null
          name: string
          phone: string | null
          slug: string
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          country_code?: string
          created_at?: string
          currency_code?: string
          email?: string | null
          id?: string
          join_code: string
          locale?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          slug: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          country_code?: string
          created_at?: string
          currency_code?: string
          email?: string | null
          id?: string
          join_code?: string
          locale?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          slug?: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      memberships: {
        Row: {
          admission_fee: number
          client_id: string
          created_at: string
          created_by: string | null
          discount_amount: number
          end_date: string
          freeze_reason: string | null
          frozen_at: string | null
          gym_id: string
          id: string
          notes: string | null
          payment_id: string | null
          plan_id: string | null
          price_snapshot: number
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          admission_fee?: number
          client_id: string
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          end_date?: string
          freeze_reason?: string | null
          frozen_at?: string | null
          gym_id: string
          id?: string
          notes?: string | null
          payment_id?: string | null
          plan_id?: string | null
          price_snapshot?: number
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          admission_fee?: number
          client_id?: string
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          end_date?: string
          freeze_reason?: string | null
          frozen_at?: string | null
          gym_id?: string
          id?: string
          notes?: string | null
          payment_id?: string | null
          plan_id?: string | null
          price_snapshot?: number
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      offline_mutation_log: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string
          gym_id: string
          id: string
          idempotency_key: string
          operation: string
          result: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type: string
          gym_id: string
          id?: string
          idempotency_key: string
          operation: string
          result?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          gym_id?: string
          id?: string
          idempotency_key?: string
          operation?: string
          result?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offline_mutation_log_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          admission_fee: number
          amount: number
          client_id: string
          client_name: string
          created_at: string
          created_by: string | null
          discount_amount: number
          due_date: string | null
          duration: number
          gym_id: string
          id: string
          idempotency_key: string | null
          membership_id: string | null
          notes: string | null
          payment_date: string
          payment_method: string
          plan_id: string | null
          provider_transaction_id: string | null
          receipt_number: string | null
          reference_number: string | null
          status: string
          updated_at: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          admission_fee?: number
          amount: number
          client_id: string
          client_name: string
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          due_date?: string | null
          duration?: number
          gym_id: string
          id?: string
          idempotency_key?: string | null
          membership_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string
          plan_id?: string | null
          provider_transaction_id?: string | null
          receipt_number?: string | null
          reference_number?: string | null
          status?: string
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          admission_fee?: number
          amount?: number
          client_id?: string
          client_name?: string
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          due_date?: string | null
          duration?: number
          gym_id?: string
          id?: string
          idempotency_key?: string | null
          membership_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string
          plan_id?: string | null
          provider_transaction_id?: string | null
          receipt_number?: string | null
          reference_number?: string | null
          status?: string
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          admission_fee: number
          created_at: string
          created_by: string | null
          description: string | null
          duration_days: number
          gym_id: string
          id: string
          is_active: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          admission_fee?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_days: number
          gym_id: string
          id?: string
          is_active?: boolean
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          admission_fee?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_days?: number
          gym_id?: string
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_staff_invitation: { Args: { p_code: string }; Returns: Json }
      apply_client_mutation: {
        Args: {
          p_client_id: string
          p_expected_version: number
          p_gym_id: string
          p_idempotency_key: string
          p_operation: string
          p_payload: Json
        }
        Returns: Json
      }
      check_in_by_qr: {
        Args: { p_gym_id: string; p_qr_token: string }
        Returns: Json
      }
      check_in_client: {
        Args: { p_client_id: string; p_gym_id: string; p_source?: string }
        Returns: Json
      }
      check_out_attendance: { Args: { p_attendance_id: string }; Returns: Json }
      create_gym: {
        Args: {
          p_address?: string
          p_country_code?: string
          p_email?: string
          p_logo_url?: string
          p_name: string
          p_phone?: string
          p_slug: string
        }
        Returns: Json
      }
      create_staff_invitation: {
        Args: {
          p_email?: string
          p_expires_hours?: number
          p_gym_id: string
          p_role: string
        }
        Returns: Json
      }
      deactivate_staff_member: {
        Args: { p_gym_user_id: string }
        Returns: undefined
      }
      freeze_membership: {
        Args: { p_membership_id: string; p_reason?: string }
        Returns: Json
      }
      get_attendance_summary: { Args: { p_gym_id: string }; Returns: Json }
      get_checkin_membership: {
        Args: { p_client_id: string; p_gym_id: string }
        Returns: string
      }
      get_client_attendance_history: {
        Args: { p_client_id: string; p_gym_id: string; p_limit?: number }
        Returns: Json
      }
      get_client_memberships: {
        Args: { p_client_id: string; p_gym_id: string }
        Returns: Json
      }
      get_finance_monthly_trend: {
        Args: { p_gym_id: string; p_months?: number }
        Returns: Json
      }
      get_finance_summary: {
        Args: { p_from: string; p_gym_id: string; p_to: string }
        Returns: Json
      }
      get_my_gym_role: { Args: { p_gym_id: string }; Returns: string }
      get_payment_receipt: {
        Args: { p_gym_id: string; p_payment_id: string }
        Returns: Json
      }
      get_user_gym_ids: {
        Args: never
        Returns: {
          gym_id: string
        }[]
      }
      has_gym_role: {
        Args: { p_gym_id: string; p_roles: string[] }
        Returns: boolean
      }
      join_gym_by_code: { Args: { p_join_code: string }; Returns: Json }
      list_audit_logs: {
        Args: { p_gym_id: string; p_limit?: number }
        Returns: Json
      }
      list_expenses: {
        Args: { p_gym_id: string; p_include_voided?: boolean }
        Returns: Json
      }
      list_gym_staff: { Args: { p_gym_id: string }; Returns: Json }
      list_membership_plans: {
        Args: { p_gym_id: string; p_include_inactive?: boolean }
        Returns: Json
      }
      list_payment_receipts: {
        Args: { p_client_id?: string; p_gym_id: string }
        Returns: Json
      }
      list_renewals_due: {
        Args: { p_gym_id: string; p_limit?: number }
        Returns: Json
      }
      list_staff_invitations: { Args: { p_gym_id: string }; Returns: Json }
      list_today_attendance: { Args: { p_gym_id: string }; Returns: Json }
      normalize_phone_e164: {
        Args: { p_country_code: string; p_phone: string }
        Returns: string
      }
      record_membership_payment: {
        Args: {
          p_apply_admission_fee?: boolean
          p_client_id: string
          p_discount_amount?: number
          p_gym_id: string
          p_idempotency_key?: string
          p_notes?: string
          p_payment_method: string
          p_plan_id: string
          p_reference_number?: string
        }
        Returns: Json
      }
      resume_membership: { Args: { p_membership_id: string }; Returns: Json }
      revoke_staff_invitation: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      save_expense: {
        Args: {
          p_amount: number
          p_category: string
          p_description: string
          p_expense_date: string
          p_expense_id: string
          p_gym_id: string
          p_notes?: string
          p_payment_method?: string
          p_reference_number?: string
        }
        Returns: Json
      }
      save_membership_plan: {
        Args: {
          p_admission_fee?: number
          p_description?: string
          p_duration_days: number
          p_gym_id: string
          p_is_active?: boolean
          p_name: string
          p_plan_id: string
          p_price: number
        }
        Returns: Json
      }
      search_attendance_clients: {
        Args: { p_gym_id: string; p_query?: string }
        Returns: Json
      }
      update_staff_role: {
        Args: { p_gym_user_id: string; p_role: string }
        Returns: undefined
      }
      void_expense: {
        Args: { p_expense_id: string; p_reason: string }
        Returns: Json
      }
      void_payment: {
        Args: { p_payment_id: string; p_reason: string }
        Returns: Json
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
