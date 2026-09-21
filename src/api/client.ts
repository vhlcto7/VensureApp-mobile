import axios, { isAxiosError, type InternalAxiosRequestConfig } from 'axios';

import { API_BASE_URL, API_TIMEOUT_MS } from '../config/env';
import { getAccessToken } from '../services/secure-storage';
import { ApiError, normalizeApiError } from '../utils/errors';

type TimedRequestConfig = InternalAxiosRequestConfig & {
  metadata?: { startedAt: number };
};

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

function requestPath(url?: string) {
  if (!url) return '';
  try {
    const pathname = new URL(url, API_BASE_URL || 'https://vensure.invalid').pathname;
    return pathname.replace(/\/vehicles\/lookup\/[^/]+/i, '/vehicles/lookup/:registrationNumber');
  } catch {
    return url.split('?')[0];
  }
}

function logApiCall(method: string, url: string, status: number | string, durationMs: number) {
  if (!__DEV__) return;
  console.log(`[api] ${method.toUpperCase()} ${requestPath(url)} ${status} ${durationMs}ms`);
}

/**
 * Direct NestJS client. Do not route through /api/proxy/.
 * Set EXPO_PUBLIC_API_BASE_URL to the NestJS backend origin including /api.
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  const timedConfig = config as TimedRequestConfig;
  timedConfig.metadata = { startedAt: Date.now() };
  const token = await getAccessToken();
  const requestUrl = String(timedConfig.url ?? '');
  const isPublicPath =
    requestUrl.includes('/vehicles/lookup') || requestUrl.includes('/settings/support-contacts');

  if (token && !isPublicPath) {
    timedConfig.headers.Authorization = `Bearer ${token}`;
  }

  if (isFormDataBody(timedConfig.data)) {
    const headers = timedConfig.headers;
    if (headers && typeof headers.delete === 'function') {
      headers.delete('Content-Type');
      headers.delete('content-type');
    } else if (headers) {
      delete headers['Content-Type'];
      delete headers['content-type'];
    }
  }

  return timedConfig;
});

apiClient.interceptors.response.use(
  (response) => {
    const timedConfig = response.config as TimedRequestConfig;
    const durationMs = Date.now() - (timedConfig.metadata?.startedAt ?? Date.now());
    logApiCall(
      response.config.method || 'GET',
      String(response.config.url ?? ''),
      response.status,
      durationMs,
    );
    return response;
  },
  (error) => {
    const config = isAxiosError(error) ? (error.config as TimedRequestConfig | undefined) : undefined;
    const durationMs = Date.now() - (config?.metadata?.startedAt ?? Date.now());
    const url = isAxiosError(error) ? String(error.config?.url ?? '') : '';
    const status = isAxiosError(error) ? error.response?.status ?? error.code ?? 'NETWORK' : 'ERROR';
    logApiCall(config?.method || 'GET', url, status, durationMs);

    const normalized = normalizeApiError(error);
    const isPublicQuoteOrAuthPath =
      url.includes('/auth/customer/') ||
      url.includes('/vehicles/lookup') ||
      url.includes('/quote-requests') ||
      url.includes('/countries') ||
      url.includes('/customer/insurance-companies') ||
      url.includes('/products/country/') ||
      url.includes('/settings/support-contacts');

    const isPasswordMismatch =
      url.includes('/customer/change-password') &&
      /currentPassword is incorrect/i.test(normalized.message);

    if (normalized.status === 401 && !isPublicQuoteOrAuthPath && !isPasswordMismatch) {
      unauthorizedHandler?.();
    }

    return Promise.reject(normalized);
  },
);

function isFormDataBody(data: unknown): boolean {
  return typeof FormData !== 'undefined' && data instanceof FormData;
}

export function assertApiConfigured(): void {
  if (!API_BASE_URL.trim()) {
    throw new ApiError(
      'API base URL is not configured. Set EXPO_PUBLIC_API_BASE_URL to your NestJS API, including /api.',
    );
  }
}
