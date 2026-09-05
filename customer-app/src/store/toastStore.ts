import { create } from 'zustand';

interface ToastState {
  visible: boolean;
  message: string;
  type: 'success' | 'error';
  showToast: (message: string, type?: 'success' | 'error') => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  visible: false,
  message: '',
  type: 'error',
  showToast: (message, type = 'error') => {
    set({ visible: true, message, type });
  },
  hideToast: () => set({ visible: false }),
}));
