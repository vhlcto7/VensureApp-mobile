import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Input } from '../../components';
import { changeCustomerPassword } from '../../services/customer-auth';
import { colors, spacing, typography } from '../../theme';
import { getErrorMessage } from '../../utils/errors';
import { getPasswordValidationError } from '../../utils/validation';

const emptyForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

export function PasswordChangeSection() {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Partial<typeof emptyForm>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  function updateField(field: keyof typeof emptyForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setError('');
    setInfo('');
  }

  async function onSubmit() {
    const nextErrors: Partial<typeof emptyForm> = {};
    if (!form.currentPassword.trim()) nextErrors.currentPassword = 'Current password is required.';
    const newPasswordError = getPasswordValidationError(form.newPassword);
    if (newPasswordError) {
      nextErrors.newPassword = form.newPassword.trim()
        ? 'New password must be at least 8 characters.'
        : 'New password is required.';
    }
    if (form.confirmPassword !== form.newPassword) {
      nextErrors.confirmPassword = 'New password and confirm password must match.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      setSubmitting(true);
      setError('');
      setInfo('');
      await changeCustomerPassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });
      setForm(emptyForm);
      setInfo('Password changed successfully.');
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Unable to update password.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <Text style={styles.title}>Update password</Text>
      <Text style={styles.lede}>Keep your account secure by updating your password regularly.</Text>

      <View style={styles.form}>
        <Input
          label="Current Password"
          value={form.currentPassword}
          error={errors.currentPassword}
          secureTextEntry
          autoComplete="password"
          placeholder="Enter current password"
          onChangeText={(value) => updateField('currentPassword', value)}
        />
        <Input
          label="New Password"
          value={form.newPassword}
          error={errors.newPassword}
          secureTextEntry
          autoComplete="password-new"
          placeholder="Enter new password"
          onChangeText={(value) => updateField('newPassword', value)}
        />
        <Input
          label="Confirm New Password"
          value={form.confirmPassword}
          error={errors.confirmPassword}
          secureTextEntry
          autoComplete="password-new"
          placeholder="Confirm new password"
          onChangeText={(value) => updateField('confirmPassword', value)}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {info ? <Text style={styles.info}>{info}</Text> : null}
        <Button
          label={submitting ? 'Updating...' : 'Update password'}
          variant="cta"
          loading={submitting}
          onPress={() => void onSubmit()}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.body,
    fontWeight: '700',
    fontSize: 16,
    color: colors.slate950,
  },
  lede: {
    ...typography.caption,
    color: colors.slate500,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  form: {
    gap: spacing.md,
  },
  error: {
    ...typography.caption,
    color: colors.rose700,
  },
  info: {
    ...typography.caption,
    color: '#047857',
  },
});
