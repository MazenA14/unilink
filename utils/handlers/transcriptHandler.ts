import { AuthManager } from '../auth';
import { makeGucRequest as makeProxyRequest } from '../gucRequest';
import { extractViewState } from '../extractors/gradeExtractor';
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
      throw new Error('Server overload detected');
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
  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    attempt++;

    try {
      const { html } = await fetchTranscriptPage();

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

      if (years.length > 0) return years;
      throw new Error('No study years found');

    } catch (error: any) {
      // Maintenance is not an auth problem — re-login won't help, so surface it
      // immediately for the caller to show cached data + a banner. A pending
      // evaluation is the same: re-login won't clear it.
      if (isMaintenanceError(error)) throw error;
      if (isEvaluationRequiredError(error)) throw error;
      if (attempt < maxAttempts) {
        await AuthManager.logoutAndLogin();
      } else {
        throw error;
      }
    }
  }

  throw new Error('All attempts failed');
}

/**
 * Get transcript data for a specific study year with redirect protection
 */
export async function getTranscriptData(studyYearId: string): Promise<any> {
  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    attempt++;

    try {
      // Resolve the real transcript page (follows 302 + sTo() hops, throws
      // MaintenanceError if GUC is under maintenance).
      const { html, url } = await fetchTranscriptPage();

      // Extract view state and submit the year-selection form.
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
      if (finalData.status !== 200) {
        throw new Error(`Request failed: ${finalData.status}`);
      }

      return finalData;

    } catch (error: any) {
      // Maintenance is not an auth problem — surface it immediately.
      if (isMaintenanceError(error)) throw error;
      if (attempt < maxAttempts) {
        await AuthManager.logoutAndLogin();
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
