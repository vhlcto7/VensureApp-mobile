import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AuthBrandedScreen,
  Button,
  Input,
  PhoneNumberField,
} from '../../components';
import type { AuthStackScreenProps } from '../../navigation/types';
import { getSignupDraft, saveSignupDraft } from '../../store/signup-draft';
import { colors, radius, spacing, typography } from '../../theme';
import type { CustomerSignUpDraft, CustomerType } from '../../types';
import {
  getEmailValidationError,
  getMobileValidationError,
  getPasswordValidationError,
} from '../../utils/validation';

type SignUpScreenProps = AuthStackScreenProps<'SignUp'>;

const CUSTOMER_TYPES = [
  { value: 'INDIVIDUAL', label: 'Individual' },
  { value: 'BUSINESS', label: 'Business/Corporate' },
] as const;

const emptyForm: CustomerSignUpDraft = {
  fullName: '',
  email: '',
  mobileNumber: '',
  customerType: 'INDIVIDUAL',
  password: '',
  confirmPassword: '',
  nrcOrPassportNumber: '',
  acceptedLegalAgreement: false,
  acceptedMarketing: false,
};

export function SignUpScreen({ navigation }: SignUpScreenProps) {
  const [form, setForm] = useState<CustomerSignUpDraft>(
    () => getSignupDraft() ?? emptyForm,
  );
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerSignUpDraft, string>>>({});

  const onChange = <K extends keyof CustomerSignUpDraft>(
    field: K,
    value: CustomerSignUpDraft[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const onContinue = () => {
    const nextErrors: Partial<Record<keyof CustomerSignUpDraft, string>> = {};

    if (!form.fullName.trim()) {
      nextErrors.fullName = 'Full name is required.';
    }

    const emailError = getEmailValidationError(form.email);
    if (emailError) nextErrors.email = emailError;

    const mobileError = getMobileValidationError(form.mobileNumber);
    if (mobileError) nextErrors.mobileNumber = mobileError;

    const passwordError = getPasswordValidationError(form.password);
    if (passwordError) nextErrors.password = passwordError;

    if (form.confirmPassword !== form.password) {
      nextErrors.confirmPassword = 'Passwords must match.';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    saveSignupDraft({
      ...form,
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      nrcOrPassportNumber: form.nrcOrPassportNumber.trim(),
    });
    navigation.navigate('AccountCreation');
  };

  return (
    <AuthBrandedScreen
      title="Create your account"
      subtitle="Sign up with your details to manage quotes, policies, cover notes, payments, and KYC documents."
      footer={
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign In"
            hitSlop={12}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.footerLink}>Sign In</Text>
          </Pressable>
        </View>
      }
    >
      <View style={styles.form}>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Customer type</Text>
          <View style={styles.typeRow}>
            {CUSTOMER_TYPES.map((option) => {
              const selected = form.customerType === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => onChange('customerType', option.value as CustomerType)}
                  style={[styles.typeChip, selected ? styles.typeChipSelected : null]}
                >
                  <Text style={[styles.typeText, selected ? styles.typeTextSelected : null]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Input
          label="Full Name"
          value={form.fullName}
          error={errors.fullName}
          autoComplete="name"
          placeholder="Enter your full name"
          onChangeText={(value) => onChange('fullName', value)}
        />
        <Input
          label="Email address (optional)"
          value={form.email}
          error={errors.email}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="name@example.com"
          onChangeText={(value) => onChange('email', value)}
        />
        <PhoneNumberField
          value={form.mobileNumber}
          error={errors.mobileNumber}
          onChangeText={(value) => onChange('mobileNumber', value)}
        />
        <Input
          label="Password"
          value={form.password}
          error={errors.password}
          secureTextEntry
          autoComplete="password-new"
          placeholder="Create a password"
          onChangeText={(value) => onChange('password', value)}
        />
        <Input
          label="Confirm Password"
          value={form.confirmPassword}
          error={errors.confirmPassword}
          secureTextEntry
          autoComplete="password-new"
          placeholder="Re-enter your password"
          onChangeText={(value) => onChange('confirmPassword', value)}
        />

        <Button label="Continue" variant="cta" onPress={onContinue} />
      </View>
    </AuthBrandedScreen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  label: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '600',
    color: colors.slate950,
  },
  typeRow: {
    flexDirection: 'row',
    backgroundColor: colors.slate100,
    borderRadius: 14,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  typeChip: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeChipSelected: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primaryCta,
  },
  typeText: {
    ...typography.label,
    color: colors.slate600,
  },
  typeTextSelected: {
    color: colors.primaryCta,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    minHeight: 48,
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  footerText: {
    ...typography.body,
    color: colors.slate700,
  },
  footerLink: {
    ...typography.body,
    color: colors.primaryCta,
    fontWeight: '700',
  },
});
