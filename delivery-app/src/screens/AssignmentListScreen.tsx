import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  RefreshControl,
  Linking,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { getAssignments, getDutyStatus, updateDutyStatus } from '../api/deliveryApi';
import { apiLogout } from '../api/authApi';
import { DeliveryAssignment, RootStackParamList } from '../types';
import { useLocationTracking } from '../hooks/useLocationTracking';
import Card from '../components/Card';
import THEME from '../theme/theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AssignmentList'>;

export const AssignmentListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { user, clearAuth, refreshToken } = useAuthStore();
  const insets = useSafeAreaInsets();
  const { showToast } = useToastStore();

  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'COMPLETED'>('ACTIVE');
  const [assignments, setAssignments] = useState<DeliveryAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasActiveAssignment, setHasActiveAssignment] = useState(false);
  const [isOnDuty, setIsOnDuty] = useState(true);
  const [dutyLoading, setDutyLoading] = useState(false);

  const { isTracking, errorMsg: locationError } = useLocationTracking(hasActiveAssignment);

  const fetchDuty = async () => {
    try {
      const status = await getDutyStatus();
      setIsOnDuty(status);
    } catch (e) {}
  };

  const handleToggleDuty = async () => {
    setDutyLoading(true);
    try {
      const nextStatus = !isOnDuty;
      await updateDutyStatus(nextStatus);
      setIsOnDuty(nextStatus);
      showToast(nextStatus ? 'You are now On Duty 🟢' : 'You are now Off Duty 🔴', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update duty status', 'error');
    } finally {
      setDutyLoading(false);
    }
  };

  const fetchAssignments = async (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);
    try {
      const result = await getAssignments(undefined, 0, 50);
      const list = result.content;
      setAssignments(list);

      const activeExists = list.some(
        (a) =>
          a.status === 'ASSIGNED' ||
          a.status === 'PICKED_UP' ||
          a.status === 'OUT_FOR_DELIVERY'
      );
      setHasActiveAssignment(activeExists);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch assignments', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDuty();
      fetchAssignments();
    }, [activeTab])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAssignments(true);
  };

  const handleLogout = async () => {
    try {
      await apiLogout(refreshToken);
    } catch (e) {}
    await clearAuth();
    showToast('Logged out successfully', 'success');
  };

  const handleQuickCall = (phone: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => {
      showToast('Unable to open phone dialer', 'error');
    });
  };

  const activeDeliveries = assignments.filter(
    (a) => a.status === 'ASSIGNED' || a.status === 'PICKED_UP' || a.status === 'OUT_FOR_DELIVERY'
  );
  const completedDeliveries = assignments.filter(
    (a) => a.status === 'DELIVERED' || a.status === 'CANCELLED'
  );

  const filteredList = activeTab === 'ACTIVE' ? activeDeliveries : completedDeliveries;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ASSIGNED':
        return { color: THEME.colors.warning, bg: '#FFFBEB', icon: 'package-variant', label: 'ASSIGNED' };
      case 'PICKED_UP':
        return { color: THEME.colors.info, bg: '#EFF6FF', icon: 'storefront-outline', label: 'PICKED UP' };
      case 'OUT_FOR_DELIVERY':
        return { color: '#8B5CF6', bg: '#F5F3FF', icon: 'motorbike', label: 'ON THE WAY' };
      case 'DELIVERED':
        return { color: THEME.colors.success, bg: '#ECFDF5', icon: 'check-circle-outline', label: 'DELIVERED' };
      default:
        return { color: THEME.colors.textMuted, bg: '#F1F5F9', icon: 'clock-outline', label: status };
    }
  };

  const renderCard = ({ item }: { item: DeliveryAssignment }) => {
    const statusCfg = getStatusConfig(item.status);
    const itemCount = item.orderItems.reduce((acc, current) => acc + current.quantity, 0);

    return (
      <Pressable onPress={() => navigation.navigate('AssignmentDetail', { assignmentId: item.id })}>
        <Card style={styles.assignmentCard}>
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <View style={styles.orderBadgeGroup}>
              <View style={styles.orderIconBg}>
                <Icon name="receipt" size={18} color={THEME.colors.primary} />
              </View>
              <View>
                <Text style={styles.orderIdText}>Order #{item.orderId}</Text>
                <Text style={styles.assignedTime}>
                  {new Date(item.assignedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
              <Icon name={statusCfg.icon} size={14} color={statusCfg.color} style={{ marginRight: 4 }} />
              <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
            </View>
          </View>

          {/* Delivery Address Box */}
          <View style={styles.addressBox}>
            <Icon name="map-marker-radius-outline" size={20} color={THEME.colors.primary} style={styles.locationIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.addressLabel}>DELIVERY LOCATION</Text>
              <Text style={styles.addressLine} numberOfLines={2}>{item.deliveryAddress.addressLine}</Text>
              <Text style={styles.cityLine}>{item.deliveryAddress.city} • {item.deliveryAddress.pincode}</Text>
            </View>
          </View>

          {/* Customer & Quick Action Footer */}
          <View style={styles.cardFooter}>
            <View style={styles.customerMeta}>
              <Icon name="account-circle-outline" size={18} color={THEME.colors.textSecondary} style={{ marginRight: 6 }} />
              <View>
                <Text style={styles.customerName}>{item.customerName}</Text>
                <Text style={styles.itemsLabel}>{itemCount} {itemCount === 1 ? 'Item' : 'Items'}</Text>
              </View>
            </View>

            {item.customerPhone && (
              <Pressable
                onPress={() => handleQuickCall(item.customerPhone)}
                style={styles.quickCallBtn}
                hitSlop={8}
              >
                <Icon name="phone-outline" size={16} color={THEME.colors.primary} />
                <Text style={styles.quickCallText}>Call</Text>
              </Pressable>
            )}
          </View>

          {/* Customer OTP hint for active orders */}
          {activeTab === 'ACTIVE' && (
            <View style={styles.otpHintBanner}>
              <Icon name="shield-key-outline" size={14} color="#D97706" style={{ marginRight: 6 }} />
              <Text style={styles.otpHintText}>4-Digit Customer OTP Required for Delivery</Text>
            </View>
          )}
        </Card>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={THEME.colors.primaryDark} barStyle="light-content" />

      {/* Main Header */}
      <View style={[styles.header, { paddingTop: insets.top + THEME.spacing.sm }]}>
        <View style={styles.headerTop}>
          <View style={styles.userProfileGroup}>
            <View style={styles.avatarCircle}>
              <Icon name="motorbike" size={24} color="#FFF" />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.partnerTitle}>Fastway Partner</Text>
              <Text style={styles.userName}>{user?.name || 'Delivery Agent'}</Text>
            </View>
          </View>

          <View style={styles.headerRightActions}>
            <Pressable
              onPress={handleToggleDuty}
              disabled={dutyLoading}
              style={[styles.dutyTogglePill, isOnDuty ? styles.dutyPillOn : styles.dutyPillOff]}
            >
              <View style={[styles.dotIndicator, { backgroundColor: isOnDuty ? '#10B981' : '#EF4444' }]} />
              <Text style={styles.dutyPillText}>{isOnDuty ? 'ON DUTY' : 'OFF DUTY'}</Text>
            </Pressable>

            <Pressable onPress={handleLogout} style={styles.logoutIconButton}>
              <Icon name="logout" size={20} color="#FFF" />
            </Pressable>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{activeDeliveries.length}</Text>
            <Text style={styles.statLabel}>Active Tasks</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{completedDeliveries.length}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>
      </View>

      {/* Live Location Tracking Bar */}
      {hasActiveAssignment && (
        <View style={[styles.trackerBar, isTracking ? styles.trackerActive : styles.trackerInactive]}>
          <Icon
            name={isTracking ? 'crosshairs-gps' : 'map-marker-off-outline'}
            size={16}
            color={isTracking ? '#065F46' : '#991B1B'}
            style={{ marginRight: 8 }}
          />
          <Text style={[styles.trackerText, { color: isTracking ? '#065F46' : '#991B1B' }]}>
            {isTracking ? 'Live GPS Navigation & Location Sync Active' : 'GPS Tracking Offline'}
          </Text>
          {locationError && <Text style={styles.trackerError}>{locationError}</Text>}
        </View>
      )}

      {/* Tab Segment Selector */}
      <View style={styles.tabContainer}>
        <Pressable
          onPress={() => setActiveTab('ACTIVE')}
          style={[styles.tabButton, activeTab === 'ACTIVE' && styles.tabButtonActive]}
        >
          <Text style={[styles.tabText, activeTab === 'ACTIVE' && styles.tabTextActive]}>
            Active Deliveries ({activeDeliveries.length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('COMPLETED')}
          style={[styles.tabButton, activeTab === 'COMPLETED' && styles.tabButtonActive]}
        >
          <Text style={[styles.tabText, activeTab === 'COMPLETED' && styles.tabTextActive]}>
            History ({completedDeliveries.length})
          </Text>
        </Pressable>
      </View>

      {/* List content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Syncing deliveries...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={(item: DeliveryAssignment) => item.id.toString()}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Icon
                  name={activeTab === 'ACTIVE' ? 'moped-outline' : 'history'}
                  size={48}
                  color={THEME.colors.textMuted}
                />
              </View>
              <Text style={styles.emptyTitle}>
                {activeTab === 'ACTIVE' ? 'No Active Orders' : 'No Delivery History'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'ACTIVE'
                  ? 'Stay on duty! New delivery tasks assigned to you will appear here instantly.'
                  : 'Delivered orders will be recorded here.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: THEME.spacing.lg,
    borderBottomLeftRadius: THEME.borderRadius.xl,
    borderBottomRightRadius: THEME.borderRadius.xl,
    ...THEME.shadows.medium,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.md,
  },
  userProfileGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: THEME.spacing.md,
  },
  userInfo: {
    justifyContent: 'center',
  },
  partnerTitle: {
    fontSize: 11,
    color: '#FFE0B2',
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dutyTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: THEME.borderRadius.round,
    marginRight: THEME.spacing.xs,
  },
  dutyPillOn: {
    backgroundColor: '#FFFFFF',
  },
  dutyPillOff: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dotIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dutyPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  logoutIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: THEME.borderRadius.lg,
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.lg,
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 11,
    color: '#FFE0B2',
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  trackerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: THEME.spacing.lg,
  },
  trackerActive: {
    backgroundColor: '#D1FAE5',
  },
  trackerInactive: {
    backgroundColor: '#FEE2E2',
  },
  trackerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  trackerError: {
    fontSize: 11,
    color: '#991B1B',
    marginLeft: 6,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.md,
    borderRadius: THEME.borderRadius.lg,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: THEME.borderRadius.md,
  },
  tabButtonActive: {
    backgroundColor: THEME.colors.surface,
    ...THEME.shadows.light,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  tabTextActive: {
    color: THEME.colors.primary,
    fontWeight: '800',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.xl,
  },
  loadingText: {
    ...THEME.typography.body,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.md,
  },
  listContent: {
    padding: THEME.spacing.lg,
    paddingBottom: 40,
  },
  assignmentCard: {
    marginBottom: THEME.spacing.md,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  orderBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderIconBg: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: THEME.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: THEME.spacing.sm,
  },
  orderIdText: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  assignedTime: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.borderRadius.round,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  addressBox: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: THEME.spacing.md,
  },
  locationIcon: {
    marginRight: THEME.spacing.sm,
    marginTop: 2,
  },
  addressLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  addressLine: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.text,
    lineHeight: 18,
  },
  cityLine: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  itemsLabel: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  quickCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.round,
  },
  quickCallText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.primary,
    marginLeft: 4,
  },
  otpHintBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: THEME.borderRadius.sm,
    marginTop: THEME.spacing.sm,
  },
  otpHintText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  emptySubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: THEME.spacing.xl,
    lineHeight: 18,
  },
});

export default AssignmentListScreen;
