import { apiClient, assertApiConfigured } from '../api/client';
import { API_BASE_URL } from '../config/env';
import { toFiniteNumber } from '../features/quote/helpers';
import type { QuoteInsurerOption } from '../features/quote/types';
import {
  documentDisplayName,
  documentKind,
  mapQuoteStatusLabel,
  policyDisplayStatus,
  toClientApiPath,
} from '../features/customer-lists/helpers';
import type { CustomerPolicyStatus } from '../features/dashboard/types';
import {
  getCustomerPortalCache,
  invalidateCustomerPortalCache,
  setCustomerPortalCache,
} from './customer-portal-cache';
import { getActiveQuoteInsurers } from './quote';

export const CUSTOMER_LIST_PAGE_SIZE = 20;

export type CoverTypeFilter = 'THIRD_PARTY' | 'COMPREHENSIVE';
export type QuoteSort = 'createdAt:desc' | 'createdAt:asc';
export type QuoteFilterStatus = 'DRAFT' | 'PENDING_PAYMENT' | 'PENDING' | 'GENERATED';

export type PaginationMeta = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type PaginatedResult<T> = {
  data: T[];
  meta: PaginationMeta;
};

export type CustomerQuoteListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: QuoteFilterStatus[];
  coverType?: CoverTypeFilter;
  fromDate?: string;
  toDate?: string;
  sort?: QuoteSort;
};

export type CustomerPolicyListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  coverType?: CoverTypeFilter;
  fromDate?: string;
  toDate?: string;
};

export type CustomerTransactionListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  coverType?: CoverTypeFilter;
  fromDate?: string;
  toDate?: string;
};

export type CustomerQuoteRecord = {
  id: string;
  quoteReference: string;
  quoteRequestId?: string;
  vehicleRegistrationNumber: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  vehicleUse?: string;
  coverType: string;
  insurerName: string;
  policyProductType?: string;
  quoteStatus: string;
  backendQuoteStatus: string;
  paymentStatus: string;
  createdDate: string;
  validUntil?: string;
  premium?: number;
  totalPayable?: number;
  currency: string;
  policyDuration?: string;
  startDate?: string;
  endDate?: string;
  policyId?: string;
  logoUrl?: string;
};

export type QuoteProductDocument = {
  id: string;
  title: string;
  fileName: string;
  documentType?: string;
};

export type QuotePurchaseSummary = {
  quote: CustomerQuoteDetail;
  policyWording?: QuoteProductDocument;
  keyFacts?: QuoteProductDocument;
  documentConsentRequired: boolean;
  paymentAllowed: boolean;
  reason?: string;
  missingDocumentTypes: string[];
};

export type CustomerPaymentSettings = {
  mobileMoneyEnabled: boolean;
  cardEnabled: boolean;
  mobileMoneyServiceChargePercent: number;
  cardServiceChargePercent: number;
};

export type CustomerQuoteDetail = CustomerQuoteRecord & {
  productName?: string;
  policyDurationLabel?: string;
  benefits: string[];
  premiumBreakdown?: Record<string, string | number | undefined>;
};

export type CustomerPolicyRecord = {
  id: string;
  policyNumber: string;
  insurerName: string;
  logoUrl?: string;
  vehicleId?: string;
  vehicleRegistrationNumber: string;
  vehicleDetails?: string;
  coverType: string;
  policyProductType?: string;
  startDate: string;
  expiryDate: string;
  backendStatus: string;
  displayStatus: CustomerPolicyStatus;
  premiumPaid?: string;
  currency?: string;
};

export type CustomerPolicyDocument = {
  id: string;
  name: string;
  type: string;
  fileName: string;
  mimeType?: string;
  source: 'policy' | 'insurer';
  kind: ReturnType<typeof documentKind>;
  downloadPath: string;
  productId?: string;
  documentGroup?: string;
  coverageType?: string;
  policyProductType?: string;
  uploadedAt?: string;
};

export type CustomerPolicyDetail = CustomerPolicyRecord & {
  currency: string;
  premiumPaid?: string;
  totalPremium?: string;
  paymentStatus?: string;
  documents: CustomerPolicyDocument[];
};

