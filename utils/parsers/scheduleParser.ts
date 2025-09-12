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
  
  const tableHtml = tableMatch[1];
  
  // Find all day rows (rows with day names)
  const dayRows = tableHtml.match(/<tr[^>]*id="ContentPlaceHolderright_ContentPlaceHoldercontent_Xrw\d+"[^>]*>([\s\S]*?)<\/tr>/gi);
  
  if (!dayRows) {
    throw new Error('No day rows found in schedule table');
  }
  
  for (const dayRow of dayRows) {
    const day = parseDayRow(dayRow);
    if (day && day.dayName !== 'Friday') {
      days.push(day);
    }
  }
  
  return { days };
}

/**
 * Parse a single day row from the schedule table
 */
function parseDayRow(dayRowHtml: string): ScheduleDay | null {
  // Extract day name
  const dayNameMatch = dayRowHtml.match(/<strong><font[^>]*>([^<]+)<\/font><\/strong>/i);
  if (!dayNameMatch) {
    return null;
  }
  
  const dayName = dayNameMatch[1].trim();
  
  // Check if this day is marked as "Free"
  const isFree = dayRowHtml.includes('Free') || dayRowHtml.includes('bgcolor="#99ffff"');
  
  // Extract periods (5 columns for 5 periods)
  const periods = {
    first: extractPeriodData(dayRowHtml, 1),
    second: extractPeriodData(dayRowHtml, 2),
    third: extractPeriodData(dayRowHtml, 3),
    fourth: extractPeriodData(dayRowHtml, 4),
    fifth: extractPeriodData(dayRowHtml, 5)
  };
  
  return {
    dayName,
    periods,
    isFree
  };
}

/**
 * Extract period data for a specific period number
 */
function extractPeriodData(dayRowHtml: string, periodNumber: number): ScheduleClass | null {
  // Look for the specific period cell using the pattern from the HTML
  const periodPattern = new RegExp(
    `<td[^>]*width="180"[^>]*>([\\s\\S]*?<span[^>]*id="ContentPlaceHolderright_ContentPlaceHoldercontent_XlblR\\d+C${periodNumber}"[^>]*>([^<]*)<\\/span>[\\s\\S]*?)<\\/td>`,
    'i'
  );
  
  const match = dayRowHtml.match(periodPattern);
  if (!match || !match[2]) {
    return null;
  }
  
  const content = match[2].trim();
  if (!content || content === '') {
    return null;
  }
  
  // Parse the content to extract course information
  return parseClassContent(content);
}

/**
 * Parse class content to extract course details
 */
function parseClassContent(content: string): ScheduleClass {
  // The content might contain course name, instructor, room, etc.
  // For now, we'll treat the entire content as the course name
  // In a real implementation, you might want to parse this more sophisticatedly
  
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  
  if (lines.length === 0) {
    return { courseName: content };
  }
  
  const courseName = lines[0];
  
  // Try to extract additional information if available
  let instructor: string | undefined;
  let room: string | undefined;
  let time: string | undefined;
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for room patterns (e.g., "Room: C3.201", "C3.201", etc.)
    if (line.match(/^[A-Z]\d+\.\d+/) || line.toLowerCase().includes('room')) {
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
  }
  
  return {
    courseName,
    instructor,
    room,
    time
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
  
  return { days };
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
