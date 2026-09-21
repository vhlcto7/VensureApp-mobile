import type {
  CoverPeriodMode,
  ManualVehicleDetails,
  MotorCoveragePreferences,
  MotorQuoteFormData,
  PolicyDuration,
  PolicyProductType,
  RTSAVehicleLookupResult,
} from './types';

const UNAVAILABLE = new Set(['', 'NA', 'N/A', 'NAN', 'NOT AVAILABLE']);

export function getTodayDateString(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function isValidYmd(year: string, month: string, day: string) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const parsed = new Date(`${year}-${month}-${day}T00:00:00`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.getFullYear() === y &&
    parsed.getMonth() + 1 === m &&
    parsed.getDate() === d
  );
}

export function toIsoDateString(value?: string) {
  if (!value?.trim()) return '';
  const trimmed = value.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
  if (isoMatch && isValidYmd(isoMatch[1], isoMatch[2], isoMatch[3])) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    if (isValidYmd(year, month, day)) return `${year}-${month}-${day}`;
  }
  return '';
}

export function sanitizeDateDisplayInput(value: string) {
  return value.replace(/[^\d/-]/g, '').slice(0, 10);
}

export function isFutureRegistrationDate(value?: string) {
  const normalized = toIsoDateString(value);
  if (!normalized) return false;
  return normalized > getTodayDateString();
}

export function isPastDate(value?: string) {
  const normalized = toIsoDateString(value);
  if (!normalized) return false;
  return normalized < getTodayDateString();
}

export function isUnavailableRtsaValue(value: unknown) {
  if (value === null || value === undefined) return true;
  return UNAVAILABLE.has(String(value).trim().toUpperCase());
}

export function normalizeVehicleLookupNumber(value: string) {
  return value.replace(/[\s-]+/g, '').toUpperCase();
}

