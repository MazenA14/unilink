import { ScheduleClass, ScheduleData, ScheduleDay } from '../types/gucTypes';

/**
 * Simple schedule parser that extracts all course data and maps it to days/periods
 */
export function parseScheduleDataSimple(html: string): ScheduleData {
  // Extract all course spans
  const courseSpans = extractCourseSpans(html);
  
  // Extract all course tables  
  const courseTables = extractCourseTables(html);
  
  // Combine and organize by day
  const schedule = organizeByDay(courseSpans, courseTables);
  
  return { days: schedule, type: 'personal' as const };
}

/**
 * Extract all course data from span elements
 */
function extractCourseSpans(html: string): CourseSpan[] {
  const spanPattern = /<span[^>]*id="ContentPlaceHolderright_ContentPlaceHoldercontent_XlblR(\d+)C(\d+)"[^>]*>([^<]*(?:<br[^>]*>[^<]*)*)<\/span>/gi;
  const spans: CourseSpan[] = [];
  
  let match;
  while ((match = spanPattern.exec(html)) !== null) {
    const content = match[3].trim();
    if (content && !content.includes('Free') && content.length > 3) {
      spans.push({
        row: parseInt(match[1]),
        period: parseInt(match[2]),
        content: content.replace(/<br[^>]*>/gi, '\n').replace(/<[^>]*>/g, '').trim()
      });
    }
  }
  
  return spans;
}

/**
 * Extract all course data from table elements
 */
function extractCourseTables(html: string): CourseTable[] {
  const tablePattern = /<table[^>]*id="(Table\d+)"[^>]*>([\s\S]*?)<\/table>/gi;
  const tables: CourseTable[] = [];
  
  let match;
  while ((match = tablePattern.exec(html)) !== null) {
    const tableId = match[1];
    const tableContent = match[2];
    
    // Extract course from table
    const courseRowMatch = tableContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/i);
    if (courseRowMatch) {
      const cells = [...courseRowMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
      if (cells.length >= 3) {
        const group = cells[0][1].replace(/<[^>]*>/g, '').trim();
        const room = cells[1][1].replace(/<[^>]*>/g, '').trim();
        const course = cells[2][1].replace(/<[^>]*>/g, '').trim();
        
        if (course && course.length > 3) {
          // Find which day this table belongs to by locating the nearest preceding row id or day heading
          const tableIndex = html.indexOf(match[0]);
          const beforeTable = html.substring(0, tableIndex);
          
          // 1) Prefer nearest preceding row id (e.g., Xrw4 / XaltR4)
          const rowIdRegex = /id="[^"]*(?:Xrw|XaltR)(\d+)"/gi;
          let lastRowMatch: RegExpExecArray | null = null;
          let iter: RegExpExecArray | null;
          while ((iter = rowIdRegex.exec(beforeTable)) !== null) {
            lastRowMatch = iter;
          }
          
          let detectedDay: string | null = null;
          if (lastRowMatch) {
            const rowIndex = parseInt(lastRowMatch[1], 10);
            const rowToDayMap: { [key: number]: string } = {
              1: 'Saturday',
              2: 'Sunday',
              3: 'Monday',
              4: 'Tuesday',
              5: 'Wednesday',
              6: 'Thursday'
            };
            detectedDay = rowToDayMap[rowIndex] || null;
          }
          
          // 2) Fallback: nearest preceding day heading
          if (!detectedDay) {
            const dayRegex = /<strong><font[^>]*>(Saturday|Sunday|Monday|Tuesday|Wednesday|Thursday)<\/font><\/strong>/gi;
            let lastDay: string | null = null;
            let dayMatchIter: RegExpExecArray | null;
            while ((dayMatchIter = dayRegex.exec(beforeTable)) !== null) {
              lastDay = dayMatchIter[1];
            }
            detectedDay = lastDay;
          }
          
          if (detectedDay) {
            tables.push({
              tableId,
              day: detectedDay,
              group,
              room,
              course: course.replace(/\s+/g, ' ').trim()
            });
          }
        }
      }
    }
  }
  
  return tables;
}

/**
 * Organize course data by day and create schedule structure
 */
function organizeByDay(spans: CourseSpan[], tables: CourseTable[]): ScheduleDay[] {
  const dayNames = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
  const rowToDayMap: { [key: number]: string } = {
    1: 'Saturday',
    2: 'Sunday', 
    3: 'Monday',
    4: 'Tuesday',
    5: 'Wednesday',
    6: 'Thursday'
  };
  
  const days: ScheduleDay[] = [];
  
  for (const dayName of dayNames) {
    // Get spans for this day
    const daySpans = spans.filter(span => rowToDayMap[span.row] === dayName);
    
    // Get tables for this day
    const dayTables = tables.filter(table => table.day === dayName);
    
    // Create periods array
    const periods = {
      first: getCourseForPeriod(daySpans, dayTables, dayName, 1),
      second: getCourseForPeriod(daySpans, dayTables, dayName, 2),
      third: getCourseForPeriod(daySpans, dayTables, dayName, 3),
      fourth: getCourseForPeriod(daySpans, dayTables, dayName, 4),
      fifth: getCourseForPeriod(daySpans, dayTables, dayName, 5)
    };
    
    const isFree = !periods.first && !periods.second && !periods.third && !periods.fourth && !periods.fifth;
    
    days.push({
      dayName,
      periods,
      isFree
    });
  }
  
  return days;
}

/**
 * Get course for a specific day and period
 */
function getCourseForPeriod(spans: CourseSpan[], tables: CourseTable[], dayName: string, periodIndex: number): ScheduleClass | null {
  // First check spans
  const span = spans.find(s => s.period === periodIndex);
  if (span) {
    return parseClassContent(span.content);
  }
  
  // Then check tables (map known table positions to periods)
  const tableMapping: { [key: string]: { [key: number]: string[] } } = {
    'Saturday': { 4: ['Table6'] },
    'Tuesday': { 1: ['Table18'], 2: ['Table19'] },
    'Wednesday': { 3: ['Table25'] },
    'Thursday': { 1: ['Table28'], 2: ['Table29'], 3: ['Table30'] }
  };
  
  const expectedTables = tableMapping[dayName]?.[periodIndex] || [];
  for (const tableId of expectedTables) {
    const table = tables.find(t => t.tableId === tableId);
    if (table) {
      return {
        courseName: table.course,
        room: table.room,
        instructor: table.group
      };
    }
  }
  
  return null;
}

/**
 * Parse class content to extract course details
 */
function parseClassContent(content: string): ScheduleClass {
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  
  if (lines.length === 0) {
    return { courseName: content };
  }
  
  const courseName = lines[0];
  let room: string | undefined;
  let instructor: string | undefined;
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for room patterns (e.g., "H18", "C3.201", etc.)
    if (line.match(/^[A-Z]\d+(\.\d+)?$/) || line.toLowerCase().includes('room')) {
      room = line.replace(/room:\s*/i, '');
    }
    // If it looks like a group identifier, treat as instructor info
    else if (line.match(/\d+[A-Z]+\s+[A-Z]\d+/)) {
      instructor = line;
    }
  }
  
  return {
    courseName,
    instructor,
    room
  };
}

// Helper types
interface CourseSpan {
  row: number;
  period: number;
  content: string;
}

interface CourseTable {
  tableId: string;
  day: string;
  group: string;
  room: string;
  course: string;
}
