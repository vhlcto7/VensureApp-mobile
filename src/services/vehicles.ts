import { apiClient, assertApiConfigured } from '../api/client';
import {
  hasUsableRtsaVehicleData,
  isUnavailableRtsaValue,
  isValidVehicleLookupNumber,
  normalizeLookupUsageType,
  normalizeVehicleLookupNumber,
} from '../features/quote/helpers';
import type {
  ManualVehicleDetails,
  PolicyProductType,
  RTSAVehicleLookupResult,
  VehicleDataSource,
} from '../features/quote/types';
import { RtsaLookupError } from '../features/quote/types';
import { ApiError } from '../utils/errors';
import {
  findCustomerPortalCache,
  getCustomerPortalCache,
  invalidateCustomerPortalCache,
  setCustomerPortalCache,
} from './customer-portal-cache';

export const CUSTOMER_VEHICLE_PAGE_SIZE = 20;
const VEHICLE_CACHE_PREFIX = 'vehicles:';

export type CustomerVehiclePolicyStatus =
  | 'Active'
  | 'Expiring Soon'
  | 'Expired'
  | 'No Active Policy';

export type CustomerVehicleInsuranceSource = 'VenSure' | 'External' | 'None';

export type CustomerVehiclePolicySummary = {
  id: string;
  policyNumber: string;
  insurerName: string;
  coverType: string;
  premium?: number;
  currency: string;
  startDate?: string;
  expiryDate?: string;
  status?: string;
};

export type CustomerVehicleExternalInsurance = {
  insurerName?: string;
  coverType?: string;
  policyStartDate?: string;
  policyExpiryDate?: string;
  sumInsured?: string;
  currency?: string;
  notes?: string;
};

export type CustomerVehicleRecord = {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
  year: string;
  colour?: string;
  vehicleType?: string;
  bodyType?: string;
  engineNumber?: string;
  chassisNumber?: string;
  firstRegistrationDate?: string;
  registrationStatus?: string;
  vehicleUse?: string;
  numberOfSeats?: number;
  gvm?: string;
  fuelType?: string;
  currentLicenceExpiryDate?: string;
  roadTaxExpiryDate?: string;
  roadworthinessExpiryDate?: string;
  isRtsaVerified: boolean;
  vehicleDataSource: VehicleDataSource;
  lastRtsaRefreshDate?: string;
  insuranceSource: CustomerVehicleInsuranceSource;
  policyStatus: CustomerVehiclePolicyStatus;
  currentPolicyExpiryDate?: string;
  daysUntilRtsaExpiry?: number;
  daysUntilPolicyExpiry?: number;
  activeVensurePolicy?: CustomerVehiclePolicySummary;
  externalInsurance?: CustomerVehicleExternalInsurance;
};

export type CustomerVehicleQuotePrefill = {
  vehicleId: string;
  customerVehicleId: string;
  source: 'SAVED_VEHICLE';
  vehicleDataSource: VehicleDataSource;
  registrationNumber: string;
  isRtsaVerified: boolean;
  rtsaVehicle?: RTSAVehicleLookupResult;
  manualVehicle: ManualVehicleDetails;
  policyProductType?: PolicyProductType;
};

export type CustomerVehicleCreatePayload = {
  registrationNumber: string;
  make: string;
  model: string;
  yearOfManufacture?: number;
  colour?: string;
  vehicleType?: string;
  bodyType?: string;
  engineNumber?: string;
  chassisNumber?: string;
  firstRegDate?: string;
  registrationStatus?: string;
  vehicleUse?: string;
  numberOfSeats?: number;
  gvm?: string;
  fuelType?: string;
  roadTaxExpiryDate?: string;
  currentLicenseExpiryDate?: string;
  roadWorthinessExpiryDate?: string;
  isRtsaVerified: boolean;
  vehicleDataSource?: VehicleDataSource;
  externalInsurance?: {
    isExternallyInsured: boolean;
    insurerName?: string;
    coverType?: string;
    policyStartDate?: string;
    policyExpiryDate: string;
    sumInsured?: string;
    currency?: string;
    notes?: string;
  };
};

export type CustomerVehicleListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  policyStatus?: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'NO_ACTIVE_POLICY';
};

export type PaginationMeta = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type PaginatedVehicles = {
  data: CustomerVehicleRecord[];
  meta: PaginationMeta;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const record = asRecord(value);
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.data)) return record.data;
  return [];
}

