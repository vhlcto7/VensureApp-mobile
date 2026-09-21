import { apiClient, assertApiConfigured } from '../api/client';

export type GeePayPaymentStatus =
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'REVERSED'
  | 'EXPIRED'
  | 'MANUAL_REVIEW';

export type GeePayCheckoutSession = {
  checkoutUrl: string;
  transactionRef: string;
  paymentId?: string;
  status: GeePayPaymentStatus;
  insuranceAmount?: number;
  serviceChargeAmount?: number;
  totalAmount?: number;
};

export type GeePayStatusResult = {
  transactionRef: string;
  quoteId?: string;
  paymentId?: string;
  status: GeePayPaymentStatus;
  rawStatus: string;
  confirmationStatus?: 'CONFIRMED' | 'NOT_CONFIRMED';
  policyId?: string;
  policyCreated?: boolean;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(...values: unknown[]): string {
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

export function normalizeGeePayStatus(value?: string): GeePayPaymentStatus {
  const normalized = (value || '').trim().toUpperCase();
  if (['SUCCESS', 'SUCCESSFUL', 'SUCCEEDED', 'PAID', 'COMPLETED'].includes(normalized)) {
    return 'SUCCESS';
  }
  if (['FAILED', 'FAIL', 'ERROR', 'CANCELLED', 'CANCELED', 'DECLINED'].includes(normalized)) {
    return 'FAILED';
  }
  if (normalized === 'REVERSED') return 'REVERSED';
  if (normalized === 'EXPIRED') return 'EXPIRED';
  if (normalized === 'MANUAL_REVIEW') return 'MANUAL_REVIEW';
  return 'PENDING';
}

function unwrap(payload: unknown): Record<string, unknown> {
  const record = asRecord(payload);
  const nested = asRecord(record.data);
  return nested.transactionRef || nested.checkoutUrl || nested.status || nested.id ? nested : record;
}

function mapStatusResult(payload: unknown, fallbackRef: string): GeePayStatusResult {
  const record = unwrap(payload);
  const confirmationRaw = readString(record.confirmationStatus, record.confirmation_status).toUpperCase();
  const confirmationStatus =
    confirmationRaw === 'CONFIRMED' || confirmationRaw === 'NOT_CONFIRMED'
      ? (confirmationRaw as 'CONFIRMED' | 'NOT_CONFIRMED')
      : undefined;
  const rawStatus = readString(
    record.paymentStatus,
    record.payment_status,
    record.status,
    'PENDING',
  );
  const status =
    confirmationStatus === 'NOT_CONFIRMED' && normalizeGeePayStatus(rawStatus) !== 'FAILED'
      ? 'PENDING'
      : normalizeGeePayStatus(rawStatus);

  return {
    transactionRef: readString(record.transactionRef, record.transaction_ref) || fallbackRef,
    quoteId: readString(record.quoteId, record.quote_id) || undefined,
    paymentId: readString(record.paymentId, record.payment_id) || undefined,
    status,
    rawStatus,
    confirmationStatus,
    policyId: readString(record.policyId, record.policy_id) || undefined,
    policyCreated: record.policyCreated === true,
  };
}

export async function createGeePayCheckoutSession(input: {
  quoteId: string;
  paymentMethod: 'MOBILE_MONEY' | 'CARD';
  documentAcknowledgement: boolean;
  acknowledgedDocumentIds: string[];
}): Promise<GeePayCheckoutSession> {
  assertApiConfigured();
  const { data } = await apiClient.post('/payments/geepay/checkout-session', input);
  const record = unwrap(data);
  const checkoutUrl = readString(record.checkoutUrl, record.checkout_url, record.url);
  const transactionRef = readString(
    record.transactionRef,
    record.transaction_ref,
    record.orderId,
    record.order_id,
  );
  if (!checkoutUrl || !transactionRef) {
    throw new Error('GeePay checkout session response was incomplete.');
  }

  if (__DEV__) {
    console.log('[geepay] checkout created', {
      paymentId: readString(record.paymentId, record.payment_id) || undefined,
      status: normalizeGeePayStatus(readString(record.status, 'PENDING')),
    });
  }

  return {
    checkoutUrl,
    transactionRef,
    paymentId: readString(record.paymentId, record.payment_id) || undefined,
    status: normalizeGeePayStatus(readString(record.status, 'PENDING')),
    insuranceAmount: readNumber(record.insuranceAmount, record.insurance_amount),
    serviceChargeAmount: readNumber(record.serviceChargeAmount, record.service_charge_amount),
    totalAmount: readNumber(record.totalAmount, record.total_amount),
  };
}

export async function getGeePayStatus(transactionRef: string): Promise<GeePayStatusResult> {
  assertApiConfigured();
  const { data } = await apiClient.get(`/payments/geepay/status/${encodeURIComponent(transactionRef)}`);
  const result = mapStatusResult(data, transactionRef);
  if (__DEV__) {
    console.log('[geepay] status', {
      paymentId: result.paymentId,
      status: result.status,
      policyId: result.policyId,
    });
  }
  return result;
}

export async function confirmGeePayReturn(transactionRef: string): Promise<GeePayStatusResult> {
  assertApiConfigured();
  const { data } = await apiClient.post('/payments/geepay/return/confirm', {
    transaction_reference: transactionRef,
  });
  const result = mapStatusResult(data, transactionRef);
  if (__DEV__) {
    console.log('[geepay] return confirm', {
      paymentId: result.paymentId,
      status: result.status,
      confirmationStatus: result.confirmationStatus,
      policyId: result.policyId,
    });
  }
  return result;
}
