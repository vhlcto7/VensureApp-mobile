export const DEFAULT_SUPPORT_WHATSAPP = '260772388683';
export const DEFAULT_SUPPORT_PHONE = '+260 772388683';
export const DEFAULT_SUPPORT_EMAIL = 'insurance@ventureholdingltd.com';

export type SupportContacts = {
  whatsappPhone: string;
  phoneDisplay: string;
  phoneTel: string;
  email: string;
};

export function toSupportPhoneDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function getDefaultSupportContacts(): SupportContacts {
  const phoneTel = toSupportPhoneDigits(DEFAULT_SUPPORT_PHONE) || DEFAULT_SUPPORT_WHATSAPP;
  return {
    whatsappPhone: DEFAULT_SUPPORT_WHATSAPP,
    phoneDisplay: DEFAULT_SUPPORT_PHONE,
    phoneTel,
    email: DEFAULT_SUPPORT_EMAIL,
  };
}
