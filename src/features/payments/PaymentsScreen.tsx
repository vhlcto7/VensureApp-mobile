import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Button, ErrorMessage, ScreenContainer } from '../../components';
import type { CustomerTabScreenProps } from '../../navigation/types';
import {
  listCustomerTransactions,
  type CoverTypeFilter,
  type CustomerPaymentRecord,
  type CustomerTransactionListQuery,
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
import { PaymentListCard } from '../customer-lists/PaymentListCard';
import { isIsoDateInput, paymentChipGroup } from '../customer-lists/helpers';
import { useDebouncedValue } from '../customer-lists/useDebouncedValue';
import { usePagedList } from '../customer-lists/usePagedList';
import { useAvailableMotorCoverTypes } from '../quote/useAvailableMotorCoverTypes';

type PaymentsScreenProps = CustomerTabScreenProps<'Payments'>;
type PaymentChip = 'all' | 'successful' | 'pending' | 'failed';
type PaymentSort = 'newest' | 'oldest' | 'highest' | 'lowest';

const PAYMENT_CHIPS = [
  { id: 'all' as const, label: 'All' },
  { id: 'successful' as const, label: 'Successful' },
  { id: 'pending' as const, label: 'Pending' },
  { id: 'failed' as const, label: 'Failed' },
];

const SORT_OPTIONS: Array<{ id: PaymentSort; label: string }> = [
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'highest', label: 'Highest Amount' },
  { id: 'lowest', label: 'Lowest Amount' },
];

function matchesChip(payment: CustomerPaymentRecord, chip: PaymentChip) {
  if (chip === 'all') return true;
  return paymentChipGroup(payment.status) === chip;
}

function sortPayments(payments: CustomerPaymentRecord[], sort: PaymentSort) {
  const copy = [...payments];
  copy.sort((left, right) => {
    if (sort === 'highest' || sort === 'lowest') {
      const leftAmount = left.amount ?? 0;
      const rightAmount = right.amount ?? 0;
      return sort === 'highest' ? rightAmount - leftAmount : leftAmount - rightAmount;
    }
    const leftDate = left.createdDate || '';
    const rightDate = right.createdDate || '';
    return sort === 'newest' ? rightDate.localeCompare(leftDate) : leftDate.localeCompare(rightDate);
  });
  return copy;
}

export function PaymentsScreen({ navigation }: PaymentsScreenProps) {
  const availableCoverTypes = useAvailableMotorCoverTypes();
  const [search, setSearch] = useState('');
  const [chip, setChip] = useState<PaymentChip>('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draftCoverType, setDraftCoverType] = useState<'' | CoverTypeFilter>('');
  const [draftFromDate, setDraftFromDate] = useState('');
  const [draftToDate, setDraftToDate] = useState('');
  const [draftSort, setDraftSort] = useState<PaymentSort>('newest');
  const [coverType, setCoverType] = useState<'' | CoverTypeFilter>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sort, setSort] = useState<PaymentSort>('newest');
  const debouncedSearch = useDebouncedValue(search);

  const query = useMemo<CustomerTransactionListQuery>(() => {
    const next: CustomerTransactionListQuery = {};
    if (debouncedSearch.trim()) next.search = debouncedSearch.trim();
    if (coverType) next.coverType = coverType;
    if (fromDate) next.fromDate = fromDate;
    if (toDate) next.toDate = toDate;
    return next;
  }, [coverType, debouncedSearch, fromDate, toDate]);

  const coverOptions = useMemo(
    () => [
      { id: '' as const, label: 'All' },
      ...availableCoverTypes.map((coverTypeOption) => ({
        id: coverTypeOption.code,
        label: coverTypeOption.label,
      })),
    ],
    [availableCoverTypes],
  );

  useEffect(() => {
    const allowed = new Set(availableCoverTypes.map((coverTypeOption) => coverTypeOption.code));
    if (coverType && !allowed.has(coverType)) setCoverType('');
    if (draftCoverType && !allowed.has(draftCoverType)) setDraftCoverType('');
  }, [availableCoverTypes, coverType, draftCoverType]);

  const fetchAll = chip !== 'all' || sort !== 'newest';

  const fetchPage = useCallback(
    async (current: CustomerTransactionListQuery, page: number, bypassCache: boolean) => {
      return listCustomerTransactions({ ...current, page }, { bypassCache });
    },
    [],
  );

  const { items, loading, refreshing, loadingMore, error, hasMore, refresh, loadMore } = usePagedList({
    query,
    fetchPage,
    fetchAll,
  });

  const visibleItems = useMemo(
    () => sortPayments(items.filter((payment) => matchesChip(payment, chip)), sort),
    [chip, items, sort],
  );

  const advancedCount = Number(Boolean(coverType)) + Number(Boolean(fromDate)) + Number(Boolean(toDate));

  function applySheet() {
    setCoverType(draftCoverType);
    setFromDate(isIsoDateInput(draftFromDate) ? draftFromDate : '');
    setToDate(isIsoDateInput(draftToDate) ? draftToDate : '');
    setSort(draftSort);
    setSheetOpen(false);
  }

  function clearSheet() {
    setDraftCoverType('');
    setDraftFromDate('');
    setDraftToDate('');
    setDraftSort('newest');
    setCoverType('');
    setFromDate('');
    setToDate('');
    setSort('newest');
    setSheetOpen(false);
  }

  return (
    <ScreenContainer includeBottomSafeArea={false} contentStyle={styles.screen}>
      <FlatList
        data={visibleItems}
        keyExtractor={(item) => item.transactionId}
        renderItem={({ item }) => (
          <PaymentListCard
            payment={item}
            onPress={() => navigation.navigate('PaymentDetails', { transactionId: item.transactionId })}
          />
        )}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Payments</Text>
            <Text style={styles.title}>Payments</Text>
            <ListSearchBar
              value={search}
              placeholder="Policy, reference or registration"
              filterCount={advancedCount}
              onChange={setSearch}
              onPressFilter={() => {
                setDraftCoverType(coverType);
                setDraftFromDate(fromDate);
                setDraftToDate(toDate);
                setDraftSort(sort);
                setSheetOpen(true);
              }}
            />
            <FilterChips options={PAYMENT_CHIPS} value={chip} onChange={setChip} />
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
              title="No payments yet"
              message="Successful, pending, and failed payments will appear here."
            />
          )
        }
        ListFooterComponent={loading ? null : <ListFooter loadingMore={loadingMore} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        onEndReached={() => {
          if (hasMore && !loading && !loadingMore) loadMore();
        }}
        onEndReachedThreshold={0.4}
      />
      <FilterSheet
        visible={sheetOpen}
        title="Filter payments"
        onClose={() => setSheetOpen(false)}
        onApply={applySheet}
        onClear={clearSheet}
      >
        <FilterChoiceGroup label="Coverage type" options={coverOptions} value={draftCoverType} onChange={setDraftCoverType} />
        <FilterDateField label="From date" value={draftFromDate} onChange={setDraftFromDate} />
        <FilterDateField label="To date" value={draftToDate} onChange={setDraftToDate} />
        <FilterChoiceGroup label="Sort" options={SORT_OPTIONS} value={draftSort} onChange={setDraftSort} />
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
});
