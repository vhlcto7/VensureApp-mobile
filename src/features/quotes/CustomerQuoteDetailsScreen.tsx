import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Button, Card, ErrorMessage, LoadingIndicator } from '../../components';
import type { CustomerStackScreenProps } from '../../navigation/types';
import { getCustomerQuote, type CustomerQuoteDetail } from '../../services/customer-portal';
import { colors, spacing, typography } from '../../theme';
import { getErrorMessage } from '../../utils/errors';
import { DetailHeader } from '../customer-lists/DetailHeader';
import { DetailRow } from '../customer-lists/DetailRow';
import { StatusBadge } from '../customer-lists/StatusBadge';
import {
  formatCustomerDate,
  formatCustomerMoney,
  formatEnumLabel,
  quoteStatusTone,
  vehicleMakeModel,
} from '../customer-lists/helpers';
import { getPolicyDurationLabel } from '../quote/helpers';

type Props = CustomerStackScreenProps<'CustomerQuoteDetails'>;

export function CustomerQuoteDetailsScreen({ navigation, route }: Props) {
  const { quoteId } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quote, setQuote] = useState<CustomerQuoteDetail | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setQuote(await getCustomerQuote(quoteId));
    } catch (loadError) {
      setQuote(null);
      setError(getErrorMessage(loadError, 'Unable to load quote details.'));
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const vehicle = quote ? vehicleMakeModel(quote.vehicleMake, quote.vehicleModel, quote.vehicleYear) : '';
  const amount = quote ? formatCustomerMoney(quote.premium ?? quote.totalPayable, quote.currency) : '';
  const duration = quote
    ? getPolicyDurationLabel(quote.policyDuration) || formatEnumLabel(quote.policyDuration)
    : '';

  return (
    <View style={styles.root}>
      <DetailHeader title="Quote Details" subtitle={quote?.quoteReference} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <LoadingIndicator /> : null}
        {error ? (
          <View style={styles.error}>
            <ErrorMessage message={error} />
            <Button label="Retry" variant="outline" onPress={() => void load()} />
          </View>
        ) : null}
        {quote ? (
          <>
            <Card>
              <View style={styles.badgeRow}>
                <Text style={styles.heading}>{quote.vehicleRegistrationNumber || quote.quoteReference}</Text>
                <StatusBadge label={quote.quoteStatus} tone={quoteStatusTone(quote.quoteStatus)} />
              </View>
              <DetailRow label="Quote reference" value={quote.quoteReference} />
              <DetailRow label="Insurer" value={quote.insurerName} />
              <DetailRow label="Vehicle" value={vehicle} />
              <DetailRow label="Registration" value={quote.vehicleRegistrationNumber} />
              <DetailRow label="Cover type" value={formatEnumLabel(quote.coverType)} />
              <DetailRow label="Vehicle use" value={formatEnumLabel(quote.policyProductType)} />
              <DetailRow label="Product" value={quote.productName} />
              <DetailRow label="Duration" value={duration} />
              <DetailRow label="Quoted" value={formatCustomerDate(quote.createdDate)} />
              <DetailRow label="Valid until" value={formatCustomerDate(quote.validUntil)} />
              <DetailRow label="Premium" value={amount} />
            </Card>
            {quote.premiumBreakdown?.insurancePremium || quote.premiumBreakdown?.totalPayable ? (
              <Card>
                <Text style={styles.section}>Premium</Text>
                <DetailRow
                  label="Insurance premium"
                  value={formatCustomerMoney(quote.premiumBreakdown.insurancePremium, quote.currency)}
                />
                {quote.premiumBreakdown.serviceFee ? (
                  <DetailRow
                    label="Service fee"
                    value={formatCustomerMoney(quote.premiumBreakdown.serviceFee, quote.currency)}
                  />
                ) : null}
                {quote.premiumBreakdown.paymentFee ? (
                  <DetailRow
                    label="Payment fee"
                    value={formatCustomerMoney(quote.premiumBreakdown.paymentFee, quote.currency)}
                  />
                ) : null}
                <DetailRow
                  label="Total payable"
                  value={formatCustomerMoney(
                    quote.premiumBreakdown.totalPayable || quote.totalPayable,
                    quote.currency,
                  )}
                />
              </Card>
            ) : null}
            {quote.quoteStatus === 'Pending Payment' || quote.backendQuoteStatus === 'GENERATED' || quote.backendQuoteStatus === 'PENDING' ? (
              <Button
                label="Select & Continue"
                variant="cta"
                onPress={() => navigation.navigate('QuoteReview', { quoteId: quote.id })}
              />
            ) : null}
            {quote.quoteRequestId ? (
              <Button
                label="Compare quotes"
                variant="outline"
                onPress={() => {
                  const quoteRequestId = quote.quoteRequestId;
                  if (!quoteRequestId) return;
                  navigation.navigate('QuoteResults', { quoteRequestId });
                }}
              />
            ) : null}
            <Button label="Get a new quote" variant="outline" onPress={() => navigation.navigate('MotorQuote')} />
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
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  heading: {
    ...typography.heading,
    fontSize: 20,
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
