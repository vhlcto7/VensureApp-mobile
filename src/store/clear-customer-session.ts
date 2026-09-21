import { clearCustomerDocumentCache } from '../services/customer-documents';
import { clearCustomerPortalCache } from '../services/customer-portal-cache';
import { clearAuthTokens } from '../services/secure-storage';
import { clearPendingOtp } from './otp-challenge';
import { clearCheckoutState, clearPendingPurchase } from './purchase-state';
import { clearGuestQuoteSession } from './quote-draft';
import { clearSignupDraft } from './signup-draft';

/**
 * Local customer-session cleanup only.
 * Does not cancel, fail, or finalize backend payments, and does not create policies.
 */
export async function clearCustomerSessionState(): Promise<void> {
  clearPendingOtp();
  clearSignupDraft();
  clearGuestQuoteSession();
  clearCustomerPortalCache();
  await Promise.all([
    clearPendingPurchase(),
    clearCheckoutState(),
    clearAuthTokens(),
    clearCustomerDocumentCache(),
  ]);
}
