import { Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { apiClient, assertApiConfigured } from '../api/client';

export type CustomerDocumentInput = {
  path: string;
  fileName?: string;
  mimeType?: string;
};

export type CustomerDocumentFile = {
  uri: string;
  fileName: string;
  mimeType: string;
  base64: string;
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return globalThis.btoa(binary);
}

function toArrayBuffer(data: unknown): ArrayBuffer {
  if (data instanceof ArrayBuffer) return data;
  if (ArrayBuffer.isView(data)) {
    const copy = new Uint8Array(data.byteLength);
    copy.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
    return copy.buffer;
  }
  throw new Error('Document data was not returned as a file.');
}

function sanitizeFileName(fileName: string): string {
  const cleaned = fileName.replace(/[^A-Za-z0-9._-]/g, '_').replace(/_+/g, '_');
  return cleaned || 'document';
}

function withFileExtension(fileName: string, mimeType: string): string {
  if (fileName.includes('.')) return fileName;
  if (mimeType.includes('pdf')) return `${fileName}.pdf`;
  if (mimeType.includes('png')) return `${fileName}.png`;
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return `${fileName}.jpg`;
  if (mimeType.includes('webp')) return `${fileName}.webp`;
  return fileName;
}

const CUSTOMER_DOCUMENT_CACHE_DIR = 'vensure-customer-docs';

function customerDocumentCacheDirectory(): string | null {
  const root = FileSystem.cacheDirectory;
  if (!root) return null;
  return `${root}${CUSTOMER_DOCUMENT_CACHE_DIR}/`;
}

async function ensureCustomerDocumentCacheDirectory(): Promise<string> {
  const directory = customerDocumentCacheDirectory();
  if (!directory) {
    throw new Error('Document storage is not available on this device.');
  }

  const info = await FileSystem.getInfoAsync(directory);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  }

  return directory;
}

export async function clearCustomerDocumentCache(): Promise<void> {
  const directory = customerDocumentCacheDirectory();
  if (!directory) return;

  try {
    const info = await FileSystem.getInfoAsync(directory);
    if (info.exists) {
      await FileSystem.deleteAsync(directory, { idempotent: true });
    }
  } catch {
    // Best-effort only. Logout must not fail if cache cleanup cannot run.
  }
}

export async function fetchCustomerDocumentFile(
  input: CustomerDocumentInput,
): Promise<CustomerDocumentFile> {
  assertApiConfigured();
  const directory = await ensureCustomerDocumentCacheDirectory();

  const response = await apiClient.get(input.path, {
    responseType: 'arraybuffer',
    timeout: 60_000,
  });
  const mimeType =
    String(response.headers['content-type'] || input.mimeType || 'application/octet-stream').split(';')[0];
  const disposition = String(response.headers['content-disposition'] || '');
  const matchedName = disposition.match(/filename="?([^"]+)"?/i)?.[1];
  const fileName = withFileExtension(
    sanitizeFileName(matchedName || input.fileName || 'document'),
    mimeType,
  );
  const base64 = arrayBufferToBase64(toArrayBuffer(response.data));
  const uri = `${directory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: 'base64' });
  return { uri, fileName, mimeType, base64 };
}

export async function openCustomerDocument(input: CustomerDocumentInput): Promise<void> {
  const saved = await fetchCustomerDocumentFile(input);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(saved.uri, { mimeType: saved.mimeType, dialogTitle: saved.fileName });
    return;
  }
  Alert.alert('Document ready', `${saved.fileName} was saved, but sharing is not available on this device.`);
}

export async function downloadCustomerDocument(input: CustomerDocumentInput): Promise<void> {
  const saved = await fetchCustomerDocumentFile(input);

  if (Platform.OS === 'android') {
    const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!permissions.granted) return;

    const destination = await FileSystem.StorageAccessFramework.createFileAsync(
      permissions.directoryUri,
      saved.fileName,
      saved.mimeType || 'application/octet-stream',
    );
    await FileSystem.writeAsStringAsync(destination, saved.base64, { encoding: 'base64' });
    Alert.alert('Downloaded', `${saved.fileName} was saved to the folder you selected.`);
    return;
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(saved.uri, {
      mimeType: saved.mimeType,
      UTI: saved.mimeType === 'application/pdf' ? 'com.adobe.pdf' : 'public.data',
      dialogTitle: 'Save to Files',
    });
    return;
  }

  Alert.alert('Downloaded', `${saved.fileName} was saved on this device.`);
}
