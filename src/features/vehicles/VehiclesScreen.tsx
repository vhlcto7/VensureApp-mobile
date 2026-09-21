import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Button, ErrorMessage, ScreenContainer } from '../../components';
import type { CustomerStackScreenProps } from '../../navigation/types';
import {
  listCustomerVehicles,
  type CustomerVehicleListQuery,
  type CustomerVehicleRecord,
} from '../../services/vehicles';
import { colors, spacing, typography } from '../../theme';
import { FilterChips } from '../customer-lists/FilterChips';
import { FilterChoiceGroup } from '../customer-lists/FilterChoiceGroup';
import { FilterSheet } from '../customer-lists/FilterSheet';
import { ListEmptyState } from '../customer-lists/ListEmptyState';
import { ListFooter } from '../customer-lists/ListFooter';
import { ListSearchBar } from '../customer-lists/ListSearchBar';
import { ListSkeleton } from '../customer-lists/ListSkeleton';
import { useDebouncedValue } from '../customer-lists/useDebouncedValue';
import { usePagedList } from '../customer-lists/usePagedList';
import { VehicleListCard } from './VehicleListCard';
import { displayVehicleRegistration } from './helpers';

type VehiclesScreenProps = CustomerStackScreenProps<'Vehicles'>;
type VehicleChip = 'all' | 'rtsa' | 'manual' | 'expiring';
type VehicleSort = 'recent' | 'registration' | 'licence';
type PolicyStatusFilter = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'NO_ACTIVE_POLICY' | '';

const VEHICLE_CHIPS = [
  { id: 'all' as const, label: 'All' },
  { id: 'rtsa' as const, label: 'RTSA Verified' },
  { id: 'manual' as const, label: 'Manual' },
  { id: 'expiring' as const, label: 'Expiring Soon' },
];

const POLICY_STATUS_OPTIONS: Array<{ id: PolicyStatusFilter; label: string }> = [
  { id: '', label: 'All' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'EXPIRING_SOON', label: 'Expiring Soon' },
  { id: 'EXPIRED', label: 'Expired' },
  { id: 'NO_ACTIVE_POLICY', label: 'No Active Policy' },
];

const SORT_OPTIONS: Array<{ id: VehicleSort; label: string }> = [
  { id: 'recent', label: 'Recently Added' },
  { id: 'registration', label: 'Registration A–Z' },
  { id: 'licence', label: 'Road Tax Expiry Soonest' },
];