export function sanitizeRegistrationInput(value: string) {
  return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

export function isValidVehicleLookupNumber(value: string) {
  return /^(?=.*[A-Z])(?=.*\d)[A-Z0-9]+$/.test(normalizeVehicleLookupNumber(value));
}

export function sanitizeDecimalInput(value: string) {
  const digitsAndDotsOnly = value.replace(/[^\d.]/g, '');
  const [wholePart, ...decimalParts] = digitsAndDotsOnly.split('.');
  if (decimalParts.length === 0) return wholePart;
  return `${wholePart}.${decimalParts.join('').slice(0, 2)}`;
}

export function getDurationMonths(policyDuration?: string | null) {
  switch (policyDuration) {
    case 'MONTHLY':
      return 1;
    case 'QUARTER1':
      return 3;
    case 'QUARTER2':
      return 6;
    case 'QUARTER3':
      return 9;
    case 'QUARTER4':
      return 12;
    case 'QUARTER5':
      return 15;
    default:
      return 0;
  }
}

export function addMonthsToDateString(startDate: string, months: number) {
  const date = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  date.setMonth(date.getMonth() + months);
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function getCoverDayCount(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return undefined;
  return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
}

export function getPolicyDurationLabel(value?: string | null) {
  switch (value) {
    case 'MONTHLY':
      return 'Monthly';
    case 'QUARTER1':
      return 'Quarter 1';
    case 'QUARTER2':
      return 'Quarter 2';
    case 'QUARTER3':
      return 'Quarter 3';
    case 'QUARTER4':
      return 'Quarter 4';
    case 'QUARTER5':
      return 'Quarter 5';
    default:
      return value || '';
  }
}

export function getPolicyProductTypeLabel(value: PolicyProductType) {
  switch (value) {
    case 'PRIVATE':
      return 'Private';
    case 'GOODS_CARRYING':
      return 'Goods Carrying';
    case 'PASSENGER_CARRYING':
      return 'Passenger Carrying';
    case 'TAXI':
      return 'Taxi';
    case 'SPECIAL_TYPE':
      return 'Special Type';
    case 'TRAILER':
      return 'Trailer';
    case 'MOTOR_CYCLE':
      return 'Motor Cycle';
    default:
      return value;
  }
}

export function formatDisplayDate(value?: string) {
  const iso = toIsoDateString(value);
  if (!iso) return value?.trim() ?? '';
  const [year, month, day] = iso.split('-');
  return `${day}-${month}-${year}`;
}

function isValidDateString(value?: string) {
  if (!value) return false;
  const parsed = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  return Number.isFinite(parsed.getTime());
}

export function getPreferredRtsaExpiryDate(rtsaVehicle?: RTSAVehicleLookupResult) {
  if (isValidDateString(rtsaVehicle?.currentLicenseExpiryDate)) {
    return rtsaVehicle?.currentLicenseExpiryDate || '';
  }
  if (isValidDateString(rtsaVehicle?.roadTaxExpiryDate)) {
    return rtsaVehicle?.roadTaxExpiryDate || '';
  }
  return '';
}

export function validateRtsaAlignment(input: {
  startDate: string;
  rtsaExpiryDate?: string;
}) {
  const expiry = input.rtsaExpiryDate ? new Date(`${input.rtsaExpiryDate.slice(0, 10)}T00:00:00`) : null;
  const start = input.startDate ? new Date(`${input.startDate.slice(0, 10)}T00:00:00`) : null;
  const today = new Date(`${getTodayDateString()}T00:00:00`);

  if (!input.rtsaExpiryDate) {
    return { valid: false, reason: 'MISSING_RTSA_EXPIRY', message: '' };
  }
  if (!expiry || Number.isNaN(expiry.getTime())) {
    return { valid: false, reason: 'INVALID_RTSA_EXPIRY', message: '' };
  }
  if (expiry.getTime() < today.getTime()) {
    return {
      valid: false,
      reason: 'EXPIRED_RTSA_EXPIRY',
      message:
        'The RTSA expiry date has already passed. Please select Manual Duration to continue.',
    };
  }
  if (!start || Number.isNaN(start.getTime())) {
    return { valid: false, reason: 'INVALID_START_DATE', message: '' };
  }
  if (expiry.getTime() <= start.getTime()) {
    return {
      valid: false,
      reason: 'START_DATE_NOT_BEFORE_RTSA_EXPIRY',
      message:
        'The selected start date must be earlier than the RTSA expiry date. Please choose an earlier start date or use Manual Duration.',
    };
  }
  return { valid: true, reason: 'VALID', message: '' };
}

export function getNearestPolicyDurationForDateRange(
  startDate: string,
  endDate: string,
): PolicyDuration {
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(end.getTime())) return '';

  const options: Array<{ duration: Exclude<PolicyDuration, ''>; months: number }> = [
    { duration: 'MONTHLY', months: 1 },
    { duration: 'QUARTER1', months: 3 },
    { duration: 'QUARTER2', months: 6 },
    { duration: 'QUARTER3', months: 9 },
    { duration: 'QUARTER4', months: 12 },
    { duration: 'QUARTER5', months: 15 },
  ];

  for (const option of options) {
    const bucketEndDate = addMonthsToDateString(startDate, option.months);
    const bucketEnd = new Date(`${bucketEndDate}T00:00:00`);
    if (!Number.isNaN(bucketEnd.getTime()) && end.getTime() <= bucketEnd.getTime()) {
      return option.duration;
    }
  }
  return '';
}

export function resolveInitialCoverPeriodMode(input: {
  currentMode?: CoverPeriodMode;
  hasExplicitUserSelection: boolean;
  isRtsaVerified: boolean;
  vehicleSource: string;
  rtsaVehicle?: RTSAVehicleLookupResult;
  startDate: string;
}): CoverPeriodMode {
  const canAlign =
    input.isRtsaVerified &&
    input.vehicleSource === 'RTSA' &&
    validateRtsaAlignment({
      startDate: input.startDate,
      rtsaExpiryDate: getPreferredRtsaExpiryDate(input.rtsaVehicle),
    }).valid;

  if (!canAlign) return 'MANUAL_DURATION';
  if (input.hasExplicitUserSelection && input.currentMode) return input.currentMode;
  return 'ALIGN_WITH_ROAD_TAX';
}

export function getMotorCoverPeriodDetails(
  coverage: MotorCoveragePreferences,
  rtsaVehicle?: RTSAVehicleLookupResult,
) {
  const startDate = toIsoDateString(coverage.preferredStartDate) || coverage.preferredStartDate;
  const selectedRtsaExpiryDate = getPreferredRtsaExpiryDate(rtsaVehicle);
  const rtsaAlignment = validateRtsaAlignment({
    startDate,
    rtsaExpiryDate: selectedRtsaExpiryDate,
  });
  const alignedEndDate =
    coverage.coverPeriodMode === 'ALIGN_WITH_ROAD_TAX' && rtsaAlignment.valid
      ? selectedRtsaExpiryDate
      : '';
  const alignedPolicyDuration =
    rtsaAlignment.valid && startDate && selectedRtsaExpiryDate
      ? getNearestPolicyDurationForDateRange(startDate, selectedRtsaExpiryDate)
      : '';
  const manualEndDate =
    coverage.policyDuration && startDate
      ? addMonthsToDateString(startDate, getDurationMonths(coverage.policyDuration))
      : '';
  const endDate =
    coverage.coverPeriodMode === 'ALIGN_WITH_ROAD_TAX' ? alignedEndDate : manualEndDate;

  return {
    startDate,
    endDate,
    selectedRtsaExpiryDate,
    rtsaAlignment,
    alignedPolicyDuration,
    alignmentMessage:
      coverage.coverPeriodMode === 'ALIGN_WITH_ROAD_TAX' &&
      rtsaAlignment.valid &&
      alignedEndDate &&
      getNearestPolicyDurationForDateRange(startDate, alignedEndDate)
        ? `Insurance end date matches the RTSA expiry date of ${formatDisplayDate(alignedEndDate)}.`
        : '',
    coverPeriod:
      coverage.coverPeriodMode === 'ALIGN_WITH_ROAD_TAX'
        ? getPolicyDurationLabel(alignedPolicyDuration) || 'Aligned to Road Tax'
        : getPolicyDurationLabel(coverage.policyDuration),
    durationMethod:
      coverage.coverPeriodMode === 'ALIGN_WITH_ROAD_TAX'
        ? 'Align with Road Tax'
        : 'Manual Duration',
  };
}

export function getVehicleFormDataFromRtsa(
  result: RTSAVehicleLookupResult,
): ManualVehicleDetails {
  const yearOfManufacture = !isUnavailableRtsaValue(result.yearOfManufacture || result.year)
    ? result.yearOfManufacture || result.year || ''
    : '';
  const colour = !isUnavailableRtsaValue(result.colour || result.color)
    ? result.colour || result.color || ''
    : '';

  return {
    make: isUnavailableRtsaValue(result.make) ? '' : result.make,
    model: isUnavailableRtsaValue(result.model) ? '' : result.model,
    year: yearOfManufacture,
    yearOfManufacture,
    chassisNumber: isUnavailableRtsaValue(result.chassisNumber) ? '' : result.chassisNumber || '',
    engineNumber: isUnavailableRtsaValue(result.engineNumber) ? '' : result.engineNumber || '',
    firstRegDate: isUnavailableRtsaValue(result.firstRegDate) ? '' : result.firstRegDate || '',
    registrationStatus: isUnavailableRtsaValue(result.registrationStatus)
      ? ''
      : result.registrationStatus || '',
    vehicleType: isUnavailableRtsaValue(result.vehicleType) ? '' : result.vehicleType || '',
    bodyType: isUnavailableRtsaValue(result.bodyType) ? '' : result.bodyType || '',
    color: colour,
    colour,
    fuelType: isUnavailableRtsaValue(result.fuelType) ? '' : result.fuelType || '',
  };
}

export function hasUsableRtsaVehicleData(vehicle?: RTSAVehicleLookupResult | null) {
  if (!vehicle) return false;
  return [
    vehicle.make,
    vehicle.model,
    vehicle.yearOfManufacture || vehicle.year,
    vehicle.chassisNumber,
    vehicle.engineNumber,
    vehicle.firstRegDate,
    vehicle.registrationStatus,
    vehicle.colour || vehicle.color,
    vehicle.vehicleType,
    vehicle.bodyType,
    vehicle.fuelType,
    vehicle.roadTaxExpiryDate,
    vehicle.roadworthinessExpiryDate,
    vehicle.registrationAnniversaryDate,
    vehicle.usageType,
    vehicle.gvm,
    vehicle.numberOfSeats,
  ].some((value) => !isUnavailableRtsaValue(value));
}

export type VehicleFieldKey =
  | 'registrationNumber'
  | 'make'
  | 'model'
  | 'yearOfManufacture'
  | 'colour'
  | 'engineNumber'
  | 'chassisNumber'
  | 'firstRegDate'
  | 'registrationStatus'
  | 'vehicleType'
  | 'bodyType'
  | 'fuelType';

export function getRtsaLockedFields(vehicle?: RTSAVehicleLookupResult) {
  if (!vehicle) return {} as Partial<Record<VehicleFieldKey, boolean>>;
  return {
    registrationNumber: !isUnavailableRtsaValue(vehicle.registrationNumber),
    make: !isUnavailableRtsaValue(vehicle.make),
    model: !isUnavailableRtsaValue(vehicle.model),
    yearOfManufacture: !isUnavailableRtsaValue(vehicle.yearOfManufacture || vehicle.year),
    colour: !isUnavailableRtsaValue(vehicle.colour || vehicle.color),
    engineNumber: !isUnavailableRtsaValue(vehicle.engineNumber),
    chassisNumber: !isUnavailableRtsaValue(vehicle.chassisNumber),
    firstRegDate: !isUnavailableRtsaValue(vehicle.firstRegDate),
    registrationStatus: !isUnavailableRtsaValue(vehicle.registrationStatus),
    vehicleType: !isUnavailableRtsaValue(vehicle.vehicleType),
    bodyType: !isUnavailableRtsaValue(vehicle.bodyType),
    fuelType: !isUnavailableRtsaValue(vehicle.fuelType),
  };
}

export function getVisibleVehicleFields(
  values: MotorQuoteFormData,
  lockedFields: Partial<Record<VehicleFieldKey, boolean>>,
): VehicleFieldKey[] {
  if (!values.isRtsaVerified) {
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
      'fuelType',
    ];
  }
  return (['yearOfManufacture', 'colour', 'fuelType', 'make', 'model'] as VehicleFieldKey[]).filter(
    (field) => !lockedFields[field],
  );
}

