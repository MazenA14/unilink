import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Linking, NativeModules, Platform } from 'react-native';
import { resolveCourseTitle } from './courseTitle';
import { getTimeSlots } from './currentSlotUtils';
import { GradeCache } from './gradeCache';
import type { ScheduleData } from './types/gucTypes';

/**
 * Local "class starts soon" reminders. Each class slot in the personal schedule
 * gets one weekly repeating notification, registered with the OS so it fires
 * even while the app is closed. Reminders are rebuilt whenever the schedule is
 * refetched, the toggle/offset changes or slot times change (delayed 3rd slot).
 *
 * Permission prompts only happen from the foreground UI (the Settings toggle and
 * the dashboard startup check). Background syncs never prompt: on Android a
 * request made before the activity is ready is silently denied.
 */

export const REMINDER_OFFSET_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
] as const;

export const DEFAULT_REMINDER_OFFSET = 15;

const ENABLED_KEY = 'slotRemindersEnabled';
const OFFSET_KEY = 'slotReminderOffset';
const SIGNATURE_KEY = 'slotReminderSignature';
// Android fixes a channel's sound/vibration once created, so changing them needs a new id
const CHANNEL_ID = 'class-reminders-v2';
const LEGACY_CHANNEL_IDS = ['class-reminders'];
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

/** Reminders are off until the user turns them on in Settings. */
export async function getRemindersEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ENABLED_KEY)) === '1';
  } catch {
    return false;
  }
}

/**
 * Turn reminders on or off and rebuild them. Turning on asks for notification
 * permission and only sticks if it's granted; returns the resulting state.
 */
export async function setRemindersEnabled(enabled: boolean): Promise<boolean> {
  const granted = enabled ? await requestNotificationPermission() : false;
  const next = enabled && granted;
  await AsyncStorage.setItem(ENABLED_KEY, next ? '1' : '0');
  await syncSlotReminders({ force: true });
  return next;
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

/** Save the offset and rebuild reminders. */
export async function setReminderOffset(minutes: number): Promise<void> {
  await AsyncStorage.setItem(OFFSET_KEY, String(minutes));
  await syncSlotReminders({ force: true });
}

export async function hasNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Ask for notification permission if the OS still allows asking. Call from the foreground UI only. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Open this app's page in system settings (to unblock notifications). */
export async function openNotificationSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch {
    // Not supported on this device
  }
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

export const NOTIFICATIONS_BLOCKED_PROMPT = {
  title: 'Notifications Blocked',
  message: 'Class reminders are on, but notifications are blocked for UniLink. Allow them in your device settings to receive reminders.',
};

export type ReminderStartupPrompt = 'notifications-blocked' | 'exact-alarm' | null;

/**
 * Run on every app start while reminders are on. Shows the system notification
 * prompt if it can still be asked, then reports which in-app prompt (if any) the
 * caller should show: notifications blocked for good, or exact alarms missing.
 */
export async function checkReminderPermissionsOnStartup(): Promise<ReminderStartupPrompt> {
  if (Platform.OS === 'web') return null;
  try {
    if (!(await getRemindersEnabled())) return null;
    const current = await Notifications.getPermissionsAsync();
    if (!current.granted) {
      if (!current.canAskAgain) return 'notifications-blocked';
      const requested = await Notifications.requestPermissionsAsync();
      // Declined just now: don't follow up with another prompt this launch
      if (!requested.granted) return null;
      await syncSlotReminders({ force: true });
    }
    return (await canScheduleExactAlarms()) ? null : 'exact-alarm';
  } catch {
    return null;
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
    enableVibrate: true,
    vibrationPattern: [0, 300, 200, 300],
  });
  await Promise.all(LEGACY_CHANNEL_IDS.map(id => Notifications.deleteNotificationChannelAsync(id).catch(() => {})));
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
  const [enabled, offset] = await Promise.all([getRemindersEnabled(), getReminderOffset()]);

  if (!data || (data.type && data.type !== 'personal') || !enabled) {
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
  // Include permission so granting it later in system settings triggers a rebuild on resume
  const permitted = await hasNotificationPermission();
  const signature = JSON.stringify({ channel: CHANNEL_ID, exact, tzOffset, permitted, planned });

  if (!force) {
    const [storedSignature, scheduledIds] = await Promise.all([
      AsyncStorage.getItem(SIGNATURE_KEY),
      getScheduledReminderIds(),
    ]);
    if (storedSignature === signature && scheduledIds.length === planned.length) return;
  }

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
        vibrate: [0, 300, 200, 300],
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

/** Remove all class reminders and their settings (e.g. on logout). */
export async function clearSlotReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await cancelAllReminders();
    await AsyncStorage.multiRemove([SIGNATURE_KEY, OFFSET_KEY, ENABLED_KEY]);
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
