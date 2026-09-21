import { apiClient, assertApiConfigured } from '../api/client';
import { API_BASE_URL } from '../config/env';
import { formatCoverType, mapPolicyStatus } from '../features/dashboard/helpers';
import type {
  CustomerDashboardData,
  CustomerDashboardPolicy,
  CustomerDashboardQuote,
  CustomerDashboardTransaction,
} from '../features/dashboard/types';
import { getCustomerVehicleCount } from './vehicles';

export async function getCustomerDashboard(options?: {
  bypassCache?: boolean;
}): Promise<CustomerDashboardData> {
  assertApiConfigured();
  const { data } = await apiClient.get('/customer/dashboard');
  const record = unwrapRecord(data);
  const totalVehicles = await resolveDashboardVehicleCount(record, options?.bypassCache);

  return {
    customerName: readString(record.customerName, record.customer_name),
    activePolicies: readCount(record, ['activePolicies', 'activePoliciesCount']),
    expiringSoon: readCount(record, ['expiringSoon', 'expiringSoonPoliciesCount']),
    expiredPolicies: readCount(record, ['expiredPolicies', 'expiredPoliciesCount']),
    pendingQuotes: readCount(record, ['pendingQuotes', 'pendingQuotesCount']),
    pendingPayments: readCount(record, ['pendingPayments', 'pendingPaymentsCount']),
    totalVehicles,
    recentPolicies: asArray(record.recentPolicies).map(mapPolicy),
    recentQuotes: asArray(record.recentQuotes).map(mapQuote),
    pendingTransactions: asArray(record.pendingTransactions).map(mapTransaction),
    recentTransactions: asArray(record.recentTransactions).map(mapTransaction),
  };
}

async function resolveDashboardVehicleCount(
  record: Record<string, unknown>,
  bypassCache?: boolean,
): Promise<number | undefined> {
  const fromDashboard = readOptionalCount(record, [
    'totalVehicles',
    'totalVehiclesCount',
    'vehicleCount',
    'vehiclesCount',
  ]);
  if (fromDashboard !== undefined) return fromDashboard;

  try {
    return await getCustomerVehicleCount({ bypassCache });
  } catch {
    return undefined;
  }
}

function mapPolicy(item: unknown): CustomerDashboardPolicy {
  const record = asRecord(item);
  const nestedInsurer = asRecord(record.insurer);
  const nestedVehicle = asRecord(record.vehicle);
  const id = readString(record.policyId, record.policy_id, record.id);
  const expiryDate = readString(record.expiryDate, record.expiry_date);
  const backendStatus = readString(record.status);
  const insurerId = readString(nestedInsurer.id, record.insuranceCompanyId, record.insurance_company_id);
  const logoPath = readString(
    nestedInsurer.logoUrl,
    nestedInsurer.logo_url,
    record.logoUrl,
    record.logo_url,
  );

  return {
    id,
    policyNumber: readString(record.policyNumber, record.policy_number) || id,
    insurerName: readString(record.insurerName, record.insurer_name, nestedInsurer.name) || 'Insurer',
    logoUrl: resolveAssetUrl(logoPath) || (insurerId ? resolveAssetUrl(`/api/companies/${insurerId}/logo`) : undefined),
    vehicleId:
      readString(record.vehicleId, record.vehicle_id, nestedVehicle.id, nestedVehicle.vehicleId) ||
      undefined,
    vehicleRegistrationNumber: readString(
      record.vehicleRegistrationNumber,
      record.vehicle_registration_number,
      nestedVehicle.registrationNumber,
      nestedVehicle.plate_number,
    ),
    vehicleDetails: readString(record.vehicleDetails, record.vehicle_details) || undefined,
    coverType: formatCoverType(readString(record.coverType, record.cover_type, record.coverTypeSummary)),
    expiryDate,
    status: mapPolicyStatus(backendStatus, expiryDate),
    backendStatus,
  };
}

function mapQuote(item: unknown): CustomerDashboardQuote {
  const record = asRecord(item);
  const id = readString(record.quoteId, record.quote_id, record.id);
  const quoteStatus = readString(record.quoteStatus, record.quote_status, record.status);
  const normalizedStatus = quoteStatus.replace(/_/g, ' ').toLowerCase();
  const paymentStatus = readString(record.paymentStatus, record.payment_status);
  const isActionable =
    record.isActionable === true ||
    (record.isActionable !== false &&
      record.payable !== false &&
      (normalizedStatus === 'draft' || normalizedStatus === 'pending payment') &&
      paymentStatus.toUpperCase() !== 'SUCCESS' &&
      paymentStatus.toUpperCase() !== 'PAID');

  return {
    id,
    vehicleRegistrationNumber: readString(
      record.vehicleRegistrationNumber,
      record.vehicle_registration_number,
    ),
    insurerName: readString(record.insurerName, record.insurer_name) || 'Insurer',
    coverType: formatCoverType(readString(record.coverType, record.cover_type)) || undefined,
    totalPremium: readNumber(
      record.insurancePremium,
      record.totalPayable,
      record.totalPremium,
      record.premiumAmount,
      record.premium_amount,
    ),
    currency: readString(record.currency, record.currencyCode, record.currency_code) || 'ZMW',
    validUntil: readString(record.validUntil, record.valid_until, record.expiryDate) || undefined,
    quoteStatus: quoteStatus || undefined,
    isActionable,
  };
}

function mapTransaction(item: unknown): CustomerDashboardTransaction {
  const record = asRecord(item);
  return {
    transactionId: readString(record.transactionId, record.transaction_id, record.id),
    quoteReference: readString(record.quoteReference, record.quote_reference) || undefined,
    vehicleRegistrationNumber:
      readString(record.vehicleRegistrationNumber, record.vehicle_registration_number) || undefined,
    policyNumber: readString(record.policyNumber, record.policy_number) || undefined,
    amount: readNumber(record.amount),
    currencyCode: readString(record.currencyCode, record.currency_code, record.currency) || 'ZMW',
    status: readString(record.status) || 'PENDING',
    createdDate: readString(record.createdDate, record.created_date, record.created_at) || undefined,
  };
}

function unwrapRecord(value: unknown): Record<string, unknown> {
  const record = asRecord(value);
  const nested = asRecord(record.data);
  return nested && (nested.customerName || nested.activePolicies !== undefined) ? nested : record;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
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
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value.replace(/,/g, ''));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function readCount(record: Record<string, unknown>, keys: string[]) {
  return readOptionalCount(record, keys) ?? 0;
}

function readOptionalCount(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = readNumber(record[key]);
    if (value !== undefined) return value;
  }
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
  } catch {
    return undefined;
  }
  return undefined;
}
