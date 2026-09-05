import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  isBootstrapped: boolean;
  setAuth: (token: string, user: User, refreshToken?: string | null) => Promise<void>;
  clearAuth: () => Promise<void>;
  setBootstrapped: (val: boolean) => void;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  refreshToken: null,
  user: null,
  isBootstrapped: false,
  setAuth: async (token: string, user: User, refreshToken?: string | null) => {
    try {
      await AsyncStorage.setItem('authToken', token);
      if (refreshToken) await AsyncStorage.setItem('refreshToken', refreshToken);
    } catch (e) {}
    set({ token, user, ...(refreshToken !== undefined ? { refreshToken } : {}) });
  },
  clearAuth: async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('refreshToken');
    } catch (e) {}
    set({ token: null, refreshToken: null, user: null });
  },
  setBootstrapped: (val: boolean) => set({ isBootstrapped: val }),
  setUser: (user: User | null) => set({ user }),
}));