function readString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

function readNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value.replace(/,/g, ''));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function readBoolean(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === 1 || value === '1') return true;
    if (value === 'false' || value === 0 || value === '0') return false;
  }
  return false;
}

function unwrap(payload: unknown): unknown {
  const record = asRecord(payload);
  if ('data' in record) return record.data;
  if ('body' in record) return record.body;
  return payload;
}

function unwrapRtsaPayload(payload: unknown): unknown {
  const record = asRecord(payload);
  if (record.success === false) {
    return record.data ?? record.body ?? payload;
  }
  if ('data' in record && (record.meta !== undefined || record.pagination !== undefined)) {
    return payload;
  }
  if ('data' in record && record.data !== undefined) {
    return record.data;
  }
  if ('body' in record && record.body !== undefined) {
    return record.body;
  }
  return payload;
}

function sanitizeRtsa(value: unknown) {
  const text = readString(value);
  if (!text || isUnavailableRtsaValue(text)) return undefined;
  return text;
}

function mapRtsaVehicle(payload: unknown): RTSAVehicleLookupResult {
  const unwrapped = unwrapRtsaPayload(payload);
  const record = asRecord(asRecord(unwrapped).body ?? unwrapped);
  return {
    registrationNumber:
      sanitizeRtsa(record.registrationNumber) ||
      sanitizeRtsa(record.registration_number) ||
      sanitizeRtsa(record.registrationNo) ||
      '',
    make: sanitizeRtsa(record.make) || '',
    model: sanitizeRtsa(record.model) || '',
    year:
      sanitizeRtsa(record.year) ||
      sanitizeRtsa(record.yearOfManufacture) ||
      sanitizeRtsa(record.yearMake) ||
      '',
    yearOfManufacture:
      sanitizeRtsa(record.yearOfManufacture) ||
      sanitizeRtsa(record.year_of_manufacture) ||
      sanitizeRtsa(record.yearMake) ||
      sanitizeRtsa(record.year),
    chassisNumber:
      sanitizeRtsa(record.chassisNumber) ||
      sanitizeRtsa(record.chassis_number) ||
      sanitizeRtsa(record.chassisNo),
    engineNumber:
      sanitizeRtsa(record.engineNumber) ||
      sanitizeRtsa(record.engine_number) ||
      sanitizeRtsa(record.engineNo),
    firstRegDate: (
      sanitizeRtsa(record.firstRegDate) ||
      sanitizeRtsa(record.first_reg_date) ||
      ''
    ).slice(0, 10) || undefined,
    registrationStatus:
      sanitizeRtsa(record.registrationStatus) || sanitizeRtsa(record.registration_status),
    vehicleType:
      sanitizeRtsa(record.vehicleType) ||
      sanitizeRtsa(record.vehicle_type) ||
      sanitizeRtsa(record.category),
    bodyType: sanitizeRtsa(record.bodyType) || sanitizeRtsa(record.body_type),
    color: sanitizeRtsa(record.color) || sanitizeRtsa(record.colour) || sanitizeRtsa(record.mainColor),
    colour:
      sanitizeRtsa(record.colour) || sanitizeRtsa(record.color) || sanitizeRtsa(record.mainColor),
    fuelType: sanitizeRtsa(record.fuelType) || sanitizeRtsa(record.fuel_type),
    usageType:
      sanitizeRtsa(record.usageType) ||
      sanitizeRtsa(record.vehicleUse) ||
      sanitizeRtsa(record.vehicle_use),
    currentLicenseExpiryDate:
      sanitizeRtsa(record.currentLicenseExpiryDate) ||
      sanitizeRtsa(record.current_license_expiry_date),
    roadTaxExpiryDate:
      sanitizeRtsa(record.roadTaxExpiryDate) ||
      sanitizeRtsa(record.road_tax_expiry_date) ||
      sanitizeRtsa(record.currentLicenseExpiryDate),
    roadworthinessExpiryDate:
      sanitizeRtsa(record.roadworthinessExpiryDate) ||
      sanitizeRtsa(record.roadWorthinessExpiryDate) ||
      sanitizeRtsa(record.roadworthiness_expiry_date),
    registrationAnniversaryDate:
      sanitizeRtsa(record.registrationAnniversaryDate) ||
      sanitizeRtsa(record.registration_anniversary_date),
    gvm: sanitizeRtsa(record.gvm) || sanitizeRtsa(record.GVM) || sanitizeRtsa(record.grossVehicleMass),
    numberOfSeats:
      sanitizeRtsa(record.numberOfSeats) ||
      sanitizeRtsa(record.number_of_seats) ||
      sanitizeRtsa(record.seats),
  };
}