export function normalizeLookupUsageType(value?: string): PolicyProductType | undefined {
  switch (value?.trim().toLowerCase()) {
    case 'private':
      return 'PRIVATE';
    case 'goods carrying':
    case 'goods_carrying':
      return 'GOODS_CARRYING';
    case 'passenger carrying':
    case 'passenger_carrying':
      return 'PASSENGER_CARRYING';
    case 'taxi':
      return 'TAXI';
    case 'special type':
    case 'special_type':
      return 'SPECIAL_TYPE';
    case 'trailer':
      return 'TRAILER';
    case 'motorcycle':
    case 'motor cycle':
    case 'motor_cycle':
      return 'MOTOR_CYCLE';
    default:
      return undefined;
  }
}

export function matchesSelectedCoverage(
  product: { category: string; coverageType?: string; policyProductType?: string; currency?: string; combinedLimitTypeEnabled?: boolean; standardLimitTypeEnabled?: boolean },
  values: MotorQuoteFormData,
) {
  const selectedPolicyProductType = values.coverage.policyProductType;
  const selectedCoverageType = values.coverage.coverType;
  const selectedCurrency = values.coverage.currency;

  if (product.category !== 'MOTOR') return false;
  if (selectedCoverageType && product.coverageType !== selectedCoverageType) return false;
  if (selectedPolicyProductType && product.policyProductType !== selectedPolicyProductType) {
    return false;
  }

  if (
    selectedCoverageType === 'COMPREHENSIVE' &&
    selectedCurrency === 'ZMW' &&
    product.currency !== 'ZMW'
  ) {
    return false;
  }

  if (selectedCoverageType === 'COMPREHENSIVE' && values.coverage.thirdPartyLiabilityType) {
    const liabilityTypeMatches =
      values.coverage.thirdPartyLiabilityType === 'COMBINED'
        ? product.combinedLimitTypeEnabled
        : product.standardLimitTypeEnabled;
    if (!liabilityTypeMatches) return false;
  }

  return true;
}

