import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card } from '../../components';
import {
  closeCustomerAccount,
  sendCustomerAccountClosureOtp,
  verifyCustomerAccountClosureOtp,
} from '../../services/customer-account';
import { useAuth } from '../../store/auth-context';
import { colors, radius, spacing, typography } from '../../theme';
import { getErrorMessage } from '../../utils/errors';

type Step = 'idle' | 'warning' | 'otp' | 'confirm';

type DeleteAccountSectionProps = {
  onClosed: () => void;
};

export function DeleteAccountSection({ onClosed }: DeleteAccountSectionProps) {
  const { session } = useAuth();
  const [step, setStep] = useState<Step>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [otp, setOtp] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [closureToken, setClosureToken] = useState('');
  const [maskedMobile, setMaskedMobile] = useState('');

  const modalVisible = step !== 'idle';

  const title = useMemo(() => {
    if (step === 'warning') return 'Delete VenSure Account';
    if (step === 'otp') return 'Confirm with OTP';
    if (step === 'confirm') return 'Delete Account?';
    return 'Delete Account';
  }, [step]);

  function resetFlow() {
    setStep('idle');
    setBusy(false);
    setError('');
    setOtp('');
    setChallengeToken('');
    setClosureToken('');
    setMaskedMobile('');
  }

  async function handleContinueFromWarning() {
    try {
      setBusy(true);
      setError('');
      const result = await sendCustomerAccountClosureOtp();
      if (!result.closureChallengeToken) {
        throw new Error('Closure OTP challenge was incomplete.');
      }
      setChallengeToken(result.closureChallengeToken);
      setMaskedMobile(result.maskedMobileNumber);
      setStep('otp');
    } catch (sendError) {
      setError(getErrorMessage(sendError, 'Unable to send closure OTP.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp() {
    if (!otp.trim()) {
      setError('Enter the OTP sent to your mobile number.');
      return;
    }
    try {
      setBusy(true);
      setError('');
      const result = await verifyCustomerAccountClosureOtp({
        closureChallengeToken: challengeToken,
        otp: otp.trim(),
      });
      if (!result.closureToken) {
        throw new Error('Closure verification was incomplete.');
      }
      setClosureToken(result.closureToken);
      setStep('confirm');
    } catch (verifyError) {
      setError(getErrorMessage(verifyError, 'Invalid or expired OTP.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteAccount() {
    try {
      setBusy(true);
      setError('');
      await closeCustomerAccount({
        confirmation: 'DELETE',
        closureToken,
      });
      resetFlow();
      onClosed();
    } catch (closeError) {
      setError(
        getErrorMessage(
          closeError,
          'Unable to close your account. You are still signed in.',
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Card>
        <Text style={styles.sectionTitle}>Account</Text>
        <Text style={[styles.muted, styles.lede]}>
          Close your VenSure login access. This does not cancel any insurance
          policy.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete Account"
          onPress={() => {
            setError('');
            setStep('warning');
          }}
          style={({ pressed }) => [
            styles.deleteLink,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.deleteLinkText}>Delete Account</Text>
        </Pressable>
      </Card>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!busy) {
            resetFlow();
          }
        }}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{title}</Text>

            {step === 'warning' ? (
              <>
                <Text style={styles.body}>
                  Closing your VenSure account will permanently remove your access
                  to the VenSure app and online customer services.
                </Text>
                <Text style={styles.body}>
                  Deleting your account does not cancel any active insurance
                  policy. Policy, payment and other records that Venture or the
                  insurer is required to retain may continue to be kept.
                </Text>
                <Text style={styles.body}>
                  If you need assistance with an existing policy after closing
                  your account, please contact Venture Holding Limited.
                </Text>
              </>
            ) : null}

            {step === 'otp' ? (
              <>
                <Text style={styles.body}>
                  Enter the OTP sent to{' '}
                  {maskedMobile ||
                    session?.user?.mobileNumber ||
                    'your registered mobile number'}
                  .
                </Text>
                <TextInput
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={10}
                  placeholder="OTP"
                  editable={!busy}
                  style={styles.input}
                  accessibilityLabel="Account closure OTP"
                />
              </>
            ) : null}

            {step === 'confirm' ? (
              <>
                <Text style={styles.body}>
                  This action cannot be undone. You will no longer be able to
                  access this VenSure account.
                </Text>
                <Text style={styles.bodyEmphasis}>
                  Your existing insurance policy is NOT cancelled by deleting
                  your VenSure account.
                </Text>
              </>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.actions}>
              <Button
                label="Cancel"
                variant="secondary"
                disabled={busy}
                onPress={resetFlow}
              />
              {step === 'warning' ? (
                <Button
                  label="Continue"
                  loading={busy}
                  disabled={busy}
                  onPress={() => void handleContinueFromWarning()}
                />
              ) : null}
              {step === 'otp' ? (
                <Button
                  label="Verify OTP"
                  loading={busy}
                  disabled={busy}
                  onPress={() => void handleVerifyOtp()}
                />
              ) : null}
              {step === 'confirm' ? (
                <Button
                  label="Delete My Account"
                  loading={busy}
                  disabled={busy}
                  onPress={() => void handleDeleteAccount()}
                  style={styles.destructiveButton}
                />
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    ...typography.subtitle,
    color: colors.slate900,
  },
  muted: {
    ...typography.body,
    color: colors.slate500,
  },
  lede: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  deleteLink: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  deleteLinkText: {
    ...typography.body,
    color: colors.rose700,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sheetTitle: {
    ...typography.subtitle,
    color: colors.slate900,
  },
  body: {
    ...typography.body,
    color: colors.slate700,
  },
  bodyEmphasis: {
    ...typography.body,
    color: colors.slate900,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.slate900,
  },
  error: {
    ...typography.caption,
    color: colors.rose700,
  },
  actions: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  destructiveButton: {
    backgroundColor: colors.rose700,
  },
});
