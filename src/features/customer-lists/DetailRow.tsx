import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../theme';

export function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  label: {
    ...typography.caption,
    color: colors.slate500,
    width: 120,
  },
  value: {
    ...typography.body,
    fontWeight: '600',
    color: colors.slate950,
    flex: 1,
    textAlign: 'right',
  },
});
