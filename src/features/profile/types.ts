export type CustomerProfileRecord = {
  customerId: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  customerType: string;
  firstName?: string;
  lastName?: string;
};

export type CustomerKycDocumentType =
  | 'NRC_OR_PASSPORT'
  | 'INCORPORATION_CERTIFICATE'
  | 'DRIVING_LICENCE';

export type CustomerKycStatus = 'PENDING' | 'SUBMITTED' | string;

export type CustomerKycSummary = {
  customerId: string;
  customerName: string;
  customerType: string;
  status: CustomerKycStatus;
  updatedAt?: string;
  requiredDocuments: CustomerKycDocumentType[];
  uploadedDocuments: CustomerKycDocumentType[];
  isComplete: boolean;
};

export type CustomerKycDocument = {
  id: string;
  customerId: string;
  documentType: CustomerKycDocumentType;
  fileName: string;
  mimeType: string;
  fileSize?: number;
  status: string;
  uploadedAt?: string;
};

export type CustomerMobileChangeRequestStatus =
  | 'PENDING_OTP'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | string;

export type CustomerMobileChangeRequest = {
  id: string;
  currentMobileNumber: string;
  newMobileNumber: string;
  reason: string;
  status: CustomerMobileChangeRequestStatus;
  adminMessage?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SelectedKycFile = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
};
