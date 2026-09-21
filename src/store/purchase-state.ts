import * as SecureStore from 'expo-secure-store';

import { STORAGE_KEYS } from '../constants/storage-keys';

export type PendingPurchase = {
  quoteId: string;
  quoteRequestId?: string;
};

export type GeePayCheckoutState = {
  quoteId: string;
  transactionRef: string;
  checkoutUrl: string;
  createdAt: string;
  browserOpened?: boolean;
};

const tokenOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

let pendingPurchase: PendingPurchase | null = null;
let checkoutState: GeePayCheckoutState | null = null;

async function writeJson(key: string, value: object | null) {
  if (!value) {
    await SecureStore.deleteItemAsync(key, tokenOptions);
    return;
  }
  await SecureStore.setItemAsync(key, JSON.stringify(value), tokenOptions);
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function getPendingPurchase() {
  return pendingPurchase;
}

export async function savePendingPurchase(next: PendingPurchase) {
  pendingPurchase = next;
  await writeJson(STORAGE_KEYS.pendingPurchase, next);
}

export async function clearPendingPurchase() {
  pendingPurchase = null;
  await writeJson(STORAGE_KEYS.pendingPurchase, null);
}

export function getCheckoutState() {
  return checkoutState;
}

export async function saveCheckoutState(next: GeePayCheckoutState) {
  checkoutState = next;
  await writeJson(STORAGE_KEYS.geepayCheckout, next);
}

export async function clearCheckoutState() {
  checkoutState = null;
  await writeJson(STORAGE_KEYS.geepayCheckout, null);
}

export async function restorePurchaseState() {
  const [pendingRaw, checkoutRaw] = await Promise.all([
    SecureStore.getItemAsync(STORAGE_KEYS.pendingPurchase, tokenOptions),
    SecureStore.getItemAsync(STORAGE_KEYS.geepayCheckout, tokenOptions),
  ]);
  pendingPurchase = parseJson<PendingPurchase>(pendingRaw);
  checkoutState = parseJson<GeePayCheckoutState>(checkoutRaw);
  return { pendingPurchase, checkoutState };
}
