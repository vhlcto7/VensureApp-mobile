import { apiClient, assertApiConfigured } from '../api/client';
import { normalizeMobileForApi } from '../utils/phone';
import type {
  CustomerKycDocument,
  CustomerKycDocumentType,
  CustomerKycSummary,
  CustomerMobileChangeRequest,
  CustomerProfileRecord,
  SelectedKycFile,
} from '../features/profile/types';

export async function getCustomerProfile(): Promise<CustomerProfileRecord> {
  assertApiConfigured();
  const { data } = await apiClient.get('/customer/profile');
  const record = unwrapRecord(data);
  return {
    customerId: readString(record.customerId, record.customer_id, record.id),
    fullName: readString(record.fullName, record.full_name),
    email: readString(record.email),
    mobileNumber: readString(record.mobileNumber, record.mobile_number, record.phone),
    customerType: readString(record.customerType, record.customer_type) || 'INDIVIDUAL',
    firstName: readString(record.firstName, record.first_name) || undefined,
    lastName: readString(record.lastName, record.last_name) || undefined,
  };
}

export async function getCustomerKyc(): Promise<CustomerKycSummary> {
  assertApiConfigured();
  const { data } = await apiClient.get('/customer/kyc');
  const record = unwrapRecord(data);
  const requiredDocuments = asArray(record.requiredDocuments, record.required_documents)
    .map(asDocumentType)
    .filter(Boolean) as CustomerKycDocumentType[];
  const uploadedDocuments = asArray(record.uploadedDocuments, record.uploaded_documents)
    .map(asDocumentType)
    .filter(Boolean) as CustomerKycDocumentType[];

  return {
    customerId: readString(record.customerId, record.customer_id),
    customerName: readString(record.customerName, record.customer_name),
    customerType: readString(record.customerType, record.customer_type) || 'INDIVIDUAL',
    status: readString(record.status) || 'PENDING',
    updatedAt: readString(record.updatedAt, record.updated_at) || undefined,
    requiredDocuments,
    uploadedDocuments,
    isComplete: record.isComplete === true || record.is_complete === true,
  };
}

export async function listCustomerKycDocuments(): Promise<CustomerKycDocument[]> {
  assertApiConfigured();
  const { data } = await apiClient.get('/customer/kyc/documents');
  return unwrapArray(data).map(mapKycDocument);
}

export async function uploadCustomerKycDocument(
  documentType: CustomerKycDocumentType,
  file: SelectedKycFile,
): Promise<CustomerKycDocument> {
  assertApiConfigured();
  const body = new FormData();
  body.append('documentType', documentType);
  body.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
  } as unknown as Blob);

  const { data } = await apiClient.post('/customer/kyc/documents/upload', body, {
    timeout: 60_000,
  });
  return mapKycDocument(unwrapRecord(data));
}

export async function deleteCustomerKycDocument(documentId: string): Promise<void> {
  assertApiConfigured();
  await apiClient.delete(`/customer/kyc/documents/${documentId}`);
}

export async function getCustomerMobileChangeRequests(): Promise<CustomerMobileChangeRequest[]> {
  assertApiConfigured();
  const { data } = await apiClient.get('/customer/mobile-change-requests');
  return unwrapArray(data).map(mapMobileChangeRequest);
}

export async function sendCustomerMobileChangeOtp(newMobileNumber: string) {
  assertApiConfigured();
  const { data } = await apiClient.post('/customer/mobile-change-requests/send-otp', {
    newMobileNumber: normalizeMobileForApi(newMobileNumber),
  });
  return unwrapRecord(data);
}

export async function submitCustomerMobileChangeRequest(payload: {
  newMobileNumber: string;
  reason: string;
  otp: string;
}): Promise<CustomerMobileChangeRequest> {
  assertApiConfigured();
  const { data } = await apiClient.post('/customer/mobile-change-requests', {
    newMobileNumber: normalizeMobileForApi(payload.newMobileNumber),
    reason: payload.reason.trim(),
    otp: payload.otp.trim(),
  });
  return mapMobileChangeRequest(unwrapRecord(data));
}

export async function cancelCustomerMobileChangeRequest(
  requestId: string,
): Promise<CustomerMobileChangeRequest> {
  assertApiConfigured();
  const { data } = await apiClient.post(`/customer/mobile-change-requests/${requestId}/cancel`, {});
  return mapMobileChangeRequest(unwrapRecord(data));
}

function mapKycDocument(value: unknown): CustomerKycDocument {
  const record = asRecord(value);
  return {
    id: readString(record.id, record.documentId, record.document_id),
    customerId: readString(record.customerId, record.customer_id, record.userId, record.user_id),
    documentType: asDocumentType(record.documentType ?? record.document_type) || 'NRC_OR_PASSPORT',
    fileName: readString(record.fileName, record.file_name) || 'document',
    mimeType: readString(record.mimeType, record.mime_type) || 'application/octet-stream',
    fileSize: readNumber(record.fileSize, record.file_size, record.size),
    status: readString(record.status) || 'SUBMITTED',
    uploadedAt: readString(record.uploadedAt, record.uploaded_at, record.createdAt, record.created_at) || undefined,
  };
}

function mapMobileChangeRequest(value: unknown): CustomerMobileChangeRequest {
  const record = asRecord(value);
  const status = readString(record.status).toUpperCase();
  return {
    id: readString(record.id),
    currentMobileNumber: readString(record.currentMobileNumber, record.current_mobile_number, record.currentValue),
    newMobileNumber: readString(record.newMobileNumber, record.new_mobile_number, record.requestedValue),
    reason: readString(record.reason, record.requestReason, record.request_reason),
    status: status === 'PENDING' ? 'PENDING_REVIEW' : status,
    adminMessage: readString(record.adminMessage, record.admin_message, record.decisionReason, record.decision_reason) || undefined,
    createdAt: readString(record.createdAt, record.created_at) || undefined,
    updatedAt: readString(record.updatedAt, record.updated_at, record.reviewedAt, record.reviewed_at) || undefined,
  };
}

function asDocumentType(value: unknown): CustomerKycDocumentType | '' {
  const raw = readString(value).toUpperCase().replace(/[\s/-]+/g, '_');
  if (raw === 'NRC_OR_PASSPORT' || raw === 'NRC' || raw === 'PASSPORT') return 'NRC_OR_PASSPORT';
  if (raw === 'INCORPORATION_CERTIFICATE' || raw === 'CERTIFICATE_OF_INCORPORATION') {
    return 'INCORPORATION_CERTIFICATE';
  }
  if (raw === 'DRIVING_LICENCE' || raw === 'DRIVING_LICENSE') return 'DRIVING_LICENCE';
  return '';
}

function unwrapRecord(value: unknown): Record<string, unknown> {
  const record = asRecord(value);
  const nested = asRecord(record.data);
  return Object.keys(nested).length > 0 ? nested : record;
}

function unwrapArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const record = asRecord(value);
  if (Array.isArray(record.data)) return record.data;
  if (Array.isArray(record.items)) return record.items;
  return [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(...values: unknown[]): unknown[] {
  for (const value of values) {
    if (Array.isArray(value)) return value;
  }
  return [];
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
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}
