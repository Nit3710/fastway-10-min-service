import React from 'react';
import { StyleSheet, View, Image, ViewProps } from 'react-native';

export const GRADIENT_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAHCAIAAABGLrDDAAAAJUlEQVR4nGNIWPqLIXjuTwa3qT8YrJu+MehXvWdQKXzBoJr8GgCtdQv3v840DAAAAABJRU5ErkJggg==';

interface GradientHeaderProps extends ViewProps {
  children: React.ReactNode;
}

export const GradientHeader: React.FC<GradientHeaderProps> = ({ children, style, ...props }) => {
  return (
    <View style={[styles.container, style]} {...props}>
      <Image
        source={{ uri: GRADIENT_URI }}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
});

export default GradientHeader;
