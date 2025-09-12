import { AuthManager } from '../auth';
import { PROXY_SERVER } from '../config/proxyConfig';
import { parseScheduleData, parseScheduleDataAlternative } from '../parsers/scheduleParser';
import { parseScheduleDataSimple } from '../parsers/simpleScheduleParser';
import { ScheduleData } from '../types/gucTypes';

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
 * Get schedule data from GUC scheduling page
 */
export async function getScheduleData(): Promise<ScheduleData> {
  let attempt = 0;
  const maxAttempts = 3;
  const maxRedirects = 5;
  
  while (attempt < maxAttempts) {
    attempt++;
    let redirectCount = 0;
    
    try {
      console.log(`=== SCHEDULE DATA ATTEMPT ${attempt} ===`);
      console.log('Loading schedule data...');
      
      // Get initial page
      console.log('Step 1: Getting initial scheduling page...');
      const initialData = await makeProxyRequest('https://apps.guc.edu.eg/student_ext/Scheduling/GroupSchedule.aspx');
      const initialHtml = initialData.html || initialData.body;
      
      if (!initialHtml) throw new Error('No HTML content received');
      
      // Check for server overload
      if (isServerOverloaded(initialHtml)) {
        if (attempt < maxAttempts) {
          console.log(`Server overload detected (attempt ${attempt}), resetting session...`);
          await AuthManager.logoutAndLogin();
          continue;
        } else {
          throw new Error('Server overload persists after all attempts');
        }
      }
      
      // Check if we need to follow redirects
      let currentUrl = 'https://apps.guc.edu.eg/student_ext/Scheduling/GroupSchedule.aspx';
      let html = initialHtml;
      
      if (isRedirectResponse(html)) {
        console.log('Step 2: Following redirects...');
        
        while (redirectCount < maxRedirects) {
          console.log(`Step 2.${redirectCount + 1}: Following redirect to: ${currentUrl}`);
          
          // Extract redirect parameter
          const redirectParam = extractRedirectParam(html);
          console.log(`Redirect parameter: ${redirectParam}`);
          
          // Update URL with redirect parameter
          currentUrl = `https://apps.guc.edu.eg/student_ext/Scheduling/GroupSchedule.aspx?v=${redirectParam}`;
          
          // Make request to redirected URL
          const redirectData = await makeProxyRequest(currentUrl);
          html = redirectData.html || redirectData.body;
          
          if (!html) throw new Error('No HTML content from redirect');
          
          // Check for server overload
          if (isServerOverloaded(html)) {
            console.log('Server overload detected during redirect, breaking redirect loop');
            throw new Error('Server overload detected during redirect');
          }
          
          // Check if we got another redirect
          if (isRedirectResponse(html)) {
            redirectCount++;
            console.log(`Redirect ${redirectCount}/${maxRedirects} detected`);
            
            if (redirectCount >= maxRedirects) {
              throw new Error(`Maximum redirect limit (${maxRedirects}) reached`);
            }
            continue;
          }
          
          // We got the actual page, break out of redirect loop
          console.log('Successfully reached schedule page (no more redirects)');
          break;
        }
      }
      
      // Check for server overload one more time
      if (isServerOverloaded(html)) {
        if (attempt < maxAttempts) {
          console.log(`Server overload detected (attempt ${attempt}), resetting session...`);
          await AuthManager.logoutAndLogin();
          continue;
        } else {
          throw new Error('Server overload persists after all attempts');
        }
      }
      
      // Parse the schedule data
      console.log('Step 3: Parsing schedule data...');
      let scheduleData: ScheduleData;
      
      try {
        // Try the new simple parser first
        scheduleData = parseScheduleDataSimple(html);
        console.log('Simple parser succeeded');
      } catch (parseError) {
        console.log('Simple parser failed, trying original parser...');
        try {
          scheduleData = parseScheduleData(html);
        } catch (parseError2) {
          console.log('Primary parser failed, trying alternative parser...');
          scheduleData = parseScheduleDataAlternative(html);
        }
      }
      
      console.log('=== SCHEDULE DATA RETRIEVED SUCCESSFULLY ===');
      console.log(`Total redirects followed: ${redirectCount}`);
      console.log(`Found ${scheduleData.days.length} days in schedule`);
      
      return scheduleData;
      
    } catch (error: any) {
      console.error(`=== ATTEMPT ${attempt} FAILED ===`);
      console.error(`Error: ${error.message}`);
      console.error(`Redirects attempted: ${redirectCount}`);
      
      if (attempt < maxAttempts) {
        console.log('Resetting session and retrying...');
        await AuthManager.logoutAndLogin();
      } else {
        throw error;
      }
    }
  }
  
  throw new Error('All attempts failed');
}
