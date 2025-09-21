import { AuthManager } from '../auth';
import { PROXY_SERVER } from '../config/proxyConfig';
import { parseScheduleData, parseScheduleDataAlternative } from '../parsers/scheduleParser';
import { parseScheduleDataSimple } from '../parsers/simpleScheduleParser';
import { ScheduleData } from '../types/gucTypes';

// Vercel endpoint for Cheerio-based parsing
const VERCEL_PARSER_ENDPOINT = 'https://guc-connect-login.vercel.app/api/schedule-parser';

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
 * Parse schedule data using the Vercel Cheerio parser
 */
async function parseScheduleWithVercel(html: string): Promise<ScheduleData> {
  try {
    const response = await fetch(VERCEL_PARSER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ html }),
    });

    if (!response.ok) {
      throw new Error(`Vercel parser request failed: ${response.status}`);
    }

    const result = await response.json();
    
    // Log the JSON response to terminal
    console.log('📋 Vercel Parser JSON Response:');
    console.log(JSON.stringify(result, null, 2));
    
    // Convert the new format to your app's expected format
    const scheduleData = convertVercelResponseToScheduleData(result);
    
    return scheduleData;
  } catch (error: any) {
    console.error('Vercel parser error:', error);
    throw new Error(`Vercel parsing failed: ${error.message}`);
  }
}

/**
 * Convert Vercel response format to app's ScheduleData format
 */
function convertVercelResponseToScheduleData(vercelResponse: any): ScheduleData {
  const days: any[] = [];
  const dayNames = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
  
  dayNames.forEach(dayName => {
    const dayData = vercelResponse[dayName];
    if (!dayData) return;
    
    const periods = {
      first: convertPeriodDataArray(dayData[0]),
      second: convertPeriodDataArray(dayData[1]),
      third: convertPeriodDataArray(dayData[2]),
      fourth: convertPeriodDataArray(dayData[3]),
      fifth: convertPeriodDataArray(dayData[4])
    };
    
    const isFree = !Object.values(periods).some(period => period !== null && period.length > 0);
    
    days.push({
      dayName,
      periods,
      isFree
    });
  });
  
  return {
    days,
    type: 'personal' as const
  };
}

/**
 * Convert period data array from Vercel format to app format
 */
function convertPeriodDataArray(periodData: any[]): any[] | null {
  if (!periodData || periodData.length === 0) return null;
  
  const convertedPeriods = periodData.map(period => {
    if (period.subject && period.subject.includes('Free')) {
      return null;
    }
    
    // Extract location from subject format like "MCTR 703 Lecture (7MCTR L001)H9"
    const { courseName, room } = extractCourseInfoFromSubject(period.subject || '');
    
    return {
      courseName,
      room: room || period.room || undefined,
      instructor: period.group || undefined,
      slotType: getSlotType(courseName)
    };
  }).filter(period => period !== null);
  
  return convertedPeriods.length > 0 ? convertedPeriods : null;
}

/**
 * Extract course name and room from subject format
 * Example: 'MCTR 703 Lecture (7MCTR L001)H9' -> { courseName: 'MCTR 703 Lecture (7MCTR L001)', room: 'H9' }
 */
function extractCourseInfoFromSubject(subject: string): { courseName: string; room: string | undefined } {
  if (!subject) return { courseName: '', room: undefined };
  
  // Pattern to match room codes at the end (like H9, C3.201, D4.108, etc.)
  // This matches alphanumeric codes that appear at the end of the string
  const roomPattern = /([A-Z]\d+(?:\.\d+)?)$/;
  const match = subject.match(roomPattern);
  
  if (match) {
    const room = match[1];
    const courseName = subject.substring(0, subject.length - room.length);
    return { courseName: courseName.trim(), room };
  }
  
  // If no room pattern found, return the original subject as course name
  return { courseName: subject, room: undefined };
}

/**
 * Determine slot type from course name
 */
function getSlotType(courseName: string): string {
  if (!courseName) return 'Lecture';
  
  const lowerName = courseName.toLowerCase();
  
  if (lowerName.includes('lab')) return 'Lab';
  if (lowerName.includes('tut')) return 'Tutorial';
  if (lowerName.includes('seminar')) return 'Seminar';
  if (lowerName.includes('workshop')) return 'Workshop';
  if (lowerName.includes('project')) return 'Project';
  if (lowerName.includes('thesis')) return 'Thesis';
  
  return 'Lecture';
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
      
      // Get initial page
      const initialData = await makeProxyRequest('https://apps.guc.edu.eg/student_ext/Scheduling/GroupSchedule.aspx');
      const initialHtml = initialData.html || initialData.body;
      
      if (!initialHtml) throw new Error('No HTML content received');
      
      // Check for server overload
      if (isServerOverloaded(initialHtml)) {
        if (attempt < maxAttempts) {
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
        
        while (redirectCount < maxRedirects) {
          
          // Extract redirect parameter
          const redirectParam = extractRedirectParam(html);
          
          // Update URL with redirect parameter
          currentUrl = `https://apps.guc.edu.eg/student_ext/Scheduling/GroupSchedule.aspx?v=${redirectParam}`;
          
          // Make request to redirected URL
          const redirectData = await makeProxyRequest(currentUrl);
          html = redirectData.html || redirectData.body;
          
          if (!html) throw new Error('No HTML content from redirect');
          
          // Check for server overload
          if (isServerOverloaded(html)) {
            throw new Error('Server overload detected during redirect');
          }
          
          // Check if we got another redirect
          if (isRedirectResponse(html)) {
            redirectCount++;
            
            if (redirectCount >= maxRedirects) {
              throw new Error(`Maximum redirect limit (${maxRedirects}) reached`);
            }
            continue;
          }
          
          // We got the actual page, break out of redirect loop
          break;
        }
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
      
      // Parse the schedule data
      let scheduleData: ScheduleData;
      
      try {
        // Try the Vercel Cheerio parser first
        scheduleData = await parseScheduleWithVercel(html);
        console.log('Successfully parsed with Vercel Cheerio parser');
      } catch (vercelError: any) {
        console.warn('Vercel parser failed, falling back to local parsers:', vercelError.message);
        
        try {
          // Fallback to local simple parser
          scheduleData = parseScheduleDataSimple(html);
          console.log('Successfully parsed with local simple parser');
        } catch {
          try {
            scheduleData = parseScheduleData(html);
            console.log('Successfully parsed with local standard parser');
          } catch {
            scheduleData = parseScheduleDataAlternative(html);
            console.log('Successfully parsed with local alternative parser');
          }
        }
      }
      
      return scheduleData;
      
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
