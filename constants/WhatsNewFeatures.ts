import { APP_VERSION } from './Version';

/**
 * Configuration for What's New modal features
 * Update this when you want to show new features to users
 */
export const WHATS_NEW_CONFIG = {
  version: APP_VERSION,
  features: [
    "Class Reminders Before Each Slot (Set in Settings)",
    "Added Schedule Widget",
    "Unseen CMS Content Indicators",
    "Notifications Search",
    "Swipe to Mark Read/Unread",
    "Clickable Links in Notifications",
    "Smoother Notification Sheet",
    "Long-Press to Copy Notifications",
    "Redesigned Dashboard & Sidebar",
    "Tap Your Name to Edit Nickname",
    "Bug Fixes"
  ]
};

/**
 * Get the current What's New configuration
 */
export function getWhatsNewConfig() {
  return WHATS_NEW_CONFIG;
}

/**
 * Update features for a new version
 * Call this function when you want to show new features
 * 
 * @param newVersion - The new version number
 * @param newFeatures - Array of new features to show
 */
export function updateWhatsNewConfig(newVersion: string, newFeatures: string[]) {
  // This would typically be called when you release a new version
  // For now, we'll just return the updated config
  return {
    version: newVersion,
    features: newFeatures
  };
}
