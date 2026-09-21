import * as SecureStore from 'expo-secure-store';

import { STORAGE_KEYS } from '../constants/storage-keys';
import type { CustomerAuthUser } from '../types';

const tokenOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export async function saveAccessToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEYS.accessToken, token, tokenOptions);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(STORAGE_KEYS.accessToken, tokenOptions);
}

export async function removeAccessToken(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEYS.accessToken, tokenOptions);
}

export async function saveRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEYS.refreshToken, token, tokenOptions);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(STORAGE_KEYS.refreshToken, tokenOptions);
}

export async function removeRefreshToken(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEYS.refreshToken, tokenOptions);
}

export async function saveCustomerUser(user: CustomerAuthUser): Promise<void> {
  await SecureStore.setItemAsync(
    STORAGE_KEYS.customerUser,
    JSON.stringify(user),
    tokenOptions,
  );
}

export async function getCustomerUser(): Promise<CustomerAuthUser | null> {
  const raw = await SecureStore.getItemAsync(STORAGE_KEYS.customerUser, tokenOptions);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as CustomerAuthUser;
  } catch {
    return null;
  }
}

export async function removeCustomerUser(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEYS.customerUser, tokenOptions);
}

export async function clearAuthTokens(): Promise<void> {
  await Promise.all([
    removeAccessToken(),
    removeRefreshToken(),
    removeCustomerUser(),
  ]);
}
