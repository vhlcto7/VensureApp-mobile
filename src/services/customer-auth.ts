import { apiClient, assertApiConfigured } from '../api/client';
import { API_BASE_URL } from '../config/env';
import { CUSTOMER_ROLE } from '../constants/auth';
import type {
  CustomerAuthSession,
  CustomerAuthUser,
  CustomerLoginOtpChallenge,
  CustomerSignupInitiation,
  CustomerSignupOtpChallenge,
  CustomerSignupRequest,
  ResendCustomerSignupOtpRequest,
  SignupConsentDocument,
  VerifyCustomerSignupOtpRequest,
} from '../types';
import { ApiError } from '../utils/errors';
import { normalizeMobileForApi } from '../utils/phone';

type LoginPayload = {
  emailOrMobile: string;
  password: string;
};

export async function loginCustomer(payload: LoginPayload): Promise<CustomerAuthSession> {
  assertApiConfigured();

  const { data } = await apiClient.post('/auth/customer/login', {
    emailOrMobile: payload.emailOrMobile.trim(),
    password: payload.password,
  });

  return parseAuthSession(data);
}

export async function sendCustomerLoginOtp(
  mobileNumber: string,
): Promise<CustomerLoginOtpChallenge> {
  assertApiConfigured();

  const { data } = await apiClient.post('/auth/customer/login/send-otp', {
    mobileNumber: normalizeMobileForApi(mobileNumber),
  });

  const loginToken = readString(data?.loginToken, data?.login_token);

  if (!loginToken) {
    throw new ApiError('Unable to start mobile OTP login.');
  }

  return {
    loginToken,
    otpExpiresAt: readString(data?.otpExpiresAt, data?.otp_expires_at) || undefined,
    loginExpiresAt: readString(data?.loginExpiresAt, data?.login_expires_at) || undefined,
    otpSent: data?.otpSent !== false && data?.otp_sent !== false,
  };
}

export async function verifyCustomerLoginOtp(payload: {
  loginToken: string;
  otp: string;
}): Promise<CustomerAuthSession> {
  assertApiConfigured();

  const { data } = await apiClient.post('/auth/customer/login/verify-otp', {
    loginToken: payload.loginToken,
    otp: payload.otp.trim(),
  });

  return parseAuthSession(data);
}

function resolveBackendPublicUrl(pathOrUrl?: string): string | undefined {
  const value = pathOrUrl?.trim();
  if (!value) {
    return undefined;
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    return value;
  }

  try {
    const origin = new URL(API_BASE_URL || 'https://vensure.invalid').origin;
    return value.startsWith('/') ? `${origin}${value}` : `${origin}/${value}`;
  } catch {
    return value;
  }
}

export async function getCustomerSignupConsents(): Promise<SignupConsentDocument | null> {
  assertApiConfigured();

  const { data } = await apiClient.get('/auth/customer/signup-consents');
  const source = asRecord(data);
  const document = asRecord(source?.legalAgreement) ?? asRecord(source?.legal_agreement);

  const id = readString(document?.id, document?.documentId);
  if (!id) {
    return null;
  }

  return {
    id,
    title: readString(document?.title, document?.name) || 'Customer Legal Agreement',
    version: readString(document?.version) || undefined,
    viewUrl: resolveBackendPublicUrl(
      readString(document?.viewUrl, document?.view_url, document?.url) || undefined,
    ),
  };
}

export async function signupCustomer(
  payload: CustomerSignupRequest,
): Promise<CustomerSignupInitiation> {
  assertApiConfigured();

  const { data } = await apiClient.post('/auth/customer/signup', {
    fullName: payload.fullName.trim(),
    email: payload.email?.trim() || undefined,
    mobileNumber: normalizeMobileForApi(payload.mobileNumber),
    nrcOrPassportNumber: payload.nrcOrPassportNumber.trim(),
    customerType: payload.customerType,
    password: payload.password,
    confirmPassword: payload.confirmPassword,
    acceptedLegalAgreement: payload.acceptedLegalAgreement,
    legalAgreementDocumentId: payload.legalAgreementDocumentId,
    acceptedMarketing: payload.acceptedMarketing ?? false,
  });

  if (hasAuthToken(data)) {
    return {
      state: 'AUTHENTICATED',
      session: parseAuthSession(data),
    };
  }

  const signupToken = readString(
    data?.signupToken,
    data?.signup_token,
    data?.verificationToken,
    data?.verification_token,
  );

  if (!signupToken) {
    throw new ApiError('Unable to start signup OTP verification.');
  }

  return {
    state: 'PENDING_OTP',
    challenge: {
      signupToken,
      otpExpiresAt: readString(data?.otpExpiresAt, data?.otp_expires_at) || undefined,
      signupExpiresAt: readString(data?.signupExpiresAt, data?.signup_expires_at) || undefined,
      otpSent: data?.otpSent !== false && data?.otp_sent !== false,
    },
  };
}

