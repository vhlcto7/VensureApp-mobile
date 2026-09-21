import type { CustomerLoginOtpChallenge, CustomerSignupOtpChallenge } from '../types';

export type LoginOtpSession = CustomerLoginOtpChallenge & {
  purpose: 'login';
  mobileNumber: string;
};

export type SignupOtpSession = CustomerSignupOtpChallenge & {
  purpose: 'signup';
  mobileNumber: string;
  email?: string;
};

export type PendingOtpSession = LoginOtpSession | SignupOtpSession;

let pendingOtp: PendingOtpSession | null = null;

export function savePendingOtp(session: PendingOtpSession): void {
  pendingOtp = session;
}

export function getPendingOtp(): PendingOtpSession | null {
  return pendingOtp;
}

export function clearPendingOtp(): void {
  pendingOtp = null;
}
