import { AuthManager } from './auth';
import { gucRequest, GucResponse } from './gucNativeClient';

export interface GucRequestOptions {
  /** Return the response instead of throwing for 302/303 redirects. */
  allowNon200?: boolean;
  /** Extra request headers. */
  headers?: Record<string, string>;
  /** Convenience override for the POST Content-Type header. */
  contentType?: string;
}

/**
 * Shared authenticated GUC request helper. Drop-in replacement for the old
 * per-handler `makeProxyRequest` functions that talked to the Vercel proxy;
 * it now routes through the native on-device NTLM client and returns the same
 * `{ status, body, html, headers }` shape.
 */
export async function makeGucRequest(
  url: string,
  method: string = 'GET',
  body?: string,
  options?: GucRequestOptions
): Promise<GucResponse> {
  const headers: Record<string, string> = { ...(options?.headers || {}) };
  if (options?.contentType) {
    headers['Content-Type'] = options.contentType;
  }

  const data = await gucRequest(
    url,
    method,
    body,
    Object.keys(headers).length ? headers : undefined
  );

  if (data.status === 401) {
    // Session expired: drop the local marker + native cookie jar.
    await AuthManager.clearSessionCookie();
    throw new Error('Session expired. Please login again.');
  }

  if (data.status !== 200) {
    if (options?.allowNon200 && (data.status === 302 || data.status === 303)) {
      return data;
    }
    throw new Error(`Request failed: ${data.status}`);
  }

  return data;
}
