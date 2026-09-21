import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { colors, spacing, typography } from '../../theme';

export type FilterChipOption<T extends string> = {
  id: T;
  label: string;
};

type FilterChipsProps<T extends string> = {
  options: FilterChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function FilterChips<T extends string>({ options, value, onChange }: FilterChipsProps<T>) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.id)}
            style={[styles.chip, selected ? styles.chipSelected : null]}
          >
            <Text style={[styles.label, selected ? styles.labelSelected : null]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: colors.sky100,
    borderColor: colors.primary,
  },
  label: {
    ...typography.label,
    fontWeight: '700',
    color: colors.slate600,
  },
  labelSelected: {
    color: colors.sky700,
  },
});