export function filterQuotesByPreferredInsurers<
  T extends { insurerId?: string; insurerName: string },
>(quotes: T[], values: MotorQuoteFormData) {
  const selectedCompanyIds = values.insurerSelection.selectedCompanyIds ?? [];
  const selectedCompanyNames = values.insurerSelection.selectedCompanyNames ?? [];

  if (selectedCompanyIds.length > 0) {
    const preferredCompanyIdSet = new Set(selectedCompanyIds.map((id) => id.trim()));
    const matchingQuotes = quotes.filter(
      (quote) => quote.insurerId && preferredCompanyIdSet.has(quote.insurerId),
    );
    if (matchingQuotes.length > 0) return matchingQuotes;
  }

  if (selectedCompanyNames.length > 0) {
    const preferredCompanySet = new Set(
      selectedCompanyNames.map((name) => name.trim().toLowerCase()),
    );
    return quotes.filter((quote) => preferredCompanySet.has(quote.insurerName.trim().toLowerCase()));
  }

  return quotes;
}

export function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.replace(/,/g, ''));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export function formatQuoteCurrency(amount: unknown, currency = 'ZMW') {
  const parsed = toFiniteNumber(amount);
  if (parsed === undefined) return '';
  return `${currency} ${parsed.toFixed(2)}`;
}

