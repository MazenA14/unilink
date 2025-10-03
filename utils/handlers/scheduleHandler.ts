import { AuthManager } from '../auth';
import { PROXY_SERVER } from '../config/proxyConfig';
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
 * Send HTML to API and retrieve JSON response
 */
async function sendHtmlToApi(html: string): Promise<any> {
  try {
    const response = await fetch(VERCEL_PARSER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ html }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const result = await response.json();
    
    
    return result;
  } catch (error: any) {
    throw new Error(`API request failed: ${error.message}`);
  }
}

/**
 * Extract schedule data from API JSON response
 */
function extractScheduleFromJson(jsonData: any): ScheduleData {
  const dayNames = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
  const periodKeys = ['first', 'second', 'third', 'fourth', 'fifth'] as const;
  
  const days = dayNames.map(dayName => {
    const dayData = jsonData[dayName];
    if (!dayData || !Array.isArray(dayData)) {
      // If no data for this day, return all free periods
      return {
        dayName,
        periods: {
          first: null,
          second: null,
          third: null,
          fourth: null,
          fifth: null
        },
        isFree: true
      };
    }
    
    const periods: any = {};
    let hasAnyClasses = false;
    
    // Process each period (0-4 corresponds to first-fifth)
    periodKeys.forEach((periodKey, index) => {
      const periodData = dayData[index];
      
      if (!periodData || !Array.isArray(periodData) || periodData.length === 0) {
        periods[periodKey] = null;
        return;
      }
      
      // Filter out "Free" entries and process actual courses
      const courses = periodData
        .filter(course => course.subject && !course.subject.includes('Free'))
        .map(course => extractCourseData(course));
      
      if (courses.length > 0) {
        periods[periodKey] = courses;
        hasAnyClasses = true;
      } else {
        periods[periodKey] = null;
      }
    });
    
    return {
      dayName,
      periods,
      isFree: !hasAnyClasses
    };
  });
  
  return {
    days,
    type: 'personal' as const
  };
}

/**
 * Extract course data from a single course object
 */
function extractCourseData(course: any): any {
  const subject = course.subject || '';
  const group = course.group || '';
  const room = course.room || '';
  
  // Extract slot type from subject
  const slotType = extractSlotTypeFromSubject(subject);
  
  // Extract course name, room, and lecture group
  const { courseName, extractedRoom, lectureGroup } = extractCourseNameAndRoom(subject);
  
  // Use extracted room if available, otherwise use the room field
  const finalRoom = extractedRoom || room || undefined;
  
  // Extract group identifier from the group field (for tutorials/labs)
  const groupIdentifier = extractGroupIdentifier(group);
  
  // For lectures, use the lecture group from parentheses; for others, use the group field
  const finalGroupIdentifier = slotType === 'Lecture' ? lectureGroup : groupIdentifier;
  
  // Create course code with group identifier if available
  const courseCode = finalGroupIdentifier ? `${courseName} - ${finalGroupIdentifier}` : courseName;
  
  return {
    courseName: courseName, // Just the course name without group (e.g., "MCTR 704")
    courseCode: courseCode, // Course code with group identifier (e.g., "MCTR 704 - P031")
    room: finalRoom,
    instructor: group || undefined,
    slotType: slotType
  };
}

/**
 * Extract slot type from subject field
 * Handles formats like: "NETW 502 - 5IET-COMM1 (Lecture)" or "MCTR 702 Lecture"
 */