export async function verifyCustomerSignupOtp(
  payload: VerifyCustomerSignupOtpRequest,
): Promise<CustomerAuthSession> {
  assertApiConfigured();

  const { data } = await apiClient.post('/auth/customer/signup/verify-otp', {
    signupToken: payload.signupToken,
    verificationToken: payload.signupToken,
    otp: payload.otp.trim(),
    mobileNumber: payload.mobileNumber
      ? normalizeMobileForApi(payload.mobileNumber)
      : undefined,
    email: payload.email?.trim() || undefined,
  });

  return parseAuthSession(data);
}

export async function resendCustomerSignupOtp(
  payload: ResendCustomerSignupOtpRequest,
): Promise<CustomerSignupOtpChallenge> {
  assertApiConfigured();

  const { data } = await apiClient.post('/auth/customer/signup/resend-otp', {
    signupToken: payload.signupToken,
    verificationToken: payload.signupToken,
    mobileNumber: payload.mobileNumber
      ? normalizeMobileForApi(payload.mobileNumber)
      : undefined,
    email: payload.email?.trim() || undefined,
  });

  const signupToken = readString(
    data?.signupToken,
    data?.signup_token,
    data?.verificationToken,
    payload.signupToken,
  );

  return {
    signupToken,
    otpExpiresAt: readString(data?.otpExpiresAt, data?.otp_expires_at) || undefined,
    signupExpiresAt: readString(data?.signupExpiresAt, data?.signup_expires_at) || undefined,
    otpSent: data?.otpSent !== false && data?.otp_sent !== false,
  };
}

export async function requestCustomerPasswordReset(email: string): Promise<void> {
  assertApiConfigured();

  await apiClient.post('/auth/customer/forgot-password', {
    email: email.trim(),
  });
}

export async function changeCustomerPassword(payload: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<void> {
  assertApiConfigured();
  await apiClient.post('/customer/change-password', {
    currentPassword: payload.currentPassword,
    newPassword: payload.newPassword,
    confirmPassword: payload.confirmPassword,
  });
}

function parseAuthSession(payload: unknown): CustomerAuthSession {
  const source = asRecord(payload);
  const accessToken = readString(source?.accessToken, source?.token);

  if (!accessToken) {
    throw new ApiError('Login succeeded but the response was missing an access token.');
  }

  const userSource = asRecord(source?.user);
  if (!userSource) {
    throw new ApiError('Login succeeded but the response was missing user details.');
  }

  const role = readString(userSource.role).toUpperCase();
  if (role !== CUSTOMER_ROLE) {
    throw new ApiError('This mobile app currently supports customer accounts only.');
  }

  const id = readString(userSource.id, userSource.customerId);
  if (!id) {
    throw new ApiError('Login succeeded but the response was missing a user id.');
  }

  const fullName =
    readString(userSource.fullName, userSource.name) || 'Customer';

  const user: CustomerAuthUser = {
    id,
    customerId: readString(userSource.customerId) || id,
    role,
    email: readString(userSource.email) || null,
    fullName,
    name: readString(userSource.name) || fullName,
    mobileNumber: readString(userSource.mobileNumber, userSource.phone) || null,
    customerType: readString(userSource.customerType) || 'INDIVIDUAL',
  };

  return { accessToken, user };
}

function hasAuthToken(payload: unknown): boolean {
  const source = asRecord(payload);
  return Boolean(readString(source?.accessToken, source?.token));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
}

function readString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}
