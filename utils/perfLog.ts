/**
 * Lightweight timing logs to tell network (fetch) time apart from parse time.
 * Filter Metro / logcat output by "[PERF]".
 */
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export function perfSync<T>(label: string, fn: () => T): T {
  const start = now();
  try {
    return fn();
  } finally {
    console.log(`[PERF] parse  ${label}: ${(now() - start).toFixed(1)}ms`);
  }
}

export async function perfAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = now();
  try {
    return await fn();
  } finally {
    console.log(`[PERF] total  ${label}: ${(now() - start).toFixed(1)}ms`);
  }
}

export function perfFetch(method: string, url: string, ms: number, status: number | string, bytes: number) {
  const shortUrl = url.replace(/^https?:\/\//, '').split('?')[0];
  console.log(`[PERF] fetch  ${method} ${shortUrl} -> ${status} in ${ms.toFixed(1)}ms (${(bytes / 1024).toFixed(1)}KB)`);
}

export { now as perfNow };
