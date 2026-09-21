import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '../../components';
import type { CustomerQuoteRecord } from '../../services/customer-portal';
import { colors, radius, spacing, typography } from '../../theme';
import { formatCoverType } from '../dashboard/helpers';
import { InsurerLogo } from '../quote/InsurerLogo';
import { formatCustomerDate, formatCustomerMoney, joinMeta, vehicleMakeModel } from './helpers';

export type CustomerQuoteSet = {
  key: string;
  quoteRequestId?: string;
  quotes: CustomerQuoteRecord[];
};

type QuoteSetCardProps = {
  quoteSet: CustomerQuoteSet;
  accent?: boolean;
  onCompare: () => void;
  onViewQuote: (quoteId: string) => void;
};

export function groupQuotesByRequest(quotes: CustomerQuoteRecord[]): CustomerQuoteSet[] {
  const groups = new Map<string, CustomerQuoteSet>();
  const order: string[] = [];

  for (const quote of quotes) {
    const key = quote.quoteRequestId || `quote:${quote.id}`;
    const existing = groups.get(key);
    if (existing) {
      existing.quotes.push(quote);
      continue;
    }
    groups.set(key, {
      key,
      quoteRequestId: quote.quoteRequestId,
      quotes: [quote],
    });
    order.push(key);
  }

  return order.map((key) => groups.get(key)).filter((group): group is CustomerQuoteSet => Boolean(group));
}

function uniqueInsurers(quotes: CustomerQuoteRecord[]) {
  const seen = new Set<string>();
  const insurers: CustomerQuoteRecord[] = [];
  for (const quote of quotes) {
    const name = quote.insurerName.trim().toLowerCase();
    if (seen.has(name)) continue;
    seen.add(name);
    insurers.push(quote);
  }
  return insurers;
}

export function QuoteSetCard({ quoteSet, accent = false, onCompare, onViewQuote }: QuoteSetCardProps) {
  const lead = quoteSet.quotes[0];
  const insurers = uniqueInsurers(quoteSet.quotes);
  const extraInsurers = Math.max(0, insurers.length - 4);
  const premiums = quoteSet.quotes
    .map((quote) => quote.premium ?? quote.totalPayable)
    .filter((amount): amount is number => typeof amount === 'number' && Number.isFinite(amount));
  const fromAmount =
    premiums.length > 0 ? formatCustomerMoney(Math.min(...premiums), lead.currency || 'ZMW') : '';
  const vehicle = vehicleMakeModel(lead.vehicleMake, lead.vehicleModel, lead.vehicleYear);
  const meta = joinMeta([
    formatCoverType(lead.coverType),
    formatCoverType(lead.policyProductType),
    vehicle,
  ]);
  const optionLabel = `${insurers.length} ${insurers.length === 1 ? 'option' : 'options'}`;
  const canCompare = Boolean(quoteSet.quoteRequestId);
  const handlePress = canCompare ? onCompare : () => onViewQuote(lead.id);

  return (
    <Card style={[styles.card, accent ? styles.cardGreen : null]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          canCompare
            ? `Compare ${optionLabel} for ${lead.vehicleRegistrationNumber || 'this quote'}`
            : `View quote for ${lead.vehicleRegistrationNumber || lead.quoteReference}`
        }
        onPress={handlePress}
        style={styles.press}
      >
        <View style={styles.top}>
          <View style={styles.copy}>
            <Text numberOfLines={1} style={styles.registration}>
              {lead.vehicleRegistrationNumber || lead.quoteReference}
            </Text>
            {meta ? (
              <Text numberOfLines={2} style={styles.meta}>
                {meta}
              </Text>
            ) : null}
          </View>
          <Text style={styles.date}>{formatCustomerDate(lead.createdDate) || '—'}</Text>
        </View>

        <View style={styles.insurers}>
          <View style={styles.logos}>
            {insurers.slice(0, 4).map((quote, index) => (
              <View key={quote.id} style={[styles.logoWrap, index > 0 ? styles.logoOverlap : null]}>
                <InsurerLogo name={quote.insurerName} logoUrl={quote.logoUrl} size={28} />
              </View>
            ))}
            {extraInsurers > 0 ? <Text style={styles.extra}>+{extraInsurers}</Text> : null}
          </View>
          <View style={styles.summary}>
            <Text style={styles.optionCount}>{optionLabel}</Text>
            {fromAmount ? <Text style={styles.fromAmount}>From {fromAmount}</Text> : null}
          </View>
        </View>

        {canCompare ? (
          <View style={styles.compare}>
            <Ionicons name="git-compare-outline" size={16} color={colors.white} />
            <Text style={styles.compareLabel}>Compare quotes</Text>
          </View>
        ) : (
          <View style={[styles.compare, styles.compareSecondary]}>
            <Text style={styles.compareSecondaryLabel}>View details</Text>
          </View>
        )}
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
    gap: spacing.md,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  registration: {
    ...typography.label,
    fontWeight: '700',
    color: colors.slate950,
    fontSize: 16,
  },
  meta: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 16,
    color: colors.slate500,
    marginTop: 2,
  },
  date: {
    ...typography.caption,
    color: colors.slate500,
  },
  insurers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logos: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  logoWrap: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: colors.white,
  },
  logoOverlap: {
    marginLeft: -8,
  },
  extra: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.slate600,
    marginLeft: spacing.sm,
  },
  summary: {
    alignItems: 'flex-end',
  },
  optionCount: {
    ...typography.caption,
    color: colors.slate500,
  },
  fromAmount: {
    ...typography.label,
    fontWeight: '700',
    color: colors.slate950,
  },
  compare: {
    minHeight: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryCta,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  compareLabel: {
    ...typography.label,
    fontWeight: '700',
    color: colors.white,
  },
  compareSecondary: {
    backgroundColor: colors.sky50,
    borderWidth: 1,
    borderColor: colors.sky300,
  },
  compareSecondaryLabel: {
    ...typography.label,
    fontWeight: '700',
    color: colors.sky700,
  },
});
