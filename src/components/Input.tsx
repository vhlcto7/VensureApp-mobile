import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { colors, spacing, typography } from '../theme';

type InputProps = TextInputProps & {
  label: string;
  error?: string;
  required?: boolean;
};

export function Input({
  label,
  error,
  required = false,
  secureTextEntry,
  editable = true,
  ...inputProps
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(Boolean(secureTextEntry));

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, required ? styles.labelRequired : null]}>
        {label}
        {required ? <Text style={styles.requiredMark}> *</Text> : null}
      </Text>
      <View
        style={[
          styles.field,
          focused ? styles.fieldFocused : null,
          error ? styles.fieldError : null,
          !editable ? styles.fieldDisabled : null,
        ]}
      >
        <TextInput
          {...inputProps}
          editable={editable}
          secureTextEntry={secureTextEntry ? hidden : false}
          placeholderTextColor={colors.slate400}
          accessibilityLabel={inputProps.accessibilityLabel ?? label}
          onFocus={(event) => {
            setFocused(true);
            inputProps.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            inputProps.onBlur?.(event);
          }}
          style={styles.input}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            hitSlop={12}
            onPress={() => setHidden((value) => !value)}
          >
            <Text style={styles.toggle}>{hidden ? 'Show' : 'Hide'}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  label: {
    ...typography.label,
    color: colors.slate700,
  },
  labelRequired: {
    color: colors.sky700,
    fontWeight: '700',
  },
  requiredMark: {
    color: colors.rose600,
    fontWeight: '800',
  },
  field: {
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldFocused: {
    borderColor: colors.primaryCta,
  },
  fieldError: {
    borderColor: colors.rose600,
  },
  fieldDisabled: {
    backgroundColor: colors.slate50,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.foreground,
    paddingVertical: spacing.md,
  },
  toggle: {
    ...typography.label,
    color: colors.primary,
    paddingLeft: spacing.sm,
  },
  error: {
    ...typography.caption,
    color: colors.rose700,
  },
});
