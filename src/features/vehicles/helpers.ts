import type { MotorQuoteFormData } from '../quote/types';
import {
  getVehicleFormDataFromRtsa,
  normalizeLookupUsageType,
  resolveInitialCoverPeriodMode,
  sanitizeRegistrationInput,
} from '../quote/helpers';
import type { CustomerVehicleQuotePrefill, CustomerVehicleRecord } from '../../services/vehicles';

export function displayVehicleRegistration(value?: string | null) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed || trimmed.toUpperCase() === 'TBA') {
    return 'TBA';
  }
  return trimmed;
}

export function vehicleSummary(vehicle: Pick<CustomerVehicleRecord, 'make' | 'model' | 'year'>) {
  return [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' · ');
}

export function vehicleUseLabel(value?: string) {
  const normalized = value?.trim();
  if (!normalized) return '';
  return normalized
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function applySavedVehiclePrefill(
  current: MotorQuoteFormData,
  prefill: CustomerVehicleQuotePrefill,
): MotorQuoteFormData {
  const isRtsaVerified = prefill.isRtsaVerified && Boolean(prefill.rtsaVehicle);
  const rtsaVehicle = isRtsaVerified ? prefill.rtsaVehicle : undefined;
  const manualVehicle = rtsaVehicle ? getVehicleFormDataFromRtsa(rtsaVehicle) : prefill.manualVehicle;

  return {
    ...current,
    customerVehicleId: prefill.customerVehicleId,
    registrationNumber: sanitizeRegistrationInput(prefill.registrationNumber),
    vehicleSource: isRtsaVerified ? 'RTSA' : 'Manual',
    vehicleDataSource: prefill.vehicleDataSource,
    isRtsaVerified,
    rtsaVehicle,
    manualVehicle,
    coverage: {
      ...current.coverage,
      policyProductType:
        prefill.policyProductType ||
        normalizeLookupUsageType(rtsaVehicle?.usageType) ||
        current.coverage.policyProductType,
      coverPeriodMode: resolveInitialCoverPeriodMode({
        currentMode: current.coverage.coverPeriodMode,
        hasExplicitUserSelection: false,
        isRtsaVerified,
        vehicleSource: isRtsaVerified ? 'RTSA' : 'Manual',
        rtsaVehicle,
        startDate: current.coverage.preferredStartDate,
      }),
    },
  };
}
