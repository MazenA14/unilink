export interface ViewStateData {
  __VIEWSTATE: string;
  __VIEWSTATEGENERATOR: string;
  __EVENTVALIDATION: string;
}

export interface GradeData {
  course: string;
  percentage: number;
}

export interface PaymentItem {
  reference: string;
  description: string;
  currency: string;
  amount: number;
  dueDate: string;
  eventTarget?: string;
}

export interface ScheduleClass {
  courseName: string;
  instructor?: string;
  room?: string;
  time?: string;
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
  type: 'personal' | 'staff' | 'course' | 'group';
  metadata?: {
    totalCourses?: number;
    totalStudents?: number;
    department?: string;
    selectedItem?: string;
  };
}