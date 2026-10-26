import { apiClient, assertApiConfigured } from '../api/client';

function unwrapRecord(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {};
  }
  const record = payload as Record<string, unknown>;
  if (record.data && typeof record.data === 'object' && !Array.isArray(record.data)) {
    return record.data as Record<string, unknown>;
  }
  return record;
}

function readString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

export type AccountClosureOtpSendResult = {
  closureChallengeToken: string;
  otpExpiresAt: string;
  challengeExpiresAt: string;
  otpSent: boolean;
  maskedMobileNumber: string;
};

export type AccountClosureOtpVerifyResult = {
  closureToken: string;
  verified: boolean;
  verifiedAt: string;
};

export type AccountClosureResult = {
  status: 'CLOSED';
  closedAt: string;
  alreadyClosed: boolean;
  policiesRemainValid: boolean;
  message: string;
};

export async function sendCustomerAccountClosureOtp(): Promise<AccountClosureOtpSendResult> {
  assertApiConfigured();
  const { data } = await apiClient.post('/customer/account/closure/send-otp');
  const record = unwrapRecord(data);
  return {
    closureChallengeToken: readString(
      record.closureChallengeToken,
      record.closure_challenge_token,
    ),
    otpExpiresAt: readString(record.otpExpiresAt, record.otp_expires_at),
    challengeExpiresAt: readString(
      record.challengeExpiresAt,
      record.challenge_expires_at,
    ),
    otpSent: Boolean(record.otpSent ?? record.otp_sent ?? true),
    maskedMobileNumber: readString(
      record.maskedMobileNumber,
      record.masked_mobile_number,
    ),
  };
}

export async function verifyCustomerAccountClosureOtp(params: {
  closureChallengeToken: string;
  otp: string;
}): Promise<AccountClosureOtpVerifyResult> {
  assertApiConfigured();
  const { data } = await apiClient.post('/customer/account/closure/verify-otp', params);
  const record = unwrapRecord(data);
  return {
    closureToken: readString(record.closureToken, record.closure_token),
    verified: Boolean(record.verified),
    verifiedAt: readString(record.verifiedAt, record.verified_at),
  };
}

export async function closeCustomerAccount(params: {
  confirmation: 'DELETE';
  closureToken: string;
}): Promise<AccountClosureResult> {
  assertApiConfigured();
  const { data } = await apiClient.delete('/customer/account', { data: params });
  const record = unwrapRecord(data);
  return {
    status: 'CLOSED',
    closedAt: readString(record.closedAt, record.closed_at),
    alreadyClosed: Boolean(record.alreadyClosed ?? record.already_closed),
    policiesRemainValid: Boolean(
      record.policiesRemainValid ?? record.policies_remain_valid ?? true,
    ),
    message: readString(record.message) || 'Your VenSure account is closed.',
  };
}
