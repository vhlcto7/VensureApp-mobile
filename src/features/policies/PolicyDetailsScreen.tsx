import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';

import { Button, Card, ErrorMessage, LoadingIndicator } from '../../components';
import type { CustomerStackScreenProps } from '../../navigation/types';
import {
  downloadCustomerDocument,
  fetchCustomerDocumentFile,
  type CustomerDocumentFile,
} from '../../services/customer-documents';
import {
  getCustomerPolicy,
  type CustomerPolicyDetail,
  type CustomerPolicyDocument,
} from '../../services/customer-portal';
import { openSupportWhatsApp } from '../../services/support-contacts';
import { colors, radius, spacing, typography } from '../../theme';
import { getErrorMessage } from '../../utils/errors';
import { DetailHeader } from '../customer-lists/DetailHeader';
import { DetailRow } from '../customer-lists/DetailRow';
import { StatusBadge } from '../customer-lists/StatusBadge';
import {
  documentPriority,
  formatCustomerDate,
  formatCustomerMoney,
  formatEnumLabel,
  policyDaysRemaining,
  policyStatusTone,
} from '../customer-lists/helpers';
import { formatRenewalDue } from '../dashboard/helpers';
import { InsurerLogo } from '../quote/InsurerLogo';
import { DocumentPreviewModal } from './DocumentPreviewModal';

type Props = CustomerStackScreenProps<'PolicyDetails'>;

