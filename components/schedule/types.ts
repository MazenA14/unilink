export type ScheduleType = 'personal' | 'staff' | 'course' | 'combined';

export interface ScheduleClass {
  courseName: string;
  instructor?: string;
  room?: string;
  time?: string;
  slotType?: string;
  courseCode?: string;         // Extracted course code (e.g., "7MET L001")
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
    first: ScheduleClass[] | null;
    second: ScheduleClass[] | null;
    third: ScheduleClass[] | null;
    fourth: ScheduleClass[] | null;
    fifth: ScheduleClass[] | null;
    sixth: ScheduleClass[] | null;
    seventh: ScheduleClass[] | null;
    eighth: ScheduleClass[] | null;
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
    // For combined schedules
    staffSelections?: string[];
    courseSelections?: string[];
    totalSelections?: number;
  };
}

export interface ScheduleOption {
  id: string;
  name: string;
  department?: string;
  additionalInfo?: string;
}
