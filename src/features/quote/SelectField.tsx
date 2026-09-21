import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../theme';

type Option = { label: string; value: string; disabled?: boolean };

type SelectFieldProps = {
  label: string;
  value: string;
  options: Option[];
  error?: string;
  required?: boolean;
  onChange: (value: string) => void;
};

export function SelectField({ label, value, options, error, required = false, onChange }: SelectFieldProps) {
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, required ? styles.labelRequired : null]}>
        {label}
        {required ? <Text style={styles.requiredMark}> *</Text> : null}
      </Text>
      <View style={styles.list}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              disabled={option.disabled}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: option.disabled }}
              onPress={() => onChange(option.value)}
              style={[
                styles.option,
                selected ? styles.optionSelected : null,
                option.disabled ? styles.optionDisabled : null,
              ]}
            >
              <Text style={[styles.optionText, selected ? styles.optionTextSelected : null]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  label: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '600',
    color: colors.slate950,
  },
  labelRequired: {
    color: colors.sky700,
    fontWeight: '800',
  },
  requiredMark: {
    color: colors.rose600,
    fontWeight: '800',
  },
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  option: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    justifyContent: 'center',
  },
  optionSelected: {
    borderColor: colors.primaryCta,
    backgroundColor: colors.sky50,
  },
  optionDisabled: {
    opacity: 0.45,
  },
  optionText: {
    ...typography.label,
    color: colors.slate700,
  },
  optionTextSelected: {
    color: colors.primaryCta,
    fontWeight: '700',
  },
  error: {
    ...typography.caption,
    color: colors.rose700,
  },
});
