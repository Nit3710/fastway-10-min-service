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
  Animated,
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
const CAROUSEL_WIDTH = SCREEN_WIDTH - 32;

const BANNERS = [
  {
    id: '1',
    tag: '🔥 50% OFF WORKSHOP DEAL',
    title: 'PROFESSIONAL GRADE TOOLS & ACCS',
    subtitle: 'On-site delivery guaranteed in 10 minutes',
    btnText: 'EXPLORE PRODUCTS',
    icon: 'hammer-wrench',
    color: '#1E1D1B',
  },
  {
    id: '2',
    tag: '⭐ LUXURY FITTINGS',
    title: 'BRONZE, BRASS & CHROME FIXTURES',
    subtitle: 'Upgrade to high-durability luxury fittings',
    btnText: 'VIEW FITTINGS',
    icon: 'shower-head',
    color: '#262421',
  },
  {
    id: '3',
    tag: '📦 BULK CONTRACTOR VALUE',
    title: 'TOP-GRADE CPVC & UPVC PIPING',
    subtitle: 'Direct warehouse bundle pricing in stock',
    btnText: 'EXPLORE PIPES',
    icon: 'pipe',
    color: '#1B261E',
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
    }, 3200);
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
            style={[styles.carouselSlide, { width: CAROUSEL_WIDTH, backgroundColor: banner.color }]}
            onPress={onPressBanner}
          >
            <View style={styles.featuredTextCol}>
              <View style={styles.featuredTagBadge}>
                <Text style={styles.featuredTag}>{banner.tag}</Text>
              </View>
              <Text style={styles.featuredTitle}>{banner.title}</Text>
              <Text style={styles.featuredSubtitle}>{banner.subtitle}</Text>
              <View style={styles.featuredBtn}>
                <Text style={styles.featuredBtnText}>{banner.btnText}</Text>
                <Icon name="arrow-right" size={12} color={THEME.colors.brass} style={{ marginLeft: 4 }} />
              </View>
            </View>
            <View style={styles.featuredIconCol}>
              <Icon name={banner.icon} size={44} color={THEME.colors.brass} />
            </View>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.carouselCounter}>
        {BANNERS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.carouselDot,
              i === slideIndex && styles.carouselDotActive,
            ]}
          />
        ))}
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

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 70,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const fetchCategories = async () => {
    try {
      setErrorCats(false);
      const data = await getCategories();
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
        contentContainerStyle={{ paddingBottom: THEME.spacing.md }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[THEME.colors.brass]}
            tintColor={THEME.colors.brass}
          />
        }
        renderItem={() => (
          <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            
            {/* Header: Location & Profile Greeting */}
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
              <View style={styles.headerLeft}>
                <Text style={styles.welcomeGreeting}>
                  {user?.name ? `Hi, ${user.name.split(' ')[0]} 👋` : 'Welcome to Fastway'}
                </Text>
                <View style={styles.locationRow}>
                  <Icon name="map-marker" size={16} color={THEME.colors.brass} />
                  <Text style={styles.locationLabel} numberOfLines={1}>
                    Civil Lines, Sector 4 • 10 Mins
                  </Text>
                  <Icon name="chevron-down" size={14} color={THEME.colors.graphiteMuted} />
                </View>
              </View>
              <View style={styles.headerRight}>
                <EmergencyHelpFAB variant="header" />
                <Pressable onPress={() => navigation.navigate('Notifications')} style={styles.bellBtn}>
                  <Icon name="bell-outline" size={22} color={THEME.colors.graphite} />
                  {unreadCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{unreadCount}</Text>
                    </View>
                  )}
                </Pressable>
                <CartIcon />
              </View>
            </View>

            {/* Search Bar with Brass Accent */}
            <Pressable
              style={styles.searchBar}
              onPress={() => navigation.navigate('Search')}
            >
              <Icon name="magnify" size={22} color={THEME.colors.brass} style={{ marginRight: THEME.spacing.sm }} />
              <Text style={styles.searchPlaceholder} numberOfLines={1}>
                Search plumbing, sanitary fittings, tools...
              </Text>
              <View style={styles.searchMicBadge}>
                <Icon name="filter-variant" size={16} color={THEME.colors.graphite} />
              </View>
            </Pressable>

            {/* Micro-Trust Signals Row */}
            <View style={styles.trustRow}>
              <View style={styles.trustItem}>
                <Icon name="flash-outline" size={13} color={THEME.colors.brass} />
                <Text style={styles.trustText}>10 MIN DELIVERY</Text>
              </View>
              <View style={styles.trustDivider} />
              <View style={styles.trustItem}>
                <Icon name="shield-check-outline" size={13} color={THEME.colors.brass} />
                <Text style={styles.trustText}>100% GENUINE</Text>
              </View>
              <View style={styles.trustDivider} />
              <View style={styles.trustItem}>
                <Icon name="swap-horizontal" size={13} color={THEME.colors.brass} />
                <Text style={styles.trustText}>EASY RETURNS</Text>
              </View>
            </View>

            {/* Active Plumber Visit Compact Live Strip */}
            {activeBooking && (
              <Pressable
                onPress={() => navigation.navigate('TrackPlumber', { bookingId: activeBooking.id })}
                style={styles.activeBookingStrip}
              >
                <View style={styles.activeBookingStripLeft}>
                  <View style={styles.activeBookingLed} />
                  <Icon name="account-wrench" size={18} color={THEME.colors.brass} style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activeBookingStripTitle} numberOfLines={1}>
                      PLUMBER BOOKED • {activeBooking.serviceType.toUpperCase()}
                    </Text>
                    <Text style={styles.activeBookingStripTime} numberOfLines={1}>
                      {activeBooking.date} • {activeBooking.slot}
                    </Text>
                  </View>
                </View>
                <View style={styles.activeBookingTrackPill}>
                  <Text style={styles.activeBookingTrackPillText}>TRACK LIVE</Text>
                  <Icon name="chevron-right" size={14} color="#FFF" />
                </View>
              </Pressable>
            )}

            {/* Themed Hero Banner Carousel */}
            <BannerCarousel onPressBanner={() => navigation.navigate('ProductList', {})} />

            {/* Shop by Category */}
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

            {/* Compact Express Plumber Booking Strip */}
            <Pressable
              onPress={() => navigation.navigate('BookService')}
              style={({ pressed }) => [styles.plumberExpressStrip, pressed && { opacity: 0.92 }]}
            >
              <View style={styles.plumberStripLeft}>
                <View style={styles.plumberStripIconBox}>
                  <Icon name="account-hard-hat" size={18} color={THEME.colors.brass} />
                </View>
                <View style={{ flex: 1, paddingRight: 6 }}>
                  <Text style={styles.plumberStripTitle} numberOfLines={1}>
                    Need an Emergency Plumber?
                  </Text>
                  <Text style={styles.plumberStripSubtitle} numberOfLines={1}>
                    Verified experts arrive in ~15 mins • 4.9★ Rated
                  </Text>
                </View>
              </View>
              <View style={styles.plumberStripCta}>
                <Text style={styles.plumberStripCtaText}>BOOK NOW</Text>
                <Icon name="chevron-right" size={12} color="#FFF" />
              </View>
            </Pressable>

            {/* Trending Products & Flash Sale List */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon name="fire" size={18} color={THEME.colors.amber} style={{ marginRight: 6 }} />
                  <Text style={styles.sectionTitle}>Trending Deals</Text>
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

            {/* 1-Tap Preconfigured Project Repair Kits */}
            <View style={[styles.section, !customKits.length && { marginBottom: THEME.spacing.xl }]}>
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
              <View style={[styles.section, { marginBottom: THEME.spacing.xl }]}>
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

          </Animated.View>
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
    paddingBottom: THEME.spacing.xs,
    backgroundColor: 'transparent',
  },
  headerLeft: {
    flex: 1,
  },
  welcomeGreeting: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.graphiteMuted,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 220,
    marginTop: 1,
  },
  locationLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.graphite,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: THEME.spacing.lg,
    marginVertical: THEME.spacing.xs,
    borderRadius: THEME.borderRadius.lg,
    paddingHorizontal: THEME.spacing.md,
    height: 46,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.light,
  },
  searchPlaceholder: {
    fontSize: 13,
    color: THEME.colors.graphiteMuted,
    flex: 1,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  searchMicBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#F5F3F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: THEME.spacing.sm,
    gap: 8,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustText: {
    fontSize: 9,
    fontWeight: '800',
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
    marginVertical: THEME.spacing.xs,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    overflow: 'hidden',
    position: 'relative',
    ...THEME.shadows.light,
  },
  carouselSlide: {
    padding: THEME.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  carouselCounter: {
    position: 'absolute',
    bottom: 10,
    right: 14,
    flexDirection: 'row',
    gap: 4,
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  carouselDotActive: {
    width: 14,
    backgroundColor: THEME.colors.brass,
  },
  featuredTextCol: {
    flex: 1,
    paddingRight: THEME.spacing.sm,
  },
  featuredTagBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(232, 163, 61, 0.18)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  featuredTag: {
    fontSize: 9,
    fontWeight: '900',
    color: THEME.colors.brass,
    letterSpacing: 0.5,
  },
  featuredTitle: {
    fontSize: 15,
    fontWeight: '800',
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
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: THEME.colors.brass,
    borderRadius: THEME.borderRadius.xs,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.xs,
    backgroundColor: 'rgba(168, 125, 74, 0.1)',
  },
  featuredBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.brass,
    letterSpacing: 0.5,
  },
  featuredIconCol: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginTop: THEME.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.xs,
  },
  sectionTitle: {
    fontSize: 13,
    color: THEME.colors.graphite,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  seeAll: {
    fontSize: 11,
    color: THEME.colors.brass,
    fontWeight: '800',
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
    borderRadius: THEME.borderRadius.md,
    backgroundColor: '#FFF',
    ...THEME.shadows.light,
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
  activeBookingStrip: {
    marginHorizontal: THEME.spacing.lg,
    marginVertical: THEME.spacing.xs,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 8,
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: THEME.colors.brass,
    borderRadius: THEME.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...THEME.shadows.light,
  },
  activeBookingStripLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  activeBookingLed: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 8,
  },
  activeBookingStripTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.graphite,
  },
  activeBookingStripTime: {
    fontSize: 9,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  activeBookingTrackPill: {
    backgroundColor: THEME.colors.brass,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeBookingTrackPillText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginRight: 2,
  },
  plumberExpressStrip: {
    marginHorizontal: THEME.spacing.lg,
    marginVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 10,
    backgroundColor: '#262421',
    borderRadius: THEME.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: THEME.colors.brass,
    ...THEME.shadows.light,
  },
  plumberStripLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  plumberStripIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E1D1B',
    borderWidth: 1,
    borderColor: THEME.colors.brass,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  plumberStripTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFF',
  },
  plumberStripSubtitle: {
    fontSize: 9,
    color: '#D1CDCA',
    marginTop: 1,
  },
  plumberStripCta: {
    backgroundColor: THEME.colors.brass,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  plumberStripCtaText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
    marginRight: 2,
  },
});

export default HomeScreen;
