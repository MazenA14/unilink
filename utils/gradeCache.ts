import { StudyYear, TranscriptData } from '@/components/transcript/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GradeData, ScheduleData } from './gucApiProxy';

// Course interface
interface Course {
  value: string;
  text: string;
}

// Cache configuration
const CACHE_EXPIRY_DAYS = 30;
const CACHE_EXPIRY_MS = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

// Transcript cache configuration (shorter expiry since transcript data changes less frequently)
const TRANSCRIPT_CACHE_EXPIRY_DAYS = 7; // 1 week for transcript data
const TRANSCRIPT_CACHE_EXPIRY_MS = TRANSCRIPT_CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

// Schedule cache configuration (2 months since schedule data changes infrequently)
const SCHEDULE_CACHE_EXPIRY_DAYS = 60; // 2 months for schedule data
const SCHEDULE_CACHE_EXPIRY_MS = SCHEDULE_CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

// Previous grades cache configuration (permanent - never expires)
// Previous grades data is cached permanently since it represents historical data that doesn't change

// Cache keys
const CACHE_KEYS = {
  SEASONS: 'guc_cache_seasons',
  COURSES: 'guc_cache_courses',
  MIDTERM_GRADES: 'guc_cache_midterm_grades',
  DETAILED_GRADES: 'guc_cache_detailed_grades',
  SEASONS_WITH_GRADES: 'guc_cache_seasons_with_grades',
  CURRENT_GRADES: 'guc_cache_current_grades',
  CURRENT_COURSES: 'guc_cache_current_courses',
  CURRENT_COURSE_GRADES: 'guc_cache_current_course_grades',
  COURSE_ID_TO_NAME: 'guc_cache_course_id_to_name',
  // Transcript cache keys
  STUDY_YEARS: 'guc_cache_study_years',
  TRANSCRIPT_DATA: 'guc_cache_transcript_data',
  // Schedule cache keys
  SCHEDULE_DATA: 'guc_cache_schedule_data',
} as const;

// Interface definitions
interface Season {
  value: string;
  text: string;
  hasGrades?: boolean;
  year?: string;
  // Additional data for new system
  _courses?: Course[];
  _midtermGrades?: GradeData[];
}

interface YearGroup {
  year: string;
  seasons: Season[];
}

interface Course {
  value: string;
  text: string;
}

interface CourseIdToNameMapping {
  [courseId: string]: string;
}

interface CachedData<T> {
  data: T;
  timestamp: number;
}

interface CachedSeasonsData {
  seasons: Season[];
  yearGroups: YearGroup[];
  timestamp: number;
}

interface CachedCoursesData {
  [seasonId: string]: {
    courses: Course[];
    timestamp: number;
  };
}

interface CachedMidtermGradesData {
  [seasonId: string]: {
    grades: GradeData[];
    timestamp: number;
  };
}

interface CachedDetailedGradesData {
  [seasonId: string]: {
    [courseId: string]: {
      grades: GradeData[];
      timestamp: number;
    };
  };
}

interface CachedCurrentCourseGradesData {
  [courseId: string]: {
    grades: GradeData[];
    timestamp: number;
  };
}

interface CachedStudyYearsData {
  studyYears: StudyYear[];
  timestamp: number;
}

interface CachedTranscriptData {
  [studyYearId: string]: {
    transcriptData: TranscriptData;
    timestamp: number;
  };
}

export class GradeCache {
  /**
   * Check if cached data is still valid
   */
  private static isCacheValid(timestamp: number): boolean {
    const now = Date.now();
    const cacheAge = now - timestamp;
    return cacheAge < CACHE_EXPIRY_MS;
  }

  /**
   * Check if transcript cached data is still valid
   */
  private static isTranscriptCacheValid(timestamp: number): boolean {
    const now = Date.now();
    const cacheAge = now - timestamp;
    return cacheAge < TRANSCRIPT_CACHE_EXPIRY_MS;
  }

  /**
   * Check if schedule cached data is still valid
   */
  private static isScheduleCacheValid(timestamp: number): boolean {
    const now = Date.now();
    const cacheAge = now - timestamp;
    return cacheAge < SCHEDULE_CACHE_EXPIRY_MS;
  }