export function PolicyDetailsScreen({ navigation, route }: Props) {
  const { policyId } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [busyAction, setBusyAction] = useState<'view' | 'download' | ''>('');
  const [policy, setPolicy] = useState<CustomerPolicyDetail | null>(null);
  const [preview, setPreview] = useState<CustomerDocumentFile | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setPolicy(await getCustomerPolicy(policyId));
    } catch (loadError) {
      setPolicy(null);
      setError(getErrorMessage(loadError, 'Unable to load policy details.'));
    } finally {
      setLoading(false);
    }
  }, [policyId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const documents = useMemo(() => {
    return [...(policy?.documents ?? [])].sort((left, right) => documentPriority(left.kind) - documentPriority(right.kind));
  }, [policy]);

  const remaining = policy ? policyDaysRemaining(policy.expiryDate) : Number.NaN;
  const showRenewalDue = policy?.displayStatus === 'Expiring Soon' && Number.isFinite(remaining);
  const canRenew =
    policy?.displayStatus === 'Expiring Soon' || policy?.displayStatus === 'Expired';
  const canReportClaim =
    policy?.displayStatus === 'Active' || policy?.displayStatus === 'Expiring Soon';

  function goToRenew() {
    if (!policy?.vehicleId) {
      Alert.alert(
        'Unable to renew',
        'This policy is not linked to a saved vehicle. Start a new quote from Get a Quote.',
      );
      return;
    }
    navigation.navigate('MotorQuote', { customerVehicleId: policy.vehicleId });
  }

  async function handleDocument(document: CustomerPolicyDocument, action: 'view' | 'download') {
    try {
      setBusyId(document.id);
      setBusyAction(action);
      const payload = {
        path: document.downloadPath,
        fileName: document.fileName || document.name,
        mimeType: document.mimeType,
      };
      if (action === 'download') {
        await downloadCustomerDocument(payload);
        return;
      }
      setPreview(null);
      setPreviewVisible(true);
      setPreview(await fetchCustomerDocumentFile(payload));
    } catch (openError) {
      setPreviewVisible(false);
      setPreview(null);
      Alert.alert(
        action === 'download' ? 'Unable to download' : 'Document unavailable',
        getErrorMessage(
          openError,
          action === 'download' ? 'This document could not be downloaded.' : 'This document could not be opened.',
        ),
      );
    } finally {
      setBusyId('');
      setBusyAction('');
    }
  }

  return (
    <View style={styles.root}>
      <DetailHeader title="Policy Details" subtitle={policy?.policyNumber} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <LoadingIndicator /> : null}
        {error ? (
          <View style={styles.error}>
            <ErrorMessage message={error} />
            <Button label="Retry" variant="outline" onPress={() => void load()} />
          </View>
        ) : null}
        {policy ? (
          <>
            <Card>
              <View style={styles.insurerRow}>
                <InsurerLogo name={policy.insurerName} logoUrl={policy.logoUrl} size={48} />
                <View style={styles.copy}>
                  <Text style={styles.heading}>{policy.insurerName}</Text>
                  <Text style={styles.meta}>{policy.vehicleRegistrationNumber || policy.vehicleDetails}</Text>
                </View>
                <StatusBadge label={policy.displayStatus} tone={policyStatusTone(policy.displayStatus)} />
              </View>
              <DetailRow label="Policy number" value={policy.policyNumber} />
              <DetailRow label="Registration" value={policy.vehicleRegistrationNumber} />
              <DetailRow label="Vehicle" value={policy.vehicleDetails} />
              <DetailRow label="Cover type" value={formatEnumLabel(policy.coverType)} />
              <DetailRow label="Vehicle use" value={formatEnumLabel(policy.policyProductType)} />
              <DetailRow label="Start date" value={formatCustomerDate(policy.startDate)} />
              <DetailRow label="End date" value={formatCustomerDate(policy.expiryDate)} />
              <DetailRow
                label="Premium"
                value={formatCustomerMoney(policy.totalPremium || policy.premiumPaid, policy.currency)}
              />
              {showRenewalDue ? <Text style={styles.renewal}>{formatRenewalDue(remaining)}</Text> : null}
              <Text style={styles.expiryNote}>Expires on {formatCustomerDate(policy.expiryDate) || '—'}</Text>
            </Card>
            {canRenew ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Renew Now"
                onPress={goToRenew}
                style={({ pressed }) => [pressed ? styles.pressed : null]}
              >
                <LinearGradient
                  colors={[colors.primaryCta, colors.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.renewCta}
                >
                  <View style={styles.renewIcon}>
                    <Ionicons name="refresh" size={18} color={colors.white} />
                  </View>
                  <View style={styles.copy}>
                    <Text style={styles.renewTitle}>Renew Now</Text>
                    <Text style={styles.renewSubtitle}>
                      Get a new quote for {policy.vehicleRegistrationNumber || 'this vehicle'}
                    </Text>
                  </View>
                  <View style={styles.renewArrow} accessibilityElementsHidden>
                    <Ionicons name="arrow-forward" size={16} color={colors.white} />
                  </View>
                </LinearGradient>
              </Pressable>
            ) : null}
            {canReportClaim ? (
              <Button
                label="Chat about a claim"
                variant="outline"
                onPress={() =>
                  void openSupportWhatsApp({
                    kind: 'claim',
                    policyNumber: policy.policyNumber,
                    vehicleRegistration: policy.vehicleRegistrationNumber,
                    insurerName: policy.insurerName,
                  })
                }
              />
            ) : null}
            {documents.length > 0 ? (
              <Card>
                <Text style={styles.section}>Documents</Text>
                {documents.map((document) => {
                  const isBusy = busyId === document.id;
                  return (
                  <View key={document.id} style={styles.document}>
                    <View style={styles.copy}>
                      <Text style={styles.documentName}>{document.name}</Text>
                    </View>
                    <View style={styles.documentActions}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`View ${document.name}`}
                        onPress={() => void handleDocument(document, 'view')}
                        disabled={isBusy}
                        style={styles.documentAction}
                      >
                        <Text style={styles.documentActionLabel}>
                          {isBusy && busyAction === 'view' ? 'Opening…' : 'View'}
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Download ${document.name}`}
                        onPress={() => void handleDocument(document, 'download')}
                        disabled={isBusy}
                        style={[styles.documentAction, styles.documentDownload]}
                      >
                        <Ionicons
                          name="download-outline"
                          size={14}
                          color={colors.white}
                        />
                        <Text style={styles.documentDownloadLabel}>
                          {isBusy && busyAction === 'download' ? 'Saving…' : 'Download'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                  );
                })}
              </Card>
            ) : null}
          </>
        ) : null}
      </ScrollView>
      <DocumentPreviewModal
        visible={previewVisible}
        document={preview}
        loading={busyAction === 'view' && !preview}
        onClose={() => {
          setPreviewVisible(false);
          setPreview(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  insurerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  heading: {
    ...typography.heading,
    fontSize: 18,
    color: colors.slate950,
  },
  meta: {
    ...typography.caption,
    color: colors.slate500,
    marginTop: 2,
  },
  section: {
    ...typography.heading,
    fontSize: 18,
    color: colors.slate950,
    marginBottom: spacing.md,
  },
  renewal: {
    ...typography.body,
    fontWeight: '700',
    color: colors.amber800,
    marginTop: spacing.sm,
  },
  expiryNote: {
    ...typography.caption,
    color: colors.slate500,
    marginTop: spacing.sm,
  },
  pressed: {
    opacity: 0.88,
  },
  renewCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 76,
  },
  renewIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  renewTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.white,
  },
  renewSubtitle: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  renewArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  document: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
  },
  documentName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.slate950,
  },
  documentActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  documentAction: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primaryCta,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  documentActionLabel: {
    ...typography.label,
    fontWeight: '700',
    color: colors.primaryCta,
  },
  documentDownload: {
    backgroundColor: colors.primaryCta,
    borderColor: colors.primaryCta,
  },
  documentDownloadLabel: {
    ...typography.label,
    fontWeight: '700',
    color: colors.white,
  },
  error: {
    gap: spacing.md,
  },
});
