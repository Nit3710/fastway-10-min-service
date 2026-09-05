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

    // Asynchronously perform Firebase Auth session setup (fails silently)
    try {
      const { auth } = require('../utils/firebase');
      const { signInWithCustomToken } = require('@firebase/auth/dist/rn');
      const { getFirebaseCustomToken } = require('../api/firebaseApi');
      
      const customToken = await getFirebaseCustomToken();
      await signInWithCustomToken(auth, customToken);
      console.log('Firebase Client session authenticated successfully.');
    } catch (firebaseErr: any) {
      console.warn('Firebase Auth failed (live order tracking enhancement unavailable):', firebaseErr.message);
    }
  },
  clearAuth: async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('refreshToken');
      // Sign out of Firebase Auth
      const { auth } = require('../utils/firebase');
      await auth.signOut();
    } catch (e) {}
    set({ token: null, refreshToken: null, user: null });
  },
  setBootstrapped: (val: boolean) => set({ isBootstrapped: val }),
  setUser: (user: User | null) => set({ user }),
}));

export default useAuthStore;
