import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
} from 'react-native';
import THEME from '../theme/theme';
import Card from './Card';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Button from './Button';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToastStore } from '../store/toastStore';

interface RatingModalProps {
  visible: boolean;
  bookingId: string;
  technicianName?: string;
  serviceType?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const FEEDBACK_TAGS = [
  'On Time Visit',
  'Expert Fitting',
  'Clean & Neat Work',
  'Polite Behaviour',
  'Fair Pricing',
  'Genuine Parts Used',
];

export const RatingModal: React.FC<RatingModalProps> = ({
  visible,
  bookingId,
  technicianName = 'Rajesh Kumar',
  serviceType = 'Plumbing Service',
  onClose,
  onSuccess,
}) => {
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>(['On Time Visit', 'Expert Fitting']);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const showToast = useToastStore((s) => s.showToast);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const ratingData = {
        bookingId,
        rating,
        tags: selectedTags,
        comment: comment.trim(),
        createdAt: new Date().toISOString(),
      };

      const saved = await AsyncStorage.getItem('fastway_booking_ratings');
      let ratingsMap: Record<string, any> = saved ? JSON.parse(saved) : {};
      ratingsMap[bookingId] = ratingData;

      await AsyncStorage.setItem('fastway_booking_ratings', JSON.stringify(ratingsMap));
      showToast('Thank you! Your rating has been submitted.', 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      showToast('Failed to submit rating', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Card style={styles.card} elevation="none">
          <View style={styles.header}>
            <Text style={styles.title}>RATE & REVIEW SERVICE</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="close" size={22} color={THEME.colors.graphite} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Technician Info */}
            <View style={styles.techBox}>
              <View style={styles.avatarCircle}>
                <Icon name="account-wrench" size={24} color={THEME.colors.brass} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.techName}>{technicianName}</Text>
                <Text style={styles.serviceText}>{serviceType.toUpperCase()} • ID: {bookingId}</Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>HOW WAS YOUR EXPERIENCE?</Text>

            {/* 5 Star Rating Row */}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable
                  key={star}
                  onPress={() => setRating(star)}
                  hitSlop={6}
                  style={styles.starBtn}
                >
                  <Icon
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={36}
                    color={star <= rating ? THEME.colors.amber : THEME.colors.border}
                  />
                </Pressable>
              ))}
            </View>
            <Text style={styles.ratingText}>
              {rating === 5
                ? 'Excellent Service! ⭐⭐⭐⭐⭐'
                : rating === 4
                ? 'Very Good 👍'
                : rating === 3
                ? 'Good Service 👌'
                : rating === 2
                ? 'Needs Improvement ⚠️'
                : 'Poor Service ❌'}
            </Text>

            {/* Feedback Tags */}
            <Text style={styles.sectionLabel}>WHAT DID YOU LIKE MOST?</Text>
            <View style={styles.tagsWrap}>
              {FEEDBACK_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <Pressable
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    style={[styles.tagItem, isSelected && styles.tagItemSelected]}
                  >
                    {isSelected && (
                      <Icon name="check" size={14} color="#FFF" style={{ marginRight: 4 }} />
                    )}
                    <Text style={[styles.tagText, isSelected && styles.tagTextSelected]}>
                      {tag}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Comments Input */}
            <Text style={styles.sectionLabel}>ADDITIONAL FEEDBACK (OPTIONAL)</Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Tell us more about plumber's work or suggestions..."
              placeholderTextColor={THEME.colors.graphiteMuted}
              style={styles.commentInput}
              multiline
              numberOfLines={3}
            />

            <Button
              title="SUBMIT RATING"
              onPress={handleSubmit}
              isLoading={submitting}
              variant="primary"
              style={styles.submitBtn}
            />
          </ScrollView>
        </Card>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: THEME.spacing.lg,
  },
  card: {
    padding: THEME.spacing.lg,
    backgroundColor: '#FFF',
    borderRadius: THEME.borderRadius.lg,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    paddingBottom: THEME.spacing.xs,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.graphite,
    letterSpacing: 0.5,
  },
  techBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF9F6',
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  techName: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.graphite,
  },
  serviceText: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.graphiteMuted,
    letterSpacing: 0.5,
    marginTop: THEME.spacing.sm,
    marginBottom: 6,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginVertical: THEME.spacing.xs,
  },
  starBtn: {
    padding: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.graphite,
    textAlign: 'center',
    marginBottom: THEME.spacing.md,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: THEME.spacing.md,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.xs,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: '#FAF9F6',
  },
  tagItemSelected: {
    backgroundColor: THEME.colors.brass,
    borderColor: THEME.colors.brass,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.graphite,
  },
  tagTextSelected: {
    color: '#FFF',
    fontWeight: '700',
  },
  commentInput: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.sm,
    padding: THEME.spacing.sm,
    fontSize: 12,
    color: THEME.colors.graphite,
    backgroundColor: '#FAF9F6',
    textAlignVertical: 'top',
    marginBottom: THEME.spacing.lg,
  },
  submitBtn: {
    height: 46,
  },
});

export default RatingModal;
