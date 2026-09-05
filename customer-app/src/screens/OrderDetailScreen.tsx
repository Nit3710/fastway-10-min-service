import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MapView, { Marker, MapMarker } from 'react-native-maps';
import { ref as dbRef, onValue, off } from '@firebase/database';
import { db } from '../utils/firebase';
import THEME from '../theme/theme';
import { RootStackParamList, OrderResponse, OrderItemResponse } from '../types';
import { getOrderDetails, cancelOrder } from '../api/orderApi';
import { useToastStore } from '../store/toastStore';
import Card from '../components/Card';
import SkeletonBox from '../components/SkeletonBox';
import EmptyState from '../components/EmptyState';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'OrderDetail'>;

const STEPS = ['PLACED', 'CONFIRMED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED'];

const DetailSkeleton = () => (
  <View style={styles.scrollContent}>
    <View style={[styles.statusCard, { height: 70, justifyContent: 'center' }]}>
      <SkeletonBox width="60%" height={16} />
    </View>
    <View style={[styles.card, { height: 100, justifyContent: 'center', marginTop: THEME.spacing.md }]}>
      <SkeletonBox width="80%" height={14} />
      <SkeletonBox width="50%" height={12} style={{ marginTop: 10 }} />
    </View>
    <View style={[styles.card, { height: 150, justifyContent: 'center', marginTop: THEME.spacing.md }]}>
      <SkeletonBox width="90%" height={12} />
      <SkeletonBox width="90%" height={12} style={{ marginTop: 10 }} />
    </View>
  </View>
);

