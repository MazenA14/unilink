import AsyncStorage from '@react-native-async-storage/async-storage';

const SEEN_GRADES_KEY = 'seen_grades';
const GRADE_TIMESTAMPS_KEY = 'grade_timestamps';

export interface SeenGrade {
  courseId: string;
  gradeId: string; // Unique identifier for the grade (course + grade name + percentage)
  seenAt: string;
}

export interface GradeTimestamp {
  courseId: string;
  lastChecked: string;
}

export class GradeTracking {
  /**
   * Get all seen grades from storage
   */
  static async getSeenGrades(): Promise<SeenGrade[]> {
    try {
      const seenGradesJson = await AsyncStorage.getItem(SEEN_GRADES_KEY);
      return seenGradesJson ? JSON.parse(seenGradesJson) : [];
    } catch (error) {
      console.error('Error getting seen grades:', error);
      return [];
    }
  }

  /**
   * Get grade timestamps from storage
   */
  static async getGradeTimestamps(): Promise<GradeTimestamp[]> {
    try {
      const timestampsJson = await AsyncStorage.getItem(GRADE_TIMESTAMPS_KEY);
      return timestampsJson ? JSON.parse(timestampsJson) : [];
    } catch (error) {
      console.error('Error getting grade timestamps:', error);
      return [];
    }
  }

  /**
   * Mark a grade as seen
   */
  static async markGradeAsSeen(courseId: string, gradeId: string): Promise<void> {
    try {
      const seenGrades = await this.getSeenGrades();
      const existingIndex = seenGrades.findIndex(
        grade => grade.courseId === courseId && grade.gradeId === gradeId
      );

      if (existingIndex >= 0) {
        // Update existing entry
        seenGrades[existingIndex].seenAt = new Date().toISOString();
      } else {
        // Add new entry
        seenGrades.push({
          courseId,
          gradeId,
          seenAt: new Date().toISOString(),
        });
      }

      await AsyncStorage.setItem(SEEN_GRADES_KEY, JSON.stringify(seenGrades));
    } catch (error) {
      console.error('Error marking grade as seen:', error);
    }
  }

  /**
   * Update the last checked timestamp for a course
   */
  static async updateCourseLastChecked(courseId: string): Promise<void> {
    try {
      const timestamps = await this.getGradeTimestamps();
      const existingIndex = timestamps.findIndex(ts => ts.courseId === courseId);

      if (existingIndex >= 0) {
        timestamps[existingIndex].lastChecked = new Date().toISOString();
      } else {
        timestamps.push({
          courseId,
          lastChecked: new Date().toISOString(),
        });
      }

      await AsyncStorage.setItem(GRADE_TIMESTAMPS_KEY, JSON.stringify(timestamps));
    } catch (error) {
      console.error('Error updating course timestamp:', error);
    }
  }

  /**
   * Get unseen grades count for a course
   */
  static async getUnseenGradesCount(courseId: string, currentGrades: any[]): Promise<number> {
    try {
      const seenGrades = await this.getSeenGrades();
      const timestamps = await this.getGradeTimestamps();
      
      const courseTimestamp = timestamps.find(ts => ts.courseId === courseId);
      const lastChecked = courseTimestamp ? new Date(courseTimestamp.lastChecked) : new Date(0);

      let unseenCount = 0;

      for (const grade of currentGrades) {
        const gradeId = `${grade.course}_${grade.percentage}_${grade.obtained || 0}_${grade.total || 0}`;
        const isSeen = seenGrades.some(
          seen => seen.courseId === courseId && seen.gradeId === gradeId
        );

        // If grade is not seen, or if it was added after last check, it's unseen
        if (!isSeen) {
          unseenCount++;
        }
      }

      return unseenCount;
    } catch (error) {
      console.error('Error getting unseen grades count:', error);
      return 0;
    }
  }

  /**
   * Mark all grades in a course as seen
   */
  static async markCourseGradesAsSeen(courseId: string, grades: any[]): Promise<void> {
    try {
      for (const grade of grades) {
        const gradeId = `${grade.course}_${grade.percentage}_${grade.obtained || 0}_${grade.total || 0}`;
        await this.markGradeAsSeen(courseId, gradeId);
      }
      await this.updateCourseLastChecked(courseId);
    } catch (error) {
      console.error('Error marking course grades as seen:', error);
    }
  }

  /**
   * Clear all tracking data (useful for logout)
   */
  static async clearAllTracking(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SEEN_GRADES_KEY);
      await AsyncStorage.removeItem(GRADE_TIMESTAMPS_KEY);
    } catch (error) {
      console.error('Error clearing grade tracking:', error);
    }
  }
}
