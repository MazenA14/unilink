/**
 * Collapses concurrent (and optionally recent) calls for the same key into a
 * single promise, so several screens/components asking for the same GUC page
 * at once only hit the (serialized) native client once.
 *
 * - ttlMs = 0: share only while the request is in flight.
 * - ttlMs > 0: also reuse the resolved result for that long.
 * Rejected promises are never reused.
 */
const entries = new Map<string, { promise: Promise<unknown>; settledAt?: number; ttlMs: number }>();

export function sharedRequest<T>(key: string, fn: () => Promise<T>, ttlMs: number = 0): Promise<T> {
  const existing = entries.get(key);
  if (existing) {
    const fresh = existing.settledAt === undefined || Date.now() - existing.settledAt < existing.ttlMs;
    if (fresh) return existing.promise as Promise<T>;
    entries.delete(key);
  }

  const entry: { promise: Promise<T>; settledAt?: number; ttlMs: number } = { promise: undefined as any, ttlMs };
  entry.promise = fn().then(
    (value) => {
      if (ttlMs > 0) entry.settledAt = Date.now();
      else if (entries.get(key) === entry) entries.delete(key);
      return value;
    },
    (error) => {
      if (entries.get(key) === entry) entries.delete(key);
      throw error;
    }
  );
  entries.set(key, entry);
  return entry.promise;
}

/**
 * Drops a completed result so the next call fetches again. A request that is
 * still in flight is kept, since joining it already yields fresh data.
 */
export function invalidateShared(key: string): void {
  const existing = entries.get(key);
  if (existing && existing.settledAt !== undefined) entries.delete(key);
}

let sessionGeneration = 0;
const resetListeners = new Set<() => void>();

/**
 * Drops every shared page/result (they belong to the old session) and notifies
 * listeners, e.g. preloaders forgetting their "recently refreshed" state.
 * Called whenever the native session or credentials are cleared (logout,
 * session expiry), so a new login never reuses the previous account's pages.
 */
export function resetSharedRequests(): void {
  entries.clear();
  sessionGeneration++;
  resetListeners.forEach(listener => listener());
}

/** Bumped on every reset; work started under an older value is stale. */
export function getSessionGeneration(): number {
  return sessionGeneration;
}

export function onSharedRequestsReset(listener: () => void): void {
  resetListeners.add(listener);
}

/** True if the page shows `<option ... selected ... value="value">` (either attribute order). */
export function isOptionSelected(html: string, value: string): boolean {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`<option[^>]*\\bselected\\b[^>]*value="${escaped}"|<option[^>]*value="${escaped}"[^>]*\\bselected\\b`, 'i').test(html);
}
