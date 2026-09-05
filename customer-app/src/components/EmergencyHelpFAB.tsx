import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Linking,
  Alert,
} from 'react-native';
import THEME from '../theme/theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Card from './Card';

interface EmergencyHelpFABProps {
  variant?: 'floating' | 'header';
}

export const EmergencyHelpFAB: React.FC<EmergencyHelpFABProps> = ({
  variant = 'header',
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const handleCallHelpline = () => {
    const phoneNumber = 'tel:+919876543210';
    Linking.canOpenURL(phoneNumber)
      .then((supported) => {
        if (supported) {
          Linking.openURL(phoneNumber);
        } else {
          Alert.alert('Emergency Helpline', 'Dialing Fastway 24/7 Support: +91 98765 43210');
        }
      })
      .catch(() => {
        Alert.alert('Emergency Helpline', 'Dialing Fastway 24/7 Support: +91 98765 43210');
      });
    setModalVisible(false);
  };

  const handleWhatsAppHelp = () => {
    const message = 'Hello Fastway Helpline, I need urgent plumbing emergency assistance.';
    const whatsappUrl = `whatsapp://send?phone=+919876543210&text=${encodeURIComponent(message)}`;
    Linking.canOpenURL(whatsappUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(whatsappUrl);
        } else {
          Alert.alert('WhatsApp Helpline', 'Opening WhatsApp Support with +91 98765 43210');
        }
      })
      .catch(() => {
        Alert.alert('WhatsApp Helpline', 'Opening WhatsApp Support with +91 98765 43210');
      });
    setModalVisible(false);
  };

  return (
    <>
      {/* Non-intrusive Header Icon or Floating Badge */}
      {variant === 'header' ? (
        <Pressable
          style={styles.headerHelpBtn}
          onPress={() => setModalVisible(true)}
          hitSlop={8}
        >
          <Icon name="headset" size={20} color={THEME.colors.graphite} />
          <View style={styles.headerPulseDot} />
        </Pressable>
      ) : (
        <Pressable
          style={styles.fabBtn}
          onPress={() => setModalVisible(true)}
          hitSlop={8}
        >
          <View style={styles.pulseLed} />
          <Icon name="face-agent" size={20} color="#FFF" />
          <Text style={styles.fabText}>24/7 HELP</Text>
        </Pressable>
      )}

      {/* Emergency Helpline Action Sheet Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setModalVisible(false)}>
          <Card style={styles.card} elevation="none">
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="shield-alert-outline" size={20} color={THEME.colors.error} style={{ marginRight: 6 }} />
                <Text style={styles.modalTitle}>FASTWAY EMERGENCY HELPLINE</Text>
              </View>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={8}>
                <Icon name="close" size={20} color={THEME.colors.graphite} />
              </Pressable>
            </View>

            <Text style={styles.modalDesc}>
              Facing pipe leakage, water overflow, or urgent fitting issue? Get priority support 24/7.
            </Text>

            <Pressable onPress={handleCallHelpline} style={styles.optionBtn}>
              <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
                <Icon name="phone-in-talk" size={22} color="#2E7D32" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.optionTitle}>CALL 24/7 HELPLINE</Text>
                <Text style={styles.optionSub}>Instant response from workshop team (+91 98765 43210)</Text>
              </View>
              <Icon name="chevron-right" size={20} color={THEME.colors.graphiteMuted} />
            </Pressable>

            <Pressable onPress={handleWhatsAppHelp} style={[styles.optionBtn, { marginTop: 10 }]}>
              <View style={[styles.iconCircle, { backgroundColor: '#E0F2FE' }]}>
                <Icon name="whatsapp" size={22} color="#0284C7" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.optionTitle}>CHAT ON WHATSAPP</Text>
                <Text style={styles.optionSub}>Send photo/video of leak or part for quick estimate</Text>
              </View>
              <Icon name="chevron-right" size={20} color={THEME.colors.graphiteMuted} />
            </Pressable>
          </Card>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  headerHelpBtn: {
    padding: 6,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  headerPulseDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
  },
  fabBtn: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.graphite,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.colors.brass,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 999,
  },
  pulseLed: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  fabText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginLeft: 4,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    padding: THEME.spacing.md,
  },
  card: {
    padding: THEME.spacing.lg,
    backgroundColor: '#FFF',
    borderRadius: THEME.borderRadius.lg,
    marginBottom: THEME.spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.graphite,
    letterSpacing: 0.5,
  },
  modalDesc: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.md,
    lineHeight: 15,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.spacing.md,
    backgroundColor: '#FAF9F6',
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.graphite,
    letterSpacing: 0.3,
  },
  optionSub: {
    fontSize: 9,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
});

export default EmergencyHelpFAB;
