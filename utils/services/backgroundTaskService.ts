import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackgroundFetchResult, BackgroundFetchStatus, getStatusAsync, registerTaskAsync } from 'expo-background-fetch';
import { defineTask, isTaskRegisteredAsync } from 'expo-task-manager';

const ATTENDANCE_TASK_NAME = 'attendance-background-task';
const LAST_ATTENDANCE_RUN_DATE_KEY = 'attendance_last_run_date';
export const ATTENDANCE_NAVIGATE_FLAG_KEY = 'attendance_navigate_on_foreground';

function isAroundTwoAM(date: Date): boolean {
  const hour = date.getHours();
  // Allow a 60-minute window around 2:00 AM to account for OS scheduling variability
  return hour === 2;
}

async function hasRunToday(todayIso: string): Promise<boolean> {
  const lastRun = await AsyncStorage.getItem(LAST_ATTENDANCE_RUN_DATE_KEY);
  return lastRun === todayIso;
}

async function markRunToday(todayIso: string): Promise<void> {
  await AsyncStorage.setItem(LAST_ATTENDANCE_RUN_DATE_KEY, todayIso);
}

defineTask(ATTENDANCE_TASK_NAME, async () => {
  try {
    const now = new Date();
    const todayIso = now.toISOString().slice(0, 10); // YYYY-MM-DD

    if (!(await hasRunToday(todayIso)) && isAroundTwoAM(now)) {
      await AsyncStorage.setItem(ATTENDANCE_NAVIGATE_FLAG_KEY, 'true');
      await markRunToday(todayIso);
      return BackgroundFetchResult.NewData;
    }

    return BackgroundFetchResult.NoData;
  } catch {
    return BackgroundFetchResult.Failed;
  }
});

export async function initializeAttendanceBackgroundTask(): Promise<void> {
  try {
    const status = await getStatusAsync();
    if (status === BackgroundFetchStatus.Restricted || status === BackgroundFetchStatus.Denied) {
      return;
    }

    const isRegistered = await isTaskRegisteredAsync(ATTENDANCE_TASK_NAME);
    if (!isRegistered) {
      await registerTaskAsync(ATTENDANCE_TASK_NAME, {
        minimumInterval: 30 * 60, // 30 minutes; OS decides exact times
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
  } catch {
  }
}

export async function consumeAttendanceNavigateFlag(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ATTENDANCE_NAVIGATE_FLAG_KEY);
    if (value === 'true') {
      await AsyncStorage.removeItem(ATTENDANCE_NAVIGATE_FLAG_KEY);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}