export function getQuotePricingSummary(quote: {
  currency: string;
  insurancePremium?: number;
  premiumLabel: string;
  basePremium?: number;
  insurerDiscountAmount?: number;
  promotionDiscountAmount?: number;
  promotionName?: string;
  levyAmount?: number;
  levyPercentage?: number;
  totalSavings?: number;
  isDiscountApplied?: boolean;
  isPromotionApplied?: boolean;
}) {
  const insurerDiscount = quote.insurerDiscountAmount ?? 0;
  const promotionDiscount = quote.promotionDiscountAmount ?? 0;
  const totalSavings = quote.totalSavings ?? insurerDiscount + promotionDiscount;
  const isDiscountApplied = Boolean(quote.isDiscountApplied || insurerDiscount > 0);
  const isPromotionApplied = Boolean(quote.isPromotionApplied || promotionDiscount > 0);
  const hasSavings = totalSavings > 0;
  const breakdown = [
    quote.basePremium !== undefined
      ? { label: 'Base Premium', value: formatQuoteCurrency(quote.basePremium, quote.currency) }
      : undefined,
    insurerDiscount > 0
      ? {
          label: 'Insurer Discount',
          value: `-${formatQuoteCurrency(insurerDiscount, quote.currency)}`,
        }
      : undefined,
    promotionDiscount > 0
      ? {
          label: quote.promotionName || 'VenSure Promotion',
          value: `-${formatQuoteCurrency(promotionDiscount, quote.currency)}`,
        }
      : undefined,
    quote.levyAmount !== undefined
      ? {
          label:
            quote.levyPercentage !== undefined
              ? `Statutory Levy (${quote.levyPercentage}%)`
              : 'Statutory Levy',
          value: formatQuoteCurrency(quote.levyAmount, quote.currency),
        }
      : undefined,
    {
      label: 'Insurance Premium',
      value: quote.premiumLabel,
      highlight: true,
    },
  ].filter((item): item is { label: string; value: string; highlight?: boolean } => Boolean(item));

  return {
    isDiscountApplied,
    isPromotionApplied,
    hasSavings,
    totalSavings,
    savingsLabel: hasSavings ? `You save ${formatQuoteCurrency(totalSavings, quote.currency)}` : '',
    breakdown,
  };
}

