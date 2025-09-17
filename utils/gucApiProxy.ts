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
  private static async makeProxyRequest(url: string, method: string = 'GET', body?: any, options?: { allowNon200?: boolean, headers?: Record<string, string> }): Promise<any> {
    const sessionCookie = await AuthManager.getSessionCookie();
    const { username, password } = await AuthManager.getCredentials();

    const payload: any = {
      url,
      method,
      cookies: sessionCookie || '',
      body,
    };

    // Add custom headers if provided
    if (options?.headers) {
      payload.headers = options.headers;
    }

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
('Fetching seasons through proxy...');
      
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

(`Found ${seasons.length} seasons`);
      return seasons;
    } catch (error) {
('Error fetching available seasons:', error);
      throw error;
    }
  }

  /**
   * Get available courses for a season
   */
  static async getAvailableCourses(seasonId: string): Promise<{value: string, text: string}[]> {
    try {
(`Fetching courses for season ${seasonId}...`);

      // Step 1: Get initial page to extract view state
      const initialData = await this.makeProxyRequest(
        'https://apps.guc.edu.eg/student_ext/Grade/CheckGradePerviousSemester_01.aspx'
      );

      const initialHtml = initialData.html || initialData.body;
('Initial HTML length:', initialHtml.length);
      
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

('Making POST request for courses...');
      const responseData = await this.makeProxyRequest(
        'https://apps.guc.edu.eg/student_ext/Grade/CheckGradePerviousSemester_01.aspx',
        'POST',
        formBody.toString()
      );

      const html = responseData.html || responseData.body;
('Response HTML length:', html.length);
      
      // Try to extract courses
      const courses = extractCourses(html);
      
      // Fallback: If no course dropdown found, extract course names from grade data
      if (courses.length === 0) {
('No courses found in dropdown, trying to extract from grade data...');
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
        
(`Fallback: extracted ${fallbackCourses.length} courses from grade data`);
        return fallbackCourses;
      }
      
      return courses;
    } catch (error) {
('Error fetching courses:', error);
      throw error;
    }
  }

  /**
   * Get previous semester grades for a specific season (and optionally a specific course)
   */
  static async getPreviousGrades(seasonId: string, courseId?: string): Promise<GradeData[]> {
    try {
(`Fetching grades for season ${seasonId}${courseId ? ` and course ${courseId}` : ''}...`);

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
('=== DEBUGGING MIDTERM GRADE EXTRACTION ===');
('Season HTML length:', seasonHtml.length);
('Contains "Mid-Term":', seasonHtml.includes('Mid-Term'));
('Contains "midDg":', seasonHtml.includes('midDg'));
        const seasonGrades = extractGradeData(seasonHtml);
(`Found ${seasonGrades.length} grades for season ${seasonId}`);
        if (seasonGrades.length > 0) {
('Sample grades:', seasonGrades.slice(0, 3));
        }
('==========================================');
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
(`Found ${courseSpecific.length} course-specific grades for course ${courseId} in season ${seasonId}`);
      
      // If no course-specific grades found, return empty array instead of falling back to midterm grades
      if (courseSpecific.length === 0) {
(`No detailed grades available for course ${courseId}, returning empty array`);
      }
      
      return courseSpecific;
    } catch (error) {
('Error fetching previous grades:', error);
      throw error;
    }
  }

  /**
   * Get available courses for current semester
   */
  static async getAvailableCourses(): Promise<{value: string, text: string}[]> {
    try {
      console.log('Fetching available courses...');
      
      const data = await this.makeProxyRequest(
        'https://apps.guc.edu.eg/student_ext/Grade/CheckGrade_01.aspx'
      );

      const html = data.html || data.body;
      
      if (!html) {
        throw new Error('No HTML content received from proxy');
      }

      console.log('=== COURSE EXTRACTION DEBUG ===');
      console.log('HTML length:', html.length);
      console.log('Contains "smCrsLst":', html.includes('smCrsLst'));
      
      const courses = extractCourses(html);
      console.log(`Found ${courses.length} available courses`);
      if (courses.length > 0) {
        console.log('Sample courses:', courses.slice(0, 3));
      }
      console.log('==========================================');
      
      return courses;
    } catch (error) {
      console.log('Error fetching available courses:', error);
      throw error;
    }
  }

  /**
   * Get grades for a specific course
   */
  static async getCourseGrades(courseId: string): Promise<GradeData[]> {
    try {
      console.log(`Fetching grades for course: ${courseId}`);
      
      // First get the initial page to extract view state
      const initialData = await this.makeProxyRequest(
        'https://apps.guc.edu.eg/student_ext/Grade/CheckGrade_01.aspx'
      );
      
      const initialHtml = initialData.html || initialData.body;
      if (!initialHtml) {
        throw new Error('No HTML content received from proxy');
      }
      
      const viewState = extractViewState(initialHtml);
      
      // Extract hidden fields from the initial page
      const studentIdMatch = initialHtml.match(/<input[^>]*name="ctl00\$ctl00\$ContentPlaceHolderright\$ContentPlaceHoldercontent\$HiddenFieldstudent"[^>]*value="([^"]*)"[^>]*>/i);
      const seasonIdMatch = initialHtml.match(/<input[^>]*name="ctl00\$ctl00\$ContentPlaceHolderright\$ContentPlaceHoldercontent\$HiddenFieldseason"[^>]*value="([^"]*)"[^>]*>/i);
      
      const studentId = studentIdMatch ? studentIdMatch[1] : '';
      const seasonId = seasonIdMatch ? seasonIdMatch[1] : '';
      
      console.log('Extracted hidden fields:', { studentId, seasonId });
      console.log('View state extracted:', { 
        viewState: viewState.__VIEWSTATE ? 'present' : 'missing',
        viewStateGenerator: viewState.__VIEWSTATEGENERATOR ? 'present' : 'missing',
        eventValidation: viewState.__EVENTVALIDATION ? 'present' : 'missing'
      });
      
      // Create form data to select the course
      const formData = new URLSearchParams();
      formData.append('__EVENTTARGET', 'ctl00$ctl00$ContentPlaceHolderright$ContentPlaceHoldercontent$smCrsLst');
      formData.append('__EVENTARGUMENT', '');
      formData.append('__LASTFOCUS', '');
      formData.append('__VIEWSTATE', viewState.__VIEWSTATE);
      formData.append('__VIEWSTATEGENERATOR', viewState.__VIEWSTATEGENERATOR);
      formData.append('__EVENTVALIDATION', viewState.__EVENTVALIDATION);
      formData.append('ctl00$ctl00$ContentPlaceHolderright$ContentPlaceHoldercontent$smCrsLst', courseId);
      
      // Add hidden fields if found
      if (studentId) {
        formData.append('ctl00$ctl00$ContentPlaceHolderright$ContentPlaceHoldercontent$HiddenFieldstudent', studentId);
      }
      if (seasonId) {
        formData.append('ctl00$ctl00$ContentPlaceHolderright$ContentPlaceHoldercontent$HiddenFieldseason', seasonId);
      }
      
      console.log('Form data being sent:', formData.toString());
      
      // Submit the form to select the course
      const courseData = await this.makeProxyRequest(
        'https://apps.guc.edu.eg/student_ext/Grade/CheckGrade_01.aspx',
        'POST',
        formData.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      
      const courseHtml = courseData.html || courseData.body;
      if (!courseHtml) {
        throw new Error('No HTML content received after course selection');
      }
      
      console.log('=== COURSE GRADE EXTRACTION DEBUG ===');
      console.log('HTML length after course selection:', courseHtml.length);
      console.log('Contains "Mid-Term Results":', courseHtml.includes('Mid-Term Results'));
      console.log('Contains "Quiz/Assignment":', courseHtml.includes('Quiz/Assignment'));
      console.log('Contains "midDg":', courseHtml.includes('midDg'));
      console.log('Contains "rptrNtt":', courseHtml.includes('rptrNtt'));
      
      // Check if the course was actually selected by looking for the selected option
      const selectedCourseMatch = courseHtml.match(/<option[^>]*selected="selected"[^>]*value="([^"]*)"[^>]*>([^<]*)<\/option>/i);
      if (selectedCourseMatch) {
        console.log('Selected course found:', { value: selectedCourseMatch[1], text: selectedCourseMatch[2] });
      } else {
        console.log('No selected course found in HTML');
      }
      
      // Extract both mid-term results and quiz/assignment grades
      const midtermGrades = extractGradeData(courseHtml);
      const courseGrades = extractCourseGradeData(courseHtml);
      
      const allGrades = [...midtermGrades, ...courseGrades];
      
      console.log(`Found ${midtermGrades.length} mid-term grades and ${courseGrades.length} course grades`);
      console.log('==========================================');
      
      return allGrades;
    } catch (error) {
      console.log('Error fetching course grades:', error);
      throw error;
    }
  }

  /**
   * Get current semester grades
   */
  static async getCurrentGrades(): Promise<GradeData[]> {
    try {
('Fetching current grades...');
      
      const data = await this.makeProxyRequest(
        'https://apps.guc.edu.eg/student_ext/Grade/CheckGrade_01.aspx'
      );

      const html = data.html || data.body;
      
      if (!html) {
        throw new Error('No HTML content received from proxy');
      }

('=== CURRENT GRADES EXTRACTION DEBUG ===');
('HTML length:', html.length);
('Contains "Mid-Term Results":', html.includes('Mid-Term Results'));
('Contains "midDg":', html.includes('midDg'));
      
      const grades = extractGradeData(html);
(`Found ${grades.length} current grades`);
      if (grades.length > 0) {
('Sample grades:', grades.slice(0, 3));
      }
('==========================================');
      
      return grades;
    } catch (error) {
('Error fetching current grades:', error);
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
('Error fetching user id:', e);
      return null;
    }
  }

  /**
   * Get schedule data
   */
  static async getScheduleData(bypassCache: boolean = false): Promise<ScheduleData> {
    // Try to get cached data first (unless bypassing cache)
    if (!bypassCache) {
      const cachedData = await GradeCache.getCachedScheduleData();
      if (cachedData) {
        console.log('[CACHE] Using cached schedule data');
        return cachedData;
      }
    }

    console.log('[CACHE] Fetching fresh schedule data from server...');
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
  
  /**
   * Get exam seats data
   */
  static async getExamSeats(): Promise<string> {
    try {
      console.log('Fetching exam seats data...');
      
      const data = await this.makeProxyRequest(
        'https://apps.guc.edu.eg/student_ext/Exam/ViewExamSeat_01.aspx'
      );

      const html = data.html || data.body;
      
      if (!html) {
        throw new Error('No HTML content received from proxy');
      }

      console.log('Exam seats HTML length:', html.length);
      return html;
    } catch (error) {
      console.error('Error fetching exam seats:', error);
      throw error;
    }
  }

  // New session reset methods
  static getAvailableStudyYearsWithReset = getAvailableStudyYears;
  static getTranscriptDataWithReset = getTranscriptData;
  static resetSession = resetSession;
}