import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Switch,
  ActivityIndicator,
  Pressable,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import THEME from '../theme/theme';
import { RootStackParamList, UserAddress } from '../types';
import { createAddress, updateAddress, checkServiceability } from '../api/addressApi';
import { useToastStore } from '../store/toastStore';
import Input from '../components/Input';
import Button from '../components/Button';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Geolocation from '@react-native-community/geolocation';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'AddressForm'>;

export const AddressFormScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { editAddress, fromCheckout } = route.params || {};
  const insets = useSafeAreaInsets();

  const showToast = useToastStore((s) => s.showToast);

  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [latitude, setLatitude] = useState(12.9716);
  const [longitude, setLongitude] = useState(77.5946);

  // Validation / Loading states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checkingPincode, setCheckingPincode] = useState(false);
  const [pincodeFeedback, setPincodeFeedback] = useState('');
  const [isServiceable, setIsServiceable] = useState<boolean | null>(null);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [saving, setSaving] = useState(false);

  // Initialize fields if editing
  useEffect(() => {
    if (editAddress) {
      setAddressLine(editAddress.addressLine);
      setCity(editAddress.city);
      setPincode(editAddress.pincode);
      setIsDefault(editAddress.isDefault);
      setLatitude(editAddress.latitude || 12.9716);
      setLongitude(editAddress.longitude || 77.5946);
      verifyPincode(editAddress.pincode);
    }
  }, [editAddress]);

  const verifyPincode = async (code: string) => {
    if (code.length !== 6 || !/^[1-9][0-9]{5}$/.test(code)) {
      setErrors((prev) => ({ ...prev, pincode: 'Pincode must be 6 digits' }));
      setPincodeFeedback('');
      setIsServiceable(null);
      return;
    }

    setCheckingPincode(true);
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.pincode;
      return copy;
    });
    setPincodeFeedback('Checking serviceability...');
    setIsServiceable(null);

    try {
      const res = await checkServiceability(code);
      if (res.serviceable) {
        setIsServiceable(true);
        setDeliveryCharge(res.deliveryCharge);
        setPincodeFeedback(`Delivery available! Delivery charge: ₹${res.deliveryCharge}`);
      } else {
        setIsServiceable(false);
        setErrors((prev) => ({
          ...prev,
          pincode: 'We do not deliver to this pincode yet',
        }));
        setPincodeFeedback('');
      }
    } catch (err) {
      setIsServiceable(true);
      setPincodeFeedback('Couldn\'t verify pincode. Will try delivery.');
    } finally {
      setCheckingPincode(false);
    }
  };

  const handlePincodeChange = (text: string) => {
    const clean = text.replace(/[^0-9]/g, '').substring(0, 6);
    setPincode(clean);
    if (clean.length === 6) {
      verifyPincode(clean);
    } else {
      setPincodeFeedback('');
      setIsServiceable(null);
    }
  };

  const handleSave = async () => {
    const nextErrors: Record<string, string> = {};
    if (!addressLine.trim()) nextErrors.addressLine = 'Address line is required';
    if (!city.trim()) nextErrors.city = 'City is required';
    if (pincode.length !== 6) nextErrors.pincode = 'Pincode must be 6 digits';
    if (isServiceable === false) nextErrors.pincode = 'Pincode is not serviceable';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    const addressPayload = {
      addressLine: addressLine.trim(),
      city: city.trim(),
      pincode: pincode.trim(),
      latitude,
      longitude,
      isDefault,
    };

    try {
      let savedAddress: UserAddress;
      if (editAddress) {
        savedAddress = await updateAddress(editAddress.id, addressPayload);
        showToast('Address updated successfully', 'success');
      } else {
        savedAddress = await createAddress(addressPayload);
        showToast('Address added successfully', 'success');
      }

      if (fromCheckout) {
        navigation.navigate('Checkout', { selectedAddress: savedAddress });
      } else {
        navigation.goBack();
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to save address', 'error');
    } finally {
      setSaving(false);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'This app needs access to your location to set your delivery address.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      return false;
    }
  };

  const handleUseCurrentLocation = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      showToast('Location permission denied', 'error');
      return;
    }

    showToast('Detecting location...', 'success');

    const getPosition = (highAccuracy: boolean) => {
      return new Promise<any>((resolve, reject) => {
        Geolocation.getCurrentPosition(
          (pos) => resolve(pos),
          (err) => reject(err),
          { enableHighAccuracy: highAccuracy, timeout: 8000, maximumAge: 10000 }
        );
      });
    };

    try {
      let position;
      try {
        position = await getPosition(true);
      } catch (err) {
        // Fallback to low accuracy (wifi/network based, works indoors & on emulators)
        position = await getPosition(false);
      }

      const { latitude, longitude } = position.coords;
      setLatitude(latitude);
      setLongitude(longitude);

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
          {
            headers: {
              'User-Agent': 'FastwayMobileApp/1.0',
            },
          }
        );
        const data = await response.json();
        if (data && data.address) {
          const addr = data.address;
          const road = addr.road || addr.suburb || addr.neighbourhood || '';
          const roadLine = road ? `${road}, ` : '';
          const county = addr.county || '';
          
          const formattedAddress = `${roadLine}${addr.suburb || ''}`.replace(/,\s*$/, '').trim();
          if (formattedAddress) {
            setAddressLine(formattedAddress);
          }
          
          const resolvedCity = addr.city || addr.town || addr.village || county || '';
          if (resolvedCity) {
            setCity(resolvedCity);
          }

          const resolvedPincode = addr.postcode || '';
          const cleanPincode = resolvedPincode.replace(/\s/g, '');
          if (cleanPincode && cleanPincode.length === 6) {
            setPincode(cleanPincode);
            verifyPincode(cleanPincode);
          }
          
          showToast('Location auto-filled!', 'success');
        } else {
          showToast('Map updated. Please fill details manually.', 'success');
        }
      } catch {
        showToast('Location updated on map.', 'success');
      }
    } catch (error) {
      showToast('Could not detect location. Please type manually.', 'error');
    }
  };

  const isFormValid =
    addressLine.trim() !== '' &&
    city.trim() !== '' &&
    pincode.length === 6 &&
    isServiceable !== false &&
    !checkingPincode;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={THEME.colors.background} barStyle="dark-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Icon name="arrow-left" size={24} color={THEME.colors.graphite} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {editAddress ? 'Edit Address' : 'Add New Address'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 24) + 16 : Math.max(insets.bottom, 16) }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Flipkart Style Use Current Location Banner Button */}
        <Pressable
          style={styles.currentLocationBanner}
          onPress={handleUseCurrentLocation}
        >
          <Icon name="crosshairs-gps" size={18} color={THEME.colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.currentLocationBannerText}>Use My Current Location</Text>
        </Pressable>

        {/* Address Line */}
        <Input
          label="ADDRESS LINE"
          placeholder="House No, Building, Street, Area"
          value={addressLine}
          onChangeText={(text) => {
            setAddressLine(text);
            if (errors.addressLine) setErrors((prev) => ({ ...prev, addressLine: '' }));
          }}
          error={errors.addressLine}
          multiline
          numberOfLines={3}
          inputContainerStyle={{ minHeight: 85, height: undefined, alignItems: 'flex-start', paddingTop: 12, paddingBottom: 12 }}
          style={{ flex: 1, textAlignVertical: 'top', paddingTop: 0, paddingBottom: 0 }}
          icon="home-outline"
        />

        {/* City */}
        <Input
          label="CITY / TOWN"
          placeholder="Enter city"
          value={city}
          onChangeText={(text) => {
            setCity(text);
            if (errors.city) setErrors((prev) => ({ ...prev, city: '' }));
          }}
          error={errors.city}
          icon="city-variant-outline"
        />

        {/* Pincode */}
        <View style={styles.pincodeContainer}>
          <Input
            label="PINCODE"
            placeholder="6-digit PIN"
            value={pincode}
            onChangeText={handlePincodeChange}
            keyboardType="numeric"
            maxLength={6}
            error={errors.pincode}
            icon="post-outline"
          />
          {checkingPincode && (
            <ActivityIndicator
              size="small"
              color={THEME.colors.primary}
              style={styles.spinner}
            />
          )}
        </View>

        {/* Pincode Feedback message */}
        {pincodeFeedback !== '' && (
          <View style={styles.feedbackRow}>
            <Icon 
              name={isServiceable === true ? "check-circle" : "alert-circle"} 
              size={16} 
              color={isServiceable === true ? THEME.colors.success : THEME.colors.warning} 
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.feedbackText,
                isServiceable === true ? styles.successFeedback : styles.warningFeedback,
              ]}
            >
              {pincodeFeedback}
            </Text>
          </View>
        )}

        {/* Default toggle */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Set as Default Address</Text>
            <Text style={styles.toggleSubtitle}>Use this address as primary for all orders</Text>
          </View>
          <Switch
            value={isDefault}
            onValueChange={setIsDefault}
            trackColor={{ false: THEME.colors.border, true: THEME.colors.primaryLight }}
            thumbColor={isDefault ? THEME.colors.primary : THEME.colors.textMuted}
          />
        </View>

        {/* Map Picker */}
        <View style={styles.mapHeaderRow}>
          <Text style={styles.mapLabel}>Pin precise location on map</Text>
          <Pressable onPress={handleUseCurrentLocation} style={styles.locateMeBtn}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="crosshairs-gps" size={14} color={THEME.colors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.locateMeText}>Locate Me</Text>
            </View>
          </Pressable>
        </View>
        
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            region={{
              latitude,
              longitude,
              latitudeDelta: 0.015,
              longitudeDelta: 0.015,
            }}
            onPress={(e) => {
              const coords = e.nativeEvent.coordinate;
              setLatitude(coords.latitude);
              setLongitude(coords.longitude);
            }}
          >
            <Marker
              draggable
              coordinate={{ latitude, longitude }}
              onDragEnd={(e) => {
                const coords = e.nativeEvent.coordinate;
                setLatitude(coords.latitude);
                setLongitude(coords.longitude);
              }}
              title="Deliver Here"
              description="Drag marker to adjust location"
            />
          </MapView>
        </View>

        {/* Save Button */}
        <Button
          title={editAddress ? 'Update Address' : 'Save Address'}
          onPress={handleSave}
          disabled={!isFormValid || saving}
          isLoading={saving}
          style={styles.saveBtn}
        />
      </ScrollView>
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
  multilineInput: {
    height: 70,
    textAlignVertical: 'top',
    paddingTop: THEME.spacing.xs,
  },
  pincodeContainer: {
    position: 'relative',
    width: '100%',
  },
  spinner: {
    position: 'absolute',
    right: THEME.spacing.md,
    top: 36,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -THEME.spacing.xs,
    marginBottom: THEME.spacing.md,
    paddingHorizontal: 2,
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '600',
  },
  successFeedback: { 
    color: THEME.colors.success 
  },
  warningFeedback: { 
    color: THEME.colors.warning 
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  toggleInfo: { 
    flex: 1, 
    marginRight: THEME.spacing.md 
  },
  toggleLabel: { 
    fontSize: 13,
    fontWeight: '700', 
    color: THEME.colors.text 
  },
  toggleSubtitle: { 
    fontSize: 11, 
    color: THEME.colors.textSecondary, 
    marginTop: 2 
  },
  mapHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.sm,
  },
  locateMeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: THEME.colors.primaryLight,
    borderRadius: THEME.borderRadius.sm,
  },
  locateMeText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  mapLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mapContainer: {
    height: 160,
    width: '100%',
    borderRadius: THEME.borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.lg,
  },
  map: {
    flex: 1,
  },
  saveBtn: { 
    marginTop: THEME.spacing.sm 
  },
  currentLocationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.md,
    height: 46,
    marginBottom: THEME.spacing.md,
  },
  currentLocationBannerText: {
    color: THEME.colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
});

export default AddressFormScreen;
