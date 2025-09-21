import { GradeCache } from './gradeCache';
import { GUCAPIProxy } from './gucApiProxy';

/**
 * Grades preloader service
 * Preloads current grades data after successful login for better UX
 */
export class GradesPreloader {
  private static preloadPromise: Promise<any> | null = null;

  /**
   * Preload current grades data in the background
   * This should be called after successful login
   */
  static async preloadCurrentGrades(): Promise<void> {
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
      // Preload current grades
      const currentGrades = await GUCAPIProxy.getCurrentGrades();
      await GradeCache.setCachedCurrentGrades(currentGrades);
      
      // Preload available courses
      const availableCourses = await GUCAPIProxy.getAvailableCourses();
      await GradeCache.setCachedCurrentCourses(availableCourses);
      
      // Create and cache course ID to name mapping
      const courseIdToNameMapping: { [courseId: string]: string } = {};
      availableCourses.forEach(course => {
        courseIdToNameMapping[course.value] = course.text;
      });
      await GradeCache.setCachedCourseIdToName(courseIdToNameMapping);
      
    } catch (error) {
      // Don't throw error - preloading is optional and shouldn't break the login flow
    }
  }

  /**
   * Check if grades are currently being preloaded
   */
  static isPreloading(): boolean {
    return this.preloadPromise !== null;
  }
}
