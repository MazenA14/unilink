import { AuthManager } from '../auth';
import { extractViewState } from '../extractors/gradeExtractor';
import { PaymentItem } from '../types/gucTypes';

/**
 * Make authenticated request through proxy server
 */
async function makeProxyRequest(url: string, method: string = 'GET', body?: any, options?: { allowNon200?: boolean }): Promise<any> {
  const PROXY_BASE_URL = 'https://guc-connect-login.vercel.app/api';
  const sessionCookie = await AuthManager.getSessionCookie();
  const { username, password } = await AuthManager.getCredentials();

  const payload: any = {
    url,
    method,
    cookies: sessionCookie || '',
    body,
  };

  // If we have creds, enable NTLM per-request as fallback
  if (username && password) {
    payload.useNtlm = true;
    payload.username = username;
    payload.password = password;
  }

  const response = await fetch(`${PROXY_BASE_URL}/proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Proxy request failed: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.status === 401) {
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

/**
 * Extract outstanding payments from the Financials page HTML
 */
export function extractOutstandingPayments(html: string): PaymentItem[] {
  try {
    const payments: PaymentItem[] = [];

    // Target the specific table by id when possible
    const tableMatch = html.match(/<table[^>]*id="ContentPlaceHolderright_ContentPlaceHoldercontent_DG_PaymentRequest"[^>]*>([\s\S]*?)<\/table>/i);
    const tableHtml = tableMatch ? tableMatch[1] : html;

    // Match table rows excluding the header row (capture optional 6th cell containing Pay link)
    const rowRegex = /<tr[^>]*>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*(?:<td[^>]*>([\s\S]*?)<\/td>)?[\s\S]*?<\/tr>/gi;

    let match: RegExpExecArray | null;
    while ((match = rowRegex.exec(tableHtml)) !== null) {
      const reference = match[1].replace(/<[^>]*>/g, '').trim();
      const description = match[2].replace(/<[^>]*>/g, '').trim();
      const currency = match[3].replace(/<[^>]*>/g, '').trim();
      const amountText = match[4].replace(/<[^>]*>/g, '').trim();
      const dueDate = match[5].replace(/<[^>]*>/g, '').trim();

      // Skip header row by checking for known header names
      const isHeader = /reference/i.test(reference) && /paymentdescription/i.test(description);
      if (isHeader) continue;

      // Normalize amount: remove commas and parse float
      const numericAmount = parseFloat(amountText.replace(/[,\s]/g, ''));
      if (isNaN(numericAmount)) continue;

      // Extract eventTarget from Pay link if present in 6th cell
      let eventTarget: string | undefined = undefined;
      if (match[6]) {
        const cellHtml = match[6];
        // Normalize HTML entities and try both single and double-quoted variants
        const normalized = cellHtml
          .replace(/&#39;/g, "'")
          .replace(/&quot;/g, '"');

        const patterns = [
          /__doPostBack\(\s*'([^']+)'\s*,\s*'[^']*'\s*\)/i,
          /__doPostBack\(\s*"([^"]+)"\s*,\s*"[^"]*"\s*\)/i
        ];

        for (const pattern of patterns) {
          const targetMatch = normalized.match(pattern);
          if (targetMatch && targetMatch[1]) {
            eventTarget = targetMatch[1].trim();
            break;
          }
        }
      }

      payments.push({
        reference,
        description,
        currency,
        amount: numericAmount,
        dueDate,
        eventTarget,
      });
    }

    return payments;
  } catch (error) {
    console.log('Error extracting outstanding payments:', error);
    return [];
  }
}

/**
 * Get outstanding payments (Financials)
 */
export async function getOutstandingPayments(): Promise<PaymentItem[]> {
  try {
    const data = await makeProxyRequest(
      'https://apps.guc.edu.eg/student_ext/Financial/BalanceView_001.aspx'
    );

    const html = data.html || data.body || '';
    if (!html) {
      return [];
    }

    return extractOutstandingPayments(html);
  } catch (error) {
    console.log('Error fetching outstanding payments:', error);
    throw error;
  }
}

/**
 * Trigger WebForms postback to initiate payment for a specific item
 */
export async function payOutstanding(eventTarget: string): Promise<string | null> {
  try {
    // Step 1: GET page to obtain current view state
    const initial = await makeProxyRequest(
      'https://apps.guc.edu.eg/student_ext/Financial/BalanceView_001.aspx'
    );
    const initialHtml = initial.html || initial.body || '';
    const vs = extractViewState(initialHtml);

    // Step 2: POST back with __EVENTTARGET
    const form = new URLSearchParams({
      __VIEWSTATE: vs.__VIEWSTATE,
      __VIEWSTATEGENERATOR: vs.__VIEWSTATEGENERATOR,
      __EVENTVALIDATION: vs.__EVENTVALIDATION,
      __EVENTTARGET: eventTarget,
      __EVENTARGUMENT: '',
    });

    const resp = await makeProxyRequest(
      'https://apps.guc.edu.eg/student_ext/Financial/BalanceView_001.aspx',
      'POST',
      form.toString(),
      { allowNon200: true }
    );

    // Try to extract redirect URL from headers or body
    const headers = resp.headers || {};
    const headerLocation = headers['location'] || headers['Location'];
    if (typeof headerLocation === 'string' && /PaymentOrder\.aspx/i.test(headerLocation)) {
      return headerLocation;
    }

    const html = resp.html || resp.body || '';
    const urlMatch = html.match(/https?:\/\/[^\s"']*PaymentOrder\.aspx[^\s"']*/i);
    if (urlMatch && urlMatch[0]) {
      return urlMatch[0];
    }

    return null;
  } catch (e) {
    console.log('Error initiating payment postback:', e);
    throw e;
  }
}
