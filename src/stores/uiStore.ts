import { create } from 'zustand';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface Modal {
  id: string;
  type: string;
  data?: any;
}

interface UIState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  toasts: Toast[];
  modals: Modal[];
  isLoading: boolean;
  loadingMessage: string;

  setTheme: (theme: 'light' | 'dark') => void;
  toggleSidebar: () => void;
  showToast: (
    message: string,
    type?: Toast['type'],
    duration?: number
  ) => void;
  dismissToast: (id: string) => void;
  openModal: (type: string, data?: any) => void;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
  setLoading: (loading: boolean, message?: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: 'dark',
  sidebarOpen: false,
  toasts: [],
  modals: [],
  isLoading: false,
  loadingMessage: '',

  setTheme: (theme) => {
    set({ theme });
    document.documentElement.classList.toggle('dark', theme === 'dark');
  },

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  showToast: (message, type = 'info', duration = 3000) => {
    const id = Math.random().toString(36).substr(2, 9);

    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }));

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },

  dismissToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  openModal: (type, data) => {
    const id = Math.random().toString(36).substr(2, 9);

    set((state) => ({
      modals: [...state.modals, { id, type, data }],
    }));
  },

  closeModal: (id) => {
    set((state) => ({
      modals: state.modals.filter((m) => m.id !== id),
    }));
  },

  closeAllModals: () => set({ modals: [] }),

  setLoading: (loading, message = '') => {
    set({ isLoading: loading, loadingMessage: message });
  },
}));
