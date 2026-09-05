import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import THEME from '../theme/theme';
import { RootStackParamList, UserAddress } from '../types';
import { getAddresses, deleteAddress, setDefaultAddress } from '../api/addressApi';
import { useToastStore } from '../store/toastStore';
import SkeletonBox from '../components/SkeletonBox';
import EmptyState from '../components/EmptyState';
import Card from '../components/Card';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'AddressList'>;

export const AddressListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { selectMode } = route.params || { selectMode: false };
  const insets = useSafeAreaInsets();
  const showToast = useToastStore((s) => s.showToast);

  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchAddresses = async () => {
    try {
      setError(false);
      const data = await getAddresses();
      setAddresses(data);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAddresses();
    }, [])
  );

  const handleSelect = (address: UserAddress) => {
    if (selectMode) {
      navigation.navigate('Checkout', { selectedAddress: address });
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      setLoading(true);
      await setDefaultAddress(id);
      showToast('Default address updated', 'success');
      await fetchAddresses();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update default address', 'error');
      setLoading(false);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteAddress(id);
              showToast('Address deleted successfully', 'success');
              await fetchAddresses();
            } catch (err: any) {
              showToast(err?.message || 'Failed to delete address', 'error');
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderAddressItem = ({ item }: { item: UserAddress }) => {
    return (
      <Pressable
        onPress={() => handleSelect(item)}
        disabled={!selectMode}
        style={({ pressed }) => [
          styles.addressCardPressable,
          selectMode && pressed && styles.cardPressed,
        ]}
      >
        <Card
          elevation="none"
          style={[
            styles.addressCard,
            selectMode && styles.selectableCard,
            item.isDefault && styles.defaultCardBorder,
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: THEME.spacing.sm }}>
              <Icon
                name={item.isDefault ? "map-marker-check" : "map-marker-outline"}
                size={18}
                color={item.isDefault ? THEME.colors.primary : THEME.colors.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.addressLine} numberOfLines={2}>
                {item.addressLine}
              </Text>
            </View>
            {item.isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>DEFAULT</Text>
              </View>
            )}
          </View>

          <Text style={styles.cityText}>
            {item.city} — {item.pincode}
          </Text>

          <View style={styles.actionsRow}>
            {!item.isDefault ? (
              <Pressable
                onPress={() => handleSetDefault(item.id)}
                style={({ pressed }) => [styles.actionLink, pressed && styles.linkPressed]}
                hitSlop={8}
              >
                <Text style={styles.actionLinkText}>Set as Default</Text>
              </Pressable>
            ) : (
              <View />
            )}
            <View style={styles.rightActions}>
              <Pressable
                onPress={() => navigation.navigate('AddressForm', { editAddress: item, fromCheckout: selectMode })}
                style={({ pressed }) => [styles.actionLink, pressed && styles.linkPressed]}
                hitSlop={8}
              >
                <Text style={[styles.actionLinkText, { color: THEME.colors.primary }]}>Edit</Text>
              </Pressable>
              <Pressable
                onPress={() => handleDelete(item.id)}
                style={({ pressed }) => [styles.actionLink, pressed && styles.linkPressed]}
                hitSlop={8}
              >
                <Text style={[styles.actionLinkText, { color: THEME.colors.error }]}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </Card>
      </Pressable>
    );
  };

  if (loading && addresses.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
            <Icon name="arrow-left" size={24} color="#FFF" />
          </Pressable>
          <Text style={styles.headerTitle}>My Addresses</Text>
        </View>
        <View style={styles.listContent}>
          {[1, 2, 3].map((i) => (
            <Card key={i} style={[styles.addressCard, { height: 110, justifyContent: 'center' }]} elevation="none">
              <SkeletonBox width="80%" height={16} />
              <SkeletonBox width="50%" height={12} style={{ marginTop: 12 }} />
              <SkeletonBox width="30%" height={10} style={{ marginTop: 12 }} />
            </Card>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (error && addresses.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
            <Icon name="arrow-left" size={24} color="#FFF" />
          </Pressable>
          <Text style={styles.headerTitle}>My Addresses</Text>
        </View>
        <EmptyState
          icon="alert-circle-outline"
          message="Failed to load addresses."
          actionTitle="Try Again"
          onAction={() => { setLoading(true); fetchAddresses(); }}
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
        <Text style={styles.headerTitle}>
          {selectMode ? 'Select Delivery Address' : 'My Addresses'}
        </Text>
      </View>

      {/* Add New Button */}
      <Pressable
        onPress={() => navigation.navigate('AddressForm', { fromCheckout: selectMode })}
        style={({ pressed }) => [styles.addAddressBtn, pressed && styles.addAddressPressed]}
      >
        <Icon name="plus" size={20} color={THEME.colors.primary} style={{ marginRight: 6 }} />
        <Text style={styles.addAddressText}>Add New Address</Text>
      </Pressable>

      {/* Address List */}
      {addresses.length === 0 ? (
        <EmptyState
          icon="map-marker-off-outline"
          message="No saved addresses found. Add a delivery address to order products!"
          actionTitle="Add Address"
          onAction={() => navigation.navigate('AddressForm', { fromCheckout: selectMode })}
        />
      ) : (
        <FlatList<UserAddress>
          data={addresses}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderAddressItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 24) + 16 }]}
        />
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
  addAddressBtn: {
    backgroundColor: THEME.colors.surface,
    marginHorizontal: THEME.spacing.lg,
    marginVertical: THEME.spacing.md,
    height: 48,
    borderRadius: THEME.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: THEME.colors.primary,
    borderStyle: 'dashed',
  },
  addAddressPressed: { 
    backgroundColor: THEME.colors.primaryLight,
  },
  addAddressText: {
    color: THEME.colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  listContent: { 
    paddingHorizontal: THEME.spacing.lg, 
    paddingBottom: THEME.spacing.xl 
  },
  addressCardPressable: {
    marginBottom: THEME.spacing.md,
  },
  addressCard: {
    padding: THEME.spacing.md,
    borderWidth: 1,
  },
  selectableCard: {
    borderColor: THEME.colors.border,
  },
  defaultCardBorder: {
    borderColor: THEME.colors.primary,
  },
  cardPressed: { 
    opacity: 0.95 
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  addressLine: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
    lineHeight: 16,
  },
  defaultBadge: {
    backgroundColor: THEME.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.xs,
  },
  defaultBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: THEME.colors.primaryDark,
  },
  cityText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.md,
    marginLeft: 24,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingTop: THEME.spacing.sm,
  },
  actionLink: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  actionLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  linkPressed: { 
    opacity: 0.6 
  },
  rightActions: {
    flexDirection: 'row',
    gap: THEME.spacing.sm,
  },
});

export default AddressListScreen;
