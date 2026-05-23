import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Reward, Mission } from '../lib/supabase';
import { useAuthStore } from './authStore';

interface RewardState {
  rewards: Reward[];
  missions: Mission[];
  todayReward: {
    claimed: boolean;
    streak: number;
    nextClaimAt: string | null;
  };
  isLoading: boolean;

  fetchRewards: () => Promise<void>;
  fetchMissions: () => Promise<void>;
  claimDailyReward: () => Promise<{
    success: boolean;
    reward?: number;
    streak?: number;
    error?: string;
  }>;
  checkDailyReward: () => Promise<void>;
}

export const useRewardStore = create<RewardState>((set, get) => ({
  rewards: [],
  missions: [],
  todayReward: {
    claimed: false,
    streak: 0,
    nextClaimAt: null,
  },
  isLoading: false,

  fetchRewards: async () => {
    const authStore = useAuthStore.getState();
    if (!authStore.user) return;

    try {
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .eq('user_id', authStore.user.id)
        .order('claimed_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        set({ rewards: data as Reward[] });
      }
    } catch (error) {
      console.error('Fetch rewards error:', error);
    }
  },

  fetchMissions: async () => {
    const authStore = useAuthStore.getState();
    if (!authStore.user) return;

    try {
      const { data, error } = await supabase
        .from('missions')
        .select('*')
        .eq('user_id', authStore.user.id)
        .eq('is_completed', false)
        .order('created_at', { ascending: true });

      if (!error && data) {
        set({ missions: data as Mission[] });
      }
    } catch (error) {
      console.error('Fetch missions error:', error);
    }
  },

  claimDailyReward: async () => {
    const authStore = useAuthStore.getState();
    if (!authStore.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const session = (await supabase.auth.getSession()).data.session;
    if (!session) {
      return { success: false, error: 'Session expired' };
    }

    set({ isLoading: true });

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reward-daily-claim`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      set({ isLoading: false });

      if (data.success) {
        set({
          todayReward: {
            claimed: true,
            streak: data.streak,
            nextClaimAt: new Date(
              new Date().setHours(24, 0, 0, 0)
            ).toISOString(),
          },
        });

        await useAuthStore.getState().refreshProfile();
        await useAuthStore.getState().refreshWallet();

        return {
          success: true,
          reward: data.reward,
          streak: data.streak,
        };
      }

      return { success: false, error: data.error };
    } catch (error: any) {
      set({ isLoading: false });
      return { success: false, error: error.message };
    }
  },

  checkDailyReward: async () => {
    const authStore = useAuthStore.getState();
    if (!authStore.user || !authStore.profile) return;

    const profile = authStore.profile;
    const today = new Date().toISOString().split('T')[0];
    const lastStreakDate = profile.last_streak_date
      ? new Date(profile.last_streak_date).toISOString().split('T')[0]
      : null;

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const streak = lastStreakDate === yesterday
      ? profile.streak_days
      : lastStreakDate === today
      ? profile.streak_days
      : 0;

    set({
      todayReward: {
        claimed: lastStreakDate === today,
        streak,
        nextClaimAt: lastStreakDate === today
          ? new Date(new Date().setHours(24, 0, 0, 0)).toISOString()
          : null,
      },
    });
  },
}));