function extractSlotTypeFromSubject(subject: string): string {
  if (!subject) return 'Lecture';
  
  const lowerSubject = subject.toLowerCase();
  
  // First check for parentheses format: "(Lecture)", "(Tutorial)", etc.
  const parenthesesMatch = lowerSubject.match(/\(([^)]+)\)/);
  if (parenthesesMatch) {
    const typeInParentheses = parenthesesMatch[1].trim();
    if (typeInParentheses.includes('lecture')) return 'Lecture';
    if (typeInParentheses.includes('tut') || typeInParentheses.includes('tutorial')) return 'Tutorial';
    if (typeInParentheses.includes('lab') || typeInParentheses.includes('laboratory')) return 'Lab';
    if (typeInParentheses.includes('practical')) return 'Practical';
    if (typeInParentheses.includes('seminar')) return 'Seminar';
    if (typeInParentheses.includes('workshop')) return 'Workshop';
    if (typeInParentheses.includes('project')) return 'Project';
    if (typeInParentheses.includes('thesis') || typeInParentheses.includes('dissertation')) return 'Thesis';
  }
  
  // Fallback to checking for space-separated format: "Lecture", "Tutorial", etc.
  if (lowerSubject.includes(' lecture')) return 'Lecture';
  if (lowerSubject.includes(' tut') || lowerSubject.includes(' tutorial')) return 'Tutorial';
  if (lowerSubject.includes(' lab') || lowerSubject.includes(' laboratory')) return 'Lab';
  if (lowerSubject.includes(' practical')) return 'Practical';
  if (lowerSubject.includes(' seminar')) return 'Seminar';
  if (lowerSubject.includes(' workshop')) return 'Workshop';
  if (lowerSubject.includes(' project')) return 'Project';
  if (lowerSubject.includes(' thesis') || lowerSubject.includes(' dissertation')) return 'Thesis';
  
  return 'Lecture';
}

/**
 * Extract course name and room from subject string
 * Handles formats like: "MCTR 702 Lecture (7MCTR L001)H10"
 */
function extractCourseNameAndRoom(subject: string): { courseName: string; extractedRoom: string | undefined; lectureGroup: string | undefined } {
  if (!subject) return { courseName: '', extractedRoom: undefined, lectureGroup: undefined };
  
  // Pattern to match room codes at the end (like H10, C3.201, D4.108, etc.)
  // This matches letters followed by numbers, optionally with dots
  const roomPattern = /([A-Z]\d+(?:\.\d+)?)$/;
  const match = subject.match(roomPattern);
  
  let courseName = subject;
  let extractedRoom: string | undefined;
  
  if (match) {
    extractedRoom = match[1];
    courseName = subject.substring(0, subject.length - extractedRoom.length);
  }
  
  // Extract lecture group from parentheses before cleaning
  let lectureGroup: string | undefined;
  const lectureGroupMatch = courseName.match(/\(([^)]*)\)/);
  if (lectureGroupMatch) {
    const groupContent = lectureGroupMatch[1];
    // Extract group identifier like L001 from "7MCTR L001"
    const groupIdMatch = groupContent.match(/([A-Z]\d+)$/);
    if (groupIdMatch) {
      lectureGroup = groupIdMatch[1];
    }
  }
  
  // Clean up course name: remove type suffixes, remove parentheses content, normalize whitespace
  courseName = courseName
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\s*(Lecture|Tut|Lab|Tutorial|Laboratory|Seminar|Workshop|Project|Thesis|Dissertation)\s*/gi, '') // Remove type suffixes
    .replace(/\([^)]*\)/g, '') // Remove parentheses and their content
    .trim();
  
  return { courseName, extractedRoom, lectureGroup };
}


/**
 * Extract group identifier from group string
 */
function extractGroupIdentifier(group: string): string | undefined {
  if (!group) return undefined;
  
  // Pattern to match group identifiers like T031, L001, P031, etc.
  const groupPattern = /([A-Z]\d+)$/;
  const match = group.match(groupPattern);
  
  return match ? match[1] : undefined;
}


/**
 * Create a schedule with all slots free to prevent UI errors
 */
function createFreeSchedule(): ScheduleData {
  const dayNames = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
  
  const days = dayNames.map(dayName => ({
    dayName,
    periods: {
      first: null,
      second: null,
      third: null,
      fourth: null,
      fifth: null
    },
    isFree: true
  }));
  
  return {
    days,
    type: 'personal' as const
  };
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
      
      // Send HTML to API and get JSON response
      let scheduleData: ScheduleData;
      try {
        const jsonResponse = await sendHtmlToApi(html);
        scheduleData = extractScheduleFromJson(jsonResponse);
        
        
      } catch {
        // Fallback to free schedule if API fails
        scheduleData = createFreeSchedule();
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
