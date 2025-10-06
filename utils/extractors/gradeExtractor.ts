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
      }
    }
    
    return result;
  } catch (error) {
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
    
    
    // Look for the actual table structure
    const midTableMatch = html.match(/<table[^>]*id="[^"]*midDg[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
    if (midTableMatch) {
      
      // Debug: Let's see all table rows
      const allRows = midTableMatch[1].match(/<tr[^>]*>[\s\S]*?<\/tr>/gi);
      if (allRows) {
      }
      
      // Try to extract directly from the table content only
      const tableContent = midTableMatch[1];
      
      // More flexible patterns to match the actual HTML structure
      const tableRowPatterns = [
        // Pattern 1: Exact structure from the HTML example
        /<tr[^>]*>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*style="font-weight:bold;"[^>]*>([0-9.]+)<\/td>\s*<\/tr>/gi,
        // Pattern 2: More flexible spacing
        /<tr[^>]*>[\s\S]*?<td[^>]*>([^<]+)<\/td>[\s\S]*?<td[^>]*style="font-weight:bold;"[^>]*>([0-9.]+)<\/td>[\s\S]*?<\/tr>/gi,
        // Pattern 3: Without style attribute
        /<tr[^>]*>[\s\S]*?<td[^>]*>([^<]+)<\/td>[\s\S]*?<td[^>]*>([0-9.]+)<\/td>[\s\S]*?<\/tr>/gi,
        // Pattern 4: Very simple pattern
        /<tr[^>]*>[\s\S]*?<td[^>]*>([^<]+)<\/td>[\s\S]*?<td[^>]*>([0-9.]+)<\/td>[\s\S]*?<\/tr>/gi
      ];
      
      let tableGrades: GradeData[] = [];
      
      for (let i = 0; i < tableRowPatterns.length; i++) {
        const pattern = tableRowPatterns[i];
        pattern.lastIndex = 0;
        
        let tableMatch;
        const tempGrades: GradeData[] = [];
        
        while ((tableMatch = pattern.exec(tableContent)) !== null) {
          const course = tableMatch[1].trim();
          const percentageStr = tableMatch[2].trim();
          
          
          // Filter out header rows
          const isHeaderRow = course.toLowerCase() === 'course' || 
                             percentageStr.toLowerCase() === 'percentage' ||
                             (course.toLowerCase().includes('course') && course.length < 20);
          
          if (!isHeaderRow) {
            const percentage = parseFloat(percentageStr);
            if (!isNaN(percentage) && percentage >= 0 && percentage <= 100) {
              tempGrades.push({ course, percentage });
            }
          } else {
          }
        }
        
        if (tempGrades.length > 0) {
          tableGrades = tempGrades;
          break;
        }
      }
      
      if (tableGrades.length > 0) {
        return tableGrades;
      }
    }
    
    // Multiple patterns to try (fallback if table-specific extraction failed)
    const patterns = [
      // Pattern 1: Exact structure from HTML example
      /<tr[^>]*>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*style="font-weight:bold;"[^>]*>([0-9.]+)<\/td>\s*<\/tr>/gi,
      
      // Pattern 2: More flexible spacing with style
      /<tr[^>]*>[\s\S]*?<td[^>]*>([^<]+)<\/td>[\s\S]*?<td[^>]*style="font-weight:bold;"[^>]*>([0-9.]+)<\/td>[\s\S]*?<\/tr>/gi,
      
      // Pattern 3: Without style attribute
      /<tr[^>]*>[\s\S]*?<td[^>]*>([^<]+)<\/td>[\s\S]*?<td[^>]*>([0-9.]+)<\/td>[\s\S]*?<\/tr>/gi,
      
      // Pattern 4: Font-based pattern (ASP.NET)
      /<tr[^>]*>[\s\S]*?<td[^>]*><font[^>]*>([^<]+)<\/font><\/td>[\s\S]*?<td[^>]*><font[^>]*><b>([^<]+)<\/b><\/font><\/td>[\s\S]*?<\/tr>/gi,
      
      // Pattern 5: Bold text pattern
      /<tr[^>]*>[\s\S]*?<td[^>]*>([^<]+)<\/td>[\s\S]*?<td[^>]*><[^>]*><b>([^<]+)<\/b><\/[^>]*><\/td>[\s\S]*?<\/tr>/gi,
      
      // Pattern 6: Very simple pattern (last resort)
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
        
        
        // Filter out header rows and invalid entries
        const isHeaderRow = course.toLowerCase() === 'course' || 
                           percentageStr.toLowerCase() === 'percentage' ||
                           course.toLowerCase().includes('course') && course.length < 20;
        
        if (!isHeaderRow) {
          const percentage = parseFloat(percentageStr);
          if (!isNaN(percentage) && percentage >= 0 && percentage <= 100) {
            tempGrades.push({ course, percentage });
          }
        } else {
        }
      }
      
      if (tempGrades.length > 0) {
        grades.push(...tempGrades);
        break;
      }
    }
    
    
    return grades;
  } catch (error) {
    return [];
  }
}

