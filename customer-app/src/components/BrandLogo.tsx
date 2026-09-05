import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import THEME from '../theme/theme';
import GradientHeader from './GradientHeader';

interface BrandLogoProps {
  size?: number;
  iconSize?: number;
  style?: any;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 64,
  iconSize = 34,
  style,
}) => {
  const borderRadius = size / 4.5; // Modern rounded squircle look (like iOS app icons)

  return (
    <View style={[styles.outerContainer, { width: size, height: size, borderRadius }, style]}>
      <GradientHeader style={[styles.gradientBg, { borderRadius }]}>
        <View style={styles.iconContainer}>
          <Icon name="lightning-bolt" size={iconSize} color="#FFF" />
        </View>
      </GradientHeader>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    ...THEME.shadows.medium,
  },
  gradientBg: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default BrandLogo;
