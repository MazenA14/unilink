import { AuthManager } from './auth';
import { extractCourseGradeData, extractCourses, extractGradeData, extractViewState } from './extractors/gradeExtractor';
import { GradeCache } from './gradeCache';
import { getOutstandingPayments, payOutstanding } from './handlers/paymentHandler';
import { getScheduleData } from './handlers/scheduleHandler';
import { getAvailableStudyYears, getTranscriptData, resetSession } from './handlers/transcriptHandler';
import { GradeData, Instructor, ScheduleData } from './types/gucTypes';

export { GradeData, Instructor, PaymentItem, ScheduleClass, ScheduleData, ScheduleDay, ViewStateData } from './types/gucTypes';

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
    } catch (err) {
      throw err;
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
      
    } catch {
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
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get available courses for a season
   */
  static async getAvailableCoursesWithSeason(seasonId: string): Promise<{value: string, text: string}[]> {
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
    } catch (err) {
      throw err;
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
    } catch {
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
    } catch (err) {
      throw err;
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
    } catch (err) {
      throw err;
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
    } catch (err) {
      throw err;
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
    } catch (err) {
      throw err;
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
    } catch {
      return null;
    }
  }

  /**
   * Get user ID and faculty (major) from the index page
   */
  static async getUserInfo(): Promise<{ userId: string | null; faculty: string | null }> {
    try {
      const data = await this.makeProxyRequest('https://apps.guc.edu.eg/student_ext/index.aspx');
      const html = data.html || data.body || '';

      // Extract user ID
      let userId: string | null = null;
      const idMatch = html.match(/<span[^>]*id="ContentPlaceHolderright_ContentPlaceHoldercontent_LabelUniqAppNo"[^>]*>([^<]+)<\/span>/i);
      if (idMatch && idMatch[1]) {
        userId = idMatch[1].trim();
      } else {
        // Fallback: search by label text nearby
        const liBlockMatch = html.match(/<li[^>]*class="list-group-item"[\s\S]*?Uniq-App-No[\s\S]*?<span[^>]*>([^<]+)<\/span>[\s\S]*?<\/li>/i);
        if (liBlockMatch && liBlockMatch[1]) {
          userId = liBlockMatch[1].trim();
        }
      }

      // Extract faculty (major)
      let faculty: string | null = null;
      const facultyMatch = html.match(/<span[^>]*id="ContentPlaceHolderright_ContentPlaceHoldercontent_Labelfaculty"[^>]*>([^<]+)<\/span>/i);
      if (facultyMatch && facultyMatch[1]) {
        faculty = facultyMatch[1].trim();
      }

      return { userId, faculty };
    } catch {
      return { userId: null, faculty: null };
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
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get list of instructors from the user profile search page
   */
  static async getInstructors(bypassCache: boolean = false): Promise<Instructor[]> {
    try {
      // Try to get cached data first (unless bypassing cache)
      if (!bypassCache) {
        const cachedData = await GradeCache.getCachedInstructorsList();
        if (cachedData) {
          return cachedData;
        }
      }

      const data = await this.makeProxyRequest(
        'https://apps.guc.edu.eg/student_ext/UserProfile/UserProfileSearch.aspx'
      );

      const html = data.html || data.body;
      
      if (!html) {
        throw new Error('No HTML content received from proxy');
      }

      // Extract instructor options from the specific instructor dropdown
      const instructorDropdownMatch = html.match(/<select[^>]*name="ctl00\$ctl00\$ContentPlaceHolderright\$ContentPlaceHoldercontent\$DdlStaffSearch"[^>]*>([\s\S]*?)<\/select>/i);
      
      if (!instructorDropdownMatch) {
        return [];
      }
      
      const instructorDropdownHtml = instructorDropdownMatch[1];
      const instructorPattern = /<option[^>]*value="([^"]*)"[^>]*>([^<]+)<\/option>/gi;
      const instructors: Instructor[] = [];
      
      let match;
      while ((match = instructorPattern.exec(instructorDropdownHtml)) !== null) {
        const value = match[1].trim();
        const name = match[2].trim();
        
        // Skip empty/default option
        if (value && value !== '' && name && name !== 'Choose Staff') {
          instructors.push({ value, name });
        }
      }

      // Cache the fresh data for 3 months
      await GradeCache.setCachedInstructorsList(instructors);
      
      return instructors;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get list of courses from the user profile search page
   */
  static async getCourses(bypassCache: boolean = false): Promise<{value: string, text: string}[]> {
    try {
      // Try to get cached data first (unless bypassing cache)
      if (!bypassCache) {
        const cachedData = await GradeCache.getCachedCoursesList();
        if (cachedData) {
          return cachedData;
        }
      }

      const data = await this.makeProxyRequest(
        'https://apps.guc.edu.eg/student_ext/UserProfile/UserProfileSearch.aspx'
      );

      const html = data.html || data.body;
      
      if (!html) {
        throw new Error('No HTML content received from proxy');
      }

      // Extract course options from the specific course dropdown
      const courseDropdownMatch = html.match(/<select[^>]*name="ctl00\$ctl00\$ContentPlaceHolderright\$ContentPlaceHoldercontent\$DdlCourseSearch"[^>]*>([\s\S]*?)<\/select>/i);
      
      if (!courseDropdownMatch) {
        return [];
      }
      
      const courseDropdownHtml = courseDropdownMatch[1];
      const coursePattern = /<option[^>]*value="([^"]*)"[^>]*>([^<]+)<\/option>/gi;
      const courses: {value: string, text: string}[] = [];
      
      let match;
      while ((match = coursePattern.exec(courseDropdownHtml)) !== null) {
        const value = match[1].trim();
        const text = match[2].trim();
        
        // Skip empty/default option
        if (value && value !== '' && text && text !== 'Choose Course') {
          courses.push({ value, text });
        }
      }

      // Cache the fresh data for 3 months
      await GradeCache.setCachedCoursesList(courses);
      
      return courses;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get instructors for a specific course
   */
  static async getInstructorsByCourse(courseValue: string, bypassCache: boolean = false): Promise<Instructor[]> {
    try {
      // Try to get cached data first (unless bypassing cache)
      if (!bypassCache) {
        const cachedData = await GradeCache.getCachedInstructorsByCourse(courseValue);
        if (cachedData) {
          return cachedData;
        }
      }

      // Step 1: Get initial page to extract view state
      const initialData = await this.makeProxyRequest(
        'https://apps.guc.edu.eg/student_ext/UserProfile/UserProfileSearch.aspx'
      );

      const initialHtml = initialData.html || initialData.body;
      const viewStateData = extractViewState(initialHtml);

      if (!viewStateData.__VIEWSTATE || !viewStateData.__VIEWSTATEGENERATOR || !viewStateData.__EVENTVALIDATION) {
        throw new Error('Failed to extract required view state data');
      }

      // Step 2: Select the course to get instructors
      const formBody = new URLSearchParams({
        ...viewStateData,
        'ctl00$ctl00$ContentPlaceHolderright$ContentPlaceHoldercontent$DdlCourseSearch': courseValue,
        '__EVENTTARGET': 'ctl00$ctl00$ContentPlaceHolderright$ContentPlaceHoldercontent$DdlCourseSearch',
        '__EVENTARGUMENT': '',
      });

      const responseData = await this.makeProxyRequest(
        'https://apps.guc.edu.eg/student_ext/UserProfile/UserProfileSearch.aspx',
        'POST',
        formBody.toString(),
        { allowNon200: true }
      );

      const html = responseData.html || responseData.body;
      
      if (!html) {
        throw new Error('No HTML content received from proxy');
      }

      // Extract instructors from the table that appears after course selection
      const tableMatch = html.match(/<table[^>]*id="ContentPlaceHolderright_ContentPlaceHoldercontent_GvStaff"[^>]*>([\s\S]*?)<\/table>/i);
      
      if (!tableMatch) {
        return [];
      }
      
      const tableHtml = tableMatch[1];
      const instructorPattern = /<tr[^>]*>[\s\S]*?<td[^>]*>([^<]+)<\/td>[\s\S]*?<\/tr>/gi;
      const instructors: Instructor[] = [];
      
      let match;
      while ((match = instructorPattern.exec(tableHtml)) !== null) {
        const name = match[1].trim();
        
        // Skip header row and empty rows
        if (name && name !== 'Staff Full Name' && name !== 'View Profile') {
          instructors.push({ value: name, name });
        }
      }

      // Cache the fresh data for 1 hour (shorter cache since it's course-specific)
      await GradeCache.setCachedInstructorsByCourse(courseValue, instructors);
      
      return instructors;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get instructor profile data from course instructor table
   */
  static async getCourseInstructorProfile(courseValue: string, instructorName: string): Promise<{
    name: string;
    email?: string;
    office?: string;
    courses?: string;
  } | null> {
    try {
      // Step 1: Get the course instructor page to extract view state and find the instructor button
      const courseData = await this.makeProxyRequest(
        'https://apps.guc.edu.eg/student_ext/UserProfile/UserProfileSearch.aspx'
      );

      const courseHtml = courseData.html || courseData.body;
      const viewStateData = extractViewState(courseHtml);

      if (!viewStateData.__VIEWSTATE || !viewStateData.__VIEWSTATEGENERATOR || !viewStateData.__EVENTVALIDATION) {
        throw new Error('Failed to extract required view state data');
      }

      // Step 2: Select the course to get the instructor table
      const courseFormBody = new URLSearchParams({
        ...viewStateData,
        'ctl00$ctl00$ContentPlaceHolderright$ContentPlaceHoldercontent$DdlCourseSearch': courseValue,
        '__EVENTTARGET': 'ctl00$ctl00$ContentPlaceHolderright$ContentPlaceHoldercontent$DdlCourseSearch',
        '__EVENTARGUMENT': '',
      });

      const courseResponseData = await this.makeProxyRequest(
        'https://apps.guc.edu.eg/student_ext/UserProfile/UserProfileSearch.aspx',
        'POST',
        courseFormBody.toString(),
        { allowNon200: true }
      );

      const courseResponseHtml = courseResponseData.html || courseResponseData.body;
      const courseViewStateData = extractViewState(courseResponseHtml);

      // Step 3: Find the instructor's button name in the table
      const tableMatch = courseResponseHtml.match(/<table[^>]*id="ContentPlaceHolderright_ContentPlaceHoldercontent_GvStaff"[^>]*>([\s\S]*?)<\/table>/i);
      
      if (!tableMatch) {
        throw new Error('Could not find instructor table');
      }
      
      const tableHtml = tableMatch[1];
      const instructorRowPattern = /<tr[^>]*>[\s\S]*?<td[^>]*>([^<]+)<\/td>[\s\S]*?<input[^>]*name="([^"]*)"[^>]*value="View Profile"[^>]*>[\s\S]*?<\/tr>/gi;
      
      let instructorButtonName = null;
      let match;
      while ((match = instructorRowPattern.exec(tableHtml)) !== null) {
        const name = match[1].trim();
        const buttonName = match[2].trim();
        
        if (name === instructorName) {
          instructorButtonName = buttonName;
          break;
        }
      }

      if (!instructorButtonName) {
        throw new Error('Could not find instructor button');
      }

      // Step 4: Click the instructor's View Profile button
      const instructorFormBody = new URLSearchParams({
        ...courseViewStateData,
        [instructorButtonName]: 'View Profile',
        '__EVENTTARGET': '',
        '__EVENTARGUMENT': '',
      });

      const instructorResponseData = await this.makeProxyRequest(
        'https://apps.guc.edu.eg/student_ext/UserProfile/UserProfileSearch.aspx',
        'POST',
        instructorFormBody.toString(),
        { allowNon200: true }
      );

      let instructorHtml = instructorResponseData.html || instructorResponseData.body;
      
      // Handle redirect if present
      const redirectMatch = instructorHtml.match(/Object moved to <a href="([^"]+)">here<\/a>/i);
      if (redirectMatch) {
        const redirectUrl = redirectMatch[1];
        
        const redirectResponseData = await this.makeProxyRequest(
          `https://apps.guc.edu.eg${redirectUrl}`,
          'GET',
          undefined,
          { allowNon200: true }
        );
        
        instructorHtml = redirectResponseData.html || redirectResponseData.body;
      }
      
      
      // Step 5: Extract instructor profile data (course instructor specific patterns)
      const profileData: any = {
        name: instructorName,
      };

      // Extract email from HyperLinkEmail element - try multiple patterns
      let emailMatch = instructorHtml.match(/id="ContentPlaceHolderright_ContentPlaceHoldercontent_HyperLinkEmail"[^>]*>([^<]+)</i);
      if (!emailMatch) {
        // Try alternative pattern
        emailMatch = instructorHtml.match(/ContentPlaceHolderright_ContentPlaceHoldercontent_HyperLinkEmail[^>]*>([^<]+)</i);
      }
      if (!emailMatch) {
        // Try even more flexible pattern
        emailMatch = instructorHtml.match(/HyperLinkEmail[^>]*>([^<]+)</i);
      }
      if (emailMatch && emailMatch[1].trim()) {
        profileData.email = emailMatch[1].trim();
      }

      // Extract office from LblOffice element - try multiple patterns
      let officeMatch = instructorHtml.match(/id="ContentPlaceHolderright_ContentPlaceHoldercontent_LblOffice"[^>]*>([^<]+)</i);
      if (!officeMatch) {
        // Try alternative pattern
        officeMatch = instructorHtml.match(/ContentPlaceHolderright_ContentPlaceHoldercontent_LblOffice[^>]*>([^<]+)</i);
      }
      if (!officeMatch) {
        // Try even more flexible pattern
        officeMatch = instructorHtml.match(/LblOffice[^>]*>([^<]+)</i);
      }
      if (officeMatch && officeMatch[1].trim()) {
        profileData.office = officeMatch[1].trim();
      }

      // Extract courses from LblCourses element - try multiple patterns
      let coursesMatch = instructorHtml.match(/id="ContentPlaceHolderright_ContentPlaceHoldercontent_LblCourses"[^>]*>([^<]+)</i);
      if (!coursesMatch) {
        // Try alternative pattern
        coursesMatch = instructorHtml.match(/ContentPlaceHolderright_ContentPlaceHoldercontent_LblCourses[^>]*>([^<]+)</i);
      }
      if (!coursesMatch) {
        // Try even more flexible pattern
        coursesMatch = instructorHtml.match(/LblCourses[^>]*>([^<]+)</i);
      }
      if (coursesMatch && coursesMatch[1].trim()) {
        profileData.courses = coursesMatch[1].trim();
      }


      return profileData;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get instructor profile data by selecting instructor and clicking view profile
   */
  static async getInstructorProfile(instructorName: string): Promise<{
    name: string;
    email?: string;
    office?: string;
    courses?: string;
  } | null> {
    try {
      // Step 1: Get initial page to extract view state
      const initialData = await GUCAPIProxy.makeProxyRequest(
        'https://apps.guc.edu.eg/student_ext/UserProfile/UserProfileSearch.aspx'
      );

      const initialHtml = initialData.html || initialData.body;
      const viewStateData = extractViewState(initialHtml);

      if (!viewStateData.__VIEWSTATE || !viewStateData.__VIEWSTATEGENERATOR || !viewStateData.__EVENTVALIDATION) {
        throw new Error('Failed to extract required view state data');
      }

      // Step 2: Select the instructor
      const formBody = new URLSearchParams({
        ...viewStateData,
        'ctl00$ctl00$ContentPlaceHolderright$ContentPlaceHoldercontent$DdlStaffSearch': instructorName,
        'ctl00$ctl00$ContentPlaceHolderright$ContentPlaceHoldercontent$BtnViewProfile': 'View Profile',
        '__EVENTTARGET': '',
        '__EVENTARGUMENT': '',
      });

      const responseData = await GUCAPIProxy.makeProxyRequest(
        'https://apps.guc.edu.eg/student_ext/UserProfile/UserProfileSearch.aspx',
        'POST',
        formBody.toString(),
        { allowNon200: true }
      );

      const html = responseData.html || responseData.body;
      
      
      if (!html) {
        throw new Error('No HTML content received from profile request');
      }

      // Step 3: Check if we got a redirect and follow it
      if (responseData.status === 302 || html.includes('Object moved')) {
        const redirectMatch = html.match(/href="([^"]*)"/);
        if (redirectMatch) {
          const redirectPath = redirectMatch[1];
          const fullRedirectUrl = redirectPath.startsWith('http') 
            ? redirectPath 
            : `https://apps.guc.edu.eg${redirectPath}`;
          
          
          // Follow the redirect
          const profileResponse = await GUCAPIProxy.makeProxyRequest(fullRedirectUrl);
          const profileHtml = profileResponse.html || profileResponse.body;
          
          
          if (!profileHtml) {
            throw new Error('No HTML content received from profile page');
          }

          // Parse the profile data from the actual profile page
          const profileData = GUCAPIProxy.parseInstructorProfile(profileHtml);
          return profileData;
        }
      }

      // Step 4: Parse the profile data (fallback for non-redirect responses)
      const profileData = GUCAPIProxy.parseInstructorProfile(html);
      
      return profileData;
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse instructor profile data from HTML
   */
  private static parseInstructorProfile(html: string): {
    name: string;
    email?: string;
    office?: string;
    courses?: string;
  } | null {
    try {
      // Extract name
      const nameMatch = html.match(/<span[^>]*id="ContentPlaceHolderright_ContentPlaceHoldercontent_LblName"[^>]*>([^<]+)<\/span>/i);
      const name = nameMatch ? nameMatch[1].trim() : '';

      // Extract email
      const emailMatch = html.match(/<a[^>]*id="ContentPlaceHolderright_ContentPlaceHoldercontent_HyperLinkEmail"[^>]*href="mailto:([^"]*)"[^>]*>([^<]+)<\/a>/i);
      const email = emailMatch ? emailMatch[1].trim() : undefined;

      // Extract office
      const officeMatch = html.match(/<span[^>]*id="ContentPlaceHolderright_ContentPlaceHoldercontent_LblOffice"[^>]*>([^<]+)<\/span>/i);
      const office = officeMatch ? officeMatch[1].trim() : undefined;

      // Extract courses
      const coursesMatch = html.match(/<span[^>]*id="ContentPlaceHolderright_ContentPlaceHoldercontent_LblCourses"[^>]*>([^<]+)<\/span>/i);
      const courses = coursesMatch ? coursesMatch[1].trim() : undefined;

      if (!name) {
        return null;
      }

      return {
        name,
        email,
        office,
        courses: courses && courses !== '' ? courses : undefined
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get attendance data from GUC attendance page
   */
  static async getAttendanceData(): Promise<{
    summary: {
      absenceReport: {
        settingsTitle: string;
        code: string;
        name: string;
        absenceLevel: string;
      }[];
    };
    courses: {
      courseId: string;
      courseName: string;
      attendanceRecords: {
        rowNumber: number;
        attendance: 'Present' | 'Absent';
        sessionDescription: string;
      }[];
    }[];
  }> {
    try {
      // First, get the initial attendance page
      const initialData = await this.makeProxyRequest(
        'https://apps.guc.edu.eg/student_ext/Attendance/ClassAttendance_ViewStudentAttendance_001.aspx'
      );

      let html = initialData.html || initialData.body;
      
      // Check if we got a redirect response
      if (initialData.status === 302 || html.includes('Object moved') || html.includes('sTo(')) {
        try {
          // Extract redirect parameter from JavaScript
          const redirectParam = GUCAPIProxy.extractRedirectParam(html);
          
          // Update URL with redirect parameter
          const redirectUrl = `https://apps.guc.edu.eg/student_ext/Attendance/ClassAttendance_ViewStudentAttendance_001.aspx?v=${redirectParam}`;
          
          // Make request to redirected URL
          const redirectData = await this.makeProxyRequest(redirectUrl);
          html = redirectData.html || redirectData.body;
          
          if (!html) {
            throw new Error('No HTML content from redirect');
          }
        } catch (redirectError: any) {
          throw new Error(`Failed to handle attendance page redirect: ${redirectError.message}`);
        }
      }

      // Parse the attendance data from the final page
      const attendanceData = this.parseAttendanceData(html);

      return attendanceData;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get detailed attendance for a specific course
   */
  static async getCourseAttendance(courseId: string): Promise<{
    courseId: string;
    courseName: string;
    attendanceRecords: {
      rowNumber: number;
      attendance: 'Present' | 'Absent';
      sessionDescription: string;
    }[];
  }> {
    try {
      // First, get the initial attendance page
      const initialData = await this.makeProxyRequest(
        'https://apps.guc.edu.eg/student_ext/Attendance/ClassAttendance_ViewStudentAttendance_001.aspx'
      );

      let html = initialData.html || initialData.body;
      let baseUrl = 'https://apps.guc.edu.eg/student_ext/Attendance/ClassAttendance_ViewStudentAttendance_001.aspx';
      
      // Check if we got a redirect response
      if (initialData.status === 302 || html.includes('Object moved') || html.includes('sTo(')) {
        try {
          // Extract redirect parameter from JavaScript
          const redirectParam = GUCAPIProxy.extractRedirectParam(html);
          
          // Update URL with redirect parameter
          baseUrl = `https://apps.guc.edu.eg/student_ext/Attendance/ClassAttendance_ViewStudentAttendance_001.aspx?v=${redirectParam}`;
          
          // Make request to redirected URL
          const redirectData = await this.makeProxyRequest(baseUrl);
          html = redirectData.html || redirectData.body;
          
          if (!html) {
            throw new Error('No HTML content from redirect');
          }
        } catch (redirectError: any) {
          throw new Error(`Failed to handle course attendance page redirect: ${redirectError.message}`);
        }
      }

      const viewStateData = extractViewState(html);

      if (!viewStateData.__VIEWSTATE || !viewStateData.__VIEWSTATEGENERATOR || !viewStateData.__EVENTVALIDATION) {
        throw new Error('Failed to extract required view state data');
      }

      // Select the specific course
      const courseFormBody = new URLSearchParams({
        ...viewStateData,
        'ctl00$ctl00$ContentPlaceHolderright$ContentPlaceHoldercontent$DDL_Courses': courseId,
        '__EVENTTARGET': 'ctl00$ctl00$ContentPlaceHolderright$ContentPlaceHoldercontent$DDL_Courses',
        '__EVENTARGUMENT': '',
      });

      const courseResponse = await this.makeProxyRequest(
        baseUrl,
        'POST',
        courseFormBody.toString()
      );

      const courseHtml = courseResponse.html || courseResponse.body;
      const courseData = this.parseCourseAttendanceData(courseHtml, courseId);

      return courseData;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Parse attendance data from HTML
   */
  private static parseAttendanceData(html: string): {
    summary: {
      absenceReport: {
        settingsTitle: string;
        code: string;
        name: string;
        absenceLevel: string;
      }[];
    };
    courses: {
      courseId: string;
      courseName: string;
      attendanceRecords: {
        rowNumber: number;
        attendance: 'Present' | 'Absent';
        sessionDescription: string;
      }[];
    }[];
  } {
    try {
      // Parse absence report table
      const absenceReport: {
        settingsTitle: string;
        code: string;
        name: string;
        absenceLevel: string;
      }[] = [];

      // Extract absence report table rows
      const absenceTableMatch = html.match(/<table[^>]*id="DG_AbsenceReport"[^>]*>(.*?)<\/table>/s);
      if (absenceTableMatch) {
        const tableContent = absenceTableMatch[1];
        const rowMatches = tableContent.match(/<tr[^>]*>(.*?)<\/tr>/gs);
        
        if (rowMatches && rowMatches.length > 1) {
          // Skip header row, process data rows
          for (let i = 1; i < rowMatches.length; i++) {
            const row = rowMatches[i];
            const cellMatches = row.match(/<td[^>]*>(.*?)<\/td>/gs);
            
            if (cellMatches && cellMatches.length >= 4) {
              absenceReport.push({
                settingsTitle: this.stripHtmlTags(cellMatches[0]),
                code: this.stripHtmlTags(cellMatches[1]),
                name: this.stripHtmlTags(cellMatches[2]),
                absenceLevel: this.stripHtmlTags(cellMatches[3])
              });
            }
          }
        }
      }

      // Parse course dropdown options
      const courses: {
        courseId: string;
        courseName: string;
        attendanceRecords: {
          rowNumber: number;
          attendance: 'Present' | 'Absent';
          sessionDescription: string;
        }[];
      }[] = [];

      const courseSelectMatch = html.match(/<select[^>]*id="ContentPlaceHolderright_ContentPlaceHoldercontent_DDL_Courses"[^>]*>(.*?)<\/select>/s);
      if (courseSelectMatch) {
        const selectContent = courseSelectMatch[1];
        const optionMatches = selectContent.match(/<option[^>]*value="([^"]*)"[^>]*>(.*?)<\/option>/gs);
        
        if (optionMatches) {
          for (const optionMatch of optionMatches) {
            const valueMatch = optionMatch.match(/value="([^"]*)"/);
            const textMatch = optionMatch.match(/>([^<]*)</);
            
            if (valueMatch && textMatch && valueMatch[1] !== '0') {
              const courseId = valueMatch[1];
              const courseName = textMatch[1].trim();
              
              courses.push({
                courseId,
                courseName,
                attendanceRecords: [] // Will be populated when course is selected
              });
            }
          }
        }
      }

      return {
        summary: {
          absenceReport
        },
        courses
      };
    } catch (error) {
      return {
        summary: { absenceReport: [] },
        courses: []
      };
    }
  }

  /**
   * Parse course attendance data from HTML
   */
  private static parseCourseAttendanceData(html: string, courseId: string): {
    courseId: string;
    courseName: string;
    attendanceRecords: {
      rowNumber: number;
      attendance: 'Present' | 'Absent';
      sessionDescription: string;
    }[];
  } {
    try {
      // Get course name from the selected option
      let courseName = '';
      const selectedOptionMatch = html.match(/<option[^>]*selected="selected"[^>]*value="[^"]*"[^>]*>(.*?)<\/option>/);
      if (selectedOptionMatch) {
        courseName = selectedOptionMatch[1].trim();
      }

      const attendanceRecords: {
        rowNumber: number;
        attendance: 'Present' | 'Absent';
        sessionDescription: string;
      }[] = [];

      // Extract attendance table rows
      const attendanceTableMatch = html.match(/<table[^>]*id="DG_StudentCourseAttendance"[^>]*>(.*?)<\/table>/s);
      if (attendanceTableMatch) {
        const tableContent = attendanceTableMatch[1];
        const rowMatches = tableContent.match(/<tr[^>]*>(.*?)<\/tr>/gs);
        
        if (rowMatches && rowMatches.length > 1) {
          // Skip header row, process data rows
          for (let i = 1; i < rowMatches.length; i++) {
            const row = rowMatches[i];
            const cellMatches = row.match(/<td[^>]*>(.*?)<\/td>/gs);
            
            if (cellMatches && cellMatches.length >= 3) {
              const rowNumber = parseInt(this.stripHtmlTags(cellMatches[0])) || 0;
              const attendance = this.stripHtmlTags(cellMatches[1]) === 'Present' ? 'Present' : 'Absent';
              const sessionDescription = this.stripHtmlTags(cellMatches[2]);
              
              attendanceRecords.push({
                rowNumber,
                attendance,
                sessionDescription
              });
            }
          }
        }
      }

      return {
        courseId,
        courseName,
        attendanceRecords
      };
    } catch (error) {
      return {
        courseId,
        courseName: '',
        attendanceRecords: []
      };
    }
  }

  /**
   * Extract redirect parameter from JavaScript
   */
  static extractRedirectParam(html: string): string {
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
   * Strip HTML tags from text
   */
  private static stripHtmlTags(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }

  // New session reset methods
  static getAvailableStudyYearsWithReset = getAvailableStudyYears;
  static getTranscriptDataWithReset = getTranscriptData;
  static resetSession = resetSession;
}