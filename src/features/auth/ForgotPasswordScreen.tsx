import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  BrandLogo,
  Button,
  ErrorMessage,
  Input,
  ScreenContainer,
} from '../../components';
import type { AuthStackScreenProps } from '../../navigation/types';
import { requestCustomerPasswordReset } from '../../services/customer-auth';
import { colors, spacing, typography } from '../../theme';
import type { CustomerForgotPasswordForm } from '../../types';
import { getErrorMessage } from '../../utils/errors';
import { getEmailValidationError } from '../../utils/validation';

type ForgotPasswordScreenProps = AuthStackScreenProps<'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: ForgotPasswordScreenProps) {
  const [form, setForm] = useState<CustomerForgotPasswordForm>({ email: '' });
  const [error, setError] = useState<string | undefined>();
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    const emailError = getEmailValidationError(form.email, { required: true });
    if (emailError) {
      setError(emailError);
      setInfo('');
      return;
    }

    setSubmitting(true);
    setError(undefined);
    setInfo('');

    try {
      await requestCustomerPasswordReset(form.email);
      setInfo('If an account exists for that email, reset instructions have been sent.');
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Unable to send reset instructions.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer scroll contentStyle={styles.content}>
      <BrandLogo height={56} style={styles.logo} />
      <View style={styles.header}>
        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.subtitle}>
          Enter the email on your customer account and we will send reset instructions.
        </Text>
      </View>

      {info ? (
        <View style={styles.info}>
          <Text style={styles.infoText}>{info}</Text>
        </View>
      ) : (
        <ErrorMessage message={error} />
      )}

      <View style={styles.form}>
        <Input
          label="Email"
          value={form.email}
          error={error && !info ? error : undefined}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="name@example.com"
          onChangeText={(email) => {
            setForm({ email });
            setError(undefined);
            setInfo('');
          }}
        />
        <Button
          label={submitting ? 'Sending...' : 'Send reset instructions'}
          loading={submitting}
          onPress={() => void onSubmit()}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        hitSlop={12}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={styles.back}>Back to sign in</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },
  logo: {
    alignSelf: 'center',
  },
  header: {
    gap: spacing.sm,
  },
  title: {
    ...typography.title,
    color: colors.slate950,
  },
  subtitle: {
    ...typography.subtitle,
    color: colors.slate600,
  },
  form: {
    gap: spacing.lg,
  },
  info: {
    backgroundColor: colors.sky50,
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  infoText: {
    ...typography.body,
    color: colors.sky700,
  },
  back: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
});
