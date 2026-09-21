import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AuthBrandedScreen,
  Button,
  ErrorMessage,
  OtpCodeInput,
} from '../../components';
import { CUSTOMER_OTP_LENGTH } from '../../constants/auth';
import type { AuthStackScreenProps } from '../../navigation/types';
import {
  resendCustomerSignupOtp,
  sendCustomerLoginOtp,
  verifyCustomerLoginOtp,
  verifyCustomerSignupOtp,
} from '../../services/customer-auth';
import { useAuth } from '../../store/auth-context';
import { clearPendingOtp, getPendingOtp, savePendingOtp } from '../../store/otp-challenge';
import { colors, spacing, typography } from '../../theme';
import { maskEmailForDisplay } from '../../utils/email';
import { isApiError } from '../../utils/errors';
import { formatMaskedMobileDisplay } from '../../utils/phone';
import { normalizeCustomerAuthError } from '../../utils/signup-errors';

type OtpVerificationScreenProps = AuthStackScreenProps<'OtpVerification'>;

const RESEND_COOLDOWN_SECONDS = 30;

export function OtpVerificationScreen({ navigation }: OtpVerificationScreenProps) {
  const { signIn } = useAuth();
  const [pending, setPending] = useState(getPendingOtp);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string | undefined>();
  const [submitError, setSubmitError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!pending) {
      navigation.replace('Login');
    }
  }, [pending, navigation]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      setResendCooldown((value) => Math.max(0, value - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const expiryLabel = useMemo(() => {
    if (!pending?.otpExpiresAt) {
      return null;
    }

    const remainingMs = new Date(pending.otpExpiresAt).getTime() - now;
    if (Number.isNaN(remainingMs)) {
      return null;
    }

    if (remainingMs <= 0) {
      return 'This OTP has expired. Request a new code.';
    }

    const totalSeconds = Math.ceil(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `Code expires in ${minutes}:${String(seconds).padStart(2, '0')}`;
  }, [now, pending?.otpExpiresAt]);

  if (!pending) {
    return null;
  }

  const maskedMobile = formatMaskedMobileDisplay(pending.mobileNumber);
  const maskedEmail = pending.purpose === 'signup' ? maskEmailForDisplay(pending.email) : '';
  const subtitle =
    pending.purpose === 'signup'
      ? `Enter the OTP sent to ${maskedMobile}${
          maskedEmail ? `\nAccount email: ${maskedEmail}` : ''
        }`
      : `We've sent a verification code to:\n${maskedMobile}`;

  const onChangeOtp = (value: string) => {
    setOtp(value);
    setOtpError(undefined);
    setSubmitError('');
  };

  const onVerify = async () => {
    if (otp.length !== CUSTOMER_OTP_LENGTH) {
      setOtpError(`Enter the ${CUSTOMER_OTP_LENGTH}-digit OTP.`);
      return;
    }

    setVerifying(true);
    setSubmitError('');

    try {
      const session =
        pending.purpose === 'login'
          ? await verifyCustomerLoginOtp({ loginToken: pending.loginToken, otp })
          : await verifyCustomerSignupOtp({
              signupToken: pending.signupToken,
              otp,
              mobileNumber: pending.mobileNumber,
              email: pending.email,
            });

      await signIn(session);
    } catch (error) {
      setOtpError(undefined);
      setSubmitError(normalizeCustomerAuthError(error, 'Unable to verify OTP.'));
    } finally {
      setVerifying(false);
    }
  };

  const onResend = async () => {
    if (resending || verifying || resendCooldown > 0) {
      return;
    }

    setResending(true);
    setSubmitError('');
    setOtpError(undefined);

    try {
      if (pending.purpose === 'login') {
        const challenge = await sendCustomerLoginOtp(pending.mobileNumber);
        const next = {
          purpose: 'login' as const,
          mobileNumber: pending.mobileNumber,
          ...challenge,
        };
        savePendingOtp(next);
        setPending(next);
      } else {
        const challenge = await resendCustomerSignupOtp({
          signupToken: pending.signupToken,
          mobileNumber: pending.mobileNumber,
          email: pending.email,
        });
        const next = {
          purpose: 'signup' as const,
          mobileNumber: pending.mobileNumber,
          email: pending.email,
          ...challenge,
        };
        savePendingOtp(next);
        setPending(next);
      }

      setOtp('');
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      if (isApiError(error) && error.retryAfterSeconds) {
        setResendCooldown(Math.ceil(error.retryAfterSeconds));
      }

      setSubmitError(normalizeCustomerAuthError(error, 'Unable to resend OTP.'));
    } finally {
      setResending(false);
    }
  };

  const onChangeNumber = () => {
    setOtp('');
    clearPendingOtp();
    navigation.navigate(pending.purpose === 'login' ? 'Login' : 'SignUp');
  };

  const resendLabel = resending
    ? 'Sending OTP...'
    : resendCooldown > 0
      ? `Resend OTP (${resendCooldown}s)`
      : 'Resend OTP';

  return (
    <AuthBrandedScreen title="Verify your mobile number" subtitle={subtitle}>
      <ErrorMessage message={submitError} />
      {expiryLabel ? <Text style={styles.expiry}>{expiryLabel}</Text> : null}

      <View style={styles.form}>
        <OtpCodeInput
          length={CUSTOMER_OTP_LENGTH}
          value={otp}
          error={otpError}
          onChangeText={onChangeOtp}
        />
        <Button
          label={verifying ? 'Verifying...' : 'Verify and continue'}
          variant="cta"
          loading={verifying}
          disabled={resending}
          onPress={() => void onVerify()}
        />

        <View style={styles.resendRow}>
          <Text style={styles.resendPrompt}>Didn&apos;t receive the code?</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Resend OTP"
            disabled={verifying || resending || resendCooldown > 0}
            hitSlop={12}
            onPress={() => void onResend()}
            style={styles.resendButton}
          >
            <Text
              style={[
                styles.resendLink,
                verifying || resending || resendCooldown > 0
                  ? styles.resendDisabled
                  : null,
              ]}
            >
              {resendLabel}
            </Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={pending.purpose === 'signup' ? 'Change email' : 'Change mobile number'}
          hitSlop={12}
          onPress={onChangeNumber}
          style={styles.change}
        >
          <Text style={styles.changeText}>
            {pending.purpose === 'signup' ? 'Change email' : 'Change mobile number'}
          </Text>
        </Pressable>
      </View>
    </AuthBrandedScreen>
  );
}

const styles = StyleSheet.create({
  expiry: {
    ...typography.caption,
    color: colors.slate500,
    marginBottom: spacing.lg,
  },
  form: {
    gap: spacing.lg,
  },
  resendRow: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  resendPrompt: {
    ...typography.body,
    color: colors.slate600,
  },
  resendButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  resendLink: {
    ...typography.body,
    color: colors.primaryCta,
    fontWeight: '700',
  },
  resendDisabled: {
    color: colors.slate400,
  },
  change: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeText: {
    ...typography.body,
    color: colors.primaryCta,
    fontWeight: '700',
  },
});