export const OrderDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { orderId } = route.params;
  const insets = useSafeAreaInsets();
  const showToast = useToastStore((s) => s.showToast);

  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnQuantities, setReturnQuantities] = useState<Record<number, number>>({});

  const handleReturnQtyChange = (productId: number, current: number, diff: number, max: number = 99) => {
    const next = Math.max(0, Math.min(max, current + diff));
    setReturnQuantities(prev => ({ ...prev, [productId]: next }));
  };

  const handleConfirmReturn = () => {
    const hasItems = Object.values(returnQuantities).some(q => q > 0);
    if (!hasItems) {
      showToast('Please select at least 1 item to return', 'error');
      return;
    }
    
    showToast('Return request registered successfully!', 'success');
    setShowReturnModal(false);
    setReturnQuantities({});
    Alert.alert(
      'Return Request Confirmed',
      'Our rider will collect the unused items and verify their seal on your next order dispatch. Refund will be credited instantly upon pickup.'
    );
  };

  const handleCancelPress = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order? This action cannot be undone and your refund (if any) will be initiated.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await cancelOrder(orderId);
              showToast('Order cancelled successfully', 'success');
              fetchOrder();
            } catch (err: any) {
              const msg = err?.response?.data?.message || err?.message || 'Failed to cancel order';
              showToast(msg, 'error');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const handleSupportPress = () => {
    Alert.alert(
      'Help & Support',
      'Need help with your order? Choose an option below to connect with Fastway Support.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '📞 Call Us',
          onPress: () => Linking.openURL('tel:+919999988888').catch(() => showToast('Could not open phone dialer', 'error')),
        },
        {
          text: '💬 WhatsApp Chat',
          onPress: () => Linking.openURL('https://wa.me/919999988888?text=I%20need%20help%20with%20Order%20%23FW-' + orderId).catch(() => showToast('Could not open WhatsApp', 'error')),
        },
        {
          text: '✉️ Email Support',
          onPress: () => Linking.openURL('mailto:support@fastway.com?subject=Support%20Request%20for%20Order%20%23FW-' + orderId).catch(() => showToast('Could not open mail app', 'error')),
        },
      ]
    );
  };

  // Live Tracking state
  const [partnerLocation, setPartnerLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [remainingMinutes, setRemainingMinutes] = useState<number | null>(null);

  const mapViewRef = useRef<MapView | null>(null);
  const markerRef = useRef<MapMarker | null>(null);

  const fetchOrder = async () => {
    try {
      setError(false);
      const data = await getOrderDetails(orderId);
      setOrder(data);
    } catch (err) {
      setError(true);
      showToast('Failed to load order details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrder();
    }, [orderId])
  );

  useEffect(() => {
    if (!order?.estimatedDeliveryMinutes) { setRemainingMinutes(null); return; }
    const update = () => {
      const end = new Date(order.createdAt).getTime() + order.estimatedDeliveryMinutes! * 60000;
      setRemainingMinutes(Math.max(0, Math.ceil((end - Date.now()) / 60000)));
    };
    update(); const timer = setInterval(update, 30000); return () => clearInterval(timer);
  }, [order?.createdAt, order?.estimatedDeliveryMinutes]);

  // Subscribe to Live Order Status in Firebase RTDB
  useEffect(() => {
    let statusRef: any = null;
    try {
      statusRef = dbRef(db, `orders/${orderId}`);
      onValue(statusRef, (snapshot) => {
        const val = snapshot.val();
        if (val && val.status) {
          setOrder((prev) => {
            if (!prev) return null;
            if (prev.status === val.status) return prev;
            return { ...prev, status: val.status };
          });
        }
      });
    } catch (err) {
      console.warn('Firebase RTDB status subscription failed:', err);
    }

    return () => {
      if (statusRef) {
        try {
          off(statusRef);
        } catch (e) {}
      }
    };
  }, [orderId]);

  // Subscribe to Delivery Location tracking when status is OUT_FOR_DELIVERY
  useEffect(() => {
    let locationRef: any = null;
    const currentStatus = order?.status;

    if (currentStatus === 'OUT_FOR_DELIVERY') {
      try {
        locationRef = dbRef(db, `deliveryTracking/${orderId}/location`);
        onValue(locationRef, (snapshot) => {
          const val = snapshot.val();
          if (val && val.latitude && val.longitude) {
            const newCoords = { latitude: val.latitude, longitude: val.longitude };
            
            setPartnerLocation((prev) => {
              if (prev && prev.latitude === newCoords.latitude && prev.longitude === newCoords.longitude) {
                return prev;
              }
              return newCoords;
            });

            if (markerRef.current) {
              markerRef.current.animateMarkerToCoordinate(newCoords, 1000);
            }
          }
        });
      } catch (err) {
        console.warn('Firebase RTDB tracking location subscription failed:', err);
      }
    } else {
      setPartnerLocation(null);
    }

    return () => {
      if (locationRef) {
        try {
          off(locationRef);
        } catch (e) {}
      }
    };
  }, [orderId, order?.status]);

  // Auto-fit Map to display both markers and calculate distance
  useEffect(() => {
    if (order?.deliveryAddress && partnerLocation) {
      const { latitude: custLat, longitude: custLng } = order.deliveryAddress;
      
      if (custLat && custLng) {
        const d = getDistance(custLat, custLng, partnerLocation.latitude, partnerLocation.longitude);
        setDistance(d);

        if (mapViewRef.current) {
          mapViewRef.current.fitToCoordinates(
            [
              { latitude: custLat, longitude: custLng },
              partnerLocation,
            ],
            {
              edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
              animated: true,
            }
          );
        }
      }
    } else {
      setDistance(null);
    }
  }, [partnerLocation, order?.deliveryAddress]);

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getStatusColor = (status: OrderResponse['status']) => {
    switch (status) {
      case 'DELIVERED':
        return THEME.colors.success;
      case 'CANCELLED':
        return THEME.colors.error;
      case 'CONFIRMED':
      case 'PACKED':
      case 'OUT_FOR_DELIVERY':
        return THEME.colors.accent;
      case 'PLACED':
      default:
        return THEME.colors.primary;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const renderOrderItem = (item: OrderItemResponse) => {
    const price = item.priceAtPurchase ?? 0;
    const subtotal = price * item.quantity;
    return (
      <View key={item.productId} style={{ marginBottom: THEME.spacing.md }}>
        <View style={styles.itemRow}>
          <View style={styles.imagePlaceholder}>
            <Icon name="package-variant-closed" size={20} color={THEME.colors.textMuted} />
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName} numberOfLines={1}>
              {item.productName}
            </Text>
            <Text style={styles.itemPrice}>
              {item.quantity} × ₹{price.toFixed(0)}
            </Text>
          </View>
          <Text style={styles.itemSubtotal}>₹{subtotal.toFixed(0)}</Text>
        </View>

        {order?.status === 'DELIVERED' && (
          <Pressable
            onPress={() => navigation.navigate('ReviewForm', { productId: item.productId, productName: item.productName })}
            style={styles.rateProductBtn}
          >
            <Icon name="star-outline" size={14} color={THEME.colors.primary} style={{ marginRight: 4 }} />
            <Text style={styles.rateProductBtnText}>Rate Product</Text>
          </Pressable>
        )}
      </View>
    );
  };

  const getStepTimeText = (idx: number, isCompleted: boolean) => {
    if (!isCompleted) return 'PENDING';
    if (!order) return '--:--';
    try {
      const baseDate = new Date(order.createdAt);
      if (isNaN(baseDate.getTime())) return '--:--';
      
      const stepDate = new Date(baseDate.getTime() + idx * 3 * 60000);
      const hours = stepDate.getHours();
      const minutes = stepDate.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
      return `${displayHours}:${displayMinutes} ${ampm}`;
    } catch {
      return '--:--';
    }
  };

  const renderTimeline = () => {
    if (!order || order.status === 'CANCELLED') return null;
    const currentIndex = STEPS.indexOf(order.status);

    return (
      <Card style={styles.timelineCard} elevation="none">
        <Text style={styles.sectionTitleHeader}>DELIVERY TRACKING</Text>
        <View style={styles.verticalStepper}>
          {STEPS.map((step, idx) => {
            const isCompleted = idx <= currentIndex;
            const isActive = idx === currentIndex;
            const label = step.replace(/_/g, ' ');
            const timeText = getStepTimeText(idx, isCompleted);
            const isLast = idx === STEPS.length - 1;

            return (
              <View key={step} style={styles.verticalStepRow}>
                {/* Vertical Line and Indicator */}
                <View style={styles.indicatorCol}>
                  <View
                    style={[
                      styles.indicatorMarker,
                      isCompleted ? styles.markerCompleted : styles.markerPending,
                      isActive ? styles.markerActive : null,
                    ]}
                  />
                  {!isLast && (
                    <View
                      style={[
                        styles.verticalLine,
                        isCompleted ? styles.lineCompleted : styles.linePending,
                      ]}
                    />
                  )}
                </View>

                {/* Step Label */}
                <View style={styles.stepContentCol}>
                  <Text
                    style={[
                      styles.verticalStepLabel,
                      isCompleted ? styles.labelCompleted : styles.labelPending,
                      isActive ? styles.labelActive : null,
                    ]}
                  >
                    {label}
                  </Text>
                </View>

                {/* Monospace Timestamp */}
                <View style={styles.timeCol}>
                  <Text
                    style={[
                      styles.monospaceTime,
                      isCompleted ? styles.timeCompleted : styles.timePending,
                    ]}
                  >
                    {timeText}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </Card>
    );
  };

  const renderLiveTracking = () => {
    if (!order || order.status !== 'OUT_FOR_DELIVERY') return null;

    const { latitude, longitude } = order.deliveryAddress;
    const speed = distance !== null ? (distance > 0.5 ? 32 : 18) : 0;

    return (
      <View style={styles.trackingSection}>
        <Text style={styles.sectionTitle}>LIVE DELIVERY TRACKING</Text>
        <Card style={styles.trackingCard} elevation="none">
          {partnerLocation && latitude && longitude ? (
            <>
              <MapView
                ref={mapViewRef}
                style={styles.map}
                initialRegion={{
                  latitude: (latitude + partnerLocation.latitude) / 2,
                  longitude: (longitude + partnerLocation.longitude) / 2,
                  latitudeDelta: Math.abs(latitude - partnerLocation.latitude) * 1.5 || 0.05,
                  longitudeDelta: Math.abs(longitude - partnerLocation.longitude) * 1.5 || 0.05,
                }}
              >
                {/* Destination */}
                <Marker
                  coordinate={{ latitude, longitude }}
                  title="Deliver to"
                  description={order.deliveryAddress.addressLine}
                  pinColor={THEME.colors.brass}
                />
                
                {/* Driver */}
                <Marker
                  ref={markerRef}
                  coordinate={partnerLocation}
                  title="Delivery Partner"
                  description="Your order is out for delivery!"
                >
                  <View style={styles.partnerMarker}>
                    <Icon name="motorbike" size={18} color="#FFF" />
                  </View>
                </Marker>
              </MapView>

              {distance !== null && (
                <View style={styles.etaBar}>
                  <Text style={styles.etaText}>
                    RIDER POSITION: <Text style={styles.boldText}>{distance.toFixed(1)} KM</Text> TO SITE
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.waitingContainer}>
              <ActivityIndicator color={THEME.colors.brass} size="small" />
              <Text style={styles.waitingText}>Connecting to delivery partner live GPS...</Text>
            </View>
          )}
        </Card>

        {/* Live Telemetry Panel */}
        {partnerLocation && distance !== null && (
          <Card style={styles.telemetryCard} elevation="none">
            <View style={styles.telemetryHeaderRow}>
              <View style={styles.telemetryStatusLed} />
              <Text style={styles.telemetryHeaderTitle}>LIVE DELIVERY FEED ACTIVE</Text>
            </View>
            <View style={styles.telemetryGrid}>
              <View style={styles.telemetryCol}>
                <Text style={styles.telemetryLabel}>ESTIMATED TIME TO SITE</Text>
                <Text style={styles.telemetryValue}>
                  {remainingMinutes !== null ? `${remainingMinutes} MIN` : 'CALCULATING...'}
                </Text>
              </View>
              <View style={styles.telemetryDivider} />
              <View style={styles.telemetryCol}>
                <Text style={styles.telemetryLabel}>RIDER SPEED</Text>
                <Text style={styles.telemetryValue}>{speed} KM/H</Text>
              </View>
              <View style={styles.telemetryDivider} />
              <View style={styles.telemetryCol}>
                <Text style={styles.telemetryLabel}>RIDER CONTACT</Text>
                <Text style={[styles.telemetryValue, { fontSize: 10 }]}>ACTIVE GPS</Text>
              </View>
            </View>
          </Card>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={THEME.colors.background} barStyle="dark-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, justifyContent: 'space-between', flexDirection: 'row', alignItems: 'center' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
            <Icon name="arrow-left" size={24} color={THEME.colors.graphite} />
          </Pressable>
          <Text style={styles.headerTitle}>Order #FW-{orderId}</Text>
        </View>
        <Pressable onPress={handleSupportPress} style={{ padding: THEME.spacing.sm, flexDirection: 'row', alignItems: 'center' }} hitSlop={12}>
          <Icon name="help-circle-outline" size={20} color={THEME.colors.graphite} />
          <Text style={{ color: THEME.colors.graphite, fontSize: 13, fontWeight: '700', marginLeft: 4 }}>Support</Text>
        </Pressable>
      </View>

      {loading ? (
        <DetailSkeleton />
      ) : error || !order ? (
        <EmptyState
          icon="alert-circle-outline"
          message="Failed to load order details."
          actionTitle="Try Again"
          onAction={() => { setLoading(true); fetchOrder(); }}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Status Banner */}
          <View style={[styles.statusCard, { backgroundColor: getStatusColor(order.status) }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={styles.statusLabel}>ORDER STATUS</Text>
                <Text style={styles.statusValue}>{order.status.replace(/_/g, ' ')}</Text>
              </View>
              <Icon 
                name={order.status === 'DELIVERED' ? 'check-decagram' : order.status === 'CANCELLED' ? 'close-circle' : 'clock-outline'} 
                size={32} 
                color="#FFF" 
              />
            </View>
            <Text style={styles.dateText}>Placed on: {formatDate(order.createdAt)}</Text>
          </View>

          {remainingMinutes !== null && order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
            <View style={styles.deliveryEtaCard}>
              <View style={styles.iconCircleWrap}>
                <Icon name="lightning-bolt" size={20} color={THEME.colors.primary} />
              </View>
              <View style={{ marginLeft: THEME.spacing.md }}>
                <Text style={styles.deliveryEtaLabel}>ESTIMATED DELIVERY</Text>
                <Text style={styles.deliveryEtaValue}>
                  {remainingMinutes > 0 ? `Arriving in ~${remainingMinutes} mins` : 'Arriving shortly'}
                </Text>
              </View>
            </View>
          )}

          {/* Stepper Timeline */}
          {renderTimeline()}

          {/* Live Map Tracking */}
          {renderLiveTracking()}

          {/* Delivery Address */}
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <Card style={styles.card} elevation="none">
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Icon name="map-marker" size={18} color={THEME.colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.addressLineHeader}>{(order.deliveryAddress as any).name || 'Home'}</Text>
            </View>
            <Text style={styles.addressLine} numberOfLines={2}>
              {order.deliveryAddress.addressLine}
            </Text>
            <Text style={styles.cityText}>
              {order.deliveryAddress.city} — {order.deliveryAddress.pincode}
            </Text>
          </Card>

          {/* Payment Info */}
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <Card style={styles.card} elevation="none">
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Payment Mode</Text>
              <Text style={styles.paymentVal}>{order.paymentMode}</Text>
            </View>
            <View style={[styles.paymentRow, { marginTop: 8 }]}>
              <Text style={styles.paymentLabel}>Status</Text>
              <Text style={[styles.paymentVal, { fontWeight: '800', color: order.paymentStatus === 'PAID' ? THEME.colors.success : THEME.colors.warning }]}>
                {order.paymentStatus}
              </Text>
            </View>
          </Card>

          {/* Items List */}
          <Text style={styles.sectionTitle}>Order Items</Text>
          <Card style={styles.card} elevation="none">
            {order.items.map(renderOrderItem)}
          </Card>

          {/* Totals Summary */}
          <Text style={styles.sectionTitle}>Bill Details</Text>
          <Card style={styles.card} elevation="none">
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>₹{(order.totalAmount - order.deliveryCharge + order.discount).toFixed(0)}</Text>
            </View>
            {order.discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discounts</Text>
                <Text style={[styles.summaryValue, { color: THEME.colors.success }]}>
                  -₹{order.discount.toFixed(0)}
                </Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Charges</Text>
              <Text style={styles.summaryValue}>
                {order.deliveryCharge === 0 ? (
                  <Text style={styles.freeText}>FREE</Text>
                ) : (
                  `₹${order.deliveryCharge.toFixed(0)}`
                )}
              </Text>
            </View>
            <View style={styles.dividerLine} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Grand Total</Text>
              <Text style={styles.totalValue}>₹{order.totalAmount.toFixed(0)}</Text>
            </View>
          </Card>

          {/* Cancel Order Button (Only visible if status is PLACED or CONFIRMED) */}
          {(order.status === 'PLACED' || order.status === 'CONFIRMED') && (
            <Pressable
              style={styles.cancelBtn}
              onPress={handleCancelPress}
              disabled={cancelling}
            >
              {cancelling ? (
                <ActivityIndicator size="small" color={THEME.colors.error} />
              ) : (
                <Text style={styles.cancelBtnText}>Cancel Order</Text>
              )}
            </Pressable>
          )}

          {/* Return Unused Spares Button (Only visible if status is DELIVERED) */}
          {order.status === 'DELIVERED' && (
            <Pressable
              style={styles.returnSparesBtn}
              onPress={() => setShowReturnModal(true)}
            >
              <Icon name="swap-horizontal" size={18} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.returnSparesBtnText}>Return Unused Spares</Text>
            </Pressable>
          )}

          {/* Return Unused Spares Selection Drawer Modal */}
          <Modal
            visible={showReturnModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowReturnModal(false)}
          >
            <View style={styles.returnModalBackdrop}>
              <Card style={styles.returnModalCard} elevation="none">
                <View style={styles.returnModalHeader}>
                  <Text style={styles.returnModalTitle}>RETURN UNUSED SPARES</Text>
                  <Pressable onPress={() => setShowReturnModal(false)} hitSlop={8}>
                    <Icon name="close" size={20} color={THEME.colors.graphite} />
                  </Pressable>
                </View>
                
                <Text style={styles.returnModalSubtitle}>
                  Select the quantity of left-over/unused spare parts you wish to return. Only sealed items are eligible.
                </Text>

                <ScrollView style={styles.returnItemsList}>
                  {order.items.map((item) => {
                    const currentQty = returnQuantities[item.productId] ?? 0;
                    return (
                      <View key={item.productId} style={styles.returnItemRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.returnItemName} numberOfLines={1}>{item.productName}</Text>
                          <Text style={styles.returnItemSub}>Delivered Qty: {item.quantity}</Text>
                        </View>
                        
                        {/* Stepper for return quantity */}
                        <View style={styles.returnStepper}>
                          <Pressable
                            onPress={() => handleReturnQtyChange(item.productId, currentQty, -1)}
                            style={styles.returnStepBtn}
                            hitSlop={6}
                          >
                            <Icon name="minus" size={14} color={THEME.colors.graphite} />
                          </Pressable>
                          <Text style={styles.returnQtyText}>{currentQty}</Text>
                          <Pressable
                            onPress={() => handleReturnQtyChange(item.productId, currentQty, 1, item.quantity)}
                            style={styles.returnStepBtn}
                            hitSlop={6}
                          >
                            <Icon name="plus" size={14} color={THEME.colors.graphite} />
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>

                <Pressable
                  onPress={handleConfirmReturn}
                  style={styles.returnConfirmBtn}
                >
                  <Text style={styles.returnConfirmBtnText}>CONFIRM RETURN REQUEST</Text>
                </Pressable>
              </Card>
            </View>
          </Modal>
          
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
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
  scrollContent: { 
    padding: THEME.spacing.md 
  },
  statusCard: {
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    ...THEME.shadows.light,
  },
  deliveryEtaCard: { 
    backgroundColor: THEME.colors.surface, 
    borderRadius: THEME.borderRadius.md, 
    padding: THEME.spacing.md, 
    marginBottom: THEME.spacing.md, 
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.primary,
    ...THEME.shadows.light 
  },
  iconCircleWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deliveryEtaLabel: { 
    color: THEME.colors.textSecondary, 
    fontSize: 9, 
    fontWeight: '800', 
    letterSpacing: 0.8 
  },
  deliveryEtaValue: { 
    color: THEME.colors.primary, 
    fontSize: 16, 
    fontWeight: '800', 
    marginTop: 2 
  },
  statusLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.8,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.surface,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  dateText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 6,
    fontWeight: '500',
  },
  timelineCard: {
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
  },
  sectionTitleHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },
  verticalStepper: {
    paddingVertical: THEME.spacing.sm,
  },
  verticalStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    marginVertical: 4,
  },
  indicatorCol: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    position: 'relative',
  },
  indicatorMarker: {
    width: 8,
    height: 8,
    borderWidth: 1,
    zIndex: 2,
  },
  markerPending: {
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.surface,
  },
  markerCompleted: {
    borderColor: THEME.colors.brass,
    backgroundColor: THEME.colors.brass,
  },
  markerActive: {
    width: 8,
    height: 8,
    transform: [{ rotate: '45deg' }],
    borderColor: THEME.colors.amber,
    backgroundColor: THEME.colors.amber,
  },
  verticalLine: {
    position: 'absolute',
    top: 24,
    bottom: -18,
    width: 1,
    zIndex: 1,
  },
  lineCompleted: {
    backgroundColor: THEME.colors.brass,
  },
  linePending: {
    backgroundColor: THEME.colors.border,
  },
  stepContentCol: {
    flex: 1,
    marginLeft: 12,
  },
  verticalStepLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  labelCompleted: {
    color: THEME.colors.graphite,
  },
  labelPending: {
    color: THEME.colors.graphiteMuted,
  },
  labelActive: {
    color: THEME.colors.amber,
  },
  timeCol: {
    alignItems: 'flex-end',
    minWidth: 70,
  },
  monospaceTime: {
    fontFamily: THEME.typography.price.fontFamily,
    fontSize: 10,
    fontWeight: '700',
  },
  timeCompleted: {
    color: THEME.colors.graphite,
  },
  timePending: {
    color: THEME.colors.graphiteMuted,
  },
  trackingSection: {
    marginBottom: THEME.spacing.md,
  },
  trackingCard: {
    padding: 0,
    overflow: 'hidden',
    height: 200,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.md,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  partnerMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    ...THEME.shadows.medium,
  },
  etaBar: {
    position: 'absolute',
    bottom: THEME.spacing.sm,
    left: THEME.spacing.sm,
    right: THEME.spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: THEME.borderRadius.sm,
    paddingVertical: 8,
    paddingHorizontal: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.light,
  },
  etaText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.text,
    textAlign: 'center',
  },
  boldText: {
    fontWeight: '800',
    color: THEME.colors.brass,
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.lg,
  },
  waitingText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.sm,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
  },
  card: { 
    padding: THEME.spacing.md, 
    marginBottom: THEME.spacing.sm,
    borderWidth: 1,
  },
  addressLineHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  addressLine: { 
    fontSize: 12,
    color: THEME.colors.text, 
    marginBottom: 2,
    marginLeft: 24,
  },
  cityText: { 
    fontSize: 11, 
    color: THEME.colors.textSecondary,
    marginLeft: 24,
  },
  paymentRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  paymentLabel: { 
    fontSize: 12, 
    color: THEME.colors.textSecondary, 
    fontWeight: '600' 
  },
  paymentVal: { 
    fontSize: 12, 
    color: THEME.colors.text, 
    fontWeight: '700' 
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.sm,
  },
  imagePlaceholder: {
    width: 36,
    height: 36,
    borderRadius: THEME.borderRadius.xs,
    backgroundColor: THEME.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  itemInfo: { 
    flex: 1, 
    marginLeft: THEME.spacing.sm, 
    marginRight: THEME.spacing.xs 
  },
  itemName: { 
    fontSize: 12, 
    color: THEME.colors.text, 
    fontWeight: '600' 
  },
  itemPrice: { 
    fontSize: 11, 
    color: THEME.colors.textSecondary, 
    marginTop: 1 
  },
  itemSubtotal: { 
    fontFamily: THEME.typography.price.fontFamily,
    fontSize: 12, 
    color: THEME.colors.graphite, 
    fontWeight: '700',
  },
  dividerLine: { 
    height: 1, 
    backgroundColor: THEME.colors.border, 
    marginVertical: THEME.spacing.sm 
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryLabel: { 
    fontSize: 12, 
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  summaryValue: { 
    fontFamily: THEME.typography.price.fontFamily,
    fontSize: 12, 
    fontWeight: '700', 
    color: THEME.colors.graphite,
  },
  freeText: { 
    color: THEME.colors.brass, 
    fontWeight: '800',
  },
  totalLabel: { 
    fontSize: 14, 
    fontWeight: '800', 
    color: THEME.colors.graphite,
  },
  totalValue: { 
    fontFamily: THEME.typography.price.fontFamily,
    fontSize: 16, 
    fontWeight: '700', 
    color: THEME.colors.graphite,
  },
  cancelBtn: {
    backgroundColor: '#FFF',
    borderColor: THEME.colors.error,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.md,
    paddingVertical: THEME.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: THEME.spacing.lg,
    marginBottom: THEME.spacing.sm,
  },
  cancelBtnText: {
    color: THEME.colors.error,
    fontSize: 14,
    fontWeight: '700',
  },
  rateProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginLeft: 46,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: THEME.colors.brass,
    borderRadius: THEME.borderRadius.xs,
    backgroundColor: '#FFF',
    marginTop: -4,
  },
  rateProductBtnText: {
    fontSize: 11,
    color: THEME.colors.brass,
    fontWeight: '700',
  },
  telemetryCard: {
    padding: THEME.spacing.md,
    marginTop: THEME.spacing.md,
    backgroundColor: '#1E1E1E',
    borderColor: '#333333',
    borderWidth: 1,
    borderRadius: THEME.borderRadius.sm,
  },
  telemetryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  telemetryStatusLed: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  telemetryHeaderTitle: {
    fontFamily: THEME.typography.price.fontFamily,
    fontSize: 8,
    color: '#888888',
    fontWeight: '700',
  },
  telemetryGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  telemetryCol: {
    flex: 1,
    alignItems: 'center',
  },
  telemetryLabel: {
    fontSize: 7,
    fontWeight: '700',
    color: '#888888',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  telemetryValue: {
    fontFamily: THEME.typography.price.fontFamily,
    fontSize: 12,
    fontWeight: '700',
    color: '#4CAF50',
  },
  telemetryDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#333333',
  },
  returnSparesBtn: {
    backgroundColor: THEME.colors.brass,
    borderRadius: THEME.borderRadius.md,
    paddingVertical: THEME.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: THEME.spacing.lg,
    marginBottom: THEME.spacing.sm,
  },
  returnSparesBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  returnModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  returnModalCard: {
    padding: THEME.spacing.lg,
    backgroundColor: '#FFF',
    borderTopLeftRadius: THEME.borderRadius.md,
    borderTopRightRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  returnModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.xs,
  },
  returnModalTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.graphite,
    letterSpacing: 0.5,
  },
  returnModalSubtitle: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.md,
    lineHeight: 14,
  },
  returnItemsList: {
    maxHeight: 250,
    marginBottom: THEME.spacing.md,
  },
  returnItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: THEME.spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: THEME.colors.border,
  },
  returnItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.graphite,
  },
  returnItemSub: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  returnStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.sm,
    height: 28,
    paddingHorizontal: 4,
  },
  returnStepBtn: {
    padding: 4,
  },
  returnQtyText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.graphite,
    minWidth: 18,
    textAlign: 'center',
  },
  returnConfirmBtn: {
    backgroundColor: THEME.colors.graphite,
    height: 48,
    borderRadius: THEME.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: THEME.spacing.sm,
  },
  returnConfirmBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default OrderDetailScreen;