export function VehiclesScreen({ navigation }: VehiclesScreenProps) {
  const [search, setSearch] = useState('');
  const [chip, setChip] = useState<VehicleChip>('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draftStatus, setDraftStatus] = useState<PolicyStatusFilter>('');
  const [draftSort, setDraftSort] = useState<VehicleSort>('recent');
  const [status, setStatus] = useState<PolicyStatusFilter>('');
  const [sort, setSort] = useState<VehicleSort>('recent');
  const debouncedSearch = useDebouncedValue(search);

  const query = useMemo<CustomerVehicleListQuery>(() => {
    const next: CustomerVehicleListQuery = { limit: 100 };
    if (chip === 'expiring') next.policyStatus = 'EXPIRING_SOON';
    else if (status) next.policyStatus = status;
    return next;
  }, [chip, status]);

  const fetchPage = useCallback(
    async (current: CustomerVehicleListQuery, page: number, bypassCache: boolean) => {
      return listCustomerVehicles({ ...current, page }, { bypassCache });
    },
    [],
  );

  const { items, loading, refreshing, loadingMore, error, hasMore, refresh, loadMore } = usePagedList({
    query,
    fetchPage,
    fetchAll: true,
  });

  const visibleItems = useMemo(() => {
    const needle = debouncedSearch.trim().toLowerCase();
    let next = items;
    if (needle) {
      next = next.filter((vehicle) => matchesSearch(vehicle, needle));
    }
    if (chip === 'rtsa') next = next.filter((vehicle) => vehicle.isRtsaVerified);
    if (chip === 'manual') next = next.filter((vehicle) => !vehicle.isRtsaVerified);
    return sortVehicles(next, sort);
  }, [chip, debouncedSearch, items, sort]);

  const advancedCount = Number(Boolean(status)) + Number(sort !== 'recent');

  function goToQuote(vehicleId: string) {
    navigation.navigate('MotorQuote', { customerVehicleId: vehicleId });
  }

  return (
    <ScreenContainer includeBottomSafeArea={false} contentStyle={styles.screen}>
      <FlatList
        data={visibleItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <VehicleListCard
            vehicle={item}
            onGetQuote={() => goToQuote(item.id)}
            onDetails={() => navigation.navigate('VehicleDetails', { vehicleId: item.id })}
          />
        )}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.eyebrow}>My Vehicles</Text>
            <Text style={styles.title}>My Vehicles</Text>
            <Text style={styles.subtitle}>
              Manage your vehicles and get insurance quotes quickly.
            </Text>
            <Button
              label="Add Vehicle"
              variant="cta"
              onPress={() => navigation.navigate('VehicleAdd')}
            />
            <ListSearchBar
              value={search}
              placeholder="Search vehicles..."
              filterCount={advancedCount}
              onChange={setSearch}
              onPressFilter={() => {
                setDraftStatus(status);
                setDraftSort(sort);
                setSheetOpen(true);
              }}
            />
            <FilterChips
              options={VEHICLE_CHIPS}
              value={chip}
              onChange={(next) => {
                setChip(next);
                if (next !== 'all') setStatus('');
              }}
            />
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
          ) : error ? null : items.length === 0 ? (
            <ListEmptyState
              title="No vehicles added yet"
              message="Add your vehicle once and use it to get insurance quotes faster."
              actionLabel="+ Add Vehicle"
              onAction={() => navigation.navigate('VehicleAdd')}
            />
          ) : (
            <ListEmptyState
              title="No matching vehicles"
              message="Try a different registration, make, model, or filter."
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
        title="Filter vehicles"
        onClose={() => setSheetOpen(false)}
        onApply={() => {
          setStatus(draftStatus);
          setSort(draftSort);
          if (draftStatus) setChip('all');
          setSheetOpen(false);
        }}
        onClear={() => {
          setDraftStatus('');
          setDraftSort('recent');
          setStatus('');
          setSort('recent');
          setSheetOpen(false);
        }}
      >
        <FilterChoiceGroup
          label="Policy status"
          options={POLICY_STATUS_OPTIONS}
          value={draftStatus}
          onChange={setDraftStatus}
        />
        <FilterChoiceGroup
          label="Sort"
          options={SORT_OPTIONS}
          value={draftSort}
          onChange={setDraftSort}
        />
      </FilterSheet>
    </ScreenContainer>
  );
}

function matchesSearch(vehicle: CustomerVehicleRecord, needle: string) {
  const haystack = [
    displayVehicleRegistration(vehicle.registrationNumber),
    vehicle.make,
    vehicle.model,
    vehicle.year,
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(needle);
}

function sortVehicles(vehicles: CustomerVehicleRecord[], sort: VehicleSort) {
  if (sort === 'recent') return vehicles;
  const next = [...vehicles];
  if (sort === 'registration') {
    next.sort((left, right) =>
      displayVehicleRegistration(left.registrationNumber).localeCompare(
        displayVehicleRegistration(right.registrationNumber),
      ),
    );
    return next;
  }
  next.sort((left, right) => {
    const leftDate = left.roadTaxExpiryDate || '9999-12-31';
    const rightDate = right.roadTaxExpiryDate || '9999-12-31';
    return leftDate.localeCompare(rightDate);
  });
  return next;
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
    gap: spacing.md,
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
  subtitle: {
    ...typography.body,
    color: colors.slate500,
    marginTop: -spacing.sm,
  },
  error: {
    gap: spacing.sm,
  },
});
