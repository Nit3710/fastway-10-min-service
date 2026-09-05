import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  Pressable,
  Modal,
  TextInput,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import THEME from '../theme/theme';
import { RootStackParamList, Product } from '../types';
import { getProducts } from '../api/catalogApi';
import { useCartStore } from '../store/cartStore';
import ProductCard from '../components/ProductCard';
import SkeletonBox from '../components/SkeletonBox';
import CartIcon from '../components/CartIcon';
import EmptyState from '../components/EmptyState';
import Button from '../components/Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import GradientHeader from '../components/GradientHeader';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'ProductList'>;

const PAGE_SIZE = 20;

const GridSkeleton = () => (
  <View style={{ flex: 1, margin: THEME.spacing.xs, maxWidth: '48%' }}>
    <SkeletonBox width="100%" height={120} borderRadius={THEME.borderRadius.md} />
    <SkeletonBox width="80%" height={12} style={{ marginTop: 8 }} />
    <SkeletonBox width="60%" height={12} style={{ marginTop: 6 }} />
  </View>
);

const ProductListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { categoryId, categoryName, addressId } = route.params || {};
  const insets = useSafeAreaInsets();
  const fetchCart = useCartStore((s) => s.fetchCart);

  useFocusEffect(
    useCallback(() => {
      fetchCart();
    }, [fetchCart])
  );

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(0);
  const [isLastPage, setIsLastPage] = useState(false);

  // Filter state
  const [showFilter, setShowFilter] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [appliedMin, setAppliedMin] = useState<number | undefined>();
  const [appliedMax, setAppliedMax] = useState<number | undefined>();
  const [appliedSort, setAppliedSort] = useState<'asc' | 'desc'>('asc');

  const isFetching = useRef(false);

  const fetchProducts = useCallback(
    async (pageNum: number, reset = false) => {
      if (isFetching.current) return;
      isFetching.current = true;
      try {
        setError(false);
        const data = await getProducts({
          page: pageNum,
          size: PAGE_SIZE,
          categoryId,
          minPrice: appliedMin,
          maxPrice: appliedMax,
          sortBy: 'price',
          sortDir: appliedSort,
          addressId,
        });
        if (reset) {
          setProducts(data.content);
        } else {
          setProducts((prev) => [...prev, ...data.content]);
        }
        setIsLastPage(data.last);
        setPage(pageNum);
      } catch (err: any) {
        console.error('Error fetching products in ProductListScreen:', err);
        setError(true);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        isFetching.current = false;
      }
    },
    [categoryId, addressId, appliedMin, appliedMax, appliedSort]
  );

  // Load on mount and when filters change
  React.useEffect(() => {
    setLoading(true);
    setProducts([]);
    setPage(0);
    setIsLastPage(false);
    fetchProducts(0, true);
  }, [fetchProducts]);

  const loadMore = () => {
    if (isLastPage || loadingMore || loading) return;
    setLoadingMore(true);
    fetchProducts(page + 1);
  };

  const applyFilters = () => {
    setAppliedMin(minPrice ? parseFloat(minPrice) : undefined);
    setAppliedMax(maxPrice ? parseFloat(maxPrice) : undefined);
    setAppliedSort(sortDir);
    setShowFilter(false);
  };

  const resetFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    setSortDir('asc');
    setAppliedMin(undefined);
    setAppliedMax(undefined);
    setAppliedSort('asc');
    setShowFilter(false);
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <ProductCard
      product={item}
      onPress={() =>
        navigation.navigate('ProductDetail', {
          productId: item.id,
          productName: item.name,
        })
      }
    />
  );

  const hasFilters = appliedMin !== undefined || appliedMax !== undefined;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={THEME.colors.surface} barStyle="dark-content" />

      {/* Flat Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Icon name="arrow-left" size={24} color={THEME.colors.graphite} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {categoryName || 'All Products'}
        </Text>
        <View style={styles.headerRight}>
          <CartIcon />
          <Pressable onPress={() => setShowFilter(true)} style={styles.filterBtn} hitSlop={8}>
            <Icon name={hasFilters ? "filter" : "filter-outline"} size={22} color={THEME.colors.graphite} />
            {hasFilters && <View style={styles.filterBadge} />}
          </Pressable>
        </View>
      </View>

      {/* Active filter chips */}
      {hasFilters && (
        <View style={styles.filterChips}>
          {appliedMin !== undefined && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>Min: ₹{appliedMin}</Text>
            </View>
          )}
          {appliedMax !== undefined && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>Max: ₹{appliedMax}</Text>
            </View>
          )}
          <Pressable onPress={resetFilters} style={styles.clearBtn} hitSlop={8}>
            <Icon name="close-circle" size={16} color={THEME.colors.error} style={{ marginRight: 4 }} />
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        </View>
      )}

      {/* Product grid */}
      {loading ? (
        <FlatList<number>
          data={[1, 2, 3, 4, 5, 6]}
          numColumns={2}
          keyExtractor={(i) => String(i)}
          renderItem={() => <GridSkeleton />}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
        />
      ) : error ? (
        <EmptyState
          icon="alert-circle-outline"
          message="Failed to load products. Check your connection."
          actionTitle="Try Again"
          onAction={() => { setLoading(true); fetchProducts(0, true); }}
        />
      ) : products.length === 0 ? (
        <EmptyState
          icon="package-variant"
          message={hasFilters ? "No products match your filters." : "No products available in this category."}
          actionTitle={hasFilters ? "Clear Filters" : undefined}
          onAction={hasFilters ? resetFilters : undefined}
        />
      ) : (
        <FlatList<Product>
          data={products}
          numColumns={2}
          keyExtractor={(p) => String(p.id)}
          renderItem={renderProduct}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                color={THEME.colors.primary}
                style={{ marginVertical: THEME.spacing.lg }}
              />
            ) : null
          }
        />
      )}

      {/* Filter Bottom Sheet Modal */}
      <Modal
        visible={showFilter}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilter(false)}
      >
        <View style={styles.modalContainer}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowFilter(false)} />
          <View style={[styles.bottomSheet, { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 24) + 16 : Math.max(insets.bottom, 16) + 12 }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filter &amp; Sort</Text>
              <Pressable onPress={() => setShowFilter(false)} hitSlop={12}>
                <Icon name="close" size={24} color={THEME.colors.text} />
              </Pressable>
            </View>

            <Text style={styles.sheetLabel}>Price Range</Text>
            <View style={styles.priceRow}>
              <TextInput
                style={styles.priceInput}
                placeholder="Min ₹"
                keyboardType="numeric"
                value={minPrice}
                onChangeText={setMinPrice}
                placeholderTextColor={THEME.colors.textMuted}
              />
              <Text style={styles.priceSep}>—</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="Max ₹"
                keyboardType="numeric"
                value={maxPrice}
                onChangeText={setMaxPrice}
                placeholderTextColor={THEME.colors.textMuted}
              />
            </View>

            <Text style={styles.sheetLabel}>Sort by Price</Text>
            <View style={styles.sortRow}>
              {(['asc', 'desc'] as const).map((dir) => (
                <Pressable
                  key={dir}
                  onPress={() => setSortDir(dir)}
                  style={[styles.sortBtn, sortDir === dir && styles.sortBtnActive]}
                >
                  <View style={styles.sortBtnContent}>
                    <Icon
                      name={dir === 'asc' ? 'arrow-up' : 'arrow-down'}
                      size={16}
                      color={sortDir === dir ? THEME.colors.primary : THEME.colors.textSecondary}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.sortBtnText, sortDir === dir && styles.sortBtnTextActive]}>
                      {dir === 'asc' ? 'Low to High' : 'High to Low'}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>

            <View style={styles.sheetActions}>
              <Button
                title="Reset"
                onPress={resetFilters}
                variant="outline"
                style={{ flex: 1 }}
              />
              <Button
                title="Apply"
                onPress={applyFilters}
                variant="primary"
                style={{ flex: 1 }}
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
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.graphite,
    marginHorizontal: THEME.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.sm,
  },
  filterBtn: {
    backgroundColor: THEME.colors.surfaceRaised,
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.sm,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: THEME.colors.error,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterChips: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.sm,
    gap: THEME.spacing.sm,
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  chip: {
    backgroundColor: THEME.colors.surfaceRaised,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  chipText: { 
    color: THEME.colors.graphite, 
    fontSize: 11, 
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  clearText: { 
    color: THEME.colors.error, 
    fontSize: 12, 
    fontWeight: '700' 
  },
  listContent: { 
    padding: THEME.spacing.sm 
  },
  columnWrapper: { 
    justifyContent: 'space-between' 
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: THEME.colors.overlay,
  },
  bottomSheet: {
    backgroundColor: THEME.colors.surface,
    borderTopLeftRadius: THEME.borderRadius.lg,
    borderTopRightRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.lg,
    paddingBottom: 32,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.lg,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  sheetLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.sm,
  },
  priceRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: THEME.spacing.lg 
  },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: THEME.spacing.md,
    height: 44,
    color: THEME.colors.text,
    fontSize: 14,
    fontWeight: '500',
    backgroundColor: THEME.colors.background,
  },
  priceSep: { 
    marginHorizontal: THEME.spacing.sm, 
    color: THEME.colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  sortRow: { 
    flexDirection: 'row', 
    gap: THEME.spacing.sm, 
    marginBottom: THEME.spacing.xl 
  },
  sortBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
  },
  sortBtnActive: { 
    borderColor: THEME.colors.primary, 
    backgroundColor: THEME.colors.primaryLight 
  },
  sortBtnContent: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  sortBtnText: { 
    fontSize: 12, 
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  sortBtnTextActive: { 
    color: THEME.colors.primary, 
    fontWeight: '800' 
  },
  sheetActions: { 
    flexDirection: 'row', 
    gap: THEME.spacing.md 
  },
});

export default ProductListScreen;
