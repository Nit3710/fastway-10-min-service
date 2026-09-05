import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Platform,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import RazorpayCheckout from 'react-native-razorpay';
import THEME from '../theme/theme';
import { CartItem, RootStackParamList, UserAddress } from '../types';
import { getAddresses, checkServiceability } from '../api/addressApi';
import { placeOrder, PaymentMode } from '../api/orderApi';
import { createRazorpayOrder, RazorpayPaymentResult, verifyRazorpayPayment } from '../api/paymentApi';
import { validateCoupon } from '../api/couponApi';
import { apiGetMe } from '../api/authApi';
import { useCartStore } from '../store/cartStore';
import useAuthStore from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import Button from '../components/Button';
import Card from '../components/Card';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'Checkout'>;

export const CheckoutScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const showToast = useToastStore((state) => state.showToast);
  const { items, total: cartTotal, fetchCart, clearCart } = useCartStore();
  const { user, setUser } = useAuthStore();
  const [usePoints, setUsePoints] = useState(false);
  
  const [selectedAddress, setSelectedAddress] = useState<UserAddress | null>(null);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [loadingCharge, setLoadingCharge] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [addressLoading, setAddressLoading] = useState(true);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('COD');
  
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const handleApplyCoupon = async (codeToApply?: string) => {
    const code = codeToApply || couponInput;
    if (!code || code.trim() === '') return;
    
    setCouponLoading(true);
    setCouponError(null);
    try {
      const result = await validateCoupon(code.trim().toUpperCase(), cartTotal);
      setAppliedCoupon(result);
      setCouponInput(result.code);
      showToast(`Coupon ${result.code} applied! Saved \u20B9${result.discountAmount.toFixed(0)}`, 'success');
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Invalid coupon code';
      setCouponError(errMsg);
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
  };
  
  const [idempotencyKey] = useState(() => {
    const nativeUuid = (globalThis as any).crypto?.randomUUID;
    if (nativeUuid) return nativeUuid.call((globalThis as any).crypto);
    const random = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
    return `${random()}-${random()}-4${random().slice(1)}-${random()}-${random()}${random()}`;
  });

  useFocusEffect(
    useCallback(() => {
      fetchCart();
      const loadProfile = async () => {
        try {
          const profile = await apiGetMe();
          setUser(profile);
        } catch {}
      };
      loadProfile();
    }, [fetchCart, setUser])
  );

  useFocusEffect(
    useCallback(() => {
      const loadAddress = async () => {
        setAddressLoading(true);
        try {
          if (route.params?.selectedAddress) {
            setSelectedAddress(route.params.selectedAddress);
          } else {
            const addresses = await getAddresses();
            setSelectedAddress(addresses.find((a) => a.isDefault) || addresses[0] || null);
          }
        } catch {
          showToast('Failed to fetch addresses', 'error');
        } finally {
          setAddressLoading(false);
        }
      };
      loadAddress();
    }, [route.params?.selectedAddress, showToast])
  );

  useEffect(() => {
    const loadCharge = async () => {
      if (!selectedAddress) return setDeliveryCharge(0);
      setLoadingCharge(true);
      try {
        const result = await checkServiceability(selectedAddress.pincode);
        setDeliveryCharge(result.serviceable ? result.deliveryCharge : 0);
        if (!result.serviceable) {
          showToast(`Address pincode ${selectedAddress.pincode} is not serviceable`, 'error');
        }
      } catch {
        setDeliveryCharge(49);
      } finally {
        setLoadingCharge(false);
      }
    };
    loadCharge();
  }, [selectedAddress, showToast]);

  const handlePlaceOrder = async () => {
    if (!selectedAddress) return showToast('Please select a delivery address', 'error');
    setPlacingOrder(true);
    try {
      const order = await placeOrder(selectedAddress.id, paymentMode, idempotencyKey, appliedCoupon?.code || undefined, usePoints);
      if (paymentMode === 'COD') {
        await clearCart();
        showToast('Order placed successfully!', 'success');
        navigation.replace('OrderSuccess', { orderId: order.id });
        return;
      }
      const razorpayOrder = await createRazorpayOrder(order.id);
      const payment = await RazorpayCheckout.open({
        key: razorpayOrder.razorpayKeyId,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'Fastway',
        description: `Order #${order.id}`,
        order_id: razorpayOrder.razorpayOrderId,
        prefill: {
          email: user?.email || 'test@fastway.com',
          contact: user?.phone || '',
          name: user?.name || '',
        },
        theme: { color: THEME.colors.primary }
      }) as RazorpayPaymentResult;
      
      await verifyRazorpayPayment(order.id, payment);
      await clearCart();
      showToast('Payment verified. Order confirmed!', 'success');
      navigation.replace('OrderSuccess', { orderId: order.id });
    } catch (error: any) {
      const cancelled = paymentMode === 'ONLINE' && (error?.code === 0 || error?.description?.toLowerCase?.().includes('cancel'));
      showToast(
        cancelled
          ? 'Payment cancelled. Try again or choose COD.'
          : (error?.response?.data?.message || error?.message || 'Unable to complete the order'),
        'error'
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  const discount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const pointsRedeemAmount = usePoints && user && user.loyaltyPoints
    ? Math.min(Math.floor(user.loyaltyPoints / 10), Math.max(0, cartTotal + deliveryCharge - discount))
    : 0;
  const grandTotal = Math.max(0, cartTotal + deliveryCharge - discount - pointsRedeemAmount);

  const option = (mode: PaymentMode, title: string, subtitle: string) => (
    <Pressable
      onPress={() => setPaymentMode(mode)}
      style={styles.radioRow}
      disabled={placingOrder}
    >
      <View style={[styles.radio, paymentMode === mode ? styles.radioSelected : styles.radioUnselected]}>
        {paymentMode === mode && <View style={styles.radioInner} />}
      </View>
      <View style={styles.paymentInfo}>
        <Text style={styles.paymentLabel}>{title}</Text>
        <Text style={styles.paymentSub}>{subtitle}</Text>
      </View>
      <Icon
        name={mode === 'COD' ? 'cash' : 'credit-card-outline'}
        size={24}
        color={mode === 'COD' ? '#2E7D32' : THEME.colors.primary}
      />
    </Pressable>
  );

  const item = (cartItem: CartItem) => (
    <View key={cartItem.productId} style={styles.itemRow}>
      {cartItem.image ? (
        <Image source={{ uri: cartItem.image }} style={styles.itemImage} resizeMode="contain" />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Icon name="package-variant-closed" size={22} color={THEME.colors.textMuted} />
        </View>
      )}
      <View style={styles.itemDetails}>
        <Text style={styles.itemName} numberOfLines={1}>{cartItem.name}</Text>
        <Text style={styles.itemQty}>Qty: {cartItem.quantity} × ₹{cartItem.price.toFixed(0)}</Text>
      </View>
      <Text style={styles.itemSubtotal}>₹{cartItem.subtotal.toFixed(0)}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={THEME.colors.background} barStyle="dark-content" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Icon name="arrow-left" size={24} color={THEME.colors.graphite} />
        </Pressable>
        <Text style={styles.headerTitle}>Checkout</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Address Selection Section */}
        <Text style={styles.sectionTitle}>Delivery Address</Text>
        {addressLoading ? (
          <Card style={styles.addressCard} elevation="none">
            <ActivityIndicator color={THEME.colors.brass} />
          </Card>
        ) : selectedAddress ? (
          <Card style={styles.addressCard} elevation="none">
            <View style={styles.addressInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Icon name="map-marker" size={18} color={THEME.colors.brass} style={{ marginRight: 6 }} />
                <Text style={styles.addressType}>{(selectedAddress as any).name || 'Home'}</Text>
              </View>
              <Text style={styles.addressText}>{selectedAddress.addressLine}</Text>
              <Text style={styles.addressSub}>{selectedAddress.city} — {selectedAddress.pincode}</Text>
            </View>
            <Pressable onPress={() => navigation.navigate('AddressList', { selectMode: true })} hitSlop={8}>
              <Text style={styles.change}>Change</Text>
            </Pressable>
          </Card>
        ) : (
          <Card style={styles.addressCard} elevation="none">
            <Text style={styles.noAddressText}>No delivery address selected</Text>
            <Pressable onPress={() => navigation.navigate('AddressForm', { fromCheckout: true })} hitSlop={8}>
              <Text style={styles.change}>Add Address</Text>
            </Pressable>
          </Card>
        )}

        {/* Payment Selection Section */}
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <Card style={styles.paymentCard} elevation="none">
          {option('COD', 'Cash on Delivery (COD)', 'Pay when your package arrives')}
          <View style={styles.divider} />
          {option('ONLINE', 'Pay Online', 'Secure payment with Razorpay')}
        </Card>

        {/* Loyalty Points Redeem Section */}
        {user && user.loyaltyPoints !== undefined && user.loyaltyPoints > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Loyalty Rewards</Text>
            <Card style={styles.loyaltyRedeemCard} elevation="none">
              <View style={styles.loyaltyRedeemLeft}>
                <View style={styles.loyaltyRedeemIconBg}>
                  <Icon name="star-circle" size={24} color="#FFD600" />
                </View>
                <View style={styles.loyaltyRedeemTextCol}>
                  <Text style={styles.loyaltyRedeemTitle}>Redeem {user.loyaltyPoints} Points</Text>
                  <Text style={styles.loyaltyRedeemSubtitle}>Get flat ₹{Math.floor(user.loyaltyPoints / 10)} discount on this order</Text>
                </View>
              </View>
              <Pressable
                onPress={() => setUsePoints(!usePoints)}
                style={[styles.checkbox, usePoints && styles.checkboxActive]}
                hitSlop={12}
              >
                {usePoints && <Icon name="check" size={14} color="#FFF" />}
              </Pressable>
            </Card>
          </>
        ) : null}

        {/* Promo Coupon Section */}
        <Text style={styles.sectionTitle}>Apply Coupon</Text>
        <Card style={styles.couponCard} elevation="none">
          <View style={styles.couponInputRow}>
            <TextInput
              style={styles.couponInput}
              placeholder="Enter Coupon Code (e.g. SAVE20)"
              placeholderTextColor="#999"
              value={couponInput}
              onChangeText={(text) => {
                setCouponInput(text);
                if (couponError) setCouponError(null);
              }}
              autoCapitalize="characters"
              editable={!couponLoading && !appliedCoupon}
            />
            {appliedCoupon ? (
              <Pressable style={styles.couponBtnRemove} onPress={handleRemoveCoupon}>
                <Text style={styles.couponBtnRemoveText}>Remove</Text>
              </Pressable>
            ) : (
              <Pressable
                style={[
                  styles.couponBtnApply,
                  (!couponInput || couponInput.trim() === '') && styles.couponBtnApplyDisabled,
                ]}
                onPress={() => handleApplyCoupon()}
                disabled={!couponInput || couponInput.trim() === '' || couponLoading}
              >
                {couponLoading ? (
                  <ActivityIndicator size="small" color="#FFF" style={{ scaleX: 0.8, scaleY: 0.8 }} />
                ) : (
                  <Text style={styles.couponBtnApplyText}>Apply</Text>
                )}
              </Pressable>
            )}
          </View>
          
          {couponError && <Text style={styles.couponErrorText}>{couponError}</Text>}
          
          {appliedCoupon && (
            <View style={styles.couponSuccessRow}>
              <Icon name="check-circle" size={16} color="#2E7D32" style={{ marginRight: 6 }} />
              <Text style={styles.couponSuccessText}>
                '{appliedCoupon.code}' applied! Saved ₹{appliedCoupon.discountAmount.toFixed(0)}
              </Text>
            </View>
          )}

          {/* Quick suggestions badges */}
          {!appliedCoupon && (
            <View style={styles.couponSuggestions}>
              <Text style={styles.suggestionTitle}>Recommended Coupons:</Text>
              <View style={styles.suggestionBadges}>
                {['WELCOME50', 'SAVE20', 'FAST100'].map((code) => (
                  <Pressable
                    key={code}
                    style={styles.suggestionBadge}
                    onPress={() => {
                      setCouponInput(code);
                      handleApplyCoupon(code);
                    }}
                  >
                    <Text style={styles.suggestionBadgeText}>{code}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </Card>

        {/* Order Items Summary Section */}
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <Card style={styles.summaryCard} elevation="none">
          {items.map(item)}
          
          <View style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₹{cartTotal.toFixed(0)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Charge</Text>
            {loadingCharge ? (
              <ActivityIndicator size="small" color={THEME.colors.primary} />
            ) : (
              <Text style={styles.summaryValue}>{deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}`}</Text>
            )}
          </View>
          {appliedCoupon && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: '#2E7D32', fontWeight: '700' }]}>Coupon Discount</Text>
              <Text style={[styles.summaryValue, { color: '#2E7D32', fontWeight: '700' }]}>-₹{discount.toFixed(0)}</Text>
            </View>
          )}
          {pointsRedeemAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: '#F59E0B', fontWeight: '700' }]}>Loyalty Discount</Text>
              <Text style={[styles.summaryValue, { color: '#F59E0B', fontWeight: '700' }]}>-₹{pointsRedeemAmount.toFixed(0)}</Text>
            </View>
          )}
          <View style={styles.dividerLine} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{grandTotal.toFixed(0)}</Text>
          </View>
        </Card>
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Footer / Place Order */}
      <View style={[styles.footer, { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 24) + 16 : Math.max(insets.bottom, THEME.spacing.md) }]}>
        <Button
          title={paymentMode === 'ONLINE' ? 'Proceed to Pay' : 'Place Order'}
          onPress={handlePlaceOrder}
          disabled={!selectedAddress || loadingCharge || placingOrder}
          isLoading={placingOrder}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: THEME.colors.background 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  backBtn: { 
    padding: THEME.spacing.sm 
  },
  headerTitle: {
    color: THEME.colors.graphite,
    fontWeight: '700',
    marginLeft: THEME.spacing.sm,
    fontSize: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    padding: THEME.spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
    letterSpacing: 0.5,
  },
  addressCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: THEME.spacing.md,
    borderWidth: 1,
  },
  addressInfo: {
    flex: 1,
    paddingRight: THEME.spacing.sm,
  },
  addressType: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  addressText: {
    fontSize: 13,
    color: THEME.colors.text,
    lineHeight: 16,
  },
  addressSub: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  noAddressText: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  change: {
    color: THEME.colors.brass,
    fontWeight: '700',
    fontSize: 13,
  },
  paymentCard: {
    padding: THEME.spacing.md,
    borderWidth: 1,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: THEME.spacing.xs,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: THEME.spacing.md,
  },
  radioSelected: {
    borderColor: THEME.colors.brass,
  },
  radioUnselected: {
    borderColor: THEME.colors.border,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: THEME.colors.brass,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  paymentSub: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  summaryCard: {
    padding: THEME.spacing.md,
    borderWidth: 1,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  itemImage: {
    width: 44,
    height: 44,
    borderRadius: THEME.borderRadius.xs,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  imagePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: THEME.borderRadius.xs,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  itemDetails: {
    flex: 1,
    marginLeft: THEME.spacing.sm,
  },
  itemName: {
    fontSize: 13,
    color: THEME.colors.text,
    fontWeight: '600',
  },
  itemQty: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  itemSubtotal: {
    fontFamily: THEME.typography.price.fontFamily,
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.graphite,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.border,
    marginVertical: THEME.spacing.md,
  },
  dividerLine: {
    height: 1,
    backgroundColor: THEME.colors.border,
    marginVertical: THEME.spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  summaryValue: {
    fontFamily: THEME.typography.price.fontFamily,
    fontSize: 13,
    color: THEME.colors.graphite,
    fontWeight: '700',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.graphite,
  },
  totalValue: {
    fontFamily: THEME.typography.price.fontFamily,
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.graphite,
  },
  couponCard: {
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  couponInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.sm,
  },
  couponInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.sm,
    paddingHorizontal: THEME.spacing.md,
    fontSize: 13,
    color: THEME.colors.graphite,
    backgroundColor: THEME.colors.surfaceRaised,
  },
  couponBtnApply: {
    backgroundColor: THEME.colors.brass,
    paddingHorizontal: THEME.spacing.lg,
    height: 40,
    borderRadius: THEME.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  couponBtnApplyDisabled: {
    backgroundColor: '#CCC',
  },
  couponBtnApplyText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  couponBtnRemove: {
    borderWidth: 1,
    borderColor: THEME.colors.error,
    paddingHorizontal: THEME.spacing.md,
    height: 40,
    borderRadius: THEME.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  couponBtnRemoveText: {
    color: THEME.colors.error,
    fontSize: 13,
    fontWeight: '700',
  },
  couponErrorText: {
    color: THEME.colors.error,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
    marginLeft: 2,
  },
  couponSuccessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#E8F5E9',
    padding: 8,
    borderRadius: THEME.borderRadius.xs,
  },
  couponSuccessText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  couponSuggestions: {
    marginTop: THEME.spacing.md,
  },
  suggestionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginBottom: 6,
  },
  suggestionBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THEME.spacing.sm,
  },
  suggestionBadge: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  suggestionBadgeText: {
    color: THEME.colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  footer: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    ...THEME.shadows.heavy,
  },
  loyaltyRedeemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: THEME.spacing.md,
    backgroundColor: '#FFFDF0',
    borderColor: '#FFE082',
    borderWidth: 1,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.md,
  },
  loyaltyRedeemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  loyaltyRedeemIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF8E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: THEME.spacing.sm,
  },
  loyaltyRedeemTextCol: {
    flex: 1,
  },
  loyaltyRedeemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  loyaltyRedeemSubtitle: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  checkboxActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
});

export default CheckoutScreen;
