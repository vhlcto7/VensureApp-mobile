import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import type { CustomerQuoteRecord } from '../../services/customer-portal';
import { formatCoverType } from '../dashboard/helpers';
import { InsurerLogo } from '../quote/InsurerLogo';
import {
  formatCustomerDate,
  formatCustomerMoney,
  joinMeta,
  quoteStatusTone,
  vehicleMakeModel,
} from './helpers';
import { StatusBadge } from './StatusBadge';

type QuoteListCardProps = {
  quote: CustomerQuoteRecord;
  onPress: () => void;
  accent?: boolean;
};

export function QuoteListCard({ quote, onPress, accent = false }: QuoteListCardProps) {
  const vehicle = vehicleMakeModel(quote.vehicleMake, quote.vehicleModel, quote.vehicleYear);
  const meta = joinMeta([
    quote.vehicleRegistrationNumber || quote.quoteReference,
    vehicle,
    formatCoverType(quote.coverType),
    formatCoverType(quote.policyProductType),
  ]);
  const amount = formatCustomerMoney(quote.premium, quote.currency);
  const insurerName = quote.insurerName || 'Insurer';

  return (
    <Card style={[styles.card, accent ? styles.cardGreen : null]}>
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.press}>
        <View style={styles.top}>
          <InsurerLogo name={insurerName} logoUrl={quote.logoUrl} size={32} />
          <View style={styles.copy}>
            <Text numberOfLines={1} style={styles.insurer}>
              {insurerName}
            </Text>
            {meta ? (
              <Text numberOfLines={1} style={styles.meta}>
                {meta}
              </Text>
            ) : null}
          </View>
          <StatusBadge label={quote.quoteStatus} tone={quoteStatusTone(quote.quoteStatus)} />
        </View>
        <View style={styles.footer}>
          <Text style={styles.date}>{formatCustomerDate(quote.createdDate) || '—'}</Text>
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
  cardGreen: {
    backgroundColor: '#f1f8e4',
    borderColor: 'rgba(139, 197, 63, 0.35)',
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
  insurer: {
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
