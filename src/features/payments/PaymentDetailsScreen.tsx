import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Button, Card, ErrorMessage, LoadingIndicator } from '../../components';
import type { CustomerStackScreenProps } from '../../navigation/types';
import { openCustomerDocument } from '../../services/customer-documents';
import {
  getCustomerPayment,
  listCustomerPolicyDocuments,
  type CustomerPaymentDetail,
} from '../../services/customer-portal';
import { colors, spacing, typography } from '../../theme';
import { getErrorMessage } from '../../utils/errors';
import { DetailHeader } from '../customer-lists/DetailHeader';
import { DetailRow } from '../customer-lists/DetailRow';
import { StatusBadge } from '../customer-lists/StatusBadge';
import {
  formatCustomerDateTime,
  formatCustomerMoney,
  formatEnumLabel,
  mapPaymentStatusLabel,
  paymentMethodLabel,
  paymentStatusTone,
} from '../customer-lists/helpers';

type Props = CustomerStackScreenProps<'PaymentDetails'>;

export function PaymentDetailsScreen({ navigation, route }: Props) {
  const { transactionId } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openingReceipt, setOpeningReceipt] = useState(false);
  const [payment, setPayment] = useState<CustomerPaymentDetail | null>(null);
  const [hasReceipt, setHasReceipt] = useState(false);
  const [receiptPath, setReceiptPath] = useState('');
  const [receiptName, setReceiptName] = useState('receipt');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setHasReceipt(false);
    try {
      const result = await getCustomerPayment(transactionId);
      setPayment(result);
      if (result.policyId) {
        try {
          const documents = await listCustomerPolicyDocuments(result.policyId);
          const receipt = documents.find((document) => document.kind === 'receipt');
          if (receipt) {
            setHasReceipt(true);
            setReceiptPath(receipt.downloadPath);
            setReceiptName(receipt.fileName || receipt.name);
          }
        } catch {
          setHasReceipt(false);
        }
      }
    } catch (loadError) {
      setPayment(null);
      setError(getErrorMessage(loadError, 'Unable to load payment details.'));
    } finally {
      setLoading(false);
    }
  }, [transactionId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function openReceipt() {
    if (!receiptPath) return;
    try {
      setOpeningReceipt(true);
      await openCustomerDocument({ path: receiptPath, fileName: receiptName });
    } catch (openError) {
      Alert.alert(
        'Receipt unavailable',
        getErrorMessage(openError, 'Receipt is not available yet. Please refresh or contact support.'),
      );
    } finally {
      setOpeningReceipt(false);
    }
  }

  const statusLabel = payment ? mapPaymentStatusLabel(payment.status) : '';
  const hasFee =
    payment?.serviceCharge !== undefined ||
    payment?.processingFee !== undefined ||
    payment?.feeAmount !== undefined;

  return (
    <View style={styles.root}>
      <DetailHeader title="Payment Details" subtitle={payment?.paymentReference} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <LoadingIndicator /> : null}
        {error ? (
          <View style={styles.error}>
            <ErrorMessage message={error} />
            <Button label="Retry" variant="outline" onPress={() => void load()} />
          </View>
        ) : null}
        {payment ? (
          <>
            <Card>
              <View style={styles.top}>
                <Text style={styles.amount}>
                  {formatCustomerMoney(payment.amount, payment.currencyCode) || '—'}
                </Text>
                <StatusBadge label={statusLabel} tone={paymentStatusTone(payment.status)} />
              </View>
              <DetailRow label="Status" value={statusLabel} />
              <DetailRow label="Payment method" value={paymentMethodLabel(payment.paymentMethod)} />
              <DetailRow label="Reference" value={payment.paymentReference} />
              <DetailRow label="GeePay reference" value={payment.externalPaymentReference} />
              <DetailRow label="Date" value={formatCustomerDateTime(payment.createdDate)} />
              <DetailRow label="Policy" value={payment.policyNumber} />
              <DetailRow label="Quote" value={payment.quoteReference} />
              <DetailRow label="Registration" value={payment.vehicleRegistrationNumber} />
              <DetailRow label="Cover type" value={formatEnumLabel(payment.coverType)} />
            </Card>
            {hasFee || payment.insurancePremium !== undefined || payment.totalPayable !== undefined ? (
              <Card>
                <Text style={styles.section}>Amount</Text>
                <DetailRow
                  label="Premium"
                  value={formatCustomerMoney(payment.insurancePremium, payment.currencyCode)}
                />
                <DetailRow
                  label="Service fee"
                  value={formatCustomerMoney(payment.serviceCharge, payment.currencyCode)}
                />
                <DetailRow
                  label="Processing fee"
                  value={formatCustomerMoney(payment.processingFee ?? payment.feeAmount, payment.currencyCode)}
                />
                <DetailRow
                  label="Total paid"
                  value={formatCustomerMoney(payment.amount ?? payment.totalPayable, payment.currencyCode)}
                />
              </Card>
            ) : null}
            {hasReceipt ? (
              <Button
                label="View Receipt"
                variant="cta"
                loading={openingReceipt}
                onPress={() => void openReceipt()}
              />
            ) : null}
            {payment.policyId ? (
              <Button
                label="View Policy"
                variant="outline"
                onPress={() => navigation.navigate('PolicyDetails', { policyId: payment.policyId as string })}
              />
            ) : null}
          </>
        ) : null}
      </ScrollView>
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
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  amount: {
    ...typography.title,
    fontSize: 26,
    color: colors.slate950,
    flex: 1,
  },
  section: {
    ...typography.heading,
    fontSize: 18,
    color: colors.slate950,
    marginBottom: spacing.sm,
  },
  error: {
    gap: spacing.md,
  },
});
