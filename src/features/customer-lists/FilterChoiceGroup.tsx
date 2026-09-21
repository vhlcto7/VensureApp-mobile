import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../theme';
import { FilterChips, type FilterChipOption } from './FilterChips';

type FilterChoiceGroupProps<T extends string> = {
  label: string;
  options: FilterChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function FilterChoiceGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: FilterChoiceGroupProps<T>) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <FilterChips options={options} value={value} onChange={onChange} />
    </View>
  );
}

type OptionButtonProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
};

export function OptionButton({ label, selected, onPress }: OptionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.option, selected ? styles.optionSelected : null]}
    >
      <Text style={[styles.optionLabel, selected ? styles.optionLabelSelected : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  label: {
    ...typography.label,
    color: colors.slate700,
  },
  option: {
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.slate200,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  optionSelected: {
    backgroundColor: colors.sky100,
    borderColor: colors.primary,
  },
  optionLabel: {
    ...typography.label,
    fontWeight: '700',
    color: colors.slate600,
  },
  optionLabelSelected: {
    color: colors.sky700,
  },
});
