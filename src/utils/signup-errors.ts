import { getErrorMessage, isApiError } from './errors';

export function normalizeCustomerAuthError(error: unknown, fallback: string): string {
  if (isApiError(error)) {
    const code = (error.code ?? '').toUpperCase();
    if (
      code === 'NETWORK_ERROR' ||
      code === 'ECONNABORTED' ||
      code === 'ERR_NETWORK' ||
      error.message.toLowerCase().includes('network error')
    ) {
      return 'Unable to connect to VenSure. Please check your internet connection and try again.';
    }
  }

  const message = getErrorMessage(error, fallback);
  const normalized = message.trim().toUpperCase();

  if (normalized.includes('PROFILE_REVIEW_REQUIRED')) {
    return 'Your account requires verification by our support team.';
  }

  if (normalized.includes('EMAIL IS ALREADY REGISTERED') || normalized.includes('EMAIL ALREADY REGISTERED')) {
    return 'An account already exists for this email. Please sign in.';
  }

  if (
    normalized.includes('MOBILENUMBER IS ALREADY REGISTERED') ||
    normalized.includes('MOBILE NUMBER IS ALREADY REGISTERED')
  ) {
    return 'An account already exists for this mobile number. Please sign in.';
  }

  if (normalized.includes('NRCORPASSPORTNUMBER IS ALREADY REGISTERED')) {
    return 'An account already exists for this NRC or passport number. Please sign in.';
  }

  if (
    normalized.includes('A CUSTOMER ACCOUNT ALREADY EXISTS') ||
    normalized.includes('ALREADY EXISTS FOR THE SUPPLIED IDENTITY')
  ) {
    return 'An account already exists for these details. Please sign in.';
  }

  if (
    normalized.includes('INVALID OTP') ||
    normalized.includes('OTP HAS EXPIRED') ||
    normalized.includes('TOO MANY INVALID OTP') ||
    normalized.includes('OTP VERIFICATION IS LOCKED')
  ) {
    return 'We could not verify the code. Please check the OTP and try again.';
  }

  if (normalized.includes('LEGAL DOCUMENT') || normalized.includes('CUSTOMER LEGAL AGREEMENT WAS UPDATED')) {
    return 'The Customer Legal Agreement was updated. Please review the latest version.';
  }

  if (normalized.includes('TOO MANY SIGNUP OTP REQUESTS')) {
    return 'Too many signup OTP requests. Please try again shortly.';
  }

  return message;
}

export function isDuplicateAccountError(error: unknown): boolean {
  const message = normalizeCustomerAuthError(error, '').toLowerCase();
  return message.includes('already exists') && message.includes('please sign in');
}

export function isProfileReviewRequired(error: unknown): boolean {
  if (isApiError(error) && error.code === 'PROFILE_REVIEW_REQUIRED') {
    return true;
  }

  return getErrorMessage(error, '').toUpperCase().includes('PROFILE_REVIEW_REQUIRED');
}

export function isCustomerAccountNotFound(error: unknown): boolean {
  if (isApiError(error) && error.code === 'CUSTOMER_ACCOUNT_NOT_FOUND') {
    return true;
  }

  return getErrorMessage(error, '')
    .toUpperCase()
    .includes('NO VENSURE ACCOUNT WAS FOUND');
}
