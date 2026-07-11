import { NativeModules } from 'react-native';

/**
 * Thin wrapper around the native `GucAuth` Android module which performs NTLM
 * authentication against GUC on-device and maintains a persistent session
 * cookie jar. This replaces the old Vercel NTLM proxy.
 */
const { GucAuth } = NativeModules as {
  GucAuth?: {
    setCredentials(username: string, password: string): Promise<void>;
    clearCredentials(): Promise<void>;
    clearCookies(): Promise<void>;
    hasSession(): Promise<boolean>;
    request(
      url: string,
      method: string,
      body: string | null,
      headers: Record<string, string> | null
    ): Promise<{ status: number; body: string; headers: Record<string, string> }>;
    downloadFile(
      url: string,
      destPath: string,
      headers: Record<string, string> | null
    ): Promise<{ status: number; filePath?: string; fileName?: string; contentType?: string }>;
    openFile(filePath: string, mimeType: string | null): Promise<void>;
    saveToDownloads(
      filePath: string,
      fileName: string,
      mimeType: string | null
    ): Promise<{ uri: string; fileName: string }>;
  };
};

export interface GucDownloadResult {
  status: number;
  /** `file://` URI of the downloaded file (present only on success). */
  filePath?: string;
  /** Best-effort filename (from Content-Disposition or the URL). */
  fileName?: string;
  /** Response Content-Type, if the server sent one. */
  contentType?: string;
}

export interface GucResponse {
  status: number;
  /** Raw response body. */
  body: string;
  /** Alias of `body` for compatibility with old proxy call sites (`data.html`). */
  html: string;
  /** Lower-cased response headers. */
  headers: Record<string, string>;
}

function ensureModule() {
  if (!GucAuth) {
    throw new Error(
      'GucAuth native module is not available. A native (dev/release) Android build is required.'
    );
  }
  return GucAuth;
}

/** Store GUC credentials natively (persisted; used for NTLM re-auth). */
export async function gucSetCredentials(username: string, password: string): Promise<void> {
  await ensureModule().setCredentials(username, password);
}

/** Clear stored GUC credentials natively. */
export async function gucClearCredentials(): Promise<void> {
  try {
    await ensureModule().clearCredentials();
  } catch {
    // ignore
  }
}

/** Clear the persistent session cookie jar (forces a fresh NTLM handshake). */
export async function gucClearSession(): Promise<void> {
  try {
    await ensureModule().clearCookies();
  } catch {
    // ignore
  }
}

/** Whether a live (non-expired) session cookie exists. */
export async function gucHasSession(): Promise<boolean> {
  try {
    return await ensureModule().hasSession();
  } catch {
    return false;
  }
}

/**
 * Perform an authenticated request to a GUC endpoint through the native NTLM
 * client. Redirects are not followed automatically, matching the old proxy.
 */
export async function gucRequest(
  url: string,
  method: string = 'GET',
  body?: string | null,
  headers?: Record<string, string> | null
): Promise<GucResponse> {
  const res = await ensureModule().request(url, method, body ?? null, headers ?? null);
  return {
    status: res.status,
    body: res.body ?? '',
    html: res.body ?? '',
    headers: res.headers ?? {},
  };
}

/**
 * Download a (binary-safe) resource to `destPath` using the authenticated NTLM
 * session. `destPath` may be a plain path or a `file://` URI (e.g. from
 * expo-file-system's cacheDirectory/documentDirectory). Redirects are followed.
 */
export async function gucDownloadFile(
  url: string,
  destPath: string,
  headers?: Record<string, string> | null
): Promise<GucDownloadResult> {
  return ensureModule().downloadFile(url, destPath, headers ?? null);
}

/** Open a local file with the device's default viewer (in-app preview). */
export async function gucOpenFile(filePath: string, mimeType?: string | null): Promise<void> {
  await ensureModule().openFile(filePath, mimeType ?? null);
}

/**
 * Copy a local file into the device's public Downloads folder. Returns the
 * saved MediaStore/content (or `file://`) URI.
 */
export async function gucSaveToDownloads(
  filePath: string,
  fileName: string,
  mimeType?: string | null
): Promise<{ uri: string; fileName: string }> {
  return ensureModule().saveToDownloads(filePath, fileName, mimeType ?? null);
}
