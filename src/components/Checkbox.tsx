import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme';

type CheckboxProps = {
  label: string;
  checked: boolean;
  error?: string;
  onPress: () => void;
};

export function Checkbox({ label, checked, error, onPress }: CheckboxProps) {
  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        hitSlop={8}
        onPress={onPress}
        style={styles.row}
      >
        <View style={[styles.box, checked ? styles.boxChecked : null]} />
        <Text style={styles.label}>{label}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  box: {
    width: 22,
    height: 22,
    marginTop: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.slate400,
    backgroundColor: colors.white,
  },
  boxChecked: {
    backgroundColor: colors.primaryCta,
    borderColor: colors.primaryCta,
  },
  label: {
    flex: 1,
    ...typography.body,
    color: colors.slate700,
  },
  error: {
    ...typography.caption,
    color: colors.rose700,
  },
});
