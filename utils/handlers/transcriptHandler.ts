import { AuthManager } from '../auth';
import { PROXY_SERVER } from '../config/proxyConfig';
import { extractViewState } from '../extractors/gradeExtractor';

/**
 * Make authenticated request through proxy server
 */
async function makeProxyRequest(url: string, method: string = 'GET', body?: any): Promise<any> {
  const sessionCookie = await AuthManager.getSessionCookie();
  const { username, password } = await AuthManager.getCredentials();

  const payload: any = {
    url,
    method,
    cookies: sessionCookie || '',
    body,
  };

  if (username && password) {
    payload.useNtlm = true;
    payload.username = username;
    payload.password = password;
  }

  const response = await fetch(`${PROXY_SERVER}/proxy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Proxy request failed: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.status === 401) {
    await AuthManager.clearSessionCookie();
    throw new Error('Session expired');
  }

  if (data.status !== 200) {
    throw new Error(`Request failed: ${data.status}`);
  }

  return data;
}

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
 * Get available study years from transcript page
 */
export async function getAvailableStudyYears(): Promise<{value: string, text: string}[]> {
  let attempt = 0;
  const maxAttempts = 3;
  
  while (attempt < maxAttempts) {
    attempt++;
    
    try {
      // Get initial page
      const initialData = await makeProxyRequest('https://apps.guc.edu.eg/student_ext/Grade/Transcript_001.aspx');
      const initialHtml = initialData.html || initialData.body;
      
      if (!initialHtml) throw new Error('No HTML content received');
      
      // Extract redirect parameter
      const redirectParam = extractRedirectParam(initialHtml);
      
      // Get transcript page
      const transcriptUrl = `https://apps.guc.edu.eg/student_ext/Grade/Transcript_001.aspx?v=${redirectParam}`;
      const transcriptData = await makeProxyRequest(transcriptUrl);
      const html = transcriptData.html || transcriptData.body;
      
      if (!html) throw new Error('No HTML content from transcript page');
      
      // Check for server overload
      if (isServerOverloaded(html)) {
        if (attempt < maxAttempts) {
          await AuthManager.logoutAndLogin();
          continue;
        } else {
          throw new Error('Server overload persists after all attempts');
        }
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
        return years;
      }
      
      throw new Error('No study years found');
      
    } catch (error: any) {
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
  const maxRedirects = 5;
  
  while (attempt < maxAttempts) {
    attempt++;
    let redirectCount = 0;
    
    try {
      // Get initial page
      const initialData = await makeProxyRequest('https://apps.guc.edu.eg/student_ext/Grade/Transcript_001.aspx');
      const initialHtml = initialData.html || initialData.body;
      
      if (!initialHtml) throw new Error('No HTML content received');
      
      // Extract redirect parameter
      const redirectParam = extractRedirectParam(initialHtml);
      
      // Follow redirects with protection against infinite loops
      let currentUrl = `https://apps.guc.edu.eg/student_ext/Grade/Transcript_001.aspx?v=${redirectParam}`;
      let html = initialHtml;
      
      while (redirectCount < maxRedirects) {
        const transcriptData = await makeProxyRequest(currentUrl);
        html = transcriptData.html || transcriptData.body;
        
        if (!html) throw new Error('No HTML content from transcript page');
        
        // Check for server overload
        if (isServerOverloaded(html)) {
          throw new Error('Server overload detected during redirect');
        }
        
        // Check if we got another redirect
        if (isRedirectResponse(html)) {
          redirectCount++;
          
          if (redirectCount >= maxRedirects) {
            throw new Error(`Maximum redirect limit (${maxRedirects}) reached. Possible infinite redirect loop.`);
          }
          
          // Extract new redirect parameter
          const newRedirectParam = extractRedirectParam(html);
          currentUrl = `https://apps.guc.edu.eg/student_ext/Grade/Transcript_001.aspx?v=${newRedirectParam}`;
          continue;
        }
        
        // We got the actual page, break out of redirect loop
        break;
      }
      
      if (redirectCount >= maxRedirects) {
        throw new Error(`Maximum redirect limit (${maxRedirects}) reached`);
      }
      
      // Check for server overload one more time
      if (isServerOverloaded(html)) {
        if (attempt < maxAttempts) {
          await AuthManager.logoutAndLogin();
          continue;
        } else {
          throw new Error('Server overload persists after all attempts');
        }
      }
      
      // Extract view state and submit form
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
      
      const finalData = await makeProxyRequest(
        currentUrl,  // ✅ FIXED: Use the URL with redirect parameter, not base URL
        'POST',
        formBody.toString()
      );
      
      return finalData;
      
    } catch (error: any) {
      
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