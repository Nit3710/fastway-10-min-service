import React, { useCallback, useEffect, useState } from 'react';
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
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { getAssignments } from '../api/deliveryApi';
import { apiLogout } from '../api/authApi';
import { DeliveryAssignment, RootStackParamList } from '../types';
import useLocationTracking from '../hooks/useLocationTracking';
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

  // Hook into location tracking using status calculated from backend responses
  const { isTracking, errorMsg: locationError } = useLocationTracking(hasActiveAssignment);

  const fetchAssignments = async (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);
    try {
      // Fetch active or completed delivery tasks
      const statusFilter = undefined; // Fetch all and filter client side, or query from API
      // Since API filters by status, we can query both tabs or fetch active vs completed.
      // Let's query based on active tab status or download page content.
      // The API supports passing a specific status. If we pass statusFilter:
      // Active tab: ASSIGNED, PICKED_UP, OUT_FOR_DELIVERY
      // Completed tab: DELIVERED
      // Let's query all assignments and separate them, or fetch page by page.
      // Fetching all (unpaged/large size) is easiest to calculate if there's any active task!
      const result = await getAssignments(undefined, 0, 50);
      
      const list = result.content;
      setAssignments(list);

      // Check if there's at least one active assignment in the fetched dataset
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

  const filteredList = assignments.filter((a) => {
    if (activeTab === 'ACTIVE') {
      return a.status === 'ASSIGNED' || a.status === 'PICKED_UP' || a.status === 'OUT_FOR_DELIVERY';
    } else {
      return a.status === 'DELIVERED' || a.status === 'CANCELLED';
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ASSIGNED':
        return THEME.colors.warning;
      case 'PICKED_UP':
        return '#0288D1';
      case 'OUT_FOR_DELIVERY':
        return '#7B1FA2';
      case 'DELIVERED':
        return THEME.colors.success;
      default:
        return THEME.colors.textMuted;
    }
  };

  const renderCard = ({ item }: { item: DeliveryAssignment }) => {
    const itemCount = item.orderItems.reduce((acc, current) => acc + current.quantity, 0);
    
    return (
      <Pressable onPress={() => navigation.navigate('AssignmentDetail', { assignmentId: item.id })}>
        <Card style={styles.assignmentCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.orderId}>Order #{item.orderId}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {item.status.replace('_', ' ')}
              </Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            <Text style={styles.infoLabel}>DELIVER TO:</Text>
            <Text style={styles.addressLine}>{item.deliveryAddress.addressLine}</Text>
            <Text style={styles.cityLine}>{item.deliveryAddress.city} — {item.deliveryAddress.pincode}</Text>
            
            <View style={styles.itemCountRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="package-variant-closed" size={16} color={THEME.colors.textSecondary} style={{ marginRight: 4 }} />
                <Text style={styles.itemsLabel}>{itemCount} {itemCount === 1 ? 'item' : 'items'}</Text>
              </View>
              <Text style={styles.customerName}>Client: {item.customerName}</Text>
            </View>
          </View>
        </Card>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={THEME.colors.primary} barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Fastway Delivery</Text>
          <Text style={styles.headerSubtitle}>Welcome, {user?.name || 'Partner'}</Text>
        </View>
        <Pressable onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      {/* Tracker Status Indicator */}
      {hasActiveAssignment && (
        <View style={[styles.trackerBar, isTracking ? styles.trackerActive : styles.trackerInactive]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Icon
              name={isTracking ? 'transit-connection-variant' : 'alert-circle-outline'}
              size={16}
              color="#FFF"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.trackerText}>
              {isTracking ? 'Live Location Sync Active' : 'Location tracking disabled or offline'}
            </Text>
          </View>
          {locationError && (
            <Text style={styles.trackerError} numberOfLines={1}>{locationError}</Text>
          )}
        </View>
      )}

      {/* Navigation tabs */}
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => setActiveTab('ACTIVE')}
          style={[styles.tab, activeTab === 'ACTIVE' && styles.activeTab]}
        >
          <Text style={[styles.tabLabel, activeTab === 'ACTIVE' && styles.activeTabLabel]}>
            Active Deliveries
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('COMPLETED')}
          style={[styles.tab, activeTab === 'COMPLETED' && styles.activeTab]}
        >
          <Text style={[styles.tabLabel, activeTab === 'COMPLETED' && styles.activeTabLabel]}>
            History
          </Text>
        </Pressable>
      </View>

      {/* List content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Fetching assignments...</Text>
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
              <Icon name="package-variant" size={64} color={THEME.colors.textMuted} style={{ marginBottom: THEME.spacing.md }} />
              <Text style={styles.emptyTitle}>No assignments found</Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'ACTIVE'
                  ? 'All clear! There are no pending delivery tasks assigned to you right now.'
                  : 'Your completed deliveries history will appear here.'}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.primary,
    padding: THEME.spacing.lg,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    ...THEME.typography.h2,
    color: THEME.colors.surface,
    fontWeight: '800',
  },
  headerSubtitle: {
    ...THEME.typography.caption,
    color: THEME.colors.primaryLight,
    marginTop: 2,
    fontWeight: '600',
  },
  logoutBtn: {
    paddingVertical: THEME.spacing.xs,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  logoutText: {
    ...THEME.typography.caption,
    color: THEME.colors.surface,
    fontWeight: '700',
  },
  trackerBar: {
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackerActive: {
    backgroundColor: '#E8F5E9',
  },
  trackerInactive: {
    backgroundColor: '#FFEBEE',
  },
  trackerText: {
    ...THEME.typography.caption,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  trackerError: {
    fontSize: 10,
    color: THEME.colors.error,
    marginTop: 2,
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: THEME.spacing.md,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: THEME.colors.primary,
  },
  tabLabel: {
    ...THEME.typography.bodyBold,
    color: THEME.colors.textSecondary,
  },
  activeTabLabel: {
    color: THEME.colors.primary,
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
    paddingBottom: 80,
  },
  assignmentCard: {
    marginBottom: THEME.spacing.md,
    padding: THEME.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    paddingBottom: THEME.spacing.sm,
    marginBottom: THEME.spacing.sm,
  },
  orderId: {
    ...THEME.typography.subtitle,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  statusBadge: {
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardBody: {
    flexDirection: 'column',
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  addressLine: {
    ...THEME.typography.bodyBold,
    color: THEME.colors.text,
  },
  cityLine: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  itemCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: THEME.spacing.md,
    paddingTop: THEME.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  itemsLabel: {
    ...THEME.typography.caption,
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  customerName: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: THEME.spacing.xxl,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: THEME.spacing.md,
  },
  emptyTitle: {
    ...THEME.typography.h2,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  emptySubtitle: {
    ...THEME.typography.body,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.lg,
  },
});

export default AssignmentListScreen;
