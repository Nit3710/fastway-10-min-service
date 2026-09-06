import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, View, Image, Text } from 'react-native';
import THEME from '../theme/theme';
import { useCartStore } from '../store/cartStore';
import useAuthStore from '../store/authStore';
import { CONFIG } from '../api/apiClient';
import { RootStackParamList } from '../types';
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import HomeScreen from '../screens/HomeScreen';
import ProductListScreen from '../screens/ProductListScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import SearchScreen from '../screens/SearchScreen';
import CartScreen from '../screens/CartScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import AddressListScreen from '../screens/AddressListScreen';
import AddressFormScreen from '../screens/AddressFormScreen';
import OrderSuccessScreen from '../screens/OrderSuccessScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import OrderListScreen from '../screens/OrderListScreen';
import ReviewFormScreen from '../screens/ReviewFormScreen';
import CalculatorScreen from '../screens/CalculatorScreen';
import BookServiceScreen from '../screens/BookServiceScreen';
import BookingsListScreen from '../screens/BookingsListScreen';
import TrackPlumberScreen from '../screens/TrackPlumberScreen';

const Tab = createBottomTabNavigator<any>();

const getAvatarUri = (pictureUrl?: string | null) => {
  if (!pictureUrl) return null;
  if (pictureUrl.startsWith('http://') || pictureUrl.startsWith('https://')) {
    return pictureUrl;
  }
  return `${CONFIG.API_BASE_URL}${pictureUrl.startsWith('/') ? '' : '/'}${pictureUrl}`;
};

const TabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  const cartItems = useCartStore((s) => s.items);
  const user = useAuthStore((s) => s.user);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const bottomPadding = Platform.OS === 'android' ? Math.max(insets.bottom, 16) : Math.max(insets.bottom, 8);
  const tabHeight = 56 + bottomPadding;

  const photoUri = getAvatarUri(user?.profilePictureUrl);
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: THEME.colors.brass,
        tabBarInactiveTintColor: THEME.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          height: tabHeight,
          paddingBottom: bottomPadding,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Icon name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarLabel: 'Search',
          tabBarIcon: ({ color, focused }) => (
            <Icon name={focused ? 'magnify' : 'magnify'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarLabel: 'Cart',
          tabBarIcon: ({ color, focused }) => (
            <Icon name={focused ? 'cart' : 'cart-outline'} size={24} color={color} />
          ),
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: THEME.colors.brass,
            color: '#FFFFFF',
            fontSize: 9,
            fontWeight: '900',
            lineHeight: 13,
            height: 16,
            minWidth: 16,
            borderRadius: 8,
          },
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused }) => {
            if (photoUri) {
              return (
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    borderWidth: focused ? 2 : 1,
                    borderColor: focused ? THEME.colors.brass : '#CBD5E1',
                    overflow: 'hidden',
                    backgroundColor: THEME.colors.surfaceRaised,
                  }}
                >
                  <Image
                    source={{ uri: photoUri }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                </View>
              );
            }

            return (
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  borderWidth: focused ? 2 : 1,
                  borderColor: focused ? THEME.colors.brass : '#CBD5E1',
                  backgroundColor: focused ? THEME.colors.brass : THEME.colors.surfaceRaised,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {initials ? (
                  <Text style={{ fontSize: 10, fontWeight: '800', color: focused ? '#FFFFFF' : THEME.colors.graphite }}>
                    {initials}
                  </Text>
                ) : (
                  <Icon name={focused ? 'account' : 'account-outline'} size={16} color={focused ? '#FFFFFF' : color} />
                )}
              </View>
            );
          },
        }}
      />
    </Tab.Navigator>
  );
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { token, isBootstrapped } = useAuthStore();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      {!isBootstrapped ? (
        <Stack.Screen name="Splash" component={SplashScreen} />
      ) : token ? (
        <>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen name="ProductList" component={ProductListScreen} />
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
          <Stack.Screen name="Checkout" component={CheckoutScreen} />
          <Stack.Screen name="AddressList" component={AddressListScreen} />
          <Stack.Screen name="AddressForm" component={AddressFormScreen} />
          <Stack.Screen name="OrderSuccess" component={OrderSuccessScreen} />
          <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="OrderList" component={OrderListScreen} />
          <Stack.Screen name="ReviewForm" component={ReviewFormScreen} />
          <Stack.Screen name="Calculator" component={CalculatorScreen} />
          <Stack.Screen name="BookService" component={BookServiceScreen} />
          <Stack.Screen name="BookingsList" component={BookingsListScreen} />
          <Stack.Screen name="TrackPlumber" component={TrackPlumberScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
