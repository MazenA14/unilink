import { GradeData, ViewStateData } from '../types/gucTypes';

/**
 * Extract ASP.NET WebForms hidden field values from HTML response
 */
export function extractViewState(html: string): ViewStateData {
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
(`Failed to extract ${key} from HTML`);
      }
    }
    
    return result;
  } catch (error) {
('Error extracting view state:', error);
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
export function extractGradeData(html: string): GradeData[] {
  try {
    const grades: GradeData[] = [];
    
('=== GRADE EXTRACTION DEBUG ===');
('HTML length:', html.length);
('Contains "Mid-Term Results":', html.includes('Mid-Term Results'));
('Contains "midDg":', html.includes('midDg'));
    
    // Look for the actual table structure
    const midTableMatch = html.match(/<table[^>]*id="[^"]*midDg[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
    if (midTableMatch) {
('Found midDg table, first 500 chars:', midTableMatch[1].substring(0, 500));
      
      // Try to extract directly from the table content only
      const tableContent = midTableMatch[1];
      
      // More precise extraction from just the table content
      const tableRowPattern = /<tr[^>]*>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*style="font-weight:bold;"[^>]*>([0-9.]+)<\/td>\s*<\/tr>/gi;
      
      let tableMatch;
      const tableGrades: GradeData[] = [];
      
      while ((tableMatch = tableRowPattern.exec(tableContent)) !== null) {
        const course = tableMatch[1].trim();
        const percentageStr = tableMatch[2].trim();
        
(`Table extraction found:`, { course: course.substring(0, 50), percentage: percentageStr });
        
        // Filter out header rows
        if (course.toLowerCase() !== 'course' && (!course.toLowerCase().includes('course') || course.length > 20)) {
          const percentage = parseFloat(percentageStr);
          if (!isNaN(percentage) && percentage >= 0 && percentage <= 100) {
            tableGrades.push({ course, percentage });
(`Added table grade: ${course.substring(0, 30)}... -> ${percentage}%`);
          }
        }
      }
      
      if (tableGrades.length > 0) {
(`Table extraction succeeded with ${tableGrades.length} grades`);
(`Final: ${tableGrades.length} grades extracted`);
('=============================');
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
        
(`Pattern ${i + 1} found:`, { course: course.substring(0, 50), percentage: percentageStr });
        
        // Filter out header rows and invalid entries
        const isHeaderRow = course.toLowerCase() === 'course' || 
                           percentageStr.toLowerCase() === 'percentage' ||
                           course.toLowerCase().includes('course') && course.length < 20;
        
        if (!isHeaderRow) {
          const percentage = parseFloat(percentageStr);
          if (!isNaN(percentage) && percentage >= 0 && percentage <= 100) {
            tempGrades.push({ course, percentage });
(`Added grade: ${course.substring(0, 30)}... -> ${percentage}%`);
          }
        } else {
(`Skipped header/invalid row: ${course} -> ${percentageStr}`);
        }
      }
      
      if (tempGrades.length > 0) {
        grades.push(...tempGrades);
(`Pattern ${i + 1} succeeded with ${tempGrades.length} grades`);
        break;
      }
    }
    
(`Final: ${grades.length} grades extracted`);
('=============================');
    
    return grades;
  } catch (error) {
('Error extracting grade data:', error);
    return [];
  }
}

/**
 * Extract course-specific grade items (Quiz/Assignment table) and map to GradeData
 */
export function extractCourseGradeData(html: string): GradeData[] {
  try {
    const items: GradeData[] = [];

('=== COURSE-GRADE EXTRACTION DEBUG ===');
('Contains "Quiz/Assignment":', /Quiz\/?Assignment/i.test(html));

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

(`Extracted ${items.length} course grade items`);
('=====================================');
    return items;
  } catch (error) {
('Error extracting course grade data:', error);
    return [];
  }
}

/**
 * Extract courses from HTML dropdown
 */
export function extractCourses(html: string): {value: string, text: string}[] {
  try {
    const courses: {value: string, text: string}[] = [];
    
('=== COURSE EXTRACTION DEBUG ===');
('HTML length:', html.length);
('Contains "course":', html.includes('course'));
('Contains "Course":', html.includes('Course'));
    
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
(`Found dropdown using pattern ${i + 1}`);
        break;
      }
    }
    
    if (courseDropdownMatch) {
      const optionsHtml = courseDropdownMatch[1];
('Options HTML (first 500 chars):', optionsHtml.substring(0, 500));
      
      const optionPattern = /<option[^>]*value="([^"]*)"[^>]*>([^<]*)<\/option>/gi;
      
      let match;
      let totalOptions = 0;
      while ((match = optionPattern.exec(optionsHtml)) !== null) {
        totalOptions++;
        const value = match[1].trim();
        const text = match[2].trim();
        
(`Option ${totalOptions}: value="${value}", text="${text}"`);
        
        // Skip empty or placeholder options (e.g., "Choose a Course")
        if (value && text && value !== '' && !/choose/i.test(text)) {
          courses.push({ value, text });
        }
      }
      
(`Found ${totalOptions} total options, ${courses.length} valid courses`);
    } else {
('Course dropdown not found in HTML');
      // Let's see what select elements exist
      const allSelects = html.match(/<select[^>]*>/gi);
('All select elements found:', allSelects?.length || 0);
      if (allSelects) {
        allSelects.forEach((select, index) => {
(`Select ${index + 1}:`, select);
        });
      }
    }
    
(`Final result: ${courses.length} courses extracted`);
('=============================');
    
    return courses;
  } catch (error) {
('Error extracting courses:', error);
    return [];
  }
}
