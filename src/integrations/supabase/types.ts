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
      b2b_leads: {
        Row: {
          city: string | null
          company_name: string
          contact_name: string
          created_at: string
          current_tools: string | null
          email: string
          how_found_us: string | null
          id: string
          main_challenges: string | null
          monthly_parties: number | null
          notes: string | null
          phone: string | null
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
          how_found_us?: string | null
          id?: string
          main_challenges?: string | null
          monthly_parties?: number | null
          notes?: string | null
          phone?: string | null
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
          how_found_us?: string | null
          id?: string
          main_challenges?: string | null
          monthly_parties?: number | null
          notes?: string | null
          phone?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
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
      companies: {
        Row: {
          created_at: string
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
      company_onboarding: {
        Row: {
          additional_notes: string | null
          attendants_count: number | null
          brand_notes: string | null
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
          id: string
          instagram: string | null
          lead_sources: string[] | null
          lead_volume: string | null
          logo_url: string | null
          main_goal: string | null
          monthly_investment: string | null
          multiple_units: boolean | null
          photo_urls: string[] | null
          secondary_contact: string | null
          service_hours: string | null
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
          brand_notes?: string | null
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
          id?: string
          instagram?: string | null
          lead_sources?: string[] | null
          lead_volume?: string | null
          logo_url?: string | null
          main_goal?: string | null
          monthly_investment?: string | null
          multiple_units?: boolean | null
          photo_urls?: string[] | null
          secondary_contact?: string | null
          service_hours?: string | null
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
          brand_notes?: string | null
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
          id?: string
          instagram?: string | null
          lead_sources?: string[] | null
          lead_volume?: string | null
          logo_url?: string | null
          main_goal?: string | null
          monthly_investment?: string | null
          multiple_units?: boolean | null
          photo_urls?: string[] | null
          secondary_contact?: string | null
          service_hours?: string | null
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
      notifications: {
        Row: {
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
          created_at?: string
          data?: Json | null
          id?: string
          message?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
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
      profiles: {
        Row: {
          avatar_url: string | null
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
          file_path: string | null
          file_url: string
          guest_count: number | null
          id: string
          is_active: boolean
          name: string
          photo_urls: string[] | null
          sort_order: number
          type: string
          unit: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          file_path?: string | null
          file_url: string
          guest_count?: number | null
          id?: string
          is_active?: boolean
          name: string
          photo_urls?: string[] | null
          sort_order?: number
          type: string
          unit: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          file_path?: string | null
          file_url?: string
          guest_count?: number | null
          id?: string
          is_active?: boolean
          name?: string
          photo_urls?: string[] | null
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
          auto_send_materials: boolean | null
          auto_send_pdf: boolean | null
          auto_send_pdf_intro: string | null
          auto_send_photos: boolean | null
          auto_send_photos_intro: string | null
          auto_send_presentation_video: boolean | null
          auto_send_promo_video: boolean | null
          bot_enabled: boolean
          company_id: string | null
          completion_message: string | null
          created_at: string
          follow_up_2_delay_hours: number | null
          follow_up_2_enabled: boolean | null
          follow_up_2_message: string | null
          follow_up_delay_hours: number | null
          follow_up_enabled: boolean | null
          follow_up_message: string | null
          id: string
          instance_id: string
          message_delay_seconds: number | null
          next_step_analyze_response: string | null
          next_step_question: string | null
          next_step_questions_response: string | null
          next_step_visit_response: string | null
          qualified_lead_message: string | null
          test_mode_enabled: boolean
          test_mode_number: string | null
          transfer_message: string | null
          updated_at: string
          welcome_message: string | null
        }
        Insert: {
          auto_send_materials?: boolean | null
          auto_send_pdf?: boolean | null
          auto_send_pdf_intro?: string | null
          auto_send_photos?: boolean | null
          auto_send_photos_intro?: string | null
          auto_send_presentation_video?: boolean | null
          auto_send_promo_video?: boolean | null
          bot_enabled?: boolean
          company_id?: string | null
          completion_message?: string | null
          created_at?: string
          follow_up_2_delay_hours?: number | null
          follow_up_2_enabled?: boolean | null
          follow_up_2_message?: string | null
          follow_up_delay_hours?: number | null
          follow_up_enabled?: boolean | null
          follow_up_message?: string | null
          id?: string
          instance_id: string
          message_delay_seconds?: number | null
          next_step_analyze_response?: string | null
          next_step_question?: string | null
          next_step_questions_response?: string | null
          next_step_visit_response?: string | null
          qualified_lead_message?: string | null
          test_mode_enabled?: boolean
          test_mode_number?: string | null
          transfer_message?: string | null
          updated_at?: string
          welcome_message?: string | null
        }
        Update: {
          auto_send_materials?: boolean | null
          auto_send_pdf?: boolean | null
          auto_send_pdf_intro?: string | null
          auto_send_photos?: boolean | null
          auto_send_photos_intro?: string | null
          auto_send_presentation_video?: boolean | null
          auto_send_promo_video?: boolean | null
          bot_enabled?: boolean
          company_id?: string | null
          completion_message?: string | null
          created_at?: string
          follow_up_2_delay_hours?: number | null
          follow_up_2_enabled?: boolean | null
          follow_up_2_message?: string | null
          follow_up_delay_hours?: number | null
          follow_up_enabled?: boolean | null
          follow_up_message?: string | null
          id?: string
          instance_id?: string
          message_delay_seconds?: number | null
          next_step_analyze_response?: string | null
          next_step_question?: string | null
          next_step_questions_response?: string | null
          next_step_visit_response?: string | null
          qualified_lead_message?: string | null
          test_mode_enabled?: boolean
          test_mode_number?: string | null
          transfer_message?: string | null
          updated_at?: string
          welcome_message?: string | null
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
          remote_jid: string
          unread_count: number | null
          updated_at: string
        }
        Insert: {
          bot_data?: Json | null
          bot_enabled?: boolean | null
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
          remote_jid: string
          unread_count?: number | null
          updated_at?: string
        }
        Update: {
          bot_data?: Json | null
          bot_enabled?: boolean | null
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
        ]
      }
      wapi_instances: {
        Row: {
          addon_valid_until: string | null
          company_id: string
          connected_at: string | null
          created_at: string
          credits_available: number | null
          id: string
          instance_id: string
          instance_token: string
          messages_count: number | null
          phone_number: string | null
          status: string | null
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          addon_valid_until?: string | null
          company_id: string
          connected_at?: string | null
          created_at?: string
          credits_available?: number | null
          id?: string
          instance_id: string
          instance_token: string
          messages_count?: number | null
          phone_number?: string | null
          status?: string | null
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          addon_valid_until?: string | null
          company_id?: string
          connected_at?: string | null
          created_at?: string
          credits_available?: number | null
          id?: string
          instance_id?: string
          instance_token?: string
          messages_count?: number | null
          phone_number?: string | null
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
          media_direct_path: string | null
          media_key: string | null
          media_url: string | null
          message_id: string | null
          message_type: string
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
          media_direct_path?: string | null
          media_key?: string | null
          media_url?: string | null
          message_id?: string | null
          message_type?: string
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
          media_direct_path?: string | null
          media_key?: string | null
          media_url?: string | null
          message_id?: string | null
          message_type?: string
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
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_company_branding_by_slug: {
        Args: { _slug: string }
        Returns: {
          logo_url: string
          name: string
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
      get_user_company_ids: { Args: { _user_id: string }; Returns: string[] }
      get_user_default_company: { Args: { _user_id: string }; Returns: string }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
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
      ],
    },
  },
} as const
