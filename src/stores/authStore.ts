import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import type { Profile, Wallet } from '../lib/supabase';

interface AuthState {
  user: {
    id: string;
    email: string;
  } | null;
  profile: Profile | null;
  wallet: Wallet | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  signUp: (email: string, password: string, referralCode?: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  checkSession: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshWallet: () => Promise<void>;
  updateOnboardingStep: (step: number) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      wallet: null,
      isLoading: false,
      isInitialized: false,
      error: null,

      signUp: async (email, password, referralCode) => {
        set({ isLoading: true, error: null });

        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                referral_code: referralCode,
              },
            },
          });

          if (error) throw error;

          if (data.user) {
            if (referralCode) {
              const { data: referrer } = await supabase
                .from('profiles')
                .select('id')
                .eq('referral_code', referralCode)
                .maybeSingle();

              if (referrer) {
                await supabase.from('referrals').insert({
                  referrer_id: referrer.id,
                  referee_id: data.user.id,
                });
              }
            }

            set({
              user: {
                id: data.user.id,
                email: data.user.email || email,
              },
              isLoading: false,
            });

            await get().checkSession();

            return { success: true };
          }

          return { success: false, error: 'Failed to create account' };
        } catch (error: any) {
          set({ isLoading: false, error: error.message });
          return { success: false, error: error.message };
        }
      },

      signIn: async (email, password) => {
        set({ isLoading: true, error: null });

        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) throw error;

          if (data.user) {
            set({
              user: {
                id: data.user.id,
                email: data.user.email || email,
              },
              isLoading: false,
            });

            await get().checkSession();

            return { success: true };
          }

          return { success: false, error: 'Failed to sign in' };
        } catch (error: any) {
          set({ isLoading: false, error: error.message });
          return { success: false, error: error.message };
        }
      },

      signOut: async () => {
        set({ isLoading: true });

        try {
          await supabase.auth.signOut();

          set({
            user: null,
            profile: null,
            wallet: null,
            isLoading: false,
            isInitialized: false,
          });
        } catch (error) {
          console.error('Sign out error:', error);
          set({ isLoading: false });
        }
      },

      checkSession: async () => {
        set({ isLoading: true });

        try {
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            set({
              user: {
                id: session.user.id,
                email: session.user.email || '',
              },
            });

            await get().refreshProfile();
            await get().refreshWallet();
          }

          set({ isLoading: false, isInitialized: true });
        } catch (error) {
          console.error('Session check error:', error);
          set({ isLoading: false, isInitialized: true });
        }
      },

      refreshProfile: async () => {
        const { user } = get();
        if (!user) return;

        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          if (!error && data) {
            set({ profile: data as Profile });
          }
        } catch (error) {
          console.error('Refresh profile error:', error);
        }
      },

      refreshWallet: async () => {
        const { user } = get();
        if (!user) return;

        try {
          const { data, error } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          if (!error && data) {
            set({ wallet: data as Wallet });
          }
        } catch (error) {
          console.error('Refresh wallet error:', error);
        }
      },

      updateOnboardingStep: async (step: number) => {
        const { user, profile } = get();
        if (!user || !profile) return;

        try {
          const { error } = await supabase
            .from('profiles')
            .update({ onboarding_step: step })
            .eq('id', user.id);

          if (!error) {
            set({ profile: { ...profile, onboarding_step: step } });
          }
        } catch (error) {
          console.error('Update onboarding step error:', error);
        }
      },

      completeOnboarding: async () => {
        const { user, profile } = get();
        if (!user || !profile) return;

        try {
          const { error } = await supabase
            .from('profiles')
            .update({
              onboarding_completed: true,
              onboarding_step: 4,
            })
            .eq('id', user.id);

          if (!error) {
            set({
              profile: {
                ...profile,
                onboarding_completed: true,
                onboarding_step: 4,
              },
            });
          }
        } catch (error) {
          console.error('Complete onboarding error:', error);
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'phonara-auth',
      partialize: (state) => ({
        user: state.user,
      }),
    }
  )
);