function mapRtsaLookupFailure(error: unknown): never {
  if (error instanceof RtsaLookupError) {
    throw error;
  }

  if (error instanceof ApiError) {
    const message = error.message.toLowerCase();
    const looksLikeRtsaMiss =
      message.includes('not found with rtsa') || message === 'vehicle not found';

    if (error.status === 404 && looksLikeRtsaMiss) {
      throw new RtsaLookupError(
        'NOT_FOUND',
        'Vehicle not found with RTSA. Please check the registration number or enter details manually.',
      );
    }

    if (error.status === 503 || error.status === 504) {
      throw new RtsaLookupError(
        'TEMPORARILY_UNAVAILABLE',
        'RTSA service is temporarily unavailable. You may continue with manual vehicle entry.',
      );
    }

    throw new RtsaLookupError(
      'UNAVAILABLE',
      error.message || 'Vehicle lookup is temporarily unavailable.',
    );
  }

  throw new RtsaLookupError('UNAVAILABLE', 'Vehicle lookup is temporarily unavailable.');
}

export async function lookupVehicleWithRtsa(vehicleNumber: string) {
  const normalized = normalizeVehicleLookupNumber(vehicleNumber);
  if (!isValidVehicleLookupNumber(normalized)) {
    throw new RtsaLookupError(
      'INVALID_VEHICLE_NUMBER',
      'Enter a valid vehicle registration number.',
    );
  }

  assertApiConfigured();
  try {
    const { data } = await apiClient.get(
      `/vehicles/lookup/${encodeURIComponent(normalized)}`,
      { timeout: 30000 },
    );
    const envelope = asRecord(data);
    const vehicle = mapRtsaVehicle(data);

    if (hasUsableRtsaVehicleData(vehicle)) {
      return vehicle;
    }

    throw new RtsaLookupError(
      envelope.success === false ? 'NOT_FOUND' : 'UNAVAILABLE',
      readString(envelope.message) ||
        'Vehicle could not be retrieved from RTSA. Please enter the vehicle details manually.',
    );
  } catch (error) {
    mapRtsaLookupFailure(error);
  }
}

function cacheKey(query: object) {
  return `${VEHICLE_CACHE_PREFIX}${JSON.stringify(query)}`;
}

async function getCachedOrFetch<T>(
  key: string,
  bypassCache: boolean,
  loader: () => Promise<T>,
): Promise<T> {
  if (!bypassCache) {
    const cached = getCustomerPortalCache<T>(key);
    if (cached) return cached;
  }
  const result = await loader();
  setCustomerPortalCache(key, result);
  return result;
}

function readMeta(
  payload: Record<string, unknown>,
  page: number,
  limit: number,
  itemCount: number,
): PaginationMeta {
  const meta = asRecord(payload.meta ?? payload.pagination);
  const totalItems =
    readNumber(meta.totalItems, meta.total_items, payload.totalItems, payload.total) ?? itemCount;
  const totalPages =
    readNumber(meta.totalPages, meta.total_pages, payload.totalPages) ??
    (totalItems === 0 ? 0 : Math.ceil(totalItems / limit));

  return {
    page: readNumber(meta.page, payload.page) ?? page,
    limit: readNumber(meta.limit, payload.limit) ?? limit,
    totalItems,
    totalPages,
  };
}

function normalizePolicyStatus(
  value: string | undefined,
  expiryDate?: string,
  daysUntilPolicyExpiry?: number,
): CustomerVehiclePolicyStatus {
  if (typeof daysUntilPolicyExpiry === 'number') {
    if (daysUntilPolicyExpiry < 0) return 'Expired';
    if (daysUntilPolicyExpiry <= 30) return 'Expiring Soon';
    return 'Active';
  }

  const normalized = value?.trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (normalized === 'NO_ACTIVE_POLICY' || normalized === 'NONE') return 'No Active Policy';
  if (normalized === 'ACTIVE') return 'Active';
  if (normalized === 'EXPIRING_SOON') return 'Expiring Soon';
  if (normalized === 'EXPIRED') return 'Expired';
  if (!expiryDate) return 'No Active Policy';
  return 'No Active Policy';
}

