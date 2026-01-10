export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          deleted_at: string | null
          company_name: string
          abn: string
          address: string | null
          phone: string | null
          email: string | null
          commission_structure: Json | null
          is_active: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          company_name: string
          abn: string
          address?: string | null
          phone?: string | null
          email?: string | null
          commission_structure?: Json | null
          is_active?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          company_name?: string
          abn?: string
          address?: string | null
          phone?: string | null
          email?: string | null
          commission_structure?: Json | null
          is_active?: boolean
        }
      }
      user_profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          deleted_at: string | null
          user_id: string
          first_name: string
          last_name: string
          role: 'super_admin' | 'admin_team' | 'referrer_admin' | 'referrer_team' | 'client'
          organization_id: string | null
          phone: string | null
          two_fa_enabled: boolean
          is_active: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          user_id: string
          first_name: string
          last_name: string
          role: 'super_admin' | 'admin_team' | 'referrer_admin' | 'referrer_team' | 'client'
          organization_id?: string | null
          phone?: string | null
          two_fa_enabled?: boolean
          is_active?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          user_id?: string
          first_name?: string
          last_name?: string
          role?: 'super_admin' | 'admin_team' | 'referrer_admin' | 'referrer_team' | 'client'
          organization_id?: string | null
          phone?: string | null
          two_fa_enabled?: boolean
          is_active?: boolean
        }
      }
      clients: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          deleted_at: string | null
          organization_id: string
          abn: string
          entity_name: string
          contact_first_name: string | null
          contact_last_name: string | null
          contact_email: string | null
          contact_phone: string | null
          address: string | null
          created_by: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          organization_id: string
          abn: string
          entity_name: string
          contact_first_name?: string | null
          contact_last_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          address?: string | null
          created_by: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          organization_id?: string
          abn?: string
          entity_name?: string
          contact_first_name?: string | null
          contact_last_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          address?: string | null
          created_by?: string
        }
      }
      opportunities: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          deleted_at: string | null
          opportunity_id: string
          organization_id: string
          client_id: string
          status: 'draft' | 'opportunity' | 'application_created' | 'application_submitted' | 'conditionally_approved' | 'approved' | 'declined' | 'settled' | 'withdrawn'
          loan_amount: number | null
          loan_purpose: string | null
          asset_type: string | null
          lvr: number | null
          notes: string | null
          created_by: string
          assigned_to: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          opportunity_id?: string
          organization_id: string
          client_id: string
          status?: 'draft' | 'opportunity' | 'application_created' | 'application_submitted' | 'conditionally_approved' | 'approved' | 'declined' | 'settled' | 'withdrawn'
          loan_amount?: number | null
          loan_purpose?: string | null
          asset_type?: string | null
          lvr?: number | null
          notes?: string | null
          created_by: string
          assigned_to?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          opportunity_id?: string
          organization_id?: string
          client_id?: string
          status?: 'draft' | 'opportunity' | 'application_created' | 'application_submitted' | 'conditionally_approved' | 'approved' | 'declined' | 'settled' | 'withdrawn'
          loan_amount?: number | null
          loan_purpose?: string | null
          asset_type?: string | null
          lvr?: number | null
          notes?: string | null
          created_by?: string
          assigned_to?: string | null
        }
      }
      opportunity_details: {
        Row: {
          id: string
          opportunity_id: string
          created_at: string
          updated_at: string
          address: string | null
          street_address: string | null
          city: string | null
          state: number | null
          postcode: string | null
          net_profit: number | null
          ammortisation: number | null
          deprecition: number | null
          existing_interest_costs: number | null
          rental_expense: number | null
          proposed_rental_income: number | null
          existing_liabilities: number | null
          additional_property: number | null
          smsf_structure: number | null
          ato_liabilities: number | null
          credit_file_issues: number | null
          term1: number | null
          term2: number | null
          term3: number | null
          term4: number | null
          reason_declined: string | null
          disqualify_reason: string | null
          client_address: string | null
          time_in_business: string | null
          brief_overview: string | null
          outcome_level: string | null
          additional_notes: string | null
          rental_income: string | null
          loan_acc_ref_no: string | null
          flex_id: string | null
          payment_received_date: string | null
          payment_amount: number | null
          ip_address: string | null
          is_unqualified: number | null
          unqualified_date: string | null
          unqualified_reason: string | null
        }
        Insert: {
          id?: string
          opportunity_id: string
          created_at?: string
          updated_at?: string
          address?: string | null
          street_address?: string | null
          city?: string | null
          state?: number | null
          postcode?: string | null
          net_profit?: number | null
          ammortisation?: number | null
          deprecition?: number | null
          existing_interest_costs?: number | null
          rental_expense?: number | null
          proposed_rental_income?: number | null
          existing_liabilities?: number | null
          additional_property?: number | null
          smsf_structure?: number | null
          ato_liabilities?: number | null
          credit_file_issues?: number | null
          term1?: number | null
          term2?: number | null
          term3?: number | null
          term4?: number | null
          reason_declined?: string | null
          disqualify_reason?: string | null
          client_address?: string | null
          time_in_business?: string | null
          brief_overview?: string | null
          outcome_level?: string | null
          additional_notes?: string | null
          rental_income?: string | null
          loan_acc_ref_no?: string | null
          flex_id?: string | null
          payment_received_date?: string | null
          payment_amount?: number | null
          ip_address?: string | null
          is_unqualified?: number | null
          unqualified_date?: string | null
          unqualified_reason?: string | null
        }
        Update: {
          id?: string
          opportunity_id?: string
          created_at?: string
          updated_at?: string
          address?: string | null
          street_address?: string | null
          city?: string | null
          state?: number | null
          postcode?: string | null
          net_profit?: number | null
          ammortisation?: number | null
          deprecition?: number | null
          existing_interest_costs?: number | null
          rental_expense?: number | null
          proposed_rental_income?: number | null
          existing_liabilities?: number | null
          additional_property?: number | null
          smsf_structure?: number | null
          ato_liabilities?: number | null
          credit_file_issues?: number | null
          term1?: number | null
          term2?: number | null
          term3?: number | null
          term4?: number | null
          reason_declined?: string | null
          disqualify_reason?: string | null
          client_address?: string | null
          time_in_business?: string | null
          brief_overview?: string | null
          outcome_level?: string | null
          additional_notes?: string | null
          rental_income?: string | null
          loan_acc_ref_no?: string | null
          flex_id?: string | null
          payment_received_date?: string | null
          payment_amount?: number | null
          ip_address?: string | null
          is_unqualified?: number | null
          unqualified_date?: string | null
          unqualified_reason?: string | null
        }
      }
      comments: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          deleted_at: string | null
          opportunity_id: string
          user_id: string
          comment: string
          is_public: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          opportunity_id: string
          user_id: string
          comment: string
          is_public?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          opportunity_id?: string
          user_id?: string
          comment?: string
          is_public?: boolean
        }
      }
      audit_logs: {
        Row: {
          id: string
          created_at: string
          user_id: string | null
          table_name: string
          record_id: string
          action: string
          field_name: string | null
          old_value: Json | null
          new_value: Json | null
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id?: string | null
          table_name: string
          record_id: string
          action: string
          field_name?: string | null
          old_value?: Json | null
          new_value?: Json | null
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string | null
          table_name?: string
          record_id?: string
          action?: string
          field_name?: string | null
          old_value?: Json | null
          new_value?: Json | null
          ip_address?: string | null
          user_agent?: string | null
        }
      }
      user_sessions: {
        Row: {
          id: string
          created_at: string
          user_id: string
          ip_address: string
          user_agent: string | null
          last_activity: string
          remember_token: string | null
          expires_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          ip_address: string
          user_agent?: string | null
          last_activity?: string
          remember_token?: string | null
          expires_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          ip_address?: string
          user_agent?: string | null
          last_activity?: string
          remember_token?: string | null
          expires_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'super_admin' | 'admin_team' | 'referrer_admin' | 'referrer_team' | 'client'
      opportunity_status: 'draft' | 'opportunity' | 'application_created' | 'application_submitted' | 'conditionally_approved' | 'approved' | 'declined' | 'settled' | 'withdrawn'
    }
  }
}