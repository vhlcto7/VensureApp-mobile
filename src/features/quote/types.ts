export type VehicleSource = 'RTSA' | 'Manual';
export type VehicleDataSource = 'RTSA' | 'MANUAL';
export type MotorCoverageType = 'THIRD_PARTY' | 'COMPREHENSIVE' | '';
export type CoverPeriodMode = 'MANUAL_DURATION' | 'ALIGN_WITH_ROAD_TAX';
export type PolicyProductType =
  | 'PRIVATE'
  | 'GOODS_CARRYING'
  | 'PASSENGER_CARRYING'
  | 'TAXI'
  | 'SPECIAL_TYPE'
  | 'TRAILER'
  | 'MOTOR_CYCLE'
  | '';
export type PolicyCurrency = 'ZMW' | 'USD' | '';
export type PolicyDuration =
  | 'MONTHLY'
  | 'QUARTER1'
  | 'QUARTER2'
  | 'QUARTER3'
  | 'QUARTER4'
  | 'QUARTER5'
  | '';
export type ThirdPartyLimitType = 'standard' | 'combined' | '';
export type ThirdPartyLiabilityType = 'STANDARD' | 'COMBINED' | '';
export type QuoteScope = 'ALL' | 'SELECTED';
export type MotorStep = 'lookup' | 'vehicle' | 'coverage' | 'contact' | 'review';

export type QuoteFormErrors = Record<string, string | undefined>;

export type RTSAVehicleLookupResult = {
  registrationNumber: string;
  make: string;
  model: string;
  year: string;
  yearOfManufacture?: string;
  chassisNumber?: string;
  engineNumber?: string;
  firstRegDate?: string;
  registrationStatus?: string;
  vehicleType?: string;
  bodyType?: string;
  color?: string;
  colour?: string;
  fuelType?: string;
  usageType?: string;
  currentLicenseExpiryDate?: string;
  roadTaxExpiryDate?: string;
  roadworthinessExpiryDate?: string;
  registrationAnniversaryDate?: string;
  gvm?: string;
  numberOfSeats?: string;
  hasUsableData?: boolean;
  vehicleDataSource?: VehicleDataSource;
};

export type ManualVehicleDetails = {
  make: string;
  model: string;
  year: string;
  yearOfManufacture?: string;
  chassisNumber?: string;
  engineNumber?: string;
  firstRegDate?: string;
  registrationStatus?: string;
  vehicleType?: string;
  bodyType?: string;
  color: string;
  colour?: string;
  fuelType?: string;
};

export type MotorCoveragePreferences = {
  policyProductType: PolicyProductType;
  coverType: MotorCoverageType;
  currency: PolicyCurrency;
  coverPeriodMode: CoverPeriodMode;
  preferredStartDate: string;
  policyDuration: PolicyDuration;
  thirdPartyLimitType: ThirdPartyLimitType;
  thirdPartyLiabilityType: ThirdPartyLiabilityType;
  selectedLiability: string;
  sumInsured: string;
  combinedLiabilityAmount: string;
};

export type ContactDetails = {
  fullName: string;
  email: string;
  phone: string;
  notes: string;
};

export type QuoteInsurerSelection = {
  quoteScope: QuoteScope;
  selectedCompanyIds: string[];
  selectedCompanyNames?: string[];
};

export type MotorQuoteFormData = {
  insuranceType: 'Motor';
  customerVehicleId?: string;
  registrationNumber: string;
  vehicleSource: VehicleSource;
  vehicleDataSource: VehicleDataSource;
  isRtsaVerified: boolean;
  rtsaVehicle?: RTSAVehicleLookupResult;
  manualVehicle: ManualVehicleDetails;
  coverage: MotorCoveragePreferences;
  contact: ContactDetails;
  insurerSelection: QuoteInsurerSelection;
};

export type QuoteInsurerOption = {
  id: string;
  name: string;
  logoUrl?: string;
};

export type MotorProduct = {
  category: string;
  coverageType?: string;
  policyProductType?: string;
  currency?: string;
  isActive: boolean;
  standardLimitTypeEnabled?: boolean;
  combinedLimitTypeEnabled?: boolean;
  minimumLiability?: string;
  maximumLiability?: string;
  combinedThirdPartyLiability?: string;
};

export type CreatedQuoteRequest = {
  id: string;
  reference: string;
};

export type QuoteLiabilityItem = {
  label: string;
  value: string;
};

