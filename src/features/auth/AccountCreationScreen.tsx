import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AuthBrandedScreen,
  Button,
  Checkbox,
  ErrorMessage,
  Input,
  LoadingIndicator,
} from '../../components';
import type { AuthStackScreenProps } from '../../navigation/types';
import {
  VENSURE_PRIVACY_POLICY_URL,
  VENSURE_TERMS_URL,
} from '../../constants/legal-urls';
import {
  getCustomerSignupConsents,
  signupCustomer,
} from '../../services/customer-auth';
import { useAuth } from '../../store/auth-context';
import { savePendingOtp } from '../../store/otp-challenge';
import { getSignupDraft, saveSignupDraft } from '../../store/signup-draft';
import { colors, spacing, typography } from '../../theme';
import type { CustomerAccountCreationForm, SignupConsentDocument } from '../../types';
import { getErrorMessage } from '../../utils/errors';
import {
  isDuplicateAccountError,
  isProfileReviewRequired,
  normalizeCustomerAuthError,
} from '../../utils/signup-errors';

type AccountCreationScreenProps = AuthStackScreenProps<'AccountCreation'>;

export function AccountCreationScreen({ navigation }: AccountCreationScreenProps) {
  const { signIn } = useAuth();
  const draft = getSignupDraft();
  const [form, setForm] = useState<CustomerAccountCreationForm>({
    nrcOrPassportNumber: draft?.nrcOrPassportNumber ?? '',
    acceptedLegalAgreement: draft?.acceptedLegalAgreement ?? false,
    acceptedMarketing: draft?.acceptedMarketing ?? false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerAccountCreationForm, string>>>({});
  const [consent, setConsent] = useState<SignupConsentDocument | null>(null);
  const [consentError, setConsentError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [duplicateAccount, setDuplicateAccount] = useState(false);
  const [reviewRequired, setReviewRequired] = useState(false);
  const [loadingConsents, setLoadingConsents] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!draft) {
      navigation.replace('SignUp');
    }
  }, [draft, navigation]);

  useEffect(() => {
    let cancelled = false;

    async function loadConsents() {
      setLoadingConsents(true);
      setConsentError('');

      try {
        const document = await getCustomerSignupConsents();
        if (cancelled) {
          return;
        }

        if (!document) {
          setConsentError('The Customer Legal Agreement is temporarily unavailable.');
          return;
        }

        setConsent(document);
      } catch (error) {
        if (!cancelled) {
          setConsentError(
            getErrorMessage(error, 'Unable to load the Customer Legal Agreement.'),
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingConsents(false);
        }
      }
    }

    if (draft) {
      void loadConsents();
    }

    return () => {
      cancelled = true;
    };
  }, [draft]);

  if (!draft) {
    return null;
  }

  const isBusiness = draft.customerType === 'BUSINESS';

  const persistDraft = (nextForm: CustomerAccountCreationForm) => {
    const current = getSignupDraft();
    if (!current) {
      return;
    }

    saveSignupDraft({
      ...current,
      ...nextForm,
    });
  };

  const onChange = <K extends keyof CustomerAccountCreationForm>(
    field: K,
    value: CustomerAccountCreationForm[K],
  ) => {
    setForm((current) => {
      const next = { ...current, [field]: value };
      persistDraft(next);
      return next;
    });
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError('');
    setDuplicateAccount(false);
  };

  const openLegalDocument = () => {
    if (consent?.viewUrl) {
      void Linking.openURL(consent.viewUrl);
    }
  };

  const openTerms = () => {
    void Linking.openURL(VENSURE_TERMS_URL);
  };

  const openPrivacyPolicy = () => {
    void Linking.openURL(VENSURE_PRIVACY_POLICY_URL);
  };

  const onSendOtp = async () => {
    const nextErrors: Partial<Record<keyof CustomerAccountCreationForm, string>> = {};

    if (!form.nrcOrPassportNumber.trim()) {
      nextErrors.nrcOrPassportNumber = 'NRC or passport number is required.';
    }

    if (!consent) {
      nextErrors.acceptedLegalAgreement = 'Legal agreement could not be loaded.';
    } else if (!form.acceptedLegalAgreement) {
      nextErrors.acceptedLegalAgreement =
        'Please review and accept the Customer Legal Agreement.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !consent) {
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    setDuplicateAccount(false);

    try {
      const result = await signupCustomer({
        fullName: draft.fullName,
        email: draft.email,
        mobileNumber: draft.mobileNumber,
        nrcOrPassportNumber: form.nrcOrPassportNumber,
        customerType: draft.customerType,
        password: draft.password,
        confirmPassword: draft.confirmPassword,
        acceptedLegalAgreement: form.acceptedLegalAgreement,
        legalAgreementDocumentId: consent.id,
        acceptedMarketing: form.acceptedMarketing,
      });

      if (result.state === 'AUTHENTICATED') {
        await signIn(result.session);
        return;
      }

      savePendingOtp({
        purpose: 'signup',
        mobileNumber: draft.mobileNumber,
        email: draft.email || undefined,
        ...result.challenge,
      });
      navigation.navigate('OtpVerification');
    } catch (error) {
      if (isProfileReviewRequired(error)) {
        setReviewRequired(true);
        setSubmitError('');
      } else {
        setSubmitError(normalizeCustomerAuthError(error, 'Unable to create your account.'));
        setDuplicateAccount(isDuplicateAccountError(error));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (reviewRequired) {
    return (
      <AuthBrandedScreen
        title="Verification required"
        subtitle="Your account requires verification by our support team."
      >
        <Button label="Back to signup" variant="outline" onPress={() => setReviewRequired(false)} />
      </AuthBrandedScreen>
    );
  }

  return (
    <AuthBrandedScreen
      title="Complete your profile"
      subtitle={`Add the remaining details required to create your ${
        isBusiness ? 'business' : 'individual'
      } customer account.`}
    >
      {loadingConsents ? <LoadingIndicator /> : null}
      <ErrorMessage message={consentError || submitError} />

      <View style={styles.form}>
        <Input
          label="NRC / Passport number"
          value={form.nrcOrPassportNumber}
          error={errors.nrcOrPassportNumber}
          autoCapitalize="characters"
          placeholder="Enter NRC or passport number"
          onChangeText={(value) => onChange('nrcOrPassportNumber', value)}
        />

        <View style={styles.kycNote}>
          <Text style={styles.sectionTitle}>Identity document</Text>
          <Text style={styles.sectionCopy}>
            {isBusiness
              ? 'After your account is created, upload a Certificate of Incorporation in KYC. Company name, registration number and address are not collected during self-signup.'
              : 'After your account is created, upload your NRC or Passport in KYC. Address, date of birth and gender are not collected during self-signup.'}
          </Text>
        </View>

        <View style={styles.legalBlock}>
          <Text style={styles.sectionTitle}>Required agreements</Text>
          <Text style={styles.sectionCopy}>
            {consent
              ? `${consent.title}${consent.version ? ` · Version ${consent.version}` : ''}`
              : 'Please review the VenSure Terms and Privacy Policy before continuing.'}
          </Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Open Terms and Conditions"
            hitSlop={12}
            onPress={openTerms}
            style={styles.legalLink}
          >
            <Text style={styles.legalLinkText}>Terms and Conditions</Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Open Privacy Policy"
            hitSlop={12}
            onPress={openPrivacyPolicy}
            style={styles.legalLink}
          >
            <Text style={styles.legalLinkText}>Privacy Policy</Text>
          </Pressable>
          {consent?.viewUrl ? (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Open Customer Legal Agreement"
              hitSlop={12}
              onPress={openLegalDocument}
              style={styles.legalLink}
            >
              <Text style={styles.legalLinkText}>Customer Legal Agreement</Text>
            </Pressable>
          ) : null}
        </View>

        <Checkbox
          checked={form.acceptedLegalAgreement}
          error={errors.acceptedLegalAgreement}
          label="I have reviewed and agree to the VenSure Terms and Conditions and acknowledge the Privacy Notice."
          onPress={() => onChange('acceptedLegalAgreement', !form.acceptedLegalAgreement)}
        />
        <Checkbox
          checked={form.acceptedMarketing}
          label="I would like to receive promotional offers, insurance information and marketing communications from VenSure."
          onPress={() => onChange('acceptedMarketing', !form.acceptedMarketing)}
        />

        {duplicateAccount ? (
          <Button label="Sign in" variant="outline" onPress={() => navigation.navigate('Login')} />
        ) : null}

        <Button
          label={submitting ? 'Sending OTP...' : 'Create account and verify'}
          variant="cta"
          loading={submitting}
          disabled={loadingConsents || Boolean(consentError)}
          onPress={() => void onSendOtp()}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change email"
          hitSlop={12}
          onPress={() => navigation.navigate('SignUp')}
          style={styles.back}
        >
          <Text style={styles.backText}>Change email</Text>
        </Pressable>
      </View>
    </AuthBrandedScreen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
  kycNote: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 16,
    padding: spacing.lg,
    backgroundColor: colors.slate50,
  },
  sectionTitle: {
    ...typography.heading,
    fontSize: 18,
    color: colors.slate900,
    marginBottom: spacing.sm,
  },
  sectionCopy: {
    ...typography.body,
    color: colors.slate600,
  },
  legalBlock: {
    gap: spacing.sm,
  },
  legalLink: {
    minHeight: 44,
    justifyContent: 'center',
  },
  legalLinkText: {
    ...typography.body,
    color: colors.primaryCta,
    fontWeight: '700',
  },
  back: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    ...typography.body,
    color: colors.primaryCta,
    fontWeight: '700',
  },
});
