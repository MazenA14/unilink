import AsyncStorage from '@react-native-async-storage/async-storage';
import { GradeData } from './gucApiProxy';

// Cache configuration
const CACHE_EXPIRY_DAYS = 30;
const CACHE_EXPIRY_MS = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

// Cache keys
const CACHE_KEYS = {
  SEASONS: 'guc_cache_seasons',
  COURSES: 'guc_cache_courses',
  MIDTERM_GRADES: 'guc_cache_midterm_grades',
  DETAILED_GRADES: 'guc_cache_detailed_grades',
  SEASONS_WITH_GRADES: 'guc_cache_seasons_with_grades',
  CURRENT_GRADES: 'guc_cache_current_grades',
} as const;

// Interface definitions
interface Season {
  value: string;
  text: string;
  hasGrades?: boolean;
  year?: string;
}

interface YearGroup {
  year: string;
  seasons: Season[];
}

interface Course {
  value: string;
  text: string;
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
   * Get cached data with validation
   */
  private static async getCachedData<T>(key: string): Promise<T | null> {
    try {
      const cachedData = await AsyncStorage.getItem(key);
      if (!cachedData) return null;

      const parsed: CachedData<T> = JSON.parse(cachedData);
      
      if (!this.isCacheValid(parsed.timestamp)) {
        console.log(`Cache expired for ${key}, removing...`);
        await AsyncStorage.removeItem(key);
        return null;
      }

      console.log(`Cache hit for ${key}`);
      return parsed.data;
    } catch (error) {
      console.error(`Error reading cache for ${key}:`, error);
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
      console.log(`Cached data for ${key}`);
    } catch (error) {
      console.error(`Error caching data for ${key}:`, error);
    }
  }

  /**
   * Clear all grade-related cache
   */
  static async clearAllCache(): Promise<void> {
    try {
      const keys = Object.values(CACHE_KEYS);
      await Promise.all(keys.map(key => AsyncStorage.removeItem(key)));
      console.log('Cleared all grade cache');
    } catch (error) {
      console.error('Error clearing cache:', error);
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

      console.log(`Cleared cache for season ${seasonId}`);
    } catch (error) {
      console.error(`Error clearing cache for season ${seasonId}:`, error);
    }
  }

  // ===== SEASONS CACHE =====

  /**
   * Get cached seasons with grades data
   */
  static async getCachedSeasonsWithGrades(): Promise<CachedSeasonsData | null> {
    return this.getCachedData<CachedSeasonsData>(CACHE_KEYS.SEASONS_WITH_GRADES);
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
   * Get cached courses for a season
   */
  static async getCachedCourses(seasonId: string): Promise<Course[] | null> {
    const cachedData = await this.getCachedData<CachedCoursesData>(CACHE_KEYS.COURSES);
    if (!cachedData || !cachedData[seasonId]) return null;
    
    const seasonData = cachedData[seasonId];
    if (!this.isCacheValid(seasonData.timestamp)) {
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
   * Get cached midterm grades for a season
   */
  static async getCachedMidtermGrades(seasonId: string): Promise<GradeData[] | null> {
    const cachedData = await this.getCachedData<CachedMidtermGradesData>(CACHE_KEYS.MIDTERM_GRADES);
    if (!cachedData || !cachedData[seasonId]) return null;
    
    const seasonData = cachedData[seasonId];
    if (!this.isCacheValid(seasonData.timestamp)) {
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
      console.log('Cleared current grades cache');
    } catch (error) {
      console.error('Error clearing current grades cache:', error);
    }
  }

  // ===== DETAILED GRADES CACHE =====

  /**
   * Get cached detailed grades for a specific course in a season
   */
  static async getCachedDetailedGrades(seasonId: string, courseId: string): Promise<GradeData[] | null> {
    const cachedData = await this.getCachedData<CachedDetailedGradesData>(CACHE_KEYS.DETAILED_GRADES);
    if (!cachedData || !cachedData[seasonId] || !cachedData[seasonId][courseId]) return null;
    
    const courseData = cachedData[seasonId][courseId];
    if (!this.isCacheValid(courseData.timestamp)) {
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
      
      console.log(`Pre-cached all data for season ${seasonId}: ${courses.length} courses, ${midtermGrades.length} midterm grades, ${Object.keys(detailedGradesMap).length} detailed grade sets`);
    } catch (error) {
      console.error(`Error pre-caching season data for ${seasonId}:`, error);
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
    totalCacheSize: number;
  }> {
    try {
      const seasonsData = await this.getCachedSeasonsWithGrades();
      const coursesData = await this.getCachedData<CachedCoursesData>(CACHE_KEYS.COURSES) || {};
      const midtermData = await this.getCachedData<CachedMidtermGradesData>(CACHE_KEYS.MIDTERM_GRADES) || {};
      const detailedData = await this.getCachedData<CachedDetailedGradesData>(CACHE_KEYS.DETAILED_GRADES) || {};
      const currentGradesData = await this.getCachedCurrentGrades() || [];

      let coursesCount = 0;
      let midtermGradesCount = 0;
      let detailedGradesCount = 0;
      let currentGradesCount = currentGradesData.length;

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
        totalCacheSize,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        seasonsWithGrades: false,
        coursesCount: 0,
        midtermGradesCount: 0,
        detailedGradesCount: 0,
        currentGradesCount: 0,
        totalCacheSize: 0,
      };
    }
  }
}
