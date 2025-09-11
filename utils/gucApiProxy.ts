import { AuthManager } from './auth';
import { extractCourseGradeData, extractCourses, extractGradeData, extractViewState } from './extractors/gradeExtractor';
import { GradeCache } from './gradeCache';
import { getOutstandingPayments, payOutstanding } from './handlers/paymentHandler';
import { getScheduleData } from './handlers/scheduleHandler';
import { getAvailableStudyYears, getTranscriptData, resetSession } from './handlers/transcriptHandler';
import { GradeData, ScheduleData } from './types/gucTypes';

export { GradeData, PaymentItem, ScheduleClass, ScheduleData, ScheduleDay, ViewStateData } from './types/gucTypes';

export class GUCAPIProxy {
  private static PROXY_BASE_URL = 'https://guc-connect-login.vercel.app/api';

  /**
   * Make authenticated request through proxy server
   */
  private static async makeProxyRequest(url: string, method: string = 'GET', body?: any, options?: { allowNon200?: boolean }): Promise<any> {
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

    const response = await fetch(`${this.PROXY_BASE_URL}/proxy`, {
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
   * Get available seasons from the dropdown
   */
  static async getAvailableSeasons(): Promise<{value: string, text: string}[]> {
    try {
      console.log('Fetching seasons through proxy...');
      
      const data = await this.makeProxyRequest(
        'https://apps.guc.edu.eg/student_ext/Grade/CheckGradePerviousSemester_01.aspx'
      );

      const html = data.html || data.body;
      
      if (!html) {
        throw new Error('No HTML content received from proxy');
      }

      // Extract season options from dropdown
      const seasonPattern = /<option[^>]*value="([^"]*)"[^>]*>([^<]+)<\/option>/gi;
      const seasons: {value: string, text: string}[] = [];
      
      let match;
      while ((match = seasonPattern.exec(html)) !== null) {
        const value = match[1].trim();
        const text = match[2].trim();
        
        // Skip empty/default option
        if (value && value !== '  ' && text && text !== 'Choose a Season') {
          seasons.push({ value, text });
        }
      }

      console.log(`Found ${seasons.length} seasons`);
      return seasons;
    } catch (error) {
      console.error('Error fetching available seasons:', error);
      throw error;
    }
  }

  /**
   * Get available courses for a season
   */
  static async getAvailableCourses(seasonId: string): Promise<{value: string, text: string}[]> {
    try {
      console.log(`Fetching courses for season ${seasonId}...`);

      // Step 1: Get initial page to extract view state
      const initialData = await this.makeProxyRequest(
        'https://apps.guc.edu.eg/student_ext/Grade/CheckGradePerviousSemester_01.aspx'
      );

      const initialHtml = initialData.html || initialData.body;
      console.log('Initial HTML length:', initialHtml.length);
      
      const viewStateData = extractViewState(initialHtml);

      if (!viewStateData.__VIEWSTATE || !viewStateData.__VIEWSTATEGENERATOR || !viewStateData.__EVENTVALIDATION) {
        throw new Error('Failed to extract required view state data');
      }

      // Step 2: Make POST request to get courses for the season
      const formBody = new URLSearchParams({
        ...viewStateData,
        'ctl00$ctl00$ContentPlaceHolderright$ContentPlaceHoldercontent$Dropdownlistseason': seasonId,
        '__EVENTTARGET': 'ctl00$ctl00$ContentPlaceHolderright$ContentPlaceHoldercontent$Dropdownlistseason',
        '__EVENTARGUMENT': '',
      });

      console.log('Making POST request for courses...');
      const responseData = await this.makeProxyRequest(
        'https://apps.guc.edu.eg/student_ext/Grade/CheckGradePerviousSemester_01.aspx',
        'POST',
        formBody.toString()
      );

      const html = responseData.html || responseData.body;
      console.log('Response HTML length:', html.length);
      
      // Try to extract courses
      const courses = extractCourses(html);
      
      // Fallback: If no course dropdown found, extract course names from grade data
      if (courses.length === 0) {
        console.log('No courses found in dropdown, trying to extract from grade data...');
        const grades = extractGradeData(html);
        const courseMap = new Map<string, string>();
        
        grades.forEach((grade, index) => {
          // Use course name as both value and text for now
          const courseValue = `course_${index}`;
          const courseName = grade.course;
          if (!courseMap.has(courseName)) {
            courseMap.set(courseName, courseValue);
          }
        });
        
        const fallbackCourses = Array.from(courseMap.entries()).map(([courseName, courseValue]) => ({
          value: courseValue,
          text: courseName
        }));
        
        console.log(`Fallback: extracted ${fallbackCourses.length} courses from grade data`);
        return fallbackCourses;
      }
      
      return courses;
    } catch (error) {
      console.error('Error fetching courses:', error);
      throw error;
    }
  }

  /**
   * Get previous semester grades for a specific season (and optionally a specific course)
   */
  static async getPreviousGrades(seasonId: string, courseId?: string): Promise<GradeData[]> {
    try {
      console.log(`Fetching grades for season ${seasonId}${courseId ? ` and course ${courseId}` : ''}...`);

      // Step 1: Get initial page to extract view state
      const initialData = await this.makeProxyRequest(
        'https://apps.guc.edu.eg/student_ext/Grade/CheckGradePerviousSemester_01.aspx'
      );

      const initialHtml = initialData.html || initialData.body;
      const viewStateData = extractViewState(initialHtml);

      if (!viewStateData.__VIEWSTATE || !viewStateData.__VIEWSTATEGENERATOR || !viewStateData.__EVENTVALIDATION) {
        throw new Error('Failed to extract required view state data');
      }

      // Step 2: First select the season to populate course dropdown
      const seasonFormBody = new URLSearchParams();
      seasonFormBody.append('ctl00$ctl00$ContentPlaceHolderright$ContentPlaceHoldercontent$Dropdownlistseason', seasonId);
      seasonFormBody.append('__VIEWSTATE', viewStateData.__VIEWSTATE);
      seasonFormBody.append('__VIEWSTATEGENERATOR', viewStateData.__VIEWSTATEGENERATOR);
      seasonFormBody.append('__EVENTVALIDATION', viewStateData.__EVENTVALIDATION);
      seasonFormBody.append('__EVENTTARGET', 'ctl00$ctl00$ContentPlaceHolderright$ContentPlaceHoldercontent$Dropdownlistseason');
      seasonFormBody.append('__EVENTARGUMENT', '');

      const seasonPost = await this.makeProxyRequest(
        'https://apps.guc.edu.eg/student_ext/Grade/CheckGradePerviousSemester_01.aspx',
        'POST',
        seasonFormBody.toString()
      );

      const seasonHtml = seasonPost.html || seasonPost.body;

      // If no specific course requested, return mid-term (season) results
      if (!courseId) {
        console.log('=== DEBUGGING MIDTERM GRADE EXTRACTION ===');
        console.log('Season HTML length:', seasonHtml.length);
        console.log('Contains "Mid-Term":', seasonHtml.includes('Mid-Term'));
        console.log('Contains "midDg":', seasonHtml.includes('midDg'));
        const seasonGrades = extractGradeData(seasonHtml);
        console.log(`Found ${seasonGrades.length} grades for season ${seasonId}`);
        if (seasonGrades.length > 0) {
          console.log('Sample grades:', seasonGrades.slice(0, 3));
        }
        console.log('==========================================');
        return seasonGrades;
      }

      // Step 3: Select the specific course using the correct parameter name (smCrsLst)
      const updatedVS = extractViewState(seasonHtml);

      const courseFormBody = new URLSearchParams();
      courseFormBody.append('ctl00$ctl00$ContentPlaceHolderright$ContentPlaceHoldercontent$Dropdownlistseason', seasonId);
      courseFormBody.append('ctl00$ctl00$ContentPlaceHolderright$ContentPlaceHoldercontent$smCrsLst', courseId);
      courseFormBody.append('__VIEWSTATE', updatedVS.__VIEWSTATE);
      courseFormBody.append('__VIEWSTATEGENERATOR', updatedVS.__VIEWSTATEGENERATOR);
      courseFormBody.append('__EVENTVALIDATION', updatedVS.__EVENTVALIDATION);
      courseFormBody.append('__EVENTTARGET', 'ctl00$ctl00$ContentPlaceHolderright$ContentPlaceHoldercontent$smCrsLst');
      courseFormBody.append('__EVENTARGUMENT', '');

      const coursePost = await this.makeProxyRequest(
        'https://apps.guc.edu.eg/student_ext/Grade/CheckGradePerviousSemester_01.aspx',
        'POST',
        courseFormBody.toString()
      );

      const courseHtml = coursePost.html || coursePost.body;
      // Only extract course-specific items (Quiz/Assignment table). Don't fallback to mid-term table.
      const courseSpecific = extractCourseGradeData(courseHtml);
      console.log(`Found ${courseSpecific.length} course-specific grades for course ${courseId} in season ${seasonId}`);
      
      // If no course-specific grades found, return empty array instead of falling back to midterm grades
      if (courseSpecific.length === 0) {
        console.log(`No detailed grades available for course ${courseId}, returning empty array`);
      }
      
      return courseSpecific;
    } catch (error) {
      console.error('Error fetching previous grades:', error);
      throw error;
    }
  }

  /**
   * Get current semester grades
   */
  static async getCurrentGrades(): Promise<GradeData[]> {
    try {
      console.log('Fetching current grades...');
      
      const data = await this.makeProxyRequest(
        'https://apps.guc.edu.eg/student_ext/Grade/CheckGrade_01.aspx'
      );

      const html = data.html || data.body;
      
      if (!html) {
        throw new Error('No HTML content received from proxy');
      }

      console.log('=== CURRENT GRADES EXTRACTION DEBUG ===');
      console.log('HTML length:', html.length);
      console.log('Contains "Mid-Term Results":', html.includes('Mid-Term Results'));
      console.log('Contains "midDg":', html.includes('midDg'));
      
      const grades = extractGradeData(html);
      console.log(`Found ${grades.length} current grades`);
      if (grades.length > 0) {
        console.log('Sample grades:', grades.slice(0, 3));
      }
      console.log('==========================================');
      
      return grades;
    } catch (error) {
      console.error('Error fetching current grades:', error);
      throw error;
    }
  }

  /**
   * Fetch the profile page and extract the Uniq-App-No value
   */
  static async getUserId(): Promise<string | null> {
    try {
      const data = await this.makeProxyRequest('https://apps.guc.edu.eg/student_ext/index.aspx');
      const html = data.html || data.body || '';

      // Look for the span with the specific id
      const idMatch = html.match(/<span[^>]*id="ContentPlaceHolderright_ContentPlaceHoldercontent_LabelUniqAppNo"[^>]*>([^<]+)<\/span>/i);
      if (idMatch && idMatch[1]) {
        return idMatch[1].trim();
      }

      // Fallback: search by label text nearby
      const liBlockMatch = html.match(/<li[^>]*class="list-group-item"[\s\S]*?Uniq-App-No[\s\S]*?<span[^>]*>([^<]+)<\/span>[\s\S]*?<\/li>/i);
      if (liBlockMatch && liBlockMatch[1]) {
        return liBlockMatch[1].trim();
      }

      return null;
    } catch (e) {
      console.error('Error fetching user id:', e);
      return null;
    }
  }

  /**
   * Get schedule data
   */
  static async getScheduleData(): Promise<ScheduleData> {
    // Try to get cached data first
    const cachedData = await GradeCache.getCachedScheduleData();
    if (cachedData) {
      console.log('[CACHE] Using cached schedule data');
      return cachedData;
    }

    console.log('[CACHE] No valid cached schedule data, fetching from server...');
    const freshData = await getScheduleData();
    
    // Cache the fresh data
    await GradeCache.setCachedScheduleData(freshData);
    
    return freshData;
  }

  // Re-export methods from other modules for backward compatibility
  static getAvailableStudyYears = getAvailableStudyYears;
  static getTranscriptData = getTranscriptData;
  static getOutstandingPayments = getOutstandingPayments;
  static payOutstanding = payOutstanding;
  
  // New session reset methods
  static getAvailableStudyYearsWithReset = getAvailableStudyYears;
  static getTranscriptDataWithReset = getTranscriptData;
  static resetSession = resetSession;
}