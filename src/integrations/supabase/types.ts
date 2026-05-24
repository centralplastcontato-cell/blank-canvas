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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          company_id: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          module: string
          user_agent: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          module: string
          user_agent?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          module?: string
          user_agent?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          company_id: string
          completion_tokens: number | null
          created_at: string
          estimated_cost_usd: number | null
          function_name: string
          id: string
          model: string
          prompt_tokens: number | null
          total_tokens: number | null
        }
        Insert: {
          company_id: string
          completion_tokens?: number | null
          created_at?: string
          estimated_cost_usd?: number | null
          function_name: string
          id?: string
          model?: string
          prompt_tokens?: number | null
          total_tokens?: number | null
        }
        Update: {
          company_id?: string
          completion_tokens?: number | null
          created_at?: string
          estimated_cost_usd?: number | null
          function_name?: string
          id?: string
          model?: string
          prompt_tokens?: number | null
          total_tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts_system: {
        Row: {
          alert_hash: string
          alert_message: string
          alert_type: string
          company_id: string
          created_at: string
          id: string
          related_filter: Json | null
          resolved: boolean
          resolved_at: string | null
          severity: string
        }
        Insert: {
          alert_hash: string
          alert_message: string
          alert_type: string
          company_id: string
          created_at?: string
          id?: string
          related_filter?: Json | null
          resolved?: boolean
          resolved_at?: string | null
          severity?: string
        }
        Update: {
          alert_hash?: string
          alert_message?: string
          alert_type?: string
          company_id?: string
          created_at?: string
          id?: string
          related_filter?: Json | null
          resolved?: boolean
          resolved_at?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_system_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_entries: {
        Row: {
          company_id: string
          created_at: string
          event_id: string | null
          filled_by: string | null
          finalized_at: string | null
          guests: Json
          id: string
          notes: string | null
          receptionist_name: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          event_id?: string | null
          filled_by?: string | null
          finalized_at?: string | null
          guests?: Json
          id?: string
          notes?: string | null
          receptionist_name?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          event_id?: string | null
          filled_by?: string | null
          finalized_at?: string | null
          guests?: Json
          id?: string
          notes?: string | null
          receptionist_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "company_events"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_reactivation_settings: {
        Row: {
          capture_window_hours: number
          company_id: string
          created_at: string
          eligible_statuses: string[] | null
          exclude_closed: boolean
          exclude_existing_event: boolean
          exclude_lost: boolean
          id: string
          interactive_options_enabled: boolean
          is_enabled: boolean
          max_daily_sends: number
          max_messages_per_lead: number
          max_per_execution: number
          message_one_month: string | null
          message_three_months: string | null
          message_two_months: string | null
          min_days_without_reply: number
          option_1_label: string
          option_2_label: string
          option_3_label: string
          pause_days_on_analyzing: number
          require_human_interaction: boolean
          require_party_date: boolean
          safety_interval_max_seconds: number
          safety_interval_min_seconds: number
          send_window_end: number
          send_window_start: number
          trigger_one_month_enabled: boolean
          trigger_three_months_enabled: boolean
          trigger_two_months_enabled: boolean
          updated_at: string
        }
        Insert: {
          capture_window_hours?: number
          company_id: string
          created_at?: string
          eligible_statuses?: string[] | null
          exclude_closed?: boolean
          exclude_existing_event?: boolean
          exclude_lost?: boolean
          id?: string
          interactive_options_enabled?: boolean
          is_enabled?: boolean
          max_daily_sends?: number
          max_messages_per_lead?: number
          max_per_execution?: number
          message_one_month?: string | null
          message_three_months?: string | null
          message_two_months?: string | null
          min_days_without_reply?: number
          option_1_label?: string
          option_2_label?: string
          option_3_label?: string
          pause_days_on_analyzing?: number
          require_human_interaction?: boolean
          require_party_date?: boolean
          safety_interval_max_seconds?: number
          safety_interval_min_seconds?: number
          send_window_end?: number
          send_window_start?: number
          trigger_one_month_enabled?: boolean
          trigger_three_months_enabled?: boolean
          trigger_two_months_enabled?: boolean
          updated_at?: string
        }
        Update: {
          capture_window_hours?: number
          company_id?: string
          created_at?: string
          eligible_statuses?: string[] | null
          exclude_closed?: boolean
          exclude_existing_event?: boolean
          exclude_lost?: boolean
          id?: string
          interactive_options_enabled?: boolean
          is_enabled?: boolean
          max_daily_sends?: number
          max_messages_per_lead?: number
          max_per_execution?: number
          message_one_month?: string | null
          message_three_months?: string | null
          message_two_months?: string | null
          min_days_without_reply?: number
          option_1_label?: string
          option_2_label?: string
          option_3_label?: string
          pause_days_on_analyzing?: number
          require_human_interaction?: boolean
          require_party_date?: boolean
          safety_interval_max_seconds?: number
          safety_interval_min_seconds?: number
          send_window_end?: number
          send_window_start?: number
          trigger_one_month_enabled?: boolean
          trigger_three_months_enabled?: boolean
          trigger_two_months_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_reactivation_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_leads: {
        Row: {
          city: string | null
          company_name: string
          contact_name: string
          created_at: string
          current_tools: string | null
          email: string
          has_lead_clarity: boolean | null
          how_found_us: string | null
          id: string
          instagram: string | null
          lead_cost: string | null
          lead_organization: string | null
          main_challenges: string | null
          monthly_leads: string | null
          monthly_parties: number | null
          notes: string | null
          phone: string | null
          source: string | null
          state: string | null
          status: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          company_name: string
          contact_name: string
          created_at?: string
          current_tools?: string | null
          email: string
          has_lead_clarity?: boolean | null
          how_found_us?: string | null
          id?: string
          instagram?: string | null
          lead_cost?: string | null
          lead_organization?: string | null
          main_challenges?: string | null
          monthly_leads?: string | null
          monthly_parties?: number | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          company_name?: string
          contact_name?: string
          created_at?: string
          current_tools?: string | null
          email?: string
          has_lead_clarity?: boolean | null
          how_found_us?: string | null
          id?: string
          instagram?: string | null
          lead_cost?: string | null
          lead_organization?: string | null
          main_challenges?: string | null
          monthly_leads?: string | null
          monthly_parties?: number | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      backup_logs: {
        Row: {
          backup_type: string
          company_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          file_name: string | null
          file_size_bytes: number | null
          file_url: string | null
          id: string
          records_count: Json | null
          started_at: string
          status: string
        }
        Insert: {
          backup_type?: string
          company_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          records_count?: Json | null
          started_at?: string
          status?: string
        }
        Update: {
          backup_type?: string
          company_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          records_count?: Json | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "backup_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      base_leads: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          former_party_info: string | null
          id: string
          is_former_client: boolean
          month_interest: string | null
          name: string
          notes: string | null
          party_type: string | null
          phone: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          former_party_info?: string | null
          id?: string
          is_former_client?: boolean
          month_interest?: string | null
          name: string
          notes?: string | null
          party_type?: string | null
          phone: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          former_party_info?: string | null
          id?: string
          is_former_client?: boolean
          month_interest?: string | null
          name?: string
          notes?: string | null
          party_type?: string | null
          phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "base_leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_images: {
        Row: {
          campaign_id: string | null
          campaign_name: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          image_url: string
          source: string
          thumbnail_url: string | null
        }
        Insert: {
          campaign_id?: string | null
          campaign_name?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_url: string
          source?: string
          thumbnail_url?: string | null
        }
        Update: {
          campaign_id?: string | null
          campaign_name?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string
          source?: string
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_images_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_images_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_leads: {
        Row: {
          campaign_id: string
          campaign_name: string | null
          company_id: string
          created_at: string
          day_of_month: number | null
          day_preference: string | null
          guests: string | null
          id: string
          month: string | null
          name: string
          observacoes: string | null
          responsavel_id: string | null
          status: Database["public"]["Enums"]["lead_status"]
          unit: string | null
          whatsapp: string
        }
        Insert: {
          campaign_id: string
          campaign_name?: string | null
          company_id: string
          created_at?: string
          day_of_month?: number | null
          day_preference?: string | null
          guests?: string | null
          id?: string
          month?: string | null
          name: string
          observacoes?: string | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          unit?: string | null
          whatsapp: string
        }
        Update: {
          campaign_id?: string
          campaign_name?: string | null
          company_id?: string
          created_at?: string
          day_of_month?: number | null
          day_preference?: string | null
          guests?: string | null
          id?: string
          month?: string | null
          name?: string
          observacoes?: string | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          unit?: string | null
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_recipients: {
        Row: {
          campaign_id: string
          created_at: string
          error_message: string | null
          id: string
          lead_id: string | null
          lead_name: string
          phone: string
          sent_at: string | null
          status: string
          variation_index: number
        }
        Insert: {
          campaign_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          lead_name?: string
          phone: string
          sent_at?: string | null
          status?: string
          variation_index?: number
        }
        Update: {
          campaign_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          lead_name?: string
          phone?: string
          sent_at?: string | null
          status?: string
          variation_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "campaign_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_response_settings: {
        Row: {
          company_id: string
          created_at: string
          followup_days: number
          id: string
          is_enabled: boolean
          main_message: string
          option_1_action: string
          option_1_label: string
          option_2_action: string
          option_2_label: string
          option_3_action: string
          option_3_label: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          followup_days?: number
          id?: string
          is_enabled?: boolean
          main_message?: string
          option_1_action?: string
          option_1_label?: string
          option_2_action?: string
          option_2_label?: string
          option_3_action?: string
          option_3_label?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          followup_days?: number
          id?: string
          is_enabled?: boolean
          main_message?: string
          option_1_action?: string
          option_1_label?: string
          option_2_action?: string
          option_2_label?: string
          option_3_action?: string
          option_3_label?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_response_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          auto_reply_message: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          delay_seconds: number
          description: string | null
          error_count: number
          filters: Json | null
          id: string
          image_url: string | null
          message_variations: Json
          name: string
          pause_bot_on_reply: boolean
          scheduled_at: string | null
          sent_count: number
          started_at: string | null
          status: string
          total_recipients: number
          updated_at: string
        }
        Insert: {
          auto_reply_message?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          delay_seconds?: number
          description?: string | null
          error_count?: number
          filters?: Json | null
          id?: string
          image_url?: string | null
          message_variations?: Json
          name: string
          pause_bot_on_reply?: boolean
          scheduled_at?: string | null
          sent_count?: number
          started_at?: string | null
          status?: string
          total_recipients?: number
          updated_at?: string
        }
        Update: {
          auto_reply_message?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          delay_seconds?: number
          description?: string | null
          error_count?: number
          filters?: Json | null
          id?: string
          image_url?: string | null
          message_variations?: Json
          name?: string
          pause_bot_on_reply?: boolean
          scheduled_at?: string | null
          sent_count?: number
          started_at?: string | null
          status?: string
          total_recipients?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cardapio_responses: {
        Row: {
          answers: Json
          company_id: string
          created_at: string
          event_id: string | null
          id: string
          respondent_name: string | null
          template_id: string
        }
        Insert: {
          answers?: Json
          company_id: string
          created_at?: string
          event_id?: string | null
          id?: string
          respondent_name?: string | null
          template_id: string
        }
        Update: {
          answers?: Json
          company_id?: string
          created_at?: string
          event_id?: string | null
          id?: string
          respondent_name?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cardapio_responses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cardapio_responses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "company_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cardapio_responses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "cardapio_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      cardapio_templates: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sections: Json
          slug: string | null
          thank_you_message: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sections?: Json
          slug?: string | null
          thank_you_message?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sections?: Json
          slug?: string | null
          thank_you_message?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cardapio_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_data_requests: {
        Row: {
          client_data: Json | null
          company_id: string
          completed_at: string | null
          created_at: string
          event_id: string
          id: string
          lead_id: string | null
          sent_at: string | null
          status: string
          token: string
        }
        Insert: {
          client_data?: Json | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          event_id: string
          id?: string
          lead_id?: string | null
          sent_at?: string | null
          status?: string
          token: string
        }
        Update: {
          client_data?: Json | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          event_id?: string
          id?: string
          lead_id?: string | null
          sent_at?: string | null
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_data_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_data_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "company_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_data_requests_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "campaign_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          custom_domain: string | null
          domain_canonical: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          parent_id: string | null
          settings: Json | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_domain?: string | null
          domain_canonical?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          parent_id?: string | null
          settings?: Json | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_domain?: string | null
          domain_canonical?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          parent_id?: string | null
          settings?: Json | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_bank_accounts: {
        Row: {
          account_number: string | null
          account_type: string
          agency: string | null
          bank_name: string | null
          company_id: string
          created_at: string
          id: string
          initial_balance: number
          is_active: boolean
          is_default: boolean
          name: string
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          account_type?: string
          agency?: string | null
          bank_name?: string | null
          company_id: string
          created_at?: string
          id?: string
          initial_balance?: number
          is_active?: boolean
          is_default?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          account_type?: string
          agency?: string | null
          bank_name?: string | null
          company_id?: string
          created_at?: string
          id?: string
          initial_balance?: number
          is_active?: boolean
          is_default?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_bank_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_card_fees: {
        Row: {
          antecipado: boolean | null
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          operator_name: string
          prazo_recebimento_dias: number
          taxa_credito_10x: number | null
          taxa_credito_11x: number | null
          taxa_credito_12x: number | null
          taxa_credito_1x: number | null
          taxa_credito_2x: number | null
          taxa_credito_3x: number | null
          taxa_credito_4x: number | null
          taxa_credito_5x: number | null
          taxa_credito_6x: number | null
          taxa_credito_7x: number | null
          taxa_credito_8x: number | null
          taxa_credito_9x: number | null
          taxa_debito: number | null
          updated_at: string | null
        }
        Insert: {
          antecipado?: boolean | null
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          operator_name: string
          prazo_recebimento_dias?: number
          taxa_credito_10x?: number | null
          taxa_credito_11x?: number | null
          taxa_credito_12x?: number | null
          taxa_credito_1x?: number | null
          taxa_credito_2x?: number | null
          taxa_credito_3x?: number | null
          taxa_credito_4x?: number | null
          taxa_credito_5x?: number | null
          taxa_credito_6x?: number | null
          taxa_credito_7x?: number | null
          taxa_credito_8x?: number | null
          taxa_credito_9x?: number | null
          taxa_debito?: number | null
          updated_at?: string | null
        }
        Update: {
          antecipado?: boolean | null
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          operator_name?: string
          prazo_recebimento_dias?: number
          taxa_credito_10x?: number | null
          taxa_credito_11x?: number | null
          taxa_credito_12x?: number | null
          taxa_credito_1x?: number | null
          taxa_credito_2x?: number | null
          taxa_credito_3x?: number | null
          taxa_credito_4x?: number | null
          taxa_credito_5x?: number | null
          taxa_credito_6x?: number | null
          taxa_credito_7x?: number | null
          taxa_credito_8x?: number | null
          taxa_credito_9x?: number | null
          taxa_debito?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_card_fees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_contacts: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          lead_id: string | null
          name: string
          notes: string | null
          phone: string | null
          tags: Json | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          lead_id?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          tags?: Json | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          lead_id?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          tags?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_contacts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "campaign_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      company_events: {
        Row: {
          birthday_children: Json | null
          child_age: string | null
          child_birthdate: string | null
          child_name: string | null
          company_id: string
          created_at: string
          created_by: string
          data_fechamento_venda: string | null
          end_time: string | null
          event_date: string
          event_optionals: Json | null
          event_type: string | null
          extra_guest_value: number | null
          extra_guest_value_antecipado: number | null
          extra_guest_value_no_dia: number | null
          gifts: string | null
          guest_count: number | null
          id: string
          internal_notes: string | null
          is_permuta: boolean
          lead_id: string | null
          notes: string | null
          package_name: string | null
          parent_names: string | null
          payment_blocks: Json | null
          payment_details: Json | null
          payment_method: string | null
          start_time: string | null
          status: string
          title: string
          total_value: number | null
          unit: string | null
          updated_at: string
          vendedor_responsavel_id: string | null
        }
        Insert: {
          birthday_children?: Json | null
          child_age?: string | null
          child_birthdate?: string | null
          child_name?: string | null
          company_id: string
          created_at?: string
          created_by: string
          data_fechamento_venda?: string | null
          end_time?: string | null
          event_date: string
          event_optionals?: Json | null
          event_type?: string | null
          extra_guest_value?: number | null
          extra_guest_value_antecipado?: number | null
          extra_guest_value_no_dia?: number | null
          gifts?: string | null
          guest_count?: number | null
          id?: string
          internal_notes?: string | null
          is_permuta?: boolean
          lead_id?: string | null
          notes?: string | null
          package_name?: string | null
          parent_names?: string | null
          payment_blocks?: Json | null
          payment_details?: Json | null
          payment_method?: string | null
          start_time?: string | null
          status?: string
          title: string
          total_value?: number | null
          unit?: string | null
          updated_at?: string
          vendedor_responsavel_id?: string | null
        }
        Update: {
          birthday_children?: Json | null
          child_age?: string | null
          child_birthdate?: string | null
          child_name?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          data_fechamento_venda?: string | null
          end_time?: string | null
          event_date?: string
          event_optionals?: Json | null
          event_type?: string | null
          extra_guest_value?: number | null
          extra_guest_value_antecipado?: number | null
          extra_guest_value_no_dia?: number | null
          gifts?: string | null
          guest_count?: number | null
          id?: string
          internal_notes?: string | null
          is_permuta?: boolean
          lead_id?: string | null
          notes?: string | null
          package_name?: string | null
          parent_names?: string | null
          payment_blocks?: Json | null
          payment_details?: Json | null
          payment_method?: string | null
          start_time?: string | null
          status?: string
          title?: string
          total_value?: number | null
          unit?: string | null
          updated_at?: string
          vendedor_responsavel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "campaign_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      company_expenses: {
        Row: {
          amount: number
          bank_account_id: string | null
          boleto_url: string | null
          category: string
          company_id: string
          created_at: string | null
          description: string
          expense_date: string
          expense_type: string
          id: string
          notes: string | null
          receipt_url: string | null
          status: string
          subcategory: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number
          bank_account_id?: string | null
          boleto_url?: string | null
          category?: string
          company_id: string
          created_at?: string | null
          description: string
          expense_date?: string
          expense_type?: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          status?: string
          subcategory?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          boleto_url?: string | null
          category?: string
          company_id?: string
          created_at?: string | null
          description?: string
          expense_date?: string
          expense_type?: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          status?: string
          subcategory?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_expenses_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "company_bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_landing_pages: {
        Row: {
          benefits: Json | null
          company_id: string
          created_at: string
          footer: Json
          gallery: Json
          hero: Json
          how_it_works: Json | null
          id: string
          is_published: boolean
          offer: Json
          social_proof: Json | null
          testimonials: Json
          theme: Json
          updated_at: string
          video: Json
        }
        Insert: {
          benefits?: Json | null
          company_id: string
          created_at?: string
          footer?: Json
          gallery?: Json
          hero?: Json
          how_it_works?: Json | null
          id?: string
          is_published?: boolean
          offer?: Json
          social_proof?: Json | null
          testimonials?: Json
          theme?: Json
          updated_at?: string
          video?: Json
        }
        Update: {
          benefits?: Json | null
          company_id?: string
          created_at?: string
          footer?: Json
          gallery?: Json
          hero?: Json
          how_it_works?: Json | null
          id?: string
          is_published?: boolean
          offer?: Json
          social_proof?: Json | null
          testimonials?: Json
          theme?: Json
          updated_at?: string
          video?: Json
        }
        Relationships: [
          {
            foreignKeyName: "company_landing_pages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_onboarding: {
        Row: {
          additional_notes: string | null
          attendants_count: number | null
          automation_system_name: string | null
          brand_notes: string | null
          budget_file_urls: string[] | null
          budget_format: string | null
          buffet_name: string | null
          city: string | null
          company_id: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contact_role: string | null
          cost_per_lead: string | null
          created_at: string
          current_agency: string | null
          current_service_method: string | null
          current_step: number
          full_address: string | null
          has_automation_system: boolean | null
          id: string
          instagram: string | null
          lead_sources: string[] | null
          lead_volume: string | null
          logo_url: string | null
          main_goal: string | null
          monthly_investment: string | null
          multiple_units: boolean | null
          operational_data: Json | null
          photo_urls: string[] | null
          secondary_contact: string | null
          service_hours: string | null
          service_screenshots: string[] | null
          state: string | null
          status: string
          updated_at: string
          uses_paid_traffic: boolean | null
          video_urls: string[] | null
          website: string | null
          whatsapp_numbers: string[] | null
        }
        Insert: {
          additional_notes?: string | null
          attendants_count?: number | null
          automation_system_name?: string | null
          brand_notes?: string | null
          budget_file_urls?: string[] | null
          budget_format?: string | null
          buffet_name?: string | null
          city?: string | null
          company_id: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_role?: string | null
          cost_per_lead?: string | null
          created_at?: string
          current_agency?: string | null
          current_service_method?: string | null
          current_step?: number
          full_address?: string | null
          has_automation_system?: boolean | null
          id?: string
          instagram?: string | null
          lead_sources?: string[] | null
          lead_volume?: string | null
          logo_url?: string | null
          main_goal?: string | null
          monthly_investment?: string | null
          multiple_units?: boolean | null
          operational_data?: Json | null
          photo_urls?: string[] | null
          secondary_contact?: string | null
          service_hours?: string | null
          service_screenshots?: string[] | null
          state?: string | null
          status?: string
          updated_at?: string
          uses_paid_traffic?: boolean | null
          video_urls?: string[] | null
          website?: string | null
          whatsapp_numbers?: string[] | null
        }
        Update: {
          additional_notes?: string | null
          attendants_count?: number | null
          automation_system_name?: string | null
          brand_notes?: string | null
          budget_file_urls?: string[] | null
          budget_format?: string | null
          buffet_name?: string | null
          city?: string | null
          company_id?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_role?: string | null
          cost_per_lead?: string | null
          created_at?: string
          current_agency?: string | null
          current_service_method?: string | null
          current_step?: number
          full_address?: string | null
          has_automation_system?: boolean | null
          id?: string
          instagram?: string | null
          lead_sources?: string[] | null
          lead_volume?: string | null
          logo_url?: string | null
          main_goal?: string | null
          monthly_investment?: string | null
          multiple_units?: boolean | null
          operational_data?: Json | null
          photo_urls?: string[] | null
          secondary_contact?: string | null
          service_hours?: string | null
          service_screenshots?: string[] | null
          state?: string | null
          status?: string
          updated_at?: string
          uses_paid_traffic?: boolean | null
          video_urls?: string[] | null
          website?: string | null
          whatsapp_numbers?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "company_onboarding_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_optionals: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string
          valor_por_pessoa: number | null
          value: number | null
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string
          valor_por_pessoa?: number | null
          value?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string
          valor_por_pessoa?: number | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "company_optionals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_packages: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          preco_separado: boolean
          sort_order: number
          updated_at: string
          valor_adicional_antecipado: number | null
          valor_adicional_no_dia: number | null
          valor_pessoa_adicional: number | null
          valor_pessoa_adicional_adulto: number | null
          valor_pessoa_adicional_crianca: number | null
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          preco_separado?: boolean
          sort_order?: number
          updated_at?: string
          valor_adicional_antecipado?: number | null
          valor_adicional_no_dia?: number | null
          valor_pessoa_adicional?: number | null
          valor_pessoa_adicional_adulto?: number | null
          valor_pessoa_adicional_crianca?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          preco_separado?: boolean
          sort_order?: number
          updated_at?: string
          valor_adicional_antecipado?: number | null
          valor_adicional_no_dia?: number | null
          valor_pessoa_adicional?: number | null
          valor_pessoa_adicional_adulto?: number | null
          valor_pessoa_adicional_crianca?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "company_packages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_revenues: {
        Row: {
          amount: number
          bank_account_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          notes: string | null
          receipt_url: string | null
          revenue_date: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          bank_account_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          revenue_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          revenue_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_revenues_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "company_bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_revenues_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_sellers: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_sellers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_tasks: {
        Row: {
          assigned_to: string | null
          category: string
          company_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          due_time: string | null
          event_id: string | null
          id: string
          is_recurring: boolean | null
          lead_id: string | null
          observacoes: string | null
          parent_task_id: string | null
          priority: string
          recurrence_days: number[] | null
          recurrence_end_date: string | null
          recurrence_interval: number | null
          recurrence_type: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          company_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          event_id?: string | null
          id?: string
          is_recurring?: boolean | null
          lead_id?: string | null
          observacoes?: string | null
          parent_task_id?: string | null
          priority?: string
          recurrence_days?: number[] | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_type?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          company_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          event_id?: string | null
          id?: string
          is_recurring?: boolean | null
          lead_id?: string | null
          observacoes?: string | null
          parent_task_id?: string | null
          priority?: string
          recurrence_days?: number[] | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_type?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "company_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "campaign_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "company_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      company_units: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_units_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_audit_logs: {
        Row: {
          action: string
          company_id: string
          contract_id: string | null
          created_at: string
          details: Json | null
          id: string
          performed_by: string | null
          template_id: string | null
        }
        Insert: {
          action: string
          company_id: string
          contract_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          performed_by?: string | null
          template_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string
          contract_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          performed_by?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_audit_logs_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "generated_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_audit_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_models"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_message_settings: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_enabled: boolean
          message_template: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          message_template?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          message_template?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_message_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_model_versions: {
        Row: {
          changed_by: string | null
          company_id: string
          conteudo_template: string
          created_at: string
          id: string
          model_id: string
          nome_modelo: string | null
          tipo_evento: string | null
          versao: number
        }
        Insert: {
          changed_by?: string | null
          company_id: string
          conteudo_template: string
          created_at?: string
          id?: string
          model_id: string
          nome_modelo?: string | null
          tipo_evento?: string | null
          versao: number
        }
        Update: {
          changed_by?: string | null
          company_id?: string
          conteudo_template?: string
          created_at?: string
          id?: string
          model_id?: string
          nome_modelo?: string | null
          tipo_evento?: string | null
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_model_versions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_model_versions_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "contract_models"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_models: {
        Row: {
          company_id: string
          conteudo_template: string
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          is_active: boolean
          nome_modelo: string
          slug: string | null
          tipo_evento: string
          updated_at: string
          updated_by: string | null
          versao: number
        }
        Insert: {
          company_id: string
          conteudo_template?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          is_active?: boolean
          nome_modelo: string
          slug?: string | null
          tipo_evento?: string
          updated_at?: string
          updated_by?: string | null
          versao?: number
        }
        Update: {
          company_id?: string
          conteudo_template?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          is_active?: boolean
          nome_modelo?: string
          slug?: string | null
          tipo_evento?: string
          updated_at?: string
          updated_by?: string | null
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_models_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_signatures: {
        Row: {
          company_id: string
          contract_id: string
          created_at: string
          document_hash: string | null
          id: string
          ip_address: string | null
          otp_attempts: number | null
          otp_code: string | null
          otp_sent_at: string | null
          otp_verified_at: string | null
          signature_image_url: string | null
          signed_at: string | null
          signer_name: string | null
          signer_phone: string | null
          status: string
          token: string
          user_agent: string | null
        }
        Insert: {
          company_id: string
          contract_id: string
          created_at?: string
          document_hash?: string | null
          id?: string
          ip_address?: string | null
          otp_attempts?: number | null
          otp_code?: string | null
          otp_sent_at?: string | null
          otp_verified_at?: string | null
          signature_image_url?: string | null
          signed_at?: string | null
          signer_name?: string | null
          signer_phone?: string | null
          status?: string
          token: string
          user_agent?: string | null
        }
        Update: {
          company_id?: string
          contract_id?: string
          created_at?: string
          document_hash?: string | null
          id?: string
          ip_address?: string | null
          otp_attempts?: number | null
          otp_code?: string | null
          otp_sent_at?: string | null
          otp_verified_at?: string | null
          signature_image_url?: string | null
          signed_at?: string | null
          signer_name?: string | null
          signer_phone?: string | null
          status?: string
          token?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_signatures_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_signatures_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "generated_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contrato_responses: {
        Row: {
          answers: Json
          company_id: string
          created_at: string
          event_id: string | null
          id: string
          respondent_name: string | null
          template_id: string
        }
        Insert: {
          answers?: Json
          company_id: string
          created_at?: string
          event_id?: string | null
          id?: string
          respondent_name?: string | null
          template_id: string
        }
        Update: {
          answers?: Json
          company_id?: string
          created_at?: string
          event_id?: string | null
          id?: string
          respondent_name?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contrato_responses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_responses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "company_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_responses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contrato_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      contrato_templates: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          questions: Json
          slug: string | null
          thank_you_message: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          questions?: Json
          slug?: string | null
          thank_you_message?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          questions?: Json
          slug?: string | null
          thank_you_message?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contrato_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_flows: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_flows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_summaries: {
        Row: {
          ai_generated_at: string | null
          ai_summary: string | null
          company_id: string
          created_at: string
          id: string
          incomplete_leads: Json | null
          metrics: Json | null
          summary_date: string
          timeline: Json | null
          updated_at: string
          user_note: string | null
        }
        Insert: {
          ai_generated_at?: string | null
          ai_summary?: string | null
          company_id: string
          created_at?: string
          id?: string
          incomplete_leads?: Json | null
          metrics?: Json | null
          summary_date: string
          timeline?: Json | null
          updated_at?: string
          user_note?: string | null
        }
        Update: {
          ai_generated_at?: string | null
          ai_summary?: string | null
          company_id?: string
          created_at?: string
          id?: string
          incomplete_leads?: Json | null
          metrics?: Json | null
          summary_date?: string
          timeline?: Json | null
          updated_at?: string
          user_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_summaries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_responses: {
        Row: {
          answers: Json
          company_id: string
          created_at: string
          event_id: string | null
          id: string
          overall_score: number | null
          respondent_name: string | null
          template_id: string
        }
        Insert: {
          answers?: Json
          company_id: string
          created_at?: string
          event_id?: string | null
          id?: string
          overall_score?: number | null
          respondent_name?: string | null
          template_id: string
        }
        Update: {
          answers?: Json
          company_id?: string
          created_at?: string
          event_id?: string | null
          id?: string
          overall_score?: number | null
          respondent_name?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_responses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_responses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "company_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_responses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "evaluation_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_templates: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          questions: Json
          slug: string | null
          thank_you_message: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          questions?: Json
          slug?: string | null
          thank_you_message?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          questions?: Json
          slug?: string | null
          thank_you_message?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      event_checklist_items: {
        Row: {
          company_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          event_id: string
          id: string
          is_completed: boolean
          sort_order: number
          title: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          event_id: string
          id?: string
          is_completed?: boolean
          sort_order?: number
          title: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          event_id?: string
          id?: string
          is_completed?: boolean
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_checklist_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_checklist_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "company_events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_checklist_templates: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          items: Json
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          items?: Json
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          items?: Json
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_checklist_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      event_discounts: {
        Row: {
          company_id: string
          created_at: string
          event_id: string
          id: string
          reason: string | null
          type: string
          value: number
        }
        Insert: {
          company_id: string
          created_at?: string
          event_id: string
          id?: string
          reason?: string | null
          type?: string
          value?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          event_id?: string
          id?: string
          reason?: string | null
          type?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_discounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_discounts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "company_events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_extras: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          description: string
          event_id: string
          id: string
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          description: string
          event_id: string
          id?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          description?: string
          event_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_extras_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_extras_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "company_events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_financial_timeline: {
        Row: {
          company_id: string
          created_at: string
          description: string
          event_id: string
          id: string
          type: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description: string
          event_id: string
          id?: string
          type: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string
          event_id?: string
          id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_financial_timeline_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_financial_timeline_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "company_events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_info_entries: {
        Row: {
          company_id: string
          created_at: string
          event_id: string | null
          filled_by: string | null
          id: string
          items: Json
          notes: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          event_id?: string | null
          filled_by?: string | null
          id?: string
          items?: Json
          notes?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          event_id?: string | null
          filled_by?: string | null
          id?: string
          items?: Json
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_info_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_info_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "company_events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_payment_entries: {
        Row: {
          amount: number
          bank_account_id: string | null
          card_fee_percent: number | null
          card_installments: number | null
          card_operator_id: string | null
          company_id: string
          compensation_date: string | null
          created_at: string
          gross_amount: number | null
          id: string
          notes: string | null
          paid_at: string
          paid_by: string | null
          payment_id: string
          payment_method: string | null
          receipt_url: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          card_fee_percent?: number | null
          card_installments?: number | null
          card_operator_id?: string | null
          company_id: string
          compensation_date?: string | null
          created_at?: string
          gross_amount?: number | null
          id?: string
          notes?: string | null
          paid_at?: string
          paid_by?: string | null
          payment_id: string
          payment_method?: string | null
          receipt_url?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          card_fee_percent?: number | null
          card_installments?: number | null
          card_operator_id?: string | null
          company_id?: string
          compensation_date?: string | null
          created_at?: string
          gross_amount?: number | null
          id?: string
          notes?: string | null
          paid_at?: string
          paid_by?: string | null
          payment_id?: string
          payment_method?: string | null
          receipt_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_payment_entries_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "company_bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_payment_entries_card_operator_id_fkey"
            columns: ["card_operator_id"]
            isOneToOne: false
            referencedRelation: "company_card_fees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_payment_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_payment_entries_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "event_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      event_payments: {
        Row: {
          amount: number
          bank_account_id: string | null
          card_fee_percent: number | null
          card_installments: number | null
          card_operator_id: string | null
          company_id: string
          compensation_date: string | null
          created_at: string
          due_date: string
          event_id: string
          gross_amount: number | null
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          bank_account_id?: string | null
          card_fee_percent?: number | null
          card_installments?: number | null
          card_operator_id?: string | null
          company_id: string
          compensation_date?: string | null
          created_at?: string
          due_date: string
          event_id: string
          gross_amount?: number | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          card_fee_percent?: number | null
          card_installments?: number | null
          card_operator_id?: string | null
          company_id?: string
          compensation_date?: string | null
          created_at?: string
          due_date?: string
          event_id?: string
          gross_amount?: number | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "company_bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_payments_card_operator_id_fkey"
            columns: ["card_operator_id"]
            isOneToOne: false
            referencedRelation: "company_card_fees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "company_events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_staff_entries: {
        Row: {
          company_id: string
          created_at: string
          event_id: string | null
          filled_by: string | null
          id: string
          notes: string | null
          staff_data: Json
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          event_id?: string | null
          filled_by?: string | null
          id?: string
          notes?: string | null
          staff_data?: Json
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          event_id?: string | null
          filled_by?: string | null
          id?: string
          notes?: string | null
          staff_data?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_staff_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "company_events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_task_templates: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          items: Json
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          items?: Json
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          items?: Json
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_task_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_subcategories: {
        Row: {
          category: string
          company_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          category: string
          company_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_subcategories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_consents: {
        Row: {
          action_type: string
          amount: number | null
          company_id: string
          description: string | null
          entity_id: string
          entity_table: string
          id: string
          payload: Json
          requested_at: string
          requested_by: string | null
          requested_by_name: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewed_by_name: string | null
          status: string
        }
        Insert: {
          action_type: string
          amount?: number | null
          company_id: string
          description?: string | null
          entity_id: string
          entity_table: string
          id?: string
          payload?: Json
          requested_at?: string
          requested_by?: string | null
          requested_by_name?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_name?: string | null
          status?: string
        }
        Update: {
          action_type?: string
          amount?: number | null
          company_id?: string
          description?: string | null
          entity_id?: string
          entity_table?: string
          id?: string
          payload?: Json
          requested_at?: string
          requested_by?: string | null
          requested_by_name?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_name?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_consents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_edges: {
        Row: {
          condition_type: string | null
          condition_value: string | null
          condition_value_label: string | null
          created_at: string
          display_order: number
          flow_id: string
          id: string
          source_node_id: string
          source_option_id: string | null
          target_node_id: string
        }
        Insert: {
          condition_type?: string | null
          condition_value?: string | null
          condition_value_label?: string | null
          created_at?: string
          display_order?: number
          flow_id: string
          id?: string
          source_node_id: string
          source_option_id?: string | null
          target_node_id: string
        }
        Update: {
          condition_type?: string | null
          condition_value?: string | null
          condition_value_label?: string | null
          created_at?: string
          display_order?: number
          flow_id?: string
          id?: string
          source_node_id?: string
          source_option_id?: string | null
          target_node_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flow_edges_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "conversation_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_edges_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "flow_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_edges_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "flow_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_lead_state: {
        Row: {
          collected_data: Json | null
          conversation_id: string
          created_at: string
          current_node_id: string | null
          flow_id: string
          id: string
          last_sent_at: string | null
          updated_at: string
          waiting_for_reply: boolean
        }
        Insert: {
          collected_data?: Json | null
          conversation_id: string
          created_at?: string
          current_node_id?: string | null
          flow_id: string
          id?: string
          last_sent_at?: string | null
          updated_at?: string
          waiting_for_reply?: boolean
        }
        Update: {
          collected_data?: Json | null
          conversation_id?: string
          created_at?: string
          current_node_id?: string | null
          flow_id?: string
          id?: string
          last_sent_at?: string | null
          updated_at?: string
          waiting_for_reply?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "flow_lead_state_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "wapi_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_lead_state_current_node_id_fkey"
            columns: ["current_node_id"]
            isOneToOne: false
            referencedRelation: "flow_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_lead_state_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "conversation_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_node_options: {
        Row: {
          created_at: string
          display_order: number
          id: string
          label: string
          node_id: string
          value: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          label: string
          node_id: string
          value: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          label?: string
          node_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "flow_node_options_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "flow_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_nodes: {
        Row: {
          action_config: Json | null
          action_type: string | null
          allow_ai_interpretation: boolean | null
          created_at: string
          display_order: number
          extract_field: string | null
          flow_id: string
          id: string
          message_template: string | null
          node_type: string
          position_x: number
          position_y: number
          require_extraction: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          action_config?: Json | null
          action_type?: string | null
          allow_ai_interpretation?: boolean | null
          created_at?: string
          display_order?: number
          extract_field?: string | null
          flow_id: string
          id?: string
          message_template?: string | null
          node_type: string
          position_x?: number
          position_y?: number
          require_extraction?: boolean | null
          title?: string
          updated_at?: string
        }
        Update: {
          action_config?: Json | null
          action_type?: string | null
          allow_ai_interpretation?: boolean | null
          created_at?: string
          display_order?: number
          extract_field?: string | null
          flow_id?: string
          id?: string
          message_template?: string | null
          node_type?: string
          position_x?: number
          position_y?: number
          require_extraction?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flow_nodes_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "conversation_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      form_automation_settings: {
        Row: {
          company_id: string
          created_at: string
          form_type: string
          id: string
          is_enabled: boolean
          message_template: string | null
          send_days_before: number
          send_hour: number
          send_minute: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          form_type: string
          id?: string
          is_enabled?: boolean
          message_template?: string | null
          send_days_before?: number
          send_hour?: number
          send_minute?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          form_type?: string
          id?: string
          is_enabled?: boolean
          message_template?: string | null
          send_days_before?: number
          send_hour?: number
          send_minute?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_automation_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      freelancer_assignments: {
        Row: {
          company_id: string
          created_at: string
          event_id: string
          freelancer_name: string
          id: string
          role: string
          schedule_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          event_id: string
          freelancer_name: string
          id?: string
          role?: string
          schedule_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          event_id?: string
          freelancer_name?: string
          id?: string
          role?: string
          schedule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "freelancer_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freelancer_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "company_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freelancer_assignments_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "freelancer_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      freelancer_availability: {
        Row: {
          available_event_ids: string[]
          company_id: string
          created_at: string
          freelancer_name: string
          freelancer_phone: string
          id: string
          schedule_id: string
        }
        Insert: {
          available_event_ids?: string[]
          company_id: string
          created_at?: string
          freelancer_name: string
          freelancer_phone: string
          id?: string
          schedule_id: string
        }
        Update: {
          available_event_ids?: string[]
          company_id?: string
          created_at?: string
          freelancer_name?: string
          freelancer_phone?: string
          id?: string
          schedule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "freelancer_availability_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freelancer_availability_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "freelancer_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      freelancer_evaluations: {
        Row: {
          company_id: string
          created_at: string
          evaluated_by: string | null
          event_id: string | null
          event_staff_entry_id: string | null
          freelancer_name: string
          freelancer_response_id: string | null
          id: string
          observations: string | null
          scores: Json
        }
        Insert: {
          company_id: string
          created_at?: string
          evaluated_by?: string | null
          event_id?: string | null
          event_staff_entry_id?: string | null
          freelancer_name: string
          freelancer_response_id?: string | null
          id?: string
          observations?: string | null
          scores?: Json
        }
        Update: {
          company_id?: string
          created_at?: string
          evaluated_by?: string | null
          event_id?: string | null
          event_staff_entry_id?: string | null
          freelancer_name?: string
          freelancer_response_id?: string | null
          id?: string
          observations?: string | null
          scores?: Json
        }
        Relationships: [
          {
            foreignKeyName: "freelancer_evaluations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freelancer_evaluations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "company_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freelancer_evaluations_event_staff_entry_id_fkey"
            columns: ["event_staff_entry_id"]
            isOneToOne: false
            referencedRelation: "event_staff_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freelancer_evaluations_freelancer_response_id_fkey"
            columns: ["freelancer_response_id"]
            isOneToOne: false
            referencedRelation: "freelancer_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      freelancer_responses: {
        Row: {
          answers: Json
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          id: string
          photo_url: string | null
          pix_key: string | null
          pix_type: string | null
          respondent_name: string | null
          template_id: string
          whatsapp_send_error: string | null
          whatsapp_sent_at: string | null
        }
        Insert: {
          answers?: Json
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          id?: string
          photo_url?: string | null
          pix_key?: string | null
          pix_type?: string | null
          respondent_name?: string | null
          template_id: string
          whatsapp_send_error?: string | null
          whatsapp_sent_at?: string | null
        }
        Update: {
          answers?: Json
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          id?: string
          photo_url?: string | null
          pix_key?: string | null
          pix_type?: string | null
          respondent_name?: string | null
          template_id?: string
          whatsapp_send_error?: string | null
          whatsapp_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "freelancer_responses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freelancer_responses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "freelancer_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      freelancer_schedules: {
        Row: {
          company_id: string
          created_at: string
          end_date: string
          event_display_names: Json | null
          event_ids: string[]
          event_notes: Json | null
          id: string
          is_active: boolean
          notes: string | null
          schedule_type: string
          slug: string | null
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          end_date: string
          event_display_names?: Json | null
          event_ids?: string[]
          event_notes?: Json | null
          id?: string
          is_active?: boolean
          notes?: string | null
          schedule_type?: string
          slug?: string | null
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          end_date?: string
          event_display_names?: Json | null
          event_ids?: string[]
          event_notes?: Json | null
          id?: string
          is_active?: boolean
          notes?: string | null
          schedule_type?: string
          slug?: string | null
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "freelancer_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      freelancer_templates: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          questions: Json
          slug: string | null
          thank_you_message: string | null
          updated_at: string
          view_count: number
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          questions?: Json
          slug?: string | null
          thank_you_message?: string | null
          updated_at?: string
          view_count?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          questions?: Json
          slug?: string | null
          thank_you_message?: string | null
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "freelancer_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_contracts: {
        Row: {
          company_id: string
          conteudo_renderizado: string
          created_at: string
          created_by: string | null
          dados_utilizados: Json
          event_id: string | null
          id: string
          lead_id: string | null
          nome_documento: string
          pdf_url: string | null
          signature_token: string | null
          status: string
          template_id: string | null
          template_version_id: string | null
          tipo_evento: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          conteudo_renderizado: string
          created_at?: string
          created_by?: string | null
          dados_utilizados?: Json
          event_id?: string | null
          id?: string
          lead_id?: string | null
          nome_documento: string
          pdf_url?: string | null
          signature_token?: string | null
          status?: string
          template_id?: string | null
          template_version_id?: string | null
          tipo_evento?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          conteudo_renderizado?: string
          created_at?: string
          created_by?: string | null
          dados_utilizados?: Json
          event_id?: string | null
          id?: string
          lead_id?: string | null
          nome_documento?: string
          pdf_url?: string | null
          signature_token?: string | null
          status?: string
          template_id?: string | null
          template_version_id?: string | null
          tipo_evento?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_contracts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "company_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_contracts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "campaign_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_contracts_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "contract_model_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_recruitment_responses: {
        Row: {
          age: number | null
          answers: Json
          created_at: string
          id: string
          photo_url: string | null
          respondent_name: string
        }
        Insert: {
          age?: number | null
          answers?: Json
          created_at?: string
          id?: string
          photo_url?: string | null
          respondent_name: string
        }
        Update: {
          age?: number | null
          answers?: Json
          created_at?: string
          id?: string
          photo_url?: string | null
          respondent_name?: string
        }
        Relationships: []
      }
      lead_contract_data: {
        Row: {
          bairro: string | null
          brindes: string | null
          cep: string | null
          cidade: string | null
          company_id: string
          complemento: string | null
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          email: string | null
          endereco: string | null
          forma_pagamento: string | null
          id: string
          idade_aniversariante: string | null
          lead_id: string
          nome_aniversariante: string | null
          nomes_pais: string | null
          numero: string | null
          observacoes_comerciais: string | null
          parcelas: string | null
          rg: string | null
          updated_at: string
          valor_restante: number | null
          valor_sinal: number | null
        }
        Insert: {
          bairro?: string | null
          brindes?: string | null
          cep?: string | null
          cidade?: string | null
          company_id: string
          complemento?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          forma_pagamento?: string | null
          id?: string
          idade_aniversariante?: string | null
          lead_id: string
          nome_aniversariante?: string | null
          nomes_pais?: string | null
          numero?: string | null
          observacoes_comerciais?: string | null
          parcelas?: string | null
          rg?: string | null
          updated_at?: string
          valor_restante?: number | null
          valor_sinal?: number | null
        }
        Update: {
          bairro?: string | null
          brindes?: string | null
          cep?: string | null
          cidade?: string | null
          company_id?: string
          complemento?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          forma_pagamento?: string | null
          id?: string
          idade_aniversariante?: string | null
          lead_id?: string
          nome_aniversariante?: string | null
          nomes_pais?: string | null
          numero?: string | null
          observacoes_comerciais?: string | null
          parcelas?: string | null
          rg?: string | null
          updated_at?: string
          valor_restante?: number | null
          valor_sinal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_contract_data_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_contract_data_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "campaign_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_history: {
        Row: {
          action: string
          company_id: string | null
          created_at: string
          id: string
          lead_id: string
          new_value: string | null
          old_value: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string
          id?: string
          lead_id: string
          new_value?: string | null
          old_value?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          new_value?: string | null
          old_value?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "campaign_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_intelligence: {
        Row: {
          abandonment_type: string | null
          ai_next_action: string | null
          ai_suggested_message: string | null
          ai_summary: string | null
          ai_summary_at: string | null
          company_id: string
          created_at: string | null
          followup_count: number | null
          id: string
          intent_tags: Json | null
          last_agent_message_at: string | null
          last_customer_message_at: string | null
          lead_id: string
          priority_flag: boolean
          score: number
          temperature: string
          updated_at: string | null
        }
        Insert: {
          abandonment_type?: string | null
          ai_next_action?: string | null
          ai_suggested_message?: string | null
          ai_summary?: string | null
          ai_summary_at?: string | null
          company_id: string
          created_at?: string | null
          followup_count?: number | null
          id?: string
          intent_tags?: Json | null
          last_agent_message_at?: string | null
          last_customer_message_at?: string | null
          lead_id: string
          priority_flag?: boolean
          score?: number
          temperature?: string
          updated_at?: string | null
        }
        Update: {
          abandonment_type?: string | null
          ai_next_action?: string | null
          ai_suggested_message?: string | null
          ai_summary?: string | null
          ai_summary_at?: string | null
          company_id?: string
          created_at?: string | null
          followup_count?: number | null
          id?: string
          intent_tags?: Json | null
          last_agent_message_at?: string | null
          last_customer_message_at?: string | null
          lead_id?: string
          priority_flag?: boolean
          score?: number
          temperature?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_intelligence_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_intelligence_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "campaign_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_reactivation_history: {
        Row: {
          action_executed: string | null
          company_id: string
          conversation_id: string | null
          created_at: string
          failure_reason: string | null
          id: string
          is_interactive: boolean
          lead_id: string
          message_sent: string | null
          option_label: string | null
          option_selected: number | null
          reactivation_stage: string
          reactivation_type: string
          selected_at: string | null
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          action_executed?: string | null
          company_id: string
          conversation_id?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          is_interactive?: boolean
          lead_id: string
          message_sent?: string | null
          option_label?: string | null
          option_selected?: number | null
          reactivation_stage: string
          reactivation_type?: string
          selected_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          action_executed?: string | null
          company_id?: string
          conversation_id?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          is_interactive?: boolean
          lead_id?: string
          message_sent?: string | null
          option_label?: string | null
          option_selected?: number | null
          reactivation_stage?: string
          reactivation_type?: string
          selected_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_reactivation_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_reactivation_history_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "wapi_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_reactivation_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "campaign_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_score_snapshots: {
        Row: {
          company_id: string
          created_at: string
          id: string
          lead_id: string
          score: number
          snapshot_date: string
          temperature: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          lead_id: string
          score: number
          snapshot_date?: string
          temperature: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          lead_id?: string
          score?: number
          snapshot_date?: string
          temperature?: string
        }
        Relationships: []
      }
      lead_visits: {
        Row: {
          client_questions: string | null
          company_id: string
          created_at: string
          created_by: string | null
          data_visita: string
          event_id: string | null
          guest_count: number | null
          horario_visita: string | null
          id: string
          interest_level: string | null
          items_description: string | null
          lead_channel: string | null
          lead_id: string
          observacoes: string | null
          package_interest: string | null
          party_date_interest: string | null
          payment_preference: string | null
          responsavel_user_id: string | null
          restrictions: Json | null
          seller_notes: string | null
          status_visita: string
          unit: string | null
          visit_type: string
        }
        Insert: {
          client_questions?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          data_visita: string
          event_id?: string | null
          guest_count?: number | null
          horario_visita?: string | null
          id?: string
          interest_level?: string | null
          items_description?: string | null
          lead_channel?: string | null
          lead_id: string
          observacoes?: string | null
          package_interest?: string | null
          party_date_interest?: string | null
          payment_preference?: string | null
          responsavel_user_id?: string | null
          restrictions?: Json | null
          seller_notes?: string | null
          status_visita?: string
          unit?: string | null
          visit_type?: string
        }
        Update: {
          client_questions?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          data_visita?: string
          event_id?: string | null
          guest_count?: number | null
          horario_visita?: string | null
          id?: string
          interest_level?: string | null
          items_description?: string | null
          lead_channel?: string | null
          lead_id?: string
          observacoes?: string | null
          package_interest?: string | null
          party_date_interest?: string | null
          payment_preference?: string | null
          responsavel_user_id?: string | null
          restrictions?: Json | null
          seller_notes?: string | null
          status_visita?: string
          unit?: string | null
          visit_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_visits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_visits_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "company_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_visits_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "campaign_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lp_bot_settings: {
        Row: {
          auto_rotate_months: boolean
          company_id: string
          completion_message: string | null
          created_at: string
          external_location_question: string
          external_location_required: boolean
          guest_limit: number | null
          guest_limit_message: string | null
          guest_limit_redirect_name: string | null
          guest_options: Json | null
          guest_question: string | null
          id: string
          lead_routing_counter: number
          lead_routing_mode: string
          month_options: Json | null
          month_question: string | null
          name_question: string | null
          redirect_completion_message: string | null
          updated_at: string
          venue_options: Json
          venue_question_enabled: boolean
          venue_question_text: string
          welcome_message: string | null
          whatsapp_question: string | null
          whatsapp_welcome_template: string | null
        }
        Insert: {
          auto_rotate_months?: boolean
          company_id: string
          completion_message?: string | null
          created_at?: string
          external_location_question?: string
          external_location_required?: boolean
          guest_limit?: number | null
          guest_limit_message?: string | null
          guest_limit_redirect_name?: string | null
          guest_options?: Json | null
          guest_question?: string | null
          id?: string
          lead_routing_counter?: number
          lead_routing_mode?: string
          month_options?: Json | null
          month_question?: string | null
          name_question?: string | null
          redirect_completion_message?: string | null
          updated_at?: string
          venue_options?: Json
          venue_question_enabled?: boolean
          venue_question_text?: string
          welcome_message?: string | null
          whatsapp_question?: string | null
          whatsapp_welcome_template?: string | null
        }
        Update: {
          auto_rotate_months?: boolean
          company_id?: string
          completion_message?: string | null
          created_at?: string
          external_location_question?: string
          external_location_required?: boolean
          guest_limit?: number | null
          guest_limit_message?: string | null
          guest_limit_redirect_name?: string | null
          guest_options?: Json | null
          guest_question?: string | null
          id?: string
          lead_routing_counter?: number
          lead_routing_mode?: string
          month_options?: Json | null
          month_question?: string | null
          name_question?: string | null
          redirect_completion_message?: string | null
          updated_at?: string
          venue_options?: Json
          venue_question_enabled?: boolean
          venue_question_text?: string
          welcome_message?: string | null
          whatsapp_question?: string | null
          whatsapp_welcome_template?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lp_bot_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_entries: {
        Row: {
          company_id: string
          created_at: string
          event_id: string | null
          filled_by: string | null
          id: string
          items: Json
          notes: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          event_id?: string | null
          filled_by?: string | null
          id?: string
          items?: Json
          notes?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          event_id?: string | null
          filled_by?: string | null
          id?: string
          items?: Json
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "company_events"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          template: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          template: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          template?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_reviews: {
        Row: {
          ai_context_generated: string | null
          ai_summary: string | null
          company_id: string
          created_at: string
          dismissed_by: string[] | null
          id: string
          metrics: Json
          previous_metrics: Json | null
          review_month: string
          unit_slug: string | null
        }
        Insert: {
          ai_context_generated?: string | null
          ai_summary?: string | null
          company_id: string
          created_at?: string
          dismissed_by?: string[] | null
          id?: string
          metrics?: Json
          previous_metrics?: Json | null
          review_month: string
          unit_slug?: string | null
        }
        Update: {
          ai_context_generated?: string | null
          ai_summary?: string | null
          company_id?: string
          created_at?: string
          dismissed_by?: string[] | null
          id?: string
          metrics?: Json
          previous_metrics?: Json | null
          review_month?: string
          unit_slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          company_id: string | null
          created_at: string
          data: Json | null
          id: string
          message: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          message?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          message?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      package_price_tiers: {
        Row: {
          company_id: string
          created_at: string
          day_type: string
          guest_count: number
          id: string
          package_id: string
          price: number
        }
        Insert: {
          company_id: string
          created_at?: string
          day_type: string
          guest_count: number
          id?: string
          package_id: string
          price?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          day_type?: string
          guest_count?: number
          id?: string
          package_id?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "package_price_tiers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_price_tiers_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "company_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_orders: {
        Row: {
          client_name: string | null
          company_id: string
          created_at: string
          created_by: string | null
          delivery_date: string | null
          event_id: string | null
          event_title: string | null
          id: string
          items: Json
          notes: string | null
          status: string
          total_value: number
          updated_at: string
        }
        Insert: {
          client_name?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          delivery_date?: string | null
          event_id?: string | null
          event_title?: string | null
          id?: string
          items?: Json
          notes?: string | null
          status?: string
          total_value?: number
          updated_at?: string
        }
        Update: {
          client_name?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          delivery_date?: string | null
          event_id?: string | null
          event_title?: string | null
          id?: string
          items?: Json
          notes?: string | null
          status?: string
          total_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "company_events"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_products: {
        Row: {
          category: string
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      party_monitoring_entries: {
        Row: {
          company_id: string
          created_at: string
          event_id: string | null
          filled_by: string | null
          id: string
          items: Json
          notes: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          event_id?: string | null
          filled_by?: string | null
          id?: string
          items?: Json
          notes?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          event_id?: string | null
          filled_by?: string | null
          id?: string
          items?: Json
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_monitoring_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_monitoring_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "company_events"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_logs: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          reset_by_user_id: string
          reset_by_user_name: string | null
          target_user_email: string | null
          target_user_id: string
          target_user_name: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          reset_by_user_id: string
          reset_by_user_name?: string | null
          target_user_email?: string | null
          target_user_id: string
          target_user_name?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          reset_by_user_id?: string
          reset_by_user_name?: string | null
          target_user_email?: string | null
          target_user_id?: string
          target_user_name?: string | null
        }
        Relationships: []
      }
      permission_definitions: {
        Row: {
          category: string
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          category: string
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          category?: string
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      permission_presets: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_default: boolean | null
          name: string
          permissions: Json
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          permissions?: Json
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          permissions?: Json
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      pre_reservation_settings: {
        Row: {
          company_id: string
          created_at: string | null
          expiry_message: string | null
          hours_before_expiry: number | null
          id: string
          is_enabled: boolean | null
          send_on_last_day: boolean | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          expiry_message?: string | null
          hours_before_expiry?: number | null
          id?: string
          is_enabled?: boolean | null
          send_on_last_day?: boolean | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          expiry_message?: string | null
          hours_before_expiry?: number | null
          id?: string
          is_enabled?: boolean | null
          send_on_last_day?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pre_reservation_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pre_reservations: {
        Row: {
          cancellation_reason: string | null
          company_id: string
          converted_event_id: string | null
          created_at: string | null
          created_by: string | null
          customer_name: string
          customer_phone: string | null
          customer_response_at: string | null
          customer_response_status: string | null
          customer_response_text: string | null
          event_date: string
          id: string
          last_automation_sent_at: string | null
          lead_id: string | null
          notes: string | null
          reservation_days: number
          reservation_expires_at: string
          reservation_start_at: string
          status: string
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          cancellation_reason?: string | null
          company_id: string
          converted_event_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_response_at?: string | null
          customer_response_status?: string | null
          customer_response_text?: string | null
          event_date: string
          id?: string
          last_automation_sent_at?: string | null
          lead_id?: string | null
          notes?: string | null
          reservation_days?: number
          reservation_expires_at: string
          reservation_start_at?: string
          status?: string
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          cancellation_reason?: string | null
          company_id?: string
          converted_event_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_response_at?: string | null
          customer_response_status?: string | null
          customer_response_text?: string | null
          event_date?: string
          id?: string
          last_automation_sent_at?: string | null
          lead_id?: string | null
          notes?: string | null
          reservation_days?: number
          reservation_expires_at?: string
          reservation_start_at?: string
          status?: string
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pre_reservations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_reservations_converted_event_id_fkey"
            columns: ["converted_event_id"]
            isOneToOne: false
            referencedRelation: "company_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_reservations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "campaign_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      prefesta_responses: {
        Row: {
          answers: Json
          company_id: string
          created_at: string
          event_id: string | null
          id: string
          respondent_name: string | null
          template_id: string
        }
        Insert: {
          answers?: Json
          company_id: string
          created_at?: string
          event_id?: string | null
          id?: string
          respondent_name?: string | null
          template_id: string
        }
        Update: {
          answers?: Json
          company_id?: string
          created_at?: string
          event_id?: string | null
          id?: string
          respondent_name?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prefesta_responses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prefesta_responses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "company_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prefesta_responses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "prefesta_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      prefesta_templates: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          questions: Json
          slug: string | null
          thank_you_message: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          questions?: Json
          slug?: string | null
          thank_you_message?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          questions?: Json
          slug?: string | null
          thank_you_message?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prefesta_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      proposals: {
        Row: {
          company_name: string
          created_at: string
          custom_features: string[] | null
          discount: number | null
          discount_amount: number | null
          email: string | null
          id: string
          notes: string | null
          payment_type: string
          phone: string | null
          plan: string
          prospect_name: string
          subtotal: number
          total: number
          user_id: string
          valid_days: number
        }
        Insert: {
          company_name: string
          created_at?: string
          custom_features?: string[] | null
          discount?: number | null
          discount_amount?: number | null
          email?: string | null
          id?: string
          notes?: string | null
          payment_type: string
          phone?: string | null
          plan: string
          prospect_name: string
          subtotal: number
          total: number
          user_id: string
          valid_days?: number
        }
        Update: {
          company_name?: string
          created_at?: string
          custom_features?: string[] | null
          discount?: number | null
          discount_amount?: number | null
          email?: string | null
          id?: string
          notes?: string | null
          payment_type?: string
          phone?: string | null
          plan?: string
          prospect_name?: string
          subtotal?: number
          total?: number
          user_id?: string
          valid_days?: number
        }
        Relationships: []
      }
      reactivation_execution_log: {
        Row: {
          company_id: string | null
          details: Json | null
          executed_at: string | null
          id: string
          total_errors: number | null
          total_sent: number | null
          total_skipped: number | null
        }
        Insert: {
          company_id?: string | null
          details?: Json | null
          executed_at?: string | null
          id?: string
          total_errors?: number | null
          total_sent?: number | null
          total_skipped?: number | null
        }
        Update: {
          company_id?: string | null
          details?: Json | null
          executed_at?: string | null
          id?: string
          total_errors?: number | null
          total_sent?: number | null
          total_skipped?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reactivation_execution_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_material_captions: {
        Row: {
          caption_text: string
          caption_type: string
          company_id: string | null
          created_at: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          caption_text: string
          caption_type: string
          company_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          caption_text?: string
          caption_type?: string
          company_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_material_captions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_materials: {
        Row: {
          company_id: string
          created_at: string
          event_mode: string | null
          file_path: string | null
          file_url: string
          guest_count: number | null
          id: string
          is_active: boolean
          name: string
          photo_urls: string[] | null
          send_without_caption: boolean
          sort_order: number
          type: string
          unit: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          event_mode?: string | null
          file_path?: string | null
          file_url: string
          guest_count?: number | null
          id?: string
          is_active?: boolean
          name: string
          photo_urls?: string[] | null
          send_without_caption?: boolean
          sort_order?: number
          type: string
          unit: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          event_mode?: string | null
          file_path?: string | null
          file_url?: string
          guest_count?: number | null
          id?: string
          is_active?: boolean
          name?: string
          photo_urls?: string[] | null
          send_without_caption?: boolean
          sort_order?: number
          type?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_materials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_role_templates: {
        Row: {
          company_id: string
          created_at: string
          id: string
          roles: Json
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          roles?: Json
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          roles?: Json
        }
        Relationships: [
          {
            foreignKeyName: "staff_role_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          ai_classification: string | null
          category: string
          company_id: string | null
          console_errors: Json | null
          context_data: Json | null
          conversation_history: Json | null
          created_at: string
          description: string
          id: string
          page_url: string | null
          priority: string
          resolved_at: string | null
          status: string
          subject: string
          updated_at: string
          user_agent: string | null
          user_email: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          ai_classification?: string | null
          category?: string
          company_id?: string | null
          console_errors?: Json | null
          context_data?: Json | null
          conversation_history?: Json | null
          created_at?: string
          description: string
          id?: string
          page_url?: string | null
          priority?: string
          resolved_at?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_agent?: string | null
          user_email?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          ai_classification?: string | null
          category?: string
          company_id?: string | null
          console_errors?: Json | null
          context_data?: Json | null
          conversation_history?: Json | null
          created_at?: string
          description?: string
          id?: string
          page_url?: string | null
          priority?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      training_lessons: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_published: boolean | null
          sort_order: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          sort_order?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          sort_order?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: []
      }
      user_companies: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_default: boolean
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_default?: boolean
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_filter_preferences: {
        Row: {
          created_at: string
          filter_order: string[]
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filter_order?: string[]
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filter_order?: string[]
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          created_at: string | null
          granted: boolean
          granted_by: string | null
          id: string
          permission: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          granted?: boolean
          granted_by?: string | null
          id?: string
          permission: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          granted?: boolean
          granted_by?: string | null
          id?: string
          permission?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      visit_confirmation_history: {
        Row: {
          company_id: string
          created_at: string
          id: string
          message_type: string
          response_at: string | null
          response_received: boolean
          response_type: string | null
          sent_at: string | null
          status: string
          visit_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          message_type?: string
          response_at?: string | null
          response_received?: boolean
          response_type?: string | null
          sent_at?: string | null
          status?: string
          visit_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          message_type?: string
          response_at?: string | null
          response_received?: boolean
          response_type?: string | null
          sent_at?: string | null
          status?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_confirmation_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_confirmation_settings: {
        Row: {
          company_id: string
          confirmation_message: string
          created_at: string
          hours_before_visit: number
          id: string
          is_enabled: boolean
          reply_confirmed_message: string
          reply_reschedule_message: string
          second_message_enabled: boolean
          second_message_hours_after: number
          second_message_text: string
          send_window_end: number
          send_window_start: number
          updated_at: string
        }
        Insert: {
          company_id: string
          confirmation_message?: string
          created_at?: string
          hours_before_visit?: number
          id?: string
          is_enabled?: boolean
          reply_confirmed_message?: string
          reply_reschedule_message?: string
          second_message_enabled?: boolean
          second_message_hours_after?: number
          second_message_text?: string
          send_window_end?: number
          send_window_start?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          confirmation_message?: string
          created_at?: string
          hours_before_visit?: number
          id?: string
          is_enabled?: boolean
          reply_confirmed_message?: string
          reply_reschedule_message?: string
          second_message_enabled?: boolean
          second_message_hours_after?: number
          second_message_text?: string
          send_window_end?: number
          send_window_start?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_confirmation_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      wapi_bot_questions: {
        Row: {
          company_id: string | null
          confirmation_text: string | null
          created_at: string
          id: string
          instance_id: string
          is_active: boolean
          question_text: string
          sort_order: number
          step: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          confirmation_text?: string | null
          created_at?: string
          id?: string
          instance_id: string
          is_active?: boolean
          question_text: string
          sort_order?: number
          step: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          confirmation_text?: string | null
          created_at?: string
          id?: string
          instance_id?: string
          is_active?: boolean
          question_text?: string
          sort_order?: number
          step?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wapi_bot_questions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wapi_bot_questions_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "wapi_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      wapi_bot_settings: {
        Row: {
          ai_context: string | null
          auto_lost_delay_hours: number
          auto_lost_enabled: boolean
          auto_send_materials: boolean | null
          auto_send_pdf: boolean | null
          auto_send_pdf_intro: string | null
          auto_send_photos: boolean | null
          auto_send_photos_intro: string | null
          auto_send_presentation_video: boolean | null
          auto_send_promo_video: boolean | null
          bot_enabled: boolean
          bot_inactive_followup_delay_minutes: number | null
          bot_inactive_followup_enabled: boolean | null
          bot_inactive_followup_message: string | null
          company_id: string | null
          completion_message: string | null
          created_at: string
          follow_up_2_delay_hours: number | null
          follow_up_2_enabled: boolean | null
          follow_up_2_message: string | null
          follow_up_3_delay_hours: number
          follow_up_3_enabled: boolean
          follow_up_3_message: string | null
          follow_up_4_delay_hours: number
          follow_up_4_enabled: boolean
          follow_up_4_message: string | null
          follow_up_delay_hours: number | null
          follow_up_enabled: boolean | null
          follow_up_max_hour: number
          follow_up_message: string | null
          follow_up_min_hour: number
          follow_up_send_max_delay: number
          follow_up_send_min_delay: number
          guest_limit: number | null
          guest_limit_message: string | null
          guest_limit_redirect_name: string | null
          id: string
          instance_id: string
          message_delay_seconds: number | null
          next_step_analyze_response: string | null
          next_step_question: string | null
          next_step_questions_response: string | null
          next_step_reminder_delay_minutes: number | null
          next_step_reminder_enabled: boolean | null
          next_step_reminder_message: string | null
          next_step_visit_response: string | null
          qualified_lead_message: string | null
          redirect_completion_message: string | null
          test_mode_enabled: boolean
          test_mode_number: string | null
          transfer_message: string | null
          updated_at: string
          use_flow_builder: boolean | null
          welcome_message: string | null
          work_here_response: string | null
        }
        Insert: {
          ai_context?: string | null
          auto_lost_delay_hours?: number
          auto_lost_enabled?: boolean
          auto_send_materials?: boolean | null
          auto_send_pdf?: boolean | null
          auto_send_pdf_intro?: string | null
          auto_send_photos?: boolean | null
          auto_send_photos_intro?: string | null
          auto_send_presentation_video?: boolean | null
          auto_send_promo_video?: boolean | null
          bot_enabled?: boolean
          bot_inactive_followup_delay_minutes?: number | null
          bot_inactive_followup_enabled?: boolean | null
          bot_inactive_followup_message?: string | null
          company_id?: string | null
          completion_message?: string | null
          created_at?: string
          follow_up_2_delay_hours?: number | null
          follow_up_2_enabled?: boolean | null
          follow_up_2_message?: string | null
          follow_up_3_delay_hours?: number
          follow_up_3_enabled?: boolean
          follow_up_3_message?: string | null
          follow_up_4_delay_hours?: number
          follow_up_4_enabled?: boolean
          follow_up_4_message?: string | null
          follow_up_delay_hours?: number | null
          follow_up_enabled?: boolean | null
          follow_up_max_hour?: number
          follow_up_message?: string | null
          follow_up_min_hour?: number
          follow_up_send_max_delay?: number
          follow_up_send_min_delay?: number
          guest_limit?: number | null
          guest_limit_message?: string | null
          guest_limit_redirect_name?: string | null
          id?: string
          instance_id: string
          message_delay_seconds?: number | null
          next_step_analyze_response?: string | null
          next_step_question?: string | null
          next_step_questions_response?: string | null
          next_step_reminder_delay_minutes?: number | null
          next_step_reminder_enabled?: boolean | null
          next_step_reminder_message?: string | null
          next_step_visit_response?: string | null
          qualified_lead_message?: string | null
          redirect_completion_message?: string | null
          test_mode_enabled?: boolean
          test_mode_number?: string | null
          transfer_message?: string | null
          updated_at?: string
          use_flow_builder?: boolean | null
          welcome_message?: string | null
          work_here_response?: string | null
        }
        Update: {
          ai_context?: string | null
          auto_lost_delay_hours?: number
          auto_lost_enabled?: boolean
          auto_send_materials?: boolean | null
          auto_send_pdf?: boolean | null
          auto_send_pdf_intro?: string | null
          auto_send_photos?: boolean | null
          auto_send_photos_intro?: string | null
          auto_send_presentation_video?: boolean | null
          auto_send_promo_video?: boolean | null
          bot_enabled?: boolean
          bot_inactive_followup_delay_minutes?: number | null
          bot_inactive_followup_enabled?: boolean | null
          bot_inactive_followup_message?: string | null
          company_id?: string | null
          completion_message?: string | null
          created_at?: string
          follow_up_2_delay_hours?: number | null
          follow_up_2_enabled?: boolean | null
          follow_up_2_message?: string | null
          follow_up_3_delay_hours?: number
          follow_up_3_enabled?: boolean
          follow_up_3_message?: string | null
          follow_up_4_delay_hours?: number
          follow_up_4_enabled?: boolean
          follow_up_4_message?: string | null
          follow_up_delay_hours?: number | null
          follow_up_enabled?: boolean | null
          follow_up_max_hour?: number
          follow_up_message?: string | null
          follow_up_min_hour?: number
          follow_up_send_max_delay?: number
          follow_up_send_min_delay?: number
          guest_limit?: number | null
          guest_limit_message?: string | null
          guest_limit_redirect_name?: string | null
          id?: string
          instance_id?: string
          message_delay_seconds?: number | null
          next_step_analyze_response?: string | null
          next_step_question?: string | null
          next_step_questions_response?: string | null
          next_step_reminder_delay_minutes?: number | null
          next_step_reminder_enabled?: boolean | null
          next_step_reminder_message?: string | null
          next_step_visit_response?: string | null
          qualified_lead_message?: string | null
          redirect_completion_message?: string | null
          test_mode_enabled?: boolean
          test_mode_number?: string | null
          transfer_message?: string | null
          updated_at?: string
          use_flow_builder?: boolean | null
          welcome_message?: string | null
          work_here_response?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wapi_bot_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wapi_bot_settings_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: true
            referencedRelation: "wapi_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      wapi_conversations: {
        Row: {
          bot_data: Json | null
          bot_enabled: boolean | null
          bot_paused_at: string | null
          bot_paused_reason: string | null
          bot_paused_until: string | null
          bot_step: string | null
          company_id: string
          contact_name: string | null
          contact_phone: string
          contact_picture: string | null
          created_at: string
          has_scheduled_visit: boolean
          id: string
          instance_id: string
          is_closed: boolean | null
          is_equipe: boolean
          is_favorite: boolean | null
          is_freelancer: boolean
          is_imported: boolean
          last_message_at: string | null
          last_message_content: string | null
          last_message_from_me: boolean | null
          lead_id: string | null
          pinned_message_id: string | null
          remote_jid: string
          unread_count: number | null
          updated_at: string
        }
        Insert: {
          bot_data?: Json | null
          bot_enabled?: boolean | null
          bot_paused_at?: string | null
          bot_paused_reason?: string | null
          bot_paused_until?: string | null
          bot_step?: string | null
          company_id: string
          contact_name?: string | null
          contact_phone: string
          contact_picture?: string | null
          created_at?: string
          has_scheduled_visit?: boolean
          id?: string
          instance_id: string
          is_closed?: boolean | null
          is_equipe?: boolean
          is_favorite?: boolean | null
          is_freelancer?: boolean
          is_imported?: boolean
          last_message_at?: string | null
          last_message_content?: string | null
          last_message_from_me?: boolean | null
          lead_id?: string | null
          pinned_message_id?: string | null
          remote_jid: string
          unread_count?: number | null
          updated_at?: string
        }
        Update: {
          bot_data?: Json | null
          bot_enabled?: boolean | null
          bot_paused_at?: string | null
          bot_paused_reason?: string | null
          bot_paused_until?: string | null
          bot_step?: string | null
          company_id?: string
          contact_name?: string | null
          contact_phone?: string
          contact_picture?: string | null
          created_at?: string
          has_scheduled_visit?: boolean
          id?: string
          instance_id?: string
          is_closed?: boolean | null
          is_equipe?: boolean
          is_favorite?: boolean | null
          is_freelancer?: boolean
          is_imported?: boolean
          last_message_at?: string | null
          last_message_content?: string | null
          last_message_from_me?: boolean | null
          lead_id?: string | null
          pinned_message_id?: string | null
          remote_jid?: string
          unread_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wapi_conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wapi_conversations_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "wapi_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wapi_conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "campaign_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wapi_conversations_pinned_message_id_fkey"
            columns: ["pinned_message_id"]
            isOneToOne: false
            referencedRelation: "wapi_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      wapi_instances: {
        Row: {
          addon_valid_until: string | null
          auto_recovery_attempts: number | null
          client_token: string | null
          company_id: string
          connected_at: string | null
          created_at: string
          credits_available: number | null
          id: string
          instance_id: string
          instance_token: string
          is_active: boolean
          last_health_check: string | null
          last_restart_attempt: string | null
          messages_count: number | null
          phone_number: string | null
          provider: string
          queue_auto_approve_minutes: number
          queue_drip_seconds_max: number
          queue_drip_seconds_min: number
          queue_max_per_hour: number
          status: string | null
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          addon_valid_until?: string | null
          auto_recovery_attempts?: number | null
          client_token?: string | null
          company_id: string
          connected_at?: string | null
          created_at?: string
          credits_available?: number | null
          id?: string
          instance_id: string
          instance_token: string
          is_active?: boolean
          last_health_check?: string | null
          last_restart_attempt?: string | null
          messages_count?: number | null
          phone_number?: string | null
          provider?: string
          queue_auto_approve_minutes?: number
          queue_drip_seconds_max?: number
          queue_drip_seconds_min?: number
          queue_max_per_hour?: number
          status?: string | null
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          addon_valid_until?: string | null
          auto_recovery_attempts?: number | null
          client_token?: string | null
          company_id?: string
          connected_at?: string | null
          created_at?: string
          credits_available?: number | null
          id?: string
          instance_id?: string
          instance_token?: string
          is_active?: boolean
          last_health_check?: string | null
          last_restart_attempt?: string | null
          messages_count?: number | null
          phone_number?: string | null
          provider?: string
          queue_auto_approve_minutes?: number
          queue_drip_seconds_max?: number
          queue_drip_seconds_min?: number
          queue_max_per_hour?: number
          status?: string | null
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wapi_instances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      wapi_messages: {
        Row: {
          company_id: string | null
          content: string | null
          conversation_id: string
          created_at: string
          from_me: boolean
          id: string
          is_starred: boolean
          media_direct_path: string | null
          media_key: string | null
          media_url: string | null
          message_id: string | null
          message_type: string
          metadata: Json | null
          quoted_message_id: string | null
          status: string | null
          timestamp: string
        }
        Insert: {
          company_id?: string | null
          content?: string | null
          conversation_id: string
          created_at?: string
          from_me?: boolean
          id?: string
          is_starred?: boolean
          media_direct_path?: string | null
          media_key?: string | null
          media_url?: string | null
          message_id?: string | null
          message_type?: string
          metadata?: Json | null
          quoted_message_id?: string | null
          status?: string | null
          timestamp?: string
        }
        Update: {
          company_id?: string | null
          content?: string | null
          conversation_id?: string
          created_at?: string
          from_me?: boolean
          id?: string
          is_starred?: boolean
          media_direct_path?: string | null
          media_key?: string | null
          media_url?: string | null
          message_id?: string | null
          message_type?: string
          metadata?: Json | null
          quoted_message_id?: string | null
          status?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "wapi_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wapi_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "wapi_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wapi_messages_quoted_message_id_fkey"
            columns: ["quoted_message_id"]
            isOneToOne: false
            referencedRelation: "wapi_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      wapi_messages_dedup_backup_20260514: {
        Row: {
          company_id: string | null
          content: string | null
          conversation_id: string | null
          created_at: string | null
          from_me: boolean | null
          id: string | null
          is_starred: boolean | null
          media_direct_path: string | null
          media_key: string | null
          media_url: string | null
          message_id: string | null
          message_type: string | null
          metadata: Json | null
          quoted_message_id: string | null
          status: string | null
          timestamp: string | null
        }
        Insert: {
          company_id?: string | null
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          from_me?: boolean | null
          id?: string | null
          is_starred?: boolean | null
          media_direct_path?: string | null
          media_key?: string | null
          media_url?: string | null
          message_id?: string | null
          message_type?: string | null
          metadata?: Json | null
          quoted_message_id?: string | null
          status?: string | null
          timestamp?: string | null
        }
        Update: {
          company_id?: string | null
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          from_me?: boolean | null
          id?: string | null
          is_starred?: boolean | null
          media_direct_path?: string | null
          media_key?: string | null
          media_url?: string | null
          message_id?: string | null
          message_type?: string | null
          metadata?: Json | null
          quoted_message_id?: string | null
          status?: string | null
          timestamp?: string | null
        }
        Relationships: []
      }
      wapi_vip_numbers: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          id: string
          instance_id: string
          name: string | null
          phone: string
          reason: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          instance_id: string
          name?: string | null
          phone: string
          reason?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          instance_id?: string
          name?: string | null
          phone?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wapi_vip_numbers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wapi_vip_numbers_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "wapi_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      wapi_webhook_raw_events: {
        Row: {
          conversation_id: string | null
          error: string | null
          event_type: string | null
          from_me: boolean | null
          has_content: boolean | null
          headers: Json | null
          id: string
          instance_id: string | null
          ip: string | null
          is_group: boolean | null
          is_status_broadcast: boolean | null
          message_db_id: string | null
          message_id: string | null
          payload: Json
          processing_note: string | null
          processing_status: string
          provider: string | null
          received_at: string
          remote_jid: string | null
        }
        Insert: {
          conversation_id?: string | null
          error?: string | null
          event_type?: string | null
          from_me?: boolean | null
          has_content?: boolean | null
          headers?: Json | null
          id?: string
          instance_id?: string | null
          ip?: string | null
          is_group?: boolean | null
          is_status_broadcast?: boolean | null
          message_db_id?: string | null
          message_id?: string | null
          payload: Json
          processing_note?: string | null
          processing_status?: string
          provider?: string | null
          received_at?: string
          remote_jid?: string | null
        }
        Update: {
          conversation_id?: string | null
          error?: string | null
          event_type?: string | null
          from_me?: boolean | null
          has_content?: boolean | null
          headers?: Json | null
          id?: string
          instance_id?: string | null
          ip?: string | null
          is_group?: boolean | null
          is_status_broadcast?: boolean | null
          message_db_id?: string | null
          message_id?: string | null
          payload?: Json
          processing_note?: string | null
          processing_status?: string
          provider?: string | null
          received_at?: string
          remote_jid?: string | null
        }
        Relationships: []
      }
      whatsapp_outbound_queue: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          attempts: number
          company_id: string
          contact_name: string | null
          created_at: string
          id: string
          instance_id: string
          last_error: string | null
          payload: Json
          preview: string | null
          rejected_at: string | null
          rejected_by: string | null
          scheduled_for: string | null
          sent_at: string | null
          source: string
          status: string
          to_phone: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          attempts?: number
          company_id: string
          contact_name?: string | null
          created_at?: string
          id?: string
          instance_id: string
          last_error?: string | null
          payload: Json
          preview?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          source?: string
          status?: string
          to_phone: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          attempts?: number
          company_id?: string
          contact_name?: string | null
          created_at?: string
          id?: string
          instance_id?: string
          last_error?: string | null
          payload?: Json
          preview?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          source?: string
          status?: string
          to_phone?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_permissions: {
        Args: { _target_user_id: string; _user_id: string }
        Returns: boolean
      }
      get_attendance_entry_public: {
        Args: { _entry_id: string }
        Returns: {
          company_id: string
          event_id: string
          finalized_at: string
          guests: Json
          id: string
          notes: string
          receptionist_name: string
        }[]
      }
      get_cardapio_template_by_slugs: {
        Args: { _company_slug: string; _template_slug: string }
        Returns: {
          company_id: string
          company_logo: string
          company_name: string
          company_slug: string
          description: string
          id: string
          sections: Json
          template_name: string
          thank_you_message: string
        }[]
      }
      get_cardapio_template_public: {
        Args: { _template_id: string }
        Returns: {
          company_id: string
          company_logo: string
          company_name: string
          company_slug: string
          description: string
          id: string
          sections: Json
          template_name: string
          thank_you_message: string
        }[]
      }
      get_client_data_request_by_token: {
        Args: { _token: string }
        Returns: {
          company_id: string
          company_logo: string
          company_name: string
          event_date: string
          event_id: string
          event_title: string
          id: string
          status: string
        }[]
      }
      get_company_branding_by_domain: {
        Args: { _domain: string }
        Returns: {
          logo_url: string
          name: string
        }[]
      }
      get_company_branding_by_domain_fuzzy: {
        Args: { _base_name: string }
        Returns: {
          logo_url: string
          name: string
        }[]
      }
      get_company_branding_by_slug: {
        Args: { _slug: string }
        Returns: {
          logo_url: string
          name: string
        }[]
      }
      get_company_by_domain: {
        Args: { _domain: string }
        Returns: {
          custom_domain: string
          id: string
          logo_url: string
          name: string
          settings: Json
          slug: string
        }[]
      }
      get_company_events_for_cardapio: {
        Args: { _company_id: string }
        Returns: {
          event_date: string
          event_id: string
          event_title: string
          lead_name: string
        }[]
      }
      get_company_id_by_slug: { Args: { _slug: string }; Returns: string }
      get_company_public_info: {
        Args: { _company_id: string }
        Returns: {
          id: string
          logo_url: string
          name: string
          slug: string
        }[]
      }
      get_company_public_with_settings: {
        Args: { _company_id: string }
        Returns: {
          id: string
          logo_url: string
          name: string
          settings: Json
          slug: string
        }[]
      }
      get_contract_for_signing: {
        Args: { _token: string }
        Returns: {
          company_id: string
          company_logo: string
          company_name: string
          conteudo_renderizado: string
          contract_id: string
          document_hash: string
          nome_documento: string
          signature_image_url: string
          signature_status: string
          signed_at: string
          signer_name: string
          signer_phone: string
          status: string
          tipo_evento: string
        }[]
      }
      get_contrato_template_by_slugs: {
        Args: { _company_slug: string; _template_slug: string }
        Returns: {
          company_id: string
          company_logo: string
          company_name: string
          company_slug: string
          description: string
          id: string
          questions: Json
          template_name: string
          thank_you_message: string
        }[]
      }
      get_contrato_template_public: {
        Args: { _template_id: string }
        Returns: {
          company_id: string
          company_logo: string
          company_name: string
          company_slug: string
          description: string
          id: string
          questions: Json
          template_name: string
          thank_you_message: string
        }[]
      }
      get_evaluation_template_by_slugs: {
        Args: { _company_slug: string; _template_slug: string }
        Returns: {
          company_id: string
          company_logo: string
          company_name: string
          company_slug: string
          description: string
          id: string
          questions: Json
          template_name: string
          thank_you_message: string
        }[]
      }
      get_evaluation_template_public: {
        Args: { _template_id: string }
        Returns: {
          company_id: string
          company_logo: string
          company_name: string
          company_slug: string
          description: string
          id: string
          questions: Json
          template_name: string
          thank_you_message: string
        }[]
      }
      get_evaluations_by_staff_entry: {
        Args: { _entry_id: string }
        Returns: {
          company_id: string
          created_at: string
          event_id: string
          event_staff_entry_id: string
          freelancer_name: string
          id: string
          observations: string
          scores: Json
        }[]
      }
      get_event_info_entries_by_event_public: {
        Args: { _event_id: string }
        Returns: {
          id: string
          items: Json
        }[]
      }
      get_event_info_entry_public: {
        Args: { _id: string }
        Returns: {
          company_id: string
          event_id: string
          id: string
          items: Json
          notes: string
        }[]
      }
      get_event_public_info: {
        Args: { _event_id: string }
        Returns: {
          birthday_children: Json
          child_age: string
          child_name: string
          company_id: string
          end_time: string
          event_date: string
          event_optionals: Json
          event_type: string
          guest_count: number
          id: string
          lead_id: string
          notes: string
          package_name: string
          parent_names: string
          start_time: string
          status: string
          title: string
          unit: string
        }[]
      }
      get_events_public_list: {
        Args: { _company_id: string }
        Returns: {
          end_time: string
          event_date: string
          event_type: string
          id: string
          package_name: string
          start_time: string
          title: string
        }[]
      }
      get_freelancer_schedule_public: {
        Args: { _company_id?: string; _schedule_id?: string; _slug?: string }
        Returns: {
          company_id: string
          end_date: string
          event_display_names: Json
          event_ids: string[]
          event_notes: Json
          id: string
          is_active: boolean
          notes: string
          slug: string
          start_date: string
          title: string
        }[]
      }
      get_freelancer_template_by_slugs: {
        Args: { _company_slug: string; _template_slug: string }
        Returns: {
          company_id: string
          company_logo: string
          company_name: string
          company_slug: string
          description: string
          id: string
          questions: Json
          template_name: string
          thank_you_message: string
        }[]
      }
      get_freelancer_template_public: {
        Args: { _template_id: string }
        Returns: {
          company_id: string
          company_logo: string
          company_name: string
          company_slug: string
          description: string
          id: string
          questions: Json
          template_name: string
          thank_you_message: string
        }[]
      }
      get_landing_page_by_domain: {
        Args: { _domain: string }
        Returns: {
          benefits: Json
          company_id: string
          company_logo: string
          company_name: string
          company_slug: string
          footer: Json
          gallery: Json
          hero: Json
          how_it_works: Json
          offer: Json
          social_proof: Json
          testimonials: Json
          theme: Json
          video: Json
        }[]
      }
      get_landing_page_by_slug: {
        Args: { _slug: string }
        Returns: {
          benefits: Json
          company_id: string
          company_logo: string
          company_name: string
          company_slug: string
          footer: Json
          gallery: Json
          hero: Json
          how_it_works: Json
          offer: Json
          social_proof: Json
          testimonials: Json
          theme: Json
          video: Json
        }[]
      }
      get_lead_duplicates_in_hub: {
        Args: { _company_id: string; _phone: string }
        Returns: {
          company_id: string
          company_name: string
          last_message_at: string
          lead_created_at: string
          lead_id: string
          status: string
        }[]
      }
      get_lp_bot_settings_public: {
        Args: { _company_id: string }
        Returns: {
          completion_message: string
          external_location_question: string
          external_location_required: boolean
          guest_limit: number
          guest_limit_message: string
          guest_limit_redirect_name: string
          guest_options: Json
          guest_question: string
          lead_routing_mode: string
          month_options: Json
          month_question: string
          name_question: string
          redirect_completion_message: string
          venue_options: Json
          venue_question_enabled: boolean
          venue_question_text: string
          welcome_message: string
          whatsapp_question: string
          whatsapp_welcome_template: string
        }[]
      }
      get_maintenance_entry_public: {
        Args: { _entry_id: string }
        Returns: {
          company_id: string
          event_id: string
          id: string
          items: Json
          notes: string
        }[]
      }
      get_onboarding_public_fields: {
        Args: { _company_id: string }
        Returns: {
          instagram: string
          multiple_units: boolean
          whatsapp_numbers: string[]
        }[]
      }
      get_party_control_module_status: {
        Args: { _event_id: string }
        Returns: {
          attendance_guest_count: number
          has_maintenance: boolean
          has_monitoring: boolean
          has_staff: boolean
        }[]
      }
      get_party_monitoring_entry_public: {
        Args: { _entry_id: string }
        Returns: {
          company_id: string
          event_id: string
          id: string
          items: Json
          notes: string
        }[]
      }
      get_prefesta_template_by_slugs: {
        Args: { _company_slug: string; _template_slug: string }
        Returns: {
          company_id: string
          company_logo: string
          company_name: string
          company_slug: string
          description: string
          id: string
          questions: Json
          template_name: string
          thank_you_message: string
        }[]
      }
      get_prefesta_template_public: {
        Args: { _template_id: string }
        Returns: {
          company_id: string
          company_logo: string
          company_name: string
          company_slug: string
          description: string
          id: string
          questions: Json
          template_name: string
          thank_you_message: string
        }[]
      }
      get_profiles_for_transfer: {
        Args: never
        Returns: {
          avatar_url: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          user_id: string
        }[]
      }
      get_staff_entry_public: {
        Args: { _entry_id: string }
        Returns: {
          company_id: string
          created_at: string
          event_id: string
          id: string
          notes: string
          staff_data: Json
          updated_at: string
        }[]
      }
      get_user_company_ids: { Args: { _user_id: string }; Returns: string[] }
      get_user_default_company: { Args: { _user_id: string }; Returns: string }
      increment_freelancer_template_views: {
        Args: { _template_id: string }
        Returns: undefined
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      merge_duplicate_conversations_intra_instance: {
        Args: never
        Returns: Json
      }
      merge_lid_into_real_conversation: {
        Args: { _loser_id: string; _winner_id: string }
        Returns: Json
      }
      recalculate_lead_score: { Args: { _lead_id: string }; Returns: undefined }
      reset_company_data: {
        Args: {
          _company_id: string
          _delete_conversations?: boolean
          _delete_leads?: boolean
        }
        Returns: Json
      }
      submit_client_data_public: {
        Args: { _client_data: Json; _token: string }
        Returns: undefined
      }
      submit_contract_signature: {
        Args: {
          _ip: string
          _otp: string
          _signature_base64: string
          _token: string
          _user_agent: string
        }
        Returns: Json
      }
      submit_freelancer_availability_public: {
        Args: {
          _available_event_ids: string[]
          _freelancer_name: string
          _freelancer_phone: string
          _schedule_id: string
        }
        Returns: boolean
      }
      submit_freelancer_evaluation: {
        Args: {
          _company_id: string
          _entry_id: string
          _event_id: string
          _freelancer_name: string
          _observations: string
          _scores: Json
        }
        Returns: string
      }
      update_attendance_entry_public: {
        Args: {
          _entry_id: string
          _event_id?: string
          _finalized_at?: string
          _guests: Json
          _notes?: string
          _receptionist_name?: string
        }
        Returns: undefined
      }
      update_event_info_entry_public: {
        Args: {
          _entry_id: string
          _event_id?: string
          _items: Json
          _notes?: string
        }
        Returns: undefined
      }
      update_maintenance_entry_public: {
        Args: {
          _entry_id: string
          _event_id?: string
          _items: Json
          _notes?: string
        }
        Returns: boolean
      }
      update_party_monitoring_entry_public: {
        Args: {
          _entry_id: string
          _event_id?: string
          _items: Json
          _notes?: string
        }
        Returns: boolean
      }
      update_staff_entry_public: {
        Args: {
          _entry_id: string
          _event_id?: string
          _notes?: string
          _staff_data: Json
        }
        Returns: undefined
      }
      user_has_company_access: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      lead_status:
        | "novo"
        | "em_contato"
        | "orcamento_enviado"
        | "aguardando_resposta"
        | "fechado"
        | "perdido"
        | "transferido"
        | "trabalhe_conosco"
        | "fornecedor"
        | "cliente_retorno"
        | "outros"
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
    Enums: {
      lead_status: [
        "novo",
        "em_contato",
        "orcamento_enviado",
        "aguardando_resposta",
        "fechado",
        "perdido",
        "transferido",
        "trabalhe_conosco",
        "fornecedor",
        "cliente_retorno",
        "outros",
      ],
    },
  },
} as const
