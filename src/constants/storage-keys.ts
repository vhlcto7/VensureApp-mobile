/** SecureStore keys may contain alphanumeric characters, ".", "-", and "_". */
export const STORAGE_KEYS = {
  accessToken: 'vensure.access_token',
  refreshToken: 'vensure.refresh_token',
  customerUser: 'vensure.customer_user',
  pendingPurchase: 'vensure.pending_purchase',
  geepayCheckout: 'vensure.geepay_checkout',
} as const;
