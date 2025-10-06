import { ScheduleClass, ScheduleData } from '@/components/schedule/types';
import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

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
 * Get the default calendar ID
 */
async function getDefaultCalendarId(): Promise<string | null> {
  try {
    // On iOS, find the first writable calendar
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const defaultCalendars = calendars.filter(calendar => calendar.allowsModifications);
    
    if (defaultCalendars.length > 0) {
      return defaultCalendars[0].id;
    }
    
    // Android has a default calendar concept
    if (Platform.OS === 'android') {
      // For Android, try to find the primary calendar
      const primaryCalendars = calendars.filter(calendar => 
        calendar.source && calendar.source.name === 'Default'
      );
      if (primaryCalendars.length > 0) {
        return primaryCalendars[0].id;
      }
    }
    
    return null; // No writable calendar found
  } catch (error) {
    console.error('Error getting default calendar:', error);
    return null;
  }
}

/**
 * Create a calendar event for a class with recurrence
 */
async function createCalendarEvent(
  course: ScheduleClass,
  dayOfWeek: number,
  periodKey: string,
  startDate: Date,
  endDate: Date,
  isShiftedScheduleEnabled: boolean,
  calendarId: string
): Promise<string | null> {
  const periodTimings = getPeriodTimings(isShiftedScheduleEnabled);
  const timing = periodTimings[periodKey as keyof typeof periodTimings];
  if (!timing) return null;

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

  const title = course.courseName || course.courseCode || 'Class';
  const location = course.room || '';
  const notes = [
    course.courseCode && `Course: ${course.courseCode}`,
    course.instructor && `Instructor: ${course.instructor}`,
    course.slotType && `Type: ${course.slotType}`,
  ].filter(Boolean).join('\n');

  // Calculate the number of weeks between start and end date for logging
  const weeksDiff = Math.ceil((endDate.getTime() - eventStart.getTime()) / (7 * 24 * 60 * 60 * 1000));

  try {
    
    console.log('Creating calendar event:', {
      title,
      startDate: eventStart.toISOString(),
      endDate: eventEnd.toISOString(),
      location,
      notes,
      recurrenceEndDate: endDate.toISOString(),
      weeksDiff
    });
    
    console.log(`Creating recurring event for ${weeksDiff} weeks`);

    const eventDetails = {
      title,
      startDate: eventStart,
      endDate: eventEnd,
      timeZone: 'Africa/Cairo',
      location,
      notes,
      recurrenceRule: {
        frequency: Calendar.Frequency.WEEKLY,
        interval: 1,
        occurrence: weeksDiff,
      },
    };

    const eventId = await Calendar.createEventAsync(calendarId, eventDetails);
    console.log('Event created successfully with ID:', eventId);
    return eventId;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    console.error('Event details that failed:', {
      title,
      startDate: eventStart.toISOString(),
      endDate: eventEnd.toISOString(),
      location,
      notes,
      recurrenceEndDate: endDate.toISOString(),
      recurrenceRule: {
        frequency: 'WEEKLY',
        interval: 1,
        occurrence: weeksDiff,
      }
    });
    return null;
  }
}

/**
 * Request calendar permissions
 */
export async function requestCalendarPermissions(): Promise<{ granted: boolean; status: string }> {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    console.log('Calendar permission status:', status);
    return {
      granted: status === 'granted',
      status
    };
  } catch (error) {
    console.error('Error requesting calendar permissions:', error);
    return { granted: false, status: 'error' };
  }
}

/**
 * Add schedule events directly to the user's calendar using Expo Calendar
 */
export async function addScheduleToCalendar(
  scheduleData: ScheduleData, 
  isShiftedScheduleEnabled: boolean = false,
  startDate?: Date,
  endDate?: Date
): Promise<{ success: number; failed: number; total: number }> {
  if (!scheduleData || !scheduleData.days || scheduleData.days.length === 0) {
    throw new Error('No schedule data to add to calendar');
  }

  // Request permissions first
  const permissionResult = await requestCalendarPermissions();
  console.log('Permission result:', permissionResult);
  
  if (!permissionResult.granted) {
    throw new Error(`Calendar permission is required. Current status: ${permissionResult.status}. Please grant permission when prompted.`);
  }

  // Get the default calendar ID
  const calendarId = await getDefaultCalendarId();
  if (!calendarId) {
    throw new Error('Could not find a writable calendar on this device.');
  }

  console.log('Using calendar ID:', calendarId);

  // Use provided dates or default to current semester
  const eventStartDate = startDate || new Date();
  const eventEndDate = endDate || new Date(Date.now() + 16 * 7 * 24 * 60 * 60 * 1000); // 16 weeks from now

  console.log('Event date range:', {
    start: eventStartDate.toISOString(),
    end: eventEndDate.toISOString()
  });

  let successCount = 0;
  let failedCount = 0;
  let totalCount = 0;

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
        totalCount++;
        const eventId = await createCalendarEvent(
          course, 
          dayOfWeek, 
          periodKey, 
          eventStartDate, 
          eventEndDate, 
          isShiftedScheduleEnabled, 
          calendarId
        );
        if (eventId) {
          successCount++;
        } else {
          failedCount++;
        }
      }
    }
  }

  return { success: successCount, failed: failedCount, total: totalCount };
}

/**
 * Test calendar integration with a simple event
 */
export async function testCalendarIntegration(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Testing Expo calendar integration...');
    
    // Check permissions first
    const permissionResult = await requestCalendarPermissions();
    console.log('Test permission result:', permissionResult);
    
    if (!permissionResult.granted) {
      return { success: false, error: `Permission not granted. Status: ${permissionResult.status}` };
    }
    
    // Get calendar ID
    const calendarId = await getDefaultCalendarId();
    if (!calendarId) {
      return { success: false, error: 'Could not find a writable calendar' };
    }
    
    // Try to create a simple test event
    const testEventId = await Calendar.createEventAsync(calendarId, {
      title: 'Test Event from Uni-Link',
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // Tomorrow + 1 hour
      timeZone: 'Africa/Cairo',
      location: 'Test Location',
      notes: 'This is a test event from Uni-Link app',
    });
    
    console.log('Test event created with ID:', testEventId);
    
    // Clean up the test event
    if (testEventId) {
      await Calendar.deleteEventAsync(testEventId);
      console.log('Test event cleaned up');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Test calendar integration failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Check if schedule data has any classes to add to calendar
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