function normalizeInsuranceSource(value: string | undefined): CustomerVehicleInsuranceSource {
  const normalized = value?.trim().toUpperCase();
  if (normalized === 'VENSURE') return 'VenSure';
  if (normalized === 'EXTERNAL') return 'External';
  return 'None';
}

function normalizeVehicleDataSource(value: unknown, isRtsaVerified: boolean): VehicleDataSource {
  const normalized = readString(value).trim().toUpperCase();
  return normalized === 'RTSA' || isRtsaVerified ? 'RTSA' : 'MANUAL';
}

function mapPolicySummary(policy: unknown): CustomerVehiclePolicySummary | undefined {
  const record = asRecord(policy);
  const id = readString(record.id, record.policyId, record.policy_id);
  const expiryDate = readString(record.expiryDate, record.expiry_date);
  if (!id && !expiryDate) return undefined;
  return {
    id,
    policyNumber: readString(record.policyNumber, record.policy_number, id),
    insurerName: readString(record.insurerName, record.insurer_name, record.insurer),
    coverType: readString(record.coverType, record.cover_type, record.cover),
    premium: readNumber(record.premium, record.premium_paid),
    currency: readString(record.currency, 'ZMW') || 'ZMW',
    startDate: readString(record.startDate, record.start_date) || undefined,
    expiryDate: expiryDate || undefined,
    status: readString(record.status) || undefined,
  };
}

function mapExternalInsurance(insurance: unknown): CustomerVehicleExternalInsurance | undefined {
  const record = asRecord(insurance);
  const policyExpiryDate = readString(record.policyExpiryDate, record.policy_expiry_date);
  if (!policyExpiryDate && !readString(record.insurerName, record.insurer_name)) return undefined;
  return {
    insurerName: readString(record.insurerName, record.insurer_name) || undefined,
    coverType: readString(record.coverType, record.cover_type) || undefined,
    policyStartDate: readString(record.policyStartDate, record.policy_start_date) || undefined,
    policyExpiryDate: policyExpiryDate || undefined,
    sumInsured: readString(record.sumInsured, record.sum_insured) || undefined,
    currency: readString(record.currency) || undefined,
    notes: readString(record.notes) || undefined,
  };
}

