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
        console.log(`Failed to extract ${key} from HTML`);
      }
    }
    
    return result;
  } catch (error) {
    console.log('Error extracting view state:', error);
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
    
    console.log('=== GRADE EXTRACTION DEBUG ===');
    console.log('HTML length:', html.length);
    console.log('Contains "Mid-Term Results":', html.includes('Mid-Term Results'));
    console.log('Contains "midDg":', html.includes('midDg'));
    
    // Look for the actual table structure
    const midTableMatch = html.match(/<table[^>]*id="[^"]*midDg[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
    if (midTableMatch) {
      console.log('Found midDg table, first 500 chars:', midTableMatch[1].substring(0, 500));
      
      // Debug: Let's see all table rows
      const allRows = midTableMatch[1].match(/<tr[^>]*>[\s\S]*?<\/tr>/gi);
      if (allRows) {
        console.log(`Found ${allRows.length} table rows`);
        allRows.forEach((row, index) => {
          console.log(`Row ${index + 1}:`, row.substring(0, 200));
        });
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
          
          console.log(`Table pattern ${i + 1} found:`, { course: course.substring(0, 50), percentage: percentageStr });
          
          // Filter out header rows
          const isHeaderRow = course.toLowerCase() === 'course' || 
                             percentageStr.toLowerCase() === 'percentage' ||
                             (course.toLowerCase().includes('course') && course.length < 20);
          
          if (!isHeaderRow) {
            const percentage = parseFloat(percentageStr);
            if (!isNaN(percentage) && percentage >= 0 && percentage <= 100) {
              tempGrades.push({ course, percentage });
              console.log(`Added table grade: ${course.substring(0, 30)}... -> ${percentage}%`);
            }
          } else {
            console.log(`Skipped header row: ${course} -> ${percentageStr}`);
          }
        }
        
        if (tempGrades.length > 0) {
          tableGrades = tempGrades;
          console.log(`Table pattern ${i + 1} succeeded with ${tempGrades.length} grades`);
          break;
        }
      }
      
      if (tableGrades.length > 0) {
        console.log(`Table extraction succeeded with ${tableGrades.length} grades`);
        console.log(`Final: ${tableGrades.length} grades extracted`);
        console.log('=============================');
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
    console.log('Error extracting grade data:', error);
    return [];
  }
}

/**
 * Extract course-specific grade items (Quiz/Assignment table) and map to GradeData
 */
export function extractCourseGradeData(html: string): GradeData[] {
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
    console.log('=====================================');
    return items;
  } catch (error) {
    console.log('Error extracting course grade data:', error);
    return [];
  }
}

/**
 * Extract courses from HTML dropdown
 */
export function extractCourses(html: string): {value: string, text: string}[] {
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
console.log('Course dropdown not found in HTML');
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
console.log('Error extracting courses:', error);
    return [];
  }
}
