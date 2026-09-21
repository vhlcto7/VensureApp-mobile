const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function getEmailValidationError(
  value: string,
  options?: { required?: boolean },
): string | undefined {
  const trimmed = value.trim();

  if (!trimmed) {
    return options?.required ? 'Email is required.' : undefined;
  }

  if (!EMAIL_PATTERN.test(trimmed)) {
    return 'Enter a valid email address.';
  }

  return undefined;
}

export function getMobileValidationError(value: string): string | undefined {
  const digits = value.replace(/\D/g, '');

  if (!digits) {
    return 'Mobile number is required.';
  }

  let national = digits;
  if (national.startsWith('260')) {
    national = national.slice(3);
  }
  if (national.startsWith('0')) {
    national = national.slice(1);
  }

  if (national.length !== 9) {
    return 'Enter a valid 9-digit Zambian mobile number.';
  }

  return undefined;
}

export function getPasswordValidationError(value: string): string | undefined {
  if (!value.trim()) {
    return 'Password is required.';
  }

  if (value.length < 8) {
    return 'Password must be at least 8 characters.';
  }

  return undefined;
}
