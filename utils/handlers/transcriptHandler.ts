import { AuthManager } from '../auth';
import { PROXY_CONFIG, PROXY_SERVERS } from '../config/proxyConfig';
import { extractViewState } from '../extractors/gradeExtractor';


/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}


/**
 * Make authenticated request through proxy server
 */
async function makeProxyRequest(url: string, method: string = 'GET', body?: any, options?: { allowNon200?: boolean }): Promise<any> {
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

  // Use the first proxy server (no rotation)
  const proxyBaseUrl = PROXY_SERVERS[0];

  const response = await fetch(`${proxyBaseUrl}/proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Proxy request failed: ${response.status} (using ${proxyBaseUrl})`);
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
    throw new Error(`Request failed: ${data.status} (using ${proxyBaseUrl})`);
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
 * Get available study years from transcript page
 */
export async function getAvailableStudyYears(): Promise<{value: string, text: string}[]> {
  const maxRetries = 5;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`=== TRANSCRIPT STUDY YEARS EXTRACTION START (Attempt ${attempt}/${maxRetries}) ===`);
      
      // Add random delay for each attempt
      console.log(`Attempt ${attempt}: Adding bypass delay...`);
      
      // Add random delay to bypass server overload
      const randomDelay = Math.random() * (PROXY_CONFIG.MAX_DELAY - PROXY_CONFIG.MIN_DELAY) + PROXY_CONFIG.MIN_DELAY;
      console.log(`Waiting ${randomDelay}ms to bypass server overload...`);
      await sleep(randomDelay);
      
      console.log(`Attempt ${attempt}: Fetching initial transcript page...`);
      
      // Step 1: Get initial page that returns JavaScript with redirect
      const initialData = await makeProxyRequest(
        'https://apps.guc.edu.eg/student_ext/Grade/Transcript_001.aspx',
        'GET',
        undefined,
        {}
      );
  
      const initialHtml = initialData.html || initialData.body;
      
      console.log(`Attempt ${attempt} - Step 1 Results:`);
      console.log('- Initial response status:', initialData.status || 'unknown');
      console.log('- Initial HTML length:', initialHtml ? initialHtml.length : 0);
      console.log('- Initial HTML preview (first 500 chars):', initialHtml ? initialHtml.substring(0, 500) : 'No HTML');
      
      if (!initialHtml) {
        throw new Error('No HTML content received from proxy');
      }
  
      // Check if response contains JavaScript
      const hasJavaScript = /<script/i.test(initialHtml);
      const hasSToFunction = /sTo\s*\(/i.test(initialHtml);
      console.log(`Attempt ${attempt}: Contains JavaScript:`, hasJavaScript, 'Contains sTo:', hasSToFunction);
      
      if (hasSToFunction) {
        console.log(`Attempt ${attempt}: Full JavaScript content:`, initialHtml.match(/<script[^>]*>[\s\S]*?<\/script>/gi)?.join('\n') || 'No script tags found');
      }
      
      // Step 2: Extract the redirect parameter from the JavaScript
      console.log(`Attempt ${attempt}: Extracting redirect parameter...`);
      
      // Look for sTo('WOL286877') pattern
      let redirectMatch = initialHtml.match(/sTo\('([^']+)'\)/);
      console.log(`Attempt ${attempt}: sTo() pattern match result:`, redirectMatch);
      
      if (!redirectMatch) {
        // Try alternative patterns
        console.log(`Attempt ${attempt}: Trying alternative patterns...`);
        const altPatterns = [
          /sTo\("([^"]+)"\)/,
          /sTo\(['"]([^'"]+)['"]\)/,
          /callBack_func\(['"]([^'"]+)['"]\)/,
          /eval.*?sTo\(['"]([^'"]+)['"]\)/
        ];
        
        let foundMatch = null;
        for (let i = 0; i < altPatterns.length; i++) {
          const altMatch = initialHtml.match(altPatterns[i]);
          console.log(`Attempt ${attempt}: Alternative pattern ${i + 1} result:`, altMatch);
          if (altMatch) {
            foundMatch = altMatch;
            break;
          }
        }
        
        if (!foundMatch) {
          console.error(`Attempt ${attempt}: All pattern matching failed`);
          console.log(`Attempt ${attempt}: Available text around potential matches:`);
          const potentialMatches = initialHtml.match(/[^<>]*sTo[^<>]*/gi);
          if (potentialMatches) {
            potentialMatches.forEach((match: string, index: number) => {
              console.log(`  Match ${index + 1}:`, match.trim());
            });
          }
          throw new Error('Could not extract redirect parameter from JavaScript');
        }
        
        redirectMatch = foundMatch;
      }
      
      const redirectParam = redirectMatch[1];
      console.log(`Attempt ${attempt}: Extracted redirect parameter:`, redirectParam);
      console.log(`Attempt ${attempt}: Parameter length:`, redirectParam.length);
      console.log(`Attempt ${attempt}: Parameter type check (alphanumeric):`, /^[A-Z0-9]+$/.test(redirectParam));
      
      // Add another random delay before the second request
      const secondDelay = Math.random() * (PROXY_CONFIG.MAX_DELAY - PROXY_CONFIG.MIN_DELAY) + PROXY_CONFIG.MIN_DELAY;
      console.log(`Attempt ${attempt}: Waiting ${secondDelay}ms before second request...`);
      await sleep(secondDelay);
      
      // Step 3: Make request to the redirected URL with advanced bypass
      console.log(`Attempt ${attempt}: Making request to redirected URL...`);
      const transcriptUrl = `https://apps.guc.edu.eg/student_ext/Grade/Transcript_001.aspx?v=${redirectParam}`;
      console.log(`Attempt ${attempt}: Constructed URL:`, transcriptUrl);
      
      const transcriptData = await makeProxyRequest(
        transcriptUrl, 
        'GET', 
        undefined, 
        {}
      );
      const html = transcriptData.html || transcriptData.body;
      
      console.log(`Attempt ${attempt} - Step 3 Results:`);
      console.log('- Transcript response status:', transcriptData.status || 'unknown');
      console.log('- Transcript HTML length:', html ? html.length : 0);
      console.log('- Transcript HTML preview (first 1000 chars):', html ? html.substring(0, 1000) : 'No HTML');
      
      if (!html) {
        throw new Error('No HTML content received from transcript page');
      }

      // Check for server overload
      if (isServerOverloaded(html)) {
        console.log('Server overload detected. Performing logout/login cycle instead of waiting...');
        const resetSuccess = await AuthManager.logoutAndLogin();
        if (!resetSuccess) {
          throw new Error('Failed to reset session - logout/login cycle failed');
        }
        console.log('Session reset successful, retrying transcript request...');
        continue; // Retry the attempt
      }
  
      // Check for study year dropdown
      const hasSelectElement = /<select[^>]*>/i.test(html);
      const hasOptionElements = /<option[^>]*>/i.test(html);
      const hasStudyYearText = /study\s*year/i.test(html);
      
      console.log(`Attempt ${attempt}: Contains select elements:`, hasSelectElement);
      console.log(`Attempt ${attempt}: Contains option elements:`, hasOptionElements);
      console.log(`Attempt ${attempt}: Contains "study year" text:`, hasStudyYearText);
      
      if (hasSelectElement) {
        const selectElements = html.match(/<select[^>]*>[\s\S]*?<\/select>/gi);
        console.log(`Attempt ${attempt}: Number of select elements found:`, selectElements ? selectElements.length : 0);
        if (selectElements) {
          selectElements.forEach((select: string, index: number) => {
            console.log(`  Select ${index + 1} preview:`, select.substring(0, 200) + '...');
          });
        }
      }
  
      // Step 4: Extract study year options from dropdown
      console.log(`Attempt ${attempt}: Extracting study year options...`);
      
      const yearPattern = /<option[^>]*value="([^"]*)"[^>]*>([^<]+)<\/option>/gi;
      const years: {value: string, text: string}[] = [];
      
      let match;
      let totalOptions = 0;
      let validOptions = 0;
      
      while ((match = yearPattern.exec(html)) !== null) {
        totalOptions++;
        const value = match[1].trim();
        const text = match[2].trim();
        
        console.log(`Attempt ${attempt}: Option ${totalOptions}: value="${value}", text="${text}"`);
        
        // Skip empty/default option
        if (value && value !== '' && text && text !== 'Choose a study year') {
          years.push({ value, text });
          validOptions++;
          console.log(`Attempt ${attempt}: ✓ Added as valid option`);
        } else {
          console.log(`Attempt ${attempt}: ✗ Skipped (empty or default option)`);
        }
      }
  
      console.log(`Attempt ${attempt} - Final Results:`);
      console.log('- Total options found:', totalOptions);
      console.log('- Valid options extracted:', validOptions);
      console.log('- Years array:', years);
      
      if (years.length > 0) {
        console.log(`=== SUCCESS: Found ${years.length} study years on attempt ${attempt} ===`);
        return years;
      } else {
        console.log(`Attempt ${attempt}: No years found, retrying...`);
        if (attempt === maxRetries) {
          throw new Error('No study years found after all retries');
        }
        continue;
      }
      
    } catch (error: any) {
      console.error(`=== ATTEMPT ${attempt} FAILED ===`);
      console.error('Error details:', error);
      console.error('Error message:', error?.message || 'Unknown error');
      console.error('Error stack:', error?.stack || 'No stack trace');
      
      if (attempt === maxRetries) {
        console.error('=== ALL ATTEMPTS FAILED - GIVING UP ===');
        throw error;
      }
      
      console.log(`Attempt ${attempt} failed, will retry...`);
      
      // Add exponential backoff delay between retries
      const backoffDelay = Math.pow(PROXY_CONFIG.BACKOFF_MULTIPLIER, attempt) * 1000 + Math.random() * 1000;
      console.log(`Waiting ${backoffDelay}ms before retry...`);
      await sleep(backoffDelay);
    }
  }
  
  // This should never be reached, but included for completeness
  throw new Error('Unexpected error: All retries exhausted without result');
}

