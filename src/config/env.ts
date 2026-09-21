import Constants from 'expo-constants';

/**
 * Public mobile configuration only.
 * Never add backend secrets, JWT keys, GeePay secrets, or RTSA credentials here.
 *
 * Expo inlines EXPO_PUBLIC_* from .env at bundle time. extra.apiBaseUrl is a
 * fallback from app.config.js, which also reads that same public env var.
 * There is no localhost / UAT / LAN default.
 */
const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;

function readExtraString(key: string) {
  const extra = Constants.expoConfig?.extra;
  if (!extra || typeof extra !== 'object') {
    return '';
  }
  const value = extra[key];
  return typeof value === 'string' ? value.trim() : '';
}

export const API_BASE_URL = (fromEnv || readExtraString('apiBaseUrl')).trim();
export const APP_ENV = readExtraString('appEnv');
export const APP_VERSION = Constants.expoConfig?.version?.trim() || '0.0.0';

export const API_TIMEOUT_MS = 15_000;

const isProductionApp = APP_ENV.toLowerCase() === 'production';
const apiUrlForCheck = API_BASE_URL.toLowerCase();
const productionApiLooksUnsafe =
  apiUrlForCheck.includes('uat') ||
  apiUrlForCheck.includes('localhost') ||
  apiUrlForCheck.includes('127.0.0.1') ||
  /(?:^|\/\/)192\.168\./.test(apiUrlForCheck);

if (isProductionApp && productionApiLooksUnsafe) {
  throw new Error(
    'Production builds must not use a UAT, localhost, or LAN API URL. Set EXPO_PUBLIC_API_BASE_URL to the production NestJS API in the EAS production environment.',
  );
}

if ((!__DEV__ || isProductionApp) && !API_BASE_URL) {
  throw new Error(
    'EXPO_PUBLIC_API_BASE_URL is required for release builds. Set it in the EAS/production environment. Do not bake UAT, localhost, or a LAN address as a fallback.',
  );
}
