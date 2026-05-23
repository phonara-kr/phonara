import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Transaction } from '../lib/supabase';
import { useAuthStore } from './authStore';

interface WalletState {
  transactions: Transaction[];
  isLoading: boolean;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };

  fetchTransactions: (reset?: boolean) => Promise<void>;
  addTransaction: (transaction: Transaction) => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  transactions: [],
  isLoading: false,
  pagination: {
    limit: 20,
    offset: 0,
    hasMore: true,
  },

  fetchTransactions: async (reset = false) => {
    const authStore = useAuthStore.getState();
    if (!authStore.user) return;

    const { pagination } = get();
    const offset = reset ? 0 : pagination.offset;
    const limit = pagination.limit;

    set({ isLoading: true });

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', authStore.user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      set((state) => ({
        transactions: reset
          ? (data as Transaction[])
          : [...state.transactions, ...(data as Transaction[])],
        isLoading: false,
        pagination: {
          limit,
          offset: offset + limit,
          hasMore: (data?.length ?? 0) === limit,
        },
      }));
    } catch (error) {
      console.error('Fetch transactions error:', error);
      set({ isLoading: false });
    }
  },

  addTransaction: (transaction) => {
    set((state) => ({
      transactions: [transaction, ...state.transactions],
    }));
  },
}));
