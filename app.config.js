/**
 * extra.apiBaseUrl is taken only from EXPO_PUBLIC_API_BASE_URL.
 * Do not default this to UAT, localhost, or a LAN address.
 * Production EAS profiles set EXPO_PUBLIC_API_BASE_URL to the production NestJS API, including /api.
 */
function assertProductionApiBaseUrl(appEnv, apiBaseUrl) {
  if (String(appEnv || '').trim().toLowerCase() !== 'production') {
    return;
  }

  const value = String(apiBaseUrl || '').trim().toLowerCase();
  if (!value) {
    throw new Error(
      'EXPO_PUBLIC_API_BASE_URL is required for production EAS builds. Set it in the EAS production environment. Do not bake UAT, localhost, or a LAN address.',
    );
  }

  if (
    value.includes('uat') ||
    value.includes('localhost') ||
    value.includes('127.0.0.1') ||
    /(?:^|\/\/)192\.168\./.test(value)
  ) {
    throw new Error(
      'Production builds must not use a UAT, localhost, or LAN API URL. Set EXPO_PUBLIC_API_BASE_URL to the production NestJS API.',
    );
  }
}

module.exports = ({ config }) => {
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || '';
  const appEnv = process.env.APP_ENV || '';
  assertProductionApiBaseUrl(appEnv, apiBaseUrl);

  return {
    ...config,
    extra: {
      ...(config.extra ?? {}),
      apiBaseUrl,
      appEnv,
    },
  };
};
