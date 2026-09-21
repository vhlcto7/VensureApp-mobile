import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../theme';

export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.card}>
          <View style={styles.row}>
            <View style={styles.blockWide} />
            <View style={styles.pill} />
          </View>
          <View style={styles.line} />
          <View style={styles.lineShort} />
          <View style={styles.line} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  blockWide: {
    height: 16,
    flex: 1,
    borderRadius: radius.sm,
    backgroundColor: colors.slate100,
  },
  pill: {
    width: 72,
    height: 20,
    borderRadius: 999,
    backgroundColor: colors.slate100,
  },
  line: {
    height: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.slate100,
  },
  lineShort: {
    height: 12,
    width: '55%',
    borderRadius: radius.sm,
    backgroundColor: colors.slate100,
  },
});
