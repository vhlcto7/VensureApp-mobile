import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, DatePickerField, ErrorMessage, Input } from '../../components';
import type { CustomerStackScreenProps } from '../../navigation/types';
import { API_BASE_URL } from '../../config/env';
import {
  createCustomerVehicle,
  lookupVehicleWithRtsa,
} from '../../services/vehicles';
import { colors, spacing, typography } from '../../theme';
import { getErrorMessage } from '../../utils/errors';
import { DetailHeader } from '../customer-lists/DetailHeader';
import { SelectField } from '../quote/SelectField';
import {
  FUEL_TYPE_OPTIONS,
  POLICY_PRODUCT_TYPE_OPTIONS,
  RtsaLookupError,
  createEmptyMotorQuoteForm,
  type ManualVehicleDetails,
  type QuoteFormErrors,
  type RTSAVehicleLookupResult,
} from '../quote/types';
import {
  formatDisplayDate,
  getRtsaLockedFields,
  getTodayDateString,
  getVehicleFormDataFromRtsa,
  hasUsableRtsaVehicleData,
  isUnavailableRtsaValue,
  isValidVehicleLookupNumber,
  normalizeVehicleLookupNumber,
  sanitizeRegistrationInput,
  type VehicleFieldKey,
} from '../quote/helpers';

type Props = CustomerStackScreenProps<'VehicleAdd'>;
type InsuranceSelection = 'NONE' | 'EXTERNAL';

const RTSA_DATE_LABELS = new Set([
  'First Registration Date',
  'Road Tax Expiry Date',
  'Current Licence Expiry Date',
  'Roadworthiness Expiry Date',
  'Registration Anniversary Date',
]);

const emptyManual = createEmptyMotorQuoteForm(getTodayDateString()).manualVehicle;

function hasValue(value: string | undefined) {
  return Boolean(value && !isUnavailableRtsaValue(value));
}

function visibleAddFields(vehicle?: RTSAVehicleLookupResult): VehicleFieldKey[] {
  if (!vehicle) {
    return [
      'registrationNumber',
      'make',
      'model',
      'yearOfManufacture',
      'colour',
      'engineNumber',
      'chassisNumber',
      'firstRegDate',
      'registrationStatus',
      'vehicleType',
      'bodyType',
    ];
  }
  return (
    [
      ['registrationNumber', vehicle.registrationNumber],
      ['make', vehicle.make],
      ['model', vehicle.model],
      ['yearOfManufacture', vehicle.yearOfManufacture || vehicle.year],
      ['colour', vehicle.colour || vehicle.color],
      ['engineNumber', vehicle.engineNumber],
      ['chassisNumber', vehicle.chassisNumber],
      ['firstRegDate', vehicle.firstRegDate],
      ['registrationStatus', vehicle.registrationStatus],
      ['vehicleType', vehicle.vehicleType],
      ['bodyType', vehicle.bodyType],
    ] as Array<[VehicleFieldKey, string | undefined]>
  )
    .filter(([, value]) => !hasValue(value))
    .map(([key]) => key);
}

