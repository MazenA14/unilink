import { ScheduleClass, ScheduleData } from '@/components/schedule/types';
import { documentDirectory, writeAsStringAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

/**
 * Get period timing based on shifted schedule setting
 */
function getPeriodTimings(isShiftedScheduleEnabled: boolean) {
  return {
    first: { start: '08:15', end: '09:45' },
    second: { start: '10:00', end: '11:30' },
    third: isShiftedScheduleEnabled 
      ? { start: '12:00', end: '13:30' } 
      : { start: '11:45', end: '13:15' },
    fourth: isShiftedScheduleEnabled 
      ? { start: '14:00', end: '15:30' } 
      : { start: '13:45', end: '15:15' },
    fifth: isShiftedScheduleEnabled 
      ? { start: '16:00', end: '17:30' } 
      : { start: '15:45', end: '17:15' },
    sixth: { start: '17:30', end: '19:00' },
    seventh: { start: '19:15', end: '20:45' },
    eighth: { start: '21:00', end: '22:30' },
  };
}

// Day name to day of week mapping (0 = Sunday, 1 = Monday, etc.)
const DAY_TO_DOW = {
  'Sunday': 0,
  'Monday': 1,
  'Tuesday': 2,
  'Wednesday': 3,
  'Thursday': 4,
  'Friday': 5,
  'Saturday': 6,
};

/**
 * Convert a date to ICS format (YYYYMMDDTHHMMSSZ)
 */
function formatDateToICS(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Escape special characters for ICS format
 */
function escapeICSString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

/**
 * Generate a unique UID for calendar events
 */
function generateUID(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@uni-link.app`;
}

/**
 * Get the next occurrence of a specific day of week
 */
function getNextOccurrence(dayOfWeek: number, startDate: Date = new Date()): Date {
  const date = new Date(startDate);
  const currentDay = date.getDay();
  const daysUntilTarget = (dayOfWeek - currentDay + 7) % 7;
  
  // If it's the same day, move to next week
  const daysToAdd = daysUntilTarget === 0 ? 7 : daysUntilTarget;
  
  date.setDate(date.getDate() + daysToAdd);
  return date;
}

/**
 * Create a recurring event for a class that happens every week
 */
function createRecurringEvent(
  course: ScheduleClass,
  dayOfWeek: number,
  periodKey: string,
  startDate: Date,
  endDate: Date,
  isShiftedScheduleEnabled: boolean
): string {
  const periodTimings = getPeriodTimings(isShiftedScheduleEnabled);
  const timing = periodTimings[periodKey as keyof typeof periodTimings];
  if (!timing) return '';

  const eventStart = getNextOccurrence(dayOfWeek, startDate);
  eventStart.setHours(
    parseInt(timing.start.split(':')[0]),
    parseInt(timing.start.split(':')[1]),
    0,
    0
  );

  const eventEnd = new Date(eventStart);
  eventEnd.setHours(
    parseInt(timing.end.split(':')[0]),
    parseInt(timing.end.split(':')[1]),
    0,
    0
  );

  // Calculate the number of weeks between start and end date for logging
  const weeksDiff = Math.ceil((endDate.getTime() - eventStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
  console.log(`Creating ICS recurring event for ${weeksDiff} weeks`);

  const uid = generateUID();
  const summary = escapeICSString(course.courseName || course.courseCode || 'Class');
  const location = course.room ? escapeICSString(course.room) : '';
  const description = [
    course.courseCode && `Course: ${course.courseCode}`,
    course.instructor && `Instructor: ${course.instructor}`,
    course.slotType && `Type: ${course.slotType}`,
  ].filter(Boolean).join('\\n');

  return [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART:${formatDateToICS(eventStart)}`,
    `DTEND:${formatDateToICS(eventEnd)}`,
    `SUMMARY:${summary}`,
    location && `LOCATION:${location}`,
    description && `DESCRIPTION:${escapeICSString(description)}`,
    `RRULE:FREQ=WEEKLY;INTERVAL=1;UNTIL=${formatDateToICS(endDate)}`,
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'END:VEVENT',
  ].filter(Boolean).join('\r\n');
}

/**
 * Export schedule data to ICS format
 * Creates a calendar file that can be imported into any calendar application
 * 
 * @param scheduleData - The schedule data to export
 * @param isShiftedScheduleEnabled - Whether the shifted schedule timing is enabled
 * @param startDate - Start date for the events (optional)
 * @param endDate - End date for the events (optional)
 * @throws Error if no schedule data is available or sharing is not available
 */
export async function exportScheduleToICS(
  scheduleData: ScheduleData, 
  isShiftedScheduleEnabled: boolean = false,
  startDate?: Date,
  endDate?: Date
): Promise<void> {
  if (!scheduleData || !scheduleData.days || scheduleData.days.length === 0) {
    throw new Error('No schedule data to export');
  }

  // Use provided dates or default to current semester
  const eventStartDate = startDate || new Date();
  const eventEndDate = endDate || new Date(Date.now() + 16 * 7 * 24 * 60 * 60 * 1000); // 16 weeks from now
  
  // ICS file header
  const calendarName = scheduleData.type === 'personal' ? 'Personal Schedule' : 
                      scheduleData.type === 'staff' ? 'Staff Schedule' : 
                      scheduleData.type === 'course' ? 'Course Schedule' : 'Schedule';
  
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Uni-Link//Schedule Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calendarName}`,
    `X-WR-CALDESC:Exported from Uni-Link App - ${calendarName}`,
    `X-WR-TIMEZONE:Africa/Cairo`,
  ].join('\r\n') + '\r\n';

  // Process each day
  for (const day of scheduleData.days) {
    const dayOfWeek = DAY_TO_DOW[day.dayName as keyof typeof DAY_TO_DOW];
    if (dayOfWeek === undefined) continue;

    // Process each period
    const periods = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'] as const;
    
    for (const periodKey of periods) {
      const classes = day.periods[periodKey];
      if (!classes || classes.length === 0) continue;

      // Create events for each class in this period
      for (const course of classes) {
        const event = createRecurringEvent(course, dayOfWeek, periodKey, eventStartDate, eventEndDate, isShiftedScheduleEnabled);
        if (event) {
          icsContent += event + '\r\n';
        }
      }
    }
  }

  // ICS file footer
  icsContent += 'END:VCALENDAR\r\n';

  // Generate filename with timestamp
  const semester = getCurrentSemester();
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const filename = `uni-link_schedule_${scheduleData.type}_${semester}_${timestamp}.ics`;
  
  // Write file using legacy API to avoid deprecation warnings
  const fileUri = `${documentDirectory}${filename}`;
  await writeAsStringAsync(fileUri, icsContent, {
    encoding: 'utf8',
  });

  // Share the file
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/calendar',
      dialogTitle: 'Export Schedule to Calendar',
      UTI: 'com.apple.ical.ics', // iOS Universal Type Identifier for calendar files
    });
  } else {
    throw new Error('Sharing is not available on this device');
  }
}

/**
 * Get current semester identifier
 */
function getCurrentSemester(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 0-based to 1-based
  
  // Fall semester: September - December
  if (month >= 9 && month <= 12) {
    return `Fall${year}`;
  }
  // Spring semester: January - May
  else if (month >= 1 && month <= 5) {
    return `Spring${year}`;
  }
  // Summer semester: June - August
  else {
    return `Summer${year}`;
  }
}

/**
 * Check if schedule data has any classes to export
 */
export function hasScheduleData(scheduleData: ScheduleData): boolean {
  if (!scheduleData || !scheduleData.days) return false;
  
  return scheduleData.days.some(day => {
    const periods = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'] as const;
    return periods.some(periodKey => {
      const classes = day.periods[periodKey];
      return classes && classes.length > 0;
    });
  });
}