/**
 * Extract course-specific grade items (Quiz/Assignment table) and map to GradeData
 */
export function extractCourseGradeData(html: string): GradeData[] {
  try {
    const items: GradeData[] = [];

    // Extract each row first to preserve order, then parse per-row
    const rowRegex = /<tr[^>]*id="[^"]*rptrNtt[^"]*"[^>]*>[\s\S]*?<\/tr>/gi;
    let rowMatch: RegExpExecArray | null;
    let lastSeenTitle: string | null = null;

    while ((rowMatch = rowRegex.exec(html)) !== null) {
      const rowHtml = rowMatch[0];

      // Try to get the title from the first column if present
      const titleMatch = rowHtml.match(/<span[^>]*id="[^"]*rptrNtt_evalMethLbl_[^"]+"[^>]*>([^<]+)<\/span>/i);
      if (titleMatch && titleMatch[1]) {
        lastSeenTitle = titleMatch[1].trim();
      }

      // Extract the element name (second column)
      const elementMatch = rowHtml.match(/<td>\s*([^<]+?)\s*<\/td>/i);

      // Extract obtained/total from the grade column
      const gradeMatch = rowHtml.match(/<td>\s*([0-9.]+)\s*\/\s*([0-9.]+)\s*<\/td>/i);

      if (elementMatch && gradeMatch) {
        const elementName = elementMatch[1].trim();
        const obtained = parseFloat(gradeMatch[1]);
        const total = parseFloat(gradeMatch[2]);

        if (!isNaN(obtained) && !isNaN(total) && total > 0 && elementName) {
          const percentage = (obtained / total) * 100;
          const courseName = lastSeenTitle ? `${lastSeenTitle} - ${elementName}` : elementName;
          items.push({
            course: courseName,
            percentage,
            obtained,
            total
          });
        }
      }
    }

    return items;
  } catch (error) {
    return [];
  }
}

/**
 * Extract courses from HTML dropdown
 */
export function extractCourses(html: string): {value: string, text: string}[] {
  try {
    const courses: {value: string, text: string}[] = [];
    
    
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
        break;
      }
    }
    
    if (courseDropdownMatch) {
      const optionsHtml = courseDropdownMatch[1];
      
      const optionPattern = /<option[^>]*value="([^"]*)"[^>]*>([^<]*)<\/option>/gi;
      
      let match;
      let totalOptions = 0;
      while ((match = optionPattern.exec(optionsHtml)) !== null) {
        totalOptions++;
        const value = match[1].trim();
        const text = match[2].trim();
        
        
        // Skip empty or placeholder options (e.g., "Choose a Course")
        if (value && text && value !== '' && !/choose/i.test(text)) {
          courses.push({ value, text });
        }
      }
      
    } else {
      // Let's see what select elements exist
      const allSelects = html.match(/<select[^>]*>/gi);
      if (allSelects) {
        allSelects.forEach((select, index) => {
        });
      }
    }
    
    
    return courses;
  } catch (error) {
    return [];
  }
}
