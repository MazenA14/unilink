import { ScheduleClass, ScheduleData, ScheduleDay } from '../types/gucTypes';

/**
 * Parse schedule data from HTML table
 */
export function parseScheduleData(html: string): ScheduleData {
  const days: ScheduleDay[] = [];
  
  // Extract the main schedule table
  const tableMatch = html.match(/<table[^>]*id="ContentPlaceHolderright_ContentPlaceHoldercontent_scdTbl"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) {
    throw new Error('Schedule table not found in HTML');
  }
  
  // Define the days of the week (excluding Friday)
  const dayNames = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
  
  // Instead of trying to parse table rows directly (which fails due to nested tables),
  // let's look for days by their specific patterns and then extract data for each
  for (const dayName of dayNames) {
    // Look for the day name pattern
    const dayPattern = new RegExp(`<strong><font[^>]*>${dayName}<\/font><\/strong>`, 'i');
    const dayMatch = html.match(dayPattern);
    
    if (dayMatch) {
      // Find the full row context for this day
      const dayIndex = html.indexOf(dayMatch[0]);
      
      // Get a much larger context window to capture all tables for this day
      // Based on analysis, tables can be 2500+ chars away from day name
      const rowStart = Math.max(0, dayIndex - 500);
      const rowEnd = Math.min(html.length, dayIndex + 5000);
      const dayContext = html.substring(rowStart, rowEnd);
      
      // Extract row ID using the working method 1
      const rowIdMatch = dayContext.match(/id="[^"]*(?:Xrw|XaltR)(\d+)"/i);
      if (rowIdMatch) {
        const rowIndex = parseInt(rowIdMatch[1]);
        
        // Check if this is a completely free day
        // For free days, we should see colspan="6" and "Free" text, but no course tables
        const isCompletelyFree = dayContext.includes('colspan="6"') && dayContext.includes('Free') && 
                                 !dayContext.match(/<table[^>]*id="Table\d+"[^>]*>[\s\S]*?<td[^>]*>[^<]*[A-Z]{3,}[^<]*<\/td>/i);
        
        let periods;
        if (isCompletelyFree) {
          periods = {
            first: null,
            second: null,
            third: null,
            fourth: null,
            fifth: null
          };
        } else {
          periods = {
            first: extractPeriodDataImproved(dayContext, html, rowIndex, 1),
            second: extractPeriodDataImproved(dayContext, html, rowIndex, 2),
            third: extractPeriodDataImproved(dayContext, html, rowIndex, 3),
            fourth: extractPeriodDataImproved(dayContext, html, rowIndex, 4),
            fifth: extractPeriodDataImproved(dayContext, html, rowIndex, 5)
          };
        }
        
        const day: ScheduleDay = {
          dayName,
          periods,
          isFree: isCompletelyFree || (!periods.first && !periods.second && !periods.third && !periods.fourth && !periods.fifth)
        };
        
        days.push(day);
      }
    }
  }
  
  return { days, type: 'personal' as const };
}



/**
 * Improved period data extraction that handles multiple HTML structures
 */
function extractPeriodDataImproved(dayRowHtml: string, fullHtml: string, rowIndex: number, periodIndex: number): ScheduleClass | null {
  // First, try to extract from the span element (simple format)
  const spanPattern = new RegExp(
    `<span[^>]*id="ContentPlaceHolderright_ContentPlaceHoldercontent_XlblR${rowIndex}C${periodIndex}"[^>]*>([^<]*(?:<br[^>]*>[^<]*)*)<\\/span>`,
    'i'
  );
  
  const spanMatch = fullHtml.match(spanPattern);
  if (spanMatch && spanMatch[1] && spanMatch[1].trim() !== '' && !spanMatch[1].includes('Free')) {
    const content = spanMatch[1].trim();
    return parseClassContent(content);
  }
  
  // If span shows Free, return null (free period)
  if (spanMatch && spanMatch[1] && spanMatch[1].includes('Free')) {
    return null;
  }
  
  // If no span data, try to extract from complex tables based on specific mappings
  return extractFromComplexTables(dayRowHtml, fullHtml, rowIndex, periodIndex);
}

/**
 * Extract course data from complex table structures
 */
function extractFromComplexTables(dayRowHtml: string, fullHtml: string, rowIndex: number, periodIndex: number): ScheduleClass | null {
  // Get all tables in the day context
  const allTables = [...dayRowHtml.matchAll(/<table[^>]*id="Table\d+"[^>]*>([\s\S]*?)<\/table>/gi)];
  
  // Define mapping based on the actual HTML structure analysis
  let targetTableIndex = -1;
  
  if (rowIndex === 1) { // Saturday
    if (periodIndex === 4) targetTableIndex = 0; // Table6 for Period 4
  } else if (rowIndex === 4) { // Tuesday  
    if (periodIndex === 1) targetTableIndex = 0; // Table18 for Period 1
    if (periodIndex === 2) targetTableIndex = 1; // Table19 for Period 2
    if (periodIndex === 3) targetTableIndex = -1; // Period 3 has span, not table
  } else if (rowIndex === 5) { // Wednesday
    if (periodIndex === 3) targetTableIndex = 0; // Table25 for Period 3
  } else if (rowIndex === 6) { // Thursday
    if (periodIndex === 1) targetTableIndex = 0; // Table28 for Period 1
    if (periodIndex === 2) targetTableIndex = 1; // Table29 for Period 2  
    if (periodIndex === 3) targetTableIndex = 2; // Table30 for Period 3
  }
  
  if (targetTableIndex >= 0 && targetTableIndex < allTables.length) {
    const tableContent = allTables[targetTableIndex][1];
    
    // Look for rows with course information
    const courseRowMatch = tableContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/i);
    if (courseRowMatch) {
      const rowContent = courseRowMatch[1];
      
      // Extract individual cells from the row
      const cells = [...rowContent.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
      
      if (cells.length >= 3) {
        // Extract group, room, and course information
        const group = cells[0][1].replace(/<[^>]*>/g, '').trim();
        const room = cells[1][1].replace(/<[^>]*>/g, '').trim();
        const courseCell = cells[2][1];
        
        // Extract course name and type from the third cell
        const courseName = courseCell.replace(/<[^>]*>/g, '').trim();
        
        if (courseName && courseName !== '') {
          return {
            courseName,
            room: room || undefined,
            instructor: group || undefined
          };
        }
      }
    }
  }
  
  return null;
}

