import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button, ErrorMessage, ScreenContainer } from '../../components';
import type { CustomerTabScreenProps } from '../../navigation/types';
import {
  listCustomerQuotes,
  type CoverTypeFilter,
  type CustomerQuoteListQuery,
  type QuoteFilterStatus,
  type QuoteSort,
} from '../../services/customer-portal';
import { colors, spacing, typography } from '../../theme';
import { FilterChips } from '../customer-lists/FilterChips';
import { FilterChoiceGroup } from '../customer-lists/FilterChoiceGroup';
import { FilterDateField } from '../customer-lists/FilterDateField';
import { FilterSheet } from '../customer-lists/FilterSheet';
import { ListEmptyState } from '../customer-lists/ListEmptyState';
import { ListFooter } from '../customer-lists/ListFooter';
import { ListSearchBar } from '../customer-lists/ListSearchBar';
import { ListSkeleton } from '../customer-lists/ListSkeleton';
import { QuoteSetCard, groupQuotesByRequest } from '../customer-lists/QuoteSetCard';
import { daysAgoIso, isIsoDateInput, quoteFilterStatusLabel } from '../customer-lists/helpers';
import { useDebouncedValue } from '../customer-lists/useDebouncedValue';
import { usePagedList } from '../customer-lists/usePagedList';
import { useAvailableMotorCoverTypes } from '../quote/useAvailableMotorCoverTypes';

type QuotesScreenProps = CustomerTabScreenProps<'Quotes'>;
type QuoteChip = 'all' | 'recent' | CoverTypeFilter;

const STATUS_OPTIONS: Array<{ id: '' | QuoteFilterStatus; label: string }> = [
  { id: '', label: 'All' },
  { id: 'DRAFT', label: quoteFilterStatusLabel('DRAFT') },
  { id: 'PENDING_PAYMENT', label: quoteFilterStatusLabel('PENDING_PAYMENT') },
  { id: 'PENDING', label: quoteFilterStatusLabel('PENDING') },
  { id: 'GENERATED', label: quoteFilterStatusLabel('GENERATED') },
];

const SORT_OPTIONS: Array<{ id: QuoteSort; label: string }> = [
  { id: 'createdAt:desc', label: 'Newest' },
  { id: 'createdAt:asc', label: 'Oldest' },
];

