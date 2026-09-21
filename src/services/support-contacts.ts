import { Alert, Linking } from 'react-native';

import { apiClient, assertApiConfigured } from '../api/client';
import {
  getDefaultSupportContacts,
  toSupportPhoneDigits,
  type SupportContacts,
} from '../constants/support';

let cachedContacts: SupportContacts | null = null;

type SupportChatContext = {
  kind?: 'general' | 'claim';
  policyNumber?: string;
  vehicleRegistration?: string;
  insurerName?: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const record = value as Record<string, unknown>;
  if (record.data && typeof record.data === 'object' && !Array.isArray(record.data)) {
    return record.data as Record<string, unknown>;
  }
  return record;
}

function readString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function normalizeContacts(value: unknown): SupportContacts | null {
  const record = asRecord(value);
  const whatsappPhone = toSupportPhoneDigits(
    readString(record.whatsappPhone, record.whatsapp_phone),
  );
  const phoneTel = toSupportPhoneDigits(readString(record.phoneTel, record.phone_tel));
  const email = readString(record.email);
  if (!whatsappPhone || !phoneTel || !email) {
    return null;
  }
  return {
    whatsappPhone,
    phoneTel,
    phoneDisplay: readString(record.phoneDisplay, record.phone_display) || `+${phoneTel}`,
    email,
  };
}

function safeSupportLine(label: string, value?: string) {
  const trimmed = value?.trim() || '';
  if (!trimmed) return '';
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed)) {
    return '';
  }
  return `${label}: ${trimmed}`;
}

function supportMessage(context: SupportChatContext) {
  if (context.kind === 'claim') {
    const extras = [
      safeSupportLine('Policy Number', context.policyNumber),
      safeSupportLine('Vehicle Registration', context.vehicleRegistration),
      safeSupportLine('Insurer', context.insurerName),
    ].filter(Boolean);
    return [
      'Hi VenSure Claims Assistance,',
      '',
      'I would like assistance reporting a claim.',
      ...(extras.length ? ['', ...extras] : []),
      '',
      'Please guide me on the next steps.',
    ].join('\n');
  }

  return ['Hi VenSure Support,', '', 'I need assistance with a query or claim.'].join('\n');
}

export async function getSupportContacts(): Promise<SupportContacts> {
  if (cachedContacts) {
    return cachedContacts;
  }

  try {
    assertApiConfigured();
    const { data } = await apiClient.get('/settings/support-contacts');
    cachedContacts = normalizeContacts(data) ?? getDefaultSupportContacts();
  } catch {
    cachedContacts = getDefaultSupportContacts();
  }

  return cachedContacts;
}

export async function openSupportWhatsApp(context: SupportChatContext = {}) {
  const contacts = await getSupportContacts();
  const phone = toSupportPhoneDigits(contacts.whatsappPhone);
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(supportMessage(context))}`;

  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('WhatsApp unavailable', 'Unable to open WhatsApp on this device. Please try again.');
  }
}
