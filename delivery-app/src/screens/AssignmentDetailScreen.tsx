import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
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
import { DeliveryAssignment, DeliveryAssignmentStatus, RootStackParamList } from '../types';
import { useToastStore } from '../store/toastStore';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
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
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState<string | undefined>(undefined);

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

  const executeStatusUpdate = async (nextStatus: DeliveryAssignmentStatus, otp?: string) => {
    if (!assignment) return;
    setActionLoading(true);
    try {
      const updated = await updateAssignmentStatus(assignment.id, nextStatus, otp);
      setAssignment(updated);
      showToast(`Order updated to ${nextStatus.replace(/_/g, ' ')}`, 'success');
      setOtpModalVisible(false);
      if (nextStatus === 'DELIVERED') {
        navigation.goBack();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to update status';
      if (nextStatus === 'DELIVERED') {
        setOtpError(msg);
      }
      showToast(msg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusTransition = async () => {
    if (!assignment) return;
    const currentStatus = assignment.status;

    if (currentStatus === 'ASSIGNED') {
      await executeStatusUpdate('PICKED_UP');
    } else if (currentStatus === 'PICKED_UP') {
      await executeStatusUpdate('OUT_FOR_DELIVERY');
    } else if (currentStatus === 'OUT_FOR_DELIVERY') {
      setOtpInput('');
      setOtpError(undefined);
      setOtpModalVisible(true);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
        <Text style={styles.loadingText}>Fetching order details...</Text>
      </SafeAreaView>
    );
  }

  if (!assignment) return null;

  let actionTitle = '';
  let actionIcon = 'arrow-right';
  let isCompleted = false;

  switch (assignment.status) {
    case 'ASSIGNED':
      actionTitle = 'Mark as Picked Up';
      actionIcon = 'storefront-outline';
      break;
    case 'PICKED_UP':
      actionTitle = 'Start Delivery (Out For Delivery)';
      actionIcon = 'motorbike';
      break;
    case 'OUT_FOR_DELIVERY':
      actionTitle = 'Complete Delivery (Enter OTP)';
      actionIcon = 'shield-check';
      break;
    default:
      isCompleted = true;
      break;
  }

  const steps = [
    { key: 'ASSIGNED', title: 'Assigned', icon: 'package-variant' },
    { key: 'PICKED_UP', title: 'Picked Up', icon: 'storefront-outline' },
    { key: 'OUT_FOR_DELIVERY', title: 'On The Way', icon: 'motorbike' },
    { key: 'DELIVERED', title: 'Delivered', icon: 'check-circle' },
  ];

  const getStepStatus = (stepKey: string) => {
    const order = ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    const currentIndex = order.indexOf(assignment.status);
    const stepIndex = order.indexOf(stepKey);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  const totalItemsCount = assignment.orderItems.reduce((acc, curr) => acc + curr.quantity, 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={THEME.colors.primaryDark} barStyle="light-content" />

      {/* Modern Header */}
      <View style={[styles.header, { paddingTop: insets.top + THEME.spacing.xs }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerSub}>DELIVERY TASK</Text>
          <Text style={styles.headerTitle}>Order #{assignment.orderId}</Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{assignment.status.replace(/_/g, ' ')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Progress Tracker Stepper */}
        <Card style={styles.stepperCard}>
          <Text style={styles.sectionHeaderTitle}>DELIVERY PROGRESS</Text>
          <View style={styles.stepperRow}>
            {steps.map((step, idx) => {
              const status = getStepStatus(step.key);
              const isLast = idx === steps.length - 1;

              return (
                <React.Fragment key={step.key}>
                  <View style={styles.stepItem}>
                    <View
                      style={[
                        styles.stepIconCircle,
                        status === 'completed' && styles.stepCompleted,
                        status === 'current' && styles.stepCurrent,
                        status === 'upcoming' && styles.stepUpcoming,
                      ]}
                    >
                      <Icon
                        name={step.icon}
                        size={16}
                        color={
                          status === 'completed' || status === 'current'
                            ? '#FFFFFF'
                            : THEME.colors.textMuted
                        }
                      />
                    </View>
                    <Text
                      style={[
                        styles.stepLabel,
                        status === 'current' && styles.stepLabelCurrent,
                      ]}
                      numberOfLines={1}
                    >
                      {step.title}
                    </Text>
                  </View>
                  {!isLast && (
                    <View
                      style={[
                        styles.stepLine,
                        status === 'completed' && styles.stepLineCompleted,
                      ]}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </Card>

        {/* Customer Info Card */}
        <Text style={styles.sectionHeading}>CUSTOMER CONTACT</Text>
        <Card style={styles.customerCard}>
          <View style={styles.customerRow}>
            <View style={styles.customerAvatar}>
              <Icon name="account" size={24} color={THEME.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.clientName}>{assignment.customerName}</Text>
              <Text style={styles.clientPhone}>{assignment.customerPhone || 'No phone available'}</Text>
            </View>
            {assignment.customerPhone && (
              <Pressable onPress={handleCall} style={styles.callActionButton}>
                <Icon name="phone" size={18} color="#FFF" style={{ marginRight: 4 }} />
                <Text style={styles.callActionText}>Call</Text>
              </Pressable>
            )}
          </View>
        </Card>

        {/* Delivery Address & Maps Navigation */}
        <Text style={styles.sectionHeading}>DROP LOCATION</Text>
        <Card style={styles.addressCard}>
          <View style={styles.addressRow}>
            <View style={styles.addressIconBg}>
              <Icon name="map-marker" size={24} color="#0288D1" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.addressText}>{assignment.deliveryAddress.addressLine}</Text>
              <Text style={styles.cityText}>
                {assignment.deliveryAddress.city} — {assignment.deliveryAddress.pincode}
              </Text>
            </View>
          </View>

          <Button
            title="🗺️ Navigate via Google Maps"
            onPress={handleNavigate}
            variant="solid"
            style={styles.navigateBtn}
          />
        </Card>

        {/* Order Items List */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>ORDER ITEMS ({totalItemsCount})</Text>
        </View>
        <Card style={styles.itemsCard}>
          {assignment.orderItems.map((item, idx) => (
            <View key={idx} style={[styles.itemRow, idx > 0 && styles.itemBorder]}>
              <View style={styles.itemQtyBadge}>
                <Text style={styles.itemQtyText}>{item.quantity}x</Text>
              </View>
              <View style={{ flex: 1, marginLeft: THEME.spacing.md }}>
                <Text style={styles.itemName}>{item.productName}</Text>
              </View>
            </View>
          ))}
        </Card>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Floating Bottom Footer Action Bar */}
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

      {/* OTP Delivery Verification Modal */}
      <Modal
        visible={otpModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOtpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.shieldIconCircle}>
                <Icon name="shield-key" size={32} color={THEME.colors.primary} />
              </View>
              <Text style={styles.modalTitle}>Enter Delivery OTP</Text>
              <Text style={styles.modalSubtitle}>
                Ask customer for the 4-digit PIN displayed on their app to confirm handover.
              </Text>
            </View>

            <Input
              label="4-DIGIT CUSTOMER PIN"
              placeholder="e.g. 4821"
              keyboardType="number-pad"
              maxLength={4}
              value={otpInput}
              onChangeText={(text: string) => {
                setOtpInput(text);
                setOtpError(undefined);
              }}
              error={otpError}
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setOtpModalVisible(false)}
                style={{ flex: 1, marginRight: THEME.spacing.sm }}
              />
              <Button
                title="Verify & Finish"
                onPress={() => executeStatusUpdate('DELIVERED', otpInput)}
                isLoading={actionLoading}
                disabled={otpInput.length < 4}
                style={{ flex: 1, marginLeft: THEME.spacing.sm }}
              />
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: THEME.spacing.md,
    ...THEME.shadows.light,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: THEME.spacing.md,
  },
  headerSub: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFE0B2',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.round,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  content: {
    padding: THEME.spacing.lg,
  },
  stepperCard: {
    marginBottom: THEME.spacing.md,
    padding: THEME.spacing.md,
  },
  sectionHeaderTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: THEME.spacing.md,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    width: 60,
  },
  stepIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepCompleted: {
    backgroundColor: THEME.colors.success,
  },
  stepCurrent: {
    backgroundColor: THEME.colors.primary,
  },
  stepUpcoming: {
    backgroundColor: '#E2E8F0',
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    textAlign: 'center',
  },
  stepLabelCurrent: {
    color: THEME.colors.primary,
    fontWeight: '800',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: -4,
    marginBottom: 16,
  },
  stepLineCompleted: {
    backgroundColor: THEME.colors.success,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.5,
    marginTop: THEME.spacing.md,
    marginBottom: THEME.spacing.xs,
  },
  customerCard: {
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: THEME.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: THEME.spacing.md,
  },
  clientName: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  clientPhone: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  callActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.round,
    ...THEME.shadows.light,
  },
  callActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
  },
  addressCard: {
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: THEME.spacing.md,
  },
  addressIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: THEME.spacing.md,
  },
  addressText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.text,
    lineHeight: 20,
  },
  cityText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  navigateBtn: {
    height: 48,
    backgroundColor: '#0288D1',
    borderRadius: THEME.borderRadius.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemsCard: {
    padding: THEME.spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: THEME.spacing.sm,
  },
  itemBorder: {
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  itemQtyBadge: {
    backgroundColor: THEME.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.sm,
  },
  itemQtyText: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.primaryDark,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.text,
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
    ...THEME.shadows.medium,
  },
  actionBtn: {
    height: 52,
    borderRadius: THEME.borderRadius.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.lg,
  },
  modalContent: {
    width: '100%',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.xl,
    ...THEME.shadows.medium,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: THEME.spacing.lg,
  },
  shieldIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.spacing.sm,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: THEME.spacing.lg,
  },
});

export default AssignmentDetailScreen;
