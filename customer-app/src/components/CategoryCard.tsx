import React, { useRef } from 'react';
import { Pressable, Text, View, StyleSheet, Image, Animated } from 'react-native';
import THEME from '../theme/theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface CategoryCardProps {
  name: string;
  imageUrl?: string | null;
  onPress: () => void;
  iconName?: string;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  name,
  imageUrl,
  onPress,
  iconName = 'tag-outline',
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.93,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 4,
      tension: 40,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        style={styles.card}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
      >
        <View style={styles.imageWrap}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <Icon name={iconName} size={20} color={THEME.colors.brass} />
          )}
        </View>
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: THEME.spacing.sm,
    width: 82,
    height: 96,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.xs,
    shadowColor: '#262421',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  imageWrap: {
    width: 46,
    height: 46,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.surfaceRaised,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 6,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  name: {
    fontSize: 10,
    color: THEME.colors.graphite,
    textAlign: 'center',
    fontWeight: '700',
    lineHeight: 12,
    textTransform: 'uppercase',
  },
});

export default CategoryCard;