  /**
   * Check if previous grades cached data is still valid (permanent cache)
   */
  private static isPreviousGradesCacheValid(timestamp: number): boolean {
    // Previous grades are permanently cached - they never expire
    return true;
  }

  /**
   * Get cached data with validation
   */
  private static async getCachedData<T>(key: string): Promise<T | null> {
    try {
      const cachedData = await AsyncStorage.getItem(key);
      if (!cachedData) {
        return null;
      }

      const parsed: CachedData<T> = JSON.parse(cachedData);
      
      if (!this.isCacheValid(parsed.timestamp)) {
        await AsyncStorage.removeItem(key);
        return null;
      }

      return parsed.data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get cached data with permanent validation (for previous grades)
   */
  private static async getPermanentCachedData<T>(key: string): Promise<T | null> {
    try {
      const cachedData = await AsyncStorage.getItem(key);
      if (!cachedData) {
        return null;
      }

      const parsed: CachedData<T> = JSON.parse(cachedData);
      
      if (!this.isPreviousGradesCacheValid(parsed.timestamp)) {
        await AsyncStorage.removeItem(key);
        return null;
      }

      return parsed.data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Set cached data with timestamp
   */
  private static async setCachedData<T>(key: string, data: T): Promise<void> {
    try {
      const cacheData: CachedData<T> = {
        data,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
    }
  }


  /**
   * Clear cache for a specific season
   */
  static async clearSeasonCache(seasonId: string): Promise<void> {
    try {
      // Clear courses cache for this season
      const coursesCache = await this.getCachedData<CachedCoursesData>(CACHE_KEYS.COURSES);
      if (coursesCache && coursesCache[seasonId]) {
        delete coursesCache[seasonId];
        await this.setCachedData(CACHE_KEYS.COURSES, coursesCache);
      }

      // Clear midterm grades cache for this season
      const midtermCache = await this.getCachedData<CachedMidtermGradesData>(CACHE_KEYS.MIDTERM_GRADES);
      if (midtermCache && midtermCache[seasonId]) {
        delete midtermCache[seasonId];
        await this.setCachedData(CACHE_KEYS.MIDTERM_GRADES, midtermCache);
      }

      // Clear detailed grades cache for this season
      const detailedCache = await this.getCachedData<CachedDetailedGradesData>(CACHE_KEYS.DETAILED_GRADES);
      if (detailedCache && detailedCache[seasonId]) {
        delete detailedCache[seasonId];
        await this.setCachedData(CACHE_KEYS.DETAILED_GRADES, detailedCache);
      }

    } catch (error) {
    }
  }

  // ===== SEASONS CACHE =====

  /**
   * Get cached seasons with grades data (permanent cache)
   */
  static async getCachedSeasonsWithGrades(): Promise<CachedSeasonsData | null> {
    return this.getPermanentCachedData<CachedSeasonsData>(CACHE_KEYS.SEASONS_WITH_GRADES);
  }

  /**
   * Set cached seasons with grades data
   */
  static async setCachedSeasonsWithGrades(seasons: Season[], yearGroups: YearGroup[]): Promise<void> {
    const cacheData: CachedSeasonsData = {
      seasons,
      yearGroups,
      timestamp: Date.now(),
    };
    await this.setCachedData(CACHE_KEYS.SEASONS_WITH_GRADES, cacheData);
  }

  // ===== COURSES CACHE =====

  /**
   * Get cached courses for a season (permanent cache)
   */
  static async getCachedCourses(seasonId: string): Promise<Course[] | null> {
    const cachedData = await this.getPermanentCachedData<CachedCoursesData>(CACHE_KEYS.COURSES);
    if (!cachedData || !cachedData[seasonId]) return null;
    
    const seasonData = cachedData[seasonId];
    if (!this.isPreviousGradesCacheValid(seasonData.timestamp)) {
      // Remove expired season data
      delete cachedData[seasonId];
      await this.setCachedData(CACHE_KEYS.COURSES, cachedData);
      return null;
    }

    return seasonData.courses;
  }

  /**
   * Set cached courses for a season
   */
  static async setCachedCourses(seasonId: string, courses: Course[]): Promise<void> {
    const cachedData = await this.getCachedData<CachedCoursesData>(CACHE_KEYS.COURSES) || {};
    cachedData[seasonId] = {
      courses,
      timestamp: Date.now(),
    };
    await this.setCachedData(CACHE_KEYS.COURSES, cachedData);
  }

  // ===== MIDTERM GRADES CACHE =====

  /**
   * Get cached midterm grades for a season (permanent cache)
   */
  static async getCachedMidtermGrades(seasonId: string): Promise<GradeData[] | null> {
    const cachedData = await this.getPermanentCachedData<CachedMidtermGradesData>(CACHE_KEYS.MIDTERM_GRADES);
    if (!cachedData || !cachedData[seasonId]) return null;
    
    const seasonData = cachedData[seasonId];
    if (!this.isPreviousGradesCacheValid(seasonData.timestamp)) {
      // Remove expired season data
      delete cachedData[seasonId];
      await this.setCachedData(CACHE_KEYS.MIDTERM_GRADES, cachedData);
      return null;
    }

    return seasonData.grades;
  }

  /**
   * Set cached midterm grades for a season
   */
  static async setCachedMidtermGrades(seasonId: string, grades: GradeData[]): Promise<void> {
    const cachedData = await this.getCachedData<CachedMidtermGradesData>(CACHE_KEYS.MIDTERM_GRADES) || {};
    cachedData[seasonId] = {
      grades,
      timestamp: Date.now(),
    };
    await this.setCachedData(CACHE_KEYS.MIDTERM_GRADES, cachedData);
  }

  // ===== CURRENT GRADES CACHE =====

  /**
   * Get cached current grades
   */
  static async getCachedCurrentGrades(): Promise<GradeData[] | null> {
    return this.getCachedData<GradeData[]>(CACHE_KEYS.CURRENT_GRADES);
  }

  /**
   * Set cached current grades
   */
  static async setCachedCurrentGrades(grades: GradeData[]): Promise<void> {
    await this.setCachedData(CACHE_KEYS.CURRENT_GRADES, grades);
  }

  /**
   * Clear current grades cache
   */
  static async clearCurrentGradesCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEYS.CURRENT_GRADES);
    } catch (error) {
    }
  }

  // ===== CURRENT COURSES CACHE =====

  /**
   * Get cached current courses
   */
  static async getCachedCurrentCourses(): Promise<Course[] | null> {
    return this.getCachedData<Course[]>(CACHE_KEYS.CURRENT_COURSES);
  }

  /**
   * Set cached current courses
   */
  static async setCachedCurrentCourses(courses: Course[]): Promise<void> {
    await this.setCachedData(CACHE_KEYS.CURRENT_COURSES, courses);
  }

  /**
   * Clear current courses cache
   */
  static async clearCurrentCoursesCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEYS.CURRENT_COURSES);
    } catch (error) {
    }
  }

  // ===== CURRENT COURSE GRADES CACHE =====

  /**
   * Get cached grades for a specific current course
   */
  static async getCachedCurrentCourseGrades(courseId: string): Promise<GradeData[] | null> {
    const cachedData = await this.getCachedData<CachedCurrentCourseGradesData>(CACHE_KEYS.CURRENT_COURSE_GRADES);
    if (!cachedData || !cachedData[courseId]) return null;
    
    const courseData = cachedData[courseId];
    if (!this.isCacheValid(courseData.timestamp)) {
      // Remove expired course data
      delete cachedData[courseId];
      await this.setCachedData(CACHE_KEYS.CURRENT_COURSE_GRADES, cachedData);
      return null;
    }

    return courseData.grades;
  }

  /**
   * Set cached grades for a specific current course
   */
  static async setCachedCurrentCourseGrades(courseId: string, grades: GradeData[]): Promise<void> {
    const cachedData = await this.getCachedData<CachedCurrentCourseGradesData>(CACHE_KEYS.CURRENT_COURSE_GRADES) || {};
    cachedData[courseId] = {
      grades,
      timestamp: Date.now(),
    };
    await this.setCachedData(CACHE_KEYS.CURRENT_COURSE_GRADES, cachedData);
  }

  /**
   * Clear current course grades cache
   */
  static async clearCurrentCourseGradesCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEYS.CURRENT_COURSE_GRADES);
    } catch (error) {
    }
  }

  // ===== DETAILED GRADES CACHE =====

  /**
   * Get cached detailed grades for a specific course in a season (permanent cache)
   */
  static async getCachedDetailedGrades(seasonId: string, courseId: string): Promise<GradeData[] | null> {
    const cachedData = await this.getPermanentCachedData<CachedDetailedGradesData>(CACHE_KEYS.DETAILED_GRADES);
    if (!cachedData || !cachedData[seasonId] || !cachedData[seasonId][courseId]) return null;
    
    const courseData = cachedData[seasonId][courseId];
    if (!this.isPreviousGradesCacheValid(courseData.timestamp)) {
      // Remove expired course data
      delete cachedData[seasonId][courseId];
      if (Object.keys(cachedData[seasonId]).length === 0) {
        delete cachedData[seasonId];
      }
      await this.setCachedData(CACHE_KEYS.DETAILED_GRADES, cachedData);
      return null;
    }

    return courseData.grades;
  }

  /**
   * Set cached detailed grades for a specific course in a season
   */
  static async setCachedDetailedGrades(seasonId: string, courseId: string, grades: GradeData[]): Promise<void> {
    const cachedData = await this.getCachedData<CachedDetailedGradesData>(CACHE_KEYS.DETAILED_GRADES) || {};
    
    if (!cachedData[seasonId]) {
      cachedData[seasonId] = {};
    }
    
    cachedData[seasonId][courseId] = {
      grades,
      timestamp: Date.now(),
    };
    
    await this.setCachedData(CACHE_KEYS.DETAILED_GRADES, cachedData);
  }

  // ===== BULK OPERATIONS =====

  /**
   * Pre-cache all grades for a season (courses, midterm grades, and detailed grades)
   */
  static async preCacheSeasonData(
    seasonId: string,
    courses: Course[],
    midtermGrades: GradeData[],
    detailedGradesMap: { [courseId: string]: GradeData[] }
  ): Promise<void> {
    try {
      // Cache courses
      await this.setCachedCourses(seasonId, courses);
      
      // Cache midterm grades
      await this.setCachedMidtermGrades(seasonId, midtermGrades);
      
      // Cache detailed grades for each course
      for (const [courseId, grades] of Object.entries(detailedGradesMap)) {
        await this.setCachedDetailedGrades(seasonId, courseId, grades);
      }
      
    } catch (error) {
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    seasonsWithGrades: boolean;
    coursesCount: number;
    midtermGradesCount: number;
    detailedGradesCount: number;
    currentGradesCount: number;
    currentCoursesCount: number;
    currentCourseGradesCount: number;
    studyYearsCount: number;
    transcriptDataCount: number;
    totalCacheSize: number;
  }> {
    try {
      const seasonsData = await this.getCachedSeasonsWithGrades();
      const coursesData = await this.getCachedData<CachedCoursesData>(CACHE_KEYS.COURSES) || {};
      const midtermData = await this.getCachedData<CachedMidtermGradesData>(CACHE_KEYS.MIDTERM_GRADES) || {};
      const detailedData = await this.getCachedData<CachedDetailedGradesData>(CACHE_KEYS.DETAILED_GRADES) || {};
      const currentGradesData = await this.getCachedCurrentGrades() || [];
      const currentCoursesData = await this.getCachedCurrentCourses() || [];
      const currentCourseGradesData = await this.getCachedData<CachedCurrentCourseGradesData>(CACHE_KEYS.CURRENT_COURSE_GRADES) || {};
      const studyYearsData = await this.getCachedStudyYears() || [];
      const transcriptData = await this.getCachedData<CachedTranscriptData>(CACHE_KEYS.TRANSCRIPT_DATA) || {};

      let coursesCount = 0;
      let midtermGradesCount = 0;
      let detailedGradesCount = 0;
      let currentGradesCount = currentGradesData.length;
      let currentCoursesCount = currentCoursesData.length;
      let currentCourseGradesCount = 0;
      let studyYearsCount = studyYearsData.length;
      let transcriptDataCount = Object.keys(transcriptData).length;

      // Count courses
      for (const seasonData of Object.values(coursesData)) {
        coursesCount += seasonData.courses.length;
      }

      // Count midterm grades
      for (const seasonData of Object.values(midtermData)) {
        midtermGradesCount += seasonData.grades.length;
      }

      // Count detailed grades
      for (const seasonData of Object.values(detailedData)) {
        for (const courseData of Object.values(seasonData)) {
          detailedGradesCount += courseData.grades.length;
        }
      }

      // Count current course grades
      for (const courseData of Object.values(currentCourseGradesData)) {
        currentCourseGradesCount += courseData.grades.length;
      }

      // Estimate cache size
      const allKeys = Object.values(CACHE_KEYS);
      let totalCacheSize = 0;
      for (const key of allKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          totalCacheSize += data.length;
        }
      }

      return {
        seasonsWithGrades: !!seasonsData,
        coursesCount,
        midtermGradesCount,
        detailedGradesCount,
        currentGradesCount,
        currentCoursesCount,
        currentCourseGradesCount,
        studyYearsCount,
        transcriptDataCount,
        totalCacheSize,
      };
    } catch (error) {
      return {
        seasonsWithGrades: false,
        coursesCount: 0,
        midtermGradesCount: 0,
        detailedGradesCount: 0,
        currentGradesCount: 0,
        currentCoursesCount: 0,
        currentCourseGradesCount: 0,
        studyYearsCount: 0,
        transcriptDataCount: 0,
        totalCacheSize: 0,
      };
    }
  }

  // ===== TRANSCRIPT CACHE =====

  /**
   * Get cached study years
   */
  static async getCachedStudyYears(): Promise<StudyYear[] | null> {
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEYS.STUDY_YEARS);
      if (!cachedData) return null;

      const parsed: CachedStudyYearsData = JSON.parse(cachedData);
      
      if (!this.isTranscriptCacheValid(parsed.timestamp)) {
        await AsyncStorage.removeItem(CACHE_KEYS.STUDY_YEARS);
        return null;
      }

      return parsed.studyYears;
    } catch (error) {
      return null;
    }
  }

  /**
   * Set cached study years
   */
  static async setCachedStudyYears(studyYears: StudyYear[]): Promise<void> {
    try {
      const cacheData: CachedStudyYearsData = {
        studyYears,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(CACHE_KEYS.STUDY_YEARS, JSON.stringify(cacheData));
    } catch (error) {
    }
  }

  /**
   * Get cached transcript data for a specific study year
   */
  static async getCachedTranscriptData(studyYearId: string): Promise<TranscriptData | null> {
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEYS.TRANSCRIPT_DATA);
      if (!cachedData) {
        return null;
      }

      const parsed: CachedTranscriptData = JSON.parse(cachedData);
      if (!parsed[studyYearId]) {
        return null;
      }
      
      const yearData = parsed[studyYearId];
      
      if (!this.isTranscriptCacheValid(yearData.timestamp)) {
        delete parsed[studyYearId];
        await AsyncStorage.setItem(CACHE_KEYS.TRANSCRIPT_DATA, JSON.stringify(parsed));
        return null;
      }

      return yearData.transcriptData;
    } catch (error) {
      return null;
    }
  }

  /**
   * Set cached transcript data for a specific study year
   */
  static async setCachedTranscriptData(studyYearId: string, transcriptData: TranscriptData): Promise<void> {
    try {
      
      // Get existing cached data directly from AsyncStorage to avoid expiry checks
      let cachedData: CachedTranscriptData = {};
      try {
        const existingData = await AsyncStorage.getItem(CACHE_KEYS.TRANSCRIPT_DATA);
        if (existingData) {
          cachedData = JSON.parse(existingData);
        }
      } catch {
      }
      
      
      cachedData[studyYearId] = {
        transcriptData,
        timestamp: Date.now(),
      };
      
      await AsyncStorage.setItem(CACHE_KEYS.TRANSCRIPT_DATA, JSON.stringify(cachedData));
    } catch (error) {
    }
  }

  /**
   * Clear transcript cache for a specific study year
   */
  static async clearTranscriptCache(studyYearId: string): Promise<void> {
    try {
      const cachedData = await this.getCachedData<CachedTranscriptData>(CACHE_KEYS.TRANSCRIPT_DATA);
      if (cachedData && cachedData[studyYearId]) {
        delete cachedData[studyYearId];
        await this.setCachedData(CACHE_KEYS.TRANSCRIPT_DATA, cachedData);
      }
    } catch (error) {
    }
  }

  /**
   * Clear all transcript cache
   */
  static async clearAllTranscriptCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEYS.STUDY_YEARS);
      await AsyncStorage.removeItem(CACHE_KEYS.TRANSCRIPT_DATA);
    } catch (error) {
    }
  }

  /**
   * Get cached schedule data
   */
  static async getCachedScheduleData(): Promise<ScheduleData | null> {
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEYS.SCHEDULE_DATA);
      if (!cachedData) {
        return null;
      }

      const parsed: CachedData<ScheduleData> = JSON.parse(cachedData);
      
      if (!this.isScheduleCacheValid(parsed.timestamp)) {
        await AsyncStorage.removeItem(CACHE_KEYS.SCHEDULE_DATA);
        return null;
      }

      return parsed.data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Set cached schedule data
   */
  static async setCachedScheduleData(data: ScheduleData): Promise<void> {
    try {
      const cachedData: CachedData<ScheduleData> = {
        data,
        timestamp: Date.now(),
      };
      
      await AsyncStorage.setItem(CACHE_KEYS.SCHEDULE_DATA, JSON.stringify(cachedData));
    } catch (error) {
    }
  }

  /**
   * Clear schedule cache
   */
  static async clearScheduleCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEYS.SCHEDULE_DATA);
    } catch (error) {
    }
  }

  /**
   * Get cached course ID to name mapping
   */
  static async getCachedCourseIdToName(): Promise<CourseIdToNameMapping | null> {
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEYS.COURSE_ID_TO_NAME);
      if (!cachedData) {
        return null;
      }

      const parsed: CachedData<CourseIdToNameMapping> = JSON.parse(cachedData);
      
      if (!this.isCacheValid(parsed.timestamp)) {
        await AsyncStorage.removeItem(CACHE_KEYS.COURSE_ID_TO_NAME);
        return null;
      }

      return parsed.data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Set cached course ID to name mapping
   */
  static async setCachedCourseIdToName(mapping: CourseIdToNameMapping): Promise<void> {
    try {
      const cachedData: CachedData<CourseIdToNameMapping> = {
        data: mapping,
        timestamp: Date.now(),
      };
      
      await AsyncStorage.setItem(CACHE_KEYS.COURSE_ID_TO_NAME, JSON.stringify(cachedData));
    } catch (error) {
    }
  }

  /**
   * Clear course ID to name mapping cache
   */
  static async clearCourseIdToNameCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEYS.COURSE_ID_TO_NAME);
    } catch (error) {
    }
  }

  /**
   * Clear only previous grades cache (permanent cache)
   */
  static async clearPreviousGradesCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEYS.SEASONS_WITH_GRADES);
      await AsyncStorage.removeItem(CACHE_KEYS.COURSES);
      await AsyncStorage.removeItem(CACHE_KEYS.MIDTERM_GRADES);
      await AsyncStorage.removeItem(CACHE_KEYS.DETAILED_GRADES);
    } catch (error) {
    }
  }

  /**
   * Update clearAllCache to include transcript and schedule cache
   */
  static async clearAllCache(): Promise<void> {
    try {
      // Clear all cache except previous grades (permanent cache)
      const keysToClear = [
        CACHE_KEYS.CURRENT_GRADES,
        CACHE_KEYS.CURRENT_COURSES,
        CACHE_KEYS.CURRENT_COURSE_GRADES,
        CACHE_KEYS.COURSE_ID_TO_NAME,
        CACHE_KEYS.STUDY_YEARS,
        CACHE_KEYS.TRANSCRIPT_DATA,
        CACHE_KEYS.SCHEDULE_DATA
      ];
      
      await Promise.all(keysToClear.map(key => AsyncStorage.removeItem(key)));
    } catch (error) {
    }
  }

  /**
   * Clear all cache including previous grades (use with caution)
   */
  static async clearAllCacheIncludingPreviousGrades(): Promise<void> {
    try {
      const keys = Object.values(CACHE_KEYS);
      await Promise.all(keys.map(key => AsyncStorage.removeItem(key)));
    } catch (error) {
    }
  }
}
