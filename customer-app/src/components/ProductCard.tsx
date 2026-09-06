import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  Animated,
} from 'react-native';
import THEME from '../theme/theme';
import { Product } from '../types';
import { useCartStore } from '../store/cartStore';
import { useToastStore } from '../store/toastStore';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  style,
  compact = false,
}) => {
  const [adding, setAdding] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const updateItem = useCartStore((s) => s.updateItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const cartItem = useCartStore((s) => s.items.find((i) => i.productId === product.id));
  const quantity = cartItem ? cartItem.quantity : 0;
  const showToast = useToastStore((s) => s.showToast);

  const hasDiscount = product.mrp > product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;
  const isOutOfStock = product.stockQty === 0;
  const isLowStock = product.stockQty > 0 && product.stockQty <= 5;

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const pop = () => {
    scaleAnim.setValue(0.96);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 6,
      tension: 60,
      useNativeDriver: true,
    }).start();
  };

  const handleIncrement = async () => {
    if (adding || isOutOfStock) return;
    pop();
    setAdding(true);
    try {
      if (quantity === 0) {
        await addItem(product.id);
        showToast('Added to cart', 'success');
      } else {
        await updateItem(product.id, quantity + 1);
      }
    } catch (err: any) {
      showToast(err?.message || 'Could not update cart', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleDecrement = async () => {
    if (adding || quantity === 0) return;
    pop();
    setAdding(true);
    try {
      if (quantity === 1) {
        await removeItem(product.id);
        showToast('Removed from cart', 'success');
      } else {
        await updateItem(product.id, quantity - 1);
      }
    } catch (err: any) {
      showToast(err?.message || 'Could not update cart', 'error');
    } finally {
      setAdding(false);
    }
  };

  const cardScaleAnim = useRef(new Animated.Value(1)).current;

  const handleCardPressIn = () => {
    Animated.spring(cardScaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 60,
      bounciness: 0,
    }).start();
  };

  const handleCardPressOut = () => {
    Animated.spring(cardScaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
      tension: 50,
    }).start();
  };

  return (
    <Animated.View
      style={[
        compact ? styles.compactCard : styles.normalCard,
        { transform: [{ scale: cardScaleAnim }] },
        style,
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handleCardPressIn}
        onPressOut={handleCardPressOut}
        style={styles.card}
      >
        {/* Image and stock overlay container */}
        <View style={[styles.imageContainer, compact ? styles.compactImage : styles.normalImage]}>
          {hasDiscount && !isOutOfStock && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>{discountPct}% OFF</Text>
            </View>
          )}

          {product.imageUrl ? (
            <Image
              source={{ uri: product.imageUrl }}
              style={styles.image}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Icon name="package-variant-closed" size={28} color={THEME.colors.graphiteMuted} />
            </View>
          )}
          
          {isOutOfStock && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>OUT OF STOCK</Text>
            </View>
          )}
        </View>

        {/* Info Container */}
        <View style={styles.info}>
          <View style={{ flex: 1 }}>
            <View style={styles.titleBox}>
              <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
            </View>
            <Text style={styles.unit} numberOfLines={1}>{product.unit || '1 unit'}</Text>
          </View>

          <View style={styles.footerBlock}>
            <View style={styles.priceRow}>
              <Text style={styles.price}>₹{product.price.toFixed(0)}</Text>
              {hasDiscount && (
                <Text style={styles.mrp}>₹{product.mrp.toFixed(0)}</Text>
              )}
            </View>

            {/* Cart Stepper Control */}
            <Animated.View style={[styles.cartControl, { transform: [{ scale: scaleAnim }] }]}>
              {isOutOfStock ? (
                <View style={styles.disabledButton}>
                  <Text style={styles.disabledButtonText}>UNAVAILABLE</Text>
                </View>
              ) : adding ? (
                <View style={styles.stepperContainer}>
                  <ActivityIndicator size="small" color={THEME.colors.surface} />
                </View>
              ) : quantity > 0 ? (
                <View style={styles.stepperContainer}>
                  <Pressable onPress={handleDecrement} style={styles.stepperBtn} hitSlop={6}>
                    <Icon name="minus" size={14} color="#FFF" />
                  </Pressable>
                  <Text style={styles.stepperQty}>{quantity}</Text>
                  <Pressable onPress={handleIncrement} style={styles.stepperBtn} hitSlop={6}>
                    <Icon name="plus" size={14} color="#FFF" />
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={handleIncrement} style={styles.addButton}>
                  <Text style={styles.addButtonText}>ADD</Text>
                </Pressable>
              )}
            </Animated.View>
          </View>

          {isLowStock && !isOutOfStock && (
            <Text style={styles.lowStock} numberOfLines={1}>Only {product.stockQty} left!</Text>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: THEME.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    shadowColor: '#262421',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  normalCard: {
    width: '47%',
    marginHorizontal: '1.5%',
    marginBottom: THEME.spacing.md,
    height: 250,
  },
  compactCard: {
    width: 144,
    marginRight: THEME.spacing.md,
    height: 236,
  },
  pressed: {
    opacity: 0.95,
  },
  imageContainer: {
    backgroundColor: '#FFF',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.sm,
  },
  normalImage: {
    height: 110,
  },
  compactImage: {
    height: 96,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceRaised,
  },
  discountBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#E65100',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 2,
  },
  discountBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(237, 235, 230, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    color: THEME.colors.graphite,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  info: { 
    padding: THEME.spacing.sm,
    flex: 1,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.surfaceRaised,
    justifyContent: 'space-between',
  },
  titleBox: {
    height: 32,
    justifyContent: 'flex-start',
  },
  name: { 
    fontSize: 12,
    fontWeight: '700', 
    color: THEME.colors.graphite,
    lineHeight: 15,
  },
  unit: { 
    fontSize: 10, 
    color: THEME.colors.graphiteMuted, 
    marginTop: 2,
    marginBottom: 4,
  },
  lowStock: { 
    fontSize: 9, 
    color: THEME.colors.error, 
    fontWeight: '700', 
    marginTop: 2,
  },
  footerBlock: {
    marginTop: 'auto',
    width: '100%',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  price: { 
    fontFamily: THEME.typography.price.fontFamily,
    fontSize: 14,
    fontWeight: '800', 
    color: THEME.colors.graphite,
  },
  mrp: { 
    fontSize: 10, 
    color: THEME.colors.graphiteMuted, 
    textDecorationLine: 'line-through',
  },
  cartControl: {
    width: '100%',
    height: 30,
    marginTop: 6,
    justifyContent: 'center',
  },
  addButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: THEME.colors.brass,
    borderRadius: THEME.borderRadius.xs,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: { 
    color: THEME.colors.brass, 
    fontSize: 11, 
    fontWeight: '800',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.brass,
    borderRadius: THEME.borderRadius.xs,
    height: '100%',
    paddingHorizontal: 4,
  },
  stepperBtn: {
    padding: 2,
  },
  stepperQty: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    minWidth: 16,
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: THEME.colors.surfaceRaised,
    borderRadius: THEME.borderRadius.xs,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  disabledButtonText: {
    color: THEME.colors.graphiteMuted,
    fontSize: 9,
    fontWeight: '700',
  },
});

export default ProductCard;
