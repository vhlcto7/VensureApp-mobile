import type { ComponentProps } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button, Card, ScreenContainer } from '../../components';
import { APP_VERSION } from '../../config/env';
import {
  VENSURE_ACCOUNT_DELETION_URL,
  VENSURE_PRIVACY_POLICY_URL,
  VENSURE_TERMS_URL,
} from '../../constants/legal-urls';
import type { CustomerTabScreenProps } from '../../navigation/types';
import { getCustomerSignupConsents } from '../../services/customer-auth';
import { getCustomerProfile } from '../../services/customer-profile';
import { useAuth } from '../../store/auth-context';
import { colors, radius, spacing, typography } from '../../theme';
import type { SignupConsentDocument } from '../../types';
import { getErrorMessage } from '../../utils/errors';
import { DashboardIcon } from '../dashboard/DashboardIcon';
import { KycDocumentsSection } from './KycDocumentsSection';
import { MobileChangeSection } from './MobileChangeSection';
import { PasswordChangeSection } from './PasswordChangeSection';
import { DeleteAccountSection } from './DeleteAccountSection';
import { identityTypeLabel } from './helpers';
import type { CustomerProfileRecord } from './types';

type ProfileActionIcon = ComponentProps<typeof Ionicons>['name'];
type ProfileActionTone = ComponentProps<typeof DashboardIcon>['tone'];
type ProfileUpdateSection = 'mobile' | 'password';
type ProfileActionTileProps = {
  icon: ProfileActionIcon;
  tone: NonNullable<ProfileActionTone>;
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
};

