import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Pressable, StatusBar } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import THEME from '../theme/theme';
import { RootStackParamList } from '../types';
import Button from '../components/Button';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'OrderSuccess'>;

export const OrderSuccessScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { orderId } = route.params;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={THEME.colors.success} barStyle="light-content" />

      {/* Hero Header */}
      <View style={styles.hero}>
        <Text style={styles.checkmarkIcon}>🎉</Text>
        <Text style={styles.heroTitle}>Order Placed!</Text>
        <Text style={styles.heroSubtitle}>Thank you for shopping with Fastway</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.detailsCard}>
          <Text style={styles.cardLabel}>ORDER NUMBER</Text>
          <Text style={styles.cardValue}>#FW-{orderId}</Text>
          <View style={styles.divider} />
          <Text style={styles.infoText}>
            Your order has been received and is being processed. We will deliver it to your address shortly.
          </Text>
        </View>

        <View style={styles.buttonGroup}>
          <Button
            title="View Order Details"
            onPress={() => navigation.navigate('OrderDetail', { orderId })}
            style={styles.actionBtn}
          />
          <Button
            title="Continue Shopping"
            onPress={() => navigation.navigate('Home')}
            variant="outline"
            style={styles.outlineBtn}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.colors.background },
  hero: {
    backgroundColor: THEME.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: THEME.spacing.xxl * 1.5,
    borderBottomLeftRadius: THEME.borderRadius.xl * 2,
    borderBottomRightRadius: THEME.borderRadius.xl * 2,
    ...THEME.shadows.medium,
  },
  checkmarkIcon: { fontSize: 72, marginBottom: THEME.spacing.md },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: THEME.colors.surface,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginTop: THEME.spacing.xs,
    fontWeight: '500',
  },
  body: {
    flex: 1,
    padding: THEME.spacing.xl,
    justifyContent: 'space-between',
  },
  detailsCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.xl,
    alignItems: 'center',
    ...THEME.shadows.light,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginTop: -THEME.spacing.xxl,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 1,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.colors.text,
    marginTop: THEME.spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.border,
    width: '100%',
    marginVertical: THEME.spacing.md,
  },
  infoText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
  buttonGroup: {
    gap: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
  },
  actionBtn: {},
  outlineBtn: {
    borderColor: THEME.colors.primary,
  },
});

export default OrderSuccessScreen;
