import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme';

type ListSearchBarProps = {
  value: string;
  placeholder: string;
  filterCount?: number;
  onChange: (value: string) => void;
  onPressFilter: () => void;
};

export function ListSearchBar({
  value,
  placeholder,
  filterCount = 0,
  onChange,
  onPressFilter,
}: ListSearchBarProps) {
  const filterLabel = filterCount > 0 ? `Filter (${filterCount})` : 'Filter';

  return (
    <View style={styles.row}>
      <View style={styles.search}>
        <Ionicons name="search" size={16} color={colors.slate400} />
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.slate400}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="search"
          style={styles.input}
          accessibilityLabel={placeholder}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={filterLabel}
        onPress={onPressFilter}
        style={styles.filter}
      >
        <Ionicons name="options-outline" size={16} color={colors.sky700} />
        <Text style={styles.filterLabel}>{filterLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  search: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
  },
  input: {
    ...typography.body,
    flex: 1,
    color: colors.slate950,
    paddingVertical: 0,
  },
  filter: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
  },
  filterLabel: {
    ...typography.label,
    fontWeight: '700',
    color: colors.sky700,
  },
});
