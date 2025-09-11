export type ScheduleType = 'personal' | 'staff' | 'course' | 'group';

export interface ScheduleClass {
  courseName: string;
  instructor?: string;
  room?: string;
  time?: string;
  // New fields for different schedule types
  enrollmentCount?: number;    // For course schedules
  officeHours?: string;        // For staff schedules
  groupSize?: number;          // For group schedules
  prerequisites?: string[];    // For course schedules
  department?: string;         // For group schedules
  credits?: number;           // For course schedules
}

export interface ScheduleDay {
  dayName: string;
  periods: {
    first: ScheduleClass | null;
    second: ScheduleClass | null;
    third: ScheduleClass | null;
    fourth: ScheduleClass | null;
    fifth: ScheduleClass | null;
  };
  isFree: boolean;
}

export interface ScheduleData {
  days: ScheduleDay[];
  type: ScheduleType;
  metadata?: {
    totalCourses?: number;
    totalStudents?: number;
    department?: string;
    selectedItem?: string; // Selected staff/course/group name
  };
}

export interface ScheduleOption {
  id: string;
  name: string;
  department?: string;
  additionalInfo?: string;
}
