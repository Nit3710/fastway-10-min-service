import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  Image,
  StatusBar,
  SafeAreaView,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import THEME from '../theme/theme';
import { RootStackParamList, Category, Product } from '../types';
import { getCategories, getProducts } from '../api/catalogApi';
import useAuthStore from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useCartStore } from '../store/cartStore';
import ProductCard from '../components/ProductCard';
import CategoryCard from '../components/CategoryCard';
import SkeletonBox from '../components/SkeletonBox';
import CartIcon from '../components/CartIcon';
import { getNotificationsList } from '../api/notificationApi';
import EmptyState from '../components/EmptyState';
import Card from '../components/Card';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EmergencyHelpFAB from '../components/EmergencyHelpFAB';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const CategorySkeleton = () => (
  <View style={{ marginRight: THEME.spacing.sm, alignItems: 'center' }}>
    <SkeletonBox width={80} height={94} borderRadius={THEME.borderRadius.md} />
  </View>
);

const ProductSkeleton = () => (
  <View style={{ width: 140, marginRight: THEME.spacing.md }}>
    <SkeletonBox width={140} height={100} borderRadius={THEME.borderRadius.lg} />
    <SkeletonBox width={120} height={12} style={{ marginTop: 8 }} />
    <SkeletonBox width={70} height={12} style={{ marginTop: 6 }} />
  </View>
);

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_WIDTH = SCREEN_WIDTH - 32; // margin 16 each side

const BANNERS = [
  {
    id: '1',
    tag: 'WORKSHOP DEALS',
    title: 'PROFESSIONAL GRADE TOOLS & ACCS',
    subtitle: 'Get direct on-site delivery in 10 minutes',
    btnText: 'EXPLORE PRODUCTS',
    icon: 'hammer-wrench',
  },
  {
    id: '2',
    tag: 'PREMIUM FITTINGS',
    title: 'BRONZE, BRASS & CHROME FIXTURES',
    subtitle: 'Upgrade to high-durability luxury fittings',
    btnText: 'VIEW FITTINGS',
    icon: 'shower-head',
  },
  {
    id: '3',
    tag: 'CONTRACTOR VALUE',
    title: 'TOP-GRADE CPVC & UPVC PIPING',
    subtitle: 'Direct warehouse bundle pricing in stock',
    btnText: 'EXPLORE PIPES',
    icon: 'pipe',
  },
];

interface BannerCarouselProps {
  onPressBanner: () => void;
}

