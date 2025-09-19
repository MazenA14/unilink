import AsyncStorage from '@react-native-async-storage/async-storage';

const WHATS_NEW_SHOWN_KEY = 'whats_new_shown';
const WHATS_NEW_VERSION_KEY = 'whats_new_version';

/**
 * Check if the What's New modal has been shown for the current version
 * @param currentVersion - The current app version
 * @returns Promise<boolean> - true if modal should be shown, false if already shown
 */
export async function shouldShowWhatsNew(currentVersion: string): Promise<boolean> {
  try {
    const shownVersion = await AsyncStorage.getItem(WHATS_NEW_VERSION_KEY);
    return shownVersion !== currentVersion;
  } catch (error) {
    // If there's an error, show the modal to be safe
    return true;
  }
}

/**
 * Mark the What's New modal as shown for the current version
 * @param currentVersion - The current app version
 */
export async function markWhatsNewAsShown(currentVersion: string): Promise<void> {
  try {
    await AsyncStorage.setItem(WHATS_NEW_VERSION_KEY, currentVersion);
    await AsyncStorage.setItem(WHATS_NEW_SHOWN_KEY, 'true');
  } catch (error) {
  }
}

/**
 * Reset What's New status (useful for testing)
 */
export async function resetWhatsNewStatus(): Promise<void> {
  try {
    await AsyncStorage.removeItem(WHATS_NEW_VERSION_KEY);
    await AsyncStorage.removeItem(WHATS_NEW_SHOWN_KEY);
  } catch (error) {
  }
}
