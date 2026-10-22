import { AuthManager } from '../auth';
import { makeGucRequest as makeProxyRequest } from '../gucRequest';
import { extractViewState } from '../extractors/gradeExtractor';
import { isOptionSelected, onSharedRequestsReset } from '../sharedRequest';
import {
  MaintenanceError,
  extractMaintenanceMessage,
  isMaintenanceError,
  isMaintenanceHtml,
  isMaintenanceUrl,
} from '../maintenance';
import {
  EvaluationRequiredError,
  isEvaluationRequiredError,
  isEvaluationRequiredHtml,
} from '../evaluationRequired';

const GUC_ORIGIN = 'https://apps.guc.edu.eg';
const TRANSCRIPT_URL = `${GUC_ORIGIN}/student_ext/Grade/Transcript_001.aspx`;

/**
 * Check if response indicates server overload
 */
function isServerOverloaded(html: string): boolean {
  return html.includes('server overload') ||
         html.includes('temporarily paused') ||
         html.includes('refresh the page again after');
}

/** GUC throttling page ("temporarily paused, refresh the page again after ..."). */
class ServerOverloadError extends Error {
  constructor() {
    super("Server is busy right now. Please try again in a moment.");
    this.name = 'ServerOverloadError';
  }
}

/** Pause before each retry so GUC's throttle has time to lift. */
const RETRY_DELAY_MS = 100;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Between retries: wait a few seconds, then re-login for a fresh session. */
async function prepareRetry(): Promise<void> {
  await sleep(RETRY_DELAY_MS);
  await AuthManager.logoutAndLogin();
}

/**
 * Last real transcript page this session reached. Its form fields are enough
 * to POST another year selection directly, skipping the GET + sTo() hops (and
 * the overload page GUC serves when that page is re-requested too soon).
 * Cleared whenever the GUC session is reset.
 */
let lastPage: { html: string; url: string } | null = null;
/**
 * GUC serves the overload page for a second year POST on the same login
 * session; a re-login lifts it. True once this session has served one.
 */
let sessionUsed = false;
/** Background re-login started after a load, so the next one starts fresh. */
let pendingRelogin: Promise<void> | null = null;

onSharedRequestsReset(() => {
  lastPage = null;
  sessionUsed = false;
});

/**
 * Re-login for a fresh session, keeping the held page: it belongs to the same
 * account and GUC accepts its form fields on the new session.
 */
async function reloginKeepingPage(): Promise<void> {
  const held = lastPage;
  const ok = await AuthManager.logoutAndLogin();
  if (ok) {
    lastPage = held;
    sessionUsed = false;
  }
}

/** Fire-and-forget re-login so the next year selection is a single POST. */
function scheduleBackgroundRelogin(): void {
  if (pendingRelogin) return;
  pendingRelogin = reloginKeepingPage()
    .catch(() => {})
    .finally(() => {
      pendingRelogin = null;
    });
}

/** Don't hit GUC while a background re-login is swapping the session cookies. */
async function awaitPendingRelogin(): Promise<void> {
  if (pendingRelogin) await pendingRelogin;
}

function rememberPage(html: string, url: string): void {
  const vs = extractViewState(html);
  if (vs.__VIEWSTATE && vs.__VIEWSTATEGENERATOR && vs.__EVENTVALIDATION) {
    lastPage = { html, url };
  }
}

/**
 * Check if response is a redirect
 */
function isRedirectResponse(html: string): boolean {
  return html.includes('sTo(') ||
         html.includes('callBack_func') ||
         html.includes('eval(function(p,a,c,k,e,d)');
}

/**
 * Extract redirect parameter from JavaScript
 */
function extractRedirectParam(html: string): string {
  const patterns = [
    /sTo\('([^']+)'\)/,
    /sTo\("([^"]+)"\)/,
    /sTo\(['"]([^'"]+)['"]\)/,
    /callBack_func\(['"]([^'"]+)['"]\)/,
    /eval.*?sTo\(['"]([^'"]+)['"]\)/
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }

  throw new Error('Could not extract redirect parameter');
}

