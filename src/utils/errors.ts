import axios, { isAxiosError } from 'axios';

export class ApiError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly retryAfterSeconds?: number;

  constructor(
    message: string,
    options?: { status?: number; code?: string; retryAfterSeconds?: number },
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = options?.status;
    this.code = options?.code;
    this.retryAfterSeconds = options?.retryAfterSeconds;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (isApiError(error) && error.message.trim()) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (isAxiosError(error)) {
    if (!error.response) {
      return new ApiError('Network error. Check your connection and try again.', {
        code: error.code ?? 'NETWORK_ERROR',
      });
    }

    const payload = error.response.data;
    return new ApiError(extractSafeMessage(payload), {
      status: error.response.status,
      code: extractCode(payload) ?? error.code,
      retryAfterSeconds: extractRetryAfter(payload),
    });
  }

  if (error instanceof Error && error.message) {
    return new ApiError(error.message);
  }

  return new ApiError('Something went wrong. Please try again.');
}

function extractSafeMessage(payload: unknown): string {
  if (typeof payload === 'string' && payload.trim()) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const candidate = record.message ?? record.error;
    const fromCandidate = stringifyMessage(candidate);

    if (fromCandidate) {
      return fromCandidate;
    }
  }

  return 'Request failed. Please try again.';
}

function stringifyMessage(value: unknown): string {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          if (typeof record.message === 'string' && record.message.trim()) {
            return record.message.trim();
          }
          const constraints = record.constraints;
          if (constraints && typeof constraints === 'object') {
            return Object.values(constraints as Record<string, unknown>)
              .filter((entry): entry is string => typeof entry === 'string' && Boolean(entry.trim()))
              .join(' ');
          }
        }
        return '';
      })
      .filter(Boolean)
      .join(' ');
  }

  return '';
}

function extractCode(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  const code = (payload as Record<string, unknown>).code;
  return typeof code === 'string' ? code : undefined;
}

function extractRetryAfter(payload: unknown): number | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  const value = (payload as Record<string, unknown>).retryAfterSeconds;
  return typeof value === 'number' && value > 0 ? value : undefined;
}
