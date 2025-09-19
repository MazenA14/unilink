import { GUCAPIProxy } from './gucApiProxy';

/**
 * Schedule preloader service
 * Preloads schedule data after successful login for better UX
 */
export class SchedulePreloader {
  private static preloadPromise: Promise<any> | null = null;

  /**
   * Preload schedule data in the background
   * This should be called after successful login
   */
  static async preloadSchedule(): Promise<void> {
    // If already preloading, return the existing promise
    if (this.preloadPromise) {
      return this.preloadPromise;
    }

    // Start preloading
    this.preloadPromise = this.performPreload();
    
    try {
      await this.preloadPromise;
    } finally {
      // Clear the promise when done
      this.preloadPromise = null;
    }
  }

  /**
   * Perform the actual preload operation
   */
  private static async performPreload(): Promise<void> {
    try {
      // Use the cached API which will either return cached data or fetch fresh data
      const scheduleData = await GUCAPIProxy.getScheduleData();
      
      return scheduleData;
    } catch (error) {
      // Don't throw error - preloading is optional and shouldn't break the login flow
    }
  }

  /**
   * Check if schedule is currently being preloaded
   */
  static isPreloading(): boolean {
    return this.preloadPromise !== null;
  }
}
