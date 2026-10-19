import { CourseAttendance, GradeCache } from './gradeCache';
import { GUCAPIProxy } from './gucApiProxy';
import { perfAsync } from './perfLog';
import { getSessionGeneration, onSharedRequestsReset } from './sharedRequest';

/** Skip a new preload if the last successful one finished this recently. */
const FRESH_FOR_MS = 5 * 60 * 1000;

/**
 * Attendance preloader service
 * Fetches the attendance summary and every course's session log in the
 * background (on app open) so the Attendance screen opens from cache.
 */
export class AttendancePreloader {
  private static preloadPromise: Promise<void> | null = null;
  private static lastCompletedAt = 0;

  /**
   * Preload attendance data in the background. Concurrent callers share the
   * same run.
   */
  static preloadAttendance(): Promise<void> {
    if (this.preloadPromise) return this.preloadPromise;
    if (Date.now() - this.lastCompletedAt < FRESH_FOR_MS) {
      console.log('[PERF] preload  attendance: skipped (refreshed < 5 min ago)');
      return Promise.resolve();
    }
    console.log('[PERF] preload  attendance: start');

    const run: Promise<void> = perfAsync('Preload: attendance', () => this.performPreload())
      .finally(() => { if (this.preloadPromise === run) this.preloadPromise = null; });
    this.preloadPromise = run;
    return run;
  }

  /** Forget the last successful run (called on logout / session reset). */
  static resetFreshness(): void {
    this.lastCompletedAt = 0;
    // A run from the old session will discard its results; don't let new
    // callers join it.
    this.preloadPromise = null;
  }

  /** Resolves once an in-flight preload (if any) has filled the cache. */
  static async waitForPreload(): Promise<void> {
    if (this.preloadPromise) await this.preloadPromise;
  }

  /**
   * Perform the actual preload operation
   * Always fetches fresh data and then caches it
   */
  private static async performPreload(): Promise<void> {
    try {
      const generation = getSessionGeneration();
      const attendanceData = await GUCAPIProxy.getAttendanceData();

      // One course at a time: native requests are serialized anyway, and this
      // lets requests from screens the user opens meanwhile slot in between.
      const detailed: CourseAttendance[] = [];
      const courses: CourseAttendance[] = [];
      for (const course of attendanceData.courses) {
        try {
          const details = await GUCAPIProxy.getCourseAttendance(course.courseId);
          detailed.push(details);
          courses.push(details);
        } catch {
          courses.push(course);
        }
      }

      if (generation !== getSessionGeneration()) {
        console.log('[PERF] preload  attendance: discarded (session changed mid-run)');
        return;
      }
      await GradeCache.setCachedAttendanceData({ ...attendanceData, courses });
      for (const details of detailed) {
        await GradeCache.setCachedCourseAttendance(details.courseId, details);
      }

      this.lastCompletedAt = Date.now();
    } catch (error) {
      console.log('[PERF] preload  attendance: failed', error);
      // Don't throw error - preloading is optional and shouldn't break the app
    }
  }

  /**
   * Check if attendance is currently being preloaded
   */
  static isPreloading(): boolean {
    return this.preloadPromise !== null;
  }
}

// A logout / session reset means the next login must preload again.
onSharedRequestsReset(() => AttendancePreloader.resetFreshness());
