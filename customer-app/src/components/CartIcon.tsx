import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCartStore } from '../store/cartStore';
import { RootStackParamList } from '../types';
import THEME from '../theme/theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const CartIcon: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const itemCount = useCartStore((s) => s.itemCount);

  return (
    <Pressable
      onPress={() => navigation.navigate('Cart')}
      style={({ pressed }: { pressed: boolean }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
      hitSlop={8}
    >
      <Icon name="cart-outline" size={26} color={THEME.colors.graphite} />
      {itemCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {itemCount > 99 ? '99+' : String(itemCount)}
          </Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pressed: { opacity: 0.7 },
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
    backgroundColor: THEME.colors.error,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 12,
  },
});

export default CartIcon;