export type QuoteResultItem = {
  id: string;
  insurerId?: string;
  insurerName: string;
  logoUrl?: string;
  productName?: string;
  coverType?: string;
  coverTypeCode?: string;
  policyProductType?: string;
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
  validUntil?: string;
  startDate?: string;
  endDate?: string;
  durationLabel?: string;
  durationMonths?: number;
  policyDuration?: string;
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
  totalPayable?: number;
  serviceFee?: number;
  paymentFee?: number;
  badge?: 'Best Price' | 'Recommended' | 'Popular';
  quoteRequestId?: string;
  policyWordingDocumentId?: string;
  keyFactStatementDocumentId?: string;
  benefits: string[];
  isExpired?: boolean;
  isUnavailable?: boolean;
};

export class RtsaLookupError extends Error {
  code: 'INVALID_VEHICLE_NUMBER' | 'NOT_FOUND' | 'TEMPORARILY_UNAVAILABLE' | 'UNAVAILABLE';

  constructor(
    code: RtsaLookupError['code'],
    message: string,
  ) {
    super(message);
    this.code = code;
    this.name = 'RtsaLookupError';
  }
}

export const MOTOR_STEPS: { id: MotorStep; label: string }[] = [
  { id: 'lookup', label: 'Vehicle lookup' },
  { id: 'vehicle', label: 'Vehicle details' },
  { id: 'coverage', label: 'Motor cover' },
  { id: 'contact', label: 'Contact' },
  { id: 'review', label: 'Review' },
];

export const POLICY_PRODUCT_TYPE_OPTIONS: Array<{
  label: string;
  value: Exclude<PolicyProductType, ''>;
}> = [
  { label: 'Private', value: 'PRIVATE' },
  { label: 'Goods Carrying', value: 'GOODS_CARRYING' },
  { label: 'Passenger Carrying', value: 'PASSENGER_CARRYING' },
  { label: 'Taxi', value: 'TAXI' },
  { label: 'Special Type', value: 'SPECIAL_TYPE' },
  { label: 'Trailer', value: 'TRAILER' },
  { label: 'Motor Cycle', value: 'MOTOR_CYCLE' },
];

export const COVER_TYPE_OPTIONS = [
  { label: 'Third Party', value: 'THIRD_PARTY' },
  { label: 'Comprehensive', value: 'COMPREHENSIVE' },
];

export const DURATION_OPTIONS: Array<{ label: string; value: Exclude<PolicyDuration, ''> }> = [
  { label: 'Monthly', value: 'MONTHLY' },
  { label: 'Quarter 1', value: 'QUARTER1' },
  { label: 'Quarter 2', value: 'QUARTER2' },
  { label: 'Quarter 3', value: 'QUARTER3' },
  { label: 'Quarter 4', value: 'QUARTER4' },
  { label: 'Quarter 5', value: 'QUARTER5' },
];

export const FUEL_TYPE_OPTIONS = [
  { label: 'Petrol', value: 'Petrol' },
  { label: 'Diesel', value: 'Diesel' },
  { label: 'Electric', value: 'Electric' },
  { label: 'Hybrid', value: 'Hybrid' },
  { label: 'Gas', value: 'Gas' },
  { label: 'Other', value: 'Other' },
];

export function createEmptyMotorQuoteForm(today: string): MotorQuoteFormData {
  return {
    insuranceType: 'Motor',
    registrationNumber: '',
    vehicleSource: 'Manual',
    vehicleDataSource: 'MANUAL',
    isRtsaVerified: false,
    manualVehicle: {
      make: '',
      model: '',
      year: '',
      yearOfManufacture: '',
      chassisNumber: '',
      engineNumber: '',
      firstRegDate: '',
      registrationStatus: '',
      vehicleType: '',
      bodyType: '',
      color: '',
      colour: '',
      fuelType: '',
    },
    coverage: {
      policyProductType: '',
      coverType: 'THIRD_PARTY',
      currency: 'ZMW',
      coverPeriodMode: 'MANUAL_DURATION',
      preferredStartDate: today,
      policyDuration: 'QUARTER4',
      thirdPartyLimitType: '',
      thirdPartyLiabilityType: 'STANDARD',
      selectedLiability: '',
      sumInsured: '',
      combinedLiabilityAmount: '',
    },
    contact: {
      fullName: '',
      email: '',
      phone: '',
      notes: '',
    },
    insurerSelection: {
      quoteScope: 'ALL',
      selectedCompanyIds: [],
      selectedCompanyNames: [],
    },
  };
}
