import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import THEME from '../theme/theme';
import { RootStackParamList } from '../types';
import Card from '../components/Card';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToastStore } from '../store/toastStore';
import EmptyState from '../components/EmptyState';

import RatingModal from '../components/RatingModal';
import InvoiceModal, { InvoiceData } from '../components/InvoiceModal';

type Nav = NativeStackNavigationProp<RootStackParamList, 'BookingsList'>;

interface Booking {
  id: string;
  serviceType: string;
  description: string;
  date: string;
  slot: string;
  status: string;
  technician: {
    name: string;
    phone: string;
    rating: string;
  };
}

export const BookingsListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const showToast = useToastStore((s) => s.showToast);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Rating Modal state
  const [ratingTarget, setRatingTarget] = useState<Booking | null>(null);

  // Invoice Modal state
  const [activeInvoice, setActiveInvoice] = useState<InvoiceData | null>(null);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const saved = await AsyncStorage.getItem('fastway_service_bookings');
      if (saved) {
        setBookings(JSON.parse(saved));
      } else {
        setBookings([]);
      }
    } catch (err) {
      console.warn('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [])
  );

  const openInvoiceForBooking = (booking: Booking) => {
    const inv: InvoiceData = {
      invoiceNo: `INV-SRV-${booking.id.replace('#', '')}`,
      date: booking.date,
      type: 'SERVICE',
      title: `${booking.serviceType} (${booking.description})`,
      items: [
        { name: `${booking.serviceType} Inspection & Labor`, qty: 1, price: 349 },
        { name: 'Standard Material & Fitting Fee', qty: 1, price: 150 },
      ],
      subtotal: 499,
      taxOrDelivery: 0,
      grandTotal: 499,
      warrantyValidTill: '7 Days Post Service Completion',
    };
    setActiveInvoice(inv);
  };

  const handleCancelBooking = (bookingId: string) => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this technician visit? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const updated = bookings.filter((b) => b.id !== bookingId);
              setBookings(updated);
              await AsyncStorage.setItem('fastway_service_bookings', JSON.stringify(updated));
              showToast('Booking cancelled successfully', 'success');
            } catch (err) {
              showToast('Failed to cancel booking', 'error');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={THEME.colors.background} barStyle="dark-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Icon name="arrow-left" size={24} color={THEME.colors.graphite} />
        </Pressable>
        <Text style={styles.headerTitle}>My Plumber Bookings</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={THEME.colors.brass} size="large" />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            title="No Bookings Found"
            description="You don't have any plumber repair visits scheduled yet. Tap home to book a verified technician."
            actionTitle="Go to Home Screen"
            onActionPress={() => navigation.popToTop()}
            icon="account-wrench"
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 24) + 32 : Math.max(insets.bottom, 32) }]} showsVerticalScrollIndicator={false}>
          {bookings.map((booking) => (
            <Card key={booking.id} style={styles.bookingCard} elevation="none">
              {/* Card Header Row */}
              <View style={styles.cardHeaderRow}>
                <View>
                  <Text style={styles.bookingId}>{booking.id}</Text>
                  <Text style={styles.serviceType}>{booking.serviceType.toUpperCase()}</Text>
                </View>
                <View style={styles.statusBadge}>
                  <View style={styles.statusLed} />
                  <Text style={styles.statusText}>{booking.status}</Text>
                </View>
              </View>

              {/* Description */}
              <Text style={styles.problemLabel}>PROBLEM DESCRIPTION</Text>
              <Text style={styles.problemDesc}>{booking.description}</Text>

              {/* Schedule Info */}
              <View style={styles.scheduleBox}>
                <View style={styles.infoRow}>
                  <Icon name="calendar-range" size={16} color={THEME.colors.brass} style={{ marginRight: 6 }} />
                  <Text style={styles.infoText}>{booking.date}</Text>
                </View>
                <View style={[styles.infoRow, { marginTop: 4 }]}>
                  <Icon name="clock-outline" size={16} color={THEME.colors.brass} style={{ marginRight: 6 }} />
                  <Text style={styles.infoText}>{booking.slot}</Text>
                </View>
              </View>

              {/* Assigned Plumber Details */}
              <View style={styles.techRow}>
                <View style={styles.techAvatar}>
                  <Icon name="account" size={24} color={THEME.colors.brass} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.techName}>{booking.technician.name}</Text>
                  <Text style={styles.techSub}>Fastway Certified Plumber Expert</Text>
                </View>
                <Pressable
                  onPress={() => Alert.alert('Call Plumber', `Dialing Rajesh Kumar at ${booking.technician.phone}`)}
                  style={styles.callBtn}
                  hitSlop={8}
                >
                  <Icon name="phone" size={16} color="#FFF" />
                </Pressable>
              </View>

              {/* Primary Action Buttons */}
              <Pressable
                onPress={() => navigation.navigate('TrackPlumber', { bookingId: booking.id })}
                style={styles.trackBtn}
              >
                <Icon name="map-marker-distance" size={16} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.trackBtnText}>TRACK LIVE LOCATION</Text>
              </Pressable>

              {/* Secondary Engagement Actions */}
              <View style={styles.extraBtnRow}>
                <Pressable
                  onPress={() => setRatingTarget(booking)}
                  style={styles.rateBtn}
                >
                  <Icon name="star-outline" size={15} color={THEME.colors.amber} style={{ marginRight: 4 }} />
                  <Text style={styles.rateBtnText}>RATE VISIT</Text>
                </Pressable>

                <Pressable
                  onPress={() => openInvoiceForBooking(booking)}
                  style={styles.invoiceBtn}
                >
                  <Icon name="file-document-outline" size={15} color={THEME.colors.brass} style={{ marginRight: 4 }} />
                  <Text style={styles.invoiceBtnText}>INVOICE & 7-DAY WARRANTY</Text>
                </Pressable>
              </View>

              <Pressable
                onPress={() => handleCancelBooking(booking.id)}
                style={[styles.cancelBtn, { marginTop: 8 }]}
              >
                <Icon name="close-circle-outline" size={16} color={THEME.colors.error} style={{ marginRight: 6 }} />
                <Text style={styles.cancelBtnText}>CANCEL VISIT</Text>
              </Pressable>
            </Card>
          ))}
        </ScrollView>
      )}

      {/* Rating & Review Modal */}
      {ratingTarget && (
        <RatingModal
          visible={!!ratingTarget}
          bookingId={ratingTarget.id}
          technicianName={ratingTarget.technician.name}
          serviceType={ratingTarget.serviceType}
          onClose={() => setRatingTarget(null)}
          onSuccess={loadBookings}
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
  safeArea: { flex: 1, backgroundColor: THEME.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: 1,
    borderColor: THEME.colors.border,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.graphite,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: THEME.colors.textSecondary, fontWeight: '600' },
  emptyWrap: { flex: 1, justifyContent: 'center', padding: THEME.spacing.xl },
  scrollContent: { padding: THEME.spacing.md },
  bookingCard: {
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: THEME.spacing.md,
  },
  bookingId: {
    fontFamily: THEME.typography.price.fontFamily,
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.textMuted,
  },
  serviceType: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.graphite,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: THEME.borderRadius.xs,
  },
  statusLed: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  statusText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#2E7D32',
    letterSpacing: 0.5,
  },
  problemLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  problemDesc: {
    fontSize: 11,
    color: THEME.colors.graphite,
    lineHeight: 14,
    fontWeight: '600',
    marginBottom: THEME.spacing.md,
  },
  scheduleBox: {
    backgroundColor: '#FAF9F6',
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.xs,
    marginBottom: THEME.spacing.md,
    borderWidth: 0.5,
    borderColor: THEME.colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.graphite,
  },
  techRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: THEME.spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  techAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F9F8F6',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  techName: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.graphite,
  },
  techSub: {
    fontSize: 9,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },
  callBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.xs,
  },
  cancelBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.error,
    letterSpacing: 0.3,
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 34,
    backgroundColor: THEME.colors.brass,
    borderRadius: THEME.borderRadius.xs,
  },
  trackBtnText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  extraBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  rateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
    borderWidth: 1,
    borderColor: THEME.colors.amber,
    borderRadius: THEME.borderRadius.xs,
    backgroundColor: '#FFFDF9',
  },
  rateBtnText: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.graphite,
    letterSpacing: 0.3,
  },
  invoiceBtn: {
    flex: 1.2,
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
});

export default BookingsListScreen;
