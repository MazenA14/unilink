export function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Never';

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;

  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Day-granularity relative label for date-only values (e.g. "6/12/2025" or
 * ISO dates): "Today", "Yesterday", "3 days ago", then a short absolute date
 * once it's more than a week old. Falls back to the input if it can't parse.
 */
export function formatRelativeDay(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const date = parseDayString(dateString);
  if (!date) return dateString;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - day.getTime()) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
  if (diffDays >= 7 && diffDays < 14) return 'Last week';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
  });
}

/** Parses "M/D/YYYY" explicitly (locale-independent), otherwise defers to Date. */
export function parseDayString(dateString: string): Date | null {
  const match = dateString.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  const date = match
    ? new Date(parseInt(match[3], 10), parseInt(match[1], 10) - 1, parseInt(match[2], 10))
    : new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}
