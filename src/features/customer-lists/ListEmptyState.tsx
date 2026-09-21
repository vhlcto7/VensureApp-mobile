import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components';
import { colors, spacing, typography } from '../../theme';

type ListEmptyStateProps = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function ListEmptyState({ title, message, actionLabel, onAction }: ListEmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? <Button label={actionLabel} variant="cta" onPress={onAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  title: {
    ...typography.heading,
    fontSize: 18,
    color: colors.slate950,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.slate500,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});
