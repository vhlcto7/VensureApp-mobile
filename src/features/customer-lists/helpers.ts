import { daysUntil, formatCoverType, mapPolicyStatus } from '../dashboard/helpers';
import type { CustomerPolicyStatus } from '../dashboard/types';
import { formatDisplayDate, getTodayDateString, toFiniteNumber, toIsoDateString } from '../quote/helpers';

export function displayText(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value.trim() || fallback;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return fallback;
}

export function formatCustomerMoney(amount: unknown, currency = 'ZMW'): string {
  const parsed = toFiniteNumber(amount);
  if (parsed === undefined) return '';
  const formatted = parsed.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency} ${formatted}`;
}

export function formatCustomerDate(value?: string): string {
  return formatDisplayDate(value);
}

export function formatCustomerDateTime(value?: string): string {
  if (!value?.trim()) return '';
  const parsed = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return formatDisplayDate(value);
  const date = formatDisplayDate(value);
  if (!date) return '';
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');
  return `${date} ${hours}:${minutes}`;
}

export function isIsoDateInput(value: string): boolean {
  const iso = toIsoDateString(value);
  return Boolean(iso) && iso === value.trim();
}

export function daysAgoIso(days: number, from = new Date()): string {
  const date = new Date(from);
  date.setDate(date.getDate() - days);
  return getTodayDateString(date);
}

export function formatEnumLabel(value?: string): string {
  return formatCoverType(value);
}

export function vehicleMakeModel(make?: string, model?: string, year?: string): string {
  return [make, model, year].map((part) => displayText(part)).filter(Boolean).join(' ');
}

export function joinMeta(parts: Array<string | undefined>): string {
  return parts.map((part) => displayText(part)).filter(Boolean).join(' · ');
}

export function mapQuoteStatusLabel(
  status: string | undefined,
  paymentStatus: string | undefined,
  supersededByPolicyId?: string,
  supersededReason?: string,
  reason?: string,
): string {
  const normalizedStatus = status?.trim().toUpperCase();
  const normalizedReason = reason?.trim().toUpperCase();
  const normalizedPayment = paymentStatus?.trim().toUpperCase();

  if (
    normalizedStatus === 'SUPERSEDED' ||
    normalizedStatus === 'PURCHASED' ||
    supersededByPolicyId ||
    supersededReason
  ) {
    return 'Superseded';
  }
  if (normalizedReason === 'POLICY_ALREADY_ISSUED') return 'Policy Issued';
  if (normalizedStatus === 'ACCEPTED' || normalizedPayment === 'SUCCESS' || normalizedPayment === 'PAID') {
    return 'Policy Issued';
  }
  if (normalizedStatus === 'REJECTED' || normalizedStatus === 'CANCELLED') return 'Cancelled';
  if (normalizedStatus === 'EXPIRED') return 'Expired';
  if (normalizedStatus === 'DRAFT') return 'Draft';
  if (normalizedStatus === 'GENERATED' || normalizedStatus === 'PENDING') return 'Pending Payment';
  return formatEnumLabel(status) || 'Pending Payment';
}

export function mapPaymentStatusLabel(status?: string): string {
  switch ((status ?? '').toUpperCase()) {
    case 'SUCCESS':
    case 'PAID':
      return 'Paid';
    case 'PENDING':
      return 'Pending';
    case 'MANUAL_REVIEW':
      return 'Manual Review';
    case 'FAILED':
      return 'Failed';
    case 'EXPIRED':
      return 'Expired';
    case 'CANCELLED':
      return 'Cancelled';
    case 'REVERSED':
      return 'Reversed';
    default:
      return formatEnumLabel(status);
  }
}

export function paymentChipGroup(status?: string): 'successful' | 'pending' | 'failed' | 'other' {
  const normalized = (status ?? '').toUpperCase();
  if (normalized === 'SUCCESS' || normalized === 'PAID') return 'successful';
  if (normalized === 'PENDING' || normalized === 'MANUAL_REVIEW') return 'pending';
  if (normalized === 'FAILED' || normalized === 'EXPIRED' || normalized === 'REVERSED' || normalized === 'CANCELLED') {
    return 'failed';
  }
  return 'other';
}

export function quoteStatusTone(label: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (label === 'Policy Issued' || label === 'Converted to Policy' || label === 'Paid') return 'success';
  if (label === 'Superseded' || label === 'No Longer Available') return 'neutral';
  if (label === 'Expired' || label === 'Cancelled') return 'danger';
  return 'warning';
}

export function policyStatusTone(status: CustomerPolicyStatus): 'success' | 'warning' | 'danger' {
  if (status === 'Active') return 'success';
  if (status === 'Expiring Soon') return 'warning';
  return 'danger';
}

export function paymentStatusTone(status?: string): 'success' | 'warning' | 'danger' | 'neutral' {
  const group = paymentChipGroup(status);
  if (group === 'successful') return 'success';
  if (group === 'failed') return 'danger';
  if (group === 'pending') return 'warning';
  return 'neutral';
}

export function policyDisplayStatus(backendStatus: string | undefined, expiryDate: string): CustomerPolicyStatus {
  return mapPolicyStatus(backendStatus, expiryDate);
}

export function policyDaysRemaining(expiryDate: string): number {
  return daysUntil(expiryDate);
}

export function quoteFilterStatusLabel(value: string): string {
  switch (value) {
    case 'DRAFT':
      return 'Draft';
    case 'PENDING_PAYMENT':
      return 'Pending Payment';
    case 'PENDING':
      return 'Pending';
    case 'GENERATED':
      return 'Generated';
    default:
      return formatEnumLabel(value);
  }
}

export function paymentMethodLabel(value?: string): string {
  return formatEnumLabel(value);
}

export function documentKind(input: { type?: string; name?: string; fileName?: string }) {
  const type = (input.type || '').trim().toUpperCase();
  if (type === 'POLICY_WORDING') return 'policy-wording' as const;
  if (type === 'KEY_FACT_STATEMENT' || type === 'KEY_FACTS_STATEMENT') return 'key-facts' as const;
  if (type === 'CERTIFICATE_OF_MOTOR_INSURANCE') return 'certificate' as const;
  if (type === 'COVER_NOTE') return 'cover-note' as const;
  if (type === 'DEBIT_NOTE') return 'invoice' as const;
  if (type === 'PAYMENT_RECEIPT') return 'receipt' as const;
  if (type === 'PRODUCT_BROCHURE') return 'other' as const;

  const haystack = `${input.type || ''} ${input.name || ''} ${input.fileName || ''}`.toLowerCase();
  if (
    haystack.includes('certificate_of_motor_insurance') ||
    haystack.includes('certificate of motor insurance') ||
    haystack.includes('certificate')
  ) {
    return 'certificate' as const;
  }
  if (haystack.includes('cover note') || haystack.includes('cover-note')) return 'cover-note' as const;
  if (haystack.includes('debit_note') || haystack.includes('debit note')) return 'invoice' as const;
  if (
    haystack.includes('payment_receipt') ||
    haystack.includes('payment receipt') ||
    haystack.includes('receipt')
  ) {
    return 'receipt' as const;
  }
  if (haystack.includes('policy wording') || haystack.includes('policy_wording')) {
    return 'policy-wording' as const;
  }
  if (
    haystack.includes('key facts') ||
    haystack.includes('key-facts') ||
    haystack.includes('key_facts') ||
    haystack.includes('keyfact')
  ) {
    return 'key-facts' as const;
  }
  return 'other' as const;
}

export function documentDisplayName(input: { type?: string; name?: string; fileName?: string }): string {
  const kind = documentKind(input);
  if (kind === 'invoice') return 'Debit Note';
  const type = (input.type || '').trim().toUpperCase();
  if (type === 'CERTIFICATE_OF_MOTOR_INSURANCE') return 'Certificate of Motor Insurance';
  if (type === 'DEBIT_NOTE') return 'Debit Note';
  if (type === 'PAYMENT_RECEIPT') return 'Payment Receipt';
  if (type === 'POLICY_WORDING') return 'Policy Wording';
  if (type === 'KEY_FACTS_STATEMENT') return 'Key Facts Statement';
  if (type === 'COVER_NOTE') return 'Cover Note';
  if (input.name?.trim()) return input.name.trim();
  if (input.fileName?.trim()) return input.fileName.trim();
  return formatEnumLabel(input.type) || 'Document';
}

export function documentPriority(kind: ReturnType<typeof documentKind>): number {
  if (kind === 'certificate') return 1;
  if (kind === 'cover-note') return 2;
  if (kind === 'invoice') return 3;
  if (kind === 'receipt') return 4;
  if (kind === 'policy-wording') return 5;
  if (kind === 'key-facts') return 6;
  return 7;
}

export function toClientApiPath(url?: string): string {
  const raw = url?.trim();
  if (!raw) return '';
  const withoutHost = raw.replace(/^https?:\/\/[^/]+/i, '');
  return withoutHost.replace(/^\/api(?=\/)/, '');
}