function mapVehicle(item: unknown): CustomerVehicleRecord | null {
  const record = asRecord(item);
  const nested = asRecord(record.vehicleInformation ?? record.vehicle_information);
  const rtsa = asRecord(record.rtsaInformation ?? record.rtsa_information);
  const id = readString(record.id, record.vehicleId, record.customerVehicleId);
  if (!id) return null;

  const isRtsaVerified = readBoolean(
    record.isRtsaVerified,
    record.is_rtsa_verified,
    record.rtsaVerified,
    record.rtsa_verified,
    rtsa.isRtsaVerified,
    rtsa.is_rtsa_verified,
    rtsa.rtsaVerified,
    rtsa.rtsa_verified,
  );
  const activeVensurePolicy = mapPolicySummary(
    record.activeVensurePolicy ?? record.active_policy ?? record.currentVensureInsurance,
  );
  const externalInsurance = mapExternalInsurance(record.externalInsurance ?? record.external_insurance);
  const currentPolicyExpiryDate =
    readString(record.currentPolicyExpiryDate, record.current_policy_expiry_date) ||
    activeVensurePolicy?.expiryDate ||
    externalInsurance?.policyExpiryDate ||
    undefined;

  return {
    id,
    registrationNumber: readString(record.registrationNumber, record.registration_number),
    make: readString(nested.make, record.make),
    model: readString(nested.model, record.model),
    year: readString(
      nested.yearOfManufacture,
      nested.year_of_manufacture,
      nested.year,
      record.yearOfManufacture,
      record.year,
    ),
    colour: readString(nested.colour, nested.color, record.colour, record.color) || undefined,
    vehicleType: readString(nested.vehicleType, nested.vehicle_type, record.vehicleType) || undefined,
    bodyType: readString(nested.bodyType, nested.body_type, record.bodyType) || undefined,
    engineNumber:
      readString(nested.engineNumber, nested.engine_number, record.engineNumber) || undefined,
    chassisNumber:
      readString(nested.chassisNumber, nested.chassis_number, record.chassisNumber) || undefined,
    firstRegistrationDate:
      readString(
        nested.firstRegistrationDate,
        nested.first_registration_date,
        record.firstRegistrationDate,
        record.firstRegDate,
      ) || undefined,
    registrationStatus:
      readString(nested.registrationStatus, nested.registration_status, record.registrationStatus) ||
      undefined,
    vehicleUse:
      readString(nested.vehicleUse, nested.vehicle_use, nested.usageType, record.vehicleUse) ||
      undefined,
    numberOfSeats: readNumber(nested.numberOfSeats, nested.number_of_seats, record.numberOfSeats),
    gvm: readString(nested.gvm, nested.GVM, record.gvm) || undefined,
    fuelType: readString(nested.fuelType, nested.fuel_type, record.fuelType) || undefined,
    currentLicenceExpiryDate:
      readString(
        record.currentLicenceExpiryDate,
        record.currentLicenseExpiryDate,
        record.rtsaCurrentLicenseExpiryDate,
        rtsa.currentLicenseExpiryDate,
        rtsa.currentLicenceExpiryDate,
      ) || undefined,
    roadTaxExpiryDate:
      readString(record.roadTaxExpiryDate, record.road_tax_expiry_date, rtsa.roadTaxExpiryDate) ||
      undefined,
    roadworthinessExpiryDate:
      readString(
        record.roadworthinessExpiryDate,
        record.roadworthiness_expiry_date,
        rtsa.roadworthinessExpiryDate,
      ) || undefined,
    isRtsaVerified,
    vehicleDataSource: normalizeVehicleDataSource(
      record.vehicleDataSource ?? record.vehicle_data_source,
      isRtsaVerified,
    ),
    lastRtsaRefreshDate:
      readString(
        record.lastRtsaRefreshDate,
        record.last_rtsa_refresh_date,
        record.lastRtsaRefreshAt,
        record.last_rtsa_refresh_at,
      ) || undefined,
    insuranceSource: normalizeInsuranceSource(
      readString(record.insuranceSource, record.insurance_source) ||
        (activeVensurePolicy ? 'VENSURE' : externalInsurance ? 'EXTERNAL' : 'NONE'),
    ),
    policyStatus: normalizePolicyStatus(
      readString(record.policyStatus, record.policy_status) || undefined,
      currentPolicyExpiryDate,
      readNumber(record.daysUntilPolicyExpiry, record.days_until_policy_expiry),
    ),
    currentPolicyExpiryDate,
    daysUntilRtsaExpiry: readNumber(record.daysUntilRtsaExpiry, record.days_until_rtsa_expiry),
    daysUntilPolicyExpiry: readNumber(
      record.daysUntilPolicyExpiry,
      record.days_until_policy_expiry,
    ),
    activeVensurePolicy,
    externalInsurance,
  };
}

export function invalidateCustomerVehiclesCache() {
  invalidateCustomerPortalCache(VEHICLE_CACHE_PREFIX);
}

export async function getCustomerVehicleCount(options?: { bypassCache?: boolean }): Promise<number> {
  if (!options?.bypassCache) {
    const cached = findCustomerPortalCache<PaginatedVehicles>(VEHICLE_CACHE_PREFIX, (payload) => {
      const record = payload as PaginatedVehicles;
      return typeof record?.meta?.totalItems === 'number';
    });
    if (cached) return cached.meta.totalItems;
  }

  const result = await listCustomerVehicles({ page: 1, limit: 1 }, options);
  return result.meta.totalItems;
}

export async function listCustomerVehicles(
  query: CustomerVehicleListQuery = {},
  options?: { bypassCache?: boolean },
): Promise<PaginatedVehicles> {
  assertApiConfigured();
  const page = query.page ?? 1;
  const limit = query.limit ?? CUSTOMER_VEHICLE_PAGE_SIZE;
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (query.search?.trim()) params.set('search', query.search.trim());
  if (query.policyStatus) params.set('policyStatus', query.policyStatus);

  return getCachedOrFetch(
    cacheKey({ ...query, page, limit }),
    Boolean(options?.bypassCache),
    async () => {
      const { data } = await apiClient.get(`/customer/vehicles?${params.toString()}`);
      const record = asRecord(data);
      const nested = asRecord(record.data);
      const items = Array.isArray(record.data)
        ? record.data
        : Array.isArray(nested.data)
          ? nested.data
          : asArray(unwrap(data));
      const source = Array.isArray(record.data) ? record : nested.data ? nested : record;
      return {
        data: items.map(mapVehicle).filter((item): item is CustomerVehicleRecord => Boolean(item)),
        meta: readMeta(asRecord(source), page, limit, items.length),
      };
    },
  );
}

