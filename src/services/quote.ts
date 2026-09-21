import { apiClient, assertApiConfigured } from '../api/client';
import { API_BASE_URL } from '../config/env';
import { ApiError } from '../utils/errors';
import { normalizeMobileForApi } from '../utils/phone';
import {
  addMonthsToDateString,
  getCoverDayCount,
  getDurationMonths,
  getMotorCoverPeriodDetails,
  getTodayDateString,
  isFutureRegistrationDate,
  normalizeVehicleLookupNumber,
  toApiPolicyProductType,
  toIsoDateString,
} from '../features/quote/helpers';
import type {
  CreatedQuoteRequest,
  MotorProduct,
  MotorQuoteFormData,
  QuoteInsurerOption,
  QuoteResultItem,
} from '../features/quote/types';

export { lookupVehicleWithRtsa } from './vehicles';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

function unwrap(payload: unknown): unknown {
  const record = asRecord(payload);
  if ('data' in record) return record.data;
  if ('body' in record) return record.body;
  return payload;
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const record = asRecord(value);
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.data)) return record.data;
  if (Array.isArray(record.quotes)) return record.quotes;
  return [];
}

function readRelation(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }
  return {};
}

function isExplicitlyInactive(record: Record<string, unknown>) {
  const flags = [record.isActive, record.is_active, record.status, record.enabled, record.isEnabled];
  for (const flag of flags) {
    if (flag === false || flag === 0 || flag === 'false' || flag === '0') return true;
    if (typeof flag === 'string' && flag.trim().toLowerCase() === 'inactive') return true;
  }
  return false;
}

function readCoverTypeCode(record: Record<string, unknown>, nestedCover: Record<string, unknown>) {
  return readString(
    nestedCover.code,
    record.coverage_type,
    record.coverageType,
    typeof record.coverType === 'string' ? record.coverType : undefined,
    typeof record.cover_type === 'string' ? record.cover_type : undefined,
  ).toUpperCase();
}

function readPaginationMeta(payload: unknown) {
  const root = asRecord(payload);
  const unwrapped = asRecord(unwrap(payload));
  const meta = asRecord(root.meta ?? unwrapped.meta ?? asRecord(root.data).meta);
  const totalPages = Number(meta.totalPages ?? meta.total_pages ?? 1);
  return Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1;
}

async function listActiveCountryProductRecords(countryId: string) {
  const records: unknown[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const { data } = await apiClient.get(`/products/country/${countryId}/active`, {
      params: { page, limit: 100 },
    });
    records.push(...asArray(unwrap(data)));
    totalPages = readPaginationMeta(data);
    page += 1;
  } while (page <= totalPages && page <= 20);

  return records;
}

function readQuoteBadge(value: unknown): 'Best Price' | 'Recommended' | 'Popular' | undefined {
  const badge = readString(value);
  if (badge === 'Best Price' || badge === 'Recommended' || badge === 'Popular') return badge;
  return undefined;
}