/**
 * Get transcript data for a specific study year
 */
export async function getTranscriptData(studyYearId: string): Promise<any> {
  const maxRetries = 3;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`=== TRANSCRIPT DATA EXTRACTION START (Attempt ${attempt}/${maxRetries}) ===`);
      console.log(`Fetching transcript data for study year: ${studyYearId}`);
      
      // Add random delay to prevent overload
      const randomDelay = Math.random() * (PROXY_CONFIG.MAX_DELAY - PROXY_CONFIG.MIN_DELAY) + PROXY_CONFIG.MIN_DELAY;
      console.log(`Waiting ${randomDelay}ms before request...`);
      await sleep(randomDelay);
      
      // Step 1: Get initial page that returns JavaScript with redirect
      const initialData = await makeProxyRequest(
        'https://apps.guc.edu.eg/student_ext/Grade/Transcript_001.aspx',
        'GET',
        undefined,
        {}
      );
  
      const initialHtml = initialData.html || initialData.body;
      
      if (!initialHtml) {
        throw new Error('No HTML content received from proxy');
      }
  
      // Extract redirect parameter from JavaScript
      let redirectMatch = initialHtml.match(/sTo\('([^']+)'\)/);
      
      if (!redirectMatch) {
        const altPatterns = [
          /sTo\("([^"]+)"\)/,
          /sTo\(['"]([^'"]+)['"]\)/,
          /callBack_func\(['"]([^'"]+)['"]\)/,
          /eval.*?sTo\(['"]([^'"]+)['"]\)/
        ];
        
        for (const pattern of altPatterns) {
          const altMatch = initialHtml.match(pattern);
          if (altMatch) {
            redirectMatch = altMatch;
            break;
          }
        }
      }
      
      if (!redirectMatch) {
        throw new Error('Could not extract redirect parameter from JavaScript');
      }
      
      const redirectParam = redirectMatch[1];
      console.log(`Extracted redirect parameter: ${redirectParam}`);
      
      // Add delay before second request
      const secondDelay = Math.random() * (PROXY_CONFIG.MAX_DELAY - PROXY_CONFIG.MIN_DELAY) + PROXY_CONFIG.MIN_DELAY;
      console.log(`Waiting ${secondDelay}ms before second request...`);
      await sleep(secondDelay);
      
      // Step 2: Make request to the redirected URL
      const transcriptUrl = `https://apps.guc.edu.eg/student_ext/Grade/Transcript_001.aspx?v=${redirectParam}`;
      console.log(`Making request to: ${transcriptUrl}`);
      
      const transcriptData = await makeProxyRequest(
        transcriptUrl, 
        'GET', 
        undefined, 
        {}
      );
      
      const html = transcriptData.html || transcriptData.body;
      
      if (!html) {
        throw new Error('No HTML content received from transcript page');
      }

      // Check for server overload
      if (isServerOverloaded(html)) {
        console.log('Server overload detected. Performing logout/login cycle instead of waiting...');
        const resetSuccess = await AuthManager.logoutAndLogin();
        if (!resetSuccess) {
          throw new Error('Failed to reset session - logout/login cycle failed');
        }
        console.log('Session reset successful, retrying transcript request...');
        continue; // Retry the attempt
      }
      
      // Step 3: Submit the study year selection
      const viewStateData = extractViewState(html);
      
      if (!viewStateData.__VIEWSTATE || !viewStateData.__VIEWSTATEGENERATOR || !viewStateData.__EVENTVALIDATION) {
        throw new Error('Failed to extract required view state data');
      }
      
      // Add delay before form submission
      const formDelay = Math.random() * (PROXY_CONFIG.MAX_DELAY - PROXY_CONFIG.MIN_DELAY) + PROXY_CONFIG.MIN_DELAY;
      console.log(`Waiting ${formDelay}ms before form submission...`);
      await sleep(formDelay);
      
      // Submit the study year selection
      const formBody = new URLSearchParams({
        ...viewStateData,
        'ctl00$ctl00$ContentPlaceHolderright$ContentPlaceHoldercontent$DropDownListStudyYear': studyYearId,
        '__EVENTTARGET': 'ctl00$ctl00$ContentPlaceHolderright$ContentPlaceHoldercontent$DropDownListStudyYear',
        '__EVENTARGUMENT': '',
      });
      
      console.log('Submitting study year selection...');
      const finalData = await makeProxyRequest(
        'https://apps.guc.edu.eg/student_ext/Grade/Transcript_001.aspx',
        'POST',
        formBody.toString(),
        {}
      );
      
      console.log(`=== SUCCESS: Transcript data retrieved on attempt ${attempt} ===`);
      return finalData;
      
    } catch (error: any) {
      console.error(`=== ATTEMPT ${attempt} FAILED ===`);
      console.error('Error details:', error);
      
      if (attempt === maxRetries) {
        console.error('=== ALL ATTEMPTS FAILED - GIVING UP ===');
        throw error;
      }
      
      console.log(`Attempt ${attempt} failed, will retry...`);
      
      // Add exponential backoff delay between retries
      const backoffDelay = Math.pow(PROXY_CONFIG.BACKOFF_MULTIPLIER, attempt) * 1000 + Math.random() * 1000;
      console.log(`Waiting ${backoffDelay}ms before retry...`);
      await sleep(backoffDelay);
    }
  }
  
  throw new Error('Unexpected error: All retries exhausted without result');
}

