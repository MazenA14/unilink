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

      return seasons;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get season data with courses and midterm grades (new multi-step approach)
   */
  static async getSeasonWithCoursesAndGrades(seasonId: string): Promise<{
    seasonId: string,
    courses: {value: string, text: string}[],
    midtermGrades: GradeData[]
  } | null> {
    try {
      
      // Step 1: Get initial page to extract view state
      const initialData = await this.makeProxyRequest(
        'https://apps.guc.edu.eg/student_ext/Grade/CheckGradePerviousSemester_01.aspx'
      );

      const initialHtml = initialData.html || initialData.body;
      const viewStateData = extractViewState(initialHtml);

      if (!viewStateData.__VIEWSTATE || !viewStateData.__VIEWSTATEGENERATOR || !viewStateData.__EVENTVALIDATION) {
        throw new Error('Failed to extract required view state data');
      }

      // Step 2: Select the season to get courses and midterm grades
      const formBody = new URLSearchParams({
        ...viewStateData,
        'ctl00$ctl00$ContentPlaceHolderright$ContentPlaceHoldercontent$Dropdownlistseason': seasonId,
        '__EVENTTARGET': 'ctl00$ctl00$ContentPlaceHolderright$ContentPlaceHoldercontent$Dropdownlistseason',
        '__EVENTARGUMENT': '',
      });

      const responseData = await this.makeProxyRequest(
        'https://apps.guc.edu.eg/student_ext/Grade/CheckGradePerviousSemester_01.aspx',
        'POST',
        formBody.toString()
      );

      const html = responseData.html || responseData.body;
      
      // Step 3: Extract courses from dropdown
      const courses = extractCourses(html);
      
      // Step 4: Extract midterm grades from the midterm table
      const midtermGrades = extractGradeData(html);
      
      // If no courses found but have midterm grades, create courses from grades
      let finalCourses = courses;
      if (courses.length === 0 && midtermGrades.length > 0) {
        finalCourses = midtermGrades.map((grade, index) => ({
          value: `grade_${index}`,
          text: grade.course
        }));
      }
      
      // Only return season data if it has courses (and potentially grades)
      if (finalCourses.length === 0) {
        return null;
      }
      
      return {
        seasonId,
        courses: finalCourses,
        midtermGrades
      };
      
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all seasons with their courses and midterm grades (new efficient approach)
   */
  static async getAllSeasonsWithData(): Promise<{
    seasonId: string,
    seasonName: string,
    courses: {value: string, text: string}[],
    midtermGrades: GradeData[]
  }[]> {
    try {
      
      // Step 1: Get all available seasons
      const allSeasons = await this.getAvailableSeasons();
      
      // Step 2: Process each season to get courses and grades
      const seasonsWithData: {
        seasonId: string,
        seasonName: string,
        courses: {value: string, text: string}[],
        midtermGrades: GradeData[]
      }[] = [];
      
      for (const season of allSeasons) {
        
        const seasonData = await this.getSeasonWithCoursesAndGrades(season.value);
        
        if (seasonData) {
          seasonsWithData.push({
            seasonId: seasonData.seasonId,
            seasonName: season.text,
            courses: seasonData.courses,
            midtermGrades: seasonData.midtermGrades
          });
        } else {
        }
      }
      
      return seasonsWithData;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get available courses for a season
   */
  static async getAvailableCourses(seasonId: string): Promise<{value: string, text: string}[]> {
    try {

      // Step 1: Get initial page to extract view state
      const initialData = await this.makeProxyRequest(
        'https://apps.guc.edu.eg/student_ext/Grade/CheckGradePerviousSemester_01.aspx'
      );

      const initialHtml = initialData.html || initialData.body;
      
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

      const responseData = await this.makeProxyRequest(
        'https://apps.guc.edu.eg/student_ext/Grade/CheckGradePerviousSemester_01.aspx',
        'POST',
        formBody.toString()
      );

      const html = responseData.html || responseData.body;
      
      // Try to extract courses
      const courses = extractCourses(html);
      
      // Fallback: If no course dropdown found, extract course names from grade data
      if (courses.length === 0) {
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
        
        return fallbackCourses;
      }
      
      return courses;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get detailed grades for a specific course in a season (new implementation)
   */
  static async getDetailedCourseGrades(seasonId: string, courseId: string): Promise<GradeData[]> {
    try {
      
      // Step 1: Get initial page to extract view state
      const initialData = await this.makeProxyRequest(
        'https://apps.guc.edu.eg/student_ext/Grade/CheckGradePerviousSemester_01.aspx'
      );

      const initialHtml = initialData.html || initialData.body;
      const viewStateData = extractViewState(initialHtml);

      if (!viewStateData.__VIEWSTATE || !viewStateData.__VIEWSTATEGENERATOR || !viewStateData.__EVENTVALIDATION) {
        throw new Error('Failed to extract required view state data');
      }

      // Step 2: Select the season first
      const seasonFormBody = new URLSearchParams({
        ...viewStateData,
        'ctl00$ctl00$ContentPlaceHolderright$ContentPlaceHoldercontent$Dropdownlistseason': seasonId,
        '__EVENTTARGET': 'ctl00$ctl00$ContentPlaceHolderright$ContentPlaceHoldercontent$Dropdownlistseason',
        '__EVENTARGUMENT': '',
      });

      const seasonResponse = await this.makeProxyRequest(
        'https://apps.guc.edu.eg/student_ext/Grade/CheckGradePerviousSemester_01.aspx',
        'POST',
        seasonFormBody.toString()
      );

      const seasonHtml = seasonResponse.html || seasonResponse.body;
      const updatedViewState = extractViewState(seasonHtml);

      // Step 3: Select the specific course
      const courseFormBody = new URLSearchParams({
        ...updatedViewState,
        'ctl00$ctl00$ContentPlaceHolderright$ContentPlaceHoldercontent$Dropdownlistseason': seasonId,
        'ctl00$ctl00$ContentPlaceHolderright$ContentPlaceHoldercontent$smCrsLst': courseId,
        '__EVENTTARGET': 'ctl00$ctl00$ContentPlaceHolderright$ContentPlaceHoldercontent$smCrsLst',
        '__EVENTARGUMENT': '',
      });

      const courseResponse = await this.makeProxyRequest(
        'https://apps.guc.edu.eg/student_ext/Grade/CheckGradePerviousSemester_01.aspx',
        'POST',
        courseFormBody.toString()
      );

      const courseHtml = courseResponse.html || courseResponse.body;
      
      // Step 4: Extract detailed course grades from Quiz/Assignment table
      const detailedGrades = extractCourseGradeData(courseHtml);
      
      return detailedGrades;
    } catch (error) {
      return [];
    }
  }

  /**
   * Get previous semester grades for a specific season (and optionally a specific course)
   */
  static async getPreviousGrades(seasonId: string, courseId?: string): Promise<GradeData[]> {
    try {

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
        const seasonGrades = extractGradeData(seasonHtml);
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
      
      // If no course-specific grades found, return empty array instead of falling back to midterm grades
      if (courseSpecific.length === 0) {
      }
      
      return courseSpecific;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get available courses for current semester
   */
  static async getAvailableCourses(): Promise<{value: string, text: string}[]> {
    try {
      
      const data = await this.makeProxyRequest(
        'https://apps.guc.edu.eg/student_ext/Grade/CheckGrade_01.aspx'
      );

      const html = data.html || data.body;
      
      if (!html) {
        throw new Error('No HTML content received from proxy');
      }

      
      const courses = extractCourses(html);
      
      return courses;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get grades for a specific course
   */
  static async getCourseGrades(courseId: string): Promise<GradeData[]> {
    try {
      
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
      
      
      // Check if the course was actually selected by looking for the selected option
      const selectedCourseMatch = courseHtml.match(/<option[^>]*selected="selected"[^>]*value="([^"]*)"[^>]*>([^<]*)<\/option>/i);
      if (selectedCourseMatch) {
      } else {
      }
      
      // Extract both mid-term results and quiz/assignment grades
      const midtermGrades = extractGradeData(courseHtml);
      const courseGrades = extractCourseGradeData(courseHtml);
      
      const allGrades = [...midtermGrades, ...courseGrades];
      
      
      return allGrades;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get current semester grades
   */
  static async getCurrentGrades(): Promise<GradeData[]> {
    try {
      
      const data = await this.makeProxyRequest(
        'https://apps.guc.edu.eg/student_ext/Grade/CheckGrade_01.aspx'
      );

      const html = data.html || data.body;
      
      if (!html) {
        throw new Error('No HTML content received from proxy');
      }

      
      const grades = extractGradeData(html);
      
      return grades;
    } catch (error) {
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
        return cachedData;
      }
    }

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
      
      const data = await this.makeProxyRequest(
        'https://apps.guc.edu.eg/student_ext/Exam/ViewExamSeat_01.aspx'
      );

      const html = data.html || data.body;
      
      if (!html) {
        throw new Error('No HTML content received from proxy');
      }

      return html;
    } catch (error) {
      throw error;
    }
  }

  // New session reset methods
  static getAvailableStudyYearsWithReset = getAvailableStudyYears;
  static getTranscriptDataWithReset = getTranscriptData;
  static resetSession = resetSession;
}