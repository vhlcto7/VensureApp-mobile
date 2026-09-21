import type { CustomerSignUpDraft } from '../types';

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
