import { getTodayDateString } from '../features/quote/helpers';
import { createEmptyMotorQuoteForm, type MotorQuoteFormData, type QuoteResultItem } from '../features/quote/types';

export type GuestQuoteSession = {
  quoteRequestId: string;
  displayQuoteReference?: string;
  quoteRequestData: MotorQuoteFormData;
  quoteResponses?: QuoteResultItem[];
  selectedQuoteId?: string;
};

let guestQuoteSession: GuestQuoteSession | null = null;

export function saveGuestQuoteSession(session: GuestQuoteSession) {
  guestQuoteSession = session;
}

export function getGuestQuoteSession() {
  return guestQuoteSession;
}

export function clearGuestQuoteSession() {
  guestQuoteSession = null;
}

export function persistQuoteResponses(quotes: QuoteResultItem[], quoteRequestId?: string) {
  const requestId = quoteRequestId || guestQuoteSession?.quoteRequestId;
  if (!requestId) return;

  if (!guestQuoteSession || guestQuoteSession.quoteRequestId !== requestId) {
    guestQuoteSession = {
      quoteRequestId: requestId,
      quoteRequestData: createEmptyMotorQuoteForm(getTodayDateString()),
      quoteResponses: quotes,
    };
    return;
  }

  guestQuoteSession = {
    ...guestQuoteSession,
    quoteResponses: quotes,
  };
}

export function selectQuoteInSession(quoteId: string) {
  if (!guestQuoteSession) return;
  guestQuoteSession = {
    ...guestQuoteSession,
    selectedQuoteId: quoteId,
  };
}