export function VehicleAddScreen({ navigation }: Props) {
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [manualVehicle, setManualVehicle] = useState<ManualVehicleDetails>(emptyManual);
  const [vehicleUse, setVehicleUse] = useState('');
  const [currentLicenseExpiryDate, setCurrentLicenseExpiryDate] = useState('');
  const [roadTaxExpiryDate, setRoadTaxExpiryDate] = useState('');
  const [gvm, setGvm] = useState('');
  const [numberOfSeats, setNumberOfSeats] = useState('');
  const [insuranceSelection, setInsuranceSelection] = useState<InsuranceSelection>('NONE');
  const [externalInsurerName, setExternalInsurerName] = useState('');
  const [externalCoverType, setExternalCoverType] = useState('');
  const [externalStartDate, setExternalStartDate] = useState('');
  const [externalExpiryDate, setExternalExpiryDate] = useState('');
  const [rtsaVehicle, setRtsaVehicle] = useState<RTSAVehicleLookupResult | undefined>();
  const [isRtsaVerified, setIsRtsaVerified] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [errors, setErrors] = useState<QuoteFormErrors>({});
  const [lookedUp, setLookedUp] = useState(false);

  const lockedFields = useMemo(() => getRtsaLockedFields(rtsaVehicle), [rtsaVehicle]);
  const visibleFields = useMemo(() => visibleAddFields(rtsaVehicle), [rtsaVehicle]);

  function updateManual<K extends keyof ManualVehicleDetails>(field: K, value: ManualVehicleDetails[K]) {
    setManualVehicle((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleLookup() {
    const normalized = normalizeVehicleLookupNumber(registrationNumber);
    if (!normalized) {
      setErrors((current) => ({
        ...current,
        registrationNumber: 'Enter a valid vehicle registration number.',
      }));
      return;
    }
    if (!isValidVehicleLookupNumber(normalized)) {
      setErrors((current) => ({
        ...current,
        registrationNumber:
          'Vehicle number must contain both letters and numbers, with no special characters.',
      }));
      return;
    }

    setLookupLoading(true);
    setLookupError('');
    setErrors((current) => ({ ...current, registrationNumber: undefined }));
    try {
      const result = await lookupVehicleWithRtsa(normalized);
      if (!hasUsableRtsaVehicleData(result)) {
        setIsRtsaVerified(false);
        setRtsaVehicle(undefined);
        setLookedUp(true);
        setLookupError(
          'Vehicle details could not be retrieved from RTSA. Please enter the vehicle details manually.',
        );
        return;
      }
      setRegistrationNumber(normalizeVehicleLookupNumber(result.registrationNumber || normalized));
      setManualVehicle(getVehicleFormDataFromRtsa(result));
      setRtsaVehicle(result);
      setIsRtsaVerified(true);
      setLookedUp(true);
      setVehicleUse(result.usageType && !isUnavailableRtsaValue(result.usageType) ? result.usageType : '');
      setCurrentLicenseExpiryDate(result.currentLicenseExpiryDate || '');
      setRoadTaxExpiryDate(result.roadTaxExpiryDate || '');
      setGvm(result.gvm || '');
      setNumberOfSeats(result.numberOfSeats || '');
    } catch (error) {
      setIsRtsaVerified(false);
      setRtsaVehicle(undefined);
      setLookedUp(true);
      setLookupError(
        error instanceof RtsaLookupError
          ? error.message
          : 'Vehicle details could not be retrieved from RTSA. You may enter them manually.',
      );
    } finally {
      setLookupLoading(false);
    }
  }

  function validate() {
    const nextErrors: QuoteFormErrors = {};
    if (!registrationNumber.trim()) nextErrors.registrationNumber = 'Registration number is required.';
    if (!manualVehicle.make.trim()) nextErrors.make = 'Make is required.';
    if (!manualVehicle.model.trim()) nextErrors.model = 'Model is required.';
    if (!(manualVehicle.yearOfManufacture || manualVehicle.year || '').trim()) {
      nextErrors.yearOfManufacture = 'Year is required.';
    }
    if (!isRtsaVerified && !vehicleUse.trim()) {
      nextErrors.vehicleUse = 'Vehicle use is required for manual entry.';
    }
    if (insuranceSelection === 'EXTERNAL' && !externalExpiryDate) {
      nextErrors.externalPolicyExpiryDate = 'External policy expiry date is required.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaveLoading(true);
    setSaveError('');
    try {
      const year = Number((manualVehicle.yearOfManufacture || manualVehicle.year || '').trim());
      const created = await createCustomerVehicle({
        registrationNumber: registrationNumber.trim(),
        make: manualVehicle.make.trim(),
        model: manualVehicle.model.trim(),
        yearOfManufacture: Number.isInteger(year) && year >= 1900 ? year : undefined,
        colour: (manualVehicle.colour || manualVehicle.color || '').trim() || undefined,
        vehicleType: manualVehicle.vehicleType?.trim() || undefined,
        bodyType: manualVehicle.bodyType?.trim() || undefined,
        engineNumber: manualVehicle.engineNumber?.trim() || undefined,
        chassisNumber: manualVehicle.chassisNumber?.trim() || undefined,
        firstRegDate: manualVehicle.firstRegDate || undefined,
        registrationStatus: manualVehicle.registrationStatus?.trim() || undefined,
        vehicleUse: vehicleUse.trim() || rtsaVehicle?.usageType || undefined,
        numberOfSeats: numberOfSeats ? Number(numberOfSeats) : undefined,
        gvm: gvm.trim() || undefined,
        fuelType: isRtsaVerified && rtsaVehicle?.fuelType ? rtsaVehicle.fuelType : undefined,
        roadTaxExpiryDate: roadTaxExpiryDate || rtsaVehicle?.roadTaxExpiryDate || undefined,
        currentLicenseExpiryDate:
          currentLicenseExpiryDate || rtsaVehicle?.currentLicenseExpiryDate || undefined,
        roadWorthinessExpiryDate: rtsaVehicle?.roadworthinessExpiryDate || undefined,
        isRtsaVerified,
        vehicleDataSource: isRtsaVerified ? 'RTSA' : 'MANUAL',
        externalInsurance:
          insuranceSelection === 'EXTERNAL'
            ? {
                isExternallyInsured: true,
                insurerName: externalInsurerName.trim() || undefined,
                coverType: externalCoverType || undefined,
                policyStartDate: externalStartDate || undefined,
                policyExpiryDate: externalExpiryDate,
              }
            : undefined,
      });
      navigation.replace('VehicleDetails', { vehicleId: created.id });
    } catch (error) {
      setSaveError(getErrorMessage(error, 'Unable to save this vehicle.'));
    } finally {
      setSaveLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <DetailHeader
        title="Add Vehicle"
        subtitle="Look up the registration with RTSA, then save it to your account."
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Input
          label="Vehicle Registration Number"
          value={registrationNumber}
          error={errors.registrationNumber}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={12}
          placeholder="e.g. BAX4455ZM"
          onChangeText={(value) => setRegistrationNumber(sanitizeRegistrationInput(value))}
        />
        <Button
          label={lookupLoading ? 'Checking RTSA vehicle records...' : 'Lookup Vehicle'}
          variant="cta"
          loading={lookupLoading}
          disabled={lookupLoading || !API_BASE_URL.trim()}
          onPress={() => void handleLookup()}
        />
        {!API_BASE_URL.trim() ? (
          <ErrorMessage message="API base URL is not configured. Set EXPO_PUBLIC_API_BASE_URL, then restart Expo." />
        ) : null}
        {lookupError ? <ErrorMessage message={lookupError} /> : (
          <Text style={styles.helper}>We will try RTSA first. You can enter details manually if needed.</Text>
        )}
        <Button
          label="Enter Vehicle Manually"
          variant="outline"
          onPress={() => {
            setIsRtsaVerified(false);
            setRtsaVehicle(undefined);
            setLookedUp(true);
            setLookupError(
              'Vehicle details could not be retrieved from RTSA. You may enter them manually.',
            );
          }}
        />

        {lookedUp || isRtsaVerified ? (
          <>
            {isRtsaVerified && rtsaVehicle ? (
              <Card>
                <Text style={styles.found}>Vehicle Found</Text>
                {(
                  [
                    ['Registration Number', rtsaVehicle.registrationNumber],
                    ['Make', rtsaVehicle.make],
                    ['Model', rtsaVehicle.model],
                    ['Year of Manufacture', rtsaVehicle.yearOfManufacture || rtsaVehicle.year],
                    ['Colour', rtsaVehicle.colour || rtsaVehicle.color],
                    ['Engine Number', rtsaVehicle.engineNumber],
                    ['Chassis Number', rtsaVehicle.chassisNumber],
                    ['First Registration Date', rtsaVehicle.firstRegDate],
                    ['Registration Status', rtsaVehicle.registrationStatus],
                    ['Vehicle Type', rtsaVehicle.vehicleType],
                    ['Body type', rtsaVehicle.bodyType],
                    ['Fuel type', rtsaVehicle.fuelType],
                    ['Road Tax Expiry Date', rtsaVehicle.roadTaxExpiryDate],
                    ['Current Licence Expiry Date', rtsaVehicle.currentLicenseExpiryDate],
                    ['Roadworthiness Expiry Date', rtsaVehicle.roadworthinessExpiryDate],
                    ['GVM', rtsaVehicle.gvm],
                    ['Number of Seats', rtsaVehicle.numberOfSeats],
                    ['Vehicle Use', rtsaVehicle.usageType],
                  ] as Array<[string, string | undefined]>
                ).map(([label, value]) =>
                  isUnavailableRtsaValue(value) ? null : (
                    <View key={label} style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{label}</Text>
                      <Text style={styles.detailValue}>
                        {RTSA_DATE_LABELS.has(label) ? formatDisplayDate(value) || value : value}
                      </Text>
                    </View>
                  ),
                )}
              </Card>
            ) : null}

            {visibleFields.includes('make') ? (
              <Input
                label="Make"
                value={manualVehicle.make}
                error={errors.make}
                editable={!lockedFields.make}
                onChangeText={(value) => updateManual('make', value)}
              />
            ) : null}
            {visibleFields.includes('model') ? (
              <Input
                label="Model"
                value={manualVehicle.model}
                error={errors.model}
                editable={!lockedFields.model}
                onChangeText={(value) => updateManual('model', value)}
              />
            ) : null}
            {visibleFields.includes('yearOfManufacture') ? (
              <Input
                label="Year of Manufacture"
                value={manualVehicle.yearOfManufacture || manualVehicle.year}
                error={errors.yearOfManufacture}
                keyboardType="number-pad"
                maxLength={4}
                editable={!lockedFields.yearOfManufacture}
                onChangeText={(value) => {
                  updateManual('yearOfManufacture', value);
                  updateManual('year', value);
                }}
              />
            ) : null}
            {visibleFields.includes('colour') ? (
              <Input
                label="Colour"
                value={manualVehicle.colour || manualVehicle.color}
                editable={!lockedFields.colour}
                onChangeText={(value) => {
                  updateManual('colour', value);
                  updateManual('color', value);
                }}
              />
            ) : null}
            {visibleFields.includes('engineNumber') ? (
              <Input
                label="Engine Number"
                value={manualVehicle.engineNumber || ''}
                editable={!lockedFields.engineNumber}
                onChangeText={(value) => updateManual('engineNumber', value)}
              />
            ) : null}
            {visibleFields.includes('chassisNumber') ? (
              <Input
                label="Chassis Number"
                value={manualVehicle.chassisNumber || ''}
                editable={!lockedFields.chassisNumber}
                onChangeText={(value) => updateManual('chassisNumber', value)}
              />
            ) : null}
            {visibleFields.includes('firstRegDate') ? (
              <DatePickerField
                label="First Registration Date"
                value={manualVehicle.firstRegDate || ''}
                placeholder="Select date"
                editable={!lockedFields.firstRegDate}
                maximumDate={getTodayDateString()}
                minimumDate="1900-01-01"
                onChange={(value) => updateManual('firstRegDate', value)}
              />
            ) : null}
            {visibleFields.includes('registrationStatus') ? (
              <Input
                label="Registration Status"
                value={manualVehicle.registrationStatus || ''}
                editable={!lockedFields.registrationStatus}
                onChangeText={(value) => updateManual('registrationStatus', value)}
              />
            ) : null}
            {visibleFields.includes('vehicleType') ? (
              <Input
                label="Vehicle Type"
                value={manualVehicle.vehicleType || ''}
                editable={!lockedFields.vehicleType}
                onChangeText={(value) => updateManual('vehicleType', value)}
              />
            ) : null}
            {visibleFields.includes('bodyType') ? (
              <Input
                label="Body type"
                value={manualVehicle.bodyType || ''}
                editable={!lockedFields.bodyType}
                onChangeText={(value) => updateManual('bodyType', value)}
              />
            ) : null}

            {!isRtsaVerified || !hasValue(rtsaVehicle?.usageType) ? (
              <SelectField
                label="Vehicle Use"
                value={vehicleUse}
                options={POLICY_PRODUCT_TYPE_OPTIONS}
                onChange={setVehicleUse}
              />
            ) : null}
            {errors.vehicleUse ? <ErrorMessage message={errors.vehicleUse} /> : null}
            {!isRtsaVerified || !hasValue(rtsaVehicle?.currentLicenseExpiryDate) ? (
              <DatePickerField
                label="Current Licence Expiry Date"
                value={currentLicenseExpiryDate}
                placeholder="Select date"
                onChange={setCurrentLicenseExpiryDate}
              />
            ) : null}
            {!isRtsaVerified || !hasValue(rtsaVehicle?.roadTaxExpiryDate) ? (
              <DatePickerField
                label="Road Tax Expiry Date"
                value={roadTaxExpiryDate}
                placeholder="Select date"
                onChange={setRoadTaxExpiryDate}
              />
            ) : null}
            {!isRtsaVerified || !hasValue(rtsaVehicle?.gvm) ? (
              <Input label="GVM" value={gvm} onChangeText={setGvm} />
            ) : null}
            {!isRtsaVerified || !hasValue(rtsaVehicle?.numberOfSeats) ? (
              <Input
                label="Number of Seats"
                value={numberOfSeats}
                keyboardType="number-pad"
                onChangeText={(value) => setNumberOfSeats(value.replace(/[^\d]/g, ''))}
              />
            ) : null}
            {!isRtsaVerified ? (
              <SelectField
                label="Fuel type"
                value={manualVehicle.fuelType || ''}
                options={FUEL_TYPE_OPTIONS}
                onChange={(value) => updateManual('fuelType', value)}
              />
            ) : null}

            <SelectField
              label="Is this vehicle currently insured?"
              value={insuranceSelection}
              options={[
                { label: 'Not currently insured', value: 'NONE' },
                { label: 'Currently insured outside VenSure', value: 'EXTERNAL' },
              ]}
              onChange={(value) => setInsuranceSelection(value as InsuranceSelection)}
            />
            {insuranceSelection === 'EXTERNAL' ? (
              <>
                <Input
                  label="Current Insurer"
                  value={externalInsurerName}
                  onChangeText={setExternalInsurerName}
                />
                <SelectField
                  label="Cover Type"
                  value={externalCoverType}
                  options={[
                    { label: 'Third Party', value: 'Third Party' },
                    { label: 'Comprehensive', value: 'Comprehensive' },
                  ]}
                  onChange={setExternalCoverType}
                />
                <DatePickerField
                  label="Policy start date"
                  value={externalStartDate}
                  placeholder="Select date"
                  onChange={setExternalStartDate}
                />
                <DatePickerField
                  label="Policy expiry date"
                  value={externalExpiryDate}
                  placeholder="Select date"
                  error={errors.externalPolicyExpiryDate}
                  onChange={setExternalExpiryDate}
                />
              </>
            ) : null}

            {saveError ? <ErrorMessage message={saveError} /> : null}
            <Button
              label="Save Vehicle"
              variant="cta"
              loading={saveLoading}
              disabled={saveLoading}
              onPress={() => void handleSave()}
            />
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
  helper: {
    ...typography.caption,
    color: colors.slate500,
  },
  found: {
    ...typography.label,
    fontWeight: '700',
    color: '#047857',
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.slate500,
    width: 130,
  },
  detailValue: {
    ...typography.body,
    fontWeight: '600',
    color: colors.slate950,
    flex: 1,
    textAlign: 'right',
  },
});
