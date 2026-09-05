import React from 'react';
import { Pressable, Text, View, StyleSheet, Image } from 'react-native';
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
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressed,
      ]}
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
  );
};

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: THEME.spacing.sm,
    width: 80,
    height: 94,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md, // 6px - sharpish
    padding: THEME.spacing.xs,
    shadowColor: '#262421',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
  },
  imageWrap: {
    width: 44,
    height: 44,
    borderRadius: THEME.borderRadius.sm, // 4px rectangular corner
    backgroundColor: THEME.colors.surfaceRaised,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: THEME.spacing.xs,
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
