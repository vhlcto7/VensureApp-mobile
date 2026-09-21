import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button, ErrorMessage } from '../../components';
import { colors, spacing, typography } from '../../theme';

type ListFooterProps = {
  loadingMore?: boolean;
  error?: string;
  onRetry?: () => void;
};

export function ListFooter({ loadingMore, error, onRetry }: ListFooterProps) {
  if (error && onRetry) {
    return (
      <View style={styles.wrap}>
        <ErrorMessage message={error} />
        <Button label="Retry" variant="outline" onPress={onRetry} />
      </View>
    );
  }

  if (!loadingMore) return <View style={styles.spacer} />;

  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.text}>Loading more</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
  text: {
    ...typography.caption,
    color: colors.slate500,
  },
  spacer: {
    height: spacing.xxxl,
  },
});
