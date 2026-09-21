import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import { formatCustomerDate, joinMeta } from '../customer-lists/helpers';
import { StatusBadge, type StatusTone } from '../customer-lists/StatusBadge';
import type { CustomerVehiclePolicyStatus, CustomerVehicleRecord } from '../../services/vehicles';
import { displayVehicleRegistration, vehicleSummary, vehicleUseLabel } from './helpers';

type VehicleListCardProps = {
  vehicle: CustomerVehicleRecord;
  onGetQuote: () => void;
  onDetails: () => void;
};

function policyTone(status: CustomerVehiclePolicyStatus): StatusTone {
  if (status === 'Active') return 'success';
  if (status === 'Expiring Soon') return 'warning';
  if (status === 'Expired') return 'danger';
  return 'neutral';
}

export function VehicleListCard({ vehicle, onGetQuote, onDetails }: VehicleListCardProps) {
  const registration = displayVehicleRegistration(vehicle.registrationNumber);
  const summary = vehicleSummary(vehicle);
  const useLabel = vehicleUseLabel(vehicle.vehicleUse || vehicle.vehicleType);
  const colour = vehicle.colour;
  const roadTaxExpiry = formatCustomerDate(vehicle.roadTaxExpiryDate);
  const meta = joinMeta([summary, useLabel, colour]);

  return (
    <Card style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${registration} details`}
        onPress={onDetails}
        style={styles.body}
      >
        <View style={styles.iconWell}>
          <Ionicons name="car-sport" size={18} color={colors.sky700} />
        </View>
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={styles.registration}>
              {registration}
            </Text>
            {vehicle.isRtsaVerified ? (
              <Ionicons
                name="checkmark-circle"
                size={16}
                color="#047857"
                accessibilityLabel="RTSA Verified"
              />
            ) : null}
          </View>
          {meta ? (
            <Text numberOfLines={1} style={styles.meta}>
              {meta}
            </Text>
          ) : null}
          {roadTaxExpiry ? (
            <View style={styles.expiryRow}>
              <Ionicons name="calendar-outline" size={12} color={colors.slate400} />
              <Text style={styles.expiry}>Road tax {roadTaxExpiry}</Text>
            </View>
          ) : null}
        </View>
        {vehicle.policyStatus !== 'No Active Policy' ? (
          <StatusBadge label={vehicle.policyStatus} tone={policyTone(vehicle.policyStatus)} />
        ) : null}
      </Pressable>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Get Quote"
          onPress={onGetQuote}
          style={({ pressed }) => [styles.quoteChip, pressed ? styles.pressed : null]}
        >
          <Ionicons name="pricetag" size={14} color={colors.white} />
          <Text style={styles.quoteLabel}>Get Quote</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Details"
          onPress={onDetails}
          style={({ pressed }) => [styles.detailsChip, pressed ? styles.pressed : null]}
        >
          <Ionicons name="information-circle-outline" size={14} color={colors.primaryCta} />
          <Text style={styles.detailsLabel}>Details</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primaryCta} />
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWell: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.sky100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  registration: {
    ...typography.body,
    fontWeight: '700',
    color: colors.slate950,
    flexShrink: 1,
  },
  meta: {
    ...typography.caption,
    color: colors.slate500,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  expiry: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.slate600,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  quoteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    backgroundColor: colors.primaryCta,
  },
  quoteLabel: {
    ...typography.label,
    fontWeight: '700',
    fontSize: 12,
    color: colors.white,
  },
  detailsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
  },
  detailsLabel: {
    ...typography.label,
    fontWeight: '700',
    fontSize: 12,
    color: colors.primaryCta,
  },
  pressed: {
    opacity: 0.88,
  },
});