export async function getCustomerVehicle(vehicleId: string): Promise<CustomerVehicleRecord> {
  assertApiConfigured();
  const { data } = await apiClient.get(`/customer/vehicles/${vehicleId}`);
  const record = asRecord(data);
  const nested = asRecord(record.data);
  const mapped = mapVehicle(nested.id || nested.registrationNumber ? nested : record);
  if (!mapped) {
    throw new ApiError('Vehicle details were not returned.');
  }
  return mapped;
}

function buildRtsaPrefill(
  prefill: Record<string, unknown>,
  vehicleDataSource: VehicleDataSource,
): RTSAVehicleLookupResult {
  return {
    registrationNumber: readString(prefill.registrationNumber, prefill.registration_number),
    make: readString(prefill.make),
    model: readString(prefill.model),
    year: readString(prefill.year, prefill.yearOfManufacture, prefill.year_of_manufacture),
    yearOfManufacture: readString(
      prefill.yearOfManufacture,
      prefill.year_of_manufacture,
      prefill.year,
    ),
    chassisNumber: readString(prefill.chassisNumber, prefill.chassis_number) || undefined,
    engineNumber: readString(prefill.engineNumber, prefill.engine_number) || undefined,
    firstRegDate: readString(prefill.firstRegDate, prefill.first_reg_date) || undefined,
    registrationStatus:
      readString(prefill.registrationStatus, prefill.registration_status) || undefined,
    vehicleType: readString(prefill.vehicleType, prefill.vehicle_type) || undefined,
    bodyType: readString(prefill.bodyType, prefill.body_type) || undefined,
    color: readString(prefill.colour, prefill.color) || undefined,
    colour: readString(prefill.colour, prefill.color) || undefined,
    fuelType: readString(prefill.fuelType, prefill.fuel_type) || undefined,
    usageType: readString(prefill.vehicleUse, prefill.vehicle_use, prefill.usageType) || undefined,
    currentLicenseExpiryDate:
      readString(prefill.currentLicenseExpiryDate, prefill.currentLicenceExpiryDate) || undefined,
    roadTaxExpiryDate: readString(prefill.roadTaxExpiryDate, prefill.road_tax_expiry_date) || undefined,
    roadworthinessExpiryDate:
      readString(
        prefill.roadWorthinessExpiryDate,
        prefill.roadworthinessExpiryDate,
        prefill.roadworthiness_expiry_date,
      ) || undefined,
    gvm: readString(prefill.gvm) || undefined,
    numberOfSeats: readString(prefill.numberOfSeats, prefill.number_of_seats) || undefined,
    hasUsableData: true,
    vehicleDataSource,
  };
}

function buildManualPrefill(prefill: Record<string, unknown>): ManualVehicleDetails {
  const year = readString(prefill.yearOfManufacture, prefill.year_of_manufacture, prefill.year);
  const colour = readString(prefill.colour, prefill.color);
  return {
    make: readString(prefill.make),
    model: readString(prefill.model),
    year,
    yearOfManufacture: year,
    chassisNumber: readString(prefill.chassisNumber, prefill.chassis_number),
    engineNumber: readString(prefill.engineNumber, prefill.engine_number),
    firstRegDate: readString(prefill.firstRegDate, prefill.first_reg_date),
    registrationStatus: readString(prefill.registrationStatus, prefill.registration_status),
    vehicleType: readString(prefill.vehicleType, prefill.vehicle_type),
    bodyType: readString(prefill.bodyType, prefill.body_type),
    color: colour,
    colour,
    fuelType: readString(prefill.fuelType, prefill.fuel_type),
  };
}

