import type { StatusTone } from '../customer-lists/StatusBadge';
import type {
  CustomerKycDocumentType,
  CustomerMobileChangeRequestStatus,
} from './types';

export function formatCustomerType(value?: string) {
  const normalized = (value || '').toUpperCase();
  if (normalized === 'BUSINESS' || normalized === 'CORPORATE') return 'Business';
  if (normalized === 'INDIVIDUAL') return 'Individual';
  return value?.trim() || 'Individual';
}

export function identityTypeLabel(customerType?: string) {
  const kind = formatCustomerType(customerType);
  return kind === 'Business' ? 'Certificate of Incorporation' : 'NRC / Passport';
}

export function kycDocumentTitle(type: CustomerKycDocumentType) {
  if (type === 'INCORPORATION_CERTIFICATE') return 'Certificate of Incorporation';
  if (type === 'DRIVING_LICENCE') return 'Driving Licence';
  return 'NRC / Passport';
}

export function kycDocumentHelper(type: CustomerKycDocumentType) {
  if (type === 'INCORPORATION_CERTIFICATE') {
    return 'Upload the company incorporation certificate for business/customer compliance.';
  }
  if (type === 'DRIVING_LICENCE') {
    return 'Optional driving licence for additional identity verification.';
  }
  return 'Government-issued identity document for individual customer verification.';
}

export function requiredKycTypes(customerType?: string): CustomerKycDocumentType[] {
  return formatCustomerType(customerType) === 'Business'
    ? ['INCORPORATION_CERTIFICATE']
    : ['NRC_OR_PASSPORT'];
}

export function missingKycMessage(customerType?: string) {
  return formatCustomerType(customerType) === 'Business'
    ? 'Please upload Certificate of Incorporation to complete business KYC.'
    : 'Please upload NRC or Passport to complete KYC.';
}

export function formatKycStatus(status?: string) {
  const normalized = (status || '').toUpperCase();
  if (normalized === 'SUBMITTED' || normalized === 'KYC SUBMITTED') return 'KYC Submitted';
  if (normalized === 'APPROVED') return 'Approved';
  if (normalized === 'REJECTED') return 'Rejected';
  if (normalized === 'PENDING_REVIEW') return 'Pending Review';
  return 'KYC Pending';
}

export function formatDocumentStatus(status?: string) {
  if (!status) return 'Not Uploaded';
  const normalized = status.toUpperCase().replace(/_/g, ' ');
  if (normalized === 'SUBMITTED') return 'KYC Submitted';
  if (normalized === 'PENDING') return 'Pending Review';
  if (normalized === 'APPROVED') return 'Approved';
  if (normalized === 'REJECTED') return 'Rejected';
  return formatKycStatus(status);
}

export function kycStatusTone(status: string): StatusTone {
  if (status === 'Approved' || status === 'KYC Submitted') return 'success';
  if (status === 'Rejected') return 'danger';
  return 'warning';
}

export function canDeleteKycDocument(status?: string) {
  return formatDocumentStatus(status) !== 'Approved';
}

export function formatMobileChangeStatus(status: CustomerMobileChangeRequestStatus) {
  if (status === 'PENDING_REVIEW') return 'Pending Review';
  if (status === 'PENDING_OTP') return 'Pending OTP';
  const text = String(status || '').replace(/_/g, ' ').toLowerCase();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : status;
}

export function mobileChangeStatusTone(status: CustomerMobileChangeRequestStatus): StatusTone {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'danger';
  if (status === 'CANCELLED') return 'neutral';
  return 'warning';
}

export function toNationalMobileDigits(value?: string) {
  const digits = (value || '').replace(/\D/g, '');
  let national = digits;
  if (national.startsWith('260')) national = national.slice(3);
  if (national.startsWith('0')) national = national.slice(1);
  return national;
}

export function formatFileSize(bytes?: number) {
  if (!bytes || bytes <= 0) return '';
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
