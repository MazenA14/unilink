import { documentDirectory, writeAsStringAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

function escapeCSVField(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Build a CSV string and share it via the system share sheet.
 * `rows` are plain objects whose keys match `headers`' `key`.
 */
export async function exportRowsToCSV<T>(
  filenamePrefix: string,
  headers: { key: keyof T & string; label: string }[],
  rows: T[]
): Promise<void> {
  const lines = [
    headers.map(h => escapeCSVField(h.label)).join(','),
    ...rows.map(row => headers.map(h => escapeCSVField(row[h.key])).join(',')),
  ];
  const csvContent = lines.join('\r\n');

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `${filenamePrefix}_${timestamp}.csv`;
  const fileUri = `${documentDirectory}${filename}`;

  await writeAsStringAsync(fileUri, csvContent, { encoding: 'utf8' });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: 'Export CSV',
      UTI: 'public.comma-separated-values-text',
    });
  } else {
    throw new Error('Sharing is not available on this device');
  }
}