function resolveAssetUrl(url?: string) {
  const rawValue = url?.trim();
  if (!rawValue) return undefined;
  const normalized = rawValue.replace(/\\/g, '/');
  if (/^https?:\/\//i.test(normalized)) return normalized;
  try {
    const origin = new URL(API_BASE_URL).origin;
    if (normalized.startsWith('/')) return `${origin}${normalized}`;
    if (normalized.startsWith('uploads') || normalized.startsWith('api/')) {
      return `${origin}/${normalized}`;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function readPremium(record: Record<string, unknown>, breakdown: Record<string, unknown>) {
  return (
    readString(
      breakdown.insurance_premium,
      breakdown.insurancePremium,
      record.insurance_premium,
      record.insurancePremium,
      record.totalCustomerPayable,
      record.total_customer_payable,
      breakdown.totalCustomerPayable,
      record.total_amount,
      record.totalPremium,
      record.premium,
    ) || ''
  );
}

function readCoverType(record: Record<string, unknown>) {
  const nested = asRecord(record.coverType);
  return (
    readString(
      record.cover_type,
      nested.name,
      nested.code,
      record.coverageType,
      record.coverage_type,
      typeof record.coverType === 'string' ? record.coverType : undefined,
    ) || undefined
  );
}

let cachedCountryId = '';

export async function getQuoteCountryId() {
  if (cachedCountryId) return cachedCountryId;
  assertApiConfigured();
  const { data } = await apiClient.get('/countries?page=1&limit=100');
  const countries = asArray(unwrap(data)).map((item) => asRecord(item));
  const preferred =
    countries.find((country) => readString(country.name).toLowerCase() === 'zambia') ??
    countries.find((country) => country.isActive !== false && country.is_active !== false) ??
    countries[0];
  const countryId = readString(preferred?.id);
  if (!countryId) {
    throw new ApiError('Unable to resolve a valid country for this quote request.');
  }
  cachedCountryId = countryId;
  return countryId;
}

export async function getActiveQuoteInsurers(): Promise<QuoteInsurerOption[]> {
  assertApiConfigured();
  const { data } = await apiClient.get('/customer/insurance-companies/active');
  const companies: QuoteInsurerOption[] = [];

  for (const item of asArray(unwrap(data))) {
    const record = asRecord(item);
    const id = readString(record.id);
    const name = readString(record.name, record.companyName, record.company_name);
    if (!id || !name) continue;
    if (record.isActive === false || record.is_active === false) continue;
    const logoUrl = readString(record.logoUrl, record.logo_url);
    companies.push({
      id,
      name,
      logoUrl: resolveAssetUrl(logoUrl) || resolveAssetUrl(`/api/companies/${id}/logo`),
    });
  }

  return companies.sort((left, right) => left.name.localeCompare(right.name));
}

function normalizeProductType(value: unknown) {
  const normalized = readString(value).toLowerCase().replace(/[\s_-]+/g, ' ');
  if (normalized === 'private') return 'PRIVATE';
  if (normalized === 'goods carrying') return 'GOODS_CARRYING';
  if (normalized === 'passenger carrying') return 'PASSENGER_CARRYING';
  if (normalized === 'taxi') return 'TAXI';
  if (normalized === 'special type') return 'SPECIAL_TYPE';
  if (normalized === 'trailer') return 'TRAILER';
  if (normalized === 'motorcycle' || normalized === 'motor cycle') return 'MOTOR_CYCLE';
  return readString(value);
}

export async function getActiveMotorProducts(): Promise<MotorProduct[]> {
  const countryId = await getQuoteCountryId();
  const records = await listActiveCountryProductRecords(countryId);
  const liveCoverCodes = new Set<string>();
  const disabledCoverCodes = new Set<string>();
  const parsed = records.map((item) => {
    const record = asRecord(item);
    const nestedCover = readRelation(record, ['coverType', 'cover_type', 'cover_types']);
    const nestedCategory = readRelation(record, [
      'insuranceCategory',
      'insurance_category',
      'insurance_categories',
    ]);
    const coverageType = readCoverTypeCode(record, nestedCover);
    if (Object.keys(nestedCover).length > 0) {
      if (isExplicitlyInactive(nestedCover)) {
        if (coverageType) disabledCoverCodes.add(coverageType);
      } else if (coverageType) {
        liveCoverCodes.add(coverageType);
      }
    }
    return { record, nestedCover, nestedCategory, coverageType };
  });

  const products: MotorProduct[] = [];

  for (const item of parsed) {
    const { record, nestedCover, nestedCategory, coverageType } = item;
    if (Object.keys(nestedCategory).length > 0 && isExplicitlyInactive(nestedCategory)) continue;
    if (Object.keys(nestedCover).length > 0 && isExplicitlyInactive(nestedCover)) continue;
    if (coverageType && disabledCoverCodes.has(coverageType) && !liveCoverCodes.has(coverageType)) {
      continue;
    }
    if (liveCoverCodes.size > 0 && coverageType && !liveCoverCodes.has(coverageType)) continue;
    const configs = asArray(
      record.product_policy_type_configs ??
        record.policy_type_configs ??
        record.policyTypeConfigs,
    );
    const category = readString(record.category, record.productType, record.type).toUpperCase();
    if (configs.length === 0) continue;
    for (const configItem of configs) {
      const config = asRecord(configItem);
      if (config.is_active === false || config.isActive === false) continue;
      products.push({
        category: category || 'MOTOR',
        coverageType: readString(
          nestedCover.code,
          config.coverage_type,
          config.coverageType,
          coverageType,
        ).toUpperCase(),
        policyProductType: normalizeProductType(
          config.policy_product_type ?? config.policyProductType,
        ),
        currency: readString(config.currency, record.currency).toUpperCase(),
        isActive: record.is_active !== false && record.isActive !== false,
        standardLimitTypeEnabled: Boolean(
          config.standard_limit_type_enabled ?? config.standardLimitTypeEnabled,
        ),
        combinedLimitTypeEnabled: Boolean(
          config.combined_limit_type_enabled ?? config.combinedLimitTypeEnabled,
        ),
        minimumLiability: readString(config.minimum_liability, config.minimumLiability) || undefined,
        maximumLiability: readString(config.maximum_liability, config.maximumLiability) || undefined,
        combinedThirdPartyLiability:
          readString(
            config.combined_third_party_liability,
            config.combinedThirdPartyLiability,
          ) || undefined,
      });
    }
  }

  return products.filter((product) => product.isActive && product.category === 'MOTOR');
}

export type MotorCoverTypeOption = {
  code: 'THIRD_PARTY' | 'COMPREHENSIVE';
  label: string;
};

export function coverTypesFromMotorProducts(products: MotorProduct[]): MotorCoverTypeOption[] {
  const labels: Record<MotorCoverTypeOption['code'], string> = {
    THIRD_PARTY: 'Third Party',
    COMPREHENSIVE: 'Comprehensive',
  };
  const seen = new Set<MotorCoverTypeOption['code']>();
  for (const product of products) {
    const code = product.coverageType?.toUpperCase();
    if (code === 'THIRD_PARTY' || code === 'COMPREHENSIVE') seen.add(code);
  }
  return (['THIRD_PARTY', 'COMPREHENSIVE'] as const)
    .filter((code) => seen.has(code))
    .map((code) => ({ code, label: labels[code] }));
}

export async function getAvailableMotorCoverTypes(): Promise<MotorCoverTypeOption[]> {
  try {
    return coverTypesFromMotorProducts(await getActiveMotorProducts());
  } catch {
    return [{ code: 'THIRD_PARTY', label: 'Third Party' }];
  }
}

export async function createMotorQuoteRequest(
  payload: MotorQuoteFormData,
): Promise<CreatedQuoteRequest> {
  if (isFutureRegistrationDate(payload.manualVehicle.firstRegDate)) {
    throw new ApiError('First Registration Date cannot be in the future.');
  }
  const preferredStartDate =
    toIsoDateString(payload.coverage.preferredStartDate) || payload.coverage.preferredStartDate;
  if (preferredStartDate && preferredStartDate < getTodayDateString()) {
    throw new ApiError('Start date cannot be in the past. Cover can start from today only.');
  }

  assertApiConfigured();
  const countryId = await getQuoteCountryId();
  const normalizedVehicleNumber = payload.registrationNumber
    ? normalizeVehicleLookupNumber(payload.registrationNumber)
    : '';
  const vehicle =
    payload.vehicleSource === 'RTSA' && payload.rtsaVehicle
      ? { ...payload.rtsaVehicle, ...payload.manualVehicle }
      : payload.manualVehicle;
  const policyCurrency =
    payload.coverage.coverType === 'THIRD_PARTY' ? 'ZMW' : payload.coverage.currency || undefined;
  const coverPeriodDetails = getMotorCoverPeriodDetails(payload.coverage, payload.rtsaVehicle);
  const alignedPolicyDuration =
    payload.coverage.coverPeriodMode === 'ALIGN_WITH_ROAD_TAX'
      ? coverPeriodDetails.alignedPolicyDuration
      : '';
  const startDate =
    toIsoDateString(coverPeriodDetails.startDate || preferredStartDate) || preferredStartDate;
  const durationMonths =
    payload.coverage.coverPeriodMode === 'ALIGN_WITH_ROAD_TAX'
      ? alignedPolicyDuration
        ? getDurationMonths(alignedPolicyDuration)
        : undefined
      : payload.coverage.policyDuration
        ? getDurationMonths(payload.coverage.policyDuration)
        : payload.coverage.coverType === 'THIRD_PARTY'
          ? getDurationMonths('QUARTER4')
          : 12;
  const endDate =
    coverPeriodDetails.endDate ||
    addMonthsToDateString(preferredStartDate, durationMonths || 12);
  const numberOfDays = startDate && endDate ? getCoverDayCount(startDate, endDate) : undefined;
  const normalizedVehicle = {
    ...vehicle,
    registrationNumber: normalizedVehicleNumber || undefined,
    vehicleNumber: normalizedVehicleNumber || undefined,
    yearOfManufacture: payload.manualVehicle.yearOfManufacture || payload.manualVehicle.year || '',
    colour: payload.manualVehicle.colour || payload.manualVehicle.color || '',
    firstRegDate:
      toIsoDateString(payload.manualVehicle.firstRegDate) ||
      payload.manualVehicle.firstRegDate ||
      '',
    vehicleDataSource: payload.vehicleDataSource,
  };
  const normalizedCoverage = {
    ...payload.coverage,
    preferredStartDate,
  };

  const requestBody = {
    country_id: countryId,
    request_type: 'MOTOR',
    ...(payload.customerVehicleId ? { vehicle_id: payload.customerVehicleId } : {}),
    ...(normalizedVehicleNumber ? { registrationNumber: normalizedVehicleNumber } : {}),
    chassisNumber: payload.manualVehicle.chassisNumber?.trim() || undefined,
    vehicleSource: payload.vehicleSource,
    vehicleDataSource: payload.vehicleDataSource,
    vehicle: normalizedVehicle,
    coverage: normalizedCoverage,
    customer: {
      ...payload.contact,
      phone: normalizeMobileForApi(payload.contact.phone),
    },
    policy_product_type: toApiPolicyProductType(payload.coverage.policyProductType),
    policy_currency: policyCurrency,
    coverage_type: payload.coverage.coverType,
    third_party_limit_type:
      payload.coverage.coverType === 'THIRD_PARTY' && payload.coverage.thirdPartyLimitType
        ? payload.coverage.thirdPartyLimitType === 'combined'
          ? 'COMBINED'
          : payload.coverage.thirdPartyLimitType === 'standard'
            ? 'STANDARD'
            : undefined
        : undefined,
    thirdPartyLiabilityType:
      payload.coverage.coverType === 'COMPREHENSIVE'
        ? payload.coverage.thirdPartyLiabilityType || undefined
        : undefined,
    policy_duration:
      payload.coverage.coverPeriodMode === 'ALIGN_WITH_ROAD_TAX'
        ? alignedPolicyDuration || undefined
        : payload.coverage.policyDuration || undefined,
    cover_period_mode: payload.coverage.coverPeriodMode,
    durationMethod: payload.coverage.coverPeriodMode,
    duration_method: payload.coverage.coverPeriodMode,
    coverPeriodMode: payload.coverage.coverPeriodMode,
    policyDuration:
      payload.coverage.coverPeriodMode === 'ALIGN_WITH_ROAD_TAX'
        ? alignedPolicyDuration || undefined
        : payload.coverage.policyDuration || undefined,
    startDate,
    endDate,
    start_date: startDate,
    end_date: endDate,
    numberOfDays,
    duration_months: durationMonths || undefined,
    selected_liability:
      payload.coverage.coverType === 'THIRD_PARTY' &&
      payload.coverage.thirdPartyLimitType === 'combined'
        ? payload.coverage.selectedLiability || undefined
        : undefined,
    sum_insured:
      payload.coverage.coverType === 'COMPREHENSIVE'
        ? payload.coverage.sumInsured || undefined
        : undefined,
    combined_liability_amount:
      payload.coverage.coverType === 'COMPREHENSIVE' &&
      payload.coverage.thirdPartyLiabilityType === 'COMBINED'
        ? payload.coverage.combinedLiabilityAmount || undefined
        : undefined,
    combinedLiabilityAmount:
      payload.coverage.coverType === 'COMPREHENSIVE' &&
      payload.coverage.thirdPartyLiabilityType === 'COMBINED'
        ? payload.coverage.combinedLiabilityAmount || undefined
        : undefined,
    insurerSelectionMode: payload.insurerSelection.quoteScope,
    selectedCompanyIds:
      payload.insurerSelection.quoteScope === 'SELECTED'
        ? payload.insurerSelection.selectedCompanyIds
        : undefined,
    quoteRequestData: {
      insuranceType: payload.insuranceType,
      registrationNumber: normalizedVehicleNumber,
      vehicleSource: payload.vehicleSource,
      vehicleDataSource: payload.vehicleDataSource,
      vehicle: normalizedVehicle,
      coverage: normalizedCoverage,
      customer: {
        ...payload.contact,
        phone: normalizeMobileForApi(payload.contact.phone),
      },
    },
  };

  const { data } = await apiClient.post('/quote-requests', requestBody, { timeout: 60000 });
  const record = asRecord(unwrap(data));
  const id = readString(record.id, record.quoteRequestId);
  if (!id) {
    throw new ApiError('Quote request created, but no request id was returned.');
  }
  if (__DEV__) {
    console.log(`[api] quote-request created ${id}`);
  }
  return {
    id,
    reference: readString(record.referenceNo, record.displayQuoteReference, record.reference),
  };
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => readString(item)).filter(Boolean);
  }
  const text = readString(value);
  return text ? [text] : [];
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

export async function getQuotesByQuoteRequestId(
  quoteRequestId: string,
): Promise<QuoteResultItem[]> {
  assertApiConfigured();
  const [{ data }, insurers] = await Promise.all([
    apiClient.get(`/quote-requests/${quoteRequestId}/quotes`, {
      params: { page: 1, limit: 100 },
      timeout: 60000,
    }),
    getActiveQuoteInsurers().catch(() => [] as QuoteInsurerOption[]),
  ]);
  const insurerById = new Map(insurers.map((company) => [company.id, company]));
  const insurerByName = new Map(
    insurers.map((company) => [company.name.trim().toLowerCase(), company]),
  );

  return asArray(unwrap(data)).map((item) => {
    const record = asRecord(item);
    const breakdown = asRecord(record.premiumBreakdown ?? record.premium_breakdown);
    const details = asRecord(record.insurer_response ?? record.insurerResponse);
    const nestedCompany = asRecord(record.insurance_companies ?? record.insuranceCompany);
    const premium = readPremium(record, { ...breakdown, ...details });
    const currency =
      readString(record.currency, details.currency, details.policy_currency, record.policy_currency) ||
      'ZMW';
    const coverType = readCoverType({ ...details, ...record });
    const coverTypeCode = readString(
      asRecord(record.coverType).code,
      record.coverage_type,
      record.coverageType,
    ).toUpperCase();
    const insurerId =
      readString(
        record.insurerId,
        record.insurer_id,
        record.insuranceCompanyId,
        record.insurance_company_id,
        nestedCompany.id,
      ) || undefined;
    const insurerName =
      readString(
        record.insurerName,
        record.insurer_name,
        record.insuranceCompanyName,
        record.insurance_company_name,
        nestedCompany.name,
        record.providerName,
      ) || 'Insurer';
    const matchedInsurer =
      (insurerId ? insurerById.get(insurerId) : undefined) ||
      insurerByName.get(insurerName.toLowerCase());
    const insurancePremium = readNumber(
      breakdown.insurancePremium,
      record.insurancePremium,
      record.insurance_premium,
      premium,
    );
    const insurerDiscountAmount = readNumber(
      breakdown.insurerDiscountAmount,
      record.insurerDiscountAmount,
      record.insurer_discount_amount,
    );
    const promotionDiscountAmount = readNumber(
      breakdown.promotionDiscountAmount,
      breakdown.policyHubPromotion,
      record.promotionDiscountAmount,
      record.promotion_discount_amount,
    );
    const totalSavings = readNumber(record.totalSavings, record.total_savings);
    return {
      id: readString(record.id),
      insurerId,
      insurerName,
      logoUrl:
        resolveAssetUrl(
          readString(record.logoUrl, record.logo_url, nestedCompany.logoUrl, nestedCompany.logo_url),
        ) ||
        matchedInsurer?.logoUrl ||
        (!matchedInsurer && insurerId
          ? resolveAssetUrl(`/api/companies/${insurerId}/logo`)
          : undefined),
      productName:
        readString(record.productName, record.product_name, asRecord(record.products).name) ||
        undefined,
      coverType: coverType || undefined,
      coverTypeCode: coverTypeCode || undefined,
      policyProductType: readString(record.policy_product_type, record.policyProductType) || undefined,
      currency,
      insurancePremium,
      premiumLabel: insurancePremium !== undefined ? `${currency} ${insurancePremium.toFixed(2)}` : premium ? `${currency} ${premium}` : 'Pricing unavailable',
      basePremium: readNumber(breakdown.basePremium, record.basePremium, record.base_premium),
      insurerDiscountAmount,
      promotionDiscountAmount,
      promotionName: readString(record.promotionName, record.promotion_name) || undefined,
      levyAmount: readNumber(breakdown.levyAmount, breakdown.levy, record.levyAmount, record.levy_amount),
      levyPercentage: readNumber(
        breakdown.levyPercentage,
        record.levyPercentage,
        record.levy_percentage,
      ),
      totalSavings,
      isDiscountApplied:
        record.isDiscountApplied === true ||
        record.is_discount_applied === true ||
        (insurerDiscountAmount ?? 0) > 0,
      isPromotionApplied:
        record.isPromotionApplied === true ||
        record.is_promotion_applied === true ||
        (promotionDiscountAmount ?? 0) > 0,
      validUntil: readString(record.validUntil, record.valid_until) || undefined,
      startDate: readString(record.startDate, record.start_date) || undefined,
      endDate: readString(record.endDate, record.end_date) || undefined,
      durationLabel: readString(record.durationLabel, record.duration_label) || undefined,
      durationMonths: readNumber(record.duration_months, record.durationMonths),
      policyDuration: readString(record.policyDuration, record.policy_duration) || undefined,
      propertyDamage: readString(record.property_damage, record.propertyDamage) || undefined,
      injuryDeathPerPerson:
        readString(record.injury_death_per_person, record.injuryDeathPerPerson) || undefined,
      bodilyInjuryAndDeathPerEvent:
        readString(
          record.bodily_injury_and_death_per_event,
          record.bodilyInjuryAndDeathPerEvent,
        ) || undefined,
      combinedLiabilityAmount:
        readString(
          record.combined_liability_amount,
          record.combinedLiabilityAmount,
          record.selected_combined_liability_amount,
          details.combined_liability_amount,
          details.combinedLiabilityAmount,
        ) || undefined,
      combinedThirdPartyLiability:
        readString(
          record.combinedThirdPartyLiability,
          record.combined_third_party_liability,
          details.combinedThirdPartyLiability,
        ) || undefined,
      selectedLiability: readString(record.selectedLiability, details.selectedLiability) || undefined,
      maximumLiability: readString(record.maximumLiability, details.maximumLiability) || undefined,
      minimumLiability: readString(record.minimumLiability, details.minimumLiability) || undefined,
      thirdPartyLiabilityType:
        readString(
          record.thirdPartyLiabilityType,
          record.third_party_liability_type,
          details.thirdPartyLiabilityType,
        ) || undefined,
      sumInsured: readString(record.sumInsured, record.sum_insured, details.sumInsured, details.sum_insured) || undefined,
      totalPayable: readNumber(
        breakdown.totalPayable,
        breakdown.finalPayableAmount,
        record.totalPayable,
        record.total_payable,
      ),
      serviceFee: readNumber(breakdown.serviceFee, record.serviceFee),
      paymentFee: readNumber(breakdown.paymentFee, record.paymentFee, record.paymentProcessingFee),
      badge: readQuoteBadge(record.badge),
      quoteRequestId: readString(record.quoteRequestId, record.quote_request_id) || undefined,
      policyWordingDocumentId:
        readString(
          asRecord(record.policyWordingDocument).id,
          asRecord(asRecord(record.documentStatus).policyWordingDocument).id,
        ) || undefined,
      keyFactStatementDocumentId:
        readString(
          asRecord(record.keyFactStatementDocument).id,
          asRecord(asRecord(record.documentStatus).keyFactStatementDocument).id,
        ) || undefined,
      benefits: asStringArray(record.benefits),
      isExpired:
        record.isExpired === true ||
        record.is_expired === true ||
        readString(record.status).toUpperCase() === 'EXPIRED',
      isUnavailable:
        record.isUnavailable === true ||
        record.is_unavailable === true ||
        record.unavailable === true,
    };
  });
}
