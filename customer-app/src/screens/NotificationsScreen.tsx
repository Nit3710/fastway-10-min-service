import React, { useEffect, useState } from 'react';
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
  Switch,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getNotificationsList, markNotificationRead, NotificationResponse } from '../api/notificationApi';
import { getNotificationSettings, updateNotificationSettings } from '../api/notificationSettingsApi';
import { RootStackParamList } from '../types';
import { useToastStore } from '../store/toastStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import THEME from '../theme/theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Notifications'>;

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const showToast = useToastStore((s) => s.showToast);

  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [inApp, setInApp] = useState(true);
  const [push, setPush] = useState(true);
  const [email, setEmail] = useState(true);
  const [whatsapp, setWhatsapp] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const data = await getNotificationSettings();
      setInApp(data.inAppEnabled);
      setPush(data.pushEnabled);
      setEmail(data.emailEnabled);
      setWhatsapp(data.whatsappEnabled);
    } catch {
      // ignore
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleToggle = async (channel: 'inApp' | 'push' | 'email' | 'whatsapp', currentVal: boolean) => {
    const newVal = !currentVal;
    if (channel === 'inApp') setInApp(newVal);
    if (channel === 'push') setPush(newVal);
    if (channel === 'email') setEmail(newVal);
    if (channel === 'whatsapp') setWhatsapp(newVal);

    try {
      const payload: any = {};
      if (channel === 'inApp') payload.inAppEnabled = newVal;
      if (channel === 'push') payload.pushEnabled = newVal;
      if (channel === 'email') payload.emailEnabled = newVal;
      if (channel === 'whatsapp') payload.whatsappEnabled = newVal;
      await updateNotificationSettings(payload);
    } catch {
      if (channel === 'inApp') setInApp(currentVal);
      if (channel === 'push') setPush(currentVal);
      if (channel === 'email') setEmail(currentVal);
      if (channel === 'whatsapp') setWhatsapp(currentVal);
      showToast('Failed to save preference', 'error');
    }
  };

  const fetchNotifications = async (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);
    try {
      const data = await getNotificationsList(0, 50);
      setNotifications(data.content);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch notification history', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchSettings();
  }, []);

  const handleNotificationTap = async (item: NotificationResponse) => {
    // If not read yet, mark as read on backend
    if (!item.isRead) {
      try {
        await markNotificationRead(item.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
        );
      } catch (e) {}
    }

    // Navigate based on related data
    if (item.relatedType === 'ORDER' && item.relatedId) {
      navigation.navigate('OrderDetail', { orderId: item.relatedId });
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const renderItem = ({ item }: { item: NotificationResponse }) => {
    const isUnread = !item.isRead;
    const isOrder = item.relatedType === 'ORDER';

    return (
      <Pressable
        onPress={() => handleNotificationTap(item)}
        style={({ pressed }) => [
          styles.notificationRow,
          isUnread && styles.unreadRow,
          pressed && styles.pressedRow,
        ]}
      >
        {/* Left Circular Icon */}
        <View style={[styles.iconContainer, isUnread ? styles.unreadIconContainer : styles.readIconContainer]}>
          <Icon
            name={isOrder ? 'package-variant-closed' : 'bell-outline'}
            size={22}
            color={isUnread ? THEME.colors.primary : THEME.colors.textSecondary}
          />
        </View>

        {/* Right Info Details Area */}
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={[styles.titleText, isUnread && styles.unreadTitleText]} numberOfLines={1}>
              {item.title}
            </Text>
            {isUnread && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.bodyText}>{item.body}</Text>
          
          <View style={styles.metaRow}>
            <Text style={styles.dateText}>{formatDate(item.sentAt)}</Text>
            {isOrder && (
              <View style={styles.actionLink}>
                <Text style={styles.actionText}>View details</Text>
                <Icon name="chevron-right" size={14} color={THEME.colors.primary} />
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  const displayedNotifications = inApp ? notifications : [];

  const renderHeader = () => {
    return (
      <View style={styles.preferencesContainer}>
        <Text style={styles.preferencesHeaderTitle}>Notification Preferences</Text>
        <View style={styles.preferencesGrid}>
          {/* Item 1: In-App */}
          <View style={styles.prefGridItem}>
            <View style={styles.prefLeftCol}>
              <Icon name="bell-outline" size={18} color={THEME.colors.primary} style={styles.prefGridIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.prefGridLabel}>In-App</Text>
                <Text style={styles.prefGridDesc}>In-App History</Text>
              </View>
            </View>
            <Switch
              value={inApp}
              onValueChange={() => handleToggle('inApp', inApp)}
              trackColor={{ false: THEME.colors.border, true: THEME.colors.primaryLight }}
              thumbColor={inApp ? THEME.colors.primary : THEME.colors.textMuted}
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
          </View>

          {/* Item 2: Push */}
          <View style={styles.prefGridItem}>
            <View style={styles.prefLeftCol}>
              <Icon name="cellphone-message" size={18} color={THEME.colors.primary} style={styles.prefGridIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.prefGridLabel}>Push</Text>
                <Text style={styles.prefGridDesc}>Mobile Device</Text>
              </View>
            </View>
            <Switch
              value={push}
              onValueChange={() => handleToggle('push', push)}
              trackColor={{ false: THEME.colors.border, true: THEME.colors.primaryLight }}
              thumbColor={push ? THEME.colors.primary : THEME.colors.textMuted}
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
          </View>

          {/* Item 3: Email */}
          <View style={styles.prefGridItem}>
            <View style={styles.prefLeftCol}>
              <Icon name="email-outline" size={18} color={THEME.colors.primary} style={styles.prefGridIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.prefGridLabel}>Email</Text>
                <Text style={styles.prefGridDesc}>Invoices/Receipts</Text>
              </View>
            </View>
            <Switch
              value={email}
              onValueChange={() => handleToggle('email', email)}
              trackColor={{ false: THEME.colors.border, true: THEME.colors.primaryLight }}
              thumbColor={email ? THEME.colors.primary : THEME.colors.textMuted}
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
          </View>

          {/* Item 4: WhatsApp */}
          <View style={styles.prefGridItem}>
            <View style={styles.prefLeftCol}>
              <Icon name="whatsapp" size={18} color="#25D366" style={styles.prefGridIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.prefGridLabel}>WhatsApp</Text>
                <Text style={styles.prefGridDesc}>ETA Updates</Text>
              </View>
            </View>
            <Switch
              value={whatsapp}
              onValueChange={() => handleToggle('whatsapp', whatsapp)}
              trackColor={{ false: THEME.colors.border, true: THEME.colors.primaryLight }}
              thumbColor={whatsapp ? THEME.colors.primary : THEME.colors.textMuted}
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
          </View>
        </View>

        <Text style={styles.historySectionTitle}>Notification History</Text>
      </View>
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
        <Text style={styles.headerTitle}>Notification Preference</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : (
        <FlatList
          data={displayedNotifications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={[styles.listContent, { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 24) + 16 : Math.max(insets.bottom, 16) }]}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchNotifications(true)}
              colors={[THEME.colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Icon name="bell-off-outline" size={44} color={THEME.colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>
                {!inApp ? 'In-App Alerts Disabled' : 'No notifications yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {!inApp
                  ? 'Enable In-App alerts in preferences above to view your notifications history.'
                  : "We'll notify you here when your order is placed, packed, or out for delivery."}
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
    backgroundColor: '#FFF',
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
  backBtn: { padding: THEME.spacing.xs },
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
  listContent: {
    paddingBottom: 40,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginLeft: 74, // Aligns exactly with the start of the text content, bypassing the icon
  },
  notificationRow: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFF',
  },
  unreadRow: {
    backgroundColor: '#FFFBF7', // Ultra subtle Rust Orange tint
  },
  pressedRow: {
    backgroundColor: '#F5F5F5',
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  unreadIconContainer: {
    backgroundColor: THEME.colors.primaryLight,
  },
  readIconContainer: {
    backgroundColor: '#F5F5F5',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  titleText: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  unreadTitleText: {
    color: THEME.colors.text,
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.primary,
    marginLeft: THEME.spacing.sm,
  },
  bodyText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 18.5,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  dateText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  actionLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 12,
    color: THEME.colors.primary,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.spacing.md,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  emptySubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
  },
  preferencesContainer: {
    padding: THEME.spacing.md,
    backgroundColor: '#FAF9F6',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  preferencesHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },
  preferencesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  prefGridItem: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: THEME.borderRadius.sm,
    padding: 8,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...THEME.shadows.light,
  },
  prefLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  prefGridIcon: {
    marginRight: 6,
  },
  prefGridLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  prefGridDesc: {
    fontSize: 8,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },
  historySectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.text,
    marginTop: THEME.spacing.lg,
    paddingHorizontal: THEME.spacing.sm,
  },
});

export default NotificationsScreen;
