import { AuthManager } from './auth';

export interface ViewStateData {
  __VIEWSTATE: string;
  __VIEWSTATEGENERATOR: string;
  __EVENTVALIDATION: string;
}

export interface GradeData {
  course: string;
  percentage: number;
}

export class GUCAPIProxy {
  private static PROXY_BASE_URL = 'https://guc-connect-login.vercel.app/api';

  /**
   * Make authenticated request through proxy server
   */
  private static async makeProxyRequest(url: string, method: string = 'GET', body?: any): Promise<any> {
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
      throw new Error(`Request failed: ${data.status}`);
    }

    return data;
  }

  /**
   * Extract ASP.NET WebForms hidden field values from HTML response
   */
  static extractViewState(html: string): ViewStateData {
    try {
      const patterns = {
        __VIEWSTATE: /<input[^>]*name="__VIEWSTATE"[^>]*value="([^"]*)"[^>]*>/i,
        __VIEWSTATEGENERATOR: /<input[^>]*name="__VIEWSTATEGENERATOR"[^>]*value="([^"]*)"[^>]*>/i,
        __EVENTVALIDATION: /<input[^>]*name="__EVENTVALIDATION"[^>]*value="([^"]*)"[^>]*>/i
      };
      
      const result: ViewStateData = {
        __VIEWSTATE: '',
        __VIEWSTATEGENERATOR: '',
        __EVENTVALIDATION: ''
      };
      
      for (const [key, pattern] of Object.entries(patterns)) {
        const match = html.match(pattern);
        const value = match ? match[1] : '';
        result[key as keyof ViewStateData] = value;
        
        if (!value) {
          console.warn(`Failed to extract ${key} from HTML`);
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error extracting view state:', error);
      return {
        __VIEWSTATE: '',
        __VIEWSTATEGENERATOR: '',
        __EVENTVALIDATION: ''
      };
    }
  }

  /**
   * Extract grade data from HTML response
   */
  static extractGradeData(html: string): GradeData[] {
    try {
      const grades: GradeData[] = [];
      
      console.log('=== GRADE EXTRACTION DEBUG ===');
      console.log('HTML length:', html.length);
      console.log('Contains "Mid-Term Results":', html.includes('Mid-Term Results'));
      console.log('Contains "midDg":', html.includes('midDg'));
      
      // Look for the actual table structure
      const midTableMatch = html.match(/<table[^>]*id="[^"]*midDg[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
      if (midTableMatch) {
        console.log('Found midDg table, first 500 chars:', midTableMatch[1].substring(0, 500));
        
        // Try to extract directly from the table content only
        const tableContent = midTableMatch[1];
        
        // More precise extraction from just the table content
        const tableRowPattern = /<tr[^>]*>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*style="font-weight:bold;"[^>]*>([0-9.]+)<\/td>\s*<\/tr>/gi;
        
        let tableMatch;
        const tableGrades: GradeData[] = [];
        
        while ((tableMatch = tableRowPattern.exec(tableContent)) !== null) {
          const course = tableMatch[1].trim();
          const percentageStr = tableMatch[2].trim();
          
          console.log(`Table extraction found:`, { course: course.substring(0, 50), percentage: percentageStr });
          
          // Filter out header rows
          if (course.toLowerCase() !== 'course' && (!course.toLowerCase().includes('course') || course.length > 20)) {
            const percentage = parseFloat(percentageStr);
            if (!isNaN(percentage) && percentage >= 0 && percentage <= 100) {
              tableGrades.push({ course, percentage });
              console.log(`Added table grade: ${course.substring(0, 30)}... -> ${percentage}%`);
            }
          }
        }
        
        if (tableGrades.length > 0) {
          console.log(`Table extraction succeeded with ${tableGrades.length} grades`);
          console.log(`Final: ${tableGrades.length} grades extracted`);
          console.log('=============================');
          return tableGrades;
        }
      }
      
      // Multiple patterns to try
      const patterns = [
        // More precise pattern that looks for the exact structure we see in logs
        /<tr[^>]*>\s*<td[^>]*>([^<]+)<\/td><td[^>]*style="font-weight:bold;"[^>]*>([0-9.]+)<\/td>\s*<\/tr>/gi,
        
        // Alternative pattern with more flexible spacing
        /<tr[^>]*>[\s]*<td[^>]*>([^<]+)<\/td>[\s]*<td[^>]*style="font-weight:bold;"[^>]*>([0-9.]+)<\/td>[\s]*<\/tr>/gi,
        
        // Font-based pattern (likely for ASP.NET)
        /<tr[^>]*>[\s\S]*?<td[^>]*><font[^>]*>([^<]+)<\/font><\/td>[\s\S]*?<td[^>]*><font[^>]*><b>([^<]+)<\/b><\/font><\/td>[\s\S]*?<\/tr>/gi,
        
        // Original pattern
        /<tr[^>]*>[\s\S]*?<td[^>]*>([^<]+)<\/td>[\s\S]*?<td[^>]*><[^>]*><b>([^<]+)<\/b><\/[^>]*><\/td>[\s\S]*?<\/tr>/gi,
        
        // Simpler fallback pattern
        /<tr[^>]*>[\s\S]*?<td[^>]*>([^<]+)<\/td>[\s\S]*?<td[^>]*>([0-9.]+)<\/td>[\s\S]*?<\/tr>/gi
      ];
      
      for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        pattern.lastIndex = 0;
        
        let match;
        let tempGrades: GradeData[] = [];
        
        while ((match = pattern.exec(html)) !== null) {
          const course = match[1].trim();
          const percentageStr = match[2].trim();
          
          console.log(`Pattern ${i + 1} found:`, { course: course.substring(0, 50), percentage: percentageStr });
          
          // Filter out header rows and invalid entries
          const isHeaderRow = course.toLowerCase() === 'course' || 
                             percentageStr.toLowerCase() === 'percentage' ||
                             course.toLowerCase().includes('course') && course.length < 20;
          
          if (!isHeaderRow) {
            const percentage = parseFloat(percentageStr);
            if (!isNaN(percentage) && percentage >= 0 && percentage <= 100) {
              tempGrades.push({ course, percentage });
              console.log(`Added grade: ${course.substring(0, 30)}... -> ${percentage}%`);
            }
          } else {
            console.log(`Skipped header/invalid row: ${course} -> ${percentageStr}`);
          }
        }
        
        if (tempGrades.length > 0) {
          grades.push(...tempGrades);
          console.log(`Pattern ${i + 1} succeeded with ${tempGrades.length} grades`);
          break;
        }
      }
      
      console.log(`Final: ${grades.length} grades extracted`);
      console.log('=============================');
      
      return grades;
    } catch (error) {
      console.error('Error extracting grade data:', error);
      return [];
    }
  }

  /**
   * Extract course-specific grade items (Quiz/Assignment table) and map to GradeData
   */
  static extractCourseGradeData(html: string): GradeData[] {
    try {
      const items: GradeData[] = [];

      console.log('=== COURSE-GRADE EXTRACTION DEBUG ===');
      console.log('Contains "Quiz/Assignment":', /Quiz\/?Assignment/i.test(html));

      // Match rows belonging to the rptrNtt repeater (course items)
      const rowPattern = /<tr[^>]*id="[^"]*rptrNtt[^"]*"[^>]*>[\s\S]*?<span[^>]*id="[^"]*rptrNtt_evalMethLbl_[^"]+"[^>]*>([^<]+)<\/span>[\s\S]*?<td>\s*([^<]+?)\s*<\/td>[\s\S]*?<td>\s*([0-9.]+)\s*\/\s*([0-9.]+)\s*<\/td>[\s\S]*?<td>\s*([^<]+?)\s*<\/td>[\s\S]*?<\/tr>/gi;

      let match: RegExpExecArray | null;
      while ((match = rowPattern.exec(html)) !== null) {
        const title = match[1].trim();
        const elementName = match[2].trim();
        const obtained = parseFloat(match[3]);
        const total = parseFloat(match[4]);
        // const instructor = match[5].trim(); // currently unused in UI

        if (!isNaN(obtained) && !isNaN(total) && total > 0) {
          const percentage = (obtained / total) * 100;
          items.push({ course: `${title} - ${elementName}`, percentage });
        }
      }

      console.log(`Extracted ${items.length} course grade items`);
      console.log('====================================');
      return items;
    } catch (error) {
      console.error('Error extracting course grade data:', error);
      return [];
    }
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
      
      const viewStateData = this.extractViewState(initialHtml);

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
      const courses = this.extractCourses(html);
      
      // Fallback: If no course dropdown found, extract course names from grade data
      if (courses.length === 0) {
        console.log('No courses found in dropdown, trying to extract from grade data...');
        const grades = this.extractGradeData(html);
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
      const viewStateData = this.extractViewState(initialHtml);

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
        const seasonGrades = this.extractGradeData(seasonHtml);
        console.log(`Found ${seasonGrades.length} grades for season ${seasonId}`);
        if (seasonGrades.length > 0) {
          console.log('Sample grades:', seasonGrades.slice(0, 3));
        }
        console.log('==========================================');
        return seasonGrades;
      }

      // Step 3: Select the specific course using the correct parameter name (smCrsLst)
      const updatedVS = this.extractViewState(seasonHtml);

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
      const courseSpecific = this.extractCourseGradeData(courseHtml);
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
      
      const grades = this.extractGradeData(html);
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
   * Extract courses from HTML dropdown
   */
  static extractCourses(html: string): {value: string, text: string}[] {
    try {
      const courses: {value: string, text: string}[] = [];
      
      console.log('=== COURSE EXTRACTION DEBUG ===');
      console.log('HTML length:', html.length);
      console.log('Contains "course":', html.includes('course'));
      console.log('Contains "Course":', html.includes('Course'));
      
      // Try patterns targeting the correct course dropdown (smCrsLst)
      const patterns = [
        /<select[^>]*id="[^"]*smCrsLst[^"]*"[^>]*>([\s\S]*?)<\/select>/i,
        /<select[^>]*name="[^"]*smCrsLst[^"]*"[^>]*>([\s\S]*?)<\/select>/i,
        // Fallback: any select (last resort)
        /<select[^>]*>([\s\S]*?)<\/select>/gi
      ];
      
      let courseDropdownMatch = null;
      
      for (let i = 0; i < patterns.length; i++) {
        courseDropdownMatch = html.match(patterns[i]);
        if (courseDropdownMatch) {
          console.log(`Found dropdown using pattern ${i + 1}`);
          break;
        }
      }
      
      if (courseDropdownMatch) {
        const optionsHtml = courseDropdownMatch[1];
        console.log('Options HTML (first 500 chars):', optionsHtml.substring(0, 500));
        
        const optionPattern = /<option[^>]*value="([^"]*)"[^>]*>([^<]*)<\/option>/gi;
        
        let match;
        let totalOptions = 0;
        while ((match = optionPattern.exec(optionsHtml)) !== null) {
          totalOptions++;
          const value = match[1].trim();
          const text = match[2].trim();
          
          console.log(`Option ${totalOptions}: value="${value}", text="${text}"`);
          
          // Skip empty or placeholder options (e.g., "Choose a Course")
          if (value && text && value !== '' && !/choose/i.test(text)) {
            courses.push({ value, text });
          }
        }
        
        console.log(`Found ${totalOptions} total options, ${courses.length} valid courses`);
      } else {
        console.warn('Course dropdown not found in HTML');
        // Let's see what select elements exist
        const allSelects = html.match(/<select[^>]*>/gi);
        console.log('All select elements found:', allSelects?.length || 0);
        if (allSelects) {
          allSelects.forEach((select, index) => {
            console.log(`Select ${index + 1}:`, select);
          });
        }
      }
      
      console.log(`Final result: ${courses.length} courses extracted`);
      console.log('=============================');
      
      return courses;
    } catch (error) {
      console.error('Error extracting courses:', error);
      return [];
    }
  }
}
