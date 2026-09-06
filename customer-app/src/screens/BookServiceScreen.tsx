import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import THEME from '../theme/theme';
import { RootStackParamList } from '../types';
import EmptyState from '../components/EmptyState';
import EmergencyHelpFAB from '../components/EmergencyHelpFAB';
import Card from '../components/Card';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useToastStore } from '../store/toastStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Nav = NativeStackNavigationProp<RootStackParamList, 'BookService'>;

const SERVICE_TYPES = [
  { id: 'leakage', label: 'Leakage Repair', icon: 'water-pump' },
  { id: 'faucet', label: 'Tap Replacement', icon: 'water' },
  { id: 'toilet', label: 'Toilet Fitting', icon: 'toilet' },
  { id: 'pipes', label: 'Pipe Installation', icon: 'pipe' },
  { id: 'cleaning', label: 'Tank Cleaning', icon: 'water-boiler' },
];

const TIME_SLOTS = [
  '10:00 AM - 01:00 PM',
  '01:00 PM - 04:00 PM',
  '04:00 PM - 07:00 PM',
];

export const BookServiceScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const showToast = useToastStore((s) => s.showToast);

  const [selectedService, setSelectedService] = useState('leakage');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState<'today' | 'tomorrow' | 'dayAfter'>('tomorrow');
  const [selectedSlot, setSelectedSlot] = useState(TIME_SLOTS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  const handleConfirmBooking = async () => {
    if (!description.trim()) {
      showToast('Please describe the repairing problem briefly', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const today = new Date();
      const serviceLabel = SERVICE_TYPES.find(s => s.id === selectedService)?.label || 'Plumbing Service';
      
      const newBooking = {
        id: 'FW-SRV-' + Math.floor(1000 + Math.random() * 9000),
        serviceType: serviceLabel,
        description: description.trim(),
        date: getDisplayDate(),
        slot: selectedSlot,
        status: 'ASSIGNED',
        technician: {
          name: 'Rajesh Kumar',
          phone: '+91 98765 43210',
          rating: '4.9',
        }
      };

      const saved = await AsyncStorage.getItem('fastway_service_bookings');
      let bookings: any[] = [];
      if (saved) {
        bookings = JSON.parse(saved);
      }
      bookings.unshift(newBooking);

      await AsyncStorage.setItem('fastway_service_bookings', JSON.stringify(bookings));
      
      setSubmitting(false);
      setBookingConfirmed(true);
      showToast('Technician booking confirmed!', 'success');
    } catch (err) {
      setSubmitting(false);
      showToast('Failed to save booking details', 'error');
    }
  };

  const getDisplayDate = () => {
    const today = new Date();
    if (selectedDate === 'today') return 'Today, ' + today.toLocaleDateString([], { month: 'short', day: 'numeric' });
    
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    if (selectedDate === 'tomorrow') return 'Tomorrow, ' + tomorrow.toLocaleDateString([], { month: 'short', day: 'numeric' });
    
    const dayAfter = new Date(today.getTime() + 48 * 60 * 60 * 1000);
    return dayAfter.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={THEME.colors.background} barStyle="dark-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Icon name="arrow-left" size={24} color={THEME.colors.graphite} />
        </Pressable>
        <Text style={styles.headerTitle}>Home Repair Service</Text>
        <EmergencyHelpFAB variant="header" />
      </View>

      {!bookingConfirmed ? (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 24) + 32 : Math.max(insets.bottom, 32) }]} showsVerticalScrollIndicator={false}>
          {/* Service Selector Card */}
          <Card style={styles.card} elevation="none">
            <Text style={styles.sectionTitle}>WHAT IS THE REPAIRING PROBLEM?</Text>
            <View style={styles.serviceGrid}>
              {SERVICE_TYPES.map((service) => {
                const isSelected = selectedService === service.id;
                return (
                  <Pressable
                    key={service.id}
                    onPress={() => setSelectedService(service.id)}
                    style={[styles.serviceChip, isSelected && styles.serviceChipActive]}
                  >
                    <Icon
                      name={service.icon}
                      size={20}
                      color={isSelected ? '#FFF' : THEME.colors.graphite}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.serviceLabel, isSelected && styles.serviceLabelActive]}>
                      {service.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {/* Description Card */}
          <Card style={styles.card} elevation="none">
            <Text style={styles.sectionTitle}>DESCRIBE WHAT NEEDS TO BE FIXED</Text>
            <TextInput
              multiline
              numberOfLines={4}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe what is leaking or needs replacement (e.g. kitchen sink tap is dripping, bathroom wall pipe crack...)"
              placeholderTextColor={THEME.colors.textMuted}
              style={styles.textInput}
            />
          </Card>

          {/* Slot Scheduler Card */}
          <Card style={styles.card} elevation="none">
            <Text style={styles.sectionTitle}>WHEN SHOULD THE PLUMBER VISIT?</Text>
            
            {/* Date selector chips */}
            <View style={styles.dateSelectorRow}>
              {[
                { key: 'today', label: 'Today' },
                { key: 'tomorrow', label: 'Tomorrow' },
                { key: 'dayAfter', label: 'Day After' },
              ].map((dateOption) => {
                const isSelected = selectedDate === dateOption.key;
                return (
                  <Pressable
                    key={dateOption.key}
                    onPress={() => setSelectedDate(dateOption.key as any)}
                    style={[styles.dateChip, isSelected && styles.dateChipActive]}
                  >
                    <Text style={[styles.dateChipText, isSelected && styles.dateChipTextActive]}>
                      {dateOption.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.inputLabel, { marginTop: THEME.spacing.md }]}>SELECT TIME SLOT</Text>
            <View style={styles.slotsColumn}>
              {TIME_SLOTS.map((slot) => {
                const isSelected = selectedSlot === slot;
                return (
                  <Pressable
                    key={slot}
                    onPress={() => setSelectedSlot(slot)}
                    style={[styles.slotRow, isSelected && styles.slotRowActive]}
                  >
                    <Icon
                      name={isSelected ? 'clock-check-outline' : 'clock-outline'}
                      size={18}
                      color={isSelected ? THEME.colors.brass : THEME.colors.graphiteMuted}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={[styles.slotText, isSelected && styles.slotTextActive]}>
                      {slot}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {/* Default Address Check */}
          <Card style={[styles.card, styles.addressCard]} elevation="none">
            <Icon name="map-marker-radius" size={22} color={THEME.colors.brass} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.addressTitle}>VISITING ADDRESS</Text>
              <Text style={styles.addressText} numberOfLines={1}>
                Delivering/Visiting default home address registered on profile
              </Text>
            </View>
          </Card>

          {/* Submit Action */}
          <Pressable onPress={handleConfirmBooking} style={styles.submitBtn} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Icon name="calendar-check" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.submitBtnText}>BOOK PLUMBER NOW</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      ) : (
        <View style={styles.confirmedContainer}>
          <View style={styles.confirmedIconCircle}>
            <Icon name="check-circle-outline" size={60} color="#4CAF50" />
          </View>
          <Text style={styles.confirmedTitle}>BOOKING CONFIRMED</Text>
          <Text style={styles.confirmedSubtitle}>
            A verified technician has been assigned for {getDisplayDate()} during {selectedSlot}.
          </Text>

          {/* Assigned Technician Card */}
          <Card style={styles.technicianCard} elevation="none">
            <View style={styles.techHeaderRow}>
              <View style={styles.techAvatarBox}>
                <Icon name="account" size={32} color={THEME.colors.brass} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.techName}>Rajesh Kumar</Text>
                <View style={styles.ratingRow}>
                  <Icon name="star" size={14} color="#FFB300" style={{ marginRight: 2 }} />
                  <Text style={styles.techRating}>4.9 (180+ service jobs completed)</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.techDetailRow}>
              <Icon name="shield-check" size={16} color={THEME.colors.success} style={{ marginRight: 6 }} />
              <Text style={styles.techDetailText}>Fastway Certified Plumbing Expert</Text>
            </View>
            <View style={styles.techDetailRow}>
              <Icon name="cellphone" size={16} color={THEME.colors.graphiteMuted} style={{ marginRight: 6 }} />
              <Text style={styles.techDetailText}>Contact: +91 98765 43210</Text>
            </View>
          </Card>

          <Pressable onPress={() => navigation.popToTop()} style={styles.backHomeBtn}>
            <Text style={styles.backHomeBtnText}>BACK TO HOME SCREEN</Text>
          </Pressable>
        </View>
      )}
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
  scrollContent: { padding: THEME.spacing.md },
  card: {
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.sm,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: THEME.spacing.md,
  },
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: '#FAF9F6',
    maxWidth: '100%',
  },
  serviceChipActive: {
    backgroundColor: THEME.colors.graphite,
    borderColor: THEME.colors.graphite,
  },
  serviceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.graphite,
    flexShrink: 1,
  },
  serviceLabelActive: {
    color: '#FFF',
  },
  textInput: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.sm,
    padding: THEME.spacing.sm,
    fontSize: 12,
    color: THEME.colors.graphite,
    backgroundColor: '#FAF9F6',
    textAlignVertical: 'top',
    height: 90,
  },
  dateSelectorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateChip: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF9F6',
    paddingHorizontal: 4,
  },
  dateChipActive: {
    borderColor: THEME.colors.brass,
    backgroundColor: 'rgba(168, 125, 74, 0.05)',
  },
  dateChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.graphite,
    textAlign: 'center',
  },
  dateChipTextActive: {
    color: THEME.colors.brass,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  slotsColumn: {
    gap: 8,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: '#FAF9F6',
  },
  slotRowActive: {
    borderColor: THEME.colors.brass,
    backgroundColor: 'rgba(168, 125, 74, 0.05)',
  },
  slotText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.graphite,
    flexShrink: 1,
  },
  slotTextActive: {
    color: THEME.colors.brass,
    fontWeight: '700',
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF9F6',
  },
  addressTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.graphite,
    letterSpacing: 0.3,
  },
  addressText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  submitBtn: {
    backgroundColor: THEME.colors.brass,
    height: 48,
    width: '100%',
    borderRadius: THEME.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: THEME.spacing.md,
    marginTop: THEME.spacing.sm,
    marginBottom: THEME.spacing.xl,
    overflow: 'hidden',
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    flexShrink: 1,
    textAlign: 'center',
  },
  confirmedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: THEME.spacing.xl,
  },
  confirmedIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: THEME.spacing.lg,
  },
  confirmedTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME.colors.graphite,
    letterSpacing: 0.5,
  },
  confirmedSubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 6,
    marginBottom: THEME.spacing.xl,
  },
  technicianCard: {
    width: '100%',
    padding: THEME.spacing.md,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.sm,
    marginBottom: THEME.spacing.xl,
  },
  techHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  techAvatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F9F8F6',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  techName: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.graphite,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  techRating: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.border,
    marginVertical: THEME.spacing.md,
  },
  techDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  techDetailText: {
    fontSize: 11,
    color: THEME.colors.graphite,
    fontWeight: '600',
  },
  backHomeBtn: {
    backgroundColor: THEME.colors.graphite,
    height: 46,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: THEME.spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backHomeBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default BookServiceScreen;
