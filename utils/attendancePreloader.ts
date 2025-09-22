import { GradeCache } from './gradeCache';
import { GUCAPIProxy } from './gucApiProxy';

/**
 * Attendance preloader service
 * Preloads attendance data after successful login for better UX
 * Always fetches fresh data and then caches it
 */
export class AttendancePreloader {
  private static preloadPromise: Promise<any> | null = null;

  /**
   * Preload attendance data in the background
   * This should be called after successful login
   */
  static async preloadAttendance(): Promise<void> {
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
   * Always fetches fresh data and then caches it
   */
  private static async performPreload(): Promise<void> {
    try {
      // Always fetch fresh attendance data (no cache check)
      const attendanceData = await GUCAPIProxy.getAttendanceData();
      
      // Cache the fresh data
      await GradeCache.setCachedAttendanceData(attendanceData);
      
    } catch (error) {
      // Don't throw error - preloading is optional and shouldn't break the login flow
    }
  }

  /**
   * Check if attendance is currently being preloaded
   */
  static isPreloading(): boolean {
    return this.preloadPromise !== null;
  }
}
