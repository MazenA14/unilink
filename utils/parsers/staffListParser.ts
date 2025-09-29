import { ScheduleOption } from '@/components/schedule/types';

export interface StaffListData {
  courses: ScheduleOption[];
  tas: ScheduleOption[];
}

/**
 * Parse staff list HTML response to extract courses and TAs
 * The HTML contains JavaScript arrays with course and TA data
 */
export function parseStaffListHtml(html: string): StaffListData {
  try {
    
    // Look for the JavaScript arrays in the HTML
    // Try different patterns to find the arrays
    let coursesMatch = html.match(/var courses = \[(.*?)\]/s);
    let tasMatch = html.match(/var tas = \[(.*?)\]/s);
    
    // If not found with var, try without var
    if (!coursesMatch) {
      coursesMatch = html.match(/courses = \[(.*?)\]/s);
    }
    if (!tasMatch) {
      tasMatch = html.match(/tas = \[(.*?)\]/s);
    }
    
    // If still not found, try with different spacing
    if (!coursesMatch) {
      coursesMatch = html.match(/courses\s*=\s*\[(.*?)\]/s);
    }
    if (!tasMatch) {
      tasMatch = html.match(/tas\s*=\s*\[(.*?)\]/s);
    }
    
    // Log what we found
    
    if (!coursesMatch || !tasMatch) {
      // Log a sample of the HTML to help debug
      const sampleHtml = html.substring(0, 1000);
      throw new Error('Could not find courses or tas arrays in HTML');
    }

    // Parse the JavaScript arrays
    const coursesArray = parseJavaScriptArray(coursesMatch[1]);
    const tasArray = parseJavaScriptArray(tasMatch[1]);

    

    // Convert to ScheduleOption format
    const courses: ScheduleOption[] = coursesArray.map((item: any) => ({
      id: item.id,
      name: item.value,
      department: extractDepartmentFromCourseName(item.value),
      additionalInfo: extractCourseInfo(item.value),
    }));

    const tas: ScheduleOption[] = tasArray.map((item: any) => ({
      id: item.id,
      name: item.value,
      // TAs don't show department or additionalInfo in the UI
    }));

    return { courses, tas };
  } catch (error) {
    throw new Error('Failed to parse staff list data');
  }
}

/**
 * Parse a JavaScript array string into actual array
 * Handles the format: { 'id': 'value', 'value': 'name' }, { 'id': 'value2', 'value': 'name2' }
 */
function parseJavaScriptArray(arrayString: string): any[] {
  try {
    // Clean up the string and wrap in brackets to make it a valid JSON array
    const cleanedString = arrayString
      .replace(/'/g, '"') // Replace single quotes with double quotes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Split by object boundaries and parse each object
    const objects: any[] = [];
    let currentObject = '';
    let braceCount = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < cleanedString.length; i++) {
      const char = cleanedString[i];
      const prevChar = i > 0 ? cleanedString[i - 1] : '';

      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar && prevChar !== '\\') {
        inString = false;
      } else if (!inString) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
        }
      }

      currentObject += char;

      if (!inString && braceCount === 0 && currentObject.trim()) {
        try {
          const obj = JSON.parse(currentObject.trim());
          objects.push(obj);
        } catch {
          // Skip malformed objects
        }
        currentObject = '';
      }
    }

    return objects;
  } catch (error) {
    return [];
  }
}

/**
 * Extract department from course name
 * Examples: "CSEN 101: Introduction to Computer Science" -> "Computer Science"
 */
