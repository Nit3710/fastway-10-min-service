import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Pressable,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, OrderResponse } from '../types';
import { getMyOrders } from '../api/orderApi';
import THEME from '../theme/theme';
import Card from '../components/Card';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCartStore } from '../store/cartStore';
import { useToastStore } from '../store/toastStore';
import InvoiceModal, { InvoiceData } from '../components/InvoiceModal';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const OrderListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useToastStore((s) => s.showToast);

  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Invoice Modal state
  const [activeInvoice, setActiveInvoice] = useState<InvoiceData | null>(null);

  const fetchOrders = async () => {
    try {
      setError(false);
      const res = await getMyOrders(0, 50);
      setOrders(res.content || []);
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchOrders();
    }, [])
  );

  const handleReorderItems = async (order: OrderResponse) => {
    if (!order.items || order.items.length === 0) {
      showToast('No items found in this order', 'error');
      return;
    }
    try {
      showToast('Adding order items to cart...', 'info');
      for (const item of order.items) {
        await addItem(item.productId, item.quantity);
      }
      showToast('All items added to cart!', 'success');
      navigation.navigate('Cart');
    } catch (err) {
      showToast('Failed to reorder items', 'error');
    }
  };

  const handleViewInvoice = (order: OrderResponse) => {
    const items = order.items && order.items.length > 0
      ? order.items.map((i) => ({
          name: i.productName || `Product #${i.productId}`,
          qty: i.quantity,
          price: i.price,
        }))
      : [{ name: 'Sanitary Plumbing Fitting Package', qty: 1, price: order.totalAmount }];

    const inv: InvoiceData = {
      invoiceNo: `INV-ORD-${order.id}`,
      date: formatDate(order.createdAt),
      type: 'ORDER',
      title: `Fastway Direct Materials Order #${order.id}`,
      items,
      subtotal: Math.max(0, order.totalAmount - 49),
      taxOrDelivery: 49,
      grandTotal: order.totalAmount,
      warrantyValidTill: '7 Days Post Delivery Guarantee',
    };
    setActiveInvoice(inv);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return THEME.colors.success;
      case 'CANCELLED':
        return THEME.colors.error;
      case 'OUT_FOR_DELIVERY':
        return '#0288D1';
      default:
        return THEME.colors.warning;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const renderOrderItemCard = ({ item }: { item: OrderResponse }) => {
    const statusColor = getStatusColor(item.status);
    const totalItems = item.items ? item.items.reduce((sum, i) => sum + i.quantity, 0) : 0;

    return (
      <Card style={styles.orderCard} elevation="none">
        <Pressable onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}>
          <View style={styles.orderHeader}>
            <View>
              <Text style={styles.orderIdText}>Order #FW-{item.id}</Text>
              <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
            </View>
          </View>

          <View style={styles.orderBody}>
            <Text style={styles.bodyDetails}>
              {totalItems} {totalItems === 1 ? 'item' : 'items'}  •  ₹{item.totalAmount.toFixed(0)}
            </Text>
            <Icon name="chevron-right" size={20} color={THEME.colors.textSecondary} />
          </View>
        </Pressable>

        {/* Action Buttons Row */}
        <View style={styles.cardActionsRow}>
          <Pressable
            onPress={() => handleReorderItems(item)}
            style={styles.reorderBtn}
          >
            <Icon name="refresh" size={14} color="#FFF" style={{ marginRight: 4 }} />
            <Text style={styles.reorderBtnText}>REORDER ALL</Text>
          </Pressable>

          <Pressable
            onPress={() => handleViewInvoice(item)}
            style={styles.invoiceBtn}
          >
            <Icon name="file-document-outline" size={14} color={THEME.colors.brass} style={{ marginRight: 4 }} />
            <Text style={styles.invoiceBtnText}>INVOICE & 7-DAY WARRANTY</Text>
          </Pressable>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={THEME.colors.background} barStyle="dark-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Icon name="arrow-left" size={24} color={THEME.colors.graphite} />
        </Pressable>
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Icon name="alert-circle-outline" size={48} color={THEME.colors.error} />
          <Text style={styles.errorText}>Failed to load your orders</Text>
          <Pressable onPress={() => { setLoading(true); fetchOrders(); }} style={styles.retryBtn}>
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <Icon name="package-variant" size={64} color={THEME.colors.textMuted} />
          <Text style={styles.emptyTitle}>No orders placed yet</Text>
          <Text style={styles.emptySubtitle}>Your shopping orders will appear here.</Text>
          <Pressable onPress={() => navigation.navigate('Home')} style={styles.shopBtn}>
            <Text style={styles.shopBtnText}>Shop Now</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderOrderItemCard}
          contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 24) + 16 }]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Invoice Modal */}
      <InvoiceModal
        visible={!!activeInvoice}
        invoice={activeInvoice}
        onClose={() => setActiveInvoice(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  backBtn: {
    padding: THEME.spacing.xs,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.graphite,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerRightPlaceholder: {
    width: 24,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: THEME.spacing.xl,
  },
  listContent: {
    padding: THEME.spacing.md,
  },
  orderCard: {
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    paddingBottom: THEME.spacing.sm,
  },
  orderIdText: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  dateText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.xs,
    borderRadius: THEME.borderRadius.xs,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  orderBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: THEME.spacing.sm,
  },
  bodyDetails: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: THEME.spacing.xs,
    paddingTop: THEME.spacing.xs,
    borderTopWidth: 0.5,
    borderTopColor: THEME.colors.border,
  },
  reorderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
    backgroundColor: THEME.colors.brass,
    borderRadius: THEME.borderRadius.xs,
  },
  reorderBtnText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.3,
  },
  invoiceBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.xs,
    backgroundColor: '#FAF9F6',
  },
  invoiceBtnText: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.graphite,
    letterSpacing: 0.3,
  },
  errorText: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
  },
  retryBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
  },
  retryText: {
    color: '#FFF',
    fontWeight: '700',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.text,
    marginTop: THEME.spacing.lg,
  },
  emptySubtitle: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: THEME.spacing.xs,
    marginBottom: THEME.spacing.xl,
  },
  shopBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
  },
  shopBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
});

export default OrderListScreen;
