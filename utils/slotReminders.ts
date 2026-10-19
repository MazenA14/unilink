import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { NativeModules, Platform } from 'react-native';
import { resolveCourseTitle } from './courseTitle';
import { getTimeSlots } from './currentSlotUtils';
import { GradeCache } from './gradeCache';
import type { ScheduleData } from './types/gucTypes';

/**
 * Local "class starts soon" reminders. Each class slot in the personal schedule
 * gets one weekly repeating notification, registered with the OS so it fires
 * even while the app is closed. Reminders are rebuilt whenever the schedule is
 * refetched, the offset changes or slot times change (delayed 3rd slot).
 */

export const REMINDER_OFFSET_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
] as const;

export const DEFAULT_REMINDER_OFFSET = 15;

const OFFSET_KEY = 'slotReminderOffset';
const SIGNATURE_KEY = 'slotReminderSignature';
const PERMISSION_ASKED_KEY = 'slotReminderPermissionAsked';
const EXACT_PROMPTED_KEY = 'slotReminderExactPrompted';
const CHANNEL_ID = 'class-reminders';
const REMINDER_KIND = 'slot-reminder';

// Exact-alarm helpers live in the schedule widget's native module (plugins/schedulewidget)
const { ScheduleWidget } = NativeModules as {
  ScheduleWidget?: {
    canScheduleExactAlarms?(): Promise<boolean>;
    openExactAlarmSettings?(): Promise<boolean>;
  };
};

const PERIOD_KEYS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'] as const;

// expo-notifications weekly trigger: 1 = Sunday ... 7 = Saturday
const WEEKDAY_NUMBERS: Record<string, number> = {
  Sunday: 1,
  Monday: 2,
  Tuesday: 3,
  Wednesday: 4,
  Thursday: 5,
  Friday: 6,
  Saturday: 7,
};

interface PlannedReminder {
  id: string;
  weekday: number;
  hour: number;
  minute: number;
  title: string;
  body: string;
}

export function formatReminderOffset(minutes: number): string {
  return REMINDER_OFFSET_OPTIONS.find(o => o.value === minutes)?.label ?? `${minutes} min`;
}

export async function getReminderOffset(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(OFFSET_KEY);
    if (raw === null) return DEFAULT_REMINDER_OFFSET;
    const parsed = Number(raw);
    return REMINDER_OFFSET_OPTIONS.some(o => o.value === parsed) ? parsed : DEFAULT_REMINDER_OFFSET;
  } catch {
    return DEFAULT_REMINDER_OFFSET;
  }
}

/** Save the offset and rebuild reminders. Returns false if notifications aren't permitted. */
export async function setReminderOffset(minutes: number): Promise<boolean> {
  await AsyncStorage.setItem(OFFSET_KEY, String(minutes));
  if (minutes === 0) {
    await syncSlotReminders({ force: true });
    return true;
  }
  const granted = await ensurePermission();
  await syncSlotReminders({ force: true });
  return granted;
}

/**
 * Android 12+ only fires reminders on time when "Alarms & reminders" is allowed
 * for the app; otherwise they can arrive a few minutes late. Always true elsewhere.
 */
export async function canScheduleExactAlarms(): Promise<boolean> {
  if (Platform.OS !== 'android' || !ScheduleWidget?.canScheduleExactAlarms) return true;
  try {
    return await ScheduleWidget.canScheduleExactAlarms();
  } catch {
    return true;
  }
}

/** Open the system "Alarms & reminders" page. Reminders are rebuilt when the app is next foregrounded. */
export async function openExactAlarmSettings(): Promise<void> {
  try {
    await ScheduleWidget?.openExactAlarmSettings?.();
  } catch {
    // Not supported on this device
  }
}

export const EXACT_ALARM_PROMPT = {
  title: 'On-Time Reminders',
  message: 'To get class reminders exactly on time, allow "Alarms & reminders" for UniLink. Otherwise they may arrive up to an hour late.',
};

/**
 * True once per install when reminders are on and notifications are allowed but
 * exact alarms aren't. Reminders are on by default, so most users never open the
 * offset picker; this lets the app ask them anyway. Marks itself as shown.
 */
export async function shouldPromptExactAlarms(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    // Wait for any in-flight sync (which may be showing the notification prompt)
    await syncSlotReminders();
    if ((await getReminderOffset()) === 0) return false;
    if (await AsyncStorage.getItem(EXACT_PROMPTED_KEY)) return false;
    if (!(await Notifications.getPermissionsAsync()).granted) return false;
    if (await canScheduleExactAlarms()) return false;
    await AsyncStorage.setItem(EXACT_PROMPTED_KEY, '1');
    return true;
  } catch {
    return false;
  }
}