export function QuotesScreen({ navigation }: QuotesScreenProps) {
  const coverTypes = useAvailableMotorCoverTypes();
  const [search, setSearch] = useState('');
  const [chip, setChip] = useState<QuoteChip>('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draftFromDate, setDraftFromDate] = useState('');
  const [draftToDate, setDraftToDate] = useState('');
  const [draftStatus, setDraftStatus] = useState<'' | QuoteFilterStatus>('');
  const [draftSort, setDraftSort] = useState<QuoteSort>('createdAt:desc');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [status, setStatus] = useState<'' | QuoteFilterStatus>('');
  const [sort, setSort] = useState<QuoteSort>('createdAt:desc');
  const debouncedSearch = useDebouncedValue(search);

  const query = useMemo<CustomerQuoteListQuery>(() => {
    const next: CustomerQuoteListQuery = { sort };
    if (debouncedSearch.trim()) next.search = debouncedSearch.trim();
    if (status) next.status = [status];
    if (chip === 'THIRD_PARTY' || chip === 'COMPREHENSIVE') next.coverType = chip;
    if (chip === 'recent' && !fromDate) next.fromDate = daysAgoIso(30);
    if (fromDate) next.fromDate = fromDate;
    if (toDate) next.toDate = toDate;
    return next;
  }, [chip, debouncedSearch, fromDate, sort, status, toDate]);

  const fetchPage = useCallback(async (current: CustomerQuoteListQuery, page: number, bypassCache: boolean) => {
    const result = await listCustomerQuotes({ ...current, page }, { bypassCache });
    return result;
  }, []);

  const { items, loading, refreshing, loadingMore, error, hasMore, refresh, loadMore } = usePagedList({
    query,
    fetchPage,
  });

  const quoteSets = useMemo(() => groupQuotesByRequest(items), [items]);
  const quoteChips = useMemo(
    () => [
      { id: 'all' as const, label: 'All' },
      { id: 'recent' as const, label: 'Recent' },
      ...coverTypes.map((coverType) => ({ id: coverType.code, label: coverType.label })),
    ],
    [coverTypes],
  );

  useEffect(() => {
    if (!quoteChips.some((option) => option.id === chip)) setChip('all');
  }, [chip, quoteChips]);

  const advancedCount = Number(Boolean(fromDate)) + Number(Boolean(toDate)) + Number(Boolean(status));

  function applyChip(next: QuoteChip) {
    setChip(next);
    if (next !== 'all') {
      setFromDate('');
      setToDate('');
    }
  }

  function applySheet() {
    const nextFrom = isIsoDateInput(draftFromDate) ? draftFromDate : '';
    const nextTo = isIsoDateInput(draftToDate) ? draftToDate : '';
    setFromDate(nextFrom);
    setToDate(nextTo);
    setStatus(draftStatus);
    setSort(draftSort);
    if (nextFrom || nextTo || draftStatus) setChip('all');
    setSheetOpen(false);
  }

  function clearSheet() {
    setDraftFromDate('');
    setDraftToDate('');
    setDraftStatus('');
    setDraftSort('createdAt:desc');
    setFromDate('');
    setToDate('');
    setStatus('');
    setSort('createdAt:desc');
    setSheetOpen(false);
  }

  return (
    <ScreenContainer
      includeBottomSafeArea={false}
      contentStyle={styles.screen}
    >
      <FlatList
        data={quoteSets}
        keyExtractor={(item) => item.key}
        renderItem={({ item, index }) => (
          <QuoteSetCard
            quoteSet={item}
            accent={index % 2 === 1}
            onCompare={() => {
              if (item.quoteRequestId) {
                navigation.navigate('QuoteResults', { quoteRequestId: item.quoteRequestId });
              }
            }}
            onViewQuote={(quoteId) => navigation.navigate('CustomerQuoteDetails', { quoteId })}
          />
        )}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.titleCopy}>
                <Text style={styles.eyebrow}>My Quotes</Text>
                <Text style={styles.title}>Quotes</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Get a Quote"
                onPress={() => navigation.navigate('MotorQuote')}
                style={({ pressed }) => [styles.getQuoteChip, pressed ? styles.pressed : null]}
              >
                <Ionicons name="add" size={16} color={colors.white} />
                <Text style={styles.getQuoteChipLabel}>Get Quote</Text>
              </Pressable>
            </View>
            <ListSearchBar
              value={search}
              placeholder="Registration or quote reference"
              filterCount={advancedCount}
              onChange={setSearch}
              onPressFilter={() => {
                setDraftFromDate(fromDate);
                setDraftToDate(toDate);
                setDraftStatus(status);
                setDraftSort(sort);
                setSheetOpen(true);
              }}
            />
            <FilterChips options={quoteChips} value={chip} onChange={applyChip} />
            {error && !loading ? (
              <View style={styles.error}>
                <ErrorMessage message={error} />
                <Button label="Retry" variant="outline" onPress={refresh} />
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ListSkeleton />
          ) : error ? null : (
            <ListEmptyState
              title="No quotes yet"
              message="Generate a new  quote & get your best deal for today !"
              actionLabel="Get a Quote"
              onAction={() => navigation.navigate('MotorQuote')}
            />
          )
        }
        ListFooterComponent={
          loading ? null : <ListFooter loadingMore={loadingMore} />
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        onEndReached={() => {
          if (hasMore && !loading && !loadingMore) loadMore();
        }}
        onEndReachedThreshold={0.4}
      />
      <FilterSheet
        visible={sheetOpen}
        title="Filter quotes"
        onClose={() => setSheetOpen(false)}
        onApply={applySheet}
        onClear={clearSheet}
      >
        <FilterDateField label="From date" value={draftFromDate} onChange={setDraftFromDate} />
        <FilterDateField label="To date" value={draftToDate} onChange={setDraftToDate} />
        <FilterChoiceGroup
          label="Quote status"
          options={STATUS_OPTIONS}
          value={draftStatus}
          onChange={setDraftStatus}
        />
        <FilterChoiceGroup label="Sort" options={SORT_OPTIONS} value={draftSort} onChange={setDraftSort} />
        <Text style={styles.hint}>Coverage can also be changed from the chips above.</Text>
      </FilterSheet>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    flex: 1,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.sm,
  },
  header: {
    gap: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  titleCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  getQuoteChip: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    backgroundColor: colors.primaryCta,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  getQuoteChipLabel: {
    ...typography.label,
    fontWeight: '700',
    color: colors.white,
  },
  pressed: {
    opacity: 0.88,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.sky700,
  },
  title: {
    ...typography.title,
    color: colors.slate950,
  },
  error: {
    gap: spacing.md,
  },
  hint: {
    ...typography.caption,
    color: colors.slate500,
  },
});