/**
 * Reset session and retry transcript request with full logout/login
 */
export async function getAvailableStudyYearsWithReset(): Promise<{value: string, text: string}[]> {
  try {
    console.log('=== ATTEMPTING TRANSCRIPT REQUEST WITH CURRENT SESSION ===');
    // First try with current session
    const result = await getAvailableStudyYears();

    // If successful but returned 0 options, treat as soft-fail and reset session
    if (!Array.isArray(result) || result.length === 0) {
      console.log('=== NO VALID STUDY YEARS FOUND, PERFORMING FULL LOGOUT/LOGIN RESET ===');
      const resetSuccess = await AuthManager.logoutAndLogin();
      if (!resetSuccess) {
        throw new Error('Failed to reset session - logout/login cycle failed');
      }
      console.log('Session reset successful, retrying transcript request...');
      return await getAvailableStudyYears();
    }

    return result;
  } catch (error) {
    console.log('=== INITIAL REQUEST FAILED, PERFORMING FULL LOGOUT/LOGIN RESET ===');
    console.log('Initial error:', error);
    
    // Perform full logout and login cycle
    const resetSuccess = await AuthManager.logoutAndLogin();
    
    if (!resetSuccess) {
      throw new Error('Failed to reset session - logout/login cycle failed');
    }
    
    console.log('Session reset successful, retrying transcript request...');
    
    // Retry with fresh session
    return await getAvailableStudyYears();
  }
}