function extractDepartmentFromCourseName(courseName: string): string {
  const departmentMap: { [key: string]: string } = {
    'CSEN': 'Computer Science',
    'CSIS': 'Computer Science',
    'MATH': 'Mathematics',
    'PHYS': 'Physics',
    'CHEM': 'Chemistry',
    'BIOT': 'Biotechnology',
    'ARCH': 'Architecture',
    'CIG': 'Civil Engineering',
    'CIS': 'Civil Engineering',
    'CIW': 'Civil Engineering',
    'ELCT': 'Electronics',
    'ENME': 'Mechanical Engineering',
    'MCTR': 'Mechatronics',
    'EDPT': 'Production Technology',
    'MATS': 'Materials Science',
    'NETW': 'Networking',
    'COMM': 'Communications',
    'DMET': 'Digital Media',
    'MGMT': 'Management',
    'CTRL': 'Management Control',
    'FINC': 'Finance',
    'MRKT': 'Marketing',
    'HROB': 'Human Resources',
    'OPER': 'Operations',
    'STRA': 'Strategic Management',
    'INNO': 'Innovation',
    'IBUS': 'International Business',
    'INSY': 'Information Systems',
    'BINF': 'Business Informatics',
    'ECON': 'Economics',
    'LAWS': 'Law',
    'CILA': 'Civil Law',
    'CMLA': 'Constitutional Law',
    'COLA': 'Commercial Law',
    'CRLA': 'Criminal Law',
    'ISSH': 'Islamic Sharia',
    'PRIN': 'Private Law',
    'PUIN': 'Public International Law',
    'LAW': 'Law',
    'PHBC': 'Pharmacy',
    'PHBL': 'Pharmacy',
    'PHBT': 'Pharmacy',
    'PHCM': 'Pharmacy',
    'PHMU': 'Pharmacy',
    'PHTC': 'Pharmacy',
    'PHTR': 'Pharmacy',
    'PHTX': 'Pharmacy',
    'PHPD': 'Pharmacy',
    'PHSO': 'Pharmacy',
    'CLPH': 'Clinical Pharmacy',
    'DBIM': 'Dental Biomaterials',
    'OBIO': 'Oral Biology',
    'HSTO': 'Histology',
    'ANTM': 'Anatomy',
    'GD': 'Graphic Design',
    'MD': 'Media Design',
    'PD': 'Product Design',
    'TH': 'Theory',
    'DD': 'Digital Design',
    'CBD': 'Communication Design',
    'AS': 'Academic Skills',
    'ABSK': 'Academic Business Skills',
    'DE': 'German',
    'ARAB': 'Arabic',
    'SM': 'Scientific Methods',
    'RPW': 'Research Paper Writing',
    'CPS': 'Communication Skills',
    'THSS': 'Thesis',
    'STAT': 'Statistics',
    'HUMA': 'Humanities',
    'PEPF': 'Political Economics',
    'UP': 'Urban Planning',
    'PMCM': 'Project Management',
    'PR': 'Project',
    'RSMD': 'Research Methodology',
  };

  // Extract course code (first part before colon)
  const courseCode = courseName.split(':')[0]?.trim();
  if (!courseCode) return 'General';

  // Extract department prefix (letters before numbers)
  const departmentMatch = courseCode.match(/^([A-Z]+)/);
  if (!departmentMatch) return 'General';

  const departmentPrefix = departmentMatch[1];
  return departmentMap[departmentPrefix] || 'General';
}

// Note: extractDepartmentFromTAName function removed as TAs don't show department info

/**
 * Extract additional course information
 */
function extractCourseInfo(courseName: string): string {
  // Extract credits or other info if available
  const creditMatch = courseName.match(/(\d+)\s*credits?/i);
  if (creditMatch) {
    return `${creditMatch[1]} Credits`;
  }

  // Extract course level from course code
  const levelMatch = courseName.match(/(\d{3})/);
  if (levelMatch) {
    const level = parseInt(levelMatch[1]);
    if (level < 200) return '100 Level';
    if (level < 300) return '200 Level';
    if (level < 400) return '300 Level';
    if (level < 500) return '400 Level';
    if (level < 600) return '500 Level';
    if (level < 700) return '600 Level';
    if (level < 800) return '700 Level';
    if (level < 900) return '800 Level';
    return '900 Level';
  }

  return 'Course';
}