export function ProfileScreen(_props: CustomerTabScreenProps<'Profile'>) {
  const { session, signOut, updateSessionUser } = useAuth();
  const [profile, setProfile] = useState<CustomerProfileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openSection, setOpenSection] = useState<ProfileUpdateSection | null>(null);
  const [legalDocument, setLegalDocument] = useState<SignupConsentDocument | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const next = await getCustomerProfile();
      setProfile(next);
      await updateSessionUser({
        fullName: next.fullName || 'Customer',
        name: next.fullName || 'Customer',
        email: next.email || null,
        mobileNumber: next.mobileNumber || null,
        customerType: next.customerType || 'INDIVIDUAL',
      });
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Something went wrong. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [updateSessionUser]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    let cancelled = false;
    void getCustomerSignupConsents()
      .then((document) => {
        if (!cancelled) {
          setLegalDocument(document);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLegalDocument(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleMobileApproved = useCallback(() => {
    void loadProfile();
  }, [loadProfile]);

  const display = profile || {
    customerId: session?.user.customerId || '',
    fullName: session?.user.fullName || 'Customer',
    email: session?.user.email || '',
    mobileNumber: session?.user.mobileNumber || '',
    customerType: session?.user.customerType || 'INDIVIDUAL',
  };

  return (
    <ScreenContainer scroll includeBottomSafeArea={false} contentStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>My Profile</Text>
          <Text style={styles.title}>Customer profile</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          onPress={() => void signOut()}
          hitSlop={8}
          style={({ pressed }) => [styles.signOutChip, pressed ? styles.pressed : null]}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.sky700} />
          <Text style={styles.signOutChipLabel}>Sign out</Text>
        </Pressable>
      </View>
      <Text style={styles.lede}>
        Review the contact and identity details currently linked to your customer account.
      </Text>

      {error && !profile ? (
        <Card>
          <Text style={styles.error}>{error}</Text>
          <Button label="Retry" variant="outline" onPress={() => void loadProfile()} />
        </Card>
      ) : null}

      {loading && !profile ? (
        <Card>
          <Text style={styles.muted}>Loading profile...</Text>
        </Card>
      ) : null}

      {error && profile ? <Text style={styles.error}>{error}</Text> : null}

      {!loading || profile ? (
        <Card>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Linked profile details</Text>
            <Text style={styles.muted}>
              These details are linked to your account and used across quotes, policies, and payments.
            </Text>
          </View>
          <ProfileField label="Name" value={display.fullName || 'Not provided'} />
          <ProfileField label="Current Mobile" value={display.mobileNumber || 'Not provided'} />
          <ProfileField label="Current Email" value={display.email || 'Not provided'} />
          <ProfileField label="Identity Type" value={identityTypeLabel(display.customerType)} />
          <ProfileField label="Identity Number" value="Not provided" />
        </Card>
      ) : null}

      <Card>
        <Text style={styles.sectionTitle}>Account updates</Text>
        <Text style={[styles.muted, styles.actionLede]}>
          Choose an option to update your mobile number or password.
        </Text>
        <View style={styles.actionList}>
          <ProfileActionTile
            icon="phone-portrait-outline"
            tone="sky"
            title="Update mobile"
            subtitle="Change the number linked to this account"
            selected={openSection === 'mobile'}
            onPress={() => setOpenSection((current) => (current === 'mobile' ? null : 'mobile'))}
          />
          <ProfileActionTile
            icon="lock-closed-outline"
            tone="navy"
            title="Update password"
            subtitle="Keep your account sign-in secure"
            selected={openSection === 'password'}
            onPress={() => setOpenSection((current) => (current === 'password' ? null : 'password'))}
          />
        </View>
      </Card>

      {openSection === 'mobile' ? (
        <MobileChangeSection
          currentMobileNumber={display.mobileNumber}
          onApproved={handleMobileApproved}
        />
      ) : null}

      {openSection === 'password' ? <PasswordChangeSection /> : null}

      <KycDocumentsSection customerType={display.customerType} />

      <DeleteAccountSection
        onClosed={() => {
          void signOut();
        }}
      />

      <Card>
        <Text style={styles.sectionTitle}>Legal & Privacy</Text>
        <Text style={[styles.muted, styles.actionLede]}>
          {legalDocument
            ? `${legalDocument.title}${legalDocument.version ? ` · Version ${legalDocument.version}` : ''}`
            : 'Review VenSure privacy, terms and account deletion information.'}
        </Text>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Open Privacy Policy"
          onPress={() => {
            void Linking.openURL(VENSURE_PRIVACY_POLICY_URL);
          }}
          hitSlop={8}
          style={({ pressed }) => [styles.legalLink, pressed ? styles.pressed : null]}
        >
          <Text style={styles.legalLinkText}>Privacy Policy</Text>
        </Pressable>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Open Terms and Conditions"
          onPress={() => {
            void Linking.openURL(VENSURE_TERMS_URL);
          }}
          hitSlop={8}
          style={({ pressed }) => [styles.legalLink, pressed ? styles.pressed : null]}
        >
          <Text style={styles.legalLinkText}>Terms & Conditions</Text>
        </Pressable>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Open Account Deletion Information"
          onPress={() => {
            void Linking.openURL(VENSURE_ACCOUNT_DELETION_URL);
          }}
          hitSlop={8}
          style={({ pressed }) => [styles.legalLink, pressed ? styles.pressed : null]}
        >
          <Text style={styles.legalLinkText}>Account Deletion Information</Text>
        </Pressable>
        {legalDocument?.viewUrl ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Open Customer Legal Agreement"
            onPress={() => {
              const viewUrl = legalDocument.viewUrl;
              if (viewUrl) {
                void Linking.openURL(viewUrl);
              }
            }}
            hitSlop={8}
            style={({ pressed }) => [styles.legalLink, pressed ? styles.pressed : null]}
          >
            <Text style={styles.legalLinkText}>View Customer Legal Agreement</Text>
          </Pressable>
        ) : null}
      </Card>

      <Text style={styles.appVersion} accessibilityLabel={`VenSure version ${APP_VERSION}`}>
        VenSure{'\n'}Version {APP_VERSION}
      </Text>
    </ScreenContainer>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

function ProfileActionTile({
  icon,
  tone,
  title,
  subtitle,
  selected,
  onPress,
}: ProfileActionTileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected, expanded: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionTile,
        selected ? styles.actionTileSelected : null,
        pressed ? styles.actionTilePressed : null,
      ]}
    >
      <DashboardIcon name={icon} tone={selected ? 'sky' : tone} size={18} />
      <View style={styles.actionCopy}>
        <Text style={[styles.actionTitle, selected ? styles.actionTitleSelected : null]}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons
        name={selected ? 'chevron-up' : 'chevron-forward'}
        size={18}
        color={selected ? colors.primaryCta : colors.slate400}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  signOutChip: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.sky100,
    backgroundColor: colors.sky50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },
  signOutChipLabel: {
    ...typography.label,
    fontWeight: '700',
    color: colors.sky700,
  },
  pressed: {
    opacity: 0.88,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.sky700,
  },
  title: {
    ...typography.title,
    color: colors.slate950,
  },
  lede: {
    ...typography.caption,
    color: colors.slate500,
  },
  sectionHead: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.body,
    fontWeight: '700',
    fontSize: 16,
    color: colors.slate950,
  },
  actionLede: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  actionList: {
    gap: spacing.sm,
  },
  actionTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 72,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.slate50,
  },
  actionTileSelected: {
    borderColor: colors.primaryCta,
    backgroundColor: colors.sky50,
  },
  actionTilePressed: {
    opacity: 0.88,
  },
  actionCopy: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    ...typography.body,
    fontWeight: '700',
    fontSize: 15,
    color: colors.slate950,
  },
  actionTitleSelected: {
    color: colors.sky700,
  },
  actionSubtitle: {
    ...typography.caption,
    color: colors.slate500,
  },
  field: {
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.slate50,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.slate500,
  },
  fieldValue: {
    ...typography.body,
    fontWeight: '600',
    color: colors.slate950,
    marginTop: 4,
  },
  muted: {
    ...typography.caption,
    color: colors.slate500,
  },
  error: {
    ...typography.caption,
    color: colors.rose700,
  },
  legalLink: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  legalLinkText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.sky700,
    textDecorationLine: 'underline',
  },
  appVersion: {
    ...typography.caption,
    color: colors.slate400,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
