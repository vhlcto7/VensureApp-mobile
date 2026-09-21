import { useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, spacing, typography } from '../theme';

type OtpCodeInputProps = {
  length: number;
  value: string;
  error?: string;
  autoFocus?: boolean;
  onChangeText: (value: string) => void;
};

export function OtpCodeInput({
  length,
  value,
  error,
  autoFocus = true,
  onChangeText,
}: OtpCodeInputProps) {
  const inputRef = useRef<TextInput>(null);
  const digits = value.replace(/\D/g, '').slice(0, length);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Verification code</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Enter ${length}-digit OTP`}
        onPress={() => inputRef.current?.focus()}
        style={styles.boxesWrap}
      >
        <View pointerEvents="none" style={styles.row}>
          {Array.from({ length }, (_, index) => {
            const filled = Boolean(digits[index]);
            const active = digits.length === index;
            return (
              <View
                key={index}
                style={[
                  styles.box,
                  filled ? styles.boxFilled : null,
                  active ? styles.boxActive : null,
                  error ? styles.boxError : null,
                ]}
              >
                <Text style={styles.digit}>{digits[index] ?? ''}</Text>
              </View>
            );
          })}
        </View>
        <TextInput
          ref={inputRef}
          value={digits}
          autoFocus={autoFocus}
          caretHidden
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          maxLength={length}
          importantForAutofill="yes"
          accessibilityLabel="OTP"
          onChangeText={(next) => onChangeText(next.replace(/\D/g, '').slice(0, length))}
          style={styles.hiddenInput}
        />
      </Pressable>
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
  boxesWrap: {
    position: 'relative',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  box: {
    flex: 1,
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: {
    borderColor: colors.primaryCta,
  },
  boxActive: {
    borderColor: colors.primaryCta,
  },
  boxError: {
    borderColor: colors.rose600,
  },
  digit: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700',
    color: colors.slate900,
  },
  hiddenInput: {
    ...StyleSheet.absoluteFill,
    color: 'transparent',
    opacity: 0.02,
  },
  error: {
    ...typography.caption,
    color: colors.rose700,
  },
});
