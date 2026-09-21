import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';

import { Button, Card } from '../../components';
import { openCustomerDocument } from '../../services/customer-documents';
import {
  deleteCustomerKycDocument,
  getCustomerKyc,
  listCustomerKycDocuments,
  uploadCustomerKycDocument,
} from '../../services/customer-profile';
import { colors, radius, spacing, typography } from '../../theme';
import { getErrorMessage } from '../../utils/errors';
import { StatusBadge } from '../customer-lists/StatusBadge';
import { formatCustomerDate } from '../customer-lists/helpers';
import {
  canDeleteKycDocument,
  formatDocumentStatus,
  formatFileSize,
  formatKycStatus,
  kycDocumentHelper,
  kycDocumentTitle,
  kycStatusTone,
  missingKycMessage,
  requiredKycTypes,
} from './helpers';
import type { CustomerKycDocument, CustomerKycDocumentType, SelectedKycFile } from './types';

const ACCEPTED_MIME = ['application/pdf', 'image/jpeg', 'image/png'];
const ACCEPTED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

type KycDocumentsSectionProps = {
  customerType?: string;
};

export function KycDocumentsSection({ customerType }: KycDocumentsSectionProps) {
  const [documents, setDocuments] = useState<CustomerKycDocument[]>([]);
  const [status, setStatus] = useState('PENDING');
  const [requiredTypes, setRequiredTypes] = useState<CustomerKycDocumentType[]>(
    requiredKycTypes(customerType),
  );
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyType, setBusyType] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Partial<Record<CustomerKycDocumentType, SelectedKycFile>>>({});

  const loadKyc = useCallback(async () => {
    try {
      setError('');
      const [kyc, list] = await Promise.all([getCustomerKyc(), listCustomerKycDocuments()]);
      setStatus(kyc.status);
      setIsComplete(kyc.isComplete);
      setRequiredTypes(
        kyc.requiredDocuments.length > 0 ? kyc.requiredDocuments : requiredKycTypes(kyc.customerType || customerType),
      );
      setDocuments(list);
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load KYC documents.'));
    } finally {
      setLoading(false);
    }
  }, [customerType]);

  useEffect(() => {
    void loadKyc();
  }, [loadKyc]);

  const documentsByType = useMemo(() => {
    const map = new Map<CustomerKycDocumentType, CustomerKycDocument>();
    for (const document of documents) {
      if (!map.has(document.documentType)) map.set(document.documentType, document);
    }
    return map;
  }, [documents]);

  const missing = requiredTypes.filter((type) => !documentsByType.get(type));
  const statusLabel = formatKycStatus(status);

  async function selectFile(type: CustomerKycDocumentType) {
    setError('');
    setInfo('');
    const result = await DocumentPicker.getDocumentAsync({
      type: ACCEPTED_MIME,
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const name = asset.name || 'document';
    const mimeType = asset.mimeType || mimeFromName(name);
    const size = asset.size;
    const lower = name.toLowerCase();
    const allowed =
      ACCEPTED_MIME.includes(mimeType) || ACCEPTED_EXTENSIONS.some((extension) => lower.endsWith(extension));

    if (!allowed) {
      setError('Accepted files are PDF, JPG, JPEG, and PNG.');
      return;
    }
    if (size && size > MAX_UPLOAD_BYTES) {
      setError('Each document must be 5 MB or smaller.');
      return;
    }

    setSelectedFiles((current) => ({
      ...current,
      [type]: { uri: asset.uri, name, mimeType, size },
    }));
  }

  async function uploadFile(type: CustomerKycDocumentType) {
    const file = selectedFiles[type];
    if (!file) {
      setError('Choose a file before uploading.');
      return;
    }

    try {
      setBusyType(type);
      setError('');
      setInfo('');
      await uploadCustomerKycDocument(type, file);
      setSelectedFiles((current) => ({ ...current, [type]: undefined }));
      await loadKyc();
      setInfo('Document uploaded successfully.');
    } catch (uploadError) {
      setError(getErrorMessage(uploadError, 'Unable to upload the document.'));
    } finally {
      setBusyType('');
    }
  }

  function confirmDelete(document: CustomerKycDocument) {
    if (!canDeleteKycDocument(document.status)) return;
    Alert.alert(
      'Delete document?',
      'This uploaded document will be removed from your KYC submission.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void deleteDocument(document),
        },
      ],
    );
  }

  async function deleteDocument(document: CustomerKycDocument) {
    try {
      setError('');
      setInfo('');
      await deleteCustomerKycDocument(document.id);
      await loadKyc();
      setInfo('Document removed successfully.');
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Unable to delete the document.'));
    }
  }

  async function viewDocument(document: CustomerKycDocument) {
    try {
      setError('');
      await openCustomerDocument({
        path: `/customer/kyc/documents/${document.id}/download`,
        fileName: document.fileName,
        mimeType: document.mimeType,
      });
    } catch (viewError) {
      setError(getErrorMessage(viewError, 'Unable to open the document.'));
    }
  }

  if (loading) {
    return (
      <Card>
        <Text style={styles.muted}>Loading KYC documents...</Text>
      </Card>
    );
  }

  return (
    <Card>
      <View style={styles.header}>
        <Text style={styles.title}>KYC Documents</Text>
        <StatusBadge label={statusLabel} tone={kycStatusTone(statusLabel)} />
      </View>

      {missing.length > 0 ? (
        <View style={styles.warnBox}>
          <Text style={styles.warnText}>{missingKycMessage(customerType)}</Text>
        </View>
      ) : (
        <View style={styles.successBox}>
          <Text style={styles.successText}>
            {isComplete
              ? 'All required documents are uploaded.'
              : 'All required documents are uploaded. You can submit your KYC for review.'}
          </Text>
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {info ? <Text style={styles.info}>{info}</Text> : null}

      {requiredTypes.map((type) => {
        const document = documentsByType.get(type);
        const selected = selectedFiles[type];
        const documentStatus = formatDocumentStatus(document?.status);
        return (
          <View key={type} style={styles.docCard}>
            <View style={styles.docHead}>
              <View style={styles.docIcon}>
                <Ionicons
                  name={type === 'INCORPORATION_CERTIFICATE' ? 'business-outline' : 'id-card-outline'}
                  size={18}
                  color={colors.sky700}
                />
              </View>
              <View style={styles.docCopy}>
                <Text style={styles.docTitle}>{kycDocumentTitle(type)}</Text>
                <Text style={styles.helper}>{kycDocumentHelper(type)}</Text>
              </View>
            </View>
            <StatusBadge label={documentStatus} tone={kycStatusTone(documentStatus)} />

            <View style={styles.fileBox}>
              {document ? (
                <>
                  <Text style={styles.fileName}>{document.fileName}</Text>
                  {document.uploadedAt ? (
                    <Text style={styles.muted}>Uploaded {formatCustomerDate(document.uploadedAt)}</Text>
                  ) : null}
                  {document.fileSize ? <Text style={styles.muted}>{formatFileSize(document.fileSize)}</Text> : null}
                </>
              ) : (
                <Text style={styles.muted}>No file uploaded yet.</Text>
              )}
            </View>

            <View style={styles.actions}>
              <Button
                label={document ? 'Replace file' : 'Select file'}
                variant="outline"
                style={styles.actionButton}
                disabled={busyType === type}
                onPress={() => void selectFile(type)}
              />
              <Button
                label={busyType === type ? 'Uploading...' : 'Upload'}
                variant="cta"
                style={styles.actionButton}
                disabled={!selected || busyType === type}
                loading={busyType === type}
                onPress={() => void uploadFile(type)}
              />
            </View>
            <Text style={selected ? styles.selectedHint : styles.muted}>
              {selected ? `Selected: ${selected.name}` : 'Choose a document, then tap Upload.'}
            </Text>

            {document ? (
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`View ${document.fileName}`}
                  onPress={() => void viewDocument(document)}
                  style={styles.linkHit}
                >
                  <Text style={styles.link}>View</Text>
                </Pressable>
                {canDeleteKycDocument(document.status) ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${document.fileName}`}
                    onPress={() => confirmDelete(document)}
                    style={styles.linkHit}
                  >
                    <Text style={styles.deleteLink}>Delete</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}
    </Card>
  );
}

function mimeFromName(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.body,
    fontWeight: '700',
    fontSize: 16,
    color: colors.slate950,
  },
  warnBox: {
    backgroundColor: colors.amber50,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  warnText: {
    ...typography.caption,
    color: colors.amber800,
  },
  successBox: {
    backgroundColor: '#ecfdf5',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  successText: {
    ...typography.caption,
    color: '#047857',
  },
  error: {
    ...typography.caption,
    color: colors.rose700,
    marginBottom: spacing.md,
  },
  info: {
    ...typography.caption,
    color: '#047857',
    marginBottom: spacing.md,
  },
  muted: {
    ...typography.caption,
    color: colors.slate500,
  },
  helper: {
    ...typography.caption,
    color: colors.slate500,
    marginTop: 2,
  },
  docCard: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.slate50,
  },
  docHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.sky100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docCopy: {
    flex: 1,
    minWidth: 0,
  },
  docTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.slate950,
  },
  fileBox: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: spacing.md,
    gap: 4,
  },
  fileName: {
    ...typography.label,
    fontWeight: '700',
    color: colors.slate950,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    minHeight: 44,
  },
  selectedHint: {
    ...typography.caption,
    color: colors.sky700,
  },
  linkHit: {
    minHeight: 44,
    justifyContent: 'center',
    paddingRight: spacing.md,
  },
  link: {
    ...typography.label,
    color: colors.primaryCta,
    fontWeight: '700',
  },
  deleteLink: {
    ...typography.label,
    color: colors.rose700,
    fontWeight: '700',
  },
});