export type CustomerPaymentRecord = {
  transactionId: string;
  quoteId?: string;
  quoteReference?: string;
  vehicleRegistrationNumber?: string;
  policyId?: string;
  policyNumber?: string;
  amount?: number;
  currencyCode: string;
  status: string;
  paymentMethod?: string;
  paymentReference?: string;
  externalPaymentReference?: string;
  createdDate?: string;
  coverType?: string;
};

export type CustomerPaymentDetail = CustomerPaymentRecord & {
  serviceCharge?: number;
  processingFee?: number;
  feeAmount?: number;
  insurancePremium?: number;
  totalPayable?: number;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function readNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    const parsed = toFiniteNumber(value);
    if (parsed !== undefined) return parsed;
  }
  return undefined;
}

function parsePercentValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.replace(/%/g, '').replace(/,/g, '').trim());
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return undefined;
}

function collectServiceChargePercents(
  value: unknown,
  found: { mobileMoney?: number; card?: number },
  depth = 0,
) {
  if (depth > 4 || !value || typeof value !== 'object') return found;
  if (Array.isArray(value)) {
    value.forEach((entry) => collectServiceChargePercents(entry, found, depth + 1));
    return found;
  }
  const record = value as Record<string, unknown>;
  for (const [key, nested] of Object.entries(record)) {
    const normalized = key.replace(/_/g, '').toLowerCase();
    const parsed = parsePercentValue(nested);
    if (parsed !== undefined) {
      if (normalized.includes('mobilemoney') && (normalized.includes('percent') || normalized.includes('charge'))) {
        found.mobileMoney = parsed;
      }
      if (
        normalized.includes('card') &&
        (normalized.includes('percent') || normalized.includes('charge')) &&
        !normalized.includes('enable')
      ) {
        found.card = parsed;
      }
    }
    collectServiceChargePercents(nested, found, depth + 1);
  }
  return found;
}

function unwrapPayload(value: unknown): Record<string, unknown> {
  const record = asRecord(value);
  const nested = asRecord(record.data);
  if (Array.isArray(record.data) || nested.data || nested.meta) {
    return record;
  }
  return record;
}

function readMeta(payload: Record<string, unknown>, page: number, limit: number, itemCount: number): PaginationMeta {
  const meta = asRecord(payload.meta);
  const totalItems =
    readNumber(meta.total_items, meta.totalItems, meta.total, payload.total_items, payload.total) ?? itemCount;
  const totalPages =
    readNumber(meta.total_pages, meta.totalPages, payload.total_pages) ??
    (totalItems === 0 ? 0 : Math.ceil(totalItems / limit));

  return {
    page: readNumber(meta.page, payload.page) ?? page,
    limit: readNumber(meta.limit, payload.limit) ?? limit,
    totalItems,
    totalPages,
  };
}

function readCollection(payload: unknown, page: number, limit: number): { items: unknown[]; meta: PaginationMeta } {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      meta: {
        page,
        limit,
        totalItems: payload.length,
        totalPages: payload.length === 0 ? 0 : 1,
      },
    };
  }

  const record = unwrapPayload(payload);
  const items = asArray(record.data);
  return { items, meta: readMeta(record, page, limit, items.length) };
}

function appendParam(params: URLSearchParams, key: string, value?: string | number): void {
  if (value === undefined || value === null) return;
  const text = String(value).trim();
  if (!text) return;
  params.set(key, text);
}

function withPaging(params: URLSearchParams, page?: number, limit?: number): void {
  appendParam(params, 'page', page ?? 1);
  appendParam(params, 'limit', limit ?? CUSTOMER_LIST_PAGE_SIZE);
}

