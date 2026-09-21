const ZAMBIA_DIAL_DIGITS = '260';

export function normalizeMobileForApi(value: string): string {
  const digits = value.replace(/\D/g, '');
  let national = digits;

  if (national.startsWith(ZAMBIA_DIAL_DIGITS)) {
    national = national.slice(ZAMBIA_DIAL_DIGITS.length);
  }

  if (national.startsWith('0')) {
    national = national.slice(1);
  }

  return `+${ZAMBIA_DIAL_DIGITS}${national}`;
}

export function maskMobileNumber(value: string): string {
  return formatMaskedMobileDisplay(value);
}

export function formatMaskedMobileDisplay(value: string): string {
  const digits = value.replace(/\D/g, '');
  let national = digits;

  if (national.startsWith(ZAMBIA_DIAL_DIGITS)) {
    national = national.slice(ZAMBIA_DIAL_DIGITS.length);
  }
  if (national.startsWith('0')) {
    national = national.slice(1);
  }

  if (national.length < 3) {
    return '+260 XXX XXX XXX';
  }

  return `+260 XXX XXX ${national.slice(-3)}`;
}