/**
 * Resolve a (possibly relative) redirect Location against the current URL.
 */
function resolveRedirectUrl(location: string, base: string): string {
  if (/^https?:\/\//i.test(location)) return location;
  if (location.startsWith('/')) return `${GUC_ORIGIN}${location}`;
  const dir = base.substring(0, base.lastIndexOf('/') + 1);
  return dir + location;
}

/**
 * Fetch the real transcript page, transparently following GUC's HTTP 302/303
 * hops and JS `sTo()` redirects until a 200 landing page is reached.
 *
 * Throws {@link MaintenanceError} if GUC redirects us to the maintenance
 * MessagePage (`.../Main/MessagePage.aspx?Message=...`). Returns the final page
 * HTML and the URL it lives at (the URL is needed as the POST target when
 * selecting a study year).
 */
async function fetchTranscriptPage(): Promise<{ html: string; url: string }> {
  let url = TRANSCRIPT_URL;

  for (let hop = 0; hop < 8; hop++) {
    // allowNon200 so 302s come back for inspection instead of throwing.
    const data = await makeProxyRequest(url, 'GET', undefined, { allowNon200: true });
    const html = data.html || data.body || '';

    // HTTP redirect: inspect the Location header.
    if (data.status === 302 || data.status === 303) {
      const location = data.headers?.location || '';
      if (isMaintenanceUrl(location) || isMaintenanceHtml(html)) {
        throw new MaintenanceError(extractMaintenanceMessage(html, location));
      }
      if (!location) throw new Error(`HTTP ${data.status} with no Location header`);
      url = resolveRedirectUrl(location, url);
      continue;
    }

    if (data.status !== 200) {
      throw new Error(`Request failed: ${data.status}`);
    }

    // Maintenance page served directly with a 200.
    if (isMaintenanceHtml(html)) {
      throw new MaintenanceError(extractMaintenanceMessage(html, url));
    }

    if (isServerOverloaded(html)) {
      throw new ServerOverloadError();
    }

    // GUC JS `sTo()` redirect: extract the token and follow it.
    if (isRedirectResponse(html)) {
      const param = extractRedirectParam(html);
      url = `${TRANSCRIPT_URL}?v=${param}`;
      continue;
    }

    // Real transcript page.
    return { html, url };
  }

  throw new Error('Too many transcript redirects');
}

/**
 * Get available study years from transcript page
 */
export async function getAvailableStudyYears(): Promise<{value: string, text: string}[]> {
  await awaitPendingRelogin();
  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    attempt++;

    try {
      const { html, url } = await fetchTranscriptPage();

      // A pending evaluation blocks the transcript: GUC disables the year
      // dropdown and shows the "You have not evaluated..." message. Surface it
      // so the caller can show a banner instead of a spurious year list.
      if (isEvaluationRequiredHtml(html)) {
        throw new EvaluationRequiredError();
      }

      // Extract study years
      const yearPattern = /<option[^>]*value="([^"]*)"[^>]*>([^<]+)<\/option>/gi;
      const years: {value: string, text: string}[] = [];
      let match;

      while ((match = yearPattern.exec(html)) !== null) {
        const value = match[1].trim();
        const text = match[2].trim();
        if (value && value !== '' && text && text !== 'Choose a study year') {
          years.push({ value, text });
        }
      }

      if (years.length > 0) {
        rememberPage(html, url);
        return years;
      }
      throw new Error('No study years found');

    } catch (error: any) {
      // Maintenance is not an auth problem — re-login won't help, so surface it
      // immediately for the caller to show cached data + a banner. A pending
      // evaluation is the same: re-login won't clear it.
      if (isMaintenanceError(error)) throw error;
      if (isEvaluationRequiredError(error)) throw error;
      if (attempt < maxAttempts) {
        await prepareRetry();
      } else {
        throw error;
      }
    }
  }

  throw new Error('All attempts failed');
}

/**
 * Submit the year-selection form from an already-loaded transcript page.
 * Throws on maintenance, overload, or a non-200 response.
 */