function resolveAssetUrl(url?: string): string | undefined {
  const rawValue = url?.trim();
  if (!rawValue) return undefined;
  const normalized = rawValue.replace(/\\/g, '/');
  if (/^https?:\/\//i.test(normalized)) return normalized;
  try {
    const origin = new URL(API_BASE_URL).origin;
    if (normalized.startsWith('/')) return `${origin}${normalized}`;
  } catch {
    return undefined;
  }
  return undefined;
}

function cacheKey(prefix: string, query: object): string {
  return `${prefix}:${JSON.stringify(query)}`;
}

function normalizeInsurerKey(name: string) {
  return name.trim().toLowerCase();
}

async function getInsurerLogoLookup(): Promise<QuoteInsurerOption[]> {
  try {
    return await getCachedOrFetch('insurers:active', false, () => getActiveQuoteInsurers());
  } catch {
    return [];
  }
}

function applyInsurerLogo(
  policy: CustomerPolicyRecord,
  insurers: QuoteInsurerOption[],
): CustomerPolicyRecord {
  if (policy.logoUrl) return policy;
  const key = normalizeInsurerKey(policy.insurerName);
  if (!key) return policy;
  const matched = insurers.find((company) => normalizeInsurerKey(company.name) === key);
  if (!matched) return policy;
  return {
    ...policy,
    logoUrl: matched.logoUrl || resolveAssetUrl(`/api/companies/${matched.id}/logo`),
  };
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

export async function listCustomerQuotes(
  query: CustomerQuoteListQuery = {},
  options?: { bypassCache?: boolean },
): Promise<PaginatedResult<CustomerQuoteRecord>> {
  assertApiConfigured();
  const page = query.page ?? 1;
  const limit = query.limit ?? CUSTOMER_LIST_PAGE_SIZE;
  const params = new URLSearchParams();
  withPaging(params, page, limit);
  appendParam(params, 'search', query.search);
  appendParam(params, 'coverType', query.coverType);
  appendParam(params, 'fromDate', query.fromDate);
  appendParam(params, 'toDate', query.toDate);
  appendParam(params, 'sort', query.sort ?? 'createdAt:desc');
  if (query.status?.length) {
    appendParam(params, 'status', query.status.join(','));
  }

  return getCachedOrFetch(cacheKey('quotes', { ...query, page, limit }), Boolean(options?.bypassCache), async () => {
    const { data } = await apiClient.get(`/customer/quotes?${params.toString()}`);
    const collection = readCollection(data, page, limit);
    return {
      data: collection.items.map(mapQuote),
      meta: collection.meta,
    };
  });
}

export async function getCustomerQuote(quoteId: string): Promise<CustomerQuoteDetail> {
  assertApiConfigured();
  const { data } = await apiClient.get(`/customer/quotes/${quoteId}`);
  const record = asRecord(data);
  const nested = asRecord(record.data);
  return mapQuoteDetail(nested.quoteId || nested.id ? nested : record);
}

export async function claimCustomerQuote(quoteId: string): Promise<{ quoteId: string }> {
  assertApiConfigured();
  const { data } = await apiClient.post(`/customer/quotes/${quoteId}/claim`);
  const record = asRecord(data);
  const nested = asRecord(record.data);
  const source = nested.quoteId || nested.id ? nested : record;
  return { quoteId: readString(source.quoteId, source.id) || quoteId };
}

export async function getQuotePurchaseSummary(quoteId: string): Promise<QuotePurchaseSummary> {
  assertApiConfigured();
  const { data } = await apiClient.get(`/customer/quotes/${quoteId}/purchase-summary`);
  const record = asRecord(data);
  const nested = asRecord(record.data);
  const source = nested.selectedQuote || nested.quoteId || nested.id ? nested : record;
  const selected = asRecord(source.selectedQuote);
  const quoteSource = selected.quoteId || selected.id ? selected : source;
  const wording = mapProductDocument(
    source.policyWordingDocument,
    asRecord(asRecord(source.documentAvailability).policyWordingDocument),
    'POLICY_WORDING',
  );
  const keyFacts = mapProductDocument(
    source.keyFactStatementDocument,
    asRecord(asRecord(source.documentAvailability).keyFactStatementDocument),
    'KEY_FACT_STATEMENT',
  );
  const required = asArray(source.requiredDocuments)
    .map((item) => mapProductDocument(item))
    .filter((item): item is QuoteProductDocument => Boolean(item));

  return {
    quote: mapQuoteDetail(quoteSource),
    policyWording:
      wording || required.find((item) => (item.documentType || '').toUpperCase().includes('POLICY_WORDING')),
    keyFacts:
      keyFacts ||
      required.find((item) => {
        const type = (item.documentType || '').toUpperCase();
        return type.includes('KEY_FACT') || type.includes('KEY_FACTS');
      }),
    documentConsentRequired: source.documentConsentRequired !== false,
    paymentAllowed: source.paymentAllowed !== false,
    reason: readString(source.reason) || undefined,
    missingDocumentTypes: asArray(source.missingDocumentTypes)
      .map((item) => String(item).trim())
      .filter(Boolean),
  };
}

export async function getCustomerPaymentSettings(): Promise<CustomerPaymentSettings> {
  assertApiConfigured();
  const { data } = await apiClient.get('/customer/payment-settings');
  const record = asRecord(data);
  const nested = asRecord(record.data);
  const source = { ...record, ...nested };
  const percents = collectServiceChargePercents(source, {});
  const settings = {
    mobileMoneyEnabled: source.enableMobileMoneyPayment !== false && source.mobileMoneyPaymentEnabled !== false,
    cardEnabled: source.enableCardPayment !== false && source.cardPaymentEnabled !== false,
    mobileMoneyServiceChargePercent:
      percents.mobileMoney ??
      parsePercentValue(source.mobileMoneyServiceChargePercent) ??
      parsePercentValue(source.mobile_money_service_charge_percent) ??
      0,
    cardServiceChargePercent:
      percents.card ??
      parsePercentValue(source.cardServiceChargePercent) ??
      parsePercentValue(source.card_service_charge_percent) ??
      0,
  };
  if (__DEV__) {
    console.log('[payment-settings]', {
      keys: Object.keys(source),
      mobileMoneyEnabled: settings.mobileMoneyEnabled,
      cardEnabled: settings.cardEnabled,
      mobileMoneyServiceChargePercent: settings.mobileMoneyServiceChargePercent,
      cardServiceChargePercent: settings.cardServiceChargePercent,
    });
  }
  return settings;
}

function mapProductDocument(
  item: unknown,
  nested?: Record<string, unknown>,
  fallbackType?: string,
): QuoteProductDocument | undefined {
  const record = asRecord(item);
  const source = record.id ? record : asRecord(nested);
  const id = readString(source.id);
  if (!id) return undefined;
  return {
    id,
    title: readString(source.title, source.fileName, source.name) || 'Document',
    fileName: readString(source.fileName, source.originalFileName, source.name) || `${id}.pdf`,
    documentType: readString(source.documentType, fallbackType) || undefined,
  };
}

export async function listCustomerPolicies(
  query: CustomerPolicyListQuery = {},
  options?: { bypassCache?: boolean },
): Promise<PaginatedResult<CustomerPolicyRecord>> {
  assertApiConfigured();
  const page = query.page ?? 1;
  const limit = query.limit ?? CUSTOMER_LIST_PAGE_SIZE;
  const params = new URLSearchParams();
  withPaging(params, page, limit);
  appendParam(params, 'search', query.search);
  appendParam(params, 'coverType', query.coverType);
  appendParam(params, 'fromDate', query.fromDate);
  appendParam(params, 'toDate', query.toDate);

  return getCachedOrFetch(cacheKey('policies', { ...query, page, limit }), Boolean(options?.bypassCache), async () => {
    const [{ data }, insurers] = await Promise.all([
      apiClient.get(`/customer/policies?${params.toString()}`),
      getInsurerLogoLookup(),
    ]);
    const collection = readCollection(data, page, limit);
    return {
      data: collection.items.map((item) => applyInsurerLogo(mapPolicy(item), insurers)),
      meta: collection.meta,
    };
  });
}

export async function getCustomerPolicy(policyId: string): Promise<CustomerPolicyDetail> {
  assertApiConfigured();
  const { data } = await apiClient.get(`/customer/policies/${policyId}`);
  const record = asRecord(data);
  const nested = asRecord(record.data);
  const source = nested.policyId || nested.id ? nested : record;
  const nestedInsurer = asRecord(source.insurer);
  const mapped = mapPolicy(source);
  const policy = applyInsurerLogo(
    {
      ...mapped,
      logoUrl:
        mapped.logoUrl ||
        resolveAssetUrl(readString(nestedInsurer.logoUrl, nestedInsurer.logo_url)) ||
        (readString(nestedInsurer.id)
          ? resolveAssetUrl(`/api/companies/${readString(nestedInsurer.id)}/logo`)
          : undefined),
    },
    await getInsurerLogoLookup(),
  );
  const documentsFromDetail = collectPolicyDocuments(source, policy.id);
  let documents = documentsFromDetail;

  try {
    const listed = await listCustomerPolicyDocuments(policy.id);
    documents = mergeIssuedDocuments(listed, documentsFromDetail);
  } catch {
    documents = documentsFromDetail;
  }

  return {
    ...policy,
    currency: readString(source.currency, asRecord(source.premiumBreakdown).currencyCode) || 'ZMW',
    premiumPaid: readString(source.premiumPaid, source.premium_paid) || undefined,
    totalPremium: readString(source.totalPremium, source.total_premium) || undefined,
    paymentStatus: readString(source.paymentStatus, source.payment_status) || undefined,
    documents,
  };
}

export async function listCustomerPolicyDocuments(policyId: string): Promise<CustomerPolicyDocument[]> {
  assertApiConfigured();
  const { data } = await apiClient.get(`/customer/policies/${policyId}/documents`);
  const items = Array.isArray(data) ? data : asArray(asRecord(data).data);
  return items
    .map((item) => mapPolicyDocument(item, policyId, 'policy'))
    .filter((document): document is CustomerPolicyDocument => Boolean(document));
}

export async function listCustomerTransactions(
  query: CustomerTransactionListQuery = {},
  options?: { bypassCache?: boolean },
): Promise<PaginatedResult<CustomerPaymentRecord>> {
  assertApiConfigured();
  const page = query.page ?? 1;
  const limit = query.limit ?? CUSTOMER_LIST_PAGE_SIZE;
  const params = new URLSearchParams();
  withPaging(params, page, limit);
  appendParam(params, 'search', query.search);
  appendParam(params, 'coverType', query.coverType);
  appendParam(params, 'fromDate', query.fromDate);
  appendParam(params, 'toDate', query.toDate);

  return getCachedOrFetch(
    cacheKey('transactions', { ...query, page, limit }),
    Boolean(options?.bypassCache),
    async () => {
      const { data } = await apiClient.get(`/customer/transactions?${params.toString()}`);
      const collection = readCollection(data, page, limit);
      return {
        data: collection.items.map(mapPayment),
        meta: collection.meta,
      };
    },
  );
}

export async function getCustomerPayment(transactionId: string): Promise<CustomerPaymentDetail> {
  assertApiConfigured();
  const { data } = await apiClient.get(`/customer/payments/${transactionId}`);
  const record = asRecord(data);
  const nested = asRecord(record.data);
  const source = nested.transactionId || nested.id ? nested : record;
  const payment = mapPayment(source);
  const breakdown = asRecord(source.premiumBreakdown);

  return {
    ...payment,
    coverType: readString(source.coverType, source.cover_type) || payment.coverType,
    serviceCharge: readNumber(source.serviceCharge, source.service_charge, breakdown.serviceFee),
    processingFee: readNumber(
      source.processingFee,
      source.processing_fee,
      source.paymentProcessingFee,
      breakdown.paymentFee,
    ),
    feeAmount: readNumber(source.feeAmount, source.fee_amount),
    insurancePremium: readNumber(source.insurancePremium, breakdown.insurancePremium),
    totalPayable: readNumber(source.totalPayable, breakdown.totalPayable, breakdown.finalPayableAmount),
  };
}

export function invalidateCustomerLists(kind?: 'quotes' | 'policies' | 'transactions'): void {
  if (!kind) {
    invalidateCustomerPortalCache();
    return;
  }
  invalidateCustomerPortalCache(kind);
}

function mapQuote(item: unknown): CustomerQuoteRecord {
  const record = asRecord(item);
  const vehicle = asRecord(record.vehicle);
  const product = asRecord(record.product);
  const insurer = asRecord(record.insurer);
  const breakdown = asRecord(record.premiumBreakdown);
  const id = readString(record.quoteId, record.quote_id, record.id);
  const paymentStatus = readString(record.paymentStatus, record.payment_status);
  const backendQuoteStatus = readString(record.quoteStatus, record.status);
  const premium = readNumber(
    breakdown.insurancePremium,
    record.insurancePremium,
    record.totalPayable,
    breakdown.totalPayable,
    breakdown.finalPayableAmount,
    record.totalPremium,
    record.premiumAmount,
  );

  return {
    id,
    quoteReference: readString(record.quoteReference, record.quote_number, record.quoteNumber) || id,
    quoteRequestId: readString(record.quoteRequestId, record.quote_request_id) || undefined,
    vehicleRegistrationNumber: readString(
      record.vehicleRegistrationNumber,
      vehicle.registrationNumber,
      vehicle.plate_number,
    ),
    vehicleMake: readString(vehicle.make, record.vehicleMake) || undefined,
    vehicleModel: readString(vehicle.model, record.vehicleModel) || undefined,
    vehicleYear: readString(vehicle.year, record.vehicleYear) || undefined,
    vehicleUse: readString(record.policyType, product.policyType, record.productGroupLabel) || undefined,
    coverType: readString(record.coverType, product.coverType, record.coverTypeSummary),
    insurerName: readString(record.insurerName, insurer.name) || 'Insurer',
    logoUrl:
      resolveAssetUrl(readString(insurer.logoUrl, insurer.logo_url, record.logoUrl)) ||
      (readString(insurer.id)
        ? resolveAssetUrl(`/api/companies/${readString(insurer.id)}/logo`)
        : undefined),
    policyProductType: readString(record.policyType, product.policyType, record.productGroupLabel) || undefined,
    quoteStatus: mapQuoteStatusLabel(
      backendQuoteStatus,
      paymentStatus,
      readString(record.supersededByPolicyId) || undefined,
      readString(record.supersededReason) || undefined,
      readString(record.reason) || undefined,
    ),
    backendQuoteStatus,
    paymentStatus,
    createdDate: readString(record.createdDate, record.created_at),
    validUntil: readString(record.validUntil, record.expiryDate, record.valid_until) || undefined,
    premium,
    totalPayable: readNumber(record.totalPayable, breakdown.totalPayable, breakdown.finalPayableAmount),
    currency: readString(record.currency, record.currencyCode) || 'ZMW',
    policyDuration: readString(record.policyDuration, record.policy_duration) || undefined,
    startDate: readString(record.startDate, record.start_date) || undefined,
    endDate: readString(record.endDate, record.end_date, record.validUntil) || undefined,
    policyId: readString(record.policyId, record.policy_id) || undefined,
  };
}

function mapQuoteDetail(item: unknown): CustomerQuoteDetail {
  const record = asRecord(item);
  const mapped = mapQuote(record);
  const breakdown = asRecord(record.premiumBreakdown);
  const benefits = asArray(record.benefits)
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean);

  return {
    ...mapped,
    productName: readString(record.productName, asRecord(record.product).name) || undefined,
    policyDurationLabel: readString(record.policyDuration, mapped.policyDuration) || undefined,
    benefits,
    premiumBreakdown: Object.keys(breakdown).length
      ? {
          insurancePremium: readNumber(breakdown.insurancePremium),
          basePremium: readNumber(breakdown.basePremium),
          insurerDiscountAmount: readNumber(breakdown.insurerDiscountAmount),
          promotionDiscountAmount: readNumber(
            breakdown.policyHubPromotion,
            breakdown.promotionDiscountAmount,
          ),
          discountAmount: readNumber(breakdown.discountAmount),
          levyAmount: readNumber(breakdown.levyAmount, breakdown.levy),
          levyPercentage: readNumber(breakdown.levyPercentage, breakdown.levyRate),
          serviceFee: readNumber(breakdown.serviceFee),
          paymentFee: readNumber(breakdown.paymentFee, breakdown.paymentProcessingFee),
          totalPayable: readNumber(
            breakdown.totalPayable,
            breakdown.finalPayableAmount,
            breakdown.totalCustomerPayable,
          ),
        }
      : undefined,
  };
}

function mapPolicy(item: unknown): CustomerPolicyRecord {
  const record = asRecord(item);
  const vehicle = asRecord(record.vehicle);
  const insurer = asRecord(record.insurer);
  const id = readString(record.policyId, record.policy_id, record.id);
  const expiryDate = readString(record.expiryDate, record.expiry_date, record.endDate);
  const startDate = readString(record.startDate, record.start_date);
  const backendStatus = readString(record.status);
  const insurerId = readString(insurer.id, record.insuranceCompanyId);
  const logoPath = readString(insurer.logoUrl, insurer.logo_url, record.logoUrl);

  return {
    id,
    policyNumber: readString(record.policyNumber, record.policy_number) || id,
    insurerName: readString(record.insurerName, insurer.name) || 'Insurer',
    logoUrl: resolveAssetUrl(logoPath) || (insurerId ? resolveAssetUrl(`/api/companies/${insurerId}/logo`) : undefined),
    vehicleId:
      readString(record.vehicleId, record.vehicle_id, vehicle.id, vehicle.vehicleId) || undefined,
    vehicleRegistrationNumber: readString(
      record.vehicleRegistrationNumber,
      vehicle.registrationNumber,
      vehicle.plate_number,
    ),
    vehicleDetails:
      readString(record.vehicleDetails) ||
      [readString(vehicle.make), readString(vehicle.model), readString(vehicle.year)].filter(Boolean).join(' ') ||
      undefined,
    coverType: readString(record.coverType, record.coverTypeSummary, record.cover_type),
    policyProductType: readString(record.policyType, record.productGroupLabel) || undefined,
    startDate,
    expiryDate,
    backendStatus,
    displayStatus: policyDisplayStatus(backendStatus, expiryDate),
    premiumPaid: readString(record.premiumPaid, record.premium_paid) || undefined,
    currency: readString(record.currency) || undefined,
  };
}

function mapPolicyDocument(
  item: unknown,
  policyId: string,
  source: 'policy' | 'insurer',
): CustomerPolicyDocument | null {
  const record = asRecord(item);
  const id = readString(record.id, record.documentId);
  if (!id) return null;
  const type = readString(record.documentType, record.type, record.document_type);
  const name = readString(record.title, record.name);
  const fileName = readString(record.fileName, record.file_name);
  const downloadUrl = toClientApiPath(readString(record.downloadUrl, record.fileUrl, record.download_url));
  const fallbackPath =
    source === 'insurer'
      ? `/customer/policies/${policyId}/insurer-documents/${id}/download`
      : `/customer/policies/${policyId}/documents/${id}/download`;

  const nestedCover = asRecord(record.coverType);
  const nestedGroup = asRecord(record.documentGroup);

  return {
    id,
    name: documentDisplayName({ type, name, fileName }),
    type,
    fileName,
    mimeType: readString(record.mimeType, record.mime_type) || undefined,
    source,
    kind: documentKind({ type, name, fileName }),
    downloadPath: downloadUrl || fallbackPath,
    productId: readString(record.productId, record.product_id) || undefined,
    documentGroup: readString(record.documentGroup, record.document_group, nestedGroup.code) || undefined,
    coverageType:
      readString(record.coverageType, record.coverage_type, nestedCover.code, nestedCover.name) || undefined,
    policyProductType: readString(record.policyProductType, record.policyType, record.policy_product_type) || undefined,
    uploadedAt: readString(record.uploadedAt, record.createdAt, record.created_at) || undefined,
  };
}

function isProductDocument(document: CustomerPolicyDocument) {
  return document.kind === 'policy-wording' || document.kind === 'key-facts';
}

function selectBestProductDocument(
  documents: CustomerPolicyDocument[],
  kind: 'policy-wording' | 'key-facts',
  context: {
    productId?: string;
    coverType?: string;
    documentGroup?: string;
    policyType?: string;
  },
) {
  const typed = documents.filter((document) => document.kind === kind);
  if (typed.length === 0) return undefined;

  const normalizedCover = (context.coverType || '').replace(/[\s-]+/g, '_').toUpperCase();
  const normalizedGroup = (context.documentGroup || '').replace(/[\s-]+/g, '_').toUpperCase();
  const normalizedPolicyType = (context.policyType || '').replace(/[\s-]+/g, '_').toUpperCase();

  const scored = typed
    .map((document) => {
      const documentGroup = (document.documentGroup || '').replace(/[\s-]+/g, '_').toUpperCase();
      const coverageType = (document.coverageType || '').replace(/[\s-]+/g, '_').toUpperCase();
      const policyProductType = (document.policyProductType || '').replace(/[\s-]+/g, '_').toUpperCase();
      const productMatch = Boolean(context.productId && document.productId === context.productId);
      const groupMatch = Boolean(normalizedGroup && documentGroup === normalizedGroup);
      const coverMatch = Boolean(normalizedCover && coverageType === normalizedCover);
      const policyTypeMatch = Boolean(normalizedPolicyType && policyProductType === normalizedPolicyType);
      const uploadedAt = document.uploadedAt ? new Date(document.uploadedAt).getTime() : 0;
      const score =
        (productMatch ? 8 : 0) +
        (groupMatch ? 4 : 0) +
        (coverMatch ? 2 : 0) +
        (policyTypeMatch ? 1 : 0);
      return { document, score, uploadedAt };
    })
    .sort((left, right) => right.score - left.score || right.uploadedAt - left.uploadedAt);

  return scored[0]?.document;
}

function collectPolicyDocuments(source: Record<string, unknown>, policyId: string): CustomerPolicyDocument[] {
  const product = asRecord(source.product);
  const context = {
    productId: readString(source.productId, source.product_id, product.id) || undefined,
    coverType: readString(source.coverType, source.cover_type) || undefined,
    documentGroup: readString(source.productGroup, source.documentGroup, source.product_group) || undefined,
    policyType: readString(source.policyType, source.policy_type) || undefined,
  };

  const issued = asArray(source.documents)
    .map((item) => mapPolicyDocument(item, policyId, 'policy'))
    .filter((document): document is CustomerPolicyDocument => Boolean(document))
    .filter((document) => !isProductDocument(document));

  const insurerDocs = asArray(source.insurerDocuments)
    .map((item) => mapPolicyDocument(item, policyId, 'insurer'))
    .filter((document): document is CustomerPolicyDocument => Boolean(document));

  const wording = selectBestProductDocument(insurerDocs, 'policy-wording', context);
  const keyFacts = selectBestProductDocument(insurerDocs, 'key-facts', context);

  return uniqueDocuments([...issued, wording, keyFacts].filter((document): document is CustomerPolicyDocument =>
    Boolean(document),
  ));
}

function mergeIssuedDocuments(
  listed: CustomerPolicyDocument[],
  fromDetail: CustomerPolicyDocument[],
): CustomerPolicyDocument[] {
  const issued = listed.filter((document) => !isProductDocument(document));
  const productDocs = fromDetail.filter(isProductDocument);
  return uniqueDocuments([...issued, ...fromDetail.filter((document) => !isProductDocument(document)), ...productDocs]);
}

function uniqueDocuments(documents: CustomerPolicyDocument[]): CustomerPolicyDocument[] {
  const byId = new Map<string, CustomerPolicyDocument>();
  for (const document of documents) {
    byId.set(document.id, document);
  }

  const productKinds = new Set<'policy-wording' | 'key-facts'>();
  const result: CustomerPolicyDocument[] = [];
  for (const document of byId.values()) {
    if (document.kind === 'policy-wording' || document.kind === 'key-facts') {
      if (productKinds.has(document.kind)) continue;
      productKinds.add(document.kind);
    }
    result.push(document);
  }
  return result;
}

function mapPayment(item: unknown): CustomerPaymentRecord {
  const record = asRecord(item);
  return {
    transactionId: readString(record.transactionId, record.transaction_id, record.id),
    quoteId: readString(record.quoteId, record.quote_id) || undefined,
    quoteReference: readString(record.quoteReference, record.quote_reference) || undefined,
    vehicleRegistrationNumber:
      readString(record.vehicleRegistrationNumber, record.vehicle_registration_number) || undefined,
    policyId: readString(record.policyId, record.policy_id) || undefined,
    policyNumber: readString(record.policyNumber, record.policy_number) || undefined,
    amount: readNumber(record.amount, record.amountPaid, record.amount_paid),
    currencyCode: readString(record.currencyCode, record.currency_code, record.currency) || 'ZMW',
    status: readString(record.status) || 'PENDING',
    paymentMethod: readString(record.paymentMethod, record.payment_method) || undefined,
    paymentReference: readString(record.paymentReference, record.payment_reference) || undefined,
    externalPaymentReference:
      readString(record.externalPaymentReference, record.external_reference) || undefined,
    createdDate: readString(record.createdDate, record.created_at, record.paidAt) || undefined,
    coverType: readString(record.coverType) || undefined,
  };
}
