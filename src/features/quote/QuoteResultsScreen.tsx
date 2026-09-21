import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, ErrorMessage, LoadingIndicator } from '../../components';
import { getQuotesByQuoteRequestId } from '../../services/quote';
import { getGuestQuoteSession, persistQuoteResponses } from '../../store/quote-draft';
import { colors, spacing, typography } from '../../theme';
import { getErrorMessage } from '../../utils/errors';
import { FilterChips } from '../customer-lists/FilterChips';
import { formatCoverType } from '../dashboard/helpers';
import { QuoteChrome } from './QuoteChrome';
import { QuoteResultCard } from './QuoteResultCard';
import { filterQuotesByPreferredInsurers, getLowestPremiumQuoteIds } from './helpers';
import type { QuoteResultItem } from './types';

type QuoteFilter = 'all' | 'lowest' | 'THIRD_PARTY' | 'COMPREHENSIVE';
type QuoteSort = 'default' | 'lowest' | 'highest' | 'az';

type QuoteResultsScreenProps = {
  navigation: {
    goBack: () => void;
    navigate: (
      name: 'MotorQuote' | 'QuoteDetails' | 'QuoteReview' | 'Login',
      params?: { quoteId: string },
    ) => void;
  };
  route: {
    params: { quoteRequestId: string };
  };
};

function chunkQuotes(quotes: QuoteResultItem[], size: number) {
  const rows: QuoteResultItem[][] = [];
  for (let index = 0; index < quotes.length; index += size) {
    rows.push(quotes.slice(index, index + size));
  }
  return rows;
}

export function QuoteResultsScreen({ navigation, route }: QuoteResultsScreenProps) {
  const quoteRequestId = route.params.quoteRequestId;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quotes, setQuotes] = useState<QuoteResultItem[]>([]);
  const [filter, setFilter] = useState<QuoteFilter>('all');
  const [sort, setSort] = useState<QuoteSort>('default');
  const guestSession = getGuestQuoteSession();
  const quoteReference =
    guestSession?.displayQuoteReference || guestSession?.quoteRequestId || quoteRequestId;

  const applyQuotes = useCallback((result: QuoteResultItem[]) => {
    const currentSession = getGuestQuoteSession();
    const filtered =
      currentSession?.quoteRequestId === quoteRequestId && currentSession.quoteRequestData
        ? filterQuotesByPreferredInsurers(result, currentSession.quoteRequestData)
        : result;
    persistQuoteResponses(filtered, quoteRequestId);
    setQuotes(filtered);
  }, [quoteRequestId]);

  const loadQuotes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getQuotesByQuoteRequestId(quoteRequestId);
      applyQuotes(result);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "We couldn't load quote results."));
    } finally {
      setLoading(false);
    }
  }, [applyQuotes, quoteRequestId]);

  useEffect(() => {
    void loadQuotes();
  }, [loadQuotes]);

  const lowestIds = useMemo(() => getLowestPremiumQuoteIds(quotes), [quotes]);
  const hasThirdParty = quotes.some((quote) => (quote.coverTypeCode || quote.coverType || '').toUpperCase().includes('THIRD'));
  const hasComprehensive = quotes.some((quote) =>
    (quote.coverTypeCode || quote.coverType || '').toUpperCase().includes('COMPREHENSIVE'),
  );

  const visibleQuotes = useMemo(() => {
    let next = quotes;
    if (filter === 'lowest') next = quotes.filter((quote) => lowestIds.has(quote.id));
    if (filter === 'THIRD_PARTY') {
      next = quotes.filter((quote) => (quote.coverTypeCode || quote.coverType || '').toUpperCase().includes('THIRD'));
    }
    if (filter === 'COMPREHENSIVE') {
      next = quotes.filter((quote) =>
        (quote.coverTypeCode || quote.coverType || '').toUpperCase().includes('COMPREHENSIVE'),
      );
    }
    if (sort === 'default') return next;
    const copy = [...next];
    if (sort === 'lowest') {
      copy.sort((left, right) => (left.insurancePremium ?? 0) - (right.insurancePremium ?? 0));
    } else if (sort === 'highest') {
      copy.sort((left, right) => (right.insurancePremium ?? 0) - (left.insurancePremium ?? 0));
    } else {
      copy.sort((left, right) => left.insurerName.localeCompare(right.insurerName));
    }
    return copy;
  }, [filter, lowestIds, quotes, sort]);

  const filterOptions: Array<{ id: QuoteFilter; label: string }> = [
    { id: 'all', label: 'All' },
    //{ id: 'lowest', label: 'Lowest Premium' },
  ];
  if (hasThirdParty) filterOptions.push({ id: 'THIRD_PARTY', label: formatCoverType('THIRD_PARTY') || 'Third Party' });
  if (hasComprehensive) {
    filterOptions.push({ id: 'COMPREHENSIVE', label: formatCoverType('COMPREHENSIVE') || 'Comprehensive' });
  }

  return (
    <View style={styles.root}>
      <QuoteChrome
        showStepper={false}
        title="Compare quote options"
        subtitle="Review premiums side by side, then open details for cover and documents."
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.reference}>Ref {quoteReference}</Text>

        {loading ? (
          <Card>
            <Text style={styles.sectionTitle}>Generating your quotes</Text>
            <Text style={styles.helper}>Checking available cover options for this request.</Text>
            <LoadingIndicator />
          </Card>
        ) : null}

        {error ? (
          <View style={styles.section}>
            <ErrorMessage message={error} />
            <Button label="Retry" variant="cta" onPress={() => void loadQuotes()} />
          </View>
        ) : null}

        {!loading && quotes.length > 0 ? (
          <>
            <FilterChips options={filterOptions} value={filter} onChange={setFilter} />
            <FilterChips
              options={[
                { id: 'default', label: 'Default' },
                { id: 'lowest', label: 'Lowest Premium' },
                { id: 'highest', label: 'Highest Premium' },
                { id: 'az', label: 'Insurer A–Z' },
              ]}
              value={sort}
              onChange={setSort}
            />
          </>
        ) : null}

        {!loading && !error && visibleQuotes.length === 0 ? (
          <Card>
            <Text style={styles.sectionTitle}>No quotes are currently available</Text>
            <Text style={styles.helper}>
              This request does not have any purchasable options right now. Adjust your details and try again.
            </Text>
          </Card>
        ) : null}

        {!loading
          ? chunkQuotes(visibleQuotes, 2).map((row) => (
              <View key={row.map((quote) => quote.id).join('-')} style={styles.gridRow}>
                {row.map((quote) => (
                  <View key={quote.id || quote.insurerName} style={styles.gridCell}>
                    <QuoteResultCard
                      quote={quote}
                      lowestPremium={lowestIds.has(quote.id)}
                      onViewDetails={() => navigation.navigate('QuoteDetails', { quoteId: quote.id })}
                    />
                  </View>
                ))}
                {row.length === 1 ? <View style={styles.gridCell} /> : null}
              </View>
            ))
          : null}

        <Button
          label="Start a new quote"
          variant="outline"
          onPress={() => navigation.navigate('MotorQuote')}
        />
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
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.md,
  },
  reference: {
    ...typography.caption,
    color: colors.slate500,
  },
  helper: {
    ...typography.caption,
    color: colors.slate500,
  },
  sectionTitle: {
    ...typography.heading,
    fontSize: 18,
    color: colors.slate900,
    marginBottom: spacing.sm,
  },
  gridRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'stretch',
  },
  gridCell: {
    flex: 1,
    minWidth: 0,
  },
});
