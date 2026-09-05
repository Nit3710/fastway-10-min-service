import { Alert, Platform, PermissionsAndroid } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { registerFcmToken } from '../api/notificationApi';
import { useToastStore } from '../store/toastStore';
import { navigate } from '../navigation/navigationRef';

export const setupPushNotifications = async (): Promise<void> => {
  if (Platform.OS === 'web') return;

  try {
    // Android 13+ needs explicit permission request
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        await new Promise<void>((resolve) => {
          Alert.alert(
            'Enable Notifications',
            'Fastway Delivery needs notification permissions to alert you when new delivery tasks are assigned to you.',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve() },
              { text: 'Allow', onPress: () => resolve() },
            ],
            { cancelable: false }
          );
        });
      }
    }

    if (Platform.OS === 'ios') {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      if (!enabled) {
        console.log('FCM push permission denied by partner (iOS).');
        return;
      }
    }

    // Get the device FCM token
    const fcmToken = await messaging().getToken();
    if (!fcmToken) {
      console.warn('Failed to get FCM token.');
      return;
    }

    const deviceType = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
    await registerFcmToken(fcmToken, deviceType);
    console.log('FCM Token registered successfully on backend.');
  } catch (err: any) {
    console.warn('FCM registration failed:', err.message);
  }
};

export const initNotificationListeners = () => {
  // Foreground notification — show in-app toast banner
  const unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
    const title = remoteMessage.notification?.title ?? '';
    const body = remoteMessage.notification?.body ?? '';
    const showToast = useToastStore.getState().showToast;
    if (title || body) {
      showToast(`${title}: ${body}`, 'success');
    }
  });

  // App opened from background by tapping a notification
  const unsubscribeBackground = messaging().onNotificationOpenedApp((remoteMessage) => {
    const data = remoteMessage.data;
    if (data && data.relatedType === 'DELIVERY_ASSIGNMENT' && data.relatedId) {
      navigate('AssignmentDetail', { assignmentId: Number(data.relatedId) });
    }
  });

  // App opened from QUIT state by tapping a notification
  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) {
        const data = remoteMessage.data;
        if (data && data.relatedType === 'DELIVERY_ASSIGNMENT' && data.relatedId) {
          navigate('AssignmentDetail', { assignmentId: Number(data.relatedId) });
        }
      }
    });

  return () => {
    unsubscribeForeground();
    unsubscribeBackground();
  };
};
