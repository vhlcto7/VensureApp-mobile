import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Button, Card, ErrorMessage, LoadingIndicator } from '../../components';
import { DocumentPreviewModal } from '../policies/DocumentPreviewModal';
import { fetchCustomerDocumentFile, type CustomerDocumentFile } from '../../services/customer-documents';
import {
  getCustomerPolicy,
  invalidateCustomerLists,
  type CustomerPolicyDetail,
  type CustomerPolicyDocument,
} from '../../services/customer-portal';
import { clearCheckoutState, clearPendingPurchase } from '../../store/purchase-state';
import { colors, radius, spacing, typography } from '../../theme';
import { getErrorMessage } from '../../utils/errors';
import { DetailHeader } from '../customer-lists/DetailHeader';
import { DetailRow } from '../customer-lists/DetailRow';
import { documentDisplayName, documentPriority } from '../customer-lists/helpers';
import { InsurerLogo } from './InsurerLogo';

type QuotePurchaseSuccessScreenProps = {
  navigation: {
    goBack: () => void;
    navigate: (
      name: 'PolicyDetails' | 'CustomerTabs',
      params?: { policyId?: string; screen?: string },
    ) => void;
  };
  route: {
    params: { policyId: string; quoteId: string };
  };
};

const SUCCESS_DOCUMENT_KINDS = new Set(['certificate', 'cover-note', 'invoice', 'receipt']);

export function QuotePurchaseSuccessScreen({ navigation, route }: QuotePurchaseSuccessScreenProps) {
  const { policyId } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [policy, setPolicy] = useState<CustomerPolicyDetail | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [preview, setPreview] = useState<CustomerDocumentFile | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      invalidateCustomerLists();
      await Promise.all([clearCheckoutState(), clearPendingPurchase()]);
      setPolicy(await getCustomerPolicy(policyId));
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Payment was confirmed, but the policy could not be loaded yet.'));
    } finally {
      setLoading(false);
    }
  }, [policyId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function openDocument(document: CustomerPolicyDocument) {
    try {
      setBusyId(document.id);
      setPreview(null);
      setPreviewVisible(true);
      setPreview(
        await fetchCustomerDocumentFile({
          path: document.downloadPath,
          fileName: document.fileName || document.name,
          mimeType: document.mimeType,
        }),
      );
    } catch (openError) {
      setPreviewVisible(false);
      setPreview(null);
      Alert.alert('Document unavailable', getErrorMessage(openError, 'This document could not be opened.'));
    } finally {
      setBusyId('');
    }
  }

  const documents = (policy?.documents ?? [])
    .filter((document) => SUCCESS_DOCUMENT_KINDS.has(document.kind))
    .sort((left, right) => documentPriority(left.kind) - documentPriority(right.kind));

  return (
    <View style={styles.root}>
      <DetailHeader title="Payment successful" onBack={() => navigation.navigate('CustomerTabs')} />
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
              <Text style={styles.kicker}>Payment successful</Text>
              <Text style={styles.headline}>Your policy has been created.</Text>
              <View style={styles.insurer}>
                <InsurerLogo name={policy.insurerName} logoUrl={policy.logoUrl} size={40} />
                <Text style={styles.insurerName}>{policy.insurerName}</Text>
              </View>
              <DetailRow label="Policy number" value={policy.policyNumber} />
              <DetailRow label="Registration" value={policy.vehicleRegistrationNumber} />
            </Card>
            {documents.length > 0 ? (
              <Card>
                <Text style={styles.section}>Documents</Text>
                {documents.map((document) => {
                  const label = documentDisplayName(document);
                  const isBusy = busyId === document.id;
                  return (
                    <View key={document.id} style={styles.document}>
                      <Text style={styles.documentName}>{label}</Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`View ${label}`}
                        onPress={() => void openDocument(document)}
                        disabled={Boolean(busyId)}
                        style={styles.documentAction}
                      >
                        <Text style={styles.documentActionLabel}>{isBusy ? 'Opening…' : 'View'}</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </Card>
            ) : (
              <Text style={styles.pendingDocs}>Your documents will appear on the policy when they are ready.</Text>
            )}
            <Button
              label="Open Policy Details"
              variant="cta"
              onPress={() => navigation.navigate('PolicyDetails', { policyId: policy.id })}
            />
          </>
        ) : null}
      </ScrollView>
      <DocumentPreviewModal
        visible={previewVisible}
        document={preview}
        loading={Boolean(busyId) && !preview}
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
  kicker: {
    ...typography.label,
    color: '#047857',
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  headline: {
    ...typography.heading,
    fontSize: 24,
    color: colors.slate950,
    marginBottom: spacing.md,
  },
  insurer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  insurerName: {
    ...typography.body,
    fontWeight: '700',
    color: colors.slate950,
    flex: 1,
  },
  section: {
    ...typography.heading,
    fontSize: 18,
    color: colors.slate950,
    marginBottom: spacing.sm,
  },
  document: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
  },
  documentName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.slate950,
    flex: 1,
  },
  documentAction: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primaryCta,
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentActionLabel: {
    ...typography.label,
    fontWeight: '700',
    color: colors.primaryCta,
  },
  pendingDocs: {
    ...typography.body,
    color: colors.slate600,
  },
  error: {
    gap: spacing.md,
  },
});
