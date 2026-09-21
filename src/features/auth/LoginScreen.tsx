import { useState } from 'react';
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  ErrorMessage,
  Input,
  PhoneNumberField,
} from '../../components';
import type { AuthStackScreenProps } from '../../navigation/types';
import { loginCustomer, sendCustomerLoginOtp } from '../../services/customer-auth';
import { useAuth } from '../../store/auth-context';
import { savePendingOtp } from '../../store/otp-challenge';
import { colors, spacing, typography } from '../../theme';
import type { CustomerLoginForm } from '../../types';
import { getErrorMessage } from '../../utils/errors';
import { getMobileValidationError } from '../../utils/validation';

type LoginScreenProps = AuthStackScreenProps<'Login'>;
type LoginMode = 'otp' | 'password';
type BenefitKind = 'coverage' | 'premiums';

const BENEFITS: { kind: BenefitKind; label: string }[] = [
  { kind: 'coverage', label: 'Motor Policy Coverage' },
  { kind: 'premiums', label: 'Affordable Premiums' },
];

export function LoginScreen({ navigation }: LoginScreenProps) {
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [mode, setMode] = useState<LoginMode>('otp');
  const [form, setForm] = useState<CustomerLoginForm>({
    emailOrMobile: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<CustomerLoginForm>>({});
  const [mobileNumber, setMobileNumber] = useState('');
  const [mobileError, setMobileError] = useState<string | undefined>();
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const compact = height < 720;
  const heroHeight = Math.max(compact ? 252 : 292, Math.round(height * 0.38));

  const onChange = (field: keyof CustomerLoginForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError('');
  };

  const onPasswordSubmit = async () => {
    const nextErrors: Partial<CustomerLoginForm> = {};

    if (!form.emailOrMobile.trim()) {
      nextErrors.emailOrMobile = 'Email or mobile number is required.';
    }

    if (!form.password.trim()) {
      nextErrors.password = 'Password is required.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const session = await loginCustomer(form);
      await signIn(session);
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'Unable to sign in.'));
    } finally {
      setSubmitting(false);
    }
  };

  const onSendOtp = async () => {
    const nextMobileError = getMobileValidationError(mobileNumber);
    setMobileError(nextMobileError);

    if (nextMobileError) {
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const challenge = await sendCustomerLoginOtp(mobileNumber);
      savePendingOtp({
        purpose: 'login',
        mobileNumber,
        ...challenge,
      });
      navigation.navigate('OtpVerification');
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'Unable to send login OTP.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={styles.scrollContent}
        >
          <ImageBackground
            source={require('../../../assets/images/login-background.png')}
            accessibilityLabel="VenSure insurance coverage for every journey"
            resizeMode="cover"
            style={[styles.hero, { height: heroHeight }]}
            imageStyle={styles.heroImage}
          >
            <LinearGradient
              colors={[
                'rgba(255, 255, 255, 0.96)',
                'rgba(255, 255, 255, 0.88)',
                'rgba(255, 255, 255, 0.35)',
                'rgba(255, 255, 255, 0)',
              ]}
              locations={[0, 0.38, 0.68, 1]}
              start={{ x: 0, y: 0.45 }}
              end={{ x: 1, y: 0.45 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <SafeAreaView edges={['top']} style={styles.heroSafe}>
              <View style={styles.heroTop}>
                <View style={styles.country} accessibilityLabel="Zambia">
                  <Text style={styles.countryText}>Zambia</Text>
                  <Text style={styles.flag}>🇿🇲</Text>
                </View>
              </View>
              <View style={styles.heroCopy}>
                <Text style={styles.headline}>
                  Smart insurance{'\n'}on every journey
                </Text>
                <View style={[styles.benefits, compact ? styles.benefitsCompact : null]}>
                  {BENEFITS.map((item) => (
                    <View key={item.kind} style={styles.benefitItem}>
                      <BenefitIcon kind={item.kind} />
                      <Text style={styles.benefitLabel}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </SafeAreaView>
          </ImageBackground>

          <View
            style={[
              styles.panel,
              { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.xl },
            ]}
          >
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in to access your account and manage your policies.
            </Text>

            <ErrorMessage message={submitError} />

            <View style={styles.toggle}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: mode === 'otp' }}
                accessibilityLabel="Send OTP"
                disabled={submitting}
                onPress={() => {
                  setMode('otp');
                  setSubmitError('');
                }}
                style={[styles.toggleItem, mode === 'otp' ? styles.toggleItemActive : null]}
              >
                <Text style={[styles.toggleLabel, mode === 'otp' ? styles.toggleLabelActive : null]}>
                  Send OTP
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: mode === 'password' }}
                accessibilityLabel="Sign in with Password"
                disabled={submitting}
                onPress={() => {
                  setMode('password');
                  setSubmitError('');
                }}
                style={[styles.toggleItem, mode === 'password' ? styles.toggleItemActive : null]}
              >
                <Text style={[styles.toggleLabel, mode === 'password' ? styles.toggleLabelActive : null]} numberOfLines={1}>
                  Sign in with Password
                </Text>
              </Pressable>
            </View>

            {mode === 'otp' ? (
              <View style={styles.form}>
                <PhoneNumberField
                  value={mobileNumber}
                  error={mobileError}
                  onChangeText={(value) => {
                    setMobileNumber(value);
                    setMobileError(undefined);
                    setSubmitError('');
                  }}
                />
                <View style={styles.infoRow}>
                  <View style={styles.infoBadge}>
                    <Text style={styles.infoBadgeText}>i</Text>
                  </View>
                  <Text style={styles.helper}>
                    We will send a one-time code to your registered mobile number.
                  </Text>
                </View>
                <Button
                  label={submitting ? 'Sending OTP...' : 'Send OTP'}
                  variant="cta"
                  loading={submitting}
                  onPress={() => void onSendOtp()}
                />
              </View>
            ) : (
              <View style={styles.form}>
                <Input
                  label="Email address or mobile number"
                  value={form.emailOrMobile}
                  error={errors.emailOrMobile}
                  autoCapitalize="none"
                  autoComplete="username"
                  keyboardType="email-address"
                  placeholder="name@example.com or 260971234567"
                  onChangeText={(value) => onChange('emailOrMobile', value)}
                />
                <Input
                  label="Password"
                  value={form.password}
                  error={errors.password}
                  secureTextEntry
                  autoComplete="password"
                  placeholder="Enter your password"
                  onChangeText={(value) => onChange('password', value)}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Forgot Password"
                  hitSlop={12}
                  onPress={() => navigation.navigate('ForgotPassword')}
                  style={styles.forgot}
                >
                  <Text style={styles.forgotText}>Forgot Password</Text>
                </Pressable>
                <Button
                  label={submitting ? 'Signing in...' : 'Sign In'}
                  variant="cta"
                  loading={submitting}
                  onPress={() => void onPasswordSubmit()}
                />
              </View>
            )}

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don&apos;t have an account? </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Create Account"
                hitSlop={12}
                onPress={() => navigation.navigate('SignUp')}
              >
                <Text style={styles.footerLink}>Create Account</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function BenefitIcon({ kind }: { kind: BenefitKind }) {
  return (
    <View style={styles.benefitIcon}>
      {kind === 'coverage' ? <View style={styles.iconShield} /> : null}
      {kind === 'premiums' ? (
        <View style={styles.iconDoc}>
          <View style={styles.iconDocLine} />
          <View style={styles.iconDocLine} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: colors.white,
  },
  hero: {
    width: '100%',
    overflow: 'hidden',
    justifyContent: 'flex-start',
  },
  heroImage: {
    width: '175%',
    height: '130%',
    left: '-42%',
    top: '-8%',
  },
  heroSafe: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
    justifyContent: 'flex-start',
    gap: spacing.md,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: 44,
  },
  country: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countryText: {
    ...typography.label,
    fontSize: 13,
    color: colors.slate700,
  },
  flag: {
    fontSize: 16,
  },
  heroCopy: {
    maxWidth: 230,
    gap: spacing.md,
  },
  headline: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: colors.slate900,
  },
  benefits: {
    gap: 10,
  },
  benefitsCompact: {
    gap: 8,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.sky100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconShield: {
    width: 12,
    height: 14,
    borderWidth: 1.5,
    borderColor: colors.primaryCta,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  iconDoc: {
    width: 12,
    height: 14,
    borderWidth: 1.5,
    borderColor: colors.primaryCta,
    borderRadius: 2,
    paddingTop: 3,
    gap: 2,
    alignItems: 'center',
  },
  iconDocLine: {
    width: 6,
    height: 1.5,
    backgroundColor: colors.primaryCta,
  },
  benefitLabel: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '500',
    color: colors.slate700,
    flexShrink: 1,
  },
  panel: {
    flexGrow: 1,
    marginTop: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    shadowColor: colors.slate900,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 14,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: colors.slate900,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.subtitle,
    fontSize: 15,
    lineHeight: 22,
    color: colors.slate600,
    marginBottom: spacing.xl,
  },
  form: {
    gap: spacing.lg,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.slate100,
    borderRadius: 14,
    padding: 4,
    marginBottom: spacing.xl,
    minHeight: 48,
  },
  toggleItem: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  toggleItemActive: {
    backgroundColor: colors.white,
    shadowColor: colors.slate900,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleLabel: {
    ...typography.label,
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate500,
  },
  toggleLabelActive: {
    color: colors.primaryCta,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  infoBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.slate400,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  infoBadgeText: {
    fontSize: 11,
    lineHeight: 12,
    fontWeight: '700',
    color: colors.slate500,
  },
  helper: {
    flex: 1,
    ...typography.caption,
    color: colors.slate500,
  },
  forgot: {
    alignSelf: 'flex-end',
    minHeight: 44,
    justifyContent: 'center',
  },
  forgotText: {
    ...typography.label,
    color: colors.primaryCta,
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
