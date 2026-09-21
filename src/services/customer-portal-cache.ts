type CacheEntry = {
  at: number;
  payload: unknown;
};

const TTL_MS = 60_000;
const store = new Map<string, CacheEntry>();

export function getCustomerPortalCache<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.at > TTL_MS) {
    store.delete(key);
    return undefined;
  }
  return entry.payload as T;
}

export function findCustomerPortalCache<T>(
  prefix: string,
  isMatch?: (payload: unknown) => boolean,
): T | undefined {
  for (const [key, entry] of store) {
    if (!key.startsWith(prefix)) continue;
    if (Date.now() - entry.at > TTL_MS) {
      store.delete(key);
      continue;
    }
    if (isMatch && !isMatch(entry.payload)) continue;
    return entry.payload as T;
  }
  return undefined;
}

export function setCustomerPortalCache(key: string, payload: unknown): void {
  store.set(key, { at: Date.now(), payload });
}

export function invalidateCustomerPortalCache(prefix?: string): void {
  if (!prefix) {
    store.clear();
    return;
  }

  for (const key of [...store.keys()]) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

export function clearCustomerPortalCache(): void {
  store.clear();
}
