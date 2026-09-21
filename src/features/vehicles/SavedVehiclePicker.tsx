import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import { joinMeta } from '../customer-lists/helpers';
import type { CustomerVehicleRecord } from '../../services/vehicles';
import { displayVehicleRegistration, vehicleSummary, vehicleUseLabel } from './helpers';

type SavedVehiclePickerProps = {
  vehicles: CustomerVehicleRecord[];
  selectedId?: string;
  onSelect: (vehicleId: string) => void;
  onContinue: () => void;
  onLookupAnother: () => void;
  loading?: boolean;
};

export function SavedVehiclePicker({
  vehicles,
  selectedId,
  onSelect,
  onContinue,
  onLookupAnother,
  loading,
}: SavedVehiclePickerProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Choose a Vehicle</Text>
      <Text style={styles.copy}>Use a saved vehicle or look up another registration.</Text>
      {vehicles.map((vehicle) => {
        const selected = vehicle.id === selectedId;
        return (
          <Pressable
            key={vehicle.id}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onSelect(vehicle.id)}
            style={[styles.row, selected ? styles.rowSelected : null]}
          >
            <View style={[styles.radio, selected ? styles.radioSelected : null]}>
              {selected ? <View style={styles.radioDot} /> : null}
            </View>
            <View style={styles.copyWrap}>
              <View style={styles.regRow}>
                <Text style={styles.registration}>
                  {displayVehicleRegistration(vehicle.registrationNumber)}
                </Text>
                {vehicle.isRtsaVerified ? (
                  <Ionicons name="checkmark-circle" size={14} color="#047857" />
                ) : null}
              </View>
              <Text numberOfLines={1} style={styles.meta}>
                {joinMeta([
                  vehicleSummary(vehicle),
                  vehicleUseLabel(vehicle.vehicleUse || vehicle.vehicleType),
                ]) || 'Saved vehicle'}
              </Text>
            </View>
          </Pressable>
        );
      })}
      <Button
        label="Continue"
        variant="cta"
        loading={loading}
        disabled={!selectedId || loading}
        onPress={onContinue}
      />
      <Pressable onPress={onLookupAnother} hitSlop={8} accessibilityRole="button">
        <Text style={styles.link}>Add / Lookup Another Vehicle</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  title: {
    ...typography.heading,
    fontSize: 20,
    color: colors.slate950,
  },
  copy: {
    ...typography.body,
    color: colors.slate500,
    marginTop: -spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.sky50,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.slate200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  copyWrap: {
    flex: 1,
    minWidth: 0,
  },
  regRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  registration: {
    ...typography.label,
    fontWeight: '700',
    color: colors.slate950,
  },
  meta: {
    ...typography.caption,
    color: colors.slate500,
    marginTop: 2,
  },
  link: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primaryCta,
    textAlign: 'center',
  },
});
