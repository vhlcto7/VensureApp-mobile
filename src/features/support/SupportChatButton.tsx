import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getSupportContacts, openSupportWhatsApp } from '../../services/support-contacts';
import { colors, spacing, typography } from '../../theme';

export function SupportChatButton() {
  const insets = useSafeAreaInsets();
  const bottom = 64 + Math.max(insets.bottom, 8);

  useEffect(() => {
    void getSupportContacts();
  }, []);

  return (
    <Pressable
      accessibilityRole="button"
        accessibilityLabel="Need Help? Chat to VenSure on WhatsApp"
        onPress={() => void openSupportWhatsApp({ kind: 'general' })}
        style={({ pressed }) => [styles.button, { bottom }, pressed ? styles.pressed : null]}
      >
        <Ionicons name="logo-whatsapp" size={18} color={colors.white} />
        <Text style={styles.label}>Need Help?</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: spacing.lg,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: 999,
    backgroundColor: colors.brandGreen,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    shadowColor: colors.slate900,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 6,
  },
  pressed: {
    opacity: 0.88,
  },
  label: {
    ...typography.label,
    color: colors.white,
    fontWeight: '700',
  },
});
