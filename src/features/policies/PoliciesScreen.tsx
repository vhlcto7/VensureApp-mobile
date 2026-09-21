import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Button, ErrorMessage, ScreenContainer } from '../../components';
import type { CustomerTabScreenProps } from '../../navigation/types';
import {
  listCustomerPolicies,
  type CoverTypeFilter,
  type CustomerPolicyListQuery,
  type CustomerPolicyRecord,
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
import { PolicyListCard } from '../customer-lists/PolicyListCard';
import { isIsoDateInput } from '../customer-lists/helpers';
import { useDebouncedValue } from '../customer-lists/useDebouncedValue';
import { usePagedList } from '../customer-lists/usePagedList';
import { useAvailableMotorCoverTypes } from '../quote/useAvailableMotorCoverTypes';

type PoliciesScreenProps = CustomerTabScreenProps<'Policies'>;
type PolicyStatusChip = 'all' | 'active' | 'expiring' | 'expired';
type PolicyChip = PolicyStatusChip | CoverTypeFilter;
type PolicySort = 'expiry' | 'newest' | 'oldest';

const POLICY_STATUS_CHIPS: Array<{ id: PolicyStatusChip; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'expiring', label: 'Expiring' },
  { id: 'expired', label: 'Expired' },
];

const SORT_OPTIONS: Array<{ id: PolicySort; label: string }> = [
  { id: 'expiry', label: 'Expiry Soonest' },
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
];

function isCoverTypeChip(chip: PolicyChip): chip is CoverTypeFilter {
  return chip === 'THIRD_PARTY' || chip === 'COMPREHENSIVE';
}

function matchesChip(policy: CustomerPolicyRecord, chip: PolicyChip) {
  if (chip === 'all' || isCoverTypeChip(chip)) return true;
  if (chip === 'active') return policy.displayStatus === 'Active';
  if (chip === 'expiring') return policy.displayStatus === 'Expiring Soon';
  return policy.displayStatus === 'Expired';
}

function sortPolicies(policies: CustomerPolicyRecord[], sort: PolicySort) {
  if (sort === 'newest') {
    return policies;
  }

  const copy = [...policies];
  if (sort === 'oldest') {
    return copy.reverse();
  }

  copy.sort((left, right) => (left.expiryDate || '').localeCompare(right.expiryDate || ''));
  return copy;
}

export function PoliciesScreen({ navigation }: PoliciesScreenProps) {
  const availableCoverTypes = useAvailableMotorCoverTypes();
  const [search, setSearch] = useState('');
  const [chip, setChip] = useState<PolicyChip>('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draftCoverType, setDraftCoverType] = useState<'' | CoverTypeFilter>('');
  const [draftFromDate, setDraftFromDate] = useState('');
  const [draftToDate, setDraftToDate] = useState('');
  const [draftSort, setDraftSort] = useState<PolicySort>('newest');
  const [coverType, setCoverType] = useState<'' | CoverTypeFilter>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sort, setSort] = useState<PolicySort>('newest');
  const debouncedSearch = useDebouncedValue(search);

  const query = useMemo<CustomerPolicyListQuery>(() => {
    const next: CustomerPolicyListQuery = {};
    if (debouncedSearch.trim()) next.search = debouncedSearch.trim();
    const selectedCoverType = isCoverTypeChip(chip) ? chip : coverType;
    if (selectedCoverType) next.coverType = selectedCoverType;
    if (fromDate) next.fromDate = fromDate;
    if (toDate) next.toDate = toDate;
    return next;
  }, [chip, coverType, debouncedSearch, fromDate, toDate]);

  const policyChips = useMemo(
    () => [
      ...POLICY_STATUS_CHIPS,
      ...availableCoverTypes.map((coverTypeOption) => ({
        id: coverTypeOption.code,
        label: coverTypeOption.label,
      })),
    ],
    [availableCoverTypes],
  );

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
    if (isCoverTypeChip(chip) && !allowed.has(chip)) setChip('all');
  }, [availableCoverTypes, chip, coverType, draftCoverType]);

  const fetchAll = chip === 'active' || chip === 'expiring' || chip === 'expired';

  const fetchPage = useCallback(async (current: CustomerPolicyListQuery, page: number, bypassCache: boolean) => {
    return listCustomerPolicies({ ...current, page }, { bypassCache });
  }, []);

  const { items, loading, refreshing, loadingMore, error, hasMore, refresh, loadMore } = usePagedList({
    query,
    fetchPage,
    fetchAll,
  });

  const visibleItems = useMemo(() => {
    return sortPolicies(
      items.filter((policy) => matchesChip(policy, chip)),
      sort,
    );
  }, [chip, items, sort]);

  const advancedCount = Number(Boolean(coverType) && !isCoverTypeChip(chip)) + Number(Boolean(fromDate)) + Number(Boolean(toDate));

  function applyChip(next: PolicyChip) {
    setChip(next);
    if (isCoverTypeChip(next)) {
      setCoverType('');
      setDraftCoverType('');
    }
  }

  function applySheet() {
    setCoverType(draftCoverType);
    setFromDate(isIsoDateInput(draftFromDate) ? draftFromDate : '');
    setToDate(isIsoDateInput(draftToDate) ? draftToDate : '');
    setSort(draftSort);
    if (draftCoverType && isCoverTypeChip(chip)) setChip('all');
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
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PolicyListCard
            policy={item}
            onPress={() => navigation.navigate('PolicyDetails', { policyId: item.id })}
          />
        )}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.eyebrow}>My Policies</Text>
            <Text style={styles.title}>Policies</Text>
            <ListSearchBar
              value={search}
              placeholder="Policy number or registration"
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
            <FilterChips options={policyChips} value={chip} onChange={applyChip} />
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
              title="No policies yet"
              message="Active and expired policies will appear here once they are issued."
              actionLabel="Get a Quote"
              onAction={() => navigation.navigate('MotorQuote')}
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
        title="Filter policies"
        onClose={() => setSheetOpen(false)}
        onApply={applySheet}
        onClear={clearSheet}
      >
        <FilterChoiceGroup label="Coverage type" options={coverOptions} value={draftCoverType} onChange={setDraftCoverType} />
        <FilterDateField label="Issue from" value={draftFromDate} onChange={setDraftFromDate} />
        <FilterDateField label="Issue to" value={draftToDate} onChange={setDraftToDate} />
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
