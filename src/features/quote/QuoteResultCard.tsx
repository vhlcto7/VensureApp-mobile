import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme';
import { formatCoverType } from '../dashboard/helpers';
import { formatQuoteCurrency, getQuotePricingSummary } from './helpers';
import { InsurerLogo } from './InsurerLogo';
import type { QuoteResultItem } from './types';

type QuoteResultCardProps = {
  quote: QuoteResultItem;
  lowestPremium?: boolean;
  onViewDetails: () => void;
};

export function QuoteResultCard({ quote, lowestPremium = false, onViewDetails }: QuoteResultCardProps) {
  const coverLabel = formatCoverType(quote.coverType) || quote.coverType;
  const unavailable = quote.isExpired || quote.isUnavailable || quote.insurancePremium === undefined;
  const pricing = getQuotePricingSummary(quote);
  const promoLabel = quote.promotionName?.trim() || 'Promo';

  return (
    <View style={styles.card}>
      <View style={[styles.accent, pricing.isPromotionApplied || pricing.hasSavings ? styles.accentOffer : null]} />
      <View style={styles.body}>
        <View style={styles.top}>
          <InsurerLogo name={quote.insurerName} logoUrl={quote.logoUrl} size={40} />
          <Text style={styles.insurer} numberOfLines={2}>
            {quote.insurerName}
          </Text>
          {coverLabel ? (
            <Text style={styles.cover} numberOfLines={1}>
              {coverLabel}
            </Text>
          ) : null}
          {lowestPremium ? (
            <View style={styles.badge}>
              <Ionicons name="trophy" size={11} color="#047857" />
              <Text style={styles.badgeText}>Lowest</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.bottom}>
          <Text style={styles.premium} numberOfLines={2}>
            {quote.premiumLabel}
          </Text>
          <Text style={styles.premiumHint}>Total premium</Text>
          {pricing.isPromotionApplied || pricing.hasSavings || pricing.isDiscountApplied ? (
            <View style={styles.offers}>
              {pricing.isPromotionApplied ? (
                <View style={styles.promoChip}>
                  <Ionicons name="gift" size={12} color="#c2410c" />
                  <Text style={styles.promoText}>{promoLabel}</Text>
                </View>
              ) : null}
              {pricing.hasSavings ? (
                <View style={styles.saveChip}>
                  <Ionicons name="pricetag" size={12} color="#047857" />
                  <Text style={styles.saveText}>
                    Save {formatQuoteCurrency(pricing.totalSavings, quote.currency)}
                  </Text>
                </View>
              ) : pricing.isDiscountApplied ? (
                <View style={styles.saveChip}>
                  <Ionicons name="pricetag" size={12} color="#047857" />
                  <Text style={styles.saveText} numberOfLines={1}>
                    Discount
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View details for ${quote.insurerName}`}
            disabled={unavailable}
            onPress={onViewDetails}
            style={({ pressed }) => [
              styles.detailsButton,
              unavailable ? styles.detailsDisabled : null,
              pressed && !unavailable ? styles.pressed : null,
            ]}
          >
            <Text style={styles.detailsText}>{unavailable ? 'Unavailable' : 'View details'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: colors.heroNavy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  accent: {
    height: 4,
    backgroundColor: colors.primaryCta,
  },
  accentOffer: {
    backgroundColor: '#f97316',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#047857',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  offers: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  promoChip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    gap: 4,
    borderRadius: radius.md,
    backgroundColor: '#fff7ed',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  promoText: {
    flex: 1,
    color: '#c2410c',
    fontSize: 10,
    fontWeight: '700',
  },
  saveChip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    gap: 4,
    borderRadius: radius.md,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  saveText: {
    flex: 1,
    color: '#047857',
    fontSize: 10,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  top: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  insurer: {
    ...typography.body,
    fontWeight: '700',
    color: colors.slate950,
    fontSize: 14,
    textAlign: 'center',
  },
  cover: {
    ...typography.caption,
    color: colors.slate500,
    textAlign: 'center',
  },
  bottom: {
    alignItems: 'center',
    gap: 2,
  },
  premium: {
    ...typography.heading,
    fontSize: 16,
    color: colors.heroNavy,
    textAlign: 'center',
  },
  premiumHint: {
    ...typography.caption,
    color: colors.slate500,
    textTransform: 'uppercase',
    fontSize: 10,
    marginBottom: spacing.sm,
  },
  detailsButton: {
    alignSelf: 'stretch',
    minHeight: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryCta,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  detailsDisabled: {
    backgroundColor: colors.slate200,
  },
  pressed: {
    opacity: 0.88,
  },
  detailsText: {
    ...typography.label,
    fontWeight: '700',
    color: colors.white,
  },
});
