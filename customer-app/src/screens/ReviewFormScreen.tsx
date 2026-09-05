import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import THEME from '../theme/theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { addReview } from '../api/reviewApi';
import { useToastStore } from '../store/toastStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';
import Card from '../components/Card';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'ReviewForm'>;

export const ReviewFormScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const showToast = useToastStore((s) => s.showToast);

  const { productId, productName } = route.params;

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) {
      showToast('Please select a rating between 1 and 5 stars', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await addReview(productId, rating, comment.trim());
      showToast('Thank you! Your review has been submitted.', 'success');
      navigation.goBack();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to submit review';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={THEME.colors.background} barStyle="dark-content" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Icon name="arrow-left" size={24} color={THEME.colors.graphite} />
        </Pressable>
        <Text style={styles.headerTitle}>Write Review</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 24) + 32 : Math.max(insets.bottom, 32) }]} keyboardShouldPersistTaps="handled">
          <Card style={styles.card} elevation="none">
            <Text style={styles.productLabel}>PRODUCT NAME</Text>
            <Text style={styles.productName}>{productName}</Text>
          </Card>

          <Card style={styles.card} elevation="none">
            <Text style={styles.sectionLabel}>YOUR RATING</Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable
                  key={star}
                  onPress={() => setRating(star)}
                  style={styles.starPress}
                >
                  <Icon
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={40}
                    color={star <= rating ? '#F59E0B' : THEME.colors.textMuted}
                  />
                </Pressable>
              ))}
            </View>
            <Text style={styles.ratingText}>
              {rating === 5 && 'Excellent! Love it 😍'}
              {rating === 4 && 'Very Good! Recommended 😊'}
              {rating === 3 && 'Good / Average 🙂'}
              {rating === 2 && 'Disappointed 🙁'}
              {rating === 1 && 'Very Poor / Horrible 😡'}
            </Text>
          </Card>

          <Card style={styles.card} elevation="none">
            <Text style={styles.sectionLabel}>REVIEW DESCRIPTION (OPTIONAL)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="What did you like or dislike about this product? How is the quality?"
              placeholderTextColor={THEME.colors.textMuted}
              multiline
              numberOfLines={4}
              value={comment}
              onChangeText={setComment}
              textAlignVertical="top"
            />
          </Card>

          <Button
            title="Submit Review"
            onPress={handleSubmit}
            isLoading={submitting}
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
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
    padding: THEME.spacing.sm,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.graphite,
    marginLeft: THEME.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: THEME.spacing.md,
  },
  card: {
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  productLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.5,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.text,
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: THEME.spacing.sm,
    textTransform: 'uppercase',
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: THEME.spacing.sm,
  },
  starPress: {
    paddingHorizontal: THEME.spacing.xs,
  },
  ratingText: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.text,
    marginTop: THEME.spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.sm,
    padding: THEME.spacing.md,
    fontSize: 13,
    color: THEME.colors.text,
    height: 120,
    backgroundColor: '#FAFAFA',
  },
  submitBtn: {
    marginTop: THEME.spacing.md,
  },
});

export default ReviewFormScreen;
