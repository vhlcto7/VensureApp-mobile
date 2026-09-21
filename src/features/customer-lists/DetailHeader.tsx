import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '../../theme';

type DetailHeaderProps = {
  title: string;
  subtitle?: string;
  onBack: () => void;
};

export function DetailHeader({ title, subtitle, onBack }: DetailHeaderProps) {
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} hitSlop={12} style={styles.back}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        <View style={styles.back} />
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  back: {
    minWidth: 56,
  },
  backText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primaryCta,
  },
  title: {
    ...typography.heading,
    fontSize: 18,
    color: colors.slate950,
    flex: 1,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.caption,
    color: colors.slate500,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
