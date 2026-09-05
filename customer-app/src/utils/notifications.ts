import { Alert, Platform, PermissionsAndroid } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { registerFcmToken } from '../api/notificationApi';
import { useToastStore } from '../store/toastStore';
import { navigate } from '../navigation/navigationRef';

/**
 * Request notification permission and register FCM token with the backend.
 * Safe to call on every login — backend upserts existing tokens.
 */
export const setupPushNotifications = async (): Promise<void> => {
  if (Platform.OS === 'web') return;

  try {
    // ── Android 13+ (API 33+): POST_NOTIFICATIONS runtime permission ──
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        // Show friendly explanation — do NOT return, token fetch can still work
        Alert.alert(
          'Stay in the loop! 🔔',
          'Allow notifications to get live order updates, delivery tracking & exclusive offers from Fastway.',
          [
            { text: 'Not Now', style: 'cancel' },
            { text: 'Allow', style: 'default' },
          ]
        );
        // On Android < 13 notifications work without permission.
        // On 13+ user declined — data messages can still be received.
      }
    }

    // ── iOS: request auth ────────────────────────────────────────────────
    if (Platform.OS === 'ios') {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      if (!enabled) {
        console.log('[FCM] Push permission denied by user (iOS).');
        return;
      }
    }

    // ── Get FCM token with 3-attempt retry + exponential back-off ───────
    let fcmToken: string | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        fcmToken = await messaging().getToken();
        if (fcmToken) break;
      } catch (tokenErr: any) {
        console.warn(`[FCM] getToken attempt ${attempt} failed:`, tokenErr?.message);
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, attempt * 1500));
        }
      }
    }

    if (!fcmToken) {
      console.warn('[FCM] Could not obtain FCM token after 3 attempts.');
      return;
    }

    // ── Register with backend ────────────────────────────────────────────
    const deviceType = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
    await registerFcmToken(fcmToken, deviceType);
    console.log('[FCM] Token registered with backend successfully.');

    // ── Listen for token refresh (Google rotates tokens periodically) ───
    messaging().onTokenRefresh(async (newToken) => {
      try {
        await registerFcmToken(newToken, deviceType);
        console.log('[FCM] Refreshed token re-registered with backend.');
      } catch (e: any) {
        console.warn('[FCM] Failed to re-register refreshed token:', e?.message);
      }
    });

  } catch (err: any) {
    console.warn('[FCM] setupPushNotifications error:', err?.message);
  }
};

/**
 * Attach foreground / background / quit-state notification listeners.
 * Returns a cleanup function — call it in a useEffect return.
 */
export const initNotificationListeners = () => {
  // ── Foreground: show in-app toast ───────────────────────────────────
  const unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
    const title = remoteMessage.notification?.title ?? '';
    const body  = remoteMessage.notification?.body  ?? '';
    const showToast = useToastStore.getState().showToast;
    if (title || body) {
      showToast(body ? `${title}: ${body}` : title, 'success');
    }
  });

  // ── Background tap: navigate to related screen ──────────────────────
  const unsubscribeBackground = messaging().onNotificationOpenedApp((remoteMessage) => {
    const data = remoteMessage?.data;
    if (data?.relatedType === 'ORDER' && data?.relatedId) {
      navigate('OrderDetail', { orderId: Number(data.relatedId) });
    }
  });

  // ── Quit-state tap: app opened cold by notification ─────────────────
  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (!remoteMessage) return;
      const data = remoteMessage?.data;
      if (data?.relatedType === 'ORDER' && data?.relatedId) {
        // Small delay to allow navigation stack to fully mount first
        setTimeout(() => {
          navigate('OrderDetail', { orderId: Number(data.relatedId) });
        }, 600);
      }
    })
    .catch((e) => console.warn('[FCM] getInitialNotification error:', e?.message));

  return () => {
    unsubscribeForeground();
    unsubscribeBackground();
  };
};