/**
 * Reset session and retry transcript data request with full logout/login
 */
export async function getTranscriptDataWithReset(studyYearId: string): Promise<any> {
  try {
    console.log('=== ATTEMPTING TRANSCRIPT DATA REQUEST WITH CURRENT SESSION ===');
    // First try with current session
    return await getTranscriptData(studyYearId);
  } catch (error) {
    console.log('=== INITIAL REQUEST FAILED, PERFORMING FULL LOGOUT/LOGIN RESET ===');
    console.log('Initial error:', error);
    
    // Perform full logout and login cycle
    const resetSuccess = await AuthManager.logoutAndLogin();
    
    if (!resetSuccess) {
      throw new Error('Failed to reset session - logout/login cycle failed');
    }
    
    console.log('Session reset successful, retrying transcript data request...');
    
    // Retry with fresh session
    return await getTranscriptData(studyYearId);
  }
}

/**
 * Force session reset with full logout/login - useful for manual session refresh
 */
export async function resetSession(): Promise<void> {
  console.log('=== MANUAL SESSION RESET WITH FULL LOGOUT/LOGIN ===');
  
  const resetSuccess = await AuthManager.logoutAndLogin();
  
  if (resetSuccess) {
    console.log('Manual session reset completed successfully');
  } else {
    throw new Error('Manual session reset failed - logout/login cycle failed');
  }
}