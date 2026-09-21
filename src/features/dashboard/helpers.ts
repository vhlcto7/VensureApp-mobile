import { formatDisplayDate, formatQuoteCurrency } from '../quote/helpers';
import type { CustomerDashboardPolicy, CustomerPolicyStatus } from './types';

export function getTimeOfDayGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getGreetingName(fullName?: string) {
  const trimmed = fullName?.trim() ?? '';
  if (!trimmed) return 'there';
  return trimmed.split(/\s+/)[0] || trimmed;
}

export function getInitials(fullName?: string) {
  const parts = (fullName?.trim() || '').split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'C';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

export function daysUntil(value?: string) {
  if (!value) return Number.NaN;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const end = new Date(value.includes('T') ? value : `${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(end.getTime())) return Number.NaN;
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - now.getTime()) / 86400000);
}

export function mapPolicyStatus(status: string | undefined, expiryDate: string): CustomerPolicyStatus {
  const normalizedStatus = status?.toUpperCase();

  if (normalizedStatus === 'EXPIRED') return 'Expired';
  if (normalizedStatus === 'CANCELLED') return 'Expired';

  const remaining = daysUntil(expiryDate);
  if (!Number.isFinite(remaining)) return 'Active';
  if (remaining < 0) return 'Expired';
  if (remaining <= 30) return 'Expiring Soon';
  return 'Active';
}

export function formatCoverType(value?: string) {
  if (!value?.trim()) return '';
  return value
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatDaysRemaining(daysRemaining: number) {
  if (daysRemaining <= 0) return 'Due today';
  if (daysRemaining === 1) return '1 day left';
  return `${daysRemaining} days left`;
}

export function formatRenewalDue(daysRemaining: number) {
  if (daysRemaining <= 0) return 'Renewal due today';
  if (daysRemaining === 1) return 'Renewal due in 1 day';
  return `Renewal due in ${daysRemaining} days`;
}

export function shortenReference(value?: string, head = 10, tail = 4) {
  const text = value?.trim() || '';
  if (!text) return '';
  if (text.length <= head + tail + 1) return text;
  return `${text.slice(0, head)}…${text.slice(-tail)}`;
}

export function formatPolicyDate(value?: string) {
  return formatDisplayDate(value);
}

export function formatMoney(amount: unknown, currency = 'ZMW') {
  return formatQuoteCurrency(amount, currency);
}

export function pickFeaturedPolicy(policies: CustomerDashboardPolicy[]) {
  const withExpiry = policies
    .filter((policy) => policy.backendStatus.toUpperCase() === 'ACTIVE' || policy.status !== 'Expired')
    .map((policy) => ({ policy, daysRemaining: daysUntil(policy.expiryDate) }))
    .filter(({ daysRemaining }) => Number.isFinite(daysRemaining) && daysRemaining >= 0)
    .sort((left, right) => left.daysRemaining - right.daysRemaining);

  if (withExpiry.length > 0) {
    return withExpiry[0];
  }

  const first = policies[0];
  if (!first) return undefined;
  return { policy: first, daysRemaining: daysUntil(first.expiryDate) };
}

export function formatPaymentStatus(status?: string) {
  switch ((status ?? '').toUpperCase()) {
    case 'SUCCESS':
    case 'PAID':
      return 'Paid';
    case 'PENDING':
      return 'Pending';
    case 'MANUAL_REVIEW':
      return 'Manual review';
    case 'FAILED':
      return 'Failed';
    case 'EXPIRED':
      return 'Expired';
    case 'CANCELLED':
      return 'Cancelled';
    case 'REVERSED':
      return 'Reversed';
    default:
      return status || '';
  }
}
