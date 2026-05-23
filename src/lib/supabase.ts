import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          avatar_url: string | null;
          referral_code: string | null;
          referred_by: string | null;
          streak_days: number;
          last_streak_date: string | null;
          total_rewards_earned: number;
          level: number;
          xp: number;
          is_frozen: boolean;
          onboarding_completed: boolean;
          onboarding_step: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          avatar_url?: string | null;
          referral_code?: string | null;
          referred_by?: string | null;
          streak_days?: number;
          last_streak_date?: string | null;
          total_rewards_earned?: number;
          level?: number;
          xp?: number;
          is_frozen?: boolean;
          onboarding_completed?: boolean;
          onboarding_step?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          username?: string | null;
          avatar_url?: string | null;
          referral_code?: string | null;
          referred_by?: string | null;
          streak_days?: number;
          last_streak_date?: string | null;
          total_rewards_earned?: number;
          level?: number;
          xp?: number;
          is_frozen?: boolean;
          onboarding_completed?: boolean;
          onboarding_step?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      wallets: {
        Row: {
          id: string;
          user_id: string;
          balance: number;
          locked_balance: number;
          total_earned: number;
          total_spent: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          balance?: number;
          locked_balance?: number;
          total_earned?: number;
          total_spent?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          balance?: number;
          locked_balance?: number;
          total_earned?: number;
          total_spent?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          amount: number;
          balance_after: number;
          description: string | null;
          reference_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          amount: number;
          balance_after: number;
          description?: string | null;
          reference_id?: string | null;
          created_at?: string;
        };
        Update: {};
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          order_type: string;
          price: number;
          amount: number;
          filled_amount: number;
          status: string;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          order_type: string;
          price: number;
          amount: number;
          filled_amount?: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: {
          filled_amount?: number;
          status?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
      };
      positions: {
        Row: {
          id: string;
          user_id: string;
          order_id: string | null;
          type: string;
          entry_price: number;
          amount: number;
          current_price: number;
          pnl: number;
          pnl_percent: number;
          status: string;
          opened_at: string;
          closed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          order_id?: string | null;
          type: string;
          entry_price: number;
          amount: number;
          current_price: number;
          pnl?: number;
          pnl_percent?: number;
          status?: string;
          opened_at?: string;
          closed_at?: string | null;
        };
        Update: {
          current_price?: number;
          pnl?: number;
          pnl_percent?: number;
          status?: string;
          closed_at?: string | null;
        };
      };
      rewards: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          amount: number;
          multiplier: number;
          metadata: any;
          claimed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          amount: number;
          multiplier?: number;
          metadata?: any;
          claimed_at?: string;
        };
        Update: {};
      };
      missions: {
        Row: {
          id: string;
          user_id: string;
          mission_type: string;
          target: number;
          progress: number;
          reward: number;
          is_completed: boolean;
          expires_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          mission_type: string;
          target: number;
          progress?: number;
          reward: number;
          is_completed?: boolean;
          expires_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          progress?: number;
          is_completed?: boolean;
          completed_at?: string | null;
        };
      };
    };
  };
};

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Wallet = Database['public']['Tables']['wallets']['Row'];
export type Transaction = Database['public']['Tables']['transactions']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type Position = Database['public']['Tables']['positions']['Row'];
export type Reward = Database['public']['Tables']['rewards']['Row'];
export type Mission = Database['public']['Tables']['missions']['Row'];
