import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button, Card, ErrorMessage, LoadingIndicator } from '../../components';
import type { CustomerStackScreenProps } from '../../navigation/types';
import {
  archiveCustomerVehicle,
  getCustomerVehicle,
  refreshCustomerVehicleFromRtsa,
  type CustomerVehicleRecord,
} from '../../services/vehicles';
import { colors, spacing, typography } from '../../theme';
import { getErrorMessage } from '../../utils/errors';
import { DetailHeader } from '../customer-lists/DetailHeader';
import { DetailRow } from '../customer-lists/DetailRow';
import { StatusBadge } from '../customer-lists/StatusBadge';
import { formatCustomerDate, formatCustomerMoney, formatEnumLabel } from '../customer-lists/helpers';
import { displayVehicleRegistration, vehicleSummary, vehicleUseLabel } from './helpers';

type Props = CustomerStackScreenProps<'VehicleDetails'>;

export function VehicleDetailsScreen({ navigation, route }: Props) {
  const { vehicleId } = route.params;
  const [vehicle, setVehicle] = useState<CustomerVehicleRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'refresh' | 'archive' | ''>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setVehicle(await getCustomerVehicle(vehicleId));
    } catch (loadError) {
      setVehicle(null);
      setError(getErrorMessage(loadError, 'Unable to load vehicle details.'));
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function goToQuote() {
    navigation.navigate('MotorQuote', { customerVehicleId: vehicleId });
  }

  async function handleRefresh() {
    try {
      setBusy('refresh');
      setVehicle(await refreshCustomerVehicleFromRtsa(vehicleId));
    } catch (refreshError) {
      Alert.alert('RTSA refresh', getErrorMessage(refreshError, 'Unable to refresh this vehicle from RTSA.'));
    } finally {
      setBusy('');
    }
  }

  function confirmArchive() {
    Alert.alert('Remove vehicle', 'Remove this vehicle from My Vehicles?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void handleArchive();
        },
      },
    ]);
  }

  async function handleArchive() {
    try {
      setBusy('archive');
      await archiveCustomerVehicle(vehicleId);
      navigation.goBack();
    } catch (archiveError) {
      Alert.alert('Unable to remove', getErrorMessage(archiveError, 'This vehicle could not be removed.'));
    } finally {
      setBusy('');
    }
  }

  const policy = vehicle?.activeVensurePolicy;

  return (
    <View style={styles.root}>
      <DetailHeader
        title="Vehicle Details"
        subtitle={vehicle ? displayVehicleRegistration(vehicle.registrationNumber) : undefined}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <LoadingIndicator /> : null}
        {error ? (
          <View style={styles.error}>
            <ErrorMessage message={error} />
            <Button label="Retry" variant="outline" onPress={() => void load()} />
          </View>
        ) : null}
        {vehicle ? (
          <>
            <Card>
              <View style={styles.headingRow}>
                <View style={styles.copy}>
                  <Text style={styles.registration}>
                    {displayVehicleRegistration(vehicle.registrationNumber)}
                  </Text>
                  <Text style={styles.summary}>{vehicleSummary(vehicle) || 'Vehicle'}</Text>
                </View>
                {vehicle.isRtsaVerified ? (
                  <View style={styles.rtsa}>
                    <Ionicons name="checkmark-circle" size={14} color="#047857" />
                    <Text style={styles.rtsaText}>RTSA Verified</Text>
                  </View>
                ) : (
                  <StatusBadge label="Manual" tone="neutral" />
                )}
              </View>
              <Button label="Get Quote" variant="cta" onPress={goToQuote} />
            </Card>

            <Card>
              <Text style={styles.section}>Basic</Text>
              <DetailRow label="Registration Number" value={displayVehicleRegistration(vehicle.registrationNumber)} />
              <DetailRow label="Make" value={vehicle.make} />
              <DetailRow label="Model" value={vehicle.model} />
              <DetailRow label="Year" value={vehicle.year} />
              <DetailRow label="Colour" value={vehicle.colour} />
              <DetailRow label="Vehicle Type" value={vehicle.vehicleType} />
              <DetailRow label="Body Type" value={vehicle.bodyType} />
              <DetailRow label="Vehicle Use" value={vehicleUseLabel(vehicle.vehicleUse)} />
            </Card>

            <Card>
              <Text style={styles.section}>Registration</Text>
              <DetailRow
                label="First Registration Date"
                value={formatCustomerDate(vehicle.firstRegistrationDate)}
              />
              <DetailRow label="Registration Status" value={vehicle.registrationStatus} />
              <DetailRow
                label="Current Licence Expiry"
                value={formatCustomerDate(vehicle.currentLicenceExpiryDate)}
              />
              <DetailRow label="Road Tax Expiry" value={formatCustomerDate(vehicle.roadTaxExpiryDate)} />
              <DetailRow
                label="Roadworthiness Expiry"
                value={formatCustomerDate(vehicle.roadworthinessExpiryDate)}
              />
            </Card>

            <Card>
              <Text style={styles.section}>Technical</Text>
              <DetailRow label="Chassis Number" value={vehicle.chassisNumber} />
              <DetailRow label="Engine Number" value={vehicle.engineNumber} />
              <DetailRow label="GVM" value={vehicle.gvm} />
              <DetailRow
                label="Number of Seats"
                value={vehicle.numberOfSeats !== undefined ? String(vehicle.numberOfSeats) : undefined}
              />
              <DetailRow label="Fuel Type" value={vehicle.fuelType} />
            </Card>

            {policy ? (
              <Card>
                <Text style={styles.section}>Insurance</Text>
                <DetailRow label="Active Policy" value={policy.policyNumber} />
                <DetailRow label="Insurer" value={policy.insurerName} />
                <DetailRow label="Cover Type" value={formatEnumLabel(policy.coverType)} />
                <DetailRow label="Expiry Date" value={formatCustomerDate(policy.expiryDate)} />
                <DetailRow
                  label="Premium"
                  value={formatCustomerMoney(policy.premium, policy.currency)}
                />
                {policy.id ? (
                  <Button
                    label="View Policy"
                    variant="outline"
                    onPress={() => navigation.navigate('PolicyDetails', { policyId: policy.id })}
                  />
                ) : null}
              </Card>
            ) : vehicle.externalInsurance ? (
              <Card>
                <Text style={styles.section}>Insurance</Text>
                <DetailRow label="Source" value="Customer Provided" />
                <DetailRow label="Insurer" value={vehicle.externalInsurance.insurerName} />
                <DetailRow
                  label="Cover Type"
                  value={formatEnumLabel(vehicle.externalInsurance.coverType)}
                />
                <DetailRow
                  label="Expiry Date"
                  value={formatCustomerDate(vehicle.externalInsurance.policyExpiryDate)}
                />
              </Card>
            ) : null}

            {vehicle.isRtsaVerified ? (
              <Button
                label="Refresh RTSA"
                variant="outline"
                loading={busy === 'refresh'}
                disabled={Boolean(busy)}
                onPress={() => void handleRefresh()}
              />
            ) : null}

            <Pressable
              accessibilityRole="button"
              onPress={confirmArchive}
              disabled={Boolean(busy)}
              style={styles.remove}
            >
              <Text style={styles.removeText}>Remove Vehicle</Text>
            </Pressable>
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
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  error: {
    gap: spacing.sm,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  registration: {
    ...typography.heading,
    fontSize: 22,
    color: colors.slate950,
  },
  summary: {
    ...typography.body,
    color: colors.slate500,
  },
  rtsa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  rtsaText: {
    ...typography.label,
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  section: {
    ...typography.label,
    fontWeight: '700',
    color: colors.slate700,
    marginBottom: spacing.xs,
  },
  remove: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  removeText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.slate500,
  },
});
