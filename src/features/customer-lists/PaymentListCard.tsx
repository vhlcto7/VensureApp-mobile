import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import type { CustomerPaymentRecord } from '../../services/customer-portal';
import {
  formatCustomerDate,
  formatCustomerMoney,
  formatEnumLabel,
  joinMeta,
  mapPaymentStatusLabel,
  paymentStatusTone,
} from './helpers';
import { StatusBadge } from './StatusBadge';

type PaymentListCardProps = {
  payment: CustomerPaymentRecord;
  onPress: () => void;
};

export function PaymentListCard({ payment, onPress }: PaymentListCardProps) {
  const statusLabel = mapPaymentStatusLabel(payment.status);
  const amount = formatCustomerMoney(payment.amount, payment.currencyCode);
  const meta = joinMeta([
    payment.vehicleRegistrationNumber,
    payment.policyNumber,
    payment.paymentReference || payment.quoteReference,
    formatEnumLabel(payment.paymentMethod),
  ]);

  return (
    <Card style={styles.card}>
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.press}>
        <View style={styles.top}>
          <View style={styles.copy}>
            <Text numberOfLines={1} style={styles.title}>
              {statusLabel ? `Payment ${statusLabel}` : 'Payment'}
            </Text>
            {meta ? (
              <Text numberOfLines={1} style={styles.meta}>
                {meta}
              </Text>
            ) : null}
          </View>
          <StatusBadge label={statusLabel} tone={paymentStatusTone(payment.status)} />
        </View>
        <View style={styles.footer}>
          <Text style={styles.date}>{formatCustomerDate(payment.createdDate) || '—'}</Text>
          {amount ? <Text style={styles.amount}>{amount}</Text> : null}
        </View>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: 0,
  },
  press: {
    gap: spacing.sm,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.label,
    fontWeight: '700',
    color: colors.slate950,
  },
  meta: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 16,
    color: colors.slate500,
    marginTop: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  date: {
    ...typography.caption,
    color: colors.slate500,
  },
  amount: {
    ...typography.label,
    fontWeight: '700',
    color: colors.slate950,
  },
});
