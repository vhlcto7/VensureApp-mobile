import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, spacing, typography } from '../theme';

type PhoneNumberFieldProps = {
  label?: string;
  value: string;
  error?: string;
  onChangeText: (value: string) => void;
};

export function PhoneNumberField({
  label = 'Mobile number',
  value,
  error,
  onChangeText,
}: PhoneNumberFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.field,
          focused ? styles.fieldFocused : null,
          error ? styles.fieldError : null,
        ]}
      >
        <View style={styles.prefix} accessibilityLabel="Country code plus 260">
          <Text style={styles.prefixText}>+260</Text>
          <Text style={styles.chevron}>▼</Text>
        </View>
        <View style={styles.divider} />
        <TextInput
          value={value}
          accessibilityLabel={label}
          autoComplete="tel"
          keyboardType="phone-pad"
          placeholder="Enter your mobile number"
          placeholderTextColor={colors.slate400}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={styles.input}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '600',
    color: colors.slate950,
  },
  field: {
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldFocused: {
    borderColor: colors.primaryCta,
  },
  fieldError: {
    borderColor: colors.rose600,
  },
  prefix: {
    minWidth: 84,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
  },
  prefixText: {
    ...typography.button,
    fontSize: 15,
    color: colors.slate950,
  },
  chevron: {
    fontSize: 8,
    color: colors.slate500,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: colors.slate200,
  },
  input: {
    flex: 1,
    ...typography.body,
    fontSize: 16,
    color: colors.foreground,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  error: {
    ...typography.caption,
    color: colors.rose700,
  },
});
