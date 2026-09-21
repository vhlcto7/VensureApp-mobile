import { Platform, TextStyle } from 'react-native';

/**
 * Web uses Aptos / Segoe UI. On native we fall back to the platform UI font.
 */
export const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

export const typography = {
  eyebrow: {
    fontFamily,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  title: {
    fontFamily,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
  } satisfies TextStyle,
  heading: {
    fontFamily,
    fontSize: 22,
    fontWeight: '600',
  } satisfies TextStyle,
  subtitle: {
    fontFamily,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  } satisfies TextStyle,
  body: {
    fontFamily,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  } satisfies TextStyle,
  label: {
    fontFamily,
    fontSize: 13,
    fontWeight: '500',
  } satisfies TextStyle,
  button: {
    fontFamily,
    fontSize: 16,
    fontWeight: '600',
  } satisfies TextStyle,
  caption: {
    fontFamily,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  } satisfies TextStyle,
} as const;
