import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getAssignmentDetails, updateAssignmentStatus } from '../api/deliveryApi';
import { DeliveryAssignment, RootStackParamList } from '../types';
import { useToastStore } from '../store/toastStore';
import Button from '../components/Button';
import Card from '../components/Card';
import THEME from '../theme/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AssignmentDetail'>;
type Route = RouteProp<RootStackParamList, 'AssignmentDetail'>;

export const AssignmentDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { assignmentId } = route.params;
  const insets = useSafeAreaInsets();
  const { showToast } = useToastStore();

  const [assignment, setAssignment] = useState<DeliveryAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const data = await getAssignmentDetails(assignmentId);
      setAssignment(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load details', 'error');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [assignmentId]);

  const handleNavigate = () => {
    if (!assignment) return;
    const { latitude, longitude, addressLine, city } = assignment.deliveryAddress;
    
    // Choose between coordinate search and query text search
    let url = '';
    if (latitude && longitude && latitude !== 0 && longitude !== 0) {
      url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    } else {
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine + ', ' + city)}`;
    }
    
    Linking.canOpenURL(url)
      .then((supported: boolean) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          showToast('Google Maps app is not installed', 'error');
        }
      })
      .catch((err: any) => console.error('An error occurred opening maps', err));
  };

  const handleCall = () => {
    if (!assignment || !assignment.customerPhone) return;
    const url = `tel:${assignment.customerPhone}`;
    Linking.canOpenURL(url)
      .then((supported: boolean) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          showToast('Phone dialer is not supported on this device', 'error');
        }
      })
      .catch((err: any) => console.error('An error occurred calling customer', err));
  };

  const handleStatusTransition = async () => {
    if (!assignment) return;
    const currentStatus = assignment.status;

    let nextStatus: typeof assignment.status | null = null;
    let confirmTitle = '';
    let confirmMsg = '';

    if (currentStatus === 'ASSIGNED') {
      nextStatus = 'PICKED_UP';
    } else if (currentStatus === 'PICKED_UP') {
      nextStatus = 'OUT_FOR_DELIVERY';
    } else if (currentStatus === 'OUT_FOR_DELIVERY') {
      nextStatus = 'DELIVERED';
      confirmTitle = 'Confirm Delivery';
      confirmMsg = 'Are you sure you want to mark this order as successfully delivered? This will complete the order and finalize payment.';
    }

    if (!nextStatus) return;

    const executeUpdate = async () => {
      setActionLoading(true);
      try {
        const updated = await updateAssignmentStatus(assignment.id, nextStatus!);
        setAssignment(updated);
        showToast(`Status updated to ${nextStatus!.replace('_', ' ')}`, 'success');
        if (nextStatus === 'DELIVERED') {
          navigation.goBack();
        }
      } catch (err: any) {
        showToast(err.message || 'Failed to update assignment status', 'error');
      } finally {
        setActionLoading(false);
      }
    };

    if (confirmTitle) {
      Alert.alert(
        confirmTitle,
        confirmMsg,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delivered', onPress: executeUpdate, style: 'default' },
        ],
        { cancelable: true }
      );
    } else {
      await executeUpdate();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
        <Text style={styles.loadingText}>Loading task details...</Text>
      </SafeAreaView>
    );
  }

  if (!assignment) return null;

  // Compute button label based on status
  let actionTitle = '';
  let isCompleted = false;

  switch (assignment.status) {
    case 'ASSIGNED':
      actionTitle = 'Mark as Picked Up';
      break;
    case 'PICKED_UP':
      actionTitle = 'Start Delivery (Out)';
      break;
    case 'OUT_FOR_DELIVERY':
      actionTitle = 'Mark as Delivered';
      break;
    default:
      isCompleted = true;
      break;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={THEME.colors.primary} barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Order #{assignment.orderId}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status Banner */}
        <Card style={styles.statusCard}>
          <Text style={styles.sectionLabel}>CURRENT STATUS</Text>
          <Text style={styles.statusVal}>{assignment.status.replace('_', ' ')}</Text>
          <Text style={styles.assignedAtText}>Assigned: {new Date(assignment.assignedAt).toLocaleString()}</Text>
        </Card>

        {/* Customer Info */}
        <Text style={styles.sectionTitle}>Client Details</Text>
        <Card style={styles.customerCard}>
          <View style={styles.customerHeader}>
            <View>
              <Text style={styles.clientName}>{assignment.customerName}</Text>
              <Text style={styles.clientPhone}>{assignment.customerPhone}</Text>
            </View>
            <Button
              title="📞 Call"
              onPress={handleCall}
              variant="outline"
              style={styles.callBtn}
              textStyle={styles.callBtnText}
            />
          </View>
        </Card>

        {/* Address Info */}
        <Text style={styles.sectionTitle}>Delivery Destination</Text>
        <Card style={styles.addressCard}>
          <View style={styles.addressContainer}>
            <Text style={styles.addressText}>{assignment.deliveryAddress.addressLine}</Text>
            <Text style={styles.cityText}>
              {assignment.deliveryAddress.city} — {assignment.deliveryAddress.pincode}
            </Text>
            <Button
              title="🗺️ Navigate (Google Maps)"
              onPress={handleNavigate}
              variant="solid"
              style={styles.navigateBtn}
            />
          </View>
        </Card>

        {/* Items Info */}
        <Text style={styles.sectionTitle}>Package Items</Text>
        <Card style={styles.itemsCard}>
          {assignment.orderItems.map((item, idx) => (
            <View key={idx} style={[styles.itemRow, idx > 0 && styles.itemBorder]}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.productName}</Text>
                <Text style={styles.itemQty}>Quantity: {item.quantity}</Text>
              </View>
            </View>
          ))}
        </Card>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Footer Action */}
      {!isCompleted && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, THEME.spacing.lg) }]}>
          <Button
            title={actionTitle}
            onPress={handleStatusTransition}
            isLoading={actionLoading}
            style={styles.actionBtn}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
  },
  loadingText: {
    ...THEME.typography.body,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primary,
    padding: THEME.spacing.lg,
  },
  backBtn: {
    marginRight: THEME.spacing.md,
  },
  backText: {
    fontSize: 24,
    color: THEME.colors.surface,
  },
  headerTitle: {
    ...THEME.typography.h2,
    color: THEME.colors.surface,
    fontWeight: '800',
  },
  content: {
    padding: THEME.spacing.lg,
  },
  statusCard: {
    alignItems: 'center',
    paddingVertical: THEME.spacing.lg,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
  },
  statusVal: {
    ...THEME.typography.h1,
    color: THEME.colors.primary,
    fontWeight: '800',
    marginVertical: THEME.spacing.xs,
  },
  assignedAtText: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
  },
  sectionTitle: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
    fontWeight: '800',
    marginTop: THEME.spacing.xl,
    marginBottom: THEME.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  customerCard: {
    padding: THEME.spacing.md,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientName: {
    ...THEME.typography.subtitle,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  clientPhone: {
    ...THEME.typography.body,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  callBtn: {
    width: 90,
    height: 40,
  },
  callBtnText: {
    fontSize: 13,
  },
  addressCard: {
    padding: THEME.spacing.md,
  },
  addressContainer: {
    flexDirection: 'column',
  },
  addressText: {
    ...THEME.typography.bodyBold,
    color: THEME.colors.text,
  },
  cityText: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  navigateBtn: {
    marginTop: THEME.spacing.md,
    height: 45,
    backgroundColor: '#0288D1',
  },
  itemsCard: {
    padding: THEME.spacing.md,
  },
  itemRow: {
    paddingVertical: THEME.spacing.sm,
  },
  itemBorder: {
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  itemInfo: {
    flexDirection: 'column',
  },
  itemName: {
    ...THEME.typography.bodyBold,
    color: THEME.colors.text,
  },
  itemQty: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  actionBtn: {
    height: 52,
  },
});

export default AssignmentDetailScreen;
