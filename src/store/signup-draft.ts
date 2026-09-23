import type { CustomerSignUpDraft } from '../types';

const emptySignupDraft: CustomerSignUpDraft = {
  fullName: '',
  email: '',
  mobileNumber: '',
  customerType: 'INDIVIDUAL',
  password: '',
  confirmPassword: '',
  nrcOrPassportNumber: '',
  acceptedLegalAgreement: false,
  acceptedMarketing: false,
};

let signupDraft: CustomerSignUpDraft | null = null;

export function saveSignupDraft(draft: CustomerSignUpDraft): void {
  signupDraft = draft;
}

export function getSignupDraft(): CustomerSignUpDraft | null {
  return signupDraft;
}

export function clearSignupDraft(): void {
  signupDraft = null;
}

export function prefillSignupDraft(prefill: { email?: string; mobileNumber?: string }): void {
  const current = getSignupDraft() ?? emptySignupDraft;
  saveSignupDraft({
    ...current,
    email: prefill.email?.trim() || current.email,
    mobileNumber: prefill.mobileNumber?.trim() || current.mobileNumber,
  });
}
