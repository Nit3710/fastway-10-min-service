import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  TextInput,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import THEME from '../theme/theme';
import { RootStackParamList, Product } from '../types';
import { getProductById, getProducts } from '../api/catalogApi';
import { getReviews, getRatingStats, addReview, ReviewResponse, ProductRatingStats } from '../api/reviewApi';
import { useCartStore } from '../store/cartStore';
import useAuthStore from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import ProductCard from '../components/ProductCard';
import SkeletonBox from '../components/SkeletonBox';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import Button from '../components/Button';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'ProductDetail'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DetailSkeleton = () => (
  <View style={{ padding: THEME.spacing.lg }}>
    <SkeletonBox width={SCREEN_WIDTH - 32} height={260} borderRadius={THEME.borderRadius.md} />
    <SkeletonBox width="60%" height={22} style={{ marginTop: THEME.spacing.lg }} />
    <SkeletonBox width="40%" height={16} style={{ marginTop: THEME.spacing.sm }} />
    <SkeletonBox width="80%" height={14} style={{ marginTop: THEME.spacing.md }} />
    <SkeletonBox width="100%" height={14} style={{ marginTop: THEME.spacing.sm }} />
  </View>
);

const ProductDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { productId } = route.params;
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const addItem = useCartStore((s) => s.addItem);
  const updateItem = useCartStore((s) => s.updateItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const cartItems = useCartStore((s) => s.items);
  const cartItemCount = useCartStore((s) => s.itemCount);
  const fetchCart = useCartStore((s) => s.fetchCart);
  const showToast = useToastStore((s) => s.showToast);

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [adding, setAdding] = useState(false);

  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [ratingStats, setRatingStats] = useState<ProductRatingStats | null>(null);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<'desc' | 'cad'>('desc');

  useFocusEffect(
    useCallback(() => {
      fetchCart();
    }, [fetchCart])
  );

  const cartItem = cartItems.find((i) => i.productId === productId);
  const quantityInCart = cartItem ? cartItem.quantity : 0;

  const handleAddToCart = async () => {
    if (!product || adding || product.stockQty === 0) return;
    setAdding(true);
    try {
      await addItem(product.id);
      showToast('Added to cart successfully!', 'success');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Could not add to cart';
      showToast(msg, 'error');
    } finally {
      setAdding(false);
    }
  };

  const fetchReviews = async () => {
    setLoadingReviews(true);
    try {
      const [revs, stats] = await Promise.all([
        getReviews(productId),
        getRatingStats(productId)
      ]);
      setReviews(revs);
      setRatingStats(stats);
    } catch {
      // Ignore reviews errors gracefully
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleSubmitReview = async () => {
    if (submittingReview) return;
    setSubmittingReview(true);
    try {
      await addReview(productId, reviewRating, reviewComment.trim());
      showToast('Review submitted successfully!', 'success');
      setReviewComment('');
      setReviewRating(5);
      fetchReviews();
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Could not submit review';
      showToast(errMsg, 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const fetchProduct = async () => {
    try {
      setError(false);
      const data = await getProductById(productId);
      setProduct(data);
      fetchReviews();
      try {
        const rel = await getProducts({ categoryId: data.categoryId, size: 8, page: 0 });
        setRelated(rel.content.filter((p) => p.id !== productId));
      } catch {
        // Related products error can be ignored
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
            <Icon name="arrow-left" size={24} color={THEME.colors.text} />
          </Pressable>
        </View>
        <DetailSkeleton />
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
            <Icon name="arrow-left" size={24} color={THEME.colors.text} />
          </Pressable>
        </View>
        <EmptyState
          icon="alert-circle-outline"
          message="Failed to load product details."
          actionTitle="Try Again"
          onAction={() => { setLoading(true); fetchProduct(); }}
        />
      </SafeAreaView>
    );
  }

  const images: string[] = product.images?.length
    ? product.images
    : product.imageUrl
    ? [product.imageUrl]
    : [];

  const hasDiscount = product.mrp > product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;
  const savings = hasDiscount ? product.mrp - product.price : 0;
  const isOutOfStock = product.stockQty === 0;
  const isLowStock = product.stockQty > 0 && product.stockQty <= 5;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={THEME.colors.background} barStyle="dark-content" />

      {/* Floating Header */}
      <View style={[styles.floatingHeader, { top: insets.top + THEME.spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconCircle} hitSlop={12}>
          <Icon name="arrow-left" size={22} color={THEME.colors.graphite} />
        </Pressable>
        <Pressable onPress={() => navigation.navigate('Cart')} style={styles.iconCircle} hitSlop={12}>
          <Icon name="cart-outline" size={22} color={THEME.colors.graphite} />
          {cartItemCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartItemCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Image Carousel */}
        {images.length > 0 ? (
          <View style={styles.carouselContainer}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setActiveImage(idx);
              }}
            >
              {images.map((uri, idx) => (
                <View key={idx} style={{ width: SCREEN_WIDTH, height: 260, justifyContent: 'center', alignItems: 'center' }}>
                  <Image
                    source={{ uri }}
                    style={styles.carouselImage}
                    resizeMode="contain"
                  />
                </View>
              ))}
            </ScrollView>
            {images.length > 1 && (
              <View style={styles.dotRow}>
                {images.map((_, idx) => (
                  <View
                    key={idx}
                    style={[styles.dot, activeImage === idx && styles.dotActive]}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Icon name="package-variant" size={72} color={THEME.colors.textMuted} />
          </View>
        )}

        <View style={styles.body}>
          {/* Main Info Card */}
          <Card style={styles.infoCard} elevation="none">
            {/* Brand & Category */}
            {(product.brandName || product.categoryName) && (
              <Text style={styles.meta}>
                {[product.brandName, product.categoryName].filter(Boolean).join(' · ')}
              </Text>
            )}

            {/* Product Name */}
            <Text style={styles.name}>{product.name}</Text>
            
            {/* Unit Info */}
            <Text style={styles.unit}>{product.unit || '1 Unit'}</Text>

            {/* Price block */}
            <View style={styles.priceContainer}>
              <View style={styles.priceRow}>
                <Text style={styles.price}>₹{product.price.toFixed(0)}</Text>
                {hasDiscount && (
                  <>
                    <Text style={styles.mrp}>₹{product.mrp.toFixed(0)}</Text>
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>{discountPct}% OFF</Text>
                    </View>
                  </>
                )}
              </View>
              {hasDiscount && (
                <View style={styles.savingsRow}>
                  <Icon name="tag-heart" size={16} color={THEME.colors.success} style={{ marginRight: 6 }} />
                  <Text style={styles.savingsText}>
                    You save ₹{savings.toFixed(0)} on this purchase!
                  </Text>
                </View>
              )}
            </View>

            {/* Stock status */}
            {isOutOfStock ? (
              <View style={styles.stockBadgeOut}>
                <Icon name="close-circle-outline" size={16} color={THEME.colors.error} style={{ marginRight: 4 }} />
                <Text style={styles.stockTextOut}>Out of Stock</Text>
              </View>
            ) : isLowStock ? (
              <View style={styles.stockBadgeLow}>
                <Icon name="lightning-bolt" size={16} color={THEME.colors.warning} style={{ marginRight: 4 }} />
                <Text style={styles.stockTextLow}>Only {product.stockQty} left in stock!</Text>
              </View>
            ) : (
              <View style={styles.stockBadgeIn}>
                <Icon name="check-circle-outline" size={16} color={THEME.colors.success} style={{ marginRight: 4 }} />
                <Text style={styles.stockTextIn}>In Stock (Fast Delivery)</Text>
              </View>
            )}
          </Card>

          {/* Highlights Section */}
          <Card style={styles.highlightsCard} elevation="none">
            <View style={styles.highlightRow}>
              <View style={styles.iconCircleWrap}>
                <Icon name="truck-fast-outline" size={18} color={THEME.colors.primary} />
              </View>
              <View style={styles.highlightTextContainer}>
                <Text style={styles.highlightTitle}>Super Fast Delivery</Text>
                <Text style={styles.highlightDesc}>Get items delivered to your doorstep in minutes</Text>
              </View>
            </View>
            <View style={[styles.highlightRow, styles.borderTop]}>
              <View style={styles.iconCircleWrap}>
                <Icon name="shield-check-outline" size={18} color={THEME.colors.primary} />
              </View>
              <View style={styles.highlightTextContainer}>
                <Text style={styles.highlightTitle}>100% Quality Assured</Text>
                <Text style={styles.highlightDesc}>Genuine products directly from certified warehouses</Text>
              </View>
            </View>
            <View style={[styles.highlightRow, styles.borderTop]}>
              <View style={styles.iconCircleWrap}>
                <Icon name="swap-horizontal" size={18} color={THEME.colors.primary} />
              </View>
              <View style={styles.highlightTextContainer}>
                <Text style={styles.highlightTitle}>Easy Replacement</Text>
                <Text style={styles.highlightDesc}>7-day hassle-free replacement on damaged items</Text>
              </View>
            </View>
          </Card>

          {/* Description / Technical Spec CAD tabs */}
          <Card style={styles.descCard} elevation="none">
            <View style={styles.detailTabContainer}>
              <Pressable
                style={[styles.detailTab, activeDetailTab === 'desc' && styles.detailActiveTab]}
                onPress={() => setActiveDetailTab('desc')}
              >
                <Text style={[styles.detailTabText, activeDetailTab === 'desc' && styles.detailActiveTabText]}>
                  DESCRIPTION
                </Text>
              </Pressable>
              <Pressable
                style={[styles.detailTab, activeDetailTab === 'cad' && styles.detailActiveTab]}
                onPress={() => setActiveDetailTab('cad')}
              >
                <Text style={[styles.detailTabText, activeDetailTab === 'cad' && styles.detailActiveTabText]}>
                  SIZE DRAWING
                </Text>
              </Pressable>
            </View>

            {activeDetailTab === 'desc' ? (
              <View style={styles.detailTabContent}>
                <Text style={styles.description}>{product.description || 'No description available for this product.'}</Text>
                
                {/* Technical Quick Specs Spec Table */}
                <View style={{ marginTop: THEME.spacing.md }}>
                  <Text style={styles.specTableHeader}>TECHNICAL SPEC SHEET</Text>
                  <View style={styles.specTableRow}>
                    <Text style={styles.specColLabel}>MATERIAL GRADE</Text>
                    <Text style={styles.specColVal}>{product.name.toLowerCase().includes('cpvc') ? 'CPVC Schedule 80' : 'Heavy-Duty Brass Alloy'}</Text>
                  </View>
                  <View style={styles.specTableRow}>
                    <Text style={styles.specColLabel}>FINISH TYPE</Text>
                    <Text style={styles.specColVal}>
                      {product.name.toLowerCase().includes('gold') ? 'Brushed Gold Coating' : product.name.toLowerCase().includes('graphite') ? 'Matte Electro-Finish' : 'Industrial Chrome Coating'}
                    </Text>
                  </View>
                  <View style={styles.specTableRow}>
                    <Text style={styles.specColLabel}>THREAD PRESSURE</Text>
                    <Text style={styles.specColVal}>PN-16 (Up to 16 Bar Working Pressure)</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.detailTabContent}>
                <Text style={styles.cadIntro}>PRODUCT SIZES & THREAD MEASUREMENTS</Text>
                
                {/* SVG mechanical blueprint style drawing */}
                <View style={styles.cadDrawContainer}>
                  {/* Grid background using border pattern lines */}
                  <View style={styles.cadGridOverlay}>
                    {/* Draw mechanical lines using vector shapes */}
                    <View style={styles.cadCenterCrosshair} />
                    
                    {product.name.toLowerCase().includes('pipe') || product.name.toLowerCase().includes('elbow') || product.name.toLowerCase().includes('coupling') ? (
                      // Render CPVC Pipe CAD Blueprint
                      <View style={styles.cadDrawCPVC}>
                        {/* Outer Pipe cylinder */}
                        <View style={styles.cadPipeCylinder} />
                        {/* Diameter Arrow Lines */}
                        <View style={[styles.cadArrowLine, { left: 40, right: 40, top: 40, height: 1 }]} />
                        <View style={[styles.cadArrowLine, { width: 1, left: 40, top: 30, bottom: 30 }]} />
                        <View style={[styles.cadArrowLine, { width: 1, right: 40, top: 30, bottom: 30 }]} />
                        <Text style={styles.cadLabelText}>D1 = 28.5 mm</Text>
                        <Text style={styles.cadLabelTextSub}>WALL THICKNESS = 2.4 mm (SCH 80)</Text>
                      </View>
                    ) : (
                      // Render Sanitary Faucet Valve CAD Blueprint
                      <View style={styles.cadDrawFaucet}>
                        {/* Faucet body silhouette */}
                        <View style={styles.cadFaucetBase} />
                        <View style={styles.cadFaucetSpout} />
                        {/* Dimension ticks */}
                        <View style={[styles.cadArrowLine, { left: 50, right: 50, top: 20, height: 1 }]} />
                        <Text style={styles.cadLabelText}>L = 120 mm (SPOUT RUN)</Text>
                        <Text style={styles.cadLabelTextSub}>BSP CONNECTION THREAD = 1/2 INCH</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Text style={styles.cadWarning}>DIMENSIONS ARE IN MM & FOR SPEC COMPATIBILITY CHECKS ONLY. TOLERANCE +/- 0.5MM</Text>
              </View>
            )}
          </Card>

          {/* Reviews & Ratings Section */}
          <Card style={styles.reviewsCard} elevation="none">
            <Text style={styles.sectionTitle}>Ratings & Reviews</Text>
            
            {/* Rating Summary */}
            {ratingStats && ratingStats.totalReviews > 0 ? (
              <View style={styles.ratingSummaryRow}>
                <View style={styles.ratingAverageCol}>
                  <Text style={styles.avgRatingText}>{ratingStats.averageRating.toFixed(1)}</Text>
                  <View style={styles.starRow}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Icon
                        key={s}
                        name={s <= ratingStats.averageRating ? 'star' : s - 0.5 <= ratingStats.averageRating ? 'star-half-full' : 'star-outline'}
                        size={16}
                        color="#FFD600"
                      />
                    ))}
                  </View>
                  <Text style={styles.totalReviewsText}>{ratingStats.totalReviews} ratings</Text>
                </View>
                <View style={styles.ratingDivider} />
                <View style={styles.ratingPromoCol}>
                  <Icon name="medal-outline" size={24} color={THEME.colors.primary} />
                  <Text style={styles.ratingPromoText}>Verified reviews from genuine customers</Text>
                </View>
              </View>
            ) : (
              <View style={styles.noReviewsBox}>
                <Icon name="star-outline" size={28} color={THEME.colors.textMuted} style={{ marginBottom: 6 }} />
                <Text style={styles.noReviewsText}>No reviews yet. Be the first one to rate this product!</Text>
              </View>
            )}

            {/* List of customer reviews */}
            {reviews.length > 0 && (
              <View style={styles.reviewsList}>
                {reviews.map((rev) => (
                  <View key={rev.id} style={styles.reviewItem}>
                    <View style={styles.reviewUserHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reviewUserName}>{rev.userName || 'Verified Buyer'}</Text>
                        <Text style={styles.reviewDate}>{new Date(rev.createdAt).toLocaleDateString()}</Text>
                      </View>
                      <View style={styles.reviewItemStars}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Icon
                            key={s}
                            name={s <= rev.rating ? 'star' : 'star-outline'}
                            size={12}
                            color="#FFD600"
                            style={{ marginLeft: 2 }}
                          />
                        ))}
                      </View>
                    </View>
                    {rev.comment ? (
                      <Text style={styles.reviewItemComment}>{rev.comment}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </Card>

          {/* Add a review card */}
          {user && !reviews.some((r) => r.userId === user.id) ? (
            <Card style={styles.addReviewCard} elevation="none">
              <Text style={styles.sectionTitle}>Write a Review</Text>
              <Text style={styles.ratingFormLabel}>Tap stars to rate this product:</Text>
              
              <View style={styles.starInputRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable key={star} onPress={() => setReviewRating(star)} hitSlop={4}>
                    <Icon
                      name={star <= reviewRating ? 'star' : 'star-outline'}
                      size={28}
                      color="#FFD600"
                      style={{ marginRight: 8 }}
                    />
                  </Pressable>
                ))}
              </View>

              <TextInput
                style={styles.commentInput}
                placeholder="Share details of your experience with this product (optional)..."
                placeholderTextColor="#999"
                value={reviewComment}
                onChangeText={setReviewComment}
                multiline
                numberOfLines={3}
                maxLength={500}
              />

              <Button
                title="Submit Review"
                onPress={handleSubmitReview}
                isLoading={submittingReview}
                disabled={submittingReview}
                style={styles.submitReviewBtn}
              />
            </Card>
          ) : user && reviews.some((r) => r.userId === user.id) ? (
            <Card style={styles.reviewedNoticeCard} elevation="none">
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="check-decagram" size={20} color="#2E7D32" style={{ marginRight: 8 }} />
                <Text style={styles.reviewedNoticeText}>You have already reviewed this product.</Text>
              </View>
            </Card>
          ) : null}

          {/* Related Products */}
          {related.length > 0 && (
            <View style={styles.relatedSection}>
              <Text style={styles.sectionTitleRelated}>You May Also Like</Text>
              <FlatList<Product>
                horizontal
                data={related}
                keyExtractor={(p) => String(p.id)}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <ProductCard
                    product={item}
                    compact
                    onPress={() =>
                      navigation.replace('ProductDetail', {
                        productId: item.id,
                        productName: item.name,
                      })
                    }
                  />
                )}
                contentContainerStyle={{ paddingBottom: THEME.spacing.sm }}
              />
            </View>
          )}

          {/* Bottom spacing for sticky footer */}
          <View style={{ height: 140 }} />
        </View>
      </ScrollView>

      {/* Sticky Bottom Actions */}
      <View style={[styles.stickyFooter, { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 24) + 16 : Math.max(insets.bottom, THEME.spacing.md) }]}>
        {isOutOfStock ? (
          <View style={[styles.actionBtn, styles.btnDisabled]}>
            <Text style={styles.btnText}>Out of Stock</Text>
          </View>
        ) : quantityInCart > 0 ? (
          <View style={styles.cartActionsRow}>
            {/* Quantity Stepper Selector */}
            <View style={styles.qtySelector}>
              <Pressable
                style={styles.qtyBtn}
                onPress={async () => {
                  if (quantityInCart === 1) {
                    await removeItem(product.id);
                    showToast('Item removed from cart', 'success');
                  } else {
                    await updateItem(product.id, quantityInCart - 1);
                  }
                }}
                hitSlop={8}
              >
                <Icon name="minus" size={20} color={THEME.colors.graphite} />
              </Pressable>
              <Text style={styles.qtyText}>{quantityInCart}</Text>
              <Pressable
                style={styles.qtyBtn}
                onPress={async () => {
                  if (quantityInCart >= product.stockQty) {
                    showToast('Not enough stock available', 'error');
                    return;
                  }
                  await updateItem(product.id, quantityInCart + 1);
                }}
                hitSlop={8}
              >
                <Icon name="plus" size={20} color={THEME.colors.graphite} />
              </Pressable>
            </View>

            {/* Go to Cart Button */}
            <Pressable
              style={[styles.actionBtn, { flex: 1.4 }]}
              onPress={() => navigation.navigate('Cart')}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.btnText}>Go to Cart</Text>
                <Icon name="arrow-right" size={18} color="#FFF" style={{ marginLeft: 6 }} />
              </View>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={[styles.actionBtn, adding && styles.btnDisabled]}
            disabled={adding}
            onPress={handleAddToCart}
          >
            {adding ? (
              <ActivityIndicator size="small" color={THEME.colors.surface} />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="cart-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.btnText}>Add to Cart</Text>
              </View>
            )}
          </Pressable>
        )}
      </View>
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
    padding: THEME.spacing.md,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  backBtn: { 
    padding: THEME.spacing.sm 
  },
  floatingHeader: {
    position: 'absolute',
    left: THEME.spacing.md,
    right: THEME.spacing.md,
    zIndex: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconCircle: {
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.sm,
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: THEME.colors.error,
    borderRadius: 9,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  scrollContent: {
    backgroundColor: THEME.colors.background,
  },
  carouselContainer: {
    backgroundColor: '#FFF',
    paddingVertical: THEME.spacing.lg,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  carouselImage: { 
    width: SCREEN_WIDTH - 64, 
    height: 240 
  },
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: THEME.spacing.sm,
    gap: THEME.spacing.xs,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: THEME.colors.borderDark,
  },
  dotActive: { 
    backgroundColor: THEME.colors.primary, 
    width: 12 
  },
  imagePlaceholder: {
    height: 260,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  body: { 
    padding: THEME.spacing.md 
  },
  infoCard: {
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
  },
  meta: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: THEME.spacing.xs,
  },
  name: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: THEME.colors.textPrimary, 
    marginBottom: 4,
    lineHeight: 22,
  },
  unit: { 
    fontSize: 12, 
    color: THEME.colors.textSecondary, 
    marginBottom: THEME.spacing.md,
  },
  priceContainer: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: THEME.colors.border,
    paddingVertical: THEME.spacing.md,
    marginVertical: THEME.spacing.md,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.sm,
  },
  price: { 
    fontFamily: THEME.typography.price.fontFamily,
    fontSize: 22, 
    fontWeight: '700', 
    color: THEME.colors.graphite,
  },
  mrp: { 
    fontSize: 15, 
    color: THEME.colors.graphiteMuted, 
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: THEME.colors.surfaceRaised,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  discountText: { 
    color: THEME.colors.brass, 
    fontSize: 11, 
    fontWeight: '700',
  },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: THEME.spacing.xs,
  },
  savingsText: {
    fontSize: 12,
    color: THEME.colors.amber,
    fontWeight: '700',
  },
  stockBadgeIn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.xs,
    alignSelf: 'flex-start',
  },
  stockTextIn: { 
    color: THEME.colors.success, 
    fontWeight: '800', 
    fontSize: 11 
  },
  stockBadgeLow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.accentLight,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.xs,
    alignSelf: 'flex-start',
  },
  stockTextLow: { 
    color: THEME.colors.accentDark, 
    fontWeight: '800', 
    fontSize: 11 
  },
  stockBadgeOut: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.xs,
    alignSelf: 'flex-start',
  },
  stockTextOut: { 
    color: THEME.colors.error, 
    fontWeight: '800', 
    fontSize: 11 
  },
  highlightsCard: {
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: THEME.spacing.sm,
  },
  iconCircleWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: THEME.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  highlightTextContainer: {
    marginLeft: THEME.spacing.md,
    flex: 1,
  },
  highlightTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  highlightDesc: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 1,
    lineHeight: 14,
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingTop: THEME.spacing.sm,
    marginTop: THEME.spacing.sm,
  },
  descCard: {
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionTitle: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: THEME.colors.text, 
    marginBottom: THEME.spacing.xs 
  },
  description: { 
    fontSize: 13, 
    color: THEME.colors.textSecondary, 
    lineHeight: 20,
    flexWrap: 'wrap',
  },
  sectionTitleRelated: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: THEME.colors.text, 
    marginBottom: THEME.spacing.sm 
  },
  relatedSection: { 
    marginTop: THEME.spacing.md 
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    padding: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    ...THEME.shadows.medium,
  },
  actionBtn: {
    backgroundColor: THEME.colors.amber,
    borderRadius: THEME.borderRadius.md,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: { 
    backgroundColor: THEME.colors.border,
  },
  btnText: { 
    color: '#FFF', 
    fontSize: 14, 
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cartActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.md,
  },
  qtySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    height: 48,
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.xs,
    backgroundColor: THEME.colors.surfaceRaised,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.graphite,
  },
  reviewsCard: {
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
  },
  ratingSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: THEME.spacing.sm,
  },
  ratingAverageCol: {
    alignItems: 'center',
    paddingRight: THEME.spacing.md,
  },
  avgRatingText: {
    fontSize: 28,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  starRow: {
    flexDirection: 'row',
    marginVertical: 2,
  },
  totalReviewsText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  ratingDivider: {
    width: 1,
    height: 50,
    backgroundColor: THEME.colors.border,
    marginHorizontal: THEME.spacing.md,
  },
  ratingPromoCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.xs,
  },
  ratingPromoText: {
    flex: 1,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    lineHeight: 14,
    fontWeight: '500',
  },
  noReviewsBox: {
    alignItems: 'center',
    paddingVertical: THEME.spacing.md,
  },
  noReviewsText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  reviewsList: {
    marginTop: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  reviewItem: {
    paddingVertical: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  reviewUserHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  reviewUserName: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  reviewDate: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  reviewItemStars: {
    flexDirection: 'row',
  },
  reviewItemComment: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  addReviewCard: {
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
  },
  ratingFormLabel: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.xs,
    marginBottom: THEME.spacing.sm,
  },
  starInputRow: {
    flexDirection: 'row',
    marginBottom: THEME.spacing.md,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.sm,
    textAlignVertical: 'top',
    fontSize: 13,
    color: THEME.colors.text,
    backgroundColor: '#F9F9F9',
    minHeight: 60,
  },
  submitReviewBtn: {
    marginTop: THEME.spacing.md,
  },
  reviewedNoticeCard: {
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    backgroundColor: '#E8F5E9',
    borderColor: '#C8E6C9',
    borderWidth: 1,
  },
  reviewedNoticeText: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '700',
  },
  detailTabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  detailTab: {
    flex: 1,
    paddingVertical: THEME.spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  detailActiveTab: {
    borderBottomColor: THEME.colors.brass,
  },
  detailTabText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.3,
  },
  detailActiveTabText: {
    color: THEME.colors.brass,
  },
  detailTabContent: {
    paddingVertical: THEME.spacing.xs,
  },
  specTableHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  specTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: THEME.colors.border,
  },
  specColLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  specColVal: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.graphite,
    flex: 1.5,
    textAlign: 'right',
  },
  cadIntro: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.3,
    marginBottom: THEME.spacing.sm,
  },
  cadDrawContainer: {
    backgroundColor: '#F3F2EE', // grid drawing paper
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.sm,
    height: 150,
    overflow: 'hidden',
  },
  cadGridOverlay: {
    flex: 1,
    padding: 10,
    position: 'relative',
    borderWidth: 0.5,
    borderColor: 'rgba(168, 125, 74, 0.08)',
  },
  cadCenterCrosshair: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 0.5,
    backgroundColor: 'rgba(168, 125, 74, 0.15)',
  },
  cadDrawCPVC: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cadPipeCylinder: {
    width: '60%',
    height: 40,
    borderWidth: 1.5,
    borderColor: THEME.colors.brass,
    backgroundColor: 'rgba(168, 125, 74, 0.05)',
  },
  cadDrawFaucet: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cadFaucetBase: {
    width: 30,
    height: 60,
    borderWidth: 1.5,
    borderColor: THEME.colors.brass,
    backgroundColor: 'rgba(168, 125, 74, 0.05)',
    position: 'absolute',
    bottom: 20,
    left: '35%',
  },
  cadFaucetSpout: {
    width: 60,
    height: 24,
    borderWidth: 1.5,
    borderColor: THEME.colors.brass,
    backgroundColor: 'rgba(168, 125, 74, 0.05)',
    position: 'absolute',
    top: 35,
    left: '35%',
    borderTopRightRadius: 12,
  },
  cadArrowLine: {
    position: 'absolute',
    backgroundColor: THEME.colors.graphiteMuted,
  },
  cadLabelText: {
    fontFamily: THEME.typography.price.fontFamily,
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.graphite,
    position: 'absolute',
    bottom: 42,
    alignSelf: 'center',
  },
  cadLabelTextSub: {
    fontFamily: THEME.typography.price.fontFamily,
    fontSize: 8,
    fontWeight: '700',
    color: THEME.colors.graphiteMuted,
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
  },
  cadWarning: {
    fontSize: 8,
    color: THEME.colors.textMuted,
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default ProductDetailScreen;
