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

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        compact ? styles.compactCard : styles.normalCard,
        pressed && styles.pressed,
        style,
      ]}
    >
      {/* Image and stock overlay container */}
      <View style={[styles.imageContainer, compact ? styles.compactImage : styles.normalImage]}>
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            style={styles.image}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            {/* Outline icon for blueprint design */}
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
          <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
          <Text style={styles.unit}>{product.unit || '1 unit'}</Text>
        </View>

        <View style={styles.footerBlock}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{product.price.toFixed(0)}</Text>
            {hasDiscount && (
              <Text style={styles.mrp}>₹{product.mrp.toFixed(0)}</Text>
            )}
          </View>
          {hasDiscount && (
            <Text style={styles.saveText}>Save {discountPct}%</Text>
          )}

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
          <Text style={styles.lowStock}>Only {product.stockQty} left!</Text>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: THEME.borderRadius.lg, // 8px radius
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
  },
  compactCard: {
    width: 140,
    marginRight: THEME.spacing.md,
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
    height: 120,
  },
  compactImage: {
    height: 100,
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
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(237, 235, 230, 0.8)',
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
  },
  name: { 
    fontSize: 13,
    fontWeight: '700', 
    color: THEME.colors.graphite,
    marginBottom: 2,
    lineHeight: 16,
  },
  unit: { 
    fontSize: 11, 
    color: THEME.colors.graphiteMuted, 
    marginBottom: THEME.spacing.sm,
  },
  lowStock: { 
    fontSize: 10, 
    color: THEME.colors.error, 
    fontWeight: '700', 
    marginTop: THEME.spacing.xs,
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
    fontSize: 15,
    fontWeight: '700', 
    color: THEME.colors.graphite,
  },
  mrp: { 
    fontSize: 10, 
    color: THEME.colors.graphiteMuted, 
    textDecorationLine: 'line-through',
  },
  saveText: {
    fontSize: 10,
    color: THEME.colors.amber,
    fontWeight: '700',
    marginTop: 1,
  },
  cartControl: {
    width: '100%',
    height: 32,
    marginTop: THEME.spacing.sm,
    justifyContent: 'center',
  },
  addButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: THEME.colors.brass,
    borderRadius: THEME.borderRadius.sm, // 4px sharp corner
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: { 
    color: THEME.colors.brass, 
    fontSize: 11, 
    fontWeight: '700',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.brass,
    borderRadius: THEME.borderRadius.sm, // 4px sharp corner
    height: '100%',
    paddingHorizontal: 4,
  },
  stepperBtn: {
    padding: 2,
  },
  stepperQty: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    minWidth: 16,
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: THEME.colors.surfaceRaised,
    borderRadius: THEME.borderRadius.sm,
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