function planReminders(
  scheduleData: ScheduleData,
  isShifted: boolean,
  courseNameMapping: Record<string, string>,
  offset: number
): PlannedReminder[] {
  const slots = getTimeSlots(isShifted);
  const reminders: PlannedReminder[] = [];

  for (const day of scheduleData.days ?? []) {
    const weekday = WEEKDAY_NUMBERS[day.dayName];
    if (!weekday || day.isFree) continue;
    const periods = (day.periods ?? {}) as Record<string, any>;

    PERIOD_KEYS.forEach((key, index) => {
      const entry = periods[key];
      const classes = Array.isArray(entry) ? entry : entry ? [entry] : [];
      const classData = classes[0];
      const slot = slots[index];
      if (!classData || !slot) return;

      // Earliest slot is 8:15, so even a 2-hour offset stays on the same day
      const fireAt = slot.startHour * 60 + slot.startMinute - offset;
      if (fireAt < 0) return;

      const title = resolveCourseTitle(classData.courseName, courseNameMapping);
      const details = [classData.slotType, classData.room].filter(Boolean).join(' · ');
      const extra = classes.length > 1 ? ` (+${classes.length - 1} more)` : '';

      reminders.push({
        id: `${REMINDER_KIND}-${day.dayName}-${key}`,
        weekday,
        hour: Math.floor(fireAt / 60),
        minute: fireAt % 60,
        title: `${title}${extra}`,
        body: `${slot.name} slot starts at ${slot.startTime} (in ${formatReminderOffset(offset)})${details ? `\n${details}` : ''}`,
      });
    });
  }

  return reminders;
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Class reminders',
    description: 'Reminders before your scheduled classes',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

/**
 * Check notification permission, prompting if allowed. Automatic syncs only
 * prompt once ever so a dismissed prompt doesn't come back on every app open;
 * picking an offset in Settings always may prompt.
 */
async function ensurePermission(alwaysPrompt = true): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  if (!alwaysPrompt && (await AsyncStorage.getItem(PERMISSION_ASKED_KEY))) return false;
  await AsyncStorage.setItem(PERMISSION_ASKED_KEY, '1');
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

async function getScheduledReminderIds(): Promise<string[]> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled
    .filter(n => (n.content.data as any)?.kind === REMINDER_KIND)
    .map(n => n.identifier);
}

async function cancelAllReminders(): Promise<void> {
  const ids = await getScheduledReminderIds();
  await Promise.all(ids.map(id => Notifications.cancelScheduledNotificationAsync(id)));
}

let queue: Promise<void> = Promise.resolve();

/**
 * Make the OS-scheduled reminders match the schedule. Without `force`, nothing
 * is touched when the reminders already registered match what we'd schedule
 * (used on app open with cached data). With `force`, they're always rebuilt
 * (used after a schedule refetch or a settings change). Never throws.
 */
export function syncSlotReminders(
  options: { scheduleData?: ScheduleData | null; force?: boolean } = {}
): Promise<void> {
  // Serialize runs so overlapping callers can't double-schedule
  queue = queue.then(() => runSync(options)).catch(() => {});
  return queue;
}

async function runSync({ scheduleData, force = false }: { scheduleData?: ScheduleData | null; force?: boolean }) {
  if (Platform.OS === 'web') return;

  const data = scheduleData ?? (await GradeCache.getCachedScheduleData());
  const offset = await getReminderOffset();

  if (!data || (data.type && data.type !== 'personal') || offset === 0) {
    await cancelAllReminders();
    await AsyncStorage.removeItem(SIGNATURE_KEY);
    return;
  }

  const [shiftedRaw, mapping] = await Promise.all([
    AsyncStorage.getItem('shiftedScheduleEnabled'),
    GradeCache.getCachedCourseIdToName(),
  ]);
  const isShifted = shiftedRaw ? JSON.parse(shiftedRaw) === true : false;
  const planned = planReminders(data, isShifted, mapping ?? {}, offset);
  // Exactness is fixed when an alarm is registered, and revoking the permission
  // drops existing alarms, so a change in it must trigger a rebuild
  const exact = await canScheduleExactAlarms();
  // Alarms are absolute instants, so a timezone or DST change must rebuild them too
  const tzOffset = new Date().getTimezoneOffset();
  const signature = JSON.stringify({ exact, tzOffset, planned });

  if (!force) {
    const [storedSignature, scheduledIds] = await Promise.all([
      AsyncStorage.getItem(SIGNATURE_KEY),
      getScheduledReminderIds(),
    ]);
    if (storedSignature === signature && scheduledIds.length === planned.length) return;
  }

  const permitted = await ensurePermission(false);
  await cancelAllReminders();
  await AsyncStorage.removeItem(SIGNATURE_KEY);
  if (!permitted) return;

  await ensureChannel();
  for (const r of planned) {
    await Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content: {
        title: r.title,
        body: r.body,
        data: { kind: REMINDER_KIND },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        channelId: CHANNEL_ID,
        weekday: r.weekday,
        hour: r.hour,
        minute: r.minute,
      },
    });
  }
  await AsyncStorage.setItem(SIGNATURE_KEY, signature);
}

/** Remove all class reminders and the saved offset (e.g. on logout). */
export async function clearSlotReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await cancelAllReminders();
    await AsyncStorage.multiRemove([SIGNATURE_KEY, OFFSET_KEY]);
  } catch {
    // Best-effort
  }
}

/** Show reminders as banners while the app is in the foreground. Call once at startup. */
export function configureSlotReminderHandler(): void {
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}