export async function getCustomerVehicleQuotePrefill(
  vehicleId: string,
): Promise<CustomerVehicleQuotePrefill> {
  assertApiConfigured();
  const { data } = await apiClient.get(`/customer/vehicles/${vehicleId}/quote-prefill`);
  const record = asRecord(unwrap(data));
  const source = record.customerVehicleId || record.registrationNumber ? record : asRecord(data);
  const isRtsaVerified = readBoolean(source.isRtsaVerified, source.is_rtsa_verified);
  const vehicleDataSource = normalizeVehicleDataSource(
    source.vehicleDataSource ?? source.vehicle_data_source,
    isRtsaVerified,
  );
  const customerVehicleId = readString(source.customerVehicleId, source.vehicleId, source.id, vehicleId);
  const nestedRtsa = asRecord(source.rtsaVehicle ?? source.rtsa_vehicle);
  const rtsaVehicle = isRtsaVerified
    ? Object.keys(nestedRtsa).length
      ? { ...buildRtsaPrefill(nestedRtsa, vehicleDataSource), hasUsableData: true }
      : buildRtsaPrefill(source, vehicleDataSource)
    : undefined;

  return {
    vehicleId: customerVehicleId,
    customerVehicleId,
    source: 'SAVED_VEHICLE',
    vehicleDataSource,
    registrationNumber: readString(source.registrationNumber, source.registration_number),
    isRtsaVerified,
    rtsaVehicle,
    manualVehicle: buildManualPrefill(source),
    policyProductType: normalizeLookupUsageType(
      readString(source.vehicleUse, source.vehicle_use, source.usageType),
    ),
  };
}

export async function createCustomerVehicle(payload: CustomerVehicleCreatePayload) {
  assertApiConfigured();
  const body: Record<string, unknown> = {
    registrationNumber: payload.registrationNumber,
    make: payload.make,
    model: payload.model,
    isRtsaVerified: payload.isRtsaVerified,
  };
  if (payload.yearOfManufacture) body.yearOfManufacture = payload.yearOfManufacture;
  if (payload.colour) body.colour = payload.colour;
  if (payload.vehicleType) body.vehicleType = payload.vehicleType;
  if (payload.bodyType) body.bodyType = payload.bodyType;
  if (payload.engineNumber) body.engineNumber = payload.engineNumber;
  if (payload.chassisNumber) body.chassisNumber = payload.chassisNumber;
  if (payload.firstRegDate) body.firstRegDate = payload.firstRegDate;
  if (payload.registrationStatus) body.registrationStatus = payload.registrationStatus;
  if (payload.vehicleUse) body.vehicleUse = payload.vehicleUse;
  if (payload.numberOfSeats !== undefined) body.numberOfSeats = payload.numberOfSeats;
  if (payload.gvm) body.gvm = payload.gvm;
  if (payload.fuelType) body.fuelType = payload.fuelType;
  if (payload.roadTaxExpiryDate) body.roadTaxExpiryDate = payload.roadTaxExpiryDate;
  if (payload.currentLicenseExpiryDate) body.currentLicenseExpiryDate = payload.currentLicenseExpiryDate;
  if (payload.roadWorthinessExpiryDate) {
    body.roadWorthinessExpiryDate = payload.roadWorthinessExpiryDate;
  }
  if (payload.vehicleDataSource) body.vehicleDataSource = payload.vehicleDataSource;
  if (payload.externalInsurance) body.externalInsurance = payload.externalInsurance;

  const { data } = await apiClient.post('/customer/vehicles', body);
  invalidateCustomerVehiclesCache();
  const record = asRecord(unwrap(data));
  const mapped = mapVehicle(record.id ? record : asRecord(data));
  if (!mapped) {
    throw new ApiError('Vehicle was saved, but no vehicle id was returned.');
  }
  return mapped;
}

export async function archiveCustomerVehicle(vehicleId: string) {
  assertApiConfigured();
  await apiClient.patch(`/customer/vehicles/${vehicleId}/archive`);
  invalidateCustomerVehiclesCache();
}

export async function refreshCustomerVehicleFromRtsa(vehicleId: string) {
  assertApiConfigured();
  const { data } = await apiClient.post(`/customer/vehicles/${vehicleId}/refresh-rtsa`);
  invalidateCustomerVehiclesCache();
  const record = asRecord(unwrap(data));
  const mapped = mapVehicle(record.id ? record : asRecord(data));
  if (!mapped) {
    throw new ApiError('Vehicle was refreshed, but no details were returned.');
  }
  return mapped;
}