export function getQuoteLiabilityItems(quote: {
  coverTypeCode?: string;
  coverType?: string;
  currency: string;
  propertyDamage?: string;
  injuryDeathPerPerson?: string;
  bodilyInjuryAndDeathPerEvent?: string;
  combinedLiabilityAmount?: string;
  combinedThirdPartyLiability?: string;
  selectedLiability?: string;
  maximumLiability?: string;
  minimumLiability?: string;
  thirdPartyLiabilityType?: string;
  sumInsured?: string;
}): Array<{ label: string; value: string }> {
  const cover = `${quote.coverTypeCode || ''} ${quote.coverType || ''}`.toUpperCase();
  const formatLimit = (value?: string) => {
    if (!value?.trim()) return '';
    const amount = toFiniteNumber(value);
    return amount === undefined ? value : formatQuoteCurrency(amount, quote.currency);
  };
  const combinedLimit =
    quote.combinedThirdPartyLiability || quote.combinedLiabilityAmount || quote.selectedLiability;
  const items: Array<{ label: string; value: string }> = [];

  if (quote.sumInsured?.trim()) {
    items.push({ label: 'Sum Insured', value: formatLimit(quote.sumInsured) });
  }
  if (quote.thirdPartyLiabilityType?.trim()) {
    items.push({
      label: 'Third Party Liability',
      value: quote.thirdPartyLiabilityType.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
    });
  }

  if (cover.includes('THIRD') || cover.includes('COMPREHENSIVE') || items.length > 0) {
    items.push(
      { label: 'Property Damage', value: formatLimit(quote.propertyDamage) },
      { label: 'Injury/Death per person', value: formatLimit(quote.injuryDeathPerPerson) },
      {
        label: 'Bodily Injury & Death per event',
        value: formatLimit(quote.bodilyInjuryAndDeathPerEvent),
      },
      { label: 'Combined Limit', value: formatLimit(combinedLimit) },
      { label: 'Maximum Liability', value: formatLimit(quote.maximumLiability || quote.minimumLiability) },
    );
  }

  return items.filter((item) => Boolean(item.value));
}

export function getLowestPremiumQuoteIds(quotes: Array<{ id: string; insurancePremium?: number }>) {
  const priced = quotes.filter((quote) => quote.insurancePremium !== undefined);
  if (priced.length === 0) return new Set<string>();
  const lowest = Math.min(...priced.map((quote) => quote.insurancePremium as number));
  return new Set(
    priced.filter((quote) => quote.insurancePremium === lowest).map((quote) => quote.id),
  );
}

export function toApiPolicyProductType(value: PolicyProductType) {
  switch (value) {
    case 'PRIVATE':
      return 'Private';
    case 'GOODS_CARRYING':
      return 'Goods Carrying';
    case 'PASSENGER_CARRYING':
      return 'Passenger Carrying';
    case 'TAXI':
      return 'Taxi';
    case 'SPECIAL_TYPE':
      return 'Special Type';
    case 'TRAILER':
      return 'Trailer';
    case 'MOTOR_CYCLE':
      return 'Motorcycle';
    default:
      return undefined;
  }
}
