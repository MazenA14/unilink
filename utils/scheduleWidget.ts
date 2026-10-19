import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';
import { resolveCourseTitle } from './courseTitle';
import { getTimeSlots } from './currentSlotUtils';
import { GradeCache } from './gradeCache';
import type { ScheduleData } from './types/gucTypes';

/**
 * Bridge to the native Android home-screen schedule widget (see
 * plugins/schedulewidget). The widget can't run JS, so we hand it a fully
 * resolved weekly snapshot (titles, times in minutes, rooms). The widget itself
 * picks today's day and the current session, and reschedules itself at every
 * slot boundary, so it stays accurate even while the app is closed.
 */

const { ScheduleWidget } = NativeModules as {
  ScheduleWidget?: {
    setData(json: string): Promise<void>;
    clear(): Promise<void>;
  };
};

const PERIOD_KEYS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'] as const;

const SLOT_TYPE_COLORS: Record<string, string> = {
  Lecture: '#3B82F6',
  Tutorial: '#10B981',
  Lab: '#F59E0B',
  Practical: '#FF6B35',
  Seminar: '#8B5CF6',
  Workshop: '#EF4444',
  Project: '#06B6D4',
  Thesis: '#84CC16',
  Free: '#6B7280',
};

export interface WidgetSession {
  period: string;     // "1st"
  start: number;      // minutes since midnight
  end: number;
  startLabel: string; // "8:15"
  endLabel: string;
  title: string;
  type?: string;
  room?: string;
  code?: string;
  color: string;
  count: number;      // number of classes sharing this slot
}

export interface WidgetPayload {
  updatedAt: number;
  days: Record<string, WidgetSession[]>;
}

const isAvailable = () => Platform.OS === 'android' && !!ScheduleWidget;

export function buildWidgetPayload(
  scheduleData: ScheduleData,
  isShiftedScheduleEnabled: boolean,
  courseNameMapping: Record<string, string>
): WidgetPayload {
  const slots = getTimeSlots(isShiftedScheduleEnabled);
  const days: Record<string, WidgetSession[]> = {};

  for (const day of scheduleData.days ?? []) {
    const sessions: WidgetSession[] = [];
    const periods = (day.periods ?? {}) as Record<string, any>;

    PERIOD_KEYS.forEach((key, index) => {
      const entry = periods[key];
      const classes = Array.isArray(entry) ? entry : entry ? [entry] : [];
      const classData = classes[0];
      const slot = slots[index];
      if (!classData || !slot) return;

      sessions.push({
        period: slot.name,
        start: slot.startHour * 60 + slot.startMinute,
        end: slot.endHour * 60 + slot.endMinute,
        startLabel: slot.startTime,
        endLabel: slot.endTime,
        title: resolveCourseTitle(classData.courseName, courseNameMapping),
        type: classData.slotType || undefined,
        room: classData.room || undefined,
        code: classData.courseCode || undefined,
        color: SLOT_TYPE_COLORS[classData.slotType as string] ?? '#FF6B6B',
        count: classes.length,
      });
    });

    days[day.dayName] = sessions;
  }

  return { updatedAt: Date.now(), days };
}

/**
 * Push the personal schedule to the home-screen widget. When no data is passed
 * the cached schedule is used. Never throws: the widget is best-effort.
 */
export async function syncScheduleWidget(scheduleData?: ScheduleData | null): Promise<void> {
  if (!isAvailable()) return;
  try {
    const data = scheduleData ?? (await GradeCache.getCachedScheduleData());
    if (!data) return;

    const [shiftedRaw, mapping] = await Promise.all([
      AsyncStorage.getItem('shiftedScheduleEnabled'),
      GradeCache.getCachedCourseIdToName(),
    ]);
    const isShifted = shiftedRaw ? JSON.parse(shiftedRaw) === true : false;

    const payload = buildWidgetPayload(data, isShifted, mapping ?? {});
    await ScheduleWidget!.setData(JSON.stringify(payload));
  } catch {
    // Widget sync is best-effort
  }
}

/** Remove the schedule from the widget (e.g. on logout). */
export async function clearScheduleWidget(): Promise<void> {
  if (!isAvailable()) return;
  try {
    await ScheduleWidget!.clear();
  } catch {
    // Widget sync is best-effort
  }
}