async function postYearSelect(page: { html: string; url: string }, studyYearId: string): Promise<any> {
  const { html, url } = page;

  const viewStateData = extractViewState(html);
  if (!viewStateData.__VIEWSTATE || !viewStateData.__VIEWSTATEGENERATOR || !viewStateData.__EVENTVALIDATION) {
    throw new Error('Failed to extract view state data');
  }

  const formBody = new URLSearchParams({
    ...viewStateData,
    'ctl00$ctl00$ContentPlaceHolderright$ContentPlaceHoldercontent$stdYrLst': studyYearId,
    '__EVENTTARGET': 'ctl00$ctl00$ContentPlaceHolderright$ContentPlaceHoldercontent$stdYrLst',
    '__EVENTARGUMENT': '',
  });

  const finalData = await makeProxyRequest(url, 'POST', formBody.toString(), { allowNon200: true });
  const finalHtml = finalData.html || finalData.body || '';

  // A maintenance redirect can also occur on the POST.
  if (finalData.status === 302 || finalData.status === 303) {
    const location = finalData.headers?.location || '';
    if (isMaintenanceUrl(location) || isMaintenanceHtml(finalHtml)) {
      throw new MaintenanceError(extractMaintenanceMessage(finalHtml, location));
    }
    throw new Error(`Request failed: ${finalData.status}`);
  }
  if (isMaintenanceHtml(finalHtml)) {
    throw new MaintenanceError(extractMaintenanceMessage(finalHtml, url));
  }
  if (isServerOverloaded(finalHtml)) {
    throw new ServerOverloadError();
  }
  if (finalData.status !== 200) {
    throw new Error(`Request failed: ${finalData.status}`);
  }

  // The response is itself a transcript page; keep it for the next selection.
  if (!isRedirectResponse(finalHtml)) rememberPage(finalHtml, url);
  sessionUsed = true;

  return finalData;
}

/**
 * Get transcript data for a specific study year with redirect protection
 */
export async function getTranscriptData(studyYearId: string): Promise<any> {
  await awaitPendingRelogin();
  const data = await loadTranscriptData(studyYearId);
  // This session is now spent; refresh it while the user reads the result.
  scheduleBackgroundRelogin();
  return data;
}

async function loadTranscriptData(studyYearId: string): Promise<any> {
  // Fast path: POST straight from the last page we hold (one request).
  const held = lastPage;
  if (held) {
    // A spent session would just return the overload page; refresh it first.
    if (sessionUsed) {
      try {
        await reloginKeepingPage();
      } catch {
        // Fall through; the POST below will surface any real problem.
      }
    }

    for (let fastTry = 1; fastTry <= 2; fastTry++) {
      try {
        const data = await postYearSelect(held, studyYearId);
        const html = data.html || data.body || '';
        // Only trust a real transcript page showing the requested year.
        if (isRedirectResponse(html) || !isOptionSelected(html, studyYearId)) {
          throw new Error('held page is stale');
        }
        return data;
      } catch (error: any) {
        if (isMaintenanceError(error)) throw error;
        if (!(error instanceof ServerOverloadError) || fastTry === 2) break;
        // Overload: a fresh session lifts it.
        await reloginKeepingPage();
      }
    }
    lastPage = null;
  }

  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    attempt++;

    try {
      // Resolve the real transcript page (follows 302 + sTo() hops, throws
      // MaintenanceError if GUC is under maintenance), then submit the year.
      const page = await fetchTranscriptPage();
      return await postYearSelect(page, studyYearId);

    } catch (error: any) {
      // Maintenance is not an auth problem — surface it immediately.
      if (isMaintenanceError(error)) throw error;
      if (attempt < maxAttempts) {
        await prepareRetry();
      } else {
        throw error;
      }
    }
  }

  throw new Error('All attempts failed');
}

/**
 * Reset session manually
 */
export async function resetSession(): Promise<void> {
  const success = await AuthManager.logoutAndLogin();
  if (!success) {
    throw new Error('Session reset failed');
  }
}
