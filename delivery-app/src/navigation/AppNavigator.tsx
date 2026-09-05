import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { RootStackParamList } from '../types';
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import AssignmentListScreen from '../screens/AssignmentListScreen';
import AssignmentDetailScreen from '../screens/AssignmentDetailScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { token, isBootstrapped } = useAuthStore();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      {!isBootstrapped ? (
        <Stack.Screen name="Splash" component={SplashScreen} />
      ) : token ? (
        <>
          <Stack.Screen name="AssignmentList" component={AssignmentListScreen} />
          <Stack.Screen name="AssignmentDetail" component={AssignmentDetailScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
