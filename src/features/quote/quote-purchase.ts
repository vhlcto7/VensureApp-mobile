import { selectQuoteInSession } from '../../store/quote-draft';
import { savePendingPurchase } from '../../store/purchase-state';
import type { QuoteResultItem } from './types';

export function isQuotePurchasable(quote: QuoteResultItem) {
  return !quote.isExpired && !quote.isUnavailable && quote.insurancePremium !== undefined;
}

export async function selectQuoteForPurchase(input: {
  quote: QuoteResultItem;
  quoteRequestId?: string;
  onContinue: (quoteId: string) => void;
}) {
  if (!isQuotePurchasable(input.quote)) return;
  selectQuoteInSession(input.quote.id);
  await savePendingPurchase({
    quoteId: input.quote.id,
    quoteRequestId: input.quoteRequestId || input.quote.quoteRequestId,
  });
  input.onContinue(input.quote.id);
}
