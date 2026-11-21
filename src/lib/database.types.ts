// Supabase가 실제 DB 스키마에서 생성한 타입 (generate_typescript_types).
// 스키마를 바꾸면 다시 생성하세요. 직접 고치지 마세요.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.18'
  }
  public: {
    Tables: {
      account_balances: {
        Row: { account_id: string; amount: number; settlement_id: string }
        Insert: { account_id: string; amount?: number; settlement_id: string }
        Update: { account_id?: string; amount?: number; settlement_id?: string }
        Relationships: [
          {
            foreignKeyName: 'account_balances_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'account_balances_settlement_id_fkey'
            columns: ['settlement_id']
            isOneToOne: false
            referencedRelation: 'settlements'
            referencedColumns: ['id']
          },
        ]
      }
      accounts: {
        Row: {
          archived: boolean
          category: string
          created_at: string
          household_id: string
          id: string
          interest_rate: number | null
          is_sample: boolean
          kind: string
          name: string
          owner: string
          sort_order: number
        }
        Insert: {
          archived?: boolean
          category: string
          created_at?: string
          household_id: string
          id?: string
          interest_rate?: number | null
          is_sample?: boolean
          kind: string
          name: string
          owner?: string
          sort_order?: number
        }
        Update: {
          archived?: boolean
          category?: string
          created_at?: string
          household_id?: string
          id?: string
          interest_rate?: number | null
          is_sample?: boolean
          kind?: string
          name?: string
          owner?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: 'accounts_household_id_fkey'
            columns: ['household_id']
            isOneToOne: false
            referencedRelation: 'households'
            referencedColumns: ['id']
          },
        ]
      }
      cash_items: {
        Row: {
          amount: number
          created_at: string
          day: number
          household_id: string
          id: string
          kind: string
          name: string
          sort_order: number
        }
        Insert: {
          amount?: number
          created_at?: string
          day: number
          household_id: string
          id?: string
          kind: string
          name: string
          sort_order?: number
        }
        Update: {
          amount?: number
          created_at?: string
          day?: number
          household_id?: string
          id?: string
          kind?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "cash_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_months: {
        Row: {
          household_id: string
          month: string
          plan: Json | null
          start_balance: number | null
          updated_at: string
        }
        Insert: {
          household_id: string
          month: string
          plan?: Json | null
          start_balance?: number | null
          updated_at?: string
        }
        Update: {
          household_id?: string
          month?: string
          plan?: Json | null
          start_balance?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_months_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: { display_name: string; household_id: string; joined_at: string; role: string; user_id: string }
        Insert: { display_name: string; household_id: string; joined_at?: string; role: string; user_id: string }
        Update: { display_name?: string; household_id?: string; joined_at?: string; role?: string; user_id?: string }
        Relationships: [
          {
            foreignKeyName: 'household_members_household_id_fkey'
            columns: ['household_id']
            isOneToOne: false
            referencedRelation: 'households'
            referencedColumns: ['id']
          },
        ]
      }
      households: {
        Row: { created_at: string; created_by: string; has_sample: boolean; id: string; invite_code: string; name: string; fire_target_asset: number; fire_living_cost: number }
        Insert: { created_at?: string; created_by: string; has_sample?: boolean; id?: string; invite_code: string; name: string; fire_target_asset?: number; fire_living_cost?: number }
        Update: { created_at?: string; created_by?: string; has_sample?: boolean; id?: string; invite_code?: string; name?: string; fire_target_asset?: number; fire_living_cost?: number }
        Relationships: []
      }
      pnl_entries: {
        Row: { amount: number; item_id: string; settlement_id: string }
        Insert: { amount?: number; item_id: string; settlement_id: string }
        Update: { amount?: number; item_id?: string; settlement_id?: string }
        Relationships: [
          {
            foreignKeyName: 'pnl_entries_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'pnl_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pnl_entries_settlement_id_fkey'
            columns: ['settlement_id']
            isOneToOne: false
            referencedRelation: 'settlements'
            referencedColumns: ['id']
          },
        ]
      }
      pnl_items: {
        Row: {
          archived: boolean
          grp: string
          household_id: string
          id: string
          monthly_budget: number | null
          name: string
          sort_order: number
        }
        Insert: {
          archived?: boolean
          grp: string
          household_id: string
          id?: string
          monthly_budget?: number | null
          name: string
          sort_order?: number
        }
        Update: {
          archived?: boolean
          grp?: string
          household_id?: string
          id?: string
          monthly_budget?: number | null
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: 'pnl_items_household_id_fkey'
            columns: ['household_id']
            isOneToOne: false
            referencedRelation: 'households'
            referencedColumns: ['id']
          },
        ]
      }
      sector_amounts: {
        Row: { amount: number; sector: string; settlement_id: string }
        Insert: { amount?: number; sector: string; settlement_id: string }
        Update: { amount?: number; sector?: string; settlement_id?: string }
        Relationships: [
          {
            foreignKeyName: 'sector_amounts_settlement_id_fkey'
            columns: ['settlement_id']
            isOneToOne: false
            referencedRelation: 'settlements'
            referencedColumns: ['id']
          },
        ]
      }
      settlements: {
        Row: {
          closed_at: string | null
          created_at: string
          fx_rate: number | null
          household_id: string
          husband_confirmed_at: string | null
          id: string
          is_sample: boolean
          month: string
          status: string
          updated_at: string
          wife_confirmed_at: string | null
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          fx_rate?: number | null
          household_id: string
          husband_confirmed_at?: string | null
          id?: string
          is_sample?: boolean
          month: string
          status?: string
          updated_at?: string
          wife_confirmed_at?: string | null
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          fx_rate?: number | null
          household_id?: string
          husband_confirmed_at?: string | null
          id?: string
          is_sample?: boolean
          month?: string
          status?: string
          updated_at?: string
          wife_confirmed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'settlements_household_id_fkey'
            columns: ['household_id']
            isOneToOne: false
            referencedRelation: 'households'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      clear_sample_data: { Args: never; Returns: undefined }
      create_household: { Args: { p_display_name: string; p_name: string; p_role: string; p_with_sample?: boolean }; Returns: string }
      join_household: { Args: { p_code: string; p_display_name: string; p_role: string }; Returns: string }
      new_invite_code: { Args: never; Returns: string }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
