import { AttendancePreloader } from './attendancePreloader';
import { GradeCache } from './gradeCache';
import { GradeData, GUCAPIProxy } from './gucApiProxy';
import { perfAsync } from './perfLog';
import { getSessionGeneration, onSharedRequestsReset } from './sharedRequest';

/** Skip a new preload if the last successful one finished this recently. */
const FRESH_FOR_MS = 5 * 60 * 1000;

/**
 * Grades preloader service
 * Fetches current grades, courses and every course's detailed grades in the
 * background (on app open / login) so the Grades screen opens from cache.
 */
export class GradesPreloader {
  private static preloadPromise: Promise<void> | null = null;
  private static lastCompletedAt = 0;

  /**
   * Preload current grades data in the background. Concurrent callers share
   * the same run.
   */
  static preloadCurrentGrades(): Promise<void> {
    if (this.preloadPromise) return this.preloadPromise;
    if (Date.now() - this.lastCompletedAt < FRESH_FOR_MS) {
      console.log('[PERF] preload  grades: skipped (refreshed < 5 min ago)');
      return Promise.resolve();
    }
    console.log('[PERF] preload  grades: start');

    const run: Promise<void> = perfAsync('Preload: grades', () => this.performPreload())
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
   */
  private static async performPreload(): Promise<void> {
    try {
      const generation = getSessionGeneration();
      // Let the (much faster) attendance preload finish first instead of
      // interleaving with it in the serialized native queue, so attendance is
      // ready in a couple of seconds rather than when grades finish.
      await AttendancePreloader.waitForPreload();

      // Both read the same CheckGrade_01 page, so this is a single GET.
      const [currentGrades, availableCourses] = await Promise.all([
        GUCAPIProxy.getCurrentGrades(),
        GUCAPIProxy.getAvailableCourses(),
      ]);
      if (generation !== getSessionGeneration()) {
        console.log('[PERF] preload  grades: discarded (session changed mid-run)');
        return;
      }
      await GradeCache.setCachedCurrentGrades(currentGrades);
      await GradeCache.setCachedCurrentCourses(availableCourses);

      // Create and cache course ID to name mapping
      const courseIdToNameMapping: { [courseId: string]: string } = {};
      availableCourses.forEach(course => {
        courseIdToNameMapping[course.value] = course.text;
      });
      await GradeCache.setCachedCourseIdToName(courseIdToNameMapping);

      // One course at a time: native requests are serialized anyway, and this
      // lets requests from screens the user opens meanwhile slot in between.
      const gradesByCourse: { [courseId: string]: GradeData[] } = {};
      for (const course of availableCourses) {
        try {
          gradesByCourse[course.value] = await GUCAPIProxy.getCourseGrades(course.value);
        } catch {}
      }
      if (generation !== getSessionGeneration()) {
        console.log('[PERF] preload  grades: discarded (session changed mid-run)');
        return;
      }
      await GradeCache.setCachedCurrentCourseGradesBatch(gradesByCourse);

      this.lastCompletedAt = Date.now();
    } catch (error) {
      console.log('[PERF] preload  grades: failed', error);
      // Don't throw error - preloading is optional and shouldn't break the app
    }
  }

  /**
   * Check if grades are currently being preloaded
   */
  static isPreloading(): boolean {
    return this.preloadPromise !== null;
  }
}

// A logout / session reset means the next login must preload again.
onSharedRequestsReset(() => GradesPreloader.resetFreshness());
