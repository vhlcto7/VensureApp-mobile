import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors } from '../theme';

type LoadingIndicatorProps = {
  size?: 'small' | 'large';
};

export function LoadingIndicator({ size = 'large' }: LoadingIndicatorProps) {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator size={size} color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
});
