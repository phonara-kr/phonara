import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Order, Position } from '../lib/supabase';
import { useAuthStore } from './authStore';

interface OrderBookEntry {
  price: number;
  amount: number;
  count: number;
}

interface TradingState {
  orders: Order[];
  positions: Position[];
  orderBook: {
    bids: OrderBookEntry[];
    asks: OrderBookEntry[];
    spread: number;
    midPrice: number;
    bestBid: number;
    bestAsk: number;
  };
  currentPrice: number;
  priceHistory: {
    price: number;
    change: number;
    changePercent: number;
    timestamp: string;
  }[];
  isLoading: boolean;
  pollingInterval: NodeJS.Timeout | null;

  fetchOrders: () => Promise<void>;
  fetchPositions: () => Promise<void>;
  fetchOrderBook: () => Promise<void>;
  fetchPriceFeed: () => Promise<void>;
  placeOrder: (
    type: 'BUY' | 'SELL',
    order_type: 'MARKET' | 'LIMIT',
    price: number,
    amount: number
  ) => Promise<{ success: boolean; error?: string }>;
  closePosition: (positionId: string) => Promise<{ success: boolean; error?: string }>;
  startPolling: () => void;
  stopPolling: () => void;
  setCurrentPrice: (price: number) => void;
}

export const useTradingStore = create<TradingState>((set, get) => ({
  orders: [],
  positions: [],
  orderBook: {
    bids: [],
    asks: [],
    spread: 0,
    midPrice: 100,
    bestBid: 100,
    bestAsk: 100,
  },
  currentPrice: 100,
  priceHistory: [],
  isLoading: false,
  pollingInterval: null,

  fetchOrders: async () => {
    const authStore = useAuthStore.getState();
    if (!authStore.user) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', authStore.user.id)
        .in('status', ['PENDING', 'PARTIALLY_FILLED'])
        .order('created_at', { ascending: false });

      if (!error && data) {
        set({ orders: data as Order[] });
      }
    } catch (error) {
      console.error('Fetch orders error:', error);
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
        set({ positions: data as Position[] });
      }
    } catch (error) {
      console.error('Fetch positions error:', error);
    }
  },

  fetchOrderBook: async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trading-get-orderbook`,
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      const data = await response.json();

      if (data.bids && data.asks) {
        set({
          orderBook: {
            bids: data.bids,
            asks: data.asks,
            spread: data.spread,
            midPrice: data.mid_price,
            bestBid: data.best_bid,
            bestAsk: data.best_ask,
          },
        });
      }
    } catch (error) {
      console.error('Fetch order book error:', error);
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

      if (data.prices) {
        set((state) => ({
          currentPrice: data.currentPrice,
          priceHistory: [...data.prices, ...state.priceHistory].slice(0, 100),
        }));
      }
    } catch (error) {
      console.error('Fetch price feed error:', error);
    }
  },

  placeOrder: async (type, order_type, price, amount) => {
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
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trading-place-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            type,
            order_type,
            price,
            amount,
          }),
        }
      );

      const data = await response.json();

      set({ isLoading: false });

      if (data.success) {
        await get().fetchOrders();
        await useAuthStore.getState().refreshWallet();

        return { success: true };
      }

      return { success: false, error: data.error };
    } catch (error: any) {
      set({ isLoading: false });
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

    set({ isLoading: true });

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
            price: get().currentPrice,
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

      return { success: false, error: data.error };
    } catch (error: any) {
      set({ isLoading: false });
      return { success: false, error: error.message };
    }
  },

  startPolling: () => {
    const { pollingInterval } = get();
    if (pollingInterval) return;

    const interval = setInterval(() => {
      get().fetchOrderBook();
      get().fetchPriceFeed();

      const authStore = useAuthStore.getState();
      if (authStore.user) {
        get().fetchPositions();
        get().fetchOrders();
      }
    }, 3000);

    set({ pollingInterval: interval });
  },

  stopPolling: () => {
    const { pollingInterval } = get();
    if (pollingInterval) {
      clearInterval(pollingInterval);
      set({ pollingInterval: null });
    }
  },

  setCurrentPrice: (price) => {
    set({ currentPrice: price });
  },
}));
