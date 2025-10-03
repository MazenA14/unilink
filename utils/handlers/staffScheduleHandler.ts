import { ScheduleData, ScheduleOption } from '@/components/schedule/types';
import { AuthManager } from '../auth';
import { PROXY_SERVER } from '../config/proxyConfig';
import { extractViewState } from '../extractors/gradeExtractor';
import { parseStaffListHtml, StaffListData } from '../parsers/staffListParser';
import { StaffListCache } from '../staffListCache';

// Vercel endpoint for Cheerio-based parsing
const VERCEL_PARSER_ENDPOINT = 'https://guc-connect-login.vercel.app/api/bulk-schedule-parser';

/**
 * Make authenticated request through proxy server
 */
async function makeProxyRequest(url: string, method: string = 'GET', body?: any, options?: any): Promise<any> {
  const sessionCookie = await AuthManager.getSessionCookie();
  const { username, password } = await AuthManager.getCredentials();

  const payload: any = {
    url,
    method,
    cookies: sessionCookie || '',
    body,
    ...options // Allow passing contentType and other options
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
 * Extract existing selections from the JavaScript-generated dropdowns
 */
function extractExistingSelections(html: string): { courses: string[], staff: string[] } {
  const courses: string[] = [];
  const staff: string[] = [];
  
  // Look for existing course selections in the courses_list div
  const coursesListMatch = html.match(/<div id="courses_list"[^>]*>(.*?)<\/div>/s);
  if (coursesListMatch) {
    const coursesListHtml = coursesListMatch[1];
    const courseSelects = coursesListHtml.match(/<select[^>]*name="course\[\]"[^>]*>.*?<\/select>/gs);
    if (courseSelects) {
      courseSelects.forEach(select => {
        const selectedMatch = select.match(/<option[^>]*value="([^"]*)"[^>]*selected[^>]*>/);
        if (selectedMatch && selectedMatch[1]) {
          courses.push(selectedMatch[1]);
        }
      });
    }
  }
  
  // Look for existing staff selections in the teaching_assistants div
  const staffListMatch = html.match(/<div id="teaching_assistants"[^>]*>(.*?)<\/div>/s);
  if (staffListMatch) {
    const staffListHtml = staffListMatch[1];
    const staffSelects = staffListHtml.match(/<select[^>]*name="ta\[\]"[^>]*>.*?<\/select>/gs);
    if (staffSelects) {
      staffSelects.forEach(select => {
        const selectedMatch = select.match(/<option[^>]*value="([^"]*)"[^>]*selected[^>]*>/);
        if (selectedMatch && selectedMatch[1]) {
          staff.push(selectedMatch[1]);
        }
      });
    }
  }
  
  return { courses, staff };
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
 * Debug HTML response to understand what we received
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function debugHtmlResponse(html: string, type: string, selectionName: string) {}

/**
 * Get staff list data from GUC scheduling page
 * This fetches the list of courses and TAs for staff schedule selection
 */
export async function getStaffListData(bypassCache: boolean = false): Promise<StaffListData> {
  // Check cache first unless bypassing
      if (!bypassCache) {
    try {
      const cachedData = await StaffListCache.getCachedStaffList();
      if (cachedData) {
        return cachedData;
      }
    } catch {}
  }

  let attempt = 0;
  const maxAttempts = 1;
  const maxRedirects = 5;
  
  while (attempt < maxAttempts) {
    attempt++;
    let redirectCount = 0;
    
    try {
      
      
      // Get initial page
      const initialData = await makeProxyRequest('https://apps.guc.edu.eg/student_ext/Scheduling/SearchAcademicScheduled_001.aspx');
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
      let currentUrl = 'https://apps.guc.edu.eg/student_ext/Scheduling/SearchAcademicScheduled_001.aspx';
      let html = initialHtml;
      
      if (isRedirectResponse(html)) {
        while (redirectCount < maxRedirects) {
          // Extract redirect parameter
          const redirectParam = extractRedirectParam(html);
          
          // Update URL with redirect parameter
          currentUrl = `https://apps.guc.edu.eg/student_ext/Scheduling/SearchAcademicScheduled_001.aspx?v=${redirectParam}`;
          
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
      
      // Parse the HTML to extract staff list data
      let staffListData;
      try {
        staffListData = parseStaffListHtml(html);
      } catch {
        
        // Check if this might be a different page structure
        if (html.includes('server overload') || html.includes('temporarily paused')) {
          throw new Error('Server overload detected in response');
        }
        
        throw new Error('Could not parse staff list data from HTML response');
      }
      
      // Cache the data
      try {
        await StaffListCache.cacheStaffList(staffListData);
      } catch {}
      
      return staffListData;
      
    } catch (error: any) {
      
      if (attempt < maxAttempts) {
        await AuthManager.logoutAndLogin();
      } else {
        throw error;
      }
    }
  }
  
  throw new Error('All attempts to fetch staff list failed');
}

/**
 * Get staff options (TAs) for the staff schedule selector
 */
export async function getStaffOptions(bypassCache: boolean = false): Promise<ScheduleOption[]> {
  const staffListData = await getStaffListData(bypassCache);
  return staffListData.tas;
}

/**
 * Get course options for the course schedule selector
 */
export async function getCourseOptions(bypassCache: boolean = false): Promise<ScheduleOption[]> {
  const staffListData = await getStaffListData(bypassCache);
  return staffListData.courses;
}

/**
 * Clear staff list cache (useful for debugging or forced refresh)
 */
export async function clearStaffListCache(): Promise<void> {
  await StaffListCache.clearCache();
}

/**
 * Check if staff list cache is valid
 */
export async function isStaffListCacheValid(): Promise<boolean> {
  return await StaffListCache.isCacheValid();
}

/**
 * Get staff list cache age in days
 */
export async function getStaffListCacheAge(): Promise<number | null> {
  return await StaffListCache.getCacheAge();
}

/**
 * Submit staff/course selection and get schedule data
 * This mimics the "Show Schedule" button press on the GUC website
 */
export async function submitScheduleSelection(
  type: 'staff' | 'course', 
  selectionId: string, 
  selectionName: string
): Promise<any> {
  let attempt = 0;
  const maxAttempts = 1;
  const maxRedirects = 5;
  
  while (attempt < maxAttempts) {
    attempt++;
    let redirectCount = 0;
    
    try {
      // Get initial page - use the same URL pattern as personal schedule
      const initialData = await makeProxyRequest('https://apps.guc.edu.eg/student_ext/Scheduling/SearchAcademicScheduled_001.aspx');
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
      let currentUrl = 'https://apps.guc.edu.eg/student_ext/Scheduling/SearchAcademicScheduled_001.aspx';
      let html = initialHtml;
      
      if (isRedirectResponse(html)) {
        while (redirectCount < maxRedirects) {
          // Extract redirect parameter
          const redirectParam = extractRedirectParam(html);
          
          // Update URL with redirect parameter
          currentUrl = `https://apps.guc.edu.eg/student_ext/Scheduling/SearchAcademicScheduled_001.aspx?v=${redirectParam}`;
          
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
      
      // Extract view state data from the HTML
      const viewState = extractViewState(html);
      
      if (!viewState.__VIEWSTATE || !viewState.__VIEWSTATEGENERATOR || !viewState.__EVENTVALIDATION) {
        throw new Error('Failed to extract view state data from scheduling page');
      }
      
      // This page uses JavaScript-generated dropdowns, so we need to submit directly to "Show Schedule"
      // Extract any existing selections from the page
      const existingSelections = extractExistingSelections(html);
      
      // Create form data for "Show Schedule" button
      const formData = new URLSearchParams();
      formData.append('__EVENTTARGET', 'ctl00$ctl00$ContentPlaceHolderright$ContentPlaceHoldercontent$B_ShowSchedule');
      formData.append('__EVENTARGUMENT', '');
      formData.append('__VIEWSTATE', viewState.__VIEWSTATE);
      formData.append('__VIEWSTATEGENERATOR', viewState.__VIEWSTATEGENERATOR);
      formData.append('__EVENTVALIDATION', viewState.__EVENTVALIDATION);

      // Add existing selections
      existingSelections.courses.forEach(courseId => {
        formData.append('course[]', courseId);
      });
      existingSelections.staff.forEach(staffId => {
        formData.append('ta[]', staffId);
      });
      
      // Add our new selection
      if (type === 'staff') {
        if (!existingSelections.staff.includes(selectionId)) {
          formData.append('ta[]', selectionId);
        }
      } else {
        if (!existingSelections.courses.includes(selectionId)) {
          formData.append('course[]', selectionId);
        }
      }
      
      // Submit directly to "Show Schedule" button
      const scheduleResponse = await makeProxyRequest(
        currentUrl,
        'POST',
        formData.toString(),
        { contentType: 'application/x-www-form-urlencoded' }
      );
      
      const finalHtml = scheduleResponse.html || scheduleResponse.body;
      if (!finalHtml) {
        throw new Error('No HTML content received after schedule submission');
      }
      
      // Check for server overload after form submission
      if (isServerOverloaded(finalHtml)) {
        throw new Error('Server overload detected after form submission');
      }
      
      // Send HTML to API and get JSON response - same as personal schedule
      let scheduleData: ScheduleData;
      try {
        const jsonResponse = await sendHtmlToApi(finalHtml);
        
        scheduleData = extractScheduleFromJson(jsonResponse, type);
        
        // Debug: Check if schedule data makes sense
        // if (scheduleData && scheduleData.days) {
        //   const hasClasses = scheduleData.days.some(day => 
        //     Object.values(day.periods).some(period => period !== null)
        //   );
          
        //   if (hasClasses) {
        //     console.log(`✅ Schedule data received with classes for ${type}: ${selectionName}`);
        //   } else {
        //     console.warn(`⚠️ Schedule data received but no classes found for ${type}: ${selectionName}`);
            
            // Debug: Log more details about the extracted schedule data
            // console.log(`🔍 DEBUG: Extracted schedule data details:`, {
            //   totalDays: scheduleData.days.length,
            //   dayNames: scheduleData.days.map(day => day.dayName),
            //   daysWithData: scheduleData.days.map(day => ({
            //     dayName: day.dayName,
            //     isFree: day.isFree,
            //     periodsWithData: Object.entries(day.periods).filter(([_, period]) => period !== null).length
            //   }))
            // });
        //   }
        // }
      } catch (error) {
        console.error('Error parsing schedule data:', error);
        // Fallback to free schedule if API fails
        scheduleData = createFreeSchedule(type);
      }
      
      return {
        scheduleData,
        type,
        selectionId,
        selectionName
      };
      
    } catch (error: any) {
      if (attempt < maxAttempts) {
        await AuthManager.logoutAndLogin();
      } else {
        throw error;
      }
    }
  }
  
  throw new Error('All attempts to submit schedule selection failed');
}

/**
 * Extract schedule data from API JSON response
 */
function extractScheduleFromJson(jsonData: any, type: 'staff' | 'course'): ScheduleData {
  const dayNames = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
  const periodKeys = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'] as const;
  
  // Handle the Vercel parser response structure
  const scheduleData = jsonData.schedule || jsonData;
  
  const days = dayNames.map(dayName => {
    const dayData = scheduleData[dayName];
    
    if (!dayData || !Array.isArray(dayData)) {
      // If no data for this day, return all free periods
      return {
        dayName,
        periods: {
          first: null,
          second: null,
          third: null,
          fourth: null,
          fifth: null,
          sixth: null,
          seventh: null,
          eighth: null
        },
        isFree: true
      };
    }
    
    const periods: any = {};
    let hasAnyClasses = false;
    
    // Process each period (0-7 corresponds to first-eighth)
    periodKeys.forEach((periodKey, index) => {
      const periodData = dayData[index];
      
      if (!periodData || !Array.isArray(periodData) || periodData.length === 0) {
        periods[periodKey] = null;
        return;
      }
      
      // Filter out "Free" entries and process actual courses
      const courses = periodData
        .filter(course => {
          // Handle both old format (subject) and new format (group)
          const identifier = course.subject || course.group || '';
          const isValid = identifier && !identifier.includes('Free');
          return isValid;
        })
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
    type: type as any
  };
}

/**
 * Submit multiple staff/course selections and get combined schedule data
 * This mimics selecting multiple options from dropdowns and pressing "Show Schedule"
 */
export async function submitMultipleScheduleSelections(
  staffIds: string[], 
  courseIds: string[],
  staffNames: string[],
  courseNames: string[]
): Promise<any> {
  let attempt = 0;
  const maxAttempts = 1;
  const maxRedirects = 5;
  
  while (attempt < maxAttempts) {
    attempt++;
    let redirectCount = 0;
    
    try {
      
      
      // Get initial page
      const initialData = await makeProxyRequest('https://apps.guc.edu.eg/student_ext/Scheduling/SearchAcademicScheduled_001.aspx');
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
      
      // Handle redirects if needed
      let currentUrl = 'https://apps.guc.edu.eg/student_ext/Scheduling/SearchAcademicScheduled_001.aspx';
      let html = initialHtml;
      
      if (isRedirectResponse(html)) {
        while (redirectCount < maxRedirects) {
          const redirectParam = extractRedirectParam(html);
          currentUrl = `https://apps.guc.edu.eg/student_ext/Scheduling/SearchAcademicScheduled_001.aspx?v=${redirectParam}`;
          
          const redirectData = await makeProxyRequest(currentUrl);
          html = redirectData.html || redirectData.body;
          
          if (!html) throw new Error('No HTML content from redirect');
          
          if (isServerOverloaded(html)) {
            throw new Error('Server overload detected during redirect');
          }
          
          if (isRedirectResponse(html)) {
            redirectCount++;
            if (redirectCount >= maxRedirects) {
              throw new Error(`Maximum redirect limit (${maxRedirects}) reached`);
            }
            continue;
          }
          
          break;
        }
      }
      
      // Extract view state data from the HTML
      const viewState = extractViewState(html);
      
      if (!viewState.__VIEWSTATE || !viewState.__VIEWSTATEGENERATOR || !viewState.__EVENTVALIDATION) {
        throw new Error('Failed to extract view state data from scheduling page');
      }
      
      // Create form data for "Show Schedule" button with multiple selections
      const formData = new URLSearchParams();
      formData.append('__EVENTTARGET', 'ctl00$ctl00$ContentPlaceHolderright$ContentPlaceHoldercontent$B_ShowSchedule');
      formData.append('__EVENTARGUMENT', '');
      formData.append('__VIEWSTATE', viewState.__VIEWSTATE);
      formData.append('__VIEWSTATEGENERATOR', viewState.__VIEWSTATEGENERATOR);
      formData.append('__EVENTVALIDATION', viewState.__EVENTVALIDATION);

      // Add multiple course selections
      courseIds.forEach(courseId => {
        formData.append('course[]', courseId);
      });
      
      // Add multiple staff selections
      staffIds.forEach(staffId => {
        formData.append('ta[]', staffId);
      });
      
      
      
      // Submit the form
      const scheduleResponse = await makeProxyRequest(
        currentUrl,
        'POST',
        formData.toString(),
        { contentType: 'application/x-www-form-urlencoded' }
      );
      
      const finalHtml = scheduleResponse.html || scheduleResponse.body;
      if (!finalHtml) {
        throw new Error('No HTML content received after schedule submission');
      }
      
      // Check for server overload after form submission
      if (isServerOverloaded(finalHtml)) {
        throw new Error('Server overload detected after form submission');
      }
      
      // Parse the combined schedule
      let scheduleData: ScheduleData;
      try {
        const jsonResponse = await sendHtmlToApi(finalHtml);
        scheduleData = extractCombinedScheduleFromJson(jsonResponse, staffNames, courseNames);
        
      } catch {
        throw new Error('Failed to parse combined schedule response');
      }
      
      return {
        scheduleData,
        staffSelections: { ids: staffIds, names: staffNames },
        courseSelections: { ids: courseIds, names: courseNames },
        selectionCount: staffIds.length + courseIds.length
      };
      
    } catch (e) {
      if (attempt < maxAttempts) {
        await AuthManager.logoutAndLogin();
        continue;
      }
      
      throw e;
    }
  }
  
  throw new Error('All attempts to submit multiple schedule selections failed');
}

/**
 * Extract combined schedule data from API JSON response
 * This handles schedules that may have overlapping classes from multiple sources
 */
function extractCombinedScheduleFromJson(jsonData: any, staffNames: string[], courseNames: string[]): ScheduleData {
  const dayNames = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
  const periodKeys = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'] as const;
  
  // Handle the Vercel parser response structure
  const scheduleData = jsonData.schedule || jsonData;
  
  const days = dayNames.map(dayName => {
    const dayData = scheduleData[dayName];
    
    if (!dayData || !Array.isArray(dayData)) {
      return {
        dayName,
        periods: {
          first: null,
          second: null,
          third: null,
          fourth: null,
          fifth: null,
          sixth: null,
          seventh: null,
          eighth: null
        },
        isFree: true
      };
    }
    
    const periods: any = {};
    let hasAnyClasses = false;
    
    // Process each period (0-7 corresponds to first-eighth)
    periodKeys.forEach((periodKey, index) => {
      const periodData = dayData[index];
      
      if (!periodData || !Array.isArray(periodData) || periodData.length === 0) {
        periods[periodKey] = null;
        return;
      }
      
      // Filter out "Free" entries and process actual courses
      // For combined schedules, we may have multiple classes in the same period
      const courses = periodData
        .filter(course => {
          // Handle both old format (subject) and new format (group)
          const identifier = course.subject || course.group || '';
          return identifier && !identifier.includes('Free');
        })
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
    type: 'combined' as any, // New type for combined schedules
    metadata: {
      staffSelections: staffNames,
      courseSelections: courseNames,
      totalSelections: staffNames.length + courseNames.length
    }
  };
}

/**
 * Get staff and course options for selection
 */
export async function getStaffAndCourseOptions(bypassCache: boolean = false): Promise<{
  staffOptions: ScheduleOption[],
  courseOptions: ScheduleOption[]
}> {
  const staffListData = await getStaffListData(bypassCache);
  return {
    staffOptions: staffListData.tas,
    courseOptions: staffListData.courses
  };
}

/**
 * Extract course data from a single course object
 * Handles both the old format (subject field) and new format (group field)
 */
function extractCourseData(course: any): any {
  // Handle new API format with 'group' field
  if (course.group && !course.subject) {
    const group = course.group || '';
    const location = course.location || '';
    const staff = course.staff || '';
    
    // Extract slot type from group field
    const slotType = extractSlotTypeFromSubject(group);
    
    // Extract course name and group from the group field
    // Format: "NETW 502 - 5IET-COMM1 (Lecture)"
    const { courseName } = extractCourseNameAndRoom(group);
    
    return {
      courseName: courseName, // Just the course name (e.g., "NETW 502")
      courseCode: group, // Full group string as course code
      room: location,
      instructor: staff,
      slotType: slotType
    };
  }
  
  // Handle old format with 'subject' field (for backward compatibility)
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
function createFreeSchedule(type: 'staff' | 'course'): ScheduleData {
  const dayNames = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
  
  const days = dayNames.map(dayName => ({
    dayName,
    periods: {
      first: null,
      second: null,
      third: null,
      fourth: null,
      fifth: null,
      sixth: null,
      seventh: null,
      eighth: null
    },
    isFree: true
  }));
  
  return {
    days,
    type: type as any
  };
}