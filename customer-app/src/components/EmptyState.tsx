import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import THEME from '../theme/theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Button from './Button';

interface EmptyStateProps {
  icon: string;
  title?: string;
  message?: string;
  description?: string;
  actionTitle?: string;
  onAction?: () => void;
  onActionPress?: () => void;
  actionVariant?: 'primary' | 'secondary' | 'outline' | 'text';
  actionIcon?: string;
  style?: StyleProp<ViewStyle>;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  description,
  actionTitle,
  onAction,
  onActionPress,
  actionVariant = 'primary',
  actionIcon,
  style,
}) => {
  const displayMessage = message || description || '';
  const handleAction = onAction || onActionPress;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        <Icon name={icon} size={36} color={THEME.colors.brass} />
      </View>
      {title && <Text style={styles.title}>{title}</Text>}
      {displayMessage ? <Text style={styles.message}>{displayMessage}</Text> : null}
      {actionTitle && handleAction ? (
        <View style={styles.btnWrapper}>
          <Button
            title={actionTitle}
            onPress={handleAction}
            variant={actionVariant}
            icon={actionIcon ? <Icon name={actionIcon} size={18} color="#FFF" /> : undefined}
            style={styles.actionBtn}
          />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: THEME.spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minHeight: 300,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FAF9F6',
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.graphite,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: THEME.spacing.xs,
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    color: THEME.colors.graphiteMuted,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
    marginBottom: THEME.spacing.xl,
    fontWeight: '500',
  },
  btnWrapper: {
    width: '100%',
    maxWidth: 240,
    alignItems: 'center',
  },
  actionBtn: {
    width: '100%',
    height: 46,
  },
});

export default EmptyState;
