import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
  Linking,
  Alert,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import useAuthStore from '../store/authStore';
import THEME from '../theme/theme';
import Card from '../components/Card';
import { apiLogout, apiUploadProfilePicture, apiUpdateProfile } from '../api/authApi';
import { useToastStore } from '../store/toastStore';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { user, refreshToken, clearAuth, setAuth } = useAuthStore();
  const showToast = useToastStore((s) => s.showToast);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleStartEdit = () => {
    if (!user) return;
    setEditName(user.name);
    setEditEmail(user.email || '');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      showToast('Name cannot be empty', 'error');
      return;
    }
    setSaving(true);
    try {
      const updatedUser = await apiUpdateProfile(editName.trim(), editEmail.trim());
      await setAuth(useAuthStore.getState().token || '', updatedUser, useAuthStore.getState().refreshToken || '');
      setIsEditing(false);
      showToast('Profile updated successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile details', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleImagePick = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 800,
        maxHeight: 800,
      },
      async (response) => {
        if (response.didCancel) return;
        if (response.errorMessage) {
          showToast(response.errorMessage, 'error');
          return;
        }
        if (response.assets && response.assets.length > 0) {
          const asset = response.assets[0];
          if (!asset.uri) return;

          setUploading(true);
          try {
            const cleanUri = Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri;
            const formData = new FormData();
            formData.append('file', {
              uri: cleanUri,
              name: asset.fileName || 'profile.jpg',
              type: asset.type || 'image/jpeg',
            } as any);

            const updatedUser = await apiUploadProfilePicture(formData);
            await setAuth(useAuthStore.getState().token || '', updatedUser, useAuthStore.getState().refreshToken || '');
            showToast('Profile picture updated successfully', 'success');
          } catch (err: any) {
            const errorMsg = err.message || JSON.stringify(err);
            console.log('Upload error:', err);
            showToast(`Upload Failed: ${errorMsg}`, 'error');
          } finally {
            setUploading(false);
          }
        }
      }
    );
  };

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await apiLogout(refreshToken);
      }
      try {
        await GoogleSignin.signOut();
      } catch (googleErr) {
        console.log('Google sign-out error:', googleErr);
      }
    } catch (e) {
      // Proceed with local logout regardless of API success
    }
    await clearAuth();
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const [openFaq, setOpenFaq] = React.useState<number | null>(null);

  const FAQS = [
    {
      q: 'How do I track my order?',
      a: 'Go to My Orders → tap any order to see live delivery status and tracking.',
    },
    {
      q: 'What is the delivery time?',
      a: 'We deliver within 10 minutes for in-stock items in serviceable pincodes.',
    },
    {
      q: 'How do I return a product?',
      a: 'Contact us within 24 hours of delivery. We will arrange a free pickup.',
    },
    {
      q: 'Which payment methods are accepted?',
      a: 'Cash on Delivery (COD) and online payments via Razorpay are accepted.',
    },
  ];

  const openLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this link on your device.');
      }
    } catch {
      Alert.alert('Error', 'Something went wrong while opening the link.');
    }
  };


  if (!user) return null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={THEME.colors.background} barStyle="dark-content" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Icon name="arrow-left" size={24} color={THEME.colors.graphite} />
        </Pressable>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Avatar Banner */}
        <View style={styles.banner}>
          <Pressable onPress={handleImagePick} style={styles.avatarContainer} disabled={uploading}>
            {user.profilePictureUrl ? (
              <Image source={{ uri: user.profilePictureUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
              </View>
            )}
            {uploading ? (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator size="small" color="#FFF" />
              </View>
            ) : (
              <View style={styles.cameraIconContainer}>
                <Icon name="camera" size={14} color="#FFF" />
              </View>
            )}
          </Pressable>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userRoleBadge}>{user.role === 'CUSTOMER' ? 'Customer' : user.role}</Text>
        </View>

        {/* Loyalty Points Card */}
        <Card style={styles.loyaltyCard} elevation="none">
          <View style={styles.loyaltyLeft}>
            <View style={styles.loyaltyIconBg}>
              <Icon name="star-circle" size={24} color="#FFD600" />
            </View>
            <View style={styles.loyaltyTextContainer}>
              <Text style={styles.loyaltyTitle}>Loyalty Points Balance</Text>
              <Text style={styles.loyaltyDesc}>Redeem points on checkout (10 pts = ₹1)</Text>
            </View>
          </View>
          <View style={styles.loyaltyRight}>
            <Text style={styles.loyaltyValue}>{user.loyaltyPoints || 0}</Text>
            <Text style={styles.loyaltyLabel}>Points</Text>
          </View>
        </Card>

        {/* User Account Info Details */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          {!isEditing ? (
            <Pressable onPress={handleStartEdit} style={styles.editBtn} hitSlop={8}>
              <Text style={styles.editBtnText}>Edit</Text>
            </Pressable>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Pressable onPress={handleCancelEdit} style={[styles.editBtn, { marginRight: 12 }]} hitSlop={8}>
                <Text style={[styles.editBtnText, { color: THEME.colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleSaveEdit} style={styles.editBtn} hitSlop={8} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color={THEME.colors.primary} />
                ) : (
                  <Text style={styles.editBtnText}>Save</Text>
                )}
              </Pressable>
            </View>
          )}
        </View>

        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Full Name</Text>
            {isEditing ? (
              <TextInput
                style={styles.infoInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter your name"
                placeholderTextColor="#999"
              />
            ) : (
              <Text style={styles.infoValue}>{user.name}</Text>
            )}
          </View>
          <View style={[styles.infoRow, styles.borderTop]}>
            <Text style={styles.infoLabel}>Phone Number</Text>
            <Text style={[styles.infoValue, isEditing && { color: THEME.colors.textMuted }]}>{user.phone}</Text>
          </View>
          <View style={[styles.infoRow, styles.borderTop]}>
            <Text style={styles.infoLabel}>Email Address</Text>
            {isEditing ? (
              <TextInput
                style={styles.infoInput}
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="Enter email address"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            ) : (
              <Text style={styles.infoValue}>{user.email || 'Not Provided'}</Text>
            )}
          </View>
        </Card>

        {/* Menu Options */}
        <Text style={styles.sectionTitle}>Settings & Activity</Text>
        <Card style={styles.menuCard}>
          <Pressable
            onPress={() => navigation.navigate('OrderList')}
            style={styles.menuItem}
          >
            <View style={styles.menuLeft}>
              <Icon name="package-variant-closed" size={22} color={THEME.colors.primary} style={styles.menuIcon} />
              <Text style={styles.menuItemText}>My Orders</Text>
            </View>
            <Icon name="chevron-right" size={20} color={THEME.colors.textSecondary} />
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('BookingsList')}
            style={[styles.menuItem, styles.borderTop]}
          >
            <View style={styles.menuLeft}>
              <Icon name="account-wrench-outline" size={22} color={THEME.colors.primary} style={styles.menuIcon} />
              <Text style={styles.menuItemText}>My Plumber Bookings</Text>
            </View>
            <Icon name="chevron-right" size={20} color={THEME.colors.textSecondary} />
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('AddressList', { selectMode: false })}
            style={[styles.menuItem, styles.borderTop]}
          >
            <View style={styles.menuLeft}>
              <Icon name="map-marker-outline" size={22} color={THEME.colors.primary} style={styles.menuIcon} />
              <Text style={styles.menuItemText}>My Addresses</Text>
            </View>
            <Icon name="chevron-right" size={20} color={THEME.colors.textSecondary} />
          </Pressable>
          
          <Pressable
            onPress={() => navigation.navigate('Notifications')}
            style={[styles.menuItem, styles.borderTop]}
          >
            <View style={styles.menuLeft}>
              <Icon name="bell-outline" size={22} color={THEME.colors.primary} style={styles.menuIcon} />
              <Text style={styles.menuItemText}>Notification Preference</Text>
            </View>
            <Icon name="chevron-right" size={20} color={THEME.colors.textSecondary} />
          </Pressable>
        </Card>

        {/* Help & Contact */}
        <Text style={styles.sectionTitle}>Help & Support</Text>
        <Card style={styles.menuCard}>
          {/* Call Us */}
          <Pressable
            style={styles.menuItem}
            onPress={() => openLink('tel:+919001274590')}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.contactIconWrap, { backgroundColor: '#E8F5E9' }]}>
                <Icon name="phone" size={18} color="#2E7D32" />
              </View>
              <View>
                <Text style={styles.menuItemText}>Call Us</Text>
                <Text style={styles.menuItemSub}>+91 90012 74590</Text>
              </View>
            </View>
            <Icon name="chevron-right" size={20} color={THEME.colors.textSecondary} />
          </Pressable>

          {/* WhatsApp */}
          <Pressable
            style={[styles.menuItem, styles.borderTop]}
            onPress={() => openLink('https://wa.me/919001274590?text=Hi%20Fastway%2C%20I%20need%20help%20with%20my%20order.')}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.contactIconWrap, { backgroundColor: '#E8F5E9' }]}>
                <Icon name="whatsapp" size={18} color="#25D366" />
              </View>
              <View>
                <Text style={styles.menuItemText}>WhatsApp</Text>
                <Text style={styles.menuItemSub}>Chat with us instantly</Text>
              </View>
            </View>
            <Icon name="chevron-right" size={20} color={THEME.colors.textSecondary} />
          </Pressable>

          {/* Email */}
          <Pressable
            style={[styles.menuItem, styles.borderTop]}
            onPress={() => openLink('mailto:support@fastway.com?subject=Customer%20Support')}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.contactIconWrap, { backgroundColor: '#E3F2FD' }]}>
                <Icon name="email-outline" size={18} color="#1565C0" />
              </View>
              <View>
                <Text style={styles.menuItemText}>Email Support</Text>
                <Text style={styles.menuItemSub}>support@fastway.com</Text>
              </View>
            </View>
            <Icon name="chevron-right" size={20} color={THEME.colors.textSecondary} />
          </Pressable>
        </Card>

        {/* FAQ Section */}
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        <Card style={[styles.menuCard, { marginBottom: THEME.spacing.lg }]}>
          {FAQS.map((faq, idx) => (
            <View key={idx} style={idx > 0 ? styles.borderTop : undefined}>
              <Pressable
                style={styles.faqRow}
                onPress={() => setOpenFaq(openFaq === idx ? null : idx)}
              >
                <Text style={styles.faqQuestion}>{faq.q}</Text>
                <Icon
                  name={openFaq === idx ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={THEME.colors.textSecondary}
                />
              </Pressable>
              {openFaq === idx && (
                <Text style={styles.faqAnswer}>{faq.a}</Text>
              )}
            </View>
          ))}
        </Card>

        {/* Logout Button */}

        <Pressable onPress={handleLogout} style={styles.logoutBtn}>
          <Icon name="logout" size={20} color={THEME.colors.error} style={{ marginRight: THEME.spacing.sm }} />
          <Text style={styles.logoutBtnText}>Logout</Text>
        </Pressable>
      </ScrollView>
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
  scrollContent: {
    padding: THEME.spacing.md,
  },
  banner: {
    alignItems: 'center',
    marginVertical: THEME.spacing.md,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...THEME.shadows.medium,
  },
  avatarContainer: {
    width: 90,
    height: 90,
    position: 'relative',
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    resizeMode: 'cover',
    borderWidth: 2,
    borderColor: THEME.colors.primary,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 45,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: THEME.colors.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFF',
    ...THEME.shadows.medium,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFF',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: THEME.colors.text,
    marginTop: THEME.spacing.md,
  },
  userRoleBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.primary,
    backgroundColor: THEME.colors.primaryLight,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.xs,
    borderRadius: THEME.borderRadius.round,
    marginTop: THEME.spacing.xs,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCard: {
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
  },
  infoRow: {
    paddingVertical: THEME.spacing.xs,
  },
  infoLabel: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingTop: THEME.spacing.sm,
    marginTop: THEME.spacing.sm,
  },
  menuCard: {
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: THEME.spacing.sm,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    marginRight: THEME.spacing.md,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  contactIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: THEME.spacing.md,
  },
  menuItemSub: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },
  faqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: THEME.spacing.sm,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.text,
    flex: 1,
    paddingRight: THEME.spacing.sm,
  },
  faqAnswer: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
    paddingBottom: THEME.spacing.sm,
    paddingRight: THEME.spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
  },
  editBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  infoInput: {
    fontSize: 14,
    color: THEME.colors.text,
    padding: 0,
    flex: 1,
    textAlign: 'left',
    fontWeight: '600',
  },
  logoutBtn: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: THEME.colors.error,
    borderRadius: THEME.borderRadius.md,
    flexDirection: 'row',
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.spacing.md,
    ...THEME.shadows.light,
  },
  logoutBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.error,
  },
  loyaltyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: THEME.spacing.md,
    backgroundColor: '#FFFDF0',
    borderColor: '#FFE082',
    borderWidth: 1,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.md,
  },
  loyaltyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  loyaltyIconBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF8E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: THEME.spacing.sm,
  },
  loyaltyTextContainer: {
    flex: 1,
  },
  loyaltyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  loyaltyDesc: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  loyaltyRight: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: THEME.spacing.sm,
  },
  loyaltyValue: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  loyaltyLabel: {
    fontSize: 9,
    color: THEME.colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});

export default ProfileScreen;
