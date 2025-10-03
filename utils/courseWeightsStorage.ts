import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CourseWeight {
  id: string;
  name: string;
  percentage: number;
}

export interface Course {
  id: string;
  name: string;
  weights: CourseWeight[];
}

const COURSE_WEIGHTS_KEY = '@course_weights';

export class CourseWeightsStorage {
  /**
   * Load all courses with their weights from storage
   */
  static async loadCourses(): Promise<Course[]> {
    try {
      const data = await AsyncStorage.getItem(COURSE_WEIGHTS_KEY);
      if (data) {
        return JSON.parse(data);
      }
      return [];
    } catch (error) {
      console.error('Error loading course weights:', error);
      return [];
    }
  }

  /**
   * Save all courses with their weights to storage
   */
  static async saveCourses(courses: Course[]): Promise<void> {
    try {
      await AsyncStorage.setItem(COURSE_WEIGHTS_KEY, JSON.stringify(courses));
    } catch (error) {
      console.error('Error saving course weights:', error);
      throw error;
    }
  }

  /**
   * Add a new course
   */
  static async addCourse(course: Course): Promise<void> {
    try {
      const courses = await this.loadCourses();
      courses.push(course);
      await this.saveCourses(courses);
    } catch (error) {
      console.error('Error adding course:', error);
      throw error;
    }
  }

  /**
   * Update an existing course
   */
  static async updateCourse(courseId: string, updatedCourse: Partial<Course>): Promise<void> {
    try {
      const courses = await this.loadCourses();
      const courseIndex = courses.findIndex(c => c.id === courseId);
      
      if (courseIndex !== -1) {
        courses[courseIndex] = { ...courses[courseIndex], ...updatedCourse };
        await this.saveCourses(courses);
      }
    } catch (error) {
      console.error('Error updating course:', error);
      throw error;
    }
  }

  /**
   * Delete a course
   */
  static async deleteCourse(courseId: string): Promise<void> {
    try {
      const courses = await this.loadCourses();
      const filteredCourses = courses.filter(c => c.id !== courseId);
      await this.saveCourses(filteredCourses);
    } catch (error) {
      console.error('Error deleting course:', error);
      throw error;
    }
  }

  /**
   * Add a weight to a course
   */
  static async addWeight(courseId: string, weight: CourseWeight): Promise<void> {
    try {
      const courses = await this.loadCourses();
      const courseIndex = courses.findIndex(c => c.id === courseId);
      
      if (courseIndex !== -1) {
        courses[courseIndex].weights.push(weight);
        await this.saveCourses(courses);
      }
    } catch (error) {
      console.error('Error adding weight:', error);
      throw error;
    }
  }

  /**
   * Update a weight in a course
   */
  static async updateWeight(courseId: string, weightId: string, updatedWeight: Partial<CourseWeight>): Promise<void> {
    try {
      const courses = await this.loadCourses();
      const courseIndex = courses.findIndex(c => c.id === courseId);
      
      if (courseIndex !== -1) {
        const weightIndex = courses[courseIndex].weights.findIndex(w => w.id === weightId);
        if (weightIndex !== -1) {
          courses[courseIndex].weights[weightIndex] = { 
            ...courses[courseIndex].weights[weightIndex], 
            ...updatedWeight 
          };
          await this.saveCourses(courses);
        }
      }
    } catch (error) {
      console.error('Error updating weight:', error);
      throw error;
    }
  }

  /**
   * Delete a weight from a course
   */
  static async deleteWeight(courseId: string, weightId: string): Promise<void> {
    try {
      const courses = await this.loadCourses();
      const courseIndex = courses.findIndex(c => c.id === courseId);
      
      if (courseIndex !== -1) {
        courses[courseIndex].weights = courses[courseIndex].weights.filter(w => w.id !== weightId);
        await this.saveCourses(courses);
      }
    } catch (error) {
      console.error('Error deleting weight:', error);
      throw error;
    }
  }

  /**
   * Clear all course weights data
   */
  static async clearAll(): Promise<void> {
    try {
      await AsyncStorage.removeItem(COURSE_WEIGHTS_KEY);
    } catch (error) {
      console.error('Error clearing course weights:', error);
      throw error;
    }
  }
}
