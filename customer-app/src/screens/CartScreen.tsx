import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
  Modal,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import THEME from '../theme/theme';
import { RootStackParamList, CartItem } from '../types';
import { useCartStore } from '../store/cartStore';
import { useToastStore } from '../store/toastStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EmptyState from '../components/EmptyState';
import Button from '../components/Button';
import Card from '../components/Card';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const CartScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const {
    items,
    total,
    isFetching,
    fetchError,
    fetchCart,
    updateItem,
    removeItem,
  } = useCartStore();
  const showToast = useToastStore((s) => s.showToast);

  const [showSaveKitModal, setShowSaveKitModal] = useState(false);
  const [kitName, setKitName] = useState('');

  const handleSaveAsKit = async () => {
    if (!kitName.trim()) {
      showToast('Please enter a kit name', 'error');
      return;
    }
    if (items.length === 0) {
      showToast('Cart is empty', 'error');
      return;
    }

    try {
      const saved = await AsyncStorage.getItem('fastway_custom_kits');
      let customKits: { name: string; items: { productId: number; name: string; qty: number }[] }[] = [];
      if (saved) {
        customKits = JSON.parse(saved);
      }

      if (customKits.some(k => k.name.toLowerCase() === kitName.toLowerCase())) {
        showToast('A kit with this name already exists', 'error');
        return;
      }

      const kitItems = items.map(item => ({
        productId: item.productId,
        name: item.name,
        qty: item.quantity
      }));

      customKits.push({
        name: kitName.trim(),
        items: kitItems
      });

      await AsyncStorage.setItem('fastway_custom_kits', JSON.stringify(customKits));
      showToast(`Kit "${kitName}" saved successfully!`, 'success');
      setKitName('');
      setShowSaveKitModal(false);
    } catch (err) {
      console.warn('Failed to save kit:', err);
      showToast('Failed to save custom project kit', 'error');
    }
  };

  // Local quantities state for responsive stepper and debouncing API calls
  const [localQuantities, setLocalQuantities] = useState<Record<number, number>>({});
  const debounceTimers = useRef<Record<number, NodeJS.Timeout>>({});

  // Sync local quantities with store items whenever store items change
  // but avoid overriding items currently being edited by the user.
  useEffect(() => {
    const nextLocal: Record<number, number> = {};
    items.forEach((item) => {
      if (!debounceTimers.current[item.productId]) {
        nextLocal[item.productId] = item.quantity;
      } else {
        nextLocal[item.productId] = localQuantities[item.productId] ?? item.quantity;
      }
    });
    setLocalQuantities(nextLocal);
  }, [items]);

  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchCart();
    }, [fetchCart])
  );

  const handleQtyChange = (productId: number, currentQty: number, change: number) => {
    const newQty = currentQty + change;
    if (newQty < 1) {
      handleRemovePress(productId);
      return;
    }

    setLocalQuantities((prev) => ({ ...prev, [productId]: newQty }));

    if (debounceTimers.current[productId]) {
      clearTimeout(debounceTimers.current[productId]);
    }

    debounceTimers.current[productId] = setTimeout(async () => {
      try {
        await updateItem(productId, newQty);
      } catch (err: any) {
        showToast('Failed to update quantity', 'error');
        fetchCart();
      } finally {
        delete debounceTimers.current[productId];
      }
    }, 500);
  };

  const handleRemovePress = (productId: number) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              if (debounceTimers.current[productId]) {
                clearTimeout(debounceTimers.current[productId]);
                delete debounceTimers.current[productId];
              }
              await removeItem(productId);
              showToast('Item removed from cart', 'success');
            } catch (err: any) {
              showToast('Failed to remove item', 'error');
            }
          },
        },
      ]
    );
  };

  const deliveryCharge = total > 500 ? 0 : 49;
  const grandTotal = total + deliveryCharge;

  const renderCartItem = ({ item }: { item: CartItem }) => {
    const displayQty = localQuantities[item.productId] ?? item.quantity;

    return (
      <View style={styles.itemRow}>
        {/* Item Image */}
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.itemImage} resizeMode="contain" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Icon name="package-variant-closed" size={24} color={THEME.colors.textMuted} />
          </View>
        )}

        {/* Item Info */}
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.itemPrice}>₹{item.price.toFixed(0)}</Text>
        </View>

        {/* Stepper Controls and Trash */}
        <View style={styles.actionCol}>
          <Pressable
            onPress={() => handleRemovePress(item.productId)}
            style={styles.deleteBtn}
            hitSlop={8}
          >
            <Icon name="trash-can-outline" size={20} color={THEME.colors.error} />
          </Pressable>

          <View style={styles.stepper}>
            <Pressable
              onPress={() => handleQtyChange(item.productId, displayQty, -1)}
              style={styles.stepBtn}
              hitSlop={6}
            >
              <Icon name="minus" size={14} color={THEME.colors.graphite} />
            </Pressable>
            <Text style={styles.qtyText}>{displayQty}</Text>
            <Pressable
              onPress={() => handleQtyChange(item.productId, displayQty, 1)}
              style={styles.stepBtn}
              hitSlop={6}
            >
              <Icon name="plus" size={14} color={THEME.colors.graphite} />
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  if (isFetching && items.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
            <Icon name="arrow-left" size={24} color={THEME.colors.graphite} />
          </Pressable>
          <Text style={styles.headerTitle}>Shopping Cart</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Loading your cart...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (fetchError && items.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
            <Icon name="arrow-left" size={24} color={THEME.colors.graphite} />
          </Pressable>
          <Text style={styles.headerTitle}>Shopping Cart</Text>
        </View>
        <EmptyState
          icon="alert-circle-outline"
          message="Failed to load your cart. Check your network."
          actionTitle="Try Again"
          onAction={fetchCart}
        />
      </SafeAreaView>
    );
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
            <Icon name="arrow-left" size={24} color={THEME.colors.graphite} />
          </Pressable>
          <Text style={styles.headerTitle}>Shopping Cart</Text>
        </View>
        <EmptyState
          icon="cart-off-outline"
          title="YOUR CART IS EMPTY"
          message="Looks like you haven't added any plumbing supplies, fittings, or tools yet."
          actionTitle="BROWSE PRODUCTS"
          actionIcon="store-search-outline"
          actionVariant="primary"
          onAction={() => navigation.navigate('Home')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={THEME.colors.background} barStyle="dark-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Icon name="arrow-left" size={24} color={THEME.colors.graphite} />
        </Pressable>
        <Text style={styles.headerTitle}>Shopping Cart ({items.length})</Text>
        <Pressable
          onPress={() => navigation.navigate('Home')}
          style={styles.addMoreHeaderBtn}
          hitSlop={8}
        >
          <Icon name="plus" size={16} color={THEME.colors.brass} style={{ marginRight: 2 }} />
          <Text style={styles.addMoreHeaderText}>ADD ITEMS</Text>
        </Pressable>
      </View>

      {/* Cart List */}
      <FlatList<CartItem>
        data={items}
        keyExtractor={(item) => String(item.productId)}
        renderItem={renderCartItem}
        contentContainerStyle={styles.listContainer}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
      />

      {/* Footer Order Summary */}
      <View style={[styles.footer, { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 24) + 12 : Math.max(insets.bottom, THEME.spacing.md) }]}>
        <Card style={styles.summaryCard} elevation="none">
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₹{total.toFixed(0)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Charge</Text>
            <Text style={styles.summaryValue}>
              {deliveryCharge === 0 ? (
                <Text style={styles.freeText}>FREE</Text>
              ) : (
                `₹${deliveryCharge}`
              )}
            </Text>
          </View>
          {deliveryCharge > 0 && (
            <View style={styles.offerBanner}>
              <Icon name="percent-outline" size={14} color={THEME.colors.accent} style={{ marginRight: 6 }} />
              <Text style={styles.deliveryNote}>
                Add ₹{(500 - total).toFixed(0)} more for FREE delivery
              </Text>
            </View>
          )}
          <View style={[styles.dividerLine, { marginVertical: THEME.spacing.sm }]} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{grandTotal.toFixed(0)}</Text>
          </View>
        </Card>

        <View style={styles.actionBtnRow}>
          <Pressable
            onPress={() => setShowSaveKitModal(true)}
            style={styles.saveKitBtn}
          >
            <Icon name="folder-star" size={16} color={THEME.colors.brass} style={{ marginRight: 6 }} />
            <Text style={styles.saveKitBtnText}>SAVE AS KIT</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Button
              title="CHECKOUT"
              onPress={() => navigation.navigate('Checkout')}
              variant="primary"
              style={styles.checkoutBtn}
            />
          </View>
        </View>

        {/* Naming Modal Dialog */}
        <Modal
          visible={showSaveKitModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSaveKitModal(false)}
        >
          <View style={styles.modalBackdrop}>
            <Card style={styles.modalCard} elevation="none">
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>SAVE CUSTOM PROJECT KIT</Text>
                <Pressable onPress={() => setShowSaveKitModal(false)} hitSlop={8}>
                  <Icon name="close" size={20} color={THEME.colors.graphite} />
                </Pressable>
              </View>
              <Text style={styles.modalSubtitle}>
                Save current cart items as a template for quick ordering.
              </Text>
              <TextInput
                value={kitName}
                onChangeText={setKitName}
                placeholder="e.g. Sharma Site Plumbing, Kitchen Set..."
                placeholderTextColor={THEME.colors.graphiteMuted}
                style={styles.modalInput}
                autoFocus
              />
              <Pressable onPress={handleSaveAsKit} style={styles.modalSaveBtn}>
                <Text style={styles.modalSaveBtnText}>SAVE TEMPLATE</Text>
              </Pressable>
            </Card>
          </View>
        </Modal>
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
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.graphite,
    marginLeft: THEME.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addMoreHeaderBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: THEME.borderRadius.xs,
    borderWidth: 1,
    borderColor: THEME.colors.brass,
  },
  addMoreHeaderText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.brass,
    letterSpacing: 0.5,
  },
  listContainer: {
    padding: THEME.spacing.md,
    paddingBottom: 20,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: '#FFF',
  },
  imagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  itemInfo: {
    flex: 1,
    marginLeft: THEME.spacing.md,
    paddingRight: THEME.spacing.xs,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.text,
    lineHeight: 16,
    marginBottom: 4,
  },
  itemPrice: {
    fontFamily: THEME.typography.price.fontFamily,
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.graphite,
  },
  actionCol: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 64,
  },
  deleteBtn: {
    padding: 2,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.sm,
    height: 28,
    paddingHorizontal: 4,
  },
  stepBtn: {
    padding: 4,
  },
  qtyText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.graphite,
    minWidth: 18,
    textAlign: 'center',
  },
  divider: {
    height: THEME.spacing.sm,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.xl,
  },
  loadingText: {
    marginTop: THEME.spacing.md,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  footer: {
    backgroundColor: '#FFF',
    padding: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    ...THEME.shadows.heavy,
  },
  summaryCard: {
    padding: THEME.spacing.md,
    borderWidth: 1,
    marginBottom: THEME.spacing.md,
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
  freeText: {
    color: THEME.colors.success,
    fontWeight: '800',
  },
  offerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.accentLight,
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.xs,
    marginTop: 4,
  },
  deliveryNote: {
    fontSize: 10,
    color: THEME.colors.accent,
    fontWeight: '700',
  },
  dividerLine: {
    height: 1,
    backgroundColor: THEME.colors.border,
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
  checkoutBtn: {
    height: 46,
  },
  actionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveKitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderWidth: 1.5,
    borderColor: THEME.colors.brass,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: THEME.spacing.md,
    backgroundColor: '#FFF',
    marginRight: 10,
  },
  saveKitBtnText: {
    color: THEME.colors.brass,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    padding: THEME.spacing.lg,
  },
  modalCard: {
    padding: THEME.spacing.lg,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.xs,
  },
  modalTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.graphite,
    letterSpacing: 0.5,
  },
  modalSubtitle: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.md,
    lineHeight: 14,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.sm,
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.xs,
    fontSize: 13,
    color: THEME.colors.graphite,
    backgroundColor: '#FAF9F6',
    marginBottom: THEME.spacing.md,
  },
  modalSaveBtn: {
    backgroundColor: THEME.colors.brass,
    height: 44,
    borderRadius: THEME.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSaveBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default CartScreen;
