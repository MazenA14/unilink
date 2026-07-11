/**
 * Maintenance-mode handling for GUC pages.
 *
 * When a GUC page is taken offline, requests are redirected to
 * `.../student_ext/Main/MessagePage.aspx?Message=...`, whose body carries a
 * human-readable reason in `<span id="LabelMessage">`, e.g.
 *   "Page will be available from 17:00"
 * The wording is consistent; only the time differs. This module detects that
 * page, extracts the message (converting 24h times to 12h), and exposes a typed
 * `MaintenanceError` so callers can fall back to cached data plus a banner
 * instead of treating it as a hard failure.
 */

export const DEFAULT_MAINTENANCE_MESSAGE =
  'This page is temporarily unavailable for maintenance. Please try again later.';

/** Thrown when a GUC request lands on the maintenance MessagePage. */
export class MaintenanceError extends Error {
  readonly isMaintenance = true;
  /** User-facing message (time already converted to 12-hour format). */
  readonly userMessage: string;

  constructor(userMessage: string) {
    super(userMessage);
    this.name = 'MaintenanceError';
    this.userMessage = userMessage;
  }
}

/** Type guard for MaintenanceError that survives async/babel class transforms. */
export function isMaintenanceError(error: unknown): error is MaintenanceError {
  return !!error && typeof error === 'object' && (error as any).isMaintenance === true;
}

/** True if a URL points at GUC's maintenance/message page. */
export function isMaintenanceUrl(url: string | undefined | null): boolean {
  return !!url && /MessagePage\.aspx/i.test(url);
}

/** True if an HTML body is GUC's maintenance/message page. */
export function isMaintenanceHtml(html: string | undefined | null): boolean {
  if (!html) return false;
  return html.includes('id="LabelMessage"') || /MessagePage\.aspx/i.test(html);
}

/** Convert a 24-hour "H:MM"/"HH:MM" token to 12-hour "h:MM AM/PM". */
function to12Hour(time24: string): string {
  const m = time24.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return time24;
  let hours = parseInt(m[1], 10);
  const minutes = m[2];
  if (isNaN(hours) || hours > 23 || parseInt(minutes, 10) > 59) return time24;
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes} ${period}`;
}

/** Replace every 24h time token in a string with its 12h equivalent. */
export function formatMaintenanceTimes(text: string): string {
  return text.replace(/\b(\d{1,2}:\d{2})\b/g, (t) => to12Hour(t));
}

/** Minimal HTML entity decode for the short strings we extract. */
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * Extract the maintenance message, preferring the on-page `LabelMessage` span
 * and falling back to the `Message` query param of the URL. Any 24h times are
 * converted to 12-hour format. Returns {@link DEFAULT_MAINTENANCE_MESSAGE} when
 * nothing usable is found.
 */
export function extractMaintenanceMessage(
  html: string | undefined | null,
  url?: string | null
): string {
  // 1. Preferred: the LabelMessage span in the page body.
  if (html) {
    const span = html.match(/<span[^>]*id="LabelMessage"[^>]*>([\s\S]*?)<\/span>/i);
    if (span && span[1]) {
      const text = decodeEntities(span[1].replace(/<[^>]*>/g, '').trim());
      if (text) return formatMaintenanceTimes(text);
    }
  }

  // 2. Fallback: the Message query parameter in the URL.
  if (url) {
    const q = url.match(/[?&]Message=([^&]+)/i);
    if (q && q[1]) {
      try {
        const decoded = decodeURIComponent(q[1].replace(/\+/g, ' '));
        if (decoded.trim()) return formatMaintenanceTimes(decoded.trim());
      } catch {
        // ignore malformed encoding
      }
    }
  }

  return DEFAULT_MAINTENANCE_MESSAGE;
}
