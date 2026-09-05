import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import AppNavigator from './src/navigation/AppNavigator';
import Toast from './src/components/Toast';
import THEME from './src/theme/theme';

import { navigationRef } from './src/navigation/navigationRef';

import useAuthStore from './src/store/authStore';
import { setupPushNotifications, initNotificationListeners } from './src/utils/notifications';

enableScreens();

export default function App() {
  const token = useAuthStore((s) => s.token);

  React.useEffect(() => {
    if (token) {
      setupPushNotifications();
      const cleanup = initNotificationListeners();
      return cleanup;
    }
  }, [token]);

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <StatusBar
          backgroundColor={THEME.colors.primary}
          barStyle="light-content"
        />
        <AppNavigator />
        <Toast />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