const BannerCarousel: React.FC<BannerCarouselProps> = ({ onPressBanner }) => {
  const scrollRef = useRef<ScrollView>(null);
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const next = (slideIndex + 1) % BANNERS.length;
      setSlideIndex(next);
      scrollRef.current?.scrollTo({ x: next * CAROUSEL_WIDTH, animated: true });
    }, 3000);
    return () => clearInterval(interval);
  }, [slideIndex]);

  const onScrollEnd = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / CAROUSEL_WIDTH);
    setSlideIndex(idx);
  };

  return (
    <View style={styles.carouselWrapper}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={CAROUSEL_WIDTH}
        snapToAlignment="center"
      >
        {BANNERS.map((banner) => (
          <Pressable
            key={banner.id}
            style={[styles.carouselSlide, { width: CAROUSEL_WIDTH }]}
            onPress={onPressBanner}
          >
            <View style={styles.featuredTextCol}>
              <Text style={styles.featuredTag}>{banner.tag}</Text>
              <Text style={styles.featuredTitle}>{banner.title}</Text>
              <Text style={styles.featuredSubtitle}>{banner.subtitle}</Text>
              <View style={styles.featuredBtn}>
                <Text style={styles.featuredBtnText}>{banner.btnText}</Text>
              </View>
            </View>
            <View style={styles.featuredIconCol}>
              <Icon name={banner.icon} size={42} color={THEME.colors.brass} />
            </View>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.carouselCounter}>
        <Text style={styles.carouselCounterText}>
          {slideIndex + 1}/{BANNERS.length}
        </Text>
      </View>
    </View>
  );
};

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const fetchCart = useCartStore((s) => s.fetchCart);
  const { showToast } = useToastStore();

  const [customKits, setCustomKits] = useState<{ name: string; items: { productId: number; name: string; qty: number }[] }[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadCustomKits();
    }, [])
  );

  const loadCustomKits = async () => {
    try {
      const saved = await AsyncStorage.getItem('fastway_custom_kits');
      if (saved) {
        setCustomKits(JSON.parse(saved));
      } else {
        setCustomKits([]);
      }
    } catch (err) {
      console.warn('Failed to load custom kits:', err);
    }
  };

  const handleAddCustomKit = async (kit: { name: string; items: { productId: number; name: string; qty: number }[] }) => {
    const addItem = useCartStore.getState().addItem;
    try {
      showToast(`Adding kit "${kit.name}" to cart...`, 'success');
      for (const item of kit.items) {
        await addItem(item.productId, item.qty);
      }
      showToast('Kit added successfully!', 'success');
      navigation.navigate('Cart');
    } catch {
      showToast('Failed to add kit to cart', 'error');
    }
  };

  const handleAddPreconfiguredKit = async (type: 'geyser' | 'basin') => {
    const addItem = useCartStore.getState().addItem;
    try {
      showToast('Adding project kit to cart...', 'success');
      
      const res = await getProducts({ page: 0, size: 50 });
      const catProducts = res.content || [];
      
      let itemsToAdd: { productId: number; qty: number }[] = [];
      
      if (type === 'geyser') {
        const valve = catProducts.find(p => p.name.toLowerCase().includes('valve'));
        const pipe = catProducts.find(p => p.name.toLowerCase().includes('pipe') || p.name.toLowerCase().includes('hose'));
        const tape = catProducts.find(p => p.name.toLowerCase().includes('tape') || p.name.toLowerCase().includes('teflon'));
        
        if (valve) itemsToAdd.push({ productId: valve.id, qty: 2 });
        if (pipe) itemsToAdd.push({ productId: pipe.id, qty: 2 });
        if (tape) itemsToAdd.push({ productId: tape.id, qty: 1 });
      } else {
        const faucet = catProducts.find(p => p.name.toLowerCase().includes('faucet') || p.name.toLowerCase().includes('tap'));
        const coupling = catProducts.find(p => p.name.toLowerCase().includes('coupling') || p.name.toLowerCase().includes('waste'));
        const pipe = catProducts.find(p => p.name.toLowerCase().includes('pipe') || p.name.toLowerCase().includes('hose'));
        
        if (faucet) itemsToAdd.push({ productId: faucet.id, qty: 1 });
        if (coupling) itemsToAdd.push({ productId: coupling.id, qty: 1 });
        if (pipe) itemsToAdd.push({ productId: pipe.id, qty: 1 });
      }
      
      if (itemsToAdd.length === 0 && catProducts.length > 0) {
        itemsToAdd.push({ productId: catProducts[0].id, qty: 1 });
      }

      if (itemsToAdd.length === 0) {
        showToast('No products available to compile kit', 'error');
        return;
      }

      for (const item of itemsToAdd) {
        await addItem(item.productId, item.qty);
      }
      
      showToast('Project kit added to cart', 'success');
      navigation.navigate('Cart');
    } catch {
      showToast('Failed to add kit to cart', 'error');
    }
  };

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingProds, setLoadingProds] = useState(true);
  const [errorCats, setErrorCats] = useState(false);
  const [errorProds, setErrorProds] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeBooking, setActiveBooking] = useState<any>(null);

  const fetchCategories = async () => {
    try {
      setErrorCats(false);
      const data = await getCategories();
      // FILTER OUT leftover test/seed data like "API Test Category"
      const filtered = data.filter((c) => c.name !== 'API Test Category');
      setCategories(filtered);
    } catch {
      setErrorCats(true);
    } finally {
      setLoadingCats(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setErrorProds(false);
      const data = await getProducts({ page: 0, size: 10 });
      setProducts(data.content);
    } catch {
      setErrorProds(true);
    } finally {
      setLoadingProds(false);
    }
  };

  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await getNotificationsList(0, 50);
      const unread = data.content.filter((n) => !n.isRead).length;
      setUnreadCount(unread);
    } catch (e) {}
  }, []);

  const checkActiveBooking = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem('fastway_service_bookings');
      if (saved) {
        const list = JSON.parse(saved);
        if (list && list.length > 0) {
          const active = list.find((b: any) => b.status !== 'COMPLETED' && b.status !== 'CANCELLED');
          setActiveBooking(active || null);
        } else {
          setActiveBooking(null);
        }
      } else {
        setActiveBooking(null);
      }
    } catch (e) {
      setActiveBooking(null);
    }
  }, []);

  const loadAll = useCallback(() => {
    setLoadingCats(true);
    setLoadingProds(true);
    fetchCategories();
    fetchProducts();
    fetchUnreadCount();
    checkActiveBooking();
  }, [fetchUnreadCount, checkActiveBooking]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
      fetchCart();
      checkActiveBooking();
    }, [loadAll, fetchCart, checkActiveBooking])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchCategories(), fetchProducts(), fetchUnreadCount(), checkActiveBooking()]);
    setRefreshing(false);
  };

  const renderCategory = ({ item }: { item: Category }) => (
    <CategoryCard
      name={item.name}
      imageUrl={item.imageUrl}
      onPress={() =>
        navigation.navigate('ProductList', {
          categoryId: item.id,
          categoryName: item.name,
        })
      }
    />
  );

  const renderProduct = ({ item }: { item: Product }) => (
    <ProductCard
      product={item}
      compact
      onPress={() =>
        navigation.navigate('ProductDetail', {
          productId: item.id,
          productName: item.name,
        })
      }
    />
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={THEME.colors.background} barStyle="dark-content" />
      <FlatList
        data={[1]}
        keyExtractor={() => 'home'}
        contentContainerStyle={{ paddingBottom: THEME.spacing.sm }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[THEME.colors.brass]}
            tintColor={THEME.colors.brass}
          />
        }
        renderItem={() => (
          <View style={styles.container}>
            {/* Minimal Header (Evokes specs/blueprint look, no heavy banners) */}
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
              <View style={styles.headerLeft}>
                <View style={styles.locationRow}>
                  <Icon name="map-marker-outline" size={16} color={THEME.colors.brass} />
                  <Text style={styles.locationLabel} numberOfLines={1}>
                    {user?.name ? `Hi, ${user.name.split(' ')[0]} 👋` : 'Your Location'}
                  </Text>
                </View>
              </View>
              <View style={styles.headerRight}>
                <EmergencyHelpFAB variant="header" />
                <Pressable onPress={() => navigation.navigate('Notifications')} style={styles.bellBtn}>
                  {/* Outline icon */}
                  <Icon name="bell-outline" size={20} color={THEME.colors.graphite} />
                  {unreadCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{unreadCount}</Text>
                    </View>
                  )}
                </Pressable>
                <CartIcon />
              </View>
            </View>

            {/* Rectangular Search Bar (Outline only, no fill, 8px radius) */}
            <Pressable
              style={styles.searchBar}
              onPress={() => navigation.navigate('Search')}
            >
              <Icon name="magnify" size={20} color={THEME.colors.graphiteMuted} style={{ marginRight: THEME.spacing.sm }} />
              <Text style={styles.searchPlaceholder} numberOfLines={1}>
                Search plumbing, sanitary fittings, tools...
              </Text>
            </Pressable>

            {/* Ultra-Modern Quick Access Shortcut Grid (1-Tap Direct Actions) */}
            <View style={styles.modernShortcutsGrid}>
              <Pressable
                style={({ pressed }) => [styles.modernShortcutCard, pressed && styles.pressedShortcut]}
                onPress={() => navigation.navigate('ProductList', { categoryName: 'Pipes & Fittings' })}
              >
                <View style={styles.modernShortcutIconBox}>
                  <Icon name="pipe" size={22} color={THEME.colors.brass} />
                </View>
                <Text style={styles.modernShortcutLabel}>Pipes & Fittings</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.modernShortcutCard, pressed && styles.pressedShortcut]}
                onPress={() => navigation.navigate('ProductList', { categoryName: 'Taps & Valves' })}
              >
                <View style={styles.modernShortcutIconBox}>
                  <Icon name="shower-head" size={22} color={THEME.colors.brass} />
                </View>
                <Text style={styles.modernShortcutLabel}>Taps & Valves</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.modernShortcutCard, pressed && styles.pressedShortcut]}
                onPress={() => navigation.navigate('BookService')}
              >
                <View style={[styles.modernShortcutIconBox, { backgroundColor: THEME.colors.graphite }]}>
                  <Icon name="account-wrench" size={22} color="#FFF" />
                </View>
                <Text style={styles.modernShortcutLabel}>Book Plumber</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.modernShortcutCard, pressed && styles.pressedShortcut]}
                onPress={() => navigation.navigate('Calculator')}
              >
                <View style={[styles.modernShortcutIconBox, { backgroundColor: THEME.colors.brass }]}>
                  <Icon name="ruler-square" size={22} color="#FFF" />
                </View>
                <Text style={styles.modernShortcutLabel}>Estimator</Text>
              </Pressable>
            </View>

            {/* Polished Trust Signals Row */}
            <View style={styles.trustRow}>
              <View style={styles.trustItem}>
                <Icon name="flash-outline" size={12} color={THEME.colors.brass} />
                <Text style={styles.trustText}>10 MIN DELIVERY</Text>
              </View>
              <View style={styles.trustDivider} />
              <View style={styles.trustItem}>
                <Icon name="shield-check-outline" size={12} color={THEME.colors.brass} />
                <Text style={styles.trustText}>100% GENUINE</Text>
              </View>
              <View style={styles.trustDivider} />
              <View style={styles.trustItem}>
                <Icon name="swap-horizontal" size={12} color={THEME.colors.brass} />
                <Text style={styles.trustText}>EASY RETURNS</Text>
              </View>
            </View>

            {/* Active Plumber Visit Banner */}
            {activeBooking && (
              <Card style={styles.activeBookingCard} elevation="none">
                <View style={styles.activeBookingHeader}>
                  <View style={styles.activeBookingStatusRow}>
                    <View style={styles.activeBookingLed} />
                    <Text style={styles.activeBookingTitle}>ACTIVE PLUMBER VISIT BOOKED</Text>
                  </View>
                  <Text style={styles.activeBookingId}>{activeBooking.id}</Text>
                </View>

                <View style={styles.activeBookingMain}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activeBookingService}>{activeBooking.serviceType.toUpperCase()}</Text>
                    <Text style={styles.activeBookingDesc} numberOfLines={1}>
                      {activeBooking.description}
                    </Text>
                    <View style={styles.activeBookingTimeRow}>
                      <Icon name="clock-outline" size={14} color={THEME.colors.brass} style={{ marginRight: 4 }} />
                      <Text style={styles.activeBookingTimeText}>{activeBooking.date} • {activeBooking.slot}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.activeBookingActions}>
                  <Pressable
                    onPress={() => navigation.navigate('TrackPlumber', { bookingId: activeBooking.id })}
                    style={styles.activeBookingTrackBtn}
                  >
                    <Icon name="map-marker-distance" size={16} color="#FFF" style={{ marginRight: 6 }} />
                    <Text style={styles.activeBookingTrackText}>TRACK LIVE</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => navigation.navigate('BookingsList')}
                    style={styles.activeBookingDetailBtn}
                  >
                    <Text style={styles.activeBookingDetailText}>VIEW ALL</Text>
                  </Pressable>
                </View>
              </Card>
            )}

            {/* Themed Workshop Banner Carousel */}
            <BannerCarousel onPressBanner={() => navigation.navigate('ProductList', {})} />

            {/* Categories list */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Shop by Category</Text>
                <Pressable onPress={() => navigation.navigate('ProductList', {})}>
                  <Text style={styles.seeAll}>SEE ALL</Text>
                </Pressable>
              </View>

              {loadingCats ? (
                <FlatList<number>
                  horizontal
                  data={[1, 2, 3, 4, 5]}
                  keyExtractor={(i) => String(i)}
                  renderItem={() => <CategorySkeleton />}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.hList}
                />
              ) : errorCats ? (
                <EmptyState
                  icon="alert-circle-outline"
                  message="Couldn't load categories"
                  actionTitle="Try Again"
                  onAction={fetchCategories}
                />
              ) : categories.length === 0 ? (
                <EmptyState icon="folder-outline" message="No categories available" />
              ) : (
                <FlatList<Category>
                  horizontal
                  data={categories}
                  keyExtractor={(c) => String(c.id)}
                  renderItem={renderCategory}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.hList}
                />
              )}
            </View>

            {/* Trending Products list (MOVED UP FOR FAST BUYING) */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon name="fire" size={18} color={THEME.colors.amber} style={{ marginRight: 6 }} />
                  <Text style={styles.sectionTitle}>Trending Products</Text>
                </View>
                <Pressable onPress={() => navigation.navigate('ProductList', {})}>
                  <Text style={styles.seeAll}>SEE ALL</Text>
                </Pressable>
              </View>

              {loadingProds ? (
                <FlatList<number>
                  horizontal
                  data={[1, 2, 3, 4]}
                  keyExtractor={(i) => String(i)}
                  renderItem={() => <ProductSkeleton />}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.hList}
                />
              ) : errorProds ? (
                <EmptyState
                  icon="alert-circle-outline"
                  message="Couldn't load products"
                  actionTitle="Try Again"
                  onAction={fetchProducts}
                />
              ) : products.length === 0 ? (
                <EmptyState icon="package-variant-closed" message="No products available yet" />
              ) : (
                <FlatList
                  horizontal
                  data={products}
                  keyExtractor={(p) => String(p.id)}
                  renderItem={renderProduct}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.hList}
                />
              )}
            </View>

            {/* Preconfigured Project Kits */}
            <View style={[styles.section, !customKits.length && { marginBottom: THEME.spacing.xxxl }]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>PRE-LOADED PROJECT KITS</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.kitListContainer}
              >
                {/* Kit A: Geyser Kit */}
                <Card style={styles.kitCard} elevation="none">
                  <View style={styles.kitIconBadge}>
                    <Icon name="water-boiler" size={22} color={THEME.colors.brass} />
                  </View>
                  <Text style={styles.kitCardTitle}>GEYSER CONNECTION KIT</Text>
                  <Text style={styles.kitCardDesc}>Includes 2 connection hoses, 2 angle valves, teflon tape.</Text>
                  <Pressable onPress={() => handleAddPreconfiguredKit('geyser')} style={styles.kitCardBtn}>
                    <Text style={styles.kitCardBtnText}>ADD TO CART</Text>
                  </Pressable>
                </Card>

                {/* Kit B: Washbasin Kit */}
                <Card style={styles.kitCard} elevation="none">
                  <View style={styles.kitIconBadge}>
                    <Icon name="sink" size={22} color={THEME.colors.brass} />
                  </View>
                  <Text style={styles.kitCardTitle}>WASHBASIN FITTING KIT</Text>
                  <Text style={styles.kitCardDesc}>Includes mixer faucet, waste coupling, connection hose.</Text>
                  <Pressable onPress={() => handleAddPreconfiguredKit('basin')} style={styles.kitCardBtn}>
                    <Text style={styles.kitCardBtnText}>ADD TO CART</Text>
                  </Pressable>
                </Card>
              </ScrollView>
            </View>

            {/* Custom Saved Kits */}
            {customKits.length > 0 && (
              <View style={[styles.section, { marginBottom: THEME.spacing.xxxl }]}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>YOUR SAVED PROJECT KITS</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.kitListContainer}
                >
                  {customKits.map((kit, index) => (
                    <Card key={`${kit.name}-${index}`} style={styles.kitCard} elevation="none">
                      <View style={[styles.kitIconBadge, { backgroundColor: THEME.colors.surfaceRaised }]}>
                        <Icon name="folder-star" size={22} color={THEME.colors.graphite} />
                      </View>
                      <Text style={styles.kitCardTitle}>{kit.name.toUpperCase()}</Text>
                      <Text style={styles.kitCardDesc}>Contains {kit.items.length} materials selected for your project site.</Text>
                      <Pressable onPress={() => handleAddCustomKit(kit)} style={[styles.kitCardBtn, { backgroundColor: THEME.colors.graphite }]}>
                        <Text style={styles.kitCardBtnText}>ADD KIT TO CART</Text>
                      </Pressable>
                    </Card>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: THEME.colors.background 
  },
  container: { 
    flex: 1 
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: THEME.spacing.sm,
    backgroundColor: 'transparent',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 200,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.graphite,
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    marginHorizontal: THEME.spacing.lg,
    marginVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.lg, // 8px radius
    paddingHorizontal: THEME.spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  searchPlaceholder: {
    fontSize: 13,
    color: THEME.colors.graphiteMuted,
    flex: 1,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: THEME.spacing.md,
    gap: 8,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustText: {
    fontSize: 9,
    fontWeight: '700',
    color: THEME.colors.graphiteMuted,
    letterSpacing: 0.3,
  },
  trustDivider: {
    width: 1,
    height: 10,
    backgroundColor: THEME.colors.border,
  },
  carouselWrapper: {
    marginHorizontal: THEME.spacing.lg,
    marginVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.lg, // 8px
    borderWidth: 1,
    borderColor: THEME.colors.border,
    overflow: 'hidden',
    backgroundColor: THEME.colors.graphite,
    position: 'relative',
  },
  carouselSlide: {
    padding: THEME.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  carouselCounter: {
    position: 'absolute',
    bottom: 8,
    right: 12,
  },
  carouselCounterText: {
    fontSize: 9,
    fontWeight: '700',
    color: THEME.colors.brass,
    letterSpacing: 0.5,
  },
  featuredTextCol: {
    flex: 1,
    paddingRight: THEME.spacing.sm,
  },
  featuredTag: {
    fontSize: 9,
    fontWeight: '700',
    color: THEME.colors.brass,
    marginBottom: 4,
    letterSpacing: 1,
  },
  featuredTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
    lineHeight: 18,
  },
  featuredSubtitle: {
    fontSize: 11,
    color: '#D1CDCA',
    marginBottom: THEME.spacing.md,
  },
  featuredBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: THEME.colors.brass,
    borderRadius: THEME.borderRadius.xs, // 2px
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.xs,
  },
  featuredBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.brass,
    letterSpacing: 0.5,
  },
  featuredIconCol: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginTop: THEME.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    color: THEME.colors.graphite,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  seeAll: {
    fontSize: 11,
    color: THEME.colors.brass,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  hList: { 
    paddingHorizontal: THEME.spacing.lg 
  },
  bellBtn: {
    position: 'relative',
    padding: 6,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: THEME.colors.error,
    borderRadius: 8,
    width: 15,
    height: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.background,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '900',
  },
  estimatorTile: {
    marginHorizontal: THEME.spacing.lg,
    marginVertical: THEME.spacing.sm,
    backgroundColor: THEME.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.sm,
    padding: THEME.spacing.md,
  },
  estimatorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  estimatorBadge: {
    alignSelf: 'flex-start',
    backgroundColor: THEME.colors.brass,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.xs,
    marginBottom: 6,
  },
  estimatorBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.3,
  },
  estimatorTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.graphite,
    letterSpacing: 0.5,
  },
  estimatorSubtitle: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    lineHeight: 13,
  },
  estimatorIconContainer: {
    alignItems: 'center',
    marginLeft: THEME.spacing.sm,
  },
  kitListContainer: {
    paddingHorizontal: THEME.spacing.lg,
    gap: THEME.spacing.md,
    paddingVertical: THEME.spacing.xs,
  },
  kitCard: {
    width: 200,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.sm,
  },
  kitIconBadge: {
    width: 38,
    height: 38,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: '#F9F8F6',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: THEME.spacing.sm,
  },
  kitCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.graphite,
    letterSpacing: 0.3,
  },
  kitCardDesc: {
    fontSize: 9,
    color: THEME.colors.textSecondary,
    marginTop: 4,
    lineHeight: 12,
    height: 36,
  },
  kitCardBtn: {
    backgroundColor: THEME.colors.brass,
    height: 32,
    borderRadius: THEME.borderRadius.xs,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: THEME.spacing.sm,
  },
  kitCardBtnText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  activeBookingCard: {
    marginHorizontal: THEME.spacing.lg,
    marginVertical: THEME.spacing.sm,
    padding: THEME.spacing.md,
    backgroundColor: '#FAF9F6',
    borderWidth: 1.5,
    borderColor: THEME.colors.brass,
    borderRadius: THEME.borderRadius.sm,
  },
  activeBookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  activeBookingStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeBookingLed: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  activeBookingTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.brass,
    letterSpacing: 0.5,
  },
  activeBookingId: {
    fontFamily: THEME.typography.price.fontFamily,
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.graphiteMuted,
  },
  activeBookingMain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.sm,
  },
  activeBookingService: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.graphite,
  },
  activeBookingDesc: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  activeBookingTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  activeBookingTimeText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.graphite,
  },
  activeBookingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: THEME.spacing.xs,
  },
  activeBookingTrackBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    backgroundColor: THEME.colors.brass,
    borderRadius: THEME.borderRadius.xs,
    marginRight: 8,
  },
  activeBookingTrackText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  activeBookingDetailBtn: {
    paddingHorizontal: 14,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.xs,
    backgroundColor: '#FFF',
  },
  activeBookingDetailText: {
    color: THEME.colors.graphite,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  quickToolsRow: {
    flexDirection: 'row',
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.md,
    gap: THEME.spacing.md,
  },
  quickToolCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    alignItems: 'center',
  },
  quickToolBadge: {
    backgroundColor: THEME.colors.brass,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.xs,
  },
  quickToolBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  quickToolTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.graphite,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  quickToolSubtitle: {
    fontSize: 9,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  modernShortcutsGrid: {
    flexDirection: 'row',
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.xs,
    marginBottom: THEME.spacing.xs,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modernShortcutCard: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 2,
  },
  modernShortcutIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    ...THEME.shadows.light,
  },
  modernShortcutLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.graphite,
    textAlign: 'center',
    lineHeight: 12,
  },
  pressedShortcut: {
    transform: [{ scale: 0.94 }],
    opacity: 0.9,
  },
});

export default HomeScreen;
