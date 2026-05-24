import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';

interface Position {
  id: string;
  user_id: string;
  type: 'LONG' | 'SHORT';
  entry_price: number;
  amount: number;
  current_price: number;
  pnl: number;
  pnl_percent: number;
  status: 'OPEN' | 'CLOSED' | 'LIQUIDATED';
  opened_at: string;
  closed_at?: string;
  leverage?: number;
  liquidation_price?: number;
}

interface TradingState {
  positions: Position[];
  currentPrice: number;
  priceHistory: Array<{ time: number; value: number }>;
  leverage: number;
  positionType: 'LONG' | 'SHORT';
  amount: number;
  isLoading: boolean;
  error: string | null;
  pollingInterval: NodeJS.Timeout | null;

  // Computed values
  margin: number;
  liquidationPrice: number;

  // Actions
  setLeverage: (leverage: number) => void;
  setPositionType: (type: 'LONG' | 'SHORT') => void;
  setAmount: (amount: number) => void;
  setCurrentPrice: (price: number) => void;

  // Server actions
  openPosition: () => Promise<{ success: boolean; error?: string }>;
  closePosition: (positionId: string) => Promise<{ success: boolean; error?: string }>;
  fetchPositions: () => Promise<void>;
  fetchPriceFeed: () => Promise<void>;

  // Polling
  startPolling: () => void;
  stopPolling: () => void;
}

const MAINTENANCE_MARGIN_RATE = 0.005; // 0.5%

export const useTradingStore = create<TradingState>((set, get) => ({
  positions: [],
  currentPrice: 100,
  priceHistory: [],
  leverage: 10,
  positionType: 'LONG',
  amount: 10,
  isLoading: false,
  error: null,
  pollingInterval: null,

  // Computed margin and liquidation price
  get margin() {
    const { amount, leverage } = get();
    return amount / leverage;
  },

  get liquidationPrice() {
    const { positionType, currentPrice, leverage } = get();
    return positionType === 'LONG'
      ? currentPrice * (1 - (1 / leverage) + MAINTENANCE_MARGIN_RATE)
      : currentPrice * (1 + (1 / leverage) - MAINTENANCE_MARGIN_RATE);
  },

  setLeverage: (leverage) => {
    set({ leverage: Math.max(1, Math.min(100, leverage)) });
  },

  setPositionType: (type) => {
    set({ positionType: type });
  },

  setAmount: (amount) => {
    set({ amount: Math.max(1, amount) });
  },

  setCurrentPrice: (price) => {
    set({ currentPrice: price });
  },

  openPosition: async () => {
    const authStore = useAuthStore.getState();
    if (!authStore.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const session = (await supabase.auth.getSession()).data.session;
    if (!session) {
      return { success: false, error: 'Session expired' };
    }

    const { positionType, currentPrice, amount, leverage } = get();
    set({ isLoading: true, error: null });

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trading-open-position`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            position_type: positionType,
            entry_price: currentPrice,
            amount,
            leverage,
          }),
        }
      );

      const data = await response.json();

      set({ isLoading: false });

      if (data.success) {
        await get().fetchPositions();
        await useAuthStore.getState().refreshWallet();
        return { success: true };
      }

      set({ error: data.error });
      return { success: false, error: data.error };
    } catch (error: any) {
      set({ isLoading: false, error: error.message });
      return { success: false, error: error.message };
    }
  },

  closePosition: async (positionId) => {
    const authStore = useAuthStore.getState();
    if (!authStore.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const session = (await supabase.auth.getSession()).data.session;
    if (!session) {
      return { success: false, error: 'Session expired' };
    }

    const { currentPrice } = get();
    set({ isLoading: true, error: null });

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trading-close-position`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            position_id: positionId,
            price: currentPrice,
          }),
        }
      );

      const data = await response.json();

      set({ isLoading: false });

      if (data.success) {
        await get().fetchPositions();
        await useAuthStore.getState().refreshWallet();
        return { success: true };
      }

      set({ error: data.error });
      return { success: false, error: data.error };
    } catch (error: any) {
      set({ isLoading: false, error: error.message });
      return { success: false, error: error.message };
    }
  },

  fetchPositions: async () => {
    const authStore = useAuthStore.getState();
    if (!authStore.user) return;

    try {
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', authStore.user.id)
        .eq('status', 'OPEN')
        .order('opened_at', { ascending: false });

      if (!error && data) {
        // Calculate real-time PnL
        const { currentPrice } = get();
        const positionsWithPnL = data.map(pos => {
          const pnl = pos.type === 'LONG'
            ? (currentPrice - pos.entry_price) * pos.amount
            : (pos.entry_price - currentPrice) * pos.amount;
          const pnl_percent = pos.type === 'LONG'
            ? ((currentPrice - pos.entry_price) / pos.entry_price) * 100
            : ((pos.entry_price - currentPrice) / pos.entry_price) * 100;
          return { ...pos, pnl, pnl_percent };
        });
        set({ positions: positionsWithPnL as Position[] });
      }
    } catch (error) {
      console.error('Fetch positions error:', error);
    }
  },

  fetchPriceFeed: async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/engine-price-feed?count=5`,
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      const data = await response.json();

      if (data.currentPrice && data.prices) {
        const priceHistory = data.prices.map((p: any, idx: number) => ({
          time: Math.floor(Date.now() / 1000) - (data.prices.length - idx - 1) * 60,
          value: p.price || p,
        }));

        set({ currentPrice: data.currentPrice, priceHistory });

        // Update positions PnL
        await get().fetchPositions();
      }
    } catch (error) {
      console.error('Fetch price feed error:', error);
    }
  },

  startPolling: () => {
    const { pollingInterval } = get();
    if (pollingInterval) return;

    // Initial fetch
    get().fetchPriceFeed();

    const interval = setInterval(() => {
      get().fetchPriceFeed();
      const authStore = useAuthStore.getState();
      if (authStore.user) {
        get().fetchPositions();
      }
    }, 2000);

    set({ pollingInterval: interval });
  },

  stopPolling: () => {
    const { pollingInterval } = get();
    if (pollingInterval) {
      clearInterval(pollingInterval);
      set({ pollingInterval: null });
    }
  },
}));

// Helper function to calculate liquidation price
export function calculateLiquidationPrice(
  entryPrice: number,
  leverage: number,
  positionType: 'LONG' | 'SHORT',
  maintenanceMarginRate: number = MAINTENANCE_MARGIN_RATE
): number {
  return positionType === 'LONG'
    ? entryPrice * (1 - (1 / leverage) + maintenanceMarginRate)
    : entryPrice * (1 + (1 / leverage) - maintenanceMarginRate);
}

// Helper function to calculate PnL
export function calculatePnL(
  entryPrice: number,
  currentPrice: number,
  amount: number,
  positionType: 'LONG' | 'SHORT'
): { pnl: number; pnlPercent: number } {
  const pnl = positionType === 'LONG'
    ? (currentPrice - entryPrice) * amount
    : (entryPrice - currentPrice) * amount;

  const pnlPercent = positionType === 'LONG'
    ? ((currentPrice - entryPrice) / entryPrice) * 100
    : ((entryPrice - currentPrice) / entryPrice) * 100;

  return { pnl, pnlPercent };
}
