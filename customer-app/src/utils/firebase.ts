import { initializeApp, getApps, getApp } from 'firebase/app';
// @ts-ignore
import { initializeAuth, getReactNativePersistence } from '@firebase/auth/dist/rn';
import { getDatabase } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyBKpV9ZNX0GqnQXhjxOaS1I3T5NDe_qqWw",
  authDomain: "web-scrap-9675e.firebaseapp.com",
  databaseURL: "https://web-scrap-9675e-default-rtdb.firebaseio.com",
  projectId: "web-scrap-9675e",
  storageBucket: "web-scrap-9675e.appspot.com",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Standard RN CLI way — no expo workaround needed
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

const db = getDatabase(app);

export { app, auth, db };
