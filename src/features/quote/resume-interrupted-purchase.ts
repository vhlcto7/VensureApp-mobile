import { getGeePayStatus } from '../../services/geepay';
import {
  clearCheckoutState,
  clearPendingPurchase,
  restorePurchaseState,
  type GeePayCheckoutState,
} from '../../store/purchase-state';
import { isApiError } from '../../utils/errors';

export type InterruptedPurchaseResume =
  | { action: 'none' }
  | { action: 'resume'; quoteId: string; transactionRef: string };

function isUsableCheckout(state: GeePayCheckoutState | null): state is GeePayCheckoutState {
  return Boolean(state?.quoteId?.trim() && state.transactionRef.trim() && state.checkoutUrl.trim());
}

async function clearStalePurchaseState() {
  await Promise.all([clearCheckoutState(), clearPendingPurchase()]);
}

function isStalePurchaseError(error: unknown) {
  return isApiError(error) && (error.status === 404 || error.status === 403);
}

/**
 * Hydrates persisted checkout and asks the B4-secured customer GeePay status
 * endpoint whether it is still this customer's unfinished payment.
 * Does not mark payment successful or create a policy.
 */
export async function resolveInterruptedPurchaseResume(): Promise<InterruptedPurchaseResume> {
  const { checkoutState } = await restorePurchaseState();

  if (!checkoutState) {
    return { action: 'none' };
  }

  if (!isUsableCheckout(checkoutState)) {
    await clearCheckoutState();
    return { action: 'none' };
  }

  try {
    const status = await getGeePayStatus(checkoutState.transactionRef);
    if (status.quoteId && status.quoteId !== checkoutState.quoteId) {
      await clearStalePurchaseState();
      return { action: 'none' };
    }

    return {
      action: 'resume',
      quoteId: checkoutState.quoteId,
      transactionRef: checkoutState.transactionRef,
    };
  } catch (error) {
    if (isStalePurchaseError(error)) {
      await clearStalePurchaseState();
      return { action: 'none' };
    }

    return {
      action: 'resume',
      quoteId: checkoutState.quoteId,
      transactionRef: checkoutState.transactionRef,
    };
  }
}
