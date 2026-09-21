import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../theme';

export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

const TONE_STYLES: Record<StatusTone, { wrap: string; text: string }> = {
  success: { wrap: '#ecfdf5', text: '#047857' },
  warning: { wrap: colors.amber50, text: colors.amber800 },
  danger: { wrap: colors.rose50, text: colors.rose700 },
  neutral: { wrap: colors.slate100, text: colors.slate700 },
  info: { wrap: colors.sky100, text: colors.sky700 },
};

type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
};

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  if (!label) return null;
  const palette = TONE_STYLES[tone];

  return (
    <View style={[styles.badge, { backgroundColor: palette.wrap }]}>
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    maxWidth: 140,
  },
  label: {
    ...typography.label,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
});