/**
 * Parse class content to extract course details
 */
function parseClassContent(content: string): ScheduleClass {
  // Clean up the content by removing HTML tags and normalizing line breaks
  const cleanContent = content
    .replace(/<br[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .trim();
  
  const lines = cleanContent.split('\n').map(line => line.trim()).filter(line => line);
  
  if (lines.length === 0) {
    return { courseName: cleanContent };
  }
  
  const courseName = lines[0];
  
  // Try to extract additional information if available
  let instructor: string | undefined;
  let room: string | undefined;
  let time: string | undefined;
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for room patterns (e.g., "H18", "C3.201", etc.)
    if (line.match(/^[A-Z]\d+(\.\d+)?$/) || line.toLowerCase().includes('room')) {
      room = line.replace(/room:\s*/i, '');
    }
    // Look for time patterns
    else if (line.match(/\d{1,2}:\d{2}/) || line.toLowerCase().includes('time')) {
      time = line.replace(/time:\s*/i, '');
    }
    // Look for instructor patterns
    else if (line.toLowerCase().includes('dr.') || line.toLowerCase().includes('prof.')) {
      instructor = line;
    }
    // If it looks like a group identifier (e.g., "7MET L002"), treat as instructor info
    else if (line.match(/\d+[A-Z]+\s+[A-Z]\d+/)) {
      instructor = line;
    }
  }
  
  // Extract slot type from course name
  const getSlotType = (courseName: string): string => {
    const name = courseName.toLowerCase();
    
    // First check for parentheses format: "(Lecture)", "(Tutorial)", etc.
    const parenthesesMatch = name.match(/\(([^)]+)\)/);
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
    
    // Fallback to checking for space-separated format or direct inclusion
    if (name.includes(' lecture') || name.includes('lecture')) {
      return 'Lecture';
    }
    if (name.includes(' tutorial') || name.includes('tutorial') || name.includes(' tut')) {
      return 'Tutorial';
    }
    if (name.includes(' lab') || name.includes('lab') || name.includes('laboratory')) {
      return 'Lab';
    }
    if (name.includes(' practical') || name.includes('practical')) {
      return 'Practical';
    }
    if (name.includes(' seminar') || name.includes('seminar')) {
      return 'Seminar';
    }
    if (name.includes(' workshop') || name.includes('workshop')) {
      return 'Workshop';
    }
    if (name.includes(' project') || name.includes('project')) {
      return 'Project';
    }
    if (name.includes(' thesis') || name.includes('thesis') || name.includes('dissertation')) {
      return 'Thesis';
    }
    
    return 'Lecture';
  };

  return {
    courseName,
    instructor,
    room,
    time,
    slotType: getSlotType(courseName)
  };
}

/**
 * Alternative parser for when the schedule has a different structure
 */
export function parseScheduleDataAlternative(html: string): ScheduleData {
  const days: ScheduleDay[] = [];
  
  // Define the days of the week (excluding Friday)
  const dayNames = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
  
  for (let i = 0; i < dayNames.length; i++) {
    const dayName = dayNames[i];
    const rowIndex = i + 1; // Rows start from 1
    
    // Check if this day is free
    const freeRowPattern = new RegExp(
      `<tr[^>]*id="ContentPlaceHolderright_ContentPlaceHoldercontent_XaltR${rowIndex}"[^>]*>([\\s\\S]*?)<\\/tr>`,
      'i'
    );
    const freeRowMatch = html.match(freeRowPattern);
    const isFree = !!(freeRowMatch && freeRowMatch[1].includes('Free'));
    
    // Extract periods for this day
    const periods = {
      first: extractPeriodDataAlternative(html, rowIndex, 1),
      second: extractPeriodDataAlternative(html, rowIndex, 2),
      third: extractPeriodDataAlternative(html, rowIndex, 3),
      fourth: extractPeriodDataAlternative(html, rowIndex, 4),
      fifth: extractPeriodDataAlternative(html, rowIndex, 5)
    };
    
    days.push({
      dayName,
      periods,
      isFree
    });
  }
  
  return { days, type: 'personal' as const };
}

/**
 * Alternative method to extract period data
 */
function extractPeriodDataAlternative(html: string, rowIndex: number, periodIndex: number): ScheduleClass | null {
  const spanPattern = new RegExp(
    `<span[^>]*id="ContentPlaceHolderright_ContentPlaceHoldercontent_XlblR${rowIndex}C${periodIndex}"[^>]*>([^<]*)<\\/span>`,
    'i'
  );
  
  const match = html.match(spanPattern);
  if (!match || !match[1]) {
    return null;
  }
  
  const content = match[1].trim();
  if (!content || content === '') {
    return null;
  }
  
  return parseClassContent(content);
}
